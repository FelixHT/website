import React, { useMemo } from "react"

/* ─── Layout ─── */
const W = 900
const H = 380
const ROWS = 6     // time points
const COLS_X = 4   // neurons per subject
const COLS_S = 2   // latent dimensions in S
const CELL = 18
const CELL_GAP = 1
const CELL_STRIDE = CELL + CELL_GAP

/* ─── Colors ─── */
const FONT_MONO = "var(--font-mono, monospace)"
const FONT_SERIF = "var(--font-serif, Georgia, serif)"
const ARROW_COLOR = "rgba(0,0,0,0.3)"
const SUBJECT_COLORS = ["#3B82C4", "#C75D3A", "#5A8F5C"]
const TEAL = "#4A7C6F"

/* ─── Seeded PRNG (mulberry32) ─── */
function mulberry32(seed) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─── Generate deterministic data ─── */
function generateData() {
  const rng = mulberry32(77)

  // Shared response matrix S: 6×2
  const S = [
    [ 1.2, -0.4],
    [ 0.8,  1.0],
    [-0.5,  1.5],
    [-1.1, -0.2],
    [ 0.3, -1.3],
    [ 0.9,  0.6],
  ]

  // Generate 3 rotation matrices W_k (2×4 each, rows are orthonormal)
  // Use random angles to create 2D rotations extended into 4D
  const Ws = []
  for (let k = 0; k < 3; k++) {
    const angle1 = rng() * Math.PI * 2
    const angle2 = rng() * Math.PI * 2
    // Two orthogonal unit vectors in 4D
    const w1 = [
      Math.cos(angle1) * Math.cos(angle2),
      Math.sin(angle1) * Math.cos(angle2),
      Math.cos(angle1) * Math.sin(angle2),
      Math.sin(angle1) * Math.sin(angle2),
    ]
    // Second vector orthogonal to first via Gram-Schmidt from a random direction
    const r = [rng() - 0.5, rng() - 0.5, rng() - 0.5, rng() - 0.5]
    const dot = r.reduce((s, v, i) => s + v * w1[i], 0)
    const w2raw = r.map((v, i) => v - dot * w1[i])
    const norm2 = Math.sqrt(w2raw.reduce((s, v) => s + v * v, 0))
    const w2 = w2raw.map(v => v / norm2)

    Ws.push([w1, w2]) // W_k is 2×4
  }

  // Compute X_k = S * W_k^T (6×4 each)
  const Xs = Ws.map(Wk => {
    return S.map(sRow => {
      return Array.from({ length: COLS_X }, (_, j) => {
        let val = 0
        for (let d = 0; d < COLS_S; d++) {
          val += sRow[d] * Wk[d][j]
        }
        return val
      })
    })
  })

  return { S, Ws, Xs }
}

/* ─── Diverging colormap: blue - white - red ─── */
function valueToColor(val, absMax) {
  const t = Math.max(-1, Math.min(1, val / absMax))
  if (t < 0) {
    const a = -t
    const r = Math.round(255 - a * (255 - 59))
    const g = Math.round(255 - a * (255 - 130))
    const b = Math.round(255 - a * (255 - 189))
    return `rgb(${r},${g},${b})`
  }
  const r = Math.round(255 - t * (255 - 199))
  const g = Math.round(255 - t * (255 - 70))
  const b = Math.round(255 - t * (255 - 52))
  return `rgb(${r},${g},${b})`
}

/* ─── Teal-tinted colormap for S ─── */
function valueToTeal(val, absMax) {
  const t = Math.max(-1, Math.min(1, val / absMax))
  if (t < 0) {
    // Dark teal for negative
    const a = -t
    const r = Math.round(255 - a * (255 - 20))
    const g = Math.round(255 - a * (255 - 80))
    const b = Math.round(255 - a * (255 - 75))
    return `rgb(${r},${g},${b})`
  }
  // Light teal/cyan for positive
  const r = Math.round(255 - t * (255 - 60))
  const g = Math.round(255 - t * (255 - 170))
  const b = Math.round(255 - t * (255 - 155))
  return `rgb(${r},${g},${b})`
}

