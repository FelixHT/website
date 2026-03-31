import React, { useState, useRef, useCallback, useEffect, useMemo } from "react"

/* ─── Layout ─── */
const W = 700
const H = 400
const SCATTER_CX = 220
const SCATTER_CY = 200
const SCATTER_R = 160
const CHART_X = 490
const CHART_Y = 60
const CHART_W = 170
const CHART_H = 240

/* ─── Colors ─── */
const SUBJECT_COLORS = ["#3d6cb9", "#4A7C6F", "#c0503a", "#D4A03C"]
const TEMPLATE_COLOR = "rgba(0,0,0,0.15)"
const AXIS_COLOR = "rgba(0,0,0,0.15)"
const FONT = "var(--font-mono, monospace)"

/* ─── Animation ─── */
const ITER_DURATION = 400
const NUM_ITERS = 4
const POINT_R = 4.5

/* ─── Seeded PRNG (mulberry32) ─── */
function mulberry32(seed) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─── 2D rotation matrix ─── */
function rotMat(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [
    [c, -s],
    [s, c],
  ]
}

/* ─── Apply 2x2 matrix to a set of points ─── */
function applyRotation(points, R) {
  return points.map(([x, y]) => [
    R[0][0] * x + R[0][1] * y,
    R[1][0] * x + R[1][1] * y,
  ])
}

/* ─── Transpose a Nx2 matrix (returns 2xN) ─── */
function transpose(pts) {
  const n = pts.length
  const out = [new Array(n), new Array(n)]
  for (let i = 0; i < n; i++) {
    out[0][i] = pts[i][0]
    out[1][i] = pts[i][1]
  }
  return out
}

/* ─── 2x2 SVD for Procrustes: given X^T Y (a 2x2), compute R = V U^T ─── */
function svd2x2(M) {
  // M is [[a,b],[c,d]]
  // Use the closed-form 2x2 SVD
  const a = M[0][0], b = M[0][1], c = M[1][0], d = M[1][1]

  // M^T M
  const e = a * a + c * c
  const f = a * b + c * d
  const g = b * b + d * d

  // Eigenvalues of M^T M
  const half = (e + g) / 2
  const disc = Math.sqrt(Math.max(0, ((e - g) / 2) ** 2 + f * f))
  const s1sq = half + disc
  const s2sq = half - disc
  const sigma1 = Math.sqrt(Math.max(0, s1sq))
  const sigma2 = Math.sqrt(Math.max(0, s2sq))

  // Eigenvectors of M^T M give V
  // For the first eigenvector: (M^T M - s1sq I) v = 0
  let v1x, v1y, v2x, v2y
  if (Math.abs(f) > 1e-12) {
    v1x = s1sq - g
    v1y = f
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y)
    v1x /= len1
    v1y /= len1
    v2x = -v1y
    v2y = v1x
  } else {
    if (e >= g) {
      v1x = 1; v1y = 0; v2x = 0; v2y = 1
    } else {
      v1x = 0; v1y = 1; v2x = 1; v2y = 0
    }
  }

  // U = M V Sigma^{-1}
  const u1x = sigma1 > 1e-12 ? (a * v1x + b * v1y) / sigma1 : 1
  const u1y = sigma1 > 1e-12 ? (c * v1x + d * v1y) / sigma1 : 0
  const u2x = sigma2 > 1e-12 ? (a * v2x + b * v2y) / sigma2 : -u1y
  const u2y = sigma2 > 1e-12 ? (c * v2x + d * v2y) / sigma2 : u1x

  // Optimal rotation R = V U^T (closest orthogonal matrix)
  const R = [
    [v1x * u1x + v2x * u2x, v1x * u1y + v2x * u2y],
    [v1y * u1x + v2y * u2x, v1y * u1y + v2y * u2y],
  ]

  // Ensure proper rotation (det = +1), not reflection
  const det = R[0][0] * R[1][1] - R[0][1] * R[1][0]
  if (det < 0) {
    // Flip the sign of the second column of V
    R[0][0] = v1x * u1x - v2x * u2x
    R[0][1] = v1x * u1y - v2x * u2y
    R[1][0] = v1y * u1x - v2y * u2x
    R[1][1] = v1y * u1y - v2y * u2y
  }

  return { R, sigma1, sigma2 }
}

