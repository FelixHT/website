import React, { useState, useMemo } from "react"

/* ────────────────────────────────────────────
   Seeded PRNG (mulberry32)
   ──────────────────────────────────────────── */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ────────────────────────────────────────────
   Box-Muller normal samples
   ──────────────────────────────────────────── */
function boxMuller(rng) {
  const u1 = rng()
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
}

/* ────────────────────────────────────────────
   Layout constants
   ──────────────────────────────────────────── */
const W = 750
const H = 400
const FONT = "var(--font-mono, monospace)"

const V1_BLUE = "#3d6cb9"
const V2_RED = "#c0503a"
const V2_PRED = "#4A7C6F"
const TEAL = "#4A7C6F"
const GRAY_BAR = "rgba(0,0,0,0.12)"
const GRAY_TEXT = "rgba(0,0,0,0.4)"

const N = 40
const MAX_RANK = 4

// Scatter panel geometry
const SCATTER_R = 95
const V1_CX = 130
const V1_CY = 140
const V2_CX = 620
const V2_CY = 140

// Bar chart geometry
const BAR_AREA_TOP = 290
const BAR_W = 60
const BAR_GAP = 16
const BAR_MAX_H = 70
const CHART_W = MAX_RANK * BAR_W + (MAX_RANK - 1) * BAR_GAP
const BAR_LEFT = (W - CHART_W) / 2
const BAR_BASELINE = BAR_AREA_TOP + BAR_MAX_H + 8

// Arrow bridge region
const ARROW_X_START = V1_CX + SCATTER_R + 18
const ARROW_X_END = V2_CX - SCATTER_R - 18

/* ────────────────────────────────────────────
   Data generation
   ──────────────────────────────────────────── */

// Generate a full-dimensional V1 dataset (N x d_latent),
// a low-rank linear mapping from V1 to V2 with added noise,
// then project both down to 2D via PCA for visualization.
// The mapping is designed so rank-1 captures ~80% and rank-2 ~95%.

function generateDatasets() {
  const rng = mulberry32(2024)
  const dLatent = 6 // latent dimensionality for generation

  // Generate V1 in dLatent dimensions
  const V1raw = []
  for (let i = 0; i < N; i++) {
    const row = []
    for (let j = 0; j < dLatent; j++) {
      row.push(boxMuller(rng))
    }
    V1raw.push(row)
  }

  // Communication subspace: rank-4 mapping with decaying singular values
  // sigma_1 >> sigma_2 > sigma_3 > sigma_4 so rank-1 dominates
  const sigmas = [4.0, 1.4, 0.6, 0.3]

  // Random orthogonal directions for sender (V1) and receiver (V2)
  // Use fixed vectors derived from seeded rng for reproducibility
  const senderDirs = []
  const receiverDirs = []
  for (let r = 0; r < MAX_RANK; r++) {
    const s = []
    const rec = []
    for (let j = 0; j < dLatent; j++) {
      s.push(boxMuller(rng))
      rec.push(boxMuller(rng))
    }
    senderDirs.push(s)
    receiverDirs.push(rec)
  }

  // Gram-Schmidt on sender directions
  gramSchmidt(senderDirs)
  gramSchmidt(receiverDirs)

  // Build V2 = sum_r sigma_r * (V1 . sender_r) * receiver_r + noise
  const V2raw = []
  for (let i = 0; i < N; i++) {
    const row = new Array(dLatent).fill(0)
    for (let r = 0; r < MAX_RANK; r++) {
      let dot = 0
      for (let j = 0; j < dLatent; j++) {
        dot += V1raw[i][j] * senderDirs[r][j]
      }
      for (let j = 0; j < dLatent; j++) {
        row[j] += sigmas[r] * dot * receiverDirs[r][j]
      }
    }
    // Add noise
    for (let j = 0; j < dLatent; j++) {
      row[j] += boxMuller(rng) * 0.5
    }
    V2raw.push(row)
  }

  // PCA project V1 and V2 each to 2D for visualization
  const V1_2d = pcaProject2D(V1raw)
  const V2_2d = pcaProject2D(V2raw)

  // For the RRR predictions at each rank, we work in the full dLatent space.
  // Rank-k prediction: project V1 onto first k sender directions, map through,
  // then PCA-project V2 prediction to the same 2D space as actual V2.
  const V2mean = colMeans(V2raw)
  const V2centered = V2raw.map(row => row.map((v, j) => v - V2mean[j]))
  const { basis: v2Basis } = pcaBasis2(V2centered)

  // For each rank, compute predicted V2 in 2D
  const predByRank = []
  const r2ByRank = []

  for (let rank = 1; rank <= MAX_RANK; rank++) {
    // Predicted V2 in full space using first `rank` components
    const V2pred = []
    for (let i = 0; i < N; i++) {
      const row = new Array(dLatent).fill(0)
      for (let r = 0; r < rank; r++) {
        let dot = 0
        for (let j = 0; j < dLatent; j++) {
          dot += V1raw[i][j] * senderDirs[r][j]
        }
        for (let j = 0; j < dLatent; j++) {
          row[j] += sigmas[r] * dot * receiverDirs[r][j]
        }
      }
      V2pred.push(row)
    }

    // Project into same 2D PCA space as V2
    const V2pred2d = projectWithBasis(V2pred, V2mean, v2Basis)
    predByRank.push(V2pred2d)

    // Compute R^2 in full space
    let ssTot = 0
    let ssRes = 0
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < dLatent; j++) {
        const actual = V2raw[i][j]
        const pred = V2pred[i][j]
        const mean = V2mean[j]
        ssTot += (actual - mean) * (actual - mean)
        ssRes += (actual - pred) * (actual - pred)
      }
    }
    r2ByRank.push(Math.max(0, 1 - ssRes / ssTot))
  }

  // Communication subspace directions in 2D (for arrows)
  // Project sender directions into V1 2D space, receiver into V2 2D space
  const V1mean = colMeans(V1raw)
  const V1centered = V1raw.map(row => row.map((v, j) => v - V1mean[j]))
  const { basis: v1Basis } = pcaBasis2(V1centered)

  const senderDirs2d = senderDirs.map(dir => {
    const x = dot(dir, v1Basis[0])
    const y = dot(dir, v1Basis[1])
    const len = Math.hypot(x, y) || 1
    return [x / len, y / len]
  })

  const receiverDirs2d = receiverDirs.map(dir => {
    const x = dot(dir, v2Basis[0])
    const y = dot(dir, v2Basis[1])
    const len = Math.hypot(x, y) || 1
    return [x / len, y / len]
  })

  return {
    V1_2d,
    V2_2d,
    predByRank,
    r2ByRank,
    senderDirs2d,
    receiverDirs2d,
    sigmas,
  }
}

