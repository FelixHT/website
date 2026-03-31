import React from "react"

const W = 900
const H = 400
const CX = W / 2
const CY = H / 2

const TEAL = "#4A7C6F"
const BOX_FILL = "rgba(0,0,0,0.03)"
const BOX_STROKE = "rgba(0,0,0,0.1)"
const TEXT_DARK = "rgba(0,0,0,0.85)"
const TEXT_MID = "rgba(0,0,0,0.55)"
const LINE_COLOR = "rgba(0,0,0,0.12)"

const METHODS = [
  {
    name: "PCA",
    matrix: "Centered data X",
    keep: "Top k right singular vectors (PCs)",
  },
  {
    name: "Least squares",
    matrix: "Design matrix A",
    keep: "Pseudoinverse A\u207A = V\u03A3\u207AU\u1D40",
  },
  {
    name: "Low-rank approx",
    matrix: "Any matrix A",
    keep: "Top k terms of U\u03A3V\u1D40",
  },
  {
    name: "CCA",
    matrix: "Whitened cross-cov",
    keep: "Sing. vectors = canonical dirs",
  },
  {
    name: "Procrustes",
    matrix: "Cross-product Y\u1D40X",
    keep: "Rotation R = UV\u1D40",
  },
  {
    name: "RRR",
    matrix: "Coefficient \u0042\u0302",
    keep: "Truncated SVD of B\u0302",
  },
  {
    name: "Subspace ID",
    matrix: "Block Hankel",
    keep: "Left sing. vectors = obs. basis",
  },
]

// Hand-tuned positions for 7 boxes around center:
// Top row: 3 boxes, side positions: 2 boxes, bottom row: 2 boxes
const METHOD_POSITIONS = [
  { x: 130, y: 55 },   // PCA — top left
  { x: 450, y: 45 },   // Least squares — top center
  { x: 770, y: 55 },   // Low-rank approx — top right
  { x: 100, y: 280 },  // CCA — bottom left
  { x: 800, y: 280 },  // Procrustes — bottom right
  { x: 310, y: 345 },  // RRR — bottom center-left
  { x: 590, y: 345 },  // Subspace ID — bottom center-right
]

const BOX_W = 160
const BOX_H = 76
const CENTER_W = 170
const CENTER_H = 48

// Given a box center and the SVD center, find the point on the box edge
// along the line connecting them (axis-aligned rectangle intersection)
function boxEdgePoint(bx, by, bw, bh, tx, ty) {
  const dx = tx - bx
  const dy = ty - by
  if (dx === 0 && dy === 0) return { x: bx, y: by }
  const hw = bw / 2
  const hh = bh / 2
  // Scale factor to reach edge
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity
  const s = Math.min(sx, sy)
  return { x: bx + dx * s, y: by + dy * s }
}

export default function SVDUnifiesAll() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="Diagram showing 7 methods that all reduce to SVD"
    >
      {/* Connecting lines from each method box to center */}
      {METHODS.map((_, i) => {
        const pos = METHOD_POSITIONS[i]
        const from = boxEdgePoint(pos.x, pos.y, BOX_W, BOX_H, CX, CY)
        const to = boxEdgePoint(CX, CY, CENTER_W, CENTER_H, pos.x, pos.y)
        return (
          <line
            key={`line-${i}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={LINE_COLOR}
            strokeWidth={1.5}
          />
        )
      })}

      {/* Small teal dots at method-box end of each line */}
      {METHODS.map((_, i) => {
        const pos = METHOD_POSITIONS[i]
        const pt = boxEdgePoint(pos.x, pos.y, BOX_W, BOX_H, CX, CY)
        return <circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r={2.5} fill={TEAL} opacity={0.4} />
      })}

      {/* Central SVD box */}
      <rect
        x={CX - CENTER_W / 2}
        y={CY - CENTER_H / 2}
        width={CENTER_W}
        height={CENTER_H}
        rx={10}
        fill={TEAL}
      />
      <text
        x={CX}
        y={CY - 6}
        textAnchor="middle"
        fill="white"
        fontFamily="var(--font-serif)"
        fontWeight="700"
        fontSize={16}
      >
        SVD
      </text>
      <text
        x={CX}
        y={CY + 14}
        textAnchor="middle"
        fill="rgba(255,255,255,0.8)"
        fontFamily="var(--font-mono)"
        fontSize={12}
      >
        {"A = U\u03A3V\u1D40"}
      </text>

      {/* Method boxes */}
      {METHODS.map((m, i) => {
        const pos = METHOD_POSITIONS[i]
        const bx = pos.x - BOX_W / 2
        const by = pos.y - BOX_H / 2
        return (
          <g key={`method-${i}`}>
            <rect
              x={bx}
              y={by}
              width={BOX_W}
              height={BOX_H}
              rx={6}
              fill={BOX_FILL}
              stroke={BOX_STROKE}
              strokeWidth={1}
            />
            {/* Method name */}
            <text
              x={pos.x}
              y={by + 18}
              textAnchor="middle"
              fill={TEXT_DARK}
              fontFamily="var(--font-serif)"
              fontWeight="700"
              fontSize={12.5}
            >
              {m.name}
            </text>
            {/* Matrix line */}
            <text
              x={pos.x}
              y={by + 36}
              textAnchor="middle"
              fill={TEXT_MID}
              fontFamily="var(--font-mono)"
              fontSize={9.5}
            >
              <tspan fontFamily="var(--font-serif)" fontWeight="600" fontSize={9.5}>
                {"Matrix: "}
              </tspan>
              {m.matrix}
            </text>
            {/* Keep line — may need two lines for long text */}
            <text
              x={pos.x}
              y={by + 52}
              textAnchor="middle"
              fill={TEXT_MID}
              fontFamily="var(--font-mono)"
              fontSize={9.5}
            >
              <tspan fontFamily="var(--font-serif)" fontWeight="600" fontSize={9.5}>
                {"Keep: "}
              </tspan>
              {m.keep}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
