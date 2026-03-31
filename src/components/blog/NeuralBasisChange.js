import React, { useState, useMemo } from "react"

/* ────────────────────────────────────────────
   Seeded PRNG
   ──────────────────────────────────────────── */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ────────────────────────────────────────────
   Data generation: tilted ellipse in 2D
   ──────────────────────────────────────────── */
const N_TIME = 120
const TILT = 0.62 // radians (~35°)
const MAJOR = 1.0
const MINOR = 0.3

function generateData() {
  const rng = mulberry32(77)
  const cosT = Math.cos(TILT)
  const sinT = Math.sin(TILT)

  // Ellipse in rotated frame, then project onto neuron axes
  const n1 = []
  const n2 = []
  for (let i = 0; i < N_TIME; i++) {
    const phase = (i / (N_TIME - 1)) * 2 * Math.PI
    // Axis-aligned ellipse
    const ex = MAJOR * Math.cos(phase)
    const ey = MINOR * Math.sin(phase)
    // Rotate into neuron space (tilted)
    n1.push(cosT * ex - sinT * ey + (rng() - 0.5) * 0.02)
    n2.push(sinT * ex + cosT * ey + (rng() - 0.5) * 0.02)
  }
  return [n1, n2]
}

/* ────────────────────────────────────────────
   PCA for 2×T data (analytical for 2D)
   ──────────────────────────────────────────── */
function computePCA(data) {
  const T = data[0].length
  const m0 = data[0].reduce((a, b) => a + b, 0) / T
  const m1 = data[1].reduce((a, b) => a + b, 0) / T
  const c = [
    data[0].map((v) => v - m0),
    data[1].map((v) => v - m1),
  ]

  // Covariance
  let s00 = 0, s01 = 0, s11 = 0
  for (let t = 0; t < T; t++) {
    s00 += c[0][t] * c[0][t]
    s01 += c[0][t] * c[1][t]
    s11 += c[1][t] * c[1][t]
  }
  s00 /= T - 1
  s01 /= T - 1
  s11 /= T - 1

  // Eigenvalues of 2×2 symmetric matrix
  const trace = s00 + s11
  const det = s00 * s11 - s01 * s01
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lam1 = trace / 2 + disc
  const lam2 = trace / 2 - disc

  // Eigenvectors
  let pc1, pc2
  if (Math.abs(s01) > 1e-10) {
    pc1 = [lam1 - s11, s01]
    pc2 = [lam2 - s11, s01]
  } else {
    pc1 = s00 >= s11 ? [1, 0] : [0, 1]
    pc2 = s00 >= s11 ? [0, 1] : [1, 0]
  }
  // Normalize
  const n1 = Math.hypot(pc1[0], pc1[1])
  const n2 = Math.hypot(pc2[0], pc2[1])
  pc1 = [pc1[0] / n1, pc1[1] / n1]
  pc2 = [pc2[0] / n2, pc2[1] / n2]

  // Project
  const proj = [
    Array.from({ length: T }, (_, t) => pc1[0] * c[0][t] + pc1[1] * c[1][t]),
    Array.from({ length: T }, (_, t) => pc2[0] * c[0][t] + pc2[1] * c[1][t]),
  ]

  return { centered: c, projected: proj, pcs: [pc1, pc2], eigenvalues: [lam1, lam2] }
}

/* ────────────────────────────────────────────
   Colors
   ──────────────────────────────────────────── */
const AXIS_COLORS = ["#3d6cb9", "#c0503a"]
const FONT = "var(--font-mono, monospace)"

