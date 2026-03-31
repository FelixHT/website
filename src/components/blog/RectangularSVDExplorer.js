import React from "react"

export default function RectangularSVDExplorer() {
  // Layout constants
  const leftX = 50
  const rightX = 620
  const rectY = 56
  const rectW = 200
  const rectH = 250
  const splitRatio = 0.5
  const splitY = rectY + rectH * splitRatio
  const cr = 12 // corner radius

  // Sigma box
  const sigmaX = 330
  const sigmaY = rectY + 10
  const sigmaW = 100
  const sigmaH = rectH * splitRatio - 20

  // Colors
  const rowSpace = { fill: "rgba(61, 108, 185, 0.12)", text: "#3d6cb9" }
  const nullSpace = { fill: "rgba(212, 160, 60, 0.12)", text: "#D4A03C" }
  const colSpace = { fill: "rgba(74, 164, 100, 0.12)", text: "#4AA464" }
  const leftNull = { fill: "rgba(0, 0, 0, 0.04)", text: "rgba(0,0,0,0.35)" }
  const sigmaBox = { fill: "rgba(74, 124, 111, 0.12)", text: "#4A7C6F" }
  const border = "rgba(0,0,0,0.12)"
  const arrowColor = "rgba(0,0,0,0.4)"

  // Font styles
  const nameFont = {
    fontFamily: "var(--font-serif)",
    fontSize: 16,
    fontWeight: 600,
  }
  const dimFont = {
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 12,
  }
  const headerFont = {
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 14,
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
  const sigmaCenterX = sigmaX + sigmaW / 2
  const sigmaCenterY = sigmaY + sigmaH / 2

  // Arrow paths — row space through sigma to column space
  const arrowTopY = leftTopCenter.y - 16
  const arrowBotY = leftTopCenter.y + 16

  return (
    <div style={{ width: "100%" }}>
      <svg viewBox="0 0 900 360" style={{ width: "100%", height: "auto" }}>
        <defs>
          <marker
            id="svd-arrow"
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
            id="svd-arrow-faded"
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
          y={rectY - 18}
          textAnchor="middle"
          {...headerFont}
        >
          {"Input \u211D\u207F"}
        </text>
        <text
          x={rightX + rectW / 2}
          y={rectY - 18}
          textAnchor="middle"
          {...headerFont}
        >
          {"Output \u211D\u1D50"}
        </text>

        {/* ── Left rectangle: Row space (top) ── */}
        <path
          d={topHalf(leftX, rectY, rectW, topH, cr)}
          fill={rowSpace.fill}
          stroke={border}
          strokeWidth={1.5}
        />
        <text
          x={leftTopCenter.x}
          y={leftTopCenter.y - 14}
          textAnchor="middle"
          dominantBaseline="central"
          fill={rowSpace.text}
          {...nameFont}
        >
          {"Row space (V\u1D63)"}
        </text>
        <text
          x={leftTopCenter.x}
          y={leftTopCenter.y + 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill={rowSpace.text}
          opacity={0.7}
          {...dimFont}
        >
          dim = r
        </text>

        {/* ── Left rectangle: Null space (bottom) ── */}
        <path
          d={bottomHalf(leftX, splitY, rectW, bottomH, cr)}
          fill={nullSpace.fill}
          stroke={border}
          strokeWidth={1.5}
        />
        <text
          x={leftBottomCenter.x}
          y={leftBottomCenter.y - 14}
          textAnchor="middle"
          dominantBaseline="central"
          fill={nullSpace.text}
          {...nameFont}
        >
          <tspan>Null space </tspan>
          <tspan fontFamily="var(--font-mono, monospace)" fontSize={14}>
            (V
          </tspan>
          <tspan
            fontFamily="var(--font-mono, monospace)"
            fontSize={10}
            dy="3"
          >
            rest
          </tspan>
          <tspan
            fontFamily="var(--font-mono, monospace)"
            fontSize={14}
            dy="-3"
          >
            )
          </tspan>
        </text>
        <text
          x={leftBottomCenter.x}
          y={leftBottomCenter.y + 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill={nullSpace.text}
          opacity={0.7}
          {...dimFont}
        >
          {"dim = n \u2212 r"}
        </text>

        {/* Perpendicularity symbol — left */}
        <text
          x={leftX + rectW / 2}
          y={splitY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={13}
          fill="rgba(0,0,0,0.22)"
          fontFamily="var(--font-mono, monospace)"
        >
          {"\u22A5"}
        </text>

        {/* ── Right rectangle: Column space (top) ── */}
        <path
          d={topHalf(rightX, rectY, rectW, topH, cr)}
          fill={colSpace.fill}
          stroke={border}
          strokeWidth={1.5}
        />
        <text
          x={rightTopCenter.x}
          y={rightTopCenter.y - 14}
          textAnchor="middle"
          dominantBaseline="central"
          fill={colSpace.text}
          {...nameFont}
        >
          <tspan>Col space </tspan>
          <tspan fontFamily="var(--font-mono, monospace)" fontSize={14}>
            (U
          </tspan>
          <tspan
            fontFamily="var(--font-mono, monospace)"
            fontSize={10}
            dy="3"
          >
            r
          </tspan>
          <tspan
            fontFamily="var(--font-mono, monospace)"
            fontSize={14}
            dy="-3"
          >
            )
          </tspan>
        </text>
        <text
          x={rightTopCenter.x}
          y={rightTopCenter.y + 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill={colSpace.text}
          opacity={0.7}
          {...dimFont}
        >
          dim = r
        </text>

        {/* ── Right rectangle: Left null space (bottom) ── */}
        <path
          d={bottomHalf(rightX, splitY, rectW, bottomH, cr)}
          fill={leftNull.fill}
          stroke={border}
          strokeWidth={1.5}
        />
        <text
          x={rightBottomCenter.x}
          y={rightBottomCenter.y - 14}
          textAnchor="middle"
          dominantBaseline="central"
          fill={leftNull.text}
          {...nameFont}
        >
          <tspan>Left null </tspan>
          <tspan fontFamily="var(--font-mono, monospace)" fontSize={14}>
            (U
          </tspan>
          <tspan
            fontFamily="var(--font-mono, monospace)"
            fontSize={10}
            dy="3"
          >
            rest
          </tspan>
          <tspan
            fontFamily="var(--font-mono, monospace)"
            fontSize={14}
            dy="-3"
          >
            )
          </tspan>
        </text>
        <text
          x={rightBottomCenter.x}
          y={rightBottomCenter.y + 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill={leftNull.text}
          opacity={0.7}
          {...dimFont}
        >
          {"dim = m \u2212 r"}
        </text>

        {/* Perpendicularity symbol — right */}
        <text
          x={rightX + rectW / 2}
          y={splitY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={13}
          fill="rgba(0,0,0,0.22)"
          fontFamily="var(--font-mono, monospace)"
        >
          {"\u22A5"}
        </text>

        {/* ── Sigma box ── */}
        <rect
          x={sigmaX}
          y={sigmaY}
          width={sigmaW}
          height={sigmaH}
          rx={10}
          ry={10}
          fill={sigmaBox.fill}
          stroke={border}
          strokeWidth={1.5}
        />
        <text
          x={sigmaCenterX}
          y={sigmaCenterY - 32}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-serif)"
          fontSize={20}
          fontWeight={700}
          fill={sigmaBox.text}
        >
          <tspan>{"\u03A3"}</tspan>
          <tspan fontSize={13} dy="4">
            r
          </tspan>
        </text>
        {/* Singular values */}
        <text
          x={sigmaCenterX}
          y={sigmaCenterY - 6}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-mono, monospace)"
          fontSize={11.5}
          fill={sigmaBox.text}
          opacity={0.85}
        >
          {"\u03C3\u2081 \u2265 \u03C3\u2082 \u2265 \u2026"}
        </text>
        <text
          x={sigmaCenterX}
          y={sigmaCenterY + 14}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-mono, monospace)"
          fontSize={11.5}
          fill={sigmaBox.text}
          opacity={0.85}
        >
          {"\u2265 \u03C3\u1D63 > 0"}
        </text>

        {/* ── Arrows: Row space -> Sigma -> Column space ── */}
        {/* Top arrow: Row space -> Sigma */}
        <path
          d={`M ${leftX + rectW + 5} ${arrowTopY} C ${leftX + rectW + 40} ${arrowTopY}, ${sigmaX - 40} ${sigmaCenterY - 12}, ${sigmaX - 5} ${sigmaCenterY - 12}`}
          fill="none"
          stroke={arrowColor}
          strokeWidth={1.8}
          markerEnd="url(#svd-arrow)"
        />
        {/* Bottom arrow: Sigma -> Column space */}
        <path
          d={`M ${sigmaX + sigmaW + 5} ${sigmaCenterY - 12} C ${sigmaX + sigmaW + 40} ${sigmaCenterY - 12}, ${rightX - 40} ${arrowTopY}, ${rightX - 5} ${arrowTopY}`}
          fill="none"
          stroke={arrowColor}
          strokeWidth={1.8}
          markerEnd="url(#svd-arrow)"
        />
        {/* Second pair of arrows (lower) for visual weight */}
        <path
          d={`M ${leftX + rectW + 5} ${arrowBotY} C ${leftX + rectW + 40} ${arrowBotY}, ${sigmaX - 40} ${sigmaCenterY + 12}, ${sigmaX - 5} ${sigmaCenterY + 12}`}
          fill="none"
          stroke={arrowColor}
          strokeWidth={1.8}
          markerEnd="url(#svd-arrow)"
        />
        <path
          d={`M ${sigmaX + sigmaW + 5} ${sigmaCenterY + 12} C ${sigmaX + sigmaW + 40} ${sigmaCenterY + 12}, ${rightX - 40} ${arrowBotY}, ${rightX - 5} ${arrowBotY}`}
          fill="none"
          stroke={arrowColor}
          strokeWidth={1.8}
          markerEnd="url(#svd-arrow)"
        />

        {/* Arrow label: "scale by sigma_i" above the top pair */}
        <text
          x={(leftX + rectW + sigmaX) / 2}
          y={arrowTopY - 18}
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize={12}
          fontFamily="var(--font-serif)"
          fontWeight={500}
          fill="rgba(0,0,0,0.45)"
        >
          {"v\u1D62"}
        </text>
        <text
          x={(sigmaX + sigmaW + rightX) / 2}
          y={arrowTopY - 18}
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize={12}
          fontFamily="var(--font-serif)"
          fontWeight={500}
          fill="rgba(0,0,0,0.45)"
        >
          {"\u03C3\u1D62 u\u1D62"}
        </text>
        {/* Central label for the mapping */}
        <text
          x={sigmaCenterX}
          y={sigmaY - 14}
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize={13}
          fontFamily="var(--font-serif)"
          fontWeight={600}
          fill="rgba(0,0,0,0.5)"
        >
          {"scale by \u03C3\u1D62"}
        </text>

        {/* ── Dashed arrow: Null space -> 0 ── */}
        {(() => {
          const midX = (leftX + rectW + rightX) / 2 + 60
          const killY = leftBottomCenter.y
          return (
            <>
              <path
                d={`M ${leftX + rectW + 5} ${killY} L ${midX + 6} ${killY}`}
                fill="none"
                stroke="rgba(0,0,0,0.18)"
                strokeWidth={1.6}
                strokeDasharray="6 4"
                markerEnd="url(#svd-arrow-faded)"
              />
              <text
                x={(leftX + rectW + midX) / 2}
                y={killY - 16}
                textAnchor="middle"
                fontSize={12}
                fontFamily="var(--font-serif)"
                fill="rgba(0,0,0,0.3)"
              >
                {"\u2192 0"}
              </text>
              <text
                x={midX + 22}
                y={killY + 1}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={18}
                fontWeight={700}
                fontFamily="var(--font-mono, monospace)"
                fill={nullSpace.text}
                opacity={0.6}
              >
                0
              </text>
            </>
          )
        })()}

        {/* ── Bottom annotation: rank = r ── */}
        <text
          x={450}
          y={rectY + rectH + 36}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={14}
          fontFamily="var(--font-mono, monospace)"
          fontWeight={600}
          fill="rgba(0,0,0,0.38)"
        >
          rank = r
        </text>

        {/* Dimension annotations at bottom */}
        <text
          x={leftX + rectW / 2}
          y={rectY + rectH + 36}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fontFamily="var(--font-mono, monospace)"
          fill="rgba(0,0,0,0.3)"
        >
          {"n dims total"}
        </text>
        <text
          x={rightX + rectW / 2}
          y={rectY + rectH + 36}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fontFamily="var(--font-mono, monospace)"
          fill="rgba(0,0,0,0.3)"
        >
          {"m dims total"}
        </text>
      </svg>
    </div>
  )
}
