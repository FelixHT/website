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
import SVDExplorer from "../../components/blog/SVDExplorer"
import SVDStepDecomposition from "../../components/blog/SVDStepDecomposition"
import RectangularSVDExplorer from "../../components/blog/RectangularSVDExplorer"
import EckartYoungExplorer from "../../components/blog/EckartYoungExplorer"
import LowRankApproximation from "../../components/blog/LowRankApproximation"
import PseudoinverseExplorer from "../../components/blog/PseudoinverseExplorer"
import SVDUnifiesAll from "../../components/blog/SVDUnifiesAll"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "what-does-a-matrix-do-to-a-circle", label: "What a matrix does to a circle" },
  { id: "three-steps", label: "Rotate, scale, rotate" },
  { id: "where-svd-comes-from", label: "Where the SVD comes from" },
  { id: "rectangular", label: "Rectangular matrices and singular values" },
  { id: "best-low-rank", label: "Low-rank approximation" },
  { id: "pseudoinverse", label: "The pseudoinverse" },
  { id: "why-svd-is-everywhere", label: "Where the SVD appears" },
  { id: "implementation", label: "Implementation" },
  { id: "references", label: "References" },
]

const SVDPost = () => {
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
            The singular value decomposition
          </h1>
          <p className="blog-post__subtitle">
            One factorization behind most of neural data analysis.
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
                Linear Algebra for Neural Data, Part 6
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          <h2 id="what-does-a-matrix-do-to-a-circle">
            What a matrix does to a circle
          </h2>

          <p>
            Every matrix you will meet in this series does something
            geometric: it takes a set of vectors and rearranges them.
            To understand what any particular matrix does, a good
            starting question is: what happens to the unit circle (in
            2D) or the unit sphere (in higher dimensions) when the
            matrix acts on it?
          </p>

          <p>
            Take a concrete example. In Post 3, we built a 2-by-3
            neural decoder that maps 3-dimensional neural activity to
            2-dimensional hand velocity. But to see the geometry
            clearly, start with a square matrix:
          </p>

          <Equation
            tex={`A = \\begin{bmatrix} 3 & 1 \\\\ 1 & 3 \\end{bmatrix}`}
            number={1}
          />

          <p>
            Apply this matrix to every point on the unit circle. The
            result is an ellipse. We saw in Post 5 that a symmetric
            matrix maps a circle to an ellipse whose axes align with
            the eigenvectors. The eigenvalues are 4
            and 2 (check: <InlineMath tex="\text{trace} = 6" />,{" "}
            <InlineMath tex="\det = 8" />,
            so <InlineMath tex="\lambda^2 - 6\lambda + 8 = 0" /> gives{" "}
            <InlineMath tex="\lambda = 4, 2" />). The
            eigenvectors <InlineMath tex="(1, 1)/\sqrt{2}" /> and{" "}
            <InlineMath tex="(1, -1)/\sqrt{2}" /> point along the
            ellipse axes, and the eigenvalues are the semi-axis lengths.
            So far, the eigendecomposition from Post 5 handles everything.
          </p>

          <p>
            Now consider a non-symmetric matrix:
          </p>

          <Equation
            tex={`B = \\begin{bmatrix} 2 & 0 \\\\ 1 & 1 \\end{bmatrix}`}
            number={2}
          />

          <p>
            This still maps the circle to an ellipse, but the
            eigenvectors of <InlineMath tex="B" /> are not
            perpendicular. The eigenvalues are 2 and 1, with
            eigenvectors <InlineMath tex="(0, 1)" /> and{" "}
            <InlineMath tex="(-1, 1)" />, which meet at an oblique
            angle. Yet the ellipse still has a longest axis and a
            shortest axis, and those axes are still perpendicular to
            each other. The eigenvectors simply do not point along them.
            <Sidenote number={1}>
              Why are the ellipse axes always perpendicular? Because an
              ellipse is a level set of a quadratic form, and any
              quadratic form can be diagonalized by an orthogonal change
              of coordinates. The SVD is the machinery that finds those
              coordinates for arbitrary (including non-symmetric and
              rectangular) matrices.
            </Sidenote>
          </p>

          <p>
            This is the gap the SVD fills. The eigendecomposition finds
            directions that scale without rotating, which requires a
            square matrix and yields perpendicular axes only for
            symmetric matrices. The SVD instead asks: what are the
            perpendicular axes of the output ellipse, and which
            perpendicular axes on the input circle map to them? It
            answers this question for any matrix, symmetric or not,
            square or not.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                A unit circle maps to an ellipse. The right singular
                vectors (on the circle) map to the left singular vectors
                (on the ellipse), scaled by the singular values. Toggle
                between matrices to compare symmetric and non-symmetric cases.
              </>
            }
          >
            <SVDExplorer />
          </FigureContainer>

          <p>
            There exists a pair of
            orthonormal bases, one for the input space and one for the
            output space, such that the matrix acts as pure scaling
            between them. The input basis vectors are the <em>right
            singular vectors</em>. The output basis vectors are the{" "}
            <em>left singular vectors</em>. The scaling factors are
            the <em>singular values</em>. That is the entire content
            of the SVD.
          </p>

          <h2 id="three-steps">Rotate, scale, rotate</h2>

          <p>
            Every matrix, no matter how complicated, decomposes into
            three steps. The SVD of any matrix <InlineMath tex="A" /> is:
          </p>

          <Equation
            tex="A = U \Sigma V^\top"
            number={3}
          />

          <p>
            Read this right to left, as three operations applied to a
            vector <InlineMath tex="x" />:
          </p>

          <p>
            <strong>Step 1.</strong>{" "}
            <InlineMath tex="V^\top x" />: rotate the input vector so
            that the right singular vectors align with the coordinate
            axes. This is a change of basis in the input space. Because{" "}
            <InlineMath tex="V" /> is orthogonal,{" "}
            <InlineMath tex="V^\top" /> is a rotation (or rotation
            plus reflection). No stretching happens.
          </p>

          <p>
            <strong>Step 2.</strong>{" "}
            <InlineMath tex="\Sigma(V^\top x)" />: scale each
            coordinate axis independently. The stretch factors are
            the singular values <InlineMath tex="\sigma_1 \geq \sigma_2 \geq \cdots \geq 0" />,
            the diagonal entries of <InlineMath tex="\Sigma" />.
            This is where the geometry actually changes: directions
            with large singular values get amplified, directions with
            small singular values get crushed.
          </p>

          <p>
            <strong>Step 3.</strong>{" "}
            <InlineMath tex="U(\Sigma V^\top x)" />: rotate the
            scaled result into the output space, aligning the coordinate
            axes with the left singular vectors. Again, no stretching.
          </p>

          <FigureContainer
            width="wide"
            caption={
              <>
                Step through the three stages of the SVD. Each button
                applies one operation. Between the two rotations, the
                only thing that happens is axis-aligned scaling. Every
                matrix, regardless of what it looks like, has this
                internal structure.
              </>
            }
          >
            <SVDStepDecomposition />
          </FigureContainer>

          <p>
            The two rotations can be completely different.{" "}
            <InlineMath tex="V" /> orients the input space and{" "}
            <InlineMath tex="U" /> orients the output space. Between
            them, <InlineMath tex="\Sigma" /> does the only
            non-rigid work: independent scaling along each axis.
            This factorization is why the SVD reveals so much about a
            matrix. The singular values tell you how much each direction
            is amplified. The singular vectors tell you which
            directions.
            <Sidenote number={2}>
              The "rotate, scale, rotate" picture is the SVD's
              fundamental insight, and Strang <Citation numbers={[1]} />{" "}
              and Trefethen and Bau <Citation numbers={[8]} /> both
              emphasize it as the single most important factorization
              in numerical linear algebra. Trefethen in particular
              argues that the SVD should be taught before the
              eigendecomposition, because it works for all matrices
              and the geometric meaning is immediate.
            </Sidenote>
          </p>

          <p>
            Let's verify with a concrete example. Take the shear matrix:
          </p>

          <Equation
            tex={`A = \\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}`}
            number={4}
          />

          <p>
            Compute <InlineMath tex="A^\top A = \bigl(\begin{smallmatrix} 1 & 1 \\ 1 & 2 \end{smallmatrix}\bigr)" />.
            The characteristic polynomial
            is <InlineMath tex="\lambda^2 - 3\lambda + 1 = 0" />,
            giving
            eigenvalues <InlineMath tex="\tfrac{3 + \sqrt{5}}{2} \approx 2.618" /> and{" "}
            <InlineMath tex="\tfrac{3 - \sqrt{5}}{2} \approx 0.382" />.
            The singular values are the square
            roots: <InlineMath tex="\sigma_1 \approx 1.618" /> and{" "}
            <InlineMath tex="\sigma_2 \approx 0.618" />.
          </p>

          <p>
            Two checks. First: <InlineMath tex="\sigma_1 \cdot \sigma_2 = 1.618 \times 0.618 \approx 1 = |\det(A)|" />.
            The product of singular values equals the absolute
            determinant, because the determinant measures total
            area (or volume) scaling, and the singular values
            measure how much each axis contributes.
            Second: <InlineMath tex="\sigma_1^2 + \sigma_2^2 = 2.618 + 0.382 = 3 = \|A\|_F^2" />,
            the squared Frobenius norm (sum of all squared entries
            of <InlineMath tex="A" />:{" "}
            <InlineMath tex="1 + 1 + 0 + 1 = 3" />).
            <Sidenote number={3}>
              Both of these identities hold in general. For any
              matrix: <InlineMath tex="|\det(A)| = \prod_i \sigma_i" />{" "}
              and <InlineMath tex="\|A\|_F^2 = \sum_i \sigma_i^2" />.
              The first says singular values decompose volume scaling.
              The second says they decompose total "energy." These
              identities are why singular values appear in matrix norms,
              condition numbers, and information-theoretic quantities
              throughout the series.
            </Sidenote>
          </p>

          <h2 id="where-svd-comes-from">Where the SVD comes from</h2>

          <p>
            The SVD is not a new piece of machinery. It falls directly
            out of the eigendecomposition from Post 5, applied to
            a carefully chosen matrix.
          </p>

          <p>
            We want to find the directions
            in the input space that get stretched the most by{" "}
            <InlineMath tex="A" />. The length of{" "}
            <InlineMath tex="Ax" /> is{" "}
            <InlineMath tex="\|Ax\| = \sqrt{x^\top A^\top A\, x}" />.
            Maximizing this over unit
            vectors <InlineMath tex="\|x\| = 1" /> is an eigenvalue
            problem for the matrix <InlineMath tex="A^\top A" />,
            exactly as in Post 5. The maximum
            of <InlineMath tex="\|Ax\|^2" /> subject
            to <InlineMath tex="\|x\| = 1" /> is the largest eigenvalue
            of <InlineMath tex="A^\top A" />, achieved at the
            corresponding eigenvector.
          </p>

          <p>
            Why <InlineMath tex="A^\top A" /> and not just{" "}
            <InlineMath tex="A" />? Because <InlineMath tex="A" /> might
            not be square, and even if it is, it might not be symmetric.
            But <InlineMath tex="A^\top A" /> is always square, always
            symmetric, and always positive semidefinite:
          </p>

          <BlockMath tex="(A^\top A)^\top = A^\top A \qquad\text{and}\qquad x^\top A^\top A\, x = \|Ax\|^2 \geq 0" />

          <p>
            By the spectral theorem from Post 5, it has a full
            orthogonal eigendecomposition:
          </p>

          <Equation
            tex="A^\top A = V \Lambda V^\top"
            number={5}
          />

          <p>
            where the columns of <InlineMath tex="V" /> are orthonormal
            eigenvectors and <InlineMath tex="\Lambda = \text{diag}(\lambda_1, \ldots, \lambda_n)" /> has
            nonnegative eigenvalues. These eigenvectors are the{" "}
            <em>right singular vectors</em> of <InlineMath tex="A" />.
            They are the input directions that align with the ellipse
            axes.
          </p>

          <p>
            The eigenvalues of <InlineMath tex="A^\top A" /> are the
            squared singular values:{" "}
            <InlineMath tex="\lambda_i = \sigma_i^2" />. This is the
            connection: the singular values of <InlineMath tex="A" /> are
            the square roots of the eigenvalues
            of <InlineMath tex="A^\top A" />.
          </p>

          <p>
            Now we need the output directions. For each nonzero
            singular value, define:
          </p>

          <Equation
            tex="u_i = \frac{1}{\sigma_i}\, A\, v_i"
            number={6}
          />

          <p>
            This is <InlineMath tex="A" /> applied to the right
            singular vector, normalized by the singular value. In other
            words: take the input direction, push it through the matrix,
            and normalize the result. The claim is that these{" "}
            <InlineMath tex="u_i" />'s are orthonormal. Verify:
          </p>

          <BlockMath tex="u_i^\top u_j = \frac{1}{\sigma_i \sigma_j}\, v_i^\top A^\top A\, v_j = \frac{1}{\sigma_i \sigma_j}\, v_i^\top (\sigma_j^2\, v_j) = \frac{\sigma_j}{\sigma_i}\, v_i^\top v_j = \delta_{ij}" />

          <p>
            where we used <InlineMath tex="A^\top A\, v_j = \sigma_j^2\, v_j" /> (the
            eigenvalue equation) and the orthonormality of
            the <InlineMath tex="v_i" />'s. So the{" "}
            <InlineMath tex="u_i" />'s are indeed orthonormal. They
            are the <em>left singular vectors</em>.
            <Sidenote number={4}>
              The orthonormality proof is worth internalizing. It is the
              same structure that appears in the CCA derivation (where
              whitening plays the role of normalizing) and in subspace
              identification (where the left singular vectors of the
              Hankel matrix span the observability subspace). Every time
              you see an SVD in this series, the left and right singular
              vectors have a similar "push through the matrix, normalize"
              relationship.
            </Sidenote>
          </p>

          <p>
            Assemble everything. From Equation 6, we
            have <InlineMath tex="A\, v_i = \sigma_i\, u_i" /> for each
            singular value. Writing all <InlineMath tex="r" /> of these
            equations as a single matrix equation:
          </p>

          <BlockMath tex="A\, V_r = U_r\, \Sigma_r" />

          <p>
            where <InlineMath tex="V_r" /> collects the right singular
            vectors, <InlineMath tex="U_r" /> collects the left singular
            vectors, and <InlineMath tex="\Sigma_r" /> is diagonal with
            the singular values. Right-multiplying
            by <InlineMath tex="V_r^\top" /> (which
            equals <InlineMath tex="V_r^{-1}" /> since it is
            orthogonal):
          </p>

          <Equation
            tex="A = U_r\, \Sigma_r\, V_r^\top"
            number={7}
          />

          <p>
            That is the SVD. We started from the spectral theorem for
            the symmetric matrix <InlineMath tex="A^\top A" />, defined
            the left singular vectors via the matrix itself, proved they
            are orthonormal, and assembled the factorization. No new
            axioms or theorems were needed beyond what Post 5 provides.
          </p>

          <p>
            You could equally well start from{" "}
            <InlineMath tex="AA^\top" /> instead of{" "}
            <InlineMath tex="A^\top A" />. Its eigenvectors are the
            left singular vectors, and you would construct the right
            singular vectors from them.
            Both <InlineMath tex="A^\top A" /> and{" "}
            <InlineMath tex="AA^\top" /> share the same nonzero
            eigenvalues (the squared singular values). The two paths
            converge to the same factorization.
            <Sidenote number={5}>
              For a symmetric matrix, the SVD and the eigendecomposition
              coincide: left and right singular vectors are both
              eigenvectors, and singular values are the absolute values
              of eigenvalues. The SVD is strictly more general. It works
              for any matrix, including rectangular ones, and the
              singular values are always nonnegative (unlike eigenvalues,
              which can be negative or complex). Stewart <Citation numbers={[9]} />{" "}
              gives a thorough treatment of the SVD's history and
              properties.
            </Sidenote>
          </p>

          <h2 id="rectangular">
            Rectangular matrices and singular values
          </h2>

          <p>
            The eigendecomposition only works for square matrices. The
            SVD works for any matrix, including the rectangular ones
            that appear constantly in neural data.
          </p>

          <p>
            Take a data matrix <InlineMath tex="X" /> with 500 rows
            (time bins) and 100 columns (neurons).
            Its SVD is <InlineMath tex="X = U \Sigma V^\top" />,
            where <InlineMath tex="U" /> is 500-by-500,{" "}
            <InlineMath tex="\Sigma" /> is 500-by-100, and{" "}
            <InlineMath tex="V" /> is 100-by-100. But most of those
            entries are not doing useful work. At most 100 of the
            singular values can be nonzero (since the matrix has only
            100 columns), and the corresponding 400 extra columns
            of <InlineMath tex="U" /> span the left null space, which
            carries no information about the data.
          </p>

          <p>
            In practice, you use the <em>thin</em> (or economy) SVD,
            which keeps only the
            parts that matter: <InlineMath tex="X = U_r \Sigma_r V_r^\top" />,
            where <InlineMath tex="r" /> is the rank.{" "}
            <InlineMath tex="U_r" /> is 500-by-<InlineMath tex="r" />,{" "}
            <InlineMath tex="\Sigma_r" /> is{" "}
            <InlineMath tex="r" />-by-<InlineMath tex="r" />, and{" "}
            <InlineMath tex="V_r" /> is 100-by-<InlineMath tex="r" />.
            This is smaller and faster, with no loss of information.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                The SVD of a rectangular matrix. The four fundamental
                subspaces from Post 4 appear directly: columns
                of <InlineMath tex="V_r" /> span the row space, remaining
                columns of <InlineMath tex="V" /> span the null space,
                columns of <InlineMath tex="U_r" /> span the column
                space, remaining columns of <InlineMath tex="U" /> span
                the left null space. Adjust the rank to see how the
                subspaces partition each space.
              </>
            }
          >
            <RectangularSVDExplorer />
          </FigureContainer>

          <p>
            The singular values are conventionally sorted in decreasing
            order: <InlineMath tex="\sigma_1 \geq \sigma_2 \geq \cdots \geq \sigma_r > 0" />.
            Their magnitudes tell you how important each component is.
            A large gap between <InlineMath tex="\sigma_k" /> and{" "}
            <InlineMath tex="\sigma_{k+1}" /> means the matrix is well
            approximated by its first <InlineMath tex="k" /> components.
          </p>

          <p>
            This is exactly the singular value spectrum that
            the <Link to="/blog/psid/">PSID post</Link> uses to detect
            latent dimensionality. There, the matrix is the block Hankel
            matrix of time-lagged observations, and a gap in its
            singular value spectrum reveals how many latent dimensions
            the dynamical system has. The logic is the same: the number
            of large singular values is the effective rank of the
            matrix, and the effective rank is the number of independent
            components that matter.
            <Sidenote number={6}>
              The "numerical rank" (the number of singular values above
              some threshold) is a more useful measure than the exact
              rank for noisy data. Exact rank will always be full if
              there is any noise at all, since noise fills every
              dimension. Gavish and Donoho <Citation numbers={[10]} />{" "}
              derive an optimal singular value threshold for denoising
              matrices with known noise levels, giving a principled
              alternative to eyeballing the elbow.
            </Sidenote>
          </p>

          <p>
            The four fundamental subspaces from Post 4 appear directly
            in the SVD. The columns of <InlineMath tex="V_r" /> are an
            orthonormal basis for the row space. The remaining columns
            of <InlineMath tex="V" /> (the ones dropped in the thin
            SVD) span the null space. The columns
            of <InlineMath tex="U_r" /> span the column space. The
            remaining columns of <InlineMath tex="U" /> span the left
            null space. This is the four-subspace picture from Post 4
            made computational. The SVD hands you orthonormal bases for
            all four subspaces in one shot. Strang <Citation numbers={[1, 6]} />{" "}
            builds his entire "fundamental theorem of linear algebra"
            around this observation.
          </p>

          <h2 id="best-low-rank">
            Low-rank approximation
          </h2>

          <p>
            You have a 500-by-100 data matrix and you suspect it is
            approximately low-rank: a hundred neurons, but maybe only
            ten or fifteen latent dimensions driving them. You want to
            find the rank-<InlineMath tex="k" /> matrix closest to
            your data. Which one is it?
          </p>

          <p>
            Write the SVD as a sum of rank-1 terms. Each
            term <InlineMath tex="\sigma_i\, u_i\, v_i^\top" /> is the
            outer product of a left and right singular vector, scaled by
            the singular value:
          </p>

          <Equation
            tex="A = \sum_{i=1}^{r} \sigma_i\, u_i\, v_i^\top"
            number={8}
          />

          <p>
            The truncated SVD keeps only the
            first <InlineMath tex="k" /> terms:
          </p>

          <Equation
            tex="A_k = \sum_{i=1}^{k} \sigma_i\, u_i\, v_i^\top"
            number={9}
          />

          <p>
            The Eckart-Young-Mirsky
            theorem <Citation numbers={[11]} /> says: among all
            matrices with rank at most <InlineMath tex="k" />, the
            truncated SVD <InlineMath tex="A_k" /> is the one closest
            to <InlineMath tex="A" />. This holds in both the
            Frobenius norm (sum of squared entries) and the operator
            norm (largest singular value of the difference). No other
            rank-<InlineMath tex="k" /> matrix does better.
            <Sidenote number={7}>
              The Eckart-Young theorem dates to
              1936 <Citation numbers={[11]} />, the same year as
              Hotelling's CCA paper <Citation numbers={[12]} />. The
              proof is clean: any rank-<InlineMath tex="k" /> matrix
              has at most <InlineMath tex="k" /> nonzero singular
              values, and the Frobenius norm is the sum of squared
              singular values of the difference, which is minimized by
              zeroing out the <InlineMath tex="r - k" /> smallest.
              Mirsky later extended the result to unitarily invariant
              norms.
            </Sidenote>
          </p>

          <p>
            The approximation error has a simple expression:
          </p>

          <Equation
            tex="\|A - A_k\|_F^2 = \sigma_{k+1}^2 + \sigma_{k+2}^2 + \cdots + \sigma_r^2"
            number={10}
          />

          <p>
            The error is entirely determined by the discarded singular
            values. If the singular values drop off sharply after
            the first <InlineMath tex="k" />, the approximation is
            excellent. The fraction of total "energy" (variance)
            captured is:
          </p>

          <Equation
            tex="\text{fraction explained} = \frac{\sigma_1^2 + \cdots + \sigma_k^2}{\sigma_1^2 + \cdots + \sigma_r^2}"
            number={11}
          />

          <p>
            If this fraction is 0.95 with <InlineMath tex="k = 10" />{" "}
            out of 100 neurons, then ten components capture 95% of the
            data's content. This is exactly how PCA's explained variance
            works. It is not a coincidence.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Drag the truncation
                rank <InlineMath tex="k" /> to see the reconstruction
                degrade. The heat map shows the original matrix, the
                rank-<InlineMath tex="k" /> approximation, and the
                residual. Below, the singular value spectrum shows which
                components you are keeping and which you are discarding.
              </>
            }
          >
            <EckartYoungExplorer />
          </FigureContainer>

          <p>
            Let's make the PCA connection precise. If{" "}
            <InlineMath tex="X" /> is the centered data matrix (rows
            are observations, columns are neurons) with
            SVD <InlineMath tex="X = U\Sigma V^\top" />, then the
            covariance matrix is:
          </p>

          <Equation
            tex="\frac{1}{T}\, X^\top X = \frac{1}{T}\, V \Sigma^\top U^\top U \Sigma V^\top = V\!\left(\frac{\Sigma^2}{T}\right)\! V^\top"
            number={12}
          />

          <p>
            since <InlineMath tex="U^\top U = I" />. This is an
            eigendecomposition: the right singular
            vectors <InlineMath tex="V" /> of the data matrix are the
            eigenvectors of the covariance matrix, and the squared
            singular values divided by <InlineMath tex="T" /> are the
            eigenvalues. The PCA scores
            are <InlineMath tex="U_k \Sigma_k" />, which are the
            projections of the data onto the
            first <InlineMath tex="k" /> principal components.
            <Sidenote number={8}>
              In practice, PCA is always computed via the SVD of the
              data matrix, never by forming the covariance matrix and
              eigendecomposing it. Forming <InlineMath tex="X^\top X" />{" "}
              squares the condition number: if <InlineMath tex="X" /> has
              condition number <InlineMath tex="\kappa" />,
              then <InlineMath tex="X^\top X" /> has condition
              number <InlineMath tex="\kappa^2" />, making small
              eigenvalues much harder to resolve. The SVD avoids this
              entirely. Golub and Van Loan <Citation numbers={[13]} />{" "}
              give a detailed analysis of the numerical stability
              differences.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                The singular value spectrum of a simulated neural
                population. Click a bar to set the truncation
                rank <InlineMath tex="k" />. The cumulative explained
                variance curve shows how quickly the approximation
                improves. The "elbow" is where adding more components
                stops helping much.
              </>
            }
          >
            <LowRankApproximation />
          </FigureContainer>

          <h2 id="pseudoinverse">The pseudoinverse</h2>

          <p>
            In Post 4, we introduced the least-squares
            formula <InlineMath tex="\hat{x} = (A^\top A)^{-1} A^\top b" />{" "}
            and called <InlineMath tex="(A^\top A)^{-1} A^\top" /> the
            pseudoinverse. But that formula requires the columns
            of <InlineMath tex="A" /> to be linearly independent
            (so <InlineMath tex="A^\top A" /> is invertible). What
            happens when they are not?
          </p>

          <p>
            A rank-deficient matrix sends some directions to zero.
            Those directions cannot be recovered. But the directions
            that survive can be inverted. The SVD separates these
            two cases.
          </p>

          <p>
            Start from the SVD: <InlineMath tex="A = U\Sigma V^\top" />.
            The "inverse" should undo each step. Reverse the output
            rotation (<InlineMath tex="U^\top" />), invert the
            scaling (replace each <InlineMath tex="\sigma_i" /> with{" "}
            <InlineMath tex="1/\sigma_i" />), and reverse the input
            rotation (<InlineMath tex="V" />). For the zero singular
            values, there is nothing to invert: the matrix crushed
            those directions, and no inverse can reconstruct what was
            destroyed. So we leave them at zero.
          </p>

          <Equation
            tex="A^+ = V \Sigma^+ U^\top"
            number={13}
          />

          <p>
            where <InlineMath tex="\Sigma^+" /> is formed by taking the
            reciprocal of each nonzero entry and transposing (to
            handle the rectangular case). Concretely:{" "}
            <InlineMath tex="\Sigma^+_{ii} = 1/\sigma_i" /> if{" "}
            <InlineMath tex="\sigma_i > 0" />, and zero otherwise.
          </p>

          <p>
            This is the Moore-Penrose
            pseudoinverse <Citation numbers={[14]} />. It gives the
            unique matrix satisfying four conditions (the
            Penrose conditions), but you do not need to memorize them.
            The geometric picture is enough: invert what you can,
            leave the rest at zero.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                The pseudoinverse in action. Left: the system{" "}
                <InlineMath tex="Ax = b" /> may have no exact solution
                (when <InlineMath tex="b" /> is outside the column
                space). The pseudoinverse finds the closest point in the
                column space, then maps back to the minimum-norm input.
                Right: adjust the truncation threshold to see how
                discarding small singular values regularizes the
                solution.
              </>
            }
          >
            <PseudoinverseExplorer />
          </FigureContainer>

          <p>
            The pseudoinverse does exactly the right thing in every
            case. For an overdetermined system (more equations than
            unknowns), <InlineMath tex="A^+ b" /> gives the
            least-squares solution: the <InlineMath tex="x" /> that
            minimizes <InlineMath tex="\|Ax - b\|^2" />. For an
            underdetermined system (more unknowns than equations), it
            gives the minimum-norm solution among all exact solutions.
            For a rank-deficient system, it does both simultaneously:
            minimum-norm, least-squares.
            <Sidenote number={9}>
              The pseudoinverse appears throughout the rest of the
              series. In subspace
              identification, you need it
              to recover latent states from the observability estimate.
              In <Link to="/blog/psid/">PSID</Link>, both stages use
              pseudoinverses to extract state sequences from
              projections. In <Link to="/blog/cca/">CCA</Link>, the
              whitening step <InlineMath tex="\Sigma^{-1/2}" /> is
              essentially a partial pseudoinverse of the covariance.
              The SVD-based definition handles all cases cleanly.
            </Sidenote>
          </p>

          <p>
            There is a critical practical point. If some singular values
            are very small (not zero, but close), inverting them
            amplifies noise. A singular value of 0.001 becomes a
            reciprocal of 1000, and any noise in that direction gets
            multiplied by a factor of 1000. The standard fix is to
            treat singular values below a threshold as zero, setting
            their reciprocals to zero instead of computing them.
            This is <em>truncated SVD regularization</em>. It trades
            a small amount of bias (ignoring a real but tiny signal) for
            a large reduction in variance (not amplifying noise). The
            figure above lets you adjust the threshold and see this
            tradeoff directly.
            <Sidenote number={10}>
              The choice of truncation threshold connects to
              Tikhonov regularization (ridge regression). Adding a
              penalty <InlineMath tex="\lambda \|x\|^2" /> to the
              least-squares objective effectively replaces each singular
              value <InlineMath tex="\sigma_i" /> in the pseudoinverse
              with <InlineMath tex="\sigma_i / (\sigma_i^2 + \lambda)" />.
              Large singular values are barely affected; small ones
              are shrunk toward zero. This is softer than the hard
              truncation of the SVD pseudoinverse, but the underlying
              idea is the same: do not trust directions where the
              signal is small relative to the noise.
            </Sidenote>
          </p>

          <h2 id="why-svd-is-everywhere">
            Where the SVD appears
          </h2>

          <p>
            Let's count the places where the SVD has already appeared
            in this series, or will appear in the posts ahead.
          </p>

          <p>
            <strong>PCA</strong> (Post 7). The right singular vectors of
            the centered data matrix are the principal components. The
            squared singular values are proportional to the covariance
            eigenvalues. PCA is the truncated SVD of the data
            matrix. Cunningham and Yu <Citation numbers={[4]} /> review
            PCA and related dimensionality reduction methods for neural
            data.
          </p>

          <p>
            <strong>Least squares and the pseudoinverse.</strong> The
            pseudoinverse <InlineMath tex="A^+" /> gives the
            least-squares solution for any matrix, regardless of rank
            or shape. Truncating small singular values regularizes
            the solution.
          </p>

          <p>
            <strong>Low-rank approximation.</strong> The best
            rank-<InlineMath tex="k" /> approximation to any matrix
            is the truncated SVD. This is the mathematical foundation
            for keeping only the first <InlineMath tex="k" /> principal
            components.
          </p>

          <p>
            <strong>CCA</strong>{" "}
            (<Link to="/blog/cca/">Post 8</Link>). The canonical
            correlations are the singular values of the whitened
            cross-covariance matrix, and the canonical directions are
            its left and right singular vectors. CCA is an SVD after
            whitening.
          </p>

          <p>
            <strong>Procrustes alignment</strong>{" "}
            (<Link to="/blog/procrustes-alignment/">Post 9</Link>). The
            orthogonal matrix that best aligns one dataset to another
            comes from the SVD of their cross-product. If{" "}
            <InlineMath tex="X^\top Y = U\Sigma V^\top" />, the
            optimal rotation
            is <InlineMath tex="R = VU^\top" />. This is the core
            of hyperalignment and shared response
            models <Citation numbers={[7]} />.
          </p>

          <p>
            <strong>Reduced-rank regression</strong>{" "}
            (<Link to="/blog/rrr-dpca/">Post 10</Link>). The optimal
            low-rank predictor comes from the SVD of the regression
            coefficient matrix, constrained to a low-dimensional
            subspace.
          </p>

          <p>
            <strong>Subspace identification.</strong> In the{" "}
            <Link to="/blog/psid/">PSID post</Link>, the latent
            dimensionality of a dynamical system is the number of
            significant singular values of the block Hankel matrix. The
            left singular vectors span the observability subspace. The
            state sequence comes from scaling and projecting.
          </p>

          <FigureContainer
            width="wide"
            caption="Seven methods, one decomposition. Each method forms a different matrix and takes its SVD. The methods differ in what matrix you build and how many components you keep. The SVD is the shared computation."
          >
            <SVDUnifiesAll />
          </FigureContainer>

          <p>
            Seven methods, each reducible to "form a matrix and
            take its SVD." They differ in what matrix you construct
            and how many components you keep.
            <Sidenote number={11}>
              This is not a coincidence. Many problems in applied
              linear algebra reduce to one of two questions: "find the
              best low-rank approximation to this matrix" or "find
              orthonormal bases for the row and column spaces of this
              matrix." The SVD answers both. Any method that can be
              phrased either way will use the SVD, whether or not it
              says so on the label.
            </Sidenote>
          </p>

          <p>
            We now have the complete linear algebra foundation. Vectors,
            bases, linear maps, subspaces, eigendecomposition, and the
            SVD. The next post puts them all together:{" "}
            <Link to="/blog/pca/">PCA</Link>, derived from first
            principles, computed via the SVD, and connected to
            everything we have built.
          </p>

          <h2 id="implementation">Implementation</h2>

          <p>
            In NumPy, the SVD is a single function call. Here is a
            minimal implementation that computes the thin SVD of a
            data matrix, truncates to a chosen rank, and reconstructs
            the approximation:
          </p>

          <CodeBlock language="python" code={`import numpy as np

def truncated_svd(X, k):
    """
    Compute the rank-k truncated SVD of X.

    Parameters
    ----------
    X : array, shape (n, p)
        Data matrix (rows = observations, columns = variables).
    k : int
        Number of components to keep.

    Returns
    -------
    U_k : array, shape (n, k)
        Left singular vectors (score directions).
    s_k : array, shape (k,)
        Singular values.
    Vt_k : array, shape (k, p)
        Right singular vectors (loading directions), transposed.
    """
    # Thin SVD — only compute the min(n, p) components
    U, s, Vt = np.linalg.svd(X, full_matrices=False)

    # Truncate to rank k
    U_k = U[:, :k]
    s_k = s[:k]
    Vt_k = Vt[:k, :]

    return U_k, s_k, Vt_k


def reconstruct(U_k, s_k, Vt_k):
    """Reconstruct the rank-k approximation."""
    return U_k * s_k[np.newaxis, :] @ Vt_k


def pseudoinverse(X, threshold=1e-10):
    """
    Compute the Moore-Penrose pseudoinverse via SVD.

    Singular values below threshold are treated as zero.
    """
    U, s, Vt = np.linalg.svd(X, full_matrices=False)
    s_inv = np.where(s > threshold, 1.0 / s, 0.0)
    return (Vt.T * s_inv[np.newaxis, :]) @ U.T


# ── Example: SVD of simulated neural data ──
rng = np.random.default_rng(42)

# 500 time bins, 100 neurons, true rank ~5
n_time, n_neurons, true_rank = 500, 100, 5
latent = rng.standard_normal((n_time, true_rank))
weights = rng.standard_normal((true_rank, n_neurons))
noise = 0.3 * rng.standard_normal((n_time, n_neurons))
X = latent @ weights + noise

# Center
X = X - X.mean(axis=0)

# Full thin SVD
U, s, Vt = np.linalg.svd(X, full_matrices=False)
print(f"Top 10 singular values: {s[:10].round(1)}")
# Notice the sharp drop after index 5

# Truncate to rank 5
U_k, s_k, Vt_k = truncated_svd(X, k=5)
X_approx = reconstruct(U_k, s_k, Vt_k)

frac = np.sum(s_k**2) / np.sum(s**2)
print(f"Rank-5 captures {frac:.1%} of variance")

# Pseudoinverse
X_pinv = pseudoinverse(X)
print(f"X shape: {X.shape}, X+ shape: {X_pinv.shape}")
# X+ @ X is approximately the identity on the row space`} />

          <p>
            The key detail: always use <code>np.linalg.svd</code> with{" "}
            <code>full_matrices=False</code> for data matrices. The full
            SVD computes an unnecessarily large{" "}
            <InlineMath tex="U" /> matrix (500-by-500 for our example),
            most of which is never used. The thin SVD
            gives <InlineMath tex="U" /> as 500-by-100, which is all you
            need.
            <Sidenote number={12}>
              For very large matrices (millions of rows), even the thin
              SVD is expensive. Randomized SVD
              algorithms <Citation numbers={[15]} /> approximate the
              top <InlineMath tex="k" /> singular values and vectors
              in <InlineMath tex="O(mnk)" /> time instead
              of <InlineMath tex="O(mn \min(m,n))" />, by first
              projecting onto a random low-dimensional subspace. The
              scikit-learn implementation{" "}
              (<code>sklearn.utils.extmath.randomized_svd</code>) is
              the standard choice for neural data matrices too large
              for a direct SVD.
            </Sidenote>
          </p>

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
              Trefethen, L. N. and Bau, D. <em>Numerical Linear
              Algebra</em>. SIAM, 1997.
            </li>
            <li id="ref-9">
              Stewart, G. W. "On the early history of the singular
              value decomposition,"{" "}
              <em>SIAM Review</em>, vol. 35, no. 4, pp. 551-566, 1993.
            </li>
            <li id="ref-10">
              Gavish, M. and Donoho, D. L. "The optimal hard threshold
              for singular values is 4/√3,"{" "}
              <em>IEEE Transactions on Information Theory</em>, vol. 60,
              no. 8, pp. 5040-5053, 2014.
            </li>
            <li id="ref-11">
              Eckart, C. and Young, G. "The approximation of one matrix
              by another of lower rank,"{" "}
              <em>Psychometrika</em>, vol. 1, no. 3, pp. 211-218, 1936.
            </li>
            <li id="ref-12">
              Hotelling, H. "Relations between two sets of variates,"{" "}
              <em>Biometrika</em>, vol. 28, no. 3-4, pp. 321-377, 1936.
            </li>
            <li id="ref-13">
              Golub, G. H. and Van Loan, C. F.{" "}
              <em>Matrix Computations</em>, 4th ed.
              Johns Hopkins University Press, 2013.
            </li>
            <li id="ref-14">
              Penrose, R. "A generalized inverse for matrices,"{" "}
              <em>Mathematical Proceedings of the Cambridge
              Philosophical Society</em>, vol. 51, no. 3,
              pp. 406-413, 1955.
            </li>
            <li id="ref-15">
              Halko, N., Martinsson, P. G., and Tropp, J. A.
              "Finding structure with randomness: probabilistic
              algorithms for constructing approximate matrix
              decompositions,"{" "}
              <em>SIAM Review</em>, vol. 53, no. 2, pp. 217-288, 2011.
            </li>
          </ol>
        </div>

        <SeriesNav part={6} />

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
    The singular value decomposition &mdash; Felix Taschbach
  </title>
)

export default SVDPost
