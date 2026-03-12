import React, { useState, useRef, useMemo, useCallback, useEffect } from "react"
import {
  generateData,
  solveCCA,
  centerData,
  projectOntoDirection,
  computeCorrelation,
  vecNormalize,
} from "./cca-math"

/* ────────────────────────────────────────────
   Layout constants
   ──────────────────────────────────────────── */
const W = 900
const H = 350

// Three panels inside the viewBox
const PANEL = {
  A: { cx: 130, cy: 175, r: 100, label: "Dataset A" },
  B: { cx: 370, cy: 175, r: 100, label: "Dataset B" },
  P: { cx: 680, cy: 175, r: 120, label: "Projected" },
}

const ARROW_COLOR = "#4A7C6F"
const CCA_DASH = "5,4"
const HANDLE_R = 6
const POINT_R = 2.5
const ARROW_LEN = 85 // length of direction arrow inside scatter panel

const FONT_MONO = "var(--font-mono, monospace)"

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */
function scalePoints(points, cx, cy, r) {
  // Map 2D points into a circle of radius `r` centered at (cx, cy).
  // We find the max absolute value and scale so that all points sit
  // comfortably inside the panel (using 90% of the radius).
  let maxAbs = 0
  for (const [x, y] of points) {
    const a = Math.abs(x)
    const b = Math.abs(y)
    if (a > maxAbs) maxAbs = a
    if (b > maxAbs) maxAbs = b
  }
  if (maxAbs === 0) maxAbs = 1
  const s = (r * 0.9) / maxAbs
  return points.map(([x, y]) => [cx + x * s, cy - y * s]) // SVG y-axis is flipped
}

