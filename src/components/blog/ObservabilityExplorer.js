import React, { useState, useMemo, useCallback, useRef } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace, centerColumns } from "./psid-math"
import { matMul, matT, zeros, jacobiEigen } from "./cca-math"

const W = 800
const H = 340
const LEFT_W = 330
const RIGHT_W = 340
const RIGHT_X = LEFT_W + 40
const MARGIN = { top: 30, bottom: 50 }
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T_STEPS = 500
const COLOR_TRUE = "#4A90D9"
const COLOR_RECON = "#D4783C"

/**
 * Given a direction vector d (3D), project the latent states X onto d
 * and reconstruct from observations Y via least-squares.
 * Returns { trueProj, reconProj, r2 }
 */
function computeProjectionAndReconstruction(X, Y, direction) {
  const T = X.length
  const d = direction

  // True projection: z_t = X_t · d
  const trueProj = new Float64Array(T)
  for (let t = 0; t < T; t++) {
    trueProj[t] = X[t][0] * d[0] + X[t][1] * d[1] + X[t][2] * d[2]
  }

  // Reconstruct from Y via least-squares: z_hat = Y * beta
  // beta = (Y^T Y)^{-1} Y^T trueProj
  const Yc = centerColumns(Y)
  const m = Y[0].length
  const YtY = matMul(matT(Yc), Yc)

  // Invert YtY
  const eig = jacobiEigen(YtY)
  const V = zeros(m, m)
  const Dinv = zeros(m, m)
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) V[j][i] = eig.vectors[i][j]
    Dinv[i][i] = eig.values[i] > 1e-10 ? 1 / eig.values[i] : 0
  }
  const YtYinv = matMul(matMul(V, Dinv), matT(V))

  // Y^T * trueProj
  const Ytz = new Float64Array(m)
  for (let t = 0; t < T; t++)
    for (let j = 0; j < m; j++)
      Ytz[j] += Yc[t][j] * trueProj[t]

  // beta = YtYinv * Ytz
  const beta = new Float64Array(m)
  for (let i = 0; i < m; i++)
    for (let j = 0; j < m; j++)
      beta[i] += YtYinv[i][j] * Ytz[j]

  // Reconstruct
  const reconProj = new Float64Array(T)
  for (let t = 0; t < T; t++)
    for (let j = 0; j < m; j++)
      reconProj[t] += Yc[t][j] * beta[j]

  // R²
  let meanTrue = 0
  for (let t = 0; t < T; t++) meanTrue += trueProj[t]
  meanTrue /= T

  let ssTot = 0, ssRes = 0
  for (let t = 0; t < T; t++) {
    ssTot += (trueProj[t] - meanTrue) ** 2
    ssRes += (trueProj[t] - reconProj[t]) ** 2
  }
  const r2 = ssTot > 1e-15 ? 1 - ssRes / ssTot : 0

  return { trueProj, reconProj, r2 }
}

