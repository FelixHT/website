import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace, psid } from "./psid-math"

const W = 800
const H = 340
const MARGIN = { top: 20, right: 30, bottom: 30, left: 75 }
const ROW_H = 85
const ROW_GAP = 10
const PLOT_W = W - MARGIN.left - MARGIN.right
const T_STEPS = 500
const COLOR_RELEVANT = "#D4783C"
const COLOR_IRRELEVANT = "rgba(0,0,0,0.3)"
const COLOR_BEHAVIOR = "#D4783C"
const NEURON_COLORS = [
  "#4A7C6F", "#5A8C7F", "#3A6C5F", "#6A9C8F", "#2A5C4F", "#7AAC9F"
]

function timeSeriesPath(data, sx, sy) {
  return data.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i)},${sy(v)}`).join(" ")
}

export default function PSIDTeaser() {
  const [seed, setSeed] = useState(1)

  const { Y, Z, psidResult } = useMemo(() => {
    const sys = defaultSystem()
    const sim = simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
    const result = psid(sim.Y, sim.Z, 2, 3, 10)
    return { Y: sim.Y, Z: sim.Z, psidResult: result }
  }, [seed])

  const sx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, PLOT_W]),
    []
  )

  // Row 1: Neural activity (6 neurons stacked)
  const neuronTraces = useMemo(() => {
    const traces = []
    for (let ch = 0; ch < 6; ch++) {
      const vals = []
      for (let t = 0; t < T_STEPS; t++) vals.push(Y[t][ch])
      traces.push(vals)
    }
    return traces
  }, [Y])

  // Row 2: Behavioral readout
  const behaviorVals = useMemo(() => {
    const vals = []
    for (let t = 0; t < T_STEPS; t++) vals.push(Z[t][0])
    return vals
  }, [Z])

  // Row 3: PSID latent dims
  const latentTraces = useMemo(() => {
    const traces = []
    const totalDim = psidResult.Xhat[0].length
    for (let d = 0; d < totalDim; d++) {
      const vals = []
      for (let t = 0; t < T_STEPS; t++) vals.push(psidResult.Xhat[t][d])
      traces.push(vals)
    }
    return traces
  }, [psidResult])

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  // Compute scales for each row
  const neuronScale = useMemo(() => {
    let min = Infinity, max = -Infinity
    for (const tr of neuronTraces)
      for (const v of tr) { if (v < min) min = v; if (v > max) max = v }
    const pad = (max - min) * 0.05
    return scaleLinear().domain([min - pad, max + pad]).range([ROW_H - 4, 4])
  }, [neuronTraces])

  const behaviorScale = useMemo(() => {
    let min = Infinity, max = -Infinity
    for (const v of behaviorVals) { if (v < min) min = v; if (v > max) max = v }
    const pad = (max - min) * 0.1
    return scaleLinear().domain([min - pad, max + pad]).range([ROW_H - 4, 4])
  }, [behaviorVals])

  const latentScale = useMemo(() => {
    let min = Infinity, max = -Infinity
    for (const tr of latentTraces)
      for (const v of tr) { if (v < min) min = v; if (v > max) max = v }
    const pad = (max - min) * 0.05
    return scaleLinear().domain([min - pad, max + pad]).range([ROW_H - 4, 4])
  }, [latentTraces])

  const row1Y = MARGIN.top
  const row2Y = MARGIN.top + ROW_H + ROW_GAP
  const row3Y = MARGIN.top + 2 * (ROW_H + ROW_GAP)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
      <g transform={`translate(${MARGIN.left}, 0)`}>
        {/* Row 1: Neural activity */}
        <g transform={`translate(0, ${row1Y})`}>

          {neuronTraces.map((tr, ch) => (
            <path
              key={ch}
              d={timeSeriesPath(tr, sx, neuronScale)}
              fill="none"
              stroke={NEURON_COLORS[ch]}
              strokeWidth={0.8}
              opacity={0.7}
            />
          ))}
        </g>
        <text
          x={-8} y={row1Y + ROW_H / 2}
          textAnchor="end"
          dominantBaseline="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
        >
          Neural
        </text>

        {/* Row 2: Behavioral readout */}
        <g transform={`translate(0, ${row2Y})`}>

          <path
            d={timeSeriesPath(behaviorVals, sx, behaviorScale)}
            fill="none"
            stroke={COLOR_BEHAVIOR}
            strokeWidth={1.2}
          />
        </g>
        <text
          x={-8} y={row2Y + ROW_H / 2}
          textAnchor="end"
          dominantBaseline="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
        >
          Behavior
        </text>

        {/* Row 3: PSID latent dimensions */}
        <g transform={`translate(0, ${row3Y})`}>

          {latentTraces.map((tr, d) => {
            const isRelevant = d < 2
            return (
              <path
                key={d}
                d={timeSeriesPath(tr, sx, latentScale)}
                fill="none"
                stroke={isRelevant ? COLOR_RELEVANT : COLOR_IRRELEVANT}
                strokeWidth={isRelevant ? 1.2 : 0.9}
              />
            )
          })}
        </g>
        <text
          x={-8} y={row3Y + ROW_H / 2}
          textAnchor="end"
          dominantBaseline="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
        >
          PSID
        </text>

        {/* Legend for Row 3 */}
        <g transform={`translate(${PLOT_W - 180}, ${row3Y + 8})`}>
          <line x1={0} y1={0} x2={20} y2={0} stroke={COLOR_RELEVANT} strokeWidth={1.5} />
          <text x={24} y={4} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#555" }}>
            Relevant
          </text>
          <line x1={80} y1={0} x2={100} y2={0} stroke={COLOR_IRRELEVANT} strokeWidth={1.5} />
          <text x={104} y={4} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#555" }}>
            Irrelevant
          </text>
        </g>

        {/* Time axis */}
        <text
          x={PLOT_W / 2} y={row3Y + ROW_H + 18}
          textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
        >
          Time →
        </text>
      </g>

      {/* Regenerate button */}
      <g
        transform={`translate(${W - 140}, ${H - 32})`}
        style={{ cursor: "pointer" }}
        onClick={handleRegenerate}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleRegenerate() }}
      >
        <rect x={0} y={0} width={106} height={26} rx={4} fill="#f4f3f0" stroke="#ccc9c2" strokeWidth={1} />
        <text
          x={53} y={17}
          textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#555", userSelect: "none" }}
        >
          Regenerate
        </text>
      </g>
    </svg>
  )
}
