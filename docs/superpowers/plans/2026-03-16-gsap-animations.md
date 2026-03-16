# GSAP Animations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add choreographed GSAP animations to 5 LFADS blog post figure components — making each figure's pedagogy come alive through narrative animation.

**Architecture:** Install `gsap` as a dependency. Each of the 5 figure components manages its own GSAP timelines using refs and `useEffect` cleanup. All animations target SVG attributes on existing elements via `data-*` attributes and class names for GSAP targeting.

**Tech Stack:** GSAP 3 (core only), React 18, SVG

**Spec:** `docs/superpowers/specs/2026-03-16-gsap-animations-design.md`

---

## Chunk 1: Foundation + RNNUnrolled

### Task 1: Install GSAP

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install gsap**

```bash
npm install gsap
```

Verify it appears in `package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(lfads): install gsap dependency"
```

### Task 2: RNNUnrolled — Cascade Fill Animation

**Files:**
- Modify: `src/components/blog/RNNUnrolled.js`

The current component uses `useState(currentStep)` and renders based on step. Add GSAP timelines for step transitions with cascade fill, typing reveal, and gradient sweep.

- [ ] **Step 1: Add GSAP imports, refs, and data attributes**

Add imports:
```js
import { useRef, useEffect, useCallback } from "react"
import gsap from "gsap"
```

Add `const svgRef = useRef(null)` and attach `ref={svgRef}` to the `<svg>`.
Add `const mainTlRef = useRef(null)` for the cumulative step timeline.

Add these attributes to existing SVG elements:
- Boxes: `className="rnn-box"` + `data-step={t}`
- Input arrows: `className="rnn-input-arrow"` + `data-step={t}`
- Recurrent arrows: `className="rnn-recur-arrow"` + `data-step={t}`
- Arrow heads: `className="rnn-arrow-head"` + `data-step={t}`
- Input value text: `className="rnn-input-val"` + `data-step={t}`
- Box value text: `className="rnn-box-val"` + `data-step={t}`
- Gradient arrows: `className="rnn-grad-arrow"` + `data-step={t}`

