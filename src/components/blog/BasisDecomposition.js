import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = W / 2
const CY = H / 2
const SCALE = 55

const B1_COLOR = "#D4626E"
const B2_COLOR = "#4A90D9"
const V_COLOR = "rgba(0,0,0,0.75)"
const TEAL = "#4A7C6F"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 7

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

/* ─── 2×2 solve: c1*b1 + c2*b2 = v ─── */
function solveCoords(b1, b2, v) {
  const det = b1[0] * b2[1] - b1[1] * b2[0]
  if (Math.abs(det) < 1e-8) return null
  const c1 = (v[0] * b2[1] - v[1] * b2[0]) / det
  const c2 = (b1[0] * v[1] - b1[1] * v[0]) / det
  return [c1, c2]
}

export default function BasisDecomposition() {
  const [b1, setB1] = useState([1.8, 0.8])
  const [b2, setB2] = useState([-0.4, 1.6])
  const [showGrid, setShowGrid] = useState(false)
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)

  // Fixed target vector
  const v = [3, 2]

  /* ─── Coordinates of v in the {b1, b2} basis ─── */
  const coords = useMemo(() => solveCoords(b1, b2, v), [b1, b2])

  /* ─── Independence measure ─── */
  const angle = useMemo(() => {
    const l1 = Math.hypot(b1[0], b1[1])
    const l2 = Math.hypot(b2[0], b2[1])
    if (l1 < 0.01 || l2 < 0.01) return 0
    const dot = b1[0] * b2[0] + b1[1] * b2[1]
    return Math.acos(Math.max(-1, Math.min(1, dot / (l1 * l2))))
  }, [b1, b2])
  const independence = Math.abs(Math.sin(angle))

  /* ─── Grid lines ─── */
  const gridLines = useMemo(() => {
    if (!showGrid || independence < 0.02) return []
    const lines = []
    const N = 5
    for (let i = -N; i <= N; i++) {
      const [ax, ay] = toSVG(
        i * b2[0] - N * b1[0],
        i * b2[1] - N * b1[1]
      )
      const [bx, by] = toSVG(
        i * b2[0] + N * b1[0],
        i * b2[1] + N * b1[1]
      )
      lines.push({ x1: ax, y1: ay, x2: bx, y2: by })
      const [cx, cy] = toSVG(
        i * b1[0] - N * b2[0],
        i * b1[1] - N * b2[1]
      )
      const [dx, dy] = toSVG(
        i * b1[0] + N * b2[0],
        i * b1[1] + N * b2[1]
      )
      lines.push({ x1: cx, y1: cy, x2: dx, y2: dy })
    }
    return lines
  }, [b1, b2, showGrid, independence])

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
      if (dragging === "b1") setB1([mx, my])
      else if (dragging === "b2") setB2([mx, my])
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(null), [])

  /* ─── SVG positions ─── */
  const b1SVG = toSVG(b1[0], b1[1])
  const b2SVG = toSVG(b2[0], b2[1])
  const vSVG = toSVG(v[0], v[1])

  // Decomposition parallelogram: origin → c1*b1 → v, origin → c2*b2 → v
  const c1b1SVG = coords
    ? toSVG(coords[0] * b1[0], coords[0] * b1[1])
    : null
  const c2b2SVG = coords
    ? toSVG(coords[1] * b2[0], coords[1] * b2[1])
    : null

  const isDegenerate = independence < 0.05

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
          <clipPath id="bd-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          <marker
            id="bd-b1"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={B1_COLOR} />
          </marker>
          <marker
            id="bd-b2"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={B2_COLOR} />
          </marker>
          <marker
            id="bd-v"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={V_COLOR} />
          </marker>
        </defs>

        {/* Grid lines */}
        {showGrid && (
          <g clipPath="url(#bd-clip)" opacity={independence * 0.6}>
            {gridLines.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="rgba(0,0,0,0.08)"
                strokeWidth="0.5"
              />
            ))}
          </g>
        )}

        {/* Coordinate axes (very faint) */}
        <line
          x1={0}
          y1={CY}
          x2={W}
          y2={CY}
          stroke="rgba(0,0,0,0.05)"
        />
        <line
          x1={CX}
          y1={0}
          x2={CX}
          y2={H}
          stroke="rgba(0,0,0,0.05)"
        />

        {/* Decomposition parallelogram */}
        {coords && !isDegenerate && (
          <>
            {/* c1*b1 component (along b1 direction) */}
            <line
              x1={CX}
              y1={CY}
              x2={c1b1SVG[0]}
              y2={c1b1SVG[1]}
              stroke={B1_COLOR}
              strokeWidth="1.5"
              strokeDasharray="5,3"
              opacity="0.5"
            />
            {/* From c1*b1 to v (along b2 direction) */}
            <line
              x1={c1b1SVG[0]}
              y1={c1b1SVG[1]}
              x2={vSVG[0]}
              y2={vSVG[1]}
              stroke={B2_COLOR}
              strokeWidth="1.5"
              strokeDasharray="5,3"
              opacity="0.5"
            />
            {/* c2*b2 component (along b2 direction) */}
            <line
              x1={CX}
              y1={CY}
              x2={c2b2SVG[0]}
              y2={c2b2SVG[1]}
              stroke={B2_COLOR}
              strokeWidth="1"
              strokeDasharray="5,3"
              opacity="0.3"
            />
            {/* From c2*b2 to v (along b1 direction) */}
            <line
              x1={c2b2SVG[0]}
              y1={c2b2SVG[1]}
              x2={vSVG[0]}
              y2={vSVG[1]}
              stroke={B1_COLOR}
              strokeWidth="1"
              strokeDasharray="5,3"
              opacity="0.3"
            />

            {/* Component labels */}
            <text
              x={(CX + c1b1SVG[0]) / 2}
              y={(CY + c1b1SVG[1]) / 2 - 8}
              textAnchor="middle"
              fontSize="11"
              fontFamily={FONT}
              fill={B1_COLOR}
              opacity="0.7"
            >
              {coords[0].toFixed(2) + " b\u2081"}
            </text>
            <text
              x={(c1b1SVG[0] + vSVG[0]) / 2 + 10}
              y={(c1b1SVG[1] + vSVG[1]) / 2}
              textAnchor="start"
              fontSize="11"
              fontFamily={FONT}
              fill={B2_COLOR}
              opacity="0.7"
            >
              {coords[1].toFixed(2) + " b\u2082"}
            </text>
          </>
        )}

        {/* Basis vector b1 */}
        <line
          x1={CX}
          y1={CY}
          x2={b1SVG[0]}
          y2={b1SVG[1]}
          stroke={B1_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#bd-b1)"
        />
        <circle
          cx={b1SVG[0]}
          cy={b1SVG[1]}
          r={HANDLE_R}
          fill={B1_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown("b1")}
        />
        <text
          x={b1SVG[0] + 12}
          y={b1SVG[1] - 10}
          fontSize="14"
          fontFamily={FONT}
          fill={B1_COLOR}
          fontWeight="600"
        >
          b{"\u2081"}
        </text>

        {/* Basis vector b2 */}
        <line
          x1={CX}
          y1={CY}
          x2={b2SVG[0]}
          y2={b2SVG[1]}
          stroke={B2_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#bd-b2)"
        />
        <circle
          cx={b2SVG[0]}
          cy={b2SVG[1]}
          r={HANDLE_R}
          fill={B2_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown("b2")}
        />
        <text
          x={b2SVG[0] + 12}
          y={b2SVG[1] - 10}
          fontSize="14"
          fontFamily={FONT}
          fill={B2_COLOR}
          fontWeight="600"
        >
          b{"\u2082"}
        </text>

        {/* Target vector v (fixed) */}
        <line
          x1={CX}
          y1={CY}
          x2={vSVG[0]}
          y2={vSVG[1]}
          stroke={V_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#bd-v)"
        />
        <circle
          cx={vSVG[0]}
          cy={vSVG[1]}
          r="5"
          fill={V_COLOR}
        />
        <text
          x={vSVG[0] + 10}
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

        {/* Coordinate readout */}
        <g>
          <text
            x={W - 16}
            y={32}
            textAnchor="end"
            fontSize="13"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.5)"
          >
            coordinates of v
          </text>
          {coords && !isDegenerate ? (
            <>
              <text
                x={W - 16}
                y={52}
                textAnchor="end"
                fontSize="14"
                fontFamily={FONT}
                fill={B1_COLOR}
                fontWeight="600"
              >
                {"c\u2081 = " + coords[0].toFixed(2)}
              </text>
              <text
                x={W - 16}
                y={72}
                textAnchor="end"
                fontSize="14"
                fontFamily={FONT}
                fill={B2_COLOR}
                fontWeight="600"
              >
                {"c\u2082 = " + coords[1].toFixed(2)}
              </text>
            </>
          ) : (
            <text
              x={W - 16}
              y={52}
              textAnchor="end"
              fontSize="12"
              fontFamily={FONT}
              fill="#d9534f"
            >
              basis is degenerate
            </text>
          )}
        </g>

        {/* Drag hint */}
        {!dragging && (
          <text
            x={W / 2}
            y={H - 10}
            textAnchor="middle"
            fontSize="10"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.2)"
          >
            drag basis vectors — target v stays fixed
          </text>
        )}
      </svg>

      {/* Controls */}
      <div
        className="blog-figure__controls"
        style={{ justifyContent: "center", gap: "1rem" }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: "12px",
            color: "rgba(0,0,0,0.5)",
          }}
        >
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            style={{ accentColor: TEAL }}
          />
          Show grid
        </label>
        <button
          className="blog-figure__button"
          onClick={() => {
            setB1([1, 0])
            setB2([0, 1])
          }}
        >
          Standard basis
        </button>
        <button
          className="blog-figure__button"
          onClick={() => {
            // Orthonormalize current basis via Gram-Schmidt
            const l1 = Math.hypot(b1[0], b1[1])
            if (l1 < 0.01) return
            const e1 = [b1[0] / l1, b1[1] / l1]
            // Perpendicular to e1
            const e2 = [-e1[1], e1[0]]
            setB1(e1)
            setB2(e2)
          }}
        >
          Orthonormalize
        </button>
      </div>
    </div>
  )
}
