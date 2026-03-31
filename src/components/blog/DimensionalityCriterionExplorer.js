import React, { useState, useRef, useCallback, useMemo } from "react"

/* ─── Layout ─── */
const W = 700
const H = 300
const FONT = "var(--font-mono, monospace)"

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const RED = "#c0503a"
const GRAY = "rgba(0,0,0,0.12)"

/* ─── Data ─── */
const SINGULAR_VALUES = [8.5, 6.2, 0.9, 0.7, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2]
const N = SINGULAR_VALUES.length
const DEFAULT_THRESHOLD = 3.0

/* ─── Bar chart geometry ─── */
const BAR_W = 28
const BAR_GAP = 5
const CHART_L = 52        // left margin
const CHART_R = 380       // right edge of bar chart area
const CHART_TOP = 36      // top margin
const CHART_BOT = H - 46  // bottom margin
const CHART_H = CHART_BOT - CHART_TOP

const SV_MAX = 9.5
const SV_MIN = 0.0

/* ─── Reconstruction panel geometry ─── */
const REC_L = 408         // left edge of reconstruction panel
const REC_W = W - REC_L - 8  // ~284px
const REC_TOP = 28
const REC_BOT = H - 32
const REC_FULL_H = REC_BOT - REC_TOP

const N_TRACES = 3        // channels to display
const TRACE_GAP = 6       // px gap between traces
const TRACE_H = Math.floor((REC_FULL_H - TRACE_GAP * (N_TRACES - 1)) / N_TRACES)

/* Map a singular value to a y pixel coordinate */
function svToY(sv) {
  const frac = (sv - SV_MIN) / (SV_MAX - SV_MIN)
  return CHART_BOT - frac * CHART_H
}

/* Map a y pixel coordinate to a singular value */
function yToSv(y) {
  const frac = (CHART_BOT - y) / CHART_H
  return SV_MIN + frac * (SV_MAX - SV_MIN)
}

/* Bar x center for bar index i (0-based) */
function barX(i) {
  const totalW = N * BAR_W + (N - 1) * BAR_GAP
  const startX = CHART_L + (CHART_R - CHART_L - totalW) / 2
  return startX + i * (BAR_W + BAR_GAP) + BAR_W / 2
}

/* Subscript digits map */
const SUB = { 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉", 10: "₁₀" }

/* ─────────────────────────────────────────────
   Data generation (same dynamics as SubspaceRecoveryExplorer)
   mulberry32 seed = 2026
   ───────────────────────────────────────────── */

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randn(rng) {
  const u1 = rng()
  const u2 = rng()
  const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12)))
  const theta = 2 * Math.PI * u2
  return [r * Math.cos(theta), r * Math.sin(theta)]
}

function dot(a, b) {
  return a.reduce((s, v, i) => s + v * b[i], 0)
}

function vecScale(a, s) {
  return a.map(v => v * s)
}

function vecSub(a, b) {
  return a.map((v, i) => v - b[i])
}

function norm(a) {
  return Math.sqrt(dot(a, a))
}

function normalize(a) {
  const n = norm(a)
  return n < 1e-12 ? a : a.map(v => v / n)
}

function matVec(M, v) {
  return M.map(row => row.reduce((s, a, j) => s + a * v[j], 0))
}

function matTmat(A) {
  const rows = A.length
  const cols = A[0].length
  const R = Array.from({ length: cols }, () => new Array(cols).fill(0))
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < cols; k++) {
        R[j][k] += A[i][j] * A[i][k]
      }
    }
  }
  return R
}

