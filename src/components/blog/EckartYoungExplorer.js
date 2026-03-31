import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 800
const H = 450
const ROWS = 10
const COLS = 8
const CELL = 22
const CELL_GAP = 1
const HEATMAP_W = COLS * (CELL + CELL_GAP) - CELL_GAP
const HEATMAP_H = ROWS * (CELL + CELL_GAP) - CELL_GAP
const HEATMAP_Y = 34
const HEATMAP_SPACING = 28
const TOTAL_HEATMAPS_W = 3 * HEATMAP_W + 2 * HEATMAP_SPACING
const HEATMAP_X0 = (W - TOTAL_HEATMAPS_W) / 2

/* ─── Bar chart layout ─── */
const BAR_AREA_TOP = HEATMAP_Y + HEATMAP_H + 36
const BAR_AREA_H = 100
const BAR_BASELINE = BAR_AREA_TOP + BAR_AREA_H - 16
const BAR_MAX_H = BAR_AREA_H - 34
const BAR_COUNT = COLS
const BAR_CHART_W = 360
const BAR_CHART_LEFT = (W - BAR_CHART_W) / 2
const BAR_W = BAR_CHART_W / BAR_COUNT - 6

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const FADED = "rgba(0,0,0,0.1)"
const FONT = "var(--font-mono, monospace)"

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

/* ─── Generate deterministic matrix with rank ~3 structure ─── */
function generateMatrix() {
  const rng = mulberry32(42)
  const rand = () => rng() * 2 - 1

  // Latent factors: 10×3
  const L = Array.from({ length: ROWS }, () =>
    Array.from({ length: 3 }, () => rand() * 2)
  )

  // Weights: 3×8
  const Wt = Array.from({ length: 3 }, () =>
    Array.from({ length: COLS }, () => rand() * 2)
  )

  // A = L * Wt + noise
  const A = Array.from({ length: ROWS }, (_, i) =>
    Array.from({ length: COLS }, (_, j) => {
      let val = 0
      for (let r = 0; r < 3; r++) val += L[i][r] * Wt[r][j]
      val += rand() * 0.3
      return val
    })
  )

  return A
}

/* ─── Full SVD via eigendecomposition of A^T A ─── */
// For a 10×8 matrix, we compute the thin SVD: A = U * diag(S) * V^T
// U: 10×8, S: length-8, V: 8×8

function computeFullSVD(A) {
  const m = A.length
  const n = A[0].length

  // Compute A^T A (n×n)
  const AtA = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let sum = 0
      for (let k = 0; k < m; k++) sum += A[k][i] * A[k][j]
      return sum
    })
  )

  // Eigendecomposition of A^T A using Jacobi iteration
  // Returns eigenvalues (descending) and eigenvectors as columns
  const { eigenvalues, eigenvectors } = jacobiEigen(AtA, n)

  // Singular values
  const S = eigenvalues.map(ev => Math.sqrt(Math.max(ev, 0)))

  // V matrix: eigenvectors of A^T A (n×n, columns are right singular vectors)
  const V = eigenvectors

  // U matrix: u_i = A * v_i / sigma_i
  const U = Array.from({ length: m }, () => Array(n).fill(0))
  for (let j = 0; j < n; j++) {
    if (S[j] > 1e-10) {
      for (let i = 0; i < m; i++) {
        let sum = 0
        for (let k = 0; k < n; k++) sum += A[i][k] * V[k][j]
        U[i][j] = sum / S[j]
      }
    }
  }

  return { U, S, V }
}

