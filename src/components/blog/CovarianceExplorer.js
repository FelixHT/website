import React, { useState, useMemo } from "react"
import * as d3 from "d3"
import { generateData, computeCov, computeCrossCov, centerData } from "./cca-math"

const CELL = 52
const GAP = 2
const MATRIX_SIZE = CELL * 2 + GAP
const MATRIX_SPACING = 48
const SCATTER_SIZE = 150
const PADDING_LEFT = 44

// Vertical centering: matrix visual extent = 16(title) + MATRIX_SIZE + 16(col labels) = 138
// Scatter visual extent = SCATTER_SIZE = 150
const MATRIX_VISUAL_H = 16 + MATRIX_SIZE + 16
const CONTENT_H = Math.max(MATRIX_VISUAL_H, SCATTER_SIZE)
const V_PAD = 20

// Both centered at the same vertical midpoint
const CENTER_Y = V_PAD + CONTENT_H / 2
const MATRIX_Y = CENTER_Y - MATRIX_SIZE / 2
const SCATTER_Y = CENTER_Y - SCATTER_SIZE / 2

const TOTAL_WIDTH = PADDING_LEFT + MATRIX_SIZE * 3 + MATRIX_SPACING * 2 + 50 + SCATTER_SIZE + 16
const TOTAL_HEIGHT = V_PAD * 2 + CONTENT_H

function normalizeToCorr(cov) {
  const d0 = Math.sqrt(Math.abs(cov[0][0]))
  const d1 = Math.sqrt(Math.abs(cov[1][1]))
  if (d0 < 1e-12 || d1 < 1e-12) return cov
  return [
    [cov[0][0] / (d0 * d0), cov[0][1] / (d0 * d1)],
    [cov[1][0] / (d1 * d0), cov[1][1] / (d1 * d1)],
  ]
}

function normalizeCross(covAB, covAA, covBB) {
  const da0 = Math.sqrt(Math.abs(covAA[0][0]))
  const da1 = Math.sqrt(Math.abs(covAA[1][1]))
  const db0 = Math.sqrt(Math.abs(covBB[0][0]))
  const db1 = Math.sqrt(Math.abs(covBB[1][1]))
  return [
    [covAB[0][0] / (da0 * db0 || 1), covAB[0][1] / (da0 * db1 || 1)],
    [covAB[1][0] / (da1 * db0 || 1), covAB[1][1] / (da1 * db1 || 1)],
  ]
}

function getHoverAxes(matrixType, row, col) {
  switch (matrixType) {
    case "aa":
      return { xSource: "a", xIdx: col, ySource: "a", yIdx: row }
    case "bb":
      return { xSource: "b", xIdx: col, ySource: "b", yIdx: row }
    case "ab":
      return { xSource: "a", xIdx: row, ySource: "b", yIdx: col }
    default:
      return null
  }
}

function extractColumn(data, idx) {
  return data.map(row => row[idx])
}

function MatrixLabel({ x, y, sub1, sub2 }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="var(--font-serif)"
      fontSize={14}
      fill="rgba(0,0,0,0.7)"
    >
      {"Σ"}
      <tspan fontSize={10} dy={4}>{sub1}{sub2}</tspan>
      <tspan dy={-4}>{""}</tspan>
    </text>
  )
}