function scale1D(vals, center, halfRange) {
  let maxAbs = 0
  for (const v of vals) {
    const a = Math.abs(v)
    if (a > maxAbs) maxAbs = a
  }
  if (maxAbs === 0) maxAbs = 1
  const s = (halfRange * 0.9) / maxAbs
  return vals.map((v) => center + v * s)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function angleDiff(from, to) {
  let d = to - from
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
export default function ProjectionExplorer() {
  /* ── Fixed data on mount ── */
  const [data] = useState(() => {
    const raw = generateData(100, 0.9, 0.3)
    const cA = centerData(raw.Xa)
    const cB = centerData(raw.Xb)
    return {
      Xa: raw.Xa,
      Xb: raw.Xb,
      centeredXa: cA.centered,
      centeredXb: cB.centered,
    }
  })

  /* ── CCA solution (computed once) ── */
  const cca = useMemo(
    () => solveCCA(data.Xa, data.Xb),
    [data.Xa, data.Xb]
  )

  /* CCA optimal angles */
  const ccaAngleA = useMemo(() => {
    const w = vecNormalize(cca.Wa[0])
    return Math.atan2(w[1], w[0])
  }, [cca.Wa])

  const ccaAngleB = useMemo(() => {
    const w = vecNormalize(cca.Wb[0])
    return Math.atan2(w[1], w[0])
  }, [cca.Wb])

  /* ── Direction state — initialize randomly, away from CCA ── */
  const [dirA, setDirA] = useState(() => {
    const offset = (Math.random() * Math.PI * 0.5) + Math.PI * 0.3
    return ccaAngleA + (Math.random() > 0.5 ? offset : -offset)
  })
  const [dirB, setDirB] = useState(() => {
    const offset = (Math.random() * Math.PI * 0.5) + Math.PI * 0.3
    return ccaAngleB + (Math.random() > 0.5 ? offset : -offset)
  })

  /* ── Dragging ── */
  const [dragging, setDragging] = useState(null) // 'A' | 'B' | null
  const svgRef = useRef(null)

  const handlePointerDown = useCallback(
    (which) => (e) => {
      e.target.setPointerCapture(e.pointerId)
      setDragging(which)
    },
    []
  )

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging) return
      const svg = svgRef.current
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())

      const panel = dragging === "A" ? PANEL.A : PANEL.B
      // SVG y is inverted relative to math y
      const angle = Math.atan2(-(svgP.y - panel.cy), svgP.x - panel.cx)
      if (dragging === "A") setDirA(angle)
      else setDirB(angle)
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => {
    setDragging(null)
  }, [])

  /* ── Snap-to-CCA animation ── */
  const animRef = useRef(null)
  const [showCCA, setShowCCA] = useState(false)

  const snapToCCA = useCallback(() => {
    const startA = dirA
    const startB = dirB
    const dA = angleDiff(startA, ccaAngleA)
    const dB = angleDiff(startB, ccaAngleB)
    const duration = 600 // ms
    let start = null

    const step = (ts) => {
      if (!start) start = ts
      const elapsed = ts - start
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      setDirA(startA + dA * ease)
      setDirB(startB + dB * ease)
      if (t < 1) {
        animRef.current = requestAnimationFrame(step)
      }
    }
    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(step)
  }, [dirA, dirB, ccaAngleA, ccaAngleB])

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  /* ── Derived projections ── */
  const wA = useMemo(() => [Math.cos(dirA), Math.sin(dirA)], [dirA])
  const wB = useMemo(() => [Math.cos(dirB), Math.sin(dirB)], [dirB])

  const pA = useMemo(
    () => projectOntoDirection(data.centeredXa, wA),
    [data.centeredXa, wA]
  )
  const pB = useMemo(
    () => projectOntoDirection(data.centeredXb, wB),
    [data.centeredXb, wB]
  )

  const correlation = useMemo(() => computeCorrelation(pA, pB), [pA, pB])

  /* ── CCA optimal projections (for reference display) ── */
  const ccaCorr = useMemo(() => {
    const ccaWa = vecNormalize(cca.Wa[0])
    const ccaWb = vecNormalize(cca.Wb[0])
    const pa = projectOntoDirection(data.centeredXa, ccaWa)
    const pb = projectOntoDirection(data.centeredXb, ccaWb)
    return computeCorrelation(pa, pb)
  }, [cca, data.centeredXa, data.centeredXb])

  /* ── Scale points for display ── */
  const scA = useMemo(
    () => scalePoints(data.centeredXa, PANEL.A.cx, PANEL.A.cy, PANEL.A.r),
    [data.centeredXa]
  )
  const scB = useMemo(
    () => scalePoints(data.centeredXb, PANEL.B.cx, PANEL.B.cy, PANEL.B.r),
    [data.centeredXb]
  )

  // Right panel: scatter of (pA, pB)
  const scPx = useMemo(() => scale1D(pA, PANEL.P.cx, PANEL.P.r), [pA])
  const scPy = useMemo(() => scale1D(pB, PANEL.P.cy, PANEL.P.r), [pB])

  // Color by alignment: how close each point's projected pair is to
  // the regression line — use absolute product as a simple measure
  const pointColors = useMemo(() => {
    const maxAbs = Math.max(
      ...pA.map((v, i) => Math.abs(v * pB[i]))
    ) || 1
    return pA.map((v, i) => {
      const alignment = Math.abs(v * pB[i]) / maxAbs
      const r = Math.round(lerp(0, 74, alignment))    // 0 → #4A
      const g = Math.round(lerp(0, 124, alignment))   // 0 → #7C
      const b = Math.round(lerp(0, 111, alignment))   // 0 → #6F
      return `rgba(${r}, ${g}, ${b}, ${lerp(0.2, 0.6, alignment)})`
    })
  }, [pA, pB])

  /* ── Arrow endpoint positions ── */
  const arrowA = {
    x1: PANEL.A.cx,
    y1: PANEL.A.cy,
    x2: PANEL.A.cx + Math.cos(dirA) * ARROW_LEN,
    y2: PANEL.A.cy - Math.sin(dirA) * ARROW_LEN, // flip y
  }
  const arrowB = {
    x1: PANEL.B.cx,
    y1: PANEL.B.cy,
    x2: PANEL.B.cx + Math.cos(dirB) * ARROW_LEN,
    y2: PANEL.B.cy - Math.sin(dirB) * ARROW_LEN,
  }

  /* CCA reference arrows */
  const ccaArrowA = {
    x1: PANEL.A.cx,
    y1: PANEL.A.cy,
    x2: PANEL.A.cx + Math.cos(ccaAngleA) * ARROW_LEN,
    y2: PANEL.A.cy - Math.sin(ccaAngleA) * ARROW_LEN,
  }
  const ccaArrowB = {
    x1: PANEL.B.cx,
    y1: PANEL.B.cy,
    x2: PANEL.B.cx + Math.cos(ccaAngleB) * ARROW_LEN,
    y2: PANEL.B.cy - Math.sin(ccaAngleB) * ARROW_LEN,
  }

  /* ── Render ── */
  return (
    <div
      style={{
        width: "100%",
        fontFamily: FONT_MONO,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          cursor: dragging ? "grabbing" : "default",
          userSelect: "none",
          touchAction: "none",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          {/* Arrowhead marker */}
          <marker
            id="proj-arrow"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={ARROW_COLOR} />
          </marker>
          <marker
            id="proj-arrow-cca"
            markerWidth="8"
            markerHeight="5.6"
            refX="7"
            refY="2.8"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 8 2.8, 0 5.6"
              fill={ARROW_COLOR}
              opacity="0.35"
            />
          </marker>
        </defs>

        {/* ── Panel labels ── */}
        <text
          x={PANEL.A.cx}
          y={PANEL.A.cy - PANEL.A.r - 14}
          textAnchor="middle"
          fontSize="12"
          fontFamily={FONT_MONO}
          fill="#555"
        >
          Dataset A
        </text>
        <text
          x={PANEL.B.cx}
          y={PANEL.B.cy - PANEL.B.r - 14}
          textAnchor="middle"
          fontSize="12"
          fontFamily={FONT_MONO}
          fill="#555"
        >
          Dataset B
        </text>
        <text
          x={PANEL.P.cx}
          y={PANEL.P.cy - PANEL.P.r - 14}
          textAnchor="middle"
          fontSize="12"
          fontFamily={FONT_MONO}
          fill="#555"
        >
          Projected
        </text>

        {/* ── Section headings ── */}
        <text
          x={(PANEL.A.cx + PANEL.B.cx) / 2}
          y={22}
          textAnchor="middle"
          fontSize="13"
          fontFamily={FONT_MONO}
          fill="#333"
          fontWeight="600"
        >
          Choose projections
        </text>
        <text
          x={PANEL.P.cx}
          y={22}
          textAnchor="middle"
          fontSize="13"
          fontFamily={FONT_MONO}
          fill="#333"
          fontWeight="600"
        >
          X_a·w_a vs X_b·w_b
        </text>

        {/* ── Panel backgrounds ── */}
        {[PANEL.A, PANEL.B].map((p, i) => (
          <circle
            key={`bg-${i}`}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill="#fafafa"
            stroke="#e0e0e0"
            strokeWidth="1"
          />
        ))}
        <rect
          x={PANEL.P.cx - PANEL.P.r}
          y={PANEL.P.cy - PANEL.P.r}
          width={PANEL.P.r * 2}
          height={PANEL.P.r * 2}
          rx="4"
          fill="#fafafa"
          stroke="#e0e0e0"
          strokeWidth="1"
        />
        {/* Axes in projected panel */}
        <line
          x1={PANEL.P.cx - PANEL.P.r}
          y1={PANEL.P.cy}
          x2={PANEL.P.cx + PANEL.P.r}
          y2={PANEL.P.cy}
          stroke="#e0e0e0"
          strokeWidth="0.5"
        />
        <line
          x1={PANEL.P.cx}
          y1={PANEL.P.cy - PANEL.P.r}
          x2={PANEL.P.cx}
          y2={PANEL.P.cy + PANEL.P.r}
          stroke="#e0e0e0"
          strokeWidth="0.5"
        />
        {/* Axis labels */}
        <text
          x={PANEL.P.cx + PANEL.P.r - 2}
          y={PANEL.P.cy + 14}
          textAnchor="end"
          fontSize="9"
          fontFamily={FONT_MONO}
          fill="#999"
        >
          x_a·w_a
        </text>
        <text
          x={PANEL.P.cx + 8}
          y={PANEL.P.cy - PANEL.P.r + 12}
          textAnchor="start"
          fontSize="9"
          fontFamily={FONT_MONO}
          fill="#999"
        >
          x_b·w_b
        </text>

        {/* ── Data points: Panel A ── */}
        {scA.map(([x, y], i) => (
          <circle
            key={`a-${i}`}
            cx={x}
            cy={y}
            r={POINT_R}
            fill="rgba(0,0,0,0.2)"
          />
        ))}

        {/* ── Data points: Panel B ── */}
        {scB.map(([x, y], i) => (
          <circle
            key={`b-${i}`}
            cx={x}
            cy={y}
            r={POINT_R}
            fill="rgba(0,0,0,0.2)"
          />
        ))}

        {/* ── Data points: Projected panel ── */}
        {scPx.map((x, i) => (
          <circle
            key={`p-${i}`}
            cx={x}
            cy={scPy[i]}
            r={POINT_R}
            fill={pointColors[i]}
          >
            <animate attributeName="cx" to={x} dur="0.08s" />
            <animate attributeName="cy" to={scPy[i]} dur="0.08s" />
          </circle>
        ))}

        {/* ── CCA reference arrows (dashed) ── */}
        {showCCA && (
          <>
            <line
              x1={ccaArrowA.x1}
              y1={ccaArrowA.y1}
              x2={ccaArrowA.x2}
              y2={ccaArrowA.y2}
              stroke={ARROW_COLOR}
              strokeWidth="1.5"
              strokeDasharray={CCA_DASH}
              opacity="0.35"
              markerEnd="url(#proj-arrow-cca)"
            />
            <line
              x1={ccaArrowB.x1}
              y1={ccaArrowB.y1}
              x2={ccaArrowB.x2}
              y2={ccaArrowB.y2}
              stroke={ARROW_COLOR}
              strokeWidth="1.5"
              strokeDasharray={CCA_DASH}
              opacity="0.35"
              markerEnd="url(#proj-arrow-cca)"
            />
          </>
        )}

        {/* ── User direction arrows ── */}
        {/* Arrow A */}
        <line
          x1={arrowA.x1}
          y1={arrowA.y1}
          x2={arrowA.x2}
          y2={arrowA.y2}
          stroke={ARROW_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#proj-arrow)"
        />
        {/* Draggable handle A */}
        <circle
          cx={arrowA.x2}
          cy={arrowA.y2}
          r={HANDLE_R}
          fill={ARROW_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown("A")}
        />
        <text
          x={arrowA.x2 + 10}
          y={arrowA.y2 - 8}
          fontSize="10"
          fontFamily={FONT_MONO}
          fill={ARROW_COLOR}
          fontWeight="600"
        >
          w_a
        </text>

        {/* Arrow B */}
        <line
          x1={arrowB.x1}
          y1={arrowB.y1}
          x2={arrowB.x2}
          y2={arrowB.y2}
          stroke={ARROW_COLOR}
          strokeWidth="2.5"
          markerEnd="url(#proj-arrow)"
        />
        {/* Draggable handle B */}
        <circle
          cx={arrowB.x2}
          cy={arrowB.y2}
          r={HANDLE_R}
          fill={ARROW_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown("B")}
        />
        <text
          x={arrowB.x2 + 10}
          y={arrowB.y2 - 8}
          fontSize="10"
          fontFamily={FONT_MONO}
          fill={ARROW_COLOR}
          fontWeight="600"
        >
          w_b
        </text>

        {/* ── Correlation readout ── */}
        <text
          x={PANEL.P.cx}
          y={PANEL.P.cy + PANEL.P.r + 22}
          textAnchor="middle"
          fontSize="14"
          fontFamily={FONT_MONO}
          fill="#333"
          fontWeight="600"
        >
          {"ρ = " + correlation.toFixed(3)}
        </text>
        <text
          x={PANEL.P.cx}
          y={PANEL.P.cy + PANEL.P.r + 38}
          textAnchor="middle"
          fontSize="11"
          fontFamily={FONT_MONO}
          fill="#999"
        >
          {"(CCA optimal: ρ = " + Math.abs(ccaCorr).toFixed(3) + ")"}
        </text>

        {/* ── Drag hint ── */}
        {!dragging && (
          <text
            x={(PANEL.A.cx + PANEL.B.cx) / 2}
            y={PANEL.A.cy + PANEL.A.r + 22}
            textAnchor="middle"
            fontSize="10"
            fontFamily={FONT_MONO}
            fill="#bbb"
          >
            drag arrow tips to change projection
          </text>
        )}
      </svg>

      {/* ── Controls below SVG ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.2rem",
          marginTop: "0.4rem",
          fontFamily: FONT_MONO,
          fontSize: "13px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            cursor: "pointer",
            color: "#555",
          }}
        >
          <input
            type="checkbox"
            checked={showCCA}
            onChange={(e) => setShowCCA(e.target.checked)}
            style={{ accentColor: ARROW_COLOR }}
          />
          Show CCA solution
        </label>
        <button
          onClick={snapToCCA}
          style={{
            fontFamily: FONT_MONO,
            fontSize: "12px",
            padding: "4px 12px",
            border: `1px solid ${ARROW_COLOR}`,
            borderRadius: "4px",
            background: "transparent",
            color: ARROW_COLOR,
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = ARROW_COLOR
            e.currentTarget.style.color = "#fff"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = ARROW_COLOR
          }}
        >
          Snap to CCA
        </button>
      </div>
    </div>
  )
}
