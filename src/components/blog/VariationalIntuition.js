import React, { useState, useMemo } from "react"
import { scaleLinear } from "d3-scale"
import { BTN_BASE } from "./figureConstants"

const W = 800
const H = 400
const MARGIN = { top: 40, right: 20, bottom: 50, left: 50 }
const PLOT_W = W - MARGIN.left - MARGIN.right
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const FONT = "var(--font-mono, monospace)"
const GRID_N = 60
const N_STEPS = 50

const PURPLE = "#7b68ae"

// True posterior: mixture of 2 Gaussians
const MODE_A = { mu: [-1.5, 0], sigma: [0.3, 0.3] }
const MODE_B = { mu: [1.5, 0.5], sigma: [0.3, 0.3] }
const MIX_WEIGHT_A = 0.4
const MIX_WEIGHT_B = 0.6

// Optimization path for variational approximation (50 steps)
// Start: wide centered at origin, End: tight around mode B (the larger mode)
const START_MU = [0, 0]
const END_MU = [1.5, 0.5]
const START_SIGMA = [2.0, 2.0]
const END_SIGMA = [0.35, 0.35]

function gaussian2D(x, y, mu, sigma) {
  const dx = (x - mu[0]) / sigma[0]
  const dy = (y - mu[1]) / sigma[1]
  return Math.exp(-0.5 * (dx * dx + dy * dy)) / (2 * Math.PI * sigma[0] * sigma[1])
}

function truePosterior(x, y) {
  return MIX_WEIGHT_A * gaussian2D(x, y, MODE_A.mu, MODE_A.sigma) +
    MIX_WEIGHT_B * gaussian2D(x, y, MODE_B.mu, MODE_B.sigma)
}

