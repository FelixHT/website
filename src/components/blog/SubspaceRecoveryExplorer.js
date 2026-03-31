import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 700
const H = 350
const PANEL_W = 280
const TRACE_H = 55
const TRACE_GAP = 10
const PAD_X = 30
const PAD_Y = 28
const GAP = 50
const P2_X = PAD_X + PANEL_W + GAP
const CHANNELS_SHOWN = [0, 2, 4]

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const FONT = "var(--font-mono, monospace)"
const AXIS_COLOR = "rgba(0,0,0,0.12)"
const BG_COLOR = "rgba(0,0,0,0.03)"
const SIGNAL_COLOR = "rgba(0,0,0,0.25)"

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

function randn(rng) {
  const u1 = rng()
  const u2 = rng()
  const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12)))
  const theta = 2 * Math.PI * u2
  return [r * Math.cos(theta), r * Math.sin(theta)]
}

/* ─── Matrix / vector helpers ─── */
function matVec(M, v) {
  return M.map(row => row.reduce((s, a, j) => s + a * v[j], 0))
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

/* ─── Power iteration: top-k eigenvectors of symmetric matrix ─── */
function topKEigenvectors(M, k, rng) {
  const n = M.length
  const vecs = []
  for (let ei = 0; ei < k; ei++) {
    let v = Array.from({ length: n }, () => rng() - 0.5)
    v = normalize(v)
    for (let iter = 0; iter < 300; iter++) {
      let w = matVec(M, v)
      for (const prev of vecs) {
        w = vecSub(w, vecScale(prev, dot(w, prev)))
      }
      const wn = norm(w)
      if (wn < 1e-14) break
      v = vecScale(w, 1 / wn)
    }
    for (const prev of vecs) {
      v = vecSub(v, vecScale(prev, dot(v, prev)))
    }
    v = normalize(v)
    vecs.push(v)
  }
  return vecs
}

/* ─── Generate data once ─── */
function generateData() {
  const rng = mulberry32(2026)
  const T = 100
  const T_TRAIN = 50

  // Latent dynamics: damped rotation
  const A = [[0.95, -0.2], [0.2, 0.95]]
  const xTrue = [[1, 0]]
  for (let t = 1; t < T; t++) {
    xTrue.push(matVec(A, xTrue[t - 1]))
  }

  // 6x2 observation matrix (scaled up so signal dominates)
  const C = Array.from({ length: 6 }, () => {
    const [a, b] = randn(rng)
    return [a * 2, b * 2]
  })

  const NOISE_STD = 0.3

  // Noisy observations
  const Y = xTrue.map(x => {
    const cx = matVec(C, x)
    return cx.map(v => {
      const [n1] = randn(rng)
      return v + n1 * NOISE_STD
    })
  })

  // True noiseless signal
  const Y_signal = xTrue.map(x => matVec(C, x))

  // Train / test split
  const Y_train = Y.slice(0, T_TRAIN)
  const Y_test = Y.slice(T_TRAIN)
  const Y_signal_test = Y_signal.slice(T_TRAIN)

  // Training mean
  const meanTrain = Array(6).fill(0)
  for (let j = 0; j < 6; j++) {
    for (let t = 0; t < T_TRAIN; t++) meanTrain[j] += Y_train[t][j]
    meanTrain[j] /= T_TRAIN
  }

  // Centered training data
  const Yc_train = Y_train.map(row => row.map((v, j) => v - meanTrain[j]))

  // Centered test data (using training mean)
  const Yc_test = Y_test.map(row => row.map((v, j) => v - meanTrain[j]))

  // Training covariance Y_train^T Y_train
  const n = 6
  const YtY = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < T_TRAIN; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        YtY[j][k] += Yc_train[i][j] * Yc_train[i][k]
      }
    }
  }

  // Signal mean on test (for R² denominator)
  const signalMeanTest = Array(6).fill(0)
  for (let j = 0; j < 6; j++) {
    for (let t = 0; t < Y_signal_test.length; t++) {
      signalMeanTest[j] += Y_signal_test[t][j]
    }
    signalMeanTest[j] /= Y_signal_test.length
  }

  return {
    Yc_test,
    Y_signal_test,
    YtY,
    meanTrain,
    signalMeanTest,
  }
}