/* ────────────────────────────────────────────
   Linear algebra helpers
   ──────────────────────────────────────────── */
function dot(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function colMeans(M) {
  const d = M[0].length
  const means = new Array(d).fill(0)
  for (const row of M) {
    for (let j = 0; j < d; j++) means[j] += row[j]
  }
  for (let j = 0; j < d; j++) means[j] /= M.length
  return means
}

function gramSchmidt(vecs) {
  for (let i = 0; i < vecs.length; i++) {
    for (let j = 0; j < i; j++) {
      const d = dot(vecs[i], vecs[j])
      for (let k = 0; k < vecs[i].length; k++) {
        vecs[i][k] -= d * vecs[j][k]
      }
    }
    const len = Math.sqrt(dot(vecs[i], vecs[i]))
    if (len > 1e-10) {
      for (let k = 0; k < vecs[i].length; k++) vecs[i][k] /= len
    }
  }
}

// Power-iteration style PCA to get top-2 eigenvectors of covariance
function pcaBasis2(centered) {
  const n = centered.length
  const d = centered[0].length

  // Covariance matrix (d x d)
  const cov = Array.from({ length: d }, () => new Array(d).fill(0))
  for (const row of centered) {
    for (let i = 0; i < d; i++) {
      for (let j = i; j < d; j++) {
        cov[i][j] += row[i] * row[j]
      }
    }
  }
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      cov[i][j] /= n - 1
      cov[j][i] = cov[i][j]
    }
  }

  // Power iteration for top eigenvector
  const rng = mulberry32(999)
  let v1 = Array.from({ length: d }, () => boxMuller(rng))
  for (let iter = 0; iter < 100; iter++) {
    const next = new Array(d).fill(0)
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) next[i] += cov[i][j] * v1[j]
    }
    const len = Math.sqrt(dot(next, next))
    v1 = next.map(x => x / (len || 1))
  }

  // Deflate
  const lam1 = dot(matVec(cov, v1), v1)
  const cov2 = cov.map((row, i) =>
    row.map((val, j) => val - lam1 * v1[i] * v1[j])
  )

  // Second eigenvector
  let v2 = Array.from({ length: d }, () => boxMuller(rng))
  for (let iter = 0; iter < 100; iter++) {
    const next = new Array(d).fill(0)
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) next[i] += cov2[i][j] * v2[j]
    }
    const len = Math.sqrt(dot(next, next))
    v2 = next.map(x => x / (len || 1))
  }

  return { basis: [v1, v2] }
}

