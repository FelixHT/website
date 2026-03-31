import React, { useState, useMemo } from "react"

/* ─── Data ─── */
const SIGMAS = [5.0, 3.2, 2.1, 1.4, 0.8, 0.3, 0.1, 0.02]
const N = SIGMAS.length

/* ─── Layout ─── */
const W = 600
const H = 350
const FONT = "var(--font-mono, monospace)"

/* ─── Chart area ─── */
const MARGIN = { top: 32, right: 56, bottom: 52, left: 48 }
const CHART_W = W - MARGIN.left - MARGIN.right
const CHART_H = H - MARGIN.top - MARGIN.bottom

/* ─── Bar geometry ─── */
const BAR_GAP = 8
const BAR_W = (CHART_W - (N - 1) * BAR_GAP) / N

/* ─── Colors ─── */
const RED = "#c0503a"
const TEAL = "#4A7C6F"
const WEIGHT_CAP = 15

/* ─── Scale helpers ─── */
// Left axis: singular values, 0 → max(SIGMAS)
const BAR_MAX = SIGMAS[0]
function barY(val) {
  return MARGIN.top + CHART_H - (val / BAR_MAX) * CHART_H
}
function barH(val) {
  return (val / BAR_MAX) * CHART_H
}

// Right axis: filter weights, 0 → WEIGHT_CAP
function weightY(w) {
  const clamped = Math.min(w, WEIGHT_CAP)
  return MARGIN.top + CHART_H - (clamped / WEIGHT_CAP) * CHART_H
}

// X centre of bar i
function barCX(i) {
  return MARGIN.left + i * (BAR_W + BAR_GAP) + BAR_W / 2
}

/* ─── Left axis ticks ─── */
const LEFT_TICKS = [0, 1, 2, 3, 4, 5]
/* ─── Right axis ticks ─── */
const RIGHT_TICKS = [0, 3, 6, 9, 12, 15]

