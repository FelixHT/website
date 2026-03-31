import React from "react"

export default function FourSubspacesExplorer() {
  // Layout constants
  const leftX = 60
  const rightX = 520
  const rectY = 60
  const rectW = 320
  const rectH = 250
  const splitRatio = 0.55
  const splitY = rectY + rectH * splitRatio
  const r = 14 // corner radius

  // Colors
  const rowSpace = { fill: "rgba(61, 108, 185, 0.12)", text: "#3d6cb9" }
  const nullSpace = { fill: "rgba(212, 160, 60, 0.12)", text: "#D4A03C" }
  const colSpace = { fill: "rgba(74, 164, 100, 0.12)", text: "#4AA464" }
  const leftNull = { fill: "rgba(0, 0, 0, 0.04)", text: "rgba(0,0,0,0.35)" }
  const border = "rgba(0,0,0,0.12)"
  const arrowColor = "rgba(0,0,0,0.4)"

  // Font styles
  const nameFont = {
    fontFamily: "var(--font-serif)",
    fontSize: 17,
    fontWeight: 600,
  }
  const dimFont = {
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 13,
  }
  const headerFont = {
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 15,
    fontWeight: 600,
    fill: "rgba(0,0,0,0.55)",
  }

  // Helpers for rounded half-rectangles
  const topHalf = (x, y, w, h, radius) => {
    const bottom = y + h
    return [
      `M ${x + radius} ${y}`,
      `Q ${x} ${y} ${x} ${y + radius}`,
      `L ${x} ${bottom}`,
      `L ${x + w} ${bottom}`,
      `L ${x + w} ${y + radius}`,
      `Q ${x + w} ${y} ${x + w - radius} ${y}`,
      `Z`,
    ].join(" ")
  }

  const bottomHalf = (x, y, w, h, radius) => {
    const bottom = y + h
    return [
      `M ${x} ${y}`,
      `L ${x} ${bottom - radius}`,
      `Q ${x} ${bottom} ${x + radius} ${bottom}`,
      `L ${x + w - radius} ${bottom}`,
      `Q ${x + w} ${bottom} ${x + w} ${bottom - radius}`,
      `L ${x + w} ${y}`,
      `Z`,
    ].join(" ")
  }

  const topH = splitY - rectY
  const bottomH = rectY + rectH - splitY

  // Center points for labels
  const leftTopCenter = { x: leftX + rectW / 2, y: rectY + topH / 2 }
  const leftBottomCenter = { x: leftX + rectW / 2, y: splitY + bottomH / 2 }
  const rightTopCenter = { x: rightX + rectW / 2, y: rectY + topH / 2 }
  const rightBottomCenter = {
    x: rightX + rectW / 2,
    y: splitY + bottomH / 2,
  }

  return (
    <div style={{ width: "100%" }}>
      <svg viewBox="0 0 900 380" style={{ width: "100%", height: "auto" }}>
        <defs>
          <marker
            id="four-sub-arrow"
            viewBox="0 0 10 8"
            refX="9"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 4 L 0 8 Z" fill={arrowColor} />
          </marker>
          <marker
            id="four-sub-arrow-faded"
            viewBox="0 0 10 8"
            refX="9"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 4 L 0 8 Z" fill="rgba(0,0,0,0.18)" />
          </marker>
        </defs>

        {/* Header labels */}
        <text
          x={leftX + rectW / 2}
          y={rectY - 16}
          textAnchor="middle"
          {...headerFont}
        >
          {"Input \u211D\u207F"}
        </text>
        <text
          x={rightX + rectW / 2}
          y={rectY - 16}
          textAnchor="middle"
          {...headerFont}
        >
          {"Output \u211D\u1D50"}
        </text>

        {/* Left rectangle - top half (Row space) */}
        <path
          d={topHalf(leftX, rectY, rectW, topH, r)}
          fill={rowSpace.fill}
          stroke={border}
          strokeWidth={1.5}
        />
        <text
          x={leftTopCenter.x}
          y={leftTopCenter.y - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill={rowSpace.text}
          {...nameFont}
        >
          Row space
        </text>
        <text
          x={leftTopCenter.x}
          y={leftTopCenter.y + 16}
          textAnchor="middle"
          dominantBaseline="central"
          fill={rowSpace.text}
          opacity={0.7}
          {...dimFont}
        >
          dim = r
        </text>

        {/* Left rectangle - bottom half (Null space) */}
        <path
          d={bottomHalf(leftX, splitY, rectW, bottomH, r)}
          fill={nullSpace.fill}
          stroke={border}
          strokeWidth={1.5}
        />
        <text
          x={leftBottomCenter.x}
          y={leftBottomCenter.y - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill={nullSpace.text}
          {...nameFont}
        >
          Null space
        </text>
        <text
          x={leftBottomCenter.x}
          y={leftBottomCenter.y + 16}
          textAnchor="middle"
          dominantBaseline="central"
          fill={nullSpace.text}
          opacity={0.7}
          {...dimFont}
        >
          {"dim = n \u2212 r"}
        </text>

        {/* Perpendicularity symbol - left rectangle (centered at split) */}
        <text
          x={leftX + rectW / 2}
          y={splitY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={14}
          fill="rgba(0,0,0,0.25)"
          fontFamily="var(--font-mono, monospace)"
        >
          {"\u22A5"}
        </text>

        {/* Right rectangle - top half (Column space) */}
        <path
          d={topHalf(rightX, rectY, rectW, topH, r)}
          fill={colSpace.fill}
          stroke={border}
          strokeWidth={1.5}
        />
        <text
          x={rightTopCenter.x}
          y={rightTopCenter.y - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill={colSpace.text}
          {...nameFont}
        >
          Column space
        </text>
        <text
          x={rightTopCenter.x}
          y={rightTopCenter.y + 16}
          textAnchor="middle"
          dominantBaseline="central"
          fill={colSpace.text}
          opacity={0.7}
          {...dimFont}
        >
          dim = r
        </text>

        {/* Right rectangle - bottom half (Left null space) */}
        <path
          d={bottomHalf(rightX, splitY, rectW, bottomH, r)}
          fill={leftNull.fill}
          stroke={border}
          strokeWidth={1.5}
        />
        <text
          x={rightBottomCenter.x}
          y={rightBottomCenter.y - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill={leftNull.text}
          {...nameFont}
        >
          Left null space
        </text>
        <text
          x={rightBottomCenter.x}
          y={rightBottomCenter.y + 16}
          textAnchor="middle"
          dominantBaseline="central"
          fill={leftNull.text}
          opacity={0.7}
          {...dimFont}
        >
          {"dim = m \u2212 r"}
        </text>

        {/* Perpendicularity symbol - right rectangle (centered at split) */}
        <text
          x={rightX + rectW / 2}
          y={splitY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={14}
          fill="rgba(0,0,0,0.25)"
          fontFamily="var(--font-mono, monospace)"
        >
          {"\u22A5"}
        </text>

        {/* Arrow: Row space -> Column space ("A maps") */}
        <path
          d={`M ${leftX + rectW + 6} ${leftTopCenter.y} C ${leftX + rectW + 60} ${leftTopCenter.y}, ${rightX - 60} ${rightTopCenter.y}, ${rightX - 6} ${rightTopCenter.y}`}
          fill="none"
          stroke={arrowColor}
          strokeWidth={2.2}
          markerEnd="url(#four-sub-arrow)"
        />
        <text
          x={(leftX + rectW + rightX) / 2}
          y={leftTopCenter.y - 14}
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize={14}
          fontWeight={600}
          fontFamily="var(--font-serif)"
          fill="rgba(0,0,0,0.5)"
        >
          A maps
        </text>

        {/* Arrow: Null space -> 0 ("A kills") — ends at a clear "0" between the boxes */}
        {(() => {
          const midX = (leftX + rectW + rightX) / 2
          const killY = leftBottomCenter.y
          return (
            <>
              <path
                d={`M ${leftX + rectW + 6} ${killY} L ${midX + 10} ${killY}`}
                fill="none"
                stroke="rgba(0,0,0,0.18)"
                strokeWidth={1.8}
                strokeDasharray="6 4"
                markerEnd="url(#four-sub-arrow-faded)"
              />
              <text
                x={midX}
                y={killY - 16}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-serif)"
                fill="rgba(0,0,0,0.3)"
              >
                A kills
              </text>
              <text
                x={midX + 28}
                y={killY + 1}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={18}
                fontWeight={700}
                fontFamily="var(--font-mono, monospace)"
                fill={nullSpace.text}
              >
                0
              </text>
            </>
          )
        })()}

        {/* Rank label */}
        <text
          x={450}
          y={rectY + rectH + 38}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={15}
          fontFamily="var(--font-mono, monospace)"
          fontWeight={600}
          fill="rgba(0,0,0,0.4)"
        >
          rank = r
        </text>
      </svg>
    </div>
  )
}
