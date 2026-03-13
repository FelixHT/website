import React, { useState, useRef, useEffect, useMemo } from "react"
import { scaleLinear, scaleSqrt } from "d3-scale"
import { COLORS, BREAKPOINTS, TOOLTIP_STYLE } from "./figureConstants"

const W = 1100
const H = 530
const MARGIN = { top: 20, right: 30, bottom: 40, left: 50 }
const LANE_YS = [100, 250, 400]
const AXIS_Y = 480

const LANES = [
  "What does M1 encode?",
  "Multi-variable responses / mixed selectivity",
  "Theoretical critique",
]

const PAPERS = [
  // Lane 0: encoding debate
  { id: "evarts1968", year: 1968, lane: 0, color: COLORS.encoding, cites: 2200,
    shortDesc: "Force correlations", citation: "Evarts 1968",
    desc: "Discharge of pyramidal neurons related to force, not displacement.", journal: "J Neurophysiol" },
  { id: "georgo1986", year: 1986, lane: 0, color: COLORS.encoding, cites: 4000,
    shortDesc: "Direction encoding", citation: "Georgopoulos 1986",
    desc: "Population vector: summed preferred directions decode movement.", journal: "Science" },
  { id: "scottkalaska1997", year: 1997, lane: 0, color: COLORS.dynamics, cites: 300,
    shortDesc: "Posture changes tuning", citation: "Scott & Kalaska 1997",
    desc: "Arm posture alters directional tuning \u2014 same question, reframed.", journal: "J Neurophysiol" },
  { id: "churchland2012", year: 2012, lane: 0, color: COLORS.dynamics, cites: 1500,
    shortDesc: "Rotational dynamics", citation: "Churchland 2012",
    desc: "Rotational population dynamics during reaching; M1 as dynamical system.", journal: "Nature" },
  { id: "kalidindi2021", year: 2021, lane: 0, color: COLORS.challenge, cites: 100,
    shortDesc: "Feedback produces rotations", citation: "Kalidindi 2021",
    desc: "Rotational dynamics consistent with feedback, not recurrence.", journal: "eLife" },

  // Lane 1: mixed selectivity
  { id: "ashe1994", year: 1994, lane: 1, color: COLORS.encoding, cites: 200,
    shortDesc: "Multi-variable neurons", citation: "Ashe & Georgopoulos 1994",
    desc: "Motor cortex neurons respond to multiple movement variables simultaneously.", journal: "Exp Brain Res" },
  { id: "miller2002", year: 2002, lane: 1, color: COLORS.dynamics, cites: 2000,
    shortDesc: "Adaptive coding in PFC", citation: "Miller & Duncan 2002",
    desc: "PFC neurons adaptively code multiple task-relevant variables.", journal: "Annu Rev Neurosci" },
  { id: "rigotti2013", year: 2013, lane: 1, color: COLORS.encoding, cites: 1000,
    shortDesc: "Mixed selectivity formalized", citation: "Rigotti et al. 2013",
    desc: "Mixed selectivity is computationally essential.", journal: "Nature" },
  { id: "tye2024", year: 2024, lane: 1, color: COLORS.encoding, cites: 50,
    shortDesc: "Cellular mechanisms", citation: "Tye et al. 2024",
    desc: "Cellular and circuit mechanisms underlying mixed selectivity.", journal: "Neuron" },

  // Lane 2: theoretical critique
  { id: "todorov2000", year: 2000, lane: 2, color: COLORS.challenge, cites: 400,
    shortDesc: "Pop. vector is an artifact", citation: "Todorov 2000",
    desc: "Direction tuning guaranteed by biomechanics, not neural coding.", journal: "Nature Neurosci" },
  { id: "scott2004", year: 2004, lane: 2, color: COLORS.dynamics, cites: 400,
    shortDesc: "Optimal feedback control", citation: "Jordan 2002; Scott 2004",
    desc: "Optimal feedback control and the long-latency stretch response.", journal: "Exp Brain Res" },
  { id: "encoding2020", year: 2020, lane: 2, color: COLORS.challenge, cites: 80,
    shortDesc: "Field still debates encoding", citation: "2010s\u20132020s",
    desc: "Despite decades of critique, the encoding framework persists in motor neuroscience." },
]

const ARCS = [
  { from: "scottkalaska1997", to: "churchland2012", label: "Same debate, new labels" },
  { from: "ashe1994", to: "rigotti2013", label: "Siloed parallel work, 20 years" },
  { from: "scott2004", to: "encoding2020", label: "Ignored for 20 years" },
]

