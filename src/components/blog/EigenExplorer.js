import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = 300
const CY = 210
const SCALE = 70
const N_SAMPLES = 100
const ANIM_DURATION = 600

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const FONT = "var(--font-mono, monospace)"

/* ─── Matrix A = [[3,1],[0,2]] ─── */
const A = [[3, 1], [0, 2]]

/* ─── Eigenvectors ─── */
// v1 = (1, 0) with lambda1 = 3
// v2 = (1, -1) with lambda2 = 2
const EIG1 = [1, 0]
const EIG2_RAW = [1, -1]
const EIG2_LEN = Math.sqrt(EIG2_RAW[0] ** 2 + EIG2_RAW[1] ** 2)
const EIG2 = [EIG2_RAW[0] / EIG2_LEN, EIG2_RAW[1] / EIG2_LEN]
const LAMBDA1 = 3
const LAMBDA2 = 2

/* ─── The angle we need to rotate the eigenvector basis to align with standard axes ─── */
// In the eigenvector basis, v1 maps to e1, v2 maps to e2.
// P = [v1 | v2] = [[1, 1/sqrt(2)], [0, -1/sqrt(2)]]
// We want to animate a change-of-basis that rotates eigenvectors onto axes.
// The eigenvector basis angle: v1 is at 0 degrees, v2 is at atan2(-1,1) = -45 degrees.
// To align v2 with the y-axis, we rotate by +45 degrees (pi/4) so v2 points down the -y axis,
// but we need to also scale. Instead, we interpolate the basis change matrix.

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

/* ─── Ease-out cubic ─── */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ─── Apply a 2x2 matrix to a vector ─── */
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

/* ─── Invert 2x2 matrix ─── */
function matInv(M) {
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0]
  return [
    [M[1][1] / det, -M[0][1] / det],
    [-M[1][0] / det, M[0][0] / det],
  ]
}

/* ─── Interpolate two 2x2 matrices ─── */
function matLerp(M1, M2, t) {
  return [
    [M1[0][0] + (M2[0][0] - M1[0][0]) * t, M1[0][1] + (M2[0][1] - M1[0][1]) * t],
    [M1[1][0] + (M2[1][0] - M1[1][0]) * t, M1[1][1] + (M2[1][1] - M1[1][1]) * t],
  ]
}

/* ─── P = eigenvector matrix [v1 | v2] (columns are eigenvectors) ─── */
const P = [[EIG1[0], EIG2[0]], [EIG1[1], EIG2[1]]]
const P_INV = matInv(P)

/* ─── Identity matrix ─── */
const I2 = [[1, 0], [0, 1]]

