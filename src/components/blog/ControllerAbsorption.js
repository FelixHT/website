import React, { useState, useMemo } from "react"
import { scaleLinear } from "d3-scale"
import {
  generateReachingTask,
  inferSingleTrial,
  loadDemoModel,
  gruStep,
} from "./lfads-math"
import modelJson from "./lfads-demo-model.json"

const W = 800
const H = 400
const MARGIN = { top: 40, right: 20, bottom: 30, left: 40 }
const FONT = "var(--font-mono, monospace)"

const PANEL_W = (W - MARGIN.left - MARGIN.right - 50) / 2
const SUB_H = (H - MARGIN.top - MARGIN.bottom - 30) / 3
const SUB_GAP = 10
const T = 100

const COLOR_GEN = "#4A90D9"
const COLOR_CTRL = "#D4A03C"
const COLOR_RATE = "#4A7C6F"

/**
 * Simulate controller signals for a trial given a model variant.
 * Since inferSingleTrial uses the mean IC and runs the generator
 * without controller, we simulate the controller GRU separately
 * by feeding the generator states as part of the input.
 *
 * For the well-regularized model: controller outputs are sparse/small.
 * For the under-regularized model: controller outputs are large/dense.
 */
function simulateControllerSignals(spikes, model) {
  const { states, rates } = inferSingleTrial(spikes, model)
  const ctrl = model.controller
  const ctrlDim = ctrl.Wr.length // 2
  const ctrlInputDim = ctrl.Wr[0].length // 5 = ctrlDim + genDim
  const genDim = states[0].length

  // Run the controller GRU: input at each step is [ctrl_h, gen_state]
  // This simulates the controller "responding" to the generator's output
  let h_ctrl = new Float64Array(ctrlDim)
  const ctrlOutputs = []

  for (let t = 0; t < T; t++) {
    // Controller input: generator state (padded/truncated to fit)
    const input = new Float64Array(ctrlInputDim - ctrlDim)
    for (let i = 0; i < Math.min(genDim, ctrlInputDim - ctrlDim); i++) {
      input[i] = states[t][i]
    }
    const { h_new } = gruStep(
      h_ctrl, input,
      ctrl.Wr, ctrl.Wu, ctrl.Wc,
      ctrl.br, ctrl.bu, ctrl.bc
    )
    ctrlOutputs.push(Array.from(h_new))
    h_ctrl = h_new
  }

  // Generator trajectory (first 2 dims for plotting)
  const genTraj = states.map(s => [s[0], s[1]])

  return { genTraj, ctrlOutputs, rates }
}

