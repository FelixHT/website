import React, { useState } from "react"

const LAYERS = [
  {
    id: "consensus",
    label: "Consensus / confidence",
    desc: "Aggregate belief: how sure is the field? Updates as challenges and replications accumulate.",
    tools: [],
    tier: "future",
    color: "#f5f2f8",
    borderColor: "#d0c8e0",
  },
  {
    id: "dependency",
    label: "Dependency layer",
    desc: "Which claims depend on which computations, what breaks when a link is challenged.",
    tools: [],
    tier: "proposed",
    color: "#e8e4f0",
    borderColor: "#b8b0d0",
  },
  {
    id: "claim",
    label: "Claim layer",
    desc: "Structured links: 'this claim in this paper' to 'this computation on this dataset with these parameters.'",
    tools: [],
    tier: "proposed",
    color: "#e8e4f0",
    borderColor: "#b8b0d0",
  },
  {
    id: "interpretation",
    label: "Interpretation / framing",
    desc: "Alternative explanations the same evidence supports. Where reframing challenges live.",
    tools: [],
    tier: "future",
    color: "#f5f2f8",
    borderColor: "#d0c8e0",
  },
  {
    id: "computation",
    label: "Computation layer",
    desc: "Standardized formats, reproducible pipelines, version-controlled analysis workflows.",
    tools: ["NWB", "BIDS", "DataJoint", "SpikeInterface"],
    tier: "exists",
    color: "#ddeaf6",
    borderColor: "#a8c4e0",
  },
  {
    id: "operationalization",
    label: "Operationalization",
    desc: "Variable definitions: what counts as 'movement onset,' trial inclusion criteria, unit isolation.",
    tools: [],
    tier: "future",
    color: "#f0f5f0",
    borderColor: "#c0d4c0",
  },
  {
    id: "data",
    label: "Data layer",
    desc: "Standardized open datasets, curated recordings, shared pipelines across labs.",
    tools: ["DANDI", "OpenNeuro", "Allen Brain Obs.", "IBL"],
    tier: "exists",
    color: "#e6f0e6",
    borderColor: "#a0c4a0",
  },
  {
    id: "design",
    label: "Experimental design",
    desc: "Task, species, paradigm, and design rationale. Why center-out reaching in macaques?",
    tools: [],
    tier: "future",
    color: "#f0f5f0",
    borderColor: "#c0d4c0",
  },
]

const TIER_META = {
  proposed: { badge: "THIS ESSAY", badgeColor: "#7a6fa0", badgeBg: "#b8b0d0" },
  exists: { badge: "EXISTS", badgeColor: "#4a8060", badgeBg: "#a0c4a0" },
  future: { badge: "FUTURE WORK", badgeColor: "#999", badgeBg: "#d8d8d4" },
}

