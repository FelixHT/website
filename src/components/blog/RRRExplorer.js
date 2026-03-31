import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 700
const H = 500
const PLOT_CX = 230
const PLOT_CY = 235
const PLOT_R = 185
const FONT = "var(--font-mono, monospace)"

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const PCA_STROKE = "rgba(0,0,0,0.3)"
const BLUE_LO = "#3d6cb9"
const RED_HI = "#c0503a"

const READOUT_X = 465
const READOUT_Y = 50

const N = 50
const D = 6 // source dimensions
const DY = 2 // target dimensions
const SEED = 2024

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

function randn(rng) {
  const u1 = rng()
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2)
}

/* ─── Linear algebra helpers for arbitrary dimensions ─── */

function zeros(r, c) {
  const m = []
  for (let i = 0; i < r; i++) {
    m[i] = new Array(c).fill(0)
  }
  return m
}

function transpose(A) {
  const r = A.length, c = A[0].length
  const T = zeros(c, r)
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      T[j][i] = A[i][j]
  return T
}

function matMul(A, B) {
  const r = A.length, inner = A[0].length, c = B[0].length
  const C = zeros(r, c)
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++) {
      let s = 0
      for (let k = 0; k < inner; k++) s += A[i][k] * B[k][j]
      C[i][j] = s
    }
  return C
}

function matVec(A, v) {
  const r = A.length, c = A[0].length
  const out = new Array(r).fill(0)
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      out[i] += A[i][j] * v[j]
  return out
}

function dotVec(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function vecNorm(v) {
  return Math.sqrt(dotVec(v, v))
}

function vecScale(v, s) {
  return v.map(x => x * s)
}

function vecSub(a, b) {
  return a.map((x, i) => x - b[i])
}

/* ─── Solve A x = b for symmetric positive-definite A via Cholesky ─── */
function choleskySolve(A, b) {
  const n = A.length
  // Cholesky decomposition: A = L L^T
  const L = zeros(n, n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j]
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(s, 1e-12))
      } else {
        L[i][j] = s / L[j][j]
      }
    }
  }
  // Forward substitution: L y = b
  const y = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    let s = b[i]
    for (let j = 0; j < i; j++) s -= L[i][j] * y[j]
    y[i] = s / L[i][i]
  }
  // Back substitution: L^T x = y
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let j = i + 1; j < n; j++) s -= L[j][i] * x[j]
    x[i] = s / L[i][i]
  }
  return x
}

/* ─── Solve A X = B column by column ─── */
function choleskySolveMatrix(A, B) {
  const nCols = B[0].length
  const result = zeros(A.length, nCols)
  for (let c = 0; c < nCols; c++) {
    const col = A.map((_, i) => B[i][c])
    const x = choleskySolve(A, col)
    for (let i = 0; i < x.length; i++) result[i][c] = x[i]
  }
  return result
}

/* ─── Power iteration for eigendecomposition of symmetric matrix ─── */
/* Returns { values: [...], vectors: [[...], ...] } sorted descending */
function eigenSymmetric(M, nEigs) {
  const n = M.length
  const rng = mulberry32(42)
  const values = []
  const vectors = []
  // Work on a copy so deflation doesn't affect the original
  const A = M.map(row => [...row])

  for (let e = 0; e < nEigs; e++) {
    // Random starting vector
    let v = []
    for (let i = 0; i < n; i++) v.push(randn(rng))
    let norm = vecNorm(v)
    v = v.map(x => x / norm)

    for (let iter = 0; iter < 200; iter++) {
      const Av = matVec(A, v)
      norm = vecNorm(Av)
      if (norm < 1e-14) break
      const vNew = Av.map(x => x / norm)
      // Check convergence
      let diff = 0
      for (let i = 0; i < n; i++) diff += (vNew[i] - v[i]) ** 2
      v = vNew
      if (diff < 1e-14) break
    }

    const lambda = dotVec(v, matVec(A, v))
    values.push(lambda)
    vectors.push(v)

    // Deflate: A = A - lambda * v * v^T
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        A[i][j] -= lambda * v[i] * v[j]
  }

  return { values, vectors }
}

