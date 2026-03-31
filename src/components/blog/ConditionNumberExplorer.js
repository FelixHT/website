import React, { useState, useMemo, useCallback, useRef } from "react"

/* ─── Layout ─── */
const W = 600
const H = 400
const PAD = 50
const PLOT_W = W - PAD * 2
const PLOT_H = H - PAD * 2

/* ─── Domain ─── */
const X_MIN = -4
const X_MAX = 4
const Y_MIN = -4
const Y_MAX = 6

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const RED = "#c0503a"
const AXIS_COLOR = "rgba(0,0,0,0.15)"
const FONT = "var(--font-mono, monospace)"

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  const sx = PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W
  const sy = PAD + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * PLOT_H
  return [sx, sy]
}

function fromSVG(sx, sy) {
  const x = X_MIN + ((sx - PAD) / PLOT_W) * (X_MAX - X_MIN)
  const y = Y_MAX - ((sy - PAD) / PLOT_H) * (Y_MAX - Y_MIN)
  return [x, y]
}

/* ─── Seeded PRNG ─── */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─── Generate points ─── */
function generatePoints(mode) {
  const rand = mulberry32(42)
  const n = 8
  const points = []

  if (mode === "well") {
    // x-values spread evenly across [-3, 3]
    for (let i = 0; i < n; i++) {
      const x = -3 + (6 / (n - 1)) * i
      const noise = (rand() - 0.5) * 1.2
      const y = 0.8 * x + 1.0 + noise
      points.push({ x, y })
    }
  } else {
    // ill-conditioned: all points clustered near x=0 within ±0.3, except one outlier
    for (let i = 0; i < n - 1; i++) {
      const x = (rand() - 0.5) * 0.6  // within ±0.3
      const noise = (rand() - 0.5) * 0.6
      const y = 0.8 * x + 1.0 + noise
      points.push({ x, y })
    }
    // one outlier point with some leverage (but still x-clustered near 0)
    const xOut = (rand() - 0.5) * 0.5
    const noise = (rand() - 0.5) * 1.5
    const y = 0.8 * xOut + 1.0 + noise
    points.push({ x: xOut, y })
  }

  return points
}

/* ─── OLS via 2×2 normal equations ─── */
// Fit y = a + b*x. Returns { a, b } or null if singular.
function fitOLS(pts) {
  const n = pts.length
  if (n < 2) return null

  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0
  for (const p of pts) {
    sumX += p.x
    sumY += p.y
    sumXX += p.x * p.x
    sumXY += p.x * p.y
  }

  // A^T A = [[n, sumX], [sumX, sumXX]]
  // A^T y = [sumY, sumXY]
  const det = n * sumXX - sumX * sumX
  if (Math.abs(det) < 1e-14) return null

  const a = (sumXX * sumY - sumX * sumXY) / det
  const b = (n * sumXY - sumX * sumY) / det
  return { a, b }
}

/* ─── Condition number of A^T A ─── */
// A is the design matrix [1, x_i]. Compute eigenvalues of A^T A,
// then κ(A) = sqrt(λ_max / λ_min).
function conditionNumber(pts) {
  const n = pts.length
  if (n < 2) return Infinity

  let sumX = 0, sumXX = 0
  for (const p of pts) {
    sumX += p.x
    sumXX += p.x * p.x
  }

  // A^T A = [[n, sumX], [sumX, sumXX]]
  // Eigenvalues of symmetric 2×2 [[a,b],[b,d]]
  const a = n, b = sumX, d = sumXX
  const trace = a + d
  const detM = a * d - b * b
  const disc = Math.sqrt(Math.max(0, (trace / 2) ** 2 - detM))
  const lam1 = trace / 2 + disc
  const lam2 = trace / 2 - disc

  if (Math.abs(lam2) < 1e-14) return Infinity

  // κ(A) = sqrt(λ_max / λ_min) of A^T A
  return Math.sqrt(Math.abs(lam1 / lam2))
}

/* ─── Weight magnitude ‖w‖ = sqrt(a^2 + b^2) ─── */
function weightMag(fit) {
  if (!fit) return null
  return Math.sqrt(fit.a * fit.a + fit.b * fit.b)
}

/* ─── Format number ─── */
function fmt(v, decimals = 2) {
  if (v == null || !isFinite(v)) return "∞"
  if (v > 9999) return v.toExponential(1)
  return v.toFixed(decimals)
}

/* ─── Clamp ─── */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

