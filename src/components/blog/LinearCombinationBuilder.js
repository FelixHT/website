import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 600
const H = 400
const CX = 300
const CY = 200
const SCALE = 60

/* ─── Basis vectors (fixed) ─── */
const U = [2, 0.5]
const V = [0.5, 1.8]

/* ─── Colours ─── */
const U_COLOR = "#3d6cb9"
const V_COLOR = "#c0503a"
const TEAL = "#4A7C6F"
const FONT = "var(--font-mono, monospace)"

/* ─── Coordinate transform ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

/* ─── Arrowhead component ─── */
function Arrow({ x1, y1, x2, y2, stroke, strokeWidth, dashed, markerId, opacity }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={strokeWidth || 2}
      strokeDasharray={dashed ? "6 4" : undefined}
      markerEnd={`url(#${markerId})`}
      opacity={opacity != null ? opacity : 1}
    />
  )
}

export default function LinearCombinationBuilder() {
  const [alpha, setAlpha] = useState(1.0)
  const [beta, setBeta] = useState(0.5)

  /* ─── Computed points ─── */
  const points = useMemo(() => {
    const au = [alpha * U[0], alpha * U[1]]
    const bv = [beta * V[0], beta * V[1]]
    const w = [au[0] + bv[0], au[1] + bv[1]]

    const p1SVG = toSVG(au[0], au[1])
    const p2SVG = toSVG(w[0], w[1])
    const uSVG = toSVG(U[0], U[1])
    const vSVG = toSVG(V[0], V[1])

    // Label positions: midpoints with slight offset
    const auMid = toSVG(au[0] / 2, au[1] / 2)
    const bvMid = toSVG(au[0] + bv[0] / 2, au[1] + bv[1] / 2)

    return { au, bv, w, p1SVG, p2SVG, uSVG, vSVG, auMid, bvMid }
  }, [alpha, beta])

  const { w, p1SVG, p2SVG, uSVG, vSVG, auMid, bvMid } = points
  const wSVG = toSVG(w[0], w[1])

  /* ─── Label offsets (perpendicular to segment direction) ─── */
  const auLabelOffset = useMemo(() => {
    const dx = p1SVG[0] - CX
    const dy = p1SVG[1] - CY
    const len = Math.hypot(dx, dy) || 1
    // perpendicular (rotated -90 deg in SVG coords) + slight up
    return { x: (-dy / len) * 14, y: (dx / len) * 14 - 4 }
  }, [p1SVG])

  const bvLabelOffset = useMemo(() => {
    const dx = p2SVG[0] - p1SVG[0]
    const dy = p2SVG[1] - p1SVG[1]
    const len = Math.hypot(dx, dy) || 1
    return { x: (-dy / len) * 14, y: (dx / len) * 14 - 4 }
  }, [p1SVG, p2SVG])

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
          {/* Arrowhead markers */}
          <marker
            id="lc-arrow-u"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={U_COLOR} />
          </marker>
          <marker
            id="lc-arrow-u-ghost"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={U_COLOR} opacity="0.2" />
          </marker>
          <marker
            id="lc-arrow-v"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={V_COLOR} />
          </marker>
          <marker
            id="lc-arrow-v-ghost"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={V_COLOR} opacity="0.2" />
          </marker>
          <marker
            id="lc-arrow-u-dashed"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={U_COLOR} opacity="0.6" />
          </marker>
          <marker
            id="lc-arrow-v-dashed"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={V_COLOR} opacity="0.6" />
          </marker>
          <marker
            id="lc-arrow-w"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={TEAL} />
          </marker>
        </defs>

        {/* Axes */}
        <line x1={0} y1={CY} x2={W} y2={CY} stroke="rgba(0,0,0,0.06)" />
        <line x1={CX} y1={0} x2={CX} y2={H} stroke="rgba(0,0,0,0.06)" />

        {/* Ghost vectors: original u and v at full scale (faint) */}
        <Arrow
          x1={CX} y1={CY}
          x2={uSVG[0]} y2={uSVG[1]}
          stroke={U_COLOR}
          strokeWidth={2}
          markerId="lc-arrow-u-ghost"
          opacity={0.2}
        />
        <Arrow
          x1={CX} y1={CY}
          x2={vSVG[0]} y2={vSVG[1]}
          stroke={V_COLOR}
          strokeWidth={2}
          markerId="lc-arrow-v-ghost"
          opacity={0.2}
        />

        {/* Ghost labels */}
        <text
          x={uSVG[0] + 10}
          y={uSVG[1] - 8}
          fontSize="12"
          fontFamily={FONT}
          fill={U_COLOR}
          opacity={0.3}
          fontWeight="600"
        >
          u
        </text>
        <text
          x={vSVG[0] + 10}
          y={vSVG[1] - 8}
          fontSize="12"
          fontFamily={FONT}
          fill={V_COLOR}
          opacity={0.3}
          fontWeight="600"
        >
          v
        </text>

        {/* Dashed αu: origin → P1 */}
        {Math.hypot(p1SVG[0] - CX, p1SVG[1] - CY) > 2 && (
          <>
            <Arrow
              x1={CX} y1={CY}
              x2={p1SVG[0]} y2={p1SVG[1]}
              stroke={U_COLOR}
              strokeWidth={1.8}
              dashed
              markerId="lc-arrow-u-dashed"
              opacity={0.6}
            />
            <text
              x={auMid[0] + auLabelOffset.x}
              y={auMid[1] + auLabelOffset.y}
              fontSize="12"
              fontFamily={FONT}
              fill={U_COLOR}
              opacity={0.7}
              textAnchor="middle"
              fontWeight="500"
            >
              αu
            </text>
          </>
        )}

        {/* Dashed βv: P1 → P2 (tip-to-tail) */}
        {Math.hypot(p2SVG[0] - p1SVG[0], p2SVG[1] - p1SVG[1]) > 2 && (
          <>
            <Arrow
              x1={p1SVG[0]} y1={p1SVG[1]}
              x2={p2SVG[0]} y2={p2SVG[1]}
              stroke={V_COLOR}
              strokeWidth={1.8}
              dashed
              markerId="lc-arrow-v-dashed"
              opacity={0.6}
            />
            <text
              x={bvMid[0] + bvLabelOffset.x}
              y={bvMid[1] + bvLabelOffset.y}
              fontSize="12"
              fontFamily={FONT}
              fill={V_COLOR}
              opacity={0.7}
              textAnchor="middle"
              fontWeight="500"
            >
              βv
            </text>
          </>
        )}

        {/* Resultant w: origin → P2 (solid, bold) */}
        {Math.hypot(wSVG[0] - CX, wSVG[1] - CY) > 2 && (
          <>
            <Arrow
              x1={CX} y1={CY}
              x2={wSVG[0]} y2={wSVG[1]}
              stroke={TEAL}
              strokeWidth={2.8}
              markerId="lc-arrow-w"
            />
            <text
              x={wSVG[0] + 12}
              y={wSVG[1] - 12}
              fontSize="12"
              fontFamily={FONT}
              fill={TEAL}
              fontWeight="600"
            >
              w = αu + βv
            </text>
          </>
        )}

        {/* Origin dot */}
        <circle cx={CX} cy={CY} r={3} fill="rgba(0,0,0,0.25)" />

        {/* Readout */}
        <text
          x={W - 14}
          y={24}
          textAnchor="end"
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.45)"
        >
          w = ({w[0].toFixed(2)}, {w[1].toFixed(2)})
        </text>
      </svg>

      {/* Sliders */}
      <div
        className="dim-explorer__controls"
        style={{ justifyContent: "center", gap: "1.5rem" }}
      >
        <div className="dim-explorer__slider" style={{ maxWidth: 240 }}>
          <label className="dim-explorer__label">
            α = <strong>{alpha.toFixed(1)}</strong>
          </label>
          <input
            className="dim-explorer__range"
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={alpha}
            onChange={(e) => setAlpha(Number(e.target.value))}
          />
        </div>

        <div className="dim-explorer__slider" style={{ maxWidth: 240 }}>
          <label className="dim-explorer__label">
            β = <strong>{beta.toFixed(1)}</strong>
          </label>
          <input
            className="dim-explorer__range"
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={beta}
            onChange={(e) => setBeta(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}
