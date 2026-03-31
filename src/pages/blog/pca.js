import React, { useRef, useState, useEffect } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
import Sidenote from "../../components/Sidenote"
import Citation from "../../components/Citation"
import { InlineMath, BlockMath, Equation } from "../../components/Math"
import FigureContainer from "../../components/blog/FigureContainer"
import TableOfContents from "../../components/blog/TableOfContents"
import "./blog-post.css"

// Figure components
import SubspaceProjectionExplorer from "../../components/blog/SubspaceProjectionExplorer"
import VarianceMaximizationExplorer from "../../components/blog/VarianceMaximizationExplorer"
import NeuralBasisChange from "../../components/blog/NeuralBasisChange"
import PCAReveal from "../../components/blog/PCAReveal"
import PCAFailureModesExplorer from "../../components/blog/PCAFailureModesExplorer"
import CodeBlock from "../../components/blog/CodeBlock"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "the-question", label: "The question PCA answers" },
  { id: "maximize-variance", label: "Maximize variance" },
  { id: "minimize-error", label: "Minimize reconstruction error" },
  { id: "same-answer", label: "Why both give the same answer" },
  { id: "pca-via-svd", label: "PCA via the SVD" },
  { id: "scores-loadings", label: "Scores, loadings, and reconstruction" },
  { id: "how-many", label: "How many components to keep" },
  { id: "failure-modes", label: "When PCA misleads" },
  { id: "what-comes-next", label: "What comes next" },
  { id: "implementation", label: "Implementation" },
  { id: "references", label: "References" },
]

