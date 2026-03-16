import React, { useState, useMemo } from "react"
import { scaleLinear } from "d3-scale"
import { schemeTableau10 } from "d3-scale-chromatic"
import { generateReachingTask, inferSingleTrial, loadDemoModel } from "./lfads-math"
import { standardSubspaceID } from "./psid-math"
import modelJson from "./lfads-demo-model.json"
import { BTN_BASE, btnActive } from "./figureConstants"

const W = 800
const H = 400
const MARGIN = { top: 50, right: 20, bottom: 30, left: 40 }
const FONT = "var(--font-mono, monospace)"

const N_CONDITIONS = 8
const N_TRIALS_PER = 3
const N_NEURONS = 20
const PANEL_W = (W - MARGIN.left - MARGIN.right - 40) / 2
const PANEL_H = H - MARGIN.top - MARGIN.bottom

const MODES = ["raw", "psid", "lfads"]
const MODE_LABELS = {
  raw: "Raw spikes",
  psid: "PSID (trial-averaged)",
  lfads: "LFADS (single-trial)",
}

export default function LFADSvsPSIDComparison() {
  const [mode, setMode] = useState("lfads")

  const model = useMemo(() => loadDemoModel(modelJson.default), [])
  const taskData = useMemo(
    () => generateReachingTask(N_CONDITIONS, N_TRIALS_PER, N_NEURONS, 42),
    []
  )

  // === PSID: trial-averaged latents via standardSubspaceID ===
  const psidLatents = useMemo(() => {
    const T = 100
    // Trial-average spikes per condition
    const condAvgs = []
    for (let c = 0; c < N_CONDITIONS; c++) {
      const avg = []
      for (let t = 0; t < T; t++) {
        const row = new Array(N_NEURONS).fill(0)
        for (let tr = 0; tr < N_TRIALS_PER; tr++) {
          for (let n = 0; n < N_NEURONS; n++) {
            row[n] += taskData.spikes[c][tr][t][n]
          }
        }
        for (let n = 0; n < N_NEURONS; n++) row[n] /= N_TRIALS_PER
        avg.push(row)
      }
      condAvgs.push(avg)
    }

    // Stack all condition averages into one big matrix for subspace ID
    const allRows = []
    for (let c = 0; c < N_CONDITIONS; c++) {
      for (let t = 0; t < T; t++) {
        allRows.push(condAvgs[c][t])
      }
    }

    const result = standardSubspaceID(allRows, 2, 5)
    // Split Xhat back into per-condition trajectories
    const trajectories = []
    for (let c = 0; c < N_CONDITIONS; c++) {
      const traj = []
      for (let t = 0; t < T; t++) {
        traj.push([result.Xhat[c * T + t][0], result.Xhat[c * T + t][1]])
      }
      trajectories.push(traj)
    }
    return trajectories
  }, [taskData])

  // === LFADS: single-trial latents ===
  const lfadsLatents = useMemo(() => {
    // Run inference on N_TRIALS_PER trials per condition
    const results = []
    for (let c = 0; c < N_CONDITIONS; c++) {
      const condResults = []
      for (let tr = 0; tr < N_TRIALS_PER; tr++) {
        const inf = inferSingleTrial(taskData.spikes[c][tr], model)
        // Use first 2 dims of states as latent trajectory
        const traj = inf.states.map(s => [s[0], s[1]])
        condResults.push(traj)
      }
      results.push(condResults)
    }
    return results
  }, [taskData, model])

  // === Compute scales across both PSID and LFADS ===
  const { leftSx, leftSy, rightSx, rightSy } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    // PSID extent
    for (const traj of psidLatents) {
      for (const [x, y] of traj) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    const padXp = (maxX - minX) * 0.1 || 1
    const padYp = (maxY - minY) * 0.1 || 1
    const lsx = scaleLinear().domain([minX - padXp, maxX + padXp]).range([0, PANEL_W])
    const lsy = scaleLinear().domain([minY - padYp, maxY + padYp]).range([PANEL_H, 0])

    // LFADS extent
    let minX2 = Infinity, maxX2 = -Infinity
    let minY2 = Infinity, maxY2 = -Infinity
    for (const condTrials of lfadsLatents) {
      for (const traj of condTrials) {
        for (const [x, y] of traj) {
          if (x < minX2) minX2 = x
          if (x > maxX2) maxX2 = x
          if (y < minY2) minY2 = y
          if (y > maxY2) maxY2 = y
        }
      }
    }
    const padXl = (maxX2 - minX2) * 0.1 || 1
    const padYl = (maxY2 - minY2) * 0.1 || 1
    const rsx = scaleLinear().domain([minX2 - padXl, maxX2 + padXl]).range([0, PANEL_W])
    const rsy = scaleLinear().domain([minY2 - padYl, maxY2 + padYl]).range([PANEL_H, 0])

    return { leftSx: lsx, leftSy: lsy, rightSx: rsx, rightSy: rsy }
  }, [psidLatents, lfadsLatents])

  // === Raw raster helper ===
  const rasterSx = useMemo(
    () => scaleLinear().domain([0, 99]).range([0, PANEL_W]),
    []
  )
  const rasterSy = useMemo(
    () => scaleLinear().domain([-0.5, N_NEURONS - 0.5]).range([0, PANEL_H]),
    []
  )

  const leftX = MARGIN.left
  const rightX = MARGIN.left + PANEL_W + 40
  const leftHighlight = mode === "psid"
  const rightHighlight = mode === "lfads"

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Toggle buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        {MODES.map(m => (
          <button
            key={m}
            style={{
              ...BTN_BASE,
              ...(mode === m ? btnActive(m === "raw" ? "#777" : m === "psid" ? "#4A90D9" : "#4A7C6F") : {}),
            }}
            onClick={() => setMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

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
          Trial-averaged vs single-trial latent inference
        </text>

        {/* === Left panel: PSID / trial-averaged === */}
        <g transform={`translate(${leftX}, ${MARGIN.top})`}>
          {/* Panel border highlight */}
          <rect
            x={-6} y={-6}
            width={PANEL_W + 12} height={PANEL_H + 12}
            fill="none"
            stroke={leftHighlight ? "#4A90D9" : "transparent"}
            strokeWidth={2}
            rx={4}
          />

          <text
            x={PANEL_W / 2} y={-14}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: leftHighlight ? "#4A90D9" : "#888" }}
          >
            {mode === "raw" ? "Raw spikes (condition 1)" : "PSID: 1 trajectory per condition"}
          </text>

          <line x1={0} y1={PANEL_H} x2={PANEL_W} y2={PANEL_H} stroke="#ddd" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={PANEL_H} stroke="#ddd" strokeWidth={1} />

          {mode === "raw" ? (
            // Raster for condition 0, trial 0
            <>
              {(() => {
                const spikes = taskData.spikes[0][0]
                const ticks = []
                for (let t = 0; t < 100; t++) {
                  for (let n = 0; n < N_NEURONS; n++) {
                    if (spikes[t][n] > 0) {
                      ticks.push(
                        <line
                          key={`${t}-${n}`}
                          x1={rasterSx(t)} y1={rasterSy(n) - 2}
                          x2={rasterSx(t)} y2={rasterSy(n) + 2}
                          stroke="#4A7C6F"
                          strokeWidth={0.8}
                          opacity={0.5}
                        />
                      )
                    }
                  }
                }
                return ticks
              })()}
              <text
                x={PANEL_W / 2} y={PANEL_H + 18}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
              >
                Time
              </text>
            </>
          ) : (
            // PSID latent trajectories
            <>
              {psidLatents.map((traj, c) => {
                const color = schemeTableau10[c % 10]
                const path = traj
                  .map((pt, t) => `${t === 0 ? "M" : "L"}${leftSx(pt[0])},${leftSy(pt[1])}`)
                  .join(" ")
                return (
                  <path
                    key={c}
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.8}
                    opacity={mode === "lfads" ? 0.3 : 0.8}
                  />
                )
              })}
              <text
                x={PANEL_W / 2} y={PANEL_H + 18}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
              >
                Dim 1
              </text>
            </>
          )}
        </g>

        {/* === Right panel: LFADS / single-trial === */}
        <g transform={`translate(${rightX}, ${MARGIN.top})`}>
          <rect
            x={-6} y={-6}
            width={PANEL_W + 12} height={PANEL_H + 12}
            fill="none"
            stroke={rightHighlight ? "#4A7C6F" : "transparent"}
            strokeWidth={2}
            rx={4}
          />

          <text
            x={PANEL_W / 2} y={-14}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: rightHighlight ? "#4A7C6F" : "#888" }}
          >
            {mode === "raw" ? "Raw spikes (3 trials overlaid)" : "LFADS: 1 trajectory per trial"}
          </text>

          <line x1={0} y1={PANEL_H} x2={PANEL_W} y2={PANEL_H} stroke="#ddd" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={PANEL_H} stroke="#ddd" strokeWidth={1} />

          {mode === "raw" ? (
            // Rasters for 3 trials of condition 0
            <>
              {[0, 1, 2].map(tr => {
                const spikes = taskData.spikes[0][tr]
                const ticks = []
                const opacities = [0.5, 0.35, 0.2]
                for (let t = 0; t < 100; t++) {
                  for (let n = 0; n < N_NEURONS; n++) {
                    if (spikes[t][n] > 0) {
                      ticks.push(
                        <line
                          key={`${tr}-${t}-${n}`}
                          x1={rasterSx(t)} y1={rasterSy(n) - 2}
                          x2={rasterSx(t)} y2={rasterSy(n) + 2}
                          stroke={schemeTableau10[tr % 10]}
                          strokeWidth={0.6}
                          opacity={opacities[tr]}
                        />
                      )
                    }
                  }
                }
                return <g key={tr}>{ticks}</g>
              })}
              <text
                x={PANEL_W / 2} y={PANEL_H + 18}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
              >
                Time
              </text>
            </>
          ) : (
            // LFADS single-trial latent trajectories
            <>
              {lfadsLatents.map((condTrials, c) => {
                const color = schemeTableau10[c % 10]
                return condTrials.map((traj, tr) => {
                  const path = traj
                    .map((pt, t) => `${t === 0 ? "M" : "L"}${rightSx(pt[0])},${rightSy(pt[1])}`)
                    .join(" ")
                  return (
                    <path
                      key={`${c}-${tr}`}
                      d={path}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.2}
                      opacity={mode === "psid" ? 0.3 : 0.7}
                    />
                  )
                })
              })}
              <text
                x={PANEL_W / 2} y={PANEL_H + 18}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
              >
                Dim 1
              </text>
            </>
          )}
        </g>
      </svg>
    </div>
  )
}
