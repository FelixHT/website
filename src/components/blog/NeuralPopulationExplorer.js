import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react"

/* ────────────────────────────────────────────
   Seeded PRNG (deterministic across renders)
   ──────────────────────────────────────────── */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ────────────────────────────────────────────
   Data generation — motor cortex cosine tuning
   ──────────────────────────────────────────── */
const N_NEURONS = 16
const N_TIME = 80

function generateRates() {
  const rng = mulberry32(42)
  // Preferred directions: roughly evenly spaced + jitter
  const prefs = Array.from(
    { length: N_NEURONS },
    (_, i) => (i / N_NEURONS) * 2 * Math.PI + (rng() - 0.5) * 0.4
  )
  const gains = Array.from(
    { length: N_NEURONS },
    () => 15 + rng() * 35
  )
  const baselines = Array.from(
    { length: N_NEURONS },
    () => 3 + rng() * 8
  )

  return Array.from({ length: N_NEURONS }, (_, n) =>
    Array.from({ length: N_TIME }, (_, t) => {
      const phase = t / (N_TIME - 1)
      // Reaching direction: oscillates to create a loop in state space
      const dir =
        0.2 * Math.PI +
        1.6 * Math.PI * (0.5 - 0.5 * Math.cos(phase * 2 * Math.PI))
      // Speed: bell-shaped, peaks around mid-reach
      const speed = Math.exp(
        -((phase - 0.45) ** 2) / (2 * 0.13 ** 2)
      )
      const tuning = Math.max(0, Math.cos(dir - prefs[n]))
      return Math.max(
        0,
        baselines[n] +
          gains[n] * tuning * (0.3 + 0.7 * speed) +
          (rng() - 0.5) * 3
      )
    })
  )
}

/* ────────────────────────────────────────────
   3D → 2D projection (isometric-style)
   ──────────────────────────────────────────── */
const AZ = -0.55
const EL = 0.38
const CA = Math.cos(AZ),
  SA = Math.sin(AZ)
const CE = Math.cos(EL),
  SE = Math.sin(EL)

const SVG_W = 840
const SVG_H = 480
const SVG_CX = SVG_W / 2 - 30
const SVG_CY = SVG_H / 2 + 15
const S3D = 130 // scale factor (pixels per normalized unit)

function project3D(x, y, z) {
  const rx = x * CA + z * SA
  const rz = -x * SA + z * CA
  const ry = y * CE - rz * SE
  return [SVG_CX + rx * S3D, SVG_CY - ry * S3D]
}

/* ────────────────────────────────────────────
   Normalize a series to [-1, 1] (centered)
   ──────────────────────────────────────────── */
function normalize(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const centered = values.map((v) => v - mean)
  const maxAbs = Math.max(...centered.map(Math.abs)) || 1
  return centered.map((v) => v / maxAbs)
}

/* ────────────────────────────────────────────
   Colors
   ──────────────────────────────────────────── */
const AXIS_COLORS = ["#3d6cb9", "#4A7C6F", "#c0503a"]
const AXIS_LABELS = ["x", "y", "z"]
const FONT = "var(--font-mono, monospace)"

