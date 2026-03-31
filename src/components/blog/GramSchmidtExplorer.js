import React, { useState, useRef, useMemo, useCallback, useEffect } from "react"

/* ─── Layout ─── */
const W = 600
const H = 380
const CX = 250
const CY = 200
const SCALE = 80
const ANIM_DURATION = 400

/* ─── Colors ─── */
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const TEAL = "#4A7C6F"
const PROJ_COLOR = "rgba(0,0,0,0.3)"
const FONT = "var(--font-mono, monospace)"

/* ─── Input vectors ─── */
const A1 = [2.2, 0.8]
const A2 = [1.0, 1.8]

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [CX + x * SCALE, CY - y * SCALE]
}

/* ─── Ease-out cubic ─── */
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ─── Precomputed Gram-Schmidt quantities ─── */
const lenA1 = Math.hypot(A1[0], A1[1])
const Q1 = [A1[0] / lenA1, A1[1] / lenA1]

const dotA2Q1 = A2[0] * Q1[0] + A2[1] * Q1[1]
const PROJ = [dotA2Q1 * Q1[0], dotA2Q1 * Q1[1]]
const RESID = [A2[0] - PROJ[0], A2[1] - PROJ[1]]
const lenResid = Math.hypot(RESID[0], RESID[1])
const Q2 = [RESID[0] / lenResid, RESID[1] / lenResid]

/* ─── Stage descriptions ─── */
const STAGE_DESCRIPTIONS = [
  "Two independent vectors a₁ and a₂ in the plane.",
  "Normalize a₁ to get q₁ = a₁ / ‖a₁‖. The unit circle confirms ‖q₁‖ = 1.",
  "Project a₂ onto q₁. The dashed segment is (a₂·q₁)q₁; the residual is perpendicular to q₁.",
  "Normalize the residual to get q₂. The right-angle marker confirms q₁ \u22A5 q₂.",
]

const NUM_STAGES = STAGE_DESCRIPTIONS.length

/* ─── Arrowhead marker helper ─── */
function ArrowMarker({ id, color, opacity = 1 }) {
  return (
    <marker
      id={id}
      markerWidth="8"
      markerHeight="6"
      refX="7"
      refY="3"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <polygon points="0 0, 8 3, 0 6" fill={color} opacity={opacity} />
    </marker>
  )
}

/* ─── Arrow component ─── */
function Arrow({
  from,
  to,
  color,
  strokeWidth = 2,
  markerId,
  opacity = 1,
  dash = null,
}) {
  const [x1, y1] = toSVG(from[0], from[1])
  const [x2, y2] = toSVG(to[0], to[1])
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      opacity={opacity}
      markerEnd={markerId ? `url(#${markerId})` : undefined}
    />
  )
}

/* ─── Label component ─── */
function VectorLabel({ pos, text, color, dx = 6, dy = -8, fontSize = 12 }) {
  const [sx, sy] = toSVG(pos[0], pos[1])
  return (
    <text
      x={sx + dx}
      y={sy + dy}
      fontSize={fontSize}
      fontFamily={FONT}
      fill={color}
      fontWeight="600"
    >
      {text}
    </text>
  )
}

/* ─── Interpolate a scalar ─── */
function lerp(a, b, t) {
  return a + (b - a) * t
}

