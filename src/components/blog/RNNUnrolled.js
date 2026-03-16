import React, { useState, useMemo } from "react"
import { unrollRNN, computeGradientNorms } from "./lfads-math"
import { BTN_BASE, btnActive } from "./figureConstants"

const W = 800
const H = 350
const T = 8
const D = 2

const Wh = [[0.8, 0.2], [-0.1, 0.9]]
const Wx = [[0.5], [0.3]]
const b = [0, 0]

// Impulse at t=0
const inputs = Array.from({ length: T }, (_, t) => (t === 0 ? [1] : [0]))
const h0 = new Float64Array(D)

const BOX_W = 52
const BOX_H = 44
const GAP_X = 28
const START_X = 40
const Y_BOXES = 140
const Y_INPUT = 280
const FONT = "var(--font-mono, monospace)"
const COLOR_ACTIVE = "#fffbe6"
const COLOR_DONE = "#f0f7f4"
const COLOR_BORDER = "#bbb"
const COLOR_HL = "#d4a03c"
const COLOR_BLUE = "#4A90D9"
const COLOR_GRAD_LOW = "#4A90D9"
const COLOR_GRAD_HIGH = "#c0503a"

function fmt(v) {
  return v.toFixed(2)
}

export default function RNNUnrolled() {
  const [currentStep, setCurrentStep] = useState(-1)

  const { states, preActivations } = useMemo(
    () => unrollRNN(h0, inputs, { Wh, Wx, b }),
    []
  )

  const gradientNorms = useMemo(
    () => computeGradientNorms(states, { Wh }),
    [states]
  )

  // Include h0 in the display: allStates[0] = h0, allStates[1..T] = states[0..T-1]
  const allStates = useMemo(() => {
    const result = [Array.from(h0)]
    for (let t = 0; t < T; t++) {
      result.push(Array.from(states[t]))
    }
    return result
  }, [states])

  const finished = currentStep >= T
  const maxGrad = Math.max(...gradientNorms, 1e-12)

  function boxX(i) {
    return START_X + i * (BOX_W + GAP_X)
  }

  function handleNext() {
    if (currentStep < T) {
      setCurrentStep(s => s + 1)
    }
  }

  function handleReset() {
    setCurrentStep(-1)
  }

  // Gradient color interpolation
  function gradColor(norm) {
    const t = Math.min(norm / maxGrad, 1)
    const r = Math.round(74 + t * (192 - 74))
    const g = Math.round(144 + t * (80 - 144))
    const b = Math.round(217 + t * (58 - 217))
    return `rgb(${r},${g},${b})`
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <defs>
          <marker
            id="rnn-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#666" />
          </marker>
          <marker
            id="rnn-arrow-grad"
            markerWidth="8"
            markerHeight="6"
            refX="1"
            refY="3"
            orient="auto"
          >
            <polygon points="8 0, 0 3, 8 6" fill={COLOR_GRAD_HIGH} />
          </marker>
        </defs>

        {/* Title */}
        <text
          x={W / 2}
          y={22}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 13, fill: "#333", fontWeight: 600 }}
        >
          Unrolled Vanilla RNN
        </text>

        {/* h_0 through h_T boxes */}
        {allStates.map((st, i) => {
          const x = boxX(i)
          const isCurrentComputation = i === currentStep + 1 && currentStep >= 0 && !finished
          const isDone = i <= currentStep
          const isVisible = i <= currentStep + 1

          let fill = "#fff"
          if (isCurrentComputation) fill = COLOR_ACTIVE
          else if (isDone) fill = COLOR_DONE

          return (
            <g key={i}>
              {/* Box */}
              <rect
                x={x}
                y={Y_BOXES}
                width={BOX_W}
                height={BOX_H}
                rx={4}
                fill={fill}
                stroke={isCurrentComputation ? COLOR_HL : COLOR_BORDER}
                strokeWidth={isCurrentComputation ? 2 : 1}
                opacity={isVisible ? 1 : 0.3}
              />
              {/* Label */}
              <text
                x={x + BOX_W / 2}
                y={Y_BOXES - 8}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 10, fill: "#888" }}
              >
                {`h${i === 0 ? "₀" : i === 1 ? "₁" : i === 2 ? "₂" : i === 3 ? "₃" : i === 4 ? "₄" : i === 5 ? "₅" : i === 6 ? "₆" : i === 7 ? "₇" : "₈"}`}
              </text>
              {/* State values */}
              {isVisible && (
                <>
                  <text
                    x={x + BOX_W / 2}
                    y={Y_BOXES + 18}
                    textAnchor="middle"
                    style={{ fontFamily: FONT, fontSize: 9, fill: "#333" }}
                  >
                    {fmt(st[0])}
                  </text>
                  <text
                    x={x + BOX_W / 2}
                    y={Y_BOXES + 32}
                    textAnchor="middle"
                    style={{ fontFamily: FONT, fontSize: 9, fill: "#333" }}
                  >
                    {fmt(st[1])}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* Horizontal recurrent arrows (Wh) */}
        {Array.from({ length: T }, (_, i) => {
          const x1 = boxX(i) + BOX_W
          const x2 = boxX(i + 1)
          const y = Y_BOXES + BOX_H / 2
          const visible = i <= currentStep
          return (
            <g key={`harrow-${i}`} opacity={visible ? 1 : 0.2}>
              <line
                x1={x1 + 2}
                y1={y}
                x2={x2 - 2}
                y2={y}
                stroke="#666"
                strokeWidth={1.5}
                markerEnd="url(#rnn-arrow)"
              />
              <text
                x={(x1 + x2) / 2}
                y={y - 8}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 8, fill: "#999" }}
              >
                Wh
              </text>
            </g>
          )
        })}

        {/* Vertical input arrows (Wx) */}
        {Array.from({ length: T }, (_, i) => {
          const cx = boxX(i + 1) + BOX_W / 2
          const visible = i <= currentStep
          return (
            <g key={`varrow-${i}`} opacity={visible ? 1 : 0.2}>
              <line
                x1={cx}
                y1={Y_INPUT}
                x2={cx}
                y2={Y_BOXES + BOX_H + 4}
                stroke="#666"
                strokeWidth={1.5}
                markerEnd="url(#rnn-arrow)"
              />
              {/* Input label */}
              <text
                x={cx}
                y={Y_INPUT + 16}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 9, fill: "#888" }}
              >
                {`x${i === 0 ? "₀" : i === 1 ? "₁" : i === 2 ? "₂" : i === 3 ? "₃" : i === 4 ? "₄" : i === 5 ? "₅" : i === 6 ? "₆" : "₇"}`}
                {` = ${inputs[i][0]}`}
              </text>
              <text
                x={cx}
                y={Y_INPUT + 28}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 8, fill: "#bbb" }}
              >
                Wx
              </text>
            </g>
          )
        })}

        {/* Backward gradient arrows (shown when finished) */}
        {finished &&
          Array.from({ length: T }, (_, i) => {
            const x1 = boxX(i + 1)
            const x2 = boxX(i) + BOX_W
            const y = Y_BOXES - 26
            const norm = gradientNorms[i]
            const color = gradColor(norm)
            const thickness = 1 + 2 * Math.min(norm / maxGrad, 1)
            return (
              <g key={`grad-${i}`}>
                <line
                  x1={x1 + 2}
                  y1={y}
                  x2={x2 + 6}
                  y2={y}
                  stroke={color}
                  strokeWidth={thickness}
                  markerEnd="url(#rnn-arrow-grad)"
                />
                <text
                  x={(x1 + x2 + BOX_W) / 2 - 14}
                  y={y - 6}
                  textAnchor="middle"
                  style={{ fontFamily: FONT, fontSize: 7, fill: color }}
                >
                  {gradientNorms[i].toExponential(1)}
                </text>
              </g>
            )
          })}

        {finished && (
          <text
            x={W / 2}
            y={Y_BOXES - 50}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 11, fill: COLOR_GRAD_HIGH, fontWeight: 600 }}
          >
            Gradient magnitudes (backward pass)
          </text>
        )}

        {/* Computation annotation */}
        {currentStep >= 0 && currentStep < T && (
          <text
            x={W / 2}
            y={H - 10}
            textAnchor="middle"
            style={{ fontFamily: FONT, fontSize: 10, fill: "#555" }}
          >
            {`h${currentStep + 1} = tanh(Wh * [${fmt(allStates[currentStep][0])}, ${fmt(allStates[currentStep][1])}] + Wx * [${inputs[currentStep][0]}] + b)`}
            {` = [${fmt(allStates[currentStep + 1][0])}, ${fmt(allStates[currentStep + 1][1])}]`}
          </text>
        )}
      </svg>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 6,
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
        }}
      >
        <button
          onClick={handleNext}
          disabled={finished}
          style={{
            ...BTN_BASE,
            ...(finished ? { opacity: 0.4, cursor: "default" } : btnActive(COLOR_BLUE)),
          }}
        >
          {currentStep < 0 ? "Start" : finished ? "Done" : "Next step"}
        </button>
        <button
          onClick={handleReset}
          style={{
            ...BTN_BASE,
          }}
        >
          Reset
        </button>
        <span style={{ fontSize: 11, color: "#999" }}>
          {currentStep < 0
            ? "Press Start to begin forward pass"
            : finished
              ? "Forward pass complete -- gradient magnitudes shown above"
              : `Step ${currentStep + 1} / ${T}`}
        </span>
      </div>
    </div>
  )
}
