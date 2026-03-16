# LFADS Blog Post Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive blog post on Latent Factor Analysis via Dynamical Systems (LFADS) with 16 figures and full derivation, continuing the CCA → PSID → LFADS series.

**Architecture:** New `lfads-math.js` for all math (imports shared utilities from `cca-math.js` and `psid-math.js`). Sixteen React+SVG figure components using d3-scale. One blog page `lfads.js` following the same pattern as `psid.js`. Pre-trained demo model as a static JSON file. Shared CSS in `blog-post.css`.

**Tech Stack:** React 18, Gatsby 5, d3-scale, KaTeX (via existing Math components), SVG for all figures.

**Spec:** `docs/superpowers/specs/2026-03-15-lfads-blog-post-design.md`

---

## Chunk 1: Math Module — Data Generators and RNN/GRU Primitives

### Task 1: Create lfads-math.js with synthetic data generators

**Files:**
- Create: `src/components/blog/lfads-math.js`
- Reference: `src/components/blog/cca-math.js` (import `zeros`, `matMul`, `matT`)
- Reference: `src/components/blog/psid-math.js` (import `mulberry32`, `seededRandn`)

This file provides all math for every LFADS figure. Build the data generators first since most figures depend on them.

- [ ] **Step 1: Create lfads-math.js with the limit cycle generator**

```js
// src/components/blog/lfads-math.js
// Imports: zeros, matMul, matT from cca-math; mulberry32, seededRandn from psid-math
//
// generateLimitCycle({ mu, dt, T, nNeurons, sigmaObs, perturbations }, seed)
//   Simulates Van der Pol oscillator: x'' - mu(1-x^2)x' + x = 0
//   Rewritten as 2D system:
//     dx1/dt = x2
//     dx2/dt = mu(1-x1^2)*x2 - x1
//   Integrated with Euler method at step dt.
//   Observation: C (nNeurons x 2) random matrix from seed, then:
//     rates = exp(C * [x1, x2]^T)  (log-link for Poisson)
//     spikes[t][n] = poissonSample(rates[t][n], rng)
//   perturbations: array of {time, dx1, dx2} impulses applied to state
//   Returns { X: T x 2, rates: T x nNeurons, spikes: T x nNeurons, C }
```

Implement:
- `poissonSample(rate, rng)` — sample from Poisson(rate) using inverse CDF method
- `generateLimitCycle(params, seed)` — Van der Pol with Poisson spiking, params have defaults: `{ mu: 1.5, dt: 0.02, T: 500, nNeurons: 10, sigmaObs: 0.0, perturbations: [] }`
- Export both functions.

- [ ] **Step 2: Add the reaching task generator**

```js
// generateReachingTask(nConditions, nTrials, nNeurons, seed)
//   8 reach directions, each with a curved latent trajectory in 3D.
//   Latent dims: 2 rotational (condition-dependent angle) + 1 speed-modulated.
//   Trial-to-trial variability:
//     - Reaction time jitter: onset sampled from N(20, 3^2) timesteps
//     - Speed scaling: time-warp factor sampled from N(1.0, 0.1^2)
//   For each trial:
//     1. Generate latent trajectory x(t) = [cos(theta*t/T_warp), sin(theta*t/T_warp), speed(t)]
//        where theta = 2*pi*condition/nConditions, T_warp varies per trial
//     2. Zero-pad before onset (reaction time jitter)
//     3. Rates = exp(C * x(t) + baseline), C is nNeurons x 3 random from seed
//     4. Spikes = Poisson(rates)
//   Returns { spikes: [nCond][nTrials] each T x nNeurons,
//             rates: same structure, latents: same structure T x 3,
//             conditions: [0..nCond-1], C }
//   Total trial length T = 100 timesteps
```

Implement `generateReachingTask(nConditions = 8, nTrials = 15, nNeurons = 20, seed = 42)`.

- [ ] **Step 3: Add RNN and GRU single-step primitives**

```js
// rnnStep(h, x, Wh, Wx, b)
//   h: d-vector (previous hidden state)
//   x: p-vector (input)
//   Wh: d x d, Wx: d x p, b: d-vector
//   Returns { h_new: tanh(Wh*h + Wx*x + b), pre_activation: Wh*h + Wx*x + b }
//   Returning pre_activation is needed for gradient visualization.

// gruStep(h, x, Wr, Wu, Wc, br, bu, bc)
//   Full GRU with explicit gate outputs:
//   r = sigmoid(Wr * [h, x] + br)          (reset gate)
//   z = sigmoid(Wu * [h, x] + bu)          (update gate)
//   h_tilde = tanh(Wc * [r*h, x] + bc)    (candidate)
//   h_new = (1-z)*h + z*h_tilde            (interpolation)
//   Returns { h_new, r, z, h_tilde, pre_r, pre_z, pre_h_tilde }
//   All gates returned for GRUGateExplorer figure.
```

Implement:
- `sigmoid(x)` — helper, 1/(1+exp(-x))
- `rnnStep(h, x, Wh, Wx, b)` — returns `{ h_new, pre_activation }`
- `gruStep(h, x, Wr, Wu, Wc, br, bu, bc)` — returns all intermediate values

- [ ] **Step 4: Add RNN unrolling and gradient computation**

```js
// unrollRNN(h0, inputs, params)
//   h0: d-vector initial hidden state
//   inputs: T x p matrix of inputs
//   params: { Wh, Wx, b }
//   Unrolls for T steps, calling rnnStep each time.
//   Returns { states: T x d (hidden states), preActivations: T x d }

// computeGradientNorms(states, params)
//   Computes ||dL/dh_t|| for each timestep assuming L = ||h_T||^2 (loss at final step).
//   Uses the chain rule: dh_T/dh_t = prod_{k=t}^{T-1} diag(1-h_k^2) * Wh
//   Returns array of T gradient norms (floats).
//   This is an analytical computation, not autograd — we multiply Jacobians backward.
```

Implement `unrollRNN` and `computeGradientNorms`. The gradient computation uses the tanh derivative: dtanh/dx = 1 - tanh^2(x), so the Jacobian at step k is `diag(1 - states[k]^2) * Wh`.

- [ ] **Step 5: Verify data generators with Node.js smoke test**

Run:
```bash
node --input-type=module -e "
import { generateLimitCycle, generateReachingTask, rnnStep, gruStep, unrollRNN, computeGradientNorms } from './src/components/blog/lfads-math.js';
const lc = generateLimitCycle({}, 1);
console.log('LimitCycle X:', lc.X.length, 'x', lc.X[0].length);
console.log('LimitCycle spikes:', lc.spikes.length, 'x', lc.spikes[0].length);
const rt = generateReachingTask(8, 5, 20, 42);
console.log('ReachingTask conditions:', rt.conditions.length);
console.log('ReachingTask spikes[0][0]:', rt.spikes[0][0].length, 'x', rt.spikes[0][0][0].length);
"
```

Expected: LimitCycle X is 500x2, spikes is 500x10, ReachingTask has 8 conditions, spikes per trial are 100x20.

If ES module import fails, create a temp `.mjs` file and run that instead.

- [ ] **Step 6: Commit**

```bash
git add src/components/blog/lfads-math.js
git commit -m "feat(lfads): add math module with data generators and RNN/GRU primitives"
```

### Task 2: Variational inference utilities and demo model infrastructure

**Files:**
- Modify: `src/components/blog/lfads-math.js`
- Create: `src/components/blog/lfads-demo-model.json`

- [ ] **Step 1: Add variational inference utilities**