/* ─── Frobenius norm of difference between two point sets ─── */
function frobeniusDist(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const dx = a[i][0] - b[i][0]
    const dy = a[i][1] - b[i][1]
    sum += dx * dx + dy * dy
  }
  return Math.sqrt(sum)
}

/* ─── Compute mean shape from array of point sets ─── */
function meanShape(allSets) {
  const n = allSets[0].length
  const k = allSets.length
  const mean = []
  for (let i = 0; i < n; i++) {
    let sx = 0, sy = 0
    for (let j = 0; j < k; j++) {
      sx += allSets[j][i][0]
      sy += allSets[j][i][1]
    }
    mean.push([sx / k, sy / k])
  }
  return mean
}

/* ─── Procrustes: find optimal rotation of X onto target ─── */
function procrustesRotation(X, target) {
  // Compute X^T * target
  const XT = transpose(X)
  const TT = transpose(target)
  const M = [
    [XT[0].reduce((s, v, i) => s + v * TT[0][i], 0), XT[0].reduce((s, v, i) => s + v * TT[1][i], 0)],
    [XT[1].reduce((s, v, i) => s + v * TT[0][i], 0), XT[1].reduce((s, v, i) => s + v * TT[1][i], 0)],
  ]
  const { R } = svd2x2(M)
  return R
}

/* ─── Run full generalized Procrustes ─── */
function runGPA(initialSets, numIters) {
  const k = initialSets.length
  const history = [initialSets.map(s => s.map(p => [...p]))]
  const errors = []

  // Initial error against first subject as reference
  let template = meanShape(initialSets)
  let totalErr = 0
  for (let j = 0; j < k; j++) {
    totalErr += frobeniusDist(initialSets[j], template)
  }
  errors.push(totalErr)

  let current = initialSets.map(s => s.map(p => [...p]))

  for (let iter = 0; iter < numIters; iter++) {
    // Align each subject to template
    const aligned = []
    for (let j = 0; j < k; j++) {
      const R = procrustesRotation(current[j], template)
      aligned.push(applyRotation(current[j], R))
    }

    // Update template
    template = meanShape(aligned)

    // Compute total error
    totalErr = 0
    for (let j = 0; j < k; j++) {
      totalErr += frobeniusDist(aligned[j], template)
    }
    errors.push(totalErr)

    current = aligned
    history.push(aligned.map(s => s.map(p => [...p])))
  }

  return { history, errors, finalTemplate: template }
}

/* ─── Map data point to SVG coords ─── */
function toSVG(x, y, scale) {
  return [SCATTER_CX + x * scale, SCATTER_CY - y * scale]
}

