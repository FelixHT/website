import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"

/* ─── Layout ─── */
const W = 800
const H = 420
const CX = 400
const CY = 210
const SCALE = 30
const N_SAMPLES = 120
const ANIM_DURATION = 500

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const GHOST = "rgba(0,0,0,0.06)"
const FONT = "var(--font-mono, monospace)"

/* ─── Covariance matrix C ─── */
const C = [[4, 3], [3, 9]]

/* ─── Eigen-decomposition of C = [[4,3],[3,9]] ─── */
// char. eq: λ² - 13λ + 27 = 0  →  λ = (13 ± √61) / 2
const SQRT61 = Math.sqrt(61)
const lambda1 = (13 + SQRT61) / 2 // ≈ 10.4051
const lambda2 = (13 - SQRT61) / 2 // ≈ 2.5949

// Eigenvector for λ₁: (C - λ₁I)v = 0 → (4 - λ₁)v₁ + 3v₂ = 0
// v ∝ [3, λ₁ - 4] = [3, (√61 - 5) / 2 + 4 - 4] = [3, (√61 + 5)/2 - 4]
// More directly: v₂/v₁ = (λ₁ - 4)/3
const raw1x = 3
const raw1y = lambda1 - 4 // (√61 - 5)/2 ≈ 6.405
const len1 = Math.sqrt(raw1x * raw1x + raw1y * raw1y)
const e1 = [raw1x / len1, raw1y / len1]

// Eigenvector for λ₂: orthogonal, chosen so Q has det +1
const raw2x = 3
const raw2y = lambda2 - 4 // (-(√61) + 5)/2 - ... ≈ -1.405
const len2 = Math.sqrt(raw2x * raw2x + raw2y * raw2y)
let e2 = [raw2x / len2, raw2y / len2]

// Q = [e1 | e2] as columns — ensure det(Q) = +1
const detQ = e1[0] * e2[1] - e1[1] * e2[0]
if (detQ < 0) {
  e2 = [-e2[0], -e2[1]]
}

// Orthogonal matrix Q (columns are eigenvectors)
const Q = [[e1[0], e2[0]], [e1[1], e2[1]]]
const QT = [[Q[0][0], Q[1][0]], [Q[0][1], Q[1][1]]]
const Lambda = [[lambda1, 0], [0, lambda2]]

/* ─── Linear algebra helpers ─── */
function matVec(M, v) {
  return [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]]
}

function matMul(A, B) {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ]
}

