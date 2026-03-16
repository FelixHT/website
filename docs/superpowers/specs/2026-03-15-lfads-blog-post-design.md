# LFADS Blog Post Design Spec

**Date:** 2026-03-15
**Status:** Draft
**Series position:** Third in CCA → PSID → LFADS arc

## Overview

A full-derivation interactive blog post on Latent Factor Analysis via Dynamical Systems (LFADS), following the same format as the CCA and PSID posts. Everything derived from scratch — including vanilla RNNs, GRUs, variational inference, and the full LFADS architecture — with 16 interactive D3/React figures.

**Title:** Latent Factor Analysis via Dynamical Systems
**Subtitle:** Inferring single-trial neural dynamics with a deep generative model, derived from scratch with interactive figures.
**Route:** `/blog/lfads/`

## Narrative arc

The CCA→PSID transition was "CCA ignores temporal structure." The PSID→LFADS transition is "PSID recovers one set of dynamics per dataset — an average across trials. Single-trial variability is lost."

The post motivates LFADS through the single-trial inference problem: trial-averaging destroys timing variability, condition-dependent speed, and trial-to-trial deviations that carry scientific signal. LFADS addresses this with a deep generative model that infers latent dynamics on every individual trial.

**Prerequisites stated explicitly:** Comfort with linear algebra and state-space models from the PSID post. No prior exposure to neural networks, variational inference, or deep learning.

## Table of contents

1. **Introduction** — single-trial problem, why PSID's averaging breaks down, reaching task as motivation
2. **From linear to nonlinear dynamics** — recap linear state equation from PSID, show where it fails on nonlinear data, motivate learned dynamics
3. **Recurrent neural networks** — derive vanilla RNN as nonlinear generalization of x(t+1) = Ax(t), vanishing gradient problem
4. **Gated recurrent units** — derive GRU gates as a solution to vanishing gradients, frame as "what if A depended on x?", show how information persists
5. **The generative model** — LFADS generator: GRU-based dynamics, initial conditions, factor-to-rate mapping, Gaussian observation model first
6. **Variational inference** — intractable posterior, derive the ELBO from scratch, reconstruction vs. KL terms
7. **The inference network** — bidirectional encoder for initial conditions, controller for inferred inputs
8. **From Gaussian to Poisson** — swap in Poisson likelihood, re-derive relevant ELBO terms, why this matters for spikes
9. **Training** — KL warmup schedule, controller regularization, coordinated dropout
10. **LFADS on single trials** — apply to reaching task, compare to trial-averaging and PSID
11. **When LFADS misleads** — controller absorption, dimensionality overfitting, identifiability issues
12. **Assumptions and limitations** — stationarity, trial structure, computational cost, interpretability tradeoffs
13. **LFADS and its neighbors** — comparison table (PSID, GPFA, LFADS, CEBRA, pi-VAE, MINT, SLDS, Latent ODEs)
14. **Implementation** — Python/PyTorch code block
15. **References**

## Interactive figures (16 total)

### Introduction (2 figures)

**1. LFADSTeaser** — Hero figure. Left: raster plot of spikes from a reaching task (8 directions, condition-colored). Middle: inferred single-trial latent trajectories (curved, condition-colored). Right: inferred firing rates overlaid on raw spikes. Regenerate button resamples trials.

**2. TrialVariabilityExplorer** — Top: overlaid single-trial spike trains for one condition. Bottom-left: PSTH (trial-averaged rate). Bottom-right: single-trial rates from LFADS. Slider controls number of trials averaged. Shows how averaging destroys timing variability that LFADS preserves.

### From linear to nonlinear (1 figure)

**3. NonlinearFailure** — Same layout as PSID's LatentDynamicsExplorer but with a nonlinear system (Van der Pol limit cycle). Toggle between linear fit (PSID-style, fails to capture the manifold) and the true nonlinear trajectory. Makes the case for nonlinear dynamics viscerally.

### Recurrent neural networks (2 figures)

**4. RNNUnrolled** — Step through an unrolled vanilla RNN. Click "next timestep" to watch activations propagate. Shows the recurrence h(t) = tanh(Wh + Ux) as a computational graph. Color-codes the gradient path backward through time.

