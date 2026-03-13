import React, { useState, useRef, useEffect, useMemo } from "react"
import { scaleLinear, scaleSqrt } from "d3-scale"
import { COLORS, BREAKPOINTS, TOOLTIP_STYLE, BTN_BASE, btnActive } from "./figureConstants"

const PAPERS = [
  // Above axis — supporting / extending
  { id:"evarts1968", label:"Evarts 1968", cites:2200, group:"encoding", year:1968, side:"above",
    desc:"Discharge of pyramidal neurons related to force, not displacement.", journal:"J Neurophysiol" },
  { id:"georgo1982", label:"Georgopoulos 1982", cites:1200, group:"encoding", year:1982, side:"above",
    desc:"M1 neurons have preferred directions for arm movement.", journal:"J Neurosci" },
  { id:"georgo1986", label:"Georgopoulos 1986", cites:4000, group:"encoding", year:1986, side:"above",
    desc:"Population vector: summed preferred directions decode movement.", journal:"Science" },
  { id:"georgo1988", label:"Georgopoulos 1988", cites:800, group:"encoding", year:1988, side:"above",
    desc:"Neuronal population coding of movement direction.", journal:"Science" },
  { id:"kalaska1989", label:"Kalaska 1989", cites:600, group:"encoding", year:1989, side:"above",
    desc:"Load and direction effects in M1, documenting multi-variable responses.", journal:"J Neurosci" },
  { id:"schwartz1994", label:"Schwartz 1994", cites:500, group:"kinematics", year:1994, side:"above",
    desc:"Motor cortex encodes hand velocity (kinematics).", journal:"J Neurophysiol" },
  { id:"moran1999", label:"Moran & Schwartz 1999", cites:700, group:"kinematics", year:1999, side:"above",
    desc:"Motor cortical activity during drawing movements.", journal:"J Neurophysiol" },
  { id:"taylor2002", label:"Taylor 2002", cites:1100, group:"bci", year:2002, side:"above",
    desc:"Direct cortical control of 3D neuroprosthetic devices.", journal:"Science" },
  { id:"churchland2012", label:"Churchland 2012", cites:1500, group:"dynamics", year:2012, side:"above",
    desc:"Rotational population dynamics during reaching; M1 as dynamical system.", journal:"Nature" },
  { id:"hochberg2012", label:"Hochberg 2012", cites:1600, group:"bci", year:2012, side:"above",
    desc:"BrainGate: human reaches and grasps via neural interface.", journal:"Nature" },
  { id:"rigotti2013", label:"Rigotti 2013", cites:1000, group:"encoding", year:2013, side:"above",
    desc:"Mixed selectivity is computationally essential (PFC).", journal:"Nature" },
  { id:"sussillo2015", label:"Sussillo 2015", cites:600, group:"dynamics", year:2015, side:"above",
    desc:"RNN model of M1 reproduces rotational dynamics.", journal:"Nature Neurosci" },
  { id:"gallego2017", label:"Gallego 2017", cites:350, group:"dynamics", year:2017, side:"above",
    desc:"Neural manifolds for the control of movement.", journal:"Neuron" },
  { id:"russo2018", label:"Russo 2018", cites:300, group:"dynamics", year:2018, side:"above",
    desc:"Condition-invariant dynamics in motor cortex.", journal:"Neuron" },
  { id:"pandarinath2018", label:"Pandarinath 2018", cites:800, group:"dynamics", year:2018, side:"above",
    desc:"LFADS: inferring dynamics from single-trial neural data.", journal:"Nature Methods" },
  { id:"gallego2020", label:"Gallego 2020", cites:400, group:"dynamics", year:2020, side:"above",
    desc:"Stable low-dimensional neural manifolds across days and tasks.", journal:"Nature Neurosci" },
  { id:"willett2021", label:"Willett 2021", cites:500, group:"bci", year:2021, side:"above",
    desc:"Handwriting BCI: dynamics-aware decoding.", journal:"Nature" },
  { id:"keshtkaran2022", label:"Keshtkaran 2022", cites:150, group:"bci", year:2022, side:"above",
    desc:"LFADS-based decoders for stable long-term BCI.", journal:"Nature Biomed Eng" },
  // Below axis — challenges and critiques
  { id:"li1997", label:"Li & Padoa-Schioppa 1997", cites:200, group:"kinematics", year:1997, side:"below",
    desc:"Kinetics: M1 encodes force, not kinematics.", journal:"J Neurophysiol" },
  { id:"todorov2000", label:"Todorov 2000", cites:400, group:"critique", year:2000, side:"below",
    desc:"Direction tuning guaranteed by biomechanics, not neural coding.", journal:"Nature Neurosci" },
  { id:"scott2004", label:"Scott 2004", cites:400, group:"challenge", year:2004, side:"below",
    desc:"Optimal feedback control and the long-latency stretch response.", journal:"Exp Brain Res" },
  { id:"scott2008", label:"Scott 2008", cites:350, group:"critique", year:2008, side:"below",
    desc:"\"Inconvenient truths\" about M1: contradictions to dominant frameworks.", journal:"J Physiol" },
  { id:"sauerbrei2020", label:"Sauerbrei 2020", cites:250, group:"challenge", year:2020, side:"below",
    desc:"M1 requires continuous thalamic input, challenging autonomous dynamics.", journal:"Nature" },
  { id:"suresh2020", label:"Suresh & Goodman 2020", cites:120, group:"challenge", year:2020, side:"below",
    desc:"Robust rotations for reaching; weak/absent for grasping.", journal:"eLife" },
  { id:"kalidindi2021", label:"Kalidindi 2021", cites:100, group:"challenge", year:2021, side:"below",
    desc:"Rotational dynamics consistent with feedback, not recurrence.", journal:"eLife" },
  { id:"safaie2023", label:"Safaie 2023", cites:100, group:"challenge", year:2023, side:"below",
    desc:"Preserved neural dynamics across primates and rodents during reaching.", journal:"Nature" },
  { id:"kuzmina2024", label:"Kuzmina 2024", cites:30, group:"critique", year:2024, side:"below",
    desc:"Smoothing kernel width qualitatively changes whether rotations are detected.", journal:"Sci Rep" },
]