Add a clip-path rect inside each box for the fill sweep:
```jsx
<defs>
  <clipPath id={`box-fill-${t}`}>
    <rect className="rnn-fill-clip" data-step={t} x={0} y={0} width={0} height={BOX_H} />
  </clipPath>
</defs>
<rect className="rnn-fill-bg" data-step={t}
  x={0} y={0} width={BOX_W} height={BOX_H}
  fill={COLOR_ACTIVE} clipPath={`url(#box-fill-${t})`} />
```

Add a computation text element above each box with its own clip-path for the typing reveal:
```jsx
<defs>
  <clipPath id={`comp-clip-${t}`}>
    <rect className="rnn-comp-clip" data-step={t} x={0} y={-20} width={0} height={20} />
  </clipPath>
</defs>
<text className="rnn-comp-text" data-step={t}
  clipPath={`url(#comp-clip-${t})`}
  x={BOX_W/2} y={-8} textAnchor="middle"
  style={{ fontFamily: FONT, fontSize: 7, fill: "#999" }}>
  tanh(Wh·h + Wx·x + b)
</text>
```

- [ ] **Step 2: Set initial hidden state on mount**

```js
useEffect(() => {
  const svg = svgRef.current
  if (!svg) return
  gsap.set(svg.querySelectorAll(".rnn-box-val, .rnn-input-val"), { opacity: 0 })
  gsap.set(svg.querySelectorAll(".rnn-fill-clip, .rnn-comp-clip"), { width: 0 })
  gsap.set(svg.querySelectorAll(".rnn-grad-arrow"), { opacity: 0 })
}, [])
```

- [ ] **Step 3: Build cumulative step timeline**

Build one master timeline that accumulates all steps. Each "Next step" click advances by adding the next step's animation segment:

```js
const animateStep = useCallback((step) => {
  const svg = svgRef.current
  if (!svg) return

  // Kill any running animation for clean state
  if (mainTlRef.current) mainTlRef.current.kill()

  // Build a new timeline for this step
  const tl = gsap.timeline({ onComplete: () => setCurrentStep(step) })

  // 1. Input arrow brightens (0-200ms)
  tl.to(svg.querySelector(`.rnn-input-arrow[data-step="${step}"]`),
    { stroke: "#4A7C6F", duration: 0.2 }, 0)
  tl.to(svg.querySelector(`.rnn-input-val[data-step="${step}"]`),
    { opacity: 1, duration: 0.15 }, 0.05)

  // 2. Box fill sweep (200-700ms)
  tl.to(svg.querySelector(`.rnn-fill-clip[data-step="${step}"]`),
    { width: BOX_W, duration: 0.5, ease: "power2.out" }, 0.2)

  // 3. Computation text typing reveal via clip rect (200-600ms)
  // Measure the text width, animate clip rect to reveal left-to-right
  const compText = svg.querySelector(`.rnn-comp-text[data-step="${step}"]`)
  const compTextWidth = compText ? compText.getBBox().width + 10 : BOX_W
  tl.to(svg.querySelector(`.rnn-comp-clip[data-step="${step}"]`),
    { width: compTextWidth, duration: 0.4, ease: "none" }, 0.2)

  // 4. Value appears, computation text hides (700-900ms)
  tl.to(svg.querySelector(`.rnn-box-val[data-step="${step}"]`),
    { opacity: 1, duration: 0.2 }, 0.7)
  tl.to(svg.querySelector(`.rnn-comp-clip[data-step="${step}"]`),
    { width: 0, duration: 0.15 }, 0.75)

  // 5. Recurrent arrow push (900-1200ms)
  if (step < T) {
    tl.to(svg.querySelector(`.rnn-recur-arrow[data-step="${step}"]`),
      { stroke: COLOR_HL, duration: 0.15 }, 0.9)
    const arrowHead = svg.querySelector(`.rnn-arrow-head[data-step="${step}"]`)
    if (arrowHead) {
      tl.to(arrowHead, {
        scale: 1.2, transformOrigin: "center center",
        duration: 0.15, yoyo: true, repeat: 1
      }, 0.95)
    }
  }

  // 6. Dim previous step (1200-1500ms)
  if (step > 0) {
    tl.to(svg.querySelectorAll(
      `.rnn-box[data-step="${step-1}"], .rnn-input-arrow[data-step="${step-1}"], .rnn-input-val[data-step="${step-1}"]`
    ), { opacity: 0.4, duration: 0.3 }, 1.2)
  }

  // 7. If this was the final step, trigger gradient sweep
  if (step === T) {
    const arrows = Array.from(svg.querySelectorAll(".rnn-grad-arrow")).reverse()
    tl.fromTo(arrows,
      { opacity: 0, strokeWidth: 0 },
      {
        opacity: 1,
        strokeWidth: (i) => 1 + 2 * (gradientNorms[T - 1 - i] / Math.max(...gradientNorms)),
        duration: 0.2, stagger: 0.05, ease: "power2.out"
      }, 1.5)
  }

  mainTlRef.current = tl
}, [gradientNorms])
```

Update the "Next step" button `onClick` to call `animateStep(currentStep + 1)`.

- [ ] **Step 4: Add reset with reverse playback**

The spec says: "Reset plays timeline in reverse at 2x speed." Use the master timeline's `.reverse()`:

```js
const handleReset = useCallback(() => {
  const svg = svgRef.current
  if (!svg || !mainTlRef.current) return

  // Build a quick reverse-out animation (not true reverse of the step sequence,
  // since the master timeline only holds the last step)
  const tl = gsap.timeline({ onComplete: () => setCurrentStep(-1) })
  tl.to(svg.querySelectorAll(".rnn-box-val, .rnn-input-val"), { opacity: 0, duration: 0.3 }, 0)
  tl.to(svg.querySelectorAll(".rnn-fill-clip, .rnn-comp-clip"), { width: 0, duration: 0.3 }, 0)
  tl.to(svg.querySelectorAll(".rnn-grad-arrow"), { opacity: 0, duration: 0.2 }, 0)
  tl.to(svg.querySelectorAll(".rnn-input-arrow, .rnn-recur-arrow"),
    { stroke: COLOR_BORDER, opacity: 1, duration: 0.3 }, 0)
  tl.to(svg.querySelectorAll(".rnn-box"), { opacity: 1, duration: 0.2 }, 0)
  tl.timeScale(2) // 2x speed
  mainTlRef.current = tl
}, [])
```

- [ ] **Step 5: Verify and commit**

Run `npm run build` to verify no errors.

```bash
git add src/components/blog/RNNUnrolled.js
git commit -m "feat(lfads): add cascade fill animation to RNNUnrolled"
```

---

## Chunk 2: LFADSTeaser + VanishingGradientExplorer

### Task 3: LFADSTeaser — Pipeline Reveal Animation

**Files:**
- Modify: `src/components/blog/LFADSTeaser.js`

- [ ] **Step 1: Add GSAP imports, ref, and data attributes**

Add imports:
```js
import { useRef, useEffect, useLayoutEffect, useCallback } from "react"
import gsap from "gsap"
```

Add `const svgRef = useRef(null)` and `const revealTlRef = useRef(null)`.

Add data attributes to SVG elements:
- Group raster ticks by time bin: `<g className="teaser-raster-col" data-col={t}>`
- Trajectory paths: `className="teaser-traj-path"`
- Start markers: `className="teaser-traj-start"`
- End markers: `className="teaser-traj-end"`
- Smoothed spike paths: `className="teaser-rate-bg"`
- Rate curves: `className="teaser-rate-curve"`

- [ ] **Step 2: Set initial hidden state**

Use `useLayoutEffect` with SSR guard to prevent flash of unstyled content:

```js
useLayoutEffect(() => {
  if (typeof window === "undefined") return
  const svg = svgRef.current
  if (!svg) return
  gsap.set(svg.querySelectorAll(".teaser-raster-col"), { opacity: 0 })
  // For paths, use function form to get each element's own length
  const allPaths = svg.querySelectorAll(".teaser-traj-path, .teaser-rate-bg, .teaser-rate-curve")
  allPaths.forEach(p => {
    const len = p.getTotalLength()
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len })
  })
  gsap.set(svg.querySelectorAll(".teaser-traj-start, .teaser-traj-end"), { scale: 0, transformOrigin: "center" })
}, [taskData])
```

- [ ] **Step 3: Build the pipeline reveal timeline**

```js
const playReveal = useCallback(() => {
  const svg = svgRef.current
  if (!svg) return
  if (revealTlRef.current) revealTlRef.current.kill()

  const tl = gsap.timeline()

  // Phase 1: Rasters sweep L→R (0-1000ms)
  tl.to(svg.querySelectorAll(".teaser-raster-col"),
    { opacity: 0.65, duration: 0.05, stagger: 0.01 }, 0)

  // Phase 2: Pause (1000-1200ms) — implicit via position

  // Phase 3: Trajectories draw (1200-2200ms)
  tl.to(svg.querySelectorAll(".teaser-traj-path"),
    { strokeDashoffset: 0, duration: 0.8, stagger: 0.06, ease: "power2.inOut" }, 1.2)
  tl.to(svg.querySelectorAll(".teaser-traj-start"),
    { scale: 1, duration: 0.2, stagger: 0.06, ease: "back.out(2)" }, 1.2)
  tl.to(svg.querySelectorAll(".teaser-traj-end"),
    { scale: 1, duration: 0.2, stagger: 0.06 }, 1.9)

  // Phase 4: Rates (2200-3000ms)
  tl.to(svg.querySelectorAll(".teaser-rate-bg"),
    { strokeDashoffset: 0, opacity: 0.5, duration: 0.3 }, 2.2)
  tl.to(svg.querySelectorAll(".teaser-rate-curve"),
    { strokeDashoffset: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }, 2.4)

  revealTlRef.current = tl
}, [taskData])
```

- [ ] **Step 4: Trigger reveal and handle regenerate**

Single `useEffect` keyed on `taskData` (avoids double-trigger on mount):

```js
const mountedRef = useRef(false)

