import React, { useState, useMemo } from "react"

const SIGMA = [8.2, 5.1, 3.4, 1.8, 0.9, 0.5, 0.3, 0.15]
const SIGMA_SQ = SIGMA.map(s => s * s)
const TOTAL_VARIANCE = SIGMA_SQ.reduce((a, b) => a + b, 0)

const W = 700
const H = 350
const N = SIGMA.length
const BAR_W = 50
const BAR_GAP = 10
const CHART_W = N * BAR_W + (N - 1) * BAR_GAP
const CHART_LEFT = (W - CHART_W) / 2
const BAR_BASELINE = 230
const BAR_MAX_H = 180
const SCALE = BAR_MAX_H / SIGMA[0]

const TEAL = "#4A7C6F"
const FADED = "rgba(0,0,0,0.1)"
const CUT_COLOR = "rgba(0,0,0,0.3)"
const PROGRESS_BG = "rgba(0,0,0,0.06)"

export default function LowRankApproximation() {
  const [k, setK] = useState(3)

  const pctCaptured = useMemo(() => {
    const kept = SIGMA_SQ.slice(0, k).reduce((a, b) => a + b, 0)
    return (kept / TOTAL_VARIANCE) * 100
  }, [k])

  const pctStr = pctCaptured.toFixed(1)
  const isHigh = pctCaptured > 80

  // Progress bar dimensions
  const progLeft = CHART_LEFT
  const progW = CHART_W
  const progY = BAR_BASELINE + 58
  const progH = 14

  // Cut line x position: between bar k-1 and bar k
  const cutX = CHART_LEFT + k * BAR_W + (k - 0.5) * BAR_GAP

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Bar chart */}
        {SIGMA.map((s, i) => {
          const barH = s * SCALE
          const x = CHART_LEFT + i * (BAR_W + BAR_GAP)
          const y = BAR_BASELINE - barH
          const kept = i < k

          return (
            <g
              key={i}
              style={{ cursor: "pointer" }}
              onClick={() => setK(i + 1)}
            >
              {/* Hit area for easier clicking */}
              <rect
                x={x - BAR_GAP / 2}
                y={BAR_BASELINE - BAR_MAX_H - 10}
                width={BAR_W + BAR_GAP}
                height={BAR_MAX_H + 30}
                fill="transparent"
              />

              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                fill={kept ? TEAL : FADED}
                rx={3}
                style={{ transition: "fill 0.2s ease" }}
              />

              {/* Value label on bar */}
              <text
                x={x + BAR_W / 2}
                y={y - 6}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  fill: kept ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)",
                  transition: "fill 0.2s ease",
                }}
              >
                {s}
              </text>

              {/* Sigma label below bar */}
              <text
                x={x + BAR_W / 2}
                y={BAR_BASELINE + 16}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  fill: kept ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.25)",
                  transition: "fill 0.2s ease",
                }}
              >
                σ{String.fromCharCode(0x2081 + i)}
              </text>
            </g>
          )
        })}

        {/* Cut line (dashed vertical between kept and discarded) */}
        {k < N && (
          <line
            x1={cutX}
            y1={BAR_BASELINE - BAR_MAX_H - 10}
            x2={cutX}
            y2={BAR_BASELINE + 22}
            stroke={CUT_COLOR}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            style={{ transition: "x1 0.2s ease, x2 0.2s ease" }}
          />
        )}

        {/* "keep" / "discard" labels */}
        {k < N && (
          <>
            <text
              x={CHART_LEFT + (k * (BAR_W + BAR_GAP) - BAR_GAP) / 2}
              y={BAR_BASELINE - BAR_MAX_H - 16}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                fill: TEAL,
                fontWeight: 600,
                letterSpacing: "0.03em",
              }}
            >
              keep
            </text>
            <text
              x={cutX + (CHART_LEFT + CHART_W - cutX) / 2}
              y={BAR_BASELINE - BAR_MAX_H - 16}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                fill: "rgba(0,0,0,0.3)",
                fontWeight: 600,
                letterSpacing: "0.03em",
              }}
            >
              discard
            </text>
          </>
        )}

        {/* Progress bar background */}
        <rect
          x={progLeft}
          y={progY}
          width={progW}
          height={progH}
          rx={progH / 2}
          fill={PROGRESS_BG}
        />

        {/* Progress bar fill */}
        <rect
          x={progLeft}
          y={progY}
          width={Math.max(0, (pctCaptured / 100) * progW)}
          height={progH}
          rx={progH / 2}
          fill={TEAL}
          opacity={0.8}
          style={{ transition: "width 0.25s ease" }}
        />

        {/* % captured readout */}
        <text
          x={W / 2}
          y={progY + progH + 22}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 15,
            fontWeight: 700,
            fill: isHigh ? TEAL : "rgba(0,0,0,0.5)",
            transition: "fill 0.2s ease",
          }}
        >
          {pctStr}% variance captured
        </text>

        {/* Annotation */}
        <text
          x={W / 2}
          y={progY + progH + 42}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            fill: "rgba(0,0,0,0.35)",
          }}
        >
          rank-{k} approximation captures {pctStr}% of total variance
        </text>
      </svg>

      {/* Slider control */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 4,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 12,
          color: "#666",
        }}
      >
        <label
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          Components kept: <strong style={{ color: TEAL }}>{k}</strong>
          <input
            type="range"
            min={1}
            max={N}
            step={1}
            value={k}
            onChange={e => setK(Number(e.target.value))}
            className="dim-explorer__range"
            style={{ width: 180 }}
          />
        </label>
      </div>
    </div>
  )
}