function matVec(M, v) {
  const d = v.length
  const result = new Array(d).fill(0)
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) result[i] += M[i][j] * v[j]
  }
  return result
}

function pcaProject2D(data) {
  const means = colMeans(data)
  const centered = data.map(row => row.map((v, j) => v - means[j]))
  const { basis } = pcaBasis2(centered)
  return centered.map(row => [dot(row, basis[0]), dot(row, basis[1])])
}

function projectWithBasis(data, mean, basis) {
  return data.map(row => {
    const centered = row.map((v, j) => v - mean[j])
    return [dot(centered, basis[0]), dot(centered, basis[1])]
  })
}

/* ────────────────────────────────────────────
   Scale 2D points into an SVG scatter panel
   ──────────────────────────────────────────── */
function scaleToPanel(points, cx, cy, radius) {
  let maxAbs = 0
  for (const [x, y] of points) {
    const ax = Math.abs(x)
    const ay = Math.abs(y)
    if (ax > maxAbs) maxAbs = ax
    if (ay > maxAbs) maxAbs = ay
  }
  if (maxAbs === 0) maxAbs = 1
  const s = (radius * 0.85) / maxAbs
  return points.map(([x, y]) => [cx + x * s, cy - y * s])
}

// Compute a consistent scale factor that works for both actual and predicted
function sharedScaleFactor(allPointSets, radius) {
  let maxAbs = 0
  for (const points of allPointSets) {
    for (const [x, y] of points) {
      const ax = Math.abs(x)
      const ay = Math.abs(y)
      if (ax > maxAbs) maxAbs = ax
      if (ay > maxAbs) maxAbs = ay
    }
  }
  if (maxAbs === 0) maxAbs = 1
  return (radius * 0.85) / maxAbs
}

