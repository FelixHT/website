// ---------------------------------------------------------------------------
// CCA Math Module
// Pure-JS linear algebra, statistics, and Canonical Correlation Analysis
// for 2D (2x2) interactive figures.
// ---------------------------------------------------------------------------

// ===================== 2x2 Matrix Operations ==============================

/**
 * Determinant of a 2x2 matrix [[a,b],[c,d]].
 */
export function mat2Det(A) {
  return A[0][0] * A[1][1] - A[0][1] * A[1][0];
}

/**
 * Multiply two 2x2 matrices.
 */
export function mat2Mul(A, B) {
  return [
    [
      A[0][0] * B[0][0] + A[0][1] * B[1][0],
      A[0][0] * B[0][1] + A[0][1] * B[1][1],
    ],
    [
      A[1][0] * B[0][0] + A[1][1] * B[1][0],
      A[1][0] * B[0][1] + A[1][1] * B[1][1],
    ],
  ];
}

/**
 * Inverse of a 2x2 matrix. Returns identity if singular.
 */
export function mat2Inv(A) {
  const det = mat2Det(A);
  if (Math.abs(det) < 1e-12) {
    return [
      [1, 0],
      [0, 1],
    ];
  }
  const invDet = 1 / det;
  return [
    [A[1][1] * invDet, -A[0][1] * invDet],
    [-A[1][0] * invDet, A[0][0] * invDet],
  ];
}

/**
 * Eigenvalues and eigenvectors of a 2x2 matrix.
 * Returns { values: [l1, l2], vectors: [[v1x,v1y],[v2x,v2y]] }
 * Eigenvalues are sorted descending by absolute value.
 */
export function mat2Eigen(A) {
  const a = A[0][0];
  const b = A[0][1];
  const c = A[1][0];
  const d = A[1][1];

  // Characteristic equation: l^2 - (a+d)l + (ad - bc) = 0
  const trace = a + d;
  const det = a * d - b * c;
  const disc = trace * trace - 4 * det;

  let l1, l2;
  if (disc < 0) {
    // Complex eigenvalues -- should not happen for symmetric matrices.
    // Return NaN to signal the issue.
    l1 = NaN;
    l2 = NaN;
    return { values: [l1, l2], vectors: [[1, 0], [0, 1]] };
  }

  const sqrtDisc = Math.sqrt(disc);
  l1 = (trace + sqrtDisc) / 2;
  l2 = (trace - sqrtDisc) / 2;

  // Sort descending by absolute value
  if (Math.abs(l2) > Math.abs(l1)) {
    const tmp = l1;
    l1 = l2;
    l2 = tmp;
  }

  const eigenvector = (lambda) => {
    // (A - lambda I) v = 0
    // Try using the first row: (a - lambda) vx + b vy = 0
    // Or the second row:       c vx + (d - lambda) vy = 0
    const r1a = a - lambda;
    const r1b = b;
    const r2a = c;
    const r2b = d - lambda;

    let vx, vy;
    if (Math.abs(r1a) > Math.abs(r1b) && Math.abs(r1a) > 1e-14) {
      // From first row: vx = -r1b / r1a * vy
      vy = 1;
      vx = -r1b / r1a;
    } else if (Math.abs(r1b) > 1e-14) {
      vx = 1;
      vy = -r1a / r1b;
    } else if (Math.abs(r2a) > 1e-14) {
      vy = 1;
      vx = -r2b / r2a;
    } else if (Math.abs(r2b) > 1e-14) {
      vx = 1;
      vy = -r2a / r2b;
    } else {
      // Zero matrix or identity-like -- any vector is an eigenvector
      return [1, 0];
    }

    const norm = Math.sqrt(vx * vx + vy * vy);
    return [vx / norm, vy / norm];
  };

  const v1 = eigenvector(l1);
  const v2 = eigenvector(l2);

  return { values: [l1, l2], vectors: [v1, v2] };
}

/**
 * Matrix square root of a symmetric positive-semidefinite 2x2 matrix
 * via eigendecomposition: A = V D V^T => sqrt(A) = V sqrt(D) V^T
 */
