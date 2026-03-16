import React, { useState, useMemo } from "react"
import { scaleLinear, scaleBand } from "d3-scale"
import { mulberry32 } from "./psid-math"

const W = 800
const H = 380
const MARGIN = { top: 40, right: 20, bottom: 50, left: 55 }
const FONT = "var(--font-mono, monospace)"

const LEFT_W = 500
const RIGHT_W = 230
const GAP = 30

const COLOR_RECON = "#4A7C6F"
const COLOR_KL = "#8B4A3A"
const COLOR_SCATTER = "#4A90D9"

// Pre-compute ELBO components for each beta
// Synthetic example: as beta increases, model trades reconstruction for lower KL
const BETA_VALUES = []
for (let b = 0; b <= 20; b++) BETA_VALUES.push(b / 10) // 0, 0.1, 0.2, ..., 2.0

function computeComponents(beta) {
  // At beta=0: high recon (-50), high KL (40)
  // At beta=1: balanced recon (-120), KL (15)
  // At beta>1: low recon (-200), very low KL (3)
  // Smooth curves using sigmoid-like transitions
  const t = beta
  const recon = -50 - 150 * (1 / (1 + Math.exp(-3 * (t - 0.8))))
  const kl = 40 * Math.exp(-1.5 * t) + 3
  return { beta, recon, kl }
}

const DATA = BETA_VALUES.map(b => computeComponents(b))

// Generate latent scatter points for different beta values
function generateScatter(beta, seed) {
  const rng = mulberry32(seed)
  const points = []
  const n = 60
  // Spread = inversely related to beta: low beta = scattered, high beta = clustered
  const spread = Math.max(0.1, 3.0 * Math.exp(-1.2 * beta))
  for (let i = 0; i < n; i++) {
    // Box-Muller
    const u1 = rng() || 1e-15
    const u2 = rng()
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
    points.push([z1 * spread, z2 * spread])
  }
  return points
}

