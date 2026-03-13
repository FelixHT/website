import React, { useState, useMemo, useRef, useEffect } from "react"
import { scaleLinear } from "d3-scale"

const PAPERS = [
  { id:"evarts1968", l:"Evarts 1968", c:2200, g:"rep", yr:1968, d:"Discharge of pyramidal neurons related to force, not displacement.", j:"J Neurophysiol" },
  { id:"georgo1982", l:"Georgopoulos\n1982", c:1200, g:"rep", yr:1982, d:"M1 neurons have preferred directions for arm movement.", j:"J Neurosci" },
  { id:"georgo1986", l:"Georgopoulos\n1986", c:4000, g:"rep", yr:1986, d:"Population vector: summed preferred directions decode movement.", j:"Science" },
  { id:"georgo1988", l:"Georgopoulos\n1988", c:800, g:"rep", yr:1988, d:"Neuronal population coding of movement direction.", j:"Science" },
  { id:"schwartz1994", l:"Schwartz\n1994", c:500, g:"rep", yr:1994, d:"Motor cortex encodes hand velocity (kinematics).", j:"J Neurophysiol" },
  { id:"moran1999", l:"Moran &\nSchwartz 1999", c:700, g:"rep", yr:1999, d:"Motor cortical activity during drawing movements.", j:"J Neurophysiol" },
  { id:"kalaska1989", l:"Kalaska\n1989", c:600, g:"rep", yr:1989, d:"Load and direction effects in M1, documenting multi-variable responses.", j:"J Neurosci" },
  { id:"churchland2012", l:"Churchland\n2012", c:1500, g:"dyn", yr:2012, d:"Rotational population dynamics during reaching; M1 as dynamical system.", j:"Nature" },
  { id:"sussillo2015", l:"Sussillo\n2015", c:600, g:"dyn", yr:2015, d:"RNN model of M1 reproduces rotational dynamics.", j:"Nature Neurosci" },
  { id:"gallego2017", l:"Gallego\n2017", c:350, g:"dyn", yr:2017, d:"Neural manifolds for the control of movement.", j:"Neuron" },
  { id:"russo2018", l:"Russo\n2018", c:300, g:"dyn", yr:2018, d:"Condition-invariant dynamics in motor cortex.", j:"Neuron" },
  { id:"pandarinath2018", l:"Pandarinath\n2018", c:800, g:"dyn", yr:2018, d:"LFADS: inferring dynamics from single-trial neural data.", j:"Nature Methods" },
  { id:"gallego2020", l:"Gallego\n2020", c:400, g:"dyn", yr:2020, d:"Stable low-dimensional neural manifolds across days and tasks.", j:"Nature Neurosci" },
  { id:"scott2004", l:"Scott 2004", c:400, g:"chal", yr:2004, d:"Optimal feedback control and the long-latency stretch response.", j:"Exp Brain Res" },
  { id:"scott2008", l:"Scott 2008", c:350, g:"crit", yr:2008, d:"\"Inconvenient truths\" about M1: contradictions to dominant frameworks.", j:"J Physiol" },
  { id:"todorov2000", l:"Todorov\n2000", c:400, g:"crit", yr:2000, d:"Direction tuning guaranteed by biomechanics, not neural coding.", j:"Nature Neurosci" },
  { id:"sauerbrei2020", l:"Sauerbrei\n2020", c:250, g:"chal", yr:2020, d:"M1 requires continuous thalamic input, challenging autonomous dynamics.", j:"Nature" },
  { id:"kalidindi2021", l:"Kalidindi\n2021", c:100, g:"chal", yr:2021, d:"Rotational dynamics consistent with feedback, not recurrence.", j:"eLife" },
  { id:"suresh2020", l:"Suresh &\nGoodman 2020", c:120, g:"chal", yr:2020, d:"Robust rotations for reaching; weak/absent for grasping.", j:"eLife" },
  { id:"kuzmina2024", l:"Kuzmina\n2024", c:30, g:"crit", yr:2024, d:"Smoothing kernel width qualitatively changes whether rotations are detected.", j:"Sci Rep" },
  { id:"safaie2023", l:"Safaie\n2023", c:100, g:"chal", yr:2023, d:"Preserved neural dynamics across primates and rodents during reaching.", j:"Nature" },
  { id:"taylor2002", l:"Taylor\n2002", c:1100, g:"bci", yr:2002, d:"Direct cortical control of 3D neuroprosthetic devices.", j:"Science" },
  { id:"hochberg2012", l:"Hochberg\n2012", c:1600, g:"bci", yr:2012, d:"BrainGate: human reaches and grasps via neural interface.", j:"Nature" },
  { id:"willett2021", l:"Willett\n2021", c:500, g:"bci", yr:2021, d:"Handwriting BCI: dynamics-aware decoding.", j:"Nature" },
  { id:"keshtkaran2022", l:"Keshtkaran\n2022", c:150, g:"bci", yr:2022, d:"LFADS-based decoders for stable long-term BCI.", j:"Nature Biomed Eng" },
  { id:"rigotti2013", l:"Rigotti\n2013", c:1000, g:"rep", yr:2013, d:"Mixed selectivity is computationally essential (PFC).", j:"Nature" },
]

