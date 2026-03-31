import React, { useState, useRef, useMemo, useCallback, useEffect } from "react"

/* ─── Layout ─── */
const W = 920
const H = 480
const LEFT_CX = 200
const LEFT_CY = 200
const RIGHT_CX = 720
const RIGHT_CY = 200
const SCALE = 55
const GRID_RANGE = 3
const GRID_SAMPLES = 21
const HANDLE_R = 7
const ANIM_DURATION = 500

/* ─── Colors ─── */
const COL1_COLOR = "#3d6cb9"
const COL2_COLOR = "#c0503a"
const TEAL = "#4A7C6F"
const FONT = "var(--font-mono, monospace)"

/* ─── Fixed matrix A ─── */
const A = [
  [3, 1],
  [0, 2],
]

/* ─── Eigenvalues of A (precomputed) ─── */
const EIGEN_1 = 3
const EIGEN_2 = 2

/* ─── Eigenvectors of A (precomputed) ─── */
// (A - 3I)v = 0 → [[0,1],[0,-1]]v = 0 → v = [1, 0]
// (A - 2I)v = 0 → [[1,1],[0,0]]v = 0 → v = [-1, 1]
const EIGVEC_1 = [1, 0]
const EIGVEC_2 = [-1, 1]

/* ─── Ease-out cubic ─── */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ─── Coordinate transforms ─── */
function toSVG(cx, cy, x, y) {
  return [cx + x * SCALE, cy - y * SCALE]
}

function fromSVG(cx, cy, sx, sy) {
  return [(sx - cx) / SCALE, -(sy - cy) / SCALE]
}

/* ─── Apply 2x2 matrix [[a,b],[c,d]] to point (x,y) ─── */
function applyMat(m, x, y) {
  return [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y]
}

/* ─── 2x2 matrix multiply ─── */
function matMul(a, b) {
  return [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
  ]
}

/* ─── 2x2 inverse ─── */
function matInv(m) {
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0]
  if (Math.abs(det) < 1e-10) return null
  const invDet = 1 / det
  return [
    [m[1][1] * invDet, -m[0][1] * invDet],
    [-m[1][0] * invDet, m[0][0] * invDet],
  ]
}