/* ─── SVD of a (d x p) matrix via eigendecomposition of A^T A ─── */
/* Returns { U, S, Vt } where A ≈ U diag(S) Vt */
function svd(A) {
  const d = A.length, p = A[0].length
  const At = transpose(A)
  const AtA = matMul(At, A) // p x p
  const rank = Math.min(d, p)
  const eig = eigenSymmetric(AtA, rank)

  const S = []
  const V = [] // columns of V (right singular vectors)
  const U = [] // columns of U

  for (let k = 0; k < rank; k++) {
    const sigma2 = Math.max(eig.values[k], 0)
    const sigma = Math.sqrt(sigma2)
    S.push(sigma)
    V.push(eig.vectors[k])
    if (sigma > 1e-12) {
      const Av = matVec(A, eig.vectors[k])
      U.push(Av.map(x => x / sigma))
    } else {
      U.push(new Array(d).fill(0))
    }
  }

  // Vt: each row is a right singular vector
  const Vt = zeros(rank, p)
  for (let k = 0; k < rank; k++)
    for (let j = 0; j < p; j++)
      Vt[k][j] = V[k][j]

  // U as matrix: d x rank
  const Umat = zeros(d, rank)
  for (let k = 0; k < rank; k++)
    for (let i = 0; i < d; i++)
      Umat[i][k] = U[k][i]

  return { U: Umat, S, Vt }
}

/* ─── Generate data: 6D source, 2D target ─── */
/* The predictive directions are deliberately NOT aligned with the PCA directions */
function generateData() {
  const rng = mulberry32(SEED)

  // Generate X with specific covariance structure:
  // Large variance along dims 0-1 (PCA will find these first)
  // The target Y depends on dims 3-4 (low-variance, high-prediction directions)
  // This creates the PCA ≠ prediction mismatch

  const variances = [5.0, 3.5, 2.0, 1.2, 0.8, 0.5]

  // Generate raw data along principal axes
  const Xraw = zeros(N, D)
  for (let i = 0; i < N; i++)
    for (let j = 0; j < D; j++)
      Xraw[i][j] = randn(rng) * Math.sqrt(variances[j])

  // Apply a random rotation so the data isn't axis-aligned
  // (but the relative variance structure is preserved)
  // Use a fixed rotation matrix constructed via Gram-Schmidt on random vectors
  const rawBasis = []
  for (let k = 0; k < D; k++) {
    const v = []
    for (let j = 0; j < D; j++) v.push(randn(rng))
    rawBasis.push(v)
  }
  // Gram-Schmidt
  const Q = []
  for (let k = 0; k < D; k++) {
    let v = [...rawBasis[k]]
    for (let j = 0; j < k; j++) {
      const proj = dotVec(v, Q[j])
      v = vecSub(v, vecScale(Q[j], proj))
    }
    const n = vecNorm(v)
    Q.push(v.map(x => x / n))
  }

  // Rotated data: X = Xraw * Q^T
  const Qmat = zeros(D, D)
  for (let i = 0; i < D; i++)
    for (let j = 0; j < D; j++)
      Qmat[i][j] = Q[i][j]

  const QmatT = transpose(Qmat)
  const X = zeros(N, D)
  for (let i = 0; i < N; i++) {
    const row = matVec(QmatT, Xraw[i])
    for (let j = 0; j < D; j++) X[i][j] = row[j]
  }

  // True mapping: Y depends on the low-variance directions (axes 3,4 in Xraw space)
  // w_true in rotated space = Q^T * w_raw
  // w_raw for Y1: primarily axis 3 with a bit of axis 0
  // w_raw for Y2: primarily axis 4 with a bit of axis 1
  const wRaw1 = [0.15, 0.0, 0.0, 1.0, 0.0, 0.0]
  const wRaw2 = [0.0, 0.1, 0.0, 0.0, 1.0, 0.0]

  // True weights in the rotated coordinate system
  const w1 = matVec(QmatT, wRaw1)
  const w2 = matVec(QmatT, wRaw2)

  // Generate Y = X * W + noise
  const Y = zeros(N, DY)
  for (let i = 0; i < N; i++) {
    Y[i][0] = dotVec(X[i], w1) + randn(rng) * 0.5
    Y[i][1] = dotVec(X[i], w2) + randn(rng) * 0.5
  }

  // Center X and Y
  const meanX = new Array(D).fill(0)
  const meanY = new Array(DY).fill(0)
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < D; j++) meanX[j] += X[i][j]
    for (let j = 0; j < DY; j++) meanY[j] += Y[i][j]
  }
  for (let j = 0; j < D; j++) meanX[j] /= N
  for (let j = 0; j < DY; j++) meanY[j] /= N
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < D; j++) X[i][j] -= meanX[j]
    for (let j = 0; j < DY; j++) Y[i][j] -= meanY[j]
  }

  return { X, Y }
}

