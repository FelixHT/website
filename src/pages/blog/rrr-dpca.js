import React, { useRef, useState, useEffect } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
import Sidenote from "../../components/Sidenote"
import Citation from "../../components/Citation"
import { InlineMath, BlockMath, Equation } from "../../components/Math"
import FigureContainer from "../../components/blog/FigureContainer"
import TableOfContents from "../../components/blog/TableOfContents"
import CodeBlock from "../../components/blog/CodeBlock"
import "./blog-post.css"

// Figure components
import RRRExplorer from "../../components/blog/RRRExplorer"
import CommSubspaceExplorer from "../../components/blog/CommSubspaceExplorer"
import DPCADemixingExplorer from "../../components/blog/DPCADemixingExplorer"
import TDRExplorer from "../../components/blog/TDRExplorer"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "the-asymmetry", label: "The asymmetry" },
  { id: "regression-as-a-matrix", label: "Regression as a matrix" },
  { id: "low-rank-constraint", label: "The low-rank constraint" },
  { id: "rrr-solution", label: "Solving reduced-rank regression" },
  { id: "communication-subspaces", label: "Communication subspaces" },
  { id: "dpca", label: "dPCA: demixing task variables" },
  { id: "tdr", label: "Targeted dimensionality reduction" },
  { id: "the-landscape", label: "Variance, correlation, prediction" },
  { id: "implementation", label: "Implementation" },
  { id: "references", label: "References" },
]

