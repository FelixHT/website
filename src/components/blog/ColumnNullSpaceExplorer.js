import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = W / 2
const CY = H / 2
const SCALE = 70

const COL1_COLOR = "#3d6cb9"
const COL2_COLOR = "#4A7C6F"
const COLSPACE_FILL = "rgba(74, 164, 100, 0.08)"
const COLSPACE_STROKE = "#4AA464"
const NULL_COLOR = "#D4A03C"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 7
const SINGULAR_THRESHOLD = 0.15

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

export default function ColumnNullSpaceExplorer() {
  const [col1, setCol1] = useState([1.8, 0.7])
  const [col2, setCol2] = useState([0.5, 1.6])
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)

  /* ─── Derived values ─── */
  const derived = useMemo(() => {
    const det = col1[0] * col2[1] - col1[1] * col2[0]
    const len1 = Math.hypot(col1[0], col1[1])
    const len2 = Math.hypot(col2[0], col2[1])
    const productLen = len1 * len2
    const normalizedDet = productLen > 0.001 ? Math.abs(det) / productLen : 0
    const nearSingular = normalizedDet < SINGULAR_THRESHOLD

    // Column space direction: use whichever column is longer when near-singular
    const dir = len1 >= len2 ? col1 : col2
    const dirLen = Math.hypot(dir[0], dir[1])
    const colDir =
      dirLen > 0.01 ? [dir[0] / dirLen, dir[1] / dirLen] : [1, 0]

    // Null space direction: perpendicular to column space
    const nullDir = [-colDir[1], colDir[0]]

    // Smooth transition factor: 1 = fully rank-2, 0 = fully rank-1
    // Uses a smooth ramp around the threshold
    const t = Math.min(1, Math.max(0, normalizedDet / SINGULAR_THRESHOLD))
    const rankBlend = t * t * (3 - 2 * t) // smoothstep

    return { det, len1, len2, normalizedDet, nearSingular, colDir, nullDir, rankBlend }
  }, [col1, col2])

  const { det, nearSingular, colDir, nullDir, rankBlend } = derived

  /* ─── Column space line (visible when near-singular) ─── */
  const colSpaceLine = useMemo(() => {
    const ext = 600
    return {
      x1: CX - colDir[0] * ext,
      y1: CY + colDir[1] * ext,
      x2: CX + colDir[0] * ext,
      y2: CY - colDir[1] * ext,
    }
  }, [colDir])

  /* ─── Null space line (visible when near-singular) ─── */
  const nullSpaceLine = useMemo(() => {
    const ext = 600
    return {
      x1: CX - nullDir[0] * ext,
      y1: CY + nullDir[1] * ext,
      x2: CX + nullDir[0] * ext,
      y2: CY - nullDir[1] * ext,
    }
  }, [nullDir])

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
      if (dragging === "col1") setCol1([mx, my])
      else setCol2([mx, my])
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(null), [])

  /* ─── SVG positions ─── */
  const col1SVG = toSVG(col1[0], col1[1])
  const col2SVG = toSVG(col2[0], col2[1])

  /* ─── Readout strings ─── */
  const rankLabel = nearSingular ? "rank = 1" : "rank = 2"
  const detLabel = "det = " + det.toFixed(2)
  const statusLabel = nearSingular
    ? "column space is a line"
    : "column space = \u211D\u00B2"

  /* ─── Opacity for rank-1 visuals (column space line, null space) ─── */
  const singularOpacity = Math.max(0, 1 - rankBlend)

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
          <clipPath id="colnull-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          <marker
            id="colnull-c1"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL1_COLOR} />
          </marker>
          <marker
            id="colnull-c2"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL2_COLOR} />
          </marker>
        </defs>

        {/* Column space full-plane tint (rank 2) */}
        <rect
          x="0"
          y="0"
          width={W}
          height={H}
          fill={COLSPACE_FILL}
          opacity={rankBlend}
        />

        {/* Column space line (rank 1) */}
        <line
          x1={colSpaceLine.x1}
          y1={colSpaceLine.y1}
          x2={colSpaceLine.x2}
          y2={colSpaceLine.y2}
          stroke={COLSPACE_STROKE}
          strokeWidth="4"
          opacity={singularOpacity * 0.55}
          clipPath="url(#colnull-clip)"
        />

        {/* Null space line (rank 1) */}
        <line
          x1={nullSpaceLine.x1}
          y1={nullSpaceLine.y1}
          x2={nullSpaceLine.x2}
          y2={nullSpaceLine.y2}
          stroke={NULL_COLOR}
          strokeWidth="2.5"
          strokeDasharray="8,5"
          opacity={singularOpacity * 0.6}
          clipPath="url(#colnull-clip)"
        />

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

        {/* Column vector 1 */}
        <line
          x1={CX}
          y1={CY}
          x2={col1SVG[0]}
          y2={col1SVG[1]}
          stroke={COL1_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#colnull-c1)"
        />
        <circle
          cx={col1SVG[0]}
          cy={col1SVG[1]}
          r={HANDLE_R}
          fill={COL1_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown("col1")}
        />
        <text
          x={col1SVG[0] + 12}
          y={col1SVG[1] - 10}
          fontSize="13"
          fontFamily={FONT}
          fill={COL1_COLOR}
          fontWeight="600"
        >
          col1
        </text>

        {/* Column vector 2 */}
        <line
          x1={CX}
          y1={CY}
          x2={col2SVG[0]}
          y2={col2SVG[1]}
          stroke={COL2_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#colnull-c2)"
        />
        <circle
          cx={col2SVG[0]}
          cy={col2SVG[1]}
          r={HANDLE_R}
          fill={COL2_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown("col2")}
        />
        <text
          x={col2SVG[0] + 12}
          y={col2SVG[1] - 10}
          fontSize="13"
          fontFamily={FONT}
          fill={COL2_COLOR}
          fontWeight="600"
        >
          col2
        </text>

        {/* Null space label (appears near the null line when rank 1) */}
        {singularOpacity > 0.05 && (
          <text
            x={CX + nullDir[0] * 120}
            y={CY - nullDir[1] * 120}
            textAnchor="middle"
            fontSize="11"
            fontFamily={FONT}
            fill={NULL_COLOR}
            opacity={singularOpacity * 0.8}
          >
            null space
          </text>
        )}

        {/* Column space label on line (appears when rank 1) */}
        {singularOpacity > 0.05 && (
          <text
            x={CX + colDir[0] * 160}
            y={CY - colDir[1] * 160 - 10}
            textAnchor="middle"
            fontSize="11"
            fontFamily={FONT}
            fill={COLSPACE_STROKE}
            opacity={singularOpacity * 0.8}
          >
            col space
          </text>
        )}

        {/* Origin */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Readouts (top-right) */}
        <text
          x={W - 16}
          y={24}
          textAnchor="end"
          fontSize="13"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.55)"
        >
          {rankLabel}
        </text>
        <text
          x={W - 16}
          y={42}
          textAnchor="end"
          fontSize="13"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.45)"
        >
          {detLabel}
        </text>
        <text
          x={W - 16}
          y={60}
          textAnchor="end"
          fontSize="11"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.3)"
        >
          {statusLabel}
        </text>

        {/* Matrix display (top-left) */}
        <text
          x={16}
          y={24}
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {"A = ["}
        </text>
        <text
          x={16 + 36}
          y={24}
          fontSize="12"
          fontFamily={FONT}
          fill={COL1_COLOR}
        >
          {col1[0].toFixed(1)}
        </text>
        <text
          x={16 + 72}
          y={24}
          fontSize="12"
          fontFamily={FONT}
          fill={COL2_COLOR}
        >
          {col2[0].toFixed(1)}
        </text>
        <text
          x={16 + 108}
          y={24}
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {"]"}
        </text>
        <text
          x={16}
          y={40}
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {"  ["}
        </text>
        <text
          x={16 + 36}
          y={40}
          fontSize="12"
          fontFamily={FONT}
          fill={COL1_COLOR}
        >
          {col1[1].toFixed(1)}
        </text>
        <text
          x={16 + 72}
          y={40}
          fontSize="12"
          fontFamily={FONT}
          fill={COL2_COLOR}
        >
          {col2[1].toFixed(1)}
        </text>
        <text
          x={16 + 108}
          y={40}
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {"]"}
        </text>

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
            drag arrow tips to move column vectors
          </text>
        )}
      </svg>
    </div>
  )
}
