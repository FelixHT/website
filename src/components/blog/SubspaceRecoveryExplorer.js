import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 600
const H = 300
const PANEL_W = 270
const PANEL_H = 260
const PAD_X = 15   // left edge of first panel
const PAD_Y = 20   // top edge of panels
const GAP = 30     // gap between panels
const P2_X = PAD_X + PANEL_W + GAP  // left edge of second panel

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const BLUE = "#3d6cb9"
const FONT = "var(--font-mono, monospace)"
const AXIS_COLOR = "rgba(0,0,0,0.15)"
const BG_COLOR = "rgba(0,0,0,0.03)"

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

/* ─── Box-Muller normal samples ─── */
function randn(rng) {
  const u1 = rng()
  const u2 = rng()
  const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12)))
  const theta = 2 * Math.PI * u2
  return [r * Math.cos(theta), r * Math.sin(theta)]
}

/* ─── Matrix helpers (dense, row-major arrays of arrays) ─── */
function matVec(M, v) {
  // M: rows×cols, v: cols
  return M.map(row => row.reduce((s, a, j) => s + a * v[j], 0))
}

function matTmat(A) {
  // returns A^T A, A is rows×cols
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

/* ─── Power iteration to find top-k eigenvectors of a symmetric matrix ─── */
function topKEigenvectors(M, k, rng) {
  const n = M.length
  const vecs = []

  for (let ei = 0; ei < k; ei++) {
    // Random start
    let v = Array.from({ length: n }, () => rng() - 0.5)
    v = normalize(v)

    // Deflate against already-found eigenvectors
    for (let iter = 0; iter < 200; iter++) {
      let w = matVec(M, v)
      // Deflate
      for (const prev of vecs) {
        const proj = dot(w, prev)
        w = vecSub(w, vecScale(prev, proj))
      }
      const wNorm = norm(w)
      if (wNorm < 1e-14) break
      v = vecScale(w, 1 / wNorm)
    }

    // One final deflation pass
    for (const prev of vecs) {
      const proj = dot(v, prev)
      v = vecSub(v, vecScale(prev, proj))
    }
    v = normalize(v)
    vecs.push(v)
  }

  return vecs // array of k eigenvectors (each length-n array)
}

/* ─── Generate all simulation data (seeded, deterministic) ─── */
function generateData() {
  const rng = mulberry32(2026)

  const T = 100
  // True 2D latent system: A = [[0.98, -0.2], [0.2, 0.98]]
  const A = [[0.98, -0.2], [0.2, 0.98]]
  // Generate true latent trajectory
  const xTrue = [[1, 0]]
  for (let t = 1; t < T; t++) {
    const prev = xTrue[t - 1]
    xTrue.push(matVec(A, prev))
  }

  // Observation matrix C: 6×2 random
  const C = Array.from({ length: 6 }, () => {
    const [a, b] = randn(rng)
    return [a, b]
  })

  // Noise std = 0.15
  const NOISE_STD = 0.15

  // Observations Y: T×6
  const Y = xTrue.map(x => {
    const cx = matVec(C, x)
    return cx.map(v => {
      const [n1] = randn(rng)
      return v + n1 * NOISE_STD
    })
  })

  // Center Y column-wise
  const means = Array(6).fill(0)
  for (let j = 0; j < 6; j++) {
    for (let t = 0; t < T; t++) means[j] += Y[t][j]
    means[j] /= T
  }
  const Yc = Y.map(row => row.map((v, j) => v - means[j]))

  // Compute Y^T Y (6×6 covariance matrix)
  const YtY = matTmat(Yc)

  return { xTrue, Yc, YtY, T }
}

const SIM = generateData()

/* ─── Procrustes: find scale+rotation R (2×2) minimizing ||X_true - X_rec R||_F
       X_true: T×2, X_rec: T×2
       Returns recovered trajectory after aligning to true ─── */
function procrustesAlign(xTrue2, xRec2) {
  const T = xTrue2.length
  // Compute cross-covariance M = X_rec^T X_true (2×2)
  const M = [[0, 0], [0, 0]]
  for (let t = 0; t < T; t++) {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        M[i][j] += xRec2[t][i] * xTrue2[t][j]
      }
    }
  }
  // SVD of 2×2 matrix M = U S V^T (analytic)
  // Use the standard formula for 2×2 SVD via the symmetric eigendecomposition trick
  // M^T M = V S^2 V^T
  const MtM = [
    [M[0][0] * M[0][0] + M[1][0] * M[1][0], M[0][0] * M[0][1] + M[1][0] * M[1][1]],
    [M[0][1] * M[0][0] + M[1][1] * M[1][0], M[0][1] * M[0][1] + M[1][1] * M[1][1]],
  ]
  // Eigendecomposition of 2×2 symmetric MtM
  const tr = MtM[0][0] + MtM[1][1]
  const det = MtM[0][0] * MtM[1][1] - MtM[0][1] * MtM[1][0]
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det))
  const lam1 = tr / 2 + disc
  const lam2 = tr / 2 - disc
  const s1 = Math.sqrt(Math.max(0, lam1))
  const s2 = Math.sqrt(Math.max(0, lam2))

  // V eigenvectors of MtM
  let v1, v2
  if (Math.abs(MtM[0][1]) > 1e-12) {
    v1 = normalize([lam1 - MtM[1][1], MtM[0][1]])
    v2 = [-v1[1], v1[0]]
  } else {
    v1 = MtM[0][0] >= MtM[1][1] ? [1, 0] : [0, 1]
    v2 = [-v1[1], v1[0]]
  }

  // U = M V S^{-1}
  const u1 = s1 > 1e-12
    ? normalize([M[0][0] * v1[0] + M[0][1] * v1[1], M[1][0] * v1[0] + M[1][1] * v1[1]])
    : [1, 0]
  const u2 = s2 > 1e-12
    ? normalize([M[0][0] * v2[0] + M[0][1] * v2[1], M[1][0] * v2[0] + M[1][1] * v2[1]])
    : [-u1[1], u1[0]]

  // Orthogonal R = U V^T  (best rotation, no reflection)
  // R = U V^T where det check ensures rotation not reflection
  // R[i][j] = sum_k U[i][k] V[j][k]
  const R = [
    [u1[0] * v1[0] + u2[0] * v2[0], u1[0] * v1[1] + u2[0] * v2[1]],
    [u1[1] * v1[0] + u2[1] * v2[0], u1[1] * v1[1] + u2[1] * v2[1]],
  ]

  // Apply R: aligned[t] = xRec2[t] @ R
  return xRec2.map(r => [
    r[0] * R[0][0] + r[1] * R[1][0],
    r[0] * R[0][1] + r[1] * R[1][1],
  ])
}