```js
// gaussianKL(mu, logvar)
//   KL divergence: KL(N(mu, exp(logvar)) || N(0,1))
//   = 0.5 * sum(exp(logvar) + mu^2 - 1 - logvar)
//   mu, logvar: d-vectors. Returns scalar.

// poissonLogLik(spikes, logRates)
//   sum over all entries: spikes[i]*logRates[i] - exp(logRates[i]) - log(spikes[i]!)
//   Use Stirling approximation for log(n!) or precompute for small n.
//   spikes, logRates: T x n matrices. Returns scalar.

// gaussianLogLik(y, mu, sigma)
//   sum over all entries: -0.5*((y-mu)/sigma)^2 - log(sigma) - 0.5*log(2*pi)
//   y, mu: T x n matrices, sigma: scalar. Returns scalar.

// computeELBO(reconLogLik, kl, beta)
//   Returns reconLogLik - beta * kl
```

Implement all four functions.

- [ ] **Step 2: Add demo model forward pass functions**

```js
// loadDemoModel(modelJson)
//   Parse the JSON object into typed structures:
//   Returns { generator: { Wh, Wx, b (GRU params) },
//             encoder: { fwd: {Wh,Wx,b}, bwd: {Wh,Wx,b}, muW, muB, logvarW, logvarB },
//             controller: { Wh, Wx, b (GRU params) },
//             readout: { W, b },
//             epochSnapshots: [...] }
//   All weight matrices are plain 2D arrays.

// generateFromIC(ic, model, T)
//   ic: d-vector initial condition for generator GRU
//   model: parsed model from loadDemoModel
//   Run generator GRU for T steps with zero input (no controller).
//   At each step: factors = readout.W * h + readout.b, rates = exp(factors)
//   Returns { states: T x d, factors: T x nFactors, rates: T x nNeurons }

// inferSingleTrial(spikes, model)
//   spikes: T x nNeurons matrix
//   1. Run bidirectional encoder RNN over spikes:
//      Forward: h_fwd = RNN over spikes[0..T-1]
//      Backward: h_bwd = RNN over spikes[T-1..0]
//      Concatenate final states: e = [h_fwd_T, h_bwd_0]
//   2. IC distribution: mu = muW*e + muB, logvar = logvarW*e + logvarB
//   3. Sample (use mu for deterministic demo): ic = mu
//   4. Run generator GRU from ic for T steps (with zero controller input for simplicity)
//   5. Compute rates = exp(readout.W * h + readout.b)
//   Returns { ic_mu, ic_logvar, states: T x d, rates: T x nNeurons }
```

Implement `loadDemoModel`, `generateFromIC`, and `inferSingleTrial`.

- [ ] **Step 3: Create the demo model JSON file**

Create `src/components/blog/lfads-demo-model.json` with a small hand-crafted model:
- Generator GRU: latent dim = 3, no external input (input dim = 0 for autonomous dynamics)
- Encoder: bidirectional RNN with hidden dim = 4 each direction, producing IC for dim 3
- Controller: hidden dim = 2, input dim = 3 (generator state), output dim = 1 (inferred input)
- Readout: 3 factors → 20 neurons (W: 20x3, b: 20-vector)
- Epoch snapshots: 5 snapshots at epochs [0, 10, 25, 50, 100], each containing:
  - `elbo`, `recon`, `kl` (scalar loss values)
  - `sampleLatents`: 3 example trial trajectories (each T x 3)
  - `sampleRates`: corresponding rate reconstructions (each T x 20)

The weights should be initialized with small random values (seeded) that produce reasonable-looking dynamics when the generator is run forward. The readout W should be set so that different neurons respond to different factor combinations.

To make the generator produce interesting dynamics:
- Set GRU biases for the update gate to be slightly negative (encourages state retention)
- Set the recurrent weights to have eigenvalues near but inside the unit circle

This file will be ~50KB. Generate it with a Node.js script that:
1. Uses `mulberry32(777)` for deterministic seeding
2. Creates generator GRU weights: `Wh` as a 3x3 rotation-like matrix (entries from `0.1*randn`, then add identity to diagonal), update gate bias `bu = [-1.5, -1.5, -1.5]` (encourages retention)
3. Creates encoder weights: small random from seed, `muW` and `logvarW` as 3x8 matrices
4. Creates controller weights: small random from seed, 2x4 recurrent, 2x3 input
5. Creates readout `W` (20x3): rows alternate between loading on factor 1, 2, or 3 with random mixing
6. Generates epoch snapshots by running `generateFromIC` with progressively refined weights (scale noise by `1/sqrt(epoch+1)`)
7. Writes the result to `lfads-demo-model.json`

Also include a second model variant keyed as `"underRegularized"` in the JSON:
- Same architecture but with larger controller weights (3x normal) and near-identity generator `Wh`
- This variant is used by the ControllerAbsorption figure (Chunk 5, Task 18)

Run this script as a one-time generation step. The exact values are not critical — what matters is that `generateFromIC` produces smooth, curved trajectories and `inferSingleTrial` produces reasonable rate reconstructions.

- [ ] **Step 4: Verify forward pass with smoke test**

```bash
node --input-type=module -e "
import { loadDemoModel, generateFromIC, inferSingleTrial } from './src/components/blog/lfads-math.js';
import model from './src/components/blog/lfads-demo-model.json' assert { type: 'json' };
const m = loadDemoModel(model);
const result = generateFromIC([0.5, -0.3, 0.1], m, 100);
console.log('States:', result.states.length, 'x', result.states[0].length);
console.log('Rates:', result.rates.length, 'x', result.rates[0].length);
console.log('Rate range:', Math.min(...result.rates[0]), Math.max(...result.rates[0]));
"
```

Expected: States are 100x3, rates are 100x20, rate values are positive (Poisson rates).

- [ ] **Step 5: Commit**

```bash
git add src/components/blog/lfads-math.js src/components/blog/lfads-demo-model.json
git commit -m "feat(lfads): add variational utilities, demo model, and forward pass inference"
```

### Task 3: Update figureConstants.js

**Files:**
- Modify: `src/components/blog/figureConstants.js`

- [ ] **Step 1: Add encoder and controller colors**

Add two new entries to the `COLORS` object:

```js
encoder:    "#7b68ae",   // LFADS inference network (distinct from both bci #7a5f9a and kinematics #8b6aad)
controller: "#d4a03c",   // LFADS controller / inferred inputs (same as dynamics)
```

