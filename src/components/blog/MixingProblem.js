import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace, standardSubspaceID, computeDimCorrelations } from "./psid-math"

const W = 800
const H = 280
const LEFT_W = 510
const RIGHT_W = 180
const MARGIN = { top: 20, right: 10, bottom: 30, left: 55 }
const PLOT_W = LEFT_W - MARGIN.left - MARGIN.right
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const ROW_H = (PLOT_H - 16) / 3
const T_STEPS = 500
const COLOR_BEHAVIOR = "#D4783C"
const DIM_LABELS = ["x̂₁", "x̂₂", "x̂₃"]

export default function MixingProblem() {
  const [seed, setSeed] = useState(1)

  const { Xhat, corrs, Z } = useMemo(() => {
    const sys = defaultSystem()
    const sim = simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
    const result = standardSubspaceID(sim.Y, 3, 10)
    const c = computeDimCorrelations(result.Xhat, sim.Z)
    return { Xhat: result.Xhat, corrs: c, Z: sim.Z }
  }, [seed])

  const sx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, PLOT_W]),
    []
  )

  const dimScales = useMemo(() => {
    return [0, 1, 2].map(d => {
      const vals = Xhat.map(r => r[d])
      const mn = Math.min(...vals), mx = Math.max(...vals)
      const pad = (mx - mn) * 0.1 || 1
      return scaleLinear().domain([mn - pad, mx + pad]).range([ROW_H - 4, 4])
    })
  }, [Xhat])

  // Bar chart scale
  const barScale = useMemo(
    () => scaleLinear().domain([0, 1]).range([0, PLOT_H - 30]),
    []
  )
  const BAR_W = 35
  const BAR_GAP = 15

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        {/* Left: recovered time-series */}
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {[0, 1, 2].map(d => {
            const yOff = d * (ROW_H + 4)
            const sy = dimScales[d]
            const path = Xhat.map((r, t) =>
              `${t === 0 ? "M" : "L"}${sx(t)},${sy(r[d])}`
            ).join(" ")
            return (
              <g key={d} transform={`translate(0, ${yOff})`}>
                <rect x={0} y={0} width={PLOT_W} height={ROW_H} fill="none" rx={3} />
                <path d={path} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                <text
                  x={-8} y={ROW_H / 2}
                  textAnchor="end" dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
                >
                  {DIM_LABELS[d]}
                </text>
              </g>
            )
          })}

          <text
            x={PLOT_W / 2} y={3 * (ROW_H + 4) + 12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
          >
            Time →
          </text>
        </g>

        {/* Right: correlation bar chart */}
        <g transform={`translate(${LEFT_W + 10}, ${MARGIN.top})`}>
          <text
            x={RIGHT_W / 2} y={-6} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            |ρ(x̂, z)|
          </text>

          {corrs.map((c, i) => {
            const bh = barScale(c)
            const x = i * (BAR_W + BAR_GAP) + (RIGHT_W - 3 * (BAR_W + BAR_GAP) + BAR_GAP) / 2
            return (
              <g key={i}>
                <rect
                  x={x} y={PLOT_H - 30 - bh}
                  width={BAR_W} height={bh}
                  fill="rgba(0,0,0,0.4)"
                  rx={2}
                />
                <text
                  x={x + BAR_W / 2} y={PLOT_H - 30 - bh - 6}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#555" }}
                >
                  {c.toFixed(2)}
                </text>
                <text
                  x={x + BAR_W / 2} y={PLOT_H - 14}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
                >
                  {DIM_LABELS[i]}
                </text>
              </g>
            )
          })}

          {/* Axis line */}
          <line
            x1={0} y1={PLOT_H - 30} x2={RIGHT_W} y2={PLOT_H - 30}
            stroke="#ccc" strokeWidth={1}
          />
        </g>
      </svg>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
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