useEffect(() => {
  if (!mountedRef.current) {
    // First mount — slight delay for layout
    mountedRef.current = true
    const id = setTimeout(playReveal, 100)
    return () => clearTimeout(id)
  }
  // Subsequent changes (regenerate) — play immediately
  playReveal()
}, [taskData, playReveal])
```

Update `handleRegenerate` to fade out animated elements specifically (not `g > *`):

```js
const handleRegenerate = useCallback(() => {
  const svg = svgRef.current
  if (!svg) return
  if (revealTlRef.current) revealTlRef.current.kill()
  gsap.to(svg.querySelectorAll(
    ".teaser-raster-col, .teaser-traj-path, .teaser-traj-start, .teaser-traj-end, .teaser-rate-bg, .teaser-rate-curve"
  ), { opacity: 0, duration: 0.2, onComplete: () => setSeed(s => s + 1) })
}, [])
```

- [ ] **Step 5: Commit**

```bash
git add src/components/blog/LFADSTeaser.js
git commit -m "feat(lfads): add pipeline reveal animation to LFADSTeaser"
```

### Task 4: VanishingGradientExplorer — Domino Cascade Animation

**Files:**
- Modify: `src/components/blog/VanishingGradientExplorer.js`

- [ ] **Step 1: Add GSAP imports, refs, and data attributes**

Add:
```js
import { useRef, useEffect } from "react"
import gsap from "gsap"
```

Add `const svgRef = useRef(null)`, `const ratioRef = useRef(null)`.
Add `const prevGradsRef = useRef(null)`, `const prevLenRef = useRef(null)`.

Add data attributes:
- Each bar: `className="vg-bar"` + `data-idx={t}`
- Each bottom-graph arrow: `className="vg-graph-arrow"` + `data-idx={t}`
- Ratio text element: `ref={ratioRef}`

- [ ] **Step 2: Build single unified animation effect**

One `useEffect` handles both mode toggle and length change to avoid race conditions:

```js
useEffect(() => {
  const svg = svgRef.current
  if (!svg) return

  // First render — store initial values, no animation
  if (!prevGradsRef.current) {
    prevGradsRef.current = [...gradientNorms]
    prevLenRef.current = seqLen
    return
  }

  const prevLen = prevLenRef.current
  const prevGrads = prevGradsRef.current

  // Kill any running animations on these elements
  gsap.killTweensOf(svg.querySelectorAll(".vg-bar, .vg-graph-arrow"))

  // Handle new/removed bars from length change
  if (seqLen > prevLen) {
    const newBars = Array.from(svg.querySelectorAll(".vg-bar"))
      .filter(b => parseInt(b.dataset.idx) >= prevLen)
    gsap.fromTo(newBars,
      { scaleY: 0, transformOrigin: "bottom" },
      { scaleY: 1, duration: 0.2, stagger: 0.04 })
  }

  // Domino cascade: bars animate R→L to new heights
  const bars = Array.from(svg.querySelectorAll(".vg-bar")).reverse()
  bars.forEach((bar, i) => {
    const realIdx = gradientNorms.length - 1 - i
    const newNorm = gradientNorms[realIdx]
    const oldNorm = prevGrads[realIdx] || 0
    const newBarY = barSy(Math.max(newNorm, 1e-15))
    const newBarHeight = CHART_H - newBarY + MARGIN.top

    gsap.to(bar, {
      attr: { y: newBarY, height: Math.max(0, newBarHeight) },
      fill: gradColor(realIdx),
      duration: 0.3,
      delay: i * 0.03,
      ease: newNorm > oldNorm ? "back.out(1.2)" : "power2.out"
    })
  })

  // Bottom graph arrows: fade-swap colors
  const arrows = svg.querySelectorAll(".vg-graph-arrow")
  gsap.to(arrows, {
    stroke: mode === "tanh" ? COLOR_TANH : COLOR_LINEAR,
    duration: 0.4
  })

  // Ratio number tween
  if (ratioRef.current) {
    const oldRatio = prevGrads[0] / (prevGrads[prevGrads.length - 1] || 1)
    const newRatio = gradientNorms[0] / (gradientNorms[gradientNorms.length - 1] || 1)
    const proxy = { value: oldRatio }
    gsap.to(proxy, {
      value: newRatio, duration: 0.7,
      onUpdate: () => {
        if (ratioRef.current) ratioRef.current.textContent = proxy.value.toFixed(2)
      }
    })
  }

  prevGradsRef.current = [...gradientNorms]
  prevLenRef.current = seqLen
}, [mode, seqLen, gradientNorms])
```

Note: `barSy`, `gradColor`, `COLOR_TANH`, `COLOR_LINEAR` are existing functions/constants in the component. The implementer should verify they exist; if the bar rendering uses different names, adapt accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/components/blog/VanishingGradientExplorer.js
git commit -m "feat(lfads): add domino cascade animation to VanishingGradientExplorer"
```

