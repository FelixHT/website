import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 700
const H = 400
const FONT = "var(--font-mono, monospace)"

/* Left panel: phase portrait */
const LP_X = 40
const LP_Y = 30
const LP_W = 420
const LP_H = 340
const LP_CX = LP_X + LP_W / 2
const LP_CY = LP_Y + LP_H / 2

/* Right panel: eigenvalue plane */
const RP_X = 480
const RP_Y = 80
const RP_W = 200
const RP_H = 200
const RP_CX = RP_X + RP_W / 2
const RP_CY = RP_Y + RP_H / 2
const RP_RANGE = 1.5
const RP_PX_PER_UNIT = RP_W / (2 * RP_RANGE)

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const BLUE = "#3d6cb9"
const RED = "#c0503a"

/* ─── Presets ─── */
const THETA = (30 * Math.PI) / 180
const COS_T = Math.cos(THETA)
const SIN_T = Math.sin(THETA)
// V = [[cos, -sin],[sin, cos]], V^-1 = [[cos, sin],[-sin, cos]]

function rotatedDiag(l1, l2) {
  // A = V * diag(l1,l2) * V^-1
  // V = [[c,-s],[s,c]]
  const c = COS_T
  const s = SIN_T
  return [
    [l1 * c * c + l2 * s * s, (l1 - l2) * c * s],
    [(l1 - l2) * c * s, l1 * s * s + l2 * c * c],
  ]
}

const PRESETS = [
  {
    label: "stable node",
    A: rotatedDiag(0.92, 0.85),
    eigs: [
      { re: 0.92, im: 0 },
      { re: 0.85, im: 0 },
    ],
  },
  {
    label: "unstable node",
    A: rotatedDiag(1.005, 1.008),
    eigs: [
      { re: 1.005, im: 0 },
      { re: 1.008, im: 0 },
    ],
  },
  {
    label: "stable spiral",
    A: [
      [0.95, -0.25],
      [0.25, 0.95],
    ],
    eigs: [
      { re: 0.95, im: 0.25 },
      { re: 0.95, im: -0.25 },
    ],
  },
  {
    label: "center",
    A: [
      [0, -0.98],
      [0.98, 0],
    ],
    eigs: [
      { re: 0, im: 0.98 },
      { re: 0, im: -0.98 },
    ],
  },
  {
    label: "unstable spiral",
    A: [
      [0.987, -0.2],
      [0.2, 0.987],
    ],
    eigs: [
      { re: 0.987, im: 0.2 },
      { re: 0.987, im: -0.2 },
    ],
  },
]

/* ─── Helpers ─── */
function matVec(M, v) {
  return [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]]
}

function eigMag(e) {
  return Math.sqrt(e.re * e.re + e.im * e.im)
}

function formatEig(e) {
  if (e.im === 0) return e.re.toFixed(2)
  const sign = e.im > 0 ? "+" : "\u2212"
  return `${e.re.toFixed(2)} ${sign} ${Math.abs(e.im).toFixed(2)}i`
}

/* Color interpolation from blue (t=0) to red (t=1) */
function timeColor(t) {
  // blue "#3d6cb9" -> red "#c0503a"
  const r0 = 0x3d, g0 = 0x6c, b0 = 0xb9
  const r1 = 0xc0, g1 = 0x50, b1 = 0x3a
  const r = Math.round(r0 + (r1 - r0) * t)
  const g = Math.round(g0 + (g1 - g0) * t)
  const b = Math.round(b0 + (b1 - b0) * t)
  return `rgb(${r},${g},${b})`
}

