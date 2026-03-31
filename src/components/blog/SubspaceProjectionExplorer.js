import React, { useState, useRef, useMemo, useCallback } from "react"

/* ────────────────────────────────────────────
   Seeded PRNG (mulberry32)
   ──────────────────────────────────────────── */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ────────────────────────────────────────────
   Box-Muller transform for normal samples
   ──────────────────────────────────────────── */
function boxMuller(rng) {
  const u1 = rng()
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
}

/* ────────────────────────────────────────────
   Layout constants
   ──────────────────────────────────────────── */
const W = 700
const H = 420
const CX = W / 2
const CY = H / 2
const SCALE = 50

const FONT = "var(--font-mono, monospace)"
const GREEN = "#4AA464"
const TEAL = "#4A7C6F"
const HANDLE_R = 7

/* ────────────────────────────────────────────
   Coordinate transforms
   ──────────────────────────────────────────── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

/* ────────────────────────────────────────────
   Data generation: tilted elliptical Gaussian
   ~40 points, major axis at ~40°, 4:1 variance
   ──────────────────────────────────────────── */
const N_POINTS = 40
const TILT = (40 * Math.PI) / 180 // 40 degrees
const MAJOR_STD = 2.0
const MINOR_STD = 1.0 // major variance = 4, minor = 1

function generateData() {
  const rng = mulberry32(42)
  const cosT = Math.cos(TILT)
  const sinT = Math.sin(TILT)
  const points = []

  for (let i = 0; i < N_POINTS; i++) {
    // Axis-aligned sample
    const x0 = boxMuller(rng) * MAJOR_STD
    const y0 = boxMuller(rng) * MINOR_STD
    // Rotate into tilted frame
    const x = cosT * x0 - sinT * y0
    const y = sinT * x0 + cosT * y0
    points.push([x, y])
  }

  return points
}

/* ────────────────────────────────────────────
   PCA: analytical 2×2 covariance eigenvectors
   ──────────────────────────────────────────── */
