import React, { useState, useMemo, useEffect, useRef } from "react"
import { scaleLinear } from "d3-scale"
import { loadDemoModel } from "./lfads-math"
import modelJson from "./lfads-demo-model.json"
import { BTN_BASE, btnActive } from "./figureConstants"

const W = 800
const H = 450
const MARGIN = { top: 40, right: 20, bottom: 40, left: 50 }
const FONT = "var(--font-mono, monospace)"

const LEFT_W = 300
const MID_W = 250
const RIGHT_W = 200
const GAP = 20

const COLOR_ELBO = "#4A90D9"
const COLOR_RECON = "#4A7C6F"
const COLOR_KL = "#8B4A3A"
const KL_WARMUP_END = 25

export default function TrainingDynamicsExplorer() {
  const [snapIdx, setSnapIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef(null)

  const model = useMemo(() => loadDemoModel(modelJson.default), [])
  const snapshots = model.epochSnapshots

  // Build loss curves by interpolating between snapshot values
  const lossCurves = useMemo(() => {
    const epochs = snapshots.map(s => s.epoch)
    const elbos = snapshots.map(s => s.elbo)
    const recons = snapshots.map(s => s.recon)
    const kls = snapshots.map(s => s.kl)

    // Interpolate for smooth line from epoch 0 to 100
    const nPts = 101
    const elboLine = []
    const reconLine = []
    const klLine = []

    for (let e = 0; e < nPts; e++) {
      // Find which segment we're in
      let segIdx = 0
      for (let i = 0; i < epochs.length - 1; i++) {
        if (e >= epochs[i]) segIdx = i
      }
      const e0 = epochs[segIdx]
      const e1 = epochs[Math.min(segIdx + 1, epochs.length - 1)]
      const frac = e1 > e0 ? (e - e0) / (e1 - e0) : 0

      elboLine.push(elbos[segIdx] + frac * (elbos[Math.min(segIdx + 1, epochs.length - 1)] - elbos[segIdx]))
      reconLine.push(recons[segIdx] + frac * (recons[Math.min(segIdx + 1, epochs.length - 1)] - recons[segIdx]))
      klLine.push(kls[segIdx] + frac * (kls[Math.min(segIdx + 1, epochs.length - 1)] - kls[segIdx]))
    }

    return { elboLine, reconLine, klLine }
  }, [snapshots])

  const currentEpoch = snapshots[snapIdx].epoch

  // Auto-advance logic
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setSnapIdx(prev => {
          if (prev >= snapshots.length - 1) {
            setPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1200)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [playing, snapshots.length])

  // === Left panel: Loss curves ===
  const leftPlotW = LEFT_W - MARGIN.left - 10
  const leftPlotH = H - MARGIN.top - MARGIN.bottom

  const { lossSx, lossSy } = useMemo(() => {
    const { elboLine, reconLine, klLine } = lossCurves
    let minV = Infinity, maxV = -Infinity
    for (let i = 0; i < elboLine.length; i++) {
      for (const v of [elboLine[i], reconLine[i], klLine[i]]) {
        if (v < minV) minV = v
        if (v > maxV) maxV = v
      }
    }
    const pad = (maxV - minV) * 0.1 || 10
    return {
      lossSx: scaleLinear().domain([0, 100]).range([0, leftPlotW]),
      lossSy: scaleLinear().domain([minV - pad, maxV + pad]).range([leftPlotH, 0]),
    }
  }, [lossCurves, leftPlotW, leftPlotH])

  const buildLinePath = (data, sx, sy) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i)},${sy(v)}`).join(" ")

  // === Middle panel: Latent trajectories (2D) ===
  const midX0 = LEFT_W + GAP
  const midPlotW = MID_W - 20
  const midPlotH = H - MARGIN.top - MARGIN.bottom

  // sampleLatents: [trial][time][dim] — 2 trials, 100 timesteps, 3 dims
  // We plot dims 0 and 1
  const latentData = snapshots[snapIdx].sampleLatents

  const { latSx, latSy } = useMemo(() => {
    // Compute extent across all snapshots for consistent scaling
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (const snap of snapshots) {
      for (const trial of snap.sampleLatents) {
        for (const pt of trial) {
          if (pt[0] < minX) minX = pt[0]
          if (pt[0] > maxX) maxX = pt[0]
          if (pt[1] < minY) minY = pt[1]
          if (pt[1] > maxY) maxY = pt[1]
        }
      }
    }
    const padX = (maxX - minX) * 0.15 || 1
    const padY = (maxY - minY) * 0.15 || 1
    return {
      latSx: scaleLinear().domain([minX - padX, maxX + padX]).range([0, midPlotW]),
      latSy: scaleLinear().domain([minY - padY, maxY + padY]).range([midPlotH, 0]),
    }
  }, [snapshots, midPlotW, midPlotH])

  // === Right panel: Reconstructed rates (3 neurons) ===
  const rightX0 = LEFT_W + MID_W + GAP * 2
  const rightPlotW = RIGHT_W - 10
  const rightPlotH = H - MARGIN.top - MARGIN.bottom
  const RATE_NEURONS = [0, 1, 2]
  const RATE_COLORS = ["#4A7C6F", "#D4783C", "#4A90D9"]

  // sampleRates: [trial][time] -> each time is array of nNeurons rates
  const ratesData = snapshots[snapIdx].sampleRates

  const { rateSx, rateSy } = useMemo(() => {
    // Extent across all snapshots
    let maxR = 0
    for (const snap of snapshots) {
      for (const trial of snap.sampleRates) {
        for (const rates of trial) {
          for (const nIdx of RATE_NEURONS) {
            if (rates[nIdx] > maxR) maxR = rates[nIdx]
          }
        }
      }
    }
    const T = ratesData[0].length
    return {
      rateSx: scaleLinear().domain([0, T - 1]).range([0, rightPlotW]),
      rateSy: scaleLinear().domain([0, maxR * 1.15 || 5]).range([rightPlotH, 0]),
    }
  }, [snapshots, ratesData, rightPlotW, rightPlotH])

  const TRIAL_COLORS = ["#4A90D9", "#c0503a"]

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
          Training dynamics — epoch {currentEpoch}
        </text>

        {/* === Left panel: Loss curves === */}
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          <text
            x={leftPlotW / 2} y={-10}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#888" }}
          >
            Loss curves
          </text>

          {/* KL warmup shading */}
          <rect
            x={lossSx(0)}
            y={0}
            width={lossSx(KL_WARMUP_END) - lossSx(0)}
            height={leftPlotH}
            fill={COLOR_KL}
            opacity={0.06}
          />
          <text
            x={lossSx(KL_WARMUP_END / 2)}
            y={leftPlotH - 6}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 7, fill: COLOR_KL, opacity: 0.6 }}
          >
            KL warmup
          </text>

          {/* Axes */}
          <line x1={0} y1={leftPlotH} x2={leftPlotW} y2={leftPlotH} stroke="#ddd" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={leftPlotH} stroke="#ddd" strokeWidth={1} />
          <text
            x={leftPlotW / 2} y={leftPlotH + 28}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            Epoch
          </text>

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map(e => (
            <g key={e}>
              <line x1={lossSx(e)} y1={leftPlotH} x2={lossSx(e)} y2={leftPlotH + 4} stroke="#ccc" strokeWidth={1} />
              <text
                x={lossSx(e)} y={leftPlotH + 14}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 7, fill: "#bbb" }}
              >
                {e}
              </text>
            </g>
          ))}

          {/* ELBO line (blue solid) */}
          <path
            d={buildLinePath(lossCurves.elboLine, lossSx, lossSy)}
            fill="none"
            stroke={COLOR_ELBO}
            strokeWidth={1.8}
          />

          {/* Reconstruction line (teal dashed) */}
          <path
            d={buildLinePath(lossCurves.reconLine, lossSx, lossSy)}
            fill="none"
            stroke={COLOR_RECON}
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />

          {/* KL line (red-brown dotted) */}
          <path
            d={buildLinePath(lossCurves.klLine, lossSx, lossSy)}
            fill="none"
            stroke={COLOR_KL}
            strokeWidth={1.5}
            strokeDasharray="2 3"
          />

          {/* Vertical epoch marker */}
          <line
            x1={lossSx(currentEpoch)} y1={0}
            x2={lossSx(currentEpoch)} y2={leftPlotH}
            stroke="#333"
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.5}
          />
          <circle
            cx={lossSx(currentEpoch)}
            cy={lossSy(lossCurves.elboLine[currentEpoch])}
            r={3} fill={COLOR_ELBO}
          />
          <circle
            cx={lossSx(currentEpoch)}
            cy={lossSy(lossCurves.reconLine[currentEpoch])}
            r={3} fill={COLOR_RECON}
          />
          <circle
            cx={lossSx(currentEpoch)}
            cy={lossSy(lossCurves.klLine[currentEpoch])}
            r={3} fill={COLOR_KL}
          />

          {/* Legend */}
          <g transform="translate(4, 4)">
            <line x1={0} y1={0} x2={16} y2={0} stroke={COLOR_ELBO} strokeWidth={1.8} />
            <text x={20} y={3} style={{ fontFamily: FONT, fontSize: 8, fill: "#666" }}>
              ELBO
            </text>
            <line x1={0} y1={14} x2={16} y2={14} stroke={COLOR_RECON} strokeWidth={1.5} strokeDasharray="6 3" />
            <text x={20} y={17} style={{ fontFamily: FONT, fontSize: 8, fill: "#666" }}>
              Recon
            </text>
            <line x1={0} y1={28} x2={16} y2={28} stroke={COLOR_KL} strokeWidth={1.5} strokeDasharray="2 3" />
            <text x={20} y={31} style={{ fontFamily: FONT, fontSize: 8, fill: "#666" }}>
              KL
            </text>
          </g>
        </g>

        {/* === Middle panel: Latent trajectories (2D) === */}
        <g transform={`translate(${midX0}, ${MARGIN.top})`}>
          <text
            x={midPlotW / 2} y={-10}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#888" }}
          >
            Latent trajectories
          </text>

          <line x1={0} y1={midPlotH} x2={midPlotW} y2={midPlotH} stroke="#ddd" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={midPlotH} stroke="#ddd" strokeWidth={1} />
          <text
            x={midPlotW / 2} y={midPlotH + 28}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            Dim 1
          </text>
          <text
            x={-10} y={midPlotH / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -10, ${midPlotH / 2})`}
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            Dim 2
          </text>

          {latentData.map((trial, trIdx) => {
            const path = trial
              .map((pt, t) => `${t === 0 ? "M" : "L"}${latSx(pt[0])},${latSy(pt[1])}`)
              .join(" ")
            return (
              <path
                key={trIdx}
                d={path}
                fill="none"
                stroke={TRIAL_COLORS[trIdx % TRIAL_COLORS.length]}
                strokeWidth={1.5}
                opacity={0.8}
              />
            )
          })}

          {/* Start markers */}
          {latentData.map((trial, trIdx) => (
            <circle
              key={trIdx}
              cx={latSx(trial[0][0])}
              cy={latSy(trial[0][1])}
              r={3}
              fill={TRIAL_COLORS[trIdx % TRIAL_COLORS.length]}
            />
          ))}

          {/* Epoch quality label */}
          <text
            x={midPlotW / 2} y={midPlotH - 8}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 8, fill: "#bbb" }}
          >
            {currentEpoch <= 0 ? "messy / untrained" : currentEpoch < 50 ? "partially trained" : "clean trajectories"}
          </text>
        </g>

        {/* === Right panel: Reconstructed rates (3 neurons) === */}
        <g transform={`translate(${rightX0}, ${MARGIN.top})`}>
          <text
            x={rightPlotW / 2} y={-10}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#888" }}
          >
            Reconstructed rates
          </text>

          <line x1={0} y1={rightPlotH} x2={rightPlotW} y2={rightPlotH} stroke="#ddd" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={rightPlotH} stroke="#ddd" strokeWidth={1} />
          <text
            x={rightPlotW / 2} y={rightPlotH + 28}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            Time
          </text>

          {/* Show first trial's rates for 3 neurons */}
          {RATE_NEURONS.map((nIdx, row) => {
            const trial = ratesData[0]
            const path = trial
              .map((rates, t) => `${t === 0 ? "M" : "L"}${rateSx(t)},${rateSy(rates[nIdx])}`)
              .join(" ")
            return (
              <path
                key={nIdx}
                d={path}
                fill="none"
                stroke={RATE_COLORS[row]}
                strokeWidth={1.5}
                opacity={0.85}
              />
            )
          })}

          {/* Legend */}
          <g transform={`translate(${rightPlotW - 80}, 4)`}>
            {RATE_NEURONS.map((nIdx, i) => (
              <g key={nIdx} transform={`translate(0, ${i * 12})`}>
                <line x1={0} y1={0} x2={12} y2={0} stroke={RATE_COLORS[i]} strokeWidth={1.5} />
                <text
                  x={16} y={3}
                  style={{ fontFamily: FONT, fontSize: 7, fill: "#888" }}
                >
                  N{nIdx + 1}
                </text>
              </g>
            ))}
          </g>

          {/* Quality label */}
          <text
            x={rightPlotW / 2} y={rightPlotH - 8}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 8, fill: "#bbb" }}
          >
            {currentEpoch <= 0 ? "flat / uniform" : currentEpoch < 50 ? "emerging structure" : "sharp modulation"}
          </text>
        </g>
      </svg>

      {/* Controls */}
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
        <button
          style={{
            ...BTN_BASE,
            ...(playing ? btnActive("#4A90D9") : {}),
            minWidth: 60,
          }}
          onClick={() => {
            if (playing) {
              setPlaying(false)
            } else {
              if (snapIdx >= snapshots.length - 1) setSnapIdx(0)
              setPlaying(true)
            }
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Epoch: {currentEpoch}
          <input
            type="range"
            min={0}
            max={snapshots.length - 1}
            step={1}
            value={snapIdx}
            onChange={e => {
              setSnapIdx(Number(e.target.value))
              setPlaying(false)
            }}
            style={{ width: 260 }}
          />
        </label>

        <span style={{ fontSize: 10, color: "#aaa" }}>
          ELBO: {snapshots[snapIdx].elbo.toFixed(1)} | Recon: {snapshots[snapIdx].recon.toFixed(1)} | KL: {snapshots[snapIdx].kl.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
