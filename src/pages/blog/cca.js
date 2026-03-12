import React, { useRef, useState, useEffect } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
import Sidenote from "../../components/Sidenote"
import Citation from "../../components/Citation"
import { InlineMath, BlockMath, Equation } from "../../components/Math"
import FigureContainer from "../../components/blog/FigureContainer"
import CCATeaser from "../../components/blog/CCATeaser"
import CovarianceExplorer from "../../components/blog/CovarianceExplorer"
import ProjectionExplorer from "../../components/blog/ProjectionExplorer"
import EigenSolution from "../../components/blog/EigenSolution"
import CodeBlock from "../../components/blog/CodeBlock"
import TableOfContents from "../../components/blog/TableOfContents"
import DimensionalityExplorer from "../../components/blog/DimensionalityExplorer"
import PermutationTest from "../../components/blog/PermutationTest"
import "../../components/blog/prism-theme.css"
import "./blog-post.css"

const TOC_ITEMS = [
  { id: "introduction", label: "Introduction" },
  { id: "setup", label: "Setup and notation" },
  { id: "objective", label: "The objective" },
  { id: "solving", label: "Solving the objective" },
  { id: "eigenvalue", label: "The eigenvalue problem" },
  { id: "geometric", label: "Geometric interpretation" },
  { id: "try-it", label: "Try it yourself" },
  { id: "misleads", label: "When CCA misleads" },
  { id: "implementation", label: "Implementation" },
  { id: "limitations", label: "Assumptions and limitations" },
  { id: "neighbors", label: "CCA and its neighbors" },
  { id: "references", label: "References" },
]

