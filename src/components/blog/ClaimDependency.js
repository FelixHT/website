import React, { useState, useMemo, useCallback } from "react"
import { COLORS, TOOLTIP_STYLE, BTN_BASE, btnActive } from "./figureConstants"

const NODES = [
  { id:"claim", type:"claim", depth:0, parent:null,
    title:"CLAIM (Churchland et al. 2012, Nature)",
    body:"M1 exhibits autonomous rotational\ndynamics during reaching",
    sens:true },
  { id:"ev_rot", type:"evidence", depth:1, parent:"claim",
    title:"EVIDENCE",
    body:"Rotational structure in jPCA plane\n(Churchland 2012, Fig. 2, R\u00b2 = 0.89)",
    sens:true },
  { id:"ev_prep", type:"evidence", depth:1, parent:"claim",
    title:"EVIDENCE",
    body:"Preparatory activity sets\ncondition-specific initial states",
    sens:true },
  { id:"meth", type:"method", depth:2, parent:"ev_rot",
    title:"METHOD: jPCA",
    body:"Finds rotational planes in\nPC-projected neural space",
    sens:true },
  { id:"exp", type:"experiment", depth:2, parent:"ev_rot",
    title:"EXPERIMENT",
    body:"Utah arrays, 2 rhesus macaques\ncenter-out reaching task",
    sens:false },
  { id:"exp_prep", type:"experiment", depth:2, parent:"ev_prep",
    title:"EXPERIMENT",
    body:"Delayed-reach task\nvariable delay period",
    sens:false },
  { id:"pp_kern", type:"preproc", depth:3, parent:"meth",
    title:"PREPROCESSING",
    body:"Gaussian smoothing\nkernel width: 20ms",
    sens:true },
  { id:"pp_avg", type:"preproc", depth:3, parent:"meth",
    title:"PREPROCESSING",
    body:"Trial-averaging\nby reach condition",
    sens:true },
  { id:"pp_norm", type:"preproc", depth:3, parent:"exp",
    title:"PREPROCESSING",
    body:"Soft normalization\nof firing rates",
    sens:false },
  { id:"kuz", type:"flag", depth:3.5, parent:"pp_kern",
    title:"SENSITIVITY FLAG (Kuzmina et al. 2024)",
    body:"Kernel width 10ms vs 20ms qualitatively\nchanges whether rotations are detected",
    sens:false, isFlag:true },
  { id:"ds_russ", type:"downstream", depth:4, parent:"claim",
    title:"Russo et al. 2018 (Neuron)",
    body:"Condition-invariant dynamics\nCentral: uses jPCA rotations as starting point",
    sens:true, depType:"central" },
  { id:"ds_bci", type:"downstream", depth:4, parent:"claim",
    title:"Dynamics-based BCI decoders",
    body:"Use rotational subspace\nCentral: decoding assumes rotational structure",
    sens:true, depType:"central" },
  { id:"ds_gall", type:"downstream", depth:4, parent:"claim",
    title:"Gallego et al. 2017 (Neuron)",
    body:"Neural manifolds for motor control\nContext: cites rotations, own claim is about manifolds broadly",
    sens:false, depType:"context" },
  { id:"ch_sauerb", type:"challenge", depth:5, parent:"claim",
    title:"CHALLENGE (Sauerbrei 2020)",
    body:"M1 requires continuous thalamic input\nIndependent: optogenetics, mice",
    sens:false, indep:true },
  { id:"ch_kalid", type:"challenge", depth:5, parent:"claim",
    title:"CHALLENGE (Kalidindi 2021)",
    body:"Rotations consistent with feedback controller\nIndependent: computational model",
    sens:false, indep:true },
  { id:"ch_sur", type:"challenge", depth:5, parent:"claim",
    title:"COMPLICATION (Suresh 2020)",
    body:"Rotations for reaching, weak/absent for grasping\nPartially indep.: same arrays, diff. task",
    sens:false, indep:true },
]

