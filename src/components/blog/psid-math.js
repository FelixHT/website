// ---------------------------------------------------------------------------
// PSID Math Module
// State-space simulation, subspace identification, and PSID algorithm.
// Imports shared linear algebra from cca-math.js.
// ---------------------------------------------------------------------------

import { zeros, matMul, matT, jacobiEigen, generalCCA } from "./cca-math"

// ===================== Seeded PRNG =========================================

/**
 * Mulberry32: seeded 32-bit PRNG returning uniform [0, 1).
 */
export function mulberry32(seed) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generate an n x m matrix of standard normal values using a seeded RNG.
 * Box-Muller transform.
 */
export function seededRandn(n, m, rng) {
  const A = zeros(n, m)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j += 2) {
      const u1 = rng() || 1e-15
      const u2 = rng()
      const r = Math.sqrt(-2 * Math.log(u1))
      const theta = 2 * Math.PI * u2
      A[i][j] = r * Math.cos(theta)
      if (j + 1 < m) A[i][j + 1] = r * Math.sin(theta)
    }
  }
  return A
}

// ===================== Default System ======================================

/**
 * Returns the default synthetic system matrices.
 * A: 3x3 block-diagonal (2x2 rotation at 0.05 rad/step + scalar oscillation at 0.3 rad/step)
 * C: 6x3 observation matrix (fixed random, seed=42)
 * L: 1x3 behavioral readout [1, 1, 0]
 */
export function defaultSystem() {
  const theta1 = 0.05 // slow rotation for behaviorally relevant dims
  const theta2 = 0.3  // fast oscillation for irrelevant dim

  const A = zeros(3, 3)
  // 2x2 rotation block (relevant)
  A[0][0] = Math.cos(theta1); A[0][1] = -Math.sin(theta1)
  A[1][0] = Math.sin(theta1); A[1][1] = Math.cos(theta1)
  // scalar (irrelevant oscillation)
  A[2][2] = Math.cos(theta2)

  // Fixed random C matrix (6x3) from seed 42
  const rng = mulberry32(42)
  const C = seededRandn(6, 3, rng)
  // Scale columns so observations have reasonable magnitude
  for (let j = 0; j < 3; j++) {
    let norm = 0
    for (let i = 0; i < 6; i++) norm += C[i][j] * C[i][j]
    norm = Math.sqrt(norm)
    for (let i = 0; i < 6; i++) C[i][j] /= norm
  }

  // Behavioral readout: only first two dims
  const L = [[1, 1, 0]]

  return { A, C, L }
}

// ===================== State-Space Simulation ==============================

/**
 * Simulate a linear state-space model.
 *   x_{t+1} = A x_t + w_t    (w_t ~ N(0, sigmaW^2 I))
 *   y_t = C x_t + v_t          (v_t ~ N(0, sigmaV^2 I))
 *   z_t = L x_t + e_t          (e_t ~ N(0, sigmaZ^2))
 *
 * Returns { X: T x d, Y: T x m, Z: T x 1 }
 */
export function simulateStateSpace(A, C, L, T, params = {}) {
  const {
    sigmaW = 0.1,
    sigmaV = 0.3,
    sigmaZ = 0.1,
    seed = 1,
  } = params

  const d = A.length    // latent dim (3)
  const m = C.length     // observation dim (6)
  const rng = mulberry32(seed)

  const X = zeros(T, d)
  const Y = zeros(T, m)
  const Z = zeros(T, 1)

  // Initial state: small random
  for (let j = 0; j < d; j++) X[0][j] = 0.1 * (rng() - 0.5)

  for (let t = 0; t < T; t++) {
    // Observation: y_t = C x_t + v_t
    for (let i = 0; i < m; i++) {
      let s = 0
      for (let j = 0; j < d; j++) s += C[i][j] * X[t][j]
      // Box-Muller for observation noise
      const u1 = rng() || 1e-15
      const u2 = rng()
      s += sigmaV * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      Y[t][i] = s
    }

    // Behavior: z_t = L x_t + e_t
    let z = 0
    for (let j = 0; j < d; j++) z += L[0][j] * X[t][j]
    const u1z = rng() || 1e-15
    const u2z = rng()
    z += sigmaZ * Math.sqrt(-2 * Math.log(u1z)) * Math.cos(2 * Math.PI * u2z)
    Z[t][0] = z

    // State transition: x_{t+1} = A x_t + w_t
    if (t < T - 1) {
      for (let i = 0; i < d; i++) {
        let s = 0
        for (let j = 0; j < d; j++) s += A[i][j] * X[t][j]
        const u1w = rng() || 1e-15
        const u2w = rng()
        s += sigmaW * Math.sqrt(-2 * Math.log(u1w)) * Math.cos(2 * Math.PI * u2w)
        X[t + 1][i] = s
      }
    }
  }

  return { X, Y, Z }
}