const GROUP_COLOR = {
  encoding: COLORS.encoding,
  kinematics: COLORS.kinematics,
  dynamics: COLORS.dynamics,
  challenge: COLORS.challenge,
  critique: COLORS.critique,
  bci: COLORS.bci,
}

const ERAS = [
  { label: "Encoding", color: COLORS.encoding, x0: 1968, x1: 1993 },
  { label: "Kinematics vs. kinetics", color: COLORS.kinematics, x0: 1993, x1: 2005 },
  { label: "Representation vs. dynamics", color: COLORS.dynamics, x0: 2005, x1: 2024 },
]

const ARCS = [
  { papers: ["kalaska1989", "churchland2012"], label: "Same question: what variable do M1 neurons represent?" },
  { papers: ["schwartz1994", "churchland2012"], label: "Same question reframed: is encoding the right lens?" },
  { papers: ["kalaska1989", "rigotti2013"], label: "Multi-variable responses (1989) = mixed selectivity (2013+)" },
]

const LEGEND = [
  { color: COLORS.encoding, label: "Encoding era" },
  { color: COLORS.kinematics, label: "Kinematics vs. kinetics" },
  { color: COLORS.dynamics, label: "Representation vs. dynamics" },
  { color: COLORS.challenge, label: "Challenges" },
  { color: COLORS.critique, label: "Methodological critique" },
  { color: COLORS.bci, label: "BCI / applications" },
]

const W = 1100
const H = 520
const AXIS_Y = 260
const MARGIN = { top: 40, right: 30, bottom: 60, left: 30 }
const PADDING = 4

function computeLayout(papers) {
  const xScale = scaleLinear().domain([1965, 2027]).range([MARGIN.left, W - MARGIN.right])
  const rScale = scaleSqrt()
    .domain([0, Math.max(...papers.map(p => p.cites))])
    .range([6, 36])

  const nodes = papers.map(p => {
    const r = rScale(p.cites)
    const baseOffset = 20 + r
    return {
      ...p,
      x: xScale(p.year),
      y: p.side === "above" ? AXIS_Y - baseOffset : AXIS_Y + baseOffset,
      r,
    }
  })

  for (let pass = 0; pass < 3; pass++) {
    const above = nodes.filter(n => n.side === "above").sort((a, b) => a.x - b.x)
    const below = nodes.filter(n => n.side === "below").sort((a, b) => a.x - b.x)

    for (const group of [above, below]) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i], b = group[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = a.r + b.r + PADDING
          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) / 2
            const nx = (dx / dist) * overlap
            a.x -= nx
            b.x += nx
          }
        }
      }
    }
  }

  return { nodes, xScale, rScale }
}