export function mat2Sqrt(A) {
  const { values, vectors } = mat2Eigen(A);

  const s1 = values[0] >= 0 ? Math.sqrt(values[0]) : 0;
  const s2 = values[1] >= 0 ? Math.sqrt(values[1]) : 0;

  // V = [v1 | v2] as columns
  const V = [
    [vectors[0][0], vectors[1][0]],
    [vectors[0][1], vectors[1][1]],
  ];
  // V^T
  const VT = [
    [vectors[0][0], vectors[0][1]],
    [vectors[1][0], vectors[1][1]],
  ];
  // sqrt(D)
  const sqrtD = [
    [s1, 0],
    [0, s2],
  ];

  return mat2Mul(mat2Mul(V, sqrtD), VT);
}

/**
 * Inverse square root of a symmetric positive-definite 2x2 matrix.
 * A^{-1/2} = V D^{-1/2} V^T
 */
export function mat2InvSqrt(A) {
  const { values, vectors } = mat2Eigen(A);

  const s1 = values[0] > 1e-12 ? 1 / Math.sqrt(values[0]) : 0;
  const s2 = values[1] > 1e-12 ? 1 / Math.sqrt(values[1]) : 0;

  const V = [
    [vectors[0][0], vectors[1][0]],
    [vectors[0][1], vectors[1][1]],
  ];
  const VT = [
    [vectors[0][0], vectors[0][1]],
    [vectors[1][0], vectors[1][1]],
  ];
  const invSqrtD = [
    [s1, 0],
    [0, s2],
  ];

  return mat2Mul(mat2Mul(V, invSqrtD), VT);
}

// ===================== Matrix-Vector Operations ===========================

/**
 * Multiply a 2x2 matrix by a 2-vector.
 */
export function matVecMul(M, v) {
  return [
    M[0][0] * v[0] + M[0][1] * v[1],
    M[1][0] * v[0] + M[1][1] * v[1],
  ];
}

/**
 * Dot product of two 2-vectors.
 */
export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

/**
 * Euclidean norm of a 2-vector.
 */
export function vecNorm(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

/**
 * Normalize a 2-vector to unit length. Returns [0,0] if zero vector.
 */
export function vecNormalize(v) {
  const n = vecNorm(v);
  if (n < 1e-14) return [0, 0];
  return [v[0] / n, v[1] / n];
}

// ===================== Statistics =========================================

/**
 * Center an n x 2 data array by subtracting column means.
 * Returns { centered: [[x,y],...], means: [mx, my] }.
 */
export function centerData(X) {
  const n = X.length;
  if (n === 0) return { centered: [], means: [0, 0] };

  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += X[i][0];
    my += X[i][1];
  }
  mx /= n;
  my /= n;

  const centered = new Array(n);
  for (let i = 0; i < n; i++) {
    centered[i] = [X[i][0] - mx, X[i][1] - my];
  }

  return { centered, means: [mx, my] };
}

/**
 * Covariance matrix of an n x 2 array (should already be centered).
 * Uses 1/(n-1) normalization (sample covariance).
 * Returns a 2x2 matrix.
 */
export function computeCov(X) {
  const n = X.length;
  if (n < 2) {
    return [
      [0, 0],
      [0, 0],
    ];
  }

  let s00 = 0, s01 = 0, s11 = 0;
  for (let i = 0; i < n; i++) {
    s00 += X[i][0] * X[i][0];
    s01 += X[i][0] * X[i][1];
    s11 += X[i][1] * X[i][1];
  }

  const denom = n - 1;
  return [
    [s00 / denom, s01 / denom],
    [s01 / denom, s11 / denom],
  ];
}

/**
 * Cross-covariance between two n x 2 arrays (should already be centered).
 * Returns a 2x2 matrix: cov(Xa_cols, Xb_cols).
 */
export function computeCrossCov(Xa, Xb) {
  const n = Xa.length;
  if (n < 2) {
    return [
      [0, 0],
      [0, 0],
    ];
  }

  let s00 = 0, s01 = 0, s10 = 0, s11 = 0;
  for (let i = 0; i < n; i++) {
    s00 += Xa[i][0] * Xb[i][0];
    s01 += Xa[i][0] * Xb[i][1];
    s10 += Xa[i][1] * Xb[i][0];
    s11 += Xa[i][1] * Xb[i][1];
  }

  const denom = n - 1;
  return [
    [s00 / denom, s01 / denom],
    [s10 / denom, s11 / denom],
  ];
}

