import React, { useState, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 800
const H = 450
const CX = 400
const CY = 200
const SCALE = 60

/* ─── Colors ─── */
const A_COL1 = "#3d6cb9"
const A_COL2 = "#4A90D9"
const B_COL1 = "#c0503a"
const B_COL2 = "#D4626E"
const PROD_COLOR = "#4A7C6F"
const FONT = "var(--font-mono, monospace)"

/* ─── Grid range ─── */
const GRID_MIN = -3
const GRID_MAX = 3
const SAMPLES = 21

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

/* ─── Matrix–vector multiply: M * [x, y] ─── */
function applyMatrix(col1, col2, x, y) {
  return [col1[0] * x + col2[0] * y, col1[1] * x + col2[1] * y]
}

/* ─── Compose two matrices: AB means first B then A ─── */
function composeColumns(colA1, colA2, colB1, colB2) {
  const prodCol1 = applyMatrix(colA1, colA2, colB1[0], colB1[1])
  const prodCol2 = applyMatrix(colA1, colA2, colB2[0], colB2[1])
  return { col1: prodCol1, col2: prodCol2 }
}

/* ─── Preset matrices ─── */
const PRESETS = [
  { label: "Identity", col1: [1, 0], col2: [0, 1] },
  {
    label: "Rot 30\u00b0",
    col1: [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)],
    col2: [-Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)],
  },
  { label: "Rot 90\u00b0", col1: [0, 1], col2: [-1, 0] },
  { label: "Shear", col1: [1, 0], col2: [0.5, 1] },
  { label: "Flip", col1: [1, 0], col2: [0, -1] },
  { label: "Scale", col1: [2, 0], col2: [0, 0.5] },
]

/* ─── Generate grid lines as polylines ─── */
function buildGridPolylines(col1, col2) {
  const lines = []
  const tValues = []
  for (let i = 0; i < SAMPLES; i++) {
    tValues.push(GRID_MIN + (i / (SAMPLES - 1)) * (GRID_MAX - GRID_MIN))
  }

  // Vertical grid lines: fixed x, sweep y
  for (let xi = GRID_MIN; xi <= GRID_MAX; xi++) {
    const pts = tValues.map((t) => {
      const [tx, ty] = applyMatrix(col1, col2, xi, t)
      return toSVG(tx, ty)
    })
    lines.push(pts)
  }

  // Horizontal grid lines: fixed y, sweep x
  for (let yi = GRID_MIN; yi <= GRID_MAX; yi++) {
    const pts = tValues.map((t) => {
      const [tx, ty] = applyMatrix(col1, col2, t, yi)
      return toSVG(tx, ty)
    })
    lines.push(pts)
  }

  return lines
}

/* ─── Format a number compactly ─── */
function fmt(n) {
  const s = n.toFixed(2)
  if (s === "-0.00") return "0.00"
  return s
}

/* ─── Matrix display as two-column text ─── */
function MatrixLabel({ col1, col2, color, label, x, y }) {
  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontSize="11"
        fontFamily={FONT}
        fill={color}
        fontWeight="600"
      >
        {label}
      </text>
      {/* Bracket and entries */}
      <text
        x={x}
        y={y + 16}
        textAnchor="middle"
        fontSize="11"
        fontFamily={FONT}
        fill={color}
      >
        {"[" + fmt(col1[0]) + "  " + fmt(col2[0]) + "]"}
      </text>
      <text
        x={x}
        y={y + 30}
        textAnchor="middle"
        fontSize="11"
        fontFamily={FONT}
        fill={color}
      >
        {"[" + fmt(col1[1]) + "  " + fmt(col2[1]) + "]"}
      </text>
    </g>
  )
}