const EDGES = [
  ["georgo1982","georgo1986"],["georgo1986","georgo1988"],["evarts1968","georgo1982"],
  ["georgo1986","schwartz1994"],["georgo1986","moran1999"],["evarts1968","kalaska1989"],
  ["georgo1986","taylor2002"],["georgo1986","hochberg2012"],
  ["georgo1986","churchland2012"],["churchland2012","sussillo2015"],
  ["churchland2012","gallego2017"],["churchland2012","russo2018"],
  ["churchland2012","pandarinath2018"],["churchland2012","gallego2020"],
  ["churchland2012","sauerbrei2020"],["churchland2012","kalidindi2021"],
  ["churchland2012","suresh2020"],["churchland2012","kuzmina2024"],
  ["churchland2012","willett2021"],["pandarinath2018","keshtkaran2022"],
  ["georgo1986","todorov2000"],["georgo1986","scott2008"],
  ["scott2004","scott2008"],["churchland2012","safaie2023"],
  ["gallego2020","safaie2023"],
]

const COLORS = { rep:"#4A90D9", dyn:"#D4A03C", bci:"#8B6AAD", chal:"#C0503A", crit:"#6A8A6E" }

const LANES = [
  { key:"rep", label:"Representational" },
  { key:"dyn", label:"Dynamical systems" },
  { key:"bci", label:"BCI / applications" },
  { key:"chal", label:"Challenges" },
  { key:"crit", label:"Critique" },
]

const ERAS = [
  { label:"Encoding era", x0:1968, x1:2002 },
  { label:"Dynamics era", x0:2005, x1:2019 },
  { label:"Reassessment", x0:2020, x1:2024 },
]

