import React, { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace, centerColumns } from "./psid-math"

const W = 720
const TOP_H = 100
const BOT_Y = TOP_H + 30
const BOT_H = 160
const MARGIN = { left: 55, right: 15, top: 15 }
const PLOT_W = W - MARGIN.left - MARGIN.right
const T_STEPS = 200
const NUM_LAGS = 6
const OBS_DIM = 6
const COLOR_OBS = "#4A7C6F"
const MAX_COLS = 40

// Color palette for time indices — cycles so anti-diagonals share colors
const TIME_PALETTE = [
  "#4A90D9", "#D4783C", "#4A7C6F", "#9B59B6",
  "#E74C3C", "#2ECC71", "#F39C12", "#1ABC9C",
  "#E67E22", "#3498DB", "#8E44AD", "#27AE60",
]

function timeColor(t, alpha = 1) {
  const hex = TIME_PALETTE[t % TIME_PALETTE.length]
  if (alpha >= 1) return hex
  // Convert hex to rgba
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function HankelBuilder() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [seed, setSeed] = useState(1)
  const timerRef = useRef(null)

  const { Y, maxCols } = useMemo(() => {
    const sys = defaultSystem()
    const sim = simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
    const Yc = centerColumns(sim.Y)
    const mc = Math.min(MAX_COLS, T_STEPS - NUM_LAGS)
    return { Y: Yc, maxCols: mc }
  }, [seed])

  const maxStep = maxCols - 1

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setStep(s => {
          if (s >= maxStep) {
            setPlaying(false)
            return maxStep
          }
          return s + 1
        })
      }, 120)
    }
    return () => clearInterval(timerRef.current)
  }, [playing, maxStep])

  const handlePlay = useCallback(() => {
    if (step >= maxStep) setStep(0)
    setPlaying(p => !p)
  }, [step, maxStep])

  const handleRegenerate = useCallback(() => {
    setSeed(s => s + 1)
    setStep(0)
    setPlaying(false)
  }, [])

  const sx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, PLOT_W]),
    []
  )

  const traces = useMemo(() => {
    return Array.from({ length: OBS_DIM }, (_, n) => {
      const vals = Y.map(r => r[n])
      const mn = Math.min(...vals), mx = Math.max(...vals)
      const pad = (mx - mn) * 0.1 || 1
      const sy = scaleLinear().domain([mn - pad, mx + pad]).range([TOP_H - 4, 4])
      return { vals, sy }
    })
  }, [Y])

  const windowStart = step
  const windowEnd = step + NUM_LAGS - 1

  // Matrix cell dimensions
  const matRows = NUM_LAGS * OBS_DIM
  const cellW = Math.min(12, (PLOT_W - 20) / maxCols)
  const cellH = Math.min(4, BOT_H / matRows)
  const matW = maxCols * cellW
  const matH = matRows * cellH
  const blockH = OBS_DIM * cellH
  const svgH = BOT_Y + matH + 28

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${svgH}`} style={{ display: "block", width: "100%", height: "auto" }}>
        {/* Top: time series with sliding window */}
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          <text
            x={PLOT_W / 2} y={-4} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Sliding window → each position becomes a column of H
          </text>

          {/* Colored tick marks at each time step in the window */}
          {Array.from({ length: NUM_LAGS }, (_, lag) => {
            const t = windowStart + lag
            return (
              <line
                key={lag}
                x1={sx(t)} y1={0} x2={sx(t)} y2={TOP_H}
                stroke={timeColor(t)}
                strokeWidth={1.5}
                opacity={0.4}
              />
            )
          })}

          {/* Window background */}
          <rect
            x={sx(windowStart)} y={0}
            width={sx(windowEnd) - sx(windowStart)}
            height={TOP_H}
            fill="rgba(74, 124, 111, 0.06)"
            stroke={COLOR_OBS}
            strokeWidth={1}
            rx={2}
          />

          {/* Time series traces */}
          {traces.map(({ vals, sy }, n) => {
            const path = vals.map((v, t) =>
              `${t === 0 ? "M" : "L"}${sx(t)},${sy(v)}`
            ).join(" ")
            return (
              <path
                key={n} d={path}
                fill="none" stroke={COLOR_OBS}
                strokeWidth={0.7} opacity={0.5}
              />
            )
          })}

          {/* Colored dots at each window time step on first trace */}
          {Array.from({ length: NUM_LAGS }, (_, lag) => {
            const t = windowStart + lag
            if (t >= Y.length) return null
            return (
              <circle
                key={lag}
                cx={sx(t)} cy={traces[0].sy(traces[0].vals[t])}
                r={3} fill={timeColor(t)}
              />
            )
          })}

          {/* Window label */}
          <text
            x={(sx(windowStart) + sx(windowEnd)) / 2} y={TOP_H + 14}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: COLOR_OBS }}
          >
            t={windowStart + 1}…t+{NUM_LAGS - 1}
          </text>

          <text
            x={-8} y={TOP_H / 2}
            textAnchor="end" dominantBaseline="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
          >
            y(t)
          </text>
        </g>

        {/* Bottom: matrix being built */}
        <g transform={`translate(${MARGIN.left}, ${BOT_Y})`}>
          {/* Grid outline for unfilled area */}
          <rect
            x={0} y={0}
            width={matW} height={matH}
            fill="#fafafa" stroke="#ddd" strokeWidth={0.5}
          />

          {/* Filled columns — colored by time index for anti-diagonal tracking */}
          {Array.from({ length: step + 1 }, (_, c) =>
            Array.from({ length: NUM_LAGS }, (_, lag) => {
              const t = c + lag // time index for this block
              const yPos = lag * blockH
              const isActive = c === step
              return (
                <rect
                  key={`${c}-${lag}`}
                  x={c * cellW} y={yPos}
                  width={cellW} height={blockH}
                  fill={timeColor(t, isActive ? 0.55 : 0.3)}
                  stroke={isActive ? timeColor(t, 0.8) : "none"}
                  strokeWidth={isActive ? 0.8 : 0}
                />
              )
            })
          )}

          {/* Anti-diagonal highlight: show cells sharing the same time index
              as the middle of the current window */}
          {(() => {
            const trackedT = step + Math.floor(NUM_LAGS / 2)
            const highlights = []
            for (let c = 0; c <= step; c++) {
              const lag = trackedT - c
              if (lag >= 0 && lag < NUM_LAGS) {
                highlights.push(
                  <rect
                    key={`ad-${c}`}
                    x={c * cellW} y={lag * blockH}
                    width={cellW} height={blockH}
                    fill="none"
                    stroke={timeColor(trackedT)}
                    strokeWidth={1.5}
                    rx={1}
                  />
                )
              }
            }
            return highlights
          })()}

          {/* Active column border */}
          <rect
            x={step * cellW} y={0}
            width={cellW} height={matH}
            fill="none" stroke={COLOR_OBS} strokeWidth={1.5}
          />

          {/* Block row separators */}
          {Array.from({ length: NUM_LAGS - 1 }, (_, i) => (
            <line
              key={i}
              x1={0} y1={(i + 1) * blockH}
              x2={Math.min((step + 1) * cellW, matW)} y2={(i + 1) * blockH}
              stroke="rgba(0,0,0,0.15)" strokeWidth={0.5}
            />
          ))}

          {/* Row labels with matching colors */}
          {Array.from({ length: NUM_LAGS }, (_, lag) => {
            const t = step + lag
            return (
              <text
                key={lag}
                x={-6} y={(lag + 0.5) * blockH}
                textAnchor="end" dominantBaseline="middle"
                style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: timeColor(t, 0.7) }}
              >
                y(t{lag > 0 ? `+${lag}` : ""})
              </text>
            )
          })}

          {/* Column label */}
          <text
            x={matW / 2} y={matH + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
          >
            Column {step + 1} of {maxCols} — same color = same time point (anti-diagonal)
          </text>

          {/* Matrix label */}
          <text
            x={-40} y={matH / 2}
            textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(-90, -40, ${matH / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666", fontWeight: 600 }}
          >
            H
          </text>
        </g>
      </svg>

      {/* Controls */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "#666" }}>
        <button
          onClick={handlePlay}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
            background: playing ? COLOR_OBS : "#f4f3f0",
            border: `1px solid ${playing ? COLOR_OBS : "#ccc9c2"}`,
            borderRadius: 4, padding: "4px 14px",
            color: playing ? "#fff" : "#555",
          }}
        >
          {playing ? "Pause" : step >= maxStep ? "Replay" : "Play"}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Step: {step + 1}
          <input
            type="range" min={0} max={maxStep} step={1}
            value={step}
            onChange={e => { setStep(Number(e.target.value)); setPlaying(false) }}
            style={{ width: 200 }}
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
