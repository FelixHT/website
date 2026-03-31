import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = 350
const CY = 210
const SCALE = 80
const N_SAMPLES = 100
const STAGE_DURATION = 400

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const FONT = "var(--font-mono, monospace)"

/* ─── Preset matrices ─── */
const PRESETS = [
  { label: "Shear", matrix: [[1, 1], [0, 1]] },
  { label: "Symmetric", matrix: [[3, 1], [1, 3]] },
  { label: "Rot+Scale", matrix: [[2, -1], [1, 2]] },
  { label: "Projection-like", matrix: [[1, 0.5], [0.5, 0.25]] },
]

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
// V columns are right singular vectors, U columns are left singular vectors
// S = [sigma1, sigma2] with sigma1 >= sigma2 >= 0
function computeSVD(A) {
  // A^T A
  const AtA = matMul(matT(A), A)

  // Eigenvalues of A^T A via characteristic equation:
  // lambda^2 - trace * lambda + det = 0
  const trace = AtA[0][0] + AtA[1][1]
  const det = AtA[0][0] * AtA[1][1] - AtA[0][1] * AtA[1][0]
  const disc = Math.max(trace * trace - 4 * det, 0)
  const sqrtDisc = Math.sqrt(disc)

  let lambda1 = (trace + sqrtDisc) / 2
  let lambda2 = (trace - sqrtDisc) / 2

  // Clamp to avoid negative values from numerical noise
  lambda1 = Math.max(lambda1, 0)
  lambda2 = Math.max(lambda2, 0)

  const sigma1 = Math.sqrt(lambda1)
  const sigma2 = Math.sqrt(lambda2)

  // Find eigenvectors of A^T A
  // For each eigenvalue, solve (A^T A - lambda I) v = 0
  function eigenvector(M, lambda) {
    const a = M[0][0] - lambda
    const b = M[0][1]
    const c = M[1][0]
    const d = M[1][1] - lambda

    // Pick the row with larger absolute values to avoid division by near-zero
    let vx, vy
    if (Math.abs(a) + Math.abs(b) >= Math.abs(c) + Math.abs(d)) {
      if (Math.abs(a) > Math.abs(b)) {
        vx = -b
        vy = a
      } else if (Math.abs(b) > 1e-12) {
        vx = b
        vy = -a
      } else {
        // Both near zero: this eigenvalue has multiplicity or M is near zero
        vx = 1
        vy = 0
      }
    } else {
      if (Math.abs(c) > Math.abs(d)) {
        vx = -d
        vy = c
      } else if (Math.abs(d) > 1e-12) {
        vx = d
        vy = -c
      } else {
        vx = 1
        vy = 0
      }
    }

    const len = Math.sqrt(vx * vx + vy * vy)
    if (len < 1e-12) return [1, 0]
    return [vx / len, vy / len]
  }

  let v1 = eigenvector(AtA, lambda1)
  let v2 = eigenvector(AtA, lambda2)

  // Ensure v1 and v2 are orthogonal. If eigenvalues are nearly equal,
  // the eigenvector computation might not give orthogonal results.
  // Gram-Schmidt on v2 with respect to v1:
  const dot12 = v1[0] * v2[0] + v1[1] * v2[1]
  v2 = [v2[0] - dot12 * v1[0], v2[1] - dot12 * v1[1]]
  const v2len = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1])
  if (v2len > 1e-12) {
    v2 = [v2[0] / v2len, v2[1] / v2len]
  } else {
    // v1 and v2 were parallel; pick orthogonal vector
    v2 = [-v1[1], v1[0]]
  }

  // Ensure V forms a proper rotation (det = +1)
  const detV = v1[0] * v2[1] - v1[1] * v2[0]
  if (detV < 0) {
    v2 = [-v2[0], -v2[1]]
  }

  // V matrix: columns are v1, v2
  const V = [[v1[0], v2[0]], [v1[1], v2[1]]]

  // Compute U: u_i = A v_i / sigma_i
  let u1, u2
  if (sigma1 > 1e-12) {
    const Av1 = matVec(A, v1)
    u1 = [Av1[0] / sigma1, Av1[1] / sigma1]
  } else {
    u1 = [1, 0]
  }

  if (sigma2 > 1e-12) {
    const Av2 = matVec(A, v2)
    u2 = [Av2[0] / sigma2, Av2[1] / sigma2]
  } else {
    // Pick orthogonal to u1
    u2 = [-u1[1], u1[0]]
  }

  // Ensure U forms a proper rotation (det = +1)
  const detU = u1[0] * u2[1] - u1[1] * u2[0]
  if (detU < 0) {
    u2 = [-u2[0], -u2[1]]
  }

  const U = [[u1[0], u2[0]], [u1[1], u2[1]]]

  return { U, S: [sigma1, sigma2], V }
}

