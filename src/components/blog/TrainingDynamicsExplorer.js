import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import gsap from "gsap"
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

/* ── Helper: interpolate path between two point arrays ── */
function buildMorphedPath(fromPts, toPts, t, sx, sy) {
  const parts = []
  const len = Math.min(fromPts.length, toPts.length)
  for (let i = 0; i < len; i++) {
    const x = sx(fromPts[i][0] * (1 - t) + toPts[i][0] * t)
    const y = sy(fromPts[i][1] * (1 - t) + toPts[i][1] * t)
    parts.push(`${i === 0 ? "M" : "L"}${x},${y}`)
  }
  return parts.join(" ")
}

/* ── Helper: build a single neuron's rate path ── */
function buildRatePath(rateMatrix, neuronIdx, sx, sy) {
  const parts = []
  for (let t = 0; t < rateMatrix.length; t++) {
    const x = sx(t)
    const y = sy(rateMatrix[t][neuronIdx])
    parts.push(`${t === 0 ? "M" : "L"}${x},${y}`)
  }
  return parts.join(" ")
}

export default function TrainingDynamicsExplorer() {
  const [snapIdx, setSnapIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef(null)

  // GSAP refs
  const epochMarkerRef = useRef(null)
  const warmupRectRef = useRef(null)
  const playTlRef = useRef(null)
  const snapIdxRef = useRef(0)
  const svgRef = useRef(null)

  // Loss curve refs
  const elboPathRef = useRef(null)
  const reconPathRef = useRef(null)
  const klPathRef = useRef(null)
  const elboDotRef = useRef(null)
  const reconDotRef = useRef(null)
  const klDotRef = useRef(null)

  // Keep snapIdxRef in sync
  useEffect(() => {
    snapIdxRef.current = snapIdx
  }, [snapIdx])

  const model = useMemo(() => loadDemoModel(modelJson.default), [])
  const snapshots = model.epochSnapshots

  // Build loss curves by interpolating between snapshot values
  const lossCurves = useMemo(() => {
    const epochs = snapshots.map(s => s.epoch)
    const elbos = snapshots.map(s => s.elbo)
    const recons = snapshots.map(s => s.recon)
    const kls = snapshots.map(s => s.kl)

    const nPts = 101
    const elboLine = []
    const reconLine = []
    const klLine = []

    for (let e = 0; e < nPts; e++) {
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

  const latentData = snapshots[snapIdx].sampleLatents

  const { latSx, latSy } = useMemo(() => {
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

  const ratesData = snapshots[snapIdx].sampleRates

  const { rateSx, rateSy } = useMemo(() => {
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
    const T = snapshots[0].sampleRates[0].length
    return {
      rateSx: scaleLinear().domain([0, T - 1]).range([0, rightPlotW]),
      rateSy: scaleLinear().domain([0, maxR * 1.15 || 5]).range([rightPlotH, 0]),
    }
  }, [snapshots, rightPlotW, rightPlotH])

  const TRIAL_COLORS = ["#4A90D9", "#c0503a"]

  // === Loss curve dash setup: compute total path lengths on mount ===
  const lossPathLengthsRef = useRef({ elbo: 0, recon: 0, kl: 0 })

  useEffect(() => {
    // Once SVG is mounted, measure path lengths and set initial dashoffset
    const elboEl = elboPathRef.current
    const reconEl = reconPathRef.current
    const klEl = klPathRef.current
    if (!elboEl || !reconEl || !klEl) return

    const elboLen = elboEl.getTotalLength()
    const reconLen = reconEl.getTotalLength()
    const klLen = klEl.getTotalLength()
    lossPathLengthsRef.current = { elbo: elboLen, recon: reconLen, kl: klLen }

    // Fraction of the curve to reveal based on current epoch
    const frac = currentEpoch / 100
    gsap.set(elboEl, {
      attr: { strokeDasharray: elboLen, strokeDashoffset: elboLen * (1 - frac) },
    })
    gsap.set(reconEl, {
      attr: { strokeDasharray: reconLen, strokeDashoffset: reconLen * (1 - frac) },
    })
    gsap.set(klEl, {
      attr: { strokeDasharray: klLen, strokeDashoffset: klLen * (1 - frac) },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // === Animate to a specific snapshot index (slider drag) ===
  const animateToSnap = useCallback(
    (toIdx) => {
      const svg = svgRef.current
      if (!svg) return

      const fromIdx = snapIdxRef.current
      const toSnap = snapshots[toIdx]
      const fromSnap = snapshots[fromIdx]
      const toEpoch = toSnap.epoch
      const fromEpoch = fromSnap.epoch

      // Trajectory morph
      const trajEls = svg.querySelectorAll(".td-traj")
      const rateEls = svg.querySelectorAll(".td-rate")

      const proxy = { t: 0 }
      gsap.to(proxy, {
        t: 1,
        duration: 0.3,
        ease: "power2.out",
        onUpdate() {
          const t = proxy.t
          const interpEpoch = fromEpoch + (toEpoch - fromEpoch) * t

          // Morph latent trajectories
          trajEls.forEach(el => {
            const trIdx = Number(el.dataset.trial)
            const fromPts = fromSnap.sampleLatents[trIdx]
            const toPts = toSnap.sampleLatents[trIdx]
            el.setAttribute("d", buildMorphedPath(fromPts, toPts, t, latSx, latSy))
          })

          // Morph start markers
          const startMarkers = svg.querySelectorAll(".td-traj-start")
          startMarkers.forEach(el => {
            const trIdx = Number(el.dataset.trial)
            const fromPt = fromSnap.sampleLatents[trIdx][0]
            const toPt = toSnap.sampleLatents[trIdx][0]
            el.setAttribute("cx", latSx(fromPt[0] * (1 - t) + toPt[0] * t))
            el.setAttribute("cy", latSy(fromPt[1] * (1 - t) + toPt[1] * t))
          })

          // Crossfade rate curves
          rateEls.forEach(el => {
            const nIdx = Number(el.dataset.neuron)
            const fromRates = fromSnap.sampleRates[0]
            const toRates = toSnap.sampleRates[0]
            // Morph by interpolating the underlying data
            const parts = []
            const len = Math.min(fromRates.length, toRates.length)
            for (let i = 0; i < len; i++) {
              const val = fromRates[i][nIdx] * (1 - t) + toRates[i][nIdx] * t
              parts.push(`${i === 0 ? "M" : "L"}${rateSx(i)},${rateSy(val)}`)
            }
            el.setAttribute("d", parts.join(" "))
          })

          // Epoch marker
          if (epochMarkerRef.current) {
            epochMarkerRef.current.setAttribute("x1", lossSx(interpEpoch))
            epochMarkerRef.current.setAttribute("x2", lossSx(interpEpoch))
          }

          // Loss dots
          const roundedEpoch = Math.round(interpEpoch)
          const clampedEpoch = Math.max(0, Math.min(100, roundedEpoch))
          if (elboDotRef.current) {
            elboDotRef.current.setAttribute("cx", lossSx(interpEpoch))
            elboDotRef.current.setAttribute("cy", lossSy(lossCurves.elboLine[clampedEpoch]))
          }
          if (reconDotRef.current) {
            reconDotRef.current.setAttribute("cx", lossSx(interpEpoch))
            reconDotRef.current.setAttribute("cy", lossSy(lossCurves.reconLine[clampedEpoch]))
          }
          if (klDotRef.current) {
            klDotRef.current.setAttribute("cx", lossSx(interpEpoch))
            klDotRef.current.setAttribute("cy", lossSy(lossCurves.klLine[clampedEpoch]))
          }

          // Loss curve reveal via strokeDashoffset
          const frac = interpEpoch / 100
          const lens = lossPathLengthsRef.current
          if (elboPathRef.current)
            elboPathRef.current.setAttribute("stroke-dashoffset", lens.elbo * (1 - frac))
          if (reconPathRef.current)
            reconPathRef.current.setAttribute("stroke-dashoffset", lens.recon * (1 - frac))
          if (klPathRef.current)
            klPathRef.current.setAttribute("stroke-dashoffset", lens.kl * (1 - frac))

          // KL warmup shading
          if (warmupRectRef.current) {
            const warmupEnd = Math.min(interpEpoch, KL_WARMUP_END)
            warmupRectRef.current.setAttribute("width", lossSx(warmupEnd) - lossSx(0))
          }
        },
        onComplete() {
          snapIdxRef.current = toIdx
        },
      })

      setSnapIdx(toIdx)
    },
    [snapshots, latSx, latSy, rateSx, rateSy, lossSx, lossSy, lossCurves],
  )

  // === Play mode: GSAP timeline ===
  useEffect(() => {
    if (!playing) {
      if (playTlRef.current) {
        playTlRef.current.kill()
        playTlRef.current = null
      }
      return
    }

    const svg = svgRef.current
    if (!svg) return

    let startIdx = snapIdxRef.current
    if (startIdx >= snapshots.length - 1) {
      startIdx = 0
      snapIdxRef.current = 0
      setSnapIdx(0)
    }

    const masterTl = gsap.timeline({
      onComplete() {
        setPlaying(false)
        playTlRef.current = null
      },
    })
    playTlRef.current = masterTl

    for (let step = startIdx; step < snapshots.length - 1; step++) {
      const fromIdx = step
      const toIdx = step + 1
      const fromSnap = snapshots[fromIdx]
      const toSnap = snapshots[toIdx]
      const fromEpoch = fromSnap.epoch
      const toEpoch = toSnap.epoch

      const proxy = { t: 0 }
      const stepLabel = `step${step}`

      // 400ms pause between transitions (skip for first step)
      if (step > startIdx) {
        masterTl.to({}, { duration: 0.4 }, `>${stepLabel}pause`)
      }

      masterTl.to(proxy, {
        t: 1,
        duration: 0.8,
        ease: "power2.inOut",
        onStart() {
          setSnapIdx(fromIdx)
          snapIdxRef.current = fromIdx
        },
        onUpdate() {
          const t = proxy.t
          const interpEpoch = fromEpoch + (toEpoch - fromEpoch) * t

          // 1. Morph latent trajectories
          const trajEls = svg.querySelectorAll(".td-traj")
          trajEls.forEach(el => {
            const trIdx = Number(el.dataset.trial)
            const fromPts = fromSnap.sampleLatents[trIdx]
            const toPts = toSnap.sampleLatents[trIdx]
            el.setAttribute("d", buildMorphedPath(fromPts, toPts, t, latSx, latSy))
          })

          // Morph start markers
          const startMarkers = svg.querySelectorAll(".td-traj-start")
          startMarkers.forEach(el => {
            const trIdx = Number(el.dataset.trial)
            const fromPt = fromSnap.sampleLatents[trIdx][0]
            const toPt = toSnap.sampleLatents[trIdx][0]
            el.setAttribute("cx", latSx(fromPt[0] * (1 - t) + toPt[0] * t))
            el.setAttribute("cy", latSy(fromPt[1] * (1 - t) + toPt[1] * t))
          })

          // 2. Rate curves crossfade (staggered per neuron)
          const rateEls = svg.querySelectorAll(".td-rate")
          rateEls.forEach(el => {
            const nIdx = Number(el.dataset.neuron)
            // Stagger: each neuron starts 50ms later -> normalized offset
            const staggerDelay = (nIdx * 0.05) / 0.8 // 50ms stagger within 800ms
            const adjustedT = Math.max(0, Math.min(1, (t - staggerDelay * 0.25) / (1 - staggerDelay * 0.25)))

            // Crossfade: morph from 0.25 to 0.75 of adjusted t is opacity ramp
            const fadeT = adjustedT < 0.25
              ? 1 - (adjustedT / 0.25) * 0.7  // fade current down to 0.3
              : 0.3 + ((adjustedT - 0.25) / 0.75) * 0.7  // fade new up to 1.0

            const fromRates = fromSnap.sampleRates[0]
            const toRates = toSnap.sampleRates[0]
            const len = Math.min(fromRates.length, toRates.length)
            const parts = []
            for (let i = 0; i < len; i++) {
              const val = fromRates[i][nIdx] * (1 - adjustedT) + toRates[i][nIdx] * adjustedT
              parts.push(`${i === 0 ? "M" : "L"}${rateSx(i)},${rateSy(val)}`)
            }
            el.setAttribute("d", parts.join(" "))
            el.setAttribute("opacity", fadeT)
          })

          // 3. Epoch marker slides along x-axis
          if (epochMarkerRef.current) {
            epochMarkerRef.current.setAttribute("x1", lossSx(interpEpoch))
            epochMarkerRef.current.setAttribute("x2", lossSx(interpEpoch))
          }

          // 4. Loss curve dots follow epoch marker
          const roundedEpoch = Math.round(interpEpoch)
          const clampedEpoch = Math.max(0, Math.min(100, roundedEpoch))
          if (elboDotRef.current) {
            elboDotRef.current.setAttribute("cx", lossSx(interpEpoch))
            elboDotRef.current.setAttribute("cy", lossSy(lossCurves.elboLine[clampedEpoch]))
          }
          if (reconDotRef.current) {
            reconDotRef.current.setAttribute("cx", lossSx(interpEpoch))
            reconDotRef.current.setAttribute("cy", lossSy(lossCurves.reconLine[clampedEpoch]))
          }
          if (klDotRef.current) {
            klDotRef.current.setAttribute("cx", lossSx(interpEpoch))
            klDotRef.current.setAttribute("cy", lossSy(lossCurves.klLine[clampedEpoch]))
          }

          // 5. Loss curves extend via strokeDashoffset
          const frac = interpEpoch / 100
          const lens = lossPathLengthsRef.current
          if (elboPathRef.current)
            elboPathRef.current.setAttribute("stroke-dashoffset", lens.elbo * (1 - frac))
          if (reconPathRef.current)
            reconPathRef.current.setAttribute("stroke-dashoffset", lens.recon * (1 - frac))
          if (klPathRef.current)
            klPathRef.current.setAttribute("stroke-dashoffset", lens.kl * (1 - frac))

          // 6. KL warmup shading follows epoch marker
          if (warmupRectRef.current) {
            const warmupEnd = Math.min(interpEpoch, KL_WARMUP_END)
            warmupRectRef.current.setAttribute("width", lossSx(warmupEnd) - lossSx(0))
          }
        },
        onComplete() {
          snapIdxRef.current = toIdx
          setSnapIdx(toIdx)
          // Reset rate opacities to full after crossfade
          const rateEls = svg.querySelectorAll(".td-rate")
          rateEls.forEach(el => el.setAttribute("opacity", "0.85"))
        },
      }, step === startIdx ? 0 : `>`)
    }

    return () => {
      if (playTlRef.current) {
        playTlRef.current.kill()
        playTlRef.current = null
      }
    }
  }, [playing, snapshots, latSx, latSy, rateSx, rateSy, lossSx, lossSy, lossCurves])

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        ref={svgRef}
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
            ref={warmupRectRef}
            x={lossSx(0)}
            y={0}
            width={lossSx(Math.min(currentEpoch, KL_WARMUP_END)) - lossSx(0)}
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
            ref={elboPathRef}
            className="td-loss"
            data-metric="elbo"
            d={buildLinePath(lossCurves.elboLine, lossSx, lossSy)}
            fill="none"
            stroke={COLOR_ELBO}
            strokeWidth={1.8}
          />

          {/* Reconstruction line (teal dashed) */}
          <path
            ref={reconPathRef}
            className="td-loss"
            data-metric="recon"
            d={buildLinePath(lossCurves.reconLine, lossSx, lossSy)}
            fill="none"
            stroke={COLOR_RECON}
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />

          {/* KL line (red-brown dotted) */}
          <path
            ref={klPathRef}
            className="td-loss"
            data-metric="kl"
            d={buildLinePath(lossCurves.klLine, lossSx, lossSy)}
            fill="none"
            stroke={COLOR_KL}
            strokeWidth={1.5}
            strokeDasharray="2 3"
          />

          {/* Vertical epoch marker */}
          <line
            ref={epochMarkerRef}
            x1={lossSx(currentEpoch)} y1={0}
            x2={lossSx(currentEpoch)} y2={leftPlotH}
            stroke="#333"
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.5}
          />
          <circle
            ref={elboDotRef}
            cx={lossSx(currentEpoch)}
            cy={lossSy(lossCurves.elboLine[currentEpoch])}
            r={3} fill={COLOR_ELBO}
          />
          <circle
            ref={reconDotRef}
            cx={lossSx(currentEpoch)}
            cy={lossSy(lossCurves.reconLine[currentEpoch])}
            r={3} fill={COLOR_RECON}
          />
          <circle
            ref={klDotRef}
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
                className="td-traj"
                data-trial={trIdx}
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
              className="td-traj-start"
              data-trial={trIdx}
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
                className="td-rate"
                data-neuron={nIdx}
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
              const newIdx = Number(e.target.value)
              setPlaying(false)
              animateToSnap(newIdx)
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
