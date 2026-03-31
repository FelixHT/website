import React, { useState, useRef, useMemo, useCallback } from "react"

/* ─── Layout ─── */
const W = 750
const H = 400
const LEFT_W = 450          // 60% of 750
const RIGHT_X = LEFT_W + 10 // right panel start
const RIGHT_W = W - RIGHT_X - 10

/* Left panel: scatter */
const SCX = LEFT_W / 2
const SCY = H / 2
const SCALE = 55

/* Right panel: variance-vs-angle plot */
const PLOT_L = RIGHT_X + 30
const PLOT_R = W - 18
const PLOT_T = 50
const PLOT_B = H - 50
const PLOT_W = PLOT_R - PLOT_L
const PLOT_H = PLOT_B - PLOT_T

/* Data generation */
const N_POINTS = 50
const ANGLE_DEG = 35
const ANGLE_RAD = (ANGLE_DEG * Math.PI) / 180
const SIGMA_MAJOR = 2.2
const SIGMA_MINOR = 0.55   // ~4:1 variance ratio

/* Style */
const FONT = "var(--font-mono, monospace)"
const TEAL = "#4A7C6F"
const HANDLE_R = 7
const POINT_R = 3
const AXIS_COLOR = "rgba(0,0,0,0.06)"
const POINT_COLOR = "rgba(0,0,0,0.2)"
const TICK_LEN = 5

/* ─── Seeded PRNG (Mulberry32) ─── */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─── Box-Muller for normal samples ─── */
function boxMuller(rng) {
  const u1 = rng()
  const u2 = rng()
  const r = Math.sqrt(-2 * Math.log(u1))
  const theta = 2 * Math.PI * u2
  return [r * Math.cos(theta), r * Math.sin(theta)]
}

/* ─── Coordinate transforms ─── */
function toSVG(x, y) {
  return [SCX + x * SCALE, SCY - y * SCALE]
}
function fromSVG(sx, sy) {
  return [(sx - SCX) / SCALE, -(sy - SCY) / SCALE]
}

/* ─── Generate data, compute covariance and eigenvectors (deterministic) ─── */
function generateData() {
  const rng = mulberry32(66)

  const cosA = Math.cos(ANGLE_RAD)
  const sinA = Math.sin(ANGLE_RAD)

  const rawPoints = []
  for (let i = 0; i < N_POINTS; i++) {
    const [z1, z2] = boxMuller(rng)
    const x = z1 * SIGMA_MAJOR
    const y = z2 * SIGMA_MINOR
    const rx = cosA * x - sinA * y
    const ry = sinA * x + cosA * y
    rawPoints.push([rx, ry])
  }

  /* Center */
  let mx = 0, my = 0
  for (const [x, y] of rawPoints) { mx += x; my += y }
  mx /= N_POINTS
  my /= N_POINTS
  const points = rawPoints.map(([x, y]) => [x - mx, y - my])

  /* 2x2 covariance matrix */
  let cxx = 0, cxy = 0, cyy = 0
  for (const [x, y] of points) {
    cxx += x * x
    cxy += x * y
    cyy += y * y
  }
  cxx /= (N_POINTS - 1)
  cxy /= (N_POINTS - 1)
  cyy /= (N_POINTS - 1)

  /* Eigendecomposition of 2x2 symmetric matrix */
  const trace = cxx + cyy
  const det = cxx * cyy - cxy * cxy
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lambda1 = trace / 2 + disc
  const lambda2 = trace / 2 - disc

  /* Eigenvector for lambda1 (PC1) */
  let v1x, v1y
  if (Math.abs(cxy) > 1e-12) {
    v1x = lambda1 - cyy
    v1y = cxy
  } else {
    v1x = cxx >= cyy ? 1 : 0
    v1y = cxx >= cyy ? 0 : 1
  }
  const v1len = Math.sqrt(v1x * v1x + v1y * v1y)
  v1x /= v1len
  v1y /= v1len

  const pc1Angle = Math.atan2(v1y, v1x)

  /* Variance as function of angle: var(theta) = w^T C w
     = cxx cos^2(t) + 2 cxy cos(t)sin(t) + cyy sin^2(t) */
  const N_CURVE = 180
  const varianceCurve = []
  let maxVar = 0
  for (let i = 0; i <= N_CURVE; i++) {
    const t = (i / N_CURVE) * Math.PI
    const c = Math.cos(t)
    const s = Math.sin(t)
    const v = cxx * c * c + 2 * cxy * c * s + cyy * s * s
    varianceCurve.push({ angle: t, variance: v })
    if (v > maxVar) maxVar = v
  }

  return {
    points,
    cxx, cxy, cyy,
    lambda1, lambda2,
    pc1: [v1x, v1y],
    pc1Angle,
    varianceCurve,
    maxVar,
  }
}

/* ─── Pre-compute static data ─── */
const DATA = generateData()