function computeLayout(width, height) {
  const margin = { top: 40, right: 30, bottom: 20, left: 120 }
  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom
  const laneH = plotH / LANES.length

  const xScale = scaleLinear().domain([1968, 2024]).range([margin.left, margin.left + plotW])

  const sqrtC = PAPERS.map(p => Math.sqrt(p.c))
  const minSqrt = Math.min(...sqrtC)
  const maxSqrt = Math.max(...sqrtC)
  const radius = p => 6 + (Math.sqrt(p.c) - minSqrt) / (maxSqrt - minSqrt) * 22

  const laneIndex = key => LANES.findIndex(l => l.key === key)

  const groups = {}
  PAPERS.forEach(p => {
    const k = `${p.yr}-${p.g}`
    if (!groups[k]) groups[k] = []
    groups[k].push(p.id)
  })

  const nodePos = {}
  PAPERS.forEach(p => {
    const k = `${p.yr}-${p.g}`
    const siblings = groups[k].sort()
    const idx = siblings.indexOf(p.id)
    const li = laneIndex(p.g)
    const cx = xScale(p.yr) + idx * 12
    const cy = margin.top + (li + 0.5) * laneH + (idx % 2 === 0 ? -8 : 8)
    nodePos[p.id] = { cx, cy, r: radius(p) }
  })

  const edgePaths = EDGES.map(([sid, tid]) => {
    const s = nodePos[sid], t = nodePos[tid]
    if (!s || !t) return null
    const mx = (s.cx + t.cx) / 2
    const my = (s.cy + t.cy) / 2 - 20
    return { sid, tid, d: `M${s.cx},${s.cy} Q${mx},${my} ${t.cx},${t.cy}` }
  }).filter(Boolean)

  const eraRects = ERAS.map(e => ({
    label: e.label,
    x: xScale(e.x0),
    width: xScale(e.x1) - xScale(e.x0),
    y: margin.top,
    height: plotH,
  }))

  const laneLabels = LANES.map((l, i) => ({
    label: l.label,
    x: margin.left - 12,
    y: margin.top + (i + 0.5) * laneH,
  }))

  return { nodePos, edgePaths, eraRects, laneLabels, radius, xScale, margin }
}

