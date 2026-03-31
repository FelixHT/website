import React, { useState, useMemo, useCallback, useRef } from "react"

/* ─── Layout ─── */
const W = 700
const H = 370
const PAD = 15

/* Left panel: complex plane */
const LP_X = PAD
const LP_Y = PAD
const LP_W = 350
const LP_H = 340
const LP_CX = LP_X + LP_W / 2
const LP_CY = LP_Y + LP_H / 2
const LP_RANGE = 1.5
const LP_SCALE = (LP_W / 2 - 20) / LP_RANGE

/* Right panel: trajectories */
const RP_X = LP_X + LP_W + 30
const RP_Y = PAD
const RP_W = 300
const RP_H = 340
const RP_PAD_L = 30
const RP_PAD_R = 10
const RP_PAD_T = 18
const RP_PAD_B = 24
const RP_PLOT_H = (RP_H - 20) / 2
const RP_INNER_W = RP_W - RP_PAD_L - RP_PAD_R
const RP_INNER_H = RP_PLOT_H - RP_PAD_T - RP_PAD_B

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const RED = "#c0503a"
const FONT = "var(--font-mono, monospace)"

/* ─── Time steps ─── */
const N_STEPS = 60
const Y_CLIP = 5

/* ─── Helpers ─── */
function mag(re, im) {
  return Math.sqrt(re * re + im * im)
}

function computeTrajectory1(re, im) {
  const r = mag(re, im)
  const omega = Math.atan2(im, re)
  const pts = []
  for (let t = 0; t <= N_STEPS; t++) {
    const envelope = Math.pow(r, t)
    const val = envelope * Math.cos(omega * t)
    pts.push({
      t,
      val: Math.max(-Y_CLIP, Math.min(Y_CLIP, val)),
      envPos: Math.min(Y_CLIP, envelope),
      envNeg: Math.max(-Y_CLIP, -envelope),
    })
  }
  return pts
}

function computeTrajectory2(re) {
  const pts = []
  for (let t = 0; t <= N_STEPS; t++) {
    const val = Math.pow(re, t)
    pts.push({ t, val: Math.max(-Y_CLIP, Math.min(Y_CLIP, val)) })
  }
  return pts
}

function toComplex(svgX, svgY) {
  return {
    re: (svgX - LP_CX) / LP_SCALE,
    im: -(svgY - LP_CY) / LP_SCALE,
  }
}

function fromComplex(re, im) {
  return {
    x: LP_CX + re * LP_SCALE,
    y: LP_CY - im * LP_SCALE,
  }
}

