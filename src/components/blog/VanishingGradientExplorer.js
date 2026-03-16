import React, { useState, useMemo } from "react"
import { scaleLinear, scaleLog } from "d3-scale"
import { unrollRNN, computeGradientNorms } from "./lfads-math"
import { BTN_BASE, btnActive } from "./figureConstants"

const W = 800
const H = 350
const MARGIN = { top: 40, right: 30, bottom: 60, left: 60 }
const CHART_W = W - MARGIN.left - MARGIN.right
const CHART_H = 180
const GRAPH_Y = 280
const BOX_S = 18
const FONT = "var(--font-mono, monospace)"

const COLOR_TANH = "#4A90D9"
const COLOR_LINEAR = "#c0503a"

/**
 * Build weight matrix with a given spectral radius.
 * For simplicity we use a scaled rotation matrix.
 */
function buildWh(d, spectralRadius) {
  const angle = 0.3
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [
    [spectralRadius * c, spectralRadius * s],
    [-spectralRadius * s, spectralRadius * c],
  ]
}

function gradColor(t) {
  const r = Math.round(74 + t * (192 - 74))
  const g = Math.round(144 + t * (80 - 144))
  const b = Math.round(217 + t * (58 - 217))
  return `rgb(${r},${g},${b})`
}

export default function VanishingGradientExplorer() {
  const [seqLength, setSeqLength] = useState(20)
  const [mode, setMode] = useState("tanh") // "tanh" | "linear"

  const spectralRadius = mode === "tanh" ? 0.9 : 1.1
  const d = 2

  const { gradientNorms, states } = useMemo(() => {
    const Wh = buildWh(d, spectralRadius)
    const Wx = [[0.5], [0.3]]
    const b = [0, 0]
    const inputs = Array.from({ length: seqLength }, (_, t) => (t === 0 ? [1] : [0]))
    const h0 = new Float64Array(d)

    if (mode === "linear") {
      // For linear mode, manually compute states without tanh
      const states = []
      let h = Array.from(h0)
      for (let t = 0; t < seqLength; t++) {
        const x = inputs[t]
        const h_new = new Array(d)
        for (let i = 0; i < d; i++) {
          let s = b[i]
          for (let j = 0; j < d; j++) s += Wh[i][j] * h[j]
          for (let j = 0; j < x.length; j++) s += Wx[i][j] * x[j]
          h_new[i] = s // no tanh
        }
        states.push(h_new)
        h = h_new
      }

      // Gradient norms for linear case: ||dL/dh_t|| = ||Wh^(T-1-t)^T * dL/dh_T||
      // dL/dh_T = 2*h_T
      const dLdh_T = states[seqLength - 1].map(v => 2 * v)
      const norms = new Array(seqLength)
      let grad = [...dLdh_T]
      norms[seqLength - 1] = Math.sqrt(grad.reduce((s, v) => s + v * v, 0))

      for (let t = seqLength - 2; t >= 0; t--) {
        const newGrad = new Array(d).fill(0)
        for (let j = 0; j < d; j++) {
          for (let i = 0; i < d; i++) {
            newGrad[j] += grad[i] * Wh[i][j]
          }
        }
        grad = newGrad
        norms[t] = Math.sqrt(grad.reduce((s, v) => s + v * v, 0))
      }
      return { gradientNorms: norms, states }
    }

    // tanh mode
    const result = unrollRNN(h0, inputs, { Wh, Wx, b })
    const norms = computeGradientNorms(result.states, { Wh })
    return { gradientNorms: norms, states: Array.from(result.states) }
  }, [seqLength, mode, spectralRadius])

  // Clamp exploding gradients for display
  const clampedNorms = gradientNorms.map(n => Math.max(n, 1e-30))
  const maxNorm = Math.max(...clampedNorms)
  const minNorm = Math.min(...clampedNorms.filter(n => n > 0))
  const displayMax = mode === "linear" ? Math.min(maxNorm, 1e10) : maxNorm

  // Ratio annotation
  const ratio = clampedNorms[clampedNorms.length - 1] > 0
    ? clampedNorms[0] / clampedNorms[clampedNorms.length - 1]
    : 0

  // Scales
  const sx = useMemo(
    () => scaleLinear().domain([0, seqLength - 1]).range([0, CHART_W]),
    [seqLength]
  )
  const sy = useMemo(() => {
    const lo = Math.max(minNorm * 0.1, 1e-30)
    const hi = displayMax * 2
    return scaleLog().domain([lo, hi]).range([CHART_H, 0]).clamp(true)
  }, [minNorm, displayMax])

  const barW = Math.max(2, CHART_W / seqLength - 2)

  // Bottom: simplified unrolled graph
  const graphBoxes = Math.min(seqLength, 30)
  const graphSpacing = CHART_W / graphBoxes

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Title */}
        <text
          x={W / 2}
          y={20}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 13, fill: "#333", fontWeight: 600 }}
        >
          {mode === "tanh" ? "Vanishing gradients (tanh, spectral radius 0.9)" : "Exploding gradients (linear, spectral radius 1.1)"}
        </text>

        {/* Bar chart */}
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {/* Y axis */}
          <line x1={0} y1={0} x2={0} y2={CHART_H} stroke="#ccc" strokeWidth={1} />
          <text
            x={-10}
            y={CHART_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -10, ${CHART_H / 2})`}
            style={{ fontFamily: FONT, fontSize: 10, fill: "#888" }}
          >
            ||dL/dh_t|| (log)
          </text>

          {/* Bars */}
          {clampedNorms.map((norm, t) => {
            const barH = CHART_H - sy(Math.min(norm, displayMax * 2))
            const colorT = t / Math.max(seqLength - 1, 1)
            return (
              <rect
                key={t}
                x={sx(t) - barW / 2}
                y={CHART_H - barH}
                width={barW}
                height={Math.max(barH, 0.5)}
                fill={gradColor(colorT)}
                opacity={0.8}
                rx={1}
              />
            )
          })}

          {/* X axis */}
          <line x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="#ccc" strokeWidth={1} />
          <text
            x={CHART_W / 2}
            y={CHART_H + 18}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#888" }}
          >
            Timestep t
          </text>
        </g>

        {/* Simplified unrolled graph below chart */}
        <g transform={`translate(${MARGIN.left}, ${GRAPH_Y})`}>
          {Array.from({ length: graphBoxes }, (_, i) => {
            const cx = graphSpacing * i + graphSpacing / 2
            return (
              <g key={i}>
                <rect
                  x={cx - BOX_S / 2}
                  y={0}
                  width={BOX_S}
                  height={BOX_S}
                  rx={3}
                  fill="#f5f5f3"
                  stroke="#ccc"
                  strokeWidth={0.8}
                />
                {i < graphBoxes - 1 && (
                  <line
                    x1={cx + BOX_S / 2 + 1}
                    y1={BOX_S / 2}
                    x2={cx + graphSpacing - BOX_S / 2 - 1}
                    y2={BOX_S / 2}
                    stroke="#aaa"
                    strokeWidth={0.8}
                  />
                )}
              </g>
            )
          })}
          <text
            x={graphSpacing / 2}
            y={BOX_S + 14}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 8, fill: "#aaa" }}
          >
            h₀
          </text>
          <text
            x={graphSpacing * graphBoxes - graphSpacing / 2}
            y={BOX_S + 14}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 8, fill: "#aaa" }}
          >
            {`h_T`}
          </text>
        </g>

        {/* Gradient ratio annotation */}
        <text
          x={W - MARGIN.right}
          y={MARGIN.top + 16}
          textAnchor="end"
          style={{ fontFamily: FONT, fontSize: 11, fill: "#555" }}
        >
          {`||dL/dh₀|| / ||dL/dh_T|| = ${ratio < 1e-3 || ratio > 1e6 ? ratio.toExponential(1) : ratio.toFixed(3)}`}
        </text>
      </svg>

      {/* Controls */}
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
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Sequence length T: {seqLength}
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={seqLength}
            onChange={e => setSeqLength(Number(e.target.value))}
            style={{ width: 140 }}
          />
        </label>

        <button
          onClick={() => setMode("tanh")}
          style={{
            ...BTN_BASE,
            ...(mode === "tanh" ? btnActive(COLOR_TANH) : {}),
          }}
        >
          tanh (vanish)
        </button>
        <button
          onClick={() => setMode("linear")}
          style={{
            ...BTN_BASE,
            ...(mode === "linear" ? btnActive(COLOR_LINEAR) : {}),
          }}
        >
          linear (explode)
        </button>
      </div>
    </div>
  )
}