function matLerp(M1, M2, t) {
  return [
    [M1[0][0] + (M2[0][0] - M1[0][0]) * t, M1[0][1] + (M2[0][1] - M1[0][1]) * t],
    [M1[1][0] + (M2[1][0] - M1[1][0]) * t, M1[1][1] + (M2[1][1] - M1[1][1]) * t],
  ]
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

/* ─── Identity matrix ─── */
const I2 = [[1, 0], [0, 1]]

/* ─── Stage matrices ─── */
// Stage 0: I              (unit circle)
// Stage 1: Q^T            (rotate eigenvectors onto axes — still a circle)
// Stage 2: Λ Q^T          (stretch along axes by eigenvalues)
// Stage 3: Q Λ Q^T = C    (rotate back — final covariance ellipse)
const LambdaQT = matMul(Lambda, QT)
const QLambdaQT = matMul(Q, LambdaQT) // = C

const STAGE_MATRICES = [I2, QT, LambdaQT, QLambdaQT]

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
const FINAL_PATH = buildEllipsePath(QLambdaQT)

/* ─── Transform eigenvectors through each stage ─── */
function getTransformedEigenvectors(M) {
  // Transform the eigenvectors by the current matrix
  const te1 = matVec(M, e1)
  const te2 = matVec(M, e2)
  return [te1, te2]
}

/* ─── Format a number for display ─── */
function fmt(n) {
  if (Math.abs(n - Math.round(n)) < 0.005) return Math.round(n).toString()
  return n.toFixed(2)
}

/* ─── Stage descriptions ─── */
const STAGE_LABELS = [
  "unit circle with eigenvectors of C marked",
  "Q\u1D40 applied \u2014 eigenvectors now align with coordinate axes",
  "\u039B applied \u2014 scaled by eigenvalues (\u03BB\u2081\u2009\u2248\u2009" +
    lambda1.toFixed(2) + ", \u03BB\u2082\u2009\u2248\u2009" + lambda2.toFixed(2) + ")",
  "Q applied \u2014 rotated back; result is C\u00B7x = Q\u039BQ\u1D40x",
]

/* ─── Stage matrix labels ─── */
const STAGE_MATRIX_LABELS = [
  "I",
  "Q\u1D40",
  "\u039BQ\u1D40",
  "Q\u039BQ\u1D40 = C",
]

/* ─── Button config ─── */
const STEP_BUTTONS = [
  { label: "Q\u1D40: align eigenvectors", target: 1 },
  { label: "\u039B: scale by eigenvalues", target: 2 },
  { label: "Q: rotate back", target: 3 },
]

export default function SpectralTheoremExplorer() {
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

  /* ─── Transformed eigenvectors ─── */
  const [te1, te2] = useMemo(
    () => getTransformedEigenvectors(displayMatrix),
    [displayMatrix]
  )

  /* ─── Show ghost when not at final stage ─── */
  const showGhost = stage < 3

  /* ─── Current effective matrix for display ─── */
  const dm = displayMatrix

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

        {/* Eigenvector 1 arrow */}
        <line
          x1={CX} y1={CY}
          x2={CX + te1[0] * SCALE} y2={CY - te1[1] * SCALE}
          stroke={BLUE}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx={CX + te1[0] * SCALE}
          cy={CY - te1[1] * SCALE}
          r="3"
          fill={BLUE}
        />

        {/* Eigenvector 2 arrow */}
        <line
          x1={CX} y1={CY}
          x2={CX + te2[0] * SCALE} y2={CY - te2[1] * SCALE}
          stroke={RED}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx={CX + te2[0] * SCALE}
          cy={CY - te2[1] * SCALE}
          r="3"
          fill={RED}
        />

        {/* Eigenvector labels */}
        <text
          x={CX + te1[0] * SCALE + 6}
          y={CY - te1[1] * SCALE - 6}
          fontSize="10"
          fontFamily={FONT}
          fill={BLUE}
        >
          e&#x2081;
        </text>
        <text
          x={CX + te2[0] * SCALE + 6}
          y={CY - te2[1] * SCALE - 6}
          fontSize="10"
          fontFamily={FONT}
          fill={RED}
        >
          e&#x2082;
        </text>

        {/* Origin dot */}
        <circle cx={CX} cy={CY} r="3" fill="rgba(0,0,0,0.25)" />

        {/* Matrix display — top left */}
        <g>
          <text
            x={16} y={24}
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.35)"
          >
            C = Q&#x039B;Q&#x1D40;
          </text>
          <text
            x={16} y={42}
            fontSize="10.5" fontFamily={FONT} fill="rgba(0,0,0,0.3)"
          >
            current: {STAGE_MATRIX_LABELS[stage]}
          </text>
          <text
            x={16} y={62}
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.3)"
          >
            [{fmt(dm[0][0])}, {fmt(dm[0][1])}]
          </text>
          <text
            x={16} y={78}
            fontSize="11" fontFamily={FONT} fill="rgba(0,0,0,0.3)"
          >
            [{fmt(dm[1][0])}, {fmt(dm[1][1])}]
          </text>
        </g>

        {/* Eigenvalue display — top right */}
        <g>
          <text
            x={W - 16} y={24}
            textAnchor="end"
            fontSize="10.5" fontFamily={FONT} fill="rgba(0,0,0,0.3)"
          >
            <tspan fill={BLUE}>{"\u03BB\u2081"} &#x2248; {lambda1.toFixed(2)}</tspan>
            {"   "}
            <tspan fill={RED}>{"\u03BB\u2082"} &#x2248; {lambda2.toFixed(2)}</tspan>
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
