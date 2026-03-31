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
import ProcrustesExplorer from "../../components/blog/ProcrustesExplorer"
import FrobeniusNormExplorer from "../../components/blog/FrobeniusNormExplorer"
import HyperalignmentExplorer from "../../components/blog/HyperalignmentExplorer"
import SRMFactorizationExplorer from "../../components/blog/SRMFactorizationExplorer"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "the-alignment-problem", label: "The alignment problem" },
  { id: "frobenius", label: "Measuring misalignment" },
  { id: "orthogonal-procrustes", label: "The orthogonal Procrustes problem" },
  { id: "why-orthogonal", label: "Why restrict to rotations?" },
  { id: "pairwise-to-group", label: "From pairwise to group alignment" },
  { id: "hyperalignment", label: "Hyperalignment" },
  { id: "srm", label: "The shared response model" },
  { id: "relation-to-cca", label: "What comes next" },
  { id: "implementation", label: "Implementation" },
  { id: "references", label: "References" },
]

const ProcrustesAlignmentPost = () => {
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
            Procrustes and hyperalignment
          </h1>
          <p className="blog-post__subtitle">
            Aligning neural representations across subjects.
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
                Linear Algebra for Neural Data, Part 10
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          <h2 id="the-alignment-problem">The alignment problem</h2>

          <p>
            You record from motor cortex in two monkeys performing the
            same reaching task. Each monkey has its own electrode array,
            its own set of neurons, its own coordinate system. Monkey A
            gives you a 500-by-96 data matrix. Monkey B gives you a
            500-by-112 data matrix. The 500 rows are matched: row{" "}
            <InlineMath tex="t" /> in both matrices corresponds to the
            same time point during the same reach condition.
          </p>

          <p>
            You run PCA on each monkey separately and keep 10 components.
            Now you have two 500-by-10 matrices of PC
            scores: <InlineMath tex="X" /> for monkey A and{" "}
            <InlineMath tex="Y" /> for monkey B. Each matrix describes
            the same set of reaches, but in a different coordinate system.
            If the two populations encode movement similarly, there
            should be a way to rotate one coordinate system to align
            with the other.
          </p>

          <p>
            But which rotation? The PC axes for monkey A were chosen to
            capture variance in monkey A's data. Monkey B's axes capture
            variance in monkey B's data. There is no reason the first
            PC of one monkey should correspond to the first PC of
            another. The axes might be permuted, flipped, or rotated
            by some arbitrary angle.
          </p>

          <p>
            The question is: find the rotation that makes the two
            descriptions match as closely as possible. This is the
            Procrustes
            problem <Citation numbers={[1]} />.
            <Sidenote number={1}>
              The name comes from Greek mythology. Procrustes was an
              innkeeper who adjusted his guests to fit his bed — by
              stretching them or cutting off their legs. The mathematical
              Procrustes problem is more civilized: it adjusts one
              dataset to fit another, but only by rotations and
              reflections, not by stretching or cutting.
              Schönemann <Citation numbers={[1]} /> gave the SVD-based
              solution in 1966.
            </Sidenote>
          </p>

          <h2 id="frobenius">Measuring misalignment</h2>

          <p>
            Before we can find the best rotation, we need a way to
            measure how far apart two matrices are. The standard choice
            is the <em>Frobenius norm</em>: the square root of the sum
            of all squared entries.
          </p>

          <Equation
            tex="\|M\|_F = \sqrt{\sum_{i,j} M_{ij}^2}"
            number={1}
          />

          <p>
            Think of it as flattening the matrix into one long vector
            and computing its <InlineMath tex="L^2" /> length. The
            distance between matrices <InlineMath tex="X" /> and{" "}
            <InlineMath tex="Y" /> is <InlineMath tex="\|X - Y\|_F" />.
            If the two matrices are identical, the distance is zero.
            If they differ, each disagreeing entry contributes to the
            total.
          </p>

          <p>
            The Frobenius norm connects to the trace in a useful way:{" "}
            <InlineMath tex="\|M\|_F^2 = \text{tr}(M^\top M)" />.
            This lets us expand the squared distance
            between <InlineMath tex="X" /> and <InlineMath tex="YR" />{" "}
            (monkey B's data, rotated by <InlineMath tex="R" />):
          </p>

          <Equation
            tex="\|X - YR\|_F^2 = \text{tr}(X^\top X) - 2\,\text{tr}(R^\top Y^\top X) + \text{tr}(Y^\top Y)"
            number={2}
          />

          <p>
            The first and third terms do not depend
            on <InlineMath tex="R" />. Only the middle term does.
            So minimizing the distance is the same as
            maximizing <InlineMath tex="\text{tr}(R^\top Y^\top X)" />.
            That is the problem we need to solve.
            <Sidenote number={2}>
              Verify the expansion by writing{" "}
              <InlineMath tex="\|X - YR\|_F^2 = \text{tr}((X - YR)^\top(X - YR))" />{" "}
              and distributing. The cross
              term <InlineMath tex="-2\,\text{tr}(R^\top Y^\top X)" />{" "}
              uses the cyclic property of the trace:{" "}
              <InlineMath tex="\text{tr}(ABC) = \text{tr}(CAB)" />.
              This identity shows up throughout the series — in CCA,
              in the SVD proofs, and in the SRM derivation below.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="Drag the rotation angle to see the Frobenius distance change. The minimum of the loss curve coincides with the SVD solution."
          >
            <FrobeniusNormExplorer />
          </FigureContainer>

          <h2 id="orthogonal-procrustes">
            The orthogonal Procrustes problem
          </h2>

          <p>
            Find the orthogonal matrix <InlineMath tex="R" /> (rotation
            or reflection) that minimizes the distance between{" "}
            <InlineMath tex="X" /> and <InlineMath tex="YR" />:
          </p>

          <Equation
            tex="\min_{R^\top R = I}\; \|X - YR\|_F^2"
            number={3}
          />

          <p>
            From equation (2), this is equivalent to:
          </p>

          <Equation
            tex="\max_{R^\top R = I}\; \text{tr}(R^\top Y^\top X)"
            number={4}
          />

          <p>
            The solution comes from the SVD. Compute the
            cross-product <InlineMath tex="M = Y^\top X" />, an{" "}
            <InlineMath tex="n \times n" /> matrix where{" "}
            <InlineMath tex="n" /> is the number of retained components
            (10 in our example). Take its
            SVD: <InlineMath tex="M = U\Sigma V^\top" />. The optimal
            rotation is:
          </p>

          <Equation
            tex="R = U V^\top"
            number={5}
          />

          <p>
            That is the entire solution. Let's verify that it is
            orthogonal: <InlineMath tex="R^\top R = V U^\top U V^\top = V V^\top = I" />.
            Yes.
          </p>

          <p>
            Why does this work? The
            trace <InlineMath tex="\text{tr}(R^\top M) = \text{tr}(R^\top U \Sigma V^\top)" />.
            Substituting <InlineMath tex="R = UV^\top" />:{" "}
            <InlineMath tex="\text{tr}(VU^\top U \Sigma V^\top) = \text{tr}(V \Sigma V^\top) = \text{tr}(\Sigma)" />.
            The trace of <InlineMath tex="\Sigma" /> is the sum of the
            singular values. Von Neumann's trace inequality guarantees
            that this is the maximum possible value
            of <InlineMath tex="\text{tr}(R^\top M)" /> over all
            orthogonal <InlineMath tex="R" />.
            <Sidenote number={3}>
              The intuition: the SVD decomposes the cross-product into
              "rotate, scale, rotate." The optimal <InlineMath tex="R" />{" "}
              undoes both rotations, leaving only the scaling. The
              remaining trace is the sum of singular values, which is
              the largest possible alignment score. Compare this to
              the <Link to="/blog/cca/">CCA post</Link>, where the SVD
              of the whitened cross-covariance gives the canonical
              correlations. The algebraic structure is identical: form
              a cross-product matrix, take the SVD, read off the answer.
            </Sidenote>
          </p>

          <p>
            Let's make this concrete with small numbers. Suppose after
            PCA we have 2D scores. Monkey A:{" "}
            <InlineMath tex="X = \bigl(\begin{smallmatrix} 1 & 0 \\ 0 & 1 \\ -1 & 0 \end{smallmatrix}\bigr)" />.
            Monkey B:{" "}
            <InlineMath tex="Y = \bigl(\begin{smallmatrix} 0 & 1 \\ -1 & 0 \\ 0 & -1 \end{smallmatrix}\bigr)" />.
            Monkey B's data looks like monkey A's, rotated 90 degrees.
            Compute <InlineMath tex="M = Y^\top X = \bigl(\begin{smallmatrix} 0 & -1 \\ 1 & 0 \end{smallmatrix}\bigr)" />.
            This is itself a rotation matrix, so its SVD gives singular
            values both equal to 1, and{" "}
            <InlineMath tex="R = UV^\top" /> recovers the inverse
            rotation. After
            alignment, <InlineMath tex="YR = X" /> exactly.
          </p>

          <FigureContainer
            width="outset"
            caption="Two point clouds, initially misaligned. Click Align to compute the SVD-based rotation. Drag points in Y to perturb the alignment and see the residual change."
          >
            <ProcrustesExplorer />
          </FigureContainer>

          <h2 id="why-orthogonal">Why restrict to rotations?</h2>

          <p>
            The Procrustes problem restricts <InlineMath tex="R" /> to
            be orthogonal. Why not allow any matrix? If you drop the
            constraint, the minimizer
            of <InlineMath tex="\|X - YR\|_F^2" /> is the
            least-squares solution{" "}
            <InlineMath tex="R = (Y^\top Y)^{-1} Y^\top X" />,
            which is just regression. That would work, but it allows
            stretching.
          </p>

          <p>
            Stretching is dangerous for alignment. If monkey B's
            population happens to have more variance along one axis,
            an unconstrained transformation will stretch that axis to
            match monkey A's variance. Now you cannot tell whether the
            two populations truly share structure or whether the
            alignment just inflated the right dimensions to create an
            artificial match.
          </p>

          <p>
            Orthogonal transformations preserve distances. Every
            pairwise distance between time points stays the same after
            rotation. That is a strong guarantee: the internal geometry
            of monkey B's data is unchanged. Only its orientation
            relative to monkey A's is adjusted. If the two populations
            genuinely share a geometric structure, a rotation is enough
            to reveal it. If they do not, no amount of rotation will
            create a good match, and the residual distance will be
            large.
            <Sidenote number={4}>
              Some methods allow scaling as well as rotation. The
              generalized Procrustes problem finds the best similarity
              transformation (rotation + uniform scaling). For neural
              data, the pure orthogonal constraint is usually preferred
              because it makes the alignment result harder to overfit.
              Williams et al. <Citation numbers={[8]} /> develop a
              framework of "shape metrics" for comparing neural
              representations that generalizes beyond rotations
              to affine and more flexible classes of
              transformations, with statistical tests for whether the
              added flexibility is justified by the data.
            </Sidenote>
          </p>

          <h2 id="pairwise-to-group">
            From pairwise to group alignment
          </h2>

          <p>
            With two subjects, you align B to A and you are done. With
            ten subjects, pairwise alignment gets complicated. You
            could align every pair, but that gives you{" "}
            <InlineMath tex="\binom{10}{2} = 45" /> different
            alignments, and they will not be consistent: aligning B to
            A and C to A does not guarantee that B and C are well
            aligned with each other.
          </p>

          <p>
            A better approach: align all subjects simultaneously to a
            shared template. Define a
            template <InlineMath tex="S" /> (a matrix the same size as
            each subject's PCA scores) and find rotations{" "}
            <InlineMath tex="R_1, R_2, \ldots, R_K" /> that minimize
            the total distance:
          </p>

          <Equation
            tex="\min_{S,\, R_1, \ldots, R_K}\; \sum_{k=1}^{K} \|S - X_k R_k\|_F^2 \qquad \text{s.t. } R_k^\top R_k = I"
            number={6}
          />

          <p>
            This alternates between two steps. Fix the
            template <InlineMath tex="S" /> and solve for each{" "}
            <InlineMath tex="R_k" /> by Procrustes (equation 5). Fix
            the rotations and update the template
            as <InlineMath tex="S = \tfrac{1}{K}\sum_k X_k R_k" />,
            the average of the aligned datasets. Repeat until
            convergence. This is <em>generalized Procrustes
            analysis</em>: alternating Procrustes alignment with
            template estimation.
          </p>

          <p>
            The result is a shared coordinate system in which all
            subjects' data are expressed. The template represents
            what is common. The residuals represent what is individual.
            <Sidenote number={5}>
              Convergence is guaranteed because each step (fixing the
              template and solving for rotations, or fixing rotations
              and averaging) decreases the total objective. The
              objective is bounded below by zero, so the alternation
              converges. The solution is not unique — rotating all
              subjects and the template by the same orthogonal matrix
              gives the same total distance — but the relative
              alignment between subjects is unique up to this global
              rotation.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="Four subjects, initially misaligned. Click Align all to run iterative generalized Procrustes. Watch each subject's data rotate toward the group template as the total alignment error decreases."
          >
            <HyperalignmentExplorer />
          </FigureContainer>

          <h2 id="hyperalignment">Hyperalignment</h2>

          <p>
            Haxby et al. <Citation numbers={[2]} /> introduced
            hyperalignment for fMRI data, where the goal is to align
            neural representations across subjects watching the same
            movie. The data are voxel-by-time matrices, and each
            subject's voxels are in a different anatomical coordinate
            system.
          </p>

          <p>
            Hyperalignment is generalized Procrustes analysis applied
            to neural data. Run PCA on each subject to reduce
            dimensionality, then iteratively align all subjects to a
            shared template using orthogonal rotations. The key
            insight is that the shared template captures the
            representational structure common to all subjects: the
            stimulus-driven geometry that is preserved across
            individual anatomical differences.
          </p>

          <p>
            In practice, the alignment is done in a
            high-dimensional PCA space (often 100+ components) rather
            than in full voxel space. The orthogonal constraint means
            each subject's internal geometry is preserved. What changes
            is how the dimensions relate to the shared template.
            <Sidenote number={6}>
              The original hyperalignment paper <Citation numbers={[2]} />{" "}
              used a Procrustean rotation between each subject and a
              reference subject, iterated with template updates. Later
              work reformulated this as an optimization over the
              Stiefel manifold (the space of orthogonal matrices),
              which guarantees convergence and gives the same result
              more efficiently.
            </Sidenote>
          </p>

          <p>
            Safaie et al. <Citation numbers={[5]} /> applied a similar
            strategy to align neural dynamics across monkeys and mice
            performing reaching movements. They used CCA rather than
            Procrustes for the alignment step, but the underlying
            logic is the same: find a shared coordinate system in which
            the population trajectories of different individuals
            overlap.
          </p>

          <h2 id="srm">The shared response model</h2>

          <p>
            Chen et al. <Citation numbers={[3]} /> observed that
            hyperalignment and PCA can be combined more tightly. Instead
            of running PCA on each subject separately and then
            aligning, you can solve for the shared low-dimensional
            representation and the per-subject rotations simultaneously.
          </p>

          <p>
            The model: each subject's data matrix{" "}
            <InlineMath tex="X_k" /> (time by voxels/neurons) is
            approximated as a shared response matrix{" "}
            <InlineMath tex="S" /> (time by <InlineMath tex="d" />{" "}
            latent components) transformed by a subject-specific
            orthogonal mixing
            matrix <InlineMath tex="W_k" /> (<InlineMath tex="d" /> by
            neurons):
          </p>

          <Equation
            tex="X_k \approx S\, W_k^\top \qquad \text{with } W_k^\top W_k = I"
            number={7}
          />

          <p>
            The optimization minimizes the total reconstruction error
            across subjects:
          </p>

          <Equation
            tex="\min_{S,\, W_1, \ldots, W_K}\; \sum_{k=1}^{K} \|X_k - S\, W_k^\top\|_F^2"
            number={8}
          />

          <p>
            This is a joint matrix factorization: each subject's data
            is a shared signal viewed through a subject-specific
            orthogonal lens. The shared signal <InlineMath tex="S" />{" "}
            captures stimulus-driven structure. The per-subject
            matrices <InlineMath tex="W_k" /> capture how each
            subject's neurons encode that shared structure.
          </p>

          <p>
            The solution alternates, like generalized Procrustes. Fix{" "}
            <InlineMath tex="S" /> and solve for
            each <InlineMath tex="W_k" /> by Procrustes
            (SVD of <InlineMath tex="X_k^\top S" />). Fix the{" "}
            <InlineMath tex="W_k" />'s and update <InlineMath tex="S" />{" "}
            by averaging the aligned data. The difference from plain
            hyperalignment is that the shared
            component <InlineMath tex="S" /> is explicitly
            low-dimensional (rank <InlineMath tex="d" />), not full
            rank.
            <Sidenote number={7}>
              SRM can also be derived as a probabilistic model.
              The shared response is a latent variable, each subject's
              observation is a noisy rotation of it, and the EM
              algorithm gives the same alternating updates. This
              probabilistic view connects SRM to factor analysis and
              probabilistic CCA <Citation numbers={[4]} />.
            </Sidenote>
          </p>

          <p>
            After fitting,
            the <InlineMath tex="W_k" />'s can align a new subject's
            data into the shared space. This enables cross-subject
            decoding (train a decoder on the shared representation,
            apply it to any subject) and cross-subject comparison
            (are two subjects' representations similar? Compare them
            in the shared space).
            <Sidenote number={8}>
              The distinction between SRM and CCA is subtle but
              important. Both learn a shared latent space from multiple
              datasets. CCA maximizes correlation between pairs of
              projections. SRM minimizes reconstruction error with
              orthogonal subject-specific maps. CCA does not require
              the projections to preserve geometry; SRM does. For
              neuroscience, SRM's constraint is often preferred
              because it guarantees that within-subject distances
              are preserved after alignment.
            </Sidenote>
          </p>

          <FigureContainer
            width="wide"
            caption="The SRM factorization. Each subject's data is a shared response S viewed through a subject-specific orthogonal mixing matrix. The shared structure is the same; only the embedding differs."
          >
            <SRMFactorizationExplorer />
          </FigureContainer>

          <h2 id="relation-to-cca">
            What comes next
          </h2>

          <p>
            Procrustes and CCA both align two datasets, but they solve
            different problems. CCA finds the most correlated
            projections of two datasets, regardless of the original
            coordinate systems. Procrustes finds the rotation that best
            matches one dataset to another in a fixed coordinate system.
          </p>

          <p>
            CCA allows each dataset to be projected to a different
            low-dimensional space. Procrustes requires both datasets to
            be in the same dimensionality and finds a rigid alignment.
            CCA is more flexible (it can discover shared structure even
            when the original dimensions do not correspond). Procrustes
            is more constrained (it preserves the internal geometry of
            each dataset).
          </p>

          <p>
            For cross-subject neural alignment, the typical pipeline
            is: PCA to reduce dimensionality, then Procrustes (or
            hyperalignment, or SRM) to
            align. Cunningham and Yu <Citation numbers={[7]} /> review
            this pipeline and its variants. CCA provides an
            alternative that does not require the PCA step, but it
            is also more prone to overfitting in high
            dimensions.
            <Sidenote number={9}>
              Methods like ShaReD combine elements of both: they learn
              shared and private latent spaces with behavioral
              supervision, using the structure of dynamics-based
              methods (like <Link to="/blog/psid/">PSID</Link>) rather
              than static alignment. The Procrustes framework is the
              conceptual ancestor, but the optimization objective
              changes to incorporate temporal structure and behavioral
              relevance.
            </Sidenote>
          </p>

          <p>
            Both Procrustes and CCA are symmetric: they treat the two
            datasets equally. But many problems in neuroscience are
            asymmetric. You want to predict behavior from neural
            activity, not the reverse. You want to find the subspace
            of neural activity that predicts a target, not the most
            correlated subspace. That asymmetry leads to reduced-rank
            regression, targeted dimensionality reduction, and
            communication subspaces, which are
            the <Link to="/blog/rrr-dpca/">next post</Link>.
          </p>

          <h2 id="implementation">Implementation</h2>

          <p>
            The Procrustes solution is four lines of NumPy. Below is a
            complete implementation covering pairwise alignment,
            generalized Procrustes, and SRM:
          </p>

          <CodeBlock language="python" code={`import numpy as np

def procrustes(X, Y):
    """
    Find the orthogonal R minimizing ||X - Y R||_F.

    Parameters
    ----------
    X : array, shape (n, d)
        Target data (n observations, d dimensions).
    Y : array, shape (n, d)
        Source data to be aligned to X.

    Returns
    -------
    R : array, shape (d, d)
        Orthogonal alignment matrix (Y @ R ≈ X).
    distance : float
        Frobenius norm of the residual after alignment.
    """
    M = Y.T @ X            # cross-product
    U, s, Vt = np.linalg.svd(M)
    R = U @ Vt              # optimal rotation
    distance = np.linalg.norm(X - Y @ R, 'fro')
    return R, distance


def generalized_procrustes(datasets, n_iter=100, tol=1e-8):
    """
    Align K datasets to a shared template by alternating
    Procrustes alignment with template estimation.

    Parameters
    ----------
    datasets : list of arrays, each shape (n, d)
        K datasets with matched rows.

    Returns
    -------
    aligned : list of arrays, each shape (n, d)
        Aligned datasets.
    template : array, shape (n, d)
        Group-average template.
    rotations : list of arrays, each shape (d, d)
        Per-subject orthogonal alignment matrices.
    """
    K = len(datasets)
    template = datasets[0].copy()
    rotations = [np.eye(datasets[0].shape[1])] * K

    for iteration in range(n_iter):
        old_template = template.copy()

        # Align each dataset to the current template
        for k in range(K):
            R, _ = procrustes(template, datasets[k])
            rotations[k] = R

        # Update template as mean of aligned datasets
        template = np.mean(
            [datasets[k] @ rotations[k] for k in range(K)],
            axis=0,
        )

        # Check convergence
        if np.linalg.norm(template - old_template) < tol:
            break

    aligned = [datasets[k] @ rotations[k] for k in range(K)]
    return aligned, template, rotations


def srm(datasets, d, n_iter=100, tol=1e-8):
    """
    Shared Response Model: find a d-dimensional shared
    representation and per-subject orthogonal mappings.

    Parameters
    ----------
    datasets : list of arrays, each shape (n, p_k)
        K datasets. Each can have a different number of
        columns (neurons/voxels), but all have n rows.
    d : int
        Dimensionality of the shared response.

    Returns
    -------
    S : array, shape (n, d)
        Shared response (low-dimensional template).
    W_list : list of arrays, each shape (p_k, d)
        Per-subject orthogonal mixing matrices.
    """
    K = len(datasets)

    # Initialize: PCA on concatenated data
    concat = np.hstack([ds for ds in datasets])
    U, s, Vt = np.linalg.svd(concat, full_matrices=False)
    S = U[:, :d] * s[np.newaxis, :d]

    W_list = [None] * K
    for iteration in range(n_iter):
        old_S = S.copy()

        # Fix S, solve for each W_k by Procrustes
        for k in range(K):
            M = datasets[k].T @ S
            U_k, _, Vt_k = np.linalg.svd(M)
            W_list[k] = U_k[:, :d] @ Vt_k[:d, :]

        # Fix W_k's, update S
        S = np.mean(
            [datasets[k] @ W_list[k] for k in range(K)],
            axis=0,
        )

        if np.linalg.norm(S - old_S) < tol:
            break

    return S, W_list


# ── Example: align two simulated monkeys ──
rng = np.random.default_rng(42)

n_time, d_latent = 500, 10

# Shared latent trajectory
Z = rng.standard_normal((n_time, d_latent))

# Subject-specific orthogonal mixings
def random_orthogonal(d, rng):
    H = rng.standard_normal((d, d))
    Q, _ = np.linalg.qr(H)
    return Q

Q_a = random_orthogonal(d_latent, rng)
Q_b = random_orthogonal(d_latent, rng)

X = Z @ Q_a.T + 0.3 * rng.standard_normal((n_time, d_latent))
Y = Z @ Q_b.T + 0.3 * rng.standard_normal((n_time, d_latent))

# Pairwise Procrustes
R, dist = procrustes(X, Y)
print(f"Residual after alignment: {dist:.2f}")

# Correlation between aligned Y and X
corrs = [np.corrcoef(X[:, j], (Y @ R)[:, j])[0, 1]
         for j in range(d_latent)]
print(f"Mean correlation per dim: {np.mean(corrs):.3f}")`} />

          <p>
            A practical note: always center each dataset (subtract the
            column mean) before running Procrustes. The alignment
            optimizes rotation, not translation. If the datasets have
            different means, the mean offset will be treated as
            misalignment and absorbed into the rotation, which is not
            what you want.
          </p>

          <h2 id="references">References</h2>
          <ol className="blog-references">
            <li id="ref-1">
              Schönemann, P. H. "A generalized solution of the
              orthogonal Procrustes problem,"{" "}
              <em>Psychometrika</em>, vol. 31, no. 1, pp. 1-10, 1966.
            </li>
            <li id="ref-2">
              Haxby, J. V., Guntupalli, J. S., Connolly, A. C., et al.
              "A common, high-dimensional model of the representational
              space in human ventral temporal cortex,"{" "}
              <em>Neuron</em>, vol. 72, no. 2, pp. 404-416, 2011.
            </li>
            <li id="ref-3">
              Chen, P.-H., Chen, J., Yeshurun, Y., et al. "A
              reduced-dimension fMRI shared response model,"{" "}
              <em>Advances in Neural Information Processing Systems</em>,
              vol. 28, 2015.
            </li>
            <li id="ref-4">
              Bach, F. R. and Jordan, M. I. "A probabilistic
              interpretation of canonical correlation analysis,"{" "}
              Technical Report 688, UC Berkeley, 2005.
            </li>
            <li id="ref-5">
              Safaie, M., Chang, J. C., Park, J., et al.
              "Preserved neural dynamics across animals performing
              similar behaviour,"{" "}
              <em>Nature</em>, vol. 623, pp. 765-771, 2023.
            </li>
            <li id="ref-6">
              Churchland, M. M., Cunningham, J. P., Kaufman, M. T.,
              et al. "Neural population dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51-56, 2012.
            </li>
            <li id="ref-7">
              Cunningham, J. P. and Yu, B. M. "Dimensionality reduction
              for large-scale neural recordings,"{" "}
              <em>Nature Neuroscience</em>, vol. 17, pp. 1500-1509, 2014.
            </li>
            <li id="ref-8">
              Williams, A. H., Kunz, E., Kornblith, S., and Linderman,
              S. W. "Generalized shape metrics on neural
              representations,"{" "}
              <em>Advances in Neural Information Processing Systems</em>,
              vol. 34, 2021.
            </li>
          </ol>
        </div>

        <SeriesNav part={10} />

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
    Procrustes and hyperalignment &mdash;
    Felix Taschbach
  </title>
)

export default ProcrustesAlignmentPost
