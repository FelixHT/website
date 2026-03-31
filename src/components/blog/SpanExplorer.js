import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = W / 2
const CY = H / 2
const SCALE = 70

const U_COLOR = "#3d6cb9"
const V_COLOR = "#c0503a"
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

export default function SpanExplorer() {
  const [u, setU] = useState([2.5, 1.0])
  const [v, setV] = useState([-0.5, 2.2])
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)

  /* ─── Independence measure ─── */
  const angle = useMemo(() => {
    const lu = Math.hypot(u[0], u[1])
    const lv = Math.hypot(v[0], v[1])
    if (lu < 0.01 || lv < 0.01) return 0
    const dot = u[0] * v[0] + u[1] * v[1]
    return Math.acos(Math.max(-1, Math.min(1, dot / (lu * lv))))
  }, [u, v])

  const independence = Math.abs(Math.sin(angle))

  /* ─── Grid lines (parallelogram lattice) ─── */
  const gridLines = useMemo(() => {
    if (independence < 0.02) return []
    const lines = []
    const N = 6
    for (let i = -N; i <= N; i++) {
      // Lines along u, offset by i*v
      const [ax, ay] = toSVG(
        i * v[0] - N * u[0],
        i * v[1] - N * u[1]
      )
      const [bx, by] = toSVG(
        i * v[0] + N * u[0],
        i * v[1] + N * u[1]
      )
      lines.push({ x1: ax, y1: ay, x2: bx, y2: by })
      // Lines along v, offset by i*u
      const [cx, cy] = toSVG(
        i * u[0] - N * v[0],
        i * u[1] - N * v[1]
      )
      const [dx, dy] = toSVG(
        i * u[0] + N * v[0],
        i * u[1] + N * v[1]
      )
      lines.push({ x1: cx, y1: cy, x2: dx, y2: dy })
    }
    return lines
  }, [u, v, independence])

  /* ─── Collinear line (visible when nearly dependent) ─── */
  const collinearLine = useMemo(() => {
    if (independence > 0.25) return null
    const dir = Math.hypot(u[0], u[1]) > 0.01 ? u : v
    const len = Math.hypot(dir[0], dir[1])
    if (len < 0.01) return null
    const nx = dir[0] / len
    const ny = dir[1] / len
    const ext = 500
    return {
      x1: CX - nx * ext,
      y1: CY + ny * ext,
      x2: CX + nx * ext,
      y2: CY - ny * ext,
    }
  }, [u, v, independence])

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

  /* ─── SVG coordinates ─── */
  const uSVG = toSVG(u[0], u[1])
  const vSVG = toSVG(v[0], v[1])
  const uvSVG = toSVG(u[0] + v[0], u[1] + v[1])

  const angleDeg = ((angle * 180) / Math.PI).toFixed(0)

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
          <clipPath id="span-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          <marker
            id="span-u"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={U_COLOR} />
          </marker>
          <marker
            id="span-v"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={V_COLOR} />
          </marker>
        </defs>

        {/* Background tint: span coverage */}
        <rect
          x="0"
          y="0"
          width={W}
          height={H}
          fill={`rgba(74,124,111,${(independence * 0.05).toFixed(3)})`}
        />

        {/* Parallelogram lattice */}
        <g
          clipPath="url(#span-clip)"
          opacity={Math.min(independence * 1.2, 0.8)}
        >
          {gridLines.map((l, i) => (
            <line
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={TEAL}
              strokeWidth="0.5"
              opacity="0.18"
            />
          ))}
        </g>

        {/* Collinear line (fades in when dependent) */}
        {collinearLine && (
          <line
            x1={collinearLine.x1}
            y1={collinearLine.y1}
            x2={collinearLine.x2}
            y2={collinearLine.y2}
            stroke={TEAL}
            strokeWidth="3"
            opacity={Math.max(0, (1 - independence / 0.25) * 0.35)}
            clipPath="url(#span-clip)"
          />
        )}

        {/* Unit parallelogram */}
        <polygon
          points={`${CX},${CY} ${uSVG[0]},${uSVG[1]} ${uvSVG[0]},${uvSVG[1]} ${vSVG[0]},${vSVG[1]}`}
          fill={`rgba(74,124,111,${(independence * 0.12).toFixed(3)})`}
          stroke={`rgba(74,124,111,${(independence * 0.4).toFixed(2)})`}
          strokeWidth="1"
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

        {/* Vector u */}
        <line
          x1={CX}
          y1={CY}
          x2={uSVG[0]}
          y2={uSVG[1]}
          stroke={U_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#span-u)"
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
          markerEnd="url(#span-v)"
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

        {/* Readouts */}
        <text
          x={W - 16}
          y={28}
          textAnchor="end"
          fontSize="13"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.5)"
        >
          {"θ = " + angleDeg + "°"}
        </text>
        <text
          x={W - 16}
          y={46}
          textAnchor="end"
          fontSize="11"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.3)"
        >
          {independence < 0.05
            ? "collinear \u2014 span is a line"
            : "independent \u2014 span fills \u211D\u00B2"}
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
            drag arrow tips to move vectors
          </text>
        )}
      </svg>
    </div>
  )
}