const EDGES = [
  { from:"claim", to:"ev_rot", dep:"central" },
  { from:"claim", to:"ev_prep", dep:"central" },
  { from:"ev_rot", to:"meth", dep:"central" },
  { from:"ev_rot", to:"exp", dep:"central" },
  { from:"ev_prep", to:"exp_prep", dep:"central" },
  { from:"meth", to:"pp_kern", dep:"central" },
  { from:"meth", to:"pp_avg", dep:"central" },
  { from:"exp", to:"pp_norm", dep:"central" },
  { from:"pp_kern", to:"kuz", dep:"flag" },
  { from:"claim", to:"ds_russ", dep:"central" },
  { from:"claim", to:"ds_bci", dep:"central" },
  { from:"claim", to:"ds_gall", dep:"context" },
  { from:"claim", to:"ch_sauerb", dep:"challenge" },
  { from:"claim", to:"ch_kalid", dep:"challenge" },
  { from:"claim", to:"ch_sur", dep:"challenge" },
]

const NODE_FILLS = {
  claim:      { bg:"#e8e4f0", border:"#b8b0d0", bgAlert:"#f5e8e4", borderAlert:"#c0503a" },
  evidence:   { bg:"#ddeaf6", border:"#a8c4e0", bgAlert:"#f5e8e4", borderAlert:"#c0503a" },
  method:     { bg:"#ddeaf6", border:"#a8c4e0", bgAlert:"#f5e8e4", borderAlert:"#c0503a" },
  experiment: { bg:"#e6f0e6", border:"#a0c4a0", bgAlert:"#e6f0e6", borderAlert:"#a0c4a0" },
  preproc:    { bg:"#f5f0e0", border:"#d4c890", bgAlert:"#fce8e4", borderAlert:"#c0503a" },
  flag:       { bg:"#fce8e4", border:"#c0503a", bgAlert:"#fce0d8", borderAlert:"#c0503a" },
  downstream: { bg:"#f0f0ee", border:"#c8c8c0", bgAlert:"#f0f0ee", borderAlert:"#c8c8c0" },
  challenge:  { bg:"#e8f5eb", border:"#80b090", bgAlert:"#e8f5eb", borderAlert:"#4a8c5c" },
}

const BASE_W = 920
const ROW_HEIGHTS = { 0: 60, 1: 150, 2: 240, 3: 330, 3.5: 420, 4: 510, 5: 610 }
const NODE_H = { 0: 52, 1: 52, 2: 48, 3: 44, 3.5: 48, 4: 56, 5: 60 }
const NODE_W_BY_DEPTH = { 0: 380, 1: 240, 2: 220, 3: 190, 3.5: 340, 4: 210, 5: 220 }
const TOTAL_H = 690

function computeTreeLayout(nodes) {
  const byDepth = {}
  nodes.forEach(n => {
    const d = n.depth
    if (!byDepth[d]) byDepth[d] = []
    byDepth[d].push(n)
  })

  const positions = {}
  const margin = 40

  Object.entries(byDepth).sort(([a], [b]) => a - b).forEach(([depth, group]) => {
    const d = parseFloat(depth)
    const y = ROW_HEIGHTS[d] || d * 100
    const h = NODE_H[d] || 48
    const w = NODE_W_BY_DEPTH[d] || 220
    const totalW = BASE_W - margin * 2
    const spacing = totalW / (group.length + 1)

    group.forEach((n, i) => {
      positions[n.id] = {
        x: margin + spacing * (i + 1),
        y,
        w,
        h,
      }
    })
  })

  return positions
}

const CASCADE_DEPTHS = [3.5, 3, 2, 1, 0, 4]