These go after the existing `bci` entry.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/figureConstants.js
git commit -m "feat(lfads): add encoder and controller colors to figureConstants"
```

---

## Chunk 2: Introduction and Linear-to-Nonlinear Figures (Figures 1-3)

### Task 4: LFADSTeaser (Figure 1)

**Files:**
- Create: `src/components/blog/LFADSTeaser.js`
- Reference: `src/components/blog/PSIDTeaser.js` (pattern to follow)

Hero figure: three-panel layout (raster | latent trajectories | inferred rates).

- [ ] **Step 1: Create LFADSTeaser.js**

Follow the PSIDTeaser pattern: `const W = 800, H = 360`, three horizontal panels separated by vertical dividers.

```
Layout: [Raster plot 250px] [gap] [Latent 2D trajectories 250px] [gap] [Rates 250px]
```

Component structure:
- `useMemo` to generate reaching task data with `generateReachingTask(8, 3, 20, seed)` (3 trials per condition for the teaser, keeps it readable)
- `useMemo` to run `inferSingleTrial` on each trial using the demo model
- `useState` for `seed`, with a "Regenerate" button (same pattern as CCATeaser)

Panel 1 — Raster plot:
- Y-axis: neuron index (0-19), X-axis: time (0-99)
- For each spike (value > 0), draw a small vertical tick mark
- Color each trial's spikes by condition using `d3.schemeTableau10`
- Show 1 trial per condition (randomly selected)

Panel 2 — Latent trajectories:
- 2D scatter/line plot of inferred latent dims 1 vs 2
- One trajectory per trial, colored by condition
- Curved paths showing condition-dependent structure

Panel 3 — Inferred rates:
- 3 example neurons as time series
- Thin gray line: raw spikes (binary)
- Thick colored line: inferred smooth rates from LFADS
- Color by condition

Use `scaleLinear` from d3-scale for all axes. SVG viewBox `0 0 ${W} ${H}` for responsiveness.

- [ ] **Step 2: Verify in browser**

Add a temporary test page or import into an existing page to verify the figure renders. Check:
- Raster shows spike patterns
- Latent trajectories show curved, condition-separated paths
- Rates are smooth overlays on spikes
- Regenerate button works

- [ ] **Step 3: Commit**

```bash
git add src/components/blog/LFADSTeaser.js
git commit -m "feat(lfads): add LFADSTeaser hero figure"
```

### Task 5: TrialVariabilityExplorer (Figure 2)

**Files:**
- Create: `src/components/blog/TrialVariabilityExplorer.js`

Shows why trial-averaging destroys information.

- [ ] **Step 1: Create TrialVariabilityExplorer.js**

Layout: `const W = 800, H = 500`. Three rows:

Row 1 (full width): Overlaid single-trial spike rasters for one condition.
- Show all 15 trials stacked, each as a row of tick marks
- Color: teal (`#4A7C6F`)

Row 2 (split): Two panels side by side.
- Left panel — **PSTH (trial-averaged rate)**:
  - Average spike counts across trials in time bins
  - Smooth with a Gaussian kernel (σ = 3 bins)
  - Single smooth curve per neuron. Show 3 neurons.
  - Label: "Trial-averaged (PSTH)"

- Right panel — **Single-trial LFADS rates**:
  - Run `inferSingleTrial` on each trial
  - Show individual rate traces for same 3 neurons, multiple trials overlaid
  - Each trial is a separate semi-transparent line
  - Label: "Single-trial (LFADS)"

Interactive: slider at top controls "Number of trials averaged" (1 to 15). As the slider increases:
- The PSTH panel smooths out (more averaging = smoother but less detail)
- Show a text annotation: "Averaging N trials"

The point: PSTH converges to a single smooth curve losing trial-to-trial timing differences. LFADS preserves them.

State: `useState` for `nTrialsAvg` (slider), `useState` for `selectedCondition` (0-7, dropdown or buttons).

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/TrialVariabilityExplorer.js
git commit -m "feat(lfads): add TrialVariabilityExplorer figure"
```

### Task 6: NonlinearFailure (Figure 3)

**Files:**
- Create: `src/components/blog/NonlinearFailure.js`
- Reference: `src/components/blog/LatentDynamicsExplorer.js` (similar layout)

Shows linear model failing on nonlinear dynamics.

- [ ] **Step 1: Create NonlinearFailure.js**

Layout: `const W = 800, H = 400`. Two panels side by side.

Left panel — **True dynamics**:
- 2D plot of Van der Pol limit cycle (x1 vs x2)
- Generate with `generateLimitCycle({ mu: 2.0, T: 800 }, 1)`
- Draw the trajectory as a colored path (blue `#4A90D9`)
- Show the limit cycle attractor shape clearly

Right panel — **Linear fit attempt**:
- Fit a linear state-space model to the observations using `standardSubspaceID` from psid-math
- Recover latent states and plot them
- The linear fit will produce an elliptical trajectory that misses the nonlinear shape
- Draw both: true trajectory (blue, solid) and linear fit (red-brown `#c0503a`, dashed)

Toggle button: "Linear model" / "True dynamics" to switch which is shown, or show both overlaid.

Interactive: slider for `mu` (nonlinearity strength, range 0.5 to 3.0). At low mu the system is nearly linear and PSID works. At high mu the limit cycle is strongly nonlinear and the linear fit fails visibly.

Import `standardSubspaceID` from `./psid-math` and `generateLimitCycle` from `./lfads-math`.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/NonlinearFailure.js
git commit -m "feat(lfads): add NonlinearFailure figure"
```

---

## Chunk 3: RNN, GRU, and Generative Model Figures (Figures 4-8)

### Task 7: RNNUnrolled (Figure 4)

**Files:**
- Create: `src/components/blog/RNNUnrolled.js`

Step-through visualization of an unrolled vanilla RNN as a computational graph.

- [ ] **Step 1: Create RNNUnrolled.js**

Layout: `const W = 800, H = 350`.

Draw the unrolled RNN as a sequence of boxes (hidden states) connected by arrows:
- Boxes: `h_0, h_1, h_2, ..., h_T` arranged left to right
- Horizontal arrows: recurrent connection (Wh) between consecutive states
- Vertical arrows from below: inputs x_t feeding into each state (Wx)
- Each box shows the activation value (numerically) for a small example (d=2)

Use small fixed weights: `Wh = [[0.8, 0.2], [-0.1, 0.9]]`, `Wx = [[0.5], [0.3]]`, `b = [0, 0]`.
Input sequence: `x = [1, 0, 0, 0, 0, 0, 0, 0]` (impulse at t=0).

Interactive: "Next step" button advances time by one. At each step:
- Highlight the current computation in yellow
- Show the numerical computation: `h_new = tanh(Wh * h + Wx * x + b)` with actual values
- Color-code the gradient path: after reaching the final step, color backward arrows by gradient magnitude (from `computeGradientNorms`)

State: `useState` for `currentStep` (0 to T), `useMemo` for full unrolled computation via `unrollRNN`.

Use `rnnStep` from lfads-math for each computation.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/RNNUnrolled.js
git commit -m "feat(lfads): add RNNUnrolled step-through figure"
```

### Task 8: VanishingGradientExplorer (Figure 5)

**Files:**
- Create: `src/components/blog/VanishingGradientExplorer.js`

Shows gradient magnitudes shrinking with sequence length.

- [ ] **Step 1: Create VanishingGradientExplorer.js**

Layout: `const W = 800, H = 350`.

Top section: bar chart of gradient norms per timestep.
- X-axis: timestep (0 to T)
- Y-axis: log-scale gradient magnitude
- Bars colored on a blue→red gradient (high gradient = blue, low = red)

Bottom section: the unrolled computation graph (simplified — just boxes and arrows, no numerical detail like Figure 4).

Interactive:
- **Slider**: sequence length T (range 5 to 50, default 20)
- **Toggle**: "tanh" vs "linear" activation
  - tanh: gradients vanish (bars shrink exponentially from right to left)
  - linear: gradients explode (bars grow exponentially — clamp display at some max)

For tanh mode: use `Wh` with spectral radius ~0.9 so gradients decay clearly.
For linear mode: use same `Wh` but with spectral radius ~1.1 so gradients grow.

Compute gradient norms using `computeGradientNorms` from lfads-math.