/* ─── Build a polyline for a parameterized grid line ─── */
function buildGridPolyline(cx, cy, mat, fixed, axis) {
  const pts = []
  for (let i = 0; i < GRID_SAMPLES; i++) {
    const t = -GRID_RANGE + (i / (GRID_SAMPLES - 1)) * (2 * GRID_RANGE)
    const [ix, iy] = axis === "h" ? [t, fixed] : [fixed, t]
    const [wx, wy] = applyMat(mat, ix, iy)
    const [sx, sy] = toSVG(cx, cy, wx, wy)
    pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`)
  }
  return pts.join(" ")
}

/* ─── Build grid lines for a given matrix and center ─── */
function buildGridLines(cx, cy, mat, prefix) {
  const lines = []
  for (let k = -GRID_RANGE; k <= GRID_RANGE; k++) {
    lines.push({
      key: `${prefix}h${k}`,
      points: buildGridPolyline(cx, cy, mat, k, "h"),
    })
    lines.push({
      key: `${prefix}v${k}`,
      points: buildGridPolyline(cx, cy, mat, k, "v"),
    })
  }
  return lines
}

/* ─── Format number for matrix display ─── */
function fmt(n) {
  const rounded = Math.round(n * 100) / 100
  if (Object.is(rounded, -0)) return "0.00"
  return rounded.toFixed(2)
}

export default function SimilarityExplorer() {
  const [col1, setCol1] = useState([1.2, 0.3])
  const [col2, setCol2] = useState([0.8, -1.1])
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)
  const animRef = useRef(null)

  /* ─── Compute B = P⁻¹AP ─── */
  const { B, P, PInv, singular } = useMemo(() => {
    const Pm = [
      [col1[0], col2[0]],
      [col1[1], col2[1]],
    ]
    const PInvm = matInv(Pm)
    if (!PInvm) return { B: null, P: Pm, PInv: null, singular: true }
    const Bm = matMul(matMul(PInvm, A), Pm)
    return { B: Bm, P: Pm, PInv: PInvm, singular: false }
  }, [col1, col2])

  /* ─── Grid lines for left panel (standard basis, transformed by A) ─── */
  const leftGridLines = useMemo(
    () => buildGridLines(LEFT_CX, LEFT_CY, A, "L"),
    []
  )

  /* ─── Identity grid lines for left panel (faded reference) ─── */
  const leftIdentityGrid = useMemo(() => {
    const id = [[1, 0], [0, 1]]
    return buildGridLines(LEFT_CX, LEFT_CY, id, "Lid")
  }, [])

  /* ─── Grid lines for right panel (transformed by B) ─── */
  const rightGridLines = useMemo(() => {
    if (!B) return []
    return buildGridLines(RIGHT_CX, RIGHT_CY, B, "R")
  }, [B])

  /* ─── Identity grid lines for right panel (faded reference) ─── */
  const rightIdentityGrid = useMemo(() => {
    const id = [[1, 0], [0, 1]]
    return buildGridLines(RIGHT_CX, RIGHT_CY, id, "Rid")
  }, [])

  /* ─── Animate to target basis ─── */
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
      const [mx, my] = fromSVG(RIGHT_CX, RIGHT_CY, sp.x, sp.y)
      // Clamp to prevent degenerate bases
      const cx = Math.max(-3, Math.min(3, mx))
      const cy = Math.max(-3, Math.min(3, my))
      if (dragging === "col1") setCol1([cx, cy])
      else setCol2([cx, cy])
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(null), [])

  /* ─── SVG positions for draggable handles (right panel) ─── */
  const col1SVG = toSVG(RIGHT_CX, RIGHT_CY, col1[0], col1[1])
  const col2SVG = toSVG(RIGHT_CX, RIGHT_CY, col2[0], col2[1])

  /* ─── Determinant of P ─── */
  const detP = col1[0] * col2[1] - col2[0] * col1[1]

  /* ─── Invariants ─── */
  const trace = A[0][0] + A[1][1]
  const detA = A[0][0] * A[1][1] - A[0][1] * A[1][0]

  /* ─── Check if near eigenbasis ─── */
  const isNearEigenbasis = useMemo(() => {
    // Check if columns are close to eigenvectors (up to scaling)
    const d1x = Math.abs(col1[0] - EIGVEC_1[0])
    const d1y = Math.abs(col1[1] - EIGVEC_1[1])
    const d2x = Math.abs(col2[0] - EIGVEC_2[0])
    const d2y = Math.abs(col2[1] - EIGVEC_2[1])
    return d1x < 0.02 && d1y < 0.02 && d2x < 0.02 && d2y < 0.02
  }, [col1, col2])

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
          <clipPath id="sim-left-clip">
            <rect x="0" y="0" width="400" height="400" />
          </clipPath>
          <clipPath id="sim-right-clip">
            <rect x="500" y="0" width="420" height="400" />
          </clipPath>
          <marker
            id="sim-col1"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL1_COLOR} />
          </marker>
          <marker
            id="sim-col2"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL2_COLOR} />
          </marker>
          <marker
            id="sim-col1-dim"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL1_COLOR} opacity="0.35" />
          </marker>
          <marker
            id="sim-col2-dim"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COL2_COLOR} opacity="0.35" />
          </marker>
        </defs>

        {/* ─── Panel labels ─── */}
        <text
          x={LEFT_CX}
          y={16}
          textAnchor="middle"
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.45)"
        >
          Standard basis
        </text>
        <text
          x={RIGHT_CX}
          y={16}
          textAnchor="middle"
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.45)"
        >
          Custom basis
        </text>

        {/* ─── Divider ─── */}
        <line
          x1="460"
          y1="20"
          x2="460"
          y2="390"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
        />

        {/* ═══════ LEFT PANEL (standard basis, A) ═══════ */}
        <g clipPath="url(#sim-left-clip)">
          {/* Identity grid (faded reference) */}
          {leftIdentityGrid.map((l) => (
            <polyline
              key={l.key}
              points={l.points}
              fill="none"
              stroke="rgba(0,0,0,0.04)"
              strokeWidth="1"
            />
          ))}

          {/* Transformed grid */}
          {leftGridLines.map((l) => (
            <polyline
              key={l.key}
              points={l.points}
              fill="none"
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="1"
            />
          ))}
        </g>

        {/* Left axes */}
        <line
          x1="0"
          y1={LEFT_CY}
          x2="400"
          y2={LEFT_CY}
          stroke="rgba(0,0,0,0.06)"
        />
        <line
          x1={LEFT_CX}
          y1="0"
          x2={LEFT_CX}
          y2="400"
          stroke="rgba(0,0,0,0.06)"
        />

        {/* Left: column vectors of A (static) */}
        {/* e1 -> Ae1 = (3, 0) */}
        {(() => {
          const [ex, ey] = toSVG(LEFT_CX, LEFT_CY, A[0][0], A[1][0])
          return (
            <g>
              <line
                x1={LEFT_CX}
                y1={LEFT_CY}
                x2={ex}
                y2={ey}
                stroke={COL1_COLOR}
                strokeWidth="2"
                opacity="0.35"
                markerEnd="url(#sim-col1-dim)"
              />
              <text
                x={ex + 8}
                y={ey - 8}
                fontSize="11"
                fontFamily={FONT}
                fill={COL1_COLOR}
                opacity="0.5"
              >
                Ae{"\u2081"}
              </text>
            </g>
          )
        })()}
        {/* e2 -> Ae2 = (1, 2) */}
        {(() => {
          const [ex, ey] = toSVG(LEFT_CX, LEFT_CY, A[0][1], A[1][1])
          return (
            <g>
              <line
                x1={LEFT_CX}
                y1={LEFT_CY}
                x2={ex}
                y2={ey}
                stroke={COL2_COLOR}
                strokeWidth="2"
                opacity="0.35"
                markerEnd="url(#sim-col2-dim)"
              />
              <text
                x={ex + 8}
                y={ey - 8}
                fontSize="11"
                fontFamily={FONT}
                fill={COL2_COLOR}
                opacity="0.5"
              >
                Ae{"\u2082"}
              </text>
            </g>
          )
        })()}

        {/* Left origin */}
        <circle cx={LEFT_CX} cy={LEFT_CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Left matrix label: A */}
        <g>
          <text
            x={30}
            y={36}
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.35)"
          >
            A =
          </text>
          <text
            x={26}
            y={56}
            fontSize="22"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.15)"
          >
            [
          </text>
          <text
            x={130}
            y={56}
            fontSize="22"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.15)"
          >
            ]
          </text>
          <text
            x={50}
            y={52}
            fontSize="13"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.55)"
          >
            <tspan fill={COL1_COLOR}>{fmt(A[0][0])}</tspan>
            {"  "}
            <tspan fill={COL2_COLOR}>{fmt(A[0][1])}</tspan>
          </text>
          <text
            x={50}
            y={70}
            fontSize="13"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.55)"
          >
            <tspan fill={COL1_COLOR}>{fmt(A[1][0])}</tspan>
            {"  "}
            <tspan fill={COL2_COLOR}>{fmt(A[1][1])}</tspan>
          </text>
        </g>

        {/* ═══════ RIGHT PANEL (custom basis, B = P⁻¹AP) ═══════ */}
        <g clipPath="url(#sim-right-clip)">
          {/* Identity grid (faded reference) */}
          {rightIdentityGrid.map((l) => (
            <polyline
              key={l.key}
              points={l.points}
              fill="none"
              stroke="rgba(74,124,111,0.04)"
              strokeWidth="1"
            />
          ))}

          {/* Transformed grid */}
          {!singular &&
            rightGridLines.map((l) => (
              <polyline
                key={l.key}
                points={l.points}
                fill="none"
                stroke="rgba(74,124,111,0.1)"
                strokeWidth="1"
              />
            ))}
        </g>

        {/* Right axes */}
        <line
          x1="500"
          y1={RIGHT_CY}
          x2="920"
          y2={RIGHT_CY}
          stroke="rgba(0,0,0,0.06)"
        />
        <line
          x1={RIGHT_CX}
          y1="0"
          x2={RIGHT_CX}
          y2="400"
          stroke="rgba(0,0,0,0.06)"
        />

        {/* Right: basis vectors (draggable) */}
        {/* Basis vector 1 (blue) */}
        <line
          x1={RIGHT_CX}
          y1={RIGHT_CY}
          x2={col1SVG[0]}
          y2={col1SVG[1]}
          stroke={COL1_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#sim-col1)"
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
          fontSize="12"
          fontFamily={FONT}
          fill={COL1_COLOR}
          fontWeight="600"
        >
          p{"\u2081"}
        </text>

        {/* Basis vector 2 (red) */}
        <line
          x1={RIGHT_CX}
          y1={RIGHT_CY}
          x2={col2SVG[0]}
          y2={col2SVG[1]}
          stroke={COL2_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#sim-col2)"
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
          fontSize="12"
          fontFamily={FONT}
          fill={COL2_COLOR}
          fontWeight="600"
        >
          p{"\u2082"}
        </text>

        {/* Right origin */}
        <circle cx={RIGHT_CX} cy={RIGHT_CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Right matrix label: B = P⁻¹AP */}
        <g>
          <text
            x={530}
            y={36}
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.35)"
          >
            B = P{"\u207B\u00B9"}AP
          </text>
          {singular ? (
            <text
              x={530}
              y={58}
              fontSize="11"
              fontFamily={FONT}
              fill="#c0503a"
            >
              singular basis
            </text>
          ) : (
            <g>
              <text
                x={526}
                y={56}
                fontSize="22"
                fontFamily={FONT}
                fill="rgba(0,0,0,0.15)"
              >
                [
              </text>
              <text
                x={636}
                y={56}
                fontSize="22"
                fontFamily={FONT}
                fill="rgba(0,0,0,0.15)"
              >
                ]
              </text>
              <text
                x={550}
                y={52}
                fontSize="13"
                fontFamily={FONT}
                fill="rgba(0,0,0,0.55)"
              >
                {fmt(B[0][0])}
                {"  "}
                {fmt(B[0][1])}
              </text>
              <text
                x={550}
                y={70}
                fontSize="13"
                fontFamily={FONT}
                fill="rgba(0,0,0,0.55)"
              >
                {fmt(B[1][0])}
                {"  "}
                {fmt(B[1][1])}
              </text>
            </g>
          )}
        </g>

        {/* ═══════ EIGENVALUE DISPLAY (below both panels) ═══════ */}
        <g>
          {/* Eigenvalues */}
          <text
            x={W / 2}
            y={420}
            textAnchor="middle"
            fontSize="18"
            fontFamily={FONT}
            fontWeight="700"
            fill={TEAL}
          >
            {"\u03BB\u2081"} = {EIGEN_1}
            {"     "}
            {"\u03BB\u2082"} = {EIGEN_2}
          </text>
          <text
            x={W / 2}
            y={440}
            textAnchor="middle"
            fontSize="11"
            fontFamily={FONT}
            fill={TEAL}
            opacity="0.7"
          >
            invariant under change of basis
          </text>

          {/* Trace and determinant */}
          <text
            x={W / 2}
            y={462}
            textAnchor="middle"
            fontSize="12"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.4)"
          >
            tr(A) = {trace}
            {"     "}
            det(A) = {detA}
            {"     "}
            <tspan fill="rgba(0,0,0,0.25)">(also invariant)</tspan>
          </text>
        </g>

        {/* Drag hint */}
        {!dragging && (
          <text
            x={RIGHT_CX}
            y={395}
            textAnchor="middle"
            fontSize="10"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.2)"
          >
            drag basis vectors p{"\u2081"}, p{"\u2082"} to change the basis
          </text>
        )}

        {/* Singular warning */}
        {singular && (
          <text
            x={RIGHT_CX}
            y={RIGHT_CY}
            textAnchor="middle"
            fontSize="12"
            fontFamily={FONT}
            fill="#c0503a"
            opacity="0.6"
          >
            basis vectors are linearly dependent
          </text>
        )}
      </svg>

      {/* ─── Controls ─── */}
      <div
        className="blog-figure__controls"
        style={{ justifyContent: "center", gap: "0.4rem", flexWrap: "wrap" }}
      >
        <button
          className="blog-figure__button"
          style={
            isNearEigenbasis
              ? { borderColor: TEAL, color: TEAL }
              : {}
          }
          onClick={() => animateTo(EIGVEC_1, EIGVEC_2)}
        >
          Snap to eigenbasis
        </button>
        <button
          className="blog-figure__button"
          onClick={() => animateTo([1, 0], [0, 1])}
        >
          Standard basis
        </button>
        <button
          className="blog-figure__button"
          onClick={() => animateTo([1.2, 0.3], [0.8, -1.1])}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