const PCAPost = () => {
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
            Principal component analysis
          </h1>
          <p className="blog-post__subtitle">
            Variance maximization and low-rank approximation turn out
            to be the same problem.
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
                Linear Algebra for Neural Data, Part 7
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          <h2 id="the-question">The question PCA answers</h2>

          <p>
            You record from 100 neurons over 500 time bins. The data
            is a 500-by-100 matrix <InlineMath tex="X" /> (centered: each
            neuron's mean has been subtracted). You believe the
            population's activity is approximately low-dimensional, say
            confined near a 5-dimensional subspace of the
            100-dimensional neuron space.
          </p>

          <p>
            You want to find that subspace. But which 5-dimensional
            subspace? There are infinitely many 5-dimensional subspaces
            of <InlineMath tex="\mathbb{R}^{100}" />. You need a
            criterion, a way to rank one subspace as better than another.
          </p>

          <p>
            There are two natural criteria, and they look quite
            different.
          </p>

          <p>
            <strong>Criterion 1: variance.</strong> Find the
            5-dimensional subspace along which the data spread out the
            most. The data are informative in directions where they
            vary, and uninformative in directions where they sit still.
            Capture the most variance with the fewest axes.
          </p>

          <p>
            <strong>Criterion 2: reconstruction.</strong> Find the
            5-dimensional subspace such that projecting the data onto it
            and then lifting back to 100 dimensions loses as little as
            possible. Minimize the reconstruction error.
          </p>

          <p>
            These seem like different problems. The first is about
            keeping what moves. The second is about approximating the
            original data. But they turn out to have the same answer.
            That answer is PCA.
          </p>

          <h2 id="maximize-variance">
            Maximize variance
          </h2>

          <p>
            Start with one direction. Find the unit
            vector <InlineMath tex="w" /> in{" "}
            <InlineMath tex="\mathbb{R}^{100}" /> such that the
            variance of the data projected onto <InlineMath tex="w" />{" "}
            is as large as possible.
          </p>

          <p>
            From Post 5, the variance of the data along a unit
            direction <InlineMath tex="w" /> is the quadratic
            form <InlineMath tex="w^\top C w" />,
            where <InlineMath tex="C = \tfrac{1}{T} X^\top X" /> is the
            covariance matrix. So we want:
          </p>

          <Equation
            tex="\max_{w}\; w^\top C\, w \qquad \text{subject to}\quad \|w\| = 1"
            number={1}
          />

          <p>
            This is a constrained optimization. Use a Lagrange
            multiplier <InlineMath tex="\lambda" /> for the
            constraint <InlineMath tex="w^\top w = 1" />. The
            Lagrangian is <InlineMath tex="L = w^\top C w - \lambda(w^\top w - 1)" />.
            Set the gradient to zero:
          </p>

          <Equation
            tex="\frac{\partial L}{\partial w} = 2Cw - 2\lambda w = 0 \qquad \Longrightarrow \qquad Cw = \lambda w"
            number={2}
          />

          <p>
            That is an eigenvalue equation. The direction that maximizes
            variance is an eigenvector of the covariance matrix. Which
            one? Multiply both sides by <InlineMath tex="w^\top" />:{" "}
            <InlineMath tex="w^\top C w = \lambda w^\top w = \lambda" />.
            The variance along <InlineMath tex="w" /> equals the
            eigenvalue. To maximize variance, pick the eigenvector with
            the largest eigenvalue.
          </p>

          <p>
            That eigenvector is the first principal component.
          </p>

          <FigureContainer
            width="outset"
            caption="Drag the direction vector around the unit circle. The right panel shows variance as a function of angle. The maximum coincides with the first eigenvector of the covariance matrix."
          >
            <VarianceMaximizationExplorer />
          </FigureContainer>

          <p>
            Now find the second. We want the unit direction of maximum
            variance that is orthogonal to the first. Add the
            constraint <InlineMath tex="w^\top w_1 = 0" /> and repeat.
            The same argument gives another eigenvalue equation, and the
            maximum is the second-largest eigenvalue. Its eigenvector is
            the second principal component. Continue: the{" "}
            <InlineMath tex="k" />-th principal component is the
            eigenvector with the <InlineMath tex="k" />-th largest
            eigenvalue.
            <Sidenote number={1}>
              Each successive component is orthogonal to all previous
              ones, because the eigenvectors of a symmetric matrix are
              orthogonal (the spectral theorem from Post 5). The
              orthogonality constraint does not need to be imposed
              separately. It follows from the spectral theorem.
            </Sidenote>
          </p>

          <h2 id="minimize-error">
            Minimize reconstruction error
          </h2>

          <p>
            Now the second criterion. We want to approximate each
            100-dimensional data vector by its projection onto a{" "}
            <InlineMath tex="k" />-dimensional subspace, and choose the
            subspace that makes the approximation as good as possible.
          </p>

          <p>
            From Post 2, if the subspace is spanned by orthonormal
            vectors <InlineMath tex="w_1, \ldots, w_k" />, the
            projection of a data point <InlineMath tex="x_t" /> is:
          </p>

          <Equation
            tex="\hat{x}_t = \sum_{j=1}^{k} (x_t \cdot w_j)\, w_j"
            number={3}
          />

          <p>
            The reconstruction error for one data point is{" "}
            <InlineMath tex="\|x_t - \hat{x}_t\|^2" />: the squared
            distance between the original and its projection. Average
            over all time bins:
          </p>

          <Equation
            tex="\text{error} = \frac{1}{T} \sum_{t=1}^{T} \|x_t - \hat{x}_t\|^2"
            number={4}
          />

          <p>
            We want to minimize this. Expand the squared
            norm. Since <InlineMath tex="\hat{x}_t" /> is the
            projection onto the subspace
            and <InlineMath tex="x_t - \hat{x}_t" /> is perpendicular to
            it (that was the point of projection, from Post 4),
            Pythagoras gives:
          </p>

          <Equation
            tex="\|x_t\|^2 = \|\hat{x}_t\|^2 + \|x_t - \hat{x}_t\|^2"
            number={5}
          />

          <p>
            The total length of the data point splits into the part
            captured by the projection and the part lost. Average over
            all <InlineMath tex="t" />:
          </p>

          <Equation
            tex="\underbrace{\frac{1}{T}\sum_t \|x_t\|^2}_{\text{total variance}} = \underbrace{\frac{1}{T}\sum_t \|\hat{x}_t\|^2}_{\text{captured variance}} + \underbrace{\frac{1}{T}\sum_t \|x_t - \hat{x}_t\|^2}_{\text{error}}"
            number={6}
          />

          <p>
            The total variance (left side) is fixed. It does not depend
            on the choice of subspace. So minimizing the error (third
            term) is the same as maximizing the captured variance
            (second term). The two criteria are not just similar. They
            are exactly equivalent, connected by Pythagoras.
          </p>

          <h2 id="same-answer">
            Why both give the same answer
          </h2>

          <p>
            Let's verify this. The captured variance
            is <InlineMath tex="\tfrac{1}{T}\sum_t \|\hat{x}_t\|^2" />.
            Expanding <InlineMath tex="\hat{x}_t" /> using equation (3):
          </p>

          <Equation
            tex="\frac{1}{T}\sum_t \|\hat{x}_t\|^2 = \frac{1}{T}\sum_t \sum_{j=1}^{k} (x_t \cdot w_j)^2 = \sum_{j=1}^{k} \underbrace{\frac{1}{T}\sum_t (x_t \cdot w_j)^2}_{w_j^\top C w_j}"
            number={7}
          />

          <p>
            Each term <InlineMath tex="w_j^\top C w_j" /> is the
            variance along direction <InlineMath tex="w_j" />. So the
            total captured variance is the sum of variances along the{" "}
            <InlineMath tex="k" /> subspace directions. To maximize
            this sum, you want each <InlineMath tex="w_j" /> to point
            along a direction of high variance, subject to mutual
            orthogonality. The solution: the top{" "}
            <InlineMath tex="k" /> eigenvectors of <InlineMath tex="C" />.
            The maximum captured variance
            is <InlineMath tex="\lambda_1 + \lambda_2 + \cdots + \lambda_k" />.
          </p>

          <p>
            The reconstruction error is the leftover:{" "}
            <InlineMath tex="\lambda_{k+1} + \lambda_{k+2} + \cdots + \lambda_n" />.
            Maximize the first sum or minimize the second — same
            answer either way.
          </p>

          <FigureContainer
            width="outset"
            caption="Drag the green line to rotate the projection subspace. The captured variance and reconstruction error update in real time. The dashed line shows the optimal direction (the first principal component)."
          >
            <SubspaceProjectionExplorer />
          </FigureContainer>

          <h2 id="pca-via-svd">PCA via the SVD</h2>

          <p>
            The derivation above says: eigendecompose the covariance
            matrix, take the top eigenvectors. That is mathematically
            correct, but it is not how you should compute PCA.
          </p>

          <p>
            From the <Link to="/blog/svd/">SVD post</Link>, the
            centered data matrix has SVD{" "}
            <InlineMath tex="X = U\Sigma V^\top" />, and:
          </p>

          <Equation
            tex="C = \frac{1}{T}\,X^\top X = V\,\frac{\Sigma^2}{T}\,V^\top"
            number={8}
          />

          <p>
            The columns of <InlineMath tex="V" /> are the eigenvectors
            of <InlineMath tex="C" />, i.e., the principal components.
            The eigenvalues
            are <InlineMath tex="\sigma_i^2 / T" />. You never need
            to form <InlineMath tex="C" /> at all. In practice, PCA
            is always computed via the SVD of the data matrix, because
            it is faster and more numerically
            stable.
            <Sidenote number={2}>
              Forming <InlineMath tex="X^\top X" /> squares the
              condition number of the problem. If the ratio of the
              largest to smallest singular value
              is <InlineMath tex="\kappa" />, the ratio of the largest
              to smallest eigenvalue
              of <InlineMath tex="X^\top X" /> is{" "}
              <InlineMath tex="\kappa^2" />. The SVD avoids this
              squaring.
            </Sidenote>
          </p>

          <p>
            The recipe: center the data, compute the (thin) SVD, and
            read off the principal components from the columns
            of <InlineMath tex="V" />. That is PCA in three steps.
          </p>

          <h2 id="scores-loadings">
            Scores, loadings, and reconstruction
          </h2>

          <p>
            PCA produces two objects, and the terminology is often
            confused.
          </p>

          <p>
            The <em>loadings</em> are the principal component
            directions: the columns of <InlineMath tex="V" />. Each
            loading is a unit vector
            in <InlineMath tex="\mathbb{R}^{100}" /> (neuron space).
            It tells you the "recipe" for one component: how much each
            neuron contributes to that direction.
          </p>

          <p>
            The <em>scores</em> are the coordinates of the data in
            the principal component basis. For data
            point <InlineMath tex="x_t" />, the score on
            component <InlineMath tex="j" /> is the dot
            product <InlineMath tex="x_t \cdot v_j" />. The full
            score matrix is <InlineMath tex="Z = XV" />, a
            500-by-100 matrix (or 500-by-<InlineMath tex="k" /> if
            you keep only <InlineMath tex="k" /> components). Each
            row is a time bin. Each column is a component.
          </p>

          <p>
            From the SVD, the scores have a clean
            form: <InlineMath tex="Z = XV = U\Sigma" />. The left
            singular vectors <InlineMath tex="U" />, scaled by the
            singular values, are the PC scores. The structure is
            visible: <InlineMath tex="U" /> gives the temporal
            patterns, <InlineMath tex="\Sigma" /> tells you how
            important each one is, <InlineMath tex="V" /> tells you
            how each neuron contributes.
          </p>

          <p>
            Reconstruction from <InlineMath tex="k" /> components:
          </p>

          <Equation
            tex="\hat{X} = Z_k V_k^\top = U_k \Sigma_k V_k^\top"
            number={9}
          />

          <p>
            This is the rank-<InlineMath tex="k" /> truncated SVD from
            the previous post. The best rank-<InlineMath tex="k" />{" "}
            approximation to the data matrix. PCA and the truncated SVD
            are the same thing, seen from different angles.
          </p>

          <FigureContainer
            width="page"
            caption="The same neural trajectory in two bases. Left: neuron-space axes. Right: principal component axes. The trajectory has not changed; only the coordinates have."
          >
            <NeuralBasisChange />
          </FigureContainer>

          <h2 id="how-many">How many components to keep</h2>

          <p>
            The eigenvalues tell you the variance captured by each
            component. The fraction of total variance explained by the
            first <InlineMath tex="k" /> components is:
          </p>

          <Equation
            tex="\text{explained variance} = \frac{\lambda_1 + \cdots + \lambda_k}{\lambda_1 + \cdots + \lambda_n}"
            number={10}
          />

          <p>
            Plot this as a function of <InlineMath tex="k" /> and you
            get the <em>cumulative explained variance curve</em>. Plot
            the individual eigenvalues and you get the <em>scree
            plot</em>. Both help you choose <InlineMath tex="k" />.
          </p>

          <p>
            Common heuristics: keep enough components to explain 90% or
            95% of the variance. Or look for an "elbow" in the scree
            plot where the eigenvalues drop off sharply. Or use
            cross-validation: hold out some data, project using{" "}
            <InlineMath tex="k" /> components, measure reconstruction
            error on the held-out data, and pick the <InlineMath tex="k" />{" "}
            that minimizes it.
            <Sidenote number={3}>
              The 90% or 95% threshold is a convention, not a theorem.
              For some datasets, 5 components explain 95% of variance
              and the remaining dimensions are noise. For others, the
              variance is spread more evenly and 95% requires 50
              components, which may not feel like dimensionality
              reduction. The right <InlineMath tex="k" /> depends on
              the question, not on a fixed threshold.
            </Sidenote>
          </p>

          <p>
            For neural data, the scree plot often shows a smooth decay
            without an obvious elbow. This happens because neural noise
            is correlated (nearby neurons share noise sources), which
            inflates the variance along many dimensions. Methods like
            factor analysis and GPFA handle this by explicitly modeling
            shared signal variance separately from private
            noise <Citation numbers={[4]} />.
          </p>

          <h2 id="failure-modes">When PCA misleads</h2>

          <p>
            PCA finds directions of maximum variance. That is useful
            when variance corresponds to the structure you care about.
            But it can mislead in several ways.
          </p>

          <p>
            <strong>Forgetting to center.</strong> If you run PCA on
            uncentered data, the first component may simply point toward
            the mean firing rate rather than capturing the most
            variable direction. This is the most common PCA mistake in
            practice. Always subtract the mean of each neuron first.
          </p>

          <p>
            <strong>High variance is not the same as
            importance.</strong> The direction with the most variance
            might be a nuisance: a global gain fluctuation, a slow
            drift across the session, or a motion artifact. PCA does
            not know what is scientifically relevant. It finds what
            moves the most, and what moves the most might not be what
            you care about.
            <Sidenote number={4}>
              This is exactly the limitation that motivates PSID. PCA
              captures variance regardless of behavioral relevance. PSID
              finds the subspace that is maximally predictive of behavior,
              which may have less variance than the top PCA components
              but more scientific relevance.
            </Sidenote>
          </p>

          <p>
            <strong>Nonlinear structure.</strong> PCA finds linear
            subspaces. If the data lie on a curved surface (a nonlinear
            manifold), PCA will approximate it with a flat sheet. The
            approximation may be poor, and the number of components
            needed may be much larger than the intrinsic dimensionality
            of the manifold. Nonlinear methods like UMAP, t-SNE, and
            autoencoders address this, at the cost of losing PCA's
            clean guarantees.
          </p>

          <p>
            <strong>Sensitivity to scaling.</strong> If one neuron fires
            at rates in the hundreds and another fires at rates in the
            single digits, PCA will be dominated by the high-rate
            neuron. This is a consequence of the <InlineMath tex="L^2" />{" "}
            norm from Post 1. If the variables have different units or
            very different scales, you may need to standardize (divide
            each neuron's activity by its standard deviation) before
            running PCA. This changes the geometry, and the PCA results
            will differ.
          </p>

          <p>
            <strong>Rotational indeterminacy within a
            subspace.</strong> PCA gives you a specific set of
            orthogonal axes within the best subspace. But any rotation
            of those axes within the subspace captures the same total
            variance. The individual components are not unique. They
            depend on the ordering (by decreasing variance) and the
            orthogonality constraint. Methods like varimax rotation and
            ICA address this by imposing additional criteria.
          </p>

          <FigureContainer
            width="outset"
            caption="Toggle between failure modes: uncentered data, high-variance noise, and slow drift. Watch PC1 shift to follow the nuisance instead of the structure."
          >
            <PCAFailureModesExplorer />
          </FigureContainer>

          <FigureContainer
            width="outset"
            caption={
              <>
                Click <em>Change Basis</em> to rotate from neuron-space
                to PC-space. The low-dimensional structure becomes visible.
              </>
            }
          >
            <PCAReveal />
          </FigureContainer>

          <h2 id="what-comes-next">What comes next</h2>

          <p>
            PCA finds the best subspace for representing a single
            dataset. But PCA's decoder — the least-squares readout from
            PC scores back to neural activity — has a problem: the
            best-fitting decoder is usually the worst one to use on new
            data. It overfits. The coefficients blow up whenever two
            dimensions are correlated, which in neural data they almost
            always are.
          </p>

          <p>
            The fix is regularization. Ridge regression, the lasso, and
            their relatives add a penalty on the size of the
            coefficients. The result is a decoder that fits slightly
            worse in-sample but generalizes far better out-of-sample.
            The geometry of regularization — why it shrinks some
            directions and not others, how the penalty interacts with
            the covariance structure of the data — is the subject of
            the <Link to="/blog/least-squares/">next post</Link>.
          </p>

          <h2 id="implementation">Implementation</h2>

          <p>
            PCA via the SVD is a few lines of NumPy. Center the data,
            compute the thin SVD, read off the principal components
            from the columns of <InlineMath tex="V" />, and the scores
            from <InlineMath tex="U\Sigma" />.
          </p>

          <CodeBlock language="python" code={`import numpy as np

def pca(X, k=None):
    """
    PCA via the thin SVD of the centered data matrix.

    Parameters
    ----------
    X : array, shape (n_time, n_neurons)
        Raw data matrix (rows = observations).
    k : int or None
        Number of components. If None, keep all.

    Returns
    -------
    scores : array, shape (n_time, k)
        PC scores (projections onto principal components).
    loadings : array, shape (n_neurons, k)
        PC loadings (principal component directions).
    explained : array, shape (k,)
        Fraction of variance explained by each component.
    """
    # Center
    X_centered = X - X.mean(axis=0)

    # Thin SVD
    U, s, Vt = np.linalg.svd(X_centered, full_matrices=False)

    # Explained variance
    var_explained = s**2 / np.sum(s**2)

    # Truncate
    if k is None:
        k = len(s)
    U_k = U[:, :k]
    s_k = s[:k]
    Vt_k = Vt[:k, :]

    scores = U_k * s_k[np.newaxis, :]   # n_time x k
    loadings = Vt_k.T                    # n_neurons x k

    return scores, loadings, var_explained[:k]


# ── Example: PCA on simulated neural data ──
rng = np.random.default_rng(42)

# 500 time bins, 100 neurons, ~5 latent dimensions
n_time, n_neurons, true_rank = 500, 100, 5
latent = rng.standard_normal((n_time, true_rank))
weights = rng.standard_normal((true_rank, n_neurons))
noise = 0.3 * rng.standard_normal((n_time, n_neurons))
X = latent @ weights + noise

scores, loadings, explained = pca(X, k=10)

print("Explained variance (first 10 PCs):")
print(explained.round(3))
print(f"Cumulative: {explained.cumsum().round(3)}")
# First 5 PCs capture ~95% — matches the true rank

# Reconstruct from k components
X_approx = scores @ loadings.T + X.mean(axis=0)
error = np.linalg.norm(X - X_approx) / np.linalg.norm(X - X.mean(axis=0))
print(f"Relative reconstruction error (k=10): {error:.3f}")`} />

          <h2 id="references">References</h2>
          <ol className="blog-references">
            <li id="ref-1">
              Strang, G. <em>Introduction to Linear Algebra</em>, 6th ed.
              Wellesley-Cambridge Press, 2023.
            </li>
            <li id="ref-2">
              3Blue1Brown. "Essence of Linear Algebra" video series, 2016.
            </li>
            <li id="ref-3">
              Churchland, M. M., Cunningham, J. P., Kaufman, M. T., et al.
              "Neural population dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51-56, 2012.
            </li>
            <li id="ref-4">
              Cunningham, J. P. and Yu, B. M. "Dimensionality reduction
              for large-scale neural recordings,"{" "}
              <em>Nature Neuroscience</em>, vol. 17, pp. 1500-1509, 2014.
            </li>
            <li id="ref-5">
              Axler, S. <em>Linear Algebra Done Right</em>, 4th ed.
              Springer, 2024.
            </li>
            <li id="ref-6">
              Strang, G. "The fundamental theorem of linear algebra,"{" "}
              <em>The American Mathematical Monthly</em>, vol. 100,
              no. 9, pp. 848-855, 1993.
            </li>
            <li id="ref-7">
              Safaie, M., Chang, J. C., Park, J., et al.
              "Preserved neural dynamics across animals performing
              similar behaviour,"{" "}
              <em>Nature</em>, vol. 623, pp. 765-771, 2023.
            </li>
            <li id="ref-8">
              Jolliffe, I. T. <em>Principal Component Analysis</em>,
              2nd ed. Springer, 2002.
            </li>
          </ol>
        </div>

        <SeriesNav part={7} />

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
    Principal component analysis &mdash; Felix Taschbach
  </title>
)

export default PCAPost
