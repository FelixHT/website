import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import gsap from "gsap"
import { gruStep } from "./lfads-math"
import { BTN_BASE, btnActive } from "./figureConstants"

const W = 800
const H = 450
const FONT = "var(--font-mono, monospace)"

const D = 2
const INPUT_DIM = 1

// Weights: d x (d + input_dim) = 2x3
const Wr = [[0.6, -0.3, 0.4], [0.2, 0.7, -0.5]]
const Wu = [[0.5, 0.4, 0.3], [-0.3, 0.6, 0.2]]
const Wc = [[0.8, -0.2, 0.5], [0.1, 0.9, -0.3]]
const br = [0, 0]
const bu = [-1, -1]
const bc = [0, 0]

const COLOR_H = "#4A90D9"
const COLOR_X = "#4A7C6F"
const COLOR_GATE = "#d4a03c"
const COLOR_CAND = "#7b68ae"
const COLOR_OUT = "#333"
const BOX_R = 4

function fmt(v) {
  return typeof v === "number" ? v.toFixed(2) : "?"
}

function GateBox({ x, y, w, h, label, values, color, sublabel, dataGate }) {
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        rx={BOX_R} fill="#fff" stroke={color} strokeWidth={1.5}
        className="gru-gate-box"
        data-gate={dataGate}
      />
      <text
        x={x + w / 2} y={y - 6}
        textAnchor="middle"
        style={{ fontFamily: FONT, fontSize: 10, fill: color, fontWeight: 600 }}
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={x + w / 2} y={y + h + 14}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 8, fill: "#aaa" }}
        >
          {sublabel}
        </text>
      )}
      {values && values.map((v, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={y + 16 + i * 14}
          textAnchor="middle"
          className="gru-gate-val"
          data-gate={dataGate}
          style={{ fontFamily: FONT, fontSize: 9, fill: "#333" }}
        >
          {fmt(v)}
        </text>
      ))}
    </g>
  )
}

function Arrow({ x1, y1, x2, y2, color = "#999", dashed = false, label, className }) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len
  const uy = dy / len
  const headLen = 6
  const ex = x2 - ux * 2
  const ey = y2 - uy * 2

  return (
    <g className={className} data-color={color}>
      <line
        x1={x1} y1={y1} x2={ex} y2={ey}
        stroke={color} strokeWidth={1.2}
        strokeDasharray={dashed ? "4 3" : "none"}
      />
      <polygon
        points={`${x2},${y2} ${x2 - ux * headLen - uy * 3},${y2 - uy * headLen + ux * 3} ${x2 - ux * headLen + uy * 3},${y2 - uy * headLen - ux * 3}`}
        fill={color}
      />
      {label && (
        <text
          x={(x1 + x2) / 2 + uy * 10}
          y={(y1 + y2) / 2 - ux * 10}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: FONT, fontSize: 8, fill: color }}
        >
          {label}
        </text>
      )}
    </g>
  )
}

// Waypoints for pulse paths (derived from layout positions)
const inputX = 60
const gateX = 240
const candX = 420
const interpX = 580
const outX = 720
const resetY = 100
const updateY = 220
const candY = 160
const interpY = 160
const inputHY = 160
const inputXY = 300
const boxW = 80
const boxH = 36

const WAYPOINTS = {
  // Input start (midpoint between h and x input boxes)
  inputStart: { x: inputX + 30, y: (inputHY + inputXY) / 2 },
  hStart: { x: inputX + 30, y: inputHY },
  xStart: { x: inputX + 30, y: inputXY },

  // Gate box centers
  resetCenter: { x: gateX + boxW / 2, y: resetY + boxH / 2 },
  updateCenter: { x: gateX + boxW / 2, y: updateY + boxH / 2 },
  candCenter: { x: candX + boxW / 2, y: candY + boxH / 2 },
  interpCenter: { x: interpX + boxW / 2, y: interpY + boxH / 2 },
  outputCenter: { x: outX + boxW / 2, y: interpY + boxH / 2 },

  // Gate box entry points (left edge)
  resetEntry: { x: gateX, y: resetY + boxH / 2 },
  updateEntry: { x: gateX, y: updateY + boxH / 2 },
  candEntry: { x: candX, y: candY + boxH / 2 },
  interpEntry: { x: interpX, y: interpY + boxH / 2 },

  // Gate box exit points (right edge)
  resetExit: { x: gateX + boxW, y: resetY + boxH / 2 },
  updateExit: { x: gateX + boxW, y: updateY + boxH / 2 },
  candExit: { x: candX + boxW, y: candY + boxH / 2 },
  interpExit: { x: interpX + boxW, y: interpY + boxH / 2 },
  outputEntry: { x: outX, y: interpY + boxH / 2 },
}