/* ─── Ease-out cubic ─── */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ─── Lerp between two point sets ─── */
function lerpPoints(a, b, t) {
  return a.map((p, i) => [
    p[0] + (b[i][0] - p[0]) * t,
    p[1] + (b[i][1] - p[1]) * t,
  ])
}

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */
export default function HyperalignmentExplorer() {
  const animRef = useRef(null)

  /* ─── Generate data on mount ─── */
  const { initialSets, gpa } = useMemo(() => {
    const rng = mulberry32(42)

    // Shared template: 6 points in 2D
    const template = []
    for (let i = 0; i < 6; i++) {
      template.push([
        (rng() - 0.5) * 3,
        (rng() - 0.5) * 3,
      ])
    }

    // Rotate each subject by fixed angles
    const angles = [30, 110, 200, 310].map(d => (d * Math.PI) / 180)
    const sets = angles.map(a => applyRotation(template, rotMat(a)))

    const result = runGPA(sets, NUM_ITERS)
    return { initialSets: sets, gpa: result }
  }, [])

  /* ─── Animation state ─── */
  // progress goes from 0 (initial) to NUM_ITERS (fully aligned)
  const [progress, setProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  /* ─── Compute scale from data range ─── */
  const dataScale = useMemo(() => {
    let maxAbs = 0
    for (const sets of gpa.history) {
      for (const pts of sets) {
        for (const [x, y] of pts) {
          maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(y))
        }
      }
    }
    return maxAbs > 0 ? (SCATTER_R * 0.85) / maxAbs : 1
  }, [gpa])

  /* ─── Current interpolated point sets ─── */
  const currentSets = useMemo(() => {
    const iterIdx = Math.floor(progress)
    const frac = progress - iterIdx
    if (iterIdx >= NUM_ITERS) {
      return gpa.history[NUM_ITERS]
    }
    const from = gpa.history[iterIdx]
    const to = gpa.history[iterIdx + 1]
    return from.map((pts, k) => lerpPoints(pts, to[k], easeOutCubic(frac)))
  }, [progress, gpa])

  /* ─── Current interpolated error ─── */
  const currentError = useMemo(() => {
    const iterIdx = Math.floor(progress)
    const frac = progress - iterIdx
    if (iterIdx >= NUM_ITERS) return gpa.errors[NUM_ITERS]
    const from = gpa.errors[iterIdx]
    const to = gpa.errors[iterIdx + 1]
    return from + (to - from) * easeOutCubic(frac)
  }, [progress, gpa])

  /* ─── Current iteration display ─── */
  const currentIter = Math.min(Math.floor(progress), NUM_ITERS)

  /* ─── Animate alignment ─── */
  const handleAlign = useCallback(() => {
    if (isAnimating) return

    // Reset if already at end
    const startProg = progress >= NUM_ITERS ? 0 : progress
    if (progress >= NUM_ITERS) {
      setProgress(0)
    }

    setIsAnimating(true)

    const totalDuration = ITER_DURATION * (NUM_ITERS - startProg)
    const t0 = performance.now()

    function tick(now) {
      const elapsed = now - t0
      const rawT = Math.min(elapsed / totalDuration, 1)
      const current = startProg + (NUM_ITERS - startProg) * rawT
      setProgress(current)

      if (rawT < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setProgress(NUM_ITERS)
        setIsAnimating(false)
        animRef.current = null
      }
    }

    animRef.current = requestAnimationFrame(tick)
  }, [isAnimating, progress])

  /* ─── Reset ─── */
  const handleReset = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    setIsAnimating(false)
    setProgress(0)
  }, [])

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  /* ─── Error chart scales ─── */
  const maxError = gpa.errors[0]
  const barWidth = CHART_W / (NUM_ITERS + 1)

  /* ─── Show template when aligned ─── */
  const showTemplate = progress > 0.5

  return (
    <figure style={{ margin: "2rem 0" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto" }}
        fontFamily={FONT}
      >
        {/* ─── Scatter panel background ─── */}
        <circle
          cx={SCATTER_CX}
          cy={SCATTER_CY}
          r={SCATTER_R + 10}
          fill="none"
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />

        {/* ─── Cross-hairs ─── */}
        <line
          x1={SCATTER_CX - SCATTER_R - 10}
          y1={SCATTER_CY}
          x2={SCATTER_CX + SCATTER_R + 10}
          y2={SCATTER_CY}
          stroke={AXIS_COLOR}
          strokeWidth={0.5}
        />
        <line
          x1={SCATTER_CX}
          y1={SCATTER_CY - SCATTER_R - 10}
          x2={SCATTER_CX}
          y2={SCATTER_CY + SCATTER_R + 10}
          stroke={AXIS_COLOR}
          strokeWidth={0.5}
        />

        {/* ─── Template points (shown faintly after alignment begins) ─── */}
        {showTemplate &&
          gpa.finalTemplate.map((pt, i) => {
            const [sx, sy] = toSVG(pt[0], pt[1], dataScale)
            return (
              <circle
                key={`tmpl-${i}`}
                cx={sx}
                cy={sy}
                r={POINT_R + 2}
                fill="none"
                stroke={TEMPLATE_COLOR}
                strokeWidth={1.5}
                opacity={Math.min(1, progress * 0.5)}
              />
            )
          })}

        {/* ─── Subject point clouds ─── */}
        {currentSets.map((pts, subj) =>
          pts.map((pt, i) => {
            const [sx, sy] = toSVG(pt[0], pt[1], dataScale)
            return (
              <circle
                key={`s${subj}-p${i}`}
                cx={sx}
                cy={sy}
                r={POINT_R}
                fill={SUBJECT_COLORS[subj]}
                opacity={0.85}
              />
            )
          })
        )}

        {/* ─── Scatter panel label ─── */}
        <text
          x={SCATTER_CX}
          y={SCATTER_CY + SCATTER_R + 30}
          textAnchor="middle"
          fontSize={11}
          fill="rgba(0,0,0,0.5)"
        >
          neural state space
        </text>

        {/* ─── Legend ─── */}
        {SUBJECT_COLORS.map((color, i) => (
          <g key={`leg-${i}`} transform={`translate(${SCATTER_CX - 80 + i * 50}, ${SCATTER_CY - SCATTER_R - 24})`}>
            <circle cx={0} cy={0} r={4} fill={color} opacity={0.85} />
            <text x={7} y={4} fontSize={10} fill="rgba(0,0,0,0.6)">
              S{i + 1}
            </text>
          </g>
        ))}

        {/* ─── Error chart ─── */}
        {/* Chart axes */}
        <line
          x1={CHART_X}
          y1={CHART_Y + CHART_H}
          x2={CHART_X + CHART_W}
          y2={CHART_Y + CHART_H}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1}
        />
        <line
          x1={CHART_X}
          y1={CHART_Y}
          x2={CHART_X}
          y2={CHART_Y + CHART_H}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1}
        />

        {/* Chart title */}
        <text
          x={CHART_X + CHART_W / 2}
          y={CHART_Y - 12}
          textAnchor="middle"
          fontSize={11}
          fill="rgba(0,0,0,0.6)"
        >
          alignment error
        </text>

        {/* Y-axis label */}
        <text
          x={CHART_X - 8}
          y={CHART_Y + 2}
          textAnchor="end"
          fontSize={9}
          fill="rgba(0,0,0,0.4)"
        >
          {maxError.toFixed(1)}
        </text>
        <text
          x={CHART_X - 8}
          y={CHART_Y + CHART_H + 3}
          textAnchor="end"
          fontSize={9}
          fill="rgba(0,0,0,0.4)"
        >
          0
        </text>

        {/* Bars for each iteration */}
        {gpa.errors.map((err, i) => {
          const barH = (err / maxError) * (CHART_H - 4)
          const bx = CHART_X + i * barWidth + barWidth * 0.15
          const bw = barWidth * 0.7
          const by = CHART_Y + CHART_H - barH

          // Determine opacity: past iterations full, future ones faint
          const iterFrac = progress - i
          const opacity = iterFrac >= 0 ? 0.7 : 0.12

          return (
            <g key={`bar-${i}`}>
              <rect
                x={bx}
                y={by}
                width={bw}
                height={barH}
                fill={iterFrac >= 0 ? "#4A7C6F" : "rgba(0,0,0,0.15)"}
                opacity={opacity}
                rx={2}
              />
              <text
                x={bx + bw / 2}
                y={CHART_Y + CHART_H + 14}
                textAnchor="middle"
                fontSize={9}
                fill="rgba(0,0,0,0.5)"
              >
                {i}
              </text>
            </g>
          )
        })}

        {/* X-axis label for chart */}
        <text
          x={CHART_X + CHART_W / 2}
          y={CHART_Y + CHART_H + 30}
          textAnchor="middle"
          fontSize={10}
          fill="rgba(0,0,0,0.45)"
        >
          iteration
        </text>

        {/* ─── Current error marker line ─── */}
        {progress > 0 && (
          <line
            x1={CHART_X + progress * barWidth + barWidth / 2}
            y1={CHART_Y + CHART_H - (currentError / maxError) * (CHART_H - 4) - 4}
            x2={CHART_X + progress * barWidth + barWidth / 2}
            y2={CHART_Y + CHART_H - (currentError / maxError) * (CHART_H - 4) + 4}
            stroke="#c0503a"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}

        {/* ─── Status readout ─── */}
        <text
          x={CHART_X}
          y={CHART_Y + CHART_H + 52}
          fontSize={11}
          fill="rgba(0,0,0,0.55)"
        >
          <tspan fontWeight={600}>iter</tspan>
          {" "}
          <tspan>{currentIter}</tspan>
          <tspan dx={14} fontWeight={600}>err</tspan>
          {" "}
          <tspan>{currentError.toFixed(2)}</tspan>
        </text>
      </svg>

      {/* ─── Controls ─── */}
      <div style={{ textAlign: "center", marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>
        <button
          className="blog-figure__button"
          onClick={handleAlign}
          disabled={isAnimating}
        >
          {progress >= NUM_ITERS ? "Replay" : "Align all"}
        </button>
        <button
          className="blog-figure__button"
          onClick={handleReset}
          disabled={progress === 0 && !isAnimating}
        >
          Reset
        </button>
      </div>
    </figure>
  )
}
