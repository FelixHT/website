import React, { useState, useMemo } from "react"
import { scaleLinear, scaleBand } from "d3-scale"
import { generalCCA, generateIndependentData } from "./cca-math"

const W = 680
const H = 300
const PAD = { top: 20, right: 30, bottom: 40, left: 50 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <div className="dim-explorer__slider">
      <label className="dim-explorer__label">
        {label} = <strong>{value}</strong>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step || 1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="dim-explorer__range"
      />
    </div>
  )
}

export default function DimensionalityExplorer() {
  const [n, setN] = useState(100)
  const [p, setP] = useState(2)
  const [q, setQ] = useState(2)
  const [seed, setSeed] = useState(0)

  const k = Math.min(p, q)

  const correlations = useMemo(() => {
    // Guard: need n > max(p, q) for non-degenerate covariance
    if (n <= Math.max(p, q)) {
      return new Array(k).fill(1)
    }
    const { X, Y } = generateIndependentData(n, p, q)
    const result = generalCCA(X, Y)
    return result.correlations.slice(0, k)
  }, [n, p, q, seed])

  const xScale = scaleLinear().domain([0, 1]).range([0, PLOT_W])
  const yScale = scaleBand()
    .domain(correlations.map((_, i) => i))
    .range([0, PLOT_H])
    .padding(0.25)

  const barHeight = Math.min(yScale.bandwidth(), 18)
  const danger = n <= Math.max(p, q) * 1.5

  return (
    <div className="dim-explorer">
      <div className="dim-explorer__controls">
        <Slider label="n (observations)" value={n} min={20} max={200} step={5} onChange={setN} />
        <Slider label="p (variables in X)" value={p} min={2} max={80} step={1} onChange={setP} />
        <Slider label="q (variables in Y)" value={q} min={2} max={80} step={1} onChange={setQ} />
        <button
          className="blog-figure__button"
          onClick={() => setSeed(s => s + 1)}
          style={{ marginTop: 4 }}
        >
          Resample
        </button>
      </div>

      {danger && (
        <p className="dim-explorer__warning">
          {n <= Math.max(p, q)
            ? `n \u2264 max(p, q): covariance matrices are singular. CCA is not well-defined.`
            : `n is close to max(p, q): expect spurious correlations.`}
        </p>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <g key={v}>
              <line
                x1={xScale(v)} y1={0} x2={xScale(v)} y2={PLOT_H}
                stroke="rgba(0,0,0,0.06)" strokeWidth={1}
              />
              <text
                x={xScale(v)} y={PLOT_H + 16}
                textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)"
                fill="rgba(0,0,0,0.4)"
              >
                {v.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {correlations.map((r, i) => {
            const barW = xScale(Math.max(0, r))
            const y = yScale(i) + (yScale.bandwidth() - barHeight) / 2
            const hot = r > 0.5
            return (
              <g key={i}>
                <rect
                  x={0} y={y}
                  width={barW} height={barHeight}
                  fill={hot ? "#d9534f" : "#4A7C6F"}
                  opacity={hot ? 0.8 : 0.6}
                  rx={2}
                />
                <text
                  x={barW + 6} y={y + barHeight / 2 + 4}
                  fontSize={10} fontFamily="var(--font-mono)"
                  fill="rgba(0,0,0,0.5)"
                >
                  {r.toFixed(2)}
                </text>
              </g>
            )
          })}

          {/* Y axis label */}
          <text
            x={-10} y={PLOT_H / 2}
            textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)"
            fill="rgba(0,0,0,0.4)"
            transform={`rotate(-90, -10, ${PLOT_H / 2})`}
          >
            canonical pairs
          </text>

          {/* X axis label */}
          <text
            x={PLOT_W / 2} y={PLOT_H + 34}
            textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)"
            fill="rgba(0,0,0,0.4)"
          >
            canonical correlation
          </text>
        </g>
      </svg>
    </div>
  )
}