function qDensity(x, y, mu, sigma) {
  return gaussian2D(x, y, mu, sigma)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function interpolateParams(step) {
  const t = step / N_STEPS
  return {
    mu: [lerp(START_MU[0], END_MU[0], t), lerp(START_MU[1], END_MU[1], t)],
    sigma: [lerp(START_SIGMA[0], END_SIGMA[0], t), lerp(START_SIGMA[1], END_SIGMA[1], t)],
  }
}

// Warm color scale: low density -> transparent/white, high density -> orange-red
function densityColor(val, maxVal) {
  const t = Math.min(val / maxVal, 1)
  if (t < 0.01) return "rgba(255,255,255,0)"
  // Interpolate: white -> gold -> orange -> red
  const r = Math.round(255)
  const g = Math.round(255 - t * 180)
  const b = Math.round(255 - t * 230)
  const a = Math.min(t * 1.5, 0.95)
  return `rgba(${r},${g},${b},${a})`
}

export default function VariationalIntuition() {
  const [step, setStep] = useState(0)

  // Grid bounds
  const xMin = -3.5, xMax = 3.5
  const yMin = -2.5, yMax = 2.5

  const sx = useMemo(
    () => scaleLinear().domain([xMin, xMax]).range([0, PLOT_W]),
    []
  )
  const sy = useMemo(
    () => scaleLinear().domain([yMin, yMax]).range([PLOT_H, 0]),
    []
  )

  // Pre-compute the true posterior heatmap (does not change)
  const { heatmap, maxDensity } = useMemo(() => {
    const cellW = (xMax - xMin) / GRID_N
    const cellH = (yMax - yMin) / GRID_N
    let maxD = 0
    const cells = []
    for (let i = 0; i < GRID_N; i++) {
      for (let j = 0; j < GRID_N; j++) {
        const cx = xMin + (i + 0.5) * cellW
        const cy = yMin + (j + 0.5) * cellH
        const d = truePosterior(cx, cy)
        if (d > maxD) maxD = d
        cells.push({ i, j, cx, cy, d })
      }
    }
    return { heatmap: cells, maxDensity: maxD }
  }, [])

  const cellW = PLOT_W / GRID_N
  const cellH = PLOT_H / GRID_N

  // Current variational parameters
  const { mu, sigma } = useMemo(() => interpolateParams(step), [step])

  // Approximate KL(q || p) on the grid
  const klValue = useMemo(() => {
    const gridCellW = (xMax - xMin) / GRID_N
    const gridCellH = (yMax - yMin) / GRID_N
    const area = gridCellW * gridCellH
    let kl = 0
    for (let i = 0; i < GRID_N; i++) {
      for (let j = 0; j < GRID_N; j++) {
        const cx = xMin + (i + 0.5) * gridCellW
        const cy = yMin + (j + 0.5) * gridCellH
        const q = qDensity(cx, cy, mu, sigma)
        const p = truePosterior(cx, cy)
        if (q > 1e-12 && p > 1e-12) {
          kl += q * Math.log(q / p) * area
        } else if (q > 1e-12) {
          // p is ~0 but q is not: this contributes +infinity in theory,
          // but since we're on a grid, we clip
          kl += q * Math.log(q / 1e-12) * area
        }
      }
    }
    return Math.max(0, kl)
  }, [mu, sigma])

  // 2-sigma ellipse for variational approximation
  const ellipsePoints = useMemo(() => {
    const pts = []
    const nPts = 80
    for (let k = 0; k <= nPts; k++) {
      const angle = (2 * Math.PI * k) / nPts
      const ex = mu[0] + 2 * sigma[0] * Math.cos(angle)
      const ey = mu[1] + 2 * sigma[1] * Math.sin(angle)
      pts.push(`${k === 0 ? "M" : "L"}${sx(ex)},${sy(ey)}`)
    }
    return pts.join(" ") + "Z"
  }, [mu, sigma, sx, sy])

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {/* Heatmap of true posterior */}
          {heatmap.map((cell, idx) => {
            const color = densityColor(cell.d, maxDensity)
            if (cell.d < maxDensity * 0.005) return null
            return (
              <rect
                key={idx}
                x={cell.i * cellW}
                y={PLOT_H - (cell.j + 1) * cellH}
                width={cellW + 0.5}
                height={cellH + 0.5}
                fill={color}
              />
            )
          })}

          {/* Variational approximation ellipse */}
          <path
            d={ellipsePoints}
            fill="none"
            stroke={PURPLE}
            strokeWidth={2.5}
            opacity={0.9}
          />
          {/* Fill the ellipse lightly */}
          <path
            d={ellipsePoints}
            fill={PURPLE}
            opacity={0.08}
            stroke="none"
          />

          {/* Center of q */}
          <circle
            cx={sx(mu[0])}
            cy={sy(mu[1])}
            r={4}
            fill={PURPLE}
            stroke="#fff"
            strokeWidth={1.5}
          />

          {/* Label the modes */}
          <text
            x={sx(MODE_A.mu[0])}
            y={sy(MODE_A.mu[1]) - 12}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#c0503a", fontWeight: 600 }}
          >
            mode A
          </text>
          <text
            x={sx(MODE_B.mu[0])}
            y={sy(MODE_B.mu[1]) - 12}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#c0503a", fontWeight: 600 }}
          >
            mode B
          </text>

          {/* q label */}
          <text
            x={sx(mu[0]) + 2 * sigma[0] * (PLOT_W / (xMax - xMin)) + 8}
            y={sy(mu[1])}
            dominantBaseline="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: PURPLE, fontWeight: 600 }}
          >
            q(z)
          </text>

          {/* Axes */}
          <line x1={0} y1={PLOT_H} x2={PLOT_W} y2={PLOT_H} stroke="#ccc" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={PLOT_H} stroke="#ccc" strokeWidth={1} />
          <text
            x={PLOT_W / 2} y={PLOT_H + 28}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#aaa" }}
          >
            z₁
          </text>
          <text
            x={-14} y={PLOT_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -14, ${PLOT_H / 2})`}
            style={{ fontFamily: FONT, fontSize: 10, fill: "#aaa" }}
          >
            z₂
          </text>
        </g>

        {/* Title */}
        <text
          x={W / 2} y={22}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 13, fill: "#333", fontWeight: 600 }}
        >
          Variational approximation converging on posterior
        </text>

        {/* KL annotation */}
        <text
          x={W - MARGIN.right - 10} y={MARGIN.top + 20}
          textAnchor="end"
          style={{ fontFamily: FONT, fontSize: 11, fill: PURPLE }}
        >
          {`KL(q ∥ p) ≈ ${klValue.toFixed(2)}`}
        </text>

        {/* Legend */}
        <g transform={`translate(${W - MARGIN.right - 150}, ${MARGIN.top + 32})`}>
          <rect x={0} y={0} width={14} height={10} fill="rgba(255,120,50,0.7)" rx={1} />
          <text
            x={18} y={9}
            style={{ fontFamily: FONT, fontSize: 9, fill: "#555" }}
          >
            True posterior p(z|x)
          </text>
          <line x1={0} y1={20} x2={14} y2={20} stroke={PURPLE} strokeWidth={2.5} />
          <text
            x={18} y={28}
            style={{ fontFamily: FONT, fontSize: 9, fill: "#555" }}
          >
            Approx q(z) (2σ)
          </text>
        </g>
      </svg>

      {/* Slider */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginTop: 6,
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Optimization step: {step}
          <input
            type="range"
            min={0}
            max={N_STEPS}
            step={1}
            value={step}
            onChange={e => setStep(Number(e.target.value))}
            style={{ width: 260 }}
          />
        </label>
      </div>
    </div>
  )
}
