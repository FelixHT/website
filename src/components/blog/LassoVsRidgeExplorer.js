import React, { useState, useMemo } from "react"

/* ─── Layout ─── */
const W = 500
const H = 500
const PAD = 48

// Data range
const W1_MIN = -3
const W1_MAX = 4
const W2_MIN = -3
const W2_MAX = 4

/* ─── Colors ─── */
const TEAL = "#4A7C6F"
const BLUE = "#3d6cb9"
const RED = "#c0503a"
const FONT = "var(--font-mono, monospace)"

/* ─── Coordinate transforms ─── */
function toSVG(w1, w2) {
  const x = PAD + ((w1 - W1_MIN) / (W1_MAX - W1_MIN)) * (W - 2 * PAD)
  const y = H - PAD - ((w2 - W2_MIN) / (W2_MAX - W2_MIN)) * (H - 2 * PAD)
  return [x, y]
}

/* ─── Cost function ─── */
// f(w1, w2) = (w1 - 2.5)² + 3(w2 - 0.8)² + 2(w1-2.5)(w2-0.8)
function cost(w1, w2) {
  const a = w1 - 2.5
  const b = w2 - 0.8
  return a * a + 3 * b * b + 2 * a * b
}

// Unconstrained minimum
const MIN_W1 = 2.5
const MIN_W2 = 0.8

/* ─── Contour generation ─── */
// Marching squares to generate a single iso-contour at level c
function marchingSquaresContour(level, gridN = 120) {
  const w1Step = (W1_MAX - W1_MIN) / gridN
  const w2Step = (W2_MAX - W2_MIN) / gridN

  // Sample grid
  const grid = []
  for (let j = 0; j <= gridN; j++) {
    grid[j] = []
    for (let i = 0; i <= gridN; i++) {
      const w1 = W1_MIN + i * w1Step
      const w2 = W2_MIN + j * w2Step
      grid[j][i] = cost(w1, w2) - level
    }
  }

  const segments = []

  function lerp(a, b, va, vb) {
    if (Math.abs(vb - va) < 1e-10) return a
    return a + (0 - va) / (vb - va) * (b - a)
  }

  for (let j = 0; j < gridN; j++) {
    for (let i = 0; i < gridN; i++) {
      const v00 = grid[j][i]
      const v10 = grid[j][i + 1]
      const v01 = grid[j + 1][i]
      const v11 = grid[j + 1][i + 1]

      const idx =
        (v00 > 0 ? 1 : 0) |
        (v10 > 0 ? 2 : 0) |
        (v11 > 0 ? 4 : 0) |
        (v01 > 0 ? 8 : 0)

      if (idx === 0 || idx === 15) continue

      // Cell corners in data coords
      const x0 = W1_MIN + i * w1Step
      const x1 = W1_MIN + (i + 1) * w1Step
      const y0 = W2_MIN + j * w2Step
      const y1 = W2_MIN + (j + 1) * w2Step

      // Edge midpoints in data coords
      const eBottom = [lerp(x0, x1, v00, v10), y0] // bottom edge (j)
      const eRight  = [x1, lerp(y0, y1, v10, v11)] // right edge (i+1)
      const eTop    = [lerp(x0, x1, v01, v11), y1] // top edge (j+1)
      const eLeft   = [x0, lerp(y0, y1, v00, v01)] // left edge (i)

      // Lookup table: which edges to connect
      const table = {
        1:  [eBottom, eLeft],
        2:  [eBottom, eRight],
        3:  [eLeft, eRight],
        4:  [eRight, eTop],
        5:  [eBottom, eRight, eLeft, eTop],
        6:  [eBottom, eTop],
        7:  [eLeft, eTop],
        8:  [eLeft, eTop],
        9:  [eBottom, eTop],
        10: [eBottom, eLeft, eRight, eTop],
        11: [eRight, eTop],
        12: [eLeft, eRight],
        13: [eBottom, eRight],
        14: [eBottom, eLeft],
      }

      const edges = table[idx]
      if (!edges) continue

      for (let k = 0; k < edges.length; k += 2) {
        const p1 = edges[k]
        const p2 = edges[k + 1]
        if (p1 && p2) segments.push([p1, p2])
      }
    }
  }

  return segments
}

