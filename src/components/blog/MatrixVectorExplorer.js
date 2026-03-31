import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 700
const H = 420
const CX = W / 2
const CY = H / 2
const SCALE = 55

/* ─── Colors ─── */
const COL1 = "#3d6cb9"
const COL2 = "#4A7C6F"
const COL3 = "#c0503a"
const OUTPUT_COLOR = "#1a1a1a"
const FONT = "var(--font-mono, monospace)"

/* ─── Column vectors of A ─── */
const A1 = [2, -0.7]
const A2 = [0.7, 2.5]
const A3 = [-1.5, 0.7]

const COLUMNS = [
  { vec: A1, color: COL1, label: "a\u2081" },
  { vec: A2, color: COL2, label: "a\u2082" },
  { vec: A3, color: COL3, label: "a\u2083" },
]

/* ─── Coordinate transform ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

/* ─── Reusable slider ─── */
function Slider({ label, subscript, value, color, onChange }) {
  return (
    <div className="dim-explorer__slider">
      <label className="dim-explorer__label">
        {label}
        <sub>{subscript}</sub> ={" "}
        <strong style={{ color }}>{value.toFixed(2)}</strong>
      </label>
      <input
        type="range"
        min={-2}
        max={2}
        step={0.01}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="dim-explorer__range"
        style={{ accentColor: color }}
      />
    </div>
  )
}

export default function MatrixVectorExplorer() {
  const [x1, setX1] = useState(1)
  const [x2, setX2] = useState(0.5)
  const [x3, setX3] = useState(-0.5)

  const weights = [x1, x2, x3]

  /* ─── Tip-to-tail chain and output ─── */
  const { chain, output } = useMemo(() => {
    const pts = [[0, 0]]
    for (let i = 0; i < 3; i++) {
      const prev = pts[pts.length - 1]
      pts.push([
        prev[0] + weights[i] * COLUMNS[i].vec[0],
        prev[1] + weights[i] * COLUMNS[i].vec[1],
      ])
    }
    return { chain: pts, output: pts[pts.length - 1] }
  }, [x1, x2, x3])

  /* ─── SVG positions for chain ─── */
  const chainSVG = chain.map(([x, y]) => toSVG(x, y))
  const outputSVG = toSVG(output[0], output[1])
  const originSVG = toSVG(0, 0)

  /* ─── Faint column vector endpoints (unscaled, from origin) ─── */
  const colSVG = COLUMNS.map(c => toSVG(c.vec[0], c.vec[1]))

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          userSelect: "none",
        }}
      >
        <defs>
          {/* Arrowhead markers for each column color */}
          {COLUMNS.map((c, i) => (
            <marker
              key={`col-${i}`}
              id={`mv-col-${i}`}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill={c.color} />
            </marker>
          ))}
          {/* Faded column markers */}
          {COLUMNS.map((c, i) => (
            <marker
              key={`faint-${i}`}
              id={`mv-faint-${i}`}
              markerWidth="7"
              markerHeight="5"
              refX="6"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 7 2.5, 0 5" fill={c.color} opacity="0.25" />
            </marker>
          ))}
          {/* Output vector marker */}
          <marker
            id="mv-output"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={OUTPUT_COLOR} />
          </marker>
        </defs>

        {/* Axes */}
        <line
          x1={0}
          y1={CY}
          x2={W}
          y2={CY}
          stroke="rgba(0,0,0,0.06)"
        />
        <line
          x1={CX}
          y1={0}
          x2={CX}
          y2={H}
          stroke="rgba(0,0,0,0.06)"
        />

        {/* Faint column vectors (unscaled, from origin) */}
        {COLUMNS.map((c, i) => (
          <g key={`faint-col-${i}`}>
            <line
              x1={originSVG[0]}
              y1={originSVG[1]}
              x2={colSVG[i][0]}
              y2={colSVG[i][1]}
              stroke={c.color}
              strokeWidth="1.5"
              opacity="0.18"
              markerEnd={`url(#mv-faint-${i})`}
            />
            <text
              x={colSVG[i][0] + 8}
              y={colSVG[i][1] - 6}
              fontSize="12"
              fontFamily={FONT}
              fill={c.color}
              opacity="0.35"
            >
              {c.label}
            </text>
          </g>
        ))}

        {/* Tip-to-tail scaled column vectors */}
        {COLUMNS.map((c, i) => {
          const from = chainSVG[i]
          const to = chainSVG[i + 1]
          const dx = to[0] - from[0]
          const dy = to[1] - from[1]
          const len = Math.hypot(dx, dy)
          if (len < 0.5) return null

          /* Label placement: offset perpendicular to the vector */
          const mx = (from[0] + to[0]) / 2
          const my = (from[1] + to[1]) / 2
          const nx = -dy / len
          const ny = dx / len
          const labelOffset = 14

          return (
            <g key={`chain-${i}`}>
              <line
                x1={from[0]}
                y1={from[1]}
                x2={to[0]}
                y2={to[1]}
                stroke={c.color}
                strokeWidth="2"
                opacity="0.7"
                markerEnd={`url(#mv-col-${i})`}
              />
              <text
                x={mx + nx * labelOffset}
                y={my + ny * labelOffset}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fontFamily={FONT}
                fill={c.color}
                opacity="0.8"
              >
                {`x${"\u2081\u2082\u2083"[i]}${c.label}`}
              </text>
            </g>
          )
        })}

        {/* Output vector y = Ax */}
        {Math.hypot(output[0], output[1]) > 0.01 && (
          <line
            x1={originSVG[0]}
            y1={originSVG[1]}
            x2={outputSVG[0]}
            y2={outputSVG[1]}
            stroke={OUTPUT_COLOR}
            strokeWidth="3"
            markerEnd="url(#mv-output)"
          />
        )}

        {/* Output label */}
        <text
          x={outputSVG[0] + 10}
          y={outputSVG[1] - 10}
          fontSize="14"
          fontFamily={FONT}
          fill={OUTPUT_COLOR}
          fontWeight="700"
        >
          y
        </text>

        {/* Origin dot */}
        <circle
          cx={originSVG[0]}
          cy={originSVG[1]}
          r="3"
          fill="rgba(0,0,0,0.25)"
        />

        {/* Output coordinates readout */}
        <text
          x={W - 16}
          y={28}
          textAnchor="end"
          fontSize="13"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.5)"
        >
          {"y = (" + output[0].toFixed(2) + ", " + output[1].toFixed(2) + ")"}
        </text>
      </svg>

      <div className="dim-explorer__controls">
        <Slider
          label="x"
          subscript="1"
          value={x1}
          color={COL1}
          onChange={setX1}
        />
        <Slider
          label="x"
          subscript="2"
          value={x2}
          color={COL2}
          onChange={setX2}
        />
        <Slider
          label="x"
          subscript="3"
          value={x3}
          color={COL3}
          onChange={setX3}
        />
      </div>
    </div>
  )
}