export default function ELBODecomposition() {
  const [betaIdx, setBetaIdx] = useState(10) // default beta=1.0

  const beta = BETA_VALUES[betaIdx]
  const currentData = DATA[betaIdx]

  // Left panel: stacked bar chart
  const barAreaW = LEFT_W - MARGIN.left - MARGIN.right
  const barAreaH = H - MARGIN.top - MARGIN.bottom

  const barX = useMemo(
    () => scaleBand()
      .domain(BETA_VALUES.map((_, i) => i))
      .range([0, barAreaW])
      .padding(0.15),
    [barAreaW]
  )

  // Y scale: covers range of recon (negative) and -beta*KL stacked on top
  const { yMin, yMax } = useMemo(() => {
    let mn = 0, mx = 0
    for (const d of DATA) {
      const reconVal = d.recon
      const klVal = -d.beta * d.kl
      const total = reconVal + klVal
      if (total < mn) mn = total
      if (reconVal > mx) mx = reconVal
      if (0 > mn) mn = 0
    }
    // recon is negative, klVal is also negative, so the bars go below zero
    // Actually: recon is the reconstruction term (negative log-lik, so negative),
    // and -beta*KL is also negative. The ELBO = recon - beta*KL = recon + (-beta*KL).
    // Let's show recon as the bottom (more negative) and -beta*KL stacked on top.
    // Total bar height goes from 0 down to recon + (-beta*KL)
    mn = -300
    mx = 10
    return { yMin: mn, yMax: mx }
  }, [])

  const barSy = useMemo(
    () => scaleLinear().domain([yMin, yMax]).range([barAreaH, 0]),
    [yMin, yMax, barAreaH]
  )

  // Right panel: latent scatter
  const scatter = useMemo(() => generateScatter(beta, 42), [beta])

  const rightX0 = LEFT_W + GAP
  const scatterW = RIGHT_W - 20
  const scatterH = H - MARGIN.top - MARGIN.bottom
  const scatterSx = useMemo(
    () => scaleLinear().domain([-5, 5]).range([0, scatterW]),
    [scatterW]
  )
  const scatterSy = useMemo(
    () => scaleLinear().domain([-5, 5]).range([scatterH, 0]),
    [scatterH]
  )

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Title */}
        <text
          x={W / 2} y={22}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 13, fill: "#333", fontWeight: 600 }}
        >
          ELBO decomposition: reconstruction vs KL trade-off
        </text>

        {/* Left panel: stacked bar chart */}
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {DATA.map((d, i) => {
            const reconVal = d.recon
            const klContrib = -d.beta * d.kl
            const isActive = i === betaIdx
            const bw = barX.bandwidth()

            // Reconstruction bar: from 0 down to recon
            const reconY = barSy(0)
            const reconH = barSy(reconVal) - barSy(0)

            // KL bar: from recon down to recon + klContrib
            const klY = barSy(reconVal)
            const klH = barSy(reconVal + klContrib) - barSy(reconVal)

            return (
              <g key={i}>
                {/* Reconstruction (teal) */}
                <rect
                  x={barX(i)}
                  y={reconY}
                  width={bw}
                  height={Math.abs(reconH)}
                  fill={COLOR_RECON}
                  opacity={isActive ? 1 : 0.4}
                  stroke={isActive ? "#333" : "none"}
                  strokeWidth={isActive ? 1.5 : 0}
                />
                {/* KL (red-brown) */}
                <rect
                  x={barX(i)}
                  y={klY}
                  width={bw}
                  height={Math.abs(klH)}
                  fill={COLOR_KL}
                  opacity={isActive ? 1 : 0.4}
                  stroke={isActive ? "#333" : "none"}
                  strokeWidth={isActive ? 1.5 : 0}
                />
              </g>
            )
          })}

          {/* Zero line */}
          <line x1={0} y1={barSy(0)} x2={barAreaW} y2={barSy(0)} stroke="#999" strokeWidth={1} />

          {/* ELBO line */}
          {DATA.length > 1 && (
            <path
              d={DATA.map((d, i) => {
                const elbo = d.recon + (-d.beta * d.kl)
                const cx = barX(i) + barX.bandwidth() / 2
                return `${i === 0 ? "M" : "L"}${cx},${barSy(elbo)}`
              }).join(" ")}
              fill="none"
              stroke="#333"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.7}
            />
          )}

          {/* Y axis */}
          <line x1={0} y1={0} x2={0} y2={barAreaH} stroke="#ccc" strokeWidth={1} />
          {[-250, -200, -150, -100, -50, 0].map(v => (
            <g key={v}>
              <line x1={-4} y1={barSy(v)} x2={0} y2={barSy(v)} stroke="#ccc" strokeWidth={1} />
              <text
                x={-8} y={barSy(v)}
                textAnchor="end"
                dominantBaseline="middle"
                style={{ fontFamily: FONT, fontSize: 8, fill: "#aaa" }}
              >
                {v}
              </text>
            </g>
          ))}

          {/* X axis labels (every other for readability) */}
          {DATA.map((d, i) => (
            i % 2 === 0 ? (
              <text
                key={i}
                x={barX(i) + barX.bandwidth() / 2}
                y={barAreaH + 16}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 8, fill: "#aaa" }}
              >
                {d.beta.toFixed(1)}
              </text>
            ) : null
          ))}

          <text
            x={barAreaW / 2} y={barAreaH + 34}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#aaa" }}
          >
            β
          </text>

          {/* Legend */}
          <g transform={`translate(${barAreaW - 160}, 6)`}>
            <rect x={0} y={0} width={10} height={10} fill={COLOR_RECON} rx={1} />
            <text x={14} y={9} style={{ fontFamily: FONT, fontSize: 9, fill: "#555" }}>
              Reconstruction
            </text>
            <rect x={0} y={16} width={10} height={10} fill={COLOR_KL} rx={1} />
            <text x={14} y={25} style={{ fontFamily: FONT, fontSize: 9, fill: "#555" }}>
              −β · KL
            </text>
            <line x1={0} y1={36} x2={10} y2={36} stroke="#333" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={14} y={39} style={{ fontFamily: FONT, fontSize: 9, fill: "#555" }}>
              ELBO
            </text>
          </g>

          {/* Current values annotation */}
          <text
            x={barAreaW - 4} y={barAreaH - 4}
            textAnchor="end"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#666" }}
          >
            {`β=${beta.toFixed(1)}  recon=${currentData.recon.toFixed(0)}  KL=${currentData.kl.toFixed(1)}  ELBO=${(currentData.recon - beta * currentData.kl).toFixed(0)}`}
          </text>
        </g>

        {/* Right panel: latent scatter */}
        <g transform={`translate(${rightX0}, ${MARGIN.top})`}>
          <text
            x={scatterW / 2} y={-12}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 11, fill: "#666" }}
          >
            Latent space
          </text>

          {/* Axes */}
          <line x1={0} y1={scatterH} x2={scatterW} y2={scatterH} stroke="#ddd" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={scatterH} stroke="#ddd" strokeWidth={1} />

          {/* Origin cross */}
          <line
            x1={scatterSx(0) - 6} y1={scatterSy(0)}
            x2={scatterSx(0) + 6} y2={scatterSy(0)}
            stroke="#ddd" strokeWidth={1}
          />
          <line
            x1={scatterSx(0)} y1={scatterSy(0) - 6}
            x2={scatterSx(0)} y2={scatterSy(0) + 6}
            stroke="#ddd" strokeWidth={1}
          />

          {/* Unit circle (prior reference) */}
          <circle
            cx={scatterSx(0)}
            cy={scatterSy(0)}
            r={(scatterW / 10)}
            fill="none"
            stroke="#ddd"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={scatterSx(0) + scatterW / 10 + 4}
            y={scatterSy(0) - 4}
            style={{ fontFamily: FONT, fontSize: 7, fill: "#ccc" }}
          >
            N(0,I)
          </text>

          {/* Scatter points */}
          {scatter.map((pt, i) => (
            <circle
              key={i}
              cx={scatterSx(pt[0])}
              cy={scatterSy(pt[1])}
              r={2.5}
              fill={COLOR_SCATTER}
              opacity={0.6}
            />
          ))}

          <text
            x={scatterW / 2} y={scatterH + 16}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            z₁
          </text>
          <text
            x={-10} y={scatterH / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -10, ${scatterH / 2})`}
            style={{ fontFamily: FONT, fontSize: 9, fill: "#aaa" }}
          >
            z₂
          </text>

          {/* Label for beta effect */}
          <text
            x={scatterW / 2} y={scatterH + 34}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#888" }}
          >
            {beta < 0.5 ? "scattered (high KL)" : beta > 1.5 ? "clustered (low KL)" : "balanced"}
          </text>
        </g>
      </svg>

      {/* Slider */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginTop: 6,
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          β = {beta.toFixed(1)}
          <input
            type="range"
            min={0}
            max={BETA_VALUES.length - 1}
            step={1}
            value={betaIdx}
            onChange={e => setBetaIdx(Number(e.target.value))}
            style={{ width: 300 }}
          />
        </label>
      </div>
    </div>
  )
}