**5. VanishingGradientExplorer** — Drag a slider to increase sequence length. Watch gradient magnitude (bar heights) shrink exponentially at early timesteps. Toggle between tanh (vanishing) and linear (exploding) to show why neither works.

### Gated recurrent units (1 figure)

**6. GRUGateExplorer** — Interactive GRU cell diagram. Shows reset gate, update gate, and candidate state as three parallel paths. Feed in a concrete numerical input, step through the gate computations, see how the update gate interpolates between old and new state. Toggle individual gates on/off to see what breaks.

### The generative model (2 figures)

**7. GeneratorExplorer** — LFADS generator as a GRU stepping through time. Given an initial condition (draggable in 2D latent space), watch the trajectory unfold nonlinearly. Compare to the linear A·x trajectory from the same IC. Uses the limit cycle system.

**8. FactorToRateMapping** — Low-dimensional factors on the left, linear readout matrix in the middle, firing rates on the right. Drag a factor trajectory and see how neuron rates change. Adjust readout weights to see their effect.

### Variational inference (2 figures)

**9. VariationalIntuition** — True posterior (complex, multimodal) shown as a 2D density heatmap. Variational approximation (Gaussian) overlaid. Slider controls optimization progress — watch the Gaussian tighten around a mode. Shows KL divergence numerically updating in real time.

**10. ELBODecomposition** — Bar chart decomposing the ELBO into reconstruction term and KL term. Slider sweeps the KL weight (β). As β increases, reconstruction worsens but latents become more regular. Shows actual loss values on a synthetic example.

### The inference network (1 figure)

**11. EncoderArchitecture** — Bidirectional RNN reading a spike train. Arrows show forward and backward passes converging to produce the initial condition (μ, σ). Below: the controller network receiving encoded state and producing inferred inputs at each timestep. Click different trials to see different ICs and controller inputs.

### From Gaussian to Poisson (1 figure)

**12. PoissonObservationModel** — Left: log-rates as smooth curves. Middle: exp transform to rates. Right: Poisson spike samples. Click "resample" to draw new spikes from the same rates. Toggle between Gaussian and Poisson observation models to see the difference in generated data.

### Training (1 figure)

**13. TrainingDynamicsExplorer** — Epoch slider. Watch: ELBO curve improving, KL term ramping up (warmup schedule visible), latent trajectories going from messy to structured, reconstructed rates sharpening. Uses pre-computed snapshots at different epochs, not live training.

### LFADS on single trials (1 figure)

**14. LFADSvsPSIDComparison** — Same synthetic reaching dataset. Toggle: raw spikes, trial-averaged PSID, single-trial LFADS. Side-by-side latent trajectories. PSID shows one trajectory per condition; LFADS shows per-trial trajectories that fan out, capturing timing variability.

### When LFADS misleads (2 figures)

**15. ControllerAbsorption** — Two panels. Left: well-regularized LFADS (controller is sparse, generator captures dynamics). Right: under-regularized (controller fires constantly, generator is idle). Slider adjusts controller KL penalty to show the transition between regimes.

**16. DimensionalityOverfit** — Drag latent dimensionality slider. Low dims: underfitting (trajectories too simple). Right dims: clean manifold. Too many dims: overfitting (trajectories thread through noise). Shows reconstruction R² and a gap statistic.

## Math module: `lfads-math.js`

Imports shared linear algebra from `cca-math.js` and seeded PRNG from `psid-math.js`. ~800 lines.

### Synthetic data generators

- `generateReachingTask(nConditions, nTrials, nNeurons, seed)` — 8-direction reaching with condition-dependent curved latent trajectories, variable trial timing, Poisson spiking. Returns `{ spikes, rates, latents, conditions }`.
- `generateLimitCycle(params, seed)` — Van der Pol oscillator observed through spiking neurons. Configurable nonlinearity strength, noise, perturbations. Returns `{ X, Y, spikes, rates }`.

### RNN/GRU primitives

For interactive figures, not full training:

- `rnnStep(h, x, Wh, Wx, b)` — single vanilla RNN step with tanh
- `gruStep(h, x, Wr, Wu, Wc, br, bu, bc)` — single GRU step with explicit gate outputs
- `unrollRNN(h0, inputs, params)` — unroll for T steps, return activations and gradient magnitudes
- `computeGradientNorms(activations, params)` — backprop-through-time gradient norms per timestep