const CitationNetwork = () => {
  const containerRef = useRef(null)
  const [focused, setFocused] = useState(null) // paper id

  // Build adjacency set for the focused node (computed once per focus change, not per-paper)
  const focusedConnections = useMemo(() => {
    if (!focused) return new Set()
    const set = new Set()
    EDGES.forEach(([s, t]) => {
      if (s === focused) set.add(t)
      if (t === focused) set.add(s)
    })
    return set
  }, [focused])

  const W = 900, H = 500
  const layout = computeLayout(W, H)
  const { nodePos, edgePaths, eraRects, laneLabels } = layout

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setFocused(null) }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
        role="img"
        aria-label="Citation network of motor cortex research papers from 1968 to 2024, organized by paradigm"
      >
        <title>Citation network of motor cortex research, 1968–2024</title>
        <rect x={0} y={0} width={W} height={H} fill="transparent"
          onClick={() => setFocused(null)} />

        {/* Era shading */}
        {eraRects.map(e => (
          <g key={e.label}>
            <rect x={e.x} y={e.y} width={e.width} height={e.height}
              fill="rgba(0,0,0,0.02)" />
            <text x={e.x + 6} y={e.y - 8}
              style={{ fontFamily:"var(--font-mono)", fontSize:10, fill:"rgba(0,0,0,0.2)",
                textTransform:"uppercase", letterSpacing:"0.06em" }}>
              {e.label}
            </text>
          </g>
        ))}

        {/* Lane labels */}
        {laneLabels.map(l => (
          <text key={l.label} x={l.x} y={l.y} textAnchor="end" dominantBaseline="middle"
            style={{ fontFamily:"var(--font-mono)", fontSize:10, fill:"rgba(0,0,0,0.25)",
              textTransform:"uppercase", letterSpacing:"0.06em" }}>
            {l.label}
          </text>
        ))}

        {/* Edges */}
        {edgePaths.map((e, i) => {
          const srcPaper = PAPERS.find(p => p.id === e.sid)
          const tgtPaper = PAPERS.find(p => p.id === e.tid)
          const involved = focused && (e.sid === focused || e.tid === focused)
          const isFaded = focused && !involved
          const crossParadigm = srcPaper && tgtPaper && srcPaper.g !== tgtPaper.g

          return (
            <path key={i} d={e.d} fill="none"
              stroke={involved ? COLORS[srcPaper.g] : isFaded ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.07)"}
              strokeWidth={involved ? 1.5 : 0.8}
              strokeDasharray={involved && crossParadigm ? "4 3" : "none"}
              style={{ transition:"stroke 200ms ease, stroke-width 200ms ease" }} />
          )
        })}

        {/* Nodes and Labels */}
        {PAPERS.map(p => {
          const pos = nodePos[p.id]
          const isActive = focused === p.id
          const isConnected = focused && focusedConnections.has(p.id)
          const isFaded = focused && !isActive && !isConnected
          const opacity = isFaded ? 0.1 : (isActive ? 1 : 0.7)
          const lines = p.l.split("\n")

          return (
            <g key={p.id}
              onMouseEnter={() => { if (!focused) setFocused(p.id) }}
              onMouseLeave={() => setFocused(null)}
              onClick={() => setFocused(prev => prev === p.id ? null : p.id)}
              onFocus={() => setFocused(p.id)}
              onBlur={() => setFocused(null)}
              style={{ cursor:"pointer" }}
              role="button" tabIndex={0} aria-label={p.l.replace("\n"," ")}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFocused(prev => prev === p.id ? null : p.id) }}}
            >
              <circle cx={pos.cx} cy={pos.cy} r={pos.r}
                fill={COLORS[p.g]} fillOpacity={opacity}
                stroke={isActive ? COLORS[p.g] : "none"} strokeWidth={isActive ? 2 : 0}
                style={{ transition:"fill-opacity 200ms ease, stroke-width 200ms ease" }} />
              <text x={pos.cx} y={pos.cy + pos.r + 12} textAnchor="middle"
                style={{ fontFamily:"var(--font-sans)", fontSize:11, fontWeight:600,
                  fill:`rgba(42,42,42,${isFaded ? 0.12 : 0.8})`,
                  transition:"fill 200ms ease" }}>
                {lines.map((line, i) => (
                  <tspan key={i} x={pos.cx} dy={i === 0 ? 0 : "1.2em"}>{line}</tspan>
                ))}
              </text>
            </g>
          )
        })}
      </svg>

      {focused && (() => {
        const paper = PAPERS.find(p => p.id === focused)
        const pos = nodePos[focused]
        if (!paper || !pos) return null

        const xPct = (pos.cx / W) * 100
        const yPct = (pos.cy / H) * 100
        const flipLeft = pos.cx / W > 0.6

        return (
          <div style={{
            position:"absolute",
            left: flipLeft ? "auto" : `calc(${xPct}% + 14px)`,
            right: flipLeft ? `calc(${100 - xPct}% + 14px)` : "auto",
            top: `calc(${yPct}% - 10px)`,
            background:"rgba(250,249,246,0.95)",
            backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)",
            border:"1px solid rgba(0,0,0,0.08)",
            borderRadius:6, padding:"10px 14px",
            boxShadow:"0 2px 12px rgba(0,0,0,0.06)",
            maxWidth:280, pointerEvents:"none", zIndex:10,
            lineHeight:1.5, fontSize:"12.5px",
          }}>
            <div style={{ fontFamily:"var(--font-sans)", fontWeight:700, color:"rgba(0,0,0,0.9)", marginBottom:2 }}>
              {paper.l.replace("\n"," ")}
            </div>
            <div style={{ fontFamily:"var(--font-serif)", fontStyle:"italic", color:"rgba(0,0,0,0.6)", marginBottom:4 }}>
              {paper.j}
            </div>
            <div style={{ fontFamily:"var(--font-serif)", color:"rgba(0,0,0,0.75)", marginBottom:4 }}>
              {paper.d}
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"11px", color:"rgba(0,0,0,0.4)" }}>
              ~{paper.c.toLocaleString()} citations
            </div>
          </div>
        )
      })()}

      <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginTop:10 }}>
        {LANES.map(l => (
          <div key={l.key} style={{ display:"flex", alignItems:"center", gap:5,
            fontFamily:"var(--font-mono)", fontSize:"0.72rem", color:"rgba(0,0,0,0.5)" }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:COLORS[l.key], flexShrink:0 }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CitationNetwork
