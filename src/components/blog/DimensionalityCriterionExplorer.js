import React, { useState, useRef, useCallback } from "react"

/* ─── Layout ─── */
const W = 600
const H = 300
const FONT = "var(--font-mono, monospace)"

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const RED = "#c0503a"
const GRAY = "rgba(0,0,0,0.12)"

/* ─── Data ─── */
const SINGULAR_VALUES = [8.5, 6.2, 0.9, 0.7, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2]
const N = SINGULAR_VALUES.length
const DEFAULT_THRESHOLD = 3.0

/* ─── Chart geometry ─── */
const BAR_W = 40
const BAR_GAP = 12
const CHART_L = 52       // left margin
const CHART_R = W - 24   // right margin
const CHART_TOP = 36     // top margin (for "signal" / "noise floor" labels)
const CHART_BOT = H - 46 // bottom margin (for σ labels)
const CHART_H = CHART_BOT - CHART_TOP

const SV_MAX = 9.5       // scale top
const SV_MIN = 0.0

/* Map a singular value to a y pixel coordinate */
function svToY(sv) {
  const frac = (sv - SV_MIN) / (SV_MAX - SV_MIN)
  return CHART_BOT - frac * CHART_H
}

/* Map a y pixel coordinate to a singular value */
function yToSv(y) {
  const frac = (CHART_BOT - y) / CHART_H
  return SV_MIN + frac * (SV_MAX - SV_MIN)
}

/* Bar x center for bar index i (0-based) */
function barX(i) {
  const totalW = N * BAR_W + (N - 1) * BAR_GAP
  const startX = CHART_L + (CHART_R - CHART_L - totalW) / 2
  return startX + i * (BAR_W + BAR_GAP) + BAR_W / 2
}

/* Subscript digits map */
const SUB = { 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉", 10: "₁₀" }

export default function DimensionalityCriterionExplorer() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef(null)

  /* Convert SVG-local y to singular value, clamped */
  const applyDrag = useCallback((clientY) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleY = H / rect.height
    const localY = (clientY - rect.top) * scaleY
    const sv = yToSv(localY)
    setThreshold(Math.min(9.0, Math.max(0.1, sv)))
  }, [])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    applyDrag(e.clientY)
  }, [dragging, applyDrag])

  const handleMouseUp = useCallback(() => setDragging(false), [])
  const handleMouseLeave = useCallback(() => setDragging(false), [])

  /* Touch support */
  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return
    applyDrag(e.touches[0].clientY)
  }, [dragging, applyDrag])

  const handleTouchEnd = useCallback(() => setDragging(false), [])

  /* Derived */
  const thresholdY = svToY(threshold)
  const d = SINGULAR_VALUES.filter(sv => sv > threshold).length

  /* Annotation: is threshold in the gap (between σ₂=6.2 and σ₃=0.9)? */
  const inGap = threshold > 0.9 && threshold < 6.2

  /* x coordinates for σ₂ and σ₃ bars */
  const x2 = barX(1)
  const x3 = barX(2)
  const gapMidX = (x2 + BAR_W / 2 + x3 - BAR_W / 2) / 2
  const gapMidY = svToY((6.2 + 0.9) / 2)

  /* "signal" label: center of first 2 bars */
  const signalMidX = (barX(0) + barX(1)) / 2
  /* "noise floor" label: center of bars 3–10 */
  const noiseMidX = (barX(2) + barX(9)) / 2

  return (
    <div style={{ userSelect: "none", touchAction: "none" }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          display: "block",
          width: "100%",
          cursor: dragging ? "ns-resize" : "default",
          fontFamily: FONT,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── Bars ── */}
        {SINGULAR_VALUES.map((sv, i) => {
          const cx = barX(i)
          const barTop = svToY(sv)
          const barH = CHART_BOT - barTop
          const above = sv > threshold
          return (
            <rect
              key={i}
              x={cx - BAR_W / 2}
              y={barTop}
              width={BAR_W}
              height={barH}
              fill={above ? TEAL : GRAY}
              rx={2}
            />
          )
        })}

        {/* ── Singular value labels above each bar ── */}
        {SINGULAR_VALUES.map((sv, i) => {
          const cx = barX(i)
          const barTop = svToY(sv)
          return (
            <text
              key={i}
              x={cx}
              y={barTop - 5}
              textAnchor="middle"
              fontSize={9}
              fill={sv > threshold ? TEAL : "rgba(0,0,0,0.35)"}
              fontFamily={FONT}
            >
              {sv}
            </text>
          )
        })}

        {/* ── Bar labels (σ₁ … σ₁₀) below bars ── */}
        {SINGULAR_VALUES.map((_, i) => {
          const cx = barX(i)
          return (
            <text
              key={i}
              x={cx}
              y={CHART_BOT + 16}
              textAnchor="middle"
              fontSize={11}
              fill="rgba(0,0,0,0.5)"
              fontFamily={FONT}
            >
              {`σ${SUB[i + 1]}`}
            </text>
          )
        })}

        {/* ── "signal" region label ── */}
        <text
          x={signalMidX}
          y={CHART_TOP - 6}
          textAnchor="middle"
          fontSize={10}
          fill={TEAL}
          fontFamily={FONT}
          opacity={d >= 2 ? 1 : 0.35}
        >
          signal
        </text>

        {/* ── "noise floor" region label ── */}
        <text
          x={noiseMidX}
          y={CHART_TOP - 6}
          textAnchor="middle"
          fontSize={10}
          fill="rgba(0,0,0,0.4)"
          fontFamily={FONT}
        >
          noise floor
        </text>

        {/* ── Threshold line ── */}
        <line
          x1={CHART_L}
          y1={thresholdY}
          x2={CHART_R - 10}
          y2={thresholdY}
          stroke={RED}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          style={{ cursor: "ns-resize" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />

        {/* ── Drag handle (circle at right edge) ── */}
        <circle
          cx={CHART_R - 10}
          cy={thresholdY}
          r={6}
          fill={RED}
          style={{ cursor: "ns-resize" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />

        {/* ── d = N label ── */}
        <text
          x={CHART_L + 2}
          y={thresholdY - 7}
          fontSize={11}
          fill={RED}
          fontFamily={FONT}
        >
          {`d = ${d}`}
        </text>

        {/* ── Gap annotation (only when threshold is in the gap) ── */}
        {inGap && (
          <g>
            {/* Arrow from annotation text to gap */}
            <line
              x1={gapMidX + 28}
              y1={gapMidY - 8}
              x2={gapMidX + 6}
              y2={gapMidY + 2}
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={1}
              markerEnd="url(#arrowhead)"
            />
            <text
              x={gapMidX + 30}
              y={gapMidY - 10}
              fontSize={10}
              fill="rgba(0,0,0,0.6)"
              fontFamily={FONT}
              textAnchor="start"
            >
              gap
            </text>
          </g>
        )}

        {/* ── Arrowhead marker ── */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth={6}
            markerHeight={6}
            refX={3}
            refY={3}
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="rgba(0,0,0,0.55)" />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