/* ─── Compute PCA of X (top 2 eigenvectors for display) ─── */
function computePCA(X) {
  const n = X.length, d = X[0].length
  // Covariance: X^T X / n
  const Xt = transpose(X)
  const cov = matMul(Xt, X)
  for (let i = 0; i < d; i++)
    for (let j = 0; j < d; j++)
      cov[i][j] /= n

  const eig = eigenSymmetric(cov, d)
  return { values: eig.values, vectors: eig.vectors }
}

/* ─── Full OLS: B = (X^T X)^{-1} X^T Y, returns D x DY matrix ─── */
function computeOLS(X, Y) {
  const Xt = transpose(X)
  const XtX = matMul(Xt, X)    // D x D
  const XtY = matMul(Xt, Y)    // D x DY
  // Add small ridge for numerical stability
  for (let i = 0; i < XtX.length; i++) XtX[i][i] += 1e-8
  return choleskySolveMatrix(XtX, XtY) // D x DY
}

/* ─── Rank-k RRR: truncated SVD of B_full ─── */
/* B_k = U[:,:k] diag(S[:k]) Vt[:k,:] */
function computeRRR(Bfull, rank) {
  const { U, S, Vt } = svd(Bfull)
  const d = Bfull.length, p = Bfull[0].length
  const k = Math.min(rank, S.length)
  const Bk = zeros(d, p)
  for (let r = 0; r < k; r++) {
    if (S[r] < 1e-12) continue
    for (let i = 0; i < d; i++)
      for (let j = 0; j < p; j++)
        Bk[i][j] += U[i][r] * S[r] * Vt[r][j]
  }
  // The rank-1 RRR direction in source space is U[:,0] (first left singular vector of B)
  const direction = U.map(row => row[0])
  return { Bk, direction, U, S, Vt }
}

/* ─── Multivariate R²: 1 - SS_res / SS_tot ─── */
function computeR2(X, Y, B) {
  const n = X.length, p = Y[0].length
  // Yhat = X B
  const Yhat = matMul(X, B)

  let ssRes = 0, ssTot = 0
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++) {
      ssRes += (Y[i][j] - Yhat[i][j]) ** 2
      ssTot += Y[i][j] ** 2 // Y is centered
    }
  return ssTot > 0 ? 1 - ssRes / ssTot : 0
}

/* ─── Project 6D data onto first 2 PCA components ─── */
function projectTo2D(X, pcaVecs) {
  const n = X.length
  const proj = zeros(n, 2)
  for (let i = 0; i < n; i++) {
    proj[i][0] = dotVec(X[i], pcaVecs[0])
    proj[i][1] = dotVec(X[i], pcaVecs[1])
  }
  return proj
}

/* ─── Project a 6D direction onto 2D PCA view ─── */
function projectDirection(dir, pcaVecs) {
  const p0 = dotVec(dir, pcaVecs[0])
  const p1 = dotVec(dir, pcaVecs[1])
  const n = Math.sqrt(p0 * p0 + p1 * p1)
  return n > 1e-12 ? [p0 / n, p1 / n] : [1, 0]
}