const MotorCortexTimeline = () => {
  const containerRef = useRef(null)
  const [breakpoint, setBreakpoint] = useState("wide")
  const [hovered, setHovered] = useState(null)
  const [locked, setLocked] = useState(null)

  const focused = locked || hovered

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width ?? 1100
      setBreakpoint(w >= BREAKPOINTS.wide ? "wide" : w >= BREAKPOINTS.medium ? "medium" : "narrow")
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setLocked(null) }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  const xScale = useMemo(() =>
    scaleLinear().domain([1965, 2027]).range([MARGIN.left, W - MARGIN.right])
  , [])

  const rScale = useMemo(() =>
    scaleSqrt()
      .domain([0, Math.max(...PAPERS.map(p => p.cites))])
      .range([6, 16])
  , [])

  const papers = useMemo(() =>
    PAPERS.map(p => ({ ...p, x: xScale(p.year), y: LANE_YS[p.lane], r: rScale(p.cites) }))
  , [xScale, rScale])

  // Resolve label overlaps per lane
  const labelAdj = useMemo(() => {
    const adj = {}
    for (let lane = 0; lane < LANES.length; lane++) {
      const lp = papers.filter(p => p.lane === lane).sort((a, b) => a.x - b.x)
      for (let i = 1; i < lp.length; i++) {
        const prev = lp[i - 1], curr = lp[i]
        const prevHW = Math.max(prev.shortDesc.length, prev.citation.length) * 3.3
        const currHW = Math.max(curr.shortDesc.length, curr.citation.length) * 3.3
        const gap = curr.x - prev.x
        const needed = prevHW + currHW
        if (gap < needed) {
          const deficit = needed - gap
          const currRightEdge = curr.x + currHW * 2
          if (deficit > 40 && currRightEdge <= W - 10) {
            // Severe overlap: split text anchors apart
            if (!adj[prev.id]) adj[prev.id] = { anchor: "end" }
            adj[curr.id] = { anchor: "start" }
          } else {
            // Moderate overlap: nudge down
            const prevNudge = adj[prev.id]?.nudgeY || 0
            adj[curr.id] = { anchor: "middle", nudgeY: prevNudge + 16 }
          }
        }
      }
    }
    return adj
  }, [papers])

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
        role="img" aria-label="Three recurring debates in motor cortex research, 1968–2024">

        <rect x={0} y={0} width={W} height={H} fill="transparent"
          onClick={() => setLocked(null)} />

        {/* Lane labels and lines */}
        {LANES.map((label, i) => (
          <g key={i}>
            <text x={MARGIN.left} y={LANE_YS[i] - 30}
              style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700,
                fill: "rgba(0,0,0,0.65)" }}>
              {label}
            </text>
            <line x1={MARGIN.left} y1={LANE_YS[i]} x2={W - MARGIN.right} y2={LANE_YS[i]}
              stroke="#e0dfdb" strokeWidth={1.5} />
          </g>
        ))}

        {/* Year axis ticks */}
        {[1970, 1980, 1990, 2000, 2010, 2020].map(yr => (
          <g key={yr}>
            <line x1={xScale(yr)} y1={AXIS_Y} x2={xScale(yr)} y2={AXIS_Y + 8} stroke="#bbb" />
            <text x={xScale(yr)} y={AXIS_Y + 22} textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#999" }}>
              {yr}
            </text>
          </g>
        ))}

        {/* Arcs connecting recycled debates */}
        {ARCS.map((arc, i) => {
          const from = papers.find(p => p.id === arc.from)
          const to = papers.find(p => p.id === arc.to)
          if (!from || !to) return null
          const x1 = from.x, x2 = to.x
          const y1 = from.y - from.r, y2 = to.y - to.r
          const midX = (x1 + x2) / 2
          const topY = Math.min(y1, y2) - 50

          return (
            <g key={i}>
              <path
                d={`M${x1},${y1} Q${midX},${topY} ${x2},${y2}`}
                fill="none" stroke={COLORS.challenge} strokeOpacity={0.55}
                strokeWidth={1.5} strokeDasharray="6 4" />
              <text x={midX} y={topY - 4} textAnchor="middle"
                style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontStyle: "italic",
                  fontWeight: 600, fill: COLORS.challenge, opacity: 0.75 }}>
                {arc.label}
              </text>
            </g>
          )
        })}

        {/* Paper nodes with labels */}
        {papers.map(p => {
          const isActive = focused === p.id
          const isFaded = focused && !isActive
          const la = labelAdj[p.id] || {}
          const anchor = la.anchor || "middle"
          const nudgeY = la.nudgeY || 0

          return (
            <g key={p.id}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setLocked(prev => prev === p.id ? null : p.id)}
              style={{ cursor: "pointer" }}
              role="button" tabIndex={0}
              aria-label={p.citation}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setLocked(prev => prev === p.id ? null : p.id)
                }
              }}
            >
              <circle cx={p.x} cy={p.y} r={p.r}
                fill={p.color} fillOpacity={isFaded ? 0.15 : 0.85}
                stroke={isActive ? p.color : "none"} strokeWidth={isActive ? 2.5 : 0}
                style={{ transition: "fill-opacity 200ms ease" }} />
              {breakpoint !== "narrow" && (
                <>
                  <text x={p.x} y={p.y + p.r + 18 + nudgeY} textAnchor={anchor}
                    style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
                      fill: `rgba(42,42,42,${isFaded ? 0.15 : 0.72})`,
                      transition: "fill 200ms ease" }}>
                    {p.shortDesc}
                  </text>
                  <text x={p.x} y={p.y + p.r + 32 + nudgeY} textAnchor={anchor}
                    style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 400,
                      fontStyle: "italic",
                      fill: `rgba(42,42,42,${isFaded ? 0.1 : 0.42})`,
                      transition: "fill 200ms ease" }}>
                    {p.citation}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {focused && (() => {
        const paper = papers.find(p => p.id === focused)
        if (!paper) return null
        const xPct = (paper.x / W) * 100
        const yPct = (paper.y / H) * 100
        const flipLeft = paper.x / W > 0.6

        return (
          <div style={{
            ...TOOLTIP_STYLE,
            left: flipLeft ? "auto" : `calc(${xPct}% + 14px)`,
            right: flipLeft ? `calc(${100 - xPct}% + 14px)` : "auto",
            top: `calc(${yPct}% - 10px)`,
          }}>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, color: "rgba(0,0,0,0.9)", marginBottom: 2 }}>
              {paper.citation}
            </div>
            {paper.journal && (
              <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "rgba(0,0,0,0.6)", marginBottom: 4 }}>
                {paper.journal}
              </div>
            )}
            <div style={{ fontFamily: "var(--font-serif)", color: "rgba(0,0,0,0.75)" }}>
              {paper.desc}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default MotorCortexTimeline
