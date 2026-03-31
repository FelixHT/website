import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 600
const H = 400
const PAD = { top: 30, right: 30, bottom: 50, left: 50 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const RED = "#c0503a"
const FONT = "var(--font-mono, monospace)"

/* ─── Mulberry32 PRNG ─── */
function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─── Generate dataset ─── */
function generateData() {
  const rand = mulberry32(77)

  // Clustered x-values to induce mild ill-conditioning (κ ≈ 50-100)
  // Most points near 0.4–0.6 with a few outliers
  const xRaw = [
    0.42, 0.45, 0.47, 0.50, 0.52, 0.55, 0.57, 0.60,
    0.10, 0.20, 0.80, 0.90,
  ]
  const trueSlope = 2.5
  const trueIntercept = 0.5
  const noiseStd = 0.25

  const points = xRaw.map((x) => {
    const noise = (rand() + rand() + rand() + rand() - 2) * noiseStd
    const y = trueIntercept + trueSlope * x + noise
    return { x, y }
  })

  // First 8 are train, last 4 are test
  const train = points.slice(0, 8)
  const test = points.slice(8)

  return { train, test }
}

/* ─── Solve ridge regression: w = (A^T A + λI)^{-1} A^T y ─── */
// A is n×2 with rows [1, x_i]; we compute the 2×2 normal equations directly
function solveRidge(train, lambda) {
  // Accumulate A^T A and A^T y
  let a00 = 0, a01 = 0, a11 = 0 // symmetric 2×2
  let b0 = 0, b1 = 0

  for (const { x, y } of train) {
    a00 += 1       // sum of 1*1
    a01 += x       // sum of 1*x
    a11 += x * x   // sum of x*x
    b0 += y        // sum of 1*y
    b1 += x * y    // sum of x*y
  }

  // Add λI
  a00 += lambda
  a11 += lambda

  // Solve 2×2 system via Cramer's rule
  const det = a00 * a11 - a01 * a01
  if (Math.abs(det) < 1e-12) return { w0: 0, w1: 0 }

  const w0 = (b0 * a11 - b1 * a01) / det
  const w1 = (a00 * b1 - a01 * b0) / det

  return { w0, w1 }
}

/* ─── Compute MSE for a set of points ─── */
function computeMSE(points, w0, w1) {
  if (points.length === 0) return 0
  let sum = 0
  for (const { x, y } of points) {
    const pred = w0 + w1 * x
    const err = y - pred
    sum += err * err
  }
  return sum / points.length
}

/* ─── Map data coords to SVG coords ─── */
function makeScales(allPoints) {
  const xs = allPoints.map((p) => p.x)
  const ys = allPoints.map((p) => p.y)
  const xMin = Math.min(...xs) - 0.08
  const xMax = Math.max(...xs) + 0.08
  const yMin = Math.min(...ys) - 0.2
  const yMax = Math.max(...ys) + 0.2

  const toSvgX = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * PLOT_W
  const toSvgY = (y) => PAD.top + ((yMax - y) / (yMax - yMin)) * PLOT_H
  const fromSvgX = (sx) => xMin + ((sx - PAD.left) / PLOT_W) * (xMax - xMin)

  return { xMin, xMax, yMin, yMax, toSvgX, toSvgY, fromSvgX }
}

/* ─── Static dataset (created once) ─── */
const { train: TRAIN, test: TEST } = generateData()
const ALL_POINTS = [...TRAIN, ...TEST]
const SCALES = makeScales(ALL_POINTS)

/* ─── Axis tick helpers ─── */
function niceLinear(min, max, count) {
  const step = (max - min) / count
  const ticks = []
  for (let i = 0; i <= count; i++) {
    ticks.push(+(min + i * step).toFixed(2))
  }
  return ticks
}

export default function RidgeExplorer() {
  const [lambda, setLambda] = useState(0)

  const { w0, w1, trainMSE, testMSE, normSq } = useMemo(() => {
    const { w0, w1 } = solveRidge(TRAIN, lambda)
    const trainMSE = computeMSE(TRAIN, w0, w1)
    const testMSE = computeMSE(TEST, w0, w1)
    const normSq = w0 * w0 + w1 * w1
    return { w0, w1, trainMSE, testMSE, normSq }
  }, [lambda])

  const { toSvgX, toSvgY, xMin, xMax } = SCALES

  // Regression line endpoints (clipped to plot x range)
  const x1 = xMin
  const x2 = xMax
  const lineX1 = toSvgX(x1)
  const lineY1 = toSvgY(w0 + w1 * x1)
  const lineX2 = toSvgX(x2)
  const lineY2 = toSvgY(w0 + w1 * x2)

  // Axis ticks
  const xTicks = niceLinear(0, 1, 5)
  const yTicks = niceLinear(
    Math.min(...ALL_POINTS.map((p) => p.y)) - 0.2,
    Math.max(...ALL_POINTS.map((p) => p.y)) + 0.2,
    4
  )

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", maxWidth: "100%" }}
      >
        {/* Plot background */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="#fafafa"
          stroke="#ddd"
          strokeWidth={1}
        />

        {/* X axis ticks */}
        {xTicks.map((tick) => {
          const sx = toSvgX(tick)
          if (sx < PAD.left - 1 || sx > PAD.left + PLOT_W + 1) return null
          return (
            <g key={tick}>
              <line
                x1={sx}
                y1={PAD.top + PLOT_H}
                x2={sx}
                y2={PAD.top + PLOT_H + 5}
                stroke="#888"
                strokeWidth={1}
              />
              <text
                x={sx}
                y={PAD.top + PLOT_H + 16}
                textAnchor="middle"
                fontSize={11}
                fill="#555"
                fontFamily={FONT}
              >
                {tick.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Y axis ticks */}
        {yTicks.map((tick) => {
          const sy = toSvgY(tick)
          if (sy < PAD.top - 1 || sy > PAD.top + PLOT_H + 1) return null
          return (
            <g key={tick}>
              <line
                x1={PAD.left - 5}
                y1={sy}
                x2={PAD.left}
                y2={sy}
                stroke="#888"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={sy + 4}
                textAnchor="end"
                fontSize={11}
                fill="#555"
                fontFamily={FONT}
              >
                {tick.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Axis labels */}
        <text
          x={PAD.left + PLOT_W / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={12}
          fill="#444"
          fontFamily={FONT}
        >
          x
        </text>
        <text
          x={14}
          y={PAD.top + PLOT_H / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#444"
          fontFamily={FONT}
          transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}
        >
          y
        </text>

        {/* Regression line */}
        <line
          x1={lineX1}
          y1={lineY1}
          x2={lineX2}
          y2={lineY2}
          stroke="#000"
          strokeWidth={1.5}
          clipPath="url(#plot-clip)"
        />

        {/* Clip path for regression line */}
        <defs>
          <clipPath id="plot-clip">
            <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {/* Train points */}
        {TRAIN.map((pt, i) => (
          <circle
            key={`train-${i}`}
            cx={toSvgX(pt.x)}
            cy={toSvgY(pt.y)}
            r={5}
            fill={TEAL}
            fillOpacity={0.85}
          />
        ))}

        {/* Test points */}
        {TEST.map((pt, i) => (
          <circle
            key={`test-${i}`}
            cx={toSvgX(pt.x)}
            cy={toSvgY(pt.y)}
            r={5}
            fill={RED}
            fillOpacity={0.85}
          />
        ))}

        {/* Legend */}
        <g transform={`translate(${PAD.left + 10}, ${PAD.top + 10})`}>
          <circle cx={6} cy={6} r={5} fill={TEAL} fillOpacity={0.85} />
          <text x={16} y={10} fontSize={11} fill="#444" fontFamily={FONT}>
            train
          </text>
          <circle cx={6} cy={22} r={5} fill={RED} fillOpacity={0.85} />
          <text x={16} y={26} fontSize={11} fill="#444" fontFamily={FONT}>
            test
          </text>
        </g>
      </svg>

      {/* Controls */}
      <div className="blog-figure__controls" style={{ marginTop: 12 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: FONT,
            fontSize: 13,
          }}
        >
          <span style={{ minWidth: 72 }}>λ = {lambda.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.01}
            value={lambda}
            onChange={(e) => setLambda(parseFloat(e.target.value))}
            style={{ flex: 1, maxWidth: 260 }}
          />
        </label>

        {/* Metrics */}
        <div
          style={{
            display: "flex",
            gap: 28,
            marginTop: 10,
            fontFamily: FONT,
            fontSize: 12,
            color: "#444",
          }}
        >
          <span>Train MSE: {trainMSE.toFixed(2)}</span>
          <span>Test MSE: {testMSE.toFixed(2)}</span>
          <span>‖w‖²: {normSq.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
