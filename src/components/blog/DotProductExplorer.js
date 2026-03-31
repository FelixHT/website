import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = 280
const CY = H / 2
const SCALE = 65

const U_COLOR = "#3d6cb9"
const V_COLOR = "#c0503a"
const PROJ_COLOR = "#4A7C6F"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 7
const ARC_R = 28

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

export default function DotProductExplorer() {
  const [u, setU] = useState([2.8, 1.8])
  const [v, setV] = useState([3.2, -0.5])
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)

  /* ─── Derived values ─── */
  const derived = useMemo(() => {
    const dot = u[0] * v[0] + u[1] * v[1]
    const lenU = Math.hypot(u[0], u[1])
    const lenV = Math.hypot(v[0], v[1])
    const cosA =
      lenU > 0.01 && lenV > 0.01 ? dot / (lenU * lenV) : 0
    const angle = Math.acos(Math.max(-1, Math.min(1, cosA)))
    const vv = lenV > 0.01 ? dot / (lenV * lenV) : 0
    const projVec = [vv * v[0], vv * v[1]]
    const projScalar = lenV > 0.01 ? dot / lenV : 0
    return { dot, angle, projVec, projScalar, lenU, lenV }
  }, [u, v])

  const { dot, angle, projVec, projScalar, lenU, lenV } = derived
  const angleDeg = ((angle * 180) / Math.PI).toFixed(1)
  const isOrthogonal = Math.abs(angle - Math.PI / 2) < 0.06

  /* ─── Angle arc path (drawn as a polyline for reliability) ─── */
  const arcPath = useMemo(() => {
    if (lenU < 0.1 || lenV < 0.1) return null
    const aU = Math.atan2(u[1], u[0])
    const aV = Math.atan2(v[1], v[0])
    let diff = aU - aV
    while (diff > Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    const steps = 30
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const a = aV + diff * t
      pts.push(
        `${(CX + ARC_R * Math.cos(a)).toFixed(1)} ${(CY - ARC_R * Math.sin(a)).toFixed(1)}`
      )
    }
    return "M " + pts.join(" L ")
  }, [u, v, lenU, lenV])

  /* ─── Right-angle marker ─── */
  const rightAnglePath = useMemo(() => {
    if (!isOrthogonal || lenU < 0.1 || lenV < 0.1) return null
    const s = 12
    const uDir = [u[0] / lenU, -u[1] / lenU] // SVG direction
    const vDir = [v[0] / lenV, -v[1] / lenV]
    const p1 = [CX + vDir[0] * s, CY + vDir[1] * s]
    const p2 = [
      CX + vDir[0] * s + uDir[0] * s,
      CY + vDir[1] * s + uDir[1] * s,
    ]
    const p3 = [CX + uDir[0] * s, CY + uDir[1] * s]
    return `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} L ${p3[0].toFixed(1)} ${p3[1].toFixed(1)}`
  }, [isOrthogonal, u, v, lenU, lenV])

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
  const projSVG = toSVG(projVec[0], projVec[1])

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
            id="dot-u"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={U_COLOR} />
          </marker>
          <marker
            id="dot-v"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={V_COLOR} />
          </marker>
        </defs>

        {/* Axes */}
        <line
          x1={30}
          y1={CY}
          x2={W - 120}
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

        {/* Projection shadow: thick line from origin along v to proj point */}
        <line
          x1={CX}
          y1={CY}
          x2={projSVG[0]}
          y2={projSVG[1]}
          stroke={PROJ_COLOR}
          strokeWidth="6"
          opacity="0.2"
          strokeLinecap="round"
        />

        {/* Perpendicular from u tip to projection point */}
        <line
          x1={uSVG[0]}
          y1={uSVG[1]}
          x2={projSVG[0]}
          y2={projSVG[1]}
          stroke={PROJ_COLOR}
          strokeWidth="1"
          strokeDasharray="4,3"
          opacity="0.45"
        />

        {/* Projection point marker */}
        <circle
          cx={projSVG[0]}
          cy={projSVG[1]}
          r="3.5"
          fill={PROJ_COLOR}
          opacity="0.55"
        />

        {/* Angle arc */}
        {arcPath && !isOrthogonal && (
          <path
            d={arcPath}
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="1"
          />
        )}

        {/* Right angle marker */}
        {rightAnglePath && (
          <path
            d={rightAnglePath}
            fill="none"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="1"
          />
        )}

        {/* Angle label (placed near the arc midpoint) */}
        {lenU > 0.1 && lenV > 0.1 && (
          <text
            x={
              CX +
              (ARC_R + 14) *
                Math.cos(
                  (Math.atan2(u[1], u[0]) + Math.atan2(v[1], v[0])) / 2
                )
            }
            y={
              CY -
              (ARC_R + 14) *
                Math.sin(
                  (Math.atan2(u[1], u[0]) + Math.atan2(v[1], v[0])) / 2
                )
            }
            textAnchor="middle"
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.35)"
          >
            {angleDeg + "°"}
          </text>
        )}

        {/* Vector u */}
        <line
          x1={CX}
          y1={CY}
          x2={uSVG[0]}
          y2={uSVG[1]}
          stroke={U_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#dot-u)"
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
          markerEnd="url(#dot-v)"
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

        {/* Readout panel (right side) */}
        <g>
          <text
            x={W - 16}
            y={CY - 70}
            textAnchor="end"
            fontSize="13"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.55)"
          >
            {"u \u00B7 v = " + dot.toFixed(1)}
          </text>
          <text
            x={W - 16}
            y={CY - 48}
            textAnchor="end"
            fontSize="13"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.55)"
          >
            {"θ = " + angleDeg + "°"}
          </text>
          <text
            x={W - 16}
            y={CY - 26}
            textAnchor="end"
            fontSize="13"
            fontFamily={FONT}
            fill={PROJ_COLOR}
          >
            {"proj = " + projScalar.toFixed(2)}
          </text>
          {isOrthogonal && (
            <text
              x={W - 16}
              y={CY - 4}
              textAnchor="end"
              fontSize="11"
              fontFamily={FONT}
              fill="rgba(0,0,0,0.3)"
            >
              orthogonal
            </text>
          )}
        </g>

        {/* Drag hint */}
        {!dragging && (
          <text
            x={CX}
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
