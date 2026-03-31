import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 480
const H = 440
const CX = W / 2
const CY = H / 2 - 10
const UNIT = 140

const TEAL = "#4A7C6F"
const FONT = "var(--font-mono, monospace)"

/* ─── Build the Lp unit ball path ─── */
function buildPath(p, steps = 400) {
  const pts = []
  const exp = 2 / Math.min(p, 60)
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI
    const ct = Math.cos(t)
    const st = Math.sin(t)
    const x = Math.sign(ct) * Math.pow(Math.abs(ct) + 1e-12, exp)
    const y = Math.sign(st) * Math.pow(Math.abs(st) + 1e-12, exp)
    pts.push([CX + x * UNIT, CY - y * UNIT])
  }
  return (
    pts
      .map(
        ([x, y], i) =>
          `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
      )
      .join(" ") + " Z"
  )
}

const PRESETS = [
  { value: 0.5, label: "½" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 20, label: "\u221E" },
]

export default function NormBallExplorer() {
  const [p, setP] = useState(2)

  const path = useMemo(() => buildPath(p), [p])

  const pLabel =
    p >= 20 ? "\u221E" : p % 1 === 0 ? String(p) : p.toFixed(1)
  const normName =
    p === 1
      ? "Manhattan"
      : p === 2
      ? "Euclidean"
      : p >= 20
      ? "Chebyshev"
      : ""

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto" }}
      >
        {/* L² reference circle (dashed, when p ≠ 2) */}
        {Math.abs(p - 2) > 0.05 && (
          <circle
            cx={CX}
            cy={CY}
            r={UNIT}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeDasharray="4,3"
          />
        )}

        {/* Axes */}
        <line
          x1={24}
          y1={CY}
          x2={W - 24}
          y2={CY}
          stroke="rgba(0,0,0,0.08)"
        />
        <line
          x1={CX}
          y1={24}
          x2={CX}
          y2={H - 30}
          stroke="rgba(0,0,0,0.08)"
        />

        {/* Tick marks and labels */}
        {[-1, 1].map((v) => (
          <React.Fragment key={v}>
            <line
              x1={CX + v * UNIT}
              y1={CY - 4}
              x2={CX + v * UNIT}
              y2={CY + 4}
              stroke="rgba(0,0,0,0.15)"
            />
            <line
              x1={CX - 4}
              y1={CY - v * UNIT}
              x2={CX + 4}
              y2={CY - v * UNIT}
              stroke="rgba(0,0,0,0.15)"
            />
            <text
              x={CX + v * UNIT}
              y={CY + 18}
              textAnchor="middle"
              fontSize="10"
              fontFamily={FONT}
              fill="rgba(0,0,0,0.3)"
            >
              {v}
            </text>
            <text
              x={CX - 10}
              y={CY - v * UNIT + 4}
              textAnchor="end"
              fontSize="10"
              fontFamily={FONT}
              fill="rgba(0,0,0,0.3)"
            >
              {v}
            </text>
          </React.Fragment>
        ))}

        {/* Lp unit ball */}
        <path
          d={path}
          fill="rgba(74,124,111,0.1)"
          stroke={TEAL}
          strokeWidth="2"
        />

        {/* Label */}
        <text
          x={W - 16}
          y={32}
          textAnchor="end"
          fontSize="14"
          fontFamily={FONT}
          fill={TEAL}
          fontWeight="600"
        >
          p = {pLabel}
        </text>
        {normName && (
          <text
            x={W - 16}
            y={50}
            textAnchor="end"
            fontSize="11"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.3)"
          >
            {normName}
          </text>
        )}
      </svg>

      {/* Controls */}
      <div
        className="dim-explorer__controls"
        style={{ justifyContent: "center", gap: "1.5rem" }}
      >
        <div className="dim-explorer__slider" style={{ maxWidth: 260 }}>
          <label className="dim-explorer__label">
            p = <strong>{pLabel}</strong>
          </label>
          <input
            className="dim-explorer__range"
            type="range"
            min="0.5"
            max="20"
            step="0.1"
            value={p}
            onChange={(e) => setP(parseFloat(e.target.value))}
          />
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {PRESETS.map(({ value, label }) => (
            <button
              key={value}
              className="blog-figure__button"
              style={
                Math.abs(p - value) < 0.05
                  ? { borderColor: TEAL, color: TEAL }
                  : {}
              }
              onClick={() => setP(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