// ===================== Projection & Correlation ===========================

/**
 * Project n x 2 data onto a direction vector w. Returns array of n scalars.
 */
export function projectOntoDirection(X, w) {
  const n = X.length;
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = X[i][0] * w[0] + X[i][1] * w[1];
  }
  return result;
}

/**
 * Pearson correlation between two arrays of scalars.
 * Returns NaN if either has zero variance.
 */
export function computeCorrelation(a, b) {
  const n = a.length;
  if (n < 2) return NaN;

  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;

  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }

  if (saa < 1e-14 || sbb < 1e-14) return NaN;
  return sab / Math.sqrt(saa * sbb);
}

// ===================== CCA Solver =========================================

/**
 * Transpose a 2x2 matrix.
 */
function mat2T(A) {
  return [
    [A[0][0], A[1][0]],
    [A[0][1], A[1][1]],
  ];
}

/**
 * 2x2 SVD via eigendecomposition of A^T A and A A^T.
 * Returns { U, S: [s1, s2], V } such that A = U diag(S) V^T.
 * Singular values are sorted descending.
 */
function mat2SVD(A) {
  // A^T A -> eigendecomposition gives V and sigma^2
  const AtA = mat2Mul(mat2T(A), A);
  const eigRight = mat2Eigen(AtA);

  // Singular values (descending)
  let s1 = eigRight.values[0] > 0 ? Math.sqrt(eigRight.values[0]) : 0;
  let s2 = eigRight.values[1] > 0 ? Math.sqrt(eigRight.values[1]) : 0;

  // V columns are the right singular vectors (eigenvectors of A^T A)
  let v1 = eigRight.vectors[0];
  let v2 = eigRight.vectors[1];

  // Ensure s1 >= s2
  if (s2 > s1) {
    const tmp = s1; s1 = s2; s2 = tmp;
    const tmpv = v1; v1 = v2; v2 = tmpv;
  }

  // U columns: u_i = A v_i / s_i
  let u1, u2;
  if (s1 > 1e-12) {
    u1 = vecNormalize(matVecMul(A, v1));
  } else {
    u1 = [1, 0];
  }
  if (s2 > 1e-12) {
    u2 = vecNormalize(matVecMul(A, v2));
  } else {
    // Choose u2 orthogonal to u1
    u2 = [-u1[1], u1[0]];
  }

  const U = [
    [u1[0], u2[0]],
    [u1[1], u2[1]],
  ];
  const V = [
    [v1[0], v2[0]],
    [v1[1], v2[1]],
  ];

  return { U, S: [s1, s2], V };
}

/**
 * Solve Canonical Correlation Analysis for two n x 2 datasets.
 *
 * Method: whitened SVD approach.
 *   1. Center both datasets.
 *   2. Compute covariance matrices Caa, Cbb, Cab.
 *   3. Whiten: K = Caa^{-1/2} Cab Cbb^{-1/2}
 *   4. SVD of K: K = U S V^T
 *   5. Canonical weights: Wa = Caa^{-1/2} U,  Wb = Cbb^{-1/2} V
 *   6. Canonical correlations = singular values S.
 *
 * Returns an object with correlations, weights, projections, and covariances.
 */
