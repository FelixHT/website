import React, { useState, useMemo } from "react"

/* ─── Dimensions ─── */
const W = 700
const H = 320
const MARGIN = 28
const LEFT_W = 260
const RIGHT_X = LEFT_W + 20
const RIGHT_W = W - RIGHT_X - MARGIN
const PANEL_H = 260
const PANEL_Y = (H - PANEL_H) / 2

const FONT = "var(--font-mono, monospace)"

/* ─── Colors ─── */
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const TRACE_COLORS = [
  [160, 145, 115],
  [135, 155, 140],
  [145, 135, 160],
  [175, 150, 110],
  [125, 150, 145],
  [155, 140, 130],
]

/* ─── PRNG ─── */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─── Box-Muller for Gaussian noise ─── */
function gaussianPair(rand) {
  const u1 = rand()
  const u2 = rand()
  const mag = Math.sqrt(-2 * Math.log(u1 + 1e-12))
  return [mag * Math.cos(2 * Math.PI * u2), mag * Math.sin(2 * Math.PI * u2)]
}

/* ─── Generate latent trajectory ─── */
function generateLatent(T) {
  const A = [[0.98, -0.2], [0.2, 0.98]]
  const xs = new Array(T)
  xs[0] = [1, 0]
  for (let t = 1; t < T; t++) {
    const [x1, x2] = xs[t - 1]
    xs[t] = [
      A[0][0] * x1 + A[0][1] * x2,
      A[1][0] * x1 + A[1][1] * x2,
    ]
  }
  return xs
}

/* ─── Generate random C matrix (6×2) ─── */
function generateC(rand) {
  const C = []
  for (let i = 0; i < 6; i++) {
    C.push([rand() * 2 - 1, rand() * 2 - 1])
  }
  return C
}

/* ─── Time-colored stroke for latent spiral ─── */
function lerp(a, b, t) {
  return a + (b - a) * t
}

function timeColor(t, T) {
  const frac = t / (T - 1)
  // blue (61,108,185) → red (192,80,58)
  const r = Math.round(lerp(61, 192, frac))
  const g = Math.round(lerp(108, 80, frac))
  const b = Math.round(lerp(185, 58, frac))
  return `rgb(${r},${g},${b})`
}

/* ─── Build SVG polyline points string ─── */
function pointsStr(pts) {
  return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")
}

