import React, { useState, useRef, useMemo, useCallback, useEffect } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = W / 2
const CY = H / 2
const SCALE = 70

const COL1_COLOR = "#3d6cb9"
const COL2_COLOR = "#c0503a"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 7
const GRID_RANGE = 3
const GRID_SAMPLES = 21
const ANIM_DURATION = 400

/* ─── Preset matrices ─── */
const PRESETS = [
  { label: "Identity", col1: [1, 0], col2: [0, 1] },
  { label: "Rotation 45\u00B0", col1: [0.707, 0.707], col2: [-0.707, 0.707] },
  { label: "Shear", col1: [1, 0], col2: [0.6, 1] },
  { label: "Reflection", col1: [1, 0], col2: [0, -1] },
  { label: "Projection", col1: [1, 0], col2: [0, 0] },
  { label: "Scale", col1: [1.5, 0], col2: [0, 0.6] },
]

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

/* ─── Ease-out cubic ─── */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ─── Apply 2x2 matrix [[a,b],[c,d]] to point (x,y) ─── */
function applyMatrix(col1, col2, x, y) {
  return [col1[0] * x + col2[0] * y, col1[1] * x + col2[1] * y]
}

/* ─── Build a polyline for a parameterized line through the grid ─── */
function buildGridPolyline(col1, col2, fixed, axis) {
  const pts = []
  for (let i = 0; i < GRID_SAMPLES; i++) {
    const t = -GRID_RANGE + (i / (GRID_SAMPLES - 1)) * (2 * GRID_RANGE)
    const [wx, wy] =
      axis === "h" ? applyMatrix(col1, col2, t, fixed) : applyMatrix(col1, col2, fixed, t)
    const [sx, sy] = toSVG(wx, wy)
    pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`)
  }
  return pts.join(" ")
}

export default function TransformationExplorer() {
  const [col1, setCol1] = useState([1, 0])
  const [col2, setCol2] = useState([0, 1])
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)
  const animRef = useRef(null)

  /* ─── Animate to preset ─── */
  const animateTo = useCallback(
    (target1, target2) => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      const start1 = [...col1]
      const start2 = [...col2]
      const t0 = performance.now()

      function tick(now) {
        const elapsed = now - t0
        const progress = Math.min(elapsed / ANIM_DURATION, 1)
        const ease = easeOutCubic(progress)
        setCol1([
          start1[0] + (target1[0] - start1[0]) * ease,
          start1[1] + (target1[1] - start1[1]) * ease,
        ])
        setCol2([
          start2[0] + (target2[0] - start2[0]) * ease,
          start2[1] + (target2[1] - start2[1]) * ease,
        ])
        if (progress < 1) {
          animRef.current = requestAnimationFrame(tick)
        } else {
          animRef.current = null
        }
      }

      animRef.current = requestAnimationFrame(tick)
    },
    [col1, col2]
  )

  /* ─── Cleanup animation on unmount ─── */
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  /* ─── Transformed grid lines ─── */
  const gridLines = useMemo(() => {
    const lines = []
    for (let k = -GRID_RANGE; k <= GRID_RANGE; k++) {
      lines.push({
        key: `h${k}`,
        points: buildGridPolyline(col1, col2, k, "h"),
      })
      lines.push({
        key: `v${k}`,
        points: buildGridPolyline(col1, col2, k, "v"),
      })
    }
    return lines
  }, [col1, col2])

  /* ─── Original (identity) grid lines ─── */
  const origGridLines = useMemo(() => {
    const id1 = [1, 0]
    const id2 = [0, 1]
    const lines = []
    for (let k = -GRID_RANGE; k <= GRID_RANGE; k++) {
      lines.push({
        key: `oh${k}`,
        points: buildGridPolyline(id1, id2, k, "h"),
      })
      lines.push({
        key: `ov${k}`,
        points: buildGridPolyline(id1, id2, k, "v"),
      })
    }
    return lines
  }, [])

  /* ─── Pointer handlers ─── */
  const handlePointerDown = useCallback(
    (which) => (e) => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
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

  /* ─── Matrix display values ─── */
  const a = col1[0].toFixed(2)
  const b = col2[0].toFixed(2)
  const c = col1[1].toFixed(2)
  const d = col2[1].toFixed(2)

  /* ─── Determinant ─── */
  const det = col1[0] * col2[1] - col2[0] * col1[1]

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
          <clipPath id="tf-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          <marker
            id="tf-col1"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL1_COLOR} />
          </marker>
          <marker
            id="tf-col2"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL2_COLOR} />
          </marker>
        </defs>

        {/* Original (identity) grid — faded reference */}
        <g clipPath="url(#tf-clip)">
          {origGridLines.map((l) => (
            <polyline
              key={l.key}
              points={l.points}
              fill="none"
              stroke="rgba(0,0,0,0.04)"
              strokeWidth="1"
            />
          ))}
        </g>

        {/* Axes */}
        <line x1={0} y1={CY} x2={W} y2={CY} stroke="rgba(0,0,0,0.06)" />
        <line x1={CX} y1={0} x2={CX} y2={H} stroke="rgba(0,0,0,0.06)" />

        {/* Transformed grid */}
        <g clipPath="url(#tf-clip)">
          {gridLines.map((l) => (
            <polyline
              key={l.key}
              points={l.points}
              fill="none"
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1"
            />
          ))}
        </g>

        {/* Column vector 1 (where e1 goes) */}
        <line
          x1={CX}
          y1={CY}
          x2={col1SVG[0]}
          y2={col1SVG[1]}
          stroke={COL1_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#tf-col1)"
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
          Ae{"\u2081"}
        </text>

        {/* Column vector 2 (where e2 goes) */}
        <line
          x1={CX}
          y1={CY}
          x2={col2SVG[0]}
          y2={col2SVG[1]}
          stroke={COL2_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#tf-col2)"
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
          Ae{"\u2082"}
        </text>

        {/* Origin */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Matrix display */}
        <g>
          <text
            x={W - 16}
            y={32}
            textAnchor="end"
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.35)"
          >
            A =
          </text>
          {/* Row 1 */}
          <text
            x={W - 16}
            y={52}
            textAnchor="end"
            fontSize="13"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.55)"
          >
            <tspan fill={COL1_COLOR}>{a}</tspan>
            {"  "}
            <tspan fill={COL2_COLOR}>{b}</tspan>
          </text>
          {/* Row 2 */}
          <text
            x={W - 16}
            y={70}
            textAnchor="end"
            fontSize="13"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.55)"
          >
            <tspan fill={COL1_COLOR}>{c}</tspan>
            {"  "}
            <tspan fill={COL2_COLOR}>{d}</tspan>
          </text>
          {/* Brackets (SVG lines spanning both rows) */}
          {/* Left bracket */}
          <path
            d={`M ${W - 100} 40 L ${W - 104} 40 L ${W - 104} 76 L ${W - 100} 76`}
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="1.5"
          />
          {/* Right bracket */}
          <path
            d={`M ${W - 12} 40 L ${W - 8} 40 L ${W - 8} 76 L ${W - 12} 76`}
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="1.5"
          />
          {/* Determinant */}
          <text
            x={W - 16}
            y={92}
            textAnchor="end"
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.3)"
          >
            {"det = " + det.toFixed(2)}
          </text>
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
            drag column vector tips to build a custom transformation
          </text>
        )}
      </svg>

      {/* Preset buttons */}
      <div
        className="blog-figure__controls"
        style={{ justifyContent: "center", gap: "0.4rem", flexWrap: "wrap" }}
      >
        {PRESETS.map(({ label, col1: t1, col2: t2 }) => {
          const isActive =
            Math.abs(col1[0] - t1[0]) < 0.02 &&
            Math.abs(col1[1] - t1[1]) < 0.02 &&
            Math.abs(col2[0] - t2[0]) < 0.02 &&
            Math.abs(col2[1] - t2[1]) < 0.02
          return (
            <button
              key={label}
              className="blog-figure__button"
              style={
                isActive
                  ? { borderColor: "rgba(0,0,0,0.4)", color: "rgba(0,0,0,0.7)" }
                  : {}
              }
              onClick={() => animateTo(t1, t2)}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
