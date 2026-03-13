import React, { useState, useMemo, useCallback } from "react"
import { TOOLTIP_STYLE, BTN_BASE, btnActive } from "./figureConstants"

const NODES = [
  { id:"claim", type:"claim", depth:0, parent:null,
    title:"CLAIM (Churchland et al. 2012, Nature)",
    body:"M1 exhibits autonomous rotational\ndynamics during reaching",
    sens:true },
  { id:"ev_rot", type:"evidence", depth:1, parent:"claim",
    title:"EVIDENCE",
    body:"Rotational structure in jPCA plane\n(Churchland 2012, R² = 0.89)",
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
    body:"Gaussian smoothing\nkernel width: 20 ms",
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
    title:"SENSITIVITY FLAG (Kuzmina 2024)",
    body:"Kernel 10 vs 20 ms qualitatively\nchanges rotational detection",
    sens:false, isFlag:true },
  { id:"ds_russ", type:"downstream", depth:4, parent:"claim",
    title:"Russo et al. 2018 (Neuron)",
    body:"Condition-invariant dynamics\nUses jPCA rotations as basis",
    sens:true, depType:"central" },
  { id:"ds_bci", type:"downstream", depth:4, parent:"claim",
    title:"Dynamics-based BCI decoders",
    body:"Use rotational subspace\nAssumes rotational structure",
    sens:true, depType:"central" },
  { id:"ds_gall", type:"downstream", depth:4, parent:"claim",
    title:"Gallego et al. 2017 (Neuron)",
    body:"Neural manifolds for motor control\nCites rotations broadly",
    sens:false, depType:"context" },
  { id:"ch_sauerb", type:"challenge", depth:5, parent:"claim",
    title:"CHALLENGE (Sauerbrei 2020)",
    body:"M1 needs continuous thalamic input\nOptogenetics, mice",
    sens:false, indep:true },
  { id:"ch_kalid", type:"challenge", depth:5, parent:"claim",
    title:"CHALLENGE (Kalidindi 2021)",
    body:"Rotations from feedback controller\nComputational model",
    sens:false, indep:true },
  { id:"ch_sur", type:"challenge", depth:5, parent:"claim",
    title:"COMPLICATION (Suresh 2020)",
    body:"Reaching rotations, not grasping\nSame arrays, different task",
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

/* ── Horizontal column layout ─────────────────── */

const BASE_W = 1300
const TOTAL_H = 400
const NODE_W = 180
const CLAIM_W = 220
const NODE_H = 56
const NODE_GAP = 18
const HEADER_H = 36
const COL_X = [100, 300, 490, 700, 920, 1140]
const COL_LABELS = ["Preprocessing", "Methods", "Evidence", "", "Downstream", "Challenges"]

const NODE_COL = {
  pp_kern:0, kuz:0, pp_avg:0, pp_norm:0,
  meth:1, exp:1, exp_prep:1,
  ev_rot:2, ev_prep:2,
  claim:3,
  ds_russ:4, ds_bci:4, ds_gall:4,
  ch_sauerb:5, ch_kalid:5, ch_sur:5,
}

const NODE_ROW = {
  pp_kern:0, kuz:1, pp_avg:2, pp_norm:3,
  meth:0, exp:1, exp_prep:2,
  ev_rot:0, ev_prep:1,
  claim:0,
  ds_russ:0, ds_bci:1, ds_gall:2,
  ch_sauerb:0, ch_kalid:1, ch_sur:2,
}

function computeLayout(nodes) {
  const colCounts = {}
  nodes.forEach(n => {
    const col = NODE_COL[n.id]
    if (col === undefined) return
    colCounts[col] = Math.max(colCounts[col] || 0, (NODE_ROW[n.id] || 0) + 1)
  })
  const positions = {}
  const availH = TOTAL_H - HEADER_H
  nodes.forEach(n => {
    const col = NODE_COL[n.id]
    const row = NODE_ROW[n.id]
    if (col === undefined || row === undefined) return
    const count = colCounts[col]
    const w = col === 3 ? CLAIM_W : NODE_W
    const totalH = count * NODE_H + (count - 1) * NODE_GAP
    const startY = HEADER_H + (availH - totalH) / 2
    positions[n.id] = { x: COL_X[col], y: startY + row * (NODE_H + NODE_GAP), w, h: NODE_H }
  })
  return positions
}

const CASCADE_DEPTHS = [3.5, 3, 2, 1, 0, 4]

const ClaimDependency = () => {
  const [propagated, setPropagated] = useState(false)
  const [cascadeStep, setCascadeStep] = useState(-1)
  const [hovered, setHovered] = useState(null)

  const positions = useMemo(() => computeLayout(NODES), [])

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

        {/* Column headers */}
        {COL_LABELS.map((label, i) => label && (
          <text key={i} x={COL_X[i]} y={22} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500,
              fill: "rgba(0,0,0,0.32)", letterSpacing: "0.05em" }}>
            {label.toUpperCase()}
          </text>
        ))}

        {/* Edges */}
        {EDGES.map((e, i) => {
          const fp = positions[e.from]
          const tp = positions[e.to]
          if (!fp || !tp) return null
          const fromCol = NODE_COL[e.from]
          const toCol = NODE_COL[e.to]
          const s = getEdgeStyle(e)

          let d
          if (fromCol === toCol) {
            const upper = NODE_ROW[e.from] < NODE_ROW[e.to] ? fp : tp
            const lower = NODE_ROW[e.from] < NODE_ROW[e.to] ? tp : fp
            const x1 = upper.x, y1 = upper.y + upper.h
            const x2 = lower.x, y2 = lower.y
            const my = (y1 + y2) / 2
            d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`
          } else {
            const leftIsFrom = fromCol < toCol
            const left = leftIsFrom ? fp : tp
            const right = leftIsFrom ? tp : fp
            const x1 = left.x + left.w / 2
            const y1 = left.y + left.h / 2
            const x2 = right.x - right.w / 2
            const y2 = right.y + right.h / 2
            const mx = (x1 + x2) / 2
            d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
          }

          return (
            <path key={i} d={d}
              fill="none" stroke={s.col} strokeWidth={s.sw}
              strokeDasharray={s.dash || undefined}
              style={{ transition: "stroke 300ms ease, stroke-width 300ms ease" }} />
          )
        })}

        {/* Nodes */}
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
              {lines.map((line, li) => {
                const isLabel = li === 0
                const isDetail = !isLabel && line.length > 30
                const fs = isLabel ? 8.5 : isDetail ? 9 : 10.5
                const fill = isLabel ? labelCol : (fs <= 9 ? "#888" : "#2a2a2a")
                const fw = isLabel ? 600 : (fs <= 9 ? 400 : 600)
                const ty = pos.y + 13 + li * (fs + 2.5)
                return (
                  <text key={li} x={pos.x} y={ty} textAnchor="middle"
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

      {/* Tooltip */}
      {hovered && (() => {
        const n = NODES.find(nd => nd.id === hovered)
        const pos = positions[hovered]
        if (!n || !pos) return null
        const xPct = (pos.x / BASE_W) * 100
        const yPct = (pos.y / TOTAL_H) * 100
        const halfWPct = ((pos.w / 2) / BASE_W) * 100
        const flipLeft = pos.x / BASE_W > 0.55

        return (
          <div style={{
            ...TOOLTIP_STYLE,
            left: flipLeft ? "auto" : `${xPct + halfWPct + 1}%`,
            right: flipLeft ? `${100 - xPct + halfWPct + 1}%` : "auto",
            top: `${yPct}%`,
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

      {/* Legend */}
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