const SIM = generateData()

/* ─── Reconstruct and score for a given d ─── */
function reconstruct(d) {
  const { Yc_test, Y_signal_test, YtY, meanTrain, signalMeanTest } = SIM
  const T_TEST = Y_signal_test.length

  const iterRng = mulberry32(999)
  const eigvecs = topKEigenvectors(YtY, d, iterRng)

  // Reconstruct test data: project onto d PCA axes, map back + add mean
  const Y_recon = Yc_test.map(row => {
    const recon = new Array(6).fill(0)
    for (const ev of eigvecs) {
      const score = dot(row, ev)
      for (let j = 0; j < 6; j++) recon[j] += score * ev[j]
    }
    return recon.map((v, j) => v + meanTrain[j])
  })

  // Denoising R²: how well does reconstruction match the true signal?
  let ssRes = 0
  let ssTot = 0
  for (let t = 0; t < T_TEST; t++) {
    for (let j = 0; j < 6; j++) {
      ssRes += (Y_signal_test[t][j] - Y_recon[t][j]) ** 2
      ssTot += (Y_signal_test[t][j] - signalMeanTest[j]) ** 2
    }
  }
  const r2 = 1 - ssRes / ssTot

  return { Y_recon, r2 }
}

/* ─── Color interpolation based on R² ─── */
function reconColor(r2) {
  const t = Math.max(0, Math.min(1, (r2 - 0.15) / 0.5))
  const rb = parseInt(BLUE.slice(1, 3), 16)
  const gb = parseInt(BLUE.slice(3, 5), 16)
  const bb = parseInt(BLUE.slice(5, 7), 16)
  const rr = parseInt(RED.slice(1, 3), 16)
  const gr = parseInt(RED.slice(3, 5), 16)
  const br = parseInt(RED.slice(5, 7), 16)
  const r = Math.round(rr + (rb - rr) * t)
  const g = Math.round(gr + (gb - gr) * t)
  const b = Math.round(br + (bb - br) * t)
  return `rgb(${r},${g},${b})`
}

/* ─── SVG path for a single-channel time series ─── */
function tracePath(values, x0, y0, w, h, yMin, yMax) {
  return values
    .map((v, i) => {
      const sx = x0 + (i / (values.length - 1)) * w
      const sy = y0 + h - ((v - yMin) / (yMax - yMin)) * h
      return `${i === 0 ? "M" : "L"}${sx.toFixed(2)},${sy.toFixed(2)}`
    })
    .join(" ")
}

