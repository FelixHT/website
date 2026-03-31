import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"

/* ─── Layout ─── */
const W = 900
const H = 420
const CX = 450
const CY = 210
const SCALE = 90
const N_SAMPLES = 100
const ANIM_DURATION = 500

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const GHOST = "rgba(0,0,0,0.06)"
const FONT = "var(--font-mono, monospace)"

/* ─── Matrix A ─── */
const A = [[2, 1], [0.5, 1.5]]

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

/* ─── Ease-out cubic ─── */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ─── Apply 2x2 matrix to a vector ─── */
function matVec(M, v) {
  return [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]]
}

/* ─── Matrix multiply 2x2 ─── */
function matMul(A, B) {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ]
}

/* ─── Transpose 2x2 ─── */
function matT(M) {
  return [[M[0][0], M[1][0]], [M[0][1], M[1][1]]]
}

/* ─── Interpolate two 2x2 matrices ─── */
function matLerp(M1, M2, t) {
  return [
    [M1[0][0] + (M2[0][0] - M1[0][0]) * t, M1[0][1] + (M2[0][1] - M1[0][1]) * t],
    [M1[1][0] + (M2[1][0] - M1[1][0]) * t, M1[1][1] + (M2[1][1] - M1[1][1]) * t],
  ]
}

/* ─── Identity matrix ─── */
const I2 = [[1, 0], [0, 1]]

/* ─── Compute SVD of a 2x2 matrix ─── */
// Returns { U, S, V } where A = U * diag(S) * V^T
function computeSVD(M) {
  const AtA = matMul(matT(M), M)

  const trace = AtA[0][0] + AtA[1][1]
  const det = AtA[0][0] * AtA[1][1] - AtA[0][1] * AtA[1][0]
  const disc = Math.max(trace * trace - 4 * det, 0)
  const sqrtDisc = Math.sqrt(disc)

  let lambda1 = Math.max((trace + sqrtDisc) / 2, 0)
  let lambda2 = Math.max((trace - sqrtDisc) / 2, 0)

  const sigma1 = Math.sqrt(lambda1)
  const sigma2 = Math.sqrt(lambda2)

  function eigenvector(Mat, lambda) {
    const a = Mat[0][0] - lambda
    const b = Mat[0][1]
    const c = Mat[1][0]
    const d = Mat[1][1] - lambda

    let vx, vy
    if (Math.abs(a) + Math.abs(b) >= Math.abs(c) + Math.abs(d)) {
      if (Math.abs(a) > Math.abs(b)) {
        vx = -b; vy = a
      } else if (Math.abs(b) > 1e-12) {
        vx = b; vy = -a
      } else {
        vx = 1; vy = 0
      }
    } else {
      if (Math.abs(c) > Math.abs(d)) {
        vx = -d; vy = c
      } else if (Math.abs(d) > 1e-12) {
        vx = d; vy = -c
      } else {
        vx = 1; vy = 0
      }
    }

    const len = Math.sqrt(vx * vx + vy * vy)
    if (len < 1e-12) return [1, 0]
    return [vx / len, vy / len]
  }

  let v1 = eigenvector(AtA, lambda1)
  let v2 = eigenvector(AtA, lambda2)

  // Gram-Schmidt to ensure orthogonality
  const dot12 = v1[0] * v2[0] + v1[1] * v2[1]
  v2 = [v2[0] - dot12 * v1[0], v2[1] - dot12 * v1[1]]
  const v2len = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1])
  if (v2len > 1e-12) {
    v2 = [v2[0] / v2len, v2[1] / v2len]
  } else {
    v2 = [-v1[1], v1[0]]
  }

  // Ensure V has det = +1
  const detV = v1[0] * v2[1] - v1[1] * v2[0]
  if (detV < 0) v2 = [-v2[0], -v2[1]]

  const V = [[v1[0], v2[0]], [v1[1], v2[1]]]

  // Compute U columns: u_i = A v_i / sigma_i
  let u1, u2
  if (sigma1 > 1e-12) {
    const Av1 = matVec(M, v1)
    u1 = [Av1[0] / sigma1, Av1[1] / sigma1]
  } else {
    u1 = [1, 0]
  }

  if (sigma2 > 1e-12) {
    const Av2 = matVec(M, v2)
    u2 = [Av2[0] / sigma2, Av2[1] / sigma2]
  } else {
    u2 = [-u1[1], u1[0]]
  }

  // Ensure U has det = +1
  const detU = u1[0] * u2[1] - u1[1] * u2[0]
  if (detU < 0) u2 = [-u2[0], -u2[1]]

  const U = [[u1[0], u2[0]], [u1[1], u2[1]]]

  return { U, S: [sigma1, sigma2], V }
}

/* ─── Precomputed SVD of A ─── */
const svd = computeSVD(A)
const { U, S, V } = svd

/* ─── Stage matrices ─── */
// Stage 0: I              (unit circle)
// Stage 1: V^T            (rotated circle)
// Stage 2: Sigma * V^T    (axis-aligned ellipse)
// Stage 3: U * Sigma * V^T = A  (final tilted ellipse)
const VT = matT(V)
const Sigma = [[S[0], 0], [0, S[1]]]
const SigmaVT = matMul(Sigma, VT)
const USVT = matMul(U, SigmaVT) // = A

