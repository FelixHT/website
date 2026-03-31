import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const PLOT_CX = 260
const PLOT_CY = 200
const PLOT_R = 160
const FONT = "var(--font-mono, monospace)"

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const PCA_STROKE = "rgba(0,0,0,0.2)"
const FULL_STROKE = "rgba(0,0,0,0.25)"
const READOUT_X = 540
const READOUT_Y = 80

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
  // Box-Muller
  const u1 = rng()
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2)
}

/* ─── Generate data where PCA != RRR ─── */
// X is 2D, Y is 1D. The true regression direction (beta) is tilted ~30deg
// away from the first PC of X, so max-variance != max-prediction.
function generateData() {
  const rng = mulberry32(77)
  const N = 40

  // PCA direction of X: roughly along (1, 0) with large variance.
  // Second PC along (0, 1) with smaller variance.
  // True beta tilted ~30deg from first PC.
  const pcaAngle = 0 // first PC is horizontal
  const betaAngle = Math.PI / 6 // 30deg tilt from PCA direction

  const sigma1 = 2.5 // variance along first PC
  const sigma2 = 1.0 // variance along second PC

  const beta = [Math.cos(betaAngle), Math.sin(betaAngle)]

  const X = []
  const Y = []

  for (let i = 0; i < N; i++) {
    // Generate X in PCA coordinates then rotate
    const z1 = randn(rng) * sigma1
    const z2 = randn(rng) * sigma2
    const x1 = z1 * Math.cos(pcaAngle) - z2 * Math.sin(pcaAngle)
    const x2 = z1 * Math.sin(pcaAngle) + z2 * Math.cos(pcaAngle)
    X.push([x1, x2])

    // Y = X * beta + noise
    const y = x1 * beta[0] + x2 * beta[1] + randn(rng) * 0.6
    Y.push(y)
  }

  return { X, Y, pcaAngle, betaAngle, N }
}

/* ─── Linear algebra helpers ─── */
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1]
}

function vecNorm(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1])
}

function vecNormalize(v) {
  const n = vecNorm(v)
  return n > 1e-12 ? [v[0] / n, v[1] / n] : [1, 0]
}

/* ─── Compute OLS regression: Y = X * beta ─── */
// For 2D X, beta = (X^T X)^{-1} X^T Y
function computeOLS(X, Y) {
  const n = X.length
  // X^T X (2x2)
  let a00 = 0, a01 = 0, a11 = 0
  let b0 = 0, b1 = 0
  for (let i = 0; i < n; i++) {
    a00 += X[i][0] * X[i][0]
    a01 += X[i][0] * X[i][1]
    a11 += X[i][1] * X[i][1]
    b0 += X[i][0] * Y[i]
    b1 += X[i][1] * Y[i]
  }
  // Invert 2x2 symmetric matrix
  const det = a00 * a11 - a01 * a01
  if (Math.abs(det) < 1e-12) return [1, 0]
  const inv00 = a11 / det
  const inv01 = -a01 / det
  const inv11 = a00 / det
  return [inv00 * b0 + inv01 * b1, inv01 * b0 + inv11 * b1]
}

/* ─── Compute R-squared ─── */
function computeR2(X, Y, beta) {
  const n = X.length
  let ssRes = 0
  let ssTot = 0
  let yMean = 0
  for (let i = 0; i < n; i++) yMean += Y[i]
  yMean /= n
  for (let i = 0; i < n; i++) {
    const yHat = X[i][0] * beta[0] + X[i][1] * beta[1]
    ssRes += (Y[i] - yHat) * (Y[i] - yHat)
    ssTot += (Y[i] - yMean) * (Y[i] - yMean)
  }
  return ssTot > 0 ? 1 - ssRes / ssTot : 0
}

/* ─── PCA of X (first principal component direction) ─── */
function computePCA(X) {
  const n = X.length
  // Center
  let mx = 0, my = 0
  for (let i = 0; i < n; i++) { mx += X[i][0]; my += X[i][1] }
  mx /= n; my /= n

  // Covariance matrix
  let c00 = 0, c01 = 0, c11 = 0
  for (let i = 0; i < n; i++) {
    const dx = X[i][0] - mx
    const dy = X[i][1] - my
    c00 += dx * dx
    c01 += dx * dy
    c11 += dy * dy
  }
  c00 /= n; c01 /= n; c11 /= n

  // Eigendecomposition of 2x2 symmetric matrix
  const trace = c00 + c11
  const det = c00 * c11 - c01 * c01
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lambda1 = trace / 2 + disc
  // First eigenvector
  let v
  if (Math.abs(c01) > 1e-12) {
    v = [lambda1 - c11, c01]
  } else {
    v = c00 >= c11 ? [1, 0] : [0, 1]
  }
  return vecNormalize(v)
}