Text annotation: show the gradient ratio `||dL/dh_0|| / ||dL/dh_T||` as a number that updates dynamically.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/VanishingGradientExplorer.js
git commit -m "feat(lfads): add VanishingGradientExplorer figure"
```

### Task 9: GRUGateExplorer (Figure 6)

**Files:**
- Create: `src/components/blog/GRUGateExplorer.js`

Interactive GRU cell diagram with gate-level inspection.

- [ ] **Step 1: Create GRUGateExplorer.js**

Layout: `const W = 800, H = 450`.

Draw the GRU cell as a circuit diagram:
- Left: incoming `h_{t-1}` (blue) and `x_t` (teal) as labeled arrows
- Three parallel computation paths drawn as boxes with labels:
  1. **Reset gate** (r): `σ(Wr·[h,x] + br)` — amber box
  2. **Update gate** (z): `σ(Wu·[h,x] + bu)` — amber box
  3. **Candidate** (h̃): `tanh(Wc·[r⊙h,x] + bc)` — blue box
- Merging: `h_new = (1-z)⊙h + z⊙h̃` — shown as interpolation
- Right: outgoing `h_t` (blue)

Each gate box shows its current numerical value (d=2, so 2 numbers each).

Use small hand-picked GRU weights (d=2, input_dim=1) that produce interesting gate behavior:
- `Wr`, `Wu`: 2x3 each (concatenated [h,x])
- `Wc`: 2x3 (concatenated [r*h, x])
- Biases: `br=[0,0]`, `bu=[-1,-1]` (slightly closed update gate by default), `bc=[0,0]`

Interactive:
- **Sliders** for `h_{t-1}` components (2 sliders, range -1 to 1) and `x_t` (1 slider, range -1 to 1)
- **Toggle buttons** to disable individual gates:
  - "Reset gate OFF": force r=1 (no reset, always pass h through)
  - "Update gate OFF": force z=0.5 (equal mix old/new)
  - When a gate is toggled off, gray it out visually
- Values update in real time as sliders change

Use `gruStep` from lfads-math. Display all intermediate values returned by the function.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/GRUGateExplorer.js
git commit -m "feat(lfads): add GRUGateExplorer interactive figure"
```

### Task 10: GeneratorExplorer (Figure 7)

**Files:**
- Create: `src/components/blog/GeneratorExplorer.js`

LFADS generator (GRU) vs linear dynamics from the same initial condition.

- [ ] **Step 1: Create GeneratorExplorer.js**

Layout: `const W = 800, H = 400`. Single 2D plot with a draggable initial condition.

The plot shows latent space (dim 1 vs dim 2):
- Generate a limit cycle system for reference
- **Blue solid line**: GRU generator trajectory from draggable IC, using `generateFromIC(ic, model, 100)` with the demo model
- **Red-brown dashed line**: linear trajectory from same IC, using `A_linear * x_t` where `A_linear` is a 2x2 rotation matrix fit to the same data
- **Gray dotted line**: true Van der Pol trajectory for reference

Draggable IC:
- Circle at the initial condition position
- Drag to move it in 2D latent space
- Both trajectories update in real time

The linear trajectory will be an ellipse/spiral; the GRU trajectory should follow the nonlinear manifold more closely.

State: `useState` for IC position `[x1, x2]`, drag handler on the IC circle using `onMouseDown/onMouseMove/onMouseUp` (same pattern as ProjectionExplorer.js).

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/GeneratorExplorer.js
git commit -m "feat(lfads): add GeneratorExplorer figure"
```

### Task 11: FactorToRateMapping (Figure 8)

**Files:**
- Create: `src/components/blog/FactorToRateMapping.js`

Shows the linear readout from factors to firing rates.

- [ ] **Step 1: Create FactorToRateMapping.js**

Layout: `const W = 800, H = 380`. Three columns:

Left (250px): **Factors** — time series plot of 3 latent factors from the demo model.
- Generate a trajectory using `generateFromIC` with a fixed IC
- 3 colored lines (factor 1: blue-light, factor 2: blue-medium, factor 3: blue-dark)

Middle (200px): **Readout matrix** — heatmap of W (20x3).
- Color scale: blue (negative) → white (zero) → orange (positive)
- Labeled axes: neurons (rows) × factors (columns)
- Interactive: click a cell to highlight that neuron-factor pair

Right (300px): **Firing rates** — time series of 20 neurons.
- `rates = exp(W * factors + b)`
- Each neuron is a thin line, colored by which factor it loads most heavily on
- Highlight a neuron when its readout cell is clicked

Interactive: **Slider per factor** (3 sliders) that scale each factor's amplitude (0 to 2x). This lets the user see how changing one factor's strength affects different neurons through the readout.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/FactorToRateMapping.js
git commit -m "feat(lfads): add FactorToRateMapping figure"
```

---

## Chunk 4: Variational Inference, Inference Network, and Observation Model Figures (Figures 9-12)

### Task 12: VariationalIntuition (Figure 9)

**Files:**
- Create: `src/components/blog/VariationalIntuition.js`

Visualizes variational approximation converging on a true posterior.

- [ ] **Step 1: Create VariationalIntuition.js**

Layout: `const W = 800, H = 400`. Single 2D density plot.

**True posterior** (fixed, not computed):
- A bimodal 2D distribution represented as a mixture of 2 Gaussians
- Rendered as a heatmap on a grid (e.g., 80x80 grid, compute density at each point)
- Use warm colors (orange-red) for high density

**Variational approximation**:
- Single Gaussian shown as a contour ellipse (2σ boundary)
- Color: purple (`#7b68ae`, the encoder color)
- Position (mu) and shape (Sigma) interpolate along a pre-computed optimization path

Pre-compute an optimization trajectory:
- Start: mu=[0,0], Sigma=2*I (wide, centered)
- End: mu=[mu of larger mode], Sigma=[tight around that mode]
- 50 steps, each is a mu/Sigma pair (linearly interpolate for simplicity)

Interactive:
- **Slider**: "Optimization step" (0 to 50)
- As slider moves: ellipse tightens around one mode
- **Text annotation**: shows `KL(q || p) = X.XX` computed analytically for the mixture (or approximate with Monte Carlo on the grid)

The heatmap uses `<rect>` elements or a `<canvas>` element for performance.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/VariationalIntuition.js
git commit -m "feat(lfads): add VariationalIntuition figure"
```

### Task 13: ELBODecomposition (Figure 10)

**Files:**
- Create: `src/components/blog/ELBODecomposition.js`

Shows the reconstruction vs. KL tradeoff in the ELBO.

- [ ] **Step 1: Create ELBODecomposition.js**

Layout: `const W = 800, H = 380`. Two panels.

Left panel (500px): **Stacked bar chart** showing ELBO decomposition.
- X-axis: β (KL weight) values from 0 to 2 in steps of 0.1
- For each β, show a stacked bar with:
  - Green-teal bottom: reconstruction log-likelihood (positive, good)
  - Red-brown top: -β × KL divergence (negative, penalty)
  - Net height: ELBO = recon - β*KL

Pre-compute values: use a simple synthetic example.
- Generate data from a known generative model (e.g., 2D latent → 10 observations)
- For each β, compute what the optimal q would roughly look like:
  - At β=0: q overfits (KL is large but recon is great)
  - At β=1: balanced
  - At β>1: q collapses toward prior (KL is small but recon suffers)
- Store as arrays of `{beta, recon, kl}` tuples.

Right panel (250px): **Latent space** visualization.
- Show sampled latent points from q at the current β
- At low β: scattered, varied (high KL, good recon)
- At high β: clustered near origin (low KL, poor recon)

Interactive: **Slider** for β (0 to 2). Highlights the corresponding bar in the chart. Updates the latent scatter.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/ELBODecomposition.js
git commit -m "feat(lfads): add ELBODecomposition figure"
```

### Task 14: EncoderArchitecture (Figure 11)

**Files:**
- Create: `src/components/blog/EncoderArchitecture.js`

Architectural diagram of the bidirectional encoder and controller.

- [ ] **Step 1: Create EncoderArchitecture.js**

Layout: `const W = 800, H = 500`. Two rows.

