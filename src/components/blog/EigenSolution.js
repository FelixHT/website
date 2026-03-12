import React, { useState, useMemo } from "react"
import {
  generateData,
  solveCCA,
  centerData,
  mat2InvSqrt,
  mat2Eigen,
  matVecMul,
  computeCov,
  computeCrossCov,
} from "./cca-math"

const W = 800
const H_SINGLE = 320
const H_DOUBLE = 600
const PLOT_R = 120
const PAD = 50
const CX_A = PAD + PLOT_R + 20
const CX_B = W - PAD - PLOT_R - 20
const CY = PAD + PLOT_R + 10
const ROW2_CY = CY + PLOT_R * 2 + 60

const COLOR_A = "#4A7C6F"
const COLOR_B = "#C4963F"
const POINT_R = 2.5
const ARROW_LEN = 80

const STEP_LABELS = [
  "Raw data \u2014 each dataset has its own covariance structure",
  "Whitened \u2014 both datasets now have identity covariance",
  "SVD of whitened cross-covariance reveals the canonical directions",
]

function autoScale(pts, radius) {
  let maxAbs = 0
  for (const [x, y] of pts) {
    if (Math.abs(x) > maxAbs) maxAbs = Math.abs(x)
    if (Math.abs(y) > maxAbs) maxAbs = Math.abs(y)
  }
  return maxAbs > 1e-10 ? (radius * 0.85) / maxAbs : 1
}

function mapPoints(pts, cx, cy, s) {
  return pts.map(([x, y]) => [cx + x * s, cy - y * s])
}

function CovEllipse({ covMatrix, cx, cy, scale, nSigma = 2 }) {
  const { values, vectors } = mat2Eigen(covMatrix)
  // Negate angle to account for SVG y-axis pointing down
  const angle = -Math.atan2(vectors[0][1], vectors[0][0])
  const rx = Math.sqrt(Math.abs(values[0])) * scale * nSigma
  const ry = Math.sqrt(Math.abs(values[1])) * scale * nSigma
  return (
    <ellipse
      cx={cx} cy={cy} rx={rx} ry={ry}
      transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`}
      fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={1} strokeDasharray="4 3"
    />
  )
}

function Arrow({ cx, cy, dx, dy, color, label }) {
  const len = Math.sqrt(dx * dx + dy * dy)
  const nx = len > 1e-10 ? dx / len : 1
  const ny = len > 1e-10 ? dy / len : 0
  const x2 = cx + nx * ARROW_LEN
  const y2 = cy - ny * ARROW_LEN
  const markerId = `ah-${color.replace("#", "")}`
  return (
    <g>
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill={color} />
        </marker>
      </defs>
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={color} strokeWidth={2} markerEnd={`url(#${markerId})`} />
      {label && (
        <text x={x2 + 8} y={y2 - 6} fill={color} fontSize={11} fontFamily="var(--font-mono)" fontWeight={600}>
          {label}
        </text>
      )}
    </g>
  )
}

function PlotClip({ id, cx, cy, r, children }) {
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
    </g>
  )
}

function Axes({ cx, cy, r = PLOT_R }) {
  return (
    <g opacity={0.12}>
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="black" strokeWidth={0.5} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="black" strokeWidth={0.5} />
    </g>
  )
}