function computePCA(points) {
  const n = points.length
  // Mean-center
  let mx = 0,
    my = 0
  for (const [x, y] of points) {
    mx += x
    my += y
  }
  mx /= n
  my /= n

  // Covariance matrix
  let s00 = 0,
    s01 = 0,
    s11 = 0
  for (const [x, y] of points) {
    const dx = x - mx
    const dy = y - my
    s00 += dx * dx
    s01 += dx * dy
    s11 += dy * dy
  }
  s00 /= n - 1
  s01 /= n - 1
  s11 /= n - 1

  // Eigenvalues of 2×2 symmetric matrix
  const trace = s00 + s11
  const det = s00 * s11 - s01 * s01
  const disc = Math.sqrt(Math.max(0, (trace * trace) / 4 - det))
  const lam1 = trace / 2 + disc
  const lam2 = trace / 2 - disc

  // Eigenvector for largest eigenvalue
  let pc1
  if (Math.abs(s01) > 1e-10) {
    pc1 = [lam1 - s11, s01]
  } else {
    pc1 = s00 >= s11 ? [1, 0] : [0, 1]
  }
  // Normalize
  const len = Math.hypot(pc1[0], pc1[1])
  pc1 = [pc1[0] / len, pc1[1] / len]

  // Total variance
  const totalVariance = lam1 + lam2

  return { pc1, eigenvalues: [lam1, lam2], totalVariance, mean: [mx, my] }
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
export default function SubspaceProjectionExplorer() {
  const [lineAngle, setLineAngle] = useState(Math.PI * 0.15)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef(null)

  const [data] = useState(() => generateData())

  /* ─── PCA (computed once) ─── */
  const pca = useMemo(() => computePCA(data), [data])

  /* ─── Line direction unit vector ─── */
  const direction = useMemo(
    () => [Math.cos(lineAngle), Math.sin(lineAngle)],
    [lineAngle]
  )

  /* ─── Projections and variance captured ─── */
  const { projections, projectedPoints, residuals, varianceCaptured } =
    useMemo(() => {
      const dx = direction[0]
      const dy = direction[1]

      const projs = []
      const projPts = []
      const resids = []

      for (const [px, py] of data) {
        // Scalar projection onto direction
        const dot = px * dx + py * dy
        // Projected point on line
        const projX = dot * dx
        const projY = dot * dy
        projs.push(dot)
        projPts.push([projX, projY])
        resids.push([px - projX, py - projY])
      }

      // Variance of projected scalars
      const n = projs.length
      let mean = 0
      for (const v of projs) mean += v
      mean /= n
      let varProj = 0
      for (const v of projs) varProj += (v - mean) * (v - mean)
      varProj /= n - 1

      const captured = pca.totalVariance > 0 ? varProj / pca.totalVariance : 0

      return {
        projections: projs,
        projectedPoints: projPts,
        residuals: resids,
        varianceCaptured: Math.min(captured, 1),
      }
    }, [data, direction, pca.totalVariance])

  /* ─── PC1 angle ─── */
  const pc1Angle = useMemo(
    () => Math.atan2(pca.pc1[1], pca.pc1[0]),
    [pca.pc1]
  )

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
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
      // SVG y is inverted relative to math y
      const angle = Math.atan2(-(svgP.y - CY), svgP.x - CX)
      setLineAngle(angle)
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  /* ─── Compute SVG positions ─── */

  // Subspace line: extend across the full SVG
  const lineExtent = 400
  const lineStart = [
    CX - direction[0] * lineExtent,
    CY + direction[1] * lineExtent,
  ]
  const lineEnd = [
    CX + direction[0] * lineExtent,
    CY - direction[1] * lineExtent,
  ]

  // Handle position (at tip of the visible line segment)
  const handleDist = 180
  const handlePos = [
    CX + direction[0] * handleDist,
    CY - direction[1] * handleDist,
  ]

  // PC1 dashed line
  const pc1Start = [
    CX - pca.pc1[0] * lineExtent,
    CY + pca.pc1[1] * lineExtent,
  ]
  const pc1End = [
    CX + pca.pc1[0] * lineExtent,
    CY - pca.pc1[1] * lineExtent,
  ]

  // Variance readout
  const varPct = (varianceCaptured * 100).toFixed(1)
  const varColor = varianceCaptured > 0.8 ? GREEN : "rgba(0,0,0,0.55)"

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
          <clipPath id="subproj-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>

        {/* ── Axes ── */}
        <line
          x1={0}
          y1={CY}
          x2={W}
          y2={CY}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
        />
        <line
          x1={CX}
          y1={0}
          x2={CX}
          y2={H}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
        />

        {/* ── PC1 dashed line ── */}
        <line
          x1={pc1Start[0]}
          y1={pc1Start[1]}
          x2={pc1End[0]}
          y2={pc1End[1]}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1"
          strokeDasharray="6,4"
          clipPath="url(#subproj-clip)"
        />
        <text
          x={CX + pca.pc1[0] * (handleDist + 22)}
          y={CY - pca.pc1[1] * (handleDist + 22) + 4}
          textAnchor="middle"
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.3)"
        >
          PC1
        </text>

        {/* ── Residual lines (behind everything) ── */}
        {data.map(([px, py], i) => {
          const [sx, sy] = toSVG(px, py)
          const [prx, pry] = toSVG(
            projectedPoints[i][0],
            projectedPoints[i][1]
          )
          return (
            <line
              key={`res-${i}`}
              x1={sx}
              y1={sy}
              x2={prx}
              y2={pry}
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="0.75"
            />
          )
        })}

        {/* ── Subspace line (the green draggable line) ── */}
        <line
          x1={lineStart[0]}
          y1={lineStart[1]}
          x2={lineEnd[0]}
          y2={lineEnd[1]}
          stroke={GREEN}
          strokeWidth="2"
          clipPath="url(#subproj-clip)"
        />

        {/* ── Projected points on the line ── */}
        {projectedPoints.map(([prx, pry], i) => {
          const [sx, sy] = toSVG(prx, pry)
          return (
            <circle
              key={`proj-${i}`}
              cx={sx}
              cy={sy}
              r={2.5}
              fill={TEAL}
              opacity="0.7"
            />
          )
        })}

        {/* ── Data points (scatter) ── */}
        {data.map(([px, py], i) => {
          const [sx, sy] = toSVG(px, py)
          return (
            <circle
              key={`pt-${i}`}
              cx={sx}
              cy={sy}
              r={3}
              fill="rgba(0,0,0,0.25)"
            />
          )
        })}

        {/* ── Draggable handle ── */}
        <circle
          cx={handlePos[0]}
          cy={handlePos[1]}
          r={HANDLE_R}
          fill={GREEN}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown}
        />

        {/* ── Variance readout (top-right) ── */}
        <text
          x={W - 20}
          y={28}
          textAnchor="end"
          fontSize="13"
          fontFamily={FONT}
          fill={varColor}
          fontWeight="600"
        >
          {`variance captured: ${varPct}%`}
        </text>

        {/* ── Drag hint (bottom center) ── */}
        {!dragging && (
          <text
            x={CX}
            y={H - 14}
            textAnchor="middle"
            fontSize="10"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.25)"
          >
            drag green handle to rotate subspace
          </text>
        )}
      </svg>
    </div>
  )
}