// ===================== Centering ==========================================

/**
 * Center columns of a matrix (subtract column means). Returns new matrix.
 */
export function centerColumns(M) {
  const n = M.length, m = M[0].length
  const means = new Float64Array(m)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) means[j] += M[i][j]
  for (let j = 0; j < m; j++) means[j] /= n

  const Mc = zeros(n, m)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) Mc[i][j] = M[i][j] - means[j]
  return Mc
}

// ===================== Block Hankel Matrix =================================

/**
 * Build block Hankel matrices from observation data.
 *
 * Y: T x m observation matrix
 * numLags: number of block rows (i)
 *
 * Returns { past: (numLags*m) x N, future: (numLags*m) x N }
 * where N = T - 2*numLags + 1
 */
export function buildHankel(Y, numLags) {
  const T = Y.length
  const m = Y[0].length
  const N = T - 2 * numLags + 1
  if (N < 1) throw new Error("Not enough data for given numLags")

  const blockDim = numLags * m
  const past = zeros(blockDim, N)
  const future = zeros(blockDim, N)

  for (let col = 0; col < N; col++) {
    // Past block: rows t=col to t=col+numLags-1
    for (let lag = 0; lag < numLags; lag++) {
      const t = col + lag
      for (let ch = 0; ch < m; ch++) {
        past[lag * m + ch][col] = Y[t][ch]
      }
    }
    // Future block: rows t=col+numLags to t=col+2*numLags-1
    for (let lag = 0; lag < numLags; lag++) {
      const t = col + numLags + lag
      for (let ch = 0; ch < m; ch++) {
        future[lag * m + ch][col] = Y[t][ch]
      }
    }
  }

  return { past, future, N, blockDim }
}

/**
 * Build a block Hankel matrix for a single signal (e.g., behavior Z).
 * Z: T x p matrix
 * Returns { future: (numLags*p) x N } aligned with buildHankel's future.
 */
export function buildHankelSingle(Z, numLags, T) {
  const p = Z[0].length
  const N = T - 2 * numLags + 1
  const blockDim = numLags * p
  const future = zeros(blockDim, N)

  for (let col = 0; col < N; col++) {
    for (let lag = 0; lag < numLags; lag++) {
      const t = col + numLags + lag
      for (let ch = 0; ch < p; ch++) {
        future[lag * p + ch][col] = Z[t][ch]
      }
    }
  }

  return { future, blockDim }
}

// ===================== SVD via Eigendecomposition ===========================

/**
 * Compute thin SVD of matrix M (n x m) via eigendecomposition of M^T M.
 * Returns { U: n x k, S: k array, Vt: k x m } where k = min(n, m).
 */