---

## Chunk 3: TrainingDynamicsExplorer + GRUGateExplorer

### Task 5: TrainingDynamicsExplorer — Morph Trajectories Animation

**Files:**
- Modify: `src/components/blog/TrainingDynamicsExplorer.js`

- [ ] **Step 1: Add GSAP imports, refs, and data attributes**

Add `import gsap from "gsap"`.

Add refs:
- `const svgRef = useRef(null)` (attach to SVG)
- `const epochMarkerRef = useRef(null)` (attach to the vertical epoch marker line)
- `const playTlRef = useRef(null)`
- `const warmupRectRef = useRef(null)` (attach to the KL warmup shaded rect)

Add data attributes:
- Trajectory paths: `className="td-traj"` + `data-trial={trialIdx}`
- Rate paths: `className="td-rate"` + `data-neuron={neuronIdx}`
- Loss curve paths: `className="td-loss"` + `data-metric={"elbo"|"recon"|"kl"}`

- [ ] **Step 2: Define helper functions**

```js
// Interpolate path between two snapshots' trajectory data
function buildMorphedPath(fromPts, toPts, t, sx, sy) {
  const parts = []
  const len = Math.min(fromPts.length, toPts.length)
  for (let i = 0; i < len; i++) {
    const x = sx(fromPts[i][0] * (1 - t) + toPts[i][0] * t)
    const y = sy(fromPts[i][1] * (1 - t) + toPts[i][1] * t)
    parts.push(`${i === 0 ? "M" : "L"}${x},${y}`)
  }
  return parts.join(" ")
}

// Build a rate time-series path for a given neuron from snapshot data
function buildRatePath(rateMatrix, neuronIdx, sx, sy) {
  const parts = []
  for (let t = 0; t < rateMatrix.length; t++) {
    const x = sx(t)
    const y = sy(rateMatrix[t][neuronIdx])
    parts.push(`${t === 0 ? "M" : "L"}${x},${y}`)
  }
  return parts.join(" ")
}
```