/* ─── Recover latent states via PCA on Y for a given number of dimensions ─── */
function recoverStates(d) {
  const { Yc, YtY, T, xTrue } = SIM

  // Use a fixed RNG for power iteration (separate from data generation)
  const iterRng = mulberry32(999)
  const eigvecs = topKEigenvectors(YtY, d, iterRng)
  // eigvecs: d eigenvectors each of length 6

  // Project each observation: score[t] = [dot(Yc[t], eigvecs[0]), ..., dot(Yc[t], eigvecs[d-1])]
  const scores = Yc.map(row =>
    eigvecs.map(ev => dot(row, ev))
  )

  // Take first 2 components for the 2D plot
  const scores2D = scores.map(s => [s[0] ?? 0, s[1] ?? 0])

  // Align to true latent via Procrustes
  const aligned = procrustesAlign(xTrue, scores2D)

  return aligned
}

/* ─── Time color: blue (t=0) → red (t=T-1) ─── */
function timeColor(t, T) {
  const frac = t / (T - 1)
  // Interpolate from #4A7C6F (teal) to #c0503a (warm red) via light middle
  const r = Math.round(74 + (192 - 74) * frac)
  const g = Math.round(124 + (80 - 124) * frac)
  const b = Math.round(111 + (58 - 111) * frac)
  return `rgb(${r},${g},${b})`
}

/* ─── Compute axis bounds for a set of 2D points ─── */
function computeBounds(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of pts) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  // Add 15% padding
  const padX = Math.max((maxX - minX) * 0.15, 0.05)
  const padY = Math.max((maxY - minY) * 0.15, 0.05)
  return {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
  }
}

