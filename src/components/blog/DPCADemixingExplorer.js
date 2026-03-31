import React, { useState, useRef, useCallback, useEffect, useMemo } from "react"

/* ────────────────────────────────────────────
   Layout
   ──────────────────────────────────────────── */
const W = 700
const H = 400
const PAD = { top: 50, right: 40, bottom: 50, left: 60 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const FONT = "var(--font-mono, monospace)"
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const POINT_R = 4.5
const DURATION = 500

/* ────────────────────────────────────────────
   Seeded PRNG (xoshiro128**)
   Deterministic data across renders.
   ──────────────────────────────────────────── */
function mulberry32(seed) {
  let t = (seed + 0x6d2b79f5) | 0
  return function () {
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randn(rng) {
  // Box-Muller
  const u1 = rng()
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2)
}

/* ────────────────────────────────────────────
   Data generation
   4 condition groups: 2 directions x 2 epochs
   Each group has N_PER_GROUP points.
   ──────────────────────────────────────────── */
const N_PER_GROUP = 10
const SEED = 42

function generateConditionData() {
  const rng = mulberry32(SEED)
  const spread = 0.55

  // Direction offsets (left vs right) along one axis
  const dirOffset = 2.2
  // Epoch offsets (early vs late) along another axis
  const epochOffset = 2.0

  // Under PCA the first two PCs capture a rotated mixture of both.
  // We define "true" latent coords and then rotate for PCA view.
  const groups = []
  const directions = [0, 1] // 0 = preferred, 1 = anti-preferred
  const epochs = [0, 1] // 0 = movement, 1 = preparatory

  for (const dir of directions) {
    for (const epoch of epochs) {
      const cx = (dir === 0 ? -1 : 1) * dirOffset
      const cy = (epoch === 0 ? -1 : 1) * epochOffset
      for (let i = 0; i < N_PER_GROUP; i++) {
        groups.push({
          direction: dir,
          epoch: epoch,
          // "True" demixed coordinates (what dPCA recovers)
          dpcaX: cx + randn(rng) * spread,
          dpcaY: cy + randn(rng) * spread,
        })
      }
    }
  }

  // PCA view: rotate the demixed coords by ~40 degrees so PC1
  // captures a mixture of direction and epoch variance.
  const theta = 0.70 // ~40 degrees
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)

  // Also add a small shear to make the mixture less symmetric
  for (const pt of groups) {
    const x = pt.dpcaX
    const y = pt.dpcaY
    pt.pcaX = cosT * x - sinT * y + randn(rng) * 0.18
    pt.pcaY = sinT * x + cosT * y + randn(rng) * 0.18
  }

  return groups
}

/* ────────────────────────────────────────────
   Scale helper
   ──────────────────────────────────────────── */
function computeScale(points, accessor, rangeSize) {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    const v = accessor(p)
    if (v < min) min = v
    if (v > max) max = v
  }
  const pad = (max - min) * 0.12
  min -= pad
  max += pad
  const scale = rangeSize / (max - min)
  const offset = -min * scale
  return { scale, offset, min, max }
}

/* ────────────────────────────────────────────
   Ease-out cubic
   ──────────────────────────────────────────── */
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ────────────────────────────────────────────
   Shape renderers
   ──────────────────────────────────────────── */
function Circle({ cx, cy, r, fill, stroke, strokeWidth }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  )
}