function timeColor(t) {
  const f = t / (N_TIME - 1)
  // Gradient: blue (#3d6cb9) → warm red (#c0503a)
  const r = Math.round(61 + (192 - 61) * f)
  const g = Math.round(108 + (80 - 108) * f)
  const b = Math.round(185 + (58 - 185) * f)
  return `rgb(${r},${g},${b})`
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
export default function NeuralPopulationExplorer() {
  const [rates] = useState(generateRates)
  const [axes, setAxes] = useState([0, 5, 10])

  /* ── Compute target projected points ── */
  const projected = useMemo(() => {
    const [nx, ny, nz] = axes
    const xn = normalize(rates[nx])
    const yn = normalize(rates[ny])
    const zn = normalize(rates[nz])
    return xn.map((x, t) => project3D(x, yn[t], zn[t]))
  }, [axes, rates])

  /* ── Animation state ── */
  const displayRef = useRef(null)
  const animRef = useRef(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const target = projected
    const prev = displayRef.current
      ? displayRef.current.map((p) => [...p])
      : null

    if (!prev) {
      displayRef.current = target
      setTick((n) => n + 1)
      return
    }

    const start = prev
    const duration = 500
    let t0 = null

    const step = (ts) => {
      if (!t0) t0 = ts
      const t = Math.min((ts - t0) / duration, 1)
      const ease = 1 - (1 - t) ** 3 // ease-out cubic
      displayRef.current = start.map((p, i) => [
        p[0] + (target[i][0] - p[0]) * ease,
        p[1] + (target[i][1] - p[1]) * ease,
      ])
      setTick((n) => n + 1)
      if (t < 1) animRef.current = requestAnimationFrame(step)
    }

    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(step)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [projected])

  const pts = displayRef.current || projected

  /* ── Axis endpoints (static, depend only on viewing angles) ── */
  const axisEndpoints = useMemo(
    () => [
      { from: project3D(0, 0, 0), to: project3D(1.3, 0, 0) },
      { from: project3D(0, 0, 0), to: project3D(0, 1.3, 0) },
      { from: project3D(0, 0, 0), to: project3D(0, 0, 1.3) },
    ],
    []
  )

  const negAxisEndpoints = useMemo(
    () => [
      { from: project3D(0, 0, 0), to: project3D(-0.4, 0, 0) },
      { from: project3D(0, 0, 0), to: project3D(0, -0.4, 0) },
      { from: project3D(0, 0, 0), to: project3D(0, 0, -0.4) },
    ],
    []
  )

  const origin = useMemo(() => project3D(0, 0, 0), [])

  /* ── Axis change handler (swaps if duplicate) ── */
  const handleAxisChange = useCallback((axisIdx, neuronIdx) => {
    setAxes((prev) => {
      const next = [...prev]
      const existingIdx = next.indexOf(neuronIdx)
      if (existingIdx !== -1 && existingIdx !== axisIdx) {
        next[existingIdx] = prev[axisIdx]
      }
      next[axisIdx] = neuronIdx
      return next
    })
  }, [])

  /* ── Build trajectory path for the connecting line ── */
  const trajectoryPath = useMemo(() => {
    if (!pts || pts.length === 0) return ""
    return (
      "M " +
      pts
        .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(" L ")
    )
  }, [pts])

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: "100%", height: "auto" }}
      >
        <defs>
          {AXIS_COLORS.map((color, i) => (
            <marker
              key={i}
              id={`npe-arrow-${i}`}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill={color} />
            </marker>
          ))}
        </defs>

        {/* Negative axis stubs (dashed, faded) */}
        {negAxisEndpoints.map(({ from, to }, i) => (
          <line
            key={`neg-${i}`}
            x1={from[0]}
            y1={from[1]}
            x2={to[0]}
            y2={to[1]}
            stroke={AXIS_COLORS[i]}
            strokeWidth="1"
            opacity="0.15"
            strokeDasharray="3,3"
          />
        ))}

        {/* Trajectory: thin semi-transparent path for continuity */}
        <path
          d={trajectoryPath}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="1.5"
        />

        {/* Trajectory segments (colored by time) */}
        {pts.slice(0, -1).map((p, i) => (
          <line
            key={`seg-${i}`}
            x1={p[0]}
            y1={p[1]}
            x2={pts[i + 1][0]}
            y2={pts[i + 1][1]}
            stroke={timeColor(i)}
            strokeWidth="2"
            opacity="0.65"
          />
        ))}

        {/* Time-point dots */}
        {pts.map(([x, y], i) => {
          const isEndpoint = i === 0 || i === N_TIME - 1
          return (
            <circle
              key={`pt-${i}`}
              cx={x}
              cy={y}
              r={isEndpoint ? 4 : 1.5}
              fill={timeColor(i)}
              stroke={isEndpoint ? "#fff" : "none"}
              strokeWidth={isEndpoint ? 1.5 : 0}
            />
          )
        })}

        {/* Positive axis lines */}
        {axisEndpoints.map(({ from, to }, i) => (
          <line
            key={`axis-${i}`}
            x1={from[0]}
            y1={from[1]}
            x2={to[0]}
            y2={to[1]}
            stroke={AXIS_COLORS[i]}
            strokeWidth="1.5"
            opacity="0.45"
            markerEnd={`url(#npe-arrow-${i})`}
          />
        ))}

        {/* Axis labels (neuron names) */}
        {axisEndpoints.map(({ to }, i) => (
          <text
            key={`lbl-${i}`}
            x={to[0] + (i === 2 ? -14 : 10)}
            y={to[1] + (i === 1 ? -8 : 4)}
            fontSize="12"
            fontFamily={FONT}
            fill={AXIS_COLORS[i]}
            fontWeight="600"
          >
            {"N" + (axes[i] + 1)}
          </text>
        ))}

        {/* Origin dot */}
        <circle
          cx={origin[0]}
          cy={origin[1]}
          r="2.5"
          fill="rgba(0,0,0,0.15)"
        />

        {/* Start / End labels */}
        {pts.length > 0 && (
          <>
            <text
              x={pts[0][0] - 6}
              y={pts[0][1] - 10}
              fontSize="10"
              fontFamily={FONT}
              fill="rgba(0,0,0,0.35)"
              textAnchor="end"
            >
              start
            </text>
            <text
              x={pts[N_TIME - 1][0] + 8}
              y={pts[N_TIME - 1][1] - 10}
              fontSize="10"
              fontFamily={FONT}
              fill="rgba(0,0,0,0.35)"
            >
              end
            </text>
          </>
        )}

        {/* Time legend (bottom-right) */}
        <g transform={`translate(${SVG_W - 100}, ${SVG_H - 40})`}>
          <defs>
            <linearGradient id="npe-time-grad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={timeColor(0)} />
              <stop offset="100%" stopColor={timeColor(N_TIME - 1)} />
            </linearGradient>
          </defs>
          <rect
            x="0"
            y="0"
            width="60"
            height="4"
            rx="2"
            fill="url(#npe-time-grad)"
          />
          <text
            x="0"
            y="14"
            fontSize="9"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.3)"
          >
            early
          </text>
          <text
            x="60"
            y="14"
            textAnchor="end"
            fontSize="9"
            fontFamily={FONT}
            fill="rgba(0,0,0,0.3)"
          >
            late
          </text>
        </g>
      </svg>

      {/* ── Neuron selectors ── */}
      <div
        className="blog-figure__controls"
        style={{ justifyContent: "center", gap: "1.2rem" }}
      >
        {AXIS_LABELS.map((label, i) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span
              style={{
                color: AXIS_COLORS[i],
                fontWeight: 600,
                fontSize: "12px",
                fontFamily: FONT,
              }}
            >
              {label}:
            </span>
            <select
              value={axes[i]}
              onChange={(e) =>
                handleAxisChange(i, parseInt(e.target.value, 10))
              }
              style={{
                fontFamily: FONT,
                fontSize: "12px",
                padding: "3px 6px",
                border: `1.5px solid ${AXIS_COLORS[i]}50`,
                borderRadius: "3px",
                background: "#fff",
                cursor: "pointer",
                color: "rgba(0,0,0,0.65)",
              }}
            >
              {Array.from({ length: N_NEURONS }, (_, n) => (
                <option key={n} value={n}>
                  Neuron {n + 1}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