export function thinSVD(M) {
  const n = M.length, m = M[0].length
  const k = Math.min(n, m)

  if (n >= m) {
    // M^T M is m x m
    const MtM = matMul(matT(M), M)
    const eig = jacobiEigen(MtM)

    const S = new Array(k)
    const Vt = zeros(k, m)
    const U = zeros(n, k)

    for (let i = 0; i < k; i++) {
      S[i] = Math.sqrt(Math.max(0, eig.values[i]))
      for (let j = 0; j < m; j++) Vt[i][j] = eig.vectors[i][j]
    }

    // U = M V S^{-1}
    for (let i = 0; i < k; i++) {
      if (S[i] > 1e-10) {
        for (let r = 0; r < n; r++) {
          let s = 0
          for (let c = 0; c < m; c++) s += M[r][c] * Vt[i][c]
          U[r][i] = s / S[i]
        }
      }
    }

    return { U, S, Vt }
  } else {
    // M M^T is n x n
    const MMt = matMul(M, matT(M))
    const eig = jacobiEigen(MMt)

    const S = new Array(k)
    const U = zeros(n, k)
    const Vt = zeros(k, m)

    for (let i = 0; i < k; i++) {
      S[i] = Math.sqrt(Math.max(0, eig.values[i]))
      for (let j = 0; j < n; j++) U[j][i] = eig.vectors[i][j]
    }

    // V^T = S^{-1} U^T M
    for (let i = 0; i < k; i++) {
      if (S[i] > 1e-10) {
        for (let c = 0; c < m; c++) {
          let s = 0
          for (let r = 0; r < n; r++) s += U[r][i] * M[r][c]
          Vt[i][c] = s / S[i]
        }
      }
    }

    return { U, S, Vt }
  }
}

// ===================== Standard Subspace Identification =====================

/**
 * Standard subspace identification (N4SID-style).
 * Y: T x m observation matrix
 * latentDim: assumed number of latent dimensions
 * numLags: number of block rows in Hankel matrix (default 10)
 *
 * Returns { A, C, Xhat, singularValues }
 *   A: latentDim x latentDim state transition matrix
 *   C: m x latentDim observation matrix
 *   Xhat: T x latentDim recovered latent states
 *   singularValues: array of all singular values from the Hankel SVD
 */
export function standardSubspaceID(Y, latentDim, numLags = 10) {
  const T = Y.length
  const m = Y[0].length

  // Center observations
  const Yc = centerColumns(Y)

  // Build Hankel matrix
  const { future, N, blockDim } = buildHankel(Yc, numLags)

  // SVD of future Hankel
  const { U, S, Vt } = thinSVD(future)

  const singularValues = S.slice()

  // Truncate to latentDim
  const d = Math.min(latentDim, S.length)

  // Observability matrix O = U_d * S_d^{1/2}  (blockDim x d)
  const O = zeros(blockDim, d)
  for (let i = 0; i < blockDim; i++)
    for (let j = 0; j < d; j++)
      O[i][j] = U[i][j] * Math.sqrt(S[j])

  // C is the first m rows of O
  const C_hat = zeros(m, d)
  for (let i = 0; i < m; i++)
    for (let j = 0; j < d; j++)
      C_hat[i][j] = O[i][j]

  // State sequence from S_d^{1/2} * V_d^T  (d x N)
  const Xseq = zeros(d, N)
  for (let i = 0; i < d; i++)
    for (let j = 0; j < N; j++)
      Xseq[i][j] = Math.sqrt(S[i]) * Vt[i][j]

  // Estimate A from Xseq[:, 1:] = A * Xseq[:, :-1] via least squares
  // A = X_future * X_past^T * (X_past * X_past^T)^{-1}
  const Nseq = N - 1
  const Xpast = zeros(d, Nseq)
  const Xfut = zeros(d, Nseq)
  for (let i = 0; i < d; i++)
    for (let j = 0; j < Nseq; j++) {
      Xpast[i][j] = Xseq[i][j]
      Xfut[i][j] = Xseq[i][j + 1]
    }

  // XpXpT = Xpast * Xpast^T (d x d)
  const XpXpT = matMul(Xpast, matT(Xpast))
  // XfXpT = Xfut * Xpast^T (d x d)
  const XfXpT = matMul(Xfut, matT(Xpast))

  // Invert XpXpT via eigendecomposition
  const eigXp = jacobiEigen(XpXpT)
  const XpXpTinv = zeros(d, d)
  const Vtmp = zeros(d, d)
  const Dinv = zeros(d, d)
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) Vtmp[j][i] = eigXp.vectors[i][j]
    Dinv[i][i] = eigXp.values[i] > 1e-10 ? 1 / eigXp.values[i] : 0
  }
  const XpXpTinvMat = matMul(matMul(Vtmp, Dinv), matT(Vtmp))

  const A_hat = matMul(XfXpT, XpXpTinvMat)

  // Recover full state trajectory by projecting Y through C pseudo-inverse
  // Xhat = Y * C^+ where C^+ = (C^T C)^{-1} C^T
  const CtC = matMul(matT(C_hat), C_hat)
  const eigCtC = jacobiEigen(CtC)
  const VctC = zeros(d, d)
  const DctCinv = zeros(d, d)
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) VctC[j][i] = eigCtC.vectors[i][j]
    DctCinv[i][i] = eigCtC.values[i] > 1e-10 ? 1 / eigCtC.values[i] : 0
  }
  const Cpinv = matMul(matMul(matMul(VctC, DctCinv), matT(VctC)), matT(C_hat))
  // Cpinv is d x m, Yc is T x m => Xhat = Yc * Cpinv^T
  const CpinvT = matT(Cpinv) // m x d
  const Xhat = matMul(Yc, CpinvT)

  return { A: A_hat, C: C_hat, Xhat, singularValues }
}

