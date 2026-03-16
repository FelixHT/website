import React, { useState, useMemo } from "react"
import { generateReachingTask, inferSingleTrial, loadDemoModel } from "./lfads-math"
import modelJson from "./lfads-demo-model.json"
import { BTN_BASE, btnActive, COLORS } from "./figureConstants"

const W = 800
const H = 500
const FONT = "var(--font-mono, monospace)"

const COLOR_ENCODER = COLORS.encoder   // "#7b68ae"
const COLOR_GEN = "#3d6cb9"
const COLOR_CTRL = COLORS.controller   // "#d4a03c"

const N_BINS = 20
const N_NEURONS = 20
const N_CONDITIONS = 8
const N_TRIALS = 3

const BOX_W = 28
const BOX_H = 22
const BOX_R = 3
const ARROW_HEAD = 5

// Pre-selected trials: condition 0 trials 0,1,2
const TRIAL_LABELS = ["Trial 1", "Trial 2", "Trial 3"]

function Arrow({ x1, y1, x2, y2, color = "#999", label, dashed = false }) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return null
  const ux = dx / len
  const uy = dy / len
  const ex = x2 - ux * 2
  const ey = y2 - uy * 2

  return (
    <g>
      <line
        x1={x1} y1={y1} x2={ex} y2={ey}
        stroke={color} strokeWidth={1.2}
        strokeDasharray={dashed ? "4 3" : "none"}
      />
      <polygon
        points={`${x2},${y2} ${x2 - ux * ARROW_HEAD - uy * 2.5},${y2 - uy * ARROW_HEAD + ux * 2.5} ${x2 - ux * ARROW_HEAD + uy * 2.5},${y2 - uy * ARROW_HEAD - ux * 2.5}`}
        fill={color}
      />
      {label && (
        <text
          x={(x1 + x2) / 2 + uy * 10}
          y={(y1 + y2) / 2 - ux * 10}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: FONT, fontSize: 8, fill: color }}
        >
          {label}
        </text>
      )}
    </g>
  )
}

function fmt(v) {
  return typeof v === "number" ? v.toFixed(2) : "?"
}