function scaleWithFactor(points, cx, cy, factor) {
  return points.map(([x, y]) => [cx + x * factor, cy - y * factor])
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
export default function CommSubspaceExplorer() {
  const [rank, setRank] = useState(1)

  const data = useMemo(() => generateDatasets(), [])

  const {
    V1_2d,
    V2_2d,
    predByRank,
    r2ByRank,
    senderDirs2d,
    receiverDirs2d,
    sigmas,
  } = data

  // Scale V1 points into left panel
  const v1Scaled = useMemo(
    () => scaleToPanel(V1_2d, V1_CX, V1_CY, SCATTER_R),
    [V1_2d]
  )

  // Scale V2 actual + predicted into right panel with shared scale
  const v2Scale = useMemo(() => {
    const allSets = [V2_2d, ...predByRank]
    return sharedScaleFactor(allSets, SCATTER_R)
  }, [V2_2d, predByRank])

  const v2ActualScaled = useMemo(
    () => scaleWithFactor(V2_2d, V2_CX, V2_CY, v2Scale),
    [V2_2d, v2Scale]
  )

  const v2PredScaled = useMemo(
    () => predByRank.map(pts => scaleWithFactor(pts, V2_CX, V2_CY, v2Scale)),
    [predByRank, v2Scale]
  )

  // Per-point prediction error for color-coding
  const predErrors = useMemo(() => {
    const pred = predByRank[rank - 1]
    const errors = []
    let maxErr = 0
    for (let i = 0; i < N; i++) {
      const dx = V2_2d[i][0] - pred[i][0]
      const dy = V2_2d[i][1] - pred[i][1]
      const err = Math.sqrt(dx * dx + dy * dy)
      errors.push(err)
      if (err > maxErr) maxErr = err
    }
    // Normalize to [0, 1]
    return errors.map(e => (maxErr > 0 ? e / maxErr : 0))
  }, [V2_2d, predByRank, rank])

  // Interpolate color from V2_PRED (good) to V2_RED (bad) based on error
  function errorColor(normalizedErr) {
    // Parse hex colors
    const good = { r: 0x4a, g: 0x7c, b: 0x6f }
    const bad = { r: 0xc0, g: 0x50, b: 0x3a }
    const t = Math.pow(normalizedErr, 0.6) // compress range slightly
    const r = Math.round(good.r + (bad.r - good.r) * t)
    const g = Math.round(good.g + (bad.g - good.g) * t)
    const b = Math.round(good.b + (bad.b - good.b) * t)
    return `rgb(${r},${g},${b})`
  }

  const currentR2 = r2ByRank[rank - 1]
  const currentPred = v2PredScaled[rank - 1]

  // Arrow directions scaled
  const arrowLen = SCATTER_R * 0.6

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <defs>
          <marker
            id="comm-arrow"
            viewBox="0 0 10 8"
            refX="9"
            refY="4"
            markerWidth="7"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,4 L0,8 Z" fill={TEAL} />
          </marker>
        </defs>

        {/* ─── V1 scatter panel ─── */}
        <circle
          cx={V1_CX}
          cy={V1_CY}
          r={SCATTER_R}
          fill="rgba(61,108,185,0.04)"
          stroke="rgba(61,108,185,0.15)"
          strokeWidth={1}
        />
        <text
          x={V1_CX}
          y={V1_CY - SCATTER_R - 10}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 600,
            fill: V1_BLUE,
            letterSpacing: "0.03em",
          }}
        >
          V1 population
        </text>

        {/* V1 points */}
        {v1Scaled.map(([sx, sy], i) => (
          <circle
            key={`v1-${i}`}
            cx={sx}
            cy={sy}
            r={2.5}
            fill={V1_BLUE}
            opacity={0.6}
          />
        ))}

        {/* Sender subspace directions in V1 panel */}
        {senderDirs2d.slice(0, rank).map((dir, r) => {
          const opacity = 0.25 + 0.55 * (sigmas[r] / sigmas[0])
          return (
            <line
              key={`sender-${r}`}
              x1={V1_CX - dir[0] * arrowLen}
              y1={V1_CY + dir[1] * arrowLen}
              x2={V1_CX + dir[0] * arrowLen}
              y2={V1_CY - dir[1] * arrowLen}
              stroke={TEAL}
              strokeWidth={1.5}
              opacity={opacity}
              strokeDasharray="4 3"
            />
          )
        })}

        {/* ─── V2 scatter panel ─── */}
        <circle
          cx={V2_CX}
          cy={V2_CY}
          r={SCATTER_R}
          fill="rgba(192,80,58,0.04)"
          stroke="rgba(192,80,58,0.15)"
          strokeWidth={1}
        />
        <text
          x={V2_CX}
          y={V2_CY - SCATTER_R - 10}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 600,
            fill: V2_RED,
            letterSpacing: "0.03em",
          }}
        >
          V2 population
        </text>

        {/* V2 actual points */}
        {v2ActualScaled.map(([sx, sy], i) => (
          <circle
            key={`v2-${i}`}
            cx={sx}
            cy={sy}
            r={2.5}
            fill={V2_RED}
            opacity={0.35}
          />
        ))}

        {/* V2 predicted points with error coloring */}
        {currentPred.map(([sx, sy], i) => (
          <circle
            key={`v2p-${i}`}
            cx={sx}
            cy={sy}
            r={3}
            fill={errorColor(predErrors[i])}
            opacity={0.8}
            style={{ transition: "cx 0.3s ease, cy 0.3s ease" }}
          />
        ))}

        {/* Residual lines connecting actual to predicted */}
        {v2ActualScaled.map(([ax, ay], i) => {
          const [px, py] = currentPred[i]
          return (
            <line
              key={`res-${i}`}
              x1={ax}
              y1={ay}
              x2={px}
              y2={py}
              stroke={errorColor(predErrors[i])}
              strokeWidth={0.6}
              opacity={0.3}
              style={{ transition: "x2 0.3s ease, y2 0.3s ease" }}
            />
          )
        })}

        {/* Receiver subspace directions in V2 panel */}
        {receiverDirs2d.slice(0, rank).map((dir, r) => {
          const opacity = 0.25 + 0.55 * (sigmas[r] / sigmas[0])
          return (
            <line
              key={`recv-${r}`}
              x1={V2_CX - dir[0] * arrowLen}
              y1={V2_CY + dir[1] * arrowLen}
              x2={V2_CX + dir[0] * arrowLen}
              y2={V2_CY - dir[1] * arrowLen}
              stroke={TEAL}
              strokeWidth={1.5}
              opacity={opacity}
              strokeDasharray="4 3"
            />
          )
        })}

        {/* ─── Communication arrows between panels ─── */}
        {Array.from({ length: rank }).map((_, r) => {
          const yOff = (r - (rank - 1) / 2) * 18
          const opacity = 0.3 + 0.6 * (sigmas[r] / sigmas[0])
          const thickness = 1 + 1.5 * (sigmas[r] / sigmas[0])
          return (
            <line
              key={`arrow-${r}`}
              x1={ARROW_X_START}
              y1={V1_CY + yOff}
              x2={ARROW_X_END}
              y2={V2_CY + yOff}
              stroke={TEAL}
              strokeWidth={thickness}
              opacity={opacity}
              markerEnd="url(#comm-arrow)"
              style={{
                transition: "opacity 0.3s ease, y1 0.3s ease, y2 0.3s ease",
              }}
            />
          )
        })}

        {/* Communication subspace label */}
        <text
          x={(ARROW_X_START + ARROW_X_END) / 2}
          y={V1_CY - 40}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fill: TEAL,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          rank-{rank} subspace
        </text>

        {/* ─── Legend ─── */}
        <g transform={`translate(${V2_CX + SCATTER_R + 12}, ${V2_CY - 30})`}>
          <circle cx={0} cy={0} r={3} fill={V2_RED} opacity={0.5} />
          <text
            x={8}
            y={4}
            style={{ fontFamily: FONT, fontSize: 9, fill: GRAY_TEXT }}
          >
            actual
          </text>
          <circle cx={0} cy={16} r={3} fill={V2_PRED} opacity={0.8} />
          <text
            x={8}
            y={20}
            style={{ fontFamily: FONT, fontSize: 9, fill: GRAY_TEXT }}
          >
            predicted
          </text>
        </g>

        {/* ─── R^2 bar chart ─── */}
        <text
          x={W / 2}
          y={BAR_AREA_TOP - 10}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 11,
            fill: "rgba(0,0,0,0.5)",
            fontWeight: 600,
            letterSpacing: "0.03em",
          }}
        >
          prediction quality (R{"\u00B2"}) by rank
        </text>

        {r2ByRank.map((r2, i) => {
          const rankIdx = i + 1
          const selected = rankIdx === rank
          const barH = r2 * BAR_MAX_H
          const x = BAR_LEFT + i * (BAR_W + BAR_GAP)
          const y = BAR_BASELINE - barH

          return (
            <g
              key={`bar-${i}`}
              style={{ cursor: "pointer" }}
              onClick={() => setRank(rankIdx)}
            >
              {/* Expanded hit area */}
              <rect
                x={x - BAR_GAP / 2}
                y={BAR_AREA_TOP}
                width={BAR_W + BAR_GAP}
                height={BAR_BASELINE - BAR_AREA_TOP + 24}
                fill="transparent"
              />

              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                fill={selected ? TEAL : GRAY_BAR}
                rx={3}
                style={{ transition: "fill 0.2s ease" }}
              />

              {/* R^2 value label */}
              <text
                x={x + BAR_W / 2}
                y={y - 6}
                textAnchor="middle"
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  fontWeight: selected ? 700 : 400,
                  fill: selected ? TEAL : GRAY_TEXT,
                  transition: "fill 0.2s ease",
                }}
              >
                {r2.toFixed(2)}
              </text>

              {/* Rank label */}
              <text
                x={x + BAR_W / 2}
                y={BAR_BASELINE + 15}
                textAnchor="middle"
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  fontWeight: selected ? 700 : 400,
                  fill: selected ? "rgba(0,0,0,0.7)" : GRAY_TEXT,
                  transition: "fill 0.2s ease",
                }}
              >
                rank {rankIdx}
              </text>

              {/* Selection indicator */}
              {selected && (
                <rect
                  x={x}
                  y={BAR_BASELINE + 20}
                  width={BAR_W}
                  height={2}
                  rx={1}
                  fill={TEAL}
                />
              )}
            </g>
          )
        })}

        {/* R^2 readout */}
        <text
          x={W / 2}
          y={BAR_BASELINE + 42}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 12,
            fill: TEAL,
            fontWeight: 700,
          }}
        >
          R{"\u00B2"} = {currentR2.toFixed(3)}
        </text>
      </svg>
    </div>
  )
}