/* ─── Reduced-rank regression (rank-1) ─── */
// RRR: B_rrr = B_ols * V_k * V_k^T where V_k are top-k right singular
// vectors of B_ols. For scalar Y and 2D X, B_ols is a 2x1 vector.
// Rank-1 RRR keeps the full OLS direction (since B_ols has rank 1 anyway
// when Y is 1D). The rank constraint becomes interesting when we think of
// it as constraining the regression subspace.
//
// A more pedagogically useful formulation for this figure:
// Rank-1 RRR projects X onto a single direction before predicting Y.
// Full-rank uses both dimensions. We compute the optimal rank-1 direction
// by SVD of the coefficient matrix of the reduced problem:
// min ||Y - X * a * b||^2 where a is scalar, b is 2-vector (direction).
// The solution is: b = direction of OLS beta, which means rank-1 RRR
// for 1D Y is equivalent to projecting onto beta direction.
//
// To make the figure more interesting, we compute rank-k RRR for the
// multivariate regression: the constrained direction differs from PCA.
function computeRRR(X, Y, rank) {
  const beta = computeOLS(X, Y)
  if (rank >= 2) {
    // Full rank: use OLS directly
    return { beta, direction: vecNormalize(beta) }
  }
  // Rank 1: project X onto optimal 1D subspace, then regress.
  // For scalar Y, optimal direction = normalized OLS beta.
  const dir = vecNormalize(beta)
  // Project X onto this direction
  const n = X.length
  const proj = []
  for (let i = 0; i < n; i++) {
    const p = dot(X[i], dir)
    proj.push(p)
  }
  // Regress Y on projected scalar
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += proj[i] * Y[i]
    den += proj[i] * proj[i]
  }
  const alpha = den > 1e-12 ? num / den : 0
  // Beta for rank-1 = alpha * dir
  return { beta: [alpha * dir[0], alpha * dir[1]], direction: dir }
}

/* ─── Colormap: blue (low Y) to red (high Y) ─── */
function yToColor(y, yMin, yMax) {
  const range = yMax - yMin || 1
  const t = (y - yMin) / range // 0..1
  // Blue (#3B82F6) to Red (#EF4444)
  const r = Math.round(59 + t * (239 - 59))
  const g = Math.round(130 + t * (68 - 130))
  const b = Math.round(246 + t * (68 - 246))
  return `rgb(${r},${g},${b})`
}