/* ─── Preset button row for one matrix ─── */
function PresetRow({ label, color, activeCol1, activeCol2, onSelect }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.35rem" }}>
      <span
        style={{
          fontFamily: FONT,
          fontSize: "12px",
          color,
          fontWeight: 600,
          minWidth: "18px",
        }}
      >
        {label}:
      </span>
      {PRESETS.map((p) => {
        const isActive =
          Math.abs(p.col1[0] - activeCol1[0]) < 0.01 &&
          Math.abs(p.col1[1] - activeCol1[1]) < 0.01 &&
          Math.abs(p.col2[0] - activeCol2[0]) < 0.01 &&
          Math.abs(p.col2[1] - activeCol2[1]) < 0.01
        return (
          <button
            key={p.label}
            className="blog-figure__button"
            style={
              isActive ? { borderColor: PROD_COLOR, color: PROD_COLOR } : {}
            }
            onClick={() => onSelect(p.col1, p.col2)}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

export default function MatrixMultiplicationExplorer() {
  const [colA1, setColA1] = useState([
    Math.cos(Math.PI / 6),
    Math.sin(Math.PI / 6),
  ])
  const [colA2, setColA2] = useState([
    -Math.sin(Math.PI / 6),
    Math.cos(Math.PI / 6),
  ])
  const [colB1, setColB1] = useState([1, 0])
  const [colB2, setColB2] = useState([0.5, 1])
  const [order, setOrder] = useState("AB")

  /* ─── Compute product columns ─── */
  const product = useMemo(() => {
    if (order === "AB") {
      return composeColumns(colA1, colA2, colB1, colB2)
    }
    return composeColumns(colB1, colB2, colA1, colA2)
  }, [colA1, colA2, colB1, colB2, order])

  /* ─── Build transformed grid polylines ─── */
  const transformedGrid = useMemo(
    () => buildGridPolylines(product.col1, product.col2),
    [product]
  )

  /* ─── Identity reference grid ─── */
  const identityGrid = useMemo(
    () => buildGridPolylines([1, 0], [0, 1]),
    []
  )

  /* ─── Column vector endpoints for arrows ─── */
  const prodCol1SVG = toSVG(product.col1[0], product.col1[1])
  const prodCol2SVG = toSVG(product.col2[0], product.col2[1])

  /* ─── Check if AB !== BA ─── */
  const abProduct = useMemo(
    () => composeColumns(colA1, colA2, colB1, colB2),
    [colA1, colA2, colB1, colB2]
  )
  const baProduct = useMemo(
    () => composeColumns(colB1, colB2, colA1, colA2),
    [colA1, colA2, colB1, colB2]
  )
  const orderMatters = useMemo(() => {
    const diff =
      Math.abs(abProduct.col1[0] - baProduct.col1[0]) +
      Math.abs(abProduct.col1[1] - baProduct.col1[1]) +
      Math.abs(abProduct.col2[0] - baProduct.col2[0]) +
      Math.abs(abProduct.col2[1] - baProduct.col2[1])
    return diff > 0.01
  }, [abProduct, baProduct])

  const handleSelectA = useCallback((c1, c2) => {
    setColA1(c1)
    setColA2(c2)
  }, [])

  const handleSelectB = useCallback((c1, c2) => {
    setColB1(c1)
    setColB2(c2)
  }, [])

  const handleSwap = useCallback(() => {
    setOrder((prev) => (prev === "AB" ? "BA" : "AB"))
  }, [])

  /* ─── Polyline path helper ─── */
  const toPolyline = (pts) =>
    pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")

  /* ─── Display labels ─── */
  const firstLabel = order === "AB" ? "B" : "A"
  const secondLabel = order === "AB" ? "A" : "B"
  const orderLabel = order === "AB" ? "AB" : "BA"

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          userSelect: "none",
        }}
      >
        <defs>
          <clipPath id="mm-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          <marker
            id="mm-prod1"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PROD_COLOR} />
          </marker>
          <marker
            id="mm-prod2"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PROD_COLOR} opacity="0.7" />
          </marker>
        </defs>

        {/* Identity reference grid (very faint) */}
        <g clipPath="url(#mm-clip)">
          {identityGrid.map((pts, i) => (
            <polyline
              key={`id-${i}`}
              points={toPolyline(pts)}
              fill="none"
              stroke="rgba(0,0,0,0.04)"
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Transformed grid */}
        <g clipPath="url(#mm-clip)">
          {transformedGrid.map((pts, i) => (
            <polyline
              key={`tr-${i}`}
              points={toPolyline(pts)}
              fill="none"
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="0.7"
            />
          ))}
        </g>

        {/* Axes */}
        <line
          x1={0}
          y1={CY}
          x2={W}
          y2={CY}
          stroke="rgba(0,0,0,0.06)"
        />
        <line
          x1={CX}
          y1={0}
          x2={CX}
          y2={H}
          stroke="rgba(0,0,0,0.06)"
        />

        {/* Product column vector 1 */}
        <line
          x1={CX}
          y1={CY}
          x2={prodCol1SVG[0]}
          y2={prodCol1SVG[1]}
          stroke={PROD_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#mm-prod1)"
        />
        <text
          x={prodCol1SVG[0] + 10}
          y={prodCol1SVG[1] - 8}
          fontSize="12"
          fontFamily={FONT}
          fill={PROD_COLOR}
          fontWeight="600"
        >
          {orderLabel + " e\u2081"}
        </text>

        {/* Product column vector 2 */}
        <line
          x1={CX}
          y1={CY}
          x2={prodCol2SVG[0]}
          y2={prodCol2SVG[1]}
          stroke={PROD_COLOR}
          strokeWidth="2"
          opacity="0.7"
          markerEnd="url(#mm-prod2)"
        />
        <text
          x={prodCol2SVG[0] + 10}
          y={prodCol2SVG[1] - 8}
          fontSize="12"
          fontFamily={FONT}
          fill={PROD_COLOR}
          fontWeight="600"
          opacity="0.8"
        >
          {orderLabel + " e\u2082"}
        </text>

        {/* Origin dot */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Matrix display: A, B, and product */}
        <MatrixLabel
          col1={colA1}
          col2={colA2}
          color={A_COL1}
          label="A"
          x={60}
          y={24}
        />
        <MatrixLabel
          col1={colB1}
          col2={colB2}
          color={B_COL1}
          label="B"
          x={180}
          y={24}
        />

        {/* Equals sign */}
        <text
          x={260}
          y={40}
          textAnchor="middle"
          fontSize="14"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {"="}
        </text>

        <MatrixLabel
          col1={product.col1}
          col2={product.col2}
          color={PROD_COLOR}
          label={orderLabel}
          x={330}
          y={24}
        />

        {/* Composition order annotation */}
        <text
          x={W - 16}
          y={H - 14}
          textAnchor="end"
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.25)"
        >
          {"first " + firstLabel + ", then " + secondLabel}
        </text>

        {/* Non-commutativity indicator */}
        {orderMatters && (
          <text
            x={W - 16}
            y={H - 30}
            textAnchor="end"
            fontSize="10"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.3)"
          >
            {"AB \u2260 BA"}
          </text>
        )}
      </svg>

      {/* Controls */}
      <div
        className="blog-figure__controls"
        style={{
          flexDirection: "column",
          gap: "0.5rem",
          alignItems: "flex-start",
        }}
      >
        <PresetRow
          label="A"
          color={A_COL1}
          activeCol1={colA1}
          activeCol2={colA2}
          onSelect={handleSelectA}
        />
        <PresetRow
          label="B"
          color={B_COL1}
          activeCol1={colB1}
          activeCol2={colB2}
          onSelect={handleSelectB}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <button
            className="blog-figure__button"
            style={{ borderColor: PROD_COLOR, color: PROD_COLOR }}
            onClick={handleSwap}
          >
            Swap order
          </button>
          <span
            style={{
              fontFamily: FONT,
              fontSize: "12px",
              color: "rgba(0,0,0,0.45)",
            }}
          >
            {"showing " + orderLabel + " = first " + firstLabel + ", then " + secondLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
