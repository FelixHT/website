import React, { useState, useMemo, useCallback } from "react"
import { scaleLinear } from "d3-scale"
import { defaultSystem, simulateStateSpace } from "./psid-math"

const W = 800
const H = 380
const VENN_CX = 180
const VENN_CY = 175
const TRACES_X = 390
const TRACES_W = 380
const MARGIN_TOP = 20
const T_STEPS = 300

const COLOR_LATENT = "#4A90D9"
const COLOR_BEHAVIOR = "#D4783C"
const COLOR_OBS = "#4A7C6F"
const COLOR_IRR = "#999999"
const COLOR_UNENCODED = "#C5B8A8"

const METHODS = [
  {
    id: "ndm",
    label: "NDM (SID)",
    desc: "Uses only neural activity Y",
    captures: [0, 1, 2], // all 3 latent dims
    input: "obs",
  },
  {
    id: "psid",
    label: "PSID",
    desc: "Uses both Y and behavior Z",
    captures: [0, 1], // only relevant dims
    input: "both",
  },
  {
    id: "rm",
    label: "Regression",
    desc: "Uses only behavior Z",
    captures: "behavior", // only the behavioral signal directly
    input: "behavior",
  },
]

const DIM_LABELS = ["x₁ (rel)", "x₂ (rel)", "x₃ (irr)"]
const DIM_COLORS = [COLOR_BEHAVIOR, COLOR_BEHAVIOR, COLOR_IRR]