/* ─── Component ─── */
export default function SRMFactorizationExplorer() {
  const { S, Xs, absMaxX, absMaxS } = useMemo(() => {
    const data = generateData()

    // Find absolute max across all X_k matrices
    let mxX = 0
    for (const X of data.Xs) {
      for (const row of X) {
        for (const v of row) {
          mxX = Math.max(mxX, Math.abs(v))
        }
      }
    }

    // Find absolute max for S
    let mxS = 0
    for (const row of data.S) {
      for (const v of row) {
        mxS = Math.max(mxS, Math.abs(v))
      }
    }

    return { S: data.S, Xs: data.Xs, absMaxX: mxX, absMaxS: mxS }
  }, [])

  /* ─── Heatmap dimensions ─── */
  const xHeatW = COLS_X * CELL_STRIDE - CELL_GAP
  const xHeatH = ROWS * CELL_STRIDE - CELL_GAP
  const sHeatW = COLS_S * CELL_STRIDE - CELL_GAP
  const sHeatH = ROWS * CELL_STRIDE - CELL_GAP

  /* ─── Positions ─── */
  // Three X_k heatmaps across the top, evenly spaced
  const xSpacing = 120
  const totalXWidth = 3 * xHeatW + 2 * xSpacing
  const xStartX = (W - totalXWidth) / 2
  const xTopY = 38

  // S heatmap centered below
  const sCenterX = W / 2 - sHeatW / 2
  const sTopY = H - sHeatH - 18

  /* ─── Heatmap renderer ─── */
  function renderHeatmap(matrix, xOff, yOff, cols, colorFn, absMax) {
    const cells = []
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < cols; j++) {
        cells.push(
          <rect
            key={`${i}-${j}`}
            x={xOff + j * CELL_STRIDE}
            y={yOff + i * CELL_STRIDE}
            width={CELL}
            height={CELL}
            fill={colorFn(matrix[i][j], absMax)}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={0.5}
            rx={2}
          />
        )
      }
    }
    return cells
  }

  /* ─── Arrow with label ─── */
  function renderArrow(x1, y1, x2, y2, labelContent) {
    // Shorten the arrow slightly at both ends
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    const pad = 6
    const ax1 = x1 + (dx / len) * pad
    const ay1 = y1 + (dy / len) * pad
    const ax2 = x2 - (dx / len) * pad
    const ay2 = y2 - (dy / len) * pad

    // Midpoint for label
    const mx = (ax1 + ax2) / 2
    const my = (ay1 + ay2) / 2

    // Perpendicular offset for label (always to the right when facing arrow dir)
    const nx = -dy / len
    const ny = dx / len
    const labelOffset = 14
    const lx = mx + nx * labelOffset
    const ly = my + ny * labelOffset

    return (
      <g>
        <line
          x1={ax1} y1={ay1} x2={ax2} y2={ay2}
          stroke={ARROW_COLOR}
          strokeWidth={1.5}
          markerEnd="url(#arrowhead)"
        />
        <text
          x={lx} y={ly}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 12,
            fontStyle: "italic",
            fill: "rgba(0,0,0,0.45)",
          }}
        >
          {labelContent}
        </text>
      </g>
    )
  }

  /* ─── Subject labels ─── */
  const subjectLabels = ["Subject 1", "Subject 2", "Subject 3"]

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill={ARROW_COLOR} />
          </marker>
        </defs>

        {/* ─── Three X_k heatmaps ─── */}
        {Xs.map((Xk, k) => {
          const xOff = xStartX + k * (xHeatW + xSpacing)
          return (
            <g key={k}>
              {/* Subject label */}
              <text
                x={xOff + xHeatW / 2}
                y={xTopY - 22}
                textAnchor="middle"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  fill: SUBJECT_COLORS[k],
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                {subjectLabels[k]}
              </text>

              {/* Matrix label X_k */}
              <text
                x={xOff + xHeatW / 2}
                y={xTopY - 8}
                textAnchor="middle"
                style={{
                  fontFamily: FONT_SERIF,
                  fontSize: 13,
                  fontStyle: "italic",
                  fill: SUBJECT_COLORS[k],
                  fontWeight: 600,
                }}
              >
                <tspan>X</tspan>
                <tspan dy="3" fontSize="9">{k + 1}</tspan>
              </text>

              {/* Heatmap */}
              {renderHeatmap(Xk, xOff, xTopY, COLS_X, valueToColor, absMaxX)}

              {/* Dimension labels */}
              <text
                x={xOff + xHeatW / 2}
                y={xTopY + xHeatH + 14}
                textAnchor="middle"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 8,
                  fill: "rgba(0,0,0,0.3)",
                  letterSpacing: "0.04em",
                }}
              >
                neurons
              </text>
              <text
                x={xOff - 10}
                y={xTopY + xHeatH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(-90, ${xOff - 10}, ${xTopY + xHeatH / 2})`}
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 8,
                  fill: "rgba(0,0,0,0.3)",
                  letterSpacing: "0.04em",
                }}
              >
                time
              </text>
            </g>
          )
        })}

        {/* ─── S heatmap (centered below) ─── */}
        <text
          x={sCenterX + sHeatW / 2}
          y={sTopY - 10}
          textAnchor="middle"
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 14,
            fontStyle: "italic",
            fill: TEAL,
            fontWeight: 700,
          }}
        >
          S
        </text>
        <text
          x={sCenterX + sHeatW / 2}
          y={sTopY - 24}
          textAnchor="middle"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            fill: TEAL,
            fontWeight: 600,
            letterSpacing: "0.04em",
            opacity: 0.7,
          }}
        >
          shared response
        </text>

        {renderHeatmap(S, sCenterX, sTopY, COLS_S, valueToTeal, absMaxS)}

        {/* Dimension labels for S */}
        <text
          x={sCenterX + sHeatW / 2}
          y={sTopY + sHeatH + 14}
          textAnchor="middle"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 8,
            fill: "rgba(0,0,0,0.3)",
            letterSpacing: "0.04em",
          }}
        >
          latent
        </text>
        <text
          x={sCenterX - 10}
          y={sTopY + sHeatH / 2}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(-90, ${sCenterX - 10}, ${sTopY + sHeatH / 2})`}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 8,
            fill: "rgba(0,0,0,0.3)",
            letterSpacing: "0.04em",
          }}
        >
          time
        </text>

        {/* ─── Arrows from S to each X_k ─── */}
        {Xs.map((_, k) => {
          const xOff = xStartX + k * (xHeatW + xSpacing)
          // Arrow goes from top of S upward to bottom of X_k
          const arrowStartX = sCenterX + sHeatW / 2
          const arrowStartY = sTopY - 28
          const arrowEndX = xOff + xHeatW / 2
          const arrowEndY = xTopY + xHeatH + 18

          const wLabel = (
            <>
              <tspan>W</tspan>
              <tspan dy="3" fontSize="9">{k + 1}</tspan>
              <tspan dy="-3" fontSize="9" fontStyle="normal">{"\u1D40"}</tspan>
            </>
          )

          return (
            <g key={`arrow-${k}`}>
              {renderArrow(
                arrowStartX, arrowStartY,
                arrowEndX, arrowEndY,
                wLabel
              )}
            </g>
          )
        })}

        {/* ─── Equation annotation ─── */}
        <text
          x={W - 30}
          y={H / 2 + 10}
          textAnchor="end"
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 14,
            fontStyle: "italic",
            fill: "rgba(0,0,0,0.4)",
          }}
        >
          <tspan fontWeight={600}>X</tspan>
          <tspan dy="3" fontSize="10">k</tspan>
          <tspan dy="-3">{" \u2248 "}</tspan>
          <tspan fontWeight={600}>S</tspan>
          <tspan>{" "}</tspan>
          <tspan fontWeight={600}>W</tspan>
          <tspan dy="3" fontSize="10">k</tspan>
          <tspan dy="-3" fontSize="10" fontStyle="normal">{"\u1D40"}</tspan>
        </text>
      </svg>
    </div>
  )
}