Top row — **Bidirectional encoder**:
- Draw a spike train (horizontal, ~20 time bins) as input
- Above: forward RNN arrows (left→right), purple boxes for hidden states
- Below: backward RNN arrows (right→left), purple boxes
- Both converge at the right end to produce `[h_fwd_T, h_bwd_0]`
- Arrow from concatenated hidden state → "μ₀, σ₀" box (the initial condition)
- Show the reparameterization: `z₀ = μ₀ + σ₀ ⊙ ε, ε ~ N(0,I)`

Bottom row — **Controller**:
- Generator GRU stepping through time (blue boxes, left→right)
- At each step, a downward arrow from generator state into controller GRU (amber boxes)
- Controller outputs `u_t` (amber arrow) feeding back into generator
- Label: "Inferred inputs correct for unexpected events"

Interactive: **Click trial buttons** (Trial 1, 2, 3) to show different spike trains.
- Each trial produces different encoder hidden states, different ICs, and different controller signals
- Numerical values update: show `μ₀` and `σ₀` as small vectors
- Controller signals shown as a time series below the diagram

Use the demo model with `inferSingleTrial` for realistic values, running on 3 pre-selected reaching task trials.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/EncoderArchitecture.js
git commit -m "feat(lfads): add EncoderArchitecture figure"
```

### Task 15: PoissonObservationModel (Figure 12)

**Files:**
- Create: `src/components/blog/PoissonObservationModel.js`

Log-rates → rates → Poisson spikes pipeline.

- [ ] **Step 1: Create PoissonObservationModel.js**

Layout: `const W = 800, H = 350`. Three columns with arrows between them.

Left (230px): **Log-rates** — 4 smooth curves (one per neuron), generated from a short demo model forward pass. Y-axis: log-rate values (~-2 to 2). Color: teal.

Middle (230px): **Rates** — same 4 curves after exp() transform. Y-axis: rate values (0 to ~7). Shows how exp amplifies differences. Color: teal, slightly darker.

Right (230px): **Spikes** — raster-style tick marks sampled from Poisson(rate). Each "neuron" is a row. Color: teal.

Arrows between panels: "exp(·)" label between left and middle, "Poisson(·)" label between middle and right.

Interactive:
- **"Resample" button**: draw new Poisson spikes from the same rates (shows stochasticity)
- **Toggle**: "Gaussian" vs "Poisson" observation model
  - Gaussian mode: right panel shows continuous noisy observations y = rate + N(0, σ²)
  - Poisson mode: right panel shows discrete spike counts
  - This illustrates the modeling difference

State: `useState` for seed (incremented on Resample), `useState` for observation model toggle.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/PoissonObservationModel.js
git commit -m "feat(lfads): add PoissonObservationModel figure"
```

---

## Chunk 5: Training, Comparison, and Failure Mode Figures (Figures 13-16)

### Task 16: TrainingDynamicsExplorer (Figure 13)

**Files:**
- Create: `src/components/blog/TrainingDynamicsExplorer.js`

Epoch-by-epoch view of LFADS training using pre-computed snapshots.

- [ ] **Step 1: Create TrainingDynamicsExplorer.js**

Layout: `const W = 800, H = 450`. Three panels.

Left panel (300px): **Loss curves**.
- X-axis: epoch (0 to 100)
- Three lines:
  - ELBO (blue, solid) — the total objective, should increase
  - Reconstruction term (teal, dashed) — should increase
  - KL term (red-brown, dotted) — ramps up during warmup, then stabilizes
- Vertical marker at current epoch (from slider)
- Show KL warmup region shaded (epochs 0-25)

Middle panel (250px): **Latent trajectories**.
- 2D plot of example latent trajectories at the current epoch
- From `epochSnapshots[currentEpoch].sampleLatents`
- Early epochs: noisy, unstructured blobs
- Late epochs: clean, condition-separated curves

Right panel (200px): **Reconstructed rates**.
- Time series of 3 neurons' inferred rates at the current epoch
- From `epochSnapshots[currentEpoch].sampleRates`
- Early epochs: flat, uninformative
- Late epochs: sharp, matching true rates

Interactive: **Epoch slider** (snaps to snapshot indices: 0, 10, 25, 50, 100). All three panels update together. Optional: "Play" button that auto-advances through snapshots.

Data source: `epochSnapshots` from `lfads-demo-model.json`.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/TrainingDynamicsExplorer.js
git commit -m "feat(lfads): add TrainingDynamicsExplorer figure"
```

### Task 17: LFADSvsPSIDComparison (Figure 14)

**Files:**
- Create: `src/components/blog/LFADSvsPSIDComparison.js`
- Reference: `src/components/blog/psid-math.js` (import `standardSubspaceID`)

Side-by-side comparison on the same reaching dataset.

- [ ] **Step 1: Create LFADSvsPSIDComparison.js**

Layout: `const W = 800, H = 400`. Two panels.

Left panel — **PSID / Linear subspace ID**:
- Run `standardSubspaceID` from psid-math on trial-averaged reaching data
- Plot recovered latent trajectories (2D) — one trajectory per condition
- 8 curves, colored by condition
- These are smooth but show no trial-to-trial variability

Right panel — **LFADS**:
- Run `inferSingleTrial` on each individual trial
- Plot recovered latent trajectories (2D) — multiple trajectories per condition
- 8 conditions × ~3 trials shown = 24 curves
- Same condition colors but each trial is a separate line with some spread
- Shows the per-trial timing variability that PSID misses

Toggle buttons at top: "Raw spikes" | "PSID (trial-averaged)" | "LFADS (single-trial)"
- Raw spikes mode: show raster plots instead of latent trajectories
- PSID mode: left panel highlighted
- LFADS mode: right panel highlighted
- Both always visible, toggle just highlights/dims

Text annotation: "PSID: 1 trajectory per condition" vs "LFADS: 1 trajectory per trial"

Use reaching task data from `generateReachingTask(8, 3, 20, 42)`.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/LFADSvsPSIDComparison.js
git commit -m "feat(lfads): add LFADSvsPSIDComparison figure"
```

### Task 18: ControllerAbsorption (Figure 15)

**Files:**
- Create: `src/components/blog/ControllerAbsorption.js`

Shows what happens when the controller is under-regularized.

- [ ] **Step 1: Create ControllerAbsorption.js**

Layout: `const W = 800, H = 400`. Two panels side by side.

Each panel shows a single trial's decomposition into generator dynamics and controller inputs:

Left panel — **Well-regularized** (high controller KL penalty):
- Top: Generator latent trajectory (blue, smooth, structured)
- Middle: Controller signal (amber, sparse — mostly near zero with rare impulses)
- Bottom: Reconstructed rates (teal, smooth)
- The generator does the heavy lifting

Right panel — **Under-regularized** (low controller KL penalty):
- Top: Generator latent trajectory (blue, flat/uninteresting — nearly constant)
- Middle: Controller signal (amber, dense — firing at every timestep, high amplitude)
- Bottom: Reconstructed rates (teal, still looks good)
- The controller does all the work, generator learned nothing

Pre-compute both scenarios using demo model variants stored in `lfads-demo-model.json`:
- Well-regularized: use the main model (key: root-level weights, controller is sparse by construction)
- Under-regularized: use the `"underRegularized"` variant (added in Chunk 1, Task 2, Step 3 — larger controller weights, near-identity generator)

Load both via `loadDemoModel(modelJson)` and `loadDemoModel(modelJson.underRegularized)`.