- [ ] **Step 3: Implement Play mode with GSAP timelines**

Replace the existing `setInterval` in the component with:

```js
const playAnimation = useCallback(() => {
  if (playTlRef.current) playTlRef.current.kill()
  const svg = svgRef.current
  if (!svg) return

  const tl = gsap.timeline({ onComplete: () => setPlaying(false) })

  for (let i = 0; i < snapshots.length - 1; i++) {
    const fromSnap = snapshots[i]
    const toSnap = snapshots[i + 1]
    const t0 = i * 1.2 // 800ms transition + 400ms pause

    // Epoch marker slides
    tl.to(epochMarkerRef.current, {
      attr: { x1: lossSx(toSnap.epoch), x2: lossSx(toSnap.epoch) },
      duration: 0.8, ease: "power2.inOut"
    }, t0)

    // KL warmup shading right edge follows marker
    if (warmupRectRef.current && toSnap.epoch <= KL_WARMUP_END) {
      tl.to(warmupRectRef.current, {
        attr: { width: lossSx(toSnap.epoch) - lossSx(0) },
        duration: 0.8, ease: "power2.inOut"
      }, t0)
    }

    // Loss curve lines extend (use strokeDashoffset on pre-drawn full curves)
    const lossPaths = svg.querySelectorAll(".td-loss")
    lossPaths.forEach(p => {
      const fullLen = p.getTotalLength()
      const targetOffset = fullLen * (1 - toSnap.epoch / 100)
      tl.to(p, { strokeDashoffset: targetOffset, duration: 0.8, ease: "power2.inOut" }, t0)
    })

    // Trajectory paths morph
    const trajPaths = svg.querySelectorAll(".td-traj")
    trajPaths.forEach((path, trialIdx) => {
      const fromPts = fromSnap.sampleLatents[trialIdx]
      const toPts = toSnap.sampleLatents[trialIdx]
      if (!fromPts || !toPts) return
      const proxy = { t: 0 }
      tl.to(proxy, {
        t: 1, duration: 0.8, ease: "power2.inOut",
        onUpdate: () => path.setAttribute("d", buildMorphedPath(fromPts, toPts, proxy.t, latSx, latSy))
      }, t0)
    })

    // Rate curves crossfade
    const ratePaths = svg.querySelectorAll(".td-rate")
    tl.to(ratePaths, { opacity: 0.3, duration: 0.2 }, t0 + 0.2)
    tl.call(() => {
      ratePaths.forEach((path, nIdx) => {
        const rateData = toSnap.sampleRates[0]
        if (rateData) path.setAttribute("d", buildRatePath(rateData, nIdx, ratesSx, rateSy))
      })
    }, null, t0 + 0.4)
    tl.to(ratePaths, { opacity: 1, duration: 0.4, stagger: 0.05 }, t0 + 0.4)

    // Update React state at snapshot boundary
    tl.call(() => setSnapIdx(i + 1), null, t0 + 0.8)
  }

  playTlRef.current = tl
  setPlaying(true)
}, [snapshots])
```

