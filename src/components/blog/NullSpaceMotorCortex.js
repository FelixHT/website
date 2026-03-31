import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 380
const CX = 300
const CY = 190
const SCALE = 60

/* ─── Decoder matrix A = [0.8, 0.6] ─── */
const A = [0.8, 0.6]
const A_NORM = Math.hypot(A[0], A[1]) // 1.0
const ROW_DIR = [A[0] / A_NORM, A[1] / A_NORM] // output direction (normalized)
const NULL_DIR = [-A[1] / A_NORM, A[0] / A_NORM] // null-space direction (perpendicular)

/* ─── Colors ─── */
const OUTPUT_COLOR = "#4A7C6F"
const NULL_COLOR = "#D4A03C"
const POINT_COLOR = "#333"
const AXIS_COLOR = "rgba(0,0,0,0.06)"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 8

/* ─── Output bar layout ─── */
const BAR_X = 620
const BAR_Y = 60
const BAR_H = 260
const BAR_W = 24
const BAR_MAX = 4 // output range: -BAR_MAX to +BAR_MAX

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

export default function NullSpaceMotorCortex() {
  const [state, setState] = useState([2.5, 0.5])
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef(null)

  /* ─── Derived values ─── */
  const derived = useMemo(() => {
    const x = state[0]
    const y = state[1]

    // Decoded output: y = A * x = 0.8*x1 + 0.6*x2
    const output = A[0] * x + A[1] * y

    // Projection of state onto the output (row-space) direction
    const projScalar = x * ROW_DIR[0] + y * ROW_DIR[1]
    const projX = projScalar * ROW_DIR[0]
    const projY = projScalar * ROW_DIR[1]

    return { output, projX, projY, projScalar }
  }, [state])

  const { output, projX, projY } = derived

  /* ─── Direction lines (extend across the viewport) ─── */
  const lines = useMemo(() => {
    const ext = 600
    return {
      row: {
        x1: CX - ROW_DIR[0] * ext,
        y1: CY + ROW_DIR[1] * ext,
        x2: CX + ROW_DIR[0] * ext,
        y2: CY - ROW_DIR[1] * ext,
      },
      null: {
        x1: CX - NULL_DIR[0] * ext,
        y1: CY + NULL_DIR[1] * ext,
        x2: CX + NULL_DIR[0] * ext,
        y2: CY - NULL_DIR[1] * ext,
      },
    }
  }, [])

  /* ─── Pointer handlers ─── */
  const handlePointerDown = useCallback((e) => {
    e.target.setPointerCapture(e.pointerId)
    setDragging(true)
  }, [])

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
      // Clamp to reasonable bounds
      const cx = Math.max(-4, Math.min(4, mx))
      const cy = Math.max(-4, Math.min(4, my))
      setState([cx, cy])
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(false), [])

  /* ─── SVG positions ─── */
  const stateSVG = toSVG(state[0], state[1])
  const projSVG = toSVG(projX, projY)
  const originSVG = toSVG(0, 0)

  /* ─── Output bar position ─── */
  const barCenterY = BAR_Y + BAR_H / 2
  const outputClamped = Math.max(-BAR_MAX, Math.min(BAR_MAX, output))
  const outputBarY = barCenterY - (outputClamped / BAR_MAX) * (BAR_H / 2)

  /* ─── Label positions along direction lines ─── */
  const rowLabelPos = useMemo(() => {
    const d = 180
    return {
      x: CX + ROW_DIR[0] * d,
      y: CY - ROW_DIR[1] * d,
    }
  }, [])

  const nullLabelPos = useMemo(() => {
    const d = 180
    return {
      x: CX + NULL_DIR[0] * d,
      y: CY - NULL_DIR[1] * d,
    }
  }, [])

  /* ─── Right-angle marker at projection ─── */
  const rightAngle = useMemo(() => {
    const s = 8
    // Vectors in SVG space
    const rowSVG = [ROW_DIR[0] * s, -ROW_DIR[1] * s]
    const nullSVG = [NULL_DIR[0] * s, -NULL_DIR[1] * s]
    const p1 = [projSVG[0] + nullSVG[0], projSVG[1] + nullSVG[1]]
    const p2 = [p1[0] + rowSVG[0], p1[1] + rowSVG[1]]
    const p3 = [projSVG[0] + rowSVG[0], projSVG[1] + rowSVG[1]]
    return `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} L ${p3[0].toFixed(1)} ${p3[1].toFixed(1)}`
  }, [projSVG])

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
          <clipPath id="nsmc-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>

        {/* ─── Axes ─── */}
        <line
          x1={30}
          y1={CY}
          x2={570}
          y2={CY}
          stroke={AXIS_COLOR}
        />
        <line
          x1={CX}
          y1={20}
          x2={CX}
          y2={H - 20}
          stroke={AXIS_COLOR}
        />

        {/* Axis labels */}
        <text
          x={565}
          y={CY + 20}
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.35)"
          textAnchor="end"
        >
          Neuron 1
        </text>
        <text
          x={CX + 10}
          y={30}
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.35)"
          textAnchor="start"
        >
          Neuron 2
        </text>

        {/* ─── Null-space direction line ─── */}
        <line
          x1={lines.null.x1}
          y1={lines.null.y1}
          x2={lines.null.x2}
          y2={lines.null.y2}
          stroke={NULL_COLOR}
          strokeWidth="2"
          strokeDasharray="8,5"
          opacity="0.5"
          clipPath="url(#nsmc-clip)"
        />

        {/* ─── Output (row-space) direction line ─── */}
        <line
          x1={lines.row.x1}
          y1={lines.row.y1}
          x2={lines.row.x2}
          y2={lines.row.y2}
          stroke={OUTPUT_COLOR}
          strokeWidth="2"
          opacity="0.5"
          clipPath="url(#nsmc-clip)"
        />

        {/* ─── Projection segment: origin to projection point ─── */}
        <line
          x1={originSVG[0]}
          y1={originSVG[1]}
          x2={projSVG[0]}
          y2={projSVG[1]}
          stroke={OUTPUT_COLOR}
          strokeWidth="5"
          opacity="0.25"
        />

        {/* ─── Dashed line from state to projection (shows decomposition) ─── */}
        <line
          x1={stateSVG[0]}
          y1={stateSVG[1]}
          x2={projSVG[0]}
          y2={projSVG[1]}
          stroke={NULL_COLOR}
          strokeWidth="1.5"
          strokeDasharray="4,3"
          opacity="0.6"
        />

        {/* ─── Right angle marker at projection ─── */}
        <path
          d={rightAngle}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />

        {/* ─── Projection point ─── */}
        <circle
          cx={projSVG[0]}
          cy={projSVG[1]}
          r={4}
          fill={OUTPUT_COLOR}
          opacity="0.6"
        />

        {/* ─── Draggable neural state point ─── */}
        <circle
          cx={stateSVG[0]}
          cy={stateSVG[1]}
          r={HANDLE_R}
          fill={POINT_COLOR}
          stroke="#fff"
          strokeWidth="2"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown}
        />

        {/* State label */}
        <text
          x={stateSVG[0] + 14}
          y={stateSVG[1] - 12}
          fontSize="12"
          fontFamily={FONT}
          fontWeight="600"
          fill={POINT_COLOR}
        >
          x = [{state[0].toFixed(1)}, {state[1].toFixed(1)}]
        </text>

        {/* ─── Direction labels ─── */}

        {/* Output direction label */}
        <text
          x={rowLabelPos.x}
          y={rowLabelPos.y - 12}
          textAnchor="middle"
          fontSize="11"
          fontFamily={FONT}
          fontWeight="600"
          fill={OUTPUT_COLOR}
        >
          output direction
        </text>
        <text
          x={rowLabelPos.x}
          y={rowLabelPos.y + 2}
          textAnchor="middle"
          fontSize="9.5"
          fontFamily={FONT}
          fill={OUTPUT_COLOR}
          opacity="0.7"
        >
          movement here changes the output
        </text>

        {/* Null-space label */}
        <text
          x={nullLabelPos.x}
          y={nullLabelPos.y - 12}
          textAnchor="middle"
          fontSize="11"
          fontFamily={FONT}
          fontWeight="600"
          fill={NULL_COLOR}
        >
          null space
        </text>
        <text
          x={nullLabelPos.x}
          y={nullLabelPos.y + 2}
          textAnchor="middle"
          fontSize="9.5"
          fontFamily={FONT}
          fill={NULL_COLOR}
          opacity="0.7"
        >
          movement here is invisible to the decoder
        </text>

        {/* ─── Output bar (right side) ─── */}

        {/* Bar background */}
        <rect
          x={BAR_X}
          y={BAR_Y}
          width={BAR_W}
          height={BAR_H}
          rx="4"
          fill="rgba(0,0,0,0.03)"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
        />

        {/* Zero line */}
        <line
          x1={BAR_X - 4}
          y1={barCenterY}
          x2={BAR_X + BAR_W + 4}
          y2={barCenterY}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1"
        />
        <text
          x={BAR_X + BAR_W + 8}
          y={barCenterY + 3}
          fontSize="9"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.3)"
        >
          0
        </text>

        {/* Filled portion of bar */}
        {output >= 0 ? (
          <rect
            x={BAR_X + 2}
            y={outputBarY}
            width={BAR_W - 4}
            height={barCenterY - outputBarY}
            rx="2"
            fill={OUTPUT_COLOR}
            opacity="0.35"
          />
        ) : (
          <rect
            x={BAR_X + 2}
            y={barCenterY}
            width={BAR_W - 4}
            height={outputBarY - barCenterY}
            rx="2"
            fill={OUTPUT_COLOR}
            opacity="0.35"
          />
        )}

        {/* Output indicator line */}
        <line
          x1={BAR_X - 2}
          y1={outputBarY}
          x2={BAR_X + BAR_W + 2}
          y2={outputBarY}
          stroke={OUTPUT_COLOR}
          strokeWidth="2.5"
        />

        {/* Output value readout */}
        <text
          x={BAR_X + BAR_W / 2}
          y={outputBarY - 10}
          textAnchor="middle"
          fontSize="12"
          fontFamily={FONT}
          fontWeight="600"
          fill={OUTPUT_COLOR}
        >
          {output.toFixed(2)}
        </text>

        {/* Bar title */}
        <text
          x={BAR_X + BAR_W / 2}
          y={BAR_Y - 18}
          textAnchor="middle"
          fontSize="11"
          fontFamily={FONT}
          fontWeight="600"
          fill="rgba(0,0,0,0.5)"
        >
          output
        </text>
        <text
          x={BAR_X + BAR_W / 2}
          y={BAR_Y - 6}
          textAnchor="middle"
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.35)"
        >
          y = Ax
        </text>

        {/* ─── Decoder matrix label ─── */}
        <text
          x={35}
          y={H - 16}
          fontSize="11"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          A = [0.8, 0.6]
        </text>
      </svg>
    </div>
  )
}
