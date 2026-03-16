import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { generateFromIC, loadDemoModel, poissonSample } from "./lfads-math"
import { mulberry32 } from "./psid-math"
import modelJson from "./lfads-demo-model.json"
import { BTN_BASE, btnActive } from "./figureConstants"

const W = 800
const H = 350
const MARGIN = { top: 40, right: 15, bottom: 40, left: 15 }
const FONT = "var(--font-mono, monospace)"

const PANEL_W = 230
const GAP = 20
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T_STEPS = 60
const N_DISPLAY = 4
const DISPLAY_NEURONS = [0, 2, 5, 8]

const COLOR_LOG_RATE = "#4A7C6F"
const COLOR_RATE = "#2E5E52"
const COLOR_SPIKE = "#333"
const COLOR_GAUSS = "#4A90D9"

const ARROW_W = 25

function panelX(idx) {
  return MARGIN.left + idx * (PANEL_W + GAP + ARROW_W)
}

export default function PoissonObservationModel() {
  const [seed, setSeed] = useState(1)
  const [obsModel, setObsModel] = useState("poisson") // "poisson" | "gaussian"

  const model = useMemo(() => loadDemoModel(modelJson.default), [])

  // Run a short forward pass from a fixed IC
  const { logRates, rates } = useMemo(() => {
    const ic = [0.6, -0.3, 0.2]
    const result = generateFromIC(ic, model, T_STEPS)
    // Extract log-rates and rates for display neurons
    const lr = []
    const r = []
    for (let n = 0; n < N_DISPLAY; n++) {
      const nIdx = DISPLAY_NEURONS[n]
      const lrN = []
      const rN = []
      for (let t = 0; t < T_STEPS; t++) {
        const rate = result.rates[t][nIdx]
        rN.push(rate)
        lrN.push(Math.log(rate))
      }
      lr.push(lrN)
      r.push(rN)
    }
    return { logRates: lr, rates: r }
  }, [model])

  // Generate spikes or Gaussian observations from rates
  const observations = useMemo(() => {
    const rng = mulberry32(seed * 1000 + 7)
    const obs = []
    for (let n = 0; n < N_DISPLAY; n++) {
      const obsN = []
      for (let t = 0; t < T_STEPS; t++) {
        if (obsModel === "poisson") {
          obsN.push(poissonSample(rates[n][t], rng))
        } else {
          // Gaussian observation: rate + noise
          const u1 = rng() || 1e-15
          const u2 = rng()
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
          obsN.push(rates[n][t] + Math.sqrt(rates[n][t]) * 0.5 * z)
        }
      }
      obs.push(obsN)
    }
    return obs
  }, [rates, seed, obsModel])

  const handleResample = useCallback(() => setSeed(s => s + 1), [])

  // Scales for each panel
  const sx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, PANEL_W]),
    []
  )

  const subH = (PLOT_H - 10) / N_DISPLAY

  // Log-rate scale
  const logRateScales = useMemo(() => {
    return logRates.map(lr => {
      let min = Infinity, max = -Infinity
      for (const v of lr) {
        if (v < min) min = v
        if (v > max) max = v
      }
      const pad = (max - min) * 0.15 || 0.5
      return scaleLinear().domain([min - pad, max + pad]).range([subH - 4, 4])
    })
  }, [logRates, subH])

  // Rate scale
  const rateScales = useMemo(() => {
    return rates.map(r => {
      let min = 0, max = -Infinity
      for (const v of r) {
        if (v > max) max = v
      }
      const pad = max * 0.15 || 0.5
      return scaleLinear().domain([min, max + pad]).range([subH - 4, 4])
    })
  }, [rates, subH])

  // Obs scale
  const obsScales = useMemo(() => {
    return observations.map(obs => {
      let min = 0, max = -Infinity
      for (const v of obs) {
        if (v < min) min = v
        if (v > max) max = v
      }
      const pad = Math.max((max - min) * 0.15, 0.5)
      return scaleLinear().domain([min - (obsModel === "gaussian" ? pad : 0), max + pad]).range([subH - 4, 4])
    })
  }, [observations, subH, obsModel])

  // Path builder
  const buildPath = useCallback((data, scaleX, scaleY) => {
    return data.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(v)}`).join(" ")
  }, [])

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
          Observation model pipeline
        </text>

        {/* Panel 1: Log-rates */}
        <g transform={`translate(${panelX(0)}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-10}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 11, fill: "#666" }}
          >
            Log-rates
          </text>
          {logRates.map((lr, n) => {
            const yOff = n * subH
            return (
              <g key={`lr-${n}`} transform={`translate(0, ${yOff})`}>
                <path
                  d={buildPath(lr, sx, logRateScales[n])}
                  fill="none"
                  stroke={COLOR_LOG_RATE}
                  strokeWidth={1.5}
                  opacity={0.85}
                />
                <text
                  x={-4} y={subH / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{ fontFamily: FONT, fontSize: 7, fill: "#bbb" }}
                >
                  n{DISPLAY_NEURONS[n] + 1}
                </text>
              </g>
            )
          })}
          <text
            x={PANEL_W / 2} y={PLOT_H + 16}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>
        </g>

        {/* Arrow: exp(.) */}
        {(() => {
          const ax = panelX(0) + PANEL_W + 4
          const ay = MARGIN.top + PLOT_H / 2
          return (
            <g>
              <line
                x1={ax} y1={ay}
                x2={ax + ARROW_W - 6} y2={ay}
                stroke="#999" strokeWidth={1.5}
                markerEnd="url(#arrowhead)"
              />
              <polygon
                points={`${ax + ARROW_W},${ay} ${ax + ARROW_W - 6},${ay - 3} ${ax + ARROW_W - 6},${ay + 3}`}
                fill="#999"
              />
              <text
                x={ax + ARROW_W / 2} y={ay - 8}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 9, fill: "#666", fontWeight: 600 }}
              >
                exp(.)
              </text>
            </g>
          )
        })()}

        {/* Panel 2: Rates */}
        <g transform={`translate(${panelX(1)}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-10}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 11, fill: "#666" }}
          >
            Rates
          </text>
          {rates.map((r, n) => {
            const yOff = n * subH
            return (
              <g key={`r-${n}`} transform={`translate(0, ${yOff})`}>
                <path
                  d={buildPath(r, sx, rateScales[n])}
                  fill="none"
                  stroke={COLOR_RATE}
                  strokeWidth={1.5}
                  opacity={0.85}
                />
              </g>
            )
          })}
          <text
            x={PANEL_W / 2} y={PLOT_H + 16}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>
        </g>

        {/* Arrow: Poisson(.) or Gaussian(.) */}
        {(() => {
          const ax = panelX(1) + PANEL_W + 4
          const ay = MARGIN.top + PLOT_H / 2
          const label = obsModel === "poisson" ? "Poisson(.)" : "N(., σ²)"
          return (
            <g>
              <line
                x1={ax} y1={ay}
                x2={ax + ARROW_W - 6} y2={ay}
                stroke="#999" strokeWidth={1.5}
              />
              <polygon
                points={`${ax + ARROW_W},${ay} ${ax + ARROW_W - 6},${ay - 3} ${ax + ARROW_W - 6},${ay + 3}`}
                fill="#999"
              />
              <text
                x={ax + ARROW_W / 2} y={ay - 8}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 9, fill: "#666", fontWeight: 600 }}
              >
                {label}
              </text>
            </g>
          )
        })()}

        {/* Panel 3: Observations (Spikes or Gaussian) */}
        <g transform={`translate(${panelX(2)}, ${MARGIN.top})`}>
          <text
            x={PANEL_W / 2} y={-10}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 11, fill: "#666" }}
          >
            {obsModel === "poisson" ? "Spikes" : "Noisy observations"}
          </text>
          {observations.map((obs, n) => {
            const yOff = n * subH
            if (obsModel === "poisson") {
              // Raster-style tick marks
              const ticks = []
              for (let t = 0; t < T_STEPS; t++) {
                if (obs[t] > 0) {
                  const tickH = Math.min(obs[t], 4) * 2.5
                  ticks.push(
                    <line
                      key={t}
                      x1={sx(t)} y1={subH / 2 - tickH / 2}
                      x2={sx(t)} y2={subH / 2 + tickH / 2}
                      stroke={COLOR_SPIKE}
                      strokeWidth={1.2}
                      opacity={0.7}
                    />
                  )
                }
              }
              return (
                <g key={`obs-${n}`} transform={`translate(0, ${yOff})`}>
                  {ticks}
                  {/* Baseline */}
                  <line
                    x1={0} y1={subH / 2}
                    x2={PANEL_W} y2={subH / 2}
                    stroke="#eee" strokeWidth={0.5}
                  />
                </g>
              )
            } else {
              // Gaussian: continuous noisy observation line
              return (
                <g key={`obs-${n}`} transform={`translate(0, ${yOff})`}>
                  <path
                    d={buildPath(obs, sx, obsScales[n])}
                    fill="none"
                    stroke={COLOR_GAUSS}
                    strokeWidth={1}
                    opacity={0.7}
                  />
                  {/* True rate overlay */}
                  <path
                    d={buildPath(rates[n], sx, obsScales[n])}
                    fill="none"
                    stroke={COLOR_RATE}
                    strokeWidth={1}
                    strokeDasharray="3 2"
                    opacity={0.4}
                  />
                </g>
              )
            }
          })}
          <text
            x={PANEL_W / 2} y={PLOT_H + 16}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>
        </g>
      </svg>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 6,
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
        }}
      >
        <button
          onClick={handleResample}
          style={{ ...BTN_BASE, fontSize: 11 }}
        >
          Resample
        </button>
        <button
          onClick={() => setObsModel("poisson")}
          style={{
            ...BTN_BASE,
            fontSize: 11,
            ...(obsModel === "poisson" ? btnActive(COLOR_RATE) : {}),
          }}
        >
          Poisson
        </button>
        <button
          onClick={() => setObsModel("gaussian")}
          style={{
            ...BTN_BASE,
            fontSize: 11,
            ...(obsModel === "gaussian" ? btnActive(COLOR_GAUSS) : {}),
          }}
        >
          Gaussian
        </button>
      </div>
    </div>
  )
}
