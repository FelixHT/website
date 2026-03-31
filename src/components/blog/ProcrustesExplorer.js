import React, { useState, useRef, useMemo, useCallback, useEffect } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = W / 2
const CY = H / 2
const SCALE = 50
const ANIM_DURATION = 600
const N_POINTS = 8

/* ─── Colors ─── */
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const TEAL = "#4A7C6F"
const FONT = "var(--font-mono, monospace)"
const HANDLE_R = 6

/* ─── Seeded PRNG (mulberry32) ─── */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─── Generate matched point clouds ─── */
function generatePoints(seed) {
  const rng = mulberry32(seed)

  // Generate X: base points spread around the origin
  const X = []
  for (let i = 0; i < N_POINTS; i++) {
    const angle = (2 * Math.PI * i) / N_POINTS + (rng() - 0.5) * 0.6
    const radius = 1.8 + rng() * 1.6
    X.push([radius * Math.cos(angle), radius * Math.sin(angle)])
  }

  // Rotate by ~40 degrees and add small noise to get Y
  const theta = (40 * Math.PI) / 180
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)
  const Y = X.map(([x, y]) => {
    const rx = cosT * x - sinT * y
    const ry = sinT * x + cosT * y
    return [rx + (rng() - 0.5) * 0.25, ry + (rng() - 0.5) * 0.25]
  })

  return { X, Y }
}

const SEED = 42
const { X: X_BASE, Y: Y_BASE } = generatePoints(SEED)

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

/* ─── Center a point cloud (subtract centroid) ─── */
function center(pts) {
  const n = pts.length
  let cx = 0, cy = 0
  for (let i = 0; i < n; i++) {
    cx += pts[i][0]
    cy += pts[i][1]
  }
  cx /= n
  cy /= n
  return pts.map(([x, y]) => [x - cx, y - cy])
}

/* ─── Compute SVD-based optimal rotation R = V U^T from cross-covariance Y^T X ─── */
// Cross-covariance M = Y_centered^T X_centered (2x2)
// SVD of M: M = U S V^T
// Optimal rotation R = V U^T
function computeProcrustesRotation(X, Y) {
  const Xc = center(X)
  const Yc = center(Y)
  const n = Xc.length

  // Cross-covariance M = Y^T X (2x2)
  let m00 = 0, m01 = 0, m10 = 0, m11 = 0
  for (let i = 0; i < n; i++) {
    m00 += Yc[i][0] * Xc[i][0]
    m01 += Yc[i][0] * Xc[i][1]
    m10 += Yc[i][1] * Xc[i][0]
    m11 += Yc[i][1] * Xc[i][1]
  }
  const M = [[m00, m01], [m10, m11]]

  // SVD of 2x2 matrix M
  // M^T M
  const MtM = [
    [M[0][0] * M[0][0] + M[1][0] * M[1][0], M[0][0] * M[0][1] + M[1][0] * M[1][1]],
    [M[0][1] * M[0][0] + M[1][1] * M[1][0], M[0][1] * M[0][1] + M[1][1] * M[1][1]],
  ]

  const trace = MtM[0][0] + MtM[1][1]
  const det = MtM[0][0] * MtM[1][1] - MtM[0][1] * MtM[1][0]
  const disc = Math.max(trace * trace - 4 * det, 0)
  const sqrtDisc = Math.sqrt(disc)

  const lambda1 = Math.max((trace + sqrtDisc) / 2, 0)
  const lambda2 = Math.max((trace - sqrtDisc) / 2, 0)

  const sigma1 = Math.sqrt(lambda1)
  const sigma2 = Math.sqrt(lambda2)

  // Eigenvectors of M^T M
  function eigenvec(mat, lam) {
    const a = mat[0][0] - lam
    const b = mat[0][1]
    const c = mat[1][0]
    const d = mat[1][1] - lam

    let vx, vy
    if (Math.abs(a) + Math.abs(b) >= Math.abs(c) + Math.abs(d)) {
      if (Math.abs(b) > 1e-12) {
        vx = -b; vy = a
      } else if (Math.abs(a) > 1e-12) {
        vx = -b; vy = a
      } else {
        vx = 1; vy = 0
      }
    } else {
      if (Math.abs(d) > 1e-12) {
        vx = -d; vy = c
      } else if (Math.abs(c) > 1e-12) {
        vx = -d; vy = c
      } else {
        vx = 1; vy = 0
      }
    }

    const len = Math.hypot(vx, vy)
    if (len < 1e-12) return [1, 0]
    return [vx / len, vy / len]
  }

  let v1 = eigenvec(MtM, lambda1)
  let v2 = eigenvec(MtM, lambda2)

  // Gram-Schmidt orthogonalize v2 against v1
  const dot12 = v1[0] * v2[0] + v1[1] * v2[1]
  v2 = [v2[0] - dot12 * v1[0], v2[1] - dot12 * v1[1]]
  const v2len = Math.hypot(v2[0], v2[1])
  if (v2len > 1e-12) {
    v2 = [v2[0] / v2len, v2[1] / v2len]
  } else {
    v2 = [-v1[1], v1[0]]
  }

  // Ensure V has det +1
  if (v1[0] * v2[1] - v1[1] * v2[0] < 0) {
    v2 = [-v2[0], -v2[1]]
  }

  const V = [[v1[0], v2[0]], [v1[1], v2[1]]]

  // U columns: u_i = M v_i / sigma_i
  let u1, u2
  if (sigma1 > 1e-12) {
    const mv = [M[0][0] * v1[0] + M[0][1] * v1[1], M[1][0] * v1[0] + M[1][1] * v1[1]]
    u1 = [mv[0] / sigma1, mv[1] / sigma1]
  } else {
    u1 = [1, 0]
  }

  if (sigma2 > 1e-12) {
    const mv = [M[0][0] * v2[0] + M[0][1] * v2[1], M[1][0] * v2[0] + M[1][1] * v2[1]]
    u2 = [mv[0] / sigma2, mv[1] / sigma2]
  } else {
    u2 = [-u1[1], u1[0]]
  }

  // Ensure U has det +1
  if (u1[0] * u2[1] - u1[1] * u2[0] < 0) {
    u2 = [-u2[0], -u2[1]]
  }

  const U = [[u1[0], u2[0]], [u1[1], u2[1]]]

  // Ensure proper rotation (det +1) by checking det(M) = det(U) * det(V)
  // If det(M) < 0, flip the sign of the column of V corresponding to smallest sigma
  const detM = M[0][0] * M[1][1] - M[0][1] * M[1][0]
  if (detM < 0) {
    // Negate second column of V (smallest singular value)
    V[0][1] = -V[0][1]
    V[1][1] = -V[1][1]
  }

  // R = V U^T
  const R = [
    [V[0][0] * U[0][0] + V[0][1] * U[0][1], V[0][0] * U[1][0] + V[0][1] * U[1][1]],
    [V[1][0] * U[0][0] + V[1][1] * U[0][1], V[1][0] * U[1][0] + V[1][1] * U[1][1]],
  ]

  return R
}