function HeatmapMatrix({ matrix, sub1, sub2, x, y, matrixType, rowLabels, colLabels, hoveredCell, onHover, colorScale }) {
  const cells = []
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const val = matrix[r][c]
      const cx = x + c * (CELL + GAP)
      const cy = y + r * (CELL + GAP)
      const isHovered =
        hoveredCell &&
        hoveredCell.matrixType === matrixType &&
        hoveredCell.row === r &&
        hoveredCell.col === c

      cells.push(
        <g
          key={`${r}-${c}`}
          onMouseEnter={() => onHover({ matrixType, row: r, col: c })}
          onMouseLeave={() => onHover(null)}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={cx}
            y={cy}
            width={CELL}
            height={CELL}
            fill={colorScale(val)}
            stroke={isHovered ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.12)"}
            strokeWidth={isHovered ? 2.5 : 1}
            rx={3}
          />
          <text
            x={cx + CELL / 2}
            y={cy + CELL / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-mono)"
            fontSize={11}
            fontWeight={isHovered ? 600 : 400}
            fill={Math.abs(val) > 0.5 ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.75)"}
          >
            {val.toFixed(2)}
          </text>
        </g>
      )
    }
  }

  return (
    <g>
      <MatrixLabel x={x + MATRIX_SIZE / 2} y={y - 12} sub1={sub1} sub2={sub2} />
      {rowLabels.map((lbl, i) => (
        <text
          key={`row-${i}`}
          x={x - 10}
          y={y + i * (CELL + GAP) + CELL / 2}
          textAnchor="end"
          dominantBaseline="central"
          fontFamily="var(--font-mono)"
          fontSize={10}
          fill="rgba(0,0,0,0.4)"
        >
          {lbl}
        </text>
      ))}
      {colLabels.map((lbl, i) => (
        <text
          key={`col-${i}`}
          x={x + i * (CELL + GAP) + CELL / 2}
          y={y + MATRIX_SIZE + 16}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          fill="rgba(0,0,0,0.4)"
        >
          {lbl}
        </text>
      ))}
      {cells}
    </g>
  )
}

function ScatterPlot({ Xa, Xb, hoveredCell, x, y, size }) {
  const axes = hoveredCell ? getHoverAxes(hoveredCell.matrixType, hoveredCell.row, hoveredCell.col) : null

  const xData = axes ? extractColumn(axes.xSource === "a" ? Xa : Xb, axes.xIdx) : null
  const yData = axes ? extractColumn(axes.ySource === "a" ? Xa : Xb, axes.yIdx) : null

  const allVals = [...Xa.flat(), ...Xb.flat()]
  const globalMin = d3.min(allVals)
  const globalMax = d3.max(allVals)
  const pad = (globalMax - globalMin) * 0.1

  const plotLeft = x + 32
  const plotRight = x + size - 10
  const plotTop = y + 10
  const plotBottom = y + size - 28

  const scaleX = d3.scaleLinear().domain([globalMin - pad, globalMax + pad]).range([plotLeft, plotRight])
  const scaleY = d3.scaleLinear().domain([globalMin - pad, globalMax + pad]).range([plotBottom, plotTop])

  const bgPoints = []
  if (!axes) {
    for (let i = 0; i < Xa.length; i++) {
      bgPoints.push({ px: Xa[i][0], py: Xa[i][1], color: "rgba(74,124,111,0.08)" })
    }
    for (let i = 0; i < Xb.length; i++) {
      bgPoints.push({ px: Xb[i][0], py: Xb[i][1], color: "rgba(196,150,63,0.08)" })
    }
  }

  const xLabel = axes
    ? `${axes.xSource === "a" ? "a" : "b"}${axes.xIdx + 1}`
    : ""
  const yLabel = axes
    ? `${axes.ySource === "a" ? "a" : "b"}${axes.yIdx + 1}`
    : ""

  return (
    <g>
      <rect x={x} y={y} width={size} height={size} fill="#fafaf8" stroke="rgba(0,0,0,0.1)" strokeWidth={1} rx={4} />

      {scaleX.ticks(4).map(t => (
        <line key={`gx-${t}`} x1={scaleX(t)} x2={scaleX(t)} y1={plotTop} y2={plotBottom} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      ))}
      {scaleY.ticks(4).map(t => (
        <line key={`gy-${t}`} x1={plotLeft} x2={plotRight} y1={scaleY(t)} y2={scaleY(t)} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      ))}

      {!axes && bgPoints.map((pt, i) => (
        <circle key={`bg-${i}`} cx={scaleX(pt.px)} cy={scaleY(pt.py)} r={2.5} fill={pt.color} />
      ))}

      {axes && xData && yData && xData.map((xv, i) => (
        <circle
          key={`hl-${i}`}
          cx={scaleX(xv)}
          cy={scaleY(yData[i])}
          r={3}
          fill="rgba(60,90,160,0.5)"
          stroke="rgba(60,90,160,0.7)"
          strokeWidth={0.5}
        />
      ))}

      {axes ? (
        <>
          <text x={(plotLeft + plotRight) / 2} y={y + size - 6} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="rgba(0,0,0,0.55)">
            x<tspan fontSize={8} dy={2}>{xLabel}</tspan>
          </text>
          <text x={x + 10} y={(plotTop + plotBottom) / 2} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="rgba(0,0,0,0.55)" transform={`rotate(-90, ${x + 10}, ${(plotTop + plotBottom) / 2})`}>
            x<tspan fontSize={8} dy={2}>{yLabel}</tspan>
          </text>
        </>
      ) : (
        <text x={x + size / 2} y={y + size / 2} textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-mono)" fontSize={12} fill="rgba(0,0,0,0.55)">
          Hover over a cell
        </text>
      )}
    </g>
  )
}