const ClaimDependency = () => {
  const [propagated, setPropagated] = useState(false)
  const [cascadeStep, setCascadeStep] = useState(-1)
  const [hovered, setHovered] = useState(null)

  const positions = useMemo(() => computeTreeLayout(NODES), [])

  const handlePropagate = useCallback(() => {
    if (propagated) {
      setPropagated(false)
      setCascadeStep(-1)
      return
    }
    setPropagated(true)
    setCascadeStep(-1)
    CASCADE_DEPTHS.forEach((_, i) => {
      setTimeout(() => setCascadeStep(i), (i + 1) * 100)
    })
  }, [propagated])

  const isCascadeReached = (n) => {
    if (!propagated) return false
    if (cascadeStep < 0) return false
    const depthIdx = CASCADE_DEPTHS.indexOf(n.depth)
    if (depthIdx === -1) {
      const d4Idx = CASCADE_DEPTHS.indexOf(4)
      return cascadeStep >= d4Idx
    }
    return cascadeStep >= depthIdx
  }

  const getNodeStyle = (n) => {
    const fills = NODE_FILLS[n.type] || NODE_FILLS.downstream
    const active = isCascadeReached(n)
    if (!active) return { bg: fills.bg, border: fills.border }
    if (n.isFlag) return { bg: fills.bgAlert, border: fills.borderAlert }
    if (n.indep) return { bg: NODE_FILLS.challenge.bgAlert, border: NODE_FILLS.challenge.borderAlert }
    if (n.sens) return { bg: fills.bgAlert, border: fills.borderAlert }
    return { bg: fills.bg, border: fills.border }
  }

  const getBadge = (n) => {
    if (!isCascadeReached(n)) return null
    if (n.sens && !n.isFlag && !n.indep && n.depType !== "context")
      return { text: "NEEDS REVIEW", color: "#c0503a" }
    if (n.indep) return { text: "INDEPENDENT", color: "#4a8c5c" }
    if (n.isFlag) return { text: "SOURCE", color: "#c0503a" }
    if (n.depType === "context" && !n.sens) return { text: "UNAFFECTED", color: "#999" }
    return null
  }

  const getEdgeStyle = (e) => {
    const fn = NODES.find(n => n.id === e.from)
    const tn = NODES.find(n => n.id === e.to)
    const edgeActive = fn && tn && isCascadeReached(fn) && isCascadeReached(tn)
    let col = "#bbb", sw = 1.2, dash = ""
    if (e.dep === "central") { col = "#888"; sw = 1.5 }
    if (e.dep === "context") { col = "#bbb"; sw = 1.2; dash = "5 3" }
    if (e.dep === "flag") { col = "#c0503a"; sw = 1.5; dash = "5 3" }
    if (e.dep === "challenge") { col = "#80b090"; sw = 1.2 }

    if (edgeActive) {
      if (e.dep === "flag") { col = "#c0503a"; sw = 2.5; dash = "6 3" }
      else if (e.dep === "challenge") { col = "#4a8c5c"; sw = 2 }
      else if (e.dep === "central" && fn?.sens && tn?.sens) { col = "#c0503a"; sw = 2 }
      else if (e.dep === "context") { col = "#ccc"; sw = 1.2; dash = "5 3" }
    }
    return { col, sw, dash }
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button onClick={() => { setPropagated(false); setCascadeStep(-1) }}
          style={{ ...BTN_BASE, ...(!propagated ? btnActive("#4a7c5a") : {}) }}>
          Default view
        </button>
        <button onClick={handlePropagate}
          style={{ ...BTN_BASE, ...(propagated ? btnActive("#c0503a") : {}) }}>
          Propagate sensitivity
        </button>
      </div>

      <svg viewBox={`0 0 ${BASE_W} ${TOTAL_H}`} width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", overflow: "visible" }}>

        {EDGES.map((e, i) => {
          const fp = positions[e.from]
          const tp = positions[e.to]
          if (!fp || !tp) return null
          const x1 = fp.x, y1 = fp.y + fp.h
          const x2 = tp.x, y2 = tp.y
          const my = (y1 + y2) / 2
          const s = getEdgeStyle(e)
          return (
            <path key={i}
              d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
              fill="none" stroke={s.col} strokeWidth={s.sw}
              strokeDasharray={s.dash || undefined}
              style={{ transition: "stroke 300ms ease, stroke-width 300ms ease" }} />
          )
        })}

        {NODES.map(n => {
          const pos = positions[n.id]
          if (!pos) return null
          const { bg, border } = getNodeStyle(n)
          const badge = getBadge(n)
          const rx = pos.x - pos.w / 2
          const labelCol = n.isFlag ? "#c0503a" : (n.indep && propagated) ? "#4a8c5c" : "#999"
          const lines = [n.title, ...n.body.split("\n")]

          return (
            <g key={n.id}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}>
              <rect x={rx} y={pos.y} width={pos.w} height={pos.h} rx={4} ry={4}
                fill={bg} stroke={border} strokeWidth={1.5}
                style={{ transition: "fill 300ms ease, stroke 300ms ease" }} />
              {lines.map((line, i) => {
                const isLabel = i === 0
                const isDetail = !isLabel && line.length > 30
                const fs = isLabel ? 8.5 : isDetail ? 9 : 10.5
                const fill = isLabel ? labelCol : (fs <= 9 ? "#888" : "#2a2a2a")
                const fw = isLabel ? 600 : (fs <= 9 ? 400 : 600)
                const ty = pos.y + 13 + i * (fs + 2.5)
                return (
                  <text key={i} x={pos.x} y={ty} textAnchor="middle"
                    fontSize={fs} fontWeight={fw} fill={fill}>
                    {line}
                  </text>
                )
              })}
              {badge && (
                <g>
                  <rect x={rx + pos.w - 75} y={pos.y - 14} width={72} height={16} rx={8}
                    fill={badge.color} fillOpacity={0.12} />
                  <text x={rx + pos.w - 39} y={pos.y - 3} textAnchor="middle"
                    fontSize={7.5} fontWeight={700} fill={badge.color}
                    letterSpacing="0.03em">
                    {badge.text}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      {hovered && (() => {
        const n = NODES.find(nd => nd.id === hovered)
        const pos = positions[hovered]
        if (!n || !pos) return null
        const xPct = (pos.x / BASE_W) * 100
        const yPct = (pos.y / TOTAL_H) * 100
        const flipLeft = pos.x / BASE_W > 0.6
        return (
          <div style={{
            ...TOOLTIP_STYLE,
            left: flipLeft ? "auto" : `calc(${xPct}% + ${pos.w / 2 + 10}px)`,
            right: flipLeft ? `calc(${100 - xPct}% + ${pos.w / 2 + 10}px)` : "auto",
            top: `calc(${yPct}%)`,
          }}>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, color: "rgba(0,0,0,0.9)", marginBottom: 2 }}>
              {n.title}
            </div>
            <div style={{ fontFamily: "var(--font-serif)", color: "rgba(0,0,0,0.75)" }}>
              {n.body.replace(/\n/g, " ")}
            </div>
          </div>
        )
      })()}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14,
        paddingTop: 12, borderTop: "1px solid #e8e8e4" }}>
        {[
          ["#e8e4f0", "Claim"], ["#ddeaf6", "Evidence / method"], ["#f5f0e0", "Preprocessing"],
          ["#e6f0e6", "Experiment"], ["#f0f0ee", "Downstream paper"], ["#fce8e4", "Sensitivity flag"],
        ].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11.5px", color: "#666" }}>
            <div style={{ width: 14, height: 14, borderRadius: 2, background: c,
              border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }} />
            {l}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11.5px", color: "#666" }}>
          <svg width={22} height={4} viewBox="0 0 22 4">
            <line x1={0} y1={2} x2={22} y2={2} stroke="#555" strokeWidth={2} />
          </svg>
          Central dep.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11.5px", color: "#666" }}>
          <svg width={22} height={4} viewBox="0 0 22 4">
            <line x1={0} y1={2} x2={22} y2={2} stroke="#bbb" strokeWidth={1.5} strokeDasharray="4 3" />
          </svg>
          Context only
        </div>
      </div>
    </div>
  )
}

export default ClaimDependency