export default function ControllerAbsorption() {
  const [penalty, setPenalty] = useState(50)

  const wellRegModel = useMemo(() => loadDemoModel(modelJson.default), [])
  const underRegModel = useMemo(() => loadDemoModel(modelJson.underRegularized), [])

  const taskData = useMemo(
    () => generateReachingTask(8, 3, 20, 42),
    []
  )

  // Pick one trial from condition 0
  const trialSpikes = taskData.spikes[0][0]

  const wellRegData = useMemo(
    () => simulateControllerSignals(trialSpikes, wellRegModel),
    [trialSpikes, wellRegModel]
  )
  const underRegData = useMemo(
    () => simulateControllerSignals(trialSpikes, underRegModel),
    [trialSpikes, underRegModel]
  )

  // Interpolate between well-regularized and under-regularized based on slider
  // penalty=0 => fully under-regularized, penalty=100 => fully well-regularized
  const alpha = penalty / 100

  const interpData = useMemo(() => {
    const genTraj = wellRegData.genTraj.map((pt, t) => [
      alpha * pt[0] + (1 - alpha) * underRegData.genTraj[t][0],
      alpha * pt[1] + (1 - alpha) * underRegData.genTraj[t][1],
    ])
    const ctrlOutputs = wellRegData.ctrlOutputs.map((pt, t) =>
      pt.map((v, i) =>
        alpha * v + (1 - alpha) * underRegData.ctrlOutputs[t][i]
      )
    )
    const rates = wellRegData.rates.map((row, t) =>
      row.map((v, n) =>
        alpha * v + (1 - alpha) * underRegData.rates[t][n]
      )
    )
    return { genTraj, ctrlOutputs, rates }
  }, [alpha, wellRegData, underRegData])

  // === Scales ===
  const timeSx = useMemo(
    () => scaleLinear().domain([0, T - 1]).range([0, PANEL_W]),
    []
  )

  // Generator trajectory scale (2D plot)
  const { genSx, genSy } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (const data of [wellRegData, underRegData]) {
      for (const [x, y] of data.genTraj) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    const padX = (maxX - minX) * 0.15 || 0.5
    const padY = (maxY - minY) * 0.15 || 0.5
    return {
      genSx: scaleLinear().domain([minX - padX, maxX + padX]).range([0, PANEL_W]),
      genSy: scaleLinear().domain([minY - padY, maxY + padY]).range([SUB_H, 0]),
    }
  }, [wellRegData, underRegData])

  // Controller signal scale
  const ctrlSy = useMemo(() => {
    let maxAbs = 0
    for (const data of [wellRegData, underRegData]) {
      for (const pt of data.ctrlOutputs) {
        for (const v of pt) {
          if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v)
        }
      }
    }
    const bound = maxAbs * 1.2 || 1
    return scaleLinear().domain([-bound, bound]).range([SUB_H, 0])
  }, [wellRegData, underRegData])

  // Rate scale
  const rateSy = useMemo(() => {
    let maxR = 0
    for (const data of [wellRegData, underRegData]) {
      for (const row of data.rates) {
        for (const v of row) {
          if (v > maxR) maxR = v
        }
      }
    }
    return scaleLinear().domain([0, maxR * 1.15 || 5]).range([SUB_H, 0])
  }, [wellRegData, underRegData])

  const renderPanel = (data, panelLabel, x0) => {
    const y0Gen = 0
    const y0Ctrl = SUB_H + SUB_GAP
    const y0Rate = 2 * (SUB_H + SUB_GAP)

    // Generator trajectory (2D)
    const genPath = data.genTraj
      .map((pt, t) => `${t === 0 ? "M" : "L"}${genSx(pt[0])},${genSy(pt[1])}`)
      .join(" ")

    // Controller: plot dim 0 as time series
    const ctrlPath = data.ctrlOutputs
      .map((pt, t) => `${t === 0 ? "M" : "L"}${timeSx(t)},${ctrlSy(pt[0])}`)
      .join(" ")

    // Rates: 3 example neurons
    const rateNeurons = [0, 3, 7]
    const rateColors = ["#4A7C6F", "#6A9A8A", "#8ABCAA"]

    return (
      <g transform={`translate(${x0}, ${MARGIN.top})`}>
        <text
          x={PANEL_W / 2} y={-14}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 10, fill: "#666", fontWeight: 600 }}
        >
          {panelLabel}
        </text>

        {/* Generator trajectory */}
        <g transform={`translate(0, ${y0Gen})`}>
          <rect x={0} y={0} width={PANEL_W} height={SUB_H} fill="#f8f8f6" rx={2} />
          <path d={genPath} fill="none" stroke={COLOR_GEN} strokeWidth={1.8} />
          <circle
            cx={genSx(data.genTraj[0][0])}
            cy={genSy(data.genTraj[0][1])}
            r={2.5} fill={COLOR_GEN}
          />
          <text
            x={4} y={12}
            style={{ fontFamily: FONT, fontSize: 8, fill: COLOR_GEN }}
          >
            Generator
          </text>
        </g>

        {/* Controller signal */}
        <g transform={`translate(0, ${y0Ctrl})`}>
          <rect x={0} y={0} width={PANEL_W} height={SUB_H} fill="#fdf8f0" rx={2} />
          {/* Zero line */}
          <line
            x1={0} y1={ctrlSy(0)}
            x2={PANEL_W} y2={ctrlSy(0)}
            stroke="#e0d8c8" strokeWidth={0.5}
          />
          <path d={ctrlPath} fill="none" stroke={COLOR_CTRL} strokeWidth={1.5} />
          <text
            x={4} y={12}
            style={{ fontFamily: FONT, fontSize: 8, fill: COLOR_CTRL }}
          >
            Controller
          </text>
        </g>

        {/* Rates */}
        <g transform={`translate(0, ${y0Rate})`}>
          <rect x={0} y={0} width={PANEL_W} height={SUB_H} fill="#f4f8f6" rx={2} />
          {rateNeurons.map((nIdx, ri) => {
            const path = data.rates
              .map((row, t) => `${t === 0 ? "M" : "L"}${timeSx(t)},${rateSy(row[nIdx])}`)
              .join(" ")
            return (
              <path
                key={nIdx}
                d={path}
                fill="none"
                stroke={rateColors[ri]}
                strokeWidth={1.2}
                opacity={0.8}
              />
            )
          })}
          <text
            x={4} y={12}
            style={{ fontFamily: FONT, fontSize: 8, fill: COLOR_RATE }}
          >
            Rates
          </text>
        </g>
      </g>
    )
  }

  const leftX = MARGIN.left
  const rightX = MARGIN.left + PANEL_W + 50

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
          Controller absorption: well-regularized vs under-regularized
        </text>

        {/* Left: well-regularized */}
        {renderPanel(
          penalty === 100 ? wellRegData : penalty === 0 ? underRegData : interpData,
          penalty >= 80 ? "Well-regularized" : penalty <= 20 ? "Under-regularized" : "Intermediate",
          leftX
        )}

        {/* Right: well-reg for reference */}
        {renderPanel(wellRegData, "Well-regularized (reference)", rightX)}

        {/* Separator */}
        <line
          x1={leftX + PANEL_W + 22} y1={MARGIN.top}
          x2={leftX + PANEL_W + 22} y2={H - MARGIN.bottom}
          stroke="#e0e0dc" strokeWidth={1}
        />

        {/* Annotations */}
        <text
          x={leftX + PANEL_W / 2} y={H - 8}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 8, fill: "#bbb" }}
        >
          {penalty >= 80
            ? "Generator drives dynamics, controller is sparse"
            : penalty <= 20
            ? "Controller absorbs dynamics, generator is flat"
            : "Transitioning between regimes"}
        </text>
      </svg>

      {/* Slider */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginTop: 6,
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Controller KL penalty:
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={penalty}
            onChange={e => setPenalty(Number(e.target.value))}
            style={{ width: 280 }}
          />
          <span style={{ minWidth: 80, fontSize: 10, color: "#999" }}>
            {penalty <= 20 ? "low (under-reg)" : penalty >= 80 ? "high (well-reg)" : "medium"}
          </span>
        </label>
      </div>
    </div>
  )
}