export default function EncoderArchitecture() {
  const [trialIdx, setTrialIdx] = useState(0)

  const model = useMemo(() => loadDemoModel(modelJson.default), [])

  const taskData = useMemo(
    () => generateReachingTask(N_CONDITIONS, N_TRIALS, N_NEURONS, 42),
    []
  )

  // Inference results for the 3 trials of condition 0
  const trialResults = useMemo(() => {
    const results = []
    for (let t = 0; t < N_TRIALS; t++) {
      const spikes = taskData.spikes[0][t]
      // Subsample spikes to N_BINS
      const T = spikes.length
      const binSize = Math.floor(T / N_BINS)
      const binned = []
      for (let b = 0; b < N_BINS; b++) {
        const row = new Array(N_NEURONS).fill(0)
        for (let i = 0; i < binSize; i++) {
          const ti = b * binSize + i
          if (ti < T) {
            for (let n = 0; n < N_NEURONS; n++) {
              row[n] += spikes[ti][n]
            }
          }
        }
        binned.push(row)
      }

      const result = inferSingleTrial(spikes, model)
      results.push({
        binned,
        ic_mu: result.ic_mu,
        ic_logvar: result.ic_logvar,
        rates: result.rates,
        states: result.states,
      })
    }
    return results
  }, [taskData, model])

  const current = trialResults[trialIdx]

  // Layout
  const topRowY = 50
  const bottomRowY = 300
  const spikeX = 60
  const spikeW = N_BINS * (BOX_W + 4)

  // Spike train rendering (top left)
  const spikeRaster = useMemo(() => {
    const ticks = []
    const binned = current.binned
    for (let b = 0; b < N_BINS; b++) {
      for (let n = 0; n < Math.min(10, N_NEURONS); n++) {
        if (binned[b][n] > 0) {
          const x = spikeX + b * (BOX_W + 4) + BOX_W / 2
          const y = topRowY + 20 + n * 8
          ticks.push(
            <line
              key={`${b}-${n}`}
              x1={x} y1={y - 3}
              x2={x} y2={y + 3}
              stroke="#333"
              strokeWidth={Math.min(binned[b][n], 3) * 0.5 + 0.3}
              opacity={0.6}
            />
          )
        }
      }
    }
    return ticks
  }, [current])

  // Forward RNN boxes (top row, below spike train)
  const fwdY = topRowY + 120
  const bwdY = topRowY + 170

  // IC distribution box
  const icBoxX = spikeX + spikeW + 30
  const icBoxY = topRowY + 130

  // Generator boxes (bottom row)
  const genY = bottomRowY + 20
  const ctrlY = bottomRowY + 90
  const nGenSteps = 8

  // Controller output values (simplified from rates)
  const ctrlSignals = useMemo(() => {
    const signals = []
    const T = current.states.length
    const step = Math.floor(T / nGenSteps)
    for (let i = 0; i < nGenSteps; i++) {
      const ti = Math.min(i * step, T - 1)
      signals.push(current.states[ti][0])
    }
    return signals
  }, [current])

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Title */}
        <text
          x={W / 2} y={22}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 13, fill: "#333", fontWeight: 600 }}
        >
          Encoder + controller architecture
        </text>

        {/* === TOP ROW: Bidirectional Encoder === */}

        {/* Spike train label */}
        <text
          x={spikeX - 10} y={topRowY + 60}
          textAnchor="end"
          style={{ fontFamily: FONT, fontSize: 9, fill: "#888" }}
          transform={`rotate(-90, ${spikeX - 10}, ${topRowY + 60})`}
        >
          Spikes
        </text>

        {/* Spike raster */}
        <g>
          <rect
            x={spikeX - 4} y={topRowY + 12}
            width={Math.min(spikeW, 500)} height={85}
            fill="#fafafa" stroke="#eee" strokeWidth={1} rx={3}
          />
          {spikeRaster}
          {/* Time bin markers */}
          {[0, Math.floor(N_BINS / 2), N_BINS - 1].map(b => (
            <text
              key={b}
              x={spikeX + b * (BOX_W + 4) + BOX_W / 2}
              y={topRowY + 105}
              textAnchor="middle"
              style={{ fontFamily: FONT, fontSize: 7, fill: "#bbb" }}
            >
              t={b}
            </text>
          ))}
        </g>

        {/* Forward RNN boxes */}
        <text
          x={spikeX - 10} y={fwdY + BOX_H / 2}
          textAnchor="end"
          dominantBaseline="middle"
          style={{ fontFamily: FONT, fontSize: 8, fill: COLOR_ENCODER }}
        >
          Fwd
        </text>
        {Array.from({ length: Math.min(8, N_BINS) }).map((_, i) => {
          const spacing = Math.min((spikeW - BOX_W) / 7, 65)
          const bx = spikeX + i * spacing
          return (
            <g key={`fwd-${i}`}>
              <rect
                x={bx} y={fwdY}
                width={BOX_W} height={BOX_H}
                rx={BOX_R} fill="#ece8f4" stroke={COLOR_ENCODER} strokeWidth={1.2}
              />
              {i < 7 && (
                <Arrow
                  x1={bx + BOX_W} y1={fwdY + BOX_H / 2}
                  x2={bx + spacing} y2={fwdY + BOX_H / 2}
                  color={COLOR_ENCODER}
                />
              )}
            </g>
          )
        })}

        {/* Backward RNN boxes */}
        <text
          x={spikeX - 10} y={bwdY + BOX_H / 2}
          textAnchor="end"
          dominantBaseline="middle"
          style={{ fontFamily: FONT, fontSize: 8, fill: COLOR_ENCODER }}
        >
          Bwd
        </text>
        {Array.from({ length: Math.min(8, N_BINS) }).map((_, i) => {
          const spacing = Math.min((spikeW - BOX_W) / 7, 65)
          const bx = spikeX + i * spacing
          return (
            <g key={`bwd-${i}`}>
              <rect
                x={bx} y={bwdY}
                width={BOX_W} height={BOX_H}
                rx={BOX_R} fill="#ece8f4" stroke={COLOR_ENCODER} strokeWidth={1.2}
              />
              {i > 0 && (
                <Arrow
                  x1={bx} y1={bwdY + BOX_H / 2}
                  x2={bx - spacing + BOX_W} y2={bwdY + BOX_H / 2}
                  color={COLOR_ENCODER}
                />
              )}
            </g>
          )
        })}

        {/* Arrows from spike bins down to RNN boxes */}
        {[0, 3, 7].map(i => {
          const spacing = Math.min((spikeW - BOX_W) / 7, 65)
          const bx = spikeX + i * spacing + BOX_W / 2
          return (
            <line
              key={`spike-to-rnn-${i}`}
              x1={bx} y1={topRowY + 100}
              x2={bx} y2={fwdY - 2}
              stroke="#ccc" strokeWidth={0.8} strokeDasharray="2 2"
            />
          )
        })}

        {/* Convergence arrows to IC box */}
        {(() => {
          const spacing = Math.min((spikeW - BOX_W) / 7, 65)
          const fwdLastX = spikeX + 7 * spacing + BOX_W
          const bwdFirstX = spikeX
          return (
            <g>
              {/* Forward final state -> IC */}
              <Arrow
                x1={fwdLastX} y1={fwdY + BOX_H / 2}
                x2={icBoxX} y2={icBoxY + 10}
                color={COLOR_ENCODER}
                label="h_fwd_T"
              />
              {/* Backward initial state -> IC */}
              <Arrow
                x1={bwdFirstX} y1={bwdY + BOX_H / 2}
                x2={icBoxX} y2={icBoxY + 30}
                color={COLOR_ENCODER}
                label="h_bwd_0"
              />
            </g>
          )
        })()}

        {/* IC distribution box */}
        <g>
          <rect
            x={icBoxX} y={icBoxY}
            width={120} height={50}
            rx={5} fill="#fff" stroke={COLOR_ENCODER} strokeWidth={1.5}
          />
          <text
            x={icBoxX + 60} y={icBoxY + 16}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: COLOR_ENCODER, fontWeight: 600 }}
          >
            {"μ₀, σ₀"}
          </text>
          <text
            x={icBoxX + 60} y={icBoxY + 32}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 8, fill: "#666" }}
          >
            {`μ=[${current.ic_mu.slice(0, 2).map(v => fmt(v)).join(",")}...]`}
          </text>
          <text
            x={icBoxX + 60} y={icBoxY + 44}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 8, fill: "#999" }}
          >
            {"z₀ = μ₀ + σ₀ ⊙ ε"}
          </text>
        </g>

        {/* Arrow from IC to generator */}
        <Arrow
          x1={icBoxX + 60} y1={icBoxY + 50}
          x2={icBoxX + 60} y2={bottomRowY - 5}
          color={COLOR_ENCODER}
          label="z₀"
        />

        {/* Section label */}
        <text
          x={20} y={topRowY + 5}
          style={{ fontFamily: FONT, fontSize: 10, fill: "#aaa", fontWeight: 600 }}
        >
          ENCODER (bidirectional RNN)
        </text>

        {/* Divider */}
        <line
          x1={20} y1={bottomRowY - 15}
          x2={W - 20} y2={bottomRowY - 15}
          stroke="#eee" strokeWidth={1}
        />

        {/* === BOTTOM ROW: Generator + Controller === */}

        <text
          x={20} y={bottomRowY}
          style={{ fontFamily: FONT, fontSize: 10, fill: "#aaa", fontWeight: 600 }}
        >
          GENERATOR + CONTROLLER
        </text>

        {/* Generator GRU boxes */}
        <text
          x={50} y={genY + BOX_H / 2}
          textAnchor="end"
          dominantBaseline="middle"
          style={{ fontFamily: FONT, fontSize: 8, fill: COLOR_GEN }}
        >
          Gen
        </text>
        {Array.from({ length: nGenSteps }).map((_, i) => {
          const spacing = 75
          const bx = 70 + i * spacing
          return (
            <g key={`gen-${i}`}>
              <rect
                x={bx} y={genY}
                width={BOX_W + 8} height={BOX_H}
                rx={BOX_R} fill="#e4ecf8" stroke={COLOR_GEN} strokeWidth={1.2}
              />
              <text
                x={bx + (BOX_W + 8) / 2} y={genY + BOX_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontFamily: FONT, fontSize: 7, fill: COLOR_GEN }}
              >
                GRU
              </text>
              {i < nGenSteps - 1 && (
                <Arrow
                  x1={bx + BOX_W + 8} y1={genY + BOX_H / 2}
                  x2={bx + spacing} y2={genY + BOX_H / 2}
                  color={COLOR_GEN}
                />
              )}
            </g>
          )
        })}

        {/* Controller GRU boxes */}
        <text
          x={50} y={ctrlY + BOX_H / 2}
          textAnchor="end"
          dominantBaseline="middle"
          style={{ fontFamily: FONT, fontSize: 8, fill: COLOR_CTRL }}
        >
          Ctrl
        </text>
        {Array.from({ length: nGenSteps }).map((_, i) => {
          const spacing = 75
          const bx = 70 + i * spacing
          return (
            <g key={`ctrl-${i}`}>
              <rect
                x={bx} y={ctrlY}
                width={BOX_W + 8} height={BOX_H}
                rx={BOX_R} fill="#faf3e4" stroke={COLOR_CTRL} strokeWidth={1.2}
              />
              <text
                x={bx + (BOX_W + 8) / 2} y={ctrlY + BOX_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontFamily: FONT, fontSize: 7, fill: COLOR_CTRL }}
              >
                {fmt(ctrlSignals[i])}
              </text>
              {/* Arrow: gen -> ctrl (down) */}
              <Arrow
                x1={bx + (BOX_W + 8) / 2 - 6} y1={genY + BOX_H}
                x2={bx + (BOX_W + 8) / 2 - 6} y2={ctrlY}
                color="#bbb"
              />
              {/* Arrow: ctrl -> gen (up, feedback u_t) */}
              <Arrow
                x1={bx + (BOX_W + 8) / 2 + 6} y1={ctrlY}
                x2={bx + (BOX_W + 8) / 2 + 6} y2={genY + BOX_H}
                color={COLOR_CTRL}
                dashed
              />
            </g>
          )
        })}

        {/* u_t label on one feedback arrow */}
        <text
          x={70 + 3 * 75 + (BOX_W + 8) / 2 + 14}
          y={(genY + BOX_H + ctrlY) / 2}
          dominantBaseline="middle"
          style={{ fontFamily: FONT, fontSize: 8, fill: COLOR_CTRL }}
        >
          u_t
        </text>

        {/* Time labels below controller */}
        {Array.from({ length: nGenSteps }).map((_, i) => {
          const spacing = 75
          const bx = 70 + i * spacing + (BOX_W + 8) / 2
          return (
            <text
              key={`t-${i}`}
              x={bx} y={ctrlY + BOX_H + 14}
              textAnchor="middle"
              style={{ fontFamily: FONT, fontSize: 7, fill: "#bbb" }}
            >
              t={i}
            </text>
          )
        })}
      </svg>

      {/* Trial selector buttons */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginTop: 6,
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
        }}
      >
        <span style={{ fontSize: 11 }}>Select trial:</span>
        {TRIAL_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setTrialIdx(i)}
            style={{
              ...BTN_BASE,
              fontSize: 11,
              ...(trialIdx === i ? btnActive(COLOR_ENCODER) : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
