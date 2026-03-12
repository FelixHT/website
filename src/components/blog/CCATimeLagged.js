import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace, centerColumns, buildHankel } from "./psid-math"
import { matT, matMul, generalCCA } from "./cca-math"

const W = 720
const H = 340
const PANEL_W = 200
const GAP = 30
const CCA_W = 220
const MARGIN = { top: 30, bottom: 35 }
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T_STEPS = 500
const NUM_LAGS = 10
const COLOR_OBS = "#4A7C6F"
const COLOR_BEH = "#D4783C"
const COLOR_LATENT = "#4A90D9"

function divergingColor(val, maxAbs, hue) {
  const t = Math.max(-1, Math.min(1, val / (maxAbs || 1)))
  if (hue === "teal") {
    const alpha = Math.abs(t) * 0.8
    return t >= 0
      ? `rgba(74, 124, 111, ${alpha})`
      : `rgba(74, 144, 217, ${alpha})`
  }
  if (hue === "orange") {
    const alpha = Math.abs(t) * 0.8
    return t >= 0
      ? `rgba(212, 120, 60, ${alpha})`
      : `rgba(153, 153, 153, ${alpha})`
  }
  return "#ccc"
}

// Compute covariance matrix from rows
function covMatrix(X) {
  const T = X.length, d = X[0].length
  const C = Array.from({ length: d }, () => new Array(d).fill(0))
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      let s = 0
      for (let t = 0; t < T; t++) s += X[t][i] * X[t][j]
      C[i][j] = s / (T - 1)
      C[j][i] = C[i][j]
    }
  }
  return C
}

