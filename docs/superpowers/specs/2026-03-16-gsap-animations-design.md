# GSAP Animations for LFADS Figures — Design Spec

**Date:** 2026-03-16
**Status:** Draft
**Depends on:** LFADS blog post (complete)

## Overview

Add choreographed GSAP animations to 5 interactive figure components in the LFADS blog post. The animations are narrative — they tell the story of each figure rather than just smoothing transitions. The style is choreographed and cinematic, matching the publication-quality bar of the site.

**Dependency:** `gsap` (core only, ~24KB minified). No paid plugins (ScrollTrigger, MorphSVG, MotionPath). Core `gsap.to`, `gsap.timeline`, stagger, and easing cover all needs.

## Shared Infrastructure

### `useGsapTimeline.js` hook

A small shared hook at `src/components/blog/useGsapTimeline.js`:

```
useGsapTimeline(ref, builderFn, deps)
```

- `ref`: React ref to the SVG group being animated
- `builderFn`: function that receives the ref's current element and returns a `gsap.timeline()` instance
- `deps`: dependency array — timeline is rebuilt when deps change
- Returns `{ play, pause, restart, progress }` controls
- Handles cleanup: calls `tl.kill()` on unmount or when deps change
- Builder runs in a `useEffect` after mount so DOM refs are available

### Integration pattern

Each animated figure component:
1. Adds `ref` attributes to SVG elements that will be animated
2. Sets initial state (opacity: 0, transforms, stroke-dashoffset) via inline styles or GSAP `.set()`
3. Builds a `gsap.timeline()` that animates those elements
4. Exposes play/restart via user interactions (buttons, slider, toggles)

No changes to non-animated figures. GSAP is only imported by the 5 components that use it plus the shared hook.

## Figure 1: RNNUnrolled — Cascade Fill

**Trigger:** "Next step" button click.

**Timeline per step (~1.5s):**

| Time | Element | Animation |
|------|---------|-----------|
| 0-200ms | Input arrow (vertical) | Stroke brightens gray → teal, input value `x_t` fades in below |
| 200-700ms | Current h_t box | Yellow-to-white gradient sweep via animated clip-mask `<rect>` width. Computation string `tanh(Wh·h + Wx·x + b)` types in character-by-character above the box |
| 700-900ms | Numerical result | `[0.72, 0.31]` fades in inside box, computation string fades out |
| 900-1200ms | Recurrent arrow (horizontal) | Stroke brightens, arrow head scales 1→1.2→1 ("push" effect) |
| 1200-1500ms | Previous step | All previous-step elements dim to opacity 0.4 |

**After final step:** Gradient arrows sweep backward. 50ms stagger per step right-to-left. Each arrow animates opacity 0→1 and stroke-width 0→full over 200ms. Colored by gradient magnitude (blue→red).

**Reset:** Plays timeline in reverse at 2x speed.

**Implementation notes:**
- The "typing" effect for the computation string: use a clip rect that reveals characters left-to-right (not `textLength`, which stretches glyphs rather than revealing them)
- Box fill sweep: a `<rect>` inside a `<clipPath>` with its `width` animated from 0 to box width
- Arrow head scale: `gsap.to(arrowHead, { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1 })`

## Figure 2: LFADSTeaser — Pipeline Reveal

**Trigger:** On mount (first load) and on "Regenerate" click.

**Timeline (~3s):**

| Time | Panel | Animation |
|------|-------|-----------|
| 0-1000ms | Rasters (Panel 1) | Spike ticks appear column-by-column (time bins 0→99). Each column fades in over 50ms. ~10ms stagger between columns. Condition bands offset by 100ms top-to-bottom. |
| 1000-1200ms | — | Pause (hold) |
| 1200-2200ms | Trajectories (Panel 2) | Each condition's path draws via `stroke-dashoffset` (full→0). 8 conditions staggered by 60ms. Start marker pops in (scale 0→1). End marker fades in on completion. |
| 2200-3000ms | Rates (Panel 3) | Gray smoothed-spike backgrounds fade in (200ms). Then colored rate curves draw via `stroke-dashoffset`, 3 neurons staggered by 100ms. Each neuron's condition curves draw simultaneously. |

**On Regenerate:** Quick fade-out of all elements (200ms), recompute data, then replay full timeline.

**Implementation notes:**
- `stroke-dashoffset` animation: on mount, measure each path's `getTotalLength()`, set `strokeDasharray` and `strokeDashoffset` to that length, then animate `strokeDashoffset` to 0
- Column-by-column raster: group spike ticks by time bin, stagger groups. Each group is a `<g>` with a shared class or data attribute for GSAP targeting
- The initial state (everything hidden) must be set before the first paint to avoid a flash of unstyled content — use `gsap.set()` in a `useLayoutEffect`

## Figure 3: TrainingDynamicsExplorer — Morph Trajectories

**Trigger:** "Play" button (auto-advance) or epoch slider drag.

### Play mode

Each epoch-to-epoch transition (~800ms):

| Time | Element | Animation |
|------|---------|-----------|
| 0-800ms | Loss curve marker | Slides along x-axis from current epoch to next. ELBO/recon/KL lines extend incrementally. |
| 0-800ms | Latent trajectories | Path `d` attributes interpolated point-by-point between snapshots. Messy paths morph into clean curves. |
| 200-800ms | Rate curves | Current rates fade to opacity 0.3, new rates fade from 0 to 1. 50ms stagger per neuron trace. |

