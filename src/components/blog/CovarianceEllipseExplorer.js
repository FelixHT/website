import React, { useState, useMemo, useRef, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = 300
const CY = 220
const SCALE = 55

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const TEAL_FILL = "rgba(74,124,111,0.06)"
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const GREEN = "#4AA464"
const DOT_COLOR = "rgba(0,0,0,0.15)"
const AXIS_COLOR = "rgba(0,0,0,0.06)"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 7

/* ─── Seeded PRNG (mulberry32) ─── */
function mulberry(seed) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussRng(rng) {
  const u1 = rng() || 1e-15
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/* ─── Generate tilted Gaussian data ─── */
function generateData(n, seed, majorStd, minorStd, tiltDeg) {
  const rng = mulberry(seed)
  const tilt = (tiltDeg * Math.PI) / 180
  const cosT = Math.cos(tilt)
  const sinT = Math.sin(tilt)
  const points = []
  for (let i = 0; i < n; i++) {
    const x0 = majorStd * gaussRng(rng)
    const y0 = minorStd * gaussRng(rng)
    points.push([
      cosT * x0 - sinT * y0,
      sinT * x0 + cosT * y0,
    ])
  }
  return points
}

/* ─── Compute mean ─── */
function computeMean(pts) {
  const n = pts.length
  let mx = 0, my = 0
  for (const [x, y] of pts) { mx += x; my += y }
  return [mx / n, my / n]
}

/* ─── Compute 2x2 covariance matrix ─── */
function computeCovariance(pts, mean) {
  const n = pts.length
  let c00 = 0, c01 = 0, c11 = 0
  for (const [x, y] of pts) {
    const dx = x - mean[0]
    const dy = y - mean[1]
    c00 += dx * dx
    c01 += dx * dy
    c11 += dy * dy
  }
  return [
    [c00 / (n - 1), c01 / (n - 1)],
    [c01 / (n - 1), c11 / (n - 1)],
  ]
}

/* ─── 2x2 eigendecomposition (analytic) ─── */
function eigen2x2(C) {
  const a = C[0][0], b = C[0][1], d = C[1][1]
  const trace = a + d
  const det = a * d - b * b
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lambda1 = trace / 2 + disc
  const lambda2 = trace / 2 - disc

  // Eigenvectors
  let v1, v2
  if (Math.abs(b) > 1e-12) {
    v1 = [lambda1 - d, b]
    v2 = [lambda2 - d, b]
  } else if (Math.abs(a - d) > 1e-12) {
    v1 = a > d ? [1, 0] : [0, 1]
    v2 = a > d ? [0, 1] : [1, 0]
  } else {
    v1 = [1, 0]
    v2 = [0, 1]
  }

  // Normalize
  const len1 = Math.hypot(v1[0], v1[1])
  v1 = [v1[0] / len1, v1[1] / len1]
  const len2 = Math.hypot(v2[0], v2[1])
  v2 = [v2[0] / len2, v2[1] / len2]

  return { lambda1, lambda2, v1, v2 }
}

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

/* ─── Precomputed data ─── */
const DATA = generateData(60, 44, 2, 0.7, 40)
const MEAN = computeMean(DATA)
const COV = computeCovariance(DATA, MEAN)
const { lambda1, lambda2, v1, v2 } = eigen2x2(COV)

/* ─── Eigenvector angle (for ellipse rotation) ─── */
const eigAngle = Math.atan2(v1[1], v1[0])

export default function CovarianceEllipseExplorer() {
  /* ─── Direction vector state: angle in radians ─── */
  const [dirAngle, setDirAngle] = useState(Math.PI / 6)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef(null)

  /* ─── Direction unit vector ─── */
  const z = useMemo(() => [Math.cos(dirAngle), Math.sin(dirAngle)], [dirAngle])

  /* ─── Quadratic form z^T C z ─── */
  const quadForm = useMemo(() => {
    return COV[0][0] * z[0] * z[0] +
      2 * COV[0][1] * z[0] * z[1] +
      COV[1][1] * z[1] * z[1]
  }, [z])

  /* ─── Ellipse parametric path (1-sigma) ─── */
  const ellipsePath = useMemo(() => {
    const N = 100
    const pts = []
    const s1 = Math.sqrt(lambda1)
    const s2 = Math.sqrt(lambda2)
    const cosA = Math.cos(eigAngle)
    const sinA = Math.sin(eigAngle)
    for (let i = 0; i <= N; i++) {
      const theta = (2 * Math.PI * i) / N
      // Point on axis-aligned ellipse
      const ex = s1 * Math.cos(theta)
      const ey = s2 * Math.sin(theta)
      // Rotate by eigenvector angle, translate to mean
      const rx = cosA * ex - sinA * ey + MEAN[0]
      const ry = sinA * ex + cosA * ey + MEAN[1]
      const [sx, sy] = toSVG(rx, ry)
      pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`)
    }
    return `M ${pts[0]} L ${pts.slice(1).join(" ")} Z`
  }, [])

  /* ─── Variance bar: ranges from lambda2 (min) to lambda1 (max) ─── */
  const barMaxW = 100
  const barH = 8
  const barFrac = (quadForm - lambda2) / (lambda1 - lambda2 + 1e-12)

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
      // Direction relative to mean
      const dx = mx - MEAN[0]
      const dy = my - MEAN[1]
      const len = Math.hypot(dx, dy)
      if (len > 0.05) {
        setDirAngle(Math.atan2(dy, dx))
      }
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(false), [])

  /* ─── SVG positions ─── */
  const meanSVG = toSVG(MEAN[0], MEAN[1])
  const dirLen = 2.8
  const dirEndSVG = toSVG(MEAN[0] + z[0] * dirLen, MEAN[1] + z[1] * dirLen)
  const handleSVG = toSVG(MEAN[0] + z[0] * dirLen, MEAN[1] + z[1] * dirLen)

  // Eigenvector line endpoints
  const LINE_EXTENT = 4.5
  const eig1Start = toSVG(MEAN[0] - v1[0] * LINE_EXTENT, MEAN[1] - v1[1] * LINE_EXTENT)
  const eig1End = toSVG(MEAN[0] + v1[0] * LINE_EXTENT, MEAN[1] + v1[1] * LINE_EXTENT)
  const eig2Start = toSVG(MEAN[0] - v2[0] * LINE_EXTENT, MEAN[1] - v2[1] * LINE_EXTENT)
  const eig2End = toSVG(MEAN[0] + v2[0] * LINE_EXTENT, MEAN[1] + v2[1] * LINE_EXTENT)

  // Eigenvector label positions (shifted outward from ellipse edge)
  const labelOffset = Math.sqrt(lambda1) + 0.6
  const eig1LabelSVG = toSVG(
    MEAN[0] + v1[0] * labelOffset,
    MEAN[1] + v1[1] * labelOffset
  )
  const eig2LabelSVG = toSVG(
    MEAN[0] + v2[0] * (Math.sqrt(lambda2) + 0.5),
    MEAN[1] + v2[1] * (Math.sqrt(lambda2) + 0.5)
  )

  /* ─── Readout panel position ─── */
  const panelX = 510
  const panelY = 22

  /* ─── Snap detection ─── */
  const dotV1 = Math.abs(z[0] * v1[0] + z[1] * v1[1])
  const dotV2 = Math.abs(z[0] * v2[0] + z[1] * v2[1])
  const nearEig1 = dotV1 > 0.995
  const nearEig2 = dotV2 > 0.995

  return (
    <div style={{ width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          cursor: dragging ? "grabbing" : "default",
          userSelect: "none",
          touchAction: "none",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <clipPath id="cov-ellipse-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          <marker
            id="cov-dir-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={GREEN} />
          </marker>
        </defs>

        {/* ── Axes ── */}
        <line x1={30} y1={CY} x2={W - 190} y2={CY} stroke={AXIS_COLOR} />
        <line x1={CX} y1={20} x2={CX} y2={H - 10} stroke={AXIS_COLOR} />

        {/* ── Eigenvector direction lines ── */}
        <g clipPath="url(#cov-ellipse-clip)">
          <line
            x1={eig1Start[0]} y1={eig1Start[1]}
            x2={eig1End[0]} y2={eig1End[1]}
            stroke={BLUE}
            strokeWidth="1"
            opacity="0.3"
            strokeDasharray="6 4"
          />
          <line
            x1={eig2Start[0]} y1={eig2Start[1]}
            x2={eig2End[0]} y2={eig2End[1]}
            stroke={RED}
            strokeWidth="1"
            opacity="0.3"
            strokeDasharray="6 4"
          />
        </g>

        {/* ── Covariance ellipse ── */}
        <path
          d={ellipsePath}
          fill={TEAL_FILL}
          stroke={TEAL}
          strokeWidth="1.8"
        />

        {/* ── Data scatter ── */}
        {DATA.map((pt, i) => {
          const [sx, sy] = toSVG(pt[0], pt[1])
          return (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r="2.5"
              fill={DOT_COLOR}
            />
          )
        })}

        {/* ── Eigenvector labels ── */}
        <text
          x={eig1LabelSVG[0] + 4}
          y={eig1LabelSVG[1] - 6}
          fontSize="11"
          fontFamily={FONT}
          fill={BLUE}
          fontWeight="600"
        >
          {"\u03BB\u2081"} = {lambda1.toFixed(2)}
        </text>
        <text
          x={eig2LabelSVG[0] + 4}
          y={eig2LabelSVG[1] + 14}
          fontSize="11"
          fontFamily={FONT}
          fill={RED}
          fontWeight="600"
        >
          {"\u03BB\u2082"} = {lambda2.toFixed(2)}
        </text>

        {/* ── Direction vector (draggable) ── */}
        <line
          x1={meanSVG[0]}
          y1={meanSVG[1]}
          x2={dirEndSVG[0]}
          y2={dirEndSVG[1]}
          stroke={GREEN}
          strokeWidth="2"
          markerEnd="url(#cov-dir-arrow)"
        />

        {/* ── Drag handle ── */}
        <circle
          cx={handleSVG[0]}
          cy={handleSVG[1]}
          r={HANDLE_R}
          fill={GREEN}
          stroke="#fff"
          strokeWidth="2"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown}
        />

        {/* ── Direction label ── */}
        <text
          x={handleSVG[0] + 12}
          y={handleSVG[1] - 10}
          fontSize="11"
          fontFamily={FONT}
          fill={GREEN}
          fontWeight="600"
        >
          z
        </text>

        {/* ── Readout panel (top-right) ── */}
        <g>
          {/* Covariance matrix display */}
          <text
            x={panelX}
            y={panelY}
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.5)"
          >
            Covariance C
          </text>

          {/* Matrix brackets and values */}
          <text
            x={panelX}
            y={panelY + 20}
            fontSize="12"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.7)"
          >
            {"["}
          </text>
          <text
            x={panelX + 10}
            y={panelY + 20}
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.7)"
            textAnchor="start"
          >
            {COV[0][0].toFixed(2)}{"  "}{COV[0][1].toFixed(2)}
          </text>
          <text
            x={panelX + 120}
            y={panelY + 20}
            fontSize="12"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.7)"
          >
            {"]"}
          </text>

          <text
            x={panelX}
            y={panelY + 36}
            fontSize="12"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.7)"
          >
            {"["}
          </text>
          <text
            x={panelX + 10}
            y={panelY + 36}
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.7)"
            textAnchor="start"
          >
            {COV[1][0].toFixed(2)}{"  "}{COV[1][1].toFixed(2)}
          </text>
          <text
            x={panelX + 120}
            y={panelY + 36}
            fontSize="12"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.7)"
          >
            {"]"}
          </text>

          {/* Eigenvalues */}
          <text
            x={panelX}
            y={panelY + 64}
            fontSize="11"
            fontFamily={FONT}
            fill={BLUE}
          >
            {"\u03BB\u2081"} = {lambda1.toFixed(3)}
          </text>
          <text
            x={panelX + 90}
            y={panelY + 64}
            fontSize="11"
            fontFamily={FONT}
            fill={RED}
          >
            {"\u03BB\u2082"} = {lambda2.toFixed(3)}
          </text>

          {/* Quadratic form readout */}
          <text
            x={panelX}
            y={panelY + 96}
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.5)"
          >
            Variance along z
          </text>
          <text
            x={panelX}
            y={panelY + 116}
            fontSize="13"
            fontFamily={FONT}
            fill={GREEN}
            fontWeight="600"
          >
            {"z\u1D40Cz"} = {quadForm.toFixed(3)}
          </text>

          {/* Snap indicator */}
          {nearEig1 && (
            <text
              x={panelX}
              y={panelY + 134}
              fontSize="10"
              fontFamily={FONT}
              fill={BLUE}
              opacity="0.7"
            >
              = {"\u03BB\u2081"} (maximum)
            </text>
          )}
          {nearEig2 && (
            <text
              x={panelX}
              y={panelY + 134}
              fontSize="10"
              fontFamily={FONT}
              fill={RED}
              opacity="0.7"
            >
              = {"\u03BB\u2082"} (minimum)
            </text>
          )}

          {/* Variance magnitude bar */}
          <rect
            x={panelX}
            y={panelY + 146}
            width={barMaxW}
            height={barH}
            rx={barH / 2}
            fill="rgba(0,0,0,0.04)"
          />
          <rect
            x={panelX}
            y={panelY + 146}
            width={Math.max(2, barFrac * barMaxW)}
            height={barH}
            rx={barH / 2}
            fill={GREEN}
            opacity="0.6"
          />

          {/* Bar endpoints */}
          <text
            x={panelX}
            y={panelY + 168}
            fontSize="9"
            fontFamily={FONT}
            fill={RED}
            opacity="0.6"
          >
            {"\u03BB\u2082"}
          </text>
          <text
            x={panelX + barMaxW}
            y={panelY + 168}
            fontSize="9"
            fontFamily={FONT}
            fill={BLUE}
            opacity="0.6"
            textAnchor="end"
          >
            {"\u03BB\u2081"}
          </text>
        </g>

        {/* ── Axis labels ── */}
        <text
          x={W - 200}
          y={CY + 16}
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.3)"
        >
          Neuron 1
        </text>
        <text
          x={CX + 6}
          y={28}
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.3)"
        >
          Neuron 2
        </text>
      </svg>
    </div>
  )
}
