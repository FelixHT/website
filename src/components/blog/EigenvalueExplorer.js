import React, { useState, useMemo, useCallback, useRef } from "react"
import { scaleLinear } from "d3-scale"

const W = 720
const H = 320
const LEFT_W = 280
const RIGHT_W = 340
const RIGHT_X = LEFT_W + 40
const MARGIN = { top: 25, bottom: 40 }
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T_STEPS = 300
const COLOR_LATENT = "#4A90D9"
const COLOR_UNIT = "#ccc"

/**
 * Simulate 2D dynamics from a pair of eigenvalues (complex conjugate pair).
 * eigenvalue = r * e^{i*theta} where r = magnitude, theta = angle.
 * A = R * [[r, 0], [0, r]] * R^{-1} where R is rotation by theta.
 * Simplified: A = r * [[cos(theta), -sin(theta)], [sin(theta), cos(theta)]]
 */
function simulate2D(r, theta, T, sigmaW = 0.02) {
  const A = [
    [r * Math.cos(theta), -r * Math.sin(theta)],
    [r * Math.sin(theta), r * Math.cos(theta)],
  ]
  const X = new Array(T)
  X[0] = [1, 0] // start on x-axis
  const rng = mulberry(42)
  for (let t = 0; t < T - 1; t++) {
    const w1 = sigmaW * gaussRng(rng)
    const w2 = sigmaW * gaussRng(rng)
    X[t + 1] = [
      A[0][0] * X[t][0] + A[0][1] * X[t][1] + w1,
      A[1][0] * X[t][0] + A[1][1] * X[t][1] + w2,
    ]
  }
  return X
}