export default function EigenSolution() {
  const [step, setStep] = useState(0)

  const baseData = useMemo(() => generateData(80, 0.9, 0.3), [])

  const derived = useMemo(() => {
    const { Xa, Xb } = baseData
    const centA = centerData(Xa)
    const centB = centerData(Xb)
    const cA = centA.centered
    const cB = centB.centered

    const covAA = computeCov(cA)
    const covBB = computeCov(cB)

    const wMatA = mat2InvSqrt(covAA)
    const wMatB = mat2InvSqrt(covBB)

    const whitenedA = cA.map((p) => matVecMul(wMatA, p))
    const whitenedB = cB.map((p) => matVecMul(wMatB, p))

    const crossWhitened = computeCrossCov(whitenedA, whitenedB)
    const cca = solveCCA(Xa, Xb)

    // SVD of whitened cross-covariance
    const MtM = [
      [
        crossWhitened[0][0] * crossWhitened[0][0] + crossWhitened[1][0] * crossWhitened[1][0],
        crossWhitened[0][0] * crossWhitened[0][1] + crossWhitened[1][0] * crossWhitened[1][1],
      ],
      [
        crossWhitened[0][1] * crossWhitened[0][0] + crossWhitened[1][1] * crossWhitened[1][0],
        crossWhitened[0][1] * crossWhitened[0][1] + crossWhitened[1][1] * crossWhitened[1][1],
      ],
    ]
    const eigV = mat2Eigen(MtM)
    const v1 = eigV.vectors[0]
    const v2 = eigV.vectors[1]
    const sigma1 = Math.sqrt(Math.abs(eigV.values[0]))
    const sigma2 = Math.sqrt(Math.abs(eigV.values[1]))

    const u1raw = matVecMul(crossWhitened, v1)
    const u1 = sigma1 > 1e-10 ? [u1raw[0] / sigma1, u1raw[1] / sigma1] : [1, 0]
    const u2raw = matVecMul(crossWhitened, v2)
    const u2 = sigma2 > 1e-10 ? [u2raw[0] / sigma2, u2raw[1] / sigma2] : [0, 1]

    // un-whitened directions
    function inv2(M) {
      const det = M[0][0] * M[1][1] - M[0][1] * M[1][0]
      if (Math.abs(det) < 1e-14) return [[1, 0], [0, 1]]
      return [[M[1][1] / det, -M[0][1] / det], [-M[1][0] / det, M[0][0] / det]]
    }
    const invWA = inv2(wMatA)
    const invWB = inv2(wMatB)

    function norm2(v) {
      const l = Math.sqrt(v[0] * v[0] + v[1] * v[1])
      return l > 1e-10 ? [v[0] / l, v[1] / l] : v
    }

    // scale factors
    const sRawA = autoScale(cA, PLOT_R)
    const sRawB = autoScale(cB, PLOT_R)
    const sWhA = autoScale(whitenedA, PLOT_R)
    const sWhB = autoScale(whitenedB, PLOT_R)

    return {
      cA, cB, covAA, covBB, whitenedA, whitenedB, cca,
      u1, u2, v1, v2, sigma1, sigma2,
      origDirA1: norm2(matVecMul(invWA, u1)),
      origDirA2: norm2(matVecMul(invWA, u2)),
      origDirB1: norm2(matVecMul(invWB, v1)),
      origDirB2: norm2(matVecMul(invWB, v2)),
      sRawA, sRawB, sWhA, sWhB,
    }
  }, [baseData])

  // point positions per step
  const pointsA = useMemo(() => {
    const s = step === 0 ? derived.sRawA : derived.sWhA
    const pts = step === 0 ? derived.cA : derived.whitenedA
    return mapPoints(pts, CX_A, CY, s)
  }, [step, derived])

  const pointsB = useMemo(() => {
    const s = step === 0 ? derived.sRawB : derived.sWhB
    const pts = step === 0 ? derived.cB : derived.whitenedB
    return mapPoints(pts, CX_B, CY, s)
  }, [step, derived])

  const origPointsA = useMemo(() => mapPoints(derived.cA, CX_A, ROW2_CY, derived.sRawA), [derived])
  const origPointsB = useMemo(() => mapPoints(derived.cB, CX_B, ROW2_CY, derived.sRawB), [derived])

  const showSecondRow = step === 2
  const svgH = showSecondRow ? H_DOUBLE : H_SINGLE

  return (
    <div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, margin: "0 0 8px", minHeight: "2.4em", textAlign: "center" }}>
        <strong>Step {step + 1}:</strong> {STEP_LABELS[step]}
      </p>

      <svg viewBox={`0 0 ${W} ${svgH}`} style={{ display: "block", width: "100%", height: "auto", overflow: "hidden" }}>
        {/* top row */}
        <Axes cx={CX_A} cy={CY} />
        <Axes cx={CX_B} cy={CY} />

        <text x={CX_A} y={CY - PLOT_R - 10} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fill={COLOR_A}>
          {step === 0 ? "Xa (centered)" : "Xa (whitened)"}
        </text>
        <text x={CX_B} y={CY - PLOT_R - 10} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fill={COLOR_B}>
          {step === 0 ? "Xb (centered)" : "Xb (whitened)"}
        </text>

        {/* covariance ellipses */}
        {step === 0 && (
          <>
            <CovEllipse covMatrix={derived.covAA} cx={CX_A} cy={CY} scale={derived.sRawA} />
            <CovEllipse covMatrix={derived.covBB} cx={CX_B} cy={CY} scale={derived.sRawB} />
          </>
        )}
        {step >= 1 && (
          <>
            <ellipse cx={CX_A} cy={CY} rx={derived.sWhA} ry={derived.sWhA} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={1} strokeDasharray="4 3" />
            <ellipse cx={CX_B} cy={CY} rx={derived.sWhB} ry={derived.sWhB} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={1} strokeDasharray="4 3" />
          </>
        )}

        {/* points - clipped to plot area */}
        <PlotClip id="clip-a" cx={CX_A} cy={CY} r={PLOT_R}>
          {pointsA.map(([x, y], i) => (
            <circle key={`a-${i}`} cx={x} cy={y} r={POINT_R} fill={COLOR_A} opacity={0.7} style={{ transition: "cx 0.6s ease, cy 0.6s ease" }} />
          ))}
        </PlotClip>
        <PlotClip id="clip-b" cx={CX_B} cy={CY} r={PLOT_R}>
          {pointsB.map(([x, y], i) => (
            <circle key={`b-${i}`} cx={x} cy={y} r={POINT_R} fill={COLOR_B} opacity={0.7} style={{ transition: "cx 0.6s ease, cy 0.6s ease" }} />
          ))}
        </PlotClip>

        {/* step 1: identity annotation */}
        {step === 1 && (
          <>
            <text x={CX_A} y={CY + PLOT_R + 20} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="rgba(0,0,0,0.4)">
              {"Σ\u0303 = I"}
            </text>
            <text x={CX_B} y={CY + PLOT_R + 20} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="rgba(0,0,0,0.4)">
              {"Σ\u0303 = I"}
            </text>
          </>
        )}

        {/* step 2: SVD directions on whitened + original-space below */}
        {step === 2 && (
          <>
            <Arrow cx={CX_A} cy={CY} dx={derived.u1[0]} dy={derived.u1[1]} color="#d9534f" label={"u\u2081"} />
            <Arrow cx={CX_A} cy={CY} dx={derived.u2[0]} dy={derived.u2[1]} color="#5bc0de" label={"u\u2082"} />
            <Arrow cx={CX_B} cy={CY} dx={derived.v1[0]} dy={derived.v1[1]} color="#d9534f" label={"v\u2081"} />
            <Arrow cx={CX_B} cy={CY} dx={derived.v2[0]} dy={derived.v2[1]} color="#5bc0de" label={"v\u2082"} />

            <text x={W / 2} y={CY + PLOT_R + 20} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fill="rgba(0,0,0,0.5)">
              {`\u03C1\u2081 = ${derived.sigma1.toFixed(2)}    \u03C1\u2082 = ${derived.sigma2.toFixed(2)}`}
            </text>

            {/* second row: original-space */}
            <text x={W / 2} y={ROW2_CY - PLOT_R - 24} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fill="rgba(0,0,0,0.45)">
              Canonical directions in original space
            </text>

            <Axes cx={CX_A} cy={ROW2_CY} />
            <Axes cx={CX_B} cy={ROW2_CY} />

            <text x={CX_A} y={ROW2_CY - PLOT_R - 10} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fill={COLOR_A}>
              Xa (original)
            </text>
            <text x={CX_B} y={ROW2_CY - PLOT_R - 10} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fill={COLOR_B}>
              Xb (original)
            </text>

            <CovEllipse covMatrix={derived.covAA} cx={CX_A} cy={ROW2_CY} scale={derived.sRawA} />
            <CovEllipse covMatrix={derived.covBB} cx={CX_B} cy={ROW2_CY} scale={derived.sRawB} />

            <PlotClip id="clip-oa" cx={CX_A} cy={ROW2_CY} r={PLOT_R}>
              {origPointsA.map(([x, y], i) => (
                <circle key={`oa-${i}`} cx={x} cy={y} r={POINT_R} fill={COLOR_A} opacity={0.35} />
              ))}
            </PlotClip>
            <PlotClip id="clip-ob" cx={CX_B} cy={ROW2_CY} r={PLOT_R}>
              {origPointsB.map(([x, y], i) => (
                <circle key={`ob-${i}`} cx={x} cy={y} r={POINT_R} fill={COLOR_B} opacity={0.35} />
              ))}
            </PlotClip>

            <Arrow cx={CX_A} cy={ROW2_CY} dx={derived.origDirA1[0]} dy={derived.origDirA1[1]} color="#d9534f" label={"w\u2081"} />
            <Arrow cx={CX_A} cy={ROW2_CY} dx={derived.origDirA2[0]} dy={derived.origDirA2[1]} color="#5bc0de" label={"w\u2082"} />
            <Arrow cx={CX_B} cy={ROW2_CY} dx={derived.origDirB1[0]} dy={derived.origDirB1[1]} color="#d9534f" label={"w\u2081"} />
            <Arrow cx={CX_B} cy={ROW2_CY} dx={derived.origDirB2[0]} dy={derived.origDirB2[1]} color="#5bc0de" label={"w\u2082"} />
          </>
        )}
      </svg>

      {/* navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 14, userSelect: "none" }}>
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ background: "none", border: "1px solid rgba(0,0,0,0.2)", borderRadius: 4, padding: "4px 12px", cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.35 : 1, fontFamily: "var(--font-mono)", fontSize: 13 }}>
          &larr; Prev
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <span key={i} onClick={() => setStep(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setStep(i) }} style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: i === step ? "#333" : "transparent", border: "1.5px solid #333", cursor: "pointer", transition: "background 0.3s" }} aria-label={`Go to step ${i + 1}`} />
          ))}
        </div>
        <button onClick={() => setStep((s) => Math.min(2, s + 1))} disabled={step === 2} style={{ background: "none", border: "1px solid rgba(0,0,0,0.2)", borderRadius: 4, padding: "4px 12px", cursor: step === 2 ? "default" : "pointer", opacity: step === 2 ? 0.35 : 1, fontFamily: "var(--font-mono)", fontSize: 13 }}>
          Next &rarr;
        </button>
      </div>
    </div>
  )
}
