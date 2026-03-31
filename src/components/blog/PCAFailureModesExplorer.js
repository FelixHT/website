import React, { useState, useMemo, useRef, useCallback, useEffect } from "react"

/* ─── Layout ─── */
const W = 650
const H = 420
const PLOT_X = 60
const PLOT_Y = 40
const PLOT_W = 530
const PLOT_H = 310
const TEAL = "#4A7C6F"
const FONT = "var(--font-mono, monospace)"
const N_POINTS = 50

/* ─── Seeded PRNG (mulberry32) ─── */
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

/* ─── Generate base tilted-ellipse data ─── */
function generateBaseData() {
  const rng = mulberry(88)
  const points = []
  const angle = Math.PI / 6 // 30 degree tilt
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const sigMajor = 1.8
  const sigMinor = 0.5

  for (let i = 0; i < N_POINTS; i++) {
    const a = sigMajor * gaussRng(rng)
    const b = sigMinor * gaussRng(rng)
    const x = cos * a - sin * b
    const y = sin * a + cos * b
    points.push([x, y])
  }
  return points
}

/* ─── Mode transformations ─── */
const MODES = [
  { key: "clean", label: "Clean" },
  { key: "uncentered", label: "Uncentered" },
  { key: "noise", label: "High-variance noise" },
  { key: "drift", label: "Slow drift" },
]

function applyMode(basePoints, mode) {
  switch (mode) {
    case "uncentered":
      return basePoints.map(([x, y]) => [x + 5, y + 3])
    case "noise": {
      const rng = mulberry(123)
      return basePoints.map(([x, y]) => [x + 10 * gaussRng(rng), y])
    }
    case "drift":
      return basePoints.map(([x, y], i) => {
        const t = i / (N_POINTS - 1)
        return [x + 6 * t, y]
      })
    default:
      return basePoints.map(([x, y]) => [x, y])
  }
}

/* ─── PCA via 2x2 covariance eigendecomposition ─── */
function computePCA(points) {
  const n = points.length
  let mx = 0, my = 0
  for (let i = 0; i < n; i++) {
    mx += points[i][0]
    my += points[i][1]
  }
  mx /= n
  my /= n

  let cxx = 0, cxy = 0, cyy = 0
  for (let i = 0; i < n; i++) {
    const dx = points[i][0] - mx
    const dy = points[i][1] - my
    cxx += dx * dx
    cxy += dx * dy
    cyy += dy * dy
  }
  cxx /= n - 1
  cxy /= n - 1
  cyy /= n - 1

  // Eigenvalues of [[cxx, cxy], [cxy, cyy]]
  const trace = cxx + cyy
  const det = cxx * cyy - cxy * cxy
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lam1 = trace / 2 + disc
  const lam2 = trace / 2 - disc

  // Eigenvector for lam1
  let v1x, v1y
  if (Math.abs(cxy) > 1e-12) {
    v1x = lam1 - cyy
    v1y = cxy
  } else if (cxx >= cyy) {
    v1x = 1
    v1y = 0
  } else {
    v1x = 0
    v1y = 1
  }
  const norm1 = Math.sqrt(v1x * v1x + v1y * v1y)
  v1x /= norm1
  v1y /= norm1

  // PC2 is perpendicular
  const v2x = -v1y
  const v2y = v1x

  const totalVar = lam1 + lam2
  const explainedPC1 = totalVar > 0 ? lam1 / totalVar : 0

  return {
    mean: [mx, my],
    pc1: [v1x, v1y],
    pc2: [v2x, v2y],
    lam1,
    lam2,
    explainedPC1,
  }
}

/* ─── Mode description text ─── */
function modeDescription(mode) {
  switch (mode) {
    case "clean":
      return "PC1 follows the major axis of variance."
    case "uncentered":
      return "Without centering, PC1 points toward the shifted mean."
    case "noise":
      return "PC1 rotates to follow the high-variance noise axis."
    case "drift":
      return "PC1 captures the slow drift, not the data structure."
    default:
      return ""
  }
}