export default function SubspacePartition() {
  const [selected, setSelected] = useState("psid")
  const [seed, setSeed] = useState(1)

  const { X, Y, Z } = useMemo(() => {
    const sys = defaultSystem()
    return simulateStateSpace(sys.A, sys.C, sys.L, T_STEPS, { seed })
  }, [seed])

  const method = METHODS.find(m => m.id === selected)

  // Time-series scales
  const sx = useMemo(
    () => scaleLinear().domain([0, T_STEPS - 1]).range([0, TRACES_W]),
    []
  )

  // Per-trace scales for latent dims
  const latentScales = useMemo(() => {
    return [0, 1, 2].map(d => {
      const vals = X.map(r => r[d])
      const mn = Math.min(...vals), mx = Math.max(...vals)
      const pad = (mx - mn) * 0.1 || 1
      return scaleLinear().domain([mn - pad, mx + pad]).range([38, 2])
    })
  }, [X])

  // Behavior trace scale
  const zScale = useMemo(() => {
    const vals = Z.map(r => r[0])
    const mn = Math.min(...vals), mx = Math.max(...vals)
    const pad = (mx - mn) * 0.1 || 1
    return scaleLinear().domain([mn - pad, mx + pad]).range([38, 2])
  }, [Z])

  // Observed neuron scales (just show 3 of 6)
  const obsScales = useMemo(() => {
    return [0, 1, 2].map(ch => {
      const vals = Y.map(r => r[ch])
      const mn = Math.min(...vals), mx = Math.max(...vals)
      const pad = (mx - mn) * 0.1 || 1
      return scaleLinear().domain([mn - pad, mx + pad]).range([38, 2])
    })
  }, [Y])

  // Determine which dims are highlighted
  const isDimActive = useCallback((d) => {
    if (!method) return true
    if (method.captures === "behavior") return false
    return method.captures.includes(d)
  }, [method])

  const isBehaviorActive = method?.input === "behavior" || method?.input === "both"
  const isObsActive = method?.input === "obs" || method?.input === "both"

  const handleRegenerate = useCallback(() => setSeed(s => s + 1), [])

  // Build trace paths
  const buildPath = (data, accessor, scaleY) =>
    data.map((r, t) => `${t === 0 ? "M" : "L"}${sx(t)},${scaleY(accessor(r))}`).join(" ")

  // Venn diagram regions
  const outerR = 130 // full brain latent space
  const encodedR = 100 // encoded in Y
  const relevantR = 55 // relevant to Z
  const encodedCx = VENN_CX + 10
  const encodedCy = VENN_CY + 5
  const relevantCx = VENN_CX + 30
  const relevantCy = VENN_CY + 20

  // Highlight regions based on selected method
  const getRegionFill = (region) => {
    if (!method) return "none"
    if (selected === "ndm") {
      return region === "encoded" || region === "relevant" ? `${COLOR_OBS}18` : "none"
    }
    if (selected === "psid") {
      return region === "relevant" ? `${COLOR_BEHAVIOR}22` : "none"
    }
    if (selected === "rm") {
      return region === "relevant" ? `${COLOR_BEHAVIOR}12` : "none"
    }
    return "none"
  }

  const getRegionStroke = (region) => {
    if (selected === "ndm" && (region === "encoded")) return COLOR_OBS
    if (selected === "psid" && region === "relevant") return COLOR_BEHAVIOR
    if (selected === "rm" && region === "relevant") return COLOR_BEHAVIOR
    return "none"
  }

  // Trace row layout
  const TRACE_ROWS = [
    // Latent dims
    { type: "latent", dim: 0, label: "x₁", color: COLOR_BEHAVIOR },
    { type: "latent", dim: 1, label: "x₂", color: COLOR_BEHAVIOR },
    { type: "latent", dim: 2, label: "x₃", color: COLOR_IRR },
    // Separator
    { type: "obs", dim: 0, label: "y₁", color: COLOR_OBS },
    { type: "obs", dim: 1, label: "y₂", color: COLOR_OBS },
    // Behavior
    { type: "behavior", dim: 0, label: "z", color: COLOR_BEHAVIOR },
  ]
  const ROW_H = 42
  const ROW_GAP = 4
  const GROUP_GAP = 12

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        {/* Venn diagram */}
        <g transform={`translate(0, ${MARGIN_TOP})`}>
          {/* Outer: full brain latent space */}
          <ellipse
            cx={VENN_CX} cy={VENN_CY}
            rx={outerR} ry={outerR * 0.85}
            fill={`${COLOR_UNENCODED}15`}
            stroke={COLOR_UNENCODED}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={0.6}
          />
          <text
            x={VENN_CX - outerR + 12} y={VENN_CY - outerR * 0.85 + 16}
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "#999" }}
          >
            Full latent space
          </text>

          {/* Encoded in Y */}
          <ellipse
            cx={encodedCx} cy={encodedCy}
            rx={encodedR} ry={encodedR * 0.82}
            fill={selected === "ndm" ? `${COLOR_OBS}12` : "none"}
            stroke={selected === "ndm" ? COLOR_OBS : `${COLOR_OBS}60`}
            strokeWidth={selected === "ndm" ? 2.5 : 1.2}
            strokeDasharray={selected === "ndm" ? "none" : "4 3"}
          />
          {selected === "ndm" && (
            <text
              x={encodedCx} y={encodedCy - encodedR * 0.82 + 16}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: COLOR_OBS, fontWeight: 600 }}
            >
              NDM captures this
            </text>
          )}

          {/* Relevant to behavior */}
          <ellipse
            cx={relevantCx} cy={relevantCy}
            rx={relevantR} ry={relevantR * 0.8}
            fill={selected === "psid" || selected === "rm" ? `${COLOR_BEHAVIOR}15` : "none"}
            stroke={selected === "psid" ? COLOR_BEHAVIOR : (selected === "rm" ? COLOR_BEHAVIOR : `${COLOR_BEHAVIOR}50`)}
            strokeWidth={selected === "psid" || selected === "rm" ? 2.5 : 1.2}
            strokeDasharray={selected === "psid" || selected === "rm" ? "none" : "4 3"}
          />
          {selected === "psid" && (
            <text
              x={relevantCx} y={relevantCy - 4}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: COLOR_BEHAVIOR, fontWeight: 600 }}
            >
              PSID captures
            </text>
          )}
          {selected === "psid" && (
            <text
              x={relevantCx} y={relevantCy + 8}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: COLOR_BEHAVIOR, fontWeight: 600 }}
            >
              this
            </text>
          )}
          {selected === "rm" && (
            <text
              x={relevantCx} y={relevantCy + 2}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: COLOR_BEHAVIOR, fontWeight: 600 }}
            >
              RM reads this
            </text>
          )}

          {/* Labels inside Venn regions */}
          {selected !== "ndm" && (
            <text
              x={encodedCx - 35} y={encodedCy - 35}
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: COLOR_IRR }}
            >
              Irrelevant
            </text>
          )}
          {selected !== "psid" && selected !== "rm" && (
            <text
              x={relevantCx} y={relevantCy + 2}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: `${COLOR_BEHAVIOR}99` }}
            >
              Relevant
            </text>
          )}

          {/* Unencoded label */}
          <text
            x={VENN_CX - outerR + 8} y={VENN_CY + outerR * 0.85 - 8}
            style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fill: "#bbb" }}
          >
            Not in recordings
          </text>

          {/* Mini trace sketches inside regions */}
          {/* Relevant traces (x1, x2) inside the inner ellipse */}
          {[0, 1].map(d => {
            const yOff = relevantCy + 14 + d * 14
            const miniSx = scaleLinear().domain([0, 60]).range([relevantCx - 30, relevantCx + 30])
            const vals = X.slice(0, 60).map(r => r[d])
            const mn = Math.min(...vals), mx = Math.max(...vals)
            const miniSy = scaleLinear().domain([mn, mx]).range([yOff + 5, yOff - 5])
            const path = vals.map((v, t) => `${t === 0 ? "M" : "L"}${miniSx(t)},${miniSy(v)}`).join(" ")
            return (
              <path key={d} d={path} fill="none"
                stroke={COLOR_BEHAVIOR}
                strokeWidth={0.8}
                opacity={selected === "ndm" ? 0.4 : 0.6}
              />
            )
          })}
          {/* Irrelevant trace (x3) in the encoded but not relevant region */}
          {(() => {
            const yOff = encodedCy - 20
            const xOff = encodedCx - 50
            const miniSx = scaleLinear().domain([0, 60]).range([xOff - 25, xOff + 25])
            const vals = X.slice(0, 60).map(r => r[2])
            const mn = Math.min(...vals), mx = Math.max(...vals)
            const miniSy = scaleLinear().domain([mn, mx]).range([yOff + 5, yOff - 5])
            const path = vals.map((v, t) => `${t === 0 ? "M" : "L"}${miniSx(t)},${miniSy(v)}`).join(" ")
            return (
              <path d={path} fill="none"
                stroke={COLOR_IRR}
                strokeWidth={0.8}
                opacity={selected === "psid" || selected === "rm" ? 0.25 : 0.6}
              />
            )
          })()}
        </g>

        {/* Right panel: time-series */}
        <g transform={`translate(${TRACES_X}, ${MARGIN_TOP + 8})`}>
          <text
            x={TRACES_W / 2} y={-2}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#666" }}
          >
            Simulated signals
          </text>

          {/* Latent states */}
          {[0, 1, 2].map(d => {
            const yOff = d * (ROW_H + ROW_GAP) + 10
            const active = isDimActive(d)
            const path = buildPath(X, r => r[d], latentScales[d])
            return (
              <g key={`lat-${d}`} transform={`translate(0, ${yOff})`} opacity={active ? 1 : 0.15}>
                <path d={path} fill="none" stroke={DIM_COLORS[d]} strokeWidth={1} />
                <text
                  x={-6} y={ROW_H / 2}
                  textAnchor="end" dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: active ? DIM_COLORS[d] : "#ccc" }}
                >
                  {DIM_LABELS[d]}
                </text>
              </g>
            )
          })}

          {/* Separator line */}
          {(() => {
            const sepY = 3 * (ROW_H + ROW_GAP) + 10 + GROUP_GAP / 2
            return <line x1={0} y1={sepY} x2={TRACES_W} y2={sepY} stroke="#ddd" strokeWidth={0.5} />
          })()}

          {/* Observed neurons (2 of 6) */}
          {[0, 1].map((ch, i) => {
            const yOff = 3 * (ROW_H + ROW_GAP) + GROUP_GAP + i * (ROW_H + ROW_GAP) + 10
            const path = buildPath(Y, r => r[ch], obsScales[ch])
            return (
              <g key={`obs-${ch}`} transform={`translate(0, ${yOff})`} opacity={isObsActive ? 1 : 0.15}>
                <path d={path} fill="none" stroke={COLOR_OBS} strokeWidth={0.8} opacity={0.7} />
                <text
                  x={-6} y={ROW_H / 2}
                  textAnchor="end" dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: isObsActive ? COLOR_OBS : "#ccc" }}
                >
                  {`y${ch + 1}`}
                </text>
              </g>
            )
          })}

          {/* Behavior */}
          {(() => {
            const yOff = 5 * (ROW_H + ROW_GAP) + GROUP_GAP * 2 + 10
            const path = buildPath(Z, r => r[0], zScale)
            return (
              <g transform={`translate(0, ${yOff})`} opacity={isBehaviorActive ? 1 : 0.15}>
                <path d={path} fill="none" stroke={COLOR_BEHAVIOR} strokeWidth={1} />
                <text
                  x={-6} y={ROW_H / 2}
                  textAnchor="end" dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: isBehaviorActive ? COLOR_BEHAVIOR : "#ccc" }}
                >
                  z
                </text>
              </g>
            )
          })()}
        </g>
      </svg>

      {/* Controls */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
        marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "#666"
      }}>
        {METHODS.map(m => (
          <button
            key={m.id}
            onClick={() => setSelected(m.id)}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
              background: selected === m.id ? "#333" : "#f4f3f0",
              color: selected === m.id ? "#fff" : "#555",
              border: `1px solid ${selected === m.id ? "#333" : "#ccc9c2"}`,
              borderRadius: 4, padding: "5px 14px",
              transition: "all 0.15s ease",
            }}
          >
            {m.label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>
          {method?.desc}
        </span>
        <button
          onClick={handleRegenerate}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
            background: "#f4f3f0", border: "1px solid #ccc9c2", borderRadius: 4,
            padding: "4px 14px", color: "#555", marginLeft: "auto",
          }}
        >
          Regenerate
        </button>
      </div>
    </div>
  )
}