/* ─── Component ─── */
export default function ConditionNumberExplorer() {
  const [mode, setMode] = useState("well")
  const [points, setPoints] = useState(() => generatePoints("well"))
  const [dragging, setDragging] = useState(null) // index of dragged point
  const svgRef = useRef(null)

  const fit = useMemo(() => fitOLS(points), [points])
  const kappa = useMemo(() => conditionNumber(points), [points])
  const wMag = useMemo(() => weightMag(fit), [fit])

  /* ── Toggle mode ── */
  const handleToggle = useCallback(() => {
    const next = mode === "well" ? "ill" : "well"
    setMode(next)
    setPoints(generatePoints(next))
    setDragging(null)
  }, [mode])

  /* ── SVG mouse helpers ── */
  function getSVGCoords(e) {
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    return [
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY,
    ]
  }

  const handleMouseDown = useCallback((idx) => (e) => {
    e.preventDefault()
    setDragging(idx)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (dragging === null) return
    const [sx, sy] = getSVGCoords(e)
    const [x, y] = fromSVG(sx, sy)
    setPoints((prev) => {
      const next = [...prev]
      next[dragging] = {
        x: clamp(x, X_MIN + 0.1, X_MAX - 0.1),
        y: clamp(y, Y_MIN + 0.1, Y_MAX - 0.1),
      }
      return next
    })
  }, [dragging]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  /* ── Regression line endpoints ── */
  let lineEl = null
  if (fit) {
    const x0 = X_MIN
    const x1 = X_MAX
    const y0 = fit.a + fit.b * x0
    const y1 = fit.a + fit.b * x1
    const [sx0, sy0] = toSVG(x0, y0)
    const [sx1, sy1] = toSVG(x1, y1)
    lineEl = (
      <line
        x1={sx0} y1={sy0}
        x2={sx1} y2={sy1}
        stroke={RED}
        strokeWidth={2}
        strokeLinecap="round"
      />
    )
  }

  /* ── Axis: x=0 and y=0 lines ── */
  const [ax0, ay0] = toSVG(X_MIN, 0)
  const [ax1] = toSVG(X_MAX, 0)
  const [bx0, by0] = toSVG(0, Y_MIN)
  const [, by1] = toSVG(0, Y_MAX)

  /* ── Tick marks ── */
  const xTicks = [-3, -2, -1, 0, 1, 2, 3]
  const yTicks = [-3, -2, -1, 0, 1, 2, 3, 4, 5]

  return (
    <div style={{ fontFamily: FONT, userSelect: "none" }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", cursor: dragging !== null ? "grabbing" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* ── Background ── */}
        <rect x={0} y={0} width={W} height={H} fill="white" />

        {/* ── Grid ── */}
        {xTicks.map((tx) => {
          const [sx] = toSVG(tx, 0)
          return (
            <line
              key={`gx${tx}`}
              x1={sx} y1={PAD}
              x2={sx} y2={H - PAD}
              stroke={AXIS_COLOR}
              strokeWidth={1}
            />
          )
        })}
        {yTicks.map((ty) => {
          const [, sy] = toSVG(0, ty)
          return (
            <line
              key={`gy${ty}`}
              x1={PAD} y1={sy}
              x2={W - PAD} y2={sy}
              stroke={AXIS_COLOR}
              strokeWidth={1}
            />
          )
        })}

        {/* ── Axes ── */}
        <line x1={ax0} y1={ay0} x2={ax1} y2={ay0} stroke={AXIS_COLOR} strokeWidth={1.5} />
        <line x1={bx0} y1={by0} x2={bx0} y2={by1} stroke={AXIS_COLOR} strokeWidth={1.5} />

        {/* ── Tick labels ── */}
        {xTicks.filter((t) => t !== 0).map((tx) => {
          const [sx] = toSVG(tx, 0)
          return (
            <text
              key={`tx${tx}`}
              x={sx}
              y={ay0 + 14}
              textAnchor="middle"
              fontSize={10}
              fill="rgba(0,0,0,0.4)"
              fontFamily={FONT}
            >
              {tx}
            </text>
          )
        })}
        {yTicks.filter((t) => t !== 0).map((ty) => {
          const [, sy] = toSVG(0, ty)
          return (
            <text
              key={`ty${ty}`}
              x={bx0 - 6}
              y={sy + 4}
              textAnchor="end"
              fontSize={10}
              fill="rgba(0,0,0,0.4)"
              fontFamily={FONT}
            >
              {ty}
            </text>
          )
        })}

        {/* ── Regression line ── */}
        {lineEl}

        {/* ── Data points ── */}
        {points.map((p, i) => {
          const [sx, sy] = toSVG(p.x, p.y)
          return (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={6}
              fill={TEAL}
              stroke="white"
              strokeWidth={1.5}
              style={{ cursor: "grab" }}
              onMouseDown={handleMouseDown(i)}
            />
          )
        })}

        {/* ── Stats overlay ── */}
        <rect
          x={W - PAD - 148}
          y={PAD + 4}
          width={148}
          height={62}
          rx={4}
          fill="rgba(255,255,255,0.9)"
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />
        <text
          x={W - PAD - 138}
          y={PAD + 22}
          fontSize={12}
          fontFamily={FONT}
          fill="#333"
        >
          κ = {fmt(kappa, kappa > 100 ? 0 : 1)}
        </text>
        <text
          x={W - PAD - 138}
          y={PAD + 40}
          fontSize={12}
          fontFamily={FONT}
          fill="#333"
        >
          ‖w‖ = {fmt(wMag, 2)}
        </text>
        <text
          x={W - PAD - 138}
          y={PAD + 58}
          fontSize={12}
          fontFamily={FONT}
          fill="#333"
        >
          {fit
            ? `ŷ=${fmt(fit.a)} ${fit.b >= 0 ? "+" : "−"} ${fmt(Math.abs(fit.b))}x`
            : "singular"}
        </text>
      </svg>

      {/* ── Controls ── */}
      <div
        className="blog-figure__controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginTop: "8px",
          fontFamily: FONT,
          fontSize: "13px",
        }}
      >
        <button
          onClick={handleToggle}
          style={{
            fontFamily: FONT,
            fontSize: "13px",
            padding: "5px 14px",
            background: "white",
            border: "1.5px solid black",
            borderRadius: "3px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
        >
          {mode === "well" ? "Switch to ill-conditioned" : "Switch to well-conditioned"}
        </button>
        <span style={{ color: "#555" }}>
          {mode === "well"
            ? "Well-conditioned — drag any point"
            : "Ill-conditioned — drag any point to see instability"}
        </span>
      </div>
    </div>
  )
}
