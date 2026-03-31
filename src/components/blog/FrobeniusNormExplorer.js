import React, { useState, useMemo, useRef, useCallback } from "react"

/* ─── Layout ─── */
const W = 750
const H = 380
const FONT = "var(--font-mono, monospace)"

/* ─── Point cloud panel (left half) ─── */
const PC_CX = 170
const PC_CY = 190
const PC_SCALE = 70

/* ─── Loss curve panel (right half) ─── */
const CURVE_LEFT = 410
const CURVE_TOP = 40
const CURVE_W = 300
const CURVE_H = 260
const CURVE_RIGHT = CURVE_LEFT + CURVE_W
const CURVE_BOTTOM = CURVE_TOP + CURVE_H

/* ─── Colors ─── */
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const TEAL = "#4A7C6F"
const N_POINTS = 8
const N_SAMPLES = 360

/* ─── Seeded PRNG (mulberry32) ─── */
function mulberry32(seed) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─── Generate matched point clouds ─── */
function generateClouds() {
  const rng = mulberry32(33)
  const rand = () => rng() * 2 - 1

  // Generate X as random 2D points
  const X = []
  for (let i = 0; i < N_POINTS; i++) {
    X.push([rand() * 2, rand() * 2])
  }

  // Generate Y by rotating X by a known angle and adding noise
  // True rotation: ~40 degrees
  const trueAngle = 0.7
  const cosT = Math.cos(trueAngle)
  const sinT = Math.sin(trueAngle)
  const Y = X.map(([x, y]) => [
    cosT * x - sinT * y + rand() * 0.25,
    sinT * x + cosT * y + rand() * 0.25,
  ])

  return { X, Y }
}

/* ─── Rotation matrix ─── */
function rotMat(theta) {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return [c, -s, s, c]
}

/* ─── Apply rotation to a point ─── */
function applyRot(R, p) {
  return [R[0] * p[0] + R[1] * p[1], R[2] * p[0] + R[3] * p[1]]
}

/* ─── Frobenius norm of X - Y*R(theta) ─── */
function frobNorm(X, Y, theta) {
  const R = rotMat(theta)
  let sum = 0
  for (let i = 0; i < X.length; i++) {
    const yr = applyRot(R, Y[i])
    const dx = X[i][0] - yr[0]
    const dy = X[i][1] - yr[1]
    sum += dx * dx + dy * dy
  }
  return Math.sqrt(sum)
}

/* ─── Find optimal angle via SVD of Y^T X ─── */
function optimalAngle(X, Y) {
  // Compute M = Y^T X (2x2)
  let m00 = 0, m01 = 0, m10 = 0, m11 = 0
  for (let i = 0; i < X.length; i++) {
    m00 += Y[i][0] * X[i][0]
    m01 += Y[i][0] * X[i][1]
    m10 += Y[i][1] * X[i][0]
    m11 += Y[i][1] * X[i][1]
  }

  // For 2x2, optimal rotation angle from SVD:
  // R = V U^T where M = U S V^T
  // For 2D rotation finding, the angle is atan2(m10 - m01, m00 + m11)
  const angle = Math.atan2(m10 - m01, m00 + m11)
  return angle
}

/* ─── Coordinate transforms for point cloud panel ─── */
function toPC(x, y) {
  return [PC_CX + x * PC_SCALE, PC_CY - y * PC_SCALE]
}