export default function ObservabilityExplorer() {
  // Direction parameterized by angle (in the x1-x2 plane + tilt to x3)
  const [angle, setAngle] = useState(0.3) // radians in x1-x2 plane
  const [tilt, setTilt] = useState(0.1) // radians toward x3
  const svgRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const { X, Y } = useMemo(() => {
    const sys = defaultSystem()
    return simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed: 1 })
  }, [])

  // Direction unit vector
  const direction = useMemo(() => {
    const cosT = Math.cos(tilt)
    return [
      Math.cos(angle) * cosT,
      Math.sin(angle) * cosT,
      Math.sin(tilt),
    ]
  }, [angle, tilt])

  const { trueProj, reconProj, r2 } = useMemo(
    () => computeProjectionAndReconstruction(X, Y, direction),
    [X, Y, direction]
  )

  // Left panel: 2D trajectory with direction arrow
  const { sxL, syL } = useMemo(() => {
    const vals1 = X.map(r => r[0])
    const vals2 = X.map(r => r[1])
    const pad1 = (Math.max(...vals1) - Math.min(...vals1)) * 0.1 || 1
    const pad2 = (Math.max(...vals2) - Math.min(...vals2)) * 0.1 || 1
    return {
      sxL: scaleLinear()
        .domain([Math.min(...vals1) - pad1, Math.max(...vals1) + pad1])
        .range([30, LEFT_W - 10]),
      syL: scaleLinear()
        .domain([Math.min(...vals2) - pad2, Math.max(...vals2) + pad2])
        .range([PLOT_H - 10, 10]),
    }
  }, [X])

  // Right panel: time series
  const sxR = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, RIGHT_W]),
    []
  )
  const { syTrue, syRecon } = useMemo(() => {
    const allVals = [...trueProj, ...reconProj]
    const mn = Math.min(...allVals), mx = Math.max(...allVals)
    const pad = (mx - mn) * 0.1 || 1
    const sy = scaleLinear().domain([mn - pad, mx + pad]).range([PLOT_H - 10, 10])
    return { syTrue: sy, syRecon: sy }
  }, [trueProj, reconProj])

  // Drag handling for direction arrow
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
    // Convert SVG coords to data coords
    const cx = sxL(0)
    const cy = syL(0)
    const dx = svgP.x - cx
    const dy = -(svgP.y - MARGIN.top - cy) // flip y
    const newAngle = Math.atan2(dy, dx)
    setAngle(newAngle)
  }, [dragging, sxL, syL])

  const handlePointerUp = useCallback(() => setDragging(false), [])

  // Arrow endpoints
  const arrowLen = 80
  const acx = sxL(0), acy = syL(0)
  const arrowDx = Math.cos(angle) * arrowLen
  const arrowDy = -Math.sin(angle) * arrowLen // SVG y is flipped

  const truePath = Array.from(trueProj).map((v, t) =>
    `${t === 0 ? "M" : "L"}${sxR(t)},${syTrue(v)}`
  ).join(" ")
  const reconPath = Array.from(reconProj).map((v, t) =>
    `${t === 0 ? "M" : "L"}${sxR(t)},${syRecon(v)}`
  ).join(" ")

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <marker id="obs-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill="#333" />
          </marker>
        </defs>

        {/* Left panel: Latent trajectory */}
        <g transform={`translate(0, ${MARGIN.top})`}>
          <rect x={20} y={0} width={LEFT_W - 20} height={PLOT_H} fill="none" rx={3} />

          {/* Trajectory */}
          {X.map((r, t) => {
            if (t === 0) return null
            return (
              <line
                key={t}
                x1={sxL(X[t - 1][0])} y1={syL(X[t - 1][1])}
                x2={sxL(r[0])} y2={syL(r[1])}
                stroke={COLOR_TRUE}
                strokeWidth={0.8}
                opacity={0.15 + 0.5 * (t / (T_STEPS - 1))}
              />
            )
          })}

          {/* Draggable direction arrow */}
          <line
            x1={acx - arrowDx * 0.3} y1={acy - arrowDy * 0.3}
            x2={acx + arrowDx * 0.7} y2={acy + arrowDy * 0.7}
            stroke="#333" strokeWidth={2.5}
            markerEnd="url(#obs-arrow)"
          />
          {/* Drag handle */}
          <circle
            cx={acx + arrowDx * 0.7} cy={acy + arrowDy * 0.7}
            r={8} fill="transparent" stroke="#333" strokeWidth={1} strokeDasharray="3 2"
            style={{ cursor: "grab" }}
            onPointerDown={handlePointerDown}
          />

          <text
            x={LEFT_W / 2} y={-8} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Drag arrow to change projection direction
          </text>
          <text
            x={LEFT_W / 2} y={PLOT_H + 20} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
          >
            x₁
          </text>
          <text
            x={8} y={PLOT_H / 2} textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(-90, 8, ${PLOT_H / 2})`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
          >
            x₂
          </text>
        </g>

        {/* Right panel: True vs reconstructed projection */}
        <g transform={`translate(${RIGHT_X}, ${MARGIN.top})`}>
          <rect x={0} y={0} width={RIGHT_W} height={PLOT_H} fill="none" rx={3} />

          <path d={truePath} fill="none" stroke={COLOR_TRUE} strokeWidth={1.2} />
          <path d={reconPath} fill="none" stroke={COLOR_RECON} strokeWidth={1.2} opacity={0.8} />

          <text
            x={RIGHT_W / 2} y={-8} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#666" }}
          >
            Projection along direction
          </text>

          {/* R² readout */}
          <text
            x={RIGHT_W - 8} y={20} textAnchor="end"
            style={{ fontFamily: "var(--font-mono)", fontSize: 13, fill: "#333", fontWeight: 600 }}
          >
            R² = {r2.toFixed(3)}
          </text>

          {/* Legend */}
          <g transform={`translate(8, ${PLOT_H - 30})`}>
            <line x1={0} y1={0} x2={18} y2={0} stroke={COLOR_TRUE} strokeWidth={1.5} />
            <text x={22} y={4} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#555" }}>True</text>
            <line x1={60} y1={0} x2={78} y2={0} stroke={COLOR_RECON} strokeWidth={1.5} />
            <text x={82} y={4} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#555" }}>Reconstructed</text>
          </g>

          <text
            x={RIGHT_W / 2} y={PLOT_H + 20} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#888" }}
          >
            Time →
          </text>
        </g>
      </svg>

      {/* Tilt slider for x3 direction */}
      <div style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "#666" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          x₃ component: {Math.sin(tilt).toFixed(2)}
          <input
            type="range" min={-1.5} max={1.5} step={0.05}
            value={tilt}
            onChange={e => setTilt(Number(e.target.value))}
            style={{ width: 140 }}
          />
        </label>
      </div>
    </div>
  )
}