const InfrastructureLayers = () => {
  const [hovered, setHovered] = useState(null)

  const W = 800
  const padX = 50
  const padRight = 110
  const padY = 28
  const lW = W - padX - padRight

  const mainH = 68
  const futureH = 44
  const gap = 8
  const futureGap = 5

  const positions = []
  let y = padY
  LAYERS.forEach((l) => {
    const h = l.tier === "future" ? futureH : mainH
    const g = l.tier === "future" ? futureGap : gap
    positions.push({ y, h })
    y += h + g
  })

  const totalH = y + 50

  const grandY = y + 8

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${totalH}`}
        style={{ width: "100%", display: "block" }}
      >
        {/* Bracket: proposed */}
        <line x1={padX + lW + 10} y1={positions[1].y + 4} x2={padX + lW + 10} y2={positions[2].y + positions[2].h - 4} stroke="#b8b0d0" strokeWidth={1.5} />
        <line x1={padX + lW + 6} y1={positions[1].y + 4} x2={padX + lW + 10} y2={positions[1].y + 4} stroke="#b8b0d0" strokeWidth={1.5} />
        <line x1={padX + lW + 6} y1={positions[2].y + positions[2].h - 4} x2={padX + lW + 10} y2={positions[2].y + positions[2].h - 4} stroke="#b8b0d0" strokeWidth={1.5} />
        <text x={padX + lW + 16} y={(positions[1].y + positions[2].y + positions[2].h) / 2 + 4} fontSize={9.5} fontWeight={700} fill="#7a6fa0" letterSpacing="0.03em">PROPOSED</text>

        {/* Bracket: exists */}
        <line x1={padX + lW + 10} y1={positions[4].y + 4} x2={padX + lW + 10} y2={positions[6].y + positions[6].h - 4} stroke="#80b090" strokeWidth={1.5} />
        <line x1={padX + lW + 6} y1={positions[4].y + 4} x2={padX + lW + 10} y2={positions[4].y + 4} stroke="#80b090" strokeWidth={1.5} />
        <line x1={padX + lW + 6} y1={positions[6].y + positions[6].h - 4} x2={padX + lW + 10} y2={positions[6].y + positions[6].h - 4} stroke="#80b090" strokeWidth={1.5} />
        <text x={padX + lW + 16} y={(positions[4].y + positions[6].y + positions[6].h) / 2 + 4} fontSize={9.5} fontWeight={700} fill="#4a8060" letterSpacing="0.03em">EXISTS</text>

        {LAYERS.map((l, i) => {
          const pos = positions[i]
          const isHov = hovered === l.id
          const isFuture = l.tier === "future"
          const tm = TIER_META[l.tier]

          const opacity = isFuture ? (isHov ? 0.75 : 0.5) : (isHov ? 1 : 0.88)
          const sw = isHov ? 2.5 : (isFuture ? 1 : 1.5)
          const dash = l.tier === "proposed" ? "8 4" : (isFuture ? "4 3" : "none")

          const labelSize = isFuture ? 12 : 14.5
          const descSize = isFuture ? 9.5 : 10.5

          return (
            <g
              key={l.id}
              onMouseEnter={() => setHovered(l.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={padX}
                y={pos.y}
                width={lW}
                height={pos.h}
                rx={isFuture ? 4 : 6}
                fill={l.color}
                stroke={l.borderColor}
                strokeWidth={sw}
                strokeDasharray={dash}
                opacity={opacity}
              />

              {!isFuture && (
                <g>
                  <rect
                    x={padX + 10}
                    y={pos.y + 8}
                    width={tm.badge.length * 7 + 14}
                    height={16}
                    rx={3}
                    fill={tm.badgeBg}
                    opacity={0.25}
                  />
                  <text
                    x={padX + 14}
                    y={pos.y + 19}
                    fontSize={8.5}
                    fontWeight={700}
                    fill={tm.badgeColor}
                    letterSpacing="0.04em"
                  >
                    {tm.badge}
                  </text>
                </g>
              )}

              <text
                x={padX + 10}
                y={pos.y + (isFuture ? pos.h / 2 + 1 : 40)}
                fontSize={labelSize}
                fontWeight={isFuture ? 600 : 700}
                fill={isFuture ? "#999" : "#2a2a2a"}
              >
                {l.label}
              </text>

              {(!isFuture || isHov) && (
                <text
                  x={isFuture ? padX + 10 + l.label.length * 7.2 + 12 : padX + 10}
                  y={isFuture ? pos.y + pos.h / 2 + 1 : pos.y + 56}
                  fontSize={descSize}
                  fill="#888"
                >
                  {l.desc}
                </text>
              )}

              {l.tools.length > 0 && (
                <text
                  x={padX + lW - 10}
                  y={pos.y + 40}
                  textAnchor="end"
                  fontSize={10.5}
                  fill="#aaa"
                >
                  {l.tools.join(" · ")}
                </text>
              )}
            </g>
          )
        })}

        {(() => { const cx = padX + lW / 2; return LAYERS.slice(0, -1).map((_, i) => {
          const y1 = positions[i].y + positions[i].h + 1
          const y2 = positions[i + 1].y - 1
          if (y2 - y1 < 4) return null
          return (
            <g key={`arrow-${i}`}>
              <line x1={cx} y1={y1} x2={cx} y2={y2 - 3} stroke="#d4d4d0" strokeWidth={1} />
              <polygon points={`${cx-3},${y2-5} ${cx+3},${y2-5} ${cx},${y2-1}`} fill="#d4d4d0" />
            </g>
          )
        })})()}

        {(() => { const cx = padX + lW / 2; return (<>
        <line x1={padX + 60} y1={grandY} x2={padX + lW - 60} y2={grandY} stroke="#d4d4d0" strokeWidth={1} />
        <text x={cx} y={grandY + 16} textAnchor="middle" fontSize={10} fill="#aaa" fontStyle="italic">
          Grand vision: automatically re-run analyses when new methods or preprocessing choices emerge
        </text>
        <text x={cx} y={grandY + 30} textAnchor="middle" fontSize={9.5} fill="#bbb">
          Each layer depends on the one below it
        </text>
        </>)})()}
      </svg>
    </div>
  )
}

export default InfrastructureLayers
