import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import {
  defaultSystem, simulateStateSpace,
  standardSubspaceID, psid, computeDimCorrelations,
} from "./psid-math"

const W = 800
const H = 310
const LEFT_W = 510
const RIGHT_W = 180
const MARGIN = { top: 20, right: 10, bottom: 30, left: 55 }
const PLOT_W = LEFT_W - MARGIN.left - MARGIN.right
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const ROW_H = (PLOT_H - 16) / 3
const T_STEPS = 500
const COLOR_RELEVANT = "#D4783C"
const COLOR_IRRELEVANT = "rgba(0,0,0,0.3)"
const COLOR_MIXED = "rgba(0,0,0,0.5)"
const COLOR_BEHAVIOR = "#D4783C"
const DIM_LABELS_STD = ["x̂₁", "x̂₂", "x̂₃"]
const DIM_LABELS_PSID = ["x̂₁ʳ", "x̂₂ʳ", "x̂₃ⁱ"]

export default function PSIDExplorer() {
  const [mode, setMode] = useState("psid") // "standard" or "psid"
  const [seed, setSeed] = useState(1)

  const sim = useMemo(() => {
    const sys = defaultSystem()
    return simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
  }, [seed])

  const stdResult = useMemo(() => {
    const result = standardSubspaceID(sim.Y, 3, 10)
    const corrs = computeDimCorrelations(result.Xhat, sim.Z)
    return { Xhat: result.Xhat, corrs }
  }, [sim])

  const psidResult = useMemo(() => {
    const result = psid(sim.Y, sim.Z, 2, 3, 10)
    const corrs = computeDimCorrelations(result.Xhat, sim.Z)
    return { Xhat: result.Xhat, corrs }
  }, [sim])

  const isPSID = mode === "psid"
  const Xhat = isPSID ? psidResult.Xhat : stdResult.Xhat
  const corrs = isPSID ? psidResult.corrs : stdResult.corrs
  const dimLabels = isPSID ? DIM_LABELS_PSID : DIM_LABELS_STD

  const sx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, PLOT_W]),
    []
  )

  const dimScales = useMemo(() => {
    return [0, 1, 2].map(d => {
      const vals = Xhat.map(r => r[d])
      // Also include Z range for behavioral overlay in relevant dims
      const zVals = sim.Z.map(r => r[0])
      const all = [...vals, ...zVals]
      const mn = Math.min(...all), mx = Math.max(...all)
      const pad = (mx - mn) * 0.1 || 1
      return scaleLinear().domain([mn - pad, mx + pad]).range([ROW_H - 4, 4])
    })
  }, [Xhat, sim.Z])

  const barScale = useMemo(
    () => scaleLinear().domain([0, 1]).range([0, PLOT_H - 30]),
    []
  )
  const BAR_W = 35
  const BAR_GAP = 15

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 12 }}>
        <button
          onClick={() => setMode("standard")}
          style={{
            padding: "5px 16px", cursor: "pointer", borderRadius: 4,
            border: mode === "standard" ? "2px solid #333" : "1px solid #ccc9c2",
            background: mode === "standard" ? "#333" : "#f4f3f0",
            color: mode === "standard" ? "#fff" : "#555",
            fontFamily: "var(--font-mono)", fontSize: 12,
          }}
        >
          Standard ID
        </button>
        <button
          onClick={() => setMode("psid")}
          style={{
            padding: "5px 16px", cursor: "pointer", borderRadius: 4,
            border: mode === "psid" ? `2px solid ${COLOR_RELEVANT}` : "1px solid #ccc9c2",
            background: mode === "psid" ? COLOR_RELEVANT : "#f4f3f0",
            color: mode === "psid" ? "#fff" : "#555",
            fontFamily: "var(--font-mono)", fontSize: 12,
          }}
        >
          PSID
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        {/* Left: recovered time-series */}
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {[0, 1, 2].map(d => {
            const yOff = d * (ROW_H + 4)
            const sy = dimScales[d]
            const isRelevant = isPSID && d < 2
            const traceColor = isPSID
              ? (d < 2 ? COLOR_RELEVANT : COLOR_IRRELEVANT)
              : COLOR_MIXED

            const path = Xhat.map((r, t) =>
              `${t === 0 ? "M" : "L"}${sx(t)},${sy(r[d])}`
            ).join(" ")

            // Behavioral overlay (thin, behind) for relevant dims in PSID mode
            const zPath = isRelevant
              ? sim.Z.map((r, t) => `${t === 0 ? "M" : "L"}${sx(t)},${sy(r[0])}`).join(" ")
              : null

            return (
              <g key={d} transform={`translate(0, ${yOff})`}>
                <rect x={0} y={0} width={PLOT_W} height={ROW_H} fill="none" rx={3} />
                {zPath && (
                  <path d={zPath} fill="none" stroke={COLOR_BEHAVIOR} strokeWidth={0.7} opacity={0.35} />
                )}
                <path d={path} fill="none" stroke={traceColor} strokeWidth={1.2} />
                <text
                  x={-8} y={ROW_H / 2}
                  textAnchor="end" dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
                >
                  {dimLabels[d]}
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
            const barColor = isPSID
              ? (i < 2 ? COLOR_RELEVANT : COLOR_IRRELEVANT)
              : COLOR_MIXED

            return (
              <g key={i}>
                <rect
                  x={x} y={PLOT_H - 30 - bh}
                  width={BAR_W} height={bh}
                  fill={barColor}
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
                  {dimLabels[i]}
                </text>
              </g>
            )
          })}

          <line x1={0} y1={PLOT_H - 30} x2={RIGHT_W} y2={PLOT_H - 30} stroke="#ccc" strokeWidth={1} />
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
