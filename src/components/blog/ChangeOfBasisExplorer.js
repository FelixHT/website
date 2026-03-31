import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = 300
const CY = H / 2
const SCALE = 60

/* ─── Colors ─── */
const B1_COLOR = "#D4626E"
const B2_COLOR = "#4A90D9"
const V_COLOR = "#333"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 7

/* ─── Fixed target vector ─── */
const V_STD = [1.5, 2.2]

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

/* ─── 2x2 inverse ─── */
function inv2(a, b, c, d) {
  const det = a * d - b * c
  if (Math.abs(det) < 1e-10) return null
  const invDet = 1 / det
  return [d * invDet, -b * invDet, -c * invDet, a * invDet]
}

/* ─── Format number for display ─── */
function fmt(n) {
  const s = n.toFixed(2)
  if (s === "-0.00") return "0.00"
  return s
}

export default function ChangeOfBasisExplorer() {
  const [b1, setB1] = useState([1.5, 0.5])
  const [b2, setB2] = useState([-0.3, 1.3])
  const [dragging, setDragging] = useState(null)
  const [activeCoords, setActiveCoords] = useState("standard")
  const svgRef = useRef(null)

  /* ─── P and P⁻¹ ─── */
  const { P, Pinv, customCoords, det } = useMemo(() => {
    const Pmat = [b1[0], b2[0], b1[1], b2[1]] // row-major: [[b1x,b2x],[b1y,b2y]]
    const d = b1[0] * b2[1] - b2[0] * b1[1]
    const Pinvmat = inv2(Pmat[0], Pmat[1], Pmat[2], Pmat[3])
    let cc = [NaN, NaN]
    if (Pinvmat) {
      cc = [
        Pinvmat[0] * V_STD[0] + Pinvmat[1] * V_STD[1],
        Pinvmat[2] * V_STD[0] + Pinvmat[3] * V_STD[1],
      ]
    }
    return { P: Pmat, Pinv: Pinvmat, customCoords: cc, det: d }
  }, [b1, b2])

  const isSingular = Math.abs(det) < 0.08

  /* ─── Standard grid lines ─── */
  const stdGridLines = useMemo(() => {
    const lines = []
    const xMin = Math.floor(-CX / SCALE) - 1
    const xMax = Math.ceil((W - CX) / SCALE) + 1
    const yMin = Math.floor(-(H - CY) / SCALE) - 1
    const yMax = Math.ceil(CY / SCALE) + 1
    for (let i = xMin; i <= xMax; i++) {
      const sx = CX + i * SCALE
      lines.push({ x1: sx, y1: 0, x2: sx, y2: H })
    }
    for (let j = yMin; j <= yMax; j++) {
      const sy = CY - j * SCALE
      lines.push({ x1: 0, y1: sy, x2: W, y2: sy })
    }
    return lines
  }, [])

  /* ─── Custom basis grid (parallelogram lattice) ─── */
  const customGridLines = useMemo(() => {
    if (isSingular) return []
    const lines = []
    const N = 8
    for (let i = -N; i <= N; i++) {
      // Lines along b1, offset by i*b2
      const [ax, ay] = toSVG(
        i * b2[0] - N * b1[0],
        i * b2[1] - N * b1[1]
      )
      const [bx, by] = toSVG(
        i * b2[0] + N * b1[0],
        i * b2[1] + N * b1[1]
      )
      lines.push({ x1: ax, y1: ay, x2: bx, y2: by, dir: "b1" })
      // Lines along b2, offset by i*b1
      const [cx, cy] = toSVG(
        i * b1[0] - N * b2[0],
        i * b1[1] - N * b2[1]
      )
      const [dx, dy] = toSVG(
        i * b1[0] + N * b2[0],
        i * b1[1] + N * b2[1]
      )
      lines.push({ x1: cx, y1: cy, x2: dx, y2: dy, dir: "b2" })
    }
    return lines
  }, [b1, b2, isSingular])

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
      else setB2([mx, my])
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(null), [])

  /* ─── SVG positions ─── */
  const b1SVG = toSVG(b1[0], b1[1])
  const b2SVG = toSVG(b2[0], b2[1])
  const vSVG = toSVG(V_STD[0], V_STD[1])

  /* ─── Grid opacity based on active mode ─── */
  const stdGridOpacity = activeCoords === "standard" ? 0.08 : 0.03
  const customGridOpacity = activeCoords === "custom" ? 0.22 : 0.1

  /* ─── Matrix display helpers ─── */
  const matX = 530
  const matY0 = 42

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
          <clipPath id="cob-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          <marker
            id="cob-b1"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={B1_COLOR} />
          </marker>
          <marker
            id="cob-b2"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={B2_COLOR} />
          </marker>
        </defs>

        {/* Standard grid */}
        <g opacity={stdGridOpacity}>
          {stdGridLines.map((l, i) => (
            <line
              key={`sg-${i}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="rgba(0,0,0,1)"
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Custom basis grid */}
        <g clipPath="url(#cob-clip)" opacity={customGridOpacity}>
          {customGridLines.map((l, i) => (
            <line
              key={`cg-${i}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={l.dir === "b1" ? B1_COLOR : B2_COLOR}
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

        {/* Unit parallelogram for the custom basis */}
        {!isSingular && (
          <polygon
            points={`${CX},${CY} ${b1SVG[0]},${b1SVG[1]} ${toSVG(b1[0] + b2[0], b1[1] + b2[1])[0]},${toSVG(b1[0] + b2[0], b1[1] + b2[1])[1]} ${b2SVG[0]},${b2SVG[1]}`}
            fill="rgba(140,120,200,0.06)"
            stroke="rgba(140,120,200,0.15)"
            strokeWidth="1"
          />
        )}

        {/* Basis vector b1 */}
        <line
          x1={CX}
          y1={CY}
          x2={b1SVG[0]}
          y2={b1SVG[1]}
          stroke={B1_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#cob-b1)"
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
          b₁
        </text>

        {/* Basis vector b2 */}
        <line
          x1={CX}
          y1={CY}
          x2={b2SVG[0]}
          y2={b2SVG[1]}
          stroke={B2_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#cob-b2)"
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
          b₂
        </text>

        {/* Decomposition lines: v = c1*b1 + c2*b2 (dashed parallelogram) */}
        {!isSingular && !isNaN(customCoords[0]) && (
          <g opacity="0.35">
            {/* c1*b1 component */}
            <line
              x1={CX}
              y1={CY}
              x2={toSVG(customCoords[0] * b1[0], customCoords[0] * b1[1])[0]}
              y2={toSVG(customCoords[0] * b1[0], customCoords[0] * b1[1])[1]}
              stroke={B1_COLOR}
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
            {/* from c1*b1 to v */}
            <line
              x1={toSVG(customCoords[0] * b1[0], customCoords[0] * b1[1])[0]}
              y1={toSVG(customCoords[0] * b1[0], customCoords[0] * b1[1])[1]}
              x2={vSVG[0]}
              y2={vSVG[1]}
              stroke={B2_COLOR}
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
            {/* c2*b2 component */}
            <line
              x1={CX}
              y1={CY}
              x2={toSVG(customCoords[1] * b2[0], customCoords[1] * b2[1])[0]}
              y2={toSVG(customCoords[1] * b2[0], customCoords[1] * b2[1])[1]}
              stroke={B2_COLOR}
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
            {/* from c2*b2 to v */}
            <line
              x1={toSVG(customCoords[1] * b2[0], customCoords[1] * b2[1])[0]}
              y1={toSVG(customCoords[1] * b2[0], customCoords[1] * b2[1])[1]}
              x2={vSVG[0]}
              y2={vSVG[1]}
              stroke={B1_COLOR}
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
          </g>
        )}

        {/* Target vector v */}
        <circle
          cx={vSVG[0]}
          cy={vSVG[1]}
          r="5"
          fill={V_COLOR}
        />
        <line
          x1={CX}
          y1={CY}
          x2={vSVG[0]}
          y2={vSVG[1]}
          stroke={V_COLOR}
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Coordinate label for v */}
        <text
          x={vSVG[0] + 10}
          y={vSVG[1] - 14}
          fontSize="13"
          fontFamily={FONT}
          fill={V_COLOR}
          fontWeight="600"
        >
          v
        </text>
        <text
          x={vSVG[0] + 10}
          y={vSVG[1] + 2}
          fontSize="10.5"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.45)"
        >
          {activeCoords === "standard"
            ? `(${fmt(V_STD[0])}, ${fmt(V_STD[1])})`
            : isSingular
              ? "(undef)"
              : `(${fmt(customCoords[0])}, ${fmt(customCoords[1])})`}
        </text>

        {/* Origin */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* ─── Matrix display panel (right side) ─── */}
        <g fontFamily={FONT}>
          {/* Coordinate readouts */}
          <text
            x={matX}
            y={matY0}
            fontSize="11"
            fill="rgba(0,0,0,0.4)"
          >
            Standard coords:
          </text>
          <text
            x={matX}
            y={matY0 + 16}
            fontSize="12"
            fill={activeCoords === "standard" ? V_COLOR : "rgba(0,0,0,0.3)"}
            fontWeight={activeCoords === "standard" ? "600" : "400"}
          >
            {`v = (${fmt(V_STD[0])}, ${fmt(V_STD[1])})`}
          </text>

          <text
            x={matX}
            y={matY0 + 44}
            fontSize="11"
            fill="rgba(0,0,0,0.4)"
          >
            Custom coords:
          </text>
          <text
            x={matX}
            y={matY0 + 60}
            fontSize="12"
            fill={activeCoords === "custom" ? V_COLOR : "rgba(0,0,0,0.3)"}
            fontWeight={activeCoords === "custom" ? "600" : "400"}
          >
            {isSingular
              ? "v = (undefined)"
              : `v = (${fmt(customCoords[0])}, ${fmt(customCoords[1])})`}
          </text>

          {/* P matrix */}
          <text
            x={matX}
            y={matY0 + 100}
            fontSize="11"
            fill="rgba(0,0,0,0.4)"
          >
            {"P = [b\u2081 | b\u2082]"}
          </text>

          {/* P bracket left */}
          <text
            x={matX}
            y={matY0 + 126}
            fontSize="28"
            fill="rgba(0,0,0,0.2)"
            fontWeight="200"
          >
            [
          </text>
          <text
            x={matX + 12}
            y={matY0 + 118}
            fontSize="12"
            fill={B1_COLOR}
          >
            {fmt(b1[0])}
          </text>
          <text
            x={matX + 56}
            y={matY0 + 118}
            fontSize="12"
            fill={B2_COLOR}
          >
            {fmt(b2[0])}
          </text>
          <text
            x={matX + 12}
            y={matY0 + 136}
            fontSize="12"
            fill={B1_COLOR}
          >
            {fmt(b1[1])}
          </text>
          <text
            x={matX + 56}
            y={matY0 + 136}
            fontSize="12"
            fill={B2_COLOR}
          >
            {fmt(b2[1])}
          </text>
          {/* P bracket right */}
          <text
            x={matX + 92}
            y={matY0 + 126}
            fontSize="28"
            fill="rgba(0,0,0,0.2)"
            fontWeight="200"
          >
            ]
          </text>

          {/* P⁻¹ matrix */}
          <text
            x={matX}
            y={matY0 + 170}
            fontSize="11"
            fill="rgba(0,0,0,0.4)"
          >
            {"P\u207B\u00B9"}
          </text>

          {Pinv ? (
            <g>
              <text
                x={matX}
                y={matY0 + 198}
                fontSize="28"
                fill="rgba(0,0,0,0.2)"
                fontWeight="200"
              >
                [
              </text>
              <text
                x={matX + 12}
                y={matY0 + 190}
                fontSize="12"
                fill="rgba(0,0,0,0.55)"
              >
                {fmt(Pinv[0])}
              </text>
              <text
                x={matX + 56}
                y={matY0 + 190}
                fontSize="12"
                fill="rgba(0,0,0,0.55)"
              >
                {fmt(Pinv[1])}
              </text>
              <text
                x={matX + 12}
                y={matY0 + 208}
                fontSize="12"
                fill="rgba(0,0,0,0.55)"
              >
                {fmt(Pinv[2])}
              </text>
              <text
                x={matX + 56}
                y={matY0 + 208}
                fontSize="12"
                fill="rgba(0,0,0,0.55)"
              >
                {fmt(Pinv[3])}
              </text>
              <text
                x={matX + 92}
                y={matY0 + 198}
                fontSize="28"
                fill="rgba(0,0,0,0.2)"
                fontWeight="200"
              >
                ]
              </text>
            </g>
          ) : (
            <text
              x={matX}
              y={matY0 + 192}
              fontSize="12"
              fill="rgba(217, 83, 79, 0.7)"
            >
              singular
            </text>
          )}

          {/* det readout */}
          <text
            x={matX}
            y={matY0 + 240}
            fontSize="11"
            fill={isSingular ? "rgba(217,83,79,0.7)" : "rgba(0,0,0,0.35)"}
          >
            {`det(P) = ${fmt(det)}`}
          </text>
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
            drag arrow tips to change basis vectors
          </text>
        )}
      </svg>

      {/* Toggle button */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          justifyContent: "center",
          marginTop: "0.5rem",
        }}
      >
        <button
          className="blog-figure__button"
          style={
            activeCoords === "standard"
              ? { borderColor: "rgba(0,0,0,0.4)", color: "rgba(0,0,0,0.7)" }
              : {}
          }
          onClick={() => setActiveCoords("standard")}
        >
          Standard coords
        </button>
        <button
          className="blog-figure__button"
          style={
            activeCoords === "custom"
              ? { borderColor: "rgba(0,0,0,0.4)", color: "rgba(0,0,0,0.7)" }
              : {}
          }
          onClick={() => setActiveCoords("custom")}
        >
          Custom coords
        </button>
      </div>
    </div>
  )
}