export default function ShrinkageExplorer() {
  const [lambda, setLambda] = useState(0.5)

  const { pseudoWeights, ridgeWeights, pseudoClipped } = useMemo(() => {
    const pseudoWeights = SIGMAS.map((s) => 1 / s)
    const ridgeWeights = SIGMAS.map((s) => s / (s * s + lambda))
    const pseudoClipped = pseudoWeights.map((w) => w > WEIGHT_CAP)
    return { pseudoWeights, ridgeWeights, pseudoClipped }
  }, [lambda])

  /* ─── Build polyline points ─── */
  const pseudoPoints = SIGMAS.map((_, i) => {
    const cx = barCX(i)
    const y = weightY(pseudoWeights[i])
    return `${cx},${y}`
  }).join(" ")

  const ridgePoints = SIGMAS.map((_, i) => {
    const cx = barCX(i)
    const y = weightY(ridgeWeights[i])
    return `${cx},${y}`
  }).join(" ")

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* ── Background ── */}
        <rect x="0" y="0" width={W} height={H} fill="transparent" />

        {/* ── Horizontal grid lines (left axis) ── */}
        {LEFT_TICKS.map((v) => {
          const y = barY(v)
          return (
            <line
              key={v}
              x1={MARGIN.left}
              y1={y}
              x2={MARGIN.left + CHART_W}
              y2={y}
              stroke="rgba(0,0,0,0.07)"
              strokeWidth="1"
            />
          )
        })}

        {/* ── Bars ── */}
        {SIGMAS.map((s, i) => {
          const x = MARGIN.left + i * (BAR_W + BAR_GAP)
          const y = barY(s)
          const h = barH(s)
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={BAR_W}
              height={h}
              fill="#ddd"
              stroke="#999"
              strokeWidth="0.8"
            />
          )
        })}

        {/* ── Pseudoinverse polyline ── */}
        <polyline
          points={pseudoPoints}
          fill="none"
          stroke={RED}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {SIGMAS.map((_, i) => {
          const cx = barCX(i)
          const clipped = pseudoClipped[i]
          const cy = weightY(pseudoWeights[i])
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3" fill={RED} />
              {/* Arrow indicator for clipped values */}
              {clipped && (
                <g>
                  {/* Up-arrow triangle above the top of the chart */}
                  <polygon
                    points={`${cx},${MARGIN.top - 4} ${cx - 5},${MARGIN.top + 7} ${cx + 5},${MARGIN.top + 7}`}
                    fill={RED}
                    opacity="0.75"
                  />
                </g>
              )}
            </g>
          )
        })}

        {/* ── Ridge polyline ── */}
        <polyline
          points={ridgePoints}
          fill="none"
          stroke={TEAL}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {SIGMAS.map((_, i) => {
          const cx = barCX(i)
          const cy = weightY(ridgeWeights[i])
          return <circle key={i} cx={cx} cy={cy} r="3" fill={TEAL} />
        })}

        {/* ── Left axis ── */}
        <line
          x1={MARGIN.left}
          y1={MARGIN.top}
          x2={MARGIN.left}
          y2={MARGIN.top + CHART_H}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1"
        />
        {LEFT_TICKS.map((v) => {
          const y = barY(v)
          return (
            <g key={v}>
              <line
                x1={MARGIN.left - 4}
                y1={y}
                x2={MARGIN.left}
                y2={y}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="1"
              />
              <text
                x={MARGIN.left - 7}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fontFamily={FONT}
                fill="rgba(0,0,0,0.5)"
              >
                {v}
              </text>
            </g>
          )
        })}

        {/* Left axis label */}
        <text
          x={14}
          y={MARGIN.top + CHART_H / 2}
          textAnchor="middle"
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.45)"
          transform={`rotate(-90, 14, ${MARGIN.top + CHART_H / 2})`}
        >
          singular value σᵢ
        </text>

        {/* ── Right axis ── */}
        <line
          x1={MARGIN.left + CHART_W}
          y1={MARGIN.top}
          x2={MARGIN.left + CHART_W}
          y2={MARGIN.top + CHART_H}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1"
        />
        {RIGHT_TICKS.map((v) => {
          const y = weightY(v)
          return (
            <g key={v}>
              <line
                x1={MARGIN.left + CHART_W}
                y1={y}
                x2={MARGIN.left + CHART_W + 4}
                y2={y}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="1"
              />
              <text
                x={MARGIN.left + CHART_W + 7}
                y={y + 4}
                textAnchor="start"
                fontSize="10"
                fontFamily={FONT}
                fill="rgba(0,0,0,0.45)"
              >
                {v}
              </text>
            </g>
          )
        })}

        {/* Right axis label */}
        <text
          x={W - 10}
          y={MARGIN.top + CHART_H / 2}
          textAnchor="middle"
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
          transform={`rotate(90, ${W - 10}, ${MARGIN.top + CHART_H / 2})`}
        >
          filter weight
        </text>

        {/* ── Baseline ── */}
        <line
          x1={MARGIN.left}
          y1={MARGIN.top + CHART_H}
          x2={MARGIN.left + CHART_W}
          y2={MARGIN.top + CHART_H}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1"
        />

        {/* ── X-axis bar labels (σᵢ values) ── */}
        {SIGMAS.map((s, i) => {
          const cx = barCX(i)
          return (
            <text
              key={i}
              x={cx}
              y={MARGIN.top + CHART_H + 13}
              textAnchor="middle"
              fontSize="9"
              fontFamily={FONT}
              fill="rgba(0,0,0,0.5)"
            >
              {s}
            </text>
          )
        })}

        {/* X-axis subscript labels */}
        {SIGMAS.map((_, i) => {
          const cx = barCX(i)
          return (
            <text
              key={i}
              x={cx}
              y={MARGIN.top + CHART_H + 25}
              textAnchor="middle"
              fontSize="9"
              fontFamily={FONT}
              fill="rgba(0,0,0,0.4)"
            >
              {`σ${String.fromCharCode(0x2081 + i)}`}
            </text>
          )
        })}

        {/* ── Legend (top-right) ── */}
        <g>
          {/* Pseudoinverse legend entry */}
          <line
            x1={MARGIN.left + CHART_W - 130}
            y1={MARGIN.top + 10}
            x2={MARGIN.left + CHART_W - 112}
            y2={MARGIN.top + 10}
            stroke={RED}
            strokeWidth="1.5"
          />
          <circle
            cx={MARGIN.left + CHART_W - 121}
            cy={MARGIN.top + 10}
            r="2.5"
            fill={RED}
          />
          <text
            x={MARGIN.left + CHART_W - 108}
            y={MARGIN.top + 14}
            fontSize="10"
            fontFamily={FONT}
            fill={RED}
          >
            1/σᵢ (pinv)
          </text>

          {/* Ridge legend entry */}
          <line
            x1={MARGIN.left + CHART_W - 130}
            y1={MARGIN.top + 26}
            x2={MARGIN.left + CHART_W - 112}
            y2={MARGIN.top + 26}
            stroke={TEAL}
            strokeWidth="2"
          />
          <circle
            cx={MARGIN.left + CHART_W - 121}
            cy={MARGIN.top + 26}
            r="2.5"
            fill={TEAL}
          />
          <text
            x={MARGIN.left + CHART_W - 108}
            y={MARGIN.top + 30}
            fontSize="10"
            fontFamily={FONT}
            fill={TEAL}
          >
            σᵢ/(σᵢ²+λ)
          </text>
        </g>

        {/* ── Clip cap annotation ── */}
        <text
          x={MARGIN.left + 4}
          y={MARGIN.top - 10}
          fontSize="9"
          fontFamily={FONT}
          fill={RED}
          opacity="0.65"
        >
          ▲ clipped ({">"}{WEIGHT_CAP})
        </text>
      </svg>

      {/* ── Lambda slider ── */}
      <div className="blog-figure__controls">
        <label
          style={{
            fontFamily: FONT,
            fontSize: "13px",
            color: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          λ = {lambda.toFixed(2)}
          <input
            type="range"
            min="0.01"
            max="3"
            step="0.01"
            value={lambda}
            onChange={(e) => setLambda(parseFloat(e.target.value))}
            style={{ width: "180px" }}
          />
        </label>
      </div>
    </div>
  )
}