export default function VarianceMaximizationExplorer() {
  /* ── Direction angle state ── */
  const initAngle = DATA.pc1Angle + Math.PI * 0.35
  const [angle, setAngle] = useState(initAngle)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef(null)

  /* ── Direction vector ── */
  const dirX = Math.cos(angle)
  const dirY = Math.sin(angle)

  /* ── Current variance along direction ── */
  const currentVariance = useMemo(() => {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return DATA.cxx * c * c + 2 * DATA.cxy * c * s + DATA.cyy * s * s
  }, [angle])

  /* ── Projected scalars (dot product of each point with direction) ── */
  const projections = useMemo(() => {
    return DATA.points.map(([x, y]) => x * dirX + y * dirY)
  }, [dirX, dirY])

  /* ── Variance curve path for the right panel ── */
  const curvePath = useMemo(() => {
    const pts = DATA.varianceCurve.map(({ angle: a, variance: v }) => {
      const px = PLOT_L + (a / Math.PI) * PLOT_W
      const py = PLOT_B - (v / DATA.maxVar) * PLOT_H * 0.92
      return `${px.toFixed(1)},${py.toFixed(1)}`
    })
    return `M ${pts[0]} L ${pts.slice(1).join(" ")}`
  }, [])

  /* ── PC1 marker position on curve ── */
  const pc1PlotAngle = DATA.pc1Angle >= 0 ? DATA.pc1Angle : DATA.pc1Angle + Math.PI
  const pc1PlotX = PLOT_L + (pc1PlotAngle / Math.PI) * PLOT_W
  const pc1PlotY = PLOT_B - (DATA.lambda1 / DATA.maxVar) * PLOT_H * 0.92

  /* ── Current angle marker on curve ── */
  // Normalize to [0, pi) for the plot
  let plotAngle = angle % Math.PI
  if (plotAngle < 0) plotAngle += Math.PI
  const markerX = PLOT_L + (plotAngle / Math.PI) * PLOT_W
  const markerVariance = currentVariance
  const markerY = PLOT_B - (markerVariance / DATA.maxVar) * PLOT_H * 0.92

  /* ── Direction line endpoints (extend across scatter area) ── */
  const lineExtent = 4.5
  const lineStart = toSVG(-lineExtent * dirX, -lineExtent * dirY)
  const lineEnd = toSVG(lineExtent * dirX, lineExtent * dirY)

  /* ── Handle position (unit circle) ── */
  const handlePos = toSVG(dirX * 2.8, dirY * 2.8)

  /* ── Pointer handlers ── */
  const handlePointerDown = useCallback((e) => {
    e.target.setPointerCapture(e.pointerId)
    setDragging(true)
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    const [mx, my] = fromSVG(svgP.x, svgP.y)
    const newAngle = Math.atan2(my, mx)
    setAngle(newAngle)
  }, [dragging])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  /* ── Tick marks for projected data on the direction line ── */
  const perpX = -dirY
  const perpY = dirX

  /* ── Right panel axis tick labels ── */
  const angleTicksDegs = [0, 45, 90, 135, 180]

  return (
    <div style={{ width: "100%" }}>
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
          <clipPath id="var-scatter-clip">
            <rect x="0" y="0" width={LEFT_W} height={H} />
          </clipPath>
          <clipPath id="var-plot-clip">
            <rect x={PLOT_L - 2} y={PLOT_T - 5} width={PLOT_W + 4} height={PLOT_H + 10} />
          </clipPath>
        </defs>

        {/* ═══════════════════════════════════════
            LEFT PANEL: Scatter plot
            ═══════════════════════════════════════ */}

        {/* Axes */}
        <line x1={0} y1={SCY} x2={LEFT_W} y2={SCY} stroke={AXIS_COLOR} />
        <line x1={SCX} y1={0} x2={SCX} y2={H} stroke={AXIS_COLOR} />

        {/* Direction line (extended) */}
        <g clipPath="url(#var-scatter-clip)">
          <line
            x1={lineStart[0]} y1={lineStart[1]}
            x2={lineEnd[0]} y2={lineEnd[1]}
            stroke={TEAL}
            strokeWidth="1"
            opacity="0.25"
          />
        </g>

        {/* Projected data ticks along the direction line */}
        {projections.map((proj, i) => {
          const px = SCX + proj * dirX * SCALE
          const py = SCY - proj * dirY * SCALE
          return (
            <line
              key={`tick-${i}`}
              x1={px + perpX * TICK_LEN}
              y1={py - perpY * TICK_LEN}
              x2={px - perpX * TICK_LEN}
              y2={py + perpY * TICK_LEN}
              stroke={TEAL}
              strokeWidth="1.5"
              opacity="0.5"
            />
          )
        })}

        {/* Data points */}
        {DATA.points.map(([x, y], i) => {
          const [sx, sy] = toSVG(x, y)
          return (
            <circle
              key={`pt-${i}`}
              cx={sx}
              cy={sy}
              r={POINT_R}
              fill={POINT_COLOR}
            />
          )
        })}

        {/* Direction vector (thicker, from origin) */}
        <line
          x1={SCX} y1={SCY}
          x2={handlePos[0]} y2={handlePos[1]}
          stroke={TEAL}
          strokeWidth="2"
        />

        {/* Draggable handle */}
        <circle
          cx={handlePos[0]}
          cy={handlePos[1]}
          r={HANDLE_R}
          fill={TEAL}
          stroke="#fff"
          strokeWidth="1.5"
          style={{ cursor: "grab" }}
          onPointerDown={handlePointerDown}
        />

        {/* Direction label */}
        <text
          x={handlePos[0] + 12}
          y={handlePos[1] - 10}
          fontSize="11"
          fontFamily={FONT}
          fill={TEAL}
          fontWeight="600"
        >
          w
        </text>

        {/* Origin */}
        <circle cx={SCX} cy={SCY} r="2.5" fill="rgba(0,0,0,0.25)" />

        {/* Variance readout */}
        <text
          x={16}
          y={28}
          fontSize="12"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.5)"
        >
          {"var = " + currentVariance.toFixed(2)}
        </text>
        <text
          x={16}
          y={44}
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.3)"
        >
          {"\u03B8 = " + (((angle * 180 / Math.PI) % 180 + 180) % 180).toFixed(0) + "\u00B0"}
        </text>

        {/* Drag hint */}
        {!dragging && (
          <text
            x={SCX}
            y={H - 10}
            textAnchor="middle"
            fontSize="10"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.18)"
          >
            drag handle to rotate direction
          </text>
        )}

        {/* ═══════════════════════════════════════
            DIVIDER
            ═══════════════════════════════════════ */}
        <line
          x1={LEFT_W}
          y1={20}
          x2={LEFT_W}
          y2={H - 20}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
        />

        {/* ═══════════════════════════════════════
            RIGHT PANEL: Variance vs angle
            ═══════════════════════════════════════ */}

        {/* Panel title */}
        <text
          x={PLOT_L + PLOT_W / 2}
          y={PLOT_T - 22}
          textAnchor="middle"
          fontSize="11"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.4)"
        >
          variance vs angle
        </text>

        {/* Plot axes */}
        <line
          x1={PLOT_L} y1={PLOT_B}
          x2={PLOT_R} y2={PLOT_B}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1"
        />
        <line
          x1={PLOT_L} y1={PLOT_T}
          x2={PLOT_L} y2={PLOT_B}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1"
        />

        {/* Angle tick marks on x-axis */}
        {angleTicksDegs.map((deg) => {
          const x = PLOT_L + (deg / 180) * PLOT_W
          return (
            <g key={`atick-${deg}`}>
              <line
                x1={x} y1={PLOT_B}
                x2={x} y2={PLOT_B + 4}
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={PLOT_B + 16}
                textAnchor="middle"
                fontSize="9"
                fontFamily={FONT}
                fill="rgba(0,0,0,0.3)"
              >
                {deg + "\u00B0"}
              </text>
            </g>
          )
        })}

        {/* Y-axis label */}
        <text
          x={PLOT_L - 6}
          y={PLOT_T + PLOT_H / 2}
          textAnchor="middle"
          fontSize="9"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.3)"
          transform={`rotate(-90, ${PLOT_L - 6}, ${PLOT_T + PLOT_H / 2})`}
        >
          w{"ᵀ"}Cw
        </text>

        {/* Variance curve */}
        <g clipPath="url(#var-plot-clip)">
          <path
            d={curvePath}
            fill="none"
            stroke={TEAL}
            strokeWidth="2"
            opacity="0.7"
          />
        </g>

        {/* PC1 maximum marker */}
        <circle
          cx={pc1PlotX}
          cy={pc1PlotY}
          r="4"
          fill={TEAL}
          stroke="#fff"
          strokeWidth="1"
        />
        <text
          x={pc1PlotX + 8}
          y={pc1PlotY - 6}
          fontSize="10"
          fontFamily={FONT}
          fill={TEAL}
          fontWeight="600"
        >
          PC1
        </text>

        {/* PC2 minimum marker (at pc1Angle + 90) */}
        {(() => {
          let pc2Plot = pc1PlotAngle + Math.PI / 2
          if (pc2Plot >= Math.PI) pc2Plot -= Math.PI
          const pc2X = PLOT_L + (pc2Plot / Math.PI) * PLOT_W
          const pc2Y = PLOT_B - (DATA.lambda2 / DATA.maxVar) * PLOT_H * 0.92
          return (
            <>
              <circle
                cx={pc2X}
                cy={pc2Y}
                r="3"
                fill="none"
                stroke={TEAL}
                strokeWidth="1"
                opacity="0.5"
              />
              <text
                x={pc2X + 7}
                y={pc2Y + 4}
                fontSize="9"
                fontFamily={FONT}
                fill={TEAL}
                opacity="0.5"
              >
                PC2
              </text>
            </>
          )
        })()}

        {/* Current angle vertical marker line */}
        <line
          x1={markerX} y1={PLOT_T}
          x2={markerX} y2={PLOT_B}
          stroke={TEAL}
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.4"
        />

        {/* Current position dot on curve */}
        <circle
          cx={markerX}
          cy={markerY}
          r="4"
          fill="#fff"
          stroke={TEAL}
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}