/* ─── Jacobi eigendecomposition for symmetric matrix ─── */
function jacobiEigen(M, n) {
  // Clone M
  const A = M.map(row => [...row])

  // Initialize eigenvector matrix as identity
  const V = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  )

  const maxIter = 200
  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0
    let p = 0
    let q = 1
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) > maxVal) {
          maxVal = Math.abs(A[i][j])
          p = i
          q = j
        }
      }
    }

    if (maxVal < 1e-12) break

    // Compute rotation angle
    const theta =
      Math.abs(A[p][p] - A[q][q]) < 1e-14
        ? Math.PI / 4
        : 0.5 * Math.atan2(2 * A[p][q], A[p][p] - A[q][q])
    const c = Math.cos(theta)
    const s = Math.sin(theta)

    // Apply Givens rotation to A
    for (let i = 0; i < n; i++) {
      const aip = A[i][p]
      const aiq = A[i][q]
      A[i][p] = c * aip + s * aiq
      A[i][q] = -s * aip + c * aiq
    }
    for (let j = 0; j < n; j++) {
      const apj = A[p][j]
      const aqj = A[q][j]
      A[p][j] = c * apj + s * aqj
      A[q][j] = -s * apj + c * aqj
    }

    // Update eigenvectors
    for (let i = 0; i < n; i++) {
      const vip = V[i][p]
      const viq = V[i][q]
      V[i][p] = c * vip + s * viq
      V[i][q] = -s * vip + c * viq
    }
  }

  // Extract eigenvalues and sort descending
  const eigenvalues = Array.from({ length: n }, (_, i) => A[i][i])
  const indices = eigenvalues
    .map((val, idx) => ({ val, idx }))
    .sort((a, b) => b.val - a.val)
    .map(x => x.idx)

  const sortedEigenvalues = indices.map(i => eigenvalues[i])
  const sortedVectors = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => V[r][indices[c]])
  )

  return { eigenvalues: sortedEigenvalues, eigenvectors: sortedVectors }
}

/* ─── Reconstruct rank-k approximation from SVD ─── */
function reconstructRankK(U, S, V, k, m, n) {
  const Ak = Array.from({ length: m }, () => Array(n).fill(0))
  for (let r = 0; r < k; r++) {
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        Ak[i][j] += U[i][r] * S[r] * V[j][r]
      }
    }
  }
  return Ak
}

/* ─── Diverging colormap: blue - white - red ─── */
function valueToColor(val, absMax) {
  const t = Math.max(-1, Math.min(1, val / absMax))
  if (t < 0) {
    // Blue for negative
    const a = -t
    const r = Math.round(255 - a * (255 - 59))
    const g = Math.round(255 - a * (255 - 130))
    const b = Math.round(255 - a * (255 - 189))
    return `rgb(${r},${g},${b})`
  }
  // Red/orange for positive
  const r = Math.round(255 - t * (255 - 199))
  const g = Math.round(255 - t * (255 - 70))
  const b = Math.round(255 - t * (255 - 52))
  return `rgb(${r},${g},${b})`
}

/* ─── Compute Frobenius norm ─── */
function frobeniusNorm(M) {
  let sum = 0
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M[0].length; j++) {
      sum += M[i][j] * M[i][j]
    }
  }
  return Math.sqrt(sum)
}