Remove the `setInterval` / `clearInterval` logic entirely.

- [ ] **Step 4: Implement slider drag interpolation**

Use a ref for current snapshot to avoid stale closures:

```js
const snapIdxRef = useRef(0)
// Keep ref in sync
useEffect(() => { snapIdxRef.current = snapIdx }, [snapIdx])

const handleSliderChange = useCallback((newIdx) => {
  if (playing) return
  const svg = svgRef.current
  if (!svg) return
  const fromIdx = snapIdxRef.current

  const trajPaths = svg.querySelectorAll(".td-traj")
  trajPaths.forEach((path, trialIdx) => {
    const toPts = snapshots[newIdx].sampleLatents[trialIdx]
    const fromPts = snapshots[fromIdx].sampleLatents[trialIdx]
    if (!fromPts || !toPts) return
    gsap.to(path, {
      attr: { d: buildMorphedPath(fromPts, toPts, 1, latSx, latSy) },
      duration: 0.3, ease: "power2.out"
    })
  })

  gsap.to(epochMarkerRef.current, {
    attr: { x1: lossSx(snapshots[newIdx].epoch), x2: lossSx(snapshots[newIdx].epoch) },
    duration: 0.3
  })

  setSnapIdx(newIdx)
}, [snapshots, playing])
```

- [ ] **Step 5: Initialize loss curves with strokeDashoffset**

On mount, set up the loss curve paths for incremental reveal:

```js
useEffect(() => {
  const svg = svgRef.current
  if (!svg) return
  const lossPaths = svg.querySelectorAll(".td-loss")
  lossPaths.forEach(p => {
    const fullLen = p.getTotalLength()
    gsap.set(p, { strokeDasharray: fullLen, strokeDashoffset: fullLen * (1 - snapshots[0].epoch / 100) })
  })
}, [])
```

- [ ] **Step 6: Commit**

```bash
git add src/components/blog/TrainingDynamicsExplorer.js
git commit -m "feat(lfads): add morph trajectory animation to TrainingDynamicsExplorer"
```

### Task 6: GRUGateExplorer — Pulse Along Paths Animation

**Files:**
- Modify: `src/components/blog/GRUGateExplorer.js`

- [ ] **Step 1: Add GSAP imports, refs, and SVG defs**

Add:
```js
import { useRef, useEffect, useCallback } from "react"
import gsap from "gsap"
```

Add `const svgRef = useRef(null)`, `const pulseTlRef = useRef(null)`, `const prevValsRef = useRef(null)`.

Add to SVG `<defs>`:
```jsx
<radialGradient id="pulse-glow-amber">
  <stop offset="0%" stopColor="#d4a03c" stopOpacity="0.9" />
  <stop offset="100%" stopColor="#d4a03c" stopOpacity="0" />
</radialGradient>
<radialGradient id="pulse-glow-blue">
  <stop offset="0%" stopColor="#4A90D9" stopOpacity="0.9" />
  <stop offset="100%" stopColor="#4A90D9" stopOpacity="0" />
</radialGradient>
```

