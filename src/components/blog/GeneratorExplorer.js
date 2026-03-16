import React, { useState, useRef, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { generateFromIC, loadDemoModel, generateLimitCycle } from "./lfads-math"
import modelJson from "./lfads-demo-model.json"

const W = 800
const H = 400
const MARGIN = { top: 40, right: 30, bottom: 40, left: 50 }
const PLOT_W = W - MARGIN.left - MARGIN.right
const PLOT_H = H - MARGIN.top - MARGIN.bottom
const T_STEPS = 100
const FONT = "var(--font-mono, monospace)"

const COLOR_GRU = "#4A90D9"
const COLOR_LINEAR = "#c0503a"
const COLOR_TRUE = "#999"
const IC_R = 8

// Linear dynamics: 2D rotation matrix (slowly spiraling out)
const THETA_LIN = 0.08
const R_LIN = 0.995
const A_LINEAR = [
  [R_LIN * Math.cos(THETA_LIN), -R_LIN * Math.sin(THETA_LIN)],
  [R_LIN * Math.sin(THETA_LIN), R_LIN * Math.cos(THETA_LIN)],
]

function linearTrajectory(ic, T) {
  const traj = []
  let x = [...ic]
  for (let t = 0; t < T; t++) {
    traj.push([...x])
    const x0 = A_LINEAR[0][0] * x[0] + A_LINEAR[0][1] * x[1]
    const x1 = A_LINEAR[1][0] * x[0] + A_LINEAR[1][1] * x[1]
    x = [x0, x1]
  }
  return traj
}

export default function GeneratorExplorer() {
  const [ic, setIc] = useState([0.8, 0.3])
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef(null)

  const model = useMemo(() => loadDemoModel(modelJson.default), [])

  // True Van der Pol reference
  const vdpRef = useMemo(() => {
    const result = generateLimitCycle({ mu: 1.5, T: 500, dt: 0.02, nNeurons: 2 }, 42)
    // Subsample to ~100 points
    const step = Math.floor(result.X.length / T_STEPS)
    return result.X.filter((_, i) => i % step === 0).slice(0, T_STEPS)
  }, [])

  // GRU trajectory from IC
  // The model has d=3, but we visualize first 2 dims
  const gruTraj = useMemo(() => {
    const ic3 = [ic[0], ic[1], 0] // pad to d=3
    const { states } = generateFromIC(ic3, model, T_STEPS)
    return states.map(s => [s[0], s[1]])
  }, [ic, model])

  // Linear trajectory from IC
  const linTraj = useMemo(() => linearTrajectory(ic, T_STEPS), [ic])

  // Compute joint extent for all trajectories
  const { sx, sy } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const traj of [gruTraj, linTraj, vdpRef]) {
      for (const [x, y] of traj) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    // Include IC
    if (ic[0] < minX) minX = ic[0]
    if (ic[0] > maxX) maxX = ic[0]
    if (ic[1] < minY) minY = ic[1]
    if (ic[1] > maxY) maxY = ic[1]

    const padX = (maxX - minX) * 0.15 || 1
    const padY = (maxY - minY) * 0.15 || 1

    return {
      sx: scaleLinear().domain([minX - padX, maxX + padX]).range([0, PLOT_W]),
      sy: scaleLinear().domain([minY - padY, maxY + padY]).range([PLOT_H, 0]),
    }
  }, [gruTraj, linTraj, vdpRef, ic])

  // Path builders
  const buildPath = useCallback(
    (traj) =>
      traj
        .map((p, t) => `${t === 0 ? "M" : "L"}${sx(p[0])},${sy(p[1])}`)
        .join(" "),
    [sx, sy]
  )

  const gruPath = useMemo(() => buildPath(gruTraj), [gruTraj, buildPath])
  const linPath = useMemo(() => buildPath(linTraj), [linTraj, buildPath])
  const vdpPath = useMemo(() => buildPath(vdpRef), [vdpRef, buildPath])

  // Drag interaction (adapted from ProjectionExplorer)
  const handlePointerDown = useCallback((e) => {
    e.target.setPointerCapture(e.pointerId)
    setDragging(true)
  }, [])

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging) return
      const svg = svgRef.current
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
      const dataX = sx.invert(svgP.x - MARGIN.left)
      const dataY = sy.invert(svgP.y - MARGIN.top)
      setIc([
        Math.max(-3, Math.min(3, dataX)),
        Math.max(-3, Math.min(3, dataY)),
      ])
    },
    [dragging, sx, sy]
  )

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          display: "block",
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
        {/* Title */}
        <text
          x={W / 2} y={22}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 13, fill: "#333", fontWeight: 600 }}
        >
          GRU generator vs linear dynamics
        </text>

        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {/* Axes */}
          <line x1={0} y1={PLOT_H} x2={PLOT_W} y2={PLOT_H} stroke="#ddd" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={PLOT_H} stroke="#ddd" strokeWidth={1} />
          <text
            x={PLOT_W / 2} y={PLOT_H + 28}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#aaa" }}
          >
            Dim 1
          </text>
          <text
            x={-14} y={PLOT_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90, -14, ${PLOT_H / 2})`}
            style={{ fontFamily: FONT, fontSize: 10, fill: "#aaa" }}
          >
            Dim 2
          </text>

          {/* Van der Pol reference (gray dotted) */}
          <path
            d={vdpPath}
            fill="none"
            stroke={COLOR_TRUE}
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.5}
          />

          {/* Linear trajectory (red-brown dashed) */}
          <path
            d={linPath}
            fill="none"
            stroke={COLOR_LINEAR}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.7}
          />

          {/* GRU trajectory (blue solid) */}
          <path
            d={gruPath}
            fill="none"
            stroke={COLOR_GRU}
            strokeWidth={2}
          />

          {/* Trajectory start markers */}
          <circle
            cx={sx(gruTraj[gruTraj.length - 1][0])}
            cy={sy(gruTraj[gruTraj.length - 1][1])}
            r={3}
            fill={COLOR_GRU}
            opacity={0.7}
          />
          <circle
            cx={sx(linTraj[linTraj.length - 1][0])}
            cy={sy(linTraj[linTraj.length - 1][1])}
            r={3}
            fill={COLOR_LINEAR}
            opacity={0.7}
          />

          {/* Draggable IC circle */}
          <circle
            cx={sx(ic[0])}
            cy={sy(ic[1])}
            r={IC_R}
            fill={COLOR_GRU}
            stroke="#fff"
            strokeWidth={2}
            style={{ cursor: "grab" }}
            onPointerDown={handlePointerDown}
          />
          <text
            x={sx(ic[0]) + 14}
            y={sy(ic[1]) - 10}
            style={{ fontFamily: FONT, fontSize: 9, fill: COLOR_GRU, fontWeight: 600 }}
          >
            IC
          </text>

          {/* Legend */}
          <g transform={`translate(${PLOT_W - 170}, 10)`}>
            <line x1={0} y1={0} x2={20} y2={0} stroke={COLOR_GRU} strokeWidth={2} />
            <text
              x={24} y={4}
              style={{ fontFamily: FONT, fontSize: 9, fill: "#555" }}
            >
              GRU generator
            </text>
            <line x1={0} y1={18} x2={20} y2={18} stroke={COLOR_LINEAR} strokeWidth={1.5} strokeDasharray="6 3" />
            <text
              x={24} y={22}
              style={{ fontFamily: FONT, fontSize: 9, fill: "#555" }}
            >
              Linear dynamics
            </text>
            <line x1={0} y1={36} x2={20} y2={36} stroke={COLOR_TRUE} strokeWidth={1} strokeDasharray="2 4" />
            <text
              x={24} y={40}
              style={{ fontFamily: FONT, fontSize: 9, fill: "#555" }}
            >
              Van der Pol ref
            </text>
          </g>
        </g>

        {/* Drag hint */}
        {!dragging && (
          <text
            x={W / 2}
            y={H - 8}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#bbb" }}
          >
            Drag the blue circle to change the initial condition
          </text>
        )}
      </svg>
    </div>
  )
}