Interactive: **Slider** for "Controller KL penalty" (log scale). Interpolate between the two regimes. At the extremes, show the two pre-computed results. In between, blend the trajectories (visual interpolation, not recomputation).

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/ControllerAbsorption.js
git commit -m "feat(lfads): add ControllerAbsorption figure"
```

### Task 19: DimensionalityOverfit (Figure 16)

**Files:**
- Create: `src/components/blog/DimensionalityOverfit.js`

Shows underfitting / right fit / overfitting as latent dimensionality changes.

- [ ] **Step 1: Create DimensionalityOverfit.js**

Layout: `const W = 800, H = 420`. Two rows.

Top row (full width): **Latent trajectories** at current dimensionality.
- 2D projection of latent trajectories for one reaching condition (3 trials)
- Low dims (d=1): trajectories are lines, too simple
- Right dims (d=3): clean curved manifold, condition-separated
- High dims (d=8): trajectories wiggle through noise, overfit

Pre-compute results for dims = [1, 2, 3, 4, 5, 6, 8] and store as arrays of trajectories in the figure's `useMemo`. Use the demo model approach — pre-generate forward passes with different latent dims (or use truncated versions of the demo model).

Bottom row (full width): **Reconstruction R²** bar chart.
- X-axis: latent dimensionality
- Y-axis: cross-validated R² on held-out time bins
- Bars colored: low dims blue, sweet spot green, high dims red-brown
- Show a "gap" metric or elbow annotation at the optimal dimensionality

Interactive: **Slider** for latent dimensionality (1 to 8). Updates the top panel trajectories and highlights the corresponding bar below.

- [ ] **Step 2: Commit**

```bash
git add src/components/blog/DimensionalityOverfit.js
git commit -m "feat(lfads): add DimensionalityOverfit figure"
```

---

## Chunk 6: Blog Post Page — Introduction through Variational Inference (Sections 1-6)

### Task 20: Create lfads.js scaffold with header and TOC

**Files:**
- Create: `src/pages/blog/lfads.js`

- [ ] **Step 1: Create the blog post page with header, TOC, and imports**

Follow the exact pattern from `psid.js`:

```jsx
import React, { useRef, useState, useEffect } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
import Sidenote from "../../components/Sidenote"
import Citation from "../../components/Citation"
import { InlineMath, BlockMath, Equation } from "../../components/Math"
import FigureContainer from "../../components/blog/FigureContainer"
import TableOfContents from "../../components/blog/TableOfContents"
import CodeBlock from "../../components/blog/CodeBlock"
import VariableLegend from "../../components/blog/VariableLegend"
import LFADSTeaser from "../../components/blog/LFADSTeaser"
import TrialVariabilityExplorer from "../../components/blog/TrialVariabilityExplorer"
import NonlinearFailure from "../../components/blog/NonlinearFailure"
import RNNUnrolled from "../../components/blog/RNNUnrolled"
import VanishingGradientExplorer from "../../components/blog/VanishingGradientExplorer"
import GRUGateExplorer from "../../components/blog/GRUGateExplorer"
import GeneratorExplorer from "../../components/blog/GeneratorExplorer"
import FactorToRateMapping from "../../components/blog/FactorToRateMapping"
import VariationalIntuition from "../../components/blog/VariationalIntuition"
import ELBODecomposition from "../../components/blog/ELBODecomposition"
import EncoderArchitecture from "../../components/blog/EncoderArchitecture"
import PoissonObservationModel from "../../components/blog/PoissonObservationModel"
import TrainingDynamicsExplorer from "../../components/blog/TrainingDynamicsExplorer"
import LFADSvsPSIDComparison from "../../components/blog/LFADSvsPSIDComparison"
import ControllerAbsorption from "../../components/blog/ControllerAbsorption"
import DimensionalityOverfit from "../../components/blog/DimensionalityOverfit"
import "./blog-post.css"

const LFADS_LEGEND_GROUPS = [
  { color: "#4A90D9", label: "Generator", vars: ["x_t", "A", "g_t"] },
  { color: "#4A7C6F", label: "Observations", vars: ["y_t", "C", "\\lambda_t"] },
  { color: "#D4783C", label: "Behavior", vars: ["z_t"] },
  { color: "#7b68ae", label: "Encoder", vars: ["e_t", "\\mu_0", "\\sigma_0"] },
  { color: "#d4a03c", label: "Controller", vars: ["u_t", "K"] },
  { color: "#c0503a", label: "Regularization", vars: ["\\text{KL}", "\\beta", "\\text{ELBO}"] },
]

