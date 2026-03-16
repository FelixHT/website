import React, { useState, useMemo } from "react"
import { scaleLinear } from "d3-scale"
import { generateLimitCycle } from "./lfads-math"
import { standardSubspaceID, alignRecoveredStates } from "./psid-math"
import { BTN_BASE, btnActive } from "./figureConstants"

const W = 800
const H = 400
const MARGIN = { top: 40, right: 20, bottom: 40, left: 20 }
const PANEL_W = (W - MARGIN.left - MARGIN.right - 40) / 2
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const COLOR_TRUE = "#4A90D9"
const COLOR_LINEAR = "#c0503a"

export default function NonlinearFailure() {
  const [mu, setMu] = useState(2.0)
  const [showOverlay, setShowOverlay] = useState(true)

  // Generate limit cycle and observations
  const { X, spikes } = useMemo(
    () => generateLimitCycle({ mu, T: 800, nNeurons: 10 }, 1),
    [mu]
  )

  // Build observation matrix (rates or spikes) for subspace ID
  // Use the spike observations as input to the linear model
  const linearResult = useMemo(() => {
    // standardSubspaceID expects T x m matrix
    const result = standardSubspaceID(spikes, 2, 10)
    return result
  }, [spikes])

  // Align recovered states to true latent trajectory
  const aligned = useMemo(() => {
    return alignRecoveredStates(linearResult.Xhat, X)
  }, [linearResult, X])

  // === Left panel: True dynamics ===
  const { trueSx, trueSy } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (let t = 0; t < X.length; t++) {
      if (X[t][0] < minX) minX = X[t][0]
      if (X[t][0] > maxX) maxX = X[t][0]
      if (X[t][1] < minY) minY = X[t][1]
      if (X[t][1] > maxY) maxY = X[t][1]
    }
    const padX = (maxX - minX) * 0.12 || 1
    const padY = (maxY - minY) * 0.12 || 1
    return {
      trueSx: scaleLinear().domain([minX - padX, maxX + padX]).range([0, PANEL_W]),
      trueSy: scaleLinear().domain([minY - padY, maxY + padY]).range([PLOT_H, 0]),
    }
  }, [X])

  // === Right panel: Linear fit ===
  const { linSx, linSy } = useMemo(() => {
    // Compute joint extent of true and aligned for comparison
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (let t = 0; t < aligned.length; t++) {
      if (aligned[t][0] < minX) minX = aligned[t][0]
      if (aligned[t][0] > maxX) maxX = aligned[t][0]
      if (aligned[t][1] < minY) minY = aligned[t][1]
      if (aligned[t][1] > maxY) maxY = aligned[t][1]
    }
    // Also include true trajectory extents for overlay
    for (let t = 0; t < X.length; t++) {
      if (X[t][0] < minX) minX = X[t][0]
      if (X[t][0] > maxX) maxX = X[t][0]
      if (X[t][1] < minY) minY = X[t][1]
      if (X[t][1] > maxY) maxY = X[t][1]
    }
    const padX = (maxX - minX) * 0.12 || 1
    const padY = (maxY - minY) * 0.12 || 1
    return {
      linSx: scaleLinear().domain([minX - padX, maxX + padX]).range([0, PANEL_W]),
      linSy: scaleLinear().domain([minY - padY, maxY + padY]).range([PLOT_H, 0]),
    }
  }, [aligned, X])

  // Build SVG path strings
  const truePathRight = useMemo(() => {
    return X.map((r, t) => `${t === 0 ? "M" : "L"}${linSx(r[0])},${linSy(r[1])}`).join(" ")
  }, [X, linSx, linSy])

  const linearPath = useMemo(() => {
    return aligned
      .map((r, t) => `${t === 0 ? "M" : "L"}${linSx(r[0])},${linSy(r[1])}`)
      .join(" ")
  }, [aligned, linSx, linSy])

  const leftPanelX = MARGIN.left
  const rightPanelX = MARGIN.left + PANEL_W + 40

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Left panel: True dynamics */}
        <g transform={`translate(${leftPanelX}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, fill: "#555" }}
          >
            True dynamics
          </text>

          {/* Trajectory with time-varying opacity */}
          {X.map((r, t) => {
            if (t === 0) return null
            const opacity = 0.15 + 0.6 * (t / (X.length - 1))
            return (
              <line
                key={t}
                x1={trueSx(X[t - 1][0])} y1={trueSy(X[t - 1][1])}
                x2={trueSx(r[0])} y2={trueSy(r[1])}
                stroke={COLOR_TRUE}
                strokeWidth={1.3}
                opacity={opacity}
              />
            )
          })}

          {/* Start/end markers */}
          <circle
            cx={trueSx(X[0][0])} cy={trueSy(X[0][1])}
            r={4} fill={COLOR_TRUE} opacity={0.9}
          />
          <circle
            cx={trueSx(X[X.length - 1][0])} cy={trueSy(X[X.length - 1][1])}
            r={4} fill="#333" opacity={0.9}
          />

          {/* Axis labels */}
          <text
            x={PANEL_W / 2} y={PLOT_H + 22}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#aaa" }}
          >
            x₁
          </text>
          <text
            x={-8} y={PLOT_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -8, ${PLOT_H / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#aaa" }}
          >
            x₂
          </text>
        </g>

        {/* Right panel: Linear fit attempt */}
        <g transform={`translate(${rightPanelX}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, fill: "#555" }}
          >
            Linear fit attempt
          </text>

          {/* True trajectory (shown if overlay toggled on) */}
          {showOverlay && (
            <path
              d={truePathRight}
              fill="none"
              stroke={COLOR_TRUE}
              strokeWidth={1.2}
              opacity={0.4}
            />
          )}

          {/* Linear model trajectory */}
          <path
            d={linearPath}
            fill="none"
            stroke={COLOR_LINEAR}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.85}
          />

          {/* Start markers */}
          <circle
            cx={linSx(aligned[0][0])} cy={linSy(aligned[0][1])}
            r={4} fill={COLOR_LINEAR} opacity={0.9}
          />

          {/* Legend */}
          <g transform={`translate(8, 8)`}>
            <line x1={0} y1={0} x2={18} y2={0} stroke={COLOR_TRUE} strokeWidth={1.5} opacity={0.5} />
            <text
              x={22} y={4}
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#888" }}
            >
              True
            </text>
            <line x1={0} y1={16} x2={18} y2={16} stroke={COLOR_LINEAR} strokeWidth={1.5} strokeDasharray="4 2" />
            <text
              x={22} y={20}
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#888" }}
            >
              Linear
            </text>
          </g>

          {/* Axis labels */}
          <text
            x={PANEL_W / 2} y={PLOT_H + 22}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#aaa" }}
          >
            x₁
          </text>
          <text
            x={-8} y={PLOT_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -8, ${PLOT_H / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#aaa" }}
          >
            x₂
          </text>
        </g>
      </svg>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#666",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Nonlinearity (μ): {mu.toFixed(1)}
          <input
            type="range"
            min={0.5}
            max={3.0}
            step={0.1}
            value={mu}
            onChange={e => setMu(Number(e.target.value))}
            style={{ width: 130 }}
          />
        </label>

        <button
          onClick={() => setShowOverlay(o => !o)}
          style={{
            ...BTN_BASE,
            fontSize: 11,
            padding: "5px 14px",
            ...(showOverlay ? btnActive(COLOR_TRUE) : {}),
          }}
        >
          {showOverlay ? "Overlay: on" : "Overlay: off"}
        </button>
      </div>
    </div>
  )
}