/* Power iteration for top-k eigenvectors of a symmetric matrix */
function topKEigenvectors(M, k, rng) {
  const n = M.length
  const vecs = []
  for (let ei = 0; ei < k; ei++) {
    let v = Array.from({ length: n }, () => rng() - 0.5)
    v = normalize(v)
    for (let iter = 0; iter < 300; iter++) {
      let w = matVec(M, v)
      for (const prev of vecs) {
        const proj = dot(w, prev)
        w = vecSub(w, vecScale(prev, proj))
      }
      const wNorm = norm(w)
      if (wNorm < 1e-14) break
      v = vecScale(w, 1 / wNorm)
    }
    for (const prev of vecs) {
      const proj = dot(v, prev)
      v = vecSub(v, vecScale(prev, proj))
    }
    v = normalize(v)
    vecs.push(v)
  }
  return vecs
}

/* Generate simulation data (T=100 steps, 6 observed channels) */
function generateSimData() {
  const rng = mulberry32(2026)

  const T = 100
  const A = [[0.98, -0.2], [0.2, 0.98]]
  const xTrue = [[1, 0]]
  for (let t = 1; t < T; t++) {
    xTrue.push(matVec(A, xTrue[t - 1]))
  }

  // 6×2 mixing matrix
  const C = Array.from({ length: 6 }, () => {
    const [a, b] = randn(rng)
    return [a, b]
  })

  const NOISE_STD = 0.15
  const Y = xTrue.map(x => {
    const cx = matVec(C, x)
    return cx.map(v => {
      const [n1] = randn(rng)
      return v + n1 * NOISE_STD
    })
  })

  // Center column-wise using TRAIN portion only (first 50 steps)
  const TRAIN = 50
  const means = Array(6).fill(0)
  for (let j = 0; j < 6; j++) {
    for (let t = 0; t < TRAIN; t++) means[j] += Y[t][j]
    means[j] /= TRAIN
  }

  const Yc = Y.map(row => row.map((v, j) => v - means[j]))

  // Train / test split
  const Ytrain = Yc.slice(0, TRAIN)
  const Ytest = Yc.slice(TRAIN)

  // Covariance from train data
  const YtY = matTmat(Ytrain)

  return { Ytrain, Ytest, YtY, T, TRAIN }
}

const SIM_DATA = generateSimData()

/* Reconstruct test observations with d-dimensional PCA subspace.
   ŷ = V_d V_d^T y  (projection onto d leading eigenvectors) */
function computeReconstruction(d) {
  const { Ytest, YtY } = SIM_DATA
  const iterRng = mulberry32(42)
  const eigvecs = topKEigenvectors(YtY, d, iterRng)

  // For each test observation y, compute ŷ = sum_k (y·v_k) v_k
  const Yhat = Ytest.map(y => {
    const recon = new Array(y.length).fill(0)
    for (const vk of eigvecs) {
      const coeff = dot(y, vk)
      for (let j = 0; j < y.length; j++) {
        recon[j] += coeff * vk[j]
      }
    }
    return recon
  })

  // Compute R² across all channels and time steps
  const P = Ytest.length
  const nchan = Ytest[0].length
  let ssTot = 0
  let ssRes = 0
  // mean of Ytest per channel
  const testMeans = Array(nchan).fill(0)
  for (let t = 0; t < P; t++) {
    for (let j = 0; j < nchan; j++) testMeans[j] += Ytest[t][j]
  }
  for (let j = 0; j < nchan; j++) testMeans[j] /= P

  for (let t = 0; t < P; t++) {
    for (let j = 0; j < nchan; j++) {
      ssTot += (Ytest[t][j] - testMeans[j]) ** 2
      ssRes += (Ytest[t][j] - Yhat[t][j]) ** 2
    }
  }

  const r2 = Math.max(0, 1 - ssRes / ssTot)
  return { Yhat, r2 }
}