export function solveCCA(Xa, Xb) {
  const n = Xa.length;

  // Step 1: center
  const { centered: Xac } = centerData(Xa);
  const { centered: Xbc } = centerData(Xb);

  // Step 2: covariance matrices
  const covAA = computeCov(Xac);
  const covBB = computeCov(Xbc);
  const covAB = computeCrossCov(Xac, Xbc);

  // Step 3: whitening matrices
  const invSqrtAA = mat2InvSqrt(covAA);
  const invSqrtBB = mat2InvSqrt(covBB);

  // K = Caa^{-1/2} Cab Cbb^{-1/2}
  const K = mat2Mul(mat2Mul(invSqrtAA, covAB), invSqrtBB);

  // Step 4: SVD of K
  const { U, S, V } = mat2SVD(K);

  // Step 5: canonical weights
  // Wa columns are the canonical directions for dataset A
  // Wa = Caa^{-1/2} U   =>  Wa is 2x2, columns are weight vectors
  const Wa_mat = mat2Mul(invSqrtAA, U);
  const Wb_mat = mat2Mul(invSqrtBB, V);

  // Extract as row pairs: Wa[i] = i-th canonical weight vector (as row)
  const Wa = [
    [Wa_mat[0][0], Wa_mat[1][0]], // first canonical direction for A
    [Wa_mat[0][1], Wa_mat[1][1]], // second canonical direction for A
  ];
  const Wb = [
    [Wb_mat[0][0], Wb_mat[1][0]],
    [Wb_mat[0][1], Wb_mat[1][1]],
  ];

  // Clamp correlations to [0, 1]
  const correlations = [
    Math.min(1, Math.max(0, S[0])),
    Math.min(1, Math.max(0, S[1])),
  ];

  // Step 6: projections (n x 2), each row is [canonical_var_1, canonical_var_2]
  const projA = new Array(n);
  const projB = new Array(n);
  for (let i = 0; i < n; i++) {
    projA[i] = [
      Xac[i][0] * Wa[0][0] + Xac[i][1] * Wa[0][1],
      Xac[i][0] * Wa[1][0] + Xac[i][1] * Wa[1][1],
    ];
    projB[i] = [
      Xbc[i][0] * Wb[0][0] + Xbc[i][1] * Wb[0][1],
      Xbc[i][0] * Wb[1][0] + Xbc[i][1] * Wb[1][1],
    ];
  }

  return {
    correlations,
    Wa,
    Wb,
    projA,
    projB,
    covAA,
    covBB,
    covAB,
  };
}

// ===================== Data Generation ====================================

/**
 * Box-Muller transform: generate two independent standard normal variates.
 */
function boxMuller() {
  let u1, u2;
  do { u1 = Math.random(); } while (u1 < 1e-14);
  u2 = Math.random();
  const r = Math.sqrt(-2 * Math.log(u1));
  return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
}

/**
 * Generate n standard normal samples as an n x d array.
 */
function randn(n, d) {
  const data = new Array(n);
  for (let i = 0; i < n; i++) {
    data[i] = new Array(d);
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j += 2) {
      const [z1, z2] = boxMuller();
      data[i][j] = z1;
      if (j + 1 < d) data[i][j + 1] = z2;
    }
  }
  return data;
}

/**
 * Cholesky decomposition of a 4x4 symmetric positive-definite matrix.
 * Returns lower-triangular L such that A = L L^T.
 */
