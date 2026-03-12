import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { generateData, solveCCA, centerData, projectOntoDirection } from "./cca-math"

const W = 800
const H = 440
const MID_X = W / 2
const PLOT_R = 160 // half-width of each cloud region
const CX_A = MID_X - PLOT_R - 30
const CX_B = MID_X + PLOT_R + 30
const CY = 200
const KDE_MAX_W = 60 // max width of KDE curves on the central axis

const COLOR_A = { point: "#8BBEE8", blob: "#D0E1F2", vector: "#6BA4D1" }
const COLOR_B = { point: "#F5A99D", blob: "#FDDED9", vector: "#F07A65" }

// Simple 1D Gaussian KDE
function kde1d(values, gridMin, gridMax, nGrid, bandwidth) {
  const grid = []
  const density = []
  const step = (gridMax - gridMin) / (nGrid - 1)
  const bw = bandwidth || 0.4
  const n = values.length
  const coeff = 1 / (n * bw * Math.sqrt(2 * Math.PI))

  for (let i = 0; i < nGrid; i++) {
    const x = gridMin + i * step
    grid.push(x)
    let sum = 0
    for (let j = 0; j < n; j++) {
      const z = (x - values[j]) / bw
      sum += Math.exp(-0.5 * z * z)
    }
    density.push(coeff * sum)
  }
  return { grid, density }
}

// 2D density for contour blobs (simplified: just radial from mean)
function computeCloudPath(data, cx, cy, sx, sy, radiusFactor) {
  // Compute mean and rough ellipse from data extents
  const n = data.length
  let mx = 0, my = 0
  for (const [x, y] of data) { mx += x; my += y }
  mx /= n; my /= n

  let varX = 0, varY = 0, covXY = 0
  for (const [x, y] of data) {
    varX += (x - mx) ** 2
    varY += (y - my) ** 2
    covXY += (x - mx) * (y - my)
  }
  varX /= n; varY /= n; covXY /= n

  const sdx = Math.sqrt(varX) * radiusFactor
  const sdy = Math.sqrt(varY) * radiusFactor
  const angle = 0.5 * Math.atan2(2 * covXY, varX - varY)

  const scx = sx(mx)
  const scy = sy(my)
  const rx = Math.abs(sx(mx + sdx) - sx(mx))
  const ry = Math.abs(sy(my) - sy(my + sdy))

  // Negate angle to account for SVG y-axis pointing down
  return { cx: scx, cy: scy, rx, ry, angle: -(angle * 180) / Math.PI }
}