### Variational inference utilities

- `gaussianKL(mu, logvar)` — KL divergence between N(μ, σ²) and N(0, 1)
- `poissonLogLik(spikes, logRates)` — Poisson log-likelihood
- `gaussianLogLik(y, mu, sigma)` — Gaussian log-likelihood
- `computeELBO(recon, kl, beta)` — weighted ELBO

### Pre-trained demonstration model

No in-browser training. Ship a small pre-fit model as JSON constants:

- `lfads-demo-model.json` — ~50KB: generator GRU weights, encoder weights, readout matrix, plus epoch snapshots for the training dynamics figure
- `loadDemoModel()` — parse and return `{ generatorWeights, encoderWeights, readoutWeights, epochSnapshots }`
- `inferSingleTrial(spikes, model)` — run encoder + generator forward pass on one trial
- `generateFromIC(ic, model, T)` — run generator forward from an initial condition

### Key constraint

All figures run forward passes only. No gradient computation or backprop in the browser. The training dynamics figure uses pre-computed epoch snapshots. This keeps the math module tractable and the page performant.

## Color palette

Extends `figureConstants.js`. Maintains visual continuity with CCA and PSID.

| Role | Color | Hex | Continuity |
|------|-------|-----|------------|
| Generator / latent dynamics | Blue | `#4A90D9` | = latent state in PSID |
| Observations / spikes | Teal-green | `#4A7C6F` | = observations in PSID |
| Behavior / reach conditions | Orange | `#D4783C` | = behavior in PSID |
| Encoder / inference network | Purple | `#8b6aad` | New color (distinct from `bci: #7a5f9a` in figureConstants) |
| Controller / inferred inputs | Amber | `#d4a03c` | = `dynamics` in figureConstants |
| KL / regularization | Red-brown | `#c0503a` | = `challenge` in figureConstants |
| Noise / inactive | Gray | `#999999` | = noise across series |
| Condition colors (8 directions) | Categorical | — | `d3.schemeTableau10` sliced to 8 |

**VariableLegend groups:**

`scrollTargetId: "from-linear-to-nonlinear"` (appears when section 2 scrolls into view, where notation is introduced)

- Generator: `x_t`, `A` (GRU), `g_t` — blue
- Observations: `y_t`, `C`, `λ_t` (rates) — teal
- Behavior: `z_t`, conditions — orange
- Encoder: `e_t`, `μ_0`, `σ_0` — purple
- Controller: `u_t`, `K` (controller GRU) — amber
- Regularization: `KL`, `β`, `ELBO` — red-brown

## File structure

### New files (18 total)

```
src/pages/blog/lfads.js                          — main post (~2000-2500 lines)
src/components/blog/lfads-math.js                — math module (~800 lines)
src/components/blog/lfads-demo-model.json        — pre-trained weights (~50KB)
src/components/blog/LFADSTeaser.js
src/components/blog/TrialVariabilityExplorer.js
src/components/blog/NonlinearFailure.js
src/components/blog/RNNUnrolled.js
src/components/blog/VanishingGradientExplorer.js
src/components/blog/GRUGateExplorer.js
src/components/blog/GeneratorExplorer.js
src/components/blog/FactorToRateMapping.js
src/components/blog/VariationalIntuition.js
src/components/blog/ELBODecomposition.js
src/components/blog/EncoderArchitecture.js
src/components/blog/PoissonObservationModel.js
src/components/blog/TrainingDynamicsExplorer.js
src/components/blog/LFADSvsPSIDComparison.js
src/components/blog/ControllerAbsorption.js
src/components/blog/DimensionalityOverfit.js
```

### Modified files (3)

- `src/components/blog/figureConstants.js` — add `encoder: "#8b6aad"` and `controller: "#d4a03c"` to COLORS
- `src/pages/index.js` — add LFADS card to blog section
- `src/pages/blog/psid.js` — replace the existing forward-link paragraph (lines 781-785, which currently promises a multi-population alignment post) with a link to LFADS: "The next post in this series moves from linear to nonlinear dynamics..."

## Synthetic data design