function cholesky4(A) {
  const L = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        const val = A[i][i] - sum;
        L[i][j] = val > 0 ? Math.sqrt(val) : 0;
      } else {
        L[i][j] = L[j][j] > 1e-14 ? (A[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  return L;
}

/**
 * Random 2x2 rotation matrix by angle theta.
 */
function rotation2(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    [c, -s],
    [s, c],
  ];
}

/**
 * Generate n paired 2D observations (Xa, Xb) with controlled canonical
 * correlations rho1 and rho2.
 *
 * Method:
 *   1. Build a 4x4 block covariance matrix:
 *        Sigma = [ I    D  ]
 *                [ D    I  ]
 *      where D = diag(rho1, rho2).
 *   2. Cholesky factorize Sigma to get L.
 *   3. Generate n x 4 standard normal Z, compute X = Z L^T.
 *   4. Split into Xa (cols 0-1) and Xb (cols 2-3).
 *   5. Apply independent random rotations to Xa and Xb so the canonical
 *      directions are not trivially axis-aligned.
 *
 * Returns { Xa: [[x,y],...], Xb: [[x,y],...] }.
 */
export function generateData(n, rho1, rho2) {
  // Clamp correlations to valid range
  rho1 = Math.max(-1, Math.min(1, rho1));
  rho2 = Math.max(-1, Math.min(1, rho2));

  // 4x4 block covariance
  const Sigma = [
    [1,    0,    rho1, 0   ],
    [0,    1,    0,    rho2],
    [rho1, 0,    1,    0   ],
    [0,    rho2, 0,    1   ],
  ];

  const L = cholesky4(Sigma);

  // Generate standard normal data
  const Z = randn(n, 4);

  // Transform: X = Z * L^T  (each row is multiplied)
  const X4 = new Array(n);
  for (let i = 0; i < n; i++) {
    X4[i] = [0, 0, 0, 0];
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        // L^T[k][j] = L[j][k], so (Z L^T)[i][j] = sum_k Z[i][k] * L[j][k]
        X4[i][j] += Z[i][k] * L[j][k];
      }
    }
  }

  // Split into two 2D datasets
  let Xa = new Array(n);
  let Xb = new Array(n);
  for (let i = 0; i < n; i++) {
    Xa[i] = [X4[i][0], X4[i][1]];
    Xb[i] = [X4[i][2], X4[i][3]];
  }

  // Apply different scales along each axis BEFORE rotating so that each
  // dataset has an anisotropic (elliptical) covariance.  Without this,
  // the within-dataset covariance is identity and whitening has no
  // visible effect.
  const scaleA = [1.5, 0.7];
  const scaleB = [1.4, 0.65];
  for (let i = 0; i < n; i++) {
    Xa[i] = [Xa[i][0] * scaleA[0], Xa[i][1] * scaleA[1]];
    Xb[i] = [Xb[i][0] * scaleB[0], Xb[i][1] * scaleB[1]];
  }

  // Apply random rotations to obscure the axis alignment
  const thetaA = Math.random() * 2 * Math.PI;
  const thetaB = Math.random() * 2 * Math.PI;
  const Ra = rotation2(thetaA);
  const Rb = rotation2(thetaB);

  for (let i = 0; i < n; i++) {
    const ax = Xa[i][0], ay = Xa[i][1];
    Xa[i] = [
      Ra[0][0] * ax + Ra[0][1] * ay,
      Ra[1][0] * ax + Ra[1][1] * ay,
    ];
    const bx = Xb[i][0], by = Xb[i][1];
    Xb[i] = [
      Rb[0][0] * bx + Rb[0][1] * by,
      Rb[1][0] * bx + Rb[1][1] * by,
    ];
  }

  return { Xa, Xb };
}

// ===================== General-Dimensional Linear Algebra ==================

/**
 * Create an n x m matrix filled with zeros.
 */
function zeros(n, m) {
  const A = new Array(n)
  for (let i = 0; i < n; i++) {
    A[i] = new Float64Array(m)
  }
  return A
}

/**
 * Create an n x n identity matrix.
 */
function eye(n) {
  const I = zeros(n, n)
  for (let i = 0; i < n; i++) I[i][i] = 1
  return I
}

/**
 * Transpose an n x m matrix.
 */
function matT(A) {
  const n = A.length, m = A[0].length
  const T = zeros(m, n)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      T[j][i] = A[i][j]
  return T
}

/**
 * Multiply two matrices A (n x k) and B (k x m).
 */
function matMul(A, B) {
  const n = A.length, k = A[0].length, m = B[0].length
  const C = zeros(n, m)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      let s = 0
      for (let l = 0; l < k; l++) s += A[i][l] * B[l][j]
      C[i][j] = s
    }
  return C
}

/**
 * Eigendecomposition of a symmetric matrix via cyclic Jacobi rotations.
 * Returns { values: [l1, l2, ...], vectors: [[v1], [v2], ...] }
 * where vectors[i] is the eigenvector for values[i].
 * Eigenvalues sorted descending.
 */
