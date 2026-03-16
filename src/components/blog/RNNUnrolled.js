import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import gsap from "gsap"
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
const COLOR_TEAL = "#2a9d8f"

const SUBSCRIPTS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈"]

function fmt(v) {
  return v.toFixed(2)
}

function boxX(i) {
  return START_X + i * (BOX_W + GAP_X)
}

export default function RNNUnrolled() {
  const [currentStep, setCurrentStep] = useState(-1)
  const [animating, setAnimating] = useState(false)
  const svgRef = useRef(null)
  const mainTlRef = useRef(null)

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

  // Gradient color interpolation
  function gradColor(norm) {
    const t = Math.min(norm / maxGrad, 1)
    const r = Math.round(74 + t * (192 - 74))
    const g = Math.round(144 + t * (80 - 144))
    const bv = Math.round(217 + t * (58 - 217))
    return `rgb(${r},${g},${bv})`
  }

  // Set initial hidden state on mount
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    // Hide all animated elements initially
    for (let i = 0; i <= T; i++) {
      const fillRect = svg.querySelector(`[data-fill-clip="${i}"] rect`)
      if (fillRect) gsap.set(fillRect, { attr: { width: 0 } })

      const stateVals = svg.querySelector(`[data-state-vals="${i}"]`)
      if (stateVals) gsap.set(stateVals, { opacity: i === 0 ? 1 : 0 })
    }

    for (let i = 0; i < T; i++) {
      const inputArrow = svg.querySelector(`[data-input-arrow="${i}"]`)
      if (inputArrow) gsap.set(inputArrow, { opacity: 0.2 })

      const inputVal = svg.querySelector(`[data-input-val="${i}"]`)
      if (inputVal) gsap.set(inputVal, { opacity: 0 })

      const recArrow = svg.querySelector(`[data-rec-arrow="${i}"]`)
      if (recArrow) gsap.set(recArrow, { opacity: 0.2 })

      const gradArrow = svg.querySelector(`[data-grad-arrow="${i}"]`)
      if (gradArrow) gsap.set(gradArrow, { opacity: 0 })
    }

    const compText = svg.querySelector(`[data-comp-text]`)
    if (compText) gsap.set(compText, { opacity: 0 })

    const compClipRect = svg.querySelector(`[data-comp-clip] rect`)
    if (compClipRect) gsap.set(compClipRect, { attr: { width: 0 } })

    const gradTitle = svg.querySelector(`[data-grad-title]`)
    if (gradTitle) gsap.set(gradTitle, { opacity: 0 })

    return () => {
      if (mainTlRef.current) {
        mainTlRef.current.kill()
        mainTlRef.current = null
      }
    }
  }, [])

  const animateStep = useCallback((step) => {
    const svg = svgRef.current
    if (!svg || step < 0 || step >= T) return

    // Kill any running animation
    if (mainTlRef.current) {
      mainTlRef.current.kill()
      mainTlRef.current = null
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setAnimating(false)
        if (step === T - 1) {
          // Final step: animate gradient arrows
          animateGradients()
        }
      }
    })
    mainTlRef.current = tl

    const boxIdx = step + 1 // the box being computed

    // --- Phase 1: Input arrow brightens, input value fades in (0-200ms) ---
    const inputArrow = svg.querySelector(`[data-input-arrow="${step}"]`)
    const inputVal = svg.querySelector(`[data-input-val="${step}"]`)
    const inputLine = inputArrow ? inputArrow.querySelector("line") : null

    if (inputArrow) {
      tl.to(inputArrow, { opacity: 1, duration: 0.2 }, 0)
    }
    if (inputLine) {
      tl.to(inputLine, { attr: { stroke: COLOR_TEAL }, duration: 0.2 }, 0)
    }
    if (inputVal) {
      tl.to(inputVal, { opacity: 1, duration: 0.2 }, 0)
    }

    // --- Phase 2: Box fill sweep left-to-right (200-700ms) ---
    const fillRect = svg.querySelector(`[data-fill-clip="${boxIdx}"] rect`)
    const box = svg.querySelector(`[data-box="${boxIdx}"]`)

    if (box) {
      tl.to(box, {
        attr: { stroke: COLOR_HL, "stroke-width": 2 },
        duration: 0.1
      }, 0.2)
    }
    if (fillRect) {
      tl.to(fillRect, {
        attr: { width: BOX_W },
        duration: 0.5,
        ease: "power2.out"
      }, 0.2)
    }

    // Computation text reveal via clip rect (200-700ms)
    const compText = svg.querySelector(`[data-comp-text]`)
    const compClipRect = svg.querySelector(`[data-comp-clip] rect`)
    if (compText) {
      tl.set(compText, { opacity: 1 }, 0.2)
    }
    if (compClipRect) {
      tl.fromTo(compClipRect,
        { attr: { width: 0 } },
        { attr: { width: W }, duration: 0.5, ease: "power2.out" },
        0.2
      )
    }

    // --- Phase 3: Numerical result fades in, computation text hides (700-900ms) ---
    const stateVals = svg.querySelector(`[data-state-vals="${boxIdx}"]`)
    if (stateVals) {
      tl.to(stateVals, { opacity: 1, duration: 0.2 }, 0.7)
    }
    if (compText) {
      tl.to(compText, { opacity: 0, duration: 0.15 }, 0.8)
    }

    // --- Phase 4: Recurrent arrow brightens + arrow head push (900-1200ms) ---
    const recArrow = svg.querySelector(`[data-rec-arrow="${step}"]`)
    const recArrowHead = recArrow ? recArrow.querySelector("polygon, [data-arrow-head]") : null

    if (recArrow) {
      tl.to(recArrow, { opacity: 1, duration: 0.15 }, 0.9)
    }
    // Arrow head push effect via the line's marker
    if (recArrow) {
      const recLine = recArrow.querySelector("line")
      if (recLine) {
        tl.to(recLine, {
          attr: { "stroke-width": 2.5 },
          duration: 0.15,
          yoyo: true,
          repeat: 1
        }, 0.9)
      }
    }

    // --- Phase 5: Previous step dims to opacity 0.4 (1200-1500ms) ---
    if (step > 0) {
      const prevBox = svg.querySelector(`[data-box="${step}"]`)
      const prevGroup = svg.querySelector(`[data-step-group="${step}"]`)
      if (prevGroup) {
        tl.to(prevGroup, { opacity: 0.4, duration: 0.3 }, 1.2)
      }
      // Also dim previous input arrow
      const prevInputArrow = svg.querySelector(`[data-input-arrow="${step - 1}"]`)
      if (prevInputArrow) {
        tl.to(prevInputArrow, { opacity: 0.4, duration: 0.3 }, 1.2)
      }
    }

    // Settle box to done state
    if (box) {
      tl.to(box, {
        attr: { stroke: COLOR_BORDER, "stroke-width": 1 },
        duration: 0.2
      }, 1.2)
    }
  }, [allStates, gradientNorms, maxGrad])

  const animateGradients = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return

    const tl = gsap.timeline()
    mainTlRef.current = tl

    // Show gradient title
    const gradTitle = svg.querySelector(`[data-grad-title]`)
    if (gradTitle) {
      tl.to(gradTitle, { opacity: 1, duration: 0.3 }, 0)
    }

    // Sweep backward R→L with stagger
    for (let i = T - 1; i >= 0; i--) {
      const gradArrow = svg.querySelector(`[data-grad-arrow="${i}"]`)
      const norm = gradientNorms[i]
      const thickness = 1 + 2 * Math.min(norm / maxGrad, 1)
      const delay = (T - 1 - i) * 0.05

      if (gradArrow) {
        const line = gradArrow.querySelector("line")
        tl.fromTo(gradArrow,
          { opacity: 0 },
          { opacity: 1, duration: 0.2 },
          0.3 + delay
        )
        if (line) {
          tl.fromTo(line,
            { attr: { "stroke-width": 0 } },
            { attr: { "stroke-width": thickness }, duration: 0.2 },
            0.3 + delay
          )
        }
      }
    }

    // Dim the last forward step group
    const lastGroup = svg.querySelector(`[data-step-group="${T}"]`)
    if (lastGroup) {
      tl.to(lastGroup, { opacity: 0.4, duration: 0.3 }, 0)
    }
  }, [gradientNorms, maxGrad])

  function handleNext() {
    if (animating || currentStep >= T) return
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    setAnimating(true)

    // Let React render, then animate
    requestAnimationFrame(() => {
      animateStep(nextStep)
    })
  }

  const handleReset = useCallback(() => {
    if (mainTlRef.current) {
      mainTlRef.current.kill()
      mainTlRef.current = null
    }

    const svg = svgRef.current
    if (!svg) {
      setCurrentStep(-1)
      setAnimating(false)
      return
    }

    setAnimating(true)

    const tl = gsap.timeline({
      onComplete: () => {
        setCurrentStep(-1)
        setAnimating(false)
      }
    })
    tl.timeScale(2)
    mainTlRef.current = tl

    // Fade everything back to initial state
    for (let i = 1; i <= T; i++) {
      const fillRect = svg.querySelector(`[data-fill-clip="${i}"] rect`)
      if (fillRect) tl.to(fillRect, { attr: { width: 0 }, duration: 0.3 }, 0)

      const stateVals = svg.querySelector(`[data-state-vals="${i}"]`)
      if (stateVals) tl.to(stateVals, { opacity: 0, duration: 0.3 }, 0)

      const stepGroup = svg.querySelector(`[data-step-group="${i}"]`)
      if (stepGroup) tl.to(stepGroup, { opacity: 1, duration: 0.2 }, 0)

      const box = svg.querySelector(`[data-box="${i}"]`)
      if (box) {
        tl.to(box, {
          attr: { stroke: COLOR_BORDER, "stroke-width": 1 },
          duration: 0.2
        }, 0)
      }
    }

    for (let i = 0; i < T; i++) {
      const inputArrow = svg.querySelector(`[data-input-arrow="${i}"]`)
      if (inputArrow) {
        tl.to(inputArrow, { opacity: 0.2, duration: 0.3 }, 0)
        const line = inputArrow.querySelector("line")
        if (line) tl.to(line, { attr: { stroke: "#666" }, duration: 0.2 }, 0)
      }

      const inputVal = svg.querySelector(`[data-input-val="${i}"]`)
      if (inputVal) tl.to(inputVal, { opacity: 0, duration: 0.3 }, 0)

      const recArrow = svg.querySelector(`[data-rec-arrow="${i}"]`)
      if (recArrow) {
        tl.to(recArrow, { opacity: 0.2, duration: 0.3 }, 0)
        const line = recArrow.querySelector("line")
        if (line) tl.to(line, { attr: { "stroke-width": 1.5 }, duration: 0.2 }, 0)
      }

      const gradArrow = svg.querySelector(`[data-grad-arrow="${i}"]`)
      if (gradArrow) tl.to(gradArrow, { opacity: 0, duration: 0.3 }, 0)
    }

    const compText = svg.querySelector(`[data-comp-text]`)
    if (compText) tl.to(compText, { opacity: 0, duration: 0.2 }, 0)

    const gradTitle = svg.querySelector(`[data-grad-title]`)
    if (gradTitle) tl.to(gradTitle, { opacity: 0, duration: 0.2 }, 0)
  }, [])

  // Computation text for current step
  const compStr = currentStep >= 0 && currentStep < T
    ? `h${SUBSCRIPTS[currentStep + 1]} = tanh(Wh·[${fmt(allStates[currentStep][0])}, ${fmt(allStates[currentStep][1])}] + Wx·[${inputs[currentStep][0]}] + b)`
    : ""

  return (
    <div style={{ fontFamily: FONT }}>
      <svg
        ref={svgRef}
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
            id="rnn-arrow-teal"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COLOR_TEAL} />
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

          {/* Clip paths for box fill animation */}
          {allStates.map((_, i) => (
            <clipPath key={`fill-clip-${i}`} id={`fill-clip-${i}`} data-fill-clip={i}>
              <rect
                x={boxX(i)}
                y={Y_BOXES}
                width={i === 0 ? BOX_W : 0}
                height={BOX_H}
              />
            </clipPath>
          ))}

          {/* Clip path for computation text reveal */}
          <clipPath id="comp-text-clip" data-comp-clip>
            <rect x={0} y={H - 30} width={0} height={30} />
          </clipPath>
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
          return (
            <g key={i} data-step-group={i}>
              {/* Box background (white) */}
              <rect
                data-box={i}
                x={x}
                y={Y_BOXES}
                width={BOX_W}
                height={BOX_H}
                rx={4}
                fill="#fff"
                stroke={COLOR_BORDER}
                strokeWidth={1}
              />
              {/* Box fill overlay (clipped for animation) */}
              <rect
                x={x}
                y={Y_BOXES}
                width={BOX_W}
                height={BOX_H}
                rx={4}
                fill={COLOR_ACTIVE}
                clipPath={`url(#fill-clip-${i})`}
                style={{ pointerEvents: "none" }}
              />
              {/* Label */}
              <text
                x={x + BOX_W / 2}
                y={Y_BOXES - 8}
                textAnchor="middle"
                style={{ fontFamily: FONT, fontSize: 10, fill: "#888" }}
              >
                {`h${SUBSCRIPTS[i]}`}
              </text>
              {/* State values */}
              <g data-state-vals={i} opacity={i === 0 ? 1 : 0}>
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
              </g>
            </g>
          )
        })}

        {/* Horizontal recurrent arrows (Wh) */}
        {Array.from({ length: T }, (_, i) => {
          const x1 = boxX(i) + BOX_W
          const x2 = boxX(i + 1)
          const y = Y_BOXES + BOX_H / 2
          return (
            <g key={`harrow-${i}`} data-rec-arrow={i} opacity={0.2}>
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
          return (
            <g key={`varrow-${i}`} data-input-arrow={i} opacity={0.2}>
              <line
                x1={cx}
                y1={Y_INPUT}
                x2={cx}
                y2={Y_BOXES + BOX_H + 4}
                stroke="#666"
                strokeWidth={1.5}
                markerEnd="url(#rnn-arrow)"
              />
              {/* Wx label */}
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

        {/* Input value labels (separate so they can fade in independently) */}
        {Array.from({ length: T }, (_, i) => {
          const cx = boxX(i + 1) + BOX_W / 2
          return (
            <text
              key={`inval-${i}`}
              data-input-val={i}
              x={cx}
              y={Y_INPUT + 16}
              textAnchor="middle"
              style={{ fontFamily: FONT, fontSize: 9, fill: "#888" }}
              opacity={0}
            >
              {`x${SUBSCRIPTS[i]} = ${inputs[i][0]}`}
            </text>
          )
        })}

        {/* Backward gradient arrows (always rendered, animated on completion) */}
        {Array.from({ length: T }, (_, i) => {
          const x1 = boxX(i + 1)
          const x2 = boxX(i) + BOX_W
          const y = Y_BOXES - 26
          const norm = gradientNorms[i]
          const color = gradColor(norm)
          const thickness = 1 + 2 * Math.min(norm / maxGrad, 1)
          return (
            <g key={`grad-${i}`} data-grad-arrow={i} opacity={0}>
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

        {/* Gradient title */}
        <text
          data-grad-title
          x={W / 2}
          y={Y_BOXES - 50}
          textAnchor="middle"
          style={{ fontFamily: FONT, fontSize: 11, fill: COLOR_GRAD_HIGH, fontWeight: 600 }}
          opacity={0}
        >
          Gradient magnitudes (backward pass)
        </text>

        {/* Computation annotation (clip-revealed) */}
        <text
          data-comp-text
          x={W / 2}
          y={H - 10}
          textAnchor="middle"
          clipPath="url(#comp-text-clip)"
          style={{ fontFamily: FONT, fontSize: 10, fill: "#555" }}
          opacity={0}
        >
          {compStr}
        </text>
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
          disabled={finished || animating}
          style={{
            ...BTN_BASE,
            ...((finished || animating) ? { opacity: 0.4, cursor: "default" } : btnActive(COLOR_BLUE)),
          }}
        >
          {currentStep < 0 ? "Start" : finished ? "Done" : "Next step"}
        </button>
        <button
          onClick={handleReset}
          disabled={animating}
          style={{
            ...BTN_BASE,
            ...(animating ? { opacity: 0.4, cursor: "default" } : {}),
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