/* ─── Build an SVG path from sampled points on the unit circle transformed by a matrix ─── */
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

export default function SVDExplorer() {
  const [matrix, setMatrix] = useState(PRESETS[0].matrix)
  const [showSteps, setShowSteps] = useState(false)
  const [stageProgress, setStageProgress] = useState(0) // 0 to 3
  const animRef = useRef(null)
  const matAnimRef = useRef(null)

  /* ─── Compute SVD of current matrix ─── */
  const svd = useMemo(() => computeSVD(matrix), [matrix])
  const { U, S, V } = svd

  /* ─── Derived matrices for animation stages ─── */
  // Stage 0: Identity (unit circle)
  // Stage 1: V^T applied (rotate so v1,v2 align with axes)
  // Stage 2: Sigma * V^T (stretch along axes)
  // Stage 3: U * Sigma * V^T = A (rotate to final)
  const VT = useMemo(() => matT(V), [V])
  const Sigma = useMemo(() => [[S[0], 0], [0, S[1]]], [S])
  const SigmaVT = useMemo(() => matMul(Sigma, VT), [Sigma, VT])

  /* ─── Animation: show steps toggle ─── */
  const animateSteps = useCallback(
    (forward) => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      const startProgress = stageProgress
      const targetProgress = forward ? 3 : 0
      const totalDuration = STAGE_DURATION * Math.abs(targetProgress - startProgress)
      if (totalDuration < 1) {
        setStageProgress(targetProgress)
        return
      }
      const t0 = performance.now()

      function tick(now) {
        const elapsed = now - t0
        const rawT = Math.min(elapsed / totalDuration, 1)
        const current = startProgress + (targetProgress - startProgress) * rawT
        setStageProgress(current)
        if (rawT < 1) {
          animRef.current = requestAnimationFrame(tick)
        } else {
          animRef.current = null
        }
      }

      animRef.current = requestAnimationFrame(tick)
    },
    [stageProgress]
  )

  /* ─── Handle show steps toggle ─── */
  const handleToggleSteps = useCallback(() => {
    const next = !showSteps
    setShowSteps(next)
    animateSteps(next)
  }, [showSteps, animateSteps])

  /* ─── Animate matrix change ─── */
  const animateMatrix = useCallback(
    (targetMatrix) => {
      if (matAnimRef.current) cancelAnimationFrame(matAnimRef.current)
      // Reset steps view when changing matrix
      if (showSteps) {
        setShowSteps(false)
        if (animRef.current) cancelAnimationFrame(animRef.current)
        animRef.current = null
        setStageProgress(0)
      }
      const startMatrix = [
        [matrix[0][0], matrix[0][1]],
        [matrix[1][0], matrix[1][1]],
      ]
      const t0 = performance.now()

      function tick(now) {
        const elapsed = now - t0
        const progress = Math.min(elapsed / STAGE_DURATION, 1)
        const ease = easeOutCubic(progress)
        setMatrix(matLerp(startMatrix, targetMatrix, ease))
        if (progress < 1) {
          matAnimRef.current = requestAnimationFrame(tick)
        } else {
          matAnimRef.current = null
        }
      }

      matAnimRef.current = requestAnimationFrame(tick)
    },
    [matrix, showSteps]
  )

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (matAnimRef.current) cancelAnimationFrame(matAnimRef.current)
    }
  }, [])

  /* ─── Compute the current transformation matrix based on stage progress ─── */
  // stageProgress: 0 = identity, 1 = V^T, 2 = Sigma * V^T, 3 = U * Sigma * V^T = A
  const currentTransform = useMemo(() => {
    const sp = stageProgress

    if (sp <= 0) return I2
    if (sp <= 1) {
      // Interpolate Identity -> V^T
      const t = easeOutCubic(sp)
      return matLerp(I2, VT, t)
    }
    if (sp <= 2) {
      // Interpolate V^T -> Sigma * V^T
      const t = easeOutCubic(sp - 1)
      return matLerp(VT, SigmaVT, t)
    }
    // Interpolate Sigma * V^T -> U * Sigma * V^T
    const t = easeOutCubic(sp - 2)
    const USVT = matMul(U, SigmaVT)
    return matLerp(SigmaVT, USVT, t)
  }, [stageProgress, VT, SigmaVT, U])

  /* ─── The full matrix A (for non-animated display) ─── */
  const fullTransform = useMemo(
    () => [[matrix[0][0], matrix[0][1]], [matrix[1][0], matrix[1][1]]],
    [matrix]
  )

  /* ─── Decide what to render: animated stages or static result ─── */
  const displayTransform = showSteps || stageProgress > 0 ? currentTransform : fullTransform

  /* ─── Paths ─── */
  const circlePath = useMemo(() => {
    const pts = []
    for (let i = 0; i <= N_SAMPLES; i++) {
      const theta = (2 * Math.PI * i) / N_SAMPLES
      const [sx, sy] = toSVG(Math.cos(theta), Math.sin(theta))
      pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`)
    }
    return `M ${pts[0]} L ${pts.slice(1).join(" ")} Z`
  }, [])

  const ellipsePath = useMemo(() => buildEllipsePath(displayTransform), [displayTransform])

  /* ─── Full ellipse (always shown faintly when in step mode) ─── */
  const fullEllipsePath = useMemo(() => buildEllipsePath(fullTransform), [fullTransform])

  /* ─── Right singular vectors on unit circle: v1, v2 ─── */
  const v1 = useMemo(() => [V[0][0], V[1][0]], [V])
  const v2 = useMemo(() => [V[0][1], V[1][1]], [V])

  /* ─── Left singular vectors on ellipse: u1, u2 (points where v_i map to on ellipse) ─── */
  const u1 = useMemo(() => [U[0][0], U[1][0]], [U])
  const u2 = useMemo(() => [U[0][1], U[1][1]], [U])

  /* ─── Points in the animated coordinate system ─── */
  const v1Display = useMemo(() => matVec(displayTransform, v1), [displayTransform, v1])
  const v2Display = useMemo(() => matVec(displayTransform, v2), [displayTransform, v2])

  /* ─── In static view (no steps), v_i are on the circle, sigma_i * u_i are on the ellipse ─── */
  const v1SVG = toSVG(v1[0], v1[1])
  const v2SVG = toSVG(v2[0], v2[1])
  const u1Ellipse = useMemo(() => [S[0] * u1[0], S[0] * u1[1]], [S, u1])
  const u2Ellipse = useMemo(() => [S[1] * u2[0], S[1] * u2[1]], [S, u2])
  const u1SVG = toSVG(u1Ellipse[0], u1Ellipse[1])
  const u2SVG = toSVG(u2Ellipse[0], u2Ellipse[1])

  /* ─── In step mode, the dots track the transformation ─── */
  const v1StepSVG = toSVG(v1Display[0], v1Display[1])
  const v2StepSVG = toSVG(v2Display[0], v2Display[1])

  const inStepMode = showSteps || stageProgress > 0

  /* ─── Sigma labels: place near the ellipse semi-axis endpoints ─── */
  // In the full (non-animated) view, the semi-axes are along u1 and u2
  const sigma1LabelPos = toSVG(u1Ellipse[0] * 0.5 + u1[0] * 0.15, u1Ellipse[1] * 0.5 + u1[1] * 0.15)
  const sigma2LabelPos = toSVG(u2Ellipse[0] * 0.5 + u2[0] * 0.15, u2Ellipse[1] * 0.5 + u2[1] * 0.15)

  /* ─── Matrix display values ─── */
  const m00 = matrix[0][0].toFixed(2)
  const m01 = matrix[0][1].toFixed(2)
  const m10 = matrix[1][0].toFixed(2)
  const m11 = matrix[1][1].toFixed(2)

  /* ─── Stage label ─── */
  const stageLabel = useMemo(() => {
    if (!inStepMode) return null
    const sp = stageProgress
    if (sp < 0.05) return "unit circle"
    if (sp < 1.05) return "V\u1D40 : align right singular vectors"
    if (sp < 2.05) return "\u03A3 : stretch by singular values"
    return "U : rotate to final orientation"
  }, [inStepMode, stageProgress])

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
        <defs>
          <clipPath id="svd-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>

        {/* Axes */}
        <line x1={0} y1={CY} x2={W} y2={CY} stroke="rgba(0,0,0,0.06)" />
        <line x1={CX} y1={0} x2={CX} y2={H} stroke="rgba(0,0,0,0.06)" />

        {/* Unit circle (dashed, faint) */}
        <path
          d={circlePath}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        {/* In step mode, show final ellipse as ghost */}
        {inStepMode && stageProgress < 2.95 && (
          <path
            d={fullEllipsePath}
            fill="none"
            stroke={TEAL}
            strokeWidth="1"
            opacity="0.12"
            strokeDasharray="4 3"
          />
        )}

        {/* Ellipse: current transform applied to unit circle */}
        <path
          d={ellipsePath}
          fill="none"
          stroke={TEAL}
          strokeWidth="2"
        />

        <g clipPath="url(#svd-clip)">
          {/* Static view: show v_i on circle and sigma_i * u_i on ellipse */}
          {!inStepMode && (
            <>
              {/* Connecting lines: v_i on circle to sigma_i * u_i on ellipse */}
              <line
                x1={v1SVG[0]} y1={v1SVG[1]}
                x2={u1SVG[0]} y2={u1SVG[1]}
                stroke={BLUE}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.4"
              />
              <line
                x1={v2SVG[0]} y1={v2SVG[1]}
                x2={u2SVG[0]} y2={u2SVG[1]}
                stroke={RED}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.4"
              />

              {/* v1, v2 dots on unit circle */}
              <circle cx={v1SVG[0]} cy={v1SVG[1]} r="5" fill={BLUE} />
              <circle cx={v2SVG[0]} cy={v2SVG[1]} r="5" fill={RED} />

              {/* u1, u2 dots on ellipse (at sigma_i * u_i) */}
              <circle
                cx={u1SVG[0]} cy={u1SVG[1]}
                r="5" fill={BLUE} stroke="#fff" strokeWidth="1.5"
              />
              <circle
                cx={u2SVG[0]} cy={u2SVG[1]}
                r="5" fill={RED} stroke="#fff" strokeWidth="1.5"
              />

              {/* Labels: v_i near circle dots */}
              <text
                x={v1SVG[0] + 8} y={v1SVG[1] - 8}
                fontSize="10" fontFamily={FONT} fill={BLUE} opacity="0.7"
              >
                v{"\u2081"}
              </text>
              <text
                x={v2SVG[0] + 8} y={v2SVG[1] + 14}
                fontSize="10" fontFamily={FONT} fill={RED} opacity="0.7"
              >
                v{"\u2082"}
              </text>

              {/* Labels: u_i near ellipse dots */}
              <text
                x={u1SVG[0] + 10} y={u1SVG[1] - 10}
                fontSize="11" fontFamily={FONT} fill={BLUE} fontWeight="600"
              >
                {"\u03C3\u2081"}u{"\u2081"}
              </text>
              <text
                x={u2SVG[0] + 10} y={u2SVG[1] + 16}
                fontSize="11" fontFamily={FONT} fill={RED} fontWeight="600"
              >
                {"\u03C3\u2082"}u{"\u2082"}
              </text>

              {/* Sigma labels near semi-axes */}
              <text
                x={sigma1LabelPos[0] + 12}
                y={sigma1LabelPos[1] - 4}
                fontSize="10"
                fontFamily={FONT}
                fill={TEAL}
                opacity="0.6"
              >
                {"\u03C3\u2081"} = {S[0].toFixed(2)}
              </text>
              <text
                x={sigma2LabelPos[0] + 12}
                y={sigma2LabelPos[1] + 12}
                fontSize="10"
                fontFamily={FONT}
                fill={TEAL}
                opacity="0.6"
              >
                {"\u03C3\u2082"} = {S[1].toFixed(2)}
              </text>
            </>
          )}

          {/* Step mode: dots tracking the transform of v_i */}
          {inStepMode && (
            <>
              <circle cx={v1StepSVG[0]} cy={v1StepSVG[1]} r="5" fill={BLUE} />
              <circle cx={v2StepSVG[0]} cy={v2StepSVG[1]} r="5" fill={RED} />

              {/* Labels */}
              <text
                x={v1StepSVG[0] + 8} y={v1StepSVG[1] - 8}
                fontSize="10" fontFamily={FONT} fill={BLUE} fontWeight="600"
              >
                v{"\u2081"}
              </text>
              <text
                x={v2StepSVG[0] + 8} y={v2StepSVG[1] + 14}
                fontSize="10" fontFamily={FONT} fill={RED} fontWeight="600"
              >
                v{"\u2082"}
              </text>
            </>
          )}
        </g>

        {/* Origin dot */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Matrix display — top right */}
        <g>
          <text
            x={W - 16} y={32}
            textAnchor="end"
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.35)"
          >
            A =
          </text>

          {/* Bracket left */}
          <text
            x={W - 108} y={61}
            fontSize="32" fontFamily={FONT}
            fill="rgba(0,0,0,0.2)" textAnchor="middle"
          >
            [
          </text>
          {/* Row 1 */}
          <text
            x={W - 16} y={52}
            textAnchor="end"
            fontSize="13" fontFamily={FONT} fill="rgba(0,0,0,0.55)"
          >
            <tspan>{m00}</tspan>
            {"  "}
            <tspan>{m01}</tspan>
          </text>
          {/* Row 2 */}
          <text
            x={W - 16} y={70}
            textAnchor="end"
            fontSize="13" fontFamily={FONT} fill="rgba(0,0,0,0.55)"
          >
            <tspan>{m10}</tspan>
            {"  "}
            <tspan>{m11}</tspan>
          </text>
          {/* Bracket right */}
          <text
            x={W - 8} y={61}
            fontSize="32" fontFamily={FONT}
            fill="rgba(0,0,0,0.2)" textAnchor="middle"
          >
            ]
          </text>

          {/* Singular value readouts */}
          <text
            x={W - 16} y={98}
            textAnchor="end"
            fontSize="11" fontFamily={FONT} fill={BLUE}
          >
            {"\u03C3\u2081"} = {S[0].toFixed(2)}
          </text>
          <text
            x={W - 16} y={114}
            textAnchor="end"
            fontSize="11" fontFamily={FONT} fill={RED}
          >
            {"\u03C3\u2082"} = {S[1].toFixed(2)}
          </text>
        </g>

        {/* Stage label when in step mode */}
        {inStepMode && stageLabel && (
          <text
            x={16} y={H - 12}
            fontSize="10" fontFamily={FONT} fill="rgba(0,0,0,0.35)"
          >
            {stageLabel}
          </text>
        )}

        {/* Annotation in static mode */}
        {!inStepMode && (
          <text
            x={16} y={H - 12}
            fontSize="10" fontFamily={FONT} fill="rgba(0,0,0,0.25)"
          >
            A maps the unit circle to an ellipse — SVD reveals the geometry
          </text>
        )}
      </svg>

      {/* Controls */}
      <div
        className="blog-figure__controls"
        style={{ justifyContent: "center", gap: "0.4rem", flexWrap: "wrap" }}
      >
        {PRESETS.map(({ label, matrix: preset }) => {
          const isActive =
            Math.abs(matrix[0][0] - preset[0][0]) < 0.02 &&
            Math.abs(matrix[0][1] - preset[0][1]) < 0.02 &&
            Math.abs(matrix[1][0] - preset[1][0]) < 0.02 &&
            Math.abs(matrix[1][1] - preset[1][1]) < 0.02
          return (
            <button
              key={label}
              className="blog-figure__button"
              style={
                isActive
                  ? { borderColor: "rgba(0,0,0,0.4)", color: "rgba(0,0,0,0.7)" }
                  : {}
              }
              onClick={() => animateMatrix(preset)}
            >
              {label}
            </button>
          )
        })}
        <button
          className="blog-figure__button"
          style={
            showSteps
              ? { borderColor: "rgba(0,0,0,0.4)", color: "rgba(0,0,0,0.7)" }
              : {}
          }
          onClick={handleToggleSteps}
        >
          {showSteps ? "Hide steps" : "Show steps"}
        </button>
      </div>
    </div>
  )
}