function timeColor(t) {
  const f = t / (N_TIME - 1)
  const r = Math.round(61 + (192 - 61) * f)
  const g = Math.round(108 + (80 - 108) * f)
  const b = Math.round(185 + (58 - 185) * f)
  return `rgb(${r},${g},${b})`
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
const SVG_W = 920
const SVG_H = 470
const PANEL_W = 380
const GAP = 80
const LEFT_CX = PANEL_W / 2 + 30
const RIGHT_CX = SVG_W - PANEL_W / 2 - 30
const PANEL_CY = 190
const PLOT_R = 155 // half-size of each scatter panel

// Sparkline area
const SPARK_Y = 370
const SPARK_H = 36
const SPARK_W = PANEL_W - 30
const SPARK_GAP = 10

export default function NeuralBasisChange() {
  const [data] = useState(generateData)
  const { centered, projected } = useMemo(() => computePCA(data), [data])

  /* ─── Scale data to fit panels ─── */
  function scaleToPanel(traces, cx, cy) {
    let maxAbs = 0
    for (const tr of traces)
      for (const v of tr)
        if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v)
    if (maxAbs < 1e-10) maxAbs = 1
    const s = (PLOT_R * 0.88) / maxAbs
    return Array.from({ length: N_TIME }, (_, t) => [
      cx + traces[0][t] * s,
      cy - traces[1][t] * s,
    ])
  }

  const neuronPts = useMemo(
    () => scaleToPanel(centered, LEFT_CX, PANEL_CY),
    [centered]
  )
  const pcaPts = useMemo(
    () => scaleToPanel(projected, RIGHT_CX, PANEL_CY),
    [projected]
  )

  /* ─── Render trajectory ─── */
  const renderTrajectory = (pts, prefix) => (
    <>
      {pts.slice(0, -1).map((p, i) => (
        <line
          key={`${prefix}-seg-${i}`}
          x1={p[0]}
          y1={p[1]}
          x2={pts[i + 1][0]}
          y2={pts[i + 1][1]}
          stroke={timeColor(i)}
          strokeWidth="2.5"
          opacity="0.55"
          strokeLinecap="round"
        />
      ))}
      {[0, N_TIME - 1].map((i) => (
        <circle
          key={`${prefix}-ep-${i}`}
          cx={pts[i][0]}
          cy={pts[i][1]}
          r={4}
          fill={timeColor(i)}
          stroke="#fff"
          strokeWidth="1.5"
        />
      ))}
    </>
  )

  /* ─── Render axes for a panel ─── */
  const renderPanelAxes = (cx, cy, labels) => (
    <>
      {/* Horizontal */}
      <line
        x1={cx - PLOT_R}
        y1={cy}
        x2={cx + PLOT_R}
        y2={cy}
        stroke="rgba(0,0,0,0.08)"
      />
      {/* Vertical */}
      <line
        x1={cx}
        y1={cy - PLOT_R}
        x2={cx}
        y2={cy + PLOT_R}
        stroke="rgba(0,0,0,0.08)"
      />
      {/* Labels */}
      <text
        x={cx + PLOT_R - 2}
        y={cy + 14}
        textAnchor="end"
        fontSize="11"
        fontFamily={FONT}
        fill={AXIS_COLORS[0]}
        fontWeight="600"
      >
        {labels[0]}
      </text>
      <text
        x={cx + 8}
        y={cy - PLOT_R + 12}
        textAnchor="start"
        fontSize="11"
        fontFamily={FONT}
        fill={AXIS_COLORS[1]}
        fontWeight="600"
      >
        {labels[1]}
      </text>
    </>
  )

  /* ─── Sparklines (shared scale within each basis) ─── */
  const renderSparklines = (traces, cx, labels) => {
    const sparkLeft = cx - SPARK_W / 2
    let globalMax = 0
    for (const tr of traces)
      for (const v of tr)
        if (Math.abs(v) > globalMax) globalMax = Math.abs(v)
    if (globalMax < 1e-10) globalMax = 1

    return traces.map((trace, i) => {
      const y0 = SPARK_Y + i * (SPARK_H + SPARK_GAP)
      const points = trace
        .map((v, t) => {
          const px = sparkLeft + (t / (N_TIME - 1)) * SPARK_W
          const py = y0 + SPARK_H / 2 - (v / globalMax) * (SPARK_H / 2) * 0.85
          return `${px.toFixed(1)},${py.toFixed(1)}`
        })
        .join(" ")

      return (
        <g key={`spark-${i}`}>
          <rect
            x={sparkLeft}
            y={y0}
            width={SPARK_W}
            height={SPARK_H}
            fill="rgba(0,0,0,0.02)"
            rx="2"
          />
          <line
            x1={sparkLeft}
            y1={y0 + SPARK_H / 2}
            x2={sparkLeft + SPARK_W}
            y2={y0 + SPARK_H / 2}
            stroke="rgba(0,0,0,0.05)"
          />
          <polyline
            points={points}
            fill="none"
            stroke={AXIS_COLORS[i]}
            strokeWidth="1.5"
            opacity="0.65"
          />
          <text
            x={sparkLeft - 6}
            y={y0 + SPARK_H / 2 + 4}
            textAnchor="end"
            fontSize="10"
            fontFamily={FONT}
            fill={AXIS_COLORS[i]}
            fontWeight="600"
          >
            {labels[i]}
          </text>
        </g>
      )
    })
  }

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: "100%", height: "auto" }}
      >
        {/* Panel titles */}
        <text
          x={LEFT_CX}
          y={20}
          textAnchor="middle"
          fontSize="13"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.45)"
          fontWeight="600"
        >
          Neuron basis
        </text>
        <text
          x={RIGHT_CX}
          y={20}
          textAnchor="middle"
          fontSize="13"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.45)"
          fontWeight="600"
        >
          PCA basis
        </text>

        {/* Divider */}
        <line
          x1={SVG_W / 2}
          y1={30}
          x2={SVG_W / 2}
          y2={SPARK_Y - 15}
          stroke="rgba(0,0,0,0.06)"
          strokeDasharray="4,4"
        />

        {/* Left panel: neuron basis */}
        {renderPanelAxes(LEFT_CX, PANEL_CY, ["N1", "N2"])}
        {renderTrajectory(neuronPts, "n")}

        {/* Right panel: PCA basis */}
        {renderPanelAxes(RIGHT_CX, PANEL_CY, ["PC1", "PC2"])}
        {renderTrajectory(pcaPts, "pc")}

        {/* Arrow annotation between panels */}
        <g opacity="0.2">
          <line
            x1={SVG_W / 2 - 30}
            y1={PANEL_CY}
            x2={SVG_W / 2 + 26}
            y2={PANEL_CY}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
            markerEnd="url(#nbc-arrow)"
          />
          <defs>
            <marker
              id="nbc-arrow"
              markerWidth="6"
              markerHeight="5"
              refX="5"
              refY="2.5"
              orient="auto"
            >
              <polygon
                points="0 0, 6 2.5, 0 5"
                fill="rgba(0,0,0,0.5)"
              />
            </marker>
          </defs>
          <text
            x={SVG_W / 2}
            y={PANEL_CY - 10}
            textAnchor="middle"
            fontSize="9"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.6)"
          >
            rotate axes
          </text>
        </g>

        {/* Sparklines */}
        {renderSparklines(centered, LEFT_CX, ["N1", "N2"])}
        {renderSparklines(projected, RIGHT_CX, ["PC1", "PC2"])}
      </svg>
    </div>
  )
}