/* ─── Constraint boundary sampling ─── */
function sampleConstraintBoundary(norm, radius, nPoints = 400) {
  const pts = []
  for (let i = 0; i < nPoints; i++) {
    const t = (i / nPoints) * 2 * Math.PI
    if (norm === "L2") {
      pts.push([radius * Math.cos(t), radius * Math.sin(t)])
    } else {
      // L1: diamond corners at (r,0),(0,r),(-r,0),(0,-r)
      // Parameterize by angle, map to diamond
      const cos = Math.cos(t)
      const sin = Math.sin(t)
      const scale = Math.abs(cos) + Math.abs(sin)
      pts.push([radius * cos / scale, radius * sin / scale])
    }
  }
  return pts
}

/* ─── Diamond path ─── */
function diamondPath(radius) {
  const corners = [
    [radius, 0],
    [0, radius],
    [-radius, 0],
    [0, -radius],
  ]
  return corners
    .map((pt, i) => {
      const [sx, sy] = toSVG(pt[0], pt[1])
      return `${i === 0 ? "M" : "L"} ${sx} ${sy}`
    })
    .join(" ") + " Z"
}

/* ─── Integer grid lines ─── */
function gridLines() {
  const lines = []
  for (let v = Math.ceil(W1_MIN); v <= Math.floor(W1_MAX); v++) {
    const [x] = toSVG(v, 0)
    lines.push(<line key={`vg${v}`} x1={x} y1={PAD} x2={x} y2={H - PAD} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />)
  }
  for (let v = Math.ceil(W2_MIN); v <= Math.floor(W2_MAX); v++) {
    const [, y] = toSVG(0, v)
    lines.push(<line key={`hg${v}`} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />)
  }
  return lines
}

