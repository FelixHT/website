import React, { useState, useMemo } from "react"
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

function GateBox({ x, y, w, h, label, values, color, sublabel }) {
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        rx={BOX_R} fill="#fff" stroke={color} strokeWidth={1.5}
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
          style={{ fontFamily: FONT, fontSize: 9, fill: "#333" }}
        >
          {fmt(v)}
        </text>
      ))}
    </g>
  )
}

function Arrow({ x1, y1, x2, y2, color = "#999", dashed = false, label }) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len
  const uy = dy / len
  const headLen = 6
  const ex = x2 - ux * 2
  const ey = y2 - uy * 2

  return (
    <g>
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

export default function GRUGateExplorer() {
  const [h0, setH0] = useState(0.5)
  const [h1, setH1] = useState(-0.3)
  const [xt, setXt] = useState(0.7)
  const [forceReset, setForceReset] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(false)

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

  // Layout positions
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

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
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
        <Arrow x1={inputX + 30} y1={inputHY} x2={gateX} y2={resetY + boxH / 2} color={COLOR_H} />
        <Arrow x1={inputX + 30} y1={inputHY} x2={gateX} y2={updateY + boxH / 2} color={COLOR_H} />
        <Arrow x1={inputX + 30} y1={inputXY} x2={gateX} y2={resetY + boxH / 2} color={COLOR_X} />
        <Arrow x1={inputX + 30} y1={inputXY} x2={gateX} y2={updateY + boxH / 2} color={COLOR_X} />

        {/* Reset gate */}
        <GateBox
          x={gateX} y={resetY} w={boxW} h={boxH}
          label="Reset gate (r)"
          values={Array.from(result.r)}
          color={COLOR_GATE}
          sublabel="sigmoid"
        />

        {/* Update gate */}
        <GateBox
          x={gateX} y={updateY} w={boxW} h={boxH}
          label="Update gate (z)"
          values={Array.from(result.z)}
          color={COLOR_GATE}
          sublabel="sigmoid"
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
        <Arrow x1={interpX + boxW} y1={interpY + boxH / 2} x2={outX} y2={interpY + boxH / 2} color={COLOR_OUT} />

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
            style={{ fontFamily: FONT, fontSize: 9, fill: "#333" }}
          >
            {fmt(result.h_new[0])}
          </text>
          <text
            x={outX + boxW / 2} y={interpY + 30}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 9, fill: "#333" }}
          >
            {fmt(result.h_new[1])}
          </text>
        </g>

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