Add 4 pulse circles at the end of the SVG (after all other content, so they render on top):
```jsx
<circle className="gru-pulse" data-gate="reset" r={5} fill="url(#pulse-glow-amber)" opacity={0} />
<circle className="gru-pulse" data-gate="update" r={5} fill="url(#pulse-glow-amber)" opacity={0} />
<circle className="gru-pulse" data-gate="candidate" r={5} fill="url(#pulse-glow-blue)" opacity={0} />
<circle className="gru-pulse-out" r={5} fill="url(#pulse-glow-blue)" opacity={0} />
```

Add data attributes to existing elements:
- Input arrows: `className="gru-input-arrow"`
- Gate boxes: `className="gru-gate-box"` + `data-gate={"reset"|"update"|"candidate"}`
- Gate value text elements: `className="gru-gate-val"` + `data-gate={"reset"|"update"|"candidate"}`
- Output value text: `className="gru-output-val"`
- Output arrow: `className="gru-output-arrow"`
- Interpolation box: `className="gru-interp-box"`

- [ ] **Step 2: Define waypoints from existing layout constants**

Read the component's existing rendering code. The GRU cell diagram has positioned elements at specific coordinates. Extract the center coordinates of each gate box, the start/end of each arrow path. Build:

```js
// Derive from existing component layout constants
// E.g., if the reset gate box is at (resetX, resetY):
const WAYPOINTS = {
  reset:     [/* [startX, startY], [midX, midY], [gateBoxCenterX, gateBoxCenterY] */],
  update:    [/* same pattern */],
  candidate: [/* starts after reset gate output, ends at candidate box */],
  output:    [/* from interpolation box output to final h_t output */],
}
```

The implementer MUST read the existing JSX to find the actual coordinates. Look for the `<rect>` and `<line>` elements that form the gate boxes and arrows, and extract their `x`, `y`, `x1`, `y1` etc. attributes.

- [ ] **Step 3: Build pulse animation timeline**

```js
const animatePulse = useCallback(() => {
  const svg = svgRef.current
  if (!svg) return

  // Skip-to-end if previous animation still running (spec: don't leave in intermediate state)
  if (pulseTlRef.current) {
    pulseTlRef.current.progress(1) // skip to end
    pulseTlRef.current.kill()
  }

  const tl = gsap.timeline()

  // 1. Input arrows brighten (0-50ms)
  tl.to(svg.querySelectorAll(".gru-input-arrow"),
    { stroke: COLOR_H, strokeWidth: 2, duration: 0.05 }, 0)

  // 2. Three gate pulses (50-350ms) — reset + update parallel, candidate delayed
  ;["reset", "update", "candidate"].forEach(gate => {
    const pulse = svg.querySelector(`.gru-pulse[data-gate="${gate}"]`)
    const wp = WAYPOINTS[gate]
    const delay = gate === "candidate" ? 0.1 : 0.05

    tl.set(pulse, { cx: wp[0][0], cy: wp[0][1], opacity: 1 }, delay)

    const segDur = 0.25 / (wp.length - 1)
    for (let w = 1; w < wp.length; w++) {
      tl.to(pulse, { cx: wp[w][0], cy: wp[w][1], duration: segDur, ease: "power1.inOut" },
        delay + (w - 1) * segDur)
    }

    // Gate box flash on arrival
    const gateBox = svg.querySelector(`.gru-gate-box[data-gate="${gate}"]`)
    if (gateBox) {
      tl.to(gateBox, { scale: 1.08, transformOrigin: "center", duration: 0.05, yoyo: true, repeat: 1 }, delay + 0.25)
    }

    // Gate value tween
    const gateVal = svg.querySelector(`.gru-gate-val[data-gate="${gate}"]`)
    if (gateVal) {
      // Value is already updated by React state — just flash the text
      tl.fromTo(gateVal, { fill: gate === "candidate" ? "#4A90D9" : "#d4a03c" },
        { fill: "#333", duration: 0.15 }, delay + 0.25)
    }

    tl.set(pulse, { opacity: 0 }, delay + 0.3)
  })

  // 3. Interpolation → output pulse (350-450ms)
  const outPulse = svg.querySelector(".gru-pulse-out")
  const owp = WAYPOINTS.output
  tl.set(outPulse, { cx: owp[0][0], cy: owp[0][1], opacity: 1 }, 0.35)
  tl.to(outPulse, { cx: owp[1][0], cy: owp[1][1], duration: 0.1 }, 0.35)
  tl.set(outPulse, { opacity: 0 }, 0.45)

  // 4. Output update (450-500ms)
  const outVal = svg.querySelector(".gru-output-val")
  if (outVal) {
    tl.fromTo(outVal, { fill: "#4A90D9" }, { fill: "#333", duration: 0.15 }, 0.45)
  }
  tl.to(svg.querySelector(".gru-output-arrow"),
    { stroke: COLOR_H, strokeWidth: 2, duration: 0.05, yoyo: true, repeat: 1 }, 0.45)

  // 5. Reset input arrows
  tl.to(svg.querySelectorAll(".gru-input-arrow"),
    { stroke: "#bbb", strokeWidth: 1, duration: 0.1 }, 0.48)

  pulseTlRef.current = tl
}, [])
```