const CCAPost = () => {
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
            Canonical Correlation Analysis
          </h1>
          <p className="blog-post__subtitle">
            Finding shared structure between two high-dimensional datasets, derived from scratch with interactive figures.
          </p>
          <div className="blog-post__byline">
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Published</span>
              <span className="blog-post__byline-value">March 2026</span>
            </div>
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Reading time</span>
              <span className="blog-post__byline-value">{readingTime ? `${readingTime} min` : ""}</span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>
          <FigureContainer width="outset" caption="CCA finds directions in two datasets that are maximally correlated. Click Regenerate to draw new data.">
            <CCATeaser />
          </FigureContainer>

          <h2 id="introduction">Introduction</h2>

          <p>
            Throughout my PhD I have been developing methods for aligning neural
            population activity across subjects. Different animals performing the
            same task give you different neurons, different numbers of neurons, and
            different relationships between those neurons. But if the task is the
            same, there should be some shared structure in the population dynamics,
            and finding it requires a way to compare high-dimensional recordings
            that don't share a common coordinate system. Canonical correlation
            analysis, or CCA <Citation numbers={1} />, is one of the
            earliest and cleanest solutions to this problem, and the ideas show
            up in nearly everything that came after.
            <Sidenote number={1}>
              CCA was introduced by Harold Hotelling in
              1936 <Citation numbers={1} />. It generalizes
              the familiar Pearson correlation between two scalar variables to the
              setting where each "variable" is an entire multidimensional dataset.
              For a neuroscience-oriented review,
              see Zhuang et al. <Citation numbers={2} />.
            </Sidenote>
          </p>

          <p>
            Here is a concrete example. You've recorded neural populations from
            two monkeys performing the same reaching task. Each gives you a matrix
            of activity, dozens of neurons over thousands of timepoints. You could
            correlate individual neurons across recordings, one pair at a time, but
            neural populations encode information in patterns of activity, and no
            single neuron tells the full story. What you really want is to
            find <em>weighted combinations</em> of neurons in each recording that
            move together. CCA does this: it finds the linear projections of each
            dataset that are maximally correlated with each other. Safaie, Chang
            et al. <Citation numbers={7} /> used CCA to answer this question,
            aligning low-dimensional neural trajectories across monkeys and across
            mice to show that the underlying dynamics are preserved.
          </p>

          <p>
            The idea generalizes well beyond neuroscience (gene expression paired
            with protein levels, audio paired with video features), but the
            cross-animal alignment setting is where CCA becomes most intuitive to
            me, and it is the lens I'll use throughout. This is the first in a
            series of posts working through my PhD notes. CCA felt like the right
            place to start: it is simple enough to derive from scratch in a single
            sitting, but the ideas connect directly to the harder problems I'll
            cover later.
          </p>

          <h2 id="setup">Setup and notation</h2>

          <p>
            Stack your observations into two
            matrices: <InlineMath tex="X_a \in \mathbb{R}^{n \times p}" /> holds{" "}
            <InlineMath tex="n" /> observations of <InlineMath tex="p" /> variables
            from the first dataset, and{" "}
            <InlineMath tex="X_b \in \mathbb{R}^{n \times q}" /> holds the same{" "}
            <InlineMath tex="n" /> observations of <InlineMath tex="q" /> variables
            from the second. The rows are paired: row <InlineMath tex="i" /> in both
            matrices corresponds to the same trial, the same timepoint, or
            whatever links your two measurements together.
            <Sidenote number={2}>
              We assume the data are centered (column means subtracted). This
              is standard practice and ensures the covariance matrices are
              computed correctly. Most implementations handle this for you.
            </Sidenote>
          </p>

          <p>
            CCA looks for weight
            vectors <InlineMath tex="w_a \in \mathbb{R}^p" /> and{" "}
            <InlineMath tex="w_b \in \mathbb{R}^q" /> that define one-dimensional
            projections of each dataset, <InlineMath tex="X_a w_a" /> and{" "}
            <InlineMath tex="X_b w_b" />, such that these projections are as
            correlated as possible. Think of each weight vector as a "recipe" for
            combining variables: how much of neuron 1, how much of neuron 2, and so on.
          </p>

          <p>
            Three matrices govern the problem. The within-dataset covariance
            matrices <InlineMath tex="\Sigma_{aa} = \tfrac{1}{n} X_a^\top X_a" />{" "}
            and <InlineMath tex="\Sigma_{bb} = \tfrac{1}{n} X_b^\top X_b" />{" "}
            describe the variance structure inside each dataset, that is, how the
            variables in each group relate to each other. The cross-covariance
            matrix <InlineMath tex="\Sigma_{ab} = \tfrac{1}{n} X_a^\top X_b" />{" "}
            captures how variables in the first dataset co-vary with variables in
            the second, and this is the matrix that CCA ultimately exploits. Explore
            all three below.
          </p>

          <FigureContainer width="outset" caption="The within-dataset covariance matrices (Σ_aa, Σ_bb) and the cross-covariance matrix (Σ_ab). Hover a cell to see the corresponding variable pair in the scatter plot.">
            <CovarianceExplorer />
          </FigureContainer>

          <h2 id="objective">The objective</h2>

          <p>
            We want our projections to be maximally correlated. Writing this out,
            the correlation between <InlineMath tex="X_a w_a" /> and{" "}
            <InlineMath tex="X_b w_b" /> is:
          </p>

          <Equation
            tex="\rho = \operatorname{corr}(X_a w_a,\; X_b w_b) = \frac{w_a^\top \Sigma_{ab}\, w_b}{\sqrt{w_a^\top \Sigma_{aa}\, w_a}\;\sqrt{w_b^\top \Sigma_{bb}\, w_b}}"
            number={1}
          />

          <p>
            Notice something about this formula: if you double{" "}
            <InlineMath tex="w_a" />, the numerator doubles, but so does the
            denominator. Correlation is insensitive to scale; it only depends on
            direction. This means the optimization problem as stated has infinitely
            many equivalent solutions (any scalar multiple of an optimum is also an
            optimum). To pin things down, we fix the variance of each projection to
            one:
            <Sidenote number={3}>
              This is the same trick used in PCA, but with a twist. In PCA you
              constrain the weight vector to unit norm. Here we constrain the{" "}
              <em>projected</em> variance, which accounts for the covariance
              structure of the data. When the data are correlated, a unit-norm
              weight vector can still produce a projection with wildly different
              variance depending on its direction, so the PCA-style constraint
              would not standardize the denominator.
            </Sidenote>
          </p>

          <Equation
            tex="w_a^\top \Sigma_{aa}\, w_a = 1, \qquad w_b^\top \Sigma_{bb}\, w_b = 1"
            number={2}
          />

          <p>
            With unit-variance projections, the denominator in equation (1) becomes
            one, and maximizing the correlation simplifies to maximizing just the
            numerator:
          </p>

          <Equation
            tex="\max_{w_a,\, w_b}\; w_a^\top \Sigma_{ab}\, w_b \qquad \text{s.t.}\quad w_a^\top \Sigma_{aa}\, w_a = 1,\;\; w_b^\top \Sigma_{bb}\, w_b = 1"
            number={3}
          />

          <h2 id="solving">Solving the objective</h2>

          <p>
            This is a constrained optimization problem: maximize an objective subject
            to two equality constraints. The standard approach is to introduce Lagrange
            multipliers, one for each constraint, and look for stationary points of
            the combined expression. The Lagrangian is:
            <Sidenote number={4}>
              The factor of <InlineMath tex="\tfrac{1}{2}" /> in front of each
              multiplier is a convenience that simplifies the derivatives without
              changing the solution. This derivation follows
              Gundersen <Citation numbers={4} /> and
              Borga <Citation numbers={6} />.
            </Sidenote>
          </p>

          <Equation
            tex="\mathcal{L} = w_a^\top \Sigma_{ab}\, w_b \;-\; \frac{\lambda_1}{2}\!\left(w_a^\top \Sigma_{aa}\, w_a - 1\right) \;-\; \frac{\lambda_2}{2}\!\left(w_b^\top \Sigma_{bb}\, w_b - 1\right)"
            number={4}
          />

          <p>
            At a maximum, the gradient of the Lagrangian with respect to each
            weight vector must vanish. Differentiating and setting the results to
            zero gives us two conditions, one for each dataset:
          </p>

          <Equation
            tex="\frac{\partial \mathcal{L}}{\partial w_a} = \Sigma_{ab}\, w_b - \lambda_1\, \Sigma_{aa}\, w_a = 0"
            number={5}
          />

          <Equation
            tex="\frac{\partial \mathcal{L}}{\partial w_b} = \Sigma_{ba}\, w_a - \lambda_2\, \Sigma_{bb}\, w_b = 0"
            number={6}
          />

          <p>
            where <InlineMath tex="\Sigma_{ba} = \Sigma_{ab}^\top" />. Each
            equation says the same thing: the gradient from the cross-covariance
            (pulling toward the other dataset's structure) is balanced by the
            gradient from the within-dataset covariance (enforcing the
            constraint). To see what the multipliers are,
            left-multiply equation (5) by{" "}
            <InlineMath tex="w_a^\top" /> and equation (6) by{" "}
            <InlineMath tex="w_b^\top" />:
          </p>

          <BlockMath tex="w_a^\top \Sigma_{ab}\, w_b = \lambda_1\, w_a^\top \Sigma_{aa}\, w_a = \lambda_1" />
          <BlockMath tex="w_b^\top \Sigma_{ba}\, w_a = \lambda_2\, w_b^\top \Sigma_{bb}\, w_b = \lambda_2" />

          <p>
            The left-hand sides of these two expressions are scalars, and they are
            transposes of each other, so they must be equal. This forces{" "}
            <InlineMath tex="\lambda_1 = \lambda_2" />. And since the constraints
            set each projected variance to one, both multipliers equal the objective
            value itself: <InlineMath tex="\lambda_1 = \lambda_2 = \rho" />, the
            canonical correlation.
            <Sidenote number={5}>
              The Lagrange multipliers, introduced as bookkeeping devices to enforce
              the constraints, have a direct interpretation: they equal the
              canonical correlation, the quantity we are maximizing.
            </Sidenote>
          </p>

          <h2 id="eigenvalue">The eigenvalue problem</h2>

          <p>
            Equations (5) and (6) couple{" "}
            <InlineMath tex="w_a" /> and <InlineMath tex="w_b" /> through the
            covariance matrices. We can eliminate one unknown by solving
            equation (6) for <InlineMath tex="w_b" />:
          </p>

          <Equation
            tex="w_b = \frac{1}{\rho}\, \Sigma_{bb}^{-1}\, \Sigma_{ba}\, w_a"
            number={7}
          />

          <p>
            Substituting this into equation (5) eliminates{" "}
            <InlineMath tex="w_b" /> entirely:
          </p>

          <BlockMath tex="\Sigma_{ab}\!\left(\frac{1}{\rho}\, \Sigma_{bb}^{-1}\, \Sigma_{ba}\, w_a\right) = \rho\, \Sigma_{aa}\, w_a" />

          <p>
            Rearranging and left-multiplying by{" "}
            <InlineMath tex="\Sigma_{aa}^{-1}" /> gives an eigenvalue equation
            in <InlineMath tex="w_a" /> alone:
          </p>

          <Equation
            tex="\Sigma_{aa}^{-1}\, \Sigma_{ab}\, \Sigma_{bb}^{-1}\, \Sigma_{ba}\, w_a = \rho^2\, w_a"
            number={8}
          />

          <p>
            This is a standard eigenvalue problem. The
            matrix <InlineMath tex="\Sigma_{aa}^{-1} \Sigma_{ab} \Sigma_{bb}^{-1} \Sigma_{ba}" />{" "}
            encodes the entire relationship between the two datasets, filtered
            through their individual covariance structures. Its eigenvalues
            are <InlineMath tex="\rho^2" />, so the canonical correlations are the
            square roots: <InlineMath tex="\rho_1 \geq \rho_2 \geq \cdots" />. The
            corresponding eigenvectors are the canonical weight
            vectors, the weight "recipes" from the setup.
            <Sidenote number={6}>
              The number of nonzero canonical correlations is at
              most <InlineMath tex="\min(p, q)" />, the smaller of the two datasets'
              dimensionalities. You can't find more shared directions than the
              lower-dimensional space has room for.
            </Sidenote>
          </p>

          <h2 id="geometric">Geometric interpretation</h2>

          <p>
            The eigenvalue equation solves the problem, but it does not explain
            much about what CCA is doing geometrically. There is another way to
            derive the same result that makes the geometry explicit and also leads to
            a better algorithm.
          </p>

          <p>
            Start with a question: why is CCA harder than ordinary correlation?
            Because correlation between scalar variables is just the
            cosine of an angle. But our data live in spaces with their own internal
            structure. The variables within each dataset may be correlated with each
            other, stretched along some directions and compressed along others. This
            internal structure distorts the geometry, making it hard to compare
            directions across the two spaces.
            <Sidenote number={7}>
              This geometric view connects CCA to the Procrustes problem
              and to methods for aligning representational spaces in neuroscience
              and machine learning.
            </Sidenote>
          </p>

          <p>
            The fix is to remove that internal structure first. If we <em>whiten</em>{" "}
            each dataset (transform it so that its covariance becomes the identity
            matrix), then all directions within each space become equivalent. Variance
            is the same in every direction, and within-dataset correlations vanish.
            In these whitened coordinates, finding the most correlated directions
            between the two datasets reduces to the
            singular value decomposition (SVD) of the whitened cross-covariance
            matrix <InlineMath tex="\Sigma_{aa}^{-1/2}\, \Sigma_{ab}\, \Sigma_{bb}^{-1/2}" />.
            The singular values of this matrix are the canonical correlations,
            and the left and right singular vectors give the canonical directions
            in whitened space.
            <Sidenote number={8}>
              The SVD approach is also preferred in practice because the eigenvalue
              formulation requires inverting covariance matrices and multiplying them
              together, which amplifies numerical errors when the matrices are
              ill-conditioned <Citation numbers={3} />.
            </Sidenote>
          </p>

          <p>
            The figure below shows this three-step pipeline. Start with the raw
            data and its covariance ellipse. Whiten each dataset to make the ellipse
            circular. Then read off the canonical directions from the SVD of the
            whitened cross-covariance. Each subsequent canonical pair captures the
            next strongest relationship, orthogonal to all the ones before it.
          </p>

          <FigureContainer width="outset" caption="The whitening-then-SVD pipeline: (1) raw data with its covariance ellipse, (2) whitened data with unit covariance, (3) canonical directions from the SVD of the whitened cross-covariance.">
            <EigenSolution />
          </FigureContainer>

          <h2 id="try-it">Try it yourself</h2>

          <p>
            The figure below lets you play the role of the optimizer. Drag the
            direction arrows on each scatter plot to choose your own projection
            directions, and watch how the correlation between the projected values
            changes in real time. The CCA solution is shown as dashed lines. Try
            aligning with the principal axis of one dataset and see what happens.
            The CCA solution often points in a direction that looks wrong for one
            dataset considered alone, because it is jointly optimizing over both.
            <Sidenote number={9}>
              This is harder than it looks. You're optimizing over two directions
              simultaneously: a good direction for one dataset might be terrible once
              you pair it with the wrong direction in the other. This is why we need
              the machinery above rather than guessing.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="Drag the direction arrows on each scatter plot to change the projection direction. The right panel shows the projected values and their correlation. The dashed lines show the CCA-optimal directions.">
            <ProjectionExplorer />
          </FigureContainer>

          <h2 id="misleads">When CCA misleads</h2>

          <p>
            CCA always finds something. It optimizes over all possible projection
            directions in both datasets, and in a high-dimensional space, there
            will always be some pair of directions with nonzero correlation, even
            when the two datasets are completely independent. When the number of
            variables approaches the number of observations, this problem becomes
            severe: the canonical correlations can be close to one even in pure
            noise.
            <Sidenote number={10}>
              The distribution of canonical correlations between independent
              Gaussian matrices is well-studied. As{" "}
              <InlineMath tex="\min(p,q)/n \to 1" />, the largest canonical
              correlation converges to
              one <Citation numbers={8} />.
            </Sidenote>
          </p>

          <p>
            The figure below generates independent data (no shared structure)
            and runs CCA. Start by keeping <InlineMath tex="p" /> and{" "}
            <InlineMath tex="q" /> small relative to <InlineMath tex="n" />.
            Then drag them up. Watch how the canonical correlations inflate even
            though the data have nothing in common.
          </p>

          <FigureContainer width="outset" caption="CCA on independent Gaussian data. Drag p and q toward n to see spurious canonical correlations appear.">
            <DimensionalityExplorer />
          </FigureContainer>

          <p>
            This is not a theoretical curiosity. In neural data, 200 neurons
            recorded over 50 trials puts you deep in the danger zone. How do
            you know which canonical correlations are real?
          </p>

          <p>
            One approach is a permutation test. Shuffle the row pairing between
            the two datasets to destroy any true relationship, run CCA on the
            shuffled data, and record the first canonical correlation. Repeat
            many times to build a null distribution. If a real canonical
            correlation falls above the 95th percentile of this null, it is
            unlikely to have arisen from noise alone.
            <Sidenote number={11}>
              Parametric alternatives exist (Bartlett's test uses a chi-squared
              approximation), but the permutation approach is more general: it
              makes no distributional assumptions and works for any sample size.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="Permutation test for CCA significance. The histogram shows the null distribution of the first canonical correlation from shuffled data. Vertical lines mark the real canonical correlations.">
            <PermutationTest />
          </FigureContainer>

          <p>
            Beyond permutation testing, you can address the problem
            structurally: regularization (shrinkage covariance estimates that
            pull the eigenvalues away from zero) or reduced-rank approaches
            that only estimate the top few canonical directions.
          </p>

          <h2 id="implementation">Implementation</h2>

          <p>
            The geometric perspective translates directly into code: center,
            whiten, SVD. Here is an implementation:
            <Sidenote number={12}>
              This implementation assumes <InlineMath tex="n > \max(p, q)" /> so that
              the covariance matrices are full rank. When you have more variables than
              observations, use regularized covariance estimates (e.g.,
              shrinkage) <Citation numbers={3} />. For a practical overview of
              dimensionality reduction methods for neural data,
              see Mineault <Citation numbers={5} />.
            </Sidenote>
          </p>

          <CodeBlock code={`import numpy as np

def cca(X, Y):
    """Canonical Correlation Analysis via whitened SVD.

    Parameters
    ----------
    X : array, shape (n, p)
    Y : array, shape (n, q)

    Returns
    -------
    corrs : canonical correlations
    W_x : canonical weights for X
    W_y : canonical weights for Y
    """
    n = X.shape[0]

    # Center
    X = X - X.mean(axis=0)
    Y = Y - Y.mean(axis=0)

    # Covariance matrices (1/n, not 1/(n-1); either works, the choice doesn't affect the result)
    Sxx = X.T @ X / n
    Syy = Y.T @ Y / n
    Sxy = X.T @ Y / n

    # Whiten
    Ux, sx, _ = np.linalg.svd(Sxx)
    Uy, sy, _ = np.linalg.svd(Syy)
    Sxx_inv_half = Ux @ np.diag(1 / np.sqrt(sx)) @ Ux.T
    Syy_inv_half = Uy @ np.diag(1 / np.sqrt(sy)) @ Uy.T

    # SVD of whitened cross-covariance
    M = Sxx_inv_half @ Sxy @ Syy_inv_half
    U, s, Vt = np.linalg.svd(M, full_matrices=False)

    W_x = Sxx_inv_half @ U
    W_y = Syy_inv_half @ Vt.T

    return s, W_x, W_y`} />

          <p>
            The singular values of <InlineMath tex="M" /> are the canonical
            correlations, and the left and right singular vectors (after un-whitening)
            give the canonical weight vectors for each dataset.
          </p>

          <h2 id="limitations">Assumptions and limitations</h2>

          <h3>What CCA gives you</h3>

          <p>
            For each canonical pair, CCA returns a weight vector in each
            dataset and a correlation measuring how well the two projections
            track each other. These come in a ranked
            sequence, <InlineMath tex="\rho_1 \geq \rho_2 \geq \cdots" />,
            measuring how strongly the two datasets co-vary along each
            successive direction. The whitening-then-SVD pipeline separates
            the within-dataset structure from the between-dataset relationship
            cleanly: all the shared linear information lives in the SVD of the
            whitened cross-covariance.
          </p>

          <h3>Assumptions</h3>

          <p>
            <strong>Paired observations.</strong> Both datasets must have the
            same number of rows, and row <InlineMath tex="i" /> in one must
            correspond to row <InlineMath tex="i" /> in the other. CCA cannot
            handle unpaired or differently-sized datasets.
          </p>

          <p>
            <strong>Linearity.</strong> CCA finds linear projections. If the
            shared structure between your datasets is nonlinear, CCA will
            miss it entirely or capture only its linear component.
          </p>

          <p>
            <strong>More observations than variables.</strong> The basic method
            requires <InlineMath tex="n > \max(p, q)" /> so the covariance
            matrices are invertible. When this fails, you need regularization
            or dimensionality reduction as a preprocessing step.
          </p>

          <p>
            <strong>Sensitivity to outliers.</strong> Both the covariance
            estimates and the linear projections are affected by outliers, as
            with any method built on second-order statistics.
          </p>

          <h3>Limitations</h3>

          <p>
            CCA captures only linear shared structure. Kernel
            CCA and deep CCA <Citation numbers={10} /> extend the idea to
            nonlinear mappings, at the cost of interpretability and additional
            hyperparameters.
          </p>

          <p>
            CCA finds the shared part but does not model what is unique to each
            dataset. Probabilistic CCA <Citation numbers={9} /> gives a
            generative model where both datasets are generated from a shared
            latent variable plus independent noise, but the "private" component
            is just isotropic Gaussian noise, not a structured private latent
            space.
          </p>

          <p>
            Canonical directions can be hard to interpret in high dimensions.
            A weight vector with 200 entries does not point to a single
            neuron or a single feature.
          </p>

          <p>
            These limitations point directly to the methods I will cover in
            future posts: nonlinear extensions, probabilistic formulations, and
            approaches that relax the pairing requirement. CCA is the
            foundation, and knowing where it breaks helps you know when to
            reach for something stronger.
          </p>

          <h2 id="neighbors">CCA and its neighbors</h2>

          <p>
            The same ingredients (whitening, SVD, cross-covariance) recombine to
            give different methods depending on what you optimize and how you
            constrain the solution. The table below shows how CCA relates to
            three methods you are likely to encounter alongside it.
          </p>

          <div className="blog-comparison-table-wrapper">
            <table className="blog-comparison-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Objective</th>
                  <th>Constraint</th>
                  <th>Relationship to CCA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>PCA</td>
                  <td>Variance</td>
                  <td>Unit norm weights</td>
                  <td>Single-dataset analogue: SVD of one covariance instead of the cross-covariance between two</td>
                </tr>
                <tr>
                  <td>CCA</td>
                  <td>Correlation</td>
                  <td>Unit projected variance</td>
                  <td>(this post)</td>
                </tr>
                <tr>
                  <td>PLS</td>
                  <td>Covariance</td>
                  <td>Unit norm weights</td>
                  <td>No whitening, so high-variance directions dominate</td>
                </tr>
                <tr>
                  <td>RRR</td>
                  <td>Prediction error</td>
                  <td>Rank constraint</td>
                  <td>Asymmetric: predicts Y from X</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            The choice between correlation (CCA), covariance (PLS), and
            prediction (RRR) depends on what you care about. CCA gives you
            paired linear directions with temporal correspondence, which is
            exactly what cross-animal alignment needs. The next post will
            address what happens when you want to relax one or more of those
            constraints: nonlinear relationships, multiple datasets
            simultaneously, or the absence of trial-matched observations.
          </p>

          <h2 id="references">References</h2>

          <ol className="blog-references">
            <li id="ref-1">
              H. Hotelling, "Relations between two sets of variates,"{" "}
              <em>Biometrika</em>, vol. 28, no. 3/4, pp. 321–377, 1936.
            </li>
            <li id="ref-2">
              X. Zhuang, Z. Yang, and D. Cordes, "A technical review of canonical correlation analysis for neuroscience applications,"{" "}
              <em>Human Brain Mapping</em>, vol. 41, no. 13, pp. 3807–3833, 2020.
            </li>
            <li id="ref-3">
              D. R. Hardoon, S. Szedmak, and J. Shawe-Taylor, "Canonical correlation analysis: An overview with application to learning methods,"{" "}
              <em>Neural Computation</em>, vol. 16, no. 12, pp. 2639–2664, 2004.
            </li>
            <li id="ref-4">
              G. Gundersen,{" "}
              <a href="https://gregorygundersen.com/blog/2018/07/17/cca/">
                "Canonical Correlation Analysis"
              </a>, 2018.
            </li>
            <li id="ref-5">
              P. Mineault,{" "}
              <a href="https://xcorr.net/2021/07/26/dimensionality-reduction-in-neural-data-analysis/">
                "Dimensionality reduction in neural data analysis"
              </a>, 2021.
            </li>
            <li id="ref-6">
              M. Borga,{" "}
              <a href="https://liu.diva-portal.org/smash/get/diva2:304746/FULLTEXT01.pdf">
                "Canonical correlation: a tutorial"
              </a>, 2001.
            </li>
            <li id="ref-7">
              M. Safaie, J. C. Chang, et al., "Preserved neural dynamics across animals performing similar behaviour,"{" "}
              <em>Nature</em>, vol. 623, pp. 765–771, 2023.
            </li>
            <li id="ref-8">
              K. W. Wachter, "The limiting empirical measure of multiple discriminant ratios,"{" "}
              <em>Annals of Statistics</em>, vol. 8, no. 5, pp. 937–957, 1980.
            </li>
            <li id="ref-9">
              F. R. Bach and M. I. Jordan, "A probabilistic interpretation of canonical correlation analysis,"{" "}
              Technical Report 688, Dept. of Statistics, UC Berkeley, 2005.
            </li>
            <li id="ref-10">
              G. Andrew, R. Arora, J. Bilmes, and K. Livescu, "Deep canonical correlation analysis,"{" "}
              <em>Proceedings of the 30th International Conference on Machine Learning (ICML)</em>, 2013.
            </li>
          </ol>
        </div>

        <div className="blog-post__footer-sep"></div>
        <div className="blog-post__back">
          <Link to="/" className="blog-post__back-link">
            ← Back to home
          </Link>
        </div>
      </article>
    </Layout>
  )
}

export const Head = () => (
  <title>Canonical Correlation Analysis — Felix Taschbach</title>
)

export default CCAPost