/* ─── Component ─── */
export default function FrobeniusNormExplorer() {
  const [angleDeg, setAngleDeg] = useState(0)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef(null)

  const angleRad = (angleDeg * Math.PI) / 180

  /* ─── Generate data once ─── */
  const { X, Y } = useMemo(() => generateClouds(), [])

  /* ─── SVD-optimal angle ─── */
  const optAngleRad = useMemo(() => optimalAngle(X, Y), [X, Y])
  const optAngleDeg = (optAngleRad * 180) / Math.PI
  const optAngleNorm = ((optAngleDeg % 360) + 360) % 360

  /* ─── Precompute loss curve ─── */
  const { lossCurve, minLoss, maxLoss, minIdx } = useMemo(() => {
    const curve = []
    let mn = Infinity
    let mx = 0
    let mIdx = 0
    for (let i = 0; i < N_SAMPLES; i++) {
      const theta = (i * 2 * Math.PI) / N_SAMPLES
      const loss = frobNorm(X, Y, theta)
      curve.push(loss)
      if (loss < mn) {
        mn = loss
        mIdx = i
      }
      if (loss > mx) mx = loss
    }
    return { lossCurve: curve, minLoss: mn, maxLoss: mx, minIdx: mIdx }
  }, [X, Y])

  /* ─── Current loss ─── */
  const currentLoss = useMemo(() => frobNorm(X, Y, angleRad), [X, Y, angleRad])

  /* ─── Rotated Y points ─── */
  const YRotated = useMemo(() => {
    const R = rotMat(angleRad)
    return Y.map((p) => applyRot(R, p))
  }, [Y, angleRad])

  /* ─── Loss curve path ─── */
  const curvePath = useMemo(() => {
    const yPad = 0.05 * (maxLoss - minLoss) || 0.1
    const yMin = minLoss - yPad
    const yMax = maxLoss + yPad
    const pts = lossCurve.map((loss, i) => {
      const cx = CURVE_LEFT + (i / (N_SAMPLES - 1)) * CURVE_W
      const cy = CURVE_BOTTOM - ((loss - yMin) / (yMax - yMin)) * CURVE_H
      return `${cx.toFixed(1)},${cy.toFixed(1)}`
    })
    return `M ${pts.join(" L ")}`
  }, [lossCurve, minLoss, maxLoss])

  /* ─── Axis scale helpers ─── */
  const yPad = 0.05 * (maxLoss - minLoss) || 0.1
  const yMin = minLoss - yPad
  const yMax = maxLoss + yPad

  function lossToY(loss) {
    return CURVE_BOTTOM - ((loss - yMin) / (yMax - yMin)) * CURVE_H
  }

  function degToX(deg) {
    return CURVE_LEFT + (deg / 360) * CURVE_W
  }

  /* ─── Minimum marker position ─── */
  const minX = degToX(optAngleNorm)
  const minY = lossToY(minLoss)

  /* ─── Current angle marker position ─── */
  const currentAngleNorm = ((angleDeg % 360) + 360) % 360
  const currentX = degToX(currentAngleNorm)
  const currentY = lossToY(currentLoss)

  /* ─── Connecting lines between matched points ─── */
  const connections = useMemo(() => {
    return X.map((xp, i) => {
      const [x1, y1] = toPC(xp[0], xp[1])
      const [x2, y2] = toPC(YRotated[i][0], YRotated[i][1])
      return { x1, y1, x2, y2 }
    })
  }, [X, YRotated])

  /* ─── Drag handler on SVG for curve interaction ─── */
  const angleFromPointer = useCallback(
    (e) => {
      const svg = svgRef.current
      if (!svg) return null
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const sp = pt.matrixTransform(svg.getScreenCTM().inverse())
      const frac = (sp.x - CURVE_LEFT) / CURVE_W
      if (frac < 0 || frac > 1) return null
      return frac * 360
    },
    []
  )

  const handleCurvePointerDown = useCallback(
    (e) => {
      const deg = angleFromPointer(e)
      if (deg !== null) {
        e.target.setPointerCapture(e.pointerId)
        setAngleDeg(deg)
        setDragging(true)
      }
    },
    [angleFromPointer]
  )

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging) return
      const svg = svgRef.current
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const sp = pt.matrixTransform(svg.getScreenCTM().inverse())
      const frac = Math.max(0, Math.min(1, (sp.x - CURVE_LEFT) / CURVE_W))
      setAngleDeg(frac * 360)
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(false), [])

  /* ─── Y-axis tick values ─── */
  const yTicks = useMemo(() => {
    const range = yMax - yMin
    const rawStep = range / 4
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const candidates = [1, 2, 5, 10]
    let step = mag
    for (const c of candidates) {
      if (c * mag >= rawStep) {
        step = c * mag
        break
      }
    }
    const ticks = []
    const start = Math.ceil(yMin / step) * step
    for (let v = start; v <= yMax; v += step) {
      ticks.push(v)
    }
    return ticks
  }, [yMin, yMax])

  /* ─── X-axis tick values ─── */
  const xTicks = [0, 90, 180, 270, 360]

  return (
    <div style={{ width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          userSelect: "none",
          touchAction: "none",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* ════════════════════════════════════════════════
            Left half: point clouds
            ════════════════════════════════════════════════ */}

        {/* Axes */}
        <line
          x1={PC_CX - 150}
          y1={PC_CY}
          x2={PC_CX + 150}
          y2={PC_CY}
          stroke="rgba(0,0,0,0.06)"
        />
        <line
          x1={PC_CX}
          y1={PC_CY - 150}
          x2={PC_CX}
          y2={PC_CY + 150}
          stroke="rgba(0,0,0,0.06)"
        />

        {/* Connecting lines between matched pairs */}
        {connections.map((c, i) => (
          <line
            key={`conn-${i}`}
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        ))}

        {/* X points (blue) */}
        {X.map((p, i) => {
          const [sx, sy] = toPC(p[0], p[1])
          return (
            <circle
              key={`x-${i}`}
              cx={sx}
              cy={sy}
              r="4.5"
              fill={BLUE}
              opacity="0.85"
            />
          )
        })}

        {/* Y(rotated) points (red) */}
        {YRotated.map((p, i) => {
          const [sx, sy] = toPC(p[0], p[1])
          return (
            <circle
              key={`y-${i}`}
              cx={sx}
              cy={sy}
              r="4.5"
              fill={RED}
              opacity="0.85"
            />
          )
        })}

        {/* Point cloud labels */}
        <text
          x={20}
          y={24}
          fontSize="11"
          fontFamily={FONT}
          fill={BLUE}
          fontWeight="600"
        >
          X
        </text>
        <text
          x={48}
          y={24}
          fontSize="11"
          fontFamily={FONT}
          fill={RED}
          fontWeight="600"
        >
          YR({"\u03B8"})
        </text>

        {/* Current angle readout */}
        <text
          x={20}
          y={H - 16}
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {"\u03B8"} = {currentAngleNorm.toFixed(0)}{"\u00B0"}
        </text>

        {/* Loss readout */}
        <text
          x={20}
          y={H - 32}
          fontSize="10"
          fontFamily={FONT}
          fill={TEAL}
        >
          {"\u2016"}X {"\u2212"} YR{"\u2016"}{"\u1D62"} = {currentLoss.toFixed(2)}
        </text>

        {/* ════════════════════════════════════════════════
            Right half: loss curve
            ════════════════════════════════════════════════ */}

        {/* Curve background (interactive area) */}
        <rect
          x={CURVE_LEFT}
          y={CURVE_TOP}
          width={CURVE_W}
          height={CURVE_H}
          fill="rgba(0,0,0,0.015)"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.5"
          style={{ cursor: "crosshair" }}
          onPointerDown={handleCurvePointerDown}
        />

        {/* Y-axis gridlines and labels */}
        {yTicks.map((v) => {
          const y = lossToY(v)
          if (y < CURVE_TOP + 2 || y > CURVE_BOTTOM - 2) return null
          return (
            <g key={`ytick-${v}`}>
              <line
                x1={CURVE_LEFT}
                y1={y}
                x2={CURVE_RIGHT}
                y2={y}
                stroke="rgba(0,0,0,0.06)"
                strokeWidth="0.5"
              />
              <text
                x={CURVE_LEFT - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fontFamily={FONT}
                fill="rgba(0,0,0,0.3)"
              >
                {v.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* X-axis tick labels */}
        {xTicks.map((deg) => {
          const x = degToX(deg)
          return (
            <g key={`xtick-${deg}`}>
              <line
                x1={x}
                y1={CURVE_BOTTOM}
                x2={x}
                y2={CURVE_BOTTOM + 4}
                stroke="rgba(0,0,0,0.15)"
                strokeWidth="0.5"
              />
              <text
                x={x}
                y={CURVE_BOTTOM + 16}
                textAnchor="middle"
                fontSize="9"
                fontFamily={FONT}
                fill="rgba(0,0,0,0.3)"
              >
                {deg}{"\u00B0"}
              </text>
            </g>
          )
        })}

        {/* Axis labels */}
        <text
          x={CURVE_LEFT + CURVE_W / 2}
          y={CURVE_BOTTOM + 32}
          textAnchor="middle"
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.35)"
        >
          rotation angle {"\u03B8"}
        </text>
        <text
          x={CURVE_LEFT - 34}
          y={CURVE_TOP + CURVE_H / 2}
          textAnchor="middle"
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.35)"
          transform={`rotate(-90, ${CURVE_LEFT - 34}, ${CURVE_TOP + CURVE_H / 2})`}
        >
          {"\u2016"}X {"\u2212"} YR({"\u03B8"}){"\u2016"}{"\u1D62"}
        </text>

        {/* Loss curve */}
        <path
          d={curvePath}
          fill="none"
          stroke={TEAL}
          strokeWidth="1.5"
          strokeLinejoin="round"
          clipPath="url(#frob-clip)"
        />

        <defs>
          <clipPath id="frob-clip">
            <rect
              x={CURVE_LEFT}
              y={CURVE_TOP}
              width={CURVE_W}
              height={CURVE_H}
            />
          </clipPath>
        </defs>

        {/* Current angle: vertical dashed line */}
        <line
          x1={currentX}
          y1={CURVE_TOP}
          x2={currentX}
          y2={CURVE_BOTTOM}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        {/* Current angle: dot on curve */}
        <circle
          cx={currentX}
          cy={currentY}
          r="4"
          fill="rgba(0,0,0,0.5)"
          stroke="#fff"
          strokeWidth="1"
        />

        {/* Minimum marker: teal dot */}
        <circle
          cx={minX}
          cy={minY}
          r="5"
          fill={TEAL}
          stroke="#fff"
          strokeWidth="1.5"
        />

        {/* Minimum label */}
        <text
          x={minX + 8}
          y={minY - 10}
          fontSize="10"
          fontFamily={FONT}
          fill={TEAL}
          fontWeight="600"
        >
          optimal
        </text>
        <text
          x={minX + 8}
          y={minY + 3}
          fontSize="9"
          fontFamily={FONT}
          fill={TEAL}
          opacity="0.7"
        >
          SVD solution
        </text>

        {/* Panel title */}
        <text
          x={CURVE_LEFT + CURVE_W / 2}
          y={CURVE_TOP - 14}
          textAnchor="middle"
          fontSize="11"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
          fontWeight="600"
        >
          Frobenius norm loss
        </text>
      </svg>

      {/* ── Angle slider ── */}
      <div
        className="dim-explorer__slider"
        style={{ maxWidth: 400, margin: "4px auto 0" }}
      >
        <label className="dim-explorer__label">
          rotation {"\u03B8"}:{" "}
          <strong style={{ color: TEAL, minWidth: 32 }}>
            {currentAngleNorm.toFixed(0)}{"\u00B0"}
          </strong>
        </label>
        <input
          className="dim-explorer__range"
          type="range"
          min="0"
          max="360"
          step="1"
          value={angleDeg}
          onChange={(e) => setAngleDeg(parseFloat(e.target.value))}
        />
      </div>
    </div>
  )
}