function mulberry(seed) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussRng(rng) {
  const u1 = rng() || 1e-15
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export default function EigenvalueExplorer() {
  const [magnitude, setMagnitude] = useState(0.98)
  const [angle, setAngle] = useState(0.15)
  const svgRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  // Eigenvalue position in complex plane
  const eigReal = magnitude * Math.cos(angle)
  const eigImag = magnitude * Math.sin(angle)

  const trajectory = useMemo(
    () => simulate2D(magnitude, angle, T_STEPS),
    [magnitude, angle]
  )

  // Left panel: complex plane with unit circle and eigenvalue dot
  const cpScale = useMemo(
    () => scaleLinear().domain([-1.4, 1.4]).range([10, LEFT_W - 10]),
    []
  )
  const cpScaleY = useMemo(
    () => scaleLinear().domain([-1.4, 1.4]).range([PLOT_H - 10, 10]),
    []
  )

  // Right panel: trajectory
  const { sxR, syR } = useMemo(() => {
    const allX = trajectory.map(p => p[0])
    const allY = trajectory.map(p => p[1])
    const mn = Math.min(Math.min(...allX), Math.min(...allY))
    const mx = Math.max(Math.max(...allX), Math.max(...allY))
    const pad = (mx - mn) * 0.1 || 1
    const range = Math.max(mx + pad, -(mn - pad)) // symmetric
    return {
      sxR: scaleLinear().domain([-range, range]).range([10, RIGHT_W - 10]),
      syR: scaleLinear().domain([-range, range]).range([PLOT_H - 10, 10]),
    }
  }, [trajectory])

  // Drag eigenvalue in complex plane
  const handlePointerDown = useCallback((e) => {
    setDragging(true)
    e.target.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    const re = cpScale.invert(svgP.x)
    const im = cpScaleY.invert(svgP.y - MARGIN.top)
    const r = Math.sqrt(re * re + im * im)
    const th = Math.atan2(im, re)
    setMagnitude(Math.min(1.15, Math.max(0.5, r)))
    setAngle(Math.max(0.01, Math.abs(th)))
  }, [dragging, cpScale, cpScaleY])

  const handlePointerUp = useCallback(() => setDragging(false), [])

  // Behavior label
  let behaviorLabel = ""
  if (magnitude < 0.97) behaviorLabel = "Decaying"
  else if (magnitude > 1.02) behaviorLabel = "Growing"
  else behaviorLabel = "Sustained"
  if (angle > 0.05) behaviorLabel += " oscillation"
  else behaviorLabel += " (real)"

  const freqLabel = angle > 0.05
    ? `ω = ${angle.toFixed(2)} rad/step`
    : "No oscillation"

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Left: complex plane */}
        <g transform={`translate(0, ${MARGIN.top})`}>
          {/* Axes */}
          <line x1={cpScale(-1.4)} y1={cpScaleY(0)} x2={cpScale(1.4)} y2={cpScaleY(0)} stroke="#ddd" strokeWidth={0.5} />
          <line x1={cpScale(0)} y1={cpScaleY(-1.4)} x2={cpScale(0)} y2={cpScaleY(1.4)} stroke="#ddd" strokeWidth={0.5} />

          {/* Unit circle */}
          <circle
            cx={cpScale(0)} cy={cpScaleY(0)}
            r={cpScale(1) - cpScale(0)}
            fill="none" stroke={COLOR_UNIT} strokeWidth={1.5} strokeDasharray="4 3"
          />
          <text
            x={cpScale(1) + 4} y={cpScaleY(0) - 6}
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#aaa" }}
          >
            |λ| = 1
          </text>

          {/* Eigenvalue dot (draggable) — show conjugate pair */}
          <circle cx={cpScale(eigReal)} cy={cpScaleY(eigImag)} r={7} fill={COLOR_LATENT} style={{ cursor: "grab" }}
            onPointerDown={handlePointerDown} />
          <circle cx={cpScale(eigReal)} cy={cpScaleY(-eigImag)} r={7} fill={COLOR_LATENT} opacity={0.4} />

          {/* Eigenvalue label */}
          <text
            x={cpScale(eigReal) + 12} y={cpScaleY(eigImag) + 4}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: COLOR_LATENT }}
          >
            λ = {eigReal.toFixed(2)} + {eigImag.toFixed(2)}i
          </text>
          <text
            x={cpScale(eigReal) + 12} y={cpScaleY(-eigImag) + 4}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: COLOR_LATENT, opacity: 0.4 }}
          >
            λ̄ = {eigReal.toFixed(2)} − {eigImag.toFixed(2)}i
          </text>

          {/* Magnitude arc */}
          <circle cx={cpScale(0)} cy={cpScaleY(0)} r={cpScale(magnitude) - cpScale(0)}
            fill="none" stroke={COLOR_LATENT} strokeWidth={0.5} opacity={0.3} />

          <text
            x={LEFT_W / 2} y={-8} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Complex plane — drag the eigenvalue
          </text>

          <text
            x={LEFT_W / 2} y={PLOT_H + 16} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
          >
            Re(λ)
          </text>
          <text
            x={6} y={PLOT_H / 2} textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(-90, 6, ${PLOT_H / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
          >
            Im(λ)
          </text>
        </g>

        {/* Right: trajectory */}
        <g transform={`translate(${RIGHT_X}, ${MARGIN.top})`}>
          {/* Trajectory with time opacity */}
          {trajectory.map((p, t) => {
            if (t === 0) return null
            const opacity = 0.15 + 0.7 * (t / (T_STEPS - 1))
            return (
              <line
                key={t}
                x1={sxR(trajectory[t - 1][0])} y1={syR(trajectory[t - 1][1])}
                x2={sxR(p[0])} y2={syR(p[1])}
                stroke={COLOR_LATENT}
                strokeWidth={1}
                opacity={opacity}
              />
            )
          })}

          {/* Start marker */}
          <circle cx={sxR(trajectory[0][0])} cy={syR(trajectory[0][1])} r={4} fill={COLOR_LATENT} />

          <text
            x={RIGHT_W / 2} y={-8} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Latent trajectory
          </text>

          {/* Behavior annotation */}
          <text
            x={8} y={18}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: COLOR_LATENT, fontWeight: 600 }}
          >
            {behaviorLabel}
          </text>
          <text
            x={8} y={34}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#888" }}
          >
            |λ| = {magnitude.toFixed(3)}, {freqLabel}
          </text>
        </g>
      </svg>
    </div>
  )
}