export default function GRUGateExplorer() {
  const [h0, setH0] = useState(0.5)
  const [h1, setH1] = useState(-0.3)
  const [xt, setXt] = useState(0.7)
  const [forceReset, setForceReset] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(false)

  const svgRef = useRef(null)
  const pulseTlRef = useRef(null)
  const prevValsRef = useRef(null)

  const result = useMemo(() => {
    const h = [h0, h1]
    const x = [xt]
    const res = gruStep(h, x, Wr, Wu, Wc, br, bu, bc)

    // Apply overrides
    const r = forceReset ? new Float64Array([1, 1]) : res.r
    const z = forceUpdate ? new Float64Array([0.5, 0.5]) : res.z

    // If overrides are active, recompute downstream
    if (forceReset || forceUpdate) {
      // Recompute candidate with overridden r
      const rh_concat = new Float64Array(D + INPUT_DIM)
      for (let i = 0; i < D; i++) rh_concat[i] = r[i] * h[i]
      for (let i = 0; i < INPUT_DIM; i++) rh_concat[D + i] = x[i]

      const h_tilde = new Float64Array(D)
      for (let i = 0; i < D; i++) {
        let s = bc[i]
        for (let j = 0; j < D + INPUT_DIM; j++) s += Wc[i][j] * rh_concat[j]
        h_tilde[i] = Math.tanh(s)
      }

      const h_new = new Float64Array(D)
      for (let i = 0; i < D; i++) {
        h_new[i] = (1 - z[i]) * h[i] + z[i] * h_tilde[i]
      }

      return { ...res, r, z, h_tilde, h_new }
    }

    return res
  }, [h0, h1, xt, forceReset, forceUpdate])

  // Animate pulse along paths when inputs change
  const animatePulse = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return

    // Kill any running animation by jumping to end
    if (pulseTlRef.current) {
      pulseTlRef.current.progress(1)
      pulseTlRef.current.kill()
    }

    const pulseReset = svg.querySelector("#pulse-reset")
    const pulseUpdate = svg.querySelector("#pulse-update")
    const pulseCand = svg.querySelector("#pulse-cand")
    const pulseOutput = svg.querySelector("#pulse-output")

    if (!pulseReset || !pulseUpdate || !pulseCand || !pulseOutput) return

    const inputArrows = svg.querySelectorAll(".gru-input-arrow")
    const outputArrow = svg.querySelector(".gru-output-arrow")
    const gateBoxes = svg.querySelectorAll(".gru-gate-box")
    const gateVals = svg.querySelectorAll(".gru-gate-val")
    const outputVals = svg.querySelectorAll(".gru-output-val")

    const tl = gsap.timeline({
      onComplete: () => {
        // Ensure pulses are hidden after animation
        gsap.set([pulseReset, pulseUpdate, pulseCand, pulseOutput], { opacity: 0 })
      },
    })
    pulseTlRef.current = tl

    // Phase 1: Input arrows brighten (0-50ms)
    tl.to(inputArrows, {
      duration: 0.05,
      attr: { stroke: "#5bb8d4" },
      stagger: 0,
    }, 0)

    // Also brighten the lines and polygons inside the arrow groups
    inputArrows.forEach(arrow => {
      tl.to(arrow.querySelectorAll("line"), {
        duration: 0.05,
        attr: { stroke: "#5bb8d4" },
      }, 0)
      tl.to(arrow.querySelectorAll("polygon"), {
        duration: 0.05,
        attr: { fill: "#5bb8d4" },
      }, 0)
    })

    // Phase 2: Gate pulses travel (50-350ms)
    // Reset pulse
    const resetPath = [
      WAYPOINTS.hStart,
      WAYPOINTS.resetEntry,
      WAYPOINTS.resetCenter,
    ]
    tl.set(pulseReset, { opacity: 1, attr: { cx: resetPath[0].x, cy: resetPath[0].y } }, 0.05)
    resetPath.forEach((pt, i) => {
      if (i === 0) return
      tl.to(pulseReset, {
        duration: 0.15,
        attr: { cx: pt.x, cy: pt.y },
        ease: "power1.inOut",
      }, 0.05 + (i - 1) * 0.15)
    })

    // Update pulse
    const updatePath = [
      WAYPOINTS.hStart,
      WAYPOINTS.updateEntry,
      WAYPOINTS.updateCenter,
    ]
    tl.set(pulseUpdate, { opacity: 1, attr: { cx: updatePath[0].x, cy: updatePath[0].y } }, 0.05)
    updatePath.forEach((pt, i) => {
      if (i === 0) return
      tl.to(pulseUpdate, {
        duration: 0.15,
        attr: { cx: pt.x, cy: pt.y },
        ease: "power1.inOut",
      }, 0.05 + (i - 1) * 0.15)
    })

    // Gate box flash on arrival: reset
    const resetBox = svg.querySelector('.gru-gate-box[data-gate="reset"]')
    if (resetBox) {
      tl.to(resetBox, {
        duration: 0.08,
        attr: { transform: `translate(${WAYPOINTS.resetCenter.x}, ${WAYPOINTS.resetCenter.y}) scale(1.08) translate(${-WAYPOINTS.resetCenter.x}, ${-WAYPOINTS.resetCenter.y})` },
        ease: "power2.out",
      }, 0.35)
      tl.to(resetBox, {
        duration: 0.08,
        attr: { transform: "" },
        ease: "power2.in",
      }, 0.43)
    }

    // Gate box flash on arrival: update
    const updateBox = svg.querySelector('.gru-gate-box[data-gate="update"]')
    if (updateBox) {
      tl.to(updateBox, {
        duration: 0.08,
        attr: { transform: `translate(${WAYPOINTS.updateCenter.x}, ${WAYPOINTS.updateCenter.y}) scale(1.08) translate(${-WAYPOINTS.updateCenter.x}, ${-WAYPOINTS.updateCenter.y})` },
        ease: "power2.out",
      }, 0.35)
      tl.to(updateBox, {
        duration: 0.08,
        attr: { transform: "" },
        ease: "power2.in",
      }, 0.43)
    }

    // Gate value text flash: reset
    const resetVals = svg.querySelectorAll('.gru-gate-val[data-gate="reset"]')
    tl.fromTo(resetVals, { fill: COLOR_GATE }, { fill: "#333", duration: 0.15 }, 0.35)

    // Gate value text flash: update
    const updateVals = svg.querySelectorAll('.gru-gate-val[data-gate="update"]')
    tl.fromTo(updateVals, { fill: COLOR_GATE }, { fill: "#333", duration: 0.15 }, 0.35)

    // Hide reset and update pulses
    tl.set(pulseReset, { opacity: 0 }, 0.35)
    tl.set(pulseUpdate, { opacity: 0 }, 0.35)

    // Candidate pulse (starts slightly later, after reset arrives)
    const candPath = [
      WAYPOINTS.resetExit,
      { x: (WAYPOINTS.resetExit.x + WAYPOINTS.candEntry.x) / 2, y: (WAYPOINTS.resetExit.y + WAYPOINTS.candEntry.y) / 2 },
      WAYPOINTS.candEntry,
      WAYPOINTS.candCenter,
    ]
    tl.set(pulseCand, { opacity: 1, attr: { cx: candPath[0].x, cy: candPath[0].y } }, 0.2)
    candPath.forEach((pt, i) => {
      if (i === 0) return
      tl.to(pulseCand, {
        duration: 0.05,
        attr: { cx: pt.x, cy: pt.y },
        ease: "power1.inOut",
      }, 0.2 + i * 0.05)
    })

    // Candidate box flash
    const candBox = svg.querySelector('.gru-gate-box[data-gate="candidate"]')
    if (candBox) {
      tl.to(candBox, {
        duration: 0.06,
        attr: { transform: `translate(${WAYPOINTS.candCenter.x}, ${WAYPOINTS.candCenter.y}) scale(1.08) translate(${-WAYPOINTS.candCenter.x}, ${-WAYPOINTS.candCenter.y})` },
        ease: "power2.out",
      }, 0.38)
      tl.to(candBox, {
        duration: 0.06,
        attr: { transform: "" },
        ease: "power2.in",
      }, 0.44)
    }

    // Candidate value flash
    const candVals = svg.querySelectorAll('.gru-gate-val[data-gate="candidate"]')
    tl.fromTo(candVals, { fill: COLOR_CAND }, { fill: "#333", duration: 0.15 }, 0.38)

    // Hide candidate pulse
    tl.set(pulseCand, { opacity: 0 }, 0.38)

    // Phase 3: Interpolation → output pulse (350-450ms)
    tl.set(pulseOutput, {
      opacity: 1,
      attr: { cx: WAYPOINTS.interpExit.x, cy: WAYPOINTS.interpExit.y },
    }, 0.35)
    tl.to(pulseOutput, {
      duration: 0.1,
      attr: { cx: WAYPOINTS.outputEntry.x, cy: WAYPOINTS.outputEntry.y },
      ease: "power1.inOut",
    }, 0.35)

    // Phase 4: Output update (450-500ms)
    tl.fromTo(outputVals, { fill: COLOR_H }, { fill: "#333", duration: 0.15 }, 0.45)

    // Output arrow brightens
    if (outputArrow) {
      tl.to(outputArrow.querySelectorAll("line"), {
        duration: 0.05,
        attr: { stroke: "#5bb8d4" },
      }, 0.45)
      tl.to(outputArrow.querySelectorAll("polygon"), {
        duration: 0.05,
        attr: { fill: "#5bb8d4" },
      }, 0.45)
      tl.to(outputArrow.querySelectorAll("line"), {
        duration: 0.05,
        attr: { stroke: COLOR_OUT },
      }, 0.48)
      tl.to(outputArrow.querySelectorAll("polygon"), {
        duration: 0.05,
        attr: { fill: COLOR_OUT },
      }, 0.48)
    }

    // Hide output pulse
    tl.set(pulseOutput, { opacity: 0 }, 0.45)

    // Phase 5: Reset arrows (480-500ms)
    inputArrows.forEach(arrow => {
      const lines = arrow.querySelectorAll("line")
      const polys = arrow.querySelectorAll("polygon")
      // Determine original color from the data attribute or infer from position
      const origColor = arrow.dataset.color || "#999"
      tl.to(lines, {
        duration: 0.02,
        attr: { stroke: origColor },
      }, 0.48)
      tl.to(polys, {
        duration: 0.02,
        attr: { fill: origColor },
      }, 0.48)
    })
  }, [])

  // Trigger pulse animation when inputs change
  useEffect(() => {
    if (prevValsRef.current === null) {
      // Skip initial render
      prevValsRef.current = { h0, h1, xt }
      return
    }

    const prev = prevValsRef.current
    if (prev.h0 !== h0 || prev.h1 !== h1 || prev.xt !== xt) {
      animatePulse()
    }
    prevValsRef.current = { h0, h1, xt }
  }, [h0, h1, xt, animatePulse])

  // Gate toggle dimming
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const resetBox = svg.querySelector('.gru-gate-box[data-gate="reset"]')
    const resetVals = svg.querySelectorAll('.gru-gate-val[data-gate="reset"]')
    const updateBox = svg.querySelector('.gru-gate-box[data-gate="update"]')
    const updateVals = svg.querySelectorAll('.gru-gate-val[data-gate="update"]')

    if (resetBox) {
      gsap.to(resetBox, {
        duration: 0.2,
        opacity: forceReset ? 0.3 : 1,
        ease: "power1.out",
      })
      gsap.to(resetVals, {
        duration: 0.2,
        opacity: forceReset ? 0.3 : 1,
        ease: "power1.out",
      })
    }

    if (updateBox) {
      gsap.to(updateBox, {
        duration: 0.2,
        opacity: forceUpdate ? 0.3 : 1,
        ease: "power1.out",
      })
      gsap.to(updateVals, {
        duration: 0.2,
        opacity: forceUpdate ? 0.3 : 1,
        ease: "power1.out",
      })
    }
  }, [forceReset, forceUpdate])

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Gradient defs for pulse circles */}
        <defs>
          <radialGradient id="gru-pulse-amber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLOR_GATE} stopOpacity={1} />
            <stop offset="60%" stopColor={COLOR_GATE} stopOpacity={0.6} />
            <stop offset="100%" stopColor={COLOR_GATE} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="gru-pulse-blue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLOR_CAND} stopOpacity={1} />
            <stop offset="60%" stopColor={COLOR_CAND} stopOpacity={0.6} />
            <stop offset="100%" stopColor={COLOR_CAND} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Title */}
        <text
          x={W / 2} y={22}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 13, fill: "#333", fontWeight: 600 }}
        >
          GRU Cell Circuit
        </text>

        {/* Input labels */}
        <g>
          <rect
            x={inputX - 30} y={inputHY - 18}
            width={60} height={36}
            rx={BOX_R} fill="#e8f0fa" stroke={COLOR_H} strokeWidth={1.2}
          />
          <text
            x={inputX} y={inputHY - 2}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: COLOR_H, fontWeight: 600 }}
          >
            h_t-1
          </text>
          <text
            x={inputX} y={inputHY + 12}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 8, fill: "#555" }}
          >
            {`[${fmt(h0)}, ${fmt(h1)}]`}
          </text>
        </g>

        <g>
          <rect
            x={inputX - 30} y={inputXY - 18}
            width={60} height={36}
            rx={BOX_R} fill="#e8f4f0" stroke={COLOR_X} strokeWidth={1.2}
          />
          <text
            x={inputX} y={inputXY - 2}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: COLOR_X, fontWeight: 600 }}
          >
            x_t
          </text>
          <text
            x={inputX} y={inputXY + 12}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 8, fill: "#555" }}
          >
            {`[${fmt(xt)}]`}
          </text>
        </g>

        {/* Arrows from inputs to gates */}
        <Arrow x1={inputX + 30} y1={inputHY} x2={gateX} y2={resetY + boxH / 2} color={COLOR_H} className="gru-input-arrow" />
        <Arrow x1={inputX + 30} y1={inputHY} x2={gateX} y2={updateY + boxH / 2} color={COLOR_H} className="gru-input-arrow" />
        <Arrow x1={inputX + 30} y1={inputXY} x2={gateX} y2={resetY + boxH / 2} color={COLOR_X} className="gru-input-arrow" />
        <Arrow x1={inputX + 30} y1={inputXY} x2={gateX} y2={updateY + boxH / 2} color={COLOR_X} className="gru-input-arrow" />

        {/* Reset gate */}
        <GateBox
          x={gateX} y={resetY} w={boxW} h={boxH}
          label="Reset gate (r)"
          values={Array.from(result.r)}
          color={COLOR_GATE}
          sublabel="sigmoid"
          dataGate="reset"
        />

        {/* Update gate */}
        <GateBox
          x={gateX} y={updateY} w={boxW} h={boxH}
          label="Update gate (z)"
          values={Array.from(result.z)}
          color={COLOR_GATE}
          sublabel="sigmoid"
          dataGate="update"
        />

        {/* Arrows from h and reset to candidate */}
        <Arrow x1={gateX + boxW} y1={resetY + boxH / 2} x2={candX} y2={candY + boxH / 2} color={COLOR_GATE} label="r * h" />
        <Arrow x1={inputX + 30} y1={inputXY} x2={candX} y2={candY + boxH / 2 + 10} color={COLOR_X} />

        {/* Candidate */}
        <GateBox
          x={candX} y={candY} w={boxW} h={boxH}
          label="Candidate (h~)"
          values={Array.from(result.h_tilde)}
          color={COLOR_CAND}
          sublabel="tanh"
          dataGate="candidate"
        />

        {/* Arrows to interpolation */}
        <Arrow x1={candX + boxW} y1={candY + boxH / 2} x2={interpX} y2={interpY + boxH / 2 - 8} color={COLOR_CAND} label="z" />
        <Arrow x1={gateX + boxW} y1={updateY + boxH / 2} x2={interpX} y2={interpY + boxH / 2 + 8} color={COLOR_GATE} label="(1-z)" />

        {/* Interpolation */}
        <g>
          <rect
            x={interpX} y={interpY} width={boxW} height={boxH}
            rx={BOX_R} fill="#fff" stroke={COLOR_OUT} strokeWidth={1.5}
          />
          <text
            x={interpX + boxW / 2} y={interpY - 6}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: COLOR_OUT, fontWeight: 600 }}
          >
            Interpolation
          </text>
          <text
            x={interpX + boxW / 2} y={interpY + 14}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 8, fill: "#888" }}
          >
            (1-z)*h + z*h~
          </text>
        </g>

        {/* Direct connection from h to interpolation (the (1-z)*h part) */}
        <path
          d={`M${inputX + 30},${inputHY - 10} L${interpX + boxW / 2},${interpY - 20} L${interpX + boxW / 2},${interpY}`}
          fill="none"
          stroke={COLOR_H}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.5}
        />

        {/* Arrow to output */}
        <Arrow x1={interpX + boxW} y1={interpY + boxH / 2} x2={outX} y2={interpY + boxH / 2} color={COLOR_OUT} className="gru-output-arrow" />

        {/* Output */}
        <g>
          <rect
            x={outX} y={interpY} width={boxW} height={boxH}
            rx={BOX_R} fill="#f5f5f3" stroke={COLOR_OUT} strokeWidth={1.5}
          />
          <text
            x={outX + boxW / 2} y={interpY - 6}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: COLOR_OUT, fontWeight: 600 }}
          >
            h_t
          </text>
          <text
            x={outX + boxW / 2} y={interpY + 16}
            textAnchor="middle"
            className="gru-output-val"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#333" }}
          >
            {fmt(result.h_new[0])}
          </text>
          <text
            x={outX + boxW / 2} y={interpY + 30}
            textAnchor="middle"
            className="gru-output-val"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#333" }}
          >
            {fmt(result.h_new[1])}
          </text>
        </g>

        {/* Pulse circles (initially hidden) */}
        <circle id="pulse-reset" r={5} fill="url(#gru-pulse-amber)" opacity={0} />
        <circle id="pulse-update" r={5} fill="url(#gru-pulse-amber)" opacity={0} />
        <circle id="pulse-cand" r={5} fill="url(#gru-pulse-blue)" opacity={0} />
        <circle id="pulse-output" r={5} fill="url(#gru-pulse-amber)" opacity={0} />

        {/* Equation */}
        <text
          x={W / 2} y={H - 30}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 10, fill: "#555" }}
        >
          {`r = [${fmt(result.r[0])}, ${fmt(result.r[1])}]  z = [${fmt(result.z[0])}, ${fmt(result.z[1])}]  h~ = [${fmt(result.h_tilde[0])}, ${fmt(result.h_tilde[1])}]  h_t = [${fmt(result.h_new[0])}, ${fmt(result.h_new[1])}]`}
        </text>
      </svg>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 6,
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          h₀: {h0.toFixed(2)}
          <input
            type="range" min={-1} max={1} step={0.01}
            value={h0}
            onChange={e => setH0(Number(e.target.value))}
            style={{ width: 90 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          h₁: {h1.toFixed(2)}
          <input
            type="range" min={-1} max={1} step={0.01}
            value={h1}
            onChange={e => setH1(Number(e.target.value))}
            style={{ width: 90 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          x: {xt.toFixed(2)}
          <input
            type="range" min={-1} max={1} step={0.01}
            value={xt}
            onChange={e => setXt(Number(e.target.value))}
            style={{ width: 90 }}
          />
        </label>

        <button
          onClick={() => setForceReset(f => !f)}
          style={{
            ...BTN_BASE,
            fontSize: 11,
            ...(forceReset ? btnActive(COLOR_GATE) : {}),
          }}
        >
          {forceReset ? "Reset gate: OFF (r=1)" : "Reset gate: active"}
        </button>
        <button
          onClick={() => setForceUpdate(f => !f)}
          style={{
            ...BTN_BASE,
            fontSize: 11,
            ...(forceUpdate ? btnActive(COLOR_GATE) : {}),
          }}
        >
          {forceUpdate ? "Update gate: OFF (z=0.5)" : "Update gate: active"}
        </button>
      </div>
    </div>
  )
}