export default function ObservationMixingExplorer() {
  const [showLatent, setShowLatent] = useState(false)
  const T = 100

  const { latent, observed, C } = useMemo(() => {
    const rand = mulberry32(2026)
    const latent = generateLatent(T)
    const C = generateC(rand)
    const noiseStd = 0.15

    // pre-generate all noise
    const allNoise = Array.from({ length: 6 }, () => new Array(T))
    for (let t = 0; t < T; t += 2) {
      for (let i = 0; i < 6; i++) {
        const [n1, n2] = gaussianPair(rand)
        allNoise[i][t] = n1 * noiseStd
        if (t + 1 < T) allNoise[i][t + 1] = n2 * noiseStd
      }
    }

    const observed = Array.from({ length: 6 }, (_, i) =>
      latent.map((x, t) => C[i][0] * x[0] + C[i][1] * x[1] + allNoise[i][t])
    )

    return { latent, observed, C }
  }, [])

  /* ─── Left panel: latent trajectory ─── */
  const leftPlot = useMemo(() => {
    const xs1 = latent.map(x => x[0])
    const xs2 = latent.map(x => x[1])
    const minX1 = Math.min(...xs1), maxX1 = Math.max(...xs1)
    const minX2 = Math.min(...xs2), maxX2 = Math.max(...xs2)

    const padFrac = 0.12
    const px1 = (maxX1 - minX1) * padFrac
    const px2 = (maxX2 - minX2) * padFrac
    const lo1 = minX1 - px1, hi1 = maxX1 + px1
    const lo2 = minX2 - px2, hi2 = maxX2 + px2

    const innerL = MARGIN
    const innerR = LEFT_W - MARGIN
    const innerT = PANEL_Y + 12
    const innerB = PANEL_Y + PANEL_H - 20

    function toSVG(x1, x2) {
      const sx = innerL + ((x1 - lo1) / (hi1 - lo1)) * (innerR - innerL)
      const sy = innerB - ((x2 - lo2) / (hi2 - lo2)) * (innerB - innerT)
      return [sx, sy]
    }

    // origin in SVG coords
    const [ox, oy] = toSVG(0, 0)

    // grid lines at round values
    const gridX1 = []
    for (let v = Math.ceil(lo1 * 2) / 2; v <= hi1; v += 0.5) {
      const [sx] = toSVG(v, 0)
      gridX1.push({ v, sx })
    }
    const gridX2 = []
    for (let v = Math.ceil(lo2 * 2) / 2; v <= hi2; v += 0.5) {
      const [, sy] = toSVG(0, v)
      gridX2.push({ v, sy })
    }

    // colored segments
    const segments = []
    for (let t = 0; t < T - 1; t++) {
      const [ax, ay] = toSVG(latent[t][0], latent[t][1])
      const [bx, by] = toSVG(latent[t + 1][0], latent[t + 1][1])
      segments.push({ ax, ay, bx, by, color: timeColor(t, T) })
    }

    return { segments, ox, oy, gridX1, gridX2, innerL, innerR, innerT, innerB, toSVG }
  }, [latent])

  /* ─── Right panel: observed time series ─── */
  const rightPlot = useMemo(() => {
    const panelInnerH = PANEL_H
    const nTraces = 6
    const gap = 4
    const traceH = (panelInnerH - gap * (nTraces - 1)) / nTraces

    const traces = observed.map((vals, i) => {
      const minV = Math.min(...vals)
      const maxV = Math.max(...vals)
      const range = maxV - minV || 1
      const pad = range * 0.1

      const y0 = PANEL_Y + i * (traceH + gap)
      const y1 = y0 + traceH

      function toSVGPt(t, v) {
        const sx = RIGHT_X + (t / (T - 1)) * RIGHT_W
        const sy = y1 - ((v - (minV - pad)) / (range + 2 * pad)) * (y1 - y0)
        return [sx, sy]
      }

      const pts = vals.map((v, t) => toSVGPt(t, v))
      const [r, g, b] = TRACE_COLORS[i]

      return { pts, y0, y1, color: `rgb(${r},${g},${b})`, minV, maxV, toSVGPt }
    })

    return { traces, traceH }
  }, [observed])

  /* ─── Latent overlay scaling for right panel ─── */
  const latentOverlay = useMemo(() => {
    if (!showLatent) return null

    // find global y range of right panel
    const panelTop = PANEL_Y
    const panelBot = PANEL_Y + PANEL_H

    // scale x1 and x2 to fit the full right panel height
    const x1vals = latent.map(x => x[0])
    const x2vals = latent.map(x => x[1])

    function scaleSignal(vals) {
      const mn = Math.min(...vals)
      const mx = Math.max(...vals)
      const range = mx - mn || 1
      const pad = range * 0.08
      return vals.map((v, t) => {
        const sx = RIGHT_X + (t / (T - 1)) * RIGHT_W
        const sy = panelBot - ((v - (mn - pad)) / (range + 2 * pad)) * (panelBot - panelTop)
        return [sx, sy]
      })
    }

    return {
      x1pts: scaleSignal(x1vals),
      x2pts: scaleSignal(x2vals),
    }
  }, [latent, showLatent])

  return (
    <figure className="blog-figure">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", maxWidth: W, margin: "0 auto" }}
      >
        {/* ── Background panels ── */}
        <rect
          x={0} y={PANEL_Y}
          width={LEFT_W} height={PANEL_H}
          fill="#f8f8f6" stroke="#ddd" strokeWidth={0.5} rx={3}
        />
        <rect
          x={RIGHT_X} y={PANEL_Y}
          width={RIGHT_W} height={PANEL_H}
          fill="#f8f8f6" stroke="#ddd" strokeWidth={0.5} rx={3}
        />

        {/* ── Left panel: latent trajectory ── */}
        <g clipPath="url(#leftClip)">
          {/* faint grid */}
          {leftPlot.gridX1.map(({ v, sx }) => (
            <line
              key={`gx${v}`}
              x1={sx} y1={leftPlot.innerT}
              x2={sx} y2={leftPlot.innerB}
              stroke="#ddd" strokeWidth={0.5}
            />
          ))}
          {leftPlot.gridX2.map(({ v, sy }) => (
            <line
              key={`gy${v}`}
              x1={leftPlot.innerL} y1={sy}
              x2={leftPlot.innerR} y2={sy}
              stroke="#ddd" strokeWidth={0.5}
            />
          ))}

          {/* axes */}
          <line
            x1={leftPlot.innerL} y1={leftPlot.oy}
            x2={leftPlot.innerR} y2={leftPlot.oy}
            stroke="#bbb" strokeWidth={0.8}
          />
          <line
            x1={leftPlot.ox} y1={leftPlot.innerT}
            x2={leftPlot.ox} y2={leftPlot.innerB}
            stroke="#bbb" strokeWidth={0.8}
          />

          {/* origin dot */}
          <circle cx={leftPlot.ox} cy={leftPlot.oy} r={2} fill="#999" />

          {/* colored trajectory segments */}
          {leftPlot.segments.map((seg, i) => (
            <line
              key={i}
              x1={seg.ax} y1={seg.ay}
              x2={seg.bx} y2={seg.by}
              stroke={seg.color}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          ))}

          {/* start dot */}
          {(() => {
            const [sx, sy] = leftPlot.toSVG(latent[0][0], latent[0][1])
            return <circle cx={sx} cy={sy} r={3} fill={BLUE} />
          })()}
        </g>

        <clipPath id="leftClip">
          <rect x={0} y={PANEL_Y} width={LEFT_W} height={PANEL_H} />
        </clipPath>

        {/* axis labels */}
        <text
          x={leftPlot.innerR - 2} y={leftPlot.oy - 5}
          textAnchor="end" fontSize={10}
          fontFamily={FONT} fill="#888"
        >x₁</text>
        <text
          x={leftPlot.ox + 4} y={leftPlot.innerT + 10}
          textAnchor="start" fontSize={10}
          fontFamily={FONT} fill="#888"
        >x₂</text>

        {/* panel label */}
        <text
          x={LEFT_W / 2} y={PANEL_Y - 6}
          textAnchor="middle" fontSize={11}
          fontFamily={FONT} fill="#555"
        >latent state</text>

        {/* ── Right panel: observed time series ── */}
        <g clipPath="url(#rightClip)">
          {rightPlot.traces.map((trace, i) => (
            <g key={i}>
              {/* trace background strip */}
              <rect
                x={RIGHT_X} y={trace.y0}
                width={RIGHT_W} height={trace.y1 - trace.y0}
                fill="none"
              />
              {/* baseline */}
              <line
                x1={RIGHT_X} y1={(trace.y0 + trace.y1) / 2}
                x2={RIGHT_X + RIGHT_W} y2={(trace.y0 + trace.y1) / 2}
                stroke="#e8e8e8" strokeWidth={0.5}
              />
              {/* trace */}
              <polyline
                points={pointsStr(trace.pts)}
                fill="none"
                stroke={trace.color}
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
            </g>
          ))}

          {/* latent overlay */}
          {latentOverlay && (
            <>
              <polyline
                points={pointsStr(latentOverlay.x1pts)}
                fill="none"
                stroke={BLUE}
                strokeWidth={2}
                strokeDasharray="4 3"
                strokeLinejoin="round"
              />
              <polyline
                points={pointsStr(latentOverlay.x2pts)}
                fill="none"
                stroke={RED}
                strokeWidth={2}
                strokeDasharray="4 3"
                strokeLinejoin="round"
              />
            </>
          )}
        </g>

        <clipPath id="rightClip">
          <rect x={RIGHT_X} y={PANEL_Y} width={RIGHT_W} height={PANEL_H} />
        </clipPath>

        {/* y-axis labels */}
        {rightPlot.traces.map((trace, i) => (
          <text
            key={i}
            x={RIGHT_X - 4}
            y={(trace.y0 + trace.y1) / 2 + 4}
            textAnchor="end"
            fontSize={10}
            fontFamily={FONT}
            fill="#777"
          >
            {`y${["₁","₂","₃","₄","₅","₆"][i]}`}
          </text>
        ))}

        {/* latent legend (shown when overlay active) */}
        {showLatent && (
          <g>
            <line
              x1={RIGHT_X + 6} y1={PANEL_Y + 10}
              x2={RIGHT_X + 20} y2={PANEL_Y + 10}
              stroke={BLUE} strokeWidth={2} strokeDasharray="4 3"
            />
            <text
              x={RIGHT_X + 24} y={PANEL_Y + 14}
              fontSize={10} fontFamily={FONT} fill={BLUE}
            >x₁</text>
            <line
              x1={RIGHT_X + 40} y1={PANEL_Y + 10}
              x2={RIGHT_X + 54} y2={PANEL_Y + 10}
              stroke={RED} strokeWidth={2} strokeDasharray="4 3"
            />
            <text
              x={RIGHT_X + 58} y={PANEL_Y + 14}
              fontSize={10} fontFamily={FONT} fill={RED}
            >x₂</text>
          </g>
        )}

        {/* right panel label */}
        <text
          x={RIGHT_X + RIGHT_W / 2} y={PANEL_Y - 6}
          textAnchor="middle" fontSize={11}
          fontFamily={FONT} fill="#555"
        >observed (y = Cx + noise)</text>

        {/* x-axis time labels on right panel */}
        <text
          x={RIGHT_X} y={PANEL_Y + PANEL_H + 14}
          textAnchor="middle" fontSize={9}
          fontFamily={FONT} fill="#aaa"
        >0</text>
        <text
          x={RIGHT_X + RIGHT_W} y={PANEL_Y + PANEL_H + 14}
          textAnchor="middle" fontSize={9}
          fontFamily={FONT} fill="#aaa"
        >100</text>
        <text
          x={RIGHT_X + RIGHT_W / 2} y={PANEL_Y + PANEL_H + 14}
          textAnchor="middle" fontSize={9}
          fontFamily={FONT} fill="#aaa"
        >t</text>
      </svg>

      <div className="blog-figure__controls" style={{ textAlign: "center", marginTop: 10 }}>
        <button
          onClick={() => setShowLatent(v => !v)}
          style={{
            fontFamily: FONT,
            fontSize: 12,
            padding: "4px 14px",
            borderRadius: 4,
            border: `1.5px solid ${showLatent ? BLUE : "#bbb"}`,
            background: showLatent ? "#eef2fa" : "#fafafa",
            color: showLatent ? BLUE : "#555",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {showLatent ? "hide latent" : "show latent"}
        </button>
      </div>
    </figure>
  )
}
