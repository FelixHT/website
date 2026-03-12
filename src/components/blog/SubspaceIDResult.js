import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace, standardSubspaceID, alignRecoveredStates } from "./psid-math"

const W = 800
const H = 300
const MARGIN = { top: 20, right: 20, bottom: 30, left: 55 }
const PLOT_W = W - MARGIN.left - MARGIN.right
const ROW_H = 80
const ROW_GAP = 8
const T_STEPS = 500
const COLOR_TRUE = "#4A90D9"
const COLOR_RECOVERED = "#333"
const DIM_LABELS = ["x̂₁", "x̂₂", "x̂₃"]
const TRUE_LABELS = ["x₁", "x₂", "x₃"]

export default function SubspaceIDResult() {
  const [seed, setSeed] = useState(1)

  const { X, aligned } = useMemo(() => {
    const sys = defaultSystem()
    const sim = simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
    const result = standardSubspaceID(sim.Y, 3, 10)
    const al = alignRecoveredStates(result.Xhat, sim.X)
    return { X: sim.X, aligned: al }
  }, [seed])

  const sx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, PLOT_W]),
    []
  )

  // Per-dimension scales
  const dimScales = useMemo(() => {
    return [0, 1, 2].map(d => {
      const trueVals = X.map(r => r[d])
      const recVals = aligned.map(r => r[d])
      const all = [...trueVals, ...recVals]
      const mn = Math.min(...all), mx = Math.max(...all)
      const pad = (mx - mn) * 0.1 || 1
      return scaleLinear().domain([mn - pad, mx + pad]).range([ROW_H - 4, 4])
    })
  }, [X, aligned])

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {[0, 1, 2].map(d => {
            const yOff = d * (ROW_H + ROW_GAP)
            const sy = dimScales[d]
            const truePath = X.map((r, t) =>
              `${t === 0 ? "M" : "L"}${sx(t)},${sy(r[d])}`
            ).join(" ")
            const recPath = aligned.map((r, t) =>
              `${t === 0 ? "M" : "L"}${sx(t)},${sy(r[d])}`
            ).join(" ")

            return (
              <g key={d} transform={`translate(0, ${yOff})`}>
                <rect x={0} y={0} width={PLOT_W} height={ROW_H} fill="none" rx={3} />
                <path d={truePath} fill="none" stroke={COLOR_TRUE} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
                <path d={recPath} fill="none" stroke={COLOR_RECOVERED} strokeWidth={1.2} />
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

          {/* Legend */}
          <g transform={`translate(${PLOT_W - 220}, ${-8})`}>
            <line x1={0} y1={0} x2={20} y2={0} stroke={COLOR_TRUE} strokeWidth={1} strokeDasharray="4 3" />
            <text x={24} y={4} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#555" }}>
              True ({TRUE_LABELS.join(", ")})
            </text>
            <line x1={130} y1={0} x2={150} y2={0} stroke={COLOR_RECOVERED} strokeWidth={1.2} />
            <text x={154} y={4} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#555" }}>
              Recovered
            </text>
          </g>

          {/* Time axis */}
          <text
            x={PLOT_W / 2} y={3 * (ROW_H + ROW_GAP) - ROW_GAP + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
          >
            Time →
          </text>
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