function trajectoryPath(pts, xScale, yScale, originX, originY) {
  return pts
    .map((p, i) => {
      const x = originX + p.t * xScale
      const y = originY - p.val * yScale
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join("")
}

function envelopePath(pts, key, xScale, yScale, originX, originY) {
  return pts
    .map((p, i) => {
      const x = originX + p.t * xScale
      const y = originY - p[key] * yScale
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join("")
}

/* ─── Component ─── */
export default function EigenvalueMapExplorer() {
  const [eig1, setEig1] = useState({ re: 0.85, im: 0.35 })
  const [eig2Re, setEig2Re] = useState(0.6)
  const [dragging, setDragging] = useState(null)
  const svgRef = useRef(null)

  /* Derived values */
  const mag1 = mag(eig1.re, eig1.im)
  const mag2 = Math.abs(eig2Re)
  const color1 = mag1 <= 1 ? TEAL : RED
  const color2 = mag2 <= 1 ? TEAL : RED

  /* Trajectories */
  const traj1 = useMemo(() => computeTrajectory1(eig1.re, eig1.im), [eig1.re, eig1.im])
  const traj2 = useMemo(() => computeTrajectory2(eig2Re), [eig2Re])

  /* Y-axis scale for trajectory plots */
  const yExtent1 = useMemo(() => {
    let mx = 1
    for (const p of traj1) {
      mx = Math.max(mx, Math.abs(p.val), Math.abs(p.envPos), Math.abs(p.envNeg))
    }
    return mx * 1.1
  }, [traj1])

  const yExtent2 = useMemo(() => {
    let mx = 1
    for (const p of traj2) {
      mx = Math.max(mx, Math.abs(p.val))
    }
    return mx * 1.1
  }, [traj2])

  /* Drag handlers */
  const getSVGPoint = useCallback(
    (e) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      const scaleX = W / rect.width
      const scaleY = H / rect.height
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    },
    []
  )

  const onMouseDown1 = useCallback((e) => {
    e.preventDefault()
    setDragging("eig1")
  }, [])

  const onMouseDown2 = useCallback((e) => {
    e.preventDefault()
    setDragging("eig2")
  }, [])

  const onMouseMove = useCallback(
    (e) => {
      if (!dragging) return
      const pt = getSVGPoint(e)
      const c = toComplex(pt.x, pt.y)
      if (dragging === "eig1") {
        const clampedRe = Math.max(-LP_RANGE, Math.min(LP_RANGE, c.re))
        const clampedIm = Math.max(0, Math.min(LP_RANGE, c.im))
        setEig1({ re: clampedRe, im: clampedIm })
      } else if (dragging === "eig2") {
        const clampedRe = Math.max(-LP_RANGE, Math.min(LP_RANGE, c.re))
        setEig2Re(clampedRe)
      }
    },
    [dragging, getSVGPoint]
  )

  const onMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  /* Eigenvalue positions in SVG */
  const eig1Top = fromComplex(eig1.re, eig1.im)
  const eig1Bot = fromComplex(eig1.re, -eig1.im)
  const eig2Pos = fromComplex(eig2Re, 0)

  /* Unit circle radius in SVG pixels */
  const unitR = LP_SCALE

  /* Trajectory plot scales */
  const xScale1 = RP_INNER_W / N_STEPS
  const yScale1 = RP_INNER_H / 2 / yExtent1
  const plot1OriginX = RP_X + RP_PAD_L
  const plot1OriginY = RP_Y + RP_PAD_T + RP_INNER_H / 2

  const xScale2 = RP_INNER_W / N_STEPS
  const yScale2 = RP_INNER_H / 2 / yExtent2
  const plot2Top = RP_Y + RP_PLOT_H + 10
  const plot2OriginX = RP_X + RP_PAD_L
  const plot2OriginY = plot2Top + RP_PAD_T + RP_INNER_H / 2

  /* Tick values for trajectory y-axes */
  const yTicks1 = useMemo(() => {
    const e = yExtent1
    if (e <= 1.5) return [-1, 0, 1]
    if (e <= 3) return [-2, 0, 2]
    return [-4, 0, 4]
  }, [yExtent1])

  const yTicks2 = useMemo(() => {
    const e = yExtent2
    if (e <= 1.5) return [-1, 0, 1]
    if (e <= 3) return [-2, 0, 2]
    return [-4, 0, 4]
  }, [yExtent2])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", userSelect: "none" }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* ─── Left panel: Complex plane ─── */}
      <rect x={LP_X} y={LP_Y} width={LP_W} height={LP_H} fill="none" />

      {/* Stable region fill */}
      <circle cx={LP_CX} cy={LP_CY} r={unitR} fill="rgba(74,124,111,0.03)" stroke="none" />

      {/* Unit circle */}
      <circle
        cx={LP_CX}
        cy={LP_CY}
        r={unitR}
        fill="none"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth={1}
        strokeDasharray="4,3"
      />

      {/* Axes */}
      <line
        x1={LP_X + 10}
        y1={LP_CY}
        x2={LP_X + LP_W - 10}
        y2={LP_CY}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={0.8}
      />
      <line
        x1={LP_CX}
        y1={LP_Y + 10}
        x2={LP_CX}
        y2={LP_Y + LP_H - 10}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={0.8}
      />

      {/* Axis tick marks */}
      {[-1, 1].map((v) => {
        const px = fromComplex(v, 0)
        const py = fromComplex(0, v)
        return (
          <g key={v}>
            <line x1={px.x} y1={LP_CY - 3} x2={px.x} y2={LP_CY + 3} stroke="rgba(0,0,0,0.3)" strokeWidth={0.8} />
            <text x={px.x} y={LP_CY + 14} textAnchor="middle" fontSize={9} fill="rgba(0,0,0,0.4)" fontFamily={FONT}>
              {v}
            </text>
            <line x1={LP_CX - 3} y1={py.y} x2={LP_CX + 3} y2={py.y} stroke="rgba(0,0,0,0.3)" strokeWidth={0.8} />
            <text x={LP_CX - 8} y={py.y + 3} textAnchor="end" fontSize={9} fill="rgba(0,0,0,0.4)" fontFamily={FONT}>
              {v}i
            </text>
          </g>
        )
      })}

      {/* Axis labels */}
      <text
        x={LP_X + LP_W - 8}
        y={LP_CY - 8}
        textAnchor="end"
        fontSize={11}
        fill="rgba(0,0,0,0.5)"
        fontFamily={FONT}
      >
        Re
      </text>
      <text
        x={LP_CX + 10}
        y={LP_Y + 20}
        textAnchor="start"
        fontSize={11}
        fill="rgba(0,0,0,0.5)"
        fontFamily={FONT}
      >
        Im
      </text>

      {/* "stable" label */}
      <text
        x={LP_CX - unitR * 0.38}
        y={LP_CY + unitR * 0.55}
        fontSize={10}
        fill="rgba(74,124,111,0.35)"
        fontFamily={FONT}
      >
        stable
      </text>

      {/* |lambda| = 1 label */}
      <text
        x={LP_CX + unitR * 0.62}
        y={LP_CY - unitR * 0.72}
        fontSize={9}
        fill="rgba(0,0,0,0.3)"
        fontFamily={FONT}
        transform={`rotate(-30, ${LP_CX + unitR * 0.62}, ${LP_CY - unitR * 0.72})`}
      >
        |λ| = 1
      </text>

      {/* ─── Eigenvalue pair 1: conjugate pair ─── */}
      {/* Conjugate connecting line */}
      {eig1.im > 0.01 && (
        <line
          x1={eig1Top.x}
          y1={eig1Top.y}
          x2={eig1Bot.x}
          y2={eig1Bot.y}
          stroke={color1}
          strokeWidth={0.8}
          strokeOpacity={0.3}
        />
      )}

      {/* Top eigenvalue (draggable) */}
      <circle
        cx={eig1Top.x}
        cy={eig1Top.y}
        r={6}
        fill={color1}
        stroke="#fff"
        strokeWidth={1.5}
        cursor={dragging === "eig1" ? "grabbing" : "grab"}
        onMouseDown={onMouseDown1}
      />

      {/* Bottom eigenvalue (mirror) */}
      {eig1.im > 0.01 && (
        <circle
          cx={eig1Bot.x}
          cy={eig1Bot.y}
          r={6}
          fill={color1}
          stroke="#fff"
          strokeWidth={1.5}
          opacity={0.5}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* |lambda| label for pair 1 */}
      <text
        x={eig1Top.x + 10}
        y={eig1Top.y - 10}
        fontSize={9}
        fill={color1}
        fontFamily={FONT}
      >
        |λ| = {mag1.toFixed(2)}
      </text>

      {/* ─── Eigenvalue 2: real ─── */}
      <circle
        cx={eig2Pos.x}
        cy={eig2Pos.y}
        r={6}
        fill={color2}
        stroke="#fff"
        strokeWidth={1.5}
        cursor={dragging === "eig2" ? "grabbing" : "grab"}
        onMouseDown={onMouseDown2}
      />

      {/* |lambda| label for eigenvalue 2 */}
      <text
        x={eig2Pos.x + 10}
        y={eig2Pos.y - 10}
        fontSize={9}
        fill={color2}
        fontFamily={FONT}
      >
        |λ| = {mag2.toFixed(2)}
      </text>

      {/* ─── Right panel: Mode trajectories ─── */}

      {/* ─── Plot 1: Mode 1 (complex pair) ─── */}
      <g>
        {/* Title */}
        <text
          x={RP_X + RP_W / 2}
          y={RP_Y + 10}
          textAnchor="middle"
          fontSize={10}
          fill="rgba(0,0,0,0.5)"
          fontFamily={FONT}
        >
          Mode 1 — Re(λ₁ᵗ)
        </text>

        {/* Plot area border */}
        <rect
          x={plot1OriginX}
          y={RP_Y + RP_PAD_T}
          width={RP_INNER_W}
          height={RP_INNER_H}
          fill="rgba(0,0,0,0.015)"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={0.5}
        />

        {/* Zero line */}
        <line
          x1={plot1OriginX}
          y1={plot1OriginY}
          x2={plot1OriginX + RP_INNER_W}
          y2={plot1OriginY}
          stroke="rgba(0,0,0,0.12)"
          strokeWidth={0.5}
        />

        {/* Y-axis ticks */}
        {yTicks1.map((v) => {
          const y = plot1OriginY - v * yScale1
          if (y < RP_Y + RP_PAD_T || y > RP_Y + RP_PAD_T + RP_INNER_H) return null
          return (
            <g key={v}>
              <line x1={plot1OriginX - 3} y1={y} x2={plot1OriginX} y2={y} stroke="rgba(0,0,0,0.2)" strokeWidth={0.5} />
              <text x={plot1OriginX - 5} y={y + 3} textAnchor="end" fontSize={8} fill="rgba(0,0,0,0.35)" fontFamily={FONT}>
                {v}
              </text>
            </g>
          )
        })}

        {/* X-axis ticks */}
        {[0, 20, 40, 60].map((t) => {
          const x = plot1OriginX + t * xScale1
          return (
            <g key={t}>
              <line
                x1={x}
                y1={RP_Y + RP_PAD_T + RP_INNER_H}
                x2={x}
                y2={RP_Y + RP_PAD_T + RP_INNER_H + 3}
                stroke="rgba(0,0,0,0.2)"
                strokeWidth={0.5}
              />
              <text
                x={x}
                y={RP_Y + RP_PAD_T + RP_INNER_H + 12}
                textAnchor="middle"
                fontSize={8}
                fill="rgba(0,0,0,0.35)"
                fontFamily={FONT}
              >
                {t}
              </text>
            </g>
          )
        })}

        {/* Envelope lines */}
        <path
          d={envelopePath(traj1, "envPos", xScale1, yScale1, plot1OriginX, plot1OriginY)}
          fill="none"
          stroke={color1}
          strokeWidth={0.8}
          strokeDasharray="3,3"
          strokeOpacity={0.3}
          clipPath="url(#clip-plot1)"
        />
        <path
          d={envelopePath(traj1, "envNeg", xScale1, yScale1, plot1OriginX, plot1OriginY)}
          fill="none"
          stroke={color1}
          strokeWidth={0.8}
          strokeDasharray="3,3"
          strokeOpacity={0.3}
          clipPath="url(#clip-plot1)"
        />

        {/* Trajectory line */}
        <path
          d={trajectoryPath(traj1, xScale1, yScale1, plot1OriginX, plot1OriginY)}
          fill="none"
          stroke={color1}
          strokeWidth={1.5}
          clipPath="url(#clip-plot1)"
        />
      </g>

      {/* ─── Plot 2: Mode 2 (real eigenvalue) ─── */}
      <g>
        {/* Title */}
        <text
          x={RP_X + RP_W / 2}
          y={plot2Top + 10}
          textAnchor="middle"
          fontSize={10}
          fill="rgba(0,0,0,0.5)"
          fontFamily={FONT}
        >
          Mode 2 — λ₂ᵗ
        </text>

        {/* Plot area border */}
        <rect
          x={plot2OriginX}
          y={plot2Top + RP_PAD_T}
          width={RP_INNER_W}
          height={RP_INNER_H}
          fill="rgba(0,0,0,0.015)"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={0.5}
        />

        {/* Zero line */}
        <line
          x1={plot2OriginX}
          y1={plot2OriginY}
          x2={plot2OriginX + RP_INNER_W}
          y2={plot2OriginY}
          stroke="rgba(0,0,0,0.12)"
          strokeWidth={0.5}
        />

        {/* Y-axis ticks */}
        {yTicks2.map((v) => {
          const y = plot2OriginY - v * yScale2
          if (y < plot2Top + RP_PAD_T || y > plot2Top + RP_PAD_T + RP_INNER_H) return null
          return (
            <g key={v}>
              <line x1={plot2OriginX - 3} y1={y} x2={plot2OriginX} y2={y} stroke="rgba(0,0,0,0.2)" strokeWidth={0.5} />
              <text x={plot2OriginX - 5} y={y + 3} textAnchor="end" fontSize={8} fill="rgba(0,0,0,0.35)" fontFamily={FONT}>
                {v}
              </text>
            </g>
          )
        })}

        {/* X-axis ticks */}
        {[0, 20, 40, 60].map((t) => {
          const x = plot2OriginX + t * xScale2
          return (
            <g key={t}>
              <line
                x1={x}
                y1={plot2Top + RP_PAD_T + RP_INNER_H}
                x2={x}
                y2={plot2Top + RP_PAD_T + RP_INNER_H + 3}
                stroke="rgba(0,0,0,0.2)"
                strokeWidth={0.5}
              />
              <text
                x={x}
                y={plot2Top + RP_PAD_T + RP_INNER_H + 12}
                textAnchor="middle"
                fontSize={8}
                fill="rgba(0,0,0,0.35)"
                fontFamily={FONT}
              >
                {t}
              </text>
            </g>
          )
        })}

        {/* Trajectory line */}
        <path
          d={trajectoryPath(traj2, xScale2, yScale2, plot2OriginX, plot2OriginY)}
          fill="none"
          stroke={color2}
          strokeWidth={1.5}
          clipPath="url(#clip-plot2)"
        />
      </g>

      {/* ─── Clip paths for trajectory plots ─── */}
      <defs>
        <clipPath id="clip-plot1">
          <rect x={plot1OriginX} y={RP_Y + RP_PAD_T} width={RP_INNER_W} height={RP_INNER_H} />
        </clipPath>
        <clipPath id="clip-plot2">
          <rect x={plot2OriginX} y={plot2Top + RP_PAD_T} width={RP_INNER_W} height={RP_INNER_H} />
        </clipPath>
      </defs>

      {/* X-axis label for plots */}
      <text
        x={RP_X + RP_PAD_L + RP_INNER_W / 2}
        y={H - 2}
        textAnchor="middle"
        fontSize={9}
        fill="rgba(0,0,0,0.4)"
        fontFamily={FONT}
      >
        time step t
      </text>
    </svg>
  )
}