/* ─── Colormap: blue (low) to red (high) ─── */
function yToColor(t) {
  // t in [0, 1]
  const r0 = 0x3d, g0 = 0x6c, b0 = 0xb9
  const r1 = 0xc0, g1 = 0x50, b1 = 0x3a
  const r = Math.round(r0 + t * (r1 - r0))
  const g = Math.round(g0 + t * (g1 - g0))
  const b = Math.round(b0 + t * (b1 - b0))
  return `rgb(${r},${g},${b})`
}

/* ─── Component ─── */
export default function RRRExplorer() {
  const [rank, setRank] = useState(1)

  /* ─── Generate data once ─── */
  const { X, Y, pca, Bfull, r2Full, yColorT } = useMemo(() => {
    const { X, Y } = generateData()
    const pca = computePCA(X)
    const Bfull = computeOLS(X, Y)
    const r2Full = computeR2(X, Y, Bfull)

    // Color by first target dimension for a clear blue-to-red gradient
    const y1 = Y.map(row => row[0])
    const yMin = Math.min(...y1)
    const yMax = Math.max(...y1)
    const yColorT = y1.map(v => (v - yMin) / (yMax - yMin || 1))

    return { X, Y, pca, Bfull, r2Full, yColorT }
  }, [])

  /* ─── Rank-dependent computations ─── */
  const { rrr, r2Rank, proj2D, pcaDir2D, rrrDir2D } = useMemo(() => {
    const rrr = computeRRR(Bfull, rank)
    const r2Rank = computeR2(X, Y, rrr.Bk)

    // Project data to first 2 PCA dimensions for display
    const pcaVecs = [pca.vectors[0], pca.vectors[1]]
    const proj2D = projectTo2D(X, pcaVecs)

    // PCA direction in the 2D view is simply [1, 0] by construction
    const pcaDir2D = [1, 0]

    // RRR rank-1 direction projected into PCA view
    const rrrDir2D = projectDirection(rrr.direction, pcaVecs)

    return { rrr, r2Rank, proj2D, pcaDir2D, rrrDir2D }
  }, [rank, X, Y, pca, Bfull])

  /* ─── Scale projected points to SVG coords ─── */
  const scaledPoints = useMemo(() => {
    let maxAbs = 0
    for (const p of proj2D) {
      if (Math.abs(p[0]) > maxAbs) maxAbs = Math.abs(p[0])
      if (Math.abs(p[1]) > maxAbs) maxAbs = Math.abs(p[1])
    }
    if (maxAbs === 0) maxAbs = 1
    const s = (PLOT_R * 0.82) / maxAbs
    return proj2D.map(([x, y]) => [
      PLOT_CX + x * s,
      PLOT_CY - y * s,
    ])
  }, [proj2D])

  /* ─── Direction line endpoints ─── */
  const lineLen = PLOT_R * 0.9
  function dirLine(dir) {
    return {
      x1: PLOT_CX - dir[0] * lineLen,
      y1: PLOT_CY + dir[1] * lineLen,
      x2: PLOT_CX + dir[0] * lineLen,
      y2: PLOT_CY - dir[1] * lineLen,
    }
  }

  const pcaLine = dirLine(pcaDir2D)
  const rrrLine = dirLine(rrrDir2D)

  /* ─── Label positions ─── */
  const labelOffset = lineLen + 16
  const pcaLabel = {
    x: PLOT_CX + pcaDir2D[0] * labelOffset,
    y: PLOT_CY - pcaDir2D[1] * labelOffset,
  }
  const rrrLabel = {
    x: PLOT_CX + rrrDir2D[0] * labelOffset,
    y: PLOT_CY - rrrDir2D[1] * labelOffset,
  }

  /* ─── Angle between directions ─── */
  const pcaAngle = Math.atan2(pcaDir2D[1], pcaDir2D[0])
  const rrrAngle = Math.atan2(rrrDir2D[1], rrrDir2D[0])
  let angleDiff = rrrAngle - pcaAngle
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
  const displayAngle = Math.abs(angleDiff) * (180 / Math.PI)
  const displayAngleAdj = displayAngle > 90 ? 180 - displayAngle : displayAngle

  /* ─── Angle arc ─── */
  const arcR = 55
  const sweepFlag = angleDiff > 0 ? 0 : 1
  const arcX1 = PLOT_CX + Math.cos(pcaAngle) * arcR
  const arcY1 = PLOT_CY - Math.sin(pcaAngle) * arcR
  const arcX2 = PLOT_CX + Math.cos(rrrAngle) * arcR
  const arcY2 = PLOT_CY - Math.sin(rrrAngle) * arcR
  const arcPath = `M ${arcX1} ${arcY1} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcX2} ${arcY2}`
  const midAngle = pcaAngle + angleDiff / 2
  const arcLabelX = PLOT_CX + Math.cos(midAngle) * (arcR + 14)
  const arcLabelY = PLOT_CY - Math.sin(midAngle) * (arcR + 14)

  /* ─── R² ratio ─── */
  const retainPct = r2Full > 0 ? (r2Rank / r2Full) * 100 : 0
  const barW = 180

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* ── Plot title ── */}
        <text
          x={PLOT_CX}
          y={22}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 12,
            fill: "#333",
            fontWeight: 600,
          }}
        >
          6D neural activity projected onto first 2 PCs
        </text>

        {/* ── Plot background ── */}
        <circle
          cx={PLOT_CX}
          cy={PLOT_CY}
          r={PLOT_R}
          fill="#fafafa"
          stroke="#e0e0e0"
          strokeWidth={1}
        />

        {/* ── Crosshairs ── */}
        <line
          x1={PLOT_CX - PLOT_R}
          y1={PLOT_CY}
          x2={PLOT_CX + PLOT_R}
          y2={PLOT_CY}
          stroke="#e8e8e8"
          strokeWidth={0.5}
        />
        <line
          x1={PLOT_CX}
          y1={PLOT_CY - PLOT_R}
          x2={PLOT_CX}
          y2={PLOT_CY + PLOT_R}
          stroke="#e8e8e8"
          strokeWidth={0.5}
        />

        {/* ── Axis labels ── */}
        <text
          x={PLOT_CX + PLOT_R - 4}
          y={PLOT_CY + 14}
          textAnchor="end"
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: "rgba(0,0,0,0.3)",
          }}
        >
          PC1
        </text>
        <text
          x={PLOT_CX + 8}
          y={PLOT_CY - PLOT_R + 12}
          textAnchor="start"
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: "rgba(0,0,0,0.3)",
          }}
        >
          PC2
        </text>

        {/* ── PCA direction (dashed gray) ── */}
        <line
          x1={pcaLine.x1}
          y1={pcaLine.y1}
          x2={pcaLine.x2}
          y2={pcaLine.y2}
          stroke={PCA_STROKE}
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />

        {/* ── RRR direction (solid teal) ── */}
        <line
          x1={rrrLine.x1}
          y1={rrrLine.y1}
          x2={rrrLine.x2}
          y2={rrrLine.y2}
          stroke={TEAL}
          strokeWidth={2.5}
          style={{ transition: "all 0.2s ease" }}
        />

        {/* ── Angle arc ── */}
        {displayAngleAdj > 2 && (
          <g>
            <path
              d={arcPath}
              fill="none"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={1}
            />
            <text
              x={arcLabelX}
              y={arcLabelY}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fill: "rgba(0,0,0,0.35)",
              }}
            >
              {displayAngleAdj.toFixed(0)}{"\u00B0"}
            </text>
          </g>
        )}

        {/* ── Data points colored by target ── */}
        {scaledPoints.map(([sx, sy], i) => (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={3.5}
            fill={yToColor(yColorT[i])}
            fillOpacity={0.75}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={0.5}
          />
        ))}

        {/* ── Direction labels ── */}
        <text
          x={pcaLabel.x}
          y={pcaLabel.y}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fill: "rgba(0,0,0,0.35)",
          }}
        >
          max variance
        </text>
        <text
          x={rrrLabel.x}
          y={rrrLabel.y}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fill: TEAL,
            fontWeight: 600,
          }}
        >
          max prediction
        </text>

        {/* ── Right panel: metrics ── */}
        <text
          x={READOUT_X}
          y={READOUT_Y}
          style={{
            fontFamily: FONT,
            fontSize: 11,
            fill: "rgba(0,0,0,0.5)",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          Regression comparison
        </text>

        {/* Full-rank R² */}
        <text
          x={READOUT_X}
          y={READOUT_Y + 30}
          style={{ fontFamily: FONT, fontSize: 10, fill: "rgba(0,0,0,0.4)" }}
        >
          Full-rank R{"\u00B2"}
        </text>
        <text
          x={READOUT_X + barW}
          y={READOUT_Y + 30}
          textAnchor="end"
          style={{
            fontFamily: FONT,
            fontSize: 13,
            fill: "rgba(0,0,0,0.6)",
            fontWeight: 600,
          }}
        >
          {r2Full.toFixed(3)}
        </text>
        {/* bar bg */}
        <rect
          x={READOUT_X}
          y={READOUT_Y + 36}
          width={barW}
          height={4}
          rx={2}
          fill="rgba(0,0,0,0.06)"
        />
        <rect
          x={READOUT_X}
          y={READOUT_Y + 36}
          width={Math.max(0, r2Full * barW)}
          height={4}
          rx={2}
          fill="rgba(0,0,0,0.15)"
        />

        {/* Rank-k R² */}
        <text
          x={READOUT_X}
          y={READOUT_Y + 64}
          style={{ fontFamily: FONT, fontSize: 10, fill: TEAL }}
        >
          Rank-{rank} R{"\u00B2"}
        </text>
        <text
          x={READOUT_X + barW}
          y={READOUT_Y + 64}
          textAnchor="end"
          style={{
            fontFamily: FONT,
            fontSize: 13,
            fill: TEAL,
            fontWeight: 700,
          }}
        >
          {r2Rank.toFixed(3)}
        </text>
        <rect
          x={READOUT_X}
          y={READOUT_Y + 70}
          width={barW}
          height={4}
          rx={2}
          fill="rgba(74,124,111,0.1)"
        />
        <rect
          x={READOUT_X}
          y={READOUT_Y + 70}
          width={Math.max(0, r2Rank * barW)}
          height={4}
          rx={2}
          fill={TEAL}
          style={{ transition: "width 0.2s ease" }}
        />

        {/* Retains % */}
        <text
          x={READOUT_X}
          y={READOUT_Y + 98}
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: "rgba(0,0,0,0.3)",
          }}
        >
          {rank >= D
            ? "rank 6 = full rank (6D input)"
            : `retains ${retainPct.toFixed(0)}% of full R\u00B2`}
        </text>

        {/* ── Key insight text ── */}
        <text
          x={READOUT_X}
          y={READOUT_Y + 140}
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fill: "rgba(0,0,0,0.45)",
            fontWeight: 600,
          }}
        >
          Key insight
        </text>
        <text
          x={READOUT_X}
          y={READOUT_Y + 158}
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: "rgba(0,0,0,0.35)",
          }}
        >
          The dashed line marks
        </text>
        <text
          x={READOUT_X}
          y={READOUT_Y + 172}
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: "rgba(0,0,0,0.35)",
          }}
        >
          maximum variance in X (PCA).
        </text>
        <text
          x={READOUT_X}
          y={READOUT_Y + 192}
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: TEAL,
          }}
        >
          The teal line marks the
        </text>
        <text
          x={READOUT_X}
          y={READOUT_Y + 206}
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: TEAL,
          }}
        >
          direction that best predicts Y.
        </text>
        <text
          x={READOUT_X}
          y={READOUT_Y + 224}
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: TEAL,
            fontWeight: 600,
          }}
        >
          In 6D these diverge{"\u2014"}most
        </text>
        <text
          x={READOUT_X}
          y={READOUT_Y + 238}
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: TEAL,
            fontWeight: 600,
          }}
        >
          variance doesn{"'"}t predict.
        </text>

        {/* ── Singular value spectrum ── */}
        <text
          x={READOUT_X}
          y={READOUT_Y + 272}
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fill: "rgba(0,0,0,0.45)",
            fontWeight: 600,
          }}
        >
          Singular values of B
        </text>
        {rrr.S.slice(0, Math.min(DY, D)).map((s, i) => {
          const maxS = Math.max(...rrr.S.slice(0, DY))
          const bw = maxS > 0 ? (s / maxS) * (barW * 0.6) : 0
          const yPos = READOUT_Y + 290 + i * 18
          return (
            <g key={i}>
              <text
                x={READOUT_X}
                y={yPos}
                style={{
                  fontFamily: FONT,
                  fontSize: 9,
                  fill: i < rank ? TEAL : "rgba(0,0,0,0.2)",
                }}
              >
                {"\u03C3"}{i + 1}
              </text>
              <rect
                x={READOUT_X + 22}
                y={yPos - 7}
                width={barW * 0.6}
                height={8}
                rx={2}
                fill="rgba(0,0,0,0.04)"
              />
              <rect
                x={READOUT_X + 22}
                y={yPos - 7}
                width={bw}
                height={8}
                rx={2}
                fill={i < rank ? TEAL : "rgba(0,0,0,0.1)"}
                style={{ transition: "fill 0.2s ease" }}
              />
              <text
                x={READOUT_X + 22 + barW * 0.6 + 6}
                y={yPos}
                style={{
                  fontFamily: FONT,
                  fontSize: 8,
                  fill: i < rank ? TEAL : "rgba(0,0,0,0.2)",
                }}
              >
                {s.toFixed(2)}
              </text>
            </g>
          )
        })}

        {/* ── Color legend ── */}
        <defs>
          <linearGradient id="rrr-y-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BLUE_LO} />
            <stop offset="100%" stopColor={RED_HI} />
          </linearGradient>
        </defs>
        <rect
          x={READOUT_X}
          y={H - 50}
          width={120}
          height={8}
          rx={4}
          fill="url(#rrr-y-gradient)"
        />
        <text
          x={READOUT_X}
          y={H - 56}
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: "rgba(0,0,0,0.4)",
          }}
        >
          target Y
        </text>
        <text
          x={READOUT_X}
          y={H - 34}
          style={{
            fontFamily: FONT,
            fontSize: 8,
            fill: "rgba(0,0,0,0.3)",
          }}
        >
          low
        </text>
        <text
          x={READOUT_X + 120}
          y={H - 34}
          textAnchor="end"
          style={{
            fontFamily: FONT,
            fontSize: 8,
            fill: "rgba(0,0,0,0.3)",
          }}
        >
          high
        </text>
      </svg>

      {/* ── Slider control ── */}
      <div className="blog-figure__controls">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: FONT,
            fontSize: 12,
            color: "#666",
          }}
        >
          Rank constraint k ={" "}
          <strong style={{ color: TEAL, minWidth: 12 }}>{rank}</strong>
          <input
            type="range"
            min={1}
            max={D}
            step={1}
            value={rank}
            onChange={e => setRank(Number(e.target.value))}
            className="dim-explorer__range"
            style={{ width: 160 }}
          />
          <span style={{ color: "rgba(0,0,0,0.3)", fontSize: 10 }}>
            {rank === 1
              ? "(rank-1 constrained)"
              : rank >= D
                ? "(full rank)"
                : `(rank-${rank} constrained)`}
          </span>
        </label>
      </div>
    </div>
  )
}