export default function CCATeaser({ hero = false }) {
  const [seed, setSeed] = useState(0)
  const data = useMemo(() => generateData(120, 0.9, 0.3), [seed])
  const cca = useMemo(() => solveCCA(data.Xa, data.Xb), [data])
  const { centered: centA } = useMemo(() => centerData(data.Xa), [data])
  const { centered: centB } = useMemo(() => centerData(data.Xb), [data])

  const projA = useMemo(() => projectOntoDirection(centA, cca.Wa[0]), [centA, cca])
  const projB = useMemo(() => projectOntoDirection(centB, cca.Wb[0]), [centB, cca])

  // Scales: map data to SVG coords within each cloud region
  const { sxA, syA, sxB, syB } = useMemo(() => {
    const allAx = centA.map(p => p[0]), allAy = centA.map(p => p[1])
    const allBx = centB.map(p => p[0]), allBy = centB.map(p => p[1])
    const pad = 0.15
    const rangeA = [Math.min(...allAx), Math.max(...allAx)]
    const rangeAy = [Math.min(...allAy), Math.max(...allAy)]
    const rangeB = [Math.min(...allBx), Math.max(...allBx)]
    const rangeBy = [Math.min(...allBy), Math.max(...allBy)]
    const xPadA = (rangeA[1] - rangeA[0]) * pad
    const yPadA = (rangeAy[1] - rangeAy[0]) * pad
    const xPadB = (rangeB[1] - rangeB[0]) * pad
    const yPadB = (rangeBy[1] - rangeBy[0]) * pad

    return {
      sxA: scaleLinear().domain([rangeA[0] - xPadA, rangeA[1] + xPadA]).range([CX_A - PLOT_R + 20, CX_A + PLOT_R - 20]),
      syA: scaleLinear().domain([rangeAy[0] - yPadA, rangeAy[1] + yPadA]).range([CY + PLOT_R - 20, CY - PLOT_R + 20]),
      sxB: scaleLinear().domain([rangeB[0] - xPadB, rangeB[1] + xPadB]).range([CX_B - PLOT_R + 20, CX_B + PLOT_R - 20]),
      syB: scaleLinear().domain([rangeBy[0] - yPadB, rangeBy[1] + yPadB]).range([CY + PLOT_R - 20, CY - PLOT_R + 20]),
    }
  }, [centA, centB])

  // KDE of projected values for the central axis
  const { kdeA, kdeB, projScale } = useMemo(() => {
    const allProj = [...projA, ...projB]
    const mn = Math.min(...allProj), mx = Math.max(...allProj)
    const pad = (mx - mn) * 0.1
    const ps = scaleLinear().domain([mn - pad, mx + pad]).range([CY + PLOT_R - 10, CY - PLOT_R + 10])
    const kA = kde1d(projA, mn - pad, mx + pad, 80, (mx - mn) * 0.08)
    const kB = kde1d(projB, mn - pad, mx + pad, 80, (mx - mn) * 0.08)
    return { kdeA: kA, kdeB: kB, projScale: ps }
  }, [projA, projB])

  // Build KDE path strings
  const kdePathA = useMemo(() => {
    const maxD = Math.max(...kdeA.density)
    const pts = kdeA.grid.map((v, i) => {
      const y = projScale(v)
      const x = MID_X - (kdeA.density[i] / maxD) * KDE_MAX_W
      return `${x},${y}`
    })
    return `M${MID_X},${projScale(kdeA.grid[0])} L${pts.join(" L")} L${MID_X},${projScale(kdeA.grid[kdeA.grid.length - 1])} Z`
  }, [kdeA, projScale])

  const kdePathB = useMemo(() => {
    const maxD = Math.max(...kdeB.density)
    const pts = kdeB.grid.map((v, i) => {
      const y = projScale(v)
      const x = MID_X + (kdeB.density[i] / maxD) * KDE_MAX_W
      return `${x},${y}`
    })
    return `M${MID_X},${projScale(kdeB.grid[0])} L${pts.join(" L")} L${MID_X},${projScale(kdeB.grid[kdeB.grid.length - 1])} Z`
  }, [kdeB, projScale])

  // Sample projection lines (7 from each dataset)
  const sampleLines = useMemo(() => {
    const lines = []
    const nSample = 4
    const stepA = Math.floor(centA.length / nSample)
    const stepB = Math.floor(centB.length / nSample)
    for (let i = 0; i < nSample; i++) {
      const idxA = i * stepA
      const idxB = i * stepB
      lines.push({
        x1: sxA(centA[idxA][0]), y1: syA(centA[idxA][1]),
        x2: MID_X, y2: projScale(projA[idxA]),
        color: COLOR_A.point, dotColor: COLOR_A.vector,
      })
      lines.push({
        x1: sxB(centB[idxB][0]), y1: syB(centB[idxB][1]),
        x2: MID_X, y2: projScale(projB[idxB]),
        color: COLOR_B.point, dotColor: COLOR_B.vector,
      })
    }
    return lines
  }, [centA, centB, projA, projB, sxA, syA, sxB, syB, projScale])

  // Density blobs
  const blobA = useMemo(() => computeCloudPath(centA, CX_A, CY, sxA, syA, 1.5), [centA, sxA, syA])
  const blobB = useMemo(() => computeCloudPath(centB, CX_B, CY, sxB, syB, 1.5), [centB, sxB, syB])

  // Direction arrows
  const w1a = cca.Wa[0]
  const w1b = cca.Wb[0]

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
      <defs>
        <marker id="teaser-arrow-a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill={COLOR_A.vector} />
        </marker>
        <marker id="teaser-arrow-b" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill={COLOR_B.vector} />
        </marker>
      </defs>

      {/* Central axis */}
      <line x1={MID_X} y1={CY - PLOT_R - 10} x2={MID_X} y2={CY + PLOT_R + 10} stroke="#B0B0B0" strokeWidth={1.2} />

      {/* Covariance ellipses (dashed outline) */}
      <ellipse cx={blobA.cx} cy={blobA.cy} rx={blobA.rx} ry={blobA.ry}
        transform={`rotate(${blobA.angle} ${blobA.cx} ${blobA.cy})`}
        fill="none" stroke={COLOR_A.vector} strokeWidth={1} strokeDasharray="4 3" opacity={0.4} />
      <ellipse cx={blobB.cx} cy={blobB.cy} rx={blobB.rx} ry={blobB.ry}
        transform={`rotate(${blobB.angle} ${blobB.cx} ${blobB.cy})`}
        fill="none" stroke={COLOR_B.vector} strokeWidth={1} strokeDasharray="4 3" opacity={0.4} />

      {/* Projection lines (subtle, from point to projected position on central axis) */}
      {sampleLines.map((l, i) => (
        <g key={i}>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={0.5} strokeDasharray="2 3" opacity={0.35} />
          <circle cx={l.x2} cy={l.y2} r={1.5} fill={l.dotColor} opacity={0.5} />
        </g>
      ))}

      {/* KDE curves on central axis */}
      <path d={kdePathA} fill={COLOR_A.blob} opacity={0.75} />
      <path d={kdePathB} fill={COLOR_B.blob} opacity={0.75} />

      {/* Point clouds */}
      {centA.map((p, i) => (
        <circle key={`a-${i}`} cx={sxA(p[0])} cy={syA(p[1])} r={2.5} fill={COLOR_A.point} opacity={0.6} />
      ))}
      {centB.map((p, i) => (
        <circle key={`b-${i}`} cx={sxB(p[0])} cy={syB(p[1])} r={2.5} fill={COLOR_B.point} opacity={0.6} />
      ))}

      {/* Direction arrows */}
      {(() => {
        const len = 80
        const normA = Math.sqrt(w1a[0] ** 2 + w1a[1] ** 2)
        const dxA = (w1a[0] / normA) * len
        const dyA = -(w1a[1] / normA) * len
        const acx = sxA(0), acy = syA(0)
        return <line x1={acx - dxA * 0.4} y1={acy - dyA * 0.4} x2={acx + dxA * 0.6} y2={acy + dyA * 0.6}
          stroke={COLOR_A.vector} strokeWidth={2.5} markerEnd="url(#teaser-arrow-a)" />
      })()}
      {(() => {
        const len = 80
        const normB = Math.sqrt(w1b[0] ** 2 + w1b[1] ** 2)
        const dxB = (w1b[0] / normB) * len
        const dyB = -(w1b[1] / normB) * len
        const bcx = sxB(0), bcy = syB(0)
        return <line x1={bcx - dxB * 0.4} y1={bcy - dyB * 0.4} x2={bcx + dxB * 0.6} y2={bcy + dyB * 0.6}
          stroke={COLOR_B.vector} strokeWidth={2.5} markerEnd="url(#teaser-arrow-b)" />
      })()}

      {/* Rho readout */}
      {!hero && (
        <text x={40} y={H - 20} style={{ fontFamily: "var(--font-mono)", fontSize: 13, fill: "#555" }}>
          {"ρ"}<tspan dy={3} style={{ fontSize: 9 }}>1</tspan><tspan dy={-3}>{` = ${cca.correlations[0].toFixed(2)}`}</tspan>
        </text>
      )}

      {/* Regenerate button */}
      {!hero && (
        <g transform={`translate(${W - 140},${H - 38})`} style={{ cursor: "pointer" }} onClick={handleRegenerate}
          role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleRegenerate() }}>
          <rect x={0} y={0} width={106} height={28} rx={4} fill="#f4f3f0" stroke="#ccc9c2" strokeWidth={1} />
          <text x={53} y={18} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fill: "#555", userSelect: "none" }}>
            Regenerate
          </text>
        </g>
      )}
    </svg>
  )
}
