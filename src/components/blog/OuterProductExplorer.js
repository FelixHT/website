import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 350
const CX = 180
const CY = 175
const SCALE = 55

const HEATMAP_CX = 520
const HEATMAP_CY = 175
const CELL = 60

const U_COLOR = "#3d6cb9"
const V_COLOR = "#c0503a"
const TEAL = [74, 124, 111]
const ORANGE = [192, 80, 58]
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 7

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

/* ─── Color interpolation ─── */
function cellColor(value, maxAbs) {
  if (maxAbs < 0.001) return "rgba(255,255,255,0)"
  const t = Math.min(Math.abs(value) / maxAbs, 1)
  const rgb = value >= 0 ? TEAL : ORANGE
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(t * 0.7).toFixed(3)})`
}

/* ─── Subscript labels ─── */
const ENTRY_LABELS = [
  ["u\u2081v\u2081", "u\u2081v\u2082"],
  ["u\u2082v\u2081", "u\u2082v\u2082"],
]

export default function OuterProductExplorer() {
  const [u, setU] = useState([1.5, 1.0])
  const [v, setV] = useState([1.2, -0.8])
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)

  /* ─── Derived values ─── */
  const matrix = useMemo(() => {
    return [
      [u[0] * v[0], u[0] * v[1]],
      [u[1] * v[0], u[1] * v[1]],
    ]
  }, [u, v])

  const maxAbs = useMemo(() => {
    return Math.max(
      Math.abs(matrix[0][0]),
      Math.abs(matrix[0][1]),
      Math.abs(matrix[1][0]),
      Math.abs(matrix[1][1]),
      0.001
    )
  }, [matrix])

  /* ─── Pointer handlers ─── */
  const handlePointerDown = useCallback(
    (which) => (e) => {
      e.target.setPointerCapture(e.pointerId)
      setDragging(which)
    },
    []
  )

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging) return
      const svg = svgRef.current
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const sp = pt.matrixTransform(svg.getScreenCTM().inverse())
      const [mx, my] = fromSVG(sp.x, sp.y)
      if (dragging === "u") setU([mx, my])
      else setV([mx, my])
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(null), [])

  /* ─── SVG positions ─── */
  const uSVG = toSVG(u[0], u[1])
  const vSVG = toSVG(v[0], v[1])

  /* ─── Heatmap cell positions (row, col) ─── */
  const cellX = (col) => HEATMAP_CX - CELL + col * CELL
  const cellY = (row) => HEATMAP_CY - CELL + row * CELL

  return (
    <div style={{ width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          cursor: dragging ? "grabbing" : "default",
          userSelect: "none",
          touchAction: "none",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <marker
            id="op-arrow-u"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={U_COLOR} />
          </marker>
          <marker
            id="op-arrow-v"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={V_COLOR} />
          </marker>
        </defs>

        {/* ═══ Left side: 2D plane ═══ */}

        {/* Axes */}
        <line
          x1={20}
          y1={CY}
          x2={340}
          y2={CY}
          stroke="rgba(0,0,0,0.06)"
        />
        <line
          x1={CX}
          y1={20}
          x2={CX}
          y2={H - 20}
          stroke="rgba(0,0,0,0.06)"
        />

        {/* Vector u */}
        <line
          x1={CX}
          y1={CY}
          x2={uSVG[0]}
          y2={uSVG[1]}
          stroke={U_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#op-arrow-u)"
        />
        <circle
          cx={uSVG[0]}
          cy={uSVG[1]}
          r={HANDLE_R}
          fill={U_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown("u")}
        />
        <text
          x={uSVG[0] + 12}
          y={uSVG[1] - 10}
          fontSize="14"
          fontFamily={FONT}
          fill={U_COLOR}
          fontWeight="600"
        >
          u
        </text>

        {/* Vector v */}
        <line
          x1={CX}
          y1={CY}
          x2={vSVG[0]}
          y2={vSVG[1]}
          stroke={V_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#op-arrow-v)"
        />
        <circle
          cx={vSVG[0]}
          cy={vSVG[1]}
          r={HANDLE_R}
          fill={V_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown("v")}
        />
        <text
          x={vSVG[0] + 12}
          y={vSVG[1] - 10}
          fontSize="14"
          fontFamily={FONT}
          fill={V_COLOR}
          fontWeight="600"
        >
          v
        </text>

        {/* Origin */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Vector readout */}
        <text
          x={30}
          y={H - 22}
          fontSize="11"
          fontFamily={FONT}
          fill={U_COLOR}
          opacity="0.7"
        >
          {"u = (" + u[0].toFixed(1) + ", " + u[1].toFixed(1) + ")"}
        </text>
        <text
          x={30}
          y={H - 8}
          fontSize="11"
          fontFamily={FONT}
          fill={V_COLOR}
          opacity="0.7"
        >
          {"v = (" + v[0].toFixed(1) + ", " + v[1].toFixed(1) + ")"}
        </text>

        {/* ═══ Right side: heatmap matrix ═══ */}

        {/* Title */}
        <text
          x={HEATMAP_CX}
          y={HEATMAP_CY - CELL - 28}
          textAnchor="middle"
          fontSize="13"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.5)"
        >
          {"uv\u1D40"}
        </text>

        {/* Row labels (u components) */}
        <text
          x={cellX(0) - 10}
          y={cellY(0) + CELL / 2 + 4}
          textAnchor="end"
          fontSize="11"
          fontFamily={FONT}
          fill={U_COLOR}
          opacity="0.7"
        >
          {"u\u2081"}
        </text>
        <text
          x={cellX(0) - 10}
          y={cellY(1) + CELL / 2 + 4}
          textAnchor="end"
          fontSize="11"
          fontFamily={FONT}
          fill={U_COLOR}
          opacity="0.7"
        >
          {"u\u2082"}
        </text>

        {/* Column labels (v components) */}
        <text
          x={cellX(0) + CELL / 2}
          y={cellY(0) - 6}
          textAnchor="middle"
          fontSize="11"
          fontFamily={FONT}
          fill={V_COLOR}
          opacity="0.7"
        >
          {"v\u2081"}
        </text>
        <text
          x={cellX(1) + CELL / 2}
          y={cellY(0) - 6}
          textAnchor="middle"
          fontSize="11"
          fontFamily={FONT}
          fill={V_COLOR}
          opacity="0.7"
        >
          {"v\u2082"}
        </text>

        {/* Heatmap cells */}
        {[0, 1].map((row) =>
          [0, 1].map((col) => {
            const val = matrix[row][col]
            const x = cellX(col)
            const y = cellY(row)
            const bg = cellColor(val, maxAbs)
            return (
              <g key={`${row}-${col}`}>
                {/* Cell background */}
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  fill={bg}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="1"
                  rx="3"
                />

                {/* Entry label (u_i v_j) */}
                <text
                  x={x + CELL / 2}
                  y={y + 16}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily={FONT}
                  fill="rgba(0,0,0,0.3)"
                >
                  {ENTRY_LABELS[row][col]}
                </text>

                {/* Numerical value */}
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 8}
                  textAnchor="middle"
                  fontSize="15"
                  fontFamily={FONT}
                  fontWeight="600"
                  fill={
                    Math.abs(val) / maxAbs > 0.5
                      ? "rgba(0,0,0,0.75)"
                      : "rgba(0,0,0,0.55)"
                  }
                >
                  {val.toFixed(2)}
                </text>
              </g>
            )
          })
        )}

        {/* Bracket decorations for matrix */}
        <path
          d={`M ${cellX(0) - 3} ${cellY(0) + 4}
              Q ${cellX(0) - 6} ${cellY(0) + 4} ${cellX(0) - 6} ${cellY(0) + 8}
              L ${cellX(0) - 6} ${cellY(1) + CELL - 8}
              Q ${cellX(0) - 6} ${cellY(1) + CELL - 4} ${cellX(0) - 3} ${cellY(1) + CELL - 4}`}
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1.5"
        />
        <path
          d={`M ${cellX(1) + CELL + 3} ${cellY(0) + 4}
              Q ${cellX(1) + CELL + 6} ${cellY(0) + 4} ${cellX(1) + CELL + 6} ${cellY(0) + 8}
              L ${cellX(1) + CELL + 6} ${cellY(1) + CELL - 8}
              Q ${cellX(1) + CELL + 6} ${cellY(1) + CELL - 4} ${cellX(1) + CELL + 3} ${cellY(1) + CELL - 4}`}
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1.5"
        />

        {/* Drag hint */}
        {!dragging && (
          <text
            x={CX}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.2)"
          >
            drag arrow tips to move vectors
          </text>
        )}
      </svg>
    </div>
  )
}