const TOC_ITEMS = [
  { id: "introduction", label: "Introduction" },
  { id: "from-linear-to-nonlinear", label: "From linear to nonlinear dynamics" },
  { id: "rnn", label: "Recurrent neural networks" },
  { id: "gru", label: "Gated recurrent units" },
  { id: "generative-model", label: "The generative model" },
  { id: "variational-inference", label: "Variational inference" },
  { id: "inference-network", label: "The inference network" },
  { id: "gaussian-to-poisson", label: "From Gaussian to Poisson" },
  { id: "training", label: "Training" },
  { id: "single-trials", label: "LFADS on single trials" },
  { id: "misleads", label: "When LFADS misleads" },
  { id: "limitations", label: "Assumptions and limitations" },
  { id: "neighbors", label: "LFADS and its neighbors" },
  { id: "implementation", label: "Implementation" },
  { id: "references", label: "References" },
]
```

Set up the page structure with the header (title, subtitle, byline, reading time), `<TableOfContents>`, and `<VariableLegend groups={LFADS_LEGEND_GROUPS} scrollTargetId="from-linear-to-nonlinear" />`.

Leave the body content as a placeholder comment `{/* Sections added in subsequent tasks */}` so the page compiles.

Add the `Head` export and default export at the bottom.

- [ ] **Step 2: Verify page loads**

Run `npm run develop` and visit `localhost:8000/blog/lfads/`. Should see the header, TOC, and legend toggle. No figure content yet.

- [ ] **Step 3: Commit**

```bash
git add src/pages/blog/lfads.js
git commit -m "feat(lfads): create blog post page scaffold with header and TOC"
```

### Task 21: Write sections 1-3 (Introduction, Linear-to-Nonlinear, RNNs)

**Files:**
- Modify: `src/pages/blog/lfads.js`

- [ ] **Step 1: Write the Introduction section**

Replace the placeholder with:

**Section 1: Introduction** (`<h2 id="introduction">`)
- Opening paragraph: reference PSID, name its limitation (single-trial). Follow the spec's narrative: "PSID gave us a way to recover latent dynamics... But it recovers one set of dynamics per dataset — an average across all trials."
- Second paragraph: describe the reaching task — a monkey reaching to 8 targets, trial-to-trial variability in timing and speed, why this matters for BCI and understanding motor control
- Third paragraph: introduce LFADS as the solution — a deep generative model that infers latent dynamics on every individual trial
- Fourth paragraph: state prerequisites and post outline
- Sidenotes: [1] LFADS reference (Pandarinath et al. 2018), [2] single-trial methods history

Insert `<FigureContainer width="outset">` with `<LFADSTeaser />` after the opening paragraphs.
Insert `<FigureContainer width="outset">` with `<TrialVariabilityExplorer />` after the trial variability discussion.

- [ ] **Step 2: Write the From Linear to Nonlinear section**

**Section 2: From linear to nonlinear dynamics** (`<h2 id="from-linear-to-nonlinear">`)
- Recap: the linear state equation from PSID: x_{t+1} = Ax_t + w_t. Link back to the PSID post.
- Show the limit: what happens when the true dynamics are nonlinear? A lives on a curved manifold. The linear model fits the best ellipse, missing the shape.
- Key equation: introduce the nonlinear generalization: x_{t+1} = f(x_t) + w_t, where f is a learned function.
- Bridge sentence: "The question becomes: what is f? We need a function approximator that can represent arbitrary nonlinear dynamics while remaining trainable. This is where recurrent neural networks come in."

Insert `<FigureContainer width="outset">` with `<NonlinearFailure />`.

Sidenotes: [3] Van der Pol oscillator, [4] nonlinear manifold hypothesis

- [ ] **Step 3: Write the Recurrent Neural Networks section**

**Section 3: Recurrent neural networks** (`<h2 id="rnn">`)
- Frame the vanilla RNN as the natural nonlinear generalization of the linear state equation:
  - Linear: x_{t+1} = Ax_t (matrix multiplication)
  - RNN: h_{t+1} = tanh(W_h h_t + W_x x_t + b) (nonlinear transformation)
- Derive: write out the forward pass, explain tanh as a bounded nonlinearity
- Discuss what makes RNNs a universal approximator for sequences
- Derive the backpropagation through time gradient: dL/dh_t = prod of Jacobians
- Show why this product vanishes: each Jacobian has spectral radius < 1 (for tanh), so the product shrinks exponentially
- Key equation: the Jacobian at step k: J_k = diag(1 - h_k^2) · W_h
- Conclusion: "vanilla RNNs cannot learn long-range dependencies because gradients vanish"

Insert `<FigureContainer width="outset">` with `<RNNUnrolled />` and `<VanishingGradientExplorer />`.

Sidenotes: [5] Bengio et al. 1994 on vanishing gradients, [6] universal approximation for RNNs

Equations: number continuously from 1 (or continue from wherever the intro left off).

- [ ] **Step 4: Commit**

```bash
git add src/pages/blog/lfads.js
git commit -m "feat(lfads): write Introduction, Linear-to-Nonlinear, and RNN sections"
```

### Task 22: Write sections 4-6 (GRU, Generative Model, Variational Inference)

**Files:**
- Modify: `src/pages/blog/lfads.js`

- [ ] **Step 1: Write the GRU section**

**Section 4: Gated recurrent units** (`<h2 id="gru">`)
- Frame as: "what if the effective transition matrix depended on the current state?" The update gate z controls how much of the old state to keep vs. replace — this is a state-dependent interpolation.
- Derive three components:
  1. Reset gate: r_t = σ(W_r [h_{t-1}, x_t] + b_r) — decides which parts of old state are relevant to the candidate
  2. Update gate: z_t = σ(W_u [h_{t-1}, x_t] + b_u) — decides how much to update
  3. Candidate: h̃_t = tanh(W_c [r_t ⊙ h_{t-1}, x_t] + b_c) — new proposed state
  4. Interpolation: h_t = (1-z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t
- Explain why this solves vanishing gradients: when z ≈ 0, the gradient flows straight through (identity mapping), so the product of Jacobians doesn't shrink
- Compare to the linear state equation: if z=1 and r=1 always, you get back a nonlinear version of h = tanh(W·h + input). If z=0, you get h = h (pure memory). The GRU interpolates.

Insert `<FigureContainer width="outset">` with `<GRUGateExplorer />`.

Sidenotes: [7] Cho et al. 2014 GRU paper, [8] LSTM comparison (LFADS uses GRU, not LSTM, because fewer parameters and similar performance)

- [ ] **Step 2: Write the Generative Model section**

**Section 5: The generative model** (`<h2 id="generative-model">`)
- Now we have the building blocks. LFADS defines a generative model for neural population activity:
  1. Initial condition: z_0 ~ N(μ_0, σ_0^2 I) — determines which trajectory the generator follows
  2. Generator: g_t = GRU(g_{t-1}, u_t) — the generator GRU evolves the latent state, u_t is inferred input from the controller
  3. Factors: f_t = W_f · g_t + b_f — linear readout from generator state to low-dimensional factors
  4. Rates: λ_t = exp(W_r · f_t + b_r) — log-linear mapping to firing rates (for now, Gaussian observation: y_t ~ N(λ_t, σ^2))
- Key insight: the initial condition determines which trajectory, and the controller adds trial-specific corrections
- Write out the full generative model as a set of equations, numbered

Insert `<FigureContainer width="outset">` with `<GeneratorExplorer />` and `<FactorToRateMapping />`.

Sidenotes: [9] why factors (dimensionality reduction before the readout), [10] connection to state-space models (this IS a state-space model, just with a GRU instead of A)

- [ ] **Step 3: Write the Variational Inference section**

**Section 6: Variational inference** (`<h2 id="variational-inference">`)
- The inference problem: given observed spikes y_{1:T}, what was the initial condition z_0 and what were the inputs u_{1:T}?
- The posterior p(z_0, u_{1:T} | y_{1:T}) is intractable (no closed form)
- Introduce variational inference: approximate the posterior with a tractable distribution q(z_0, u_{1:T})
- **Derive the ELBO from scratch:**
  1. Start from log p(y) = log ∫ p(y, z) dz
  2. Introduce q: log p(y) = log ∫ [p(y,z)/q(z)] q(z) dz
  3. Apply Jensen's inequality: ≥ ∫ q(z) log [p(y,z)/q(z)] dz
  4. Expand: = E_q[log p(y|z)] - KL(q(z) || p(z))
  5. This is the ELBO: reconstruction term minus KL regularizer
- For LFADS specifically:
  - q factorizes as q(z_0)·q(u_{1:T}|y_{1:T})
  - KL term: KL(q(z_0) || p(z_0)) + sum_t KL(q(u_t) || p(u_t))
  - Reconstruction: E_q[sum_t log p(y_t | z_0, u_{1:t})]
  - For Gaussian observations: reconstruction = -1/(2σ²) sum ||y_t - λ_t||²
- The ELBO is the training objective. Maximize it by gradient ascent.

Insert `<FigureContainer width="outset">` with `<VariationalIntuition />` and `<ELBODecomposition />`.

Sidenotes: [11] Kingma & Welling VAE paper, [12] reparameterization trick (needed for backprop through sampling)

- [ ] **Step 4: Commit**

```bash
git add src/pages/blog/lfads.js
git commit -m "feat(lfads): write GRU, Generative Model, and Variational Inference sections"
```

---

## Chunk 7: Blog Post Page — Inference Network through References, and Site Integration (Sections 7-15)

### Task 23: Write sections 7-9 (Inference Network, Gaussian-to-Poisson, Training)

**Files:**
- Modify: `src/pages/blog/lfads.js`

- [ ] **Step 1: Write the Inference Network section**

**Section 7: The inference network** (`<h2 id="inference-network">`)
- q(z_0, u_{1:T}) is parameterized by neural networks (the encoder and controller)
- **Encoder** for initial conditions:
  - Bidirectional RNN reads the full spike train forward and backward
  - Concatenate final hidden states: e = [h_fwd_T, h_bwd_0]
  - Linear layers produce: μ_0 = W_μ · e + b_μ, log σ_0² = W_σ · e + b_σ
  - Sample: z_0 = μ_0 + σ_0 ⊙ ε, ε ~ N(0, I) (reparameterization trick)
- **Controller** for inferred inputs:
  - Another GRU that runs alongside the generator
  - At each step: takes the generator state and the encoded data as input
  - Outputs u_t ~ N(μ_u,t, σ_u,t²)
  - These correct for events the initial condition alone can't predict (perturbations, unexpected inputs)
- Write out the full inference network equations

Insert `<FigureContainer width="outset">` with `<EncoderArchitecture />`.

Sidenotes: [13] why bidirectional (the encoder sees the whole trial, not just the past), [14] controller as "explaining away" unexpected variance

- [ ] **Step 2: Write the Gaussian-to-Poisson section**

**Section 8: From Gaussian to Poisson** (`<h2 id="gaussian-to-poisson">`)
- So far we used Gaussian observations: y_t ~ N(λ_t, σ²). This was pedagogically simpler and connects to PSID.
- But neural spikes are counts, not continuous. The Poisson observation model is more appropriate:
  - Rates: λ_t = exp(W · f_t + b) (ensures positivity via exp)
  - Likelihood: y_t,n ~ Poisson(λ_t,n · Δt) for each neuron n
- Re-derive the reconstruction term of the ELBO:
  - Gaussian: -1/(2σ²) Σ||y_t - λ_t||²
  - Poisson: Σ_t Σ_n [y_{t,n} log λ_{t,n} - λ_{t,n} - log(y_{t,n}!)]
- The KL terms are unchanged (they're about the latent variables, not observations)
- Why this matters: Poisson naturally handles the discrete, non-negative nature of spikes, and the log-link captures the multiplicative scaling of firing rates

Insert `<FigureContainer width="outset">` with `<PoissonObservationModel />`.

Sidenote: [15] why not negative binomial or other count models

- [ ] **Step 3: Write the Training section**

**Section 9: Training** (`<h2 id="training">`)
- Maximize the ELBO with respect to all parameters (generator GRU, encoder, controller, readout) using gradient ascent (Adam optimizer in practice)
- Three training tricks that matter:
  1. **KL warmup**: start with β=0 (ignore KL, fit the data freely), linearly increase β to 1 over the first ~25% of training. Without this, the KL penalty crushes the latents before the generator learns anything useful.
  2. **Controller regularization**: set the KL penalty on the controller higher than on the initial conditions. This forces the generator to capture the predictable dynamics and reserves the controller for genuine surprises.
  3. **Coordinated dropout**: randomly drop neurons during training. This prevents the model from relying on any single neuron and improves generalization across sessions.
- Walk through what happens during training: early epochs show noisy unstructured latents, middle epochs show trajectories forming, late epochs show clean condition-separated manifolds

Insert `<FigureContainer width="outset">` with `<TrainingDynamicsExplorer />`.

Sidenote: [16] AutoLFADS (Keshtkaran et al. 2022) for automated hyperparameter tuning

- [ ] **Step 4: Commit**

```bash
git add src/pages/blog/lfads.js
git commit -m "feat(lfads): write Inference Network, Gaussian-to-Poisson, and Training sections"
```

### Task 24: Write sections 10-15 (Results, Failure Modes, Limitations, Neighbors, Implementation, References)

**Files:**
- Modify: `src/pages/blog/lfads.js`

- [ ] **Step 1: Write sections 10-12 (Results, Failure Modes, Limitations)**

**Section 10: LFADS on single trials** (`<h2 id="single-trials">`)
- Apply LFADS to the reaching task synthetic data
- Compare: raw spikes (noisy), trial-averaged PSID (smooth but loses variability), LFADS (smooth AND captures trial-to-trial variation)
- Discuss what the single-trial trajectories reveal: timing variability, speed modulation, hesitation
- Connect to BCI applications: decoding from single trials is what matters for real-time control

Insert `<FigureContainer width="outset">` with `<LFADSvsPSIDComparison />`.

**Section 11: When LFADS misleads** (`<h2 id="misleads">`)
- Controller absorption: when the controller KL penalty is too low, the controller learns to reconstruct the data by itself, and the generator learns trivial dynamics. The "dynamics" extracted are meaningless.
- Dimensionality overfitting: too many latent dims lets the model thread trajectories through noise. Cross-validation on held-out neurons or time bins helps, but the choice is still fragile.
- Identifiability: the latent space is only identified up to a rotation. Different random seeds may produce rotated versions of the same dynamics. Alignment (Procrustes) is needed for comparison.

Insert `<FigureContainer width="outset">` with `<ControllerAbsorption />` and `<DimensionalityOverfit />`.

**Section 12: Assumptions and limitations** (`<h2 id="limitations">`)
- Stationarity: assumes dynamics don't change within a session
- Trial structure: requires many trials from similar conditions
- Computational cost: orders of magnitude more expensive than PSID
- Interpretability: the GRU dynamics are a black box compared to an A matrix
- No analytical solution: results depend on optimization, initialization, hyperparameters

- [ ] **Step 2: Write sections 13-15 (Neighbors, Implementation, References)**

**Section 13: LFADS and its neighbors** (`<h2 id="neighbors">`)
- Render the comparison table from the spec as an HTML table (same styling as the CCA and PSID neighbor tables)
- Brief paragraph on each method:
  - PSID: linear, trial-averaged, but clean and closed-form
  - GPFA: smooth single-trial trajectories via GP, but linear
  - LFADS: nonlinear, single-trial, but expensive and less interpretable
  - CEBRA: contrastive learning, can incorporate behavior labels
  - pi-VAE: identifiable latent space through Poisson likelihood structure
  - MINT: flow-field approach, no encoder needed
  - SLDS: piecewise linear, more interpretable than LFADS
  - Latent ODEs: continuous-time formulation, flexible but similar tradeoffs

**Section 14: Implementation** (`<h2 id="implementation">`)
- Python/PyTorch code block showing the core LFADS model (~50 lines)
- Use `<CodeBlock>` component with Python syntax highlighting
- The code should show: GeneratorGRU class, Encoder class, LFADS class with forward() and loss()
- Brief explanation of the code structure

**Section 15: References** (`<h2 id="references">`)
- Numbered list of all 14 references from the spec
- Same `<ol className="blog-post__references">` pattern as CCA and PSID

Add the footer separator and back-to-home link.

Add the `Head` export: `<title>Latent Factor Analysis via Dynamical Systems | Felix Taschbach</title>`

- [ ] **Step 3: Commit**

```bash
git add src/pages/blog/lfads.js
git commit -m "feat(lfads): write Results, Failure Modes, Limitations, Neighbors, Implementation, and References"
```

### Task 25: Site integration

**Files:**
- Modify: `src/pages/index.js`
- Modify: `src/pages/blog/psid.js`

- [ ] **Step 1: Add LFADS card to the homepage blog section**

In `src/pages/index.js`, in the articles column (after the PSID and Lean-for-Science ArticleCards), add:

```jsx
<ArticleCard
  title="Latent Factor Analysis via Dynamical Systems"
  author="Dimensionality Reduction"
  description="Inferring single-trial neural dynamics with a deep generative model, derived from scratch with interactive figures."
  tag="March 2026"
  link="/blog/lfads/"
  borderColor="#7b68ae"
  headerBgColor="rgba(123, 104, 174, 0.12)"
/>
```

Use the encoder purple for the border color to distinguish it from the other cards.

- [ ] **Step 2: Update PSID forward link**

In `src/pages/blog/psid.js`, find and replace the paragraph starting with "The next post in this series will move beyond pairwise comparisons to aligning multiple datasets simultaneously" with:

```jsx
<p>
  The next post in this series moves from linear to nonlinear
  dynamics: <Link to="/blog/lfads/">Latent Factor Analysis via
  Dynamical Systems</Link> uses a deep generative model to infer
  single-trial neural dynamics, capturing the trial-to-trial
  variability that linear methods like PSID average away.
</p>
```

- [ ] **Step 3: Verify full integration**

Run `npm run develop` and check:
- Homepage shows the LFADS card in the blog section
- PSID post links to LFADS
- LFADS post loads with all 16 figures, TOC, and legend
- All figures are interactive (click, drag, slider)
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.js src/pages/blog/psid.js
git commit -m "feat(lfads): add homepage card and PSID forward link"
```

- [ ] **Step 5: Final commit — full build verification**

```bash
npm run build
```

If the build succeeds, the post is ready. If it fails, fix any issues and recommit.
