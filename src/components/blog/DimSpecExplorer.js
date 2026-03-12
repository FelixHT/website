import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace, psid, computeDimCorrelations } from "./psid-math"

const W = 800
const H = 310
const LEFT_W = 510
const RIGHT_W = 180
const MARGIN = { top: 20, right: 10, bottom: 30, left: 55 }
const PLOT_W = LEFT_W - MARGIN.left - MARGIN.right
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T_STEPS = 500
const COLOR_RELEVANT = "#D4783C"
const COLOR_IRRELEVANT = "rgba(0,0,0,0.3)"
const COLOR_WARNING = "#d9534f"
const TOTAL_DIM = 5 // max total dims for exploration
const TRUE_RELEVANT = 2

export default function DimSpecExplorer() {
  const [relevantDim, setRelevantDim] = useState(2)
  const [seed, setSeed] = useState(1)

  const sim = useMemo(() => {
    const sys = defaultSystem()
    return simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
  }, [seed])

  const { Xhat, corrs } = useMemo(() => {
    const totalDim = Math.max(relevantDim + 1, 3)
    const result = psid(sim.Y, sim.Z, relevantDim, totalDim, 10)
    const c = computeDimCorrelations(result.Xhat, sim.Z)
    return { Xhat: result.Xhat, corrs: c }
  }, [sim, relevantDim])

  const numDims = Xhat[0].length
  const rowH = Math.min(70, (PLOT_H - 16) / numDims)

  const sx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, PLOT_W]),
    []
  )

  const dimScales = useMemo(() => {
    return Array.from({ length: numDims }, (_, d) => {
      const vals = Xhat.map(r => r[d])
      const mn = Math.min(...vals), mx = Math.max(...vals)
      const pad = (mx - mn) * 0.1 || 1
      return scaleLinear().domain([mn - pad, mx + pad]).range([rowH - 3, 3])
    })
  }, [Xhat, numDims, rowH])

  const barScale = useMemo(
    () => scaleLinear().domain([0, 1]).range([0, PLOT_H - 30]),
    []
  )
  const BAR_W = Math.min(30, (RIGHT_W - 10) / numDims - 4)
  const BAR_GAP = 4

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])
  const isOverSpecified = relevantDim > TRUE_RELEVANT

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        {/* Left: time-series */}
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {Array.from({ length: numDims }, (_, d) => {
            const yOff = d * (rowH + 2)
            const sy = dimScales[d]
            const isRelevant = d < relevantDim
            const isSpurious = isRelevant && d >= TRUE_RELEVANT
            const color = isSpurious ? COLOR_WARNING : (isRelevant ? COLOR_RELEVANT : COLOR_IRRELEVANT)
            const path = Xhat.map((r, t) =>
              `${t === 0 ? "M" : "L"}${sx(t)},${sy(r[d])}`
            ).join(" ")

            return (
              <g key={d} transform={`translate(0, ${yOff})`}>
                <rect x={0} y={0} width={PLOT_W} height={rowH} fill="none" rx={2} />
                <path d={path} fill="none" stroke={color} strokeWidth={1} />
                <text
                  x={-8} y={rowH / 2}
                  textAnchor="end" dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#666" }}
                >
                  x̂{d + 1}
                </text>
              </g>
            )
          })}
        </g>

        {/* Right: correlation bars */}
        <g transform={`translate(${LEFT_W + 10}, ${MARGIN.top})`}>
          <text
            x={RIGHT_W / 2} y={-6} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            |ρ(x̂, z)|
          </text>

          {corrs.map((c, i) => {
            const bh = barScale(c)
            const totalBarW = numDims * (BAR_W + BAR_GAP) - BAR_GAP
            const x = i * (BAR_W + BAR_GAP) + (RIGHT_W - totalBarW) / 2
            const isRelevant = i < relevantDim
            const isSpurious = isRelevant && i >= TRUE_RELEVANT
            const color = isSpurious ? COLOR_WARNING : (isRelevant ? COLOR_RELEVANT : COLOR_IRRELEVANT)

            return (
              <g key={i}>
                <rect x={x} y={PLOT_H - 30 - bh} width={BAR_W} height={bh} fill={color} rx={2} />
                <text
                  x={x + BAR_W / 2} y={PLOT_H - 30 - bh - 5}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#555" }}
                >
                  {c.toFixed(2)}
                </text>
                <text
                  x={x + BAR_W / 2} y={PLOT_H - 14}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#888" }}
                >
                  x̂{i + 1}
                </text>
              </g>
            )
          })}

          <line x1={0} y1={PLOT_H - 30} x2={RIGHT_W} y2={PLOT_H - 30} stroke="#ccc" strokeWidth={1} />
        </g>

        {/* Warning text */}
        {isOverSpecified && (
          <text
            x={W / 2} y={H - 6}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: COLOR_WARNING, fontWeight: 600 }}
          >
            Over-specified: {relevantDim - TRUE_RELEVANT} extra "relevant" dim{relevantDim - TRUE_RELEVANT > 1 ? "s" : ""} fitting noise
          </text>
        )}
      </svg>

      {/* Controls */}
      <div style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "#666" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Specified relevant dims: {relevantDim}
          <input
            type="range" min={1} max={5} step={1}
            value={relevantDim}
            onChange={e => setRelevantDim(Number(e.target.value))}
            style={{ width: 140 }}
          />
          {relevantDim === TRUE_RELEVANT && (
            <span style={{ color: COLOR_RELEVANT, fontWeight: 600 }}>✓ correct</span>
          )}
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