/* ─── Component ─── */
export default function PCAFailureModesExplorer() {
  const [activeMode, setActiveMode] = useState("clean")
  const animRef = useRef(null)
  const prevStateRef = useRef(null)

  const basePoints = useMemo(() => generateBaseData(), [])

  const currentPoints = useMemo(
    () => applyMode(basePoints, activeMode),
    [basePoints, activeMode]
  )

  const currentPCA = useMemo(() => computePCA(currentPoints), [currentPoints])

  // For "uncentered" mode, run PCA without centering (on raw data)
  const displayPCA = useMemo(() => {
    if (activeMode === "uncentered") {
      // PCA without centering: treat origin as mean
      const pts = currentPoints
      const n = pts.length
      let cxx = 0, cxy = 0, cyy = 0
      for (let i = 0; i < n; i++) {
        cxx += pts[i][0] * pts[i][0]
        cxy += pts[i][0] * pts[i][1]
        cyy += pts[i][1] * pts[i][1]
      }
      cxx /= n - 1
      cxy /= n - 1
      cyy /= n - 1

      const trace = cxx + cyy
      const det = cxx * cyy - cxy * cxy
      const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
      const lam1 = trace / 2 + disc
      const lam2 = trace / 2 - disc

      let v1x, v1y
      if (Math.abs(cxy) > 1e-12) {
        v1x = lam1 - cyy
        v1y = cxy
      } else if (cxx >= cyy) {
        v1x = 1
        v1y = 0
      } else {
        v1x = 0
        v1y = 1
      }
      const norm1 = Math.sqrt(v1x * v1x + v1y * v1y)
      v1x /= norm1
      v1y /= norm1

      const v2x = -v1y
      const v2y = v1x

      const totalVar = lam1 + lam2
      const explainedPC1 = totalVar > 0 ? lam1 / totalVar : 0

      // Mean of data (for line center)
      let mx = 0, my = 0
      for (let i = 0; i < n; i++) {
        mx += pts[i][0]
        my += pts[i][1]
      }
      mx /= n
      my /= n

      return {
        mean: [mx, my],
        pc1: [v1x, v1y],
        pc2: [v2x, v2y],
        lam1,
        lam2,
        explainedPC1,
      }
    }
    return currentPCA
  }, [activeMode, currentPoints, currentPCA])

  // Animation state for point positions and PCA directions
  const [displayPoints, setDisplayPoints] = useState(currentPoints)
  const [displayPC1, setDisplayPC1] = useState(displayPCA.pc1)
  const [displayPC2, setDisplayPC2] = useState(displayPCA.pc2)
  const [displayMean, setDisplayMean] = useState(displayPCA.mean)
  const [displayExplained, setDisplayExplained] = useState(displayPCA.explainedPC1)

  const switchMode = useCallback((newMode) => {
    if (newMode === activeMode) return

    // Capture current displayed state as animation start
    prevStateRef.current = {
      points: displayPoints.map(([x, y]) => [x, y]),
      pc1: [...displayPC1],
      pc2: [...displayPC2],
      mean: [...displayMean],
      explained: displayExplained,
    }

    setActiveMode(newMode)
  }, [activeMode, displayPoints, displayPC1, displayPC2, displayMean, displayExplained])

  // Animate on mode change
  useEffect(() => {
    if (!prevStateRef.current) {
      // First render, no animation
      setDisplayPoints(currentPoints)
      setDisplayPC1(displayPCA.pc1)
      setDisplayPC2(displayPCA.pc2)
      setDisplayMean(displayPCA.mean)
      setDisplayExplained(displayPCA.explainedPC1)
      return
    }

    const prev = prevStateRef.current
    const duration = 400
    let startTime = null

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3)
    }

    function lerp(a, b, t) {
      return a + (b - a) * t
    }

    // Angle interpolation for PC directions
    function lerpAngle(fromVec, toVec, t) {
      const fromAngle = Math.atan2(fromVec[1], fromVec[0])
      let toAngle = Math.atan2(toVec[1], toVec[0])
      // Shortest angular path
      let diff = toAngle - fromAngle
      while (diff > Math.PI) diff -= 2 * Math.PI
      while (diff < -Math.PI) diff += 2 * Math.PI
      const a = fromAngle + diff * t
      return [Math.cos(a), Math.sin(a)]
    }

    function step(ts) {
      if (!startTime) startTime = ts
      const elapsed = ts - startTime
      const rawT = Math.min(elapsed / duration, 1)
      const t = easeOut(rawT)

      // Interpolate points
      const interpolated = prev.points.map(([px, py], i) => [
        lerp(px, currentPoints[i][0], t),
        lerp(py, currentPoints[i][1], t),
      ])
      setDisplayPoints(interpolated)

      // Interpolate PC directions
      setDisplayPC1(lerpAngle(prev.pc1, displayPCA.pc1, t))
      setDisplayPC2(lerpAngle(prev.pc2, displayPCA.pc2, t))

      // Interpolate mean
      setDisplayMean([
        lerp(prev.mean[0], displayPCA.mean[0], t),
        lerp(prev.mean[1], displayPCA.mean[1], t),
      ])

      // Interpolate explained variance
      setDisplayExplained(lerp(prev.explained, displayPCA.explainedPC1, t))

      if (rawT < 1) {
        animRef.current = requestAnimationFrame(step)
      } else {
        prevStateRef.current = null
      }
    }

    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(step)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [currentPoints, displayPCA])

  // Compute display range to fit all points across all modes
  const displayRange = useMemo(() => {
    // Gather extents for all modes
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (const mode of MODES) {
      const pts = applyMode(basePoints, mode.key)
      for (const [x, y] of pts) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    const pad = 1.5
    minX -= pad
    maxX += pad
    minY -= pad
    maxY += pad

    // Make aspect ratio match plot area
    const rangeX = maxX - minX
    const rangeY = maxY - minY
    const aspectPlot = PLOT_W / PLOT_H
    const aspectData = rangeX / rangeY

    if (aspectData > aspectPlot) {
      // Data is wider: expand Y
      const newRangeY = rangeX / aspectPlot
      const centerY = (minY + maxY) / 2
      minY = centerY - newRangeY / 2
      maxY = centerY + newRangeY / 2
    } else {
      // Data is taller: expand X
      const newRangeX = rangeY * aspectPlot
      const centerX = (minX + maxX) / 2
      minX = centerX - newRangeX / 2
      maxX = centerX + newRangeX / 2
    }

    return { minX, maxX, minY, maxY }
  }, [basePoints])

  // Scale functions
  const sx = useCallback(
    (v) => PLOT_X + ((v - displayRange.minX) / (displayRange.maxX - displayRange.minX)) * PLOT_W,
    [displayRange]
  )
  const sy = useCallback(
    (v) => PLOT_Y + PLOT_H - ((v - displayRange.minY) / (displayRange.maxY - displayRange.minY)) * PLOT_H,
    [displayRange]
  )

  // PC lines: draw through the mean, extending across the plot
  const pcLineLen = Math.max(
    displayRange.maxX - displayRange.minX,
    displayRange.maxY - displayRange.minY
  ) * 0.8

  const pc1Start = [
    displayMean[0] - displayPC1[0] * pcLineLen,
    displayMean[1] - displayPC1[1] * pcLineLen,
  ]
  const pc1End = [
    displayMean[0] + displayPC1[0] * pcLineLen,
    displayMean[1] + displayPC1[1] * pcLineLen,
  ]
  const pc2Start = [
    displayMean[0] - displayPC2[0] * pcLineLen,
    displayMean[1] - displayPC2[1] * pcLineLen,
  ]
  const pc2End = [
    displayMean[0] + displayPC2[0] * pcLineLen,
    displayMean[1] + displayPC2[1] * pcLineLen,
  ]

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {/* Clip the plot area */}
        <defs>
          <clipPath id="pca-failure-plot-clip">
            <rect x={PLOT_X} y={PLOT_Y} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {/* Mode label */}
        <text
          x={PLOT_X + PLOT_W / 2}
          y={24}
          textAnchor="middle"
          fontSize="12"
          fontFamily={FONT}
          fill="#666"
        >
          {modeDescription(activeMode)}
        </text>

        {/* Plot background */}
        <rect
          x={PLOT_X}
          y={PLOT_Y}
          width={PLOT_W}
          height={PLOT_H}
          fill="#fafaf8"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={1}
          rx={3}
        />

        {/* Axis lines through origin */}
        <g clipPath="url(#pca-failure-plot-clip)">
          <line
            x1={sx(displayRange.minX)}
            y1={sy(0)}
            x2={sx(displayRange.maxX)}
            y2={sy(0)}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={0.5}
          />
          <line
            x1={sx(0)}
            y1={sy(displayRange.minY)}
            x2={sx(0)}
            y2={sy(displayRange.maxY)}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={0.5}
          />

          {/* PC2 line (behind PC1) */}
          <line
            x1={sx(pc2Start[0])}
            y1={sy(pc2Start[1])}
            x2={sx(pc2End[0])}
            y2={sy(pc2End[1])}
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={1.5}
            strokeDasharray="5,4"
          />

          {/* PC1 line */}
          <line
            x1={sx(pc1Start[0])}
            y1={sy(pc1Start[1])}
            x2={sx(pc1End[0])}
            y2={sy(pc1End[1])}
            stroke={TEAL}
            strokeWidth={2.5}
          />

          {/* Data points */}
          {displayPoints.map(([x, y], i) => (
            <circle
              key={i}
              cx={sx(x)}
              cy={sy(y)}
              r={3.5}
              fill="rgba(0,0,0,0.2)"
            />
          ))}

          {/* Mean marker */}
          <circle
            cx={sx(displayMean[0])}
            cy={sy(displayMean[1])}
            r={4}
            fill="none"
            stroke={TEAL}
            strokeWidth={1.5}
          />
        </g>

        {/* PC1 label */}
        <text
          x={sx(pc1End[0]) > PLOT_X + PLOT_W - 40
            ? Math.min(sx(pc1End[0]), PLOT_X + PLOT_W - 4) - 4
            : Math.max(sx(pc1End[0]), PLOT_X + 4) + 4
          }
          y={Math.max(PLOT_Y + 14, Math.min(sy(pc1End[1]) - 6, PLOT_Y + PLOT_H - 4))}
          textAnchor={sx(pc1End[0]) > PLOT_X + PLOT_W - 40 ? "end" : "start"}
          fontSize="11"
          fontFamily={FONT}
          fill={TEAL}
          fontWeight="600"
        >
          PC1
        </text>

        {/* PC2 label */}
        <text
          x={sx(pc2End[0]) > PLOT_X + PLOT_W - 40
            ? Math.min(sx(pc2End[0]), PLOT_X + PLOT_W - 4) - 4
            : Math.max(sx(pc2End[0]), PLOT_X + 4) + 4
          }
          y={Math.max(PLOT_Y + 14, Math.min(sy(pc2End[1]) - 6, PLOT_Y + PLOT_H - 4))}
          textAnchor={sx(pc2End[0]) > PLOT_X + PLOT_W - 40 ? "end" : "start"}
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.3)"
        >
          PC2
        </text>

        {/* Explained variance readout */}
        <text
          x={PLOT_X + PLOT_W - 8}
          y={PLOT_Y + 20}
          textAnchor="end"
          fontSize="12"
          fontFamily={FONT}
          fill={TEAL}
          fontWeight="600"
        >
          PC1 explains {(displayExplained * 100).toFixed(1)}%
        </text>

        {/* Axis labels */}
        <text
          x={PLOT_X + PLOT_W / 2}
          y={PLOT_Y + PLOT_H + 24}
          textAnchor="middle"
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.35)"
        >
          neuron 1
        </text>
        <text
          x={PLOT_X - 10}
          y={PLOT_Y + PLOT_H / 2}
          textAnchor="middle"
          fontSize="10"
          fontFamily={FONT}
          fill="rgba(0,0,0,0.35)"
          transform={`rotate(-90, ${PLOT_X - 10}, ${PLOT_Y + PLOT_H / 2})`}
        >
          neuron 2
        </text>
      </svg>

      {/* Toggle buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0.5rem",
          marginTop: "0.3rem",
          flexWrap: "wrap",
        }}
      >
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            className="blog-figure__button"
            style={
              activeMode === key
                ? { borderColor: TEAL, color: TEAL, fontWeight: 600 }
                : {}
            }
            onClick={() => switchMode(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
