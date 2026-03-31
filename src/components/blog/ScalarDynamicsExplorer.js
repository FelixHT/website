import React, { useState, useMemo } from "react"

const WIDTH = 600
const HEIGHT = 280
const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 }
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom

const T_MAX = 40
const TEAL = "#4A7C6F"

export default function ScalarDynamicsExplorer() {
  const [lambda, setLambda] = useState(0.95)

  const { trajectory, yMin, yMax, tau } = useMemo(() => {
    const pts = []
    for (let t = 0; t <= T_MAX; t++) {
      pts.push(Math.pow(lambda, t))
    }

    const rawMax = Math.max(...pts)
    const cappedMax = Math.min(rawMax, 5)
    const yMax = Math.max(2.0, cappedMax)
    const yMin = -0.2

    let tau
    if (Math.abs(lambda) >= 1) {
      tau = "∞"
    } else {
      const raw = -1 / Math.log(Math.abs(lambda))
      tau = raw.toFixed(1)
    }

    return { trajectory: pts, yMin, yMax, tau }
  }, [lambda])

  function toSvgX(t) {
    return MARGIN.left + (t / T_MAX) * PLOT_W
  }

  function toSvgY(x) {
    const clamped = Math.min(Math.max(x, yMin), yMax)
    return MARGIN.top + PLOT_H - ((clamped - yMin) / (yMax - yMin)) * PLOT_H
  }

  const points = trajectory.map((val, t) => ({ t, val, cx: toSvgX(t), cy: toSvgY(val) }))

  const polyline = points
    .map(p => `${p.cx},${p.cy}`)
    .join(" ")

  const xTicks = []
  for (let t = 0; t <= T_MAX; t += 10) {
    xTicks.push(t)
  }

  const yTicks = []
  const yStep = 0.5
  const yStart = Math.ceil(yMin / yStep) * yStep
  for (let y = yStart; y <= yMax + 0.001; y += yStep) {
    yTicks.push(parseFloat(y.toFixed(2)))
  }

  const axisColor = "rgba(0,0,0,0.15)"
  const fontStyle = { fontFamily: "var(--font-mono, monospace)", fontSize: 11 }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <svg
        width={WIDTH}
        height={HEIGHT}
        style={{ maxWidth: "100%", overflow: "visible" }}
        aria-label="Scalar dynamics explorer: trajectory of x_t = lambda^t"
      >
        {/* Axes */}
        <line
          x1={MARGIN.left} y1={MARGIN.top}
          x2={MARGIN.left} y2={MARGIN.top + PLOT_H}
          stroke={axisColor} strokeWidth={1}
        />
        <line
          x1={MARGIN.left} y1={MARGIN.top + PLOT_H}
          x2={MARGIN.left + PLOT_W} y2={MARGIN.top + PLOT_H}
          stroke={axisColor} strokeWidth={1}
        />

        {/* X ticks */}
        {xTicks.map(t => {
          const x = toSvgX(t)
          const y = MARGIN.top + PLOT_H
          return (
            <g key={t}>
              <line x1={x} y1={y} x2={x} y2={y + 5} stroke={axisColor} strokeWidth={1} />
              <text
                x={x} y={y + 16}
                textAnchor="middle"
                fill="rgba(0,0,0,0.45)"
                style={fontStyle}
              >
                {t}
              </text>
            </g>
          )
        })}

        {/* X axis label */}
        <text
          x={MARGIN.left + PLOT_W / 2}
          y={HEIGHT - 4}
          textAnchor="middle"
          fill="rgba(0,0,0,0.45)"
          style={fontStyle}
        >
          time step t
        </text>

        {/* Y ticks */}
        {yTicks.map(y => {
          const svgY = toSvgY(y)
          return (
            <g key={y}>
              <line
                x1={MARGIN.left - 5} y1={svgY}
                x2={MARGIN.left} y2={svgY}
                stroke={axisColor} strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8} y={svgY + 4}
                textAnchor="end"
                fill="rgba(0,0,0,0.45)"
                style={fontStyle}
              >
                {y % 1 === 0 ? y.toFixed(0) : y.toFixed(1)}
              </text>
              {/* Grid line */}
              <line
                x1={MARGIN.left} y1={svgY}
                x2={MARGIN.left + PLOT_W} y2={svgY}
                stroke={axisColor} strokeWidth={0.5} strokeDasharray="3,4"
              />
            </g>
          )
        })}

        {/* Dashed zero line */}
        <line
          x1={MARGIN.left} y1={toSvgY(0)}
          x2={MARGIN.left + PLOT_W} y2={toSvgY(0)}
          stroke="rgba(0,0,0,0.25)" strokeWidth={1} strokeDasharray="5,4"
        />

        {/* Clip path to keep trajectory inside plot area */}
        <defs>
          <clipPath id="scalar-plot-clip">
            <rect
              x={MARGIN.left} y={MARGIN.top}
              width={PLOT_W} height={PLOT_H}
            />
          </clipPath>
        </defs>

        {/* Trajectory polyline */}
        <g clipPath="url(#scalar-plot-clip)">
          <polyline
            points={polyline}
            fill="none"
            stroke={TEAL}
            strokeWidth={1.5}
          />
          {points.map(p => (
            <circle
              key={p.t}
              cx={p.cx}
              cy={p.cy}
              r={2.5}
              fill={TEAL}
            />
          ))}
        </g>

        {/* Lambda / tau annotation */}
        <text
          x={MARGIN.left + PLOT_W - 4}
          y={MARGIN.top + 16}
          textAnchor="end"
          fill={TEAL}
          style={{ ...fontStyle, fontSize: 12, fontWeight: 600 }}
        >
          {`λ = ${lambda.toFixed(2)}   τ = ${tau} steps`}
        </text>
      </svg>

      {/* Controls */}
      <div
        className="blog-figure__controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginTop: "0.5rem",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 13,
        }}
      >
        <label htmlFor="lambda-slider" style={{ color: "rgba(0,0,0,0.6)" }}>
          λ
        </label>
        <input
          id="lambda-slider"
          type="range"
          min={0.5}
          max={1.1}
          step={0.01}
          value={lambda}
          onChange={e => setLambda(parseFloat(e.target.value))}
          style={{ width: 200 }}
        />
        <span style={{ color: "rgba(0,0,0,0.55)", minWidth: "6ch" }}>
          {lambda.toFixed(2)}
        </span>
        <span style={{ color: "rgba(0,0,0,0.35)", fontSize: 11 }}>
          {lambda < 1 ? "decaying" : lambda === 1 ? "stable" : "growing"}
        </span>
      </div>
    </div>
  )
}