/* ─── Map data coords → SVG coords within a panel ─── */
function makeMapper(bounds, panelLeft, panelTop, panelW, panelH) {
  return function (x, y) {
    const sx = panelLeft + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * panelW
    const sy = panelTop + panelH - ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * panelH
    return [sx, sy]
  }
}

/* ─── Build polyline path string ─── */
function polylinePath(pts, toSVG) {
  return pts.map(([x, y], i) => {
    const [sx, sy] = toSVG(x, y)
    return `${i === 0 ? "M" : "L"}${sx.toFixed(2)},${sy.toFixed(2)}`
  }).join(" ")
}

/* ─── Panel component ─── */
function TrajectoryPanel({ pts, color, label, panelLeft, panelTop }) {
  const bounds = useMemo(() => computeBounds(pts), [pts])
  const toSVG = useMemo(
    () => makeMapper(bounds, panelLeft, panelTop, PANEL_W, PANEL_H),
    [bounds, panelLeft, panelTop]
  )
  const T = pts.length
  const pathD = polylinePath(pts, toSVG)

  // Zero-crossing axes (clamped to data range so axes stay inside the panel)
  const xZero = Math.max(bounds.minX, Math.min(bounds.maxX, 0))
  const yZero = Math.max(bounds.minY, Math.min(bounds.maxY, 0))
  const [axZeroX] = toSVG(xZero, bounds.minY)
  const [, axZeroY] = toSVG(bounds.minX, yZero)

  return (
    <g>
      {/* Panel background */}
      <rect
        x={panelLeft}
        y={panelTop}
        width={PANEL_W}
        height={PANEL_H}
        rx={4}
        fill={BG_COLOR}
      />

      {/* Axis lines */}
      <line
        x1={axZeroX} y1={panelTop}
        x2={axZeroX} y2={panelTop + PANEL_H}
        stroke={AXIS_COLOR}
        strokeWidth={1}
      />
      <line
        x1={panelLeft} y1={axZeroY}
        x2={panelLeft + PANEL_W} y2={axZeroY}
        stroke={AXIS_COLOR}
        strokeWidth={1}
      />

      {/* Axis labels */}
      <text
        x={panelLeft + PANEL_W - 4}
        y={axZeroY + 12}
        textAnchor="end"
        fill={AXIS_COLOR}
        fontFamily={FONT}
        fontSize={9}
      >
        x₁
      </text>
      <text
        x={axZeroX + 4}
        y={panelTop + 11}
        textAnchor="start"
        fill={AXIS_COLOR}
        fontFamily={FONT}
        fontSize={9}
      >
        x₂
      </text>

      {/* Trajectory line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeOpacity={0.35}
      />

      {/* Trajectory dots */}
      {pts.map(([x, y], i) => {
        const [sx, sy] = toSVG(x, y)
        return (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={2.2}
            fill={timeColor(i, T)}
            fillOpacity={0.85}
          />
        )
      })}

      {/* Panel label */}
      <text
        x={panelLeft + PANEL_W / 2}
        y={panelTop + PANEL_H + 16}
        textAnchor="middle"
        fill={color}
        fontFamily={FONT}
        fontSize={10}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  )
}

/* ─── Main component ─── */
export default function SubspaceRecoveryExplorer() {
  const [d, setD] = useState(2)

  const { xTrue } = SIM

  const recovered = useMemo(() => recoverStates(d), [d])

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", display: "block", overflow: "visible" }}
      >
        {/* True latent panel */}
        <TrajectoryPanel
          pts={xTrue}
          color={TEAL}
          label="true latent"
          panelLeft={PAD_X}
          panelTop={PAD_Y}
        />

        {/* Recovered panel */}
        <TrajectoryPanel
          pts={recovered}
          color={BLUE}
          label={`recovered (d = ${d})`}
          panelLeft={P2_X}
          panelTop={PAD_Y}
        />
      </svg>

      {/* Toggle */}
      <div className="blog-figure__controls" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 8 }}>
        {[1, 2].map(val => (
          <button
            key={val}
            onClick={() => setD(val)}
            style={{
              fontFamily: FONT,
              fontSize: 12,
              padding: "4px 14px",
              background: d === val ? BLUE : "white",
              color: d === val ? "white" : "#333",
              border: `1.5px solid ${d === val ? BLUE : "#ccc"}`,
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            d = {val}
          </button>
        ))}
      </div>
    </div>
  )
}