function Square({ cx, cy, size, fill, stroke, strokeWidth }) {
  const half = size / 2
  return (
    <rect
      x={cx - half}
      y={cy - half}
      width={size}
      height={size}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      rx={1}
    />
  )
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
export default function DPCADemixingExplorer() {
  const data = useMemo(() => generateConditionData(), [])

  const [mode, setMode] = useState("pca") // "pca" | "dpca"
  const animRef = useRef(null)
  const [progress, setProgress] = useState(0) // 0 = PCA, 1 = dPCA

  /* ── Compute pixel positions for both views ── */
  const positions = useMemo(() => {
    const pcaXS = computeScale(data, (d) => d.pcaX, PLOT_W)
    const pcaYS = computeScale(data, (d) => d.pcaY, PLOT_H)
    const dpcaXS = computeScale(data, (d) => d.dpcaX, PLOT_W)
    const dpcaYS = computeScale(data, (d) => d.dpcaY, PLOT_H)

    return data.map((d) => ({
      pcaPx: d.pcaX * pcaXS.scale + pcaXS.offset,
      pcaPy: PLOT_H - (d.pcaY * pcaYS.scale + pcaYS.offset),
      dpcaPx: d.dpcaX * dpcaXS.scale + dpcaXS.offset,
      dpcaPy: PLOT_H - (d.dpcaY * dpcaYS.scale + dpcaYS.offset),
      direction: d.direction,
      epoch: d.epoch,
    }))
  }, [data])

  /* ── Animation ── */
  const animateTo = useCallback(
    (targetMode) => {
      if (animRef.current) cancelAnimationFrame(animRef.current)

      const startProgress = progress
      const endProgress = targetMode === "dpca" ? 1 : 0
      const startTime = performance.now()

      const step = (now) => {
        const elapsed = now - startTime
        const t = Math.min(elapsed / DURATION, 1)
        const eased = easeOut(t)
        const current = startProgress + (endProgress - startProgress) * eased
        setProgress(current)

        if (t < 1) {
          animRef.current = requestAnimationFrame(step)
        } else {
          animRef.current = null
        }
      }

      animRef.current = requestAnimationFrame(step)
    },
    [progress]
  )

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  const handleModeChange = useCallback(
    (newMode) => {
      if (newMode === mode) return
      setMode(newMode)
      animateTo(newMode)
    },
    [mode, animateTo]
  )

  /* ── Interpolated axis labels ── */
  const xLabel = progress < 0.5 ? "PC 1" : "Direction component"
  const yLabel = progress < 0.5 ? "PC 2" : "Epoch component"

  /* ── Grid lines ── */
  const gridLinesX = 5
  const gridLinesY = 5

  return (
    <div style={{ width: "100%" }}>
      {/* ── Toggle buttons ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "0.5rem",
          fontFamily: FONT,
        }}
      >
        <button
          className="blog-figure__button"
          onClick={() => handleModeChange("pca")}
          style={{
            background: mode === "pca" ? "rgba(0,0,0,0.06)" : "none",
            borderColor:
              mode === "pca" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)",
            color: mode === "pca" ? "rgba(0,0,0,0.8)" : undefined,
          }}
        >
          PCA
        </button>
        <button
          className="blog-figure__button"
          onClick={() => handleModeChange("dpca")}
          style={{
            background: mode === "dpca" ? "rgba(0,0,0,0.06)" : "none",
            borderColor:
              mode === "dpca" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)",
            color: mode === "dpca" ? "rgba(0,0,0,0.8)" : undefined,
          }}
        >
          dPCA
        </button>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* ── Grid ── */}
          {Array.from({ length: gridLinesX + 1 }, (_, i) => {
            const x = (i / gridLinesX) * PLOT_W
            return (
              <line
                key={`gx-${i}`}
                x1={x}
                y1={0}
                x2={x}
                y2={PLOT_H}
                stroke="rgba(0,0,0,0.05)"
                strokeWidth={1}
              />
            )
          })}
          {Array.from({ length: gridLinesY + 1 }, (_, i) => {
            const y = (i / gridLinesY) * PLOT_H
            return (
              <line
                key={`gy-${i}`}
                x1={0}
                y1={y}
                x2={PLOT_W}
                y2={y}
                stroke="rgba(0,0,0,0.05)"
                strokeWidth={1}
              />
            )
          })}

          {/* ── Axes ── */}
          <line
            x1={0}
            y1={PLOT_H}
            x2={PLOT_W}
            y2={PLOT_H}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={1}
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={PLOT_H}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={1}
          />

          {/* ── Axis labels ── */}
          <text
            x={PLOT_W / 2}
            y={PLOT_H + 36}
            textAnchor="middle"
            fontSize={12}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.5)"
          >
            {xLabel}
          </text>
          <text
            x={-36}
            y={PLOT_H / 2}
            textAnchor="middle"
            fontSize={12}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.5)"
            transform={`rotate(-90, -36, ${PLOT_H / 2})`}
          >
            {yLabel}
          </text>

          {/* ── Data points ── */}
          {positions.map((pt, i) => {
            const px = pt.pcaPx + (pt.dpcaPx - pt.pcaPx) * progress
            const py = pt.pcaPy + (pt.dpcaPy - pt.pcaPy) * progress
            const color = pt.epoch === 0 ? BLUE : RED
            const strokeColor =
              pt.epoch === 0
                ? "rgba(61,108,185,0.7)"
                : "rgba(192,80,58,0.7)"

            if (pt.direction === 0) {
              return (
                <Circle
                  key={i}
                  cx={px}
                  cy={py}
                  r={POINT_R}
                  fill={color}
                  stroke={strokeColor}
                  strokeWidth={1}
                />
              )
            }
            return (
              <Square
                key={i}
                cx={px}
                cy={py}
                size={POINT_R * 2}
                fill={color}
                stroke={strokeColor}
                strokeWidth={1}
              />
            )
          })}
        </g>

        {/* ── Legend ── */}
        <g transform={`translate(${W - PAD.right - 150}, ${PAD.top + 6})`}>
          {/* Direction legend */}
          <text
            x={0}
            y={0}
            fontSize={10}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.5)"
            fontWeight={600}
          >
            Direction
          </text>
          <circle
            cx={8}
            cy={14}
            r={4}
            fill="rgba(0,0,0,0.3)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={0.8}
          />
          <text
            x={18}
            y={17}
            fontSize={10}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.45)"
          >
            Preferred
          </text>
          <rect
            x={4}
            y={26}
            width={8}
            height={8}
            rx={1}
            fill="rgba(0,0,0,0.3)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={0.8}
          />
          <text
            x={18}
            y={33}
            fontSize={10}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.45)"
          >
            Anti-preferred
          </text>

          {/* Epoch legend */}
          <text
            x={0}
            y={52}
            fontSize={10}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.5)"
            fontWeight={600}
          >
            Epoch
          </text>
          <rect
            x={4}
            y={60}
            width={10}
            height={6}
            rx={1}
            fill={BLUE}
          />
          <text
            x={18}
            y={67}
            fontSize={10}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.45)"
          >
            Movement
          </text>
          <rect
            x={4}
            y={74}
            width={10}
            height={6}
            rx={1}
            fill={RED}
          />
          <text
            x={18}
            y={81}
            fontSize={10}
            fontFamily={FONT}
            fill="rgba(0,0,0,0.45)"
          >
            Preparatory
          </text>
        </g>

        {/* ── Title ── */}
        <text
          x={W / 2}
          y={24}
          textAnchor="middle"
          fontSize={14}
          fontFamily={FONT}
          fill="rgba(0,0,0,0.6)"
          fontWeight={600}
        >
          {progress < 0.5
            ? "PCA mixes task variables"
            : "dPCA demixes task variables"}
        </text>
      </svg>
    </div>
  )
}
