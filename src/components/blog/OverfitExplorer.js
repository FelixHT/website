import React, { useState, useMemo } from "react"

// ── constants ──────────────────────────────────────────────────────
const W = 700
const H = 380
const TEAL = "#4A7C6F"
const RED = "#c0503a"
const FONT = "var(--font-mono, monospace)"
const AXIS_COLOR = "rgba(0,0,0,0.15)"
const T_TOTAL = 50
const T_TRAIN = 25
const T_TEST = 25
const NOISE_SD = 1.0
const SEED = 42

// panel geometry
const PAD_LEFT = 55
const PAD_RIGHT = 20
const PAD_TOP = 30
const PAD_BOTTOM = 40
const GAP = 50
const panelW = (W - PAD_LEFT - PAD_RIGHT - GAP) / 2
const panelH = H - PAD_TOP - PAD_BOTTOM

// ── seeded PRNG ────────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Box-Muller for Gaussian samples
function randn(rng) {
  let u = 0, v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── tiny linear algebra helpers ────────────────────────────────────
// Matrices stored as { data: Float64Array, rows, cols } in row-major order.

function matCreate(rows, cols) {
  return { data: new Float64Array(rows * cols), rows, cols }
}

function matGet(m, r, c) {
  return m.data[r * m.cols + c]
}

function matSet(m, r, c, v) {
  m.data[r * m.cols + c] = v
}

function matMul(A, B) {
  const C = matCreate(A.rows, B.cols)
  for (let i = 0; i < A.rows; i++)
    for (let j = 0; j < B.cols; j++) {
      let s = 0
      for (let k = 0; k < A.cols; k++) s += matGet(A, i, k) * matGet(B, k, j)
      matSet(C, i, j, s)
    }
  return C
}

function matT(A) {
  const B = matCreate(A.cols, A.rows)
  for (let i = 0; i < A.rows; i++)
    for (let j = 0; j < A.cols; j++)
      matSet(B, j, i, matGet(A, i, j))
  return B
}

// Solve Ax = b for square A via Gaussian elimination with partial pivoting.
function solve(A, b) {
  const n = A.rows
  const aug = matCreate(n, n + 1)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) matSet(aug, i, j, matGet(A, i, j))
    matSet(aug, i, n, b[i])
  }

  for (let col = 0; col < n; col++) {
    // partial pivot
    let maxVal = Math.abs(matGet(aug, col, col))
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(matGet(aug, row, col))
      if (v > maxVal) { maxVal = v; maxRow = row }
    }
    if (maxRow !== col) {
      for (let j = 0; j <= n; j++) {
        const tmp = matGet(aug, col, j)
        matSet(aug, col, j, matGet(aug, maxRow, j))
        matSet(aug, maxRow, j, tmp)
      }
    }
    const pivot = matGet(aug, col, col)
    if (Math.abs(pivot) < 1e-14) continue
    for (let row = col + 1; row < n; row++) {
      const factor = matGet(aug, row, col) / pivot
      for (let j = col; j <= n; j++)
        matSet(aug, row, j, matGet(aug, row, j) - factor * matGet(aug, col, j))
    }
  }

  const x = new Float64Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let s = matGet(aug, i, n)
    for (let j = i + 1; j < n; j++) s -= matGet(aug, i, j) * x[j]
    const d = matGet(aug, i, i)
    x[i] = Math.abs(d) > 1e-14 ? s / d : 0
  }
  return x
}