export default function CCATimeLagged() {
  const [seed, setSeed] = useState(1)
  const [numDirs, setNumDirs] = useState(3)

  const { Hpast, Zfuture, ccaResult, maxAbsPast, maxAbsFuture } = useMemo(() => {
    const sys = defaultSystem()
    const sim = simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
    const Yc = centerColumns(sim.Y)
    const Zc = centerColumns(sim.Z)

    // Build Hankel for past neural
    const { past: Hp } = buildHankel(Yc, NUM_LAGS)
    // Build Hankel for future behavior
    const { future: Zf } = buildHankel(Zc, NUM_LAGS)

    // Transpose to get observations as rows (T x features)
    const HpT = matT(Hp) // T x (numLags * obsDim)
    const ZfT = matT(Zf) // T x (numLags * behDim)

    // Subsample for CCA stability
    const maxSamples = 400
    const sub = Math.min(HpT.length, ZfT.length, maxSamples)
    const HpSub = HpT.slice(0, sub)
    const ZfSub = ZfT.slice(0, sub)

    let cca = null
    try {
      cca = generalCCA(HpSub, ZfSub)
    } catch (e) {
      cca = { correlations: [], Wx: [], Wy: [] }
    }

    // Compute max abs for heatmaps (subsample display)
    let mxP = 0, mxF = 0
    for (let i = 0; i < Math.min(Hp.length, 30); i++) {
      for (let j = 0; j < Math.min(Hp[0].length, 60); j++) {
        if (Math.abs(Hp[i][j]) > mxP) mxP = Math.abs(Hp[i][j])
      }
    }
    for (let i = 0; i < Math.min(Zf.length, 30); i++) {
      for (let j = 0; j < Math.min(Zf[0].length, 60); j++) {
        if (Math.abs(Zf[i][j]) > mxF) mxF = Math.abs(Zf[i][j])
      }
    }

    return {
      Hpast: Hp, Zfuture: Zf, ccaResult: cca,
      maxAbsPast: mxP, maxAbsFuture: mxF,
    }
  }, [seed])

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  // Matrix display params
  const maxDispRows = 30
  const maxDispCols = 50
  const pastRows = Math.min(Hpast.length, maxDispRows)
  const pastCols = Math.min(Hpast[0]?.length || 1, maxDispCols)
  const futRows = Math.min(Zfuture.length, maxDispRows)
  const futCols = Math.min(Zfuture[0]?.length || 1, maxDispCols)

  const cellWP = PANEL_W / pastCols
  const cellHP = PLOT_H / pastRows
  const cellWF = PANEL_W / futCols
  const cellHF = PLOT_H / futRows

  // CCA results
  const corrs = ccaResult.correlations || []
  const numCorrs = Math.min(corrs.length, 6)
  const barCorrs = corrs.slice(0, numCorrs)
  const barScale = useMemo(
    () => scaleLinear().domain([0, 1]).range([0, PLOT_H - 40]),
    []
  )
  const barW = Math.min(28, (CCA_W - 40) / numCorrs - 4)
  const barGap = 4

  // Subsample display matrices
  const rowStepP = Math.max(1, Math.floor(Hpast.length / pastRows))
  const colStepP = Math.max(1, Math.floor((Hpast[0]?.length || 1) / pastCols))
  const rowStepF = Math.max(1, Math.floor(Zfuture.length / futRows))
  const colStepF = Math.max(1, Math.floor((Zfuture[0]?.length || 1) / futCols))

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        {/* Left: Past neural Hankel */}
        <g transform={`translate(${10}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-12} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: COLOR_OBS }}
          >
            Y_past (neural)
          </text>

          {Array.from({ length: pastRows }, (_, i) =>
            Array.from({ length: pastCols }, (_, j) => {
              const ri = Math.min(i * rowStepP, Hpast.length - 1)
              const ci = Math.min(j * colStepP, (Hpast[0]?.length || 1) - 1)
              const v = Hpast[ri]?.[ci] || 0
              return (
                <rect
                  key={`p-${i}-${j}`}
                  x={j * cellWP} y={i * cellHP}
                  width={cellWP + 0.5} height={cellHP + 0.5}
                  fill={divergingColor(v, maxAbsPast, "teal")}
                />
              )
            })
          )}

          <rect x={0} y={0} width={PANEL_W} height={PLOT_H}
            fill="none" stroke={COLOR_OBS} strokeWidth={1} opacity={0.4} />
        </g>

        {/* Middle: Future behavior Hankel */}
        <g transform={`translate(${10 + PANEL_W + GAP}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-12} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: COLOR_BEH }}
          >
            Z_future (behavior)
          </text>

          {Array.from({ length: futRows }, (_, i) =>
            Array.from({ length: futCols }, (_, j) => {
              const ri = Math.min(i * rowStepF, Zfuture.length - 1)
              const ci = Math.min(j * colStepF, (Zfuture[0]?.length || 1) - 1)
              const v = Zfuture[ri]?.[ci] || 0
              return (
                <rect
                  key={`f-${i}-${j}`}
                  x={j * cellWF} y={i * cellHF}
                  width={cellWF + 0.5} height={cellHF + 0.5}
                  fill={divergingColor(v, maxAbsFuture, "orange")}
                />
              )
            })
          )}

          <rect x={0} y={0} width={PANEL_W} height={PLOT_H}
            fill="none" stroke={COLOR_BEH} strokeWidth={1} opacity={0.4} />
        </g>

        {/* Right: CCA correlations */}
        <g transform={`translate(${10 + 2 * PANEL_W + 2 * GAP}, ${MARGIN.top})`}>
          <text
            x={CCA_W / 2} y={-12} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            CCA correlations
          </text>

          {barCorrs.map((c, i) => {
            const bh = barScale(Math.abs(c))
            const totalW = numCorrs * (barW + barGap) - barGap
            const x = i * (barW + barGap) + (CCA_W - totalW) / 2
            const isRelevant = i < numDirs
            return (
              <g key={i}>
                <rect
                  x={x} y={PLOT_H - 40 - bh}
                  width={barW} height={bh}
                  fill={isRelevant ? COLOR_LATENT : "#ccc"}
                  rx={2}
                />
                <text
                  x={x + barW / 2} y={PLOT_H - 40 - bh - 5}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#555" }}
                >
                  {Math.abs(c).toFixed(2)}
                </text>
                <text
                  x={x + barW / 2} y={PLOT_H - 24}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#888" }}
                >
                  {i + 1}
                </text>
              </g>
            )
          })}

          <line x1={0} y1={PLOT_H - 40} x2={CCA_W} y2={PLOT_H - 40} stroke="#ccc" strokeWidth={1} />

          {/* Arrow from neural to CCA */}
          <text
            x={CCA_W / 2} y={PLOT_H - 6}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
          >
            Canonical direction
          </text>
        </g>

        {/* CCA arrows between panels */}
        <g>
          {/* Arrow from past to CCA */}
          <line
            x1={10 + PANEL_W + 4} y1={MARGIN.top + PLOT_H / 2}
            x2={10 + PANEL_W + GAP - 4} y2={MARGIN.top + PLOT_H / 2}
            stroke="#aaa" strokeWidth={1} markerEnd="url(#arrowhead)"
          />
          {/* Arrow from future to CCA */}
          <line
            x1={10 + 2 * PANEL_W + GAP + 4} y1={MARGIN.top + PLOT_H / 2}
            x2={10 + 2 * PANEL_W + 2 * GAP - 4} y2={MARGIN.top + PLOT_H / 2}
            stroke="#aaa" strokeWidth={1} markerEnd="url(#arrowhead)"
          />
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#aaa" />
            </marker>
          </defs>
        </g>
      </svg>

      {/* Controls */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "#666" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Relevant dims: {numDirs}
          <input
            type="range" min={1} max={Math.min(5, numCorrs)} step={1}
            value={numDirs}
            onChange={e => setNumDirs(Number(e.target.value))}
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