Transitions chain with 400ms pause between epochs. Total play-through: ~3.5s for 3 snapshots.

**KL warmup shading:** Right edge of the warmup region animates to follow the epoch marker.

### Slider drag mode

No timeline. `gsap.to` with `duration: 0.3` on path coordinates and opacities. Linear interpolation between the two nearest snapshots for trajectory point positions. Responsive to hand.

**Implementation notes:**
- Path morphing: both snapshots have the same number of points (T=100 per trial, 2 trials). Interpolate each point's x,y coordinates: `x_interp = x_a * (1-t) + x_b * t`. Rebuild path `d` string each frame via `onUpdate`.
- Loss curve extension: animate the path's `d` attribute to add new segments, or use `strokeDashoffset` on a pre-drawn full curve.

## Figure 4: VanishingGradientExplorer — Domino Cascade

**Trigger:** Toggling "tanh" ↔ "linear" button.

**Timeline (~700ms):**

| Time | Element | Animation |
|------|---------|-----------|
| 0-600ms | Bars | Cascade right-to-left: each bar tweens height to new value. 30ms stagger. `power2.out` ease. Bars that grow get slight overshoot (1.05x settle). Color shifts on blue→red gradient simultaneously. |
| 0-700ms | Ratio number | `gsap.to` on a proxy object `{ value: oldRatio }`, update text on each frame via `onUpdate`. Format to 2 decimals during tween. |
| 0-400ms | Bottom graph | Arrow colors fade-swap to match new gradient regime. |

**Slider change (T):** New bars animate in from right (scale 0→1, 40ms stagger). Removed bars animate out. Existing bars recompute heights with domino cascade.

**Implementation notes:**
- Right-to-left stagger: use GSAP's `stagger` with a negative value or iterate bars in reverse order
- Number tween: `gsap.to(proxyObj, { value: newRatio, duration: 0.7, onUpdate: () => setText(proxyObj.value.toFixed(2)) })`
- Bar overshoot on growth: conditional ease — `power2.out` for shrinking, `back.out(1.2)` for growing

## Figure 5: GRUGateExplorer — Pulse Along Paths

**Trigger:** Any slider change (h₀, h₁, or x_t).

**Timeline (~500ms):**

| Time | Element | Animation |
|------|---------|-----------|
| 0-50ms | Input arrow | Changed slider's input arrow brightens (stroke gray → blue/teal) |
| 50-350ms | Three gate pulses (parallel) | Small glowing circle (r=4, radial gradient) spawns at input side. Travels along each gate's arrow path by interpolating x/y along known SVG waypoints. Reset pulse: amber. Update pulse: amber. Candidate pulse: blue (slight delay, waits for reset gate). |
| 50-350ms | Gate box arrival | As each pulse reaches its gate box: border flashes (scale 1→1.08→1, 100ms), numerical value tweens to new value. |
| 350-450ms | Interpolation pulse | Combined pulse travels from gate outputs through interpolation to output. Interpolation box briefly shows `(1-z)·h + z·h̃` with values. |
| 450-500ms | Output update | Output h_t value tweens to new number, output arrow brightens momentarily. |

**Debounce:** `gsap.killTweensOf` on all animated elements before starting new timeline. If slider moves during animation, skip to end of current timeline and start new one.

**Gate toggle OFF:** Gate box and path gray out over 200ms (`opacity: 1→0.3`). Pulse replaced by straight pass-through arrow that glows briefly.

**Implementation notes:**
- Pulse travel: create a `<circle>` element, animate `cx` and `cy` through an array of waypoints using sequential `gsap.to` calls or a single tween with `onUpdate` that interpolates along a polyline
- Radial gradient for glow: define `<radialGradient>` in SVG `<defs>`, reference from pulse circle
- Value tween: same proxy-object pattern as the ratio counter in VanishingGradientExplorer
- Candidate pulse delay: in the timeline, position the candidate pulse with a `+=0.05` offset after the reset gate resolves, since the candidate uses `r⊙h` as input

## File structure

### New files

```
src/components/blog/useGsapTimeline.js     — shared hook (~30 lines)
```

### Modified files

```
src/components/blog/RNNUnrolled.js          — add cascade fill animation
src/components/blog/LFADSTeaser.js          — add pipeline reveal animation
src/components/blog/TrainingDynamicsExplorer.js — add morph trajectories animation
src/components/blog/VanishingGradientExplorer.js — add domino cascade animation
src/components/blog/GRUGateExplorer.js      — add pulse along paths animation
```

### Package dependency

```
npm install gsap
```

Only the 5 animated components + shared hook import `gsap`. Tree-shaking ensures non-animated components don't increase in bundle size.

## Performance constraints

- All animations target SVG attributes (`opacity`, `stroke`, `cx`, `cy`, `width`, `d`, `transform`) — these trigger main-thread repaints, not GPU compositing, but element counts are low enough (tens to hundreds) for smooth 60fps
- No `innerHTML` manipulation — all text updates via React state or GSAP's `textContent` target
- Pulse circles are created once and reused (hidden/shown), not created/destroyed per animation
- Timelines are killed on component unmount to prevent memory leaks
- Debounce on slider-triggered animations (GRUGateExplorer) to prevent queue buildup
