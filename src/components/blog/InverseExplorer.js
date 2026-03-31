import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = W / 2
const CY = H / 2
const SCALE = 70

const COL1_COLOR = "#3d6cb9"
const COL2_COLOR = "#c0503a"
const TEAL = "rgba(74, 124, 111, 1)"
const SINGULAR_COLOR = "rgba(217, 83, 79, 1)"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 7

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

export default function InverseExplorer() {
  const [col1, setCol1] = useState([1.8, 0.5])
  const [col2, setCol2] = useState([-0.3, 1.5])
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)

  /* ─── Determinant ─── */
  const det = useMemo(
    () => col1[0] * col2[1] - col1[1] * col2[0],
    [col1, col2]
  )

  const absDet = Math.abs(det)
  const isSingular = absDet < 0.1

  /* ─── Parallelogram vertices ─── */
  const paraVerts = useMemo(() => {
    const o = toSVG(0, 0)
    const c1 = toSVG(col1[0], col1[1])
    const sum = toSVG(col1[0] + col2[0], col1[1] + col2[1])
    const c2 = toSVG(col2[0], col2[1])
    return `${o[0]},${o[1]} ${c1[0]},${c1[1]} ${sum[0]},${sum[1]} ${c2[0]},${c2[1]}`
  }, [col1, col2])

  /* ─── Unit square vertices (identity) ─── */
  const unitSquareVerts = useMemo(() => {
    const o = toSVG(0, 0)
    const e1 = toSVG(1, 0)
    const e12 = toSVG(1, 1)
    const e2 = toSVG(0, 1)
    return `${o[0]},${o[1]} ${e1[0]},${e1[1]} ${e12[0]},${e12[1]} ${e2[0]},${e2[1]}`
  }, [])

  /* ─── Parallelogram fill ─── */
  const paraFill = useMemo(() => {
    if (isSingular) return "rgba(217, 83, 79, 0.15)"
    // opacity proportional to |det|, clamped to [0.06, 0.35]
    const opacity = Math.min(0.35, Math.max(0.06, absDet * 0.12))
    return `rgba(74, 124, 111, ${opacity.toFixed(3)})`
  }, [absDet, isSingular])

  const paraStroke = useMemo(() => {
    if (isSingular) return "rgba(217, 83, 79, 0.5)"
    const opacity = Math.min(0.6, Math.max(0.15, absDet * 0.2))
    return `rgba(74, 124, 111, ${opacity.toFixed(2)})`
  }, [absDet, isSingular])

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

  /* ─── SVG coordinates ─── */
  const col1SVG = toSVG(col1[0], col1[1])
  const col2SVG = toSVG(col2[0], col2[1])

  /* ─── Readout colors ─── */
  const detColor = isSingular ? "rgba(217, 83, 79, 1)" : TEAL
  const labelText = isSingular ? "singular" : "invertible"

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
            id="inv-col1"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL1_COLOR} />
          </marker>
          <marker
            id="inv-col2"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL2_COLOR} />
          </marker>
        </defs>

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

        {/* Unit square (identity, dashed) */}
        <polygon
          points={unitSquareVerts}
          fill="rgba(0,0,0,0.04)"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
          strokeDasharray="4,3"
        />

        {/* Parallelogram (image of unit square under [col1 | col2]) */}
        <polygon
          points={paraVerts}
          fill={paraFill}
          stroke={paraStroke}
          strokeWidth="1.5"
        />

        {/* Vector col1 */}
        <line
          x1={CX}
          y1={CY}
          x2={col1SVG[0]}
          y2={col1SVG[1]}
          stroke={COL1_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#inv-col1)"
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
          fontSize="14"
          fontFamily={FONT}
          fill={COL1_COLOR}
          fontWeight="600"
        >
          c₁
        </text>

        {/* Vector col2 */}
        <line
          x1={CX}
          y1={CY}
          x2={col2SVG[0]}
          y2={col2SVG[1]}
          stroke={COL2_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#inv-col2)"
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
          fontSize="14"
          fontFamily={FONT}
          fill={COL2_COLOR}
          fontWeight="600"
        >
          c₂
        </text>

        {/* Origin */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Determinant readout */}
        <text
          x={W - 16}
          y={28}
          textAnchor="end"
          fontSize="18"
          fontFamily={FONT}
          fill={detColor}
          fontWeight="600"
        >
          {"det = " + det.toFixed(2)}
        </text>
        <text
          x={W - 16}
          y={50}
          textAnchor="end"
          fontSize="12"
          fontFamily={FONT}
          fill={detColor}
        >
          {labelText}
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
