import React, { useState, useMemo } from "react"
import { scaleLinear } from "d3-scale"
import { generateFromIC, loadDemoModel } from "./lfads-math"
import modelJson from "./lfads-demo-model.json"

const W = 800
const H = 380
const T_STEPS = 100
const FONT = "var(--font-mono, monospace)"

// Three columns
const COL1_X = 20
const COL1_W = 230
const COL2_X = 270
const COL2_W = 180
const COL3_X = 480
const COL3_W = 300
const TOP_Y = 50
const PLOT_H = 280

const FACTOR_COLORS = ["#4A90D9", "#d4a03c", "#7b68ae"]
const FIXED_IC = [0.8, 0.3, -0.2]

function clampColor(v) {
  return Math.max(0, Math.min(255, Math.round(v)))
}

// Blue-white-orange diverging color scale
function heatColor(v) {
  // v in [-1, 1]
  if (v >= 0) {
    // White to orange
    const r = 255
    const g = clampColor(255 - v * 130)
    const b = clampColor(255 - v * 200)
    return `rgb(${r},${g},${b})`
  }
  // White to blue
  const t = -v
  const r = clampColor(255 - t * 180)
  const g = clampColor(255 - t * 110)
  const b = 255
  return `rgb(${r},${g},${b})`
}

export default function FactorToRateMapping() {
  const [scales, setScales] = useState([1.0, 1.0, 1.0])
  const [selectedCell, setSelectedCell] = useState(null) // { neuron, factor }

  const model = useMemo(() => loadDemoModel(modelJson.default), [])

  const { factors, rates } = useMemo(() => {
    const result = generateFromIC(FIXED_IC, model, T_STEPS)
    return result
  }, [model])

  const nFactors = factors[0].length
  const nNeurons = model.readout.W.length
  const readoutW = model.readout.W

  // Scale factors by sliders
  const scaledFactors = useMemo(() => {
    return factors.map(row => row.map((v, k) => v * scales[k]))
  }, [factors, scales])

  // Recompute rates with scaled factors
  const scaledRates = useMemo(() => {
    const result = []
    for (let t = 0; t < T_STEPS; t++) {
      const row = []
      for (let n = 0; n < nNeurons; n++) {
        let logRate = model.readout.b[n]
        for (let k = 0; k < nFactors; k++) {
          logRate += readoutW[n][k] * scaledFactors[t][k]
        }
        row.push(Math.exp(logRate))
      }
      result.push(row)
    }
    return result
  }, [scaledFactors, nNeurons, nFactors, readoutW, model.readout.b])

  // Determine dominant factor per neuron (by max absolute weight)
  const dominantFactor = useMemo(() => {
    return Array.from({ length: nNeurons }, (_, n) => {
      let maxAbs = 0
      let best = 0
      for (let k = 0; k < nFactors; k++) {
        const a = Math.abs(readoutW[n][k])
        if (a > maxAbs) {
          maxAbs = a
          best = k
        }
      }
      return best
    })
  }, [readoutW, nNeurons, nFactors])

  // Normalize readout weights for heatmap display
  const wMax = useMemo(() => {
    let m = 0
    for (let n = 0; n < nNeurons; n++) {
      for (let k = 0; k < nFactors; k++) {
        const a = Math.abs(readoutW[n][k])
        if (a > m) m = a
      }
    }
    return m || 1
  }, [readoutW, nNeurons, nFactors])

  // Scales for factor time series
  const factorSy = useMemo(() => {
    let min = Infinity, max = -Infinity
    for (let t = 0; t < T_STEPS; t++) {
      for (let k = 0; k < nFactors; k++) {
        const v = scaledFactors[t][k]
        if (v < min) min = v
        if (v > max) max = v
      }
    }
    const pad = (max - min) * 0.1 || 1
    return scaleLinear().domain([min - pad, max + pad]).range([PLOT_H, 0])
  }, [scaledFactors, nFactors])

  const factorSx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, COL1_W]),
    []
  )

  // Scale for rates
  const rateSy = useMemo(() => {
    let max = 0
    for (let t = 0; t < T_STEPS; t++) {
      for (let n = 0; n < nNeurons; n++) {
        if (scaledRates[t][n] > max) max = scaledRates[t][n]
      }
    }
    return max || 1
  }, [scaledRates, nNeurons])

  const rateRowH = PLOT_H / nNeurons
  const rateSx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, COL3_W]),
    []
  )

  // Heatmap cell size
  const cellW = COL2_W / nFactors
  const cellH = PLOT_H / nNeurons

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
          Factor-to-Rate Linear Readout
        </text>

        {/* Column headers */}
        <text
          x={COL1_X + COL1_W / 2} y={TOP_Y - 10}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 11, fill: "#555" }}
        >
          Factors (3)
        </text>
        <text
          x={COL2_X + COL2_W / 2} y={TOP_Y - 10}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 11, fill: "#555" }}
        >
          Readout W
        </text>
        <text
          x={COL3_X + COL3_W / 2} y={TOP_Y - 10}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 11, fill: "#555" }}
        >
          Firing rates (20 neurons)
        </text>

        {/* Left column: Factor time series */}
        <g transform={`translate(${COL1_X}, ${TOP_Y})`}>
          {Array.from({ length: nFactors }, (_, k) => {
            const path = scaledFactors
              .map((row, t) => `${t === 0 ? "M" : "L"}${factorSx(t)},${factorSy(row[k])}`)
              .join(" ")
            const isHighlighted = selectedCell && selectedCell.factor === k
            return (
              <path
                key={k}
                d={path}
                fill="none"
                stroke={FACTOR_COLORS[k]}
                strokeWidth={isHighlighted ? 2.5 : 1.2}
                opacity={selectedCell ? (isHighlighted ? 1 : 0.25) : 0.8}
              />
            )
          })}
          {/* Legend */}
          {Array.from({ length: nFactors }, (_, k) => (
            <g key={`leg-${k}`} transform={`translate(5, ${k * 16 + 8})`}>
              <line x1={0} y1={0} x2={14} y2={0} stroke={FACTOR_COLORS[k]} strokeWidth={2} />
              <text
                x={18} y={4}
                style={{ fontFamily: FONT, fontSize: 8, fill: "#888" }}
              >
                {`f${k + 1}`}
              </text>
            </g>
          ))}
        </g>

        {/* Middle column: Readout heatmap */}
        <g transform={`translate(${COL2_X}, ${TOP_Y})`}>
          {Array.from({ length: nNeurons }, (_, n) =>
            Array.from({ length: nFactors }, (_, k) => {
              const v = readoutW[n][k] / wMax
              const isSelected = selectedCell && selectedCell.neuron === n && selectedCell.factor === k
              return (
                <rect
                  key={`${n}-${k}`}
                  x={k * cellW}
                  y={n * cellH}
                  width={cellW - 1}
                  height={cellH - 1}
                  fill={heatColor(v)}
                  stroke={isSelected ? "#333" : "none"}
                  strokeWidth={isSelected ? 2 : 0}
                  rx={1}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (selectedCell && selectedCell.neuron === n && selectedCell.factor === k) {
                      setSelectedCell(null)
                    } else {
                      setSelectedCell({ neuron: n, factor: k })
                    }
                  }}
                />
              )
            })
          )}
          {/* Factor axis labels */}
          {Array.from({ length: nFactors }, (_, k) => (
            <text
              key={`fl-${k}`}
              x={k * cellW + cellW / 2}
              y={PLOT_H + 14}
              textAnchor="middle"
              style={{ fontFamily: FONT, fontSize: 8, fill: FACTOR_COLORS[k] }}
            >
              {`f${k + 1}`}
            </text>
          ))}
        </g>

        {/* Right column: Firing rate traces */}
        <g transform={`translate(${COL3_X}, ${TOP_Y})`}>
          {Array.from({ length: nNeurons }, (_, n) => {
            // Per-neuron rate scale
            let nMax = 0
            for (let t = 0; t < T_STEPS; t++) {
              if (scaledRates[t][n] > nMax) nMax = scaledRates[t][n]
            }
            nMax = nMax || 1
            const rowSy = scaleLinear().domain([0, nMax]).range([rateRowH - 2, 1])
            const path = scaledRates
              .map((row, t) => `${t === 0 ? "M" : "L"}${rateSx(t)},${rowSy(row[n])}`)
              .join(" ")
            const isHighlighted = selectedCell && selectedCell.neuron === n
            const color = FACTOR_COLORS[dominantFactor[n]]
            return (
              <g key={n} transform={`translate(0, ${n * rateRowH})`}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHighlighted ? 1.8 : 0.7}
                  opacity={selectedCell ? (isHighlighted ? 1 : 0.15) : 0.6}
                />
              </g>
            )
          })}
        </g>

        {/* Selected cell annotation */}
        {selectedCell && (
          <text
            x={W / 2} y={H - 10}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#555" }}
          >
            {`Neuron ${selectedCell.neuron + 1}, Factor ${selectedCell.factor + 1}: W = ${readoutW[selectedCell.neuron][selectedCell.factor].toFixed(3)}`}
          </text>
        )}
      </svg>

      {/* Factor scaling sliders */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 6,
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
        }}
      >
        {Array.from({ length: nFactors }, (_, k) => (
          <label
            key={k}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span style={{ color: FACTOR_COLORS[k], fontWeight: 600 }}>
              {`f${k + 1}`}
            </span>
            {`: ${scales[k].toFixed(1)}x`}
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={scales[k]}
              onChange={e => {
                const newScales = [...scales]
                newScales[k] = Number(e.target.value)
                setScales(newScales)
              }}
              style={{ width: 100 }}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