// ── data generation & OLS fitting ──────────────────────────────────
function generateAndFit(N) {
  const rng = mulberry32(SEED)

  // true weight vector (N), scaled by 1/sqrt(N) so total signal power
  // stays roughly constant as N varies
  const wTrue = new Float64Array(N)
  const wScale = 1.0 / Math.sqrt(N)
  for (let i = 0; i < N; i++) wTrue[i] = randn(rng) * wScale

  // firing-rate matrix X: N neurons x T_TOTAL trials
  const X = matCreate(N, T_TOTAL)
  for (let i = 0; i < N; i++)
    for (let t = 0; t < T_TOTAL; t++)
      matSet(X, i, t, randn(rng))

  // target y = w_true^T X + noise
  const y = new Float64Array(T_TOTAL)
  for (let t = 0; t < T_TOTAL; t++) {
    let s = 0
    for (let i = 0; i < N; i++) s += wTrue[i] * matGet(X, i, t)
    y[t] = s + randn(rng) * NOISE_SD
  }

  // split train / test
  const Xtrain = matCreate(N, T_TRAIN)
  const Xtest = matCreate(N, T_TEST)
  const yTrain = new Float64Array(T_TRAIN)
  const yTest = new Float64Array(T_TEST)
  for (let i = 0; i < N; i++) {
    for (let t = 0; t < T_TRAIN; t++) matSet(Xtrain, i, t, matGet(X, i, t))
    for (let t = 0; t < T_TEST; t++) matSet(Xtest, i, t, matGet(X, i, T_TRAIN + t))
  }
  for (let t = 0; t < T_TRAIN; t++) yTrain[t] = y[t]
  for (let t = 0; t < T_TEST; t++) yTest[t] = y[T_TRAIN + t]

  // ── fit OLS decoder ──
  // We solve X^T w = y  (T_TRAIN equations, N unknowns).
  let wHat

  if (N <= T_TRAIN) {
    // overdetermined or square: normal equations (X X^T) w = X y
    // X X^T is N x N, X y is N x 1
    const G = matMul(Xtrain, matT(Xtrain)) // N x N
    for (let i = 0; i < N; i++) matSet(G, i, i, matGet(G, i, i) + 1e-10)
    const rhs = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      let s = 0
      for (let t = 0; t < T_TRAIN; t++) s += matGet(Xtrain, i, t) * yTrain[t]
      rhs[i] = s
    }
    wHat = solve(G, rhs)
  } else {
    // underdetermined: minimum-norm solution w = X (X^T X)^{-1} y
    // Solve (X^T X) alpha = y, then w = X alpha
    // X^T X is T_TRAIN x T_TRAIN
    const XtrainT = matT(Xtrain) // T_TRAIN x N
    const GramTrial = matMul(XtrainT, Xtrain) // T_TRAIN x T_TRAIN
    for (let i = 0; i < T_TRAIN; i++)
      matSet(GramTrial, i, i, matGet(GramTrial, i, i) + 1e-10)
    const alpha = solve(GramTrial, yTrain)
    wHat = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      let s = 0
      for (let t = 0; t < T_TRAIN; t++) s += matGet(Xtrain, i, t) * alpha[t]
      wHat[i] = s
    }
  }

  // predictions
  const predTrain = new Float64Array(T_TRAIN)
  const predTest = new Float64Array(T_TEST)
  for (let t = 0; t < T_TRAIN; t++) {
    let s = 0
    for (let i = 0; i < N; i++) s += wHat[i] * matGet(Xtrain, i, t)
    predTrain[t] = s
  }
  for (let t = 0; t < T_TEST; t++) {
    let s = 0
    for (let i = 0; i < N; i++) s += wHat[i] * matGet(Xtest, i, t)
    predTest[t] = s
  }

  // R-squared
  function computeR2(actual, predicted) {
    const n = actual.length
    let mean = 0
    for (let i = 0; i < n; i++) mean += actual[i]
    mean /= n
    let ssTot = 0, ssRes = 0
    for (let i = 0; i < n; i++) {
      ssTot += (actual[i] - mean) ** 2
      ssRes += (actual[i] - predicted[i]) ** 2
    }
    return ssTot > 0 ? 1 - ssRes / ssTot : 0
  }

  return {
    train: { actual: yTrain, predicted: predTrain, r2: computeR2(yTrain, predTrain) },
    test: { actual: yTest, predicted: predTest, r2: computeR2(yTest, predTest) },
  }
}

// ── axis range helper ──────────────────────────────────────────────
function niceRange(arrays) {
  let min = Infinity, max = -Infinity
  for (const arr of arrays)
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] < min) min = arr[i]
      if (arr[i] > max) max = arr[i]
    }
  const pad = (max - min) * 0.12 || 1
  return [min - pad, max + pad]
}