// ===================== Utility Functions ===================================

/**
 * Procrustes alignment: find the best orthogonal transformation to align
 * Xhat (T x d) to Xtrue (T x d). Returns the aligned Xhat.
 */
export function alignRecoveredStates(Xhat, Xtrue) {
  const T = Xhat.length, d = Xhat[0].length
  const dTrue = Xtrue[0].length
  const dMin = Math.min(d, dTrue)

  // Center both
  const Xh = centerColumns(Xhat)
  const Xt = centerColumns(Xtrue)

  // Cross-covariance: M = Xt^T * Xh (dTrue x d)
  const XtSlice = zeros(T, dMin)
  const XhSlice = zeros(T, dMin)
  for (let i = 0; i < T; i++) {
    for (let j = 0; j < dMin; j++) {
      XtSlice[i][j] = Xt[i][j]
      XhSlice[i][j] = Xh[i][j]
    }
  }

  const M = matMul(matT(XtSlice), XhSlice) // dMin x dMin
  const { U, Vt } = thinSVD(M)

  // Optimal rotation: R = U * Vt
  const R = matMul(U, Vt) // dMin x dMin

  // Apply: aligned = Xh * R^T
  const aligned = zeros(T, dMin)
  for (let i = 0; i < T; i++)
    for (let j = 0; j < dMin; j++) {
      let s = 0
      for (let k = 0; k < dMin; k++) s += XhSlice[i][k] * R[j][k]
      aligned[i][j] = s
    }

  return aligned
}

/**
 * Compute Pearson correlation between each column of Xhat and Z (T x 1).
 * Returns array of absolute correlations.
 */
export function computeDimCorrelations(Xhat, Z) {
  const T = Xhat.length, d = Xhat[0].length
  const corrs = new Array(d)

  const z = new Float64Array(T)
  for (let i = 0; i < T; i++) z[i] = Z[i][0]

  // Mean of z
  let mz = 0
  for (let i = 0; i < T; i++) mz += z[i]
  mz /= T

  let varz = 0
  for (let i = 0; i < T; i++) varz += (z[i] - mz) * (z[i] - mz)

  for (let j = 0; j < d; j++) {
    let mx = 0
    for (let i = 0; i < T; i++) mx += Xhat[i][j]
    mx /= T

    let varx = 0, cov = 0
    for (let i = 0; i < T; i++) {
      const dx = Xhat[i][j] - mx
      const dz = z[i] - mz
      varx += dx * dx
      cov += dx * dz
    }

    if (varx < 1e-15 || varz < 1e-15) {
      corrs[j] = 0
    } else {
      corrs[j] = Math.abs(cov / Math.sqrt(varx * varz))
    }
  }

  return corrs
}

// ===================== PSID Two-Stage Procedure ============================

