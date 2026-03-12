import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace, crossValidatePSID, mulberry32, seededRandn } from "./psid-math"

const W = 680
const H = 300
const PAD = { top: 25, right: 30, bottom: 45, left: 55 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom
const T_STEPS = 500
const MAX_REL_DIM = 5
const TOTAL_DIM = 3
const NUM_LAGS = 8
const N_FOLDS = 3
const COLOR_REAL = "#D4783C"
const COLOR_NULL = "#999999"

export default function PSIDValidation() {
  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)
  const [seed, setSeed] = useState(1)

  const runCV = useCallback(() => {
    setRunning(true)
    // Defer to next frame so the UI updates
    requestAnimationFrame(() => {
      const sys = defaultSystem()

      // Real data: behavior depends on neural state
      const simReal = simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
      const cvReal = crossValidatePSID(
        simReal.Y, simReal.Z, MAX_REL_DIM, TOTAL_DIM, NUM_LAGS, N_FOLDS
      )

      // Null data: behavior is independent of neural activity
      const rng = mulberry32(seed + 999)
      const Znull = seededRandn(T_STEPS, 1, rng)
      const cvNull = crossValidatePSID(
        simReal.Y, Znull, MAX_REL_DIM, TOTAL_DIM, NUM_LAGS, N_FOLDS
      )

      setResults({ real: cvReal, null: cvNull })
      setRunning(false)
    })
  }, [seed])

  const handleRegenerate = useCallback(() => {
    setSeed(s => s + 1)
    setResults(null)
  }, [])

  // Scales
  const sx = useMemo(
    () => scaleLinear().domain([0, MAX_REL_DIM]).range([0, PLOT_W]),
    []
  )
  const sy = useMemo(
    () => scaleLinear().domain([-0.15, 1.05]).range([PLOT_H, 0]),
    []
  )

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        <g transform={`translate(${PAD.left}, ${PAD.top})`}>
          {/* Background */}
          <rect x={0} y={0} width={PLOT_W} height={PLOT_H} fill="none" rx={3} />

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map(v => (
            <g key={v}>
              <line x1={0} y1={sy(v)} x2={PLOT_W} y2={sy(v)} stroke="#e8e8e4" strokeWidth={0.5} />
              <text
                x={-8} y={sy(v)}
                textAnchor="end" dominantBaseline="middle"
                style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#999" }}
              >
                {v.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Zero line */}
          <line x1={0} y1={sy(0)} x2={PLOT_W} y2={sy(0)} stroke="#ccc" strokeWidth={1} />

          {/* X axis ticks */}
          {Array.from({ length: MAX_REL_DIM + 1 }, (_, i) => (
            <g key={i}>
              <line x1={sx(i)} y1={PLOT_H} x2={sx(i)} y2={PLOT_H + 5} stroke="#ccc" strokeWidth={1} />
              <text
                x={sx(i)} y={PLOT_H + 18}
                textAnchor="middle"
                style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
              >
                {i}
              </text>
            </g>
          ))}

          {/* Results curves */}
          {results && (
            <>
              {/* Real data curve */}
              <path
                d={results.real.dims.map((d, i) =>
                  `${i === 0 ? "M" : "L"}${sx(d)},${sy(results.real.r2scores[i])}`
                ).join(" ")}
                fill="none" stroke={COLOR_REAL} strokeWidth={2}
              />
              {results.real.dims.map((d, i) => (
                <circle key={`r-${i}`}
                  cx={sx(d)} cy={sy(results.real.r2scores[i])}
                  r={4} fill={COLOR_REAL}
                />
              ))}

              {/* Null data curve */}
              <path
                d={results.null.dims.map((d, i) =>
                  `${i === 0 ? "M" : "L"}${sx(d)},${sy(results.null.r2scores[i])}`
                ).join(" ")}
                fill="none" stroke={COLOR_NULL} strokeWidth={2} strokeDasharray="6 4"
              />
              {results.null.dims.map((d, i) => (
                <circle key={`n-${i}`}
                  cx={sx(d)} cy={sy(results.null.r2scores[i])}
                  r={4} fill={COLOR_NULL}
                />
              ))}

              {/* True dim annotation */}
              <line x1={sx(2)} y1={0} x2={sx(2)} y2={PLOT_H}
                stroke={COLOR_REAL} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
              <text
                x={sx(2) + 4} y={12}
                style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: COLOR_REAL }}
              >
                true = 2
              </text>
            </>
          )}

          {/* Placeholder text when not run */}
          {!results && !running && (
            <text
              x={PLOT_W / 2} y={PLOT_H / 2}
              textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 13, fill: "#bbb" }}
            >
              Click "Run cross-validation" to compute
            </text>
          )}
          {running && (
            <text
              x={PLOT_W / 2} y={PLOT_H / 2}
              textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 13, fill: "#999" }}
            >
              Computing...
            </text>
          )}

          {/* Axis labels */}
          <text
            x={PLOT_W / 2} y={PLOT_H + 34}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
          >
            Specified relevant dimensionality
          </text>
          <text
            x={-40} y={PLOT_H / 2}
            textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(-90, -40, ${PLOT_H / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
          >
            Cross-validated R²
          </text>

          {/* Legend */}
          {results && (
            <g transform={`translate(${PLOT_W - 200}, ${PLOT_H - 40})`}>
              <line x1={0} y1={0} x2={20} y2={0} stroke={COLOR_REAL} strokeWidth={2} />
              <text x={24} y={4} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#555" }}>
                Real behavior
              </text>
              <line x1={0} y1={18} x2={20} y2={18} stroke={COLOR_NULL} strokeWidth={2} strokeDasharray="6 4" />
              <text x={24} y={22} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#555" }}>
                Independent behavior
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* Controls */}
      <div style={{ display: "flex", gap: "12px", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12 }}>
        <button
          onClick={runCV}
          disabled={running}
          style={{
            padding: "5px 16px", cursor: running ? "wait" : "pointer",
            background: running ? "#e8e8e4" : COLOR_REAL, color: "#fff",
            border: "none", borderRadius: 4,
            fontFamily: "var(--font-mono)", fontSize: 12,
            opacity: running ? 0.7 : 1,
          }}
        >
          {running ? "Computing..." : "Run cross-validation"}
        </button>
        <button
          onClick={handleRegenerate}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
            background: "#f4f3f0", border: "1px solid #ccc9c2", borderRadius: 4,
            padding: "4px 14px", color: "#555",
          }}
        >
          Regenerate
        </button>
      </div>
    </div>
  )
}