export default function DimensionalityCriterionExplorer() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef(null)

  /* Convert SVG-local y to singular value, clamped */
  const applyDrag = useCallback((clientY) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleY = H / rect.height
    const localY = (clientY - rect.top) * scaleY
    const sv = yToSv(localY)
    setThreshold(Math.min(9.0, Math.max(0.1, sv)))
  }, [])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    applyDrag(e.clientY)
  }, [dragging, applyDrag])

  const handleMouseUp = useCallback(() => setDragging(false), [])
  const handleMouseLeave = useCallback(() => setDragging(false), [])

  /* Touch support */
  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return
    applyDrag(e.touches[0].clientY)
  }, [dragging, applyDrag])

  const handleTouchEnd = useCallback(() => setDragging(false), [])

  /* Derived */
  const thresholdY = svToY(threshold)
  const d = SINGULAR_VALUES.filter(sv => sv > threshold).length

  /* Annotation: is threshold in the gap (between σ₂=6.2 and σ₃=0.9)? */
  const inGap = threshold > 0.9 && threshold < 6.2

  /* x coordinates for σ₂ and σ₃ bars */
  const x2 = barX(1)
  const x3 = barX(2)
  const gapMidX = (x2 + BAR_W / 2 + x3 - BAR_W / 2) / 2
  const gapMidY = svToY((6.2 + 0.9) / 2)

  /* "signal" label: center of first 2 bars */
  const signalMidX = (barX(0) + barX(1)) / 2
  /* "noise floor" label: center of bars 3–10 */
  const noiseMidX = (barX(2) + barX(9)) / 2

  /* Reconstruction panel data, keyed on d */
  const dClamped = Math.max(1, Math.min(d, 10))
  const { Yhat, r2 } = useMemo(() => computeReconstruction(dClamped), [dClamped])
  const { Ytest } = SIM_DATA

  /* Build polyline points for each of the first N_TRACES channels */
  const traceData = useMemo(() => {
    return Array.from({ length: N_TRACES }, (_, ch) => {
      const obsVals = Ytest.map(row => row[ch])
      const recVals = Yhat.map(row => row[ch])
      const allVals = [...obsVals, ...recVals]
      const vMin = Math.min(...allVals)
      const vMax = Math.max(...allVals)
      const vRange = vMax - vMin || 1

      const T = obsVals.length
      const traceTop = REC_TOP + ch * (TRACE_H + TRACE_GAP)

      function toSVG(t, v) {
        const x = REC_L + (t / (T - 1)) * REC_W
        const y = traceTop + TRACE_H - ((v - vMin) / vRange) * TRACE_H
        return [x, y]
      }

      function toPoints(vals) {
        return vals.map((v, t) => toSVG(t, v).join(",")).join(" ")
      }

      return {
        obsPoints: toPoints(obsVals),
        recPoints: toPoints(recVals),
        traceTop,
      }
    })
  }, [Yhat, Ytest])

  const r2Display = r2.toFixed(2)

  return (
    <div style={{ userSelect: "none", touchAction: "none" }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          display: "block",
          width: "100%",
          cursor: dragging ? "ns-resize" : "default",
          fontFamily: FONT,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── Bars ── */}
        {SINGULAR_VALUES.map((sv, i) => {
          const cx = barX(i)
          const barTop = svToY(sv)
          const barH = CHART_BOT - barTop
          const above = sv > threshold
          return (
            <rect
              key={i}
              x={cx - BAR_W / 2}
              y={barTop}
              width={BAR_W}
              height={barH}
              fill={above ? TEAL : GRAY}
              rx={2}
            />
          )
        })}

        {/* ── Singular value labels above each bar ── */}
        {SINGULAR_VALUES.map((sv, i) => {
          const cx = barX(i)
          const barTop = svToY(sv)
          return (
            <text
              key={i}
              x={cx}
              y={barTop - 5}
              textAnchor="middle"
              fontSize={9}
              fill={sv > threshold ? TEAL : "rgba(0,0,0,0.35)"}
              fontFamily={FONT}
            >
              {sv}
            </text>
          )
        })}

        {/* ── Bar labels (σ₁ … σ₁₀) below bars ── */}
        {SINGULAR_VALUES.map((_, i) => {
          const cx = barX(i)
          return (
            <text
              key={i}
              x={cx}
              y={CHART_BOT + 16}
              textAnchor="middle"
              fontSize={11}
              fill="rgba(0,0,0,0.5)"
              fontFamily={FONT}
            >
              {`σ${SUB[i + 1]}`}
            </text>
          )
        })}

        {/* ── "signal" region label ── */}
        <text
          x={signalMidX}
          y={CHART_TOP - 6}
          textAnchor="middle"
          fontSize={10}
          fill={TEAL}
          fontFamily={FONT}
          opacity={d >= 2 ? 1 : 0.35}
        >
          signal
        </text>

        {/* ── "noise floor" region label ── */}
        <text
          x={noiseMidX}
          y={CHART_TOP - 6}
          textAnchor="middle"
          fontSize={10}
          fill="rgba(0,0,0,0.4)"
          fontFamily={FONT}
        >
          noise floor
        </text>

        {/* ── Threshold line ── */}
        <line
          x1={CHART_L}
          y1={thresholdY}
          x2={CHART_R - 10}
          y2={thresholdY}
          stroke={RED}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          style={{ cursor: "ns-resize" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />

        {/* ── Drag handle (circle at right edge) ── */}
        <circle
          cx={CHART_R - 10}
          cy={thresholdY}
          r={6}
          fill={RED}
          style={{ cursor: "ns-resize" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />

        {/* ── d = N label ── */}
        <text
          x={CHART_L + 2}
          y={thresholdY - 7}
          fontSize={11}
          fill={RED}
          fontFamily={FONT}
        >
          {`d = ${d}`}
        </text>

        {/* ── Gap annotation (only when threshold is in the gap) ── */}
        {inGap && (
          <g>
            <line
              x1={gapMidX + 28}
              y1={gapMidY - 8}
              x2={gapMidX + 6}
              y2={gapMidY + 2}
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={1}
              markerEnd="url(#arrowhead)"
            />
            <text
              x={gapMidX + 30}
              y={gapMidY - 10}
              fontSize={10}
              fill="rgba(0,0,0,0.6)"
              fontFamily={FONT}
              textAnchor="start"
            >
              gap
            </text>
          </g>
        )}

        {/* ── Arrowhead marker ── */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth={6}
            markerHeight={6}
            refX={3}
            refY={3}
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="rgba(0,0,0,0.55)" />
          </marker>
        </defs>

        {/* ════════════════════════════════════════
            Reconstruction panel
            ════════════════════════════════════════ */}

        {/* Panel title */}
        <text
          x={REC_L + REC_W / 2}
          y={REC_TOP - 10}
          textAnchor="middle"
          fontSize={10}
          fill="rgba(0,0,0,0.45)"
          fontFamily={FONT}
        >
          test reconstruction
        </text>

        {/* Divider line */}
        <line
          x1={REC_L - 14}
          y1={REC_TOP - 4}
          x2={REC_L - 14}
          y2={REC_BOT}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={1}
        />

        {/* Trace subplots */}
        {traceData.map(({ obsPoints, recPoints, traceTop }, ch) => (
          <g key={ch}>
            {/* Subplot background */}
            <rect
              x={REC_L}
              y={traceTop}
              width={REC_W}
              height={TRACE_H}
              fill="rgba(0,0,0,0.02)"
              rx={2}
            />
            {/* Observed trace */}
            <polyline
              points={obsPoints}
              fill="none"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth={1.2}
            />
            {/* Reconstructed trace */}
            <polyline
              points={recPoints}
              fill="none"
              stroke={TEAL}
              strokeWidth={1.5}
            />
          </g>
        ))}

        {/* R² label */}
        <text
          x={REC_L + REC_W / 2}
          y={REC_BOT + 16}
          textAnchor="middle"
          fontSize={10}
          fill="rgba(0,0,0,0.5)"
          fontFamily={FONT}
        >
          {`R² = ${r2Display}`}
        </text>
      </svg>
    </div>
  )
}
