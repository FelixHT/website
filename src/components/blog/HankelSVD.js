import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear, scaleSequential } from "d3-scale"
import { defaultSystem, simulateStateSpace, buildHankel, thinSVD, centerColumns } from "./psid-math"

const W = 800
const H = 360
const LEFT_W = 350
const RIGHT_W = 320
const MARGIN = { top: 35, bottom: 45, left: 10, right: 10 }
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T_STEPS = 500
const TRUE_DIM = 3

// Blue-white-red diverging colormap
function divergingColor(val, maxAbs) {
  const t = Math.max(-1, Math.min(1, val / (maxAbs || 1)))
  if (t >= 0) {
    const r = Math.round(255)
    const g = Math.round(255 * (1 - t * 0.6))
    const b = Math.round(255 * (1 - t * 0.7))
    return `rgb(${r},${g},${b})`
  } else {
    const r = Math.round(255 * (1 + t * 0.7))
    const g = Math.round(255 * (1 + t * 0.6))
    const b = Math.round(255)
    return `rgb(${r},${g},${b})`
  }
}

export default function HankelSVD() {
  const [numLags, setNumLags] = useState(10)
  const [seed, setSeed] = useState(1)

  const { hankelData, singVals } = useMemo(() => {
    const sys = defaultSystem()
    const { Y } = simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
    const Yc = centerColumns(Y)
    const { future } = buildHankel(Yc, numLags)
    const { S } = thinSVD(future)
    return { hankelData: future, singVals: S }
  }, [numLags, seed])

  const nRows = hankelData.length
  const nCols = hankelData[0].length

  // Left panel: Hankel matrix heatmap (subsample for rendering)
  const MAX_DISPLAY_ROWS = 60
  const MAX_DISPLAY_COLS = 80
  const rowStep = Math.max(1, Math.floor(nRows / MAX_DISPLAY_ROWS))
  const colStep = Math.max(1, Math.floor(nCols / MAX_DISPLAY_COLS))
  const dispRows = Math.ceil(nRows / rowStep)
  const dispCols = Math.ceil(nCols / colStep)

  const { maxAbs, displayMatrix } = useMemo(() => {
    let mx = 0
    const mat = []
    for (let i = 0; i < dispRows; i++) {
      const row = []
      for (let j = 0; j < dispCols; j++) {
        const ri = Math.min(i * rowStep, nRows - 1)
        const ci = Math.min(j * colStep, nCols - 1)
        const v = hankelData[ri][ci]
        if (Math.abs(v) > mx) mx = Math.abs(v)
        row.push(v)
      }
      mat.push(row)
    }
    return { maxAbs: mx, displayMatrix: mat }
  }, [hankelData, dispRows, dispCols, rowStep, colStep, nRows, nCols])

  const cellW = Math.max(1, (LEFT_W - 40) / dispCols)
  const cellH = Math.max(1, PLOT_H / dispRows)

  // Right panel: Singular value bar chart
  const numBars = Math.min(20, singVals.length)
  const barVals = singVals.slice(0, numBars)
  const barScale = useMemo(() => {
    const mx = Math.max(...barVals)
    return scaleLinear().domain([0, mx]).range([0, PLOT_H - 20])
  }, [barVals])
  const barW = Math.min(25, (RIGHT_W - 20) / numBars - 2)
  const barGap = 2

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        {/* Left panel: Hankel matrix heatmap */}
        <g transform={`translate(${MARGIN.left + 20}, ${MARGIN.top})`}>
          <text
            x={(LEFT_W - 40) / 2} y={-12} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Block Hankel matrix ({nRows} × {nCols})
          </text>

          {displayMatrix.map((row, i) =>
            row.map((v, j) => (
              <rect
                key={`${i}-${j}`}
                x={j * cellW} y={i * cellH}
                width={cellW + 0.5} height={cellH + 0.5}
                fill={divergingColor(v, maxAbs)}
              />
            ))
          )}

          {/* Block structure lines: every m rows */}
          {(() => {
            const m = 6 // observation dimensionality
            const lines = []
            for (let lag = 1; lag < numLags; lag++) {
              const yPos = (lag * m / nRows) * dispRows * cellH
              lines.push(
                <line key={lag} x1={0} y1={yPos} x2={dispCols * cellW} y2={yPos}
                  stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
              )
            }
            return lines
          })()}

          <rect x={0} y={0} width={dispCols * cellW} height={dispRows * cellH}
            fill="none" stroke="#ccc" strokeWidth={1} />

          {/* Labels */}
          <text
            x={(LEFT_W - 40) / 2} y={dispRows * cellH + 18}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
          >
            Time windows (N = {nCols})
          </text>
          <text
            x={-8} y={dispRows * cellH / 2}
            textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(-90, -8, ${dispRows * cellH / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
          >
            Block rows ({numLags} × 6)
          </text>
        </g>

        {/* Right panel: Singular value bar chart */}
        <g transform={`translate(${LEFT_W + 30}, ${MARGIN.top})`}>
          <text
            x={RIGHT_W / 2} y={-12} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Singular values
          </text>

          {barVals.map((v, i) => {
            const bh = barScale(v)
            const x = i * (barW + barGap)
            const isSignal = i < TRUE_DIM
            return (
              <g key={i}>
                <rect
                  x={x} y={PLOT_H - 20 - bh}
                  width={barW} height={bh}
                  fill={isSignal ? "#4A7C6F" : "#ccc"}
                  rx={1}
                />
                {(i < 6 || i === numBars - 1) && (
                  <text
                    x={x + barW / 2} y={PLOT_H - 6}
                    textAnchor="middle"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "#999" }}
                  >
                    {i + 1}
                  </text>
                )}
              </g>
            )
          })}

          {/* Signal/noise labels */}
          <text
            x={((TRUE_DIM - 1) / 2) * (barW + barGap) + barW / 2}
            y={PLOT_H - 20 - barScale(barVals[0]) - 8}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#4A7C6F" }}
          >
            signal
          </text>
        </g>
      </svg>

      {/* Controls */}
      <div style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "#666" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Time lags: {numLags}
          <input
            type="range" min={5} max={30} step={1}
            value={numLags}
            onChange={e => setNumLags(Number(e.target.value))}
            style={{ width: 140 }}
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
