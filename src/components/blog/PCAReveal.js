import React, { useState, useMemo, useRef, useCallback, useEffect } from "react"

/* ─── Layout ─── */
const W = 600
const H = 420
const CX = 300
const CY = 190
const SCALE = 60
const N_POINTS = 60
const ANIM_DURATION = 600

/* ─── Colors ─── */
const FONT = "var(--font-mono, monospace)"
const POINT_COLOR = "rgba(0,0,0,0.2)"
const POINT_R = 3
const AXIS_COLOR = "rgba(0,0,0,0.08)"
const GRID_COLOR = "rgba(0,0,0,0.04)"
const LABEL_BLUE = "#3d6cb9"
const LABEL_RED = "#c0503a"
const TEAL = "#4A7C6F"
const VAR_BAR_HEIGHT = 6

/* ─── Ellipse parameters ─── */
const ANGLE_DEG = 35
const ANGLE_RAD = (ANGLE_DEG * Math.PI) / 180
const SIGMA_MAJOR = 2.5
const SIGMA_MINOR = 0.6

/* ─── Seeded PRNG (Mulberry32) ─── */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─── Box-Muller transform for normal samples ─── */
function boxMuller(rng) {
  const u1 = rng()
  const u2 = rng()
  const r = Math.sqrt(-2 * Math.log(u1))
  const theta = 2 * Math.PI * u2
  return [r * Math.cos(theta), r * Math.sin(theta)]
}

/* ─── Ease-out cubic ─── */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

/* ─── Generate data and compute PCA (all deterministic from seed) ─── */
function generateDataAndPCA() {
  const rng = mulberry32(55)

  /* Rotation matrix for the tilted ellipse */
  const cosA = Math.cos(ANGLE_RAD)
  const sinA = Math.sin(ANGLE_RAD)

  /* Generate points: sample from axis-aligned Gaussian, then rotate */
  const rawPoints = []
  for (let i = 0; i < N_POINTS; i++) {
    const [z1, z2] = boxMuller(rng)
    const x = z1 * SIGMA_MAJOR
    const y = z2 * SIGMA_MINOR
    /* Rotate by ANGLE_RAD */
    const rx = cosA * x - sinA * y
    const ry = sinA * x + cosA * y
    rawPoints.push([rx, ry])
  }

  /* Compute sample mean */
  let mx = 0, my = 0
  for (const [x, y] of rawPoints) { mx += x; my += y }
  mx /= N_POINTS
  my /= N_POINTS

  /* Center the data */
  const points = rawPoints.map(([x, y]) => [x - mx, y - my])

  /* Compute 2x2 covariance matrix */
  let cxx = 0, cxy = 0, cyy = 0
  for (const [x, y] of points) {
    cxx += x * x
    cxy += x * y
    cyy += y * y
  }
  cxx /= (N_POINTS - 1)
  cxy /= (N_POINTS - 1)
  cyy /= (N_POINTS - 1)

  /* Eigendecomposition of 2x2 symmetric matrix [[cxx, cxy], [cxy, cyy]]
     Using analytic formulas for 2x2 symmetric eigenvalues/eigenvectors */
  const trace = cxx + cyy
  const det = cxx * cyy - cxy * cxy
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lambda1 = trace / 2 + disc   // larger eigenvalue
  const lambda2 = trace / 2 - disc   // smaller eigenvalue

  /* Eigenvector for lambda1 */
  let v1x, v1y
  if (Math.abs(cxy) > 1e-12) {
    v1x = lambda1 - cyy
    v1y = cxy
  } else {
    v1x = cxx >= cyy ? 1 : 0
    v1y = cxx >= cyy ? 0 : 1
  }
  const v1len = Math.sqrt(v1x * v1x + v1y * v1y)
  v1x /= v1len
  v1y /= v1len

  /* Eigenvector for lambda2 (perpendicular) */
  let v2x = -v1y
  let v2y = v1x

  /* The PCA rotation angle: angle of first eigenvector from x-axis */
  const pcaAngle = Math.atan2(v1y, v1x)

  /* Variance in neuron basis along each axis */
  let varN1 = 0, varN2 = 0
  for (const [x, y] of points) {
    varN1 += x * x
    varN2 += y * y
  }
  varN1 /= (N_POINTS - 1)
  varN2 /= (N_POINTS - 1)

  return {
    points,
    pcaAngle,
    lambda1,
    lambda2,
    varN1,
    varN2,
    v1: [v1x, v1y],
    v2: [v2x, v2y],
  }
}

const DATA = generateDataAndPCA()