/**
 * Preferential Subspace Identification (Sani et al. 2021).
 *
 * Stage 1: CCA between past Y Hankel and future Z Hankel to find
 *          behaviorally relevant subspace.
 * Stage 2: Standard subspace ID on residual to find remaining dynamics.
 *
 * Y: T x m observation matrix
 * Z: T x p behavior matrix
 * relevantDim: number of behaviorally relevant latent dimensions
 * totalDim: total latent dimensionality
 * numLags: number of block rows in Hankel matrices (default 10)
 *
 * Returns { A, C, Xhat, XhatRelevant, XhatIrrelevant, singularValues, correlations }
 */
export function psid(Y, Z, relevantDim, totalDim, numLags = 10) {
  const T = Y.length
  const m = Y[0].length
  const p = Z[0].length

  const Yc = centerColumns(Y)
  const Zc = centerColumns(Z)

  // Build Hankel matrices
  const { past: Ypast, future: Yfuture, N } = buildHankel(Yc, numLags)
  const { future: Zfuture } = buildHankelSingle(Zc, numLags, T)

  // ---------- Stage 1: CCA for behaviorally relevant subspace ----------
  // CCA between past Y (transposed to N x blockDimY) and future Z (transposed to N x blockDimZ)
  const YpastT = matT(Ypast) // N x (numLags*m)
  const ZfutureT = matT(Zfuture) // N x (numLags*p)

  const cca = generalCCA(YpastT, ZfutureT)
  const correlations = cca.correlations

  // The top relevantDim canonical directions from the Y side
  // Project past Y Hankel into canonical space: scores = YpastT * Wx
  // Wx is (numLags*m) x k, take first relevantDim columns
  const Wx = cca.Wx // (numLags*m) x k

  // Relevant state estimates from Hankel: XrelSeq = YpastT * Wx[:, :relevantDim]
  // Shape: N x relevantDim
  const XrelSeq = zeros(N, relevantDim)
  for (let i = 0; i < N; i++)
    for (let j = 0; j < relevantDim; j++) {
      let s = 0
      for (let c = 0; c < Wx.length; c++) s += YpastT[i][c] * Wx[c][j]
      XrelSeq[i][j] = s
    }

  // Extract A1 from XrelSeq: x_{t+1} = A1 x_t (least squares)
  const Nseq1 = N - 1
  const A1 = leastSquaresTransition(XrelSeq, relevantDim, Nseq1)

  // Extract C1: Y = C1 * Xrel + residual (least squares)
  // C1 = Yc^T * Xrel * (Xrel^T * Xrel)^{-1}, using aligned time indices
  // Xrel corresponds to times numLags..numLags+N-1
  const YrelSlice = zeros(N, m)
  for (let i = 0; i < N; i++)
    for (let j = 0; j < m; j++)
      YrelSlice[i][j] = Yc[i + numLags][j]

  const C1 = leastSquaresObservation(YrelSlice, XrelSeq, m, relevantDim, N)

  // Full relevant state trajectory: project all of Y through C1 pseudo-inverse
  const XhatRelevant = projectThroughPinv(Yc, C1, m, relevantDim, T)

  // ---------- Stage 2: Residual subspace ID ----------
  const irrelDim = totalDim - relevantDim

  let A2, C2, XhatIrrelevant

  if (irrelDim > 0) {
    // Project out relevant component: Yresid = Y - Xrel * C1^T
    const Yresid = zeros(T, m)
    for (let t = 0; t < T; t++)
      for (let j = 0; j < m; j++) {
        let pred = 0
        for (let k = 0; k < relevantDim; k++) pred += XhatRelevant[t][k] * C1[j][k]
        Yresid[t][j] = Yc[t][j] - pred
      }

    // Standard subspace ID on residual
    const residResult = standardSubspaceID(Yresid, irrelDim, numLags)
    A2 = residResult.A
    C2 = residResult.C
    XhatIrrelevant = residResult.Xhat
  } else {
    A2 = []
    C2 = []
    XhatIrrelevant = zeros(T, 0)
  }

  // ---------- Combine ----------
  // A = blockDiag(A1, A2)
  const A = zeros(totalDim, totalDim)
  for (let i = 0; i < relevantDim; i++)
    for (let j = 0; j < relevantDim; j++)
      A[i][j] = A1[i][j]
  for (let i = 0; i < irrelDim; i++)
    for (let j = 0; j < irrelDim; j++)
      A[relevantDim + i][relevantDim + j] = A2[i][j]

  // C = [C1, C2]
  const C_hat = zeros(m, totalDim)
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < relevantDim; j++) C_hat[i][j] = C1[i][j]
    for (let j = 0; j < irrelDim; j++) C_hat[i][relevantDim + j] = C2[i][j]
  }

  // Xhat = [XhatRelevant, XhatIrrelevant]
  const Xhat = zeros(T, totalDim)
  for (let t = 0; t < T; t++) {
    for (let j = 0; j < relevantDim; j++) Xhat[t][j] = XhatRelevant[t][j]
    for (let j = 0; j < irrelDim; j++) Xhat[t][relevantDim + j] = XhatIrrelevant[t][j]
  }

  return {
    A, C: C_hat, Xhat, XhatRelevant, XhatIrrelevant,
    singularValues: correlations, correlations,
  }
}

