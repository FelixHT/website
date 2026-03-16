import React, { useState, useMemo } from "react"
import { scaleLinear } from "d3-scale"
import { generateReachingTask, inferSingleTrial, loadDemoModel } from "./lfads-math"
import modelJson from "./lfads-demo-model.json"

const W = 800
const H = 500
const MARGIN = { top: 30, right: 20, bottom: 20, left: 50 }
const T = 100
const N_NEURONS = 20
const N_CONDITIONS = 8
const N_TRIALS = 15
const EXAMPLE_NEURONS = [0, 3, 7]
const TEAL = "#4A7C6F"
const ROW1_H = 140
const ROW2_H = 240
const ROW_GAP = 30
const PANEL_W = (W - MARGIN.left - MARGIN.right - 30) / 2

/**
 * Gaussian smoothing of a 1D array.
 */
function gaussianSmooth(arr, sigma) {
  const n = arr.length
  const out = new Float64Array(n)
  const kernelR = Math.ceil(sigma * 3)
  for (let i = 0; i < n; i++) {
    let sum = 0
    let wSum = 0
    for (let k = -kernelR; k <= kernelR; k++) {
      const j = i + k
      if (j < 0 || j >= n) continue
      const w = Math.exp(-0.5 * (k / sigma) * (k / sigma))
      sum += arr[j] * w
      wSum += w
    }
    out[i] = sum / wSum
  }
  return out
}