const RRRPost = () => {
  const bodyRef = useRef(null)
  const [readingTime, setReadingTime] = useState(null)

  useEffect(() => {
    if (bodyRef.current) {
      const words = bodyRef.current.textContent.trim().split(/\s+/).length
      setReadingTime(Math.ceil(words / 250))
    }
  }, [])

  return (
    <Layout>
      <article className="blog-post">
        <div className="blog-post__header">
          <h1 className="blog-post__title">
            Reduced-rank regression and dPCA
          </h1>
          <p className="blog-post__subtitle">
            Predicting one population's activity from another through
            a low-rank bottleneck.
          </p>
          <div className="blog-post__byline">
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Published</span>
              <span className="blog-post__byline-value">March 2026</span>
            </div>
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Reading time</span>
              <span className="blog-post__byline-value">
                {readingTime ? `${readingTime} min` : ""}
              </span>
            </div>
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Series</span>
              <span className="blog-post__byline-value">
                Linear Algebra for Neural Data, Part 11
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          <h2 id="the-asymmetry">The asymmetry</h2>

          <p>
            PCA finds the directions where the data vary most. CCA
            finds the directions where two datasets correlate most.
            Procrustes finds the rotation that best aligns two
            coordinate systems. All three treat the two sides
            symmetrically: swap the datasets and you get the same
            answer (or the transpose of the same answer).
          </p>

          <p>
            But many problems in neuroscience are not symmetric. You
            record from motor cortex and measure hand velocity. You
            want to predict velocity from neural activity, not the
            reverse. You record from V1 and V2 and want to know which
            V1 patterns drive V2 responses, not which V2 patterns
            drive V1. You have a task with conditions (reach direction,
            grasp type, go/no-go) and want to know which neural
            dimensions encode which conditions.
          </p>

          <p>
            These are prediction problems, not correlation problems.
            They have a direction: from <InlineMath tex="X" />{" "}
            to <InlineMath tex="Y" />. The answer depends on which
            variable you are predicting. The methods in this post
            respect that asymmetry.
          </p>

          <h2 id="regression-as-a-matrix">Regression as a matrix</h2>

          <p>
            Start with the simplest case. You have a neural data
            matrix <InlineMath tex="X" /> (500 time bins by 100
            neurons) and a behavioral target{" "}
            <InlineMath tex="Y" /> (500 time bins by 2 velocity
            components). You want the linear map from neural activity
            to velocity that minimizes prediction error:
          </p>

          <Equation
            tex="\min_B\; \|Y - XB\|_F^2"
            number={1}
          />

          <p>
            The solution is the least-squares
            estimate: <InlineMath tex="B = (X^\top X)^{-1} X^\top Y" /> (the
            normal equations from <Link to="/blog/least-squares/">Post 8</Link>).
            The coefficient matrix <InlineMath tex="B" /> is
            100-by-2. Each column is a decoder: a set of weights across
            all 100 neurons for one velocity component.
          </p>

          <p>
            Now ask: what is the rank of <InlineMath tex="B" />? It is
            100-by-2, so its rank is at most 2. The prediction lives
            in a 2-dimensional subspace of the 100-dimensional neuron
            space. Ordinary regression already produces a low-rank
            coefficient matrix, because the target is low-dimensional.
          </p>

          <p>
            But what if your target is high-dimensional?
            Suppose <InlineMath tex="Y" /> has 50 columns (50 muscles,
            or 50 neurons in a downstream area). The coefficient
            matrix <InlineMath tex="B" /> is now 100-by-50, and its
            rank could be as high as 50. Yet you suspect that the
            neural activity relevant for predicting <InlineMath tex="Y" />{" "}
            lives in a much lower-dimensional subspace. Not all 50
            output dimensions are independently driven from the neural
            population. Maybe 5 latent dimensions in the neural space
            explain most of the prediction.
          </p>

          <p>
            Ordinary regression does not know about this structure. It
            estimates each of the 50 output columns independently. If
            the underlying prediction is low-rank, the full-rank
            estimate is wasting parameters and fitting noise.
          </p>

          <h2 id="low-rank-constraint">The low-rank constraint</h2>

          <p>
            <em>Reduced-rank regression</em>{" "}
            (RRR) <Citation numbers={[1]} /> solves this by
            constraining the coefficient matrix to have low rank:
          </p>

          <Equation
            tex="\min_{B:\, \text{rank}(B) \leq k}\; \|Y - XB\|_F^2"
            number={2}
          />

          <p>
            A rank-<InlineMath tex="k" /> matrix can always be
            factored as <InlineMath tex="B = WA" />,
            where <InlineMath tex="W" /> is 100-by-<InlineMath tex="k" />{" "}
            and <InlineMath tex="A" /> is{" "}
            <InlineMath tex="k" />-by-50. Think of this as a
            bottleneck. The neural state gets projected
            onto <InlineMath tex="k" /> dimensions
            (via <InlineMath tex="W" />), and then the output is
            reconstructed from those <InlineMath tex="k" /> dimensions
            (via <InlineMath tex="A" />):
          </p>

          <Equation
            tex="Y \approx X\,W\,A = \underbrace{(XW)}_{500 \times k}\;\underbrace{A}_{k \times 50}"
            number={3}
          />

          <p>
            The columns of <InlineMath tex="W" /> define
            the <em>predictive subspace</em>: the{" "}
            <InlineMath tex="k" /> directions in neural space that
            carry all the information needed to predict the target.
            The matrix <InlineMath tex="A" /> is the readout: how the
            50 output dimensions are reconstructed from
            those <InlineMath tex="k" /> latent scores.
          </p>

          <p>
            Compare this to PCA. PCA finds the{" "}
            <InlineMath tex="k" /> directions that capture the most
            variance in <InlineMath tex="X" /> alone. RRR finds
            the <InlineMath tex="k" /> directions
            in <InlineMath tex="X" /> that capture the most
            predictable variance in <InlineMath tex="Y" />. The two
            subspaces can be quite different. The highest-variance
            direction in neural activity might be a slow drift that
            has nothing to do with the downstream target. RRR ignores
            it; PCA would put it
            first.
            <Sidenote number={1}>
              This contrast is precisely what
              motivates <Link to="/blog/psid/">PSID</Link> as well.
              PCA captures variance. CCA captures correlation. RRR
              captures prediction. PSID captures behaviorally relevant
              dynamics. Each method finds a different subspace because
              each optimizes a different objective. The table at the end
              of this post maps the full landscape.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="A 2D neural population predicting a target. The PCA direction (dashed) captures maximum variance. The RRR direction (solid) captures maximum prediction. They point in different directions."
          >
            <RRRExplorer />
          </FigureContainer>

          <h2 id="rrr-solution">Solving reduced-rank regression</h2>

          <p>
            The solution uses tools we already have. Start by
            computing the full (unconstrained)
            least-squares
            estimate <InlineMath tex="\hat{B} = (X^\top X)^{-1} X^\top Y" />.
            This is a 100-by-50 matrix, with rank potentially as high
            as 50. Now take its SVD:
          </p>

          <Equation
            tex="\hat{B} = U_B \Sigma_B V_B^\top"
            number={4}
          />

          <p>
            The rank-<InlineMath tex="k" /> RRR estimate is the
            truncated
            SVD: <InlineMath tex="B_k = U_{B,k} \Sigma_{B,k} V_{B,k}^\top" />,
            keeping only the
            first <InlineMath tex="k" /> components. The predictive
            subspace is spanned by the first <InlineMath tex="k" />{" "}
            columns of <InlineMath tex="U_B" />: the directions in
            neural space along which the regression coefficient is
            largest.
          </p>

          <p>
            A subtlety worth flagging. We want to minimize{" "}
            <InlineMath tex="\|Y - XB\|_F^2" />, not{" "}
            <InlineMath tex="\|\hat{B} - B\|_F^2" />. These are
            different problems: the first measures prediction error,
            the second measures coefficient distance.
            The Eckart-Young theorem from the SVD post says that
            truncating the SVD minimizes the second. But it turns out
            that minimizing the coefficient distance in the metric
            induced by <InlineMath tex="X^\top X" /> is equivalent to
            minimizing prediction error. Since{" "}
            <InlineMath tex="X^\top X" /> reweights the coefficient
            space but does not change the ordering of singular
            components, the truncated SVD of <InlineMath tex="\hat{B}" />{" "}
            is also optimal for
            prediction.
            <Sidenote number={2}>
              The full argument: <InlineMath tex="\|Y - XB\|_F^2 = \|Y - X\hat{B}\|_F^2 + \|X(\hat{B} - B)\|_F^2" />{" "}
              by the Pythagorean theorem (the residual of the
              unconstrained fit is orthogonal to the column space
              of <InlineMath tex="X" />). The first term does not
              depend on <InlineMath tex="B" />, so minimizing the
              prediction error reduces to
              minimizing <InlineMath tex="\|X(\hat{B} - B)\|_F^2" />.
              Izenman <Citation numbers={[1]} /> shows that this is
              solved by the truncated SVD
              of <InlineMath tex="\hat{B}" /> in the inner product
              weighted by <InlineMath tex="X^\top X" />.
            </Sidenote>
          </p>

          <p>
            The factorization <InlineMath tex="B_k = WA" /> from
            the truncated SVD is{" "}
            <InlineMath tex="W = U_{B,k}" /> (the encoder, projecting
            neural activity to the <InlineMath tex="k" />-dimensional
            predictive subspace) and{" "}
            <InlineMath tex="A = \Sigma_{B,k} V_{B,k}^\top" /> (the
            decoder, reconstructing the 50-dimensional target from
            the <InlineMath tex="k" /> latent scores).
          </p>

          <h2 id="communication-subspaces">Communication subspaces</h2>

          <p>
            Semedo et al. <Citation numbers={[2]} /> applied
            reduced-rank regression to a specific question: when area
            V1 drives area V2, which dimensions of V1 activity carry
            the signal? They recorded from both areas simultaneously,
            took V1 as <InlineMath tex="X" /> and V2
            as <InlineMath tex="Y" />, and fit RRR. The predictive
            subspace — the column space of <InlineMath tex="W" /> in
            the factorization <InlineMath tex="B = WA" /> — is
            the <em>communication subspace</em>: the directions of V1
            activity that predict V2 responses.
          </p>

          <p>
            The communication subspace is
            low-dimensional (rank 2-4 explains most of the predictable
            variance, out of populations of 50+ neurons) and it does
            not align with the top PCA dimensions of either area. V1's
            highest-variance directions are not the ones that drive V2.
            The communication subspace is a separate low-dimensional
            channel embedded within the higher-dimensional activity of
            each area.
          </p>

          <p>
            This is a concrete case of the general point: the subspace
            that matters for prediction (RRR) is different from the
            subspace that matters for variance (PCA). The four
            fundamental subspaces from Post 4 are at work here. The
            column space of the regression coefficient is the
            predictive subspace. Its null space is the set of V1
            activity patterns that V2 ignores. V1 can be doing
            something in those null-space directions — local
            computation, perhaps — that does not cross the
            inter-area
            boundary.
            <Sidenote number={3}>
              The communication subspace idea has been extended to
              time-lagged regression (to account for transmission
              delays between cortical areas), to more than two areas
              (using multi-area RRR), and to nonlinear settings. The
              linear version remains the most interpretable, and RRR
              is the tool that makes it precise. See
              Semedo et al. <Citation numbers={[2]} /> for the original
              two-area analysis and the cited extensions.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="Two simulated populations (V1 → V2). The communication subspace is the low-rank projection that V1 uses to drive V2. Click different ranks to see prediction quality change."
          >
            <CommSubspaceExplorer />
          </FigureContainer>

          <h2 id="dpca">dPCA: demixing task variables</h2>

          <p>
            A different use of regression subspaces. Suppose your
            experiment has a factorial design: 8 reach directions
            crossed with 2 grip types, giving 16 conditions. You
            trial-average the neural data for each condition. Now you
            have a 16-by-100 data matrix (conditions by neurons). Each
            condition is labeled by two task variables: direction and
            grip.
          </p>

          <p>
            PCA on this matrix gives you directions of maximum
            variance across conditions. But PCA does not know about
            the task structure. The first PC might capture a mixture
            of direction and grip information. You want dimensions
            that cleanly separate the two.
          </p>

          <p>
            Demixed PCA <Citation numbers={[3]} /> (dPCA) solves this.
            The total data variance can be decomposed into components
            attributable to each task variable:
          </p>

          <Equation
            tex="C_{\text{total}} = C_{\text{direction}} + C_{\text{grip}} + C_{\text{interaction}} + C_{\text{residual}}"
            number={5}
          />

          <p>
            where each <InlineMath tex="C" /> is a covariance matrix
            computed by marginalizing over the conditions not relevant
            to that variable. For instance,{" "}
            <InlineMath tex="C_{\text{direction}}" /> is the covariance
            of the condition-averaged responses after averaging over
            grip types.
          </p>

          <p>
            dPCA finds, for each task variable, an
            encoder <InlineMath tex="W" /> and
            decoder <InlineMath tex="A" /> such
            that <InlineMath tex="X \approx (XW)A" /> and the
            projected activity <InlineMath tex="XW" /> captures
            variance primarily from that variable's component. The
            objective balances two goals: reconstruct the data well
            (like PCA) and capture variance from the target component
            (like regression). Concretely, dPCA
            minimizes:
          </p>

          <Equation
            tex="\|X - XW_\phi A_\phi\|_F^2 \quad\text{subject to}\quad W_\phi^\top C_\phi W_\phi \text{ being maximal}"
            number={6}
          />

          <p>
            for each marginalization <InlineMath tex="\phi" />{" "}
            (direction, grip, interaction).
            <Sidenote number={4}>
              dPCA is not a pure eigenvector problem. The encoder and
              decoder are found by an alternating least-squares procedure
              that balances reconstruction accuracy against task-variable
              purity. The result is not orthogonal in general, and the
              "components" for different task variables live in different
              subspaces. Kobak et al. <Citation numbers={[3]} /> provide
              a regularized version that handles the case where the
              number of conditions is smaller than the number of neurons.
            </Sidenote>
          </p>

          <p>
            Instead of plotting the first three PCs and
            trying to guess which one corresponds to direction versus
            grip, dPCA gives you labeled axes. The first "direction
            component" shows how the population separates reach
            directions. The first "grip component" shows how it
            separates grip types. The demixing is explicit.
          </p>

          <FigureContainer
            width="outset"
            caption="Toggle between PCA and dPCA projections. Under PCA, the first component mixes direction and epoch. Under dPCA, each axis cleanly captures one task variable."
          >
            <DPCADemixingExplorer />
          </FigureContainer>

          <h2 id="tdr">Targeted dimensionality reduction</h2>

          <p>
            Mante et al. <Citation numbers={[4]} /> introduced
            targeted dimensionality reduction (TDR) for a specific
            problem: understanding how prefrontal cortex represents
            multiple task variables simultaneously. The approach is
            simpler than dPCA but addresses a similar question.
          </p>

          <p>
            For each task variable (e.g., motion direction, color,
            choice), regress the neural population activity onto that
            variable to get a regression vector. This vector is a
            direction in neural space that best predicts that variable.
            Collect the regression vectors for all task variables and
            use them to define a low-dimensional subspace. Project the
            data onto this subspace.
          </p>

          <p>
            The resulting dimensions are interpretable by construction:
            each one is the neural direction most associated with a
            specific task variable. They are not orthogonal (the
            direction that predicts motion and the direction that
            predicts choice may overlap). They are not ordered by
            variance. They are ordered by the experimental design.
          </p>

          <p>
            TDR is less principled than RRR or dPCA — it does not
            optimize a global objective — but it is transparent and
            easy to implement. It produces dimensions you can name:
            "the choice axis," "the stimulus axis." That
            interpretability has made it influential.
            <Sidenote number={5}>
              The regression vectors from TDR are closely related
              to the columns of <InlineMath tex="W" /> in RRR. Both
              find neural directions associated with targets. RRR
              optimizes jointly for all targets; TDR finds each
              direction independently and then combines them. When
              the targets are uncorrelated, the two approaches give
              similar results. When targets are correlated, RRR
              accounts for the shared structure; TDR does not.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="Toggle between PCA and TDR views. PCA's first axis captures variance but mixes conditions. TDR finds the regression-defined axes that cleanly separate task-relevant groups."
          >
            <TDRExplorer />
          </FigureContainer>

          <h2 id="the-landscape">
            Variance, correlation, prediction
          </h2>

          <p>
            We now have a landscape of methods, and it is worth
            seeing the whole map. Each method finds a low-dimensional
            subspace, but they optimize different objectives:
          </p>

          <p>
            <strong>PCA</strong> (<Link to="/blog/pca/">Post 7</Link>):
            maximize variance
            in <InlineMath tex="X" />. Symmetric in the sense that it
            looks at one dataset. No target.
          </p>

          <p>
            <strong>CCA</strong> (<Link to="/blog/cca/">Post 9</Link>):
            maximize correlation between projections
            of <InlineMath tex="X" /> and{" "}
            <InlineMath tex="Y" />. Symmetric between the two datasets.
          </p>

          <p>
            <strong>Procrustes</strong>{" "}
            (<Link to="/blog/procrustes-alignment/">Post 10</Link>):
            minimize distance between <InlineMath tex="X" /> and a
            rotated version of <InlineMath tex="Y" />. Symmetric, with
            a geometric constraint (orthogonality).
          </p>

          <p>
            <strong>RRR</strong> (this post): minimize prediction error
            from <InlineMath tex="X" /> to <InlineMath tex="Y" />,
            subject to a rank constraint. Asymmetric. Prediction, not
            correlation.
          </p>

          <p>
            <strong>dPCA</strong> (this post): decompose variance by
            task variable. Uses regression to define what "belongs" to
            each variable, but the objective mixes reconstruction and
            demixing.
          </p>

          <p>
            <strong>TDR</strong> (this post): find the neural direction
            most associated with each task variable by regression.
            No global objective; interpretability by design.
          </p>

          <p>
            Each method answers a different question. The subspaces they
            find can overlap substantially, or they can be nearly
            orthogonal. There is no single "right" subspace. There is
            only the subspace that is right for your
            question. Cunningham and Yu <Citation numbers={[5]} />{" "}
            give a review that maps these methods against each other.
            <Sidenote number={6}>
              One way to organize the landscape: by what the method
              treats as signal vs. noise. PCA treats variance as signal
              and discards small-variance directions. CCA treats
              cross-dataset correlation as signal. RRR treats
              predictive power as signal. dPCA treats task-variable
              attribution as signal. Each choice implicitly defines
              what counts as "structure" and what counts as "noise."
              The differences between methods reduce to this choice.
            </Sidenote>
          </p>

          <p>
            All of the methods above treat neural data as static:
            each time bin is an independent observation. None of them
            models how the neural state evolves over time. But neural
            activity has dynamics: the state at time{" "}
            <InlineMath tex="t" /> depends on the state at
            time <InlineMath tex="t-1" />. Ignoring this temporal
            structure throws away information. The next group of posts
            builds the mathematics for dynamics: linear dynamical
            systems, subspace identification,
            and <Link to="/blog/psid/">PSID</Link>, which extends
            the predictive-subspace idea from RRR into the temporal
            domain.
          </p>

          <h2 id="implementation">Implementation</h2>

          <p>
            RRR is remarkably simple: fit ordinary least squares, then
            truncate the SVD. dPCA requires the marginalized covariance
            matrices but is also straightforward. Here are both:
          </p>

          <CodeBlock language="python" code={`import numpy as np

def rrr(X, Y, k):
    """
    Reduced-rank regression: find the rank-k coefficient
    matrix B that minimizes ||Y - X B||_F^2.

    Parameters
    ----------
    X : array, shape (n, p)
        Predictor matrix (e.g., neural data).
    Y : array, shape (n, q)
        Target matrix (e.g., downstream area or behavior).
    k : int
        Rank constraint.

    Returns
    -------
    B_k : array, shape (p, q)
        Rank-k coefficient matrix.
    W : array, shape (p, k)
        Encoder (predictive subspace directions).
    A : array, shape (k, q)
        Decoder (readout from latent scores to target).
    """
    # Full least-squares estimate
    B_hat = np.linalg.lstsq(X, Y, rcond=None)[0]

    # SVD of the coefficient matrix
    U, s, Vt = np.linalg.svd(B_hat, full_matrices=False)

    # Truncate to rank k
    W = U[:, :k]                    # encoder
    A = np.diag(s[:k]) @ Vt[:k, :]  # decoder
    B_k = W @ A

    return B_k, W, A


def dpca_simple(X_conditions, labels, k_per_var=2, reg=1e-3):
    """
    Simplified dPCA for a factorial design with two variables.

    Parameters
    ----------
    X_conditions : array, shape (n_conditions, p)
        Condition-averaged neural data (conditions x neurons).
    labels : dict
        {'var1': array of labels, 'var2': array of labels}
        for each condition.
    k_per_var : int
        Components per task variable.
    reg : float
        Regularization strength.

    Returns
    -------
    encoders : dict
        {var_name: array shape (p, k_per_var)} for each variable.
    decoders : dict
        {var_name: array shape (k_per_var, p)} for each variable.
    """
    p = X_conditions.shape[1]
    C_total = X_conditions.T @ X_conditions
    encoders, decoders = {}, {}

    for var_name, var_labels in labels.items():
        # Marginalize: average over levels of other variables
        unique = np.unique(var_labels)
        X_marg = np.array([
            X_conditions[var_labels == lev].mean(axis=0)
            for lev in unique
        ])
        C_var = X_marg.T @ X_marg

        # Solve for encoder via regularized regression
        # W maximizes tr(W^T C_var W) / tr(W^T C_total W)
        M = np.linalg.solve(C_total + reg * np.eye(p), C_var)
        eigvals, eigvecs = np.linalg.eigh(M)
        idx = np.argsort(eigvals)[::-1][:k_per_var]
        W = eigvecs[:, idx]

        # Decoder: least-squares reconstruction
        A = np.linalg.lstsq(
            X_conditions @ W, X_conditions, rcond=None
        )[0]

        encoders[var_name] = W
        decoders[var_name] = A

    return encoders, decoders


# ── Example: RRR on simulated V1 → V2 data ──
rng = np.random.default_rng(42)
n_time, p_v1, p_v2, true_rank = 500, 60, 40, 3

# Latent communication signal
Z = rng.standard_normal((n_time, true_rank))
W_true = rng.standard_normal((p_v1, true_rank))
A_true = rng.standard_normal((true_rank, p_v2))

X = Z @ W_true.T + 0.5 * rng.standard_normal((n_time, p_v1))
Y = Z @ A_true.T + 0.5 * rng.standard_normal((n_time, p_v2))

# Center
X -= X.mean(axis=0)
Y -= Y.mean(axis=0)

# Fit RRR at different ranks
for k in [1, 2, 3, 5, 10]:
    B_k, W, A = rrr(X, Y, k)
    Y_hat = X @ B_k
    r2 = 1 - np.sum((Y - Y_hat)**2) / np.sum(Y**2)
    print(f"Rank {k:2d}: R² = {r2:.3f}")
# You should see R² plateau around rank 3`} />

          <p>
            The key practical detail: always center both <InlineMath tex="X" />{" "}
            and <InlineMath tex="Y" /> before fitting. If you forget,
            the first singular component of <InlineMath tex="\hat{B}" />{" "}
            will capture the mean offset rather than the most predictive
            direction.
            <Sidenote number={7}>
              For cross-validated rank selection, fit RRR at each
              rank <InlineMath tex="k" /> on a training set and
              evaluate prediction error on a held-out test set. The
              optimal rank is the one where test-set <InlineMath tex="R^2" />{" "}
              stops improving. Semedo et al. <Citation numbers={[2]} />{" "}
              use this approach to determine the dimensionality of
              the V1-V2 communication subspace.
            </Sidenote>
          </p>

          <h2 id="references">References</h2>
          <ol className="blog-references">
            <li id="ref-1">
              Izenman, A. J. "Reduced-rank regression for the
              multivariate linear model,"{" "}
              <em>Journal of Multivariate Analysis</em>, vol. 5, no. 2,
              pp. 248-264, 1975.
            </li>
            <li id="ref-2">
              Semedo, J. D., Zandvakili, A., Machens, C. K., Yu, B. M.,
              and Kohn, A. "Cortical areas interact through a
              communication subspace,"{" "}
              <em>Neuron</em>, vol. 102, no. 1, pp. 249-259, 2019.
            </li>
            <li id="ref-3">
              Kobak, D., Brendel, W., Constantinidis, C., et al.
              "Demixed principal component analysis of neural population
              data,"{" "}
              <em>eLife</em>, vol. 5, e10989, 2016.
            </li>
            <li id="ref-4">
              Mante, V., Sussillo, D., Shenoy, K. V., and Newsome, W. T.
              "Context-dependent computation by recurrent dynamics in
              prefrontal cortex,"{" "}
              <em>Nature</em>, vol. 503, pp. 78-84, 2013.
            </li>
            <li id="ref-5">
              Cunningham, J. P. and Yu, B. M. "Dimensionality reduction
              for large-scale neural recordings,"{" "}
              <em>Nature Neuroscience</em>, vol. 17, pp. 1500-1509, 2014.
            </li>
            <li id="ref-6">
              Churchland, M. M., Cunningham, J. P., Kaufman, M. T.,
              et al. "Neural population dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51-56, 2012.
            </li>
          </ol>
        </div>

        <SeriesNav part={11} />

        <div className="blog-post__footer-sep"></div>
        <div className="blog-post__back">
          <Link to="/" className="blog-post__back-link">
            &larr; Back to home
          </Link>
        </div>
      </article>
    </Layout>
  )
}

export const Head = () => (
  <title>
    Reduced-rank regression and dPCA &mdash;
    Felix Taschbach
  </title>
)

export default RRRPost