// ===================== PSID Internal Helpers ================================

/**
 * Least-squares estimate of transition matrix from a state sequence.
 * Xseq: N x d matrix of state estimates
 * Returns d x d matrix A such that Xseq[t+1] ≈ A Xseq[t].
 */
function leastSquaresTransition(Xseq, d, Nseq) {
  // XfXpT = Xfut * Xpast^T, XpXpT = Xpast * Xpast^T
  const XpXpT = zeros(d, d)
  const XfXpT = zeros(d, d)
  for (let t = 0; t < Nseq; t++)
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        XpXpT[i][j] += Xseq[t][i] * Xseq[t][j]
        XfXpT[i][j] += Xseq[t + 1][i] * Xseq[t][j]
      }
    }

  const XpXpTinv = symmetricInverse(XpXpT, d)
  return matMul(XfXpT, XpXpTinv)
}

/**
 * Least-squares estimate of observation matrix.
 * Y: N x m, X: N x d, returns m x d matrix C such that Y ≈ X C^T.
 */
function leastSquaresObservation(Yslice, Xslice, m, d, N) {
  // C = Y^T X (X^T X)^{-1}  =>  C is m x d
  const XtX = zeros(d, d)
  const YtX = zeros(m, d)
  for (let t = 0; t < N; t++) {
    for (let i = 0; i < d; i++)
      for (let j = 0; j < d; j++)
        XtX[i][j] += Xslice[t][i] * Xslice[t][j]
    for (let i = 0; i < m; i++)
      for (let j = 0; j < d; j++)
        YtX[i][j] += Yslice[t][i] * Xslice[t][j]
  }
  const XtXinv = symmetricInverse(XtX, d)
  return matMul(YtX, XtXinv)
}

/**
 * Project Y through the pseudo-inverse of C to get state estimates.
 * Y: T x m, C: m x d. Returns T x d.
 */
function projectThroughPinv(Y, C, m, d, T) {
  // Cpinv = (C^T C)^{-1} C^T  => d x m
  const CtC = matMul(matT(C), C)
  const CtCinv = symmetricInverse(CtC, d)
  const CpinvMat = matMul(CtCinv, matT(C)) // d x m
  // Xhat = Y * CpinvMat^T  => T x d
  return matMul(Y, matT(CpinvMat))
}

/**
 * Invert a symmetric positive (semi-)definite matrix via eigendecomposition.
 */
function symmetricInverse(M, d) {
  const eig = jacobiEigen(M)
  const V = zeros(d, d)
  const Dinv = zeros(d, d)
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) V[j][i] = eig.vectors[i][j]
    Dinv[i][i] = eig.values[i] > 1e-10 ? 1 / eig.values[i] : 0
  }
  return matMul(matMul(V, Dinv), matT(V))
}

// ===================== Cross-Validation ====================================