export default function TrialVariabilityExplorer() {
  const [nTrialsAvg, setNTrialsAvg] = useState(15)
  const [selectedCondition, setSelectedCondition] = useState(0)

  const model = useMemo(() => loadDemoModel(modelJson.default), [])

  const taskData = useMemo(
    () => generateReachingTask(N_CONDITIONS, N_TRIALS, N_NEURONS, 42),
    []
  )

  // Run LFADS inference on all trials of the selected condition
  const inferredTrials = useMemo(() => {
    const results = []
    for (let tr = 0; tr < N_TRIALS; tr++) {
      const spikes = taskData.spikes[selectedCondition][tr]
      const result = inferSingleTrial(spikes, model)
      results.push(result)
    }
    return results
  }, [taskData, model, selectedCondition])

  // === Row 1: Raster overlays ===
  const rasterSx = useMemo(
    () => scaleLinear().domain([0, T - 1]).range([0, W - MARGIN.left - MARGIN.right]),
    []
  )
  const rasterSy = useMemo(
    () => scaleLinear().domain([-0.5, N_NEURONS - 0.5]).range([0, ROW1_H]),
    []
  )

  // === Row 2 Left: PSTH ===
  const psthData = useMemo(() => {
    // Average spike counts across nTrialsAvg trials for each example neuron
    const curves = EXAMPLE_NEURONS.map(nIdx => {
      const avg = new Float64Array(T)
      for (let t = 0; t < T; t++) {
        let sum = 0
        for (let tr = 0; tr < nTrialsAvg; tr++) {
          sum += taskData.spikes[selectedCondition][tr][t][nIdx]
        }
        avg[t] = sum / nTrialsAvg
      }
      return gaussianSmooth(avg, 3)
    })
    return curves
  }, [taskData, selectedCondition, nTrialsAvg])

  const psthSx = useMemo(
    () => scaleLinear().domain([0, T - 1]).range([0, PANEL_W]),
    []
  )

  const psthSy = useMemo(() => {
    let max = 0
    for (const curve of psthData) {
      for (let t = 0; t < T; t++) {
        if (curve[t] > max) max = curve[t]
      }
    }
    const padded = max * 1.15 || 1
    return scaleLinear().domain([0, padded]).range([ROW2_H, 0])
  }, [psthData])

  // === Row 2 Right: Single-trial LFADS rates ===
  const lfadsSx = useMemo(
    () => scaleLinear().domain([0, T - 1]).range([0, PANEL_W]),
    []
  )

  const lfadsSy = useMemo(() => {
    let min = Infinity, max = -Infinity
    for (const inf of inferredTrials) {
      for (const nIdx of EXAMPLE_NEURONS) {
        for (let t = 0; t < T; t++) {
          const v = inf.rates[t][nIdx]
          if (v < min) min = v
          if (v > max) max = v
        }
      }
    }
    const pad = (max - min) * 0.1 || 1
    return scaleLinear().domain([min - pad, max + pad]).range([ROW2_H, 0])
  }, [inferredTrials])

  const NEURON_COLORS = ["#4A7C6F", "#D4783C", "#4A90D9"]

  const row1Y = MARGIN.top
  const row2Y = MARGIN.top + ROW1_H + ROW_GAP

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Row 1: Overlaid spike rasters */}
        <g transform={`translate(${MARGIN.left}, ${row1Y})`}>
          <text
            x={(W - MARGIN.left - MARGIN.right) / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Single-trial spike rasters (condition {selectedCondition + 1})
          </text>

          {Array.from({ length: N_TRIALS }).map((_, tr) => {
            const spikes = taskData.spikes[selectedCondition][tr]
            const ticks = []
            for (let t = 0; t < T; t++) {
              for (let n = 0; n < N_NEURONS; n++) {
                if (spikes[t][n] > 0) {
                  ticks.push(
                    <line
                      key={`${tr}-${t}-${n}`}
                      x1={rasterSx(t)}
                      y1={rasterSy(n) - 1.5}
                      x2={rasterSx(t)}
                      y2={rasterSy(n) + 1.5}
                      stroke={TEAL}
                      strokeWidth={0.6}
                      opacity={0.3}
                    />
                  )
                }
              }
            }
            return <g key={tr}>{ticks}</g>
          })}

          <text
            x={-8} y={ROW1_H / 2}
            textAnchor="end"
            dominantBaseline="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Neuron
          </text>
        </g>

        {/* Row 2 Left: PSTH */}
        <g transform={`translate(${MARGIN.left}, ${row2Y})`}>
          <text
            x={PANEL_W / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Trial-averaged (PSTH)
          </text>

          {psthData.map((curve, i) => {
            const path = []
            for (let t = 0; t < T; t++) {
              path.push(`${t === 0 ? "M" : "L"}${psthSx(t)},${psthSy(curve[t])}`)
            }
            return (
              <path
                key={i}
                d={path.join(" ")}
                fill="none"
                stroke={NEURON_COLORS[i]}
                strokeWidth={1.8}
                opacity={0.85}
              />
            )
          })}

          <text
            x={PANEL_W / 2} y={ROW2_H + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>
          <text
            x={-8} y={ROW2_H / 2}
            textAnchor="end"
            dominantBaseline="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Rate
          </text>

          {/* Legend */}
          <g transform={`translate(${PANEL_W - 120}, 8)`}>
            {EXAMPLE_NEURONS.map((nIdx, i) => (
              <g key={nIdx} transform={`translate(0, ${i * 14})`}>
                <line x1={0} y1={0} x2={14} y2={0} stroke={NEURON_COLORS[i]} strokeWidth={1.5} />
                <text
                  x={18} y={3}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "#888" }}
                >
                  Neuron {nIdx + 1}
                </text>
              </g>
            ))}
          </g>

          {/* N trials annotation */}
          <text
            x={4} y={16}
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#999" }}
          >
            {nTrialsAvg === 1 ? "1 trial" : `${nTrialsAvg} trials avg`}
          </text>
        </g>

        {/* Row 2 Right: Single-trial LFADS rates */}
        <g transform={`translate(${MARGIN.left + PANEL_W + 30}, ${row2Y})`}>
          <text
            x={PANEL_W / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Single-trial (LFADS)
          </text>

          {EXAMPLE_NEURONS.map((nIdx, neuronRow) => {
            const color = NEURON_COLORS[neuronRow]
            return (
              <g key={nIdx}>
                {inferredTrials.map((inf, tr) => {
                  const path = []
                  for (let t = 0; t < T; t++) {
                    path.push(
                      `${t === 0 ? "M" : "L"}${lfadsSx(t)},${lfadsSy(inf.rates[t][nIdx])}`
                    )
                  }
                  return (
                    <path
                      key={tr}
                      d={path.join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth={0.9}
                      opacity={0.3}
                    />
                  )
                })}
              </g>
            )
          })}

          <text
            x={PANEL_W / 2} y={ROW2_H + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>
          <text
            x={-8} y={ROW2_H / 2}
            textAnchor="end"
            dominantBaseline="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Rate
          </text>

          {/* Legend */}
          <g transform={`translate(${PANEL_W - 100}, 8)`}>
            <text
              x={0} y={3}
              style={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "#999" }}
            >
              {N_TRIALS} trials overlaid
            </text>
          </g>
        </g>
      </svg>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#666",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Trials averaged: {nTrialsAvg}
          <input
            type="range"
            min={1}
            max={N_TRIALS}
            step={1}
            value={nTrialsAvg}
            onChange={e => setNTrialsAvg(Number(e.target.value))}
            style={{ width: 120 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Condition:
          <select
            value={selectedCondition}
            onChange={e => setSelectedCondition(Number(e.target.value))}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
          >
            {Array.from({ length: N_CONDITIONS }).map((_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