- [ ] **Step 4: Trigger on slider change and gate toggle**

```js
useEffect(() => {
  // Skip initial render
  if (!prevValsRef.current) {
    prevValsRef.current = { h: [...h], x }
    return
  }
  if (prevValsRef.current.h[0] === h[0] &&
      prevValsRef.current.h[1] === h[1] &&
      prevValsRef.current.x === x) return

  prevValsRef.current = { h: [...h], x }
  animatePulse()
}, [h[0], h[1], x, animatePulse])

// Gate toggle dimming
useEffect(() => {
  const svg = svgRef.current
  if (!svg) return
  const resetBox = svg.querySelector('.gru-gate-box[data-gate="reset"]')
  const updateBox = svg.querySelector('.gru-gate-box[data-gate="update"]')
  if (resetBox) gsap.to(resetBox, { opacity: forceReset ? 0.3 : 1, duration: 0.2 })
  if (updateBox) gsap.to(updateBox, { opacity: forceUpdate ? 0.3 : 1, duration: 0.2 })
}, [forceReset, forceUpdate])
```

- [ ] **Step 5: Commit**

```bash
git add src/components/blog/GRUGateExplorer.js
git commit -m "feat(lfads): add pulse along paths animation to GRUGateExplorer"
```

---

## Chunk 4: Verification

### Task 7: Full build and visual verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Visual checklist**

Run `npm run develop` and verify each animation at `localhost:8000/blog/lfads/`:

| Figure | What to check | Pass criteria |
|--------|--------------|---------------|
| RNNUnrolled | Click "Next step" | Box fills L→R, computation text reveals L→R (clip-mask), values fade in, arrow pushes to next. Previous step dims. |
| RNNUnrolled | After final step | Gradient arrows sweep backward R→L with 50ms stagger, colored by magnitude. |
| RNNUnrolled | Click "Reset" | All elements fade/collapse at 2x speed, resets to initial state. |
| LFADSTeaser | Page load | Rasters sweep L→R, 200ms pause, trajectories draw on, rates draw on. ~3s total. |
| LFADSTeaser | Click "Regenerate" | Animated elements fade out, new data generates, reveal replays. |
| VanishingGradientExplorer | Toggle tanh↔linear | Bars cascade R→L to new heights with 30ms stagger. Ratio number tweens smoothly. Bottom arrows swap color. |
| VanishingGradientExplorer | Change T slider | New bars scale in from right. Existing bars recompute with cascade. |
| TrainingDynamicsExplorer | Click "Play" | Trajectories morph between epoch snapshots, loss marker slides, rates crossfade. ~3.5s total. |
| TrainingDynamicsExplorer | Drag epoch slider | Quick 300ms morph to selected snapshot. |
| GRUGateExplorer | Move any slider | Pulses travel along gate paths, boxes flash on arrival, values highlight, output updates. |
| GRUGateExplorer | Toggle gate OFF | Gate box and path gray to 0.3 opacity over 200ms. |

If any animation does not match: adjust durations, easings, or coordinate positions and re-test.

- [ ] **Step 3: Commit fixes if needed**

```bash
git add src/components/blog/RNNUnrolled.js src/components/blog/LFADSTeaser.js src/components/blog/VanishingGradientExplorer.js src/components/blog/TrainingDynamicsExplorer.js src/components/blog/GRUGateExplorer.js
git commit -m "fix(lfads): polish GSAP animations after visual review"
```
