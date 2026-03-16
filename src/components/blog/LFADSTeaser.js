import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { schemeTableau10 } from "d3-scale-chromatic"
import { generateReachingTask, inferSingleTrial, loadDemoModel } from "./lfads-math"
import modelJson from "./lfads-demo-model.json"

const W = 800
const H = 360
const MARGIN = { top: 30, right: 20, bottom: 30, left: 20 }
const PANEL_W = 230
const GAP = 25
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T = 100
const N_NEURONS = 20
const N_CONDITIONS = 8
const N_TRIALS = 3
const EXAMPLE_NEURONS = [0, 3, 7]

function panelX(idx) {
  return MARGIN.left + idx * (PANEL_W + GAP)
}

export default function LFADSTeaser() {
  const [seed, setSeed] = useState(1)

  const model = useMemo(() => loadDemoModel(modelJson.default), [])

  const taskData = useMemo(
    () => generateReachingTask(N_CONDITIONS, N_TRIALS, N_NEURONS, seed),
    [seed]
  )

  // Run inference on first trial of each condition
  const inferred = useMemo(() => {
    const results = []
    for (let c = 0; c < N_CONDITIONS; c++) {
      const trial = taskData.spikes[c][0]
      const result = inferSingleTrial(trial, model)
      results.push({ condition: c, trial: 0, ...result })
    }
    return results
  }, [taskData, model])

  // === Panel 1: Raster plot scales ===
  const rasterSx = useMemo(
    () => scaleLinear().domain([0, T - 1]).range([0, PANEL_W]),
    []
  )
  const rasterSy = useMemo(
    () => scaleLinear().domain([-0.5, N_NEURONS - 0.5]).range([0, PLOT_H]),
    []
  )

  // === Panel 2: Latent trajectory scales ===
  const { latSx, latSy } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (const inf of inferred) {
      for (let t = 0; t < T; t++) {
        const x = inf.states[t][0]
        const y = inf.states[t][1]
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    const padX = (maxX - minX) * 0.1 || 1
    const padY = (maxY - minY) * 0.1 || 1
    return {
      latSx: scaleLinear().domain([minX - padX, maxX + padX]).range([0, PANEL_W]),
      latSy: scaleLinear().domain([minY - padY, maxY + padY]).range([PLOT_H, 0]),
    }
  }, [inferred])

  // === Panel 3: Inferred rates scales ===
  const ratesSx = useMemo(
    () => scaleLinear().domain([0, T - 1]).range([0, PANEL_W]),
    []
  )

  const { ratesScales, spikeScales } = useMemo(() => {
    const rScales = []
    const sScales = []
    for (const nIdx of EXAMPLE_NEURONS) {
      let minR = Infinity, maxR = -Infinity
      let maxS = 0
      for (const inf of inferred) {
        for (let t = 0; t < T; t++) {
          const r = inf.rates[t][nIdx]
          if (r < minR) minR = r
          if (r > maxR) maxR = r
          const s = taskData.spikes[inf.condition][0][t][nIdx]
          if (s > maxS) maxS = s
        }
      }
      const padR = (maxR - minR) * 0.1 || 0.5
      rScales.push(scaleLinear().domain([minR - padR, maxR + padR]))
      sScales.push(scaleLinear().domain([0, maxS || 1]))
    }
    return { ratesScales: rScales, spikeScales: sScales }
  }, [inferred, taskData])

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  // Subdivide Panel 3 vertically for 3 neurons
  const neuronH = (PLOT_H - 20) / EXAMPLE_NEURONS.length

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Panel 1: Raster plot */}
        <g transform={`translate(${panelX(0)}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Spike rasters
          </text>

          {/* One trial per condition */}
          {inferred.map(inf => {
            const c = inf.condition
            const spikes = taskData.spikes[c][0]
            const color = schemeTableau10[c % 10]
            const ticks = []
            for (let t = 0; t < T; t++) {
              for (let n = 0; n < N_NEURONS; n++) {
                if (spikes[t][n] > 0) {
                  ticks.push(
                    <line
                      key={`${c}-${t}-${n}`}
                      x1={rasterSx(t)}
                      y1={rasterSy(n) - 2}
                      x2={rasterSx(t)}
                      y2={rasterSy(n) + 2}
                      stroke={color}
                      strokeWidth={0.8}
                      opacity={0.7}
                    />
                  )
                }
              }
            }
            return <g key={c}>{ticks}</g>
          })}

          {/* Y-axis label */}
          <text
            x={-6} y={PLOT_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -6, ${PLOT_H / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Neuron
          </text>
          <text
            x={PANEL_W / 2} y={PLOT_H + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>
        </g>

        {/* Panel 2: Latent trajectories */}
        <g transform={`translate(${panelX(1)}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Latent trajectories
          </text>

          {inferred.map(inf => {
            const color = schemeTableau10[inf.condition % 10]
            const path = inf.states
              .map((s, t) => `${t === 0 ? "M" : "L"}${latSx(s[0])},${latSy(s[1])}`)
              .join(" ")
            return (
              <g key={inf.condition}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.2}
                  opacity={0.8}
                />
                {/* Start marker */}
                <circle
                  cx={latSx(inf.states[0][0])}
                  cy={latSy(inf.states[0][1])}
                  r={2.5}
                  fill={color}
                  opacity={0.9}
                />
              </g>
            )
          })}

          <text
            x={PANEL_W / 2} y={PLOT_H + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Latent dim 1
          </text>
          <text
            x={-6} y={PLOT_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -6, ${PLOT_H / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Latent dim 2
          </text>
        </g>

        {/* Panel 3: Inferred rates */}
        <g transform={`translate(${panelX(2)}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Inferred rates
          </text>

          {EXAMPLE_NEURONS.map((nIdx, row) => {
            const yOff = row * neuronH + 8
            const sy = ratesScales[row]
              .range([neuronH - 6, 4])
            const spikeSy = spikeScales[row]
              .range([neuronH - 6, 4])

            return (
              <g key={nIdx} transform={`translate(0, ${yOff})`}>
                <text
                  x={-4} y={neuronH / 2 - 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "#bbb" }}
                >
                  {`n${nIdx + 1}`}
                </text>

                {/* Raw spike counts as thin gray lines */}
                {inferred.map(inf => {
                  const spikes = taskData.spikes[inf.condition][0]
                  const spikePath = []
                  for (let t = 0; t < T; t++) {
                    const v = spikes[t][nIdx]
                    spikePath.push(
                      `${t === 0 ? "M" : "L"}${ratesSx(t)},${spikeSy(v)}`
                    )
                  }
                  return (
                    <path
                      key={`spike-${inf.condition}`}
                      d={spikePath.join(" ")}
                      fill="none"
                      stroke="#ccc"
                      strokeWidth={0.5}
                      opacity={0.5}
                    />
                  )
                })}

                {/* Inferred smooth rates */}
                {inferred.map(inf => {
                  const color = schemeTableau10[inf.condition % 10]
                  const ratePath = []
                  for (let t = 0; t < T; t++) {
                    ratePath.push(
                      `${t === 0 ? "M" : "L"}${ratesSx(t)},${sy(inf.rates[t][nIdx])}`
                    )
                  }
                  return (
                    <path
                      key={`rate-${inf.condition}`}
                      d={ratePath.join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.2}
                      opacity={0.75}
                    />
                  )
                })}
              </g>
            )
          })}

          <text
            x={PANEL_W / 2} y={PLOT_H + 16}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>
        </g>

        {/* Regenerate button */}
        <g
          transform={`translate(${W - 140}, ${H - 32})`}
          style={{ cursor: "pointer" }}
          onClick={handleRegenerate}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") handleRegenerate()
          }}
        >
          <rect
            x={0} y={0} width={106} height={26} rx={4}
            fill="#f4f3f0" stroke="#ccc9c2" strokeWidth={1}
          />
          <text
            x={53} y={17}
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "#555",
              userSelect: "none",
            }}
          >
            Regenerate
          </text>
        </g>
      </svg>
    </div>
  )
}