**Reaching task** (teaser, trial variability, LFADS vs PSID figures):
- 8 reach directions, 15 trials per condition
- 20 neurons with Poisson spiking
- Latent trajectories are condition-dependent curved paths in 3D (two rotational dims + one speed-modulated dim)
- Trial-to-trial variability in reaction time (latent trajectory onset jitter) and movement speed (time-warping)
- This is where single-trial inference visibly matters

**Limit cycle** (nonlinear failure, generator explorer, derivation figures):
- Van der Pol oscillator: x'' - μ(1-x²)x' + x = 0
- Observed through 10 Poisson-spiking neurons
- Configurable μ for nonlinearity strength
- Optional perturbations on single trials (for controller/inferred inputs demonstration)
- Simpler than reaching task, lets the math stand out

## Prose conventions

- Opening references PSID and names its limitation (single-trial)
- ~10-15 sidenotes for historical context, caveats, tangential connections
- Continuous equation numbering
- "When LFADS misleads" section with practitioner-relevant failure modes
- Prerequisites stated: linear algebra + state-space models from PSID, no neural network background needed
- GRU framed as generalization of linear state equation: "what if A itself depended on x?"
- Gaussian ELBO derived first (bridges from PSID), then Poisson swapped in
- Closing: back-to-home link, optional note about future series direction

## Neighbors comparison table

| Method | Dynamics | Observation model | Single-trial | Nonlinear | Behavioral supervision |
|--------|----------|-------------------|-------------|-----------|----------------------|
| PSID | Linear (A matrix) | Gaussian | No (trial-averaged) | No | Yes (preferential) |
| GPFA | Linear (GP smoothed) | Gaussian/Poisson | Yes (smoothing) | No | No |
| **LFADS** | **Nonlinear (GRU)** | **Poisson** | **Yes (VAE)** | **Yes** | **No** |
| CEBRA | Nonlinear (encoder) | Contrastive loss | Yes | Yes | Yes (label-conditioned) |
| pi-VAE | Nonlinear (MLP decoder) | Poisson | Yes | Yes | Yes (identifiable) |
| MINT | Flow field | Gaussian | Yes | Yes (local) | No |
| SLDS | Piecewise linear | Gaussian | Yes (EM) | Piecewise | No |
| Latent ODEs | Continuous (Neural ODE) | Gaussian/Poisson | Yes | Yes | No |

## References (preliminary)

1. Pandarinath et al., "Inferring single-trial neural population dynamics using sequential auto-encoders," *Nature Methods*, 2018.
2. Sussillo et al., "LFADS — Latent Factor Analysis via Dynamical Systems," arXiv:1608.06315, 2016.
3. Cho et al., "Learning phrase representations using RNN encoder-decoder for statistical machine translation," EMNLP, 2014. (GRU)
4. Kingma and Welling, "Auto-Encoding Variational Bayes," ICLR, 2014. (VAE)
5. Hochreiter and Schmidhuber, "Long short-term memory," *Neural Computation*, 1997. (LSTM/vanishing gradients)
6. Sani et al., "Modeling behaviorally relevant neural dynamics enabled by preferential subspace identification," *Nature Neuroscience*, 2021. (PSID, for comparison)
7. Yu et al., "Gaussian-process factor analysis for low-dimensional single-trial analysis of neural population activity," *Journal of Neurophysiology*, 2009. (GPFA)
8. Schneider et al., "Learnable latent embeddings for joint behavioural and neural analysis," *Nature*, 2023. (CEBRA)
9. Zhou and Wei, "Learning identifiable and interpretable latent models of high-dimensional neural activity using pi-VAE," NeurIPS, 2020. (pi-VAE)
10. Qi and Bhatt, "MINT: a method for inferring neural trajectories from observed firing rates," bioRxiv, 2024. (MINT)
11. Linderman et al., "Bayesian learning and inference in recurrent switching linear dynamical systems," AISTATS, 2017. (SLDS)
12. Chen et al., "Neural ordinary differential equations," NeurIPS, 2018. (Neural ODEs)
13. Keshtkaran et al., "A large-scale neural network training framework for generalized estimation of single-trial population dynamics," *Nature Methods*, 2022. (AutoLFADS)
14. Bengio et al., "Learning long-term dependencies with gradient descent is difficult," IEEE Trans. Neural Networks, 1994. (Vanishing gradients)