export default function EigenExplorer() {
  const [diagonalized, setDiagonalized] = useState(false)
  const [basisT, setBasisT] = useState(0) // 0 = standard basis, 1 = eigenvector basis
  const animRef = useRef(null)

  /* ─── Animate basis transition ─── */
  const animateTo = useCallback(
    (targetT) => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      const startT = basisT
      const t0 = performance.now()

      function tick(now) {
        const elapsed = now - t0
        const progress = Math.min(elapsed / ANIM_DURATION, 1)
        const ease = easeOutCubic(progress)
        const current = startT + (targetT - startT) * ease
        setBasisT(current)
        if (progress < 1) {
          animRef.current = requestAnimationFrame(tick)
        } else {
          animRef.current = null
        }
      }

      animRef.current = requestAnimationFrame(tick)
    },
    [basisT]
  )

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  /* ─── Toggle diagonalize ─── */
  const handleToggle = useCallback(() => {
    const next = !diagonalized
    setDiagonalized(next)
    animateTo(next ? 1 : 0)
  }, [diagonalized, animateTo])

  /* ─── Current change-of-basis matrix: interpolate P_INV from identity ─── */
  // At t=0, C = I (standard basis). At t=1, C = P_INV (eigenvector basis).
  // The displayed matrix becomes C * A * C_inv = P_INV * A * P = D when t=1.
  const C = useMemo(() => matLerp(I2, P_INV, basisT), [basisT])
  const C_inv = useMemo(() => matLerp(I2, P, basisT), [basisT])

  /* ─── Effective matrix in current basis: C * A * C_inv ─── */
  const effectiveA = useMemo(() => matMul(C, matMul(A, C_inv)), [C, C_inv])

  /* ─── Ellipse path: A * (cos θ, sin θ) mapped through current basis ─── */
  const ellipsePath = useMemo(() => {
    const pts = []
    for (let i = 0; i <= N_SAMPLES; i++) {
      const theta = (2 * Math.PI * i) / N_SAMPLES
      const input = [Math.cos(theta), Math.sin(theta)]
      const output = matVec(effectiveA, input)
      const [sx, sy] = toSVG(output[0], output[1])
      pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`)
    }
    return `M ${pts[0]} L ${pts.slice(1).join(" ")} Z`
  }, [effectiveA])

  /* ─── Unit circle path ─── */
  const circlePath = useMemo(() => {
    const pts = []
    for (let i = 0; i <= N_SAMPLES; i++) {
      const theta = (2 * Math.PI * i) / N_SAMPLES
      const [sx, sy] = toSVG(Math.cos(theta), Math.sin(theta))
      pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`)
    }
    return `M ${pts[0]} L ${pts.slice(1).join(" ")} Z`
  }, [])

  /* ─── Eigenvector positions in current basis ─── */
  // In current basis, eigenvectors are C * v_i
  const eig1Curr = useMemo(() => matVec(C, EIG1), [C])
  const eig2Curr = useMemo(() => matVec(C, EIG2_RAW), [C])

  // Normalized directions for drawing lines through origin
  const eig1Dir = useMemo(() => {
    const len = Math.sqrt(eig1Curr[0] ** 2 + eig1Curr[1] ** 2) || 1
    return [eig1Curr[0] / len, eig1Curr[1] / len]
  }, [eig1Curr])
  const eig2Dir = useMemo(() => {
    const len = Math.sqrt(eig2Curr[0] ** 2 + eig2Curr[1] ** 2) || 1
    return [eig2Curr[0] / len, eig2Curr[1] / len]
  }, [eig2Curr])

  // Unit-length eigenvector points on circle (in current basis)
  const eig1OnCircle = useMemo(() => {
    const len = Math.sqrt(eig1Curr[0] ** 2 + eig1Curr[1] ** 2) || 1
    return [eig1Curr[0] / len, eig1Curr[1] / len]
  }, [eig1Curr])
  const eig2OnCircle = useMemo(() => {
    const len = Math.sqrt(eig2Curr[0] ** 2 + eig2Curr[1] ** 2) || 1
    return [eig2Curr[0] / len, eig2Curr[1] / len]
  }, [eig2Curr])

  // Where eigenvectors land on ellipse: A * v_i in current basis = C * (A * v_i) = C * (lambda_i * v_i)
  const eig1OnEllipse = useMemo(
    () => matVec(effectiveA, eig1OnCircle),
    [effectiveA, eig1OnCircle]
  )
  const eig2OnEllipse = useMemo(
    () => matVec(effectiveA, eig2OnCircle),
    [effectiveA, eig2OnCircle]
  )

  /* ─── SVG positions ─── */
  const eig1CircleSVG = toSVG(eig1OnCircle[0], eig1OnCircle[1])
  const eig2CircleSVG = toSVG(eig2OnCircle[0], eig2OnCircle[1])
  const eig1EllipseSVG = toSVG(eig1OnEllipse[0], eig1OnEllipse[1])
  const eig2EllipseSVG = toSVG(eig2OnEllipse[0], eig2OnEllipse[1])

  // Line endpoints (extend to +/- 3 units along direction)
  const LINE_EXTENT = 3
  const eig1LineStart = toSVG(-LINE_EXTENT * eig1Dir[0], -LINE_EXTENT * eig1Dir[1])
  const eig1LineEnd = toSVG(LINE_EXTENT * eig1Dir[0], LINE_EXTENT * eig1Dir[1])
  const eig2LineStart = toSVG(-LINE_EXTENT * eig2Dir[0], -LINE_EXTENT * eig2Dir[1])
  const eig2LineEnd = toSVG(LINE_EXTENT * eig2Dir[0], LINE_EXTENT * eig2Dir[1])

  /* ─── Matrix display values ─── */
  const m00 = effectiveA[0][0].toFixed(2)
  const m01 = effectiveA[0][1].toFixed(2)
  const m10 = effectiveA[1][0].toFixed(2)
  const m11 = effectiveA[1][1].toFixed(2)

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
          <clipPath id="eigen-clip">
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

        {/* Eigenvector direction lines through origin */}
        <g clipPath="url(#eigen-clip)">
          <line
            x1={eig1LineStart[0]} y1={eig1LineStart[1]}
            x2={eig1LineEnd[0]} y2={eig1LineEnd[1]}
            stroke={BLUE}
            strokeWidth="1"
            opacity="0.3"
            strokeDasharray="6 4"
          />
          <line
            x1={eig2LineStart[0]} y1={eig2LineStart[1]}
            x2={eig2LineEnd[0]} y2={eig2LineEnd[1]}
            stroke={RED}
            strokeWidth="1"
            opacity="0.3"
            strokeDasharray="6 4"
          />
        </g>

        {/* Ellipse: image of unit circle under effective matrix */}
        <path
          d={ellipsePath}
          fill="none"
          stroke={TEAL}
          strokeWidth="2"
        />

        {/* Connecting lines: circle dots to ellipse dots */}
        <line
          x1={eig1CircleSVG[0]} y1={eig1CircleSVG[1]}
          x2={eig1EllipseSVG[0]} y2={eig1EllipseSVG[1]}
          stroke={BLUE}
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1={eig2CircleSVG[0]} y1={eig2CircleSVG[1]}
          x2={eig2EllipseSVG[0]} y2={eig2EllipseSVG[1]}
          stroke={RED}
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Eigenvector dots on unit circle */}
        <circle
          cx={eig1CircleSVG[0]} cy={eig1CircleSVG[1]}
          r="5" fill={BLUE}
        />
        <circle
          cx={eig2CircleSVG[0]} cy={eig2CircleSVG[1]}
          r="5" fill={RED}
        />

        {/* Eigenvector dots on ellipse */}
        <circle
          cx={eig1EllipseSVG[0]} cy={eig1EllipseSVG[1]}
          r="5" fill={BLUE} stroke="#fff" strokeWidth="1.5"
        />
        <circle
          cx={eig2EllipseSVG[0]} cy={eig2EllipseSVG[1]}
          r="5" fill={RED} stroke="#fff" strokeWidth="1.5"
        />

        {/* Labels near ellipse dots */}
        <text
          x={eig1EllipseSVG[0] + 10} y={eig1EllipseSVG[1] - 10}
          fontSize="11" fontFamily={FONT} fill={BLUE} fontWeight="600"
        >
          {"\u03BB\u2081"}v{"\u2081"}
        </text>
        <text
          x={eig2EllipseSVG[0] + 10} y={eig2EllipseSVG[1] + 16}
          fontSize="11" fontFamily={FONT} fill={RED} fontWeight="600"
        >
          {"\u03BB\u2082"}v{"\u2082"}
        </text>

        {/* Labels near circle dots */}
        <text
          x={eig1CircleSVG[0] + 8} y={eig1CircleSVG[1] - 8}
          fontSize="10" fontFamily={FONT} fill={BLUE} opacity="0.7"
        >
          v{"\u2081"}
        </text>
        <text
          x={eig2CircleSVG[0] + 8} y={eig2CircleSVG[1] + 14}
          fontSize="10" fontFamily={FONT} fill={RED} opacity="0.7"
        >
          v{"\u2082"}
        </text>

        {/* Origin dot */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Matrix display — top right */}
        <g>
          <text
            x={W - 16} y={32}
            textAnchor="end"
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.35)"
          >
            {basisT < 0.5 ? "A =" : "D ="}
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

          {/* Eigenvalue readouts */}
          <text
            x={W - 16} y={98}
            textAnchor="end"
            fontSize="11" fontFamily={FONT} fill={BLUE}
          >
            {"\u03BB\u2081"} = {LAMBDA1}
          </text>
          <text
            x={W - 16} y={114}
            textAnchor="end"
            fontSize="11" fontFamily={FONT} fill={RED}
          >
            {"\u03BB\u2082"} = {LAMBDA2}
          </text>
        </g>

        {/* Annotation: what the figure shows */}
        <text
          x={16} y={H - 12}
          fontSize="10" fontFamily={FONT} fill="rgba(0,0,0,0.25)"
        >
          eigenvectors stay on their line — they only scale
        </text>
      </svg>

      {/* Diagonalize button */}
      <div
        className="blog-figure__controls"
        style={{ justifyContent: "center", gap: "0.4rem" }}
      >
        <button
          className="blog-figure__button"
          style={
            diagonalized
              ? { borderColor: "rgba(0,0,0,0.4)", color: "rgba(0,0,0,0.7)" }
              : {}
          }
          onClick={handleToggle}
        >
          {diagonalized ? "Standard basis" : "Diagonalize"}
        </button>
      </div>
    </div>
  )
}
