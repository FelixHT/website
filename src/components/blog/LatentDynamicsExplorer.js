import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace } from "./psid-math"

const W = 800
const H = 340
const LEFT_W = 330
const RIGHT_W = 350
const MARGIN = { top: 30, right: 20, bottom: 50, left: 20 }
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T_STEPS = 500
const COLOR_LATENT = "#4A90D9"
const COLOR_IRRELEVANT = "rgba(0,0,0,0.3)"
const NEURON_COLORS = ["#4A7C6F", "#5A8C7F", "#3A6C5F", "#6A9C8F", "#2A5C4F", "#7AAC9F"]

const DIM_PAIRS = [
  { label: "x₁ vs x₂", d1: 0, d2: 1 },
  { label: "x₁ vs x₃", d1: 0, d2: 2 },
  { label: "x₂ vs x₃", d1: 1, d2: 2 },
]

export default function LatentDynamicsExplorer() {
  const [sigmaW, setSigmaW] = useState(0.1)
  const [sigmaV, setSigmaV] = useState(0.3)
  const [seed, setSeed] = useState(1)
  const [pairIdx, setPairIdx] = useState(0)

  const { X, Y } = useMemo(() => {
    const sys = defaultSystem()
    return simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { sigmaW, sigmaV, seed })
  }, [sigmaW, sigmaV, seed])

  const pair = DIM_PAIRS[pairIdx]

  // Left panel: 2D projection of latent trajectory
  const { sxL, syL } = useMemo(() => {
    const vals1 = X.map(r => r[pair.d1])
    const vals2 = X.map(r => r[pair.d2])
    const pad1 = (Math.max(...vals1) - Math.min(...vals1)) * 0.1 || 1
    const pad2 = (Math.max(...vals2) - Math.min(...vals2)) * 0.1 || 1
    return {
      sxL: scaleLinear()
        .domain([Math.min(...vals1) - pad1, Math.max(...vals1) + pad1])
        .range([MARGIN.left + 10, LEFT_W - 10]),
      syL: scaleLinear()
        .domain([Math.min(...vals2) - pad2, Math.max(...vals2) + pad2])
        .range([PLOT_H - 10, 10]),
    }
  }, [X, pair])

  const trajectoryPath = useMemo(() => {
    return X.map((r, t) => {
      const cmd = t === 0 ? "M" : "L"
      return `${cmd}${sxL(r[pair.d1])},${syL(r[pair.d2])}`
    }).join(" ")
  }, [X, sxL, syL, pair])

  // Right panel: stacked neuron traces
  const neuronTraces = useMemo(() => {
    const traces = []
    for (let ch = 0; ch < 6; ch++) {
      const vals = []
      for (let t = 0; t < T_STEPS; t++) vals.push(Y[t][ch])
      traces.push(vals)
    }
    return traces
  }, [Y])

  const sxR = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, RIGHT_W]),
    []
  )

  const TRACE_H = (PLOT_H - 20) / 6
  const neuronScales = useMemo(() => {
    return neuronTraces.map(tr => {
      const mn = Math.min(...tr), mx = Math.max(...tr)
      const pad = (mx - mn) * 0.1 || 1
      return scaleLinear().domain([mn - pad, mx + pad]).range([TRACE_H - 2, 2])
    })
  }, [neuronTraces])

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        {/* Left panel: Latent trajectory */}
        <g transform={`translate(0, ${MARGIN.top})`}>
          <rect x={MARGIN.left} y={0} width={LEFT_W - MARGIN.left} height={PLOT_H} fill="none" rx={3} />

          {/* Trajectory with time-varying opacity */}
          {X.map((r, t) => {
            if (t === 0) return null
            const opacity = 0.15 + 0.7 * (t / (T_STEPS - 1))
            const isRelevant = pair.d1 < 2 && pair.d2 < 2
            return (
              <line
                key={t}
                x1={sxL(X[t - 1][pair.d1])} y1={syL(X[t - 1][pair.d2])}
                x2={sxL(r[pair.d1])} y2={syL(r[pair.d2])}
                stroke={isRelevant ? COLOR_LATENT : (pair.d1 >= 2 || pair.d2 >= 2 ? "#777" : COLOR_LATENT)}
                strokeWidth={1}
                opacity={opacity}
              />
            )
          })}

          {/* Start/end markers */}
          <circle cx={sxL(X[0][pair.d1])} cy={syL(X[0][pair.d2])} r={4} fill={COLOR_LATENT} opacity={0.8} />
          <circle cx={sxL(X[T_STEPS - 1][pair.d1])} cy={syL(X[T_STEPS - 1][pair.d2])} r={4} fill="#333" opacity={0.8} />

          {/* Axis labels */}
          <text
            x={LEFT_W / 2} y={PLOT_H + 20}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
          >
            {`x${pair.d1 + 1}`}
          </text>
          <text
            x={8} y={PLOT_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, 8, ${PLOT_H / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
          >
            {`x${pair.d2 + 1}`}
          </text>

          <text
            x={LEFT_W / 2} y={-8}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Latent trajectory
          </text>
        </g>

        {/* Right panel: Neural observations */}
        <g transform={`translate(${LEFT_W + 30}, ${MARGIN.top})`}>
          <text
            x={RIGHT_W / 2} y={-8}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Observed neurons
          </text>

          {neuronTraces.map((tr, ch) => {
            const yOff = ch * TRACE_H + 10
            const sy = neuronScales[ch]
            const path = tr.map((v, t) => `${t === 0 ? "M" : "L"}${sxR(t)},${sy(v)}`).join(" ")
            return (
              <g key={ch} transform={`translate(0, ${yOff})`}>
                <rect x={0} y={0} width={RIGHT_W} height={TRACE_H - 4} fill="none" rx={2} />
                <path d={path} fill="none" stroke={NEURON_COLORS[ch]} strokeWidth={0.7} opacity={0.8} />
                <text
                  x={-4} y={TRACE_H / 2 - 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
                >
                  {`y${ch + 1}`}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Controls */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "#666" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Projection:
          <select
            value={pairIdx}
            onChange={e => setPairIdx(Number(e.target.value))}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
          >
            {DIM_PAIRS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          σ<sub style={{ fontSize: "0.7em", verticalAlign: "sub" }}>w</sub>: {sigmaW.toFixed(2)}
          <input
            type="range" min={0.01} max={0.5} step={0.01}
            value={sigmaW}
            onChange={e => setSigmaW(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          σ<sub style={{ fontSize: "0.7em", verticalAlign: "sub" }}>v</sub>: {sigmaV.toFixed(2)}
          <input
            type="range" min={0.01} max={1.0} step={0.01}
            value={sigmaV}
            onChange={e => setSigmaV(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>

        <button
          onClick={handleRegenerate}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
            background: "#f4f3f0", border: "1px solid #ccc9c2", borderRadius: 4,
            padding: "4px 14px", color: "#555",
          }}
        >
          Regenerate
        </button>
      </div>
    </div>
  )
}