export function jacobiEigen(A) {
  const n = A.length
  // Work on a copy
  const S = zeros(n, n)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      S[i][j] = A[i][j]

  const V = eye(n)
  const maxIter = 100

  for (let iter = 0; iter < maxIter; iter++) {
    // Find max off-diagonal element
    let maxVal = 0, p = 0, q = 1
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (Math.abs(S[i][j]) > maxVal) {
          maxVal = Math.abs(S[i][j])
          p = i; q = j
        }

    if (maxVal < 1e-12) break

    // Compute rotation angle
    const diff = S[q][q] - S[p][p]
    let t
    if (Math.abs(diff) < 1e-14) {
      t = 1
    } else {
      const tau = diff / (2 * S[p][q])
      t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau))
    }
    const c = 1 / Math.sqrt(1 + t * t)
    const s = t * c

    // Apply rotation to S
    const Sp = new Float64Array(n)
    const Sq = new Float64Array(n)
    for (let i = 0; i < n; i++) { Sp[i] = S[p][i]; Sq[i] = S[q][i] }

    for (let i = 0; i < n; i++) {
      S[p][i] = c * Sp[i] - s * Sq[i]
      S[q][i] = s * Sp[i] + c * Sq[i]
      S[i][p] = S[p][i]
      S[i][q] = S[q][i]
    }
    S[p][p] = c * c * Sp[p] - 2 * s * c * Sp[q] + s * s * Sq[q]
    S[q][q] = s * s * Sp[p] + 2 * s * c * Sp[q] + c * c * Sq[q]
    S[p][q] = 0
    S[q][p] = 0

    // Accumulate eigenvectors
    for (let i = 0; i < n; i++) {
      const vp = V[i][p], vq = V[i][q]
      V[i][p] = c * vp - s * vq
      V[i][q] = s * vp + c * vq
    }
  }

  // Extract eigenvalues and sort descending
  const pairs = []
  for (let i = 0; i < n; i++) {
    const vec = new Array(n)
    for (let j = 0; j < n; j++) vec[j] = V[j][i]
    pairs.push({ value: S[i][i], vector: vec })
  }
  pairs.sort((a, b) => b.value - a.value)

  return {
    values: pairs.map(p => p.value),
    vectors: pairs.map(p => p.vector),
  }
}

/**
 * General CCA for X (n x p) and Y (n x q).
 * Returns { correlations: [...], Wx: p x k, Wy: q x k } where k = min(p, q).
 */
export function generalCCA(X, Y) {
  const n = X.length
  const p = X[0].length
  const q = Y[0].length
  const k = Math.min(p, q)

  // Center
  const meanX = new Float64Array(p)
  const meanY = new Float64Array(q)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) meanX[j] += X[i][j]
    for (let j = 0; j < q; j++) meanY[j] += Y[i][j]
  }
  for (let j = 0; j < p; j++) meanX[j] /= n
  for (let j = 0; j < q; j++) meanY[j] /= n

  const Xc = zeros(n, p)
  const Yc = zeros(n, q)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) Xc[i][j] = X[i][j] - meanX[j]
    for (let j = 0; j < q; j++) Yc[i][j] = Y[i][j] - meanY[j]
  }

  // Covariance matrices (using n-1 normalization)
  const XcT = matT(Xc)
  const YcT = matT(Yc)
  const denom = n - 1
  const Sxx = matMul(XcT, Xc)
  const Syy = matMul(YcT, Yc)
  const Sxy = matMul(XcT, Yc)
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++) Sxx[i][j] /= denom
  for (let i = 0; i < q; i++)
    for (let j = 0; j < q; j++) Syy[i][j] /= denom
  for (let i = 0; i < p; i++)
    for (let j = 0; j < q; j++) Sxy[i][j] /= denom

  // Whitening: Sxx^{-1/2} via eigendecomposition
  function invSqrtSym(M) {
    const d = M.length
    const { values, vectors } = jacobiEigen(M)
    // V matrix: columns are eigenvectors
    const Vm = zeros(d, d)
    const Dinv = zeros(d, d)
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) Vm[j][i] = vectors[i][j]
      Dinv[i][i] = values[i] > 1e-10 ? 1 / Math.sqrt(values[i]) : 0
    }
    return matMul(matMul(Vm, Dinv), matT(Vm))
  }

  const SxxInvSqrt = invSqrtSym(Sxx)
  const SyyInvSqrt = invSqrtSym(Syy)

  // M = Sxx^{-1/2} Sxy Syy^{-1/2}
  const M = matMul(matMul(SxxInvSqrt, Sxy), SyyInvSqrt)

  // SVD of M via eigendecomposition of M^T M
  const MtM = matMul(matT(M), M)
  const eigR = jacobiEigen(MtM)

  // Singular values and right singular vectors
  const corrs = new Array(k)
  const Vmat = zeros(q, k)
  for (let i = 0; i < k; i++) {
    corrs[i] = Math.min(1, Math.max(0, Math.sqrt(Math.max(0, eigR.values[i]))))
    for (let j = 0; j < q; j++) Vmat[j][i] = eigR.vectors[i][j]
  }

  // Left singular vectors: u_i = M v_i / sigma_i
  const Umat = zeros(p, k)
  for (let i = 0; i < k; i++) {
    if (corrs[i] > 1e-10) {
      const vi = new Array(q)
      for (let j = 0; j < q; j++) vi[j] = Vmat[j][i]
      // M * vi
      for (let j = 0; j < p; j++) {
        let s = 0
        for (let l = 0; l < q; l++) s += M[j][l] * vi[l]
        Umat[j][i] = s / corrs[i]
      }
    }
  }

  // Canonical weights: Wx = Sxx^{-1/2} U, Wy = Syy^{-1/2} V
  const Wx = matMul(SxxInvSqrt, Umat)
  const Wy = matMul(SyyInvSqrt, Vmat)

  return { correlations: corrs, Wx, Wy }
}

