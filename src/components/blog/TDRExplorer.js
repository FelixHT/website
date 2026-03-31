import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"

/* ────────────────────────────────────────────
   Layout
   ──────────────────────────────────────────── */
const W = 700
const H = 400
const PLOT_CX = 350
const PLOT_CY = 205
const PLOT_R = 155
const FONT = "var(--font-mono, monospace)"

/* ────────────────────────────────────────────
   Colors
   ──────────────────────────────────────────── */
const CONDITION_COLORS = ["#3d6cb9", "#4A7C6F", "#c0503a"]
const CONDITION_LABELS = ["Condition A", "Condition B", "Condition C"]
const PCA_AXIS_COLOR = "rgba(0,0,0,0.15)"
const TDR_AXIS_COLOR = "#4A7C6F"

/* ────────────────────────────────────────────
   Seeded random number generator
   ──────────────────────────────────────────── */
function mulberry32(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randNormal(rng) {
  const u1 = rng()
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
}

/* ────────────────────────────────────────────
   Data generation

   We generate 3 clusters in a high-dimensional
   space, then define two coordinate systems:

   1. PCA axes: eigenvectors of the total
      covariance. The first PC captures the
      dominant variance direction, which here
      runs roughly within clusters rather than
      between them.

   2. TDR axes: the "choice axis" is the
      direction that best separates the three
      conditions (like an LDA direction), and
      the "stimulus axis" is the direction that
      separates a secondary grouping.

   The key insight: PCA's first axis mixes
   conditions because it maximizes total
   variance, not class separation.
   ──────────────────────────────────────────── */
function generateData(seed = 42) {
  const rng = mulberry32(seed)
  const nPerGroup = 15

  // Cluster centers in the *TDR* frame: well-separated along axis 1
  // and with a secondary structure along axis 2
  const centers = [
    [-2.8, -1.0],
    [0.2, 2.2],
    [2.6, -1.2],
  ]

  // Within-cluster covariance: elongated along a direction that is
  // NOT aligned with either TDR axis. This ensures PCA picks up
  // this elongation as its first component rather than the between-
  // cluster direction.
  const spreadAngle = 0.7 // radians
  const spreadMajor = 1.8
  const spreadMinor = 0.35

  const cosA = Math.cos(spreadAngle)
  const sinA = Math.sin(spreadAngle)

  const raw = []
  const labels = []

  for (let g = 0; g < 3; g++) {
    for (let i = 0; i < nPerGroup; i++) {
      const z1 = randNormal(rng) * spreadMajor
      const z2 = randNormal(rng) * spreadMinor
      // Rotate within-cluster spread
      const x = centers[g][0] + cosA * z1 - sinA * z2
      const y = centers[g][1] + sinA * z1 + cosA * z2
      raw.push([x, y])
      labels.push(g)
    }
  }

  // Compute PCA of the combined data
  const n = raw.length
  let mx = 0, my = 0
  for (const [x, y] of raw) { mx += x; my += y }
  mx /= n; my /= n

  const centered = raw.map(([x, y]) => [x - mx, y - my])

  let cxx = 0, cxy = 0, cyy = 0
  for (const [x, y] of centered) {
    cxx += x * x; cxy += x * y; cyy += y * y
  }
  cxx /= n; cxy /= n; cyy /= n

  // Eigendecomposition of 2x2 covariance
  const trace = cxx + cyy
  const det = cxx * cyy - cxy * cxy
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lam1 = trace / 2 + disc
  const lam2 = trace / 2 - disc

  // Eigenvectors
  let pc1, pc2
  if (Math.abs(cxy) > 1e-10) {
    pc1 = normalize([lam1 - cyy, cxy])
    pc2 = normalize([lam2 - cyy, cxy])
  } else {
    pc1 = cxx >= cyy ? [1, 0] : [0, 1]
    pc2 = cxx >= cyy ? [0, 1] : [1, 0]
  }

  // PCA coordinates
  const pcaCoords = centered.map(([x, y]) => [
    x * pc1[0] + y * pc1[1],
    x * pc2[0] + y * pc2[1],
  ])

  // TDR "choice axis": direction that best separates the 3 group means
  // Use between-class scatter's principal eigenvector (LDA-like)
  const groupMeans = [0, 1, 2].map(g => {
    let sx = 0, sy = 0, cnt = 0
    for (let i = 0; i < n; i++) {
      if (labels[i] === g) { sx += centered[i][0]; sy += centered[i][1]; cnt++ }
    }
    return [sx / cnt, sy / cnt]
  })

  let bxx = 0, bxy = 0, byy = 0
  for (const [gx, gy] of groupMeans) {
    bxx += gx * gx; bxy += gx * gy; byy += gy * gy
  }

  const bTrace = bxx + byy
  const bDet = bxx * byy - bxy * bxy
  const bDisc = Math.sqrt(Math.max(0, bTrace * bTrace / 4 - bDet))
  const bLam1 = bTrace / 2 + bDisc

  let choiceAxis
  if (Math.abs(bxy) > 1e-10) {
    choiceAxis = normalize([bLam1 - byy, bxy])
  } else {
    choiceAxis = bxx >= byy ? [1, 0] : [0, 1]
  }

  // Stimulus axis: orthogonal to choice axis
  const stimAxis = [-choiceAxis[1], choiceAxis[0]]

  // TDR coordinates
  const tdrCoords = centered.map(([x, y]) => [
    x * choiceAxis[0] + y * choiceAxis[1],
    x * stimAxis[0] + y * stimAxis[1],
  ])

  return {
    pcaCoords,
    tdrCoords,
    labels,
    pc1,
    pc2,
    choiceAxis,
    stimAxis,
    centered,
    varExplained: [lam1 / (lam1 + lam2), lam2 / (lam1 + lam2)],
  }
}

function normalize(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1])
  if (len < 1e-10) return [1, 0]
  return [v[0] / len, v[1] / len]
}

