import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { schemeTableau10 } from "d3-scale-chromatic"
import { generateReachingTask } from "./lfads-math"

const W = 800
const H = 380
const MARGIN = { top: 30, right: 10, bottom: 30, left: 30 }
const PANEL_W = 230
const GAP = 20
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T = 100
const N_NEURONS = 20
const N_CONDITIONS = 8
const N_TRIALS = 3
// Show 3 conditions in raster for clarity (not all 8 overlaid)
const RASTER_CONDITIONS = [0, 2, 5]
const EXAMPLE_NEURONS = [1, 6, 14]

function panelX(idx) {
  return MARGIN.left + idx * (PANEL_W + GAP)
}

// Simple Gaussian smoothing for "inferred rates" from spikes
function smoothTimeSeries(values, sigma) {
  const n = values.length
  const out = new Float64Array(n)
  const k = Math.ceil(sigma * 3)
  for (let i = 0; i < n; i++) {
    let sum = 0, wt = 0
    for (let j = Math.max(0, i - k); j <= Math.min(n - 1, i + k); j++) {
      const g = Math.exp(-0.5 * ((i - j) / sigma) ** 2)
      sum += values[j] * g
      wt += g
    }
    out[i] = sum / wt
  }
  return out
}

export default function LFADSTeaser() {
  const [seed, setSeed] = useState(1)

  const taskData = useMemo(
    () => generateReachingTask(N_CONDITIONS, N_TRIALS, N_NEURONS, seed),
    [seed]
  )

  // === Panel 1: Raster — show 3 conditions, each in its own vertical band ===
  const rasterSx = useMemo(
    () => scaleLinear().domain([0, T - 1]).range([0, PANEL_W]),
    []
  )
  const condBandH = PLOT_H / RASTER_CONDITIONS.length
  const neuronStep = (condBandH - 6) / N_NEURONS

  // === Panel 2: Latent trajectories — use ground-truth latents ===
  const { latSx, latSy } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (let c = 0; c < N_CONDITIONS; c++) {
      const lat = taskData.latents[c][0] // first trial
      for (let t = 0; t < T; t++) {
        const x = lat[t][0], y = lat[t][1]
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    const padX = (maxX - minX) * 0.12 || 1
    const padY = (maxY - minY) * 0.12 || 1
    return {
      latSx: scaleLinear().domain([minX - padX, maxX + padX]).range([0, PANEL_W]),
      latSy: scaleLinear().domain([minY - padY, maxY + padY]).range([PLOT_H, 0]),
    }
  }, [taskData])

  // === Panel 3: Rates — use ground-truth rates + smoothed spikes ===
  const ratesSx = useMemo(
    () => scaleLinear().domain([0, T - 1]).range([0, PANEL_W]),
    []
  )

  const neuronH = (PLOT_H - 10) / EXAMPLE_NEURONS.length

  // Compute scales per example neuron across a few conditions
  const rateScales = useMemo(() => {
    const showConds = [0, 3, 6]
    return EXAMPLE_NEURONS.map(nIdx => {
      let maxRate = 0
      for (const c of showConds) {
        for (let t = 0; t < T; t++) {
          const r = taskData.rates[c][0][t][nIdx]
          if (r > maxRate) maxRate = r
        }
      }
      return scaleLinear().domain([0, maxRate * 1.1 || 1]).range([neuronH - 4, 2])
    })
  }, [taskData])

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  const showConds = [0, 3, 6] // conditions shown in rates panel

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Panel 1: Spike rasters — 3 conditions separated vertically */}
        <g transform={`translate(${panelX(0)}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Spike rasters
          </text>

          {RASTER_CONDITIONS.map((cond, bandIdx) => {
            const bandY = bandIdx * condBandH
            const spikes = taskData.spikes[cond][0]
            const color = schemeTableau10[cond % 10]
            const ticks = []

            for (let n = 0; n < N_NEURONS; n++) {
              for (let t = 0; t < T; t++) {
                if (spikes[t][n] > 0) {
                  const y = bandY + 3 + n * neuronStep
                  ticks.push(
                    <line
                      key={`${cond}-${n}-${t}`}
                      x1={rasterSx(t)}
                      y1={y}
                      x2={rasterSx(t)}
                      y2={y + Math.min(neuronStep * 0.7, 3)}
                      stroke={color}
                      strokeWidth={0.6}
                      opacity={0.65}
                    />
                  )
                }
              }
            }

            return (
              <g key={cond}>
                {ticks}
                {/* Condition label */}
                <text
                  x={PANEL_W + 4} y={bandY + condBandH / 2}
                  dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 7, fill: color }}
                >
                  c{cond + 1}
                </text>
                {/* Separator line */}
                {bandIdx < RASTER_CONDITIONS.length - 1 && (
                  <line
                    x1={0} y1={bandY + condBandH}
                    x2={PANEL_W} y2={bandY + condBandH}
                    stroke="#e8e6e0" strokeWidth={0.5}
                  />
                )}
              </g>
            )
          })}

          <text
            x={PANEL_W / 2} y={PLOT_H + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>
        </g>

        {/* Panel 2: Latent trajectories — ground truth, all 8 conditions */}
        <g transform={`translate(${panelX(1)}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Latent trajectories
          </text>

          {Array.from({ length: N_CONDITIONS }, (_, c) => {
            const lat = taskData.latents[c][0]
            const color = schemeTableau10[c % 10]
            // Build path from ground-truth latent dims 0 and 1
            const pts = []
            for (let t = 0; t < T; t++) {
              if (lat[t][0] === 0 && lat[t][1] === 0 && t < 30) continue // skip pre-movement zeros
              pts.push(`${pts.length === 0 ? "M" : "L"}${latSx(lat[t][0])},${latSy(lat[t][1])}`)
            }
            if (pts.length === 0) return null
            // Find first non-zero point for start marker
            let startT = 0
            for (let t = 0; t < T; t++) {
              if (lat[t][0] !== 0 || lat[t][1] !== 0) { startT = t; break }
            }
            return (
              <g key={c}>
                <path
                  d={pts.join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.8}
                />
                <circle
                  cx={latSx(lat[startT][0])}
                  cy={latSy(lat[startT][1])}
                  r={2.5}
                  fill={color}
                />
                {/* End marker */}
                <circle
                  cx={latSx(lat[T - 1][0])}
                  cy={latSy(lat[T - 1][1])}
                  r={1.8}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                />
              </g>
            )
          })}

          <text
            x={PANEL_W / 2} y={PLOT_H + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Latent dim 1
          </text>
          <text
            x={-8} y={PLOT_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -8, ${PLOT_H / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Latent dim 2
          </text>
        </g>

        {/* Panel 3: Ground-truth rates + smoothed spike overlay */}
        <g transform={`translate(${panelX(2)}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Inferred rates
          </text>

          {EXAMPLE_NEURONS.map((nIdx, row) => {
            const yOff = row * neuronH + 4
            const sy = rateScales[row]

            return (
              <g key={nIdx} transform={`translate(0, ${yOff})`}>
                <text
                  x={-4} y={neuronH / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 7, fill: "#bbb" }}
                >
                  n{nIdx + 1}
                </text>

                {/* Smoothed spikes as gray background */}
                {showConds.map(c => {
                  const rawSpikes = []
                  for (let t = 0; t < T; t++) rawSpikes.push(taskData.spikes[c][0][t][nIdx])
                  const smoothed = smoothTimeSeries(rawSpikes, 2)
                  const path = []
                  for (let t = 0; t < T; t++) {
                    path.push(`${t === 0 ? "M" : "L"}${ratesSx(t)},${sy(smoothed[t])}`)
                  }
                  return (
                    <path
                      key={`sm-${c}`}
                      d={path.join(" ")}
                      fill="none"
                      stroke="#d0cec8"
                      strokeWidth={0.6}
                      opacity={0.5}
                    />
                  )
                })}

                {/* Ground-truth smooth rates */}
                {showConds.map(c => {
                  const color = schemeTableau10[c % 10]
                  const ratePath = []
                  for (let t = 0; t < T; t++) {
                    ratePath.push(
                      `${t === 0 ? "M" : "L"}${ratesSx(t)},${sy(taskData.rates[c][0][t][nIdx])}`
                    )
                  }
                  return (
                    <path
                      key={`rate-${c}`}
                      d={ratePath.join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.4}
                      opacity={0.8}
                    />
                  )
                })}
              </g>
            )
          })}

          <text
            x={PANEL_W / 2} y={PLOT_H + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>
        </g>

        {/* Regenerate button */}
        <g
          transform={`translate(${W - 140}, ${H - 32})`}
          style={{ cursor: "pointer" }}
          onClick={handleRegenerate}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") handleRegenerate()
          }}
        >
          <rect
            x={0} y={0} width={106} height={26} rx={4}
            fill="#f4f3f0" stroke="#ccc9c2" strokeWidth={1}
          />
          <text
            x={53} y={17}
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "#555",
              userSelect: "none",
            }}
          >
            Regenerate
          </text>
        </g>
      </svg>
    </div>
  )
}