const STAGE_MATRICES = [I2, VT, SigmaVT, USVT]

/* ─── Build SVG path from unit circle transformed by matrix ─── */
function buildEllipsePath(M) {
  const pts = []
  for (let i = 0; i <= N_SAMPLES; i++) {
    const theta = (2 * Math.PI * i) / N_SAMPLES
    const input = [Math.cos(theta), Math.sin(theta)]
    const output = matVec(M, input)
    const [sx, sy] = toSVG(output[0], output[1])
    pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`)
  }
  return `M ${pts[0]} L ${pts.slice(1).join(" ")} Z`
}

/* ─── Precomputed final ellipse path (ghost) ─── */
const FINAL_PATH = buildEllipsePath(USVT)

/* ─── Stage descriptions ─── */
const STAGE_LABELS = [
  "unit circle — input space before any transformation",
  "V\u1D40 applied — rotated to align with right singular vectors",
  "\u03A3 applied — scaled along axes by singular values (\u03C3\u2081\u2009=\u2009" +
    S[0].toFixed(2) + ", \u03C3\u2082\u2009=\u2009" + S[1].toFixed(2) + ")",
  "U applied — rotated to final orientation; result is A\u00B7x",
]

/* ─── Button config ─── */
const STEP_BUTTONS = [
  { label: "V\u1D40: rotate input", target: 1 },
  { label: "\u03A3: scale", target: 2 },
  { label: "U: rotate output", target: 3 },
]

export default function SVDStepDecomposition() {
  const [stage, setStage] = useState(0)
  const [displayMatrix, setDisplayMatrix] = useState(I2)
  const animRef = useRef(null)

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  /* ─── Animate from current displayMatrix to target stage matrix ─── */
  const animateTo = useCallback(
    (targetStage) => {
      if (animRef.current) cancelAnimationFrame(animRef.current)

      const startMatrix = [
        [displayMatrix[0][0], displayMatrix[0][1]],
        [displayMatrix[1][0], displayMatrix[1][1]],
      ]
      const endMatrix = STAGE_MATRICES[targetStage]
      const t0 = performance.now()

      function tick(now) {
        const elapsed = now - t0
        const rawT = Math.min(elapsed / ANIM_DURATION, 1)
        const ease = easeOutCubic(rawT)
        const interpolated = matLerp(startMatrix, endMatrix, ease)
        setDisplayMatrix(interpolated)

        if (rawT < 1) {
          animRef.current = requestAnimationFrame(tick)
        } else {
          animRef.current = null
          setDisplayMatrix(endMatrix)
        }
      }

      setStage(targetStage)
      animRef.current = requestAnimationFrame(tick)
    },
    [displayMatrix]
  )

  /* ─── Build the current shape path ─── */
  const shapePath = useMemo(() => buildEllipsePath(displayMatrix), [displayMatrix])

  /* ─── Show ghost when not at final stage ─── */
  const showGhost = stage < 3

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          userSelect: "none",
        }}
      >
        {/* Axes */}
        <line x1={0} y1={CY} x2={W} y2={CY} stroke="rgba(0,0,0,0.06)" />
        <line x1={CX} y1={0} x2={CX} y2={H} stroke="rgba(0,0,0,0.06)" />

        {/* Unit circle (dashed, faint reference) */}
        <circle
          cx={CX} cy={CY} r={SCALE}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        {/* Ghost of final ellipse during intermediate stages */}
        {showGhost && (
          <path
            d={FINAL_PATH}
            fill="none"
            stroke={GHOST}
            strokeWidth="1.5"
          />
        )}

        {/* Active shape: current transformation applied to unit circle */}
        <path
          d={shapePath}
          fill="none"
          stroke={TEAL}
          strokeWidth="2"
        />

        {/* Origin dot */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Matrix display — top left */}
        <g>
          <text
            x={16} y={28}
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.35)"
          >
            A = U {"\u03A3"} V{"\u1D40"}
          </text>
          <text
            x={16} y={48}
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.3)"
          >
            [{A[0][0]}, {A[0][1]}]
          </text>
          <text
            x={16} y={64}
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.3)"
          >
            [{A[1][0]}, {A[1][1]}]
          </text>
        </g>

        {/* Stage label at bottom */}
        <text
          x={CX} y={H - 14}
          textAnchor="middle"
          fontSize="10.5" fontFamily={FONT} fill="rgba(0,0,0,0.35)"
        >
          {STAGE_LABELS[stage]}
        </text>
      </svg>

      {/* Controls */}
      <div
        className="blog-figure__controls"
        style={{
          justifyContent: "center",
          gap: "0.4rem",
          flexWrap: "wrap",
        }}
      >
        {STEP_BUTTONS.map(({ label, target }) => {
          const isActive = stage === target
          return (
            <button
              key={target}
              className="blog-figure__button"
              style={
                isActive
                  ? { borderColor: TEAL, color: TEAL }
                  : { opacity: stage > 0 && stage !== target ? 0.5 : 1 }
              }
              onClick={() => animateTo(target)}
            >
              {label}
            </button>
          )
        })}
        <button
          className="blog-figure__button"
          style={stage === 0 ? { opacity: 0.4 } : {}}
          onClick={() => animateTo(0)}
          disabled={stage === 0}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