/* ─── Interpolate a 2D vector ─── */
function vecLerp(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

export default function GramSchmidtExplorer() {
  const [stage, setStage] = useState(0)
  const [progress, setProgress] = useState(1) // 0..1, animation progress toward current stage
  const animRef = useRef(null)
  const prevStageRef = useRef(0)

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  /* ─── Animate to a target stage ─── */
  const animateTo = useCallback(
    (targetStage) => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      prevStageRef.current = stage
      setStage(targetStage)
      setProgress(0)

      const t0 = performance.now()
      function tick(now) {
        const elapsed = now - t0
        const rawT = Math.min(elapsed / ANIM_DURATION, 1)
        const eased = easeOut(rawT)
        setProgress(eased)
        if (rawT < 1) {
          animRef.current = requestAnimationFrame(tick)
        } else {
          animRef.current = null
          setProgress(1)
        }
      }
      animRef.current = requestAnimationFrame(tick)
    },
    [stage]
  )

  const nextStep = useCallback(() => {
    if (stage < NUM_STAGES - 1) animateTo(stage + 1)
  }, [stage, animateTo])

  const reset = useCallback(() => {
    animateTo(0)
  }, [animateTo])

  /* ─── Compute animated values ─── */
  const t = progress // shorthand

  // Stage 0: a1 and a2 are visible
  // Stage 1: a1 fades, q1 appears, unit circle appears
  // Stage 2: projection and residual appear
  // Stage 3: q2 appears, right-angle marker appears

  // Fade/appear opacities per stage
  const a1Opacity = stage === 0 ? 1 : stage === 1 ? lerp(1, 0.2, t) : 0.2
  const a2Opacity = stage <= 1 ? 1 : stage === 2 ? 1 : 0.6
  const q1Opacity = stage === 0 ? 0 : stage === 1 ? t : 1
  const unitCircleOpacity = stage === 0 ? 0 : stage === 1 ? t * 0.15 : 0.15
  const projOpacity = stage <= 1 ? 0 : stage === 2 ? t : 1
  const residOpacity = stage <= 1 ? 0 : stage === 2 ? t : 1
  const q2Opacity = stage <= 2 ? 0 : t
  const rightAngleOpacity = stage <= 2 ? 0 : t

  // Animated q1 length: grows from a1 length down to 1
  const q1AnimLen =
    stage === 0
      ? 0
      : stage === 1
      ? lerp(lenA1, 1, t)
      : 1
  const q1Tip = [Q1[0] * q1AnimLen, Q1[1] * q1AnimLen]

  // Animated projection: grows from origin along q1
  const projTip =
    stage <= 1 ? [0, 0] : stage === 2 ? vecLerp([0, 0], PROJ, t) : PROJ

  // Animated residual: grows from projection point to a2 tip
  const residTip =
    stage <= 1
      ? projTip
      : stage === 2
      ? vecLerp(projTip, A2, t)
      : A2

  // Animated q2: grows from origin
  const q2AnimLen = stage <= 2 ? 0 : t
  const q2Tip = [Q2[0] * q2AnimLen, Q2[1] * q2AnimLen]

  /* ─── Right-angle marker path ─── */
  const rightAnglePath = useMemo(() => {
    const size = 0.15 // in data units
    // q1 and q2 directions
    const p1 = [Q1[0] * size, Q1[1] * size]
    const corner = [Q1[0] * size + Q2[0] * size, Q1[1] * size + Q2[1] * size]
    const p2 = [Q2[0] * size, Q2[1] * size]
    const [sx1, sy1] = toSVG(p1[0], p1[1])
    const [scx, scy] = toSVG(corner[0], corner[1])
    const [sx2, sy2] = toSVG(p2[0], p2[1])
    return `M ${sx1.toFixed(1)} ${sy1.toFixed(1)} L ${scx.toFixed(1)} ${scy.toFixed(1)} L ${sx2.toFixed(1)} ${sy2.toFixed(1)}`
  }, [])

  /* ─── Unit circle path ─── */
  const unitCirclePath = useMemo(() => {
    const [cx, cy] = toSVG(0, 0)
    const r = SCALE
    return { cx, cy, r }
  }, [])

  /* ─── Perpendicular drop line from a2 tip to projection point ─── */
  const [projSx, projSy] = toSVG(projTip[0], projTip[1])
  const [a2Sx, a2Sy] = toSVG(A2[0], A2[1])

  /* ─── Grid lines ─── */
  const axisExtent = 3.5
  const [axXL, axYH] = toSVG(-axisExtent, 0)
  const [axXR, axYH2] = toSVG(axisExtent, 0)
  const [axYX, axYT] = toSVG(0, axisExtent)
  const [axYX2, axYB] = toSVG(0, -axisExtent)

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          userSelect: "none",
        }}
      >
        <defs>
          <ArrowMarker id="gs-blue" color={BLUE} />
          <ArrowMarker id="gs-blue-faded" color={BLUE} opacity={0.2} />
          <ArrowMarker id="gs-red" color={RED} />
          <ArrowMarker id="gs-red-faded" color={RED} opacity={0.6} />
          <ArrowMarker id="gs-teal" color={TEAL} />
          <ArrowMarker id="gs-proj" color="rgba(0,0,0,0.3)" />
        </defs>

        {/* Axes */}
        <line
          x1={axXL} y1={axYH} x2={axXR} y2={axYH2}
          stroke="rgba(0,0,0,0.06)"
        />
        <line
          x1={axYX} y1={axYT} x2={axYX2} y2={axYB}
          stroke="rgba(0,0,0,0.06)"
        />

        {/* Unit circle */}
        <circle
          cx={unitCirclePath.cx}
          cy={unitCirclePath.cy}
          r={unitCirclePath.r}
          fill="none"
          stroke={BLUE}
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity={unitCircleOpacity}
        />

        {/* ── Stage 0+: a1 vector ── */}
        <Arrow
          from={[0, 0]}
          to={A1}
          color={BLUE}
          markerId="gs-blue-faded"
          opacity={a1Opacity}
        />
        {a1Opacity > 0.3 && (
          <VectorLabel pos={A1} text="a₁" color={BLUE} />
        )}
        {a1Opacity <= 0.3 && a1Opacity > 0 && (
          <VectorLabel
            pos={A1}
            text="a₁"
            color={BLUE}
            dx={6}
            dy={-8}
            fontSize={10}
          />
        )}

        {/* ── Stage 0+: a2 vector ── */}
        <Arrow
          from={[0, 0]}
          to={A2}
          color={RED}
          markerId={a2Opacity > 0.8 ? "gs-red" : "gs-red-faded"}
          opacity={a2Opacity}
        />
        <VectorLabel pos={A2} text="a₂" color={RED} dx={6} dy={-8} />

        {/* ── Stage 1+: q1 vector ── */}
        {q1Opacity > 0 && (
          <>
            <Arrow
              from={[0, 0]}
              to={q1Tip}
              color={BLUE}
              strokeWidth={2.5}
              markerId="gs-blue"
              opacity={q1Opacity}
            />
            {q1Opacity > 0.5 && (
              <VectorLabel
                pos={q1Tip}
                text="q₁"
                color={BLUE}
                dx={8}
                dy={-10}
                fontSize={13}
              />
            )}
          </>
        )}

        {/* ── Stage 2+: projection dashed along q1 ── */}
        {projOpacity > 0 && (
          <>
            <Arrow
              from={[0, 0]}
              to={projTip}
              color={PROJ_COLOR}
              strokeWidth={1.5}
              markerId="gs-proj"
              opacity={projOpacity}
              dash="5,4"
            />
            {projOpacity > 0.5 && (
              <VectorLabel
                pos={projTip}
                text="(a₂·q₁)q₁"
                color="rgba(0,0,0,0.45)"
                dx={4}
                dy={14}
                fontSize={10}
              />
            )}
          </>
        )}

        {/* ── Stage 2+: residual vector from projection tip to a2 tip ── */}
        {residOpacity > 0 && (
          <>
            <line
              x1={projSx}
              y1={projSy}
              x2={lerp(projSx, a2Sx, stage === 2 ? t : 1)}
              y2={lerp(projSy, a2Sy, stage === 2 ? t : 1)}
              stroke={TEAL}
              strokeWidth={2}
              opacity={residOpacity}
              markerEnd="url(#gs-teal)"
            />
            {residOpacity > 0.5 && (
              (() => {
                const midX = (PROJ[0] + A2[0]) / 2
                const midY = (PROJ[1] + A2[1]) / 2
                return (
                  <VectorLabel
                    pos={[midX, midY]}
                    text="residual"
                    color={TEAL}
                    dx={8}
                    dy={-6}
                    fontSize={10}
                  />
                )
              })()
            )}
          </>
        )}

        {/* ── Stage 2+: perpendicular drop line (thin, dotted) ── */}
        {projOpacity > 0 && stage >= 2 && (
          <line
            x1={projSx}
            y1={projSy}
            x2={a2Sx}
            y2={a2Sy}
            stroke={TEAL}
            strokeWidth={0.5}
            strokeDasharray="2,2"
            opacity={projOpacity * 0.4}
          />
        )}

        {/* ── Stage 3: q2 vector ── */}
        {q2Opacity > 0 && (
          <>
            <Arrow
              from={[0, 0]}
              to={q2Tip}
              color={RED}
              strokeWidth={2.5}
              markerId="gs-red"
              opacity={q2Opacity}
            />
            {q2Opacity > 0.5 && (
              <VectorLabel
                pos={q2Tip}
                text="q₂"
                color={RED}
                dx={8}
                dy={-10}
                fontSize={13}
              />
            )}
          </>
        )}

        {/* ── Stage 3: right-angle marker ── */}
        {rightAngleOpacity > 0 && (
          <path
            d={rightAnglePath}
            fill="none"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1.2"
            opacity={rightAngleOpacity}
          />
        )}

        {/* Origin dot */}
        <circle
          cx={CX}
          cy={CY}
          r="3"
          fill="rgba(0,0,0,0.25)"
        />

        {/* Stage description text */}
        <text
          x={W / 2}
          y={H - 16}
          textAnchor="middle"
          fontSize="10.5"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          {STAGE_DESCRIPTIONS[stage]}
        </text>
      </svg>

      {/* Controls */}
      <div
        className="blog-figure__controls"
        style={{
          justifyContent: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontFamily: FONT,
            color: "rgba(0,0,0,0.35)",
            marginRight: "0.3rem",
          }}
        >
          Step {stage + 1}/{NUM_STAGES}
        </span>
        <button
          className="blog-figure__button"
          onClick={nextStep}
          disabled={stage >= NUM_STAGES - 1}
          style={stage >= NUM_STAGES - 1 ? { opacity: 0.4 } : {}}
        >
          Next step
        </button>
        <button
          className="blog-figure__button"
          onClick={reset}
          disabled={stage === 0}
          style={stage === 0 ? { opacity: 0.4 } : {}}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