export default function CovarianceExplorer() {
  const [hoveredCell, setHoveredCell] = useState(null)

  const { centeredA, centeredB, covAA, covBB, covAB } = useMemo(() => {
    const data = generateData(80, 0.9, 0.3)
    const cA = centerData(data.Xa)
    const cB = centerData(data.Xb)
    return {
      centeredA: cA.centered,
      centeredB: cB.centered,
      covAA: computeCov(cA.centered),
      covBB: computeCov(cB.centered),
      covAB: computeCrossCov(cA.centered, cB.centered),
    }
  }, [])

  const absMax = useMemo(() => {
    const all = [...covAA.flat(), ...covBB.flat(), ...covAB.flat()]
    return Math.max(...all.map(Math.abs))
  }, [covAA, covBB, covAB])

  const colorScale = useMemo(() => {
    return d3.scaleSequential()
      .domain([absMax, -absMax])
      .interpolator(d3.interpolateRdBu)
  }, [absMax])

  const m1x = PADDING_LEFT
  const m2x = PADDING_LEFT + MATRIX_SIZE + MATRIX_SPACING
  const m3x = PADDING_LEFT + (MATRIX_SIZE + MATRIX_SPACING) * 2
  const scatterX = m3x + MATRIX_SIZE + 50

  return (
    <svg
      viewBox={`0 0 ${TOTAL_WIDTH} ${TOTAL_HEIGHT}`}
      style={{
        width: "100%",
        maxWidth: TOTAL_WIDTH,
        height: "auto",
        fontFamily: "var(--font-mono)",
        userSelect: "none",
      }}
    >
      <HeatmapMatrix matrix={covAA} sub1="a" sub2="a" x={m1x} y={MATRIX_Y} matrixType="aa" rowLabels={["a₁", "a₂"]} colLabels={["a₁", "a₂"]} hoveredCell={hoveredCell} onHover={setHoveredCell} colorScale={colorScale} />
      <HeatmapMatrix matrix={covAB} sub1="a" sub2="b" x={m2x} y={MATRIX_Y} matrixType="ab" rowLabels={["a₁", "a₂"]} colLabels={["b₁", "b₂"]} hoveredCell={hoveredCell} onHover={setHoveredCell} colorScale={colorScale} />
      <HeatmapMatrix matrix={covBB} sub1="b" sub2="b" x={m3x} y={MATRIX_Y} matrixType="bb" rowLabels={["b₁", "b₂"]} colLabels={["b₁", "b₂"]} hoveredCell={hoveredCell} onHover={setHoveredCell} colorScale={colorScale} />
      <ScatterPlot Xa={centeredA} Xb={centeredB} hoveredCell={hoveredCell} x={scatterX} y={SCATTER_Y} size={SCATTER_SIZE} />
    </svg>
  )
}
