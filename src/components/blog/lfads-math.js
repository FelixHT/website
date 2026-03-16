// ---------------------------------------------------------------------------
// LFADS Math Module
// Synthetic data generators (limit cycle, reaching task) and RNN/GRU
// primitives for interactive LFADS figures.
// Imports shared linear algebra from cca-math.js and seeded PRNG from psid-math.js.
// ---------------------------------------------------------------------------

import { zeros, matMul, matT } from "./cca-math"
import { mulberry32, seededRandn } from "./psid-math"

// ===================== Poisson Sampling =====================================

/**
 * Sample from Poisson(rate) using the inverse CDF (Knuth) method.
 * rng: a function returning uniform [0, 1) values.
 */
export function poissonSample(rate, rng) {
  if (rate <= 0) return 0
  if (rate > 30) {
    // Normal approximation: Poisson(rate) ~ N(rate, rate) for large rate
    const u1 = rng() || 1e-15
    const u2 = rng()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return Math.max(0, Math.round(rate + Math.sqrt(rate) * z))
  }
  const L = Math.exp(-rate)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

// ===================== Limit Cycle Generator ================================

/**
 * Simulate a Van der Pol oscillator and generate Poisson spiking observations.
 *
 * Van der Pol system (rewritten as 2D):
 *   dx1/dt = x2
 *   dx2/dt = mu * (1 - x1^2) * x2 - x1
 *
 * Integrated with Euler method at step dt.
 *
 * Observation model:
 *   C: nNeurons x 2 random matrix (from seed)
 *   rates[t] = exp(C * [x1, x2]^T)  (log-link for Poisson)
 *   spikes[t][n] = Poisson(rates[t][n])
 *
 * perturbations: array of { time, dx1, dx2 } impulses applied to state.
 *
 * Returns { X: T x 2, rates: T x nNeurons, spikes: T x nNeurons, C }
 */
export function generateLimitCycle(params = {}, seed = 42) {
  const {
    mu = 1.5,
    dt = 0.02,
    T = 500,
    nNeurons = 10,
    sigmaObs = 0.0,
    perturbations = [],
  } = params

  const rng = mulberry32(seed)

  // Generate random observation matrix C: nNeurons x 2
  const C = seededRandn(nNeurons, 2, rng)

  // Scale C so rates are reasonable (avoid overflow in exp)
  for (let i = 0; i < nNeurons; i++) {
    for (let j = 0; j < 2; j++) {
      C[i][j] *= 0.5
    }
  }

  // Integrate Van der Pol
  const X = zeros(T, 2)
  // Initial condition on the limit cycle (roughly)
  X[0][0] = 2.0
  X[0][1] = 0.0

  for (let t = 0; t < T - 1; t++) {
    let x1 = X[t][0]
    let x2 = X[t][1]

    // Apply perturbations at this timestep
    for (let p = 0; p < perturbations.length; p++) {
      if (perturbations[p].time === t) {
        x1 += perturbations[p].dx1 || 0
        x2 += perturbations[p].dx2 || 0
      }
    }

    // Euler integration
    const dx1 = x2
    const dx2 = mu * (1 - x1 * x1) * x2 - x1
    X[t + 1][0] = x1 + dt * dx1
    X[t + 1][1] = x2 + dt * dx2
  }

  // Generate rates and spikes
  const rates = zeros(T, nNeurons)
  const spikes = zeros(T, nNeurons)

  for (let t = 0; t < T; t++) {
    for (let n = 0; n < nNeurons; n++) {
      // Linear projection
      let logRate = 0
      for (let j = 0; j < 2; j++) {
        logRate += C[n][j] * X[t][j]
      }
      const rate = Math.exp(logRate)
      rates[t][n] = rate
      spikes[t][n] = poissonSample(rate, rng)
    }
  }

  return { X, rates, spikes, C }
}

// ===================== Reaching Task Generator ==============================

/**
 * Generate synthetic reaching task data with trial-to-trial variability.
 *
 * nConditions reach directions, each with a curved latent trajectory in 3D.
 * Latent dims: 2 rotational (condition-dependent angle) + 1 speed-modulated.
 *
 * Trial-to-trial variability:
 *   - Reaction time jitter: onset sampled from N(20, 3^2) timesteps
 *   - Speed scaling: time-warp factor sampled from N(1.0, 0.1^2)
 *
 * Returns { spikes: [nCond][nTrials] each T x nNeurons,
 *           rates: same structure,
 *           latents: same structure T x 3,
 *           conditions: [0..nCond-1],
 *           C }
 */
export function generateReachingTask(nConditions = 8, nTrials = 15, nNeurons = 20, seed = 42) {
  const T = 100
  const rng = mulberry32(seed)

  // Random observation matrix C: nNeurons x 3
  const C = seededRandn(nNeurons, 3, rng)

  // Scale C to keep rates in reasonable range
  for (let i = 0; i < nNeurons; i++) {
    for (let j = 0; j < 3; j++) {
      C[i][j] *= 0.3
    }
  }

  // Baseline firing rate (in log space)
  const baseline = new Float64Array(nNeurons)
  for (let i = 0; i < nNeurons; i++) {
    baseline[i] = 0.5 + rng() * 0.5
  }

  const spikes = []
  const rates = []
  const latents = []
  const conditions = []

  for (let cond = 0; cond < nConditions; cond++) {
    conditions.push(cond)
    const condSpikes = []
    const condRates = []
    const condLatents = []
    const theta = (2 * Math.PI * cond) / nConditions

    for (let trial = 0; trial < nTrials; trial++) {
      // Sample reaction time onset (Box-Muller for normal)
      const u1 = rng() || 1e-15
      const u2 = rng()
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
      const onset = Math.max(5, Math.min(40, Math.round(20 + 3 * z1)))

      // Sample speed warp factor
      const warp = Math.max(0.6, Math.min(1.4, 1.0 + 0.1 * z2))

      const trialLatents = zeros(T, 3)
      const trialRates = zeros(T, nNeurons)
      const trialSpikes = zeros(T, nNeurons)

      for (let t = 0; t < T; t++) {
        if (t >= onset) {
          // Time since onset, warped
          const tRel = (t - onset) / warp
          // Movement duration roughly 60 timesteps (unwarped)
          const moveDur = 60
          // Progress through movement [0, 1+]
          const progress = Math.min(tRel / moveDur, 1.0)

          // Smooth ramp-up and hold using a sigmoid-like profile
          const ramp = progress < 1.0
            ? 0.5 * (1 - Math.cos(Math.PI * progress))
            : 1.0

          // Rotational latent dimensions
          trialLatents[t][0] = ramp * Math.cos(theta + 0.5 * Math.PI * progress)
          trialLatents[t][1] = ramp * Math.sin(theta + 0.5 * Math.PI * progress)
          // Speed dimension: bell-shaped speed profile
          const speedPhase = Math.PI * progress
          trialLatents[t][2] = Math.sin(speedPhase) * 1.5
        }
        // else: zeros (pre-movement, already initialized)

        // Compute rates
        for (let n = 0; n < nNeurons; n++) {
          let logRate = baseline[n]
          for (let j = 0; j < 3; j++) {
            logRate += C[n][j] * trialLatents[t][j]
          }
          const rate = Math.exp(logRate)
          trialRates[t][n] = rate
          trialSpikes[t][n] = poissonSample(rate, rng)
        }
      }

      condSpikes.push(trialSpikes)
      condRates.push(trialRates)
      condLatents.push(trialLatents)
    }

    spikes.push(condSpikes)
    rates.push(condRates)
    latents.push(condLatents)
  }

  return { spikes, rates, latents, conditions, C }
}

// ===================== Activation Functions =================================

/**
 * Sigmoid activation: 1 / (1 + exp(-x)).
 */
export function sigmoid(x) {
  if (x >= 0) {
    return 1 / (1 + Math.exp(-x))
  }
  // Numerically stable for negative x
  const ex = Math.exp(x)
  return ex / (1 + ex)
}

// ===================== RNN Step =============================================

/**
 * Single step of a vanilla RNN with tanh activation.
 *
 * h: d-vector (previous hidden state)
 * x: p-vector (input)
 * Wh: d x d weight matrix
 * Wx: d x p input weight matrix
 * b: d-vector bias
 *
 * Returns { h_new, pre_activation }
 *   h_new = tanh(Wh * h + Wx * x + b)
 *   pre_activation = Wh * h + Wx * x + b
 */
export function rnnStep(h, x, Wh, Wx, b) {
  const d = h.length
  const p = x.length
  const pre = new Float64Array(d)
  const h_new = new Float64Array(d)

  for (let i = 0; i < d; i++) {
    let s = b[i]
    for (let j = 0; j < d; j++) s += Wh[i][j] * h[j]
    for (let j = 0; j < p; j++) s += Wx[i][j] * x[j]
    pre[i] = s
    h_new[i] = Math.tanh(s)
  }

  return { h_new, pre_activation: pre }
}

// ===================== GRU Step =============================================

/**
 * Single step of a GRU (Gated Recurrent Unit) with full gate outputs.
 *
 * h: d-vector (previous hidden state)
 * x: p-vector (input)
 * Wr: d x (d+p) reset gate weights
 * Wu: d x (d+p) update gate weights
 * Wc: d x (d+p) candidate weights
 * br: d-vector reset gate bias
 * bu: d-vector update gate bias
 * bc: d-vector candidate bias
 *
 * Computation:
 *   concat = [h, x]
 *   r = sigmoid(Wr * concat + br)          (reset gate)
 *   z = sigmoid(Wu * concat + bu)          (update gate)
 *   h_tilde = tanh(Wc * [r*h, x] + bc)    (candidate)
 *   h_new = (1 - z) * h + z * h_tilde     (interpolation)
 *
 * Returns { h_new, r, z, h_tilde, pre_r, pre_z, pre_h_tilde }
 */
export function gruStep(h, x, Wr, Wu, Wc, br, bu, bc) {
  const d = h.length
  const p = x.length
  const dp = d + p

  // Concatenate [h, x]
  const concat = new Float64Array(dp)
  for (let i = 0; i < d; i++) concat[i] = h[i]
  for (let i = 0; i < p; i++) concat[d + i] = x[i]

  // Reset gate: r = sigmoid(Wr * [h, x] + br)
  const pre_r = new Float64Array(d)
  const r = new Float64Array(d)
  for (let i = 0; i < d; i++) {
    let s = br[i]
    for (let j = 0; j < dp; j++) s += Wr[i][j] * concat[j]
    pre_r[i] = s
    r[i] = sigmoid(s)
  }

  // Update gate: z = sigmoid(Wu * [h, x] + bu)
  const pre_z = new Float64Array(d)
  const z = new Float64Array(d)
  for (let i = 0; i < d; i++) {
    let s = bu[i]
    for (let j = 0; j < dp; j++) s += Wu[i][j] * concat[j]
    pre_z[i] = s
    z[i] = sigmoid(s)
  }

  // Candidate: h_tilde = tanh(Wc * [r*h, x] + bc)
  const rh_concat = new Float64Array(dp)
  for (let i = 0; i < d; i++) rh_concat[i] = r[i] * h[i]
  for (let i = 0; i < p; i++) rh_concat[d + i] = x[i]

  const pre_h_tilde = new Float64Array(d)
  const h_tilde = new Float64Array(d)
  for (let i = 0; i < d; i++) {
    let s = bc[i]
    for (let j = 0; j < dp; j++) s += Wc[i][j] * rh_concat[j]
    pre_h_tilde[i] = s
    h_tilde[i] = Math.tanh(s)
  }

  // Interpolation: h_new = (1 - z) * h + z * h_tilde
  const h_new = new Float64Array(d)
  for (let i = 0; i < d; i++) {
    h_new[i] = (1 - z[i]) * h[i] + z[i] * h_tilde[i]
  }

  return { h_new, r, z, h_tilde, pre_r, pre_z, pre_h_tilde }
}

// ===================== RNN Unrolling ========================================

/**
 * Unroll a vanilla RNN for T steps.
 *
 * h0: d-vector initial hidden state
 * inputs: T x p matrix of inputs
 * params: { Wh, Wx, b }
 *
 * Returns { states: T x d (hidden states), preActivations: T x d }
 */
export function unrollRNN(h0, inputs, params) {
  const T = inputs.length
  const d = h0.length
  const { Wh, Wx, b } = params

  const states = zeros(T, d)
  const preActivations = zeros(T, d)

  let h = h0
  for (let t = 0; t < T; t++) {
    const x = inputs[t]
    const { h_new, pre_activation } = rnnStep(h, x, Wh, Wx, b)
    for (let i = 0; i < d; i++) {
      states[t][i] = h_new[i]
      preActivations[t][i] = pre_activation[i]
    }
    h = h_new
  }

  return { states, preActivations }
}

// ===================== Gradient Norm Computation ============================

/**
 * Compute ||dL/dh_t|| for each timestep assuming L = ||h_T||^2 (loss at final step).
 *
 * Uses the chain rule: dh_T/dh_t = prod_{k=t}^{T-1} diag(1 - h_k^2) * Wh
 * The Jacobian at step k is diag(1 - states[k]^2) * Wh (tanh derivative).
 *
 * states: T x d hidden states from unrollRNN
 * params: { Wh } (only Wh is needed)
 *
 * Returns array of T gradient norms (floats).
 */
export function computeGradientNorms(states, params) {
  const T = states.length
  const d = states[0].length
  const { Wh } = params

  // dL/dh_T = 2 * h_T (gradient of ||h_T||^2)
  const dLdh_T = new Float64Array(d)
  for (let i = 0; i < d; i++) {
    dLdh_T[i] = 2 * states[T - 1][i]
  }

  const gradNorms = new Array(T)

  // Start from the last timestep and propagate backward
  // At t = T-1: gradient is dL/dh_T itself
  // At t < T-1: dL/dh_t = dL/dh_{t+1} * J_t where J_t = diag(1 - h_t^2) * Wh
  // But we must be careful: the Jacobian dh_{t+1}/dh_t = diag(1 - h_{t+1}^2) * Wh
  // since h_{t+1} = tanh(Wh * h_t + ...) and dtanh/dx = 1 - tanh^2(x) = 1 - h_{t+1}^2

  let grad = new Float64Array(d)
  for (let i = 0; i < d; i++) grad[i] = dLdh_T[i]

  gradNorms[T - 1] = vecNormF64(grad)

  for (let t = T - 2; t >= 0; t--) {
    // Propagate: grad = grad * J_{t+1} where J_{t+1} = diag(1 - states[t+1]^2) * Wh
    // grad_new[j] = sum_i grad[i] * (1 - states[t+1][i]^2) * Wh[i][j]
    const newGrad = new Float64Array(d)
    for (let j = 0; j < d; j++) {
      let s = 0
      for (let i = 0; i < d; i++) {
        const dtanh = 1 - states[t + 1][i] * states[t + 1][i]
        s += grad[i] * dtanh * Wh[i][j]
      }
      newGrad[j] = s
    }
    grad = newGrad
    gradNorms[t] = vecNormF64(grad)
  }

  return gradNorms
}

// ===================== Internal Helpers =====================================

/**
 * Euclidean norm of a Float64Array or plain array.
 */
function vecNormF64(v) {
  let s = 0
  for (let i = 0; i < v.length; i++) s += v[i] * v[i]
  return Math.sqrt(s)
}