// ── component ──────────────────────────────────────────────────────
export default function OverfitExplorer() {
  const [numNeurons, setNumNeurons] = useState(20)

  const result = useMemo(() => generateAndFit(numNeurons), [numNeurons])

  // shared axis range so both panels are comparable
  const [lo, hi] = useMemo(() => niceRange([
    result.train.actual, result.train.predicted,
    result.test.actual, result.test.predicted,
  ]), [result])

  const sx = v => ((v - lo) / (hi - lo)) * panelW
  const sy = v => panelH - ((v - lo) / (hi - lo)) * panelH

  const ticks = useMemo(() => {
    const step = Math.pow(10, Math.floor(Math.log10(hi - lo)))
    const nice = (hi - lo) / step < 3 ? step / 2 : step
    const arr = []
    let t = Math.ceil(lo / nice) * nice
    while (t <= hi) { arr.push(t); t += nice }
    return arr
  }, [lo, hi])

  function renderPanel(data, label, color, offsetX) {
    const { actual, predicted, r2 } = data
    const r2Color = r2 > 0.5 ? TEAL : r2 < 0.2 ? RED : "#888"
    const r2Text = r2 < -9.99 ? "< -10" : r2.toFixed(2)

    return (
      <g transform={`translate(${offsetX}, ${PAD_TOP})`}>
        {/* panel title */}
        <text
          x={panelW / 2} y={-12}
          textAnchor="middle" fontSize="13" fontFamily={FONT}
          fontWeight="600" fill="#333"
        >{label}</text>

        {/* axes */}
        <line x1={0} y1={0} x2={0} y2={panelH} stroke={AXIS_COLOR} />
        <line x1={0} y1={panelH} x2={panelW} y2={panelH} stroke={AXIS_COLOR} />

        {/* ticks and labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={sx(t)} y1={panelH} x2={sx(t)} y2={panelH + 4} stroke={AXIS_COLOR} />
            <text x={sx(t)} y={panelH + 16} textAnchor="middle"
              fontSize="9" fontFamily={FONT} fill="#999">{t.toFixed(1)}</text>
            <line x1={-4} y1={sy(t)} x2={0} y2={sy(t)} stroke={AXIS_COLOR} />
            <text x={-8} y={sy(t) + 3} textAnchor="end"
              fontSize="9" fontFamily={FONT} fill="#999">{t.toFixed(1)}</text>
          </g>
        ))}

        {/* axis labels */}
        <text x={panelW / 2} y={panelH + 32} textAnchor="middle"
          fontSize="10" fontFamily={FONT} fill="#777">actual</text>
        <text x={-38} y={panelH / 2} textAnchor="middle"
          fontSize="10" fontFamily={FONT} fill="#777"
          transform={`rotate(-90, -38, ${panelH / 2})`}>predicted</text>

        {/* identity line */}
        <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)}
          stroke="#bbb" strokeWidth={1} strokeDasharray="4,3" />

        {/* data points */}
        {Array.from({ length: actual.length }, (_, i) => (
          <circle key={i} cx={sx(actual[i])} cy={sy(predicted[i])}
            r={3.5} fill={color} opacity={0.7} />
        ))}

        {/* R-squared */}
        <text x={panelW - 6} y={18} textAnchor="end"
          fontSize="13" fontFamily={FONT} fontWeight="600" fill={r2Color}>
          {"R\u00B2 = " + r2Text}
        </text>
      </g>
    )
  }

  const leftX = PAD_LEFT
  const rightX = PAD_LEFT + panelW + GAP

  return (
    <div style={{ width: "100%", maxWidth: W }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%"
        style={{ display: "block", overflow: "visible" }}>
        {renderPanel(result.train, "Training", TEAL, leftX)}
        {renderPanel(result.test, "Test", RED, rightX)}
      </svg>
      <div className="blog-figure__controls"
        style={{ justifyContent: "center", gap: "1.2rem" }}>
        <label style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          fontFamily: FONT, fontSize: "12px",
        }}>
          <span>N = {numNeurons} neurons</span>
          <input type="range" min={5} max={80} value={numNeurons}
            onChange={e => setNumNeurons(+e.target.value)} />
        </label>
      </div>
    </div>
  )
}