export default function PCAReveal() {
  const [rotated, setRotated] = useState(false)
  const [animT, setAnimT] = useState(0) // 0 = neuron basis, 1 = PC basis
  const animRef = useRef(null)
  const startTimeRef = useRef(null)
  const animatingRef = useRef(false)
  const targetRef = useRef(0)

  const { points, pcaAngle, lambda1, lambda2, varN1, varN2 } = DATA

  /* ─── Animate between bases ─── */
  const animate = useCallback((timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp
    const elapsed = timestamp - startTimeRef.current
    const progress = Math.min(1, elapsed / ANIM_DURATION)
    const eased = easeOutCubic(progress)

    const target = targetRef.current
    const from = target === 1 ? 0 : 1
    const t = from + (target - from) * eased

    setAnimT(t)

    if (progress < 1) {
      animRef.current = requestAnimationFrame(animate)
    } else {
      setAnimT(target)
      animatingRef.current = false
    }
  }, [])

  const handleToggle = useCallback(() => {
    if (animatingRef.current) return
    const newTarget = rotated ? 0 : 1
    targetRef.current = newTarget
    setRotated(!rotated)
    animatingRef.current = true
    startTimeRef.current = null
    animRef.current = requestAnimationFrame(animate)
  }, [rotated, animate])

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  /* ─── Current rotation angle (interpolated) ─── */
  const currentAngle = -pcaAngle * animT

  /* ─── Rotate a point by the current animation angle ─── */
  const rotatePoint = useCallback((x, y) => {
    const cos = Math.cos(currentAngle)
    const sin = Math.sin(currentAngle)
    return [cos * x - sin * y, sin * x + cos * y]
  }, [currentAngle])

  /* ─── Transformed data points ─── */
  const transformedPoints = useMemo(() => {
    const cos = Math.cos(currentAngle)
    const sin = Math.sin(currentAngle)
    return points.map(([x, y]) => {
      const rx = cos * x - sin * y
      const ry = sin * x + cos * y
      return toSVG(rx, ry)
    })
  }, [points, currentAngle])

  /* ─── Grid lines (rotate with data) ─── */
  const gridLines = useMemo(() => {
    const cos = Math.cos(currentAngle)
    const sin = Math.sin(currentAngle)
    const lines = []
    const extent = 6

    for (let i = -extent; i <= extent; i++) {
      /* Vertical lines in rotated frame */
      const x = i
      const y1r = -extent, y2r = extent
      const [ax, ay] = toSVG(
        cos * x - sin * y1r,
        sin * x + cos * y1r
      )
      const [bx, by] = toSVG(
        cos * x - sin * y2r,
        sin * x + cos * y2r
      )
      lines.push({ x1: ax, y1: ay, x2: bx, y2: by })

      /* Horizontal lines in rotated frame */
      const y = i
      const x1r = -extent, x2r = extent
      const [cx, cy] = toSVG(
        cos * x1r - sin * y,
        sin * x1r + cos * y
      )
      const [dx, dy] = toSVG(
        cos * x2r - sin * y,
        sin * x2r + cos * y
      )
      lines.push({ x1: cx, y1: cy, x2: dx, y2: dy })
    }
    return lines
  }, [currentAngle])

  /* ─── Axis endpoints (rotate with data) ─── */
  const axisLength = 4.5
  const axes = useMemo(() => {
    const cos = Math.cos(currentAngle)
    const sin = Math.sin(currentAngle)

    /* Axis 1 direction: originally horizontal */
    const a1x = cos * axisLength
    const a1y = sin * axisLength

    /* Axis 2 direction: originally vertical */
    const a2x = -sin * axisLength
    const a2y = cos * axisLength

    return {
      axis1: {
        start: toSVG(-a1x, -a1y),
        end: toSVG(a1x, a1y),
        labelPos: toSVG(a1x + cos * 0.35, a1y + sin * 0.35),
      },
      axis2: {
        start: toSVG(-a2x, -a2y),
        end: toSVG(a2x, a2y),
        labelPos: toSVG(a2x + (-sin) * 0.35, a2y + cos * 0.35),
      },
    }
  }, [currentAngle])

  /* ─── Variance bars ─── */
  const maxBarWidth = 180
  const barY = 370
  const barGap = 22
  const maxVar = Math.max(lambda1, varN1, varN2, lambda2)

  const var1 = varN1 + (lambda1 - varN1) * animT
  const var2 = varN2 + (lambda2 - varN2) * animT
  const bar1Width = (var1 / maxVar) * maxBarWidth
  const bar2Width = (var2 / maxVar) * maxBarWidth

  /* ─── Label opacity (crossfade) ─── */
  const neuronOpacity = 1 - animT
  const pcOpacity = animT

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", overflow: "visible", display: "block" }}
      >
        {/* ─── Grid lines ─── */}
        {gridLines.map((l, i) => (
          <line
            key={`grid-${i}`}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={GRID_COLOR}
            strokeWidth={1}
          />
        ))}

        {/* ─── Axes ─── */}
        <line
          x1={axes.axis1.start[0]} y1={axes.axis1.start[1]}
          x2={axes.axis1.end[0]} y2={axes.axis1.end[1]}
          stroke={AXIS_COLOR}
          strokeWidth={1.5}
        />
        <line
          x1={axes.axis2.start[0]} y1={axes.axis2.start[1]}
          x2={axes.axis2.end[0]} y2={axes.axis2.end[1]}
          stroke={AXIS_COLOR}
          strokeWidth={1.5}
        />

        {/* ─── Axis 1 labels (crossfade) ─── */}
        {neuronOpacity > 0.01 && (
          <text
            x={axes.axis1.labelPos[0]}
            y={axes.axis1.labelPos[1]}
            textAnchor="middle"
            dominantBaseline="central"
            fill={LABEL_BLUE}
            opacity={neuronOpacity}
            fontFamily={FONT}
            fontSize={12}
            fontWeight={600}
          >
            N1
          </text>
        )}
        {pcOpacity > 0.01 && (
          <text
            x={axes.axis1.labelPos[0]}
            y={axes.axis1.labelPos[1]}
            textAnchor="middle"
            dominantBaseline="central"
            fill={LABEL_BLUE}
            opacity={pcOpacity}
            fontFamily={FONT}
            fontSize={12}
            fontWeight={600}
          >
            PC1
          </text>
        )}

        {/* ─── Axis 2 labels (crossfade) ─── */}
        {neuronOpacity > 0.01 && (
          <text
            x={axes.axis2.labelPos[0]}
            y={axes.axis2.labelPos[1]}
            textAnchor="middle"
            dominantBaseline="central"
            fill={LABEL_RED}
            opacity={neuronOpacity}
            fontFamily={FONT}
            fontSize={12}
            fontWeight={600}
          >
            N2
          </text>
        )}
        {pcOpacity > 0.01 && (
          <text
            x={axes.axis2.labelPos[0]}
            y={axes.axis2.labelPos[1]}
            textAnchor="middle"
            dominantBaseline="central"
            fill={LABEL_RED}
            opacity={pcOpacity}
            fontFamily={FONT}
            fontSize={12}
            fontWeight={600}
          >
            PC2
          </text>
        )}

        {/* ─── Data points ─── */}
        {transformedPoints.map(([sx, sy], i) => (
          <circle
            key={`pt-${i}`}
            cx={sx}
            cy={sy}
            r={POINT_R}
            fill={POINT_COLOR}
          />
        ))}

        {/* ─── Variance bars ─── */}
        <g>
          {/* Axis 1 variance bar */}
          <text
            x={CX - maxBarWidth / 2 - 32}
            y={barY + VAR_BAR_HEIGHT / 2}
            textAnchor="end"
            dominantBaseline="central"
            fill={LABEL_BLUE}
            fontFamily={FONT}
            fontSize={10}
            fontWeight={600}
          >
            {neuronOpacity > pcOpacity ? "N1" : "PC1"}
          </text>
          <rect
            x={CX - maxBarWidth / 2 - 28}
            y={barY}
            width={bar1Width}
            height={VAR_BAR_HEIGHT}
            rx={3}
            fill={TEAL}
          />

          {/* Axis 2 variance bar */}
          <text
            x={CX - maxBarWidth / 2 - 32}
            y={barY + barGap + VAR_BAR_HEIGHT / 2}
            textAnchor="end"
            dominantBaseline="central"
            fill={LABEL_RED}
            fontFamily={FONT}
            fontSize={10}
            fontWeight={600}
          >
            {neuronOpacity > pcOpacity ? "N2" : "PC2"}
          </text>
          <rect
            x={CX - maxBarWidth / 2 - 28}
            y={barY + barGap}
            width={bar2Width}
            height={VAR_BAR_HEIGHT}
            rx={3}
            fill={TEAL}
          />

          {/* Variance label */}
          <text
            x={CX - maxBarWidth / 2 - 28 + maxBarWidth + 8}
            y={barY + (barGap + VAR_BAR_HEIGHT) / 2}
            textAnchor="start"
            dominantBaseline="central"
            fill="rgba(0,0,0,0.3)"
            fontFamily={FONT}
            fontSize={9}
          >
            variance
          </text>
        </g>
      </svg>

      {/* ─── Toggle button ─── */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
        <button
          className="blog-figure__button"
          onClick={handleToggle}
          style={{ cursor: "pointer" }}
        >
          {rotated ? "Reset" : "Change Basis"}
        </button>
      </div>
    </div>
  )
}