/* ─── Panel: stacked channel traces ─── */
function TracesPanel({ signalData, reconData, label, panelLeft, panelTop, color, yBounds }) {
  const nCh = CHANNELS_SHOWN.length
  const totalH = nCh * TRACE_H + (nCh - 1) * TRACE_GAP

  return (
    <g>
      <rect
        x={panelLeft}
        y={panelTop}
        width={PANEL_W}
        height={totalH}
        rx={4}
        fill={BG_COLOR}
      />

      {CHANNELS_SHOWN.map((ch, ci) => {
        const traceY = panelTop + ci * (TRACE_H + TRACE_GAP)
        const { yMin, yMax } = yBounds[ch]
        const sigVals = signalData.map(row => row[ch])
        const sigPath = tracePath(sigVals, panelLeft, traceY, PANEL_W, TRACE_H, yMin, yMax)

        return (
          <g key={ch}>
            {/* Channel label */}
            <text
              x={panelLeft - 4}
              y={traceY + TRACE_H / 2 + 3}
              textAnchor="end"
              fill="rgba(0,0,0,0.28)"
              fontFamily={FONT}
              fontSize={8}
            >
              ch {ch + 1}
            </text>

            {/* Separator line */}
            {ci < nCh - 1 && (
              <line
                x1={panelLeft}
                y1={traceY + TRACE_H + TRACE_GAP / 2}
                x2={panelLeft + PANEL_W}
                y2={traceY + TRACE_H + TRACE_GAP / 2}
                stroke={AXIS_COLOR}
                strokeWidth={0.5}
              />
            )}

            {/* Signal trace (gray) */}
            <path d={sigPath} fill="none" stroke={SIGNAL_COLOR} strokeWidth={1.5} />

            {/* Reconstruction overlay */}
            {reconData && (
              <path
                d={tracePath(
                  reconData.map(row => row[ch]),
                  panelLeft,
                  traceY,
                  PANEL_W,
                  TRACE_H,
                  yMin,
                  yMax
                )}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
              />
            )}
          </g>
        )
      })}

      {/* Panel label */}
      <text
        x={panelLeft + PANEL_W / 2}
        y={panelTop - 8}
        textAnchor="middle"
        fill={color || "rgba(0,0,0,0.45)"}
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

  const { Y_signal_test } = SIM
  const { Y_recon, r2 } = useMemo(() => reconstruct(d), [d])

  // Compute shared y-bounds per channel (across signal + all possible recons)
  // Use signal + current recon to set bounds
  const yBounds = useMemo(() => {
    const bounds = {}
    for (const ch of CHANNELS_SHOWN) {
      let mn = Infinity
      let mx = -Infinity
      for (const row of Y_signal_test) {
        if (row[ch] < mn) mn = row[ch]
        if (row[ch] > mx) mx = row[ch]
      }
      for (const row of Y_recon) {
        if (row[ch] < mn) mn = row[ch]
        if (row[ch] > mx) mx = row[ch]
      }
      const pad = (mx - mn) * 0.12
      bounds[ch] = { yMin: mn - pad, yMax: mx + pad }
    }
    return bounds
  }, [Y_recon])

  const traceColor = reconColor(r2)
  const r2Color = r2 > 0.55 ? TEAL : r2 < 0.35 ? RED : "#777"

  const nCh = CHANNELS_SHOWN.length
  const totalTraceH = nCh * TRACE_H + (nCh - 1) * TRACE_GAP
  const r2Y = PAD_Y + totalTraceH + 28

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", display: "block", overflow: "visible" }}
      >
        {/* Left: true signal (test period) */}
        <TracesPanel
          signalData={Y_signal_test}
          reconData={null}
          label="signal (test)"
          panelLeft={PAD_X}
          panelTop={PAD_Y}
          color="rgba(0,0,0,0.4)"
          yBounds={yBounds}
        />

        {/* Right: reconstruction overlaid on signal */}
        <TracesPanel
          signalData={Y_signal_test}
          reconData={Y_recon}
          label={`reconstructed (d\u2009=\u2009${d})`}
          panelLeft={P2_X}
          panelTop={PAD_Y}
          color={traceColor}
          yBounds={yBounds}
        />

        {/* R² readout */}
        <text
          x={W / 2}
          y={r2Y}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={15}
          fontWeight={700}
          fill={r2Color}
        >
          denoising R² = {r2.toFixed(2)}
        </text>
      </svg>

      {/* Slider */}
      <div
        className="blog-figure__controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "center",
          marginTop: 4,
        }}
      >
        <label style={{ fontFamily: FONT, fontSize: 12, color: "#555" }}>
          latent dimensions d
        </label>
        <input
          type="range"
          min={1}
          max={6}
          step={1}
          value={d}
          onChange={e => setD(Number(e.target.value))}
          style={{ width: 140 }}
        />
        <span
          style={{
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
            color: traceColor,
            minWidth: 28,
          }}
        >
          {d}
        </span>
      </div>
    </div>
  )
}