/**
 * Cross-validate PSID to find optimal relevant dimensionality.
 *
 * Y: T x m, Z: T x p
 * maxRelevantDim: maximum relevant dim to test
 * totalDim: total latent dim
 * numLags: Hankel block rows
 * nFolds: number of temporal folds (default 5)
 *
 * Returns { dims: [0..maxRelevantDim], r2scores: [...] }
 */
export function crossValidatePSID(Y, Z, maxRelevantDim, totalDim, numLags = 10, nFolds = 5) {
  const T = Y.length
  const m = Y[0].length
  const p = Z[0].length
  const foldSize = Math.floor(T / nFolds)

  const dims = []
  const r2scores = []

  for (let rd = 0; rd <= maxRelevantDim; rd++) {
    dims.push(rd)

    let totalSS = 0
    let totalResidSS = 0

    for (let fold = 0; fold < nFolds; fold++) {
      const testStart = fold * foldSize
      const testEnd = Math.min(testStart + foldSize, T)

      // Training data: everything outside test fold
      const Ytrain = []
      const Ztrain = []
      const Ytest = []
      const Ztest = []

      for (let t = 0; t < T; t++) {
        if (t >= testStart && t < testEnd) {
          Ytest.push(Y[t])
          Ztest.push(Z[t])
        } else {
          Ytrain.push(Y[t])
          Ztrain.push(Z[t])
        }
      }

      if (Ytrain.length < 2 * numLags + 10) continue

      let Zpred
      if (rd === 0) {
        // No relevant dims: predict mean
        let meanZ = 0
        for (let t = 0; t < Ztrain.length; t++) meanZ += Ztrain[t][0]
        meanZ /= Ztrain.length
        Zpred = Ztest.map(() => [meanZ])
      } else {
        // Run PSID on training data
        const result = psid(Ytrain, Ztrain, rd, Math.max(rd, totalDim), numLags)

        // Predict Z on test data: Z_pred = Ytest * C_pinv^T * L_hat
        // where L_hat = (Xrel^T Xrel)^{-1} Xrel^T Z (from training)
        // Simpler: fit L from training Xhat and Ztrain, then apply to test
        const XtrainRel = result.XhatRelevant
        const NtrainRel = XtrainRel.length

        // L_hat = Z^T X (X^T X)^{-1}  => p x rd
        const XtX = zeros(rd, rd)
        const ZtX = zeros(p, rd)
        for (let t = 0; t < NtrainRel; t++) {
          for (let i = 0; i < rd; i++)
            for (let j = 0; j < rd; j++)
              XtX[i][j] += XtrainRel[t][i] * XtrainRel[t][j]
          for (let i = 0; i < p; i++)
            for (let j = 0; j < rd; j++)
              ZtX[i][j] += Ztrain[t][i] * XtrainRel[t][j]
        }
        const XtXinv = symmetricInverse(XtX, rd)
        const Lhat = matMul(ZtX, XtXinv) // p x rd

        // C1 from result: m x rd
        const C1 = zeros(m, rd)
        for (let i = 0; i < m; i++)
          for (let j = 0; j < rd; j++)
            C1[i][j] = result.C[i][j]

        // For test: Xtest = Ytest * pinv(C1), Zpred = Xtest * Lhat^T
        const YtestC = centerColumns(Ytest)
        const XtestRel = projectThroughPinv(YtestC, C1, m, rd, Ytest.length)
        Zpred = matMul(XtestRel, matT(Lhat))
      }

      // Compute R² components
      let foldMeanZ = 0
      for (let t = 0; t < Ztest.length; t++) foldMeanZ += Ztest[t][0]
      foldMeanZ /= Ztest.length

      for (let t = 0; t < Ztest.length; t++) {
        totalSS += (Ztest[t][0] - foldMeanZ) * (Ztest[t][0] - foldMeanZ)
        const resid = Ztest[t][0] - Zpred[t][0]
        totalResidSS += resid * resid
      }
    }

    const r2 = totalSS > 1e-15 ? 1 - totalResidSS / totalSS : 0
    r2scores.push(r2)
  }

  return { dims, r2scores }
}