/* ─── Apply 2x2 rotation to a point ─── */
function applyRot(R, p) {
  return [R[0][0] * p[0] + R[0][1] * p[1], R[1][0] * p[0] + R[1][1] * p[1]]
}

/* ─── Compute Frobenius norm of residual ─── */
function frobeniusResidual(X, Y) {
  const Xc = center(X)
  const Yc = center(Y)
  let sum = 0
  for (let i = 0; i < Xc.length; i++) {
    const dx = Xc[i][0] - Yc[i][0]
    const dy = Xc[i][1] - Yc[i][1]
    sum += dx * dx + dy * dy
  }
  return Math.sqrt(sum)
}

/* ─── Interpolate rotation as an angle ─── */
function rotationAngle(R) {
  return Math.atan2(R[1][0], R[0][0])
}

function rotFromAngle(a) {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [[c, -s], [s, c]]
}

export default function ProcrustesExplorer() {
  const [yPoints, setYPoints] = useState(Y_BASE)
  const [animProgress, setAnimProgress] = useState(0) // 0 = misaligned, 1 = aligned
  const [dragging, setDragging] = useState(null) // index or null
  const [isAnimating, setIsAnimating] = useState(false)
  const animRef = useRef(null)
  const svgRef = useRef(null)

  /* ─── Centroids ─── */
  const xCentroid = useMemo(() => {
    let cx = 0, cy = 0
    for (let i = 0; i < N_POINTS; i++) {
      cx += X_BASE[i][0]; cy += X_BASE[i][1]
    }
    return [cx / N_POINTS, cy / N_POINTS]
  }, [])

  const yCentroid = useMemo(() => {
    let cx = 0, cy = 0
    for (let i = 0; i < N_POINTS; i++) {
      cx += yPoints[i][0]; cy += yPoints[i][1]
    }
    return [cx / N_POINTS, cy / N_POINTS]
  }, [yPoints])

  /* ─── Compute optimal rotation ─── */
  const optimalR = useMemo(
    () => computeProcrustesRotation(X_BASE, yPoints),
    [yPoints]
  )

  const optimalAngle = useMemo(() => rotationAngle(optimalR), [optimalR])

  /* ─── Current rotation angle (animated) ─── */
  const currentAngle = useMemo(
    () => optimalAngle * easeOutCubic(animProgress),
    [optimalAngle, animProgress]
  )

  const currentR = useMemo(() => rotFromAngle(currentAngle), [currentAngle])

  /* ─── Compute displayed Y points (centered, rotated, re-centered to X centroid) ─── */
  const displayY = useMemo(() => {
    const Yc = center(yPoints)
    return Yc.map((p) => {
      const rotated = applyRot(currentR, p)
      // Translate rotated-centered Y toward X centroid based on animation progress
      const tx = yCentroid[0] + (xCentroid[0] - yCentroid[0]) * easeOutCubic(animProgress)
      const ty = yCentroid[1] + (xCentroid[1] - yCentroid[1]) * easeOutCubic(animProgress)
      return [rotated[0] + tx, rotated[1] + ty]
    })
  }, [yPoints, currentR, animProgress, xCentroid, yCentroid])

  /* ─── Frobenius residual of current display ─── */
  const residual = useMemo(() => {
    let sum = 0
    for (let i = 0; i < N_POINTS; i++) {
      const dx = X_BASE[i][0] - displayY[i][0]
      const dy = X_BASE[i][1] - displayY[i][1]
      sum += dx * dx + dy * dy
    }
    return Math.sqrt(sum)
  }, [displayY])

  /* ─── Initial residual (for context) ─── */
  const initialResidual = useMemo(() => frobeniusResidual(X_BASE, yPoints), [yPoints])

  /* ─── Animate alignment ─── */
  const animate = useCallback(
    (forward) => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      const startProgress = animProgress
      const targetProgress = forward ? 1 : 0
      if (Math.abs(startProgress - targetProgress) < 0.001) return
      const t0 = performance.now()
      setIsAnimating(true)

      function tick(now) {
        const elapsed = now - t0
        const rawT = Math.min(elapsed / ANIM_DURATION, 1)
        const current = startProgress + (targetProgress - startProgress) * rawT
        setAnimProgress(current)
        if (rawT < 1) {
          animRef.current = requestAnimationFrame(tick)
        } else {
          animRef.current = null
          setIsAnimating(false)
        }
      }

      animRef.current = requestAnimationFrame(tick)
    },
    [animProgress]
  )

  const handleAlign = useCallback(() => animate(true), [animate])

  const handleReset = useCallback(() => {
    if (animProgress > 0) {
      animate(false)
    } else {
      // Full reset: restore original Y points
      setYPoints(Y_BASE)
    }
  }, [animate, animProgress])

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  /* ─── Re-compute alignment when points are dragged ─── */
  useEffect(() => {
    if (dragging !== null && animProgress > 0) {
      setAnimProgress(0)
    }
  }, [yPoints, dragging, animProgress])

  /* ─── Pointer handlers for dragging Y points ─── */
  const handlePointerDown = useCallback(
    (index) => (e) => {
      if (isAnimating) return
      e.target.setPointerCapture(e.pointerId)
      setDragging(index)
      // Reset alignment when dragging
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
        setIsAnimating(false)
      }
      setAnimProgress(0)
    },
    [isAnimating]
  )

  const handlePointerMove = useCallback(
    (e) => {
      if (dragging === null) return
      const svg = svgRef.current
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const sp = pt.matrixTransform(svg.getScreenCTM().inverse())
      const [mx, my] = fromSVG(sp.x, sp.y)
      setYPoints((prev) => {
        const next = prev.map((p) => [...p])
        next[dragging] = [mx, my]
        return next
      })
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(null), [])

  /* ─── Determine button states ─── */
  const isAligned = animProgress > 0.99

  return (
    <div style={{ width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          cursor: dragging !== null ? "grabbing" : "default",
          userSelect: "none",
          touchAction: "none",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Axes */}
        <line x1={0} y1={CY} x2={W} y2={CY} stroke="rgba(0,0,0,0.06)" />
        <line x1={CX} y1={0} x2={CX} y2={H} stroke="rgba(0,0,0,0.06)" />

        {/* Matching-index connecting lines */}
        {X_BASE.map((xp, i) => {
          const [x1, y1] = toSVG(xp[0], xp[1])
          const [x2, y2] = toSVG(displayY[i][0], displayY[i][1])
          return (
            <line
              key={`conn-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )
        })}

        {/* X points (reference, blue) */}
        {X_BASE.map((p, i) => {
          const [sx, sy] = toSVG(p[0], p[1])
          return (
            <g key={`x-${i}`}>
              <circle
                cx={sx} cy={sy} r="5"
                fill={BLUE}
                opacity="0.85"
              />
              <text
                x={sx + 8} y={sy - 6}
                fontSize="9" fontFamily={FONT} fill={BLUE} opacity="0.5"
              >
                {i + 1}
              </text>
            </g>
          )
        })}

        {/* Displayed Y points (current state, red or teal) */}
        {displayY.map((p, i) => {
          const [sx, sy] = toSVG(p[0], p[1])
          const color = animProgress > 0.01 ? TEAL : RED
          const isBeingDragged = dragging === i
          return (
            <g key={`y-${i}`}>
              <circle
                cx={sx} cy={sy}
                r={isBeingDragged ? HANDLE_R + 1 : HANDLE_R}
                fill={color}
                stroke="#fff"
                strokeWidth="1.5"
                style={{ cursor: isAnimating ? "default" : "grab" }}
                onPointerDown={handlePointerDown(i)}
                opacity={animProgress > 0.01 ? 0.9 : 0.85}
              />
              <text
                x={sx + 8} y={sy + 12}
                fontSize="9" fontFamily={FONT}
                fill={color} opacity="0.5"
              >
                {i + 1}
              </text>
            </g>
          )
        })}

        {/* X centroid */}
        <circle
          cx={toSVG(xCentroid[0], xCentroid[1])[0]}
          cy={toSVG(xCentroid[0], xCentroid[1])[1]}
          r="3" fill={BLUE} opacity="0.3"
        />

        {/* Y centroid (of original positions) */}
        {animProgress < 0.01 && (
          <circle
            cx={toSVG(yCentroid[0], yCentroid[1])[0]}
            cy={toSVG(yCentroid[0], yCentroid[1])[1]}
            r="3" fill={RED} opacity="0.3"
          />
        )}

        {/* Residual readout — top right */}
        <g>
          <text
            x={W - 16} y={28}
            textAnchor="end"
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.35)"
          >
            Frobenius residual
          </text>
          <text
            x={W - 16} y={48}
            textAnchor="end"
            fontSize="16" fontFamily={FONT}
            fill={residual < initialResidual * 0.3 ? TEAL : "rgba(0,0,0,0.55)"}
            fontWeight="600"
          >
            {"\u2016"}R Y - X{"\u2016"}
            <tspan fontSize="9" dy="3">F</tspan>
            <tspan dy="-3">{" = " + residual.toFixed(3)}</tspan>
          </text>

          {/* Rotation angle readout */}
          <text
            x={W - 16} y={70}
            textAnchor="end"
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.35)"
          >
            {"R: \u03B8 = " + ((optimalAngle * 180) / Math.PI).toFixed(1) + "\u00B0"}
          </text>
        </g>

        {/* Legend — top left */}
        <g>
          <circle cx={20} cy={20} r="4" fill={BLUE} opacity="0.85" />
          <text
            x={30} y={24}
            fontSize="10" fontFamily={FONT} fill="rgba(0,0,0,0.4)"
          >
            X (reference)
          </text>

          <circle cx={20} cy={38} r="4" fill={animProgress > 0.01 ? TEAL : RED} opacity="0.85" />
          <text
            x={30} y={42}
            fontSize="10" fontFamily={FONT} fill="rgba(0,0,0,0.4)"
          >
            {animProgress > 0.01 ? "Y (aligned)" : "Y (to align)"}
          </text>
        </g>

        {/* Hint */}
        {!dragging && animProgress < 0.01 && (
          <text
            x={CX} y={H - 10}
            textAnchor="middle"
            fontSize="10" fontFamily={FONT} fill="rgba(0,0,0,0.2)"
          >
            drag Y points to perturb the alignment problem
          </text>
        )}
      </svg>

      {/* Controls */}
      <div
        className="blog-figure__controls"
        style={{ justifyContent: "center", gap: "0.4rem", flexWrap: "wrap" }}
      >
        <button
          className="blog-figure__button"
          style={
            isAligned
              ? { borderColor: TEAL, color: TEAL }
              : {}
          }
          onClick={handleAlign}
          disabled={isAnimating || isAligned}
        >
          Align
        </button>
        <button
          className="blog-figure__button"
          onClick={handleReset}
          disabled={isAnimating}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
