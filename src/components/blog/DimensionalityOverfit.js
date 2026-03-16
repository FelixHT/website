import React, { useState, useMemo } from "react"
import { scaleLinear, scaleBand } from "d3-scale"
import {
  generateReachingTask,
  inferSingleTrial,
  loadDemoModel,
} from "./lfads-math"
import { mulberry32 } from "./psid-math"
import modelJson from "./lfads-demo-model.json"

const W = 800
const H = 420
const MARGIN = { top: 40, right: 20, bottom: 30, left: 50 }
const FONT = "var(--font-mono, monospace)"

const TOP_H = 220
const BOT_H = 120
const ROW_GAP = 30
const PLOT_W = W - MARGIN.left - MARGIN.right

const DIMS = [1, 2, 3, 4, 5, 6, 8]
const N_COND = 1
const N_TRIALS = 3
const N_NEURONS = 20
const T = 100

const COLOR_LOW = "#4A90D9"
const COLOR_SWEET = "#4A7C6F"
const COLOR_HIGH = "#8B4A3A"

function dimColor(d) {
  if (d <= 2) return COLOR_LOW
  if (d <= 4) return COLOR_SWEET
  return COLOR_HIGH
}

export default function DimensionalityOverfit() {
  const [dimIdx, setDimIdx] = useState(2) // Default to dim=3

  const model = useMemo(() => loadDemoModel(modelJson.default), [])
  const taskData = useMemo(
    () => generateReachingTask(8, N_TRIALS, N_NEURONS, 42),
    []
  )

  // Run LFADS inference on 3 trials of condition 0
  const fullInference = useMemo(() => {
    const results = []
    for (let tr = 0; tr < N_TRIALS; tr++) {
      const inf = inferSingleTrial(taskData.spikes[0][tr], model)
      results.push(inf)
    }
    return results
  }, [taskData, model])

  // Pre-compute results at each dimensionality
  // For dims <= model dim (3): take first d dims of states
  // For dims > model dim: pad with noise dimensions
  const dimResults = useMemo(() => {
    const rng = mulberry32(99)
    const modelDim = fullInference[0].states[0].length // 3

    const results = {}
    for (const d of DIMS) {
      const trajectories = []
      let totalSS = 0
      let totalResSS = 0

      for (let tr = 0; tr < N_TRIALS; tr++) {
        const states = fullInference[tr].states
        const rates = fullInference[tr].rates
        const spikes = taskData.spikes[0][tr]

        // Build trajectory at dim d
        const traj = []
        for (let t = 0; t < T; t++) {
          const pt = []
          for (let i = 0; i < Math.min(d, modelDim); i++) {
            pt.push(states[t][i])
          }
          // If d > modelDim, add noise dims (simulating overfitting)
          for (let i = modelDim; i < d; i++) {
            // Noise that grows with extra dims
            const u1 = rng() || 1e-15
            const u2 = rng()
            const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
            pt.push(noise * 0.3 * (i - modelDim + 1))
          }
          traj.push(pt)
        }
        trajectories.push(traj)

        // Compute R^2: how well do the first d dims reconstruct rates?
        // Simplified: use correlation between actual rates and model rates
        // For low dims: project out some dims -> worse fit
        // For right dims: full model fit
        // For high dims: slightly better on train but overfit marker
        for (let t = 0; t < T; t++) {
          for (let n = 0; n < N_NEURONS; n++) {
            const actual = spikes[t][n]
            let predicted = rates[t][n]
            // Degrade prediction when using fewer dims
            if (d < modelDim) {
              // Scale down based on fraction of dims used
              const frac = d / modelDim
              const mean = 1.5 // rough mean rate
              predicted = mean + (predicted - mean) * frac * frac
            }
            // For extra dims, add slight noise to prediction (overfit on train)
            if (d > modelDim) {
              const u1 = rng() || 1e-15
              const u2 = rng()
              const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
              predicted += noise * 0.05
            }
            const mean = 1.5
            totalSS += (actual - mean) * (actual - mean)
            totalResSS += (actual - predicted) * (actual - predicted)
          }
        }
      }

      const r2 = totalSS > 0 ? 1 - totalResSS / totalSS : 0
      results[d] = { trajectories, r2 }
    }

    return results
  }, [fullInference, taskData])

  const currentDim = DIMS[dimIdx]
  const currentResult = dimResults[currentDim]

  // === Top panel: latent trajectories (project to 2D) ===
  const { topSx, topSy } = useMemo(() => {
    // Compute extent across all dims for consistent view
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const d of DIMS) {
      const res = dimResults[d]
      for (const traj of res.trajectories) {
        for (const pt of traj) {
          const x = pt[0] || 0
          const y = pt.length > 1 ? pt[1] : 0
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    const padX = (maxX - minX) * 0.1 || 1
    const padY = (maxY - minY) * 0.1 || 1
    return {
      topSx: scaleLinear().domain([minX - padX, maxX + padX]).range([0, PLOT_W]),
      topSy: scaleLinear().domain([minY - padY, maxY + padY]).range([TOP_H, 0]),
    }
  }, [dimResults])

  // === Bottom panel: R^2 bar chart ===
  const barX = useMemo(
    () => scaleBand()
      .domain(DIMS.map(d => d))
      .range([0, PLOT_W])
      .padding(0.3),
    []
  )
  const barSy = useMemo(() => {
    let maxR2 = 0
    for (const d of DIMS) {
      if (dimResults[d].r2 > maxR2) maxR2 = dimResults[d].r2
    }
    return scaleLinear().domain([0, Math.max(maxR2 * 1.1, 0.5)]).range([BOT_H, 0])
  }, [dimResults])

  const TRIAL_COLORS = ["#4A90D9", "#c0503a", "#6A8A6E"]

  const topY = MARGIN.top
  const botY = MARGIN.top + TOP_H + ROW_GAP

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Title */}
        <text
          x={W / 2} y={22}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 13, fill: "#333", fontWeight: 600 }}
        >
          Latent dimensionality: underfitting vs overfitting (d = {currentDim})
        </text>

        {/* === Top panel: latent trajectories === */}
        <g transform={`translate(${MARGIN.left}, ${topY})`}>
          <line x1={0} y1={TOP_H} x2={PLOT_W} y2={TOP_H} stroke="#ddd" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={TOP_H} stroke="#ddd" strokeWidth={1} />
          <text
            x={PLOT_W / 2} y={TOP_H + 18}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            Dim 1
          </text>
          <text
            x={-10} y={TOP_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -10, ${TOP_H / 2})`}
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            {currentDim >= 2 ? "Dim 2" : "(no 2nd dim)"}
          </text>

          {currentResult.trajectories.map((traj, tr) => {
            if (currentDim === 1) {
              // 1D: plot as time series
              const timeSx = scaleLinear().domain([0, T - 1]).range([0, PLOT_W])
              const path = traj
                .map((pt, t) => `${t === 0 ? "M" : "L"}${timeSx(t)},${topSy(0) + (pt[0] || 0) * 40}`)
                .join(" ")
              return (
                <path
                  key={tr}
                  d={path}
                  fill="none"
                  stroke={TRIAL_COLORS[tr]}
                  strokeWidth={1.5}
                  opacity={0.7}
                />
              )
            }
            // 2D projection
            const path = traj
              .map((pt, t) => {
                const x = pt[0] || 0
                const y = pt.length > 1 ? pt[1] : 0
                return `${t === 0 ? "M" : "L"}${topSx(x)},${topSy(y)}`
              })
              .join(" ")
            return (
              <path
                key={tr}
                d={path}
                fill="none"
                stroke={TRIAL_COLORS[tr]}
                strokeWidth={1.5}
                opacity={0.7}
              />
            )
          })}

          {/* Start markers */}
          {currentResult.trajectories.map((traj, tr) => {
            const x = traj[0][0] || 0
            const y = currentDim >= 2 ? (traj[0][1] || 0) : 0
            return (
              <circle
                key={tr}
                cx={currentDim === 1 ? 0 : topSx(x)}
                cy={currentDim === 1 ? topSy(0) + x * 40 : topSy(y)}
                r={3}
                fill={TRIAL_COLORS[tr]}
              />
            )
          })}

          {/* Dim quality annotation */}
          <text
            x={PLOT_W - 4} y={14}
            textAnchor="end"
            style={{ fontFamily: FONT, fontSize: 9, fill: dimColor(currentDim), fontWeight: 600 }}
          >
            {currentDim <= 2
              ? "Too few dims — oversimplified"
              : currentDim <= 4
              ? "Good fit — clean trajectories"
              : "Too many dims — noisy / overfit"}
          </text>

          {/* Legend */}
          <g transform="translate(4, 4)">
            {Array.from({ length: N_TRIALS }).map((_, tr) => (
              <g key={tr} transform={`translate(0, ${tr * 14})`}>
                <line x1={0} y1={0} x2={12} y2={0} stroke={TRIAL_COLORS[tr]} strokeWidth={1.5} />
                <text
                  x={16} y={3}
                  style={{ fontFamily: FONT, fontSize: 8, fill: "#888" }}
                >
                  Trial {tr + 1}
                </text>
              </g>
            ))}
          </g>
        </g>

        {/* === Bottom panel: R^2 bar chart === */}
        <g transform={`translate(${MARGIN.left}, ${botY})`}>
          {DIMS.map(d => {
            const isActive = d === currentDim
            const bw = barX.bandwidth()
            const r2 = dimResults[d].r2
            const barH = BOT_H - barSy(Math.max(0, r2))

            return (
              <g key={d}>
                <rect
                  x={barX(d)}
                  y={barSy(Math.max(0, r2))}
                  width={bw}
                  height={barH}
                  fill={dimColor(d)}
                  opacity={isActive ? 1 : 0.35}
                  stroke={isActive ? "#333" : "none"}
                  strokeWidth={isActive ? 1.5 : 0}
                  rx={2}
                />
                {/* R^2 value on top of bar */}
                {isActive && (
                  <text
                    x={barX(d) + bw / 2}
                    y={barSy(Math.max(0, r2)) - 4}
                    textAnchor="middle"
                    style={{ fontFamily: FONT, fontSize: 8, fill: "#666", fontWeight: 600 }}
                  >
                    {r2.toFixed(3)}
                  </text>
                )}
              </g>
            )
          })}

          {/* X axis labels */}
          {DIMS.map(d => (
            <text
              key={d}
              x={barX(d) + barX.bandwidth() / 2}
              y={BOT_H + 14}
              textAnchor="middle"
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fill: d === currentDim ? "#333" : "#aaa",
                fontWeight: d === currentDim ? 600 : 400,
              }}
            >
              {d}
            </text>
          ))}

          <text
            x={PLOT_W / 2} y={BOT_H + 28}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#aaa" }}
          >
            Latent dimensionality
          </text>

          {/* Y axis */}
          <line x1={0} y1={0} x2={0} y2={BOT_H} stroke="#ddd" strokeWidth={1} />
          <text
            x={-10} y={BOT_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -10, ${BOT_H / 2})`}
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            R²
          </text>

          {/* Zero line */}
          <line x1={0} y1={barSy(0)} x2={PLOT_W} y2={barSy(0)} stroke="#ccc" strokeWidth={1} />
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
          Latent dims: {currentDim}
          <input
            type="range"
            min={0}
            max={DIMS.length - 1}
            step={1}
            value={dimIdx}
            onChange={e => setDimIdx(Number(e.target.value))}
            style={{ width: 300 }}
          />
        </label>
      </div>
    </div>
  )
}