/* ─── Component ─── */
export default function EckartYoungExplorer() {
  const [k, setK] = useState(3)

  /* ─── Precompute matrix and SVD once ─── */
  const { A, svd, absMax } = useMemo(() => {
    const matrix = generateMatrix()
    const decomposition = computeFullSVD(matrix)

    // Find absolute max for consistent colormap
    let mx = 0
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        mx = Math.max(mx, Math.abs(matrix[i][j]))
      }
    }

    return { A: matrix, svd: decomposition, absMax: mx }
  }, [])

  /* ─── Rank-k approximation and residual ─── */
  const { Ak, residual, errorPct } = useMemo(() => {
    const approx = reconstructRankK(svd.U, svd.S, svd.V, k, ROWS, COLS)
    const resid = A.map((row, i) => row.map((val, j) => val - approx[i][j]))
    const normA = frobeniusNorm(A)
    const normR = frobeniusNorm(resid)
    const pct = normA > 0 ? (normR / normA) * 100 : 0
    return { Ak: approx, residual: resid, errorPct: pct }
  }, [A, svd, k])

  /* ─── Singular value bar scale ─── */
  const maxSigma = svd.S[0]
  const barScale = maxSigma > 0 ? (BAR_MAX_H - 10) / maxSigma : 1

  /* ─── Heatmap renderer ─── */
  function renderHeatmap(matrix, xOffset, label) {
    const cells = []
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        const x = xOffset + j * (CELL + CELL_GAP)
        const y = HEATMAP_Y + i * (CELL + CELL_GAP)
        cells.push(
          <rect
            key={`${i}-${j}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            fill={valueToColor(matrix[i][j], absMax)}
            stroke="rgba(0,0,0,0.1)"
            strokeWidth={0.5}
            rx={2}
          />
        )
      }
    }

    return (
      <g>
        {/* Label */}
        <text
          x={xOffset + HEATMAP_W / 2}
          y={HEATMAP_Y - 12}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 11,
            fill: "rgba(0,0,0,0.5)",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </text>
        {cells}
      </g>
    )
  }

  /* ─── Heatmap x-offsets ─── */
  const x1 = HEATMAP_X0
  const x2 = HEATMAP_X0 + HEATMAP_W + HEATMAP_SPACING
  const x3 = HEATMAP_X0 + 2 * (HEATMAP_W + HEATMAP_SPACING)

  /* ─── Equation symbols between heatmaps ─── */
  const eqY = HEATMAP_Y + HEATMAP_H / 2 + 4

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Three heatmaps */}
        {renderHeatmap(A, x1, "Original")}
        {renderHeatmap(Ak, x2, `Rank-${k}`)}
        {renderHeatmap(residual, x3, "Residual")}

        {/* Equals and minus signs between heatmaps */}
        <text
          x={x2 - HEATMAP_SPACING / 2}
          y={eqY}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 16,
            fill: "rgba(0,0,0,0.25)",
            fontWeight: 700,
          }}
        >
          =
        </text>
        <text
          x={x3 - HEATMAP_SPACING / 2}
          y={eqY}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 16,
            fill: "rgba(0,0,0,0.25)",
            fontWeight: 700,
          }}
        >
          +
        </text>

        {/* Bar chart: singular values */}
        <text
          x={BAR_CHART_LEFT}
          y={BAR_AREA_TOP + 4}
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fill: "rgba(0,0,0,0.35)",
            letterSpacing: "0.02em",
          }}
        >
          singular values
        </text>

        {svd.S.map((s, i) => {
          const barH = s * barScale
          const x = BAR_CHART_LEFT + i * (BAR_W + 6)
          const y = BAR_BASELINE - barH
          const kept = i < k

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                fill={kept ? TEAL : FADED}
                rx={2}
                style={{ transition: "fill 0.15s ease" }}
              />

              {/* Value label */}
              <text
                x={x + BAR_W / 2}
                y={y - 4}
                textAnchor="middle"
                style={{
                  fontFamily: FONT,
                  fontSize: 9,
                  fill: kept ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.2)",
                  transition: "fill 0.15s ease",
                }}
              >
                {s.toFixed(1)}
              </text>

              {/* Index label */}
              <text
                x={x + BAR_W / 2}
                y={BAR_BASELINE + 12}
                textAnchor="middle"
                style={{
                  fontFamily: FONT,
                  fontSize: 9,
                  fill: kept ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.2)",
                  transition: "fill 0.15s ease",
                }}
              >
                {"\u03C3"}{String.fromCharCode(0x2081 + i)}
              </text>
            </g>
          )
        })}

        {/* Cut line between kept and discarded */}
        {k < BAR_COUNT && (
          <line
            x1={BAR_CHART_LEFT + k * (BAR_W + 6) - 3}
            y1={BAR_AREA_TOP + 10}
            x2={BAR_CHART_LEFT + k * (BAR_W + 6) - 3}
            y2={BAR_BASELINE + 16}
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Error readout */}
        <text
          x={W - HEATMAP_X0}
          y={BAR_AREA_TOP + BAR_AREA_H / 2}
          textAnchor="end"
          style={{
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 700,
            fill: errorPct < 15 ? TEAL : "rgba(0,0,0,0.5)",
            transition: "fill 0.15s ease",
          }}
        >
          {errorPct.toFixed(1)}% error
        </text>
        <text
          x={W - HEATMAP_X0}
          y={BAR_AREA_TOP + BAR_AREA_H / 2 + 16}
          textAnchor="end"
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fill: "rgba(0,0,0,0.3)",
          }}
        >
          {"\u2016"}A {"\u2212"} A{"\u2096"}{"\u2016"}{"\u2082"} / {"\u2016"}A{"\u2016"}{"\u2082"}
        </text>
      </svg>

      {/* Slider control */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 4,
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Rank k ={" "}
          <strong style={{ color: TEAL, minWidth: 12 }}>{k}</strong>
          <input
            type="range"
            min={1}
            max={COLS}
            step={1}
            value={k}
            onChange={e => setK(Number(e.target.value))}
            className="dim-explorer__range"
            style={{ width: 200 }}
          />
        </label>
      </div>
    </div>
  )
}
