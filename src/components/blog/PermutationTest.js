import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { generalCCA, generateStructuredData } from "./cca-math"

const W = 680
const H = 280
const PAD = { top: 20, right: 30, bottom: 40, left: 50 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const N = 100
const P = 5
const Q = 5
const TRUE_CORRS = [0.85, 0.6]
const N_PERMS = 200
const N_BINS = 30

function shuffleRows(Y) {
  const n = Y.length
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp
  }
  return idx.map(i => Y[i])
}

export default function PermutationTest() {
  const [nullDist, setNullDist] = useState(null)
  const [running, setRunning] = useState(false)
  const [seed, setSeed] = useState(0)

  const { data, realCorrs } = useMemo(() => {
    const d = generateStructuredData(N, P, Q, TRUE_CORRS)
    const r = generalCCA(d.X, d.Y)
    return { data: d, realCorrs: r.correlations }
  }, [seed])

  const runTest = useCallback(() => {
    setRunning(true)
    // Use setTimeout to let the UI update before the heavy computation
    setTimeout(() => {
      const nullFirstCorrs = new Array(N_PERMS)
      for (let i = 0; i < N_PERMS; i++) {
        const Yshuf = shuffleRows(data.Y)
        const r = generalCCA(data.X, Yshuf)
        nullFirstCorrs[i] = r.correlations[0]
      }
      nullFirstCorrs.sort((a, b) => a - b)
      setNullDist(nullFirstCorrs)
      setRunning(false)
    }, 10)
  }, [data])

  const regenerate = useCallback(() => {
    setNullDist(null)
    setSeed(s => s + 1)
  }, [])

  // Histogram of null distribution
  const histData = useMemo(() => {
    if (!nullDist) return null
    const mn = 0, mx = 1
    const binW = (mx - mn) / N_BINS
    const bins = new Array(N_BINS).fill(0)
    for (const v of nullDist) {
      const idx = Math.min(N_BINS - 1, Math.max(0, Math.floor((v - mn) / binW)))
      bins[idx]++
    }
    return { bins, binWidth: binW, min: mn, max: mx }
  }, [nullDist])

  const p95 = nullDist ? nullDist[Math.floor(N_PERMS * 0.95)] : null

  const xScale = scaleLinear().domain([0, 1]).range([0, PLOT_W])
  const maxBin = histData ? Math.max(...histData.bins) : 1
  const yScale = scaleLinear().domain([0, maxBin * 1.15]).range([PLOT_H, 0])

  return (
    <div className="perm-test">
      <div className="perm-test__controls">
        <span className="perm-test__info">
          n={N}, p={P}, q={Q}, true correlations: [{TRUE_CORRS.join(", ")}]
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="blog-figure__button" onClick={runTest} disabled={running}>
            {running ? "Running..." : nullDist ? "Run again" : "Run permutation test"}
          </button>
          <button className="blog-figure__button" onClick={regenerate}>
            New data
          </button>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* X axis */}
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <g key={v}>
              <line x1={xScale(v)} y1={0} x2={xScale(v)} y2={PLOT_H} stroke="rgba(0,0,0,0.06)" />
              <text x={xScale(v)} y={PLOT_H + 16} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill="rgba(0,0,0,0.4)">
                {v.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Histogram bars */}
          {histData && histData.bins.map((count, i) => {
            const x = xScale(histData.min + i * histData.binWidth)
            const w = xScale(histData.binWidth) - xScale(0)
            const h = PLOT_H - yScale(count)
            return (
              <rect
                key={i}
                x={x} y={yScale(count)}
                width={Math.max(0, w - 1)} height={h}
                fill="rgba(0,0,0,0.12)"
                rx={1}
              />
            )
          })}

          {/* 95th percentile line */}
          {p95 !== null && (
            <g>
              <line
                x1={xScale(p95)} y1={0} x2={xScale(p95)} y2={PLOT_H}
                stroke="rgba(0,0,0,0.3)" strokeWidth={1} strokeDasharray="4 3"
              />
              <text
                x={xScale(p95) + 4} y={12}
                fontSize={10} fontFamily="var(--font-mono)" fill="rgba(0,0,0,0.45)"
              >
                95th %ile
              </text>
            </g>
          )}

          {/* Real canonical correlations as vertical lines (show first two only) */}
          {realCorrs.slice(0, TRUE_CORRS.length).map((r, i) => {
            const significant = p95 !== null && r > p95
            return (
              <g key={`real-${i}`}>
                <line
                  x1={xScale(r)} y1={0} x2={xScale(r)} y2={PLOT_H}
                  stroke={significant ? "#d9534f" : "#4A7C6F"}
                  strokeWidth={2}
                  opacity={0.8}
                />
                <text
                  x={xScale(r) + (r > 0.85 ? -6 : 6)}
                  y={20 + i * 16}
                  textAnchor={r > 0.85 ? "end" : "start"}
                  fontSize={10} fontFamily="var(--font-mono)"
                  fill={significant ? "#d9534f" : "#4A7C6F"}
                  fontWeight={600}
                >
                  {`\u03C1${i + 1} = ${r.toFixed(2)}`}
                </text>
              </g>
            )
          })}

          {/* Placeholder text when no test has run */}
          {!histData && (
            <text
              x={PLOT_W / 2} y={PLOT_H / 2}
              textAnchor="middle" fontSize={12} fontFamily="var(--font-mono)"
              fill="rgba(0,0,0,0.25)"
            >
              Press "Run permutation test" to build the null distribution
            </text>
          )}

          {/* X axis label */}
          <text
            x={PLOT_W / 2} y={PLOT_H + 34}
            textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)"
            fill="rgba(0,0,0,0.4)"
          >
            first canonical correlation
          </text>
        </g>
      </svg>
    </div>
  )
}
