import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = 300
const CY = 210
const SCALE = 65

/* ─── Colors ─── */
const COL1_COLOR = "#3d6cb9"
const COL2_COLOR = "#4A7C6F"
const TARGET_COLOR = "#333"
const PROJ_COLOR = "#4AA464"
const RESIDUAL_COLOR = "rgba(0,0,0,0.2)"
const DIMMED = "rgba(0,0,0,0.12)"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 7

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

function fromSVG(sx, sy) {
  return [(sx - CX) / SCALE, -(sy - CY) / SCALE]
}

/* ─── 2x2 SVD ─── */
function computeSVD2x2(a11, a12, a21, a22) {
  // A^T A
  const ata00 = a11 * a11 + a21 * a21
  const ata01 = a11 * a12 + a21 * a22
  const ata11 = a12 * a12 + a22 * a22

  const trace = ata00 + ata11
  const det = ata00 * ata11 - ata01 * ata01
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))

  const lam1 = Math.max(0, trace / 2 + disc)
  const lam2 = Math.max(0, trace / 2 - disc)

  const s1 = Math.sqrt(lam1)
  const s2 = Math.sqrt(lam2)

  // Right singular vectors (eigenvectors of A^T A)
  function eigvec(lam) {
    const r0a = ata00 - lam
    const r0b = ata01
    const r1a = ata01
    const r1b = ata11 - lam

    let vx, vy
    if (Math.abs(r0a) + Math.abs(r0b) >= Math.abs(r1a) + Math.abs(r1b)) {
      if (Math.abs(r0b) > 1e-12) {
        vx = -r0b
        vy = r0a
      } else if (Math.abs(r0a) > 1e-12) {
        vx = r0a
        vy = -r0b
      } else {
        vx = 1
        vy = 0
      }
    } else {
      if (Math.abs(r1b) > 1e-12) {
        vx = -r1b
        vy = r1a
      } else if (Math.abs(r1a) > 1e-12) {
        vx = r1a
        vy = -r1b
      } else {
        vx = 0
        vy = 1
      }
    }

    const len = Math.hypot(vx, vy)
    return len > 1e-12 ? [vx / len, vy / len] : [1, 0]
  }

  let v1 = eigvec(lam1)
  let v2 = eigvec(lam2)

  // Gram-Schmidt to ensure orthogonality
  const dot12 = v1[0] * v2[0] + v1[1] * v2[1]
  v2 = [v2[0] - dot12 * v1[0], v2[1] - dot12 * v1[1]]
  const v2len = Math.hypot(v2[0], v2[1])
  if (v2len > 1e-12) {
    v2 = [v2[0] / v2len, v2[1] / v2len]
  } else {
    v2 = [-v1[1], v1[0]]
  }

  // Ensure proper rotation (det V = +1)
  if (v1[0] * v2[1] - v1[1] * v2[0] < 0) {
    v2 = [-v2[0], -v2[1]]
  }

  // Left singular vectors: u_i = A v_i / sigma_i
  let u1, u2
  if (s1 > 1e-12) {
    const av1x = a11 * v1[0] + a12 * v1[1]
    const av1y = a21 * v1[0] + a22 * v1[1]
    u1 = [av1x / s1, av1y / s1]
  } else {
    u1 = [1, 0]
  }

  if (s2 > 1e-12) {
    const av2x = a11 * v2[0] + a12 * v2[1]
    const av2y = a21 * v2[0] + a22 * v2[1]
    u2 = [av2x / s2, av2y / s2]
  } else {
    u2 = [-u1[1], u1[0]]
  }

  // Ensure proper rotation
  if (u1[0] * u2[1] - u1[1] * u2[0] < 0) {
    u2 = [-u2[0], -u2[1]]
  }

  return { s: [s1, s2], u: [u1, u2], v: [v1, v2] }
}

/* ─── Right-angle mark helper ─── */
function rightAnglePath(px, py, dx1, dy1, dx2, dy2, size) {
  // Draws a small square at point (px,py) along directions (dx1,dy1) and (dx2,dy2)
  const ax = px + dx1 * size
  const ay = py + dy1 * size
  const bx = px + dx1 * size + dx2 * size
  const by = py + dy1 * size + dy2 * size
  const cx = px + dx2 * size
  const cy = py + dy2 * size
  const [sax, say] = toSVG(ax, ay)
  const [sbx, sby] = toSVG(bx, by)
  const [scx, scy] = toSVG(cx, cy)
  return `M ${sax},${say} L ${sbx},${sby} L ${scx},${scy}`
}