/* ─── Component ─── */
export default function RRRExplorer() {
  const [rank, setRank] = useState(1)

  const { data, pca, ols, rrr, r2Full, r2RRR, yMin, yMax } = useMemo(() => {
    const d = generateData()
    const pcaDir = computePCA(d.X)
    const olsBeta = computeOLS(d.X, d.Y)
    const rrrResult = computeRRR(d.X, d.Y, rank)

    const r2F = computeR2(d.X, d.Y, olsBeta)
    const r2R = computeR2(d.X, d.Y, rrrResult.beta)

    let mn = Infinity, mx = -Infinity
    for (let i = 0; i < d.N; i++) {
      if (d.Y[i] < mn) mn = d.Y[i]
      if (d.Y[i] > mx) mx = d.Y[i]
    }

    return {
      data: d,
      pca: pcaDir,
      ols: { beta: olsBeta, direction: vecNormalize(olsBeta) },
      rrr: rrrResult,
      r2Full: r2F,
      r2RRR: r2R,
      yMin: mn,
      yMax: mx,
    }
  }, [rank])

  /* ─── Scale data points to SVG coordinates ─── */
  const scaledPoints = useMemo(() => {
    let maxAbs = 0
    for (const [x, y] of data.X) {
      if (Math.abs(x) > maxAbs) maxAbs = Math.abs(x)
      if (Math.abs(y) > maxAbs) maxAbs = Math.abs(y)
    }
    if (maxAbs === 0) maxAbs = 1
    const s = (PLOT_R * 0.85) / maxAbs
    return data.X.map(([x, y]) => [
      PLOT_CX + x * s,
      PLOT_CY - y * s, // SVG y-flip
    ])
  }, [data.X])

  /* ─── Direction line endpoints ─── */
  const lineLen = PLOT_R * 0.95

  function directionLine(dir) {
    return {
      x1: PLOT_CX - dir[0] * lineLen,
      y1: PLOT_CY + dir[1] * lineLen, // y-flip
      x2: PLOT_CX + dir[0] * lineLen,
      y2: PLOT_CY - dir[1] * lineLen,
    }
  }

  const pcaLine = directionLine(pca)
  const rrrLine = directionLine(rrr.direction)
  const olsLine = directionLine(ols.direction)

  /* ─── Angle between PCA and RRR for annotation ─── */
  const pcaAngleDeg = Math.atan2(pca[1], pca[0]) * (180 / Math.PI)
  const rrrAngleDeg =
    Math.atan2(rrr.direction[1], rrr.direction[0]) * (180 / Math.PI)
  const angleBetween = Math.abs(pcaAngleDeg - rrrAngleDeg)
  const displayAngle =
    angleBetween > 90 ? 180 - angleBetween : angleBetween

  /* ─── Label placement: offset from line endpoints ─── */
  const pcaLabelPos = {
    x: PLOT_CX + pca[0] * (lineLen + 14),
    y: PLOT_CY - pca[1] * (lineLen + 14),
  }
  const rrrLabelPos = {
    x: PLOT_CX + rrr.direction[0] * (lineLen + 14),
    y: PLOT_CY - rrr.direction[1] * (lineLen + 14),
  }

  /* ─── Angle arc between PCA and RRR ─── */
  const arcRadius = 50
  const pcaAngleRad = Math.atan2(pca[1], pca[0])
  const rrrAngleRad = Math.atan2(rrr.direction[1], rrr.direction[0])

  // Determine sweep for smallest arc
  let startAngle = pcaAngleRad
  let endAngle = rrrAngleRad
  let diff = endAngle - startAngle
  while (diff > Math.PI) diff -= 2 * Math.PI
  while (diff < -Math.PI) diff += 2 * Math.PI
  const sweepFlag = diff > 0 ? 0 : 1

  const arcStartX = PLOT_CX + Math.cos(startAngle) * arcRadius
  const arcStartY = PLOT_CY - Math.sin(startAngle) * arcRadius
  const arcEndX = PLOT_CX + Math.cos(endAngle) * arcRadius
  const arcEndY = PLOT_CY - Math.sin(endAngle) * arcRadius

  const arcPath = `M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`

  // Midpoint of arc for angle label
  const midAngle = startAngle + diff / 2
  const angleLabelX = PLOT_CX + Math.cos(midAngle) * (arcRadius + 14)
  const angleLabelY = PLOT_CY - Math.sin(midAngle) * (arcRadius + 14)

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
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
          x&#x2081;
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
          x&#x2082;
        </text>

        {/* ── PCA direction (dashed) ── */}
        <line
          x1={pcaLine.x1}
          y1={pcaLine.y1}
          x2={pcaLine.x2}
          y2={pcaLine.y2}
          stroke={PCA_STROKE}
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />

        {/* ── Full-rank OLS direction (faded gray, only when rank=1) ── */}
        {rank === 1 && (
          <line
            x1={olsLine.x1}
            y1={olsLine.y1}
            x2={olsLine.x2}
            y2={olsLine.y2}
            stroke={FULL_STROKE}
            strokeWidth={1.5}
          />
        )}

        {/* ── RRR direction (bold teal) ── */}
        <line
          x1={rrrLine.x1}
          y1={rrrLine.y1}
          x2={rrrLine.x2}
          y2={rrrLine.y2}
          stroke={TEAL}
          strokeWidth={2.5}
          style={{ transition: "all 0.2s ease" }}
        />

        {/* ── Angle arc between PCA and RRR ── */}
        {rank === 1 && displayAngle > 2 && (
          <g>
            <path
              d={arcPath}
              fill="none"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={1}
            />
            <text
              x={angleLabelX}
              y={angleLabelY}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fill: "rgba(0,0,0,0.35)",
              }}
            >
              {displayAngle.toFixed(0)}&#xB0;
            </text>
          </g>
        )}

        {/* ── Data points colored by target Y ── */}
        {scaledPoints.map(([sx, sy], i) => (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={3.5}
            fill={yToColor(data.Y[i], yMin, yMax)}
            fillOpacity={0.7}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={0.5}
          />
        ))}

        {/* ── Direction labels ── */}
        <text
          x={pcaLabelPos.x}
          y={pcaLabelPos.y}
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
          x={rrrLabelPos.x}
          y={rrrLabelPos.y}
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

        {/* ── Color legend ── */}
        <defs>
          <linearGradient id="rrr-y-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        <rect
          x={READOUT_X - 20}
          y={H - 50}
          width={120}
          height={8}
          rx={4}
          fill="url(#rrr-y-gradient)"
        />
        <text
          x={READOUT_X - 20}
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
          x={READOUT_X - 20}
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
          x={READOUT_X + 100}
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

        {/* ── Readout panel ── */}
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
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fill: "rgba(0,0,0,0.4)",
          }}
        >
          Full-rank R&#xB2;
        </text>
        <text
          x={READOUT_X + 140}
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

        {/* R² bar (full) */}
        <rect
          x={READOUT_X}
          y={READOUT_Y + 36}
          width={140}
          height={4}
          rx={2}
          fill="rgba(0,0,0,0.06)"
        />
        <rect
          x={READOUT_X}
          y={READOUT_Y + 36}
          width={Math.max(0, r2Full * 140)}
          height={4}
          rx={2}
          fill="rgba(0,0,0,0.15)"
        />

        {/* Rank-k R² */}
        <text
          x={READOUT_X}
          y={READOUT_Y + 64}
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fill: TEAL,
          }}
        >
          Rank-{rank} R&#xB2;
        </text>
        <text
          x={READOUT_X + 140}
          y={READOUT_Y + 64}
          textAnchor="end"
          style={{
            fontFamily: FONT,
            fontSize: 13,
            fill: TEAL,
            fontWeight: 700,
          }}
        >
          {r2RRR.toFixed(3)}
        </text>

        {/* R² bar (rank-k) */}
        <rect
          x={READOUT_X}
          y={READOUT_Y + 70}
          width={140}
          height={4}
          rx={2}
          fill="rgba(74,124,111,0.1)"
        />
        <rect
          x={READOUT_X}
          y={READOUT_Y + 70}
          width={Math.max(0, r2RRR * 140)}
          height={4}
          rx={2}
          fill={TEAL}
          style={{ transition: "width 0.2s ease" }}
        />

        {/* Ratio readout */}
        <text
          x={READOUT_X}
          y={READOUT_Y + 100}
          style={{
            fontFamily: FONT,
            fontSize: 9,
            fill: "rgba(0,0,0,0.3)",
          }}
        >
          {rank === 2
            ? "rank 2 = full rank (2D input)"
            : r2Full > 0
              ? `retains ${((r2RRR / r2Full) * 100).toFixed(0)}% of full R\u00B2`
              : ""}
        </text>

        {/* ── Key insight annotation ── */}
        {rank === 1 && (
          <g>
            <text
              x={READOUT_X}
              y={READOUT_Y + 150}
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
              y={READOUT_Y + 168}
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fill: "rgba(0,0,0,0.35)",
              }}
            >
              PCA finds the direction of
            </text>
            <text
              x={READOUT_X}
              y={READOUT_Y + 182}
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fill: "rgba(0,0,0,0.35)",
              }}
            >
              maximum variance in X.
            </text>
            <text
              x={READOUT_X}
              y={READOUT_Y + 200}
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fill: TEAL,
              }}
            >
              RRR finds the direction that
            </text>
            <text
              x={READOUT_X}
              y={READOUT_Y + 214}
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fill: TEAL,
              }}
            >
              best predicts Y — these are
            </text>
            <text
              x={READOUT_X}
              y={READOUT_Y + 228}
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fill: TEAL,
                fontWeight: 600,
              }}
            >
              not the same.
            </text>
          </g>
        )}

        {/* ── Plot title ── */}
        <text
          x={PLOT_CX}
          y={24}
          textAnchor="middle"
          style={{
            fontFamily: FONT,
            fontSize: 12,
            fill: "#333",
            fontWeight: 600,
          }}
        >
          Neural activity (X) colored by target (Y)
        </text>
      </svg>

      {/* ── Slider control ── */}
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
          Rank constraint k ={" "}
          <strong style={{ color: TEAL, minWidth: 12 }}>{rank}</strong>
          <input
            type="range"
            min={1}
            max={2}
            step={1}
            value={rank}
            onChange={e => setRank(Number(e.target.value))}
            className="dim-explorer__range"
            style={{ width: 120 }}
          />
          <span style={{ color: "rgba(0,0,0,0.3)", fontSize: 10 }}>
            {rank === 1 ? "(rank-constrained)" : "(full rank)"}
          </span>
        </label>
      </div>
    </div>
  )
}