/* ─── Main component ─── */
export default function LassoVsRidgeExplorer() {
  const [norm, setNorm] = useState("L2")
  const [radius, setRadius] = useState(1.5)

  const accentColor = norm === "L2" ? BLUE : TEAL
  const fillColor   = norm === "L2" ? "rgba(61,108,185,0.08)" : "rgba(74,124,111,0.08)"

  // Contour levels
  const contourLevels = useMemo(() => {
    // Levels from near zero to something beyond the constraint region
    const levels = [0.15, 0.4, 0.8, 1.4, 2.2, 3.2, 4.5, 6.5]
    return levels
  }, [])

  // Contour segments
  const contourSegments = useMemo(() => {
    return contourLevels.map(level => marchingSquaresContour(level))
  }, [contourLevels])

  // Constrained optimum
  const tangentPoint = useMemo(() => {
    const pts = sampleConstraintBoundary(norm, radius, 600)
    let best = pts[0]
    let bestCost = Infinity
    for (const pt of pts) {
      const c = cost(pt[0], pt[1])
      if (c < bestCost) {
        bestCost = c
        best = pt
      }
    }
    return best
  }, [norm, radius])

  // SVG coordinate transforms
  const [minX, minY] = toSVG(MIN_W1, MIN_W2)
  const [tanX, tanY] = toSVG(tangentPoint[0], tangentPoint[1])
  const [origX, origY] = toSVG(0, 0)

  // Axis tick marks
  const w1Ticks = []
  for (let v = Math.ceil(W1_MIN); v <= Math.floor(W1_MAX); v++) {
    if (v === 0) continue
    const [x] = toSVG(v, 0)
    w1Ticks.push(
      <g key={`w1t${v}`}>
        <line x1={x} y1={origY - 3} x2={x} y2={origY + 3} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
        <text x={x} y={origY + 14} textAnchor="middle" fontSize={9} fill="rgba(0,0,0,0.4)" fontFamily={FONT}>
          {v}
        </text>
      </g>
    )
  }
  const w2Ticks = []
  for (let v = Math.ceil(W2_MIN); v <= Math.floor(W2_MAX); v++) {
    if (v === 0) continue
    const [, y] = toSVG(0, v)
    w2Ticks.push(
      <g key={`w2t${v}`}>
        <line x1={origX - 3} y1={y} x2={origX + 3} y2={y} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
        <text x={origX - 7} y={y + 3} textAnchor="end" fontSize={9} fill="rgba(0,0,0,0.4)" fontFamily={FONT}>
          {v}
        </text>
      </g>
    )
  }

  // Format coordinate label
  const fmt = v => (Math.abs(v) < 0.02 ? "0" : v.toFixed(2).replace(/\.?0+$/, ""))
  const labelText = `(${fmt(tangentPoint[0])}, ${fmt(tangentPoint[1])})`

  // Position label so it doesn't fall off the edge
  const labelOffsetX = tanX > W / 2 ? -8 : 8
  const labelAnchor  = tanX > W / 2 ? "end" : "start"
  const labelOffsetY = tanY < H / 2 ? 16 : -10

  return (
    <div>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", maxWidth: "100%", height: "auto", fontFamily: FONT }}
      >
        {/* Clip path */}
        <defs>
          <clipPath id="plot-area">
            <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
          </clipPath>
        </defs>

        {/* Background */}
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="white" />

        {/* Grid lines */}
        <g clipPath="url(#plot-area)">{gridLines()}</g>

        {/* Constraint region */}
        <g clipPath="url(#plot-area)">
          {norm === "L2" ? (
            <>
              <circle
                cx={origX}
                cy={origY}
                r={radius * (W - 2 * PAD) / (W1_MAX - W1_MIN)}
                fill={fillColor}
                stroke={accentColor}
                strokeWidth={1.5}
              />
            </>
          ) : (
            <path
              d={diamondPath(radius)}
              fill={fillColor}
              stroke={accentColor}
              strokeWidth={1.5}
            />
          )}
        </g>

        {/* Contour lines */}
        <g clipPath="url(#plot-area)">
          {contourSegments.map((segs, li) =>
            segs.map((seg, si) => {
              const [p1, p2] = seg
              const [x1, y1] = toSVG(p1[0], p1[1])
              const [x2, y2] = toSVG(p2[0], p2[1])
              return (
                <line
                  key={`c${li}-${si}`}
                  x1={x1} y1={y1}
                  x2={x2} y2={y2}
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1}
                />
              )
            })
          )}
        </g>

        {/* Axes */}
        <g>
          {/* x-axis */}
          <line x1={PAD} y1={origY} x2={W - PAD} y2={origY} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
          {/* y-axis */}
          <line x1={origX} y1={PAD} x2={origX} y2={H - PAD} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
          {/* Ticks */}
          {w1Ticks}
          {w2Ticks}
          {/* Axis labels */}
          <text
            x={W - PAD + 4}
            y={origY + 4}
            fontSize={13}
            fill="rgba(0,0,0,0.6)"
            fontFamily={FONT}
            fontStyle="italic"
          >
            w₁
          </text>
          <text
            x={origX + 5}
            y={PAD - 6}
            fontSize={13}
            fill="rgba(0,0,0,0.6)"
            fontFamily={FONT}
            fontStyle="italic"
          >
            w₂
          </text>
        </g>

        {/* Unconstrained minimum ×  */}
        <g clipPath="url(#plot-area)">
          <line x1={minX - 6} y1={minY - 6} x2={minX + 6} y2={minY + 6} stroke={RED} strokeWidth={2} />
          <line x1={minX + 6} y1={minY - 6} x2={minX - 6} y2={minY + 6} stroke={RED} strokeWidth={2} />
          <text
            x={minX + 9}
            y={minY - 6}
            fontSize={9}
            fill={RED}
            fontFamily={FONT}
          >
            ({fmt(MIN_W1)}, {fmt(MIN_W2)})
          </text>
        </g>

        {/* Constrained optimum dot + label */}
        <g clipPath="url(#plot-area)">
          {/* Line from origin to tangent point — subtle guide */}
          <circle cx={tanX} cy={tanY} r={5} fill="#000" />
          <text
            x={tanX + labelOffsetX}
            y={tanY + labelOffsetY}
            fontSize={10}
            fill="#000"
            fontFamily={FONT}
            textAnchor={labelAnchor}
          >
            {labelText}
          </text>
        </g>

        {/* Border */}
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      </svg>

      {/* Controls */}
      <div className="blog-figure__controls" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        {/* Norm toggle */}
        <div style={{ display: "flex", gap: 6 }}>
          {["L2", "L1"].map(n => (
            <button
              key={n}
              onClick={() => setNorm(n)}
              style={{
                fontFamily: FONT,
                fontSize: 13,
                padding: "4px 14px",
                borderRadius: 4,
                border: `1.5px solid ${n === "L2" ? BLUE : TEAL}`,
                background: norm === n ? (n === "L2" ? BLUE : TEAL) : "transparent",
                color: norm === n ? "#fff" : n === "L2" ? BLUE : TEAL,
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {n === "L2" ? "L₂ (ridge)" : "L₁ (lasso)"}
            </button>
          ))}
        </div>

        {/* Radius slider */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
          <span>constraint radius t = {radius.toFixed(1)}</span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.05}
            value={radius}
            onChange={e => setRadius(parseFloat(e.target.value))}
            style={{ width: 120, accentColor }}
          />
        </label>
      </div>
    </div>
  )
}