const MotorCortexTimeline = () => {
  const containerRef = useRef(null)
  const [breakpoint, setBreakpoint] = useState("wide")
  const [hovered, setHovered] = useState(null)
  const [locked, setLocked] = useState(null)
  const [showArcs, setShowArcs] = useState(false)

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

  const { nodes, xScale } = useMemo(() => computeLayout(PAPERS), [])

  const showLabel = (p) => {
    if (p.cites >= 500) return true
    if (p.side === "below") return true
    if (breakpoint === "narrow") return p.cites >= 1000
    return false
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setShowArcs(false)}
          style={{ ...BTN_BASE, ...(!showArcs ? btnActive("#5c6b80") : {}) }}>
          Timeline
        </button>
        <button onClick={() => setShowArcs(true)}
          style={{ ...BTN_BASE, ...(showArcs ? btnActive("#5c6b80") : {}) }}>
          Show recycled arguments
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
        role="img" aria-label="Citation-weighted timeline of motor cortex research, 1968–2024">

        <rect x={0} y={0} width={W} height={H} fill="transparent"
          onClick={() => setLocked(null)} />

        {ERAS.map(era => {
          const ex = xScale(era.x0)
          const ew = xScale(era.x1) - ex
          return (
            <g key={era.label}>
              <rect x={ex} y={MARGIN.top} width={ew} height={H - MARGIN.top - MARGIN.bottom}
                fill={era.color} opacity={0.06} rx={4} />
              <text x={ex + 8} y={MARGIN.top - 8}
                style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: era.color,
                  opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {era.label}
              </text>
            </g>
          )
        })}

        <line x1={MARGIN.left} y1={AXIS_Y} x2={W - MARGIN.right} y2={AXIS_Y}
          stroke="#d0d0cc" strokeWidth={2} />

        {[1970, 1980, 1990, 2000, 2010, 2020].map(yr => (
          <g key={yr}>
            <line x1={xScale(yr)} y1={AXIS_Y} x2={xScale(yr)} y2={AXIS_Y + 8} stroke="#bbb" />
            <text x={xScale(yr)} y={AXIS_Y + 22} textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#999" }}>
              {yr}
            </text>
          </g>
        ))}

        {nodes.map(p => {
          const isActive = focused === p.id
          const isFaded = focused && !isActive
          const opacity = isFaded ? 0.1 : 0.7

          return (
            <g key={p.id}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setLocked(prev => prev === p.id ? null : p.id)}
              style={{ cursor: "pointer" }}
              role="button" tabIndex={0}
              aria-label={p.label}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLocked(prev => prev === p.id ? null : p.id) } }}
            >
              <circle cx={p.x} cy={p.y} r={p.r}
                fill={GROUP_COLOR[p.group]} fillOpacity={opacity}
                stroke={isActive ? GROUP_COLOR[p.group] : "none"} strokeWidth={isActive ? 2 : 0}
                style={{ transition: "fill-opacity 200ms ease" }} />
              {(showLabel(p) || isActive) && (
                <text x={p.x} y={p.side === "above" ? p.y - p.r - 6 : p.y + p.r + 14}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600,
                    fill: `rgba(42,42,42,${isFaded ? 0.12 : 0.8})`,
                    transition: "fill 200ms ease" }}>
                  {p.label}
                </text>
              )}
            </g>
          )
        })}

        {ARCS.map((arc, i) => {
          const p1 = nodes.find(n => n.id === arc.papers[0])
          const p2 = nodes.find(n => n.id === arc.papers[1])
          if (!p1 || !p2) return null
          const x1 = Math.min(p1.x, p2.x)
          const x2 = Math.max(p1.x, p2.x)
          const midX = (x1 + x2) / 2
          const arcY = AXIS_Y + 60 + i * 40
          const arcH = 20 + i * 8

          return (
            <g key={i} style={{ opacity: showArcs ? 1 : 0, transition: "opacity 0.3s" }}>
              <path
                d={`M${x1},${arcY} Q${midX},${arcY + arcH} ${x2},${arcY}`}
                fill="none" stroke={GROUP_COLOR[p1.group] || "#999"}
                strokeWidth={1.5} strokeDasharray="5 3" />
              <text x={midX} y={arcY + arcH + 14} textAnchor="middle"
                style={{ fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 600,
                  fill: GROUP_COLOR[p1.group] || "#999" }}>
                {arc.label}
              </text>
            </g>
          )
        })}
      </svg>

      {focused && (() => {
        const paper = nodes.find(n => n.id === focused)
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
              {paper.label}
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "rgba(0,0,0,0.6)", marginBottom: 4 }}>
              {paper.journal}
            </div>
            <div style={{ fontFamily: "var(--font-serif)", color: "rgba(0,0,0,0.75)", marginBottom: 4 }}>
              {paper.desc}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(0,0,0,0.4)" }}>
              ~{paper.cites.toLocaleString()} citations
            </div>
          </div>
        )
      })()}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5,
            fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "rgba(0,0,0,0.5)" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MotorCortexTimeline