/* ─── Component ─── */
export default function PhasePortraitExplorer() {
  const [preset, setPreset] = useState(PRESETS[0])

  /* ─── Trajectory, range, grid — all derived together ─── */
  const phaseData = useMemo(() => {
    // Fixed range — presets are tuned so trajectories stay visible
    const range = 2
    const pxPerUnit = LP_W / (2 * range)
    const N = 80
    const pts = [[1, 0.3]]
    for (let i = 0; i < N; i++) {
      const next = matVec(preset.A, pts[pts.length - 1])
      if (Math.abs(next[0]) > range * 1.5 || Math.abs(next[1]) > range * 1.5) break
      pts.push(next)
    }

    // Build colored segments (no clipping needed — range already fits trajectory)
    const segs = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[i + 1]
      const t = i / (pts.length - 2)
      segs.push({
        x0: LP_CX + x0 * pxPerUnit,
        y0: LP_CY - y0 * pxPerUnit,
        x1: LP_CX + x1 * pxPerUnit,
        y1: LP_CY - y1 * pxPerUnit,
        color: timeColor(t),
      })
    }

    // Grid lines: one per integer unit, skipping 0
    const gridLines = []
    for (let v = -(range - 1); v <= range - 1; v++) {
      if (v === 0) continue
      const sx = LP_CX + v * pxPerUnit
      gridLines.push({ x1: sx, y1: LP_Y, x2: sx, y2: LP_Y + LP_H })
      const sy = LP_CY - v * pxPerUnit
      gridLines.push({ x1: LP_X, y1: sy, x2: LP_X + LP_W, y2: sy })
    }

    // Tick values: every integer from -(range-1) to (range-1), skipping 0
    const ticks = []
    for (let v = -(range - 1); v <= range - 1; v++) {
      if (v === 0) continue
      ticks.push(v)
    }

    // Start point in SVG coords
    const startSx = LP_CX + 1 * pxPerUnit
    const startSy = LP_CY - 0.3 * pxPerUnit

    return { segs, range, pxPerUnit, gridLines, ticks, startSx, startSy }
  }, [preset])

  /* ─── Grid lines for right panel ─── */
  const rpGridLines = useMemo(() => {
    const lines = []
    for (let v = -1; v <= 1; v++) {
      if (v === 0) continue
      const sx = RP_CX + v * RP_PX_PER_UNIT
      lines.push({ x1: sx, y1: RP_Y, x2: sx, y2: RP_Y + RP_H })
      const sy = RP_CY - v * RP_PX_PER_UNIT
      lines.push({ x1: RP_X, y1: sy, x2: RP_X + RP_W, y2: sy })
    }
    return lines
  }, [])

  /* ─── Eigenvalue positions and labels ─── */
  const eigData = useMemo(() => {
    return preset.eigs.map((e) => {
      const mag = eigMag(e)
      const sx = RP_CX + e.re * RP_PX_PER_UNIT
      const sy = RP_CY - e.im * RP_PX_PER_UNIT
      const inside = mag < 1
      // Offset label to avoid overlap with axis labels
      // If re > 1.0, place label to the left of the dot
      const labelDx = e.re > 1.0 ? -8 : 8
      const labelAnchor = e.re > 1.0 ? "end" : "start"
      // Vertical: above for positive im, below for negative, above for real
      // Extra vertical offset when imaginary part is near ±1i (close to "1i" tick label)
      let labelDy = e.im > 0 ? -10 : e.im < 0 ? 16 : -10
      // If near the Im axis tick labels (|im| close to 1), shift further
      if (Math.abs(Math.abs(e.im) - 1) < 0.15) {
        labelDy = e.im > 0 ? -14 : 20
      }
      return {
        sx,
        sy,
        color: inside ? TEAL : RED,
        label: formatEig(e),
        im: e.im,
        re: e.re,
        labelDx,
        labelAnchor,
        labelDy,
      }
    })
  }, [preset])

  /* ─── Unit circle path ─── */
  const unitCircleR = 1 * RP_PX_PER_UNIT

  const { segs, gridLines, ticks, startSx, startSy } = phaseData

  return (
    <figure className="blog-figure" style={{ maxWidth: W, margin: "1.5rem auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        fontFamily={FONT}
        fontSize="11"
      >
        {/* ── Clip regions ── */}
        <defs>
          <clipPath id="pp-clip-left">
            <rect x={LP_X} y={LP_Y} width={LP_W} height={LP_H} />
          </clipPath>
          <clipPath id="pp-clip-right">
            <rect x={RP_X} y={RP_Y} width={RP_W} height={RP_H} />
          </clipPath>
        </defs>

        {/* ════════ LEFT PANEL: Phase Portrait ════════ */}
        <rect
          x={LP_X}
          y={LP_Y}
          width={LP_W}
          height={LP_H}
          fill="white"
          stroke="#ddd"
          strokeWidth="1"
        />

        {/* Grid lines */}
        {gridLines.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="0.5"
          />
        ))}

        {/* Axes */}
        <line
          x1={LP_X}
          y1={LP_CY}
          x2={LP_X + LP_W}
          y2={LP_CY}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.8"
        />
        <line
          x1={LP_CX}
          y1={LP_Y}
          x2={LP_CX}
          y2={LP_Y + LP_H}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.8"
        />

        {/* Axis labels */}
        <text
          x={LP_X + LP_W - 4}
          y={LP_CY + 16}
          textAnchor="end"
          fill="#999"
          fontSize="11"
        >
          x&#x2081;
        </text>
        <text
          x={LP_CX + 10}
          y={LP_Y + 14}
          textAnchor="start"
          fill="#999"
          fontSize="11"
        >
          x&#x2082;
        </text>

        {/* Axis tick labels */}
        {ticks.map((v) => (
          <React.Fragment key={`lp-tick-${v}`}>
            <text
              x={LP_CX + v * phaseData.pxPerUnit}
              y={LP_CY + 14}
              textAnchor="middle"
              fill="#aaa"
              fontSize="9"
            >
              {v}
            </text>
            <text
              x={LP_CX - 8}
              y={LP_CY - v * phaseData.pxPerUnit + 3}
              textAnchor="end"
              fill="#aaa"
              fontSize="9"
            >
              {v}
            </text>
          </React.Fragment>
        ))}

        {/* Trajectory segments */}
        <g clipPath="url(#pp-clip-left)">
          {segs.map((seg, i) => (
            <line
              key={i}
              x1={seg.x0}
              y1={seg.y0}
              x2={seg.x1}
              y2={seg.y1}
              stroke={seg.color}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Start point */}
        <circle cx={startSx} cy={startSy} r={4} fill={BLUE} />
        <text
          x={startSx + 8}
          y={startSy - 6}
          fill={BLUE}
          fontSize="10"
          fontWeight="600"
        >
          start
        </text>

        {/* Panel title */}
        <text
          x={LP_CX}
          y={LP_Y - 8}
          textAnchor="middle"
          fill="#555"
          fontSize="12"
          fontWeight="600"
        >
          phase portrait
        </text>

        {/* ════════ RIGHT PANEL: Eigenvalue Plane ════════ */}
        <rect
          x={RP_X}
          y={RP_Y}
          width={RP_W}
          height={RP_H}
          fill="white"
          stroke="#ddd"
          strokeWidth="1"
        />

        {/* Unit circle fill */}
        <circle
          cx={RP_CX}
          cy={RP_CY}
          r={unitCircleR}
          fill="rgba(74,124,111,0.03)"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1"
          strokeDasharray="4,3"
          clipPath="url(#pp-clip-right)"
        />

        {/* Grid lines */}
        {rpGridLines.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="0.5"
            clipPath="url(#pp-clip-right)"
          />
        ))}

        {/* Axes */}
        <line
          x1={RP_X}
          y1={RP_CY}
          x2={RP_X + RP_W}
          y2={RP_CY}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.8"
        />
        <line
          x1={RP_CX}
          y1={RP_Y}
          x2={RP_CX}
          y2={RP_Y + RP_H}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.8"
        />

        {/* Axis labels */}
        <text
          x={RP_X + RP_W - 4}
          y={RP_CY + 14}
          textAnchor="end"
          fill="#999"
          fontSize="10"
        >
          Re
        </text>
        <text
          x={RP_CX + 8}
          y={RP_Y + 12}
          textAnchor="start"
          fill="#999"
          fontSize="10"
        >
          Im
        </text>

        {/* Tick labels */}
        {[-1, 1].map((v) => (
          <React.Fragment key={`rp-tick-${v}`}>
            <text
              x={RP_CX + v * RP_PX_PER_UNIT}
              y={RP_CY + 13}
              textAnchor="middle"
              fill="#aaa"
              fontSize="9"
            >
              {v}
            </text>
            <text
              x={RP_CX - 7}
              y={RP_CY - v * RP_PX_PER_UNIT + 3}
              textAnchor="end"
              fill="#aaa"
              fontSize="9"
            >
              {v}i
            </text>
          </React.Fragment>
        ))}

        {/* Eigenvalue dots and labels */}
        {eigData.map((e, i) => (
          <React.Fragment key={i}>
            <circle cx={e.sx} cy={e.sy} r={5} fill={e.color} />
            <text
              x={e.sx + e.labelDx}
              y={e.sy + e.labelDy}
              textAnchor={e.labelAnchor}
              fill={e.color}
              fontSize="9"
              fontWeight="600"
            >
              {e.label}
            </text>
          </React.Fragment>
        ))}

        {/* Panel title */}
        <text
          x={RP_CX}
          y={RP_Y - 8}
          textAnchor="middle"
          fill="#555"
          fontSize="12"
          fontWeight="600"
        >
          eigenvalue plane
        </text>
      </svg>

      {/* ── Controls ── */}
      <div
        className="blog-figure__controls"
        style={{ justifyContent: "center", gap: "0.5rem" }}
      >
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p)}
            style={{
              fontFamily: FONT,
              fontSize: "12px",
              padding: "4px 12px",
              background: preset === p ? TEAL : "white",
              color: preset === p ? "white" : "#333",
              border: "1.5px solid " + (preset === p ? TEAL : "#ccc"),
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </figure>
  )
}