export default function PseudoinverseExplorer() {
  const [col1, setCol1] = useState([1.8, 0.6])
  const [col2, setCol2] = useState([0.3, 1.7])
  const [target, setTarget] = useState([2.2, 1.8])
  const [threshold, setThreshold] = useState(0.1)
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)

  /* ─── SVD of A = [col1 | col2] ─── */
  const svd = useMemo(
    () => computeSVD2x2(col1[0], col2[0], col1[1], col2[1]),
    [col1, col2]
  )

  /* ─── Pseudoinverse computation with truncation ─── */
  const result = useMemo(() => {
    const { s, u, v } = svd

    // Determine which singular values are above threshold
    const active = [s[0] >= threshold, s[1] >= threshold]

    // Effective rank
    const rank = (active[0] ? 1 : 0) + (active[1] ? 1 : 0)

    // Pseudoinverse: A+ = V S+ U^T
    // A+ b = sum_i (active_i ? (1/s_i) * (u_i . b) * v_i : 0)
    const bx = target[0]
    const by = target[1]

    // Projection onto column space: proj_b = sum_i (active_i ? (u_i . b) * u_i : 0)
    let projX = 0
    let projY = 0
    let solX = 0
    let solY = 0

    for (let i = 0; i < 2; i++) {
      if (!active[i]) continue
      const uib = u[i][0] * bx + u[i][1] * by
      projX += uib * u[i][0]
      projY += uib * u[i][1]
      solX += (uib / s[i]) * v[i][0]
      solY += (uib / s[i]) * v[i][1]
    }

    // Residual
    const resX = bx - projX
    const resY = by - projY

    // Column space direction (for rank-1 visualization)
    // When rank is 1, column space is a line along the active u direction
    let colSpaceDir = null
    if (rank <= 1) {
      if (active[0]) {
        colSpaceDir = u[0]
      } else if (active[1]) {
        colSpaceDir = u[1]
      } else {
        // rank 0: pick col1 direction as fallback for display
        const len = Math.hypot(col1[0], col1[1])
        colSpaceDir = len > 0.01 ? [col1[0] / len, col1[1] / len] : [1, 0]
      }
    }

    // Null space direction (perpendicular to column space when rank 1)
    let nullSpaceDir = null
    if (rank === 1 && colSpaceDir) {
      nullSpaceDir = [-colSpaceDir[1], colSpaceDir[0]]
    }

    return {
      proj: [projX, projY],
      residual: [resX, resY],
      solution: [solX, solY],
      active,
      rank,
      colSpaceDir,
      nullSpaceDir,
    }
  }, [svd, target, threshold, col1])

  const { proj, residual, solution, active, rank, colSpaceDir, nullSpaceDir } =
    result

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
      else if (dragging === "col2") setCol2([mx, my])
      else if (dragging === "target") setTarget([mx, my])
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(null), [])

  /* ─── SVG positions ─── */
  const originSVG = toSVG(0, 0)
  const col1SVG = toSVG(col1[0], col1[1])
  const col2SVG = toSVG(col2[0], col2[1])
  const targetSVG = toSVG(target[0], target[1])
  const projSVG = toSVG(proj[0], proj[1])

  /* ─── Right-angle mark at projection point ─── */
  const residualLen = Math.hypot(residual[0], residual[1])
  const rightAngle = useMemo(() => {
    if (residualLen < 0.05) return null
    // Direction along residual (proj -> b)
    const rdx = residual[0] / residualLen
    const rdy = residual[1] / residualLen
    // Direction along column space at projection point (tangent to column space)
    // Use perpendicular to residual as tangent
    const tdx = -rdy
    const tdy = rdx
    const markSize = 0.15
    return rightAnglePath(proj[0], proj[1], tdx, tdy, rdx, rdy, markSize)
  }, [proj, residual, residualLen])

  /* ─── Column space visualization ─── */
  const colSpaceLine = useMemo(() => {
    if (!colSpaceDir) return null
    const ext = 600
    return {
      x1: CX - colSpaceDir[0] * ext,
      y1: CY + colSpaceDir[1] * ext,
      x2: CX + colSpaceDir[0] * ext,
      y2: CY - colSpaceDir[1] * ext,
    }
  }, [colSpaceDir])

  /* ─── Determine column space status ─── */
  // Check if columns are nearly dependent using the actual singular values
  const isRankDeficient = rank < 2

  /* ─── Readout text ─── */
  const rankLabel = rank === 0 ? "rank 0" : rank === 1 ? "rank 1" : "rank 2"

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
          <clipPath id="pinv-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          <marker
            id="pinv-c1"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill={active[0] ? COL1_COLOR : DIMMED}
            />
          </marker>
          <marker
            id="pinv-c2"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill={active[1] ? COL2_COLOR : DIMMED}
            />
          </marker>
          <marker
            id="pinv-target"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={TARGET_COLOR} />
          </marker>
          <marker
            id="pinv-proj"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PROJ_COLOR} />
          </marker>
        </defs>

        {/* ── Column space region ── */}
        {rank >= 2 && (
          <rect
            x="0"
            y="0"
            width={W}
            height={H}
            fill="rgba(74, 164, 100, 0.04)"
          />
        )}

        {/* ── Column space line (rank 1 or 0) ── */}
        {colSpaceLine && (
          <line
            x1={colSpaceLine.x1}
            y1={colSpaceLine.y1}
            x2={colSpaceLine.x2}
            y2={colSpaceLine.y2}
            stroke={PROJ_COLOR}
            strokeWidth={rank === 0 ? 2 : 3.5}
            opacity={rank === 0 ? 0.15 : 0.25}
            clipPath="url(#pinv-clip)"
          />
        )}

        {/* ── Null space direction (rank 1) ── */}
        {nullSpaceDir && (
          <>
            <line
              x1={CX - nullSpaceDir[0] * 600}
              y1={CY + nullSpaceDir[1] * 600}
              x2={CX + nullSpaceDir[0] * 600}
              y2={CY - nullSpaceDir[1] * 600}
              stroke="rgba(200, 160, 60, 0.35)"
              strokeWidth="2"
              strokeDasharray="8,5"
              clipPath="url(#pinv-clip)"
            />
            <text
              x={CX + nullSpaceDir[0] * 130}
              y={CY - nullSpaceDir[1] * 130}
              textAnchor="middle"
              fontSize="10"
              fontFamily={FONT}
              fill="rgba(180,140,40,0.7)"
            >
              null space
            </text>
          </>
        )}

        {/* ── Column space label (rank 1) ── */}
        {colSpaceDir && rank === 1 && (
          <text
            x={CX + colSpaceDir[0] * 170}
            y={CY - colSpaceDir[1] * 170 - 10}
            textAnchor="middle"
            fontSize="10"
            fontFamily={FONT}
            fill={PROJ_COLOR}
            opacity="0.7"
          >
            col space
          </text>
        )}

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

        {/* ── Residual vector (b - proj_b), dashed ── */}
        {residualLen > 0.03 && (
          <line
            x1={projSVG[0]}
            y1={projSVG[1]}
            x2={targetSVG[0]}
            y2={targetSVG[1]}
            stroke={RESIDUAL_COLOR}
            strokeWidth="1.5"
            strokeDasharray="5,4"
          />
        )}

        {/* ── Right-angle mark ── */}
        {rightAngle && (
          <path
            d={rightAngle}
            fill="none"
            stroke={RESIDUAL_COLOR}
            strokeWidth="1"
          />
        )}

        {/* ── Projection vector (origin -> proj_b) ── */}
        {Math.hypot(proj[0], proj[1]) > 0.03 && (
          <line
            x1={originSVG[0]}
            y1={originSVG[1]}
            x2={projSVG[0]}
            y2={projSVG[1]}
            stroke={PROJ_COLOR}
            strokeWidth="2"
            markerEnd="url(#pinv-proj)"
          />
        )}

        {/* ── Column vector 1 ── */}
        <line
          x1={originSVG[0]}
          y1={originSVG[1]}
          x2={col1SVG[0]}
          y2={col1SVG[1]}
          stroke={active[0] ? COL1_COLOR : DIMMED}
          strokeWidth="2.5"
          markerEnd="url(#pinv-c1)"
        />
        <circle
          cx={col1SVG[0]}
          cy={col1SVG[1]}
          r={HANDLE_R}
          fill={active[0] ? COL1_COLOR : DIMMED}
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
          fill={active[0] ? COL1_COLOR : DIMMED}
          fontWeight="600"
        >
          a{"\u2081"}
        </text>

        {/* ── Column vector 2 ── */}
        <line
          x1={originSVG[0]}
          y1={originSVG[1]}
          x2={col2SVG[0]}
          y2={col2SVG[1]}
          stroke={active[1] ? COL2_COLOR : DIMMED}
          strokeWidth="2.5"
          markerEnd="url(#pinv-c2)"
        />
        <circle
          cx={col2SVG[0]}
          cy={col2SVG[1]}
          r={HANDLE_R}
          fill={active[1] ? COL2_COLOR : DIMMED}
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
          fill={active[1] ? COL2_COLOR : DIMMED}
          fontWeight="600"
        >
          a{"\u2082"}
        </text>

        {/* ── Target vector b ── */}
        <line
          x1={originSVG[0]}
          y1={originSVG[1]}
          x2={targetSVG[0]}
          y2={targetSVG[1]}
          stroke={TARGET_COLOR}
          strokeWidth="2"
          markerEnd="url(#pinv-target)"
        />
        <circle
          cx={targetSVG[0]}
          cy={targetSVG[1]}
          r={HANDLE_R}
          fill={TARGET_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown("target")}
        />
        <text
          x={targetSVG[0] + 12}
          y={targetSVG[1] - 10}
          fontSize="14"
          fontFamily={FONT}
          fill={TARGET_COLOR}
          fontWeight="600"
        >
          b
        </text>

        {/* ── Projection point ── */}
        <circle
          cx={projSVG[0]}
          cy={projSVG[1]}
          r={4}
          fill={PROJ_COLOR}
          stroke="#fff"
          strokeWidth="1"
        />
        <text
          x={projSVG[0] + 10}
          y={projSVG[1] + 16}
          fontSize="11"
          fontFamily={FONT}
          fill={PROJ_COLOR}
          fontWeight="600"
        >
          proj b
        </text>

        {/* ── Origin ── */}
        <circle
          cx={originSVG[0]}
          cy={originSVG[1]}
          r="3"
          fill="rgba(0,0,0,0.25)"
        />

        {/* ── Readouts (top-right) ── */}
        <text
          x={W - 16}
          y={24}
          textAnchor="end"
          fontSize="13"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.55)"
        >
          x = A{"\u207A"}b
        </text>
        <text
          x={W - 16}
          y={44}
          textAnchor="end"
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.45)"
        >
          {"= ["}
          {solution[0].toFixed(2)}, {solution[1].toFixed(2)}
          {"]"}
        </text>

        <text
          x={W - 16}
          y={68}
          textAnchor="end"
          fontSize="11"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.35)"
        >
          {"\u2016"}b {"\u2212"} Ax{"\u2016"} ={" "}
          {residualLen.toFixed(3)}
        </text>

        <text
          x={W - 16}
          y={88}
          textAnchor="end"
          fontSize="11"
          fontFamily={FONT}
          fill={isRankDeficient ? "rgba(200,140,40,0.8)" : "rgba(0,0,0,0.35)"}
        >
          {rankLabel}
        </text>

        {/* ── Singular values ── */}
        <text
          x={W - 16}
          y={112}
          textAnchor="end"
          fontSize="10"
          fontFamily={FONT}
          fill={active[0] ? COL1_COLOR : DIMMED}
        >
          {"\u03C3\u2081"} = {svd.s[0].toFixed(2)}
          {!active[0] ? "  (truncated)" : ""}
        </text>
        <text
          x={W - 16}
          y={128}
          textAnchor="end"
          fontSize="10"
          fontFamily={FONT}
          fill={active[1] ? COL2_COLOR : DIMMED}
        >
          {"\u03C3\u2082"} = {svd.s[1].toFixed(2)}
          {!active[1] ? "  (truncated)" : ""}
        </text>

        {/* ── Matrix display (top-left) ── */}
        <text
          x={16}
          y={24}
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {"A = ["}
          <tspan fill={active[0] ? COL1_COLOR : DIMMED}>
            {col1[0].toFixed(1)}
          </tspan>
          {"  "}
          <tspan fill={active[1] ? COL2_COLOR : DIMMED}>
            {col2[0].toFixed(1)}
          </tspan>
          {"]"}
        </text>
        <text
          x={16}
          y={40}
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {"    ["}
          <tspan fill={active[0] ? COL1_COLOR : DIMMED}>
            {col1[1].toFixed(1)}
          </tspan>
          {"  "}
          <tspan fill={active[1] ? COL2_COLOR : DIMMED}>
            {col2[1].toFixed(1)}
          </tspan>
          {"]"}
        </text>

        {/* ── Drag hint ── */}
        {!dragging && (
          <text
            x={CX}
            y={H - 10}
            textAnchor="middle"
            fontSize="10"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.2)"
          >
            drag column vectors or target b
          </text>
        )}
      </svg>

      {/* ── Truncation threshold slider ── */}
      <div
        className="dim-explorer__slider"
        style={{ maxWidth: 340, margin: "0 auto" }}
      >
        <label className="dim-explorer__label">
          truncation threshold: <strong>{threshold.toFixed(2)}</strong>
        </label>
        <input
          className="dim-explorer__range"
          type="range"
          min="0"
          max="3"
          step="0.01"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
        />
      </div>
    </div>
  )
}