/**
 * Generate i.i.d. Gaussian data with no shared structure.
 * Returns { X: n x p, Y: n x q }.
 */
export function generateIndependentData(n, p, q) {
  return { X: randn(n, p), Y: randn(n, q) }
}

/**
 * Generate data with specified canonical correlation structure.
 * trueCorrs is an array of desired canonical correlations (e.g., [0.9, 0.5]).
 * The remaining min(p,q) - trueCorrs.length pairs have zero correlation.
 * Returns { X: n x p, Y: n x q }.
 */
export function generateStructuredData(n, p, q, trueCorrs) {
  const k = Math.min(p, q)
  // Generate latent variables: n x k standard normal
  const Z = randn(n, k)
  // Generate independent noise for X and Y
  const noiseX = randn(n, p)
  const noiseY = randn(n, q)

  const X = zeros(n, p)
  const Y = zeros(n, q)

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      X[i][j] = noiseX[i][j]
    }
    for (let j = 0; j < q; j++) {
      Y[i][j] = noiseY[i][j]
    }
    // Inject shared signal through the first trueCorrs.length dimensions
    for (let c = 0; c < trueCorrs.length && c < k; c++) {
      const rho = trueCorrs[c]
      // X_c = rho * Z_c + sqrt(1-rho^2) * noise_c
      // Y_c = rho * Z_c + sqrt(1-rho^2) * noise_c (independent noise)
      const mix = Math.sqrt(1 - rho * rho)
      if (c < p) X[i][c] = rho * Z[i][c] + mix * noiseX[i][c]
      if (c < q) Y[i][c] = rho * Z[i][c] + mix * noiseY[i][c]
    }
  }

  return { X, Y }
}

// ===================== Self-Test (commented out) ==========================
//
// Uncomment and run with Node to verify:
//
// function selfTest() {
//   const rho1 = 0.9;
//   const rho2 = 0.3;
//   const n = 5000;
//   const { Xa, Xb } = generateData(n, rho1, rho2);
//   const result = solveCCA(Xa, Xb);
//
//   console.log("Target correlations:", rho1, rho2);
//   console.log("Recovered correlations:", result.correlations);
//
//   // Verify by projecting and computing Pearson correlation directly
//   const { centered: Xac } = centerData(Xa);
//   const { centered: Xbc } = centerData(Xb);
//   const pA1 = projectOntoDirection(Xac, result.Wa[0]);
//   const pB1 = projectOntoDirection(Xbc, result.Wb[0]);
//   const pA2 = projectOntoDirection(Xac, result.Wa[1]);
//   const pB2 = projectOntoDirection(Xbc, result.Wb[1]);
//
//   console.log("Pearson r (pair 1):", computeCorrelation(pA1, pB1));
//   console.log("Pearson r (pair 2):", computeCorrelation(pA2, pB2));
//
//   // Check that recovered correlations are close to target
//   const tol = 0.1; // generous tolerance for random data
//   const ok1 = Math.abs(result.correlations[0] - rho1) < tol;
//   const ok2 = Math.abs(result.correlations[1] - rho2) < tol;
//   console.log("Test passed:", ok1 && ok2);
// }
//
// selfTest();