/* ────────────────────────────────────────────
   Coordinate scaling
   ──────────────────────────────────────────── */
function computeScale(coords) {
  let maxAbs = 0
  for (const [x, y] of coords) {
    if (Math.abs(x) > maxAbs) maxAbs = Math.abs(x)
    if (Math.abs(y) > maxAbs) maxAbs = Math.abs(y)
  }
  return maxAbs || 1
}

function toSVG(x, y, scale) {
  const s = (PLOT_R * 0.85) / scale
  return [PLOT_CX + x * s, PLOT_CY - y * s]
}

/* ────────────────────────────────────────────
   Interpolation
   ──────────────────────────────────────────── */
function lerp(a, b, t) {
  return a + (b - a) * t
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
export default function TDRExplorer() {
  const [view, setView] = useState("pca") // "pca" | "tdr"
  const [animT, setAnimT] = useState(0) // 0 = PCA, 1 = TDR
  const animRef = useRef(null)

  const data = useMemo(() => generateData(42), [])

  const pcaScale = useMemo(() => computeScale(data.pcaCoords), [data.pcaCoords])
  const tdrScale = useMemo(() => computeScale(data.tdrCoords), [data.tdrCoords])

  // SVG positions for each view
  const pcaPositions = useMemo(
    () => data.pcaCoords.map(([x, y]) => toSVG(x, y, pcaScale)),
    [data.pcaCoords, pcaScale]
  )
  const tdrPositions = useMemo(
    () => data.tdrCoords.map(([x, y]) => toSVG(x, y, tdrScale)),
    [data.tdrCoords, tdrScale]
  )

  // Animate transition
  const animateTo = useCallback((target) => {
    const startT = animRef.current?._currentT ?? (target === 1 ? 0 : 1)
    const endT = target
    const duration = 600
    let startTime = null

    if (animRef.current?._raf) cancelAnimationFrame(animRef.current._raf)

    const step = (ts) => {
      if (!startTime) startTime = ts
      const elapsed = ts - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeInOutCubic(progress)
      const current = lerp(startT, endT, eased)
      setAnimT(current)
      animRef.current._currentT = current
      if (progress < 1) {
        animRef.current._raf = requestAnimationFrame(step)
      }
    }

    if (!animRef.current) animRef.current = {}
    animRef.current._currentT = startT
    animRef.current._raf = requestAnimationFrame(step)
  }, [])

  useEffect(() => {
    return () => {
      if (animRef.current?._raf) cancelAnimationFrame(animRef.current._raf)
    }
  }, [])

  const handleToggle = useCallback((newView) => {
    setView(newView)
    animateTo(newView === "tdr" ? 1 : 0)
  }, [animateTo])

  // Interpolated point positions
  const pointPositions = useMemo(() => {
    return pcaPositions.map(([px, py], i) => {
      const [tx, ty] = tdrPositions[i]
      return [lerp(px, tx, animT), lerp(py, ty, animT)]
    })
  }, [pcaPositions, tdrPositions, animT])

  // Axis directions in SVG space
  // PCA axes pass through center; we show them as full-span lines
  const axisLen = PLOT_R * 0.95

  // PCA axes in SVG: pc1 and pc2 are unit vectors in data space
  const pcaAxis1End = [
    PLOT_CX + data.pc1[0] * axisLen,
    PLOT_CY - data.pc1[1] * axisLen,
  ]
  const pcaAxis1Start = [
    PLOT_CX - data.pc1[0] * axisLen,
    PLOT_CY + data.pc1[1] * axisLen,
  ]
  const pcaAxis2End = [
    PLOT_CX + data.pc2[0] * axisLen,
    PLOT_CY - data.pc2[1] * axisLen,
  ]
  const pcaAxis2Start = [
    PLOT_CX - data.pc2[0] * axisLen,
    PLOT_CY + data.pc2[1] * axisLen,
  ]

  // TDR axes in SVG
  const tdrAxis1End = [
    PLOT_CX + data.choiceAxis[0] * axisLen,
    PLOT_CY - data.choiceAxis[1] * axisLen,
  ]
  const tdrAxis1Start = [
    PLOT_CX - data.choiceAxis[0] * axisLen,
    PLOT_CY + data.choiceAxis[1] * axisLen,
  ]
  const tdrAxis2End = [
    PLOT_CX + data.stimAxis[0] * axisLen,
    PLOT_CY - data.stimAxis[1] * axisLen,
  ]
  const tdrAxis2Start = [
    PLOT_CX - data.stimAxis[0] * axisLen,
    PLOT_CY + data.stimAxis[1] * axisLen,
  ]

  // Axis labels interpolated position and opacity
  const pcaOpacity = 1 - animT
  const tdrOpacity = animT

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* ── Plot background ── */}
        <rect
          x={PLOT_CX - PLOT_R - 10}
          y={PLOT_CY - PLOT_R - 10}
          width={(PLOT_R + 10) * 2}
          height={(PLOT_R + 10) * 2}
          rx={6}
          fill="#fafaf8"
          stroke="#e8e6e0"
          strokeWidth={1}
        />

        {/* ── PCA axes (dashed, gray) ── */}
        <g opacity={Math.max(0.15, 1 - animT * 0.85)}>
          <line
            x1={pcaAxis1Start[0]} y1={pcaAxis1Start[1]}
            x2={pcaAxis1End[0]} y2={pcaAxis1End[1]}
            stroke={PCA_AXIS_COLOR}
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
          <line
            x1={pcaAxis2Start[0]} y1={pcaAxis2Start[1]}
            x2={pcaAxis2End[0]} y2={pcaAxis2End[1]}
            stroke={PCA_AXIS_COLOR}
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
          {/* PCA axis labels */}
          <text
            x={pcaAxis1End[0] + 6}
            y={pcaAxis1End[1] - 4}
            fontSize={10}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.35)"
            opacity={pcaOpacity}
          >
            PC1
          </text>
          <text
            x={pcaAxis2End[0] + 6}
            y={pcaAxis2End[1] - 4}
            fontSize={10}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.35)"
            opacity={pcaOpacity}
          >
            PC2
          </text>
        </g>

        {/* ── TDR axes (solid, teal) ── */}
        <g opacity={Math.max(0.0, animT)}>
          <line
            x1={tdrAxis1Start[0]} y1={tdrAxis1Start[1]}
            x2={tdrAxis1End[0]} y2={tdrAxis1End[1]}
            stroke={TDR_AXIS_COLOR}
            strokeWidth={2}
          />
          <line
            x1={tdrAxis2Start[0]} y1={tdrAxis2Start[1]}
            x2={tdrAxis2End[0]} y2={tdrAxis2End[1]}
            stroke={TDR_AXIS_COLOR}
            strokeWidth={1.5}
          />
          {/* TDR axis labels */}
          <text
            x={tdrAxis1End[0] + 6}
            y={tdrAxis1End[1] - 6}
            fontSize={10}
            fontFamily={FONT}
            fill={TDR_AXIS_COLOR}
            fontWeight={600}
            opacity={tdrOpacity}
          >
            choice axis
          </text>
          <text
            x={tdrAxis2End[0] + 6}
            y={tdrAxis2End[1] - 6}
            fontSize={10}
            fontFamily={FONT}
            fill={TDR_AXIS_COLOR}
            fontWeight={600}
            opacity={tdrOpacity}
          >
            stimulus axis
          </text>
        </g>

        {/* ── Data points ── */}
        {pointPositions.map(([sx, sy], i) => {
          const group = data.labels[i]
          return (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={4}
              fill={CONDITION_COLORS[group]}
              opacity={0.7}
              stroke="#fff"
              strokeWidth={0.5}
            />
          )
        })}

        {/* ── Legend ── */}
        {CONDITION_LABELS.map((label, i) => {
          const lx = PLOT_CX + PLOT_R + 30
          const ly = PLOT_CY - 30 + i * 22
          return (
            <g key={`legend-${i}`}>
              <circle cx={lx} cy={ly} r={5} fill={CONDITION_COLORS[i]} opacity={0.8} />
              <text
                x={lx + 12} y={ly + 4}
                fontSize={10}
                fontFamily={FONT}
                fill="rgba(0,0,0,0.55)"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* ── Title ── */}
        <text
          x={PLOT_CX}
          y={28}
          textAnchor="middle"
          fontSize={13}
          fontFamily={FONT}
          fill="#333"
          fontWeight={600}
        >
          {animT < 0.5
            ? "PCA axes capture variance, not task structure"
            : "TDR axes align with task variables"}
        </text>

        {/* ── Annotation ── */}
        <text
          x={PLOT_CX}
          y={PLOT_CY + PLOT_R + 30}
          textAnchor="middle"
          fontSize={10}
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {animT < 0.5
            ? `PC1 explains ${(data.varExplained[0] * 100).toFixed(0)}% of variance — but mixes conditions`
            : "Regression-defined axes cleanly separate task variables"}
        </text>
      </svg>

      {/* ── Toggle buttons ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0.5rem",
          marginTop: "0.5rem",
        }}
      >
        <button
          className="blog-figure__button"
          onClick={() => handleToggle("pca")}
          style={view === "pca" ? {
            color: "rgba(0,0,0,0.8)",
            borderColor: "rgba(0,0,0,0.35)",
            background: "rgba(0,0,0,0.04)",
          } : undefined}
        >
          PCA view
        </button>
        <button
          className="blog-figure__button"
          onClick={() => handleToggle("tdr")}
          style={view === "tdr" ? {
            color: TDR_AXIS_COLOR,
            borderColor: TDR_AXIS_COLOR,
            background: "rgba(74,124,111,0.06)",
          } : undefined}
        >
          TDR view
        </button>
      </div>
    </div>
  )
}
