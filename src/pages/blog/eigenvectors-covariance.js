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
import ChangeOfBasisExplorer from "../../components/blog/ChangeOfBasisExplorer"
import SimilarityExplorer from "../../components/blog/SimilarityExplorer"
import OuterProductExplorer from "../../components/blog/OuterProductExplorer"
import EigenExplorer from "../../components/blog/EigenExplorer"
import CovarianceEllipseExplorer from "../../components/blog/CovarianceEllipseExplorer"
import SpectralTheoremExplorer from "../../components/blog/SpectralTheoremExplorer"

const TOC_ITEMS = [
  { id: "simple-directions", label: "Directions that stay put" },
  { id: "eigenvectors", label: "Eigenvectors and eigenvalues" },
  { id: "diagonalization", label: "Diagonalization" },
  { id: "covariance", label: "The covariance matrix" },
  { id: "spectral", label: "The spectral theorem" },
  { id: "the-bridge-to-pca", label: "What comes next" },
  { id: "references", label: "References" },
]

const EigenvectorsCovariancePost = () => {
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
            Eigenvectors and covariance
          </h1>
          <p className="blog-post__subtitle">
            Finding the directions a transformation leaves alone.
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
                Linear Algebra for Neural Data, Part 5
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          {/* ===================================================================
              Section 1 — Directions That Stay Put
              =================================================================== */}
          <h2 id="simple-directions">Directions that stay put</h2>

          <p>
            Take a matrix and apply it to a vector. In general, the
            output points in a different direction than the input. The
            vector gets rotated, sheared, sent somewhere new. That is
            what matrices do.
          </p>

          <p>
            But try this specific matrix and this specific vector:
          </p>

          <Equation
            tex={`\\begin{bmatrix} 3 & 1 \\\\ 0 & 2 \\end{bmatrix}
\\begin{bmatrix} 1 \\\\ 0 \\end{bmatrix}
= \\begin{bmatrix} 3 \\\\ 0 \\end{bmatrix}`}
            number={1}
          />

          <p>
            The input is <InlineMath tex="(1, 0)" />. The output
            is <InlineMath tex="(3, 0)" />. Same direction. The
            vector was stretched by a factor of 3, but it did not
            rotate. The matrix, which in general rotates and shears
            everything, left this particular direction alone.
          </p>

          <p>
            Is that a coincidence of the input we chose? Let's try
            another:
          </p>

          <Equation
            tex={`\\begin{bmatrix} 3 & 1 \\\\ 0 & 2 \\end{bmatrix}
\\begin{bmatrix} 1 \\\\ -1 \\end{bmatrix}
= \\begin{bmatrix} 2 \\\\ -2 \\end{bmatrix}`}
            number={2}
          />

          <p>
            The input is <InlineMath tex="(1, -1)" />. The output
            is <InlineMath tex="(2, -2)" />. Again: same direction,
            just scaled, this time by a factor of 2. A second direction
            that the matrix does not rotate.
          </p>

          <p>
            Now try something generic,
            like <InlineMath tex="(1, 1)" />:{" "}
            <InlineMath tex="A(1,1) = (4, 2)" />. That is not a
            multiple of <InlineMath tex="(1, 1)" />. This vector
            does get rotated. So the property is special to particular
            directions.
          </p>

          <p>
            These special directions are called <em>eigenvectors</em>,
            and they turn out to be the key to PCA, to stability
            analysis in dynamical systems, and to understanding
            covariance matrices.
          </p>

          {/* ===================================================================
              Section 2 — Eigenvectors and Eigenvalues
              =================================================================== */}
          <h2 id="eigenvectors">Eigenvectors and eigenvalues</h2>

          <p>
            A direction that a matrix scales but does not rotate is
            called an <em>eigenvector</em>. The scale factor is its{" "}
            <em>eigenvalue</em>. In symbols:
          </p>

          <Equation
            tex="Av = \lambda v"
            number={3}
          />

          <p>
            The matrix <InlineMath tex="A" /> acts
            on <InlineMath tex="v" /> and produces the same
            vector <InlineMath tex="v" />, multiplied by the
            number <InlineMath tex="\lambda" />. For the matrix above,
            we found two eigenvectors: <InlineMath tex="(1, 0)" /> with
            eigenvalue 3, and <InlineMath tex="(1, -1)" /> with
            eigenvalue 2.
          </p>

          <p>
            What does the eigenvalue tell you? If{" "}
            <InlineMath tex="\lambda > 1" />, the vector gets
            stretched. If <InlineMath tex="0 < \lambda < 1" />, it
            gets compressed. If <InlineMath tex="\lambda < 0" />, it
            gets flipped. If <InlineMath tex="\lambda = 0" />, it gets
            sent to zero: the matrix annihilates that direction
            entirely. (That is a null-space direction, from the previous
            post.)
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                A circle of unit vectors deforms into an ellipse under
                the transformation. The highlighted directions are
                eigenvectors: they scale but do not rotate.
                Click <em>Diagonalize</em> to switch to the eigenvector
                basis and watch the matrix simplify.
              </>
            }
          >
            <EigenExplorer />
          </FigureContainer>

          <p>
            Watch the figure. A circle of unit vectors gets
            mapped to an ellipse. Most directions change angle. But the
            eigenvector directions stay on their original line: they
            land on the ellipse at exactly the point you would reach by
            walking along the same direction, just farther or closer to
            the origin. The eigenvalue is the stretch
            factor.
            <Sidenote number={1}>
              Some matrices have fewer
              than <InlineMath tex="n" /> independent eigenvectors
              (defective matrices). Others have complex eigenvalues,
              which correspond to rotations rather than pure scalings.
              We set both aside here. Complex eigenvalues will matter in
              the dynamics posts, where they produce oscillations.
            </Sidenote>
          </p>

          <p>
            For neural dynamics, eigenvalues control stability. If your
            system evolves
            as <InlineMath tex="x_{t+1} = Ax_t" />, then along an
            eigenvector direction the system simply
            scales: <InlineMath tex="A^k v = \lambda^k v" />. When{" "}
            <InlineMath tex="|\lambda| < 1" />, the component
            decays. When <InlineMath tex="|\lambda| > 1" />, it
            explodes. The eigenvalues are the knobs controlling how
            each independent mode of the dynamics grows or shrinks.
          </p>

          {/* ===================================================================
              Section 3 — The Basis Where Everything Simplifies
              =================================================================== */}
          <h2 id="diagonalization">
            Diagonalization
          </h2>

          <p>
            In <Link to="/blog/bases-coordinates/">Post 2</Link>, we
            said that the same transformation looks different in different
            bases. A messy matrix in one basis might become simple in
            another. Eigenvectors tell you which basis makes it simplest.
          </p>

          <p>
            Our matrix has eigenvectors{" "}
            <InlineMath tex="v_1 = (1, 0)" /> and{" "}
            <InlineMath tex="v_2 = (1, -1)" />. These are two
            independent vectors, so they form a basis. What does the
            matrix look like in this basis?
          </p>

          <p>
            In the eigenvector basis, the matrix sends{" "}
            <InlineMath tex="v_1" /> to{" "}
            <InlineMath tex="3v_1" /> and{" "}
            <InlineMath tex="v_2" /> to{" "}
            <InlineMath tex="2v_2" />. No mixing between the two
            directions. The matrix, which in the standard basis had an
            off-diagonal entry (the 1 in the top-right corner, coupling
            the two coordinates), becomes diagonal:
          </p>

          <Equation
            tex={`A_{\\text{eigenbasis}} = \\begin{bmatrix} 3 & 0 \\\\ 0 & 2 \\end{bmatrix}`}
            number={4}
          />

          <p>
            Each axis scales independently. No cross-talk. This is
            the <em>eigendecomposition</em>. Stack the eigenvectors as
            columns of a matrix <InlineMath tex="V" /> and the
            eigenvalues on the diagonal
            of <InlineMath tex="\Lambda" />:
          </p>

          <Equation
            tex="A = V \Lambda V^{-1}"
            number={5}
          />

          <p>
            Read this as a three-step process. Convert from the
            standard basis to the eigenvector basis (multiply
            by <InlineMath tex="V^{-1}" />). Scale each coordinate
            independently by its eigenvalue (multiply
            by <InlineMath tex="\Lambda" />). Convert back (multiply
            by <InlineMath tex="V" />). In the eigenvector basis, the
            transformation has no mixing between dimensions. All the
            complexity of the matrix was just a consequence of looking
            at it in the wrong coordinates.
          </p>

          <FigureContainer
            width="page"
            caption={
              <>
                Same transformation, two bases. Drag the right-panel
                basis to find the coordinates that make the matrix
                simplest. The eigenvalues (shown below) never change.
              </>
            }
          >
            <SimilarityExplorer />
          </FigureContainer>

          <p>
            The eigenvalues are
            invariant. Switch to any basis and they stay the same:
            they are a property of the transformation, not of the
            coordinates. The trace (sum of diagonal entries)
            equals <InlineMath tex="\lambda_1 + \lambda_2 + \cdots + \lambda_n" />.
            The determinant
            equals <InlineMath tex="\lambda_1 \cdot \lambda_2 \cdots \lambda_n" />.
            Both are invariant too. The entries of the matrix change
            with the basis. These quantities do
            not.
            <Sidenote number={2}>
              Two matrices related
              by <InlineMath tex="B = P^{-1}AP" /> for some
              invertible <InlineMath tex="P" /> are
              called <em>similar</em>. Similar matrices represent the
              same transformation in different bases. They share
              eigenvalues, trace, determinant, and rank.
            </Sidenote>
          </p>

          {/* ===================================================================
              Section 4 — How Neurons Co-Fluctuate
              =================================================================== */}
          <h2 id="covariance">The covariance matrix</h2>

          <p>
            Now let's build a specific matrix from neural data and see
            what its eigenvectors tell us.
          </p>

          <p>
            You record from two neurons over many time bins.
            Center the data: subtract each neuron's mean, so the average
            firing rate is zero. At each time
            bin <InlineMath tex="t" />, you have a centered firing-rate
            vector <InlineMath tex="x_t = (x_{t,1},\; x_{t,2})" />.
          </p>

          <p>
            Take one time bin and form the <em>outer product</em>:{" "}
            <InlineMath tex="x_t x_t^\top" />. This is a 2-by-2 matrix:
          </p>

          <Equation
            tex={`x_t\\, x_t^\\top =
\\begin{bmatrix} x_{t,1} \\\\ x_{t,2} \\end{bmatrix}
\\begin{bmatrix} x_{t,1} & x_{t,2} \\end{bmatrix}
= \\begin{bmatrix} x_{t,1}^2 & x_{t,1}\\, x_{t,2} \\\\
x_{t,2}\\, x_{t,1} & x_{t,2}^2 \\end{bmatrix}`}
            number={6}
          />

          <p>
            The diagonal entries are the squared firing rates. The
            off-diagonal entries are the products of the two neurons'
            rates. If both neurons fire above their mean at the same
            time, the off-diagonal product is positive. If one is above
            and the other below, it is negative. This one matrix
            captures the pattern of co-activation at a single moment.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Drag <InlineMath tex="u" /> and <InlineMath tex="v" /> to
                see the outer product matrix update. The heatmap shows
                how each entry is the product of one component
                from <InlineMath tex="u" /> and one
                from <InlineMath tex="v" />.
              </>
            }
          >
            <OuterProductExplorer />
          </FigureContainer>

          <p>
            Notice that each outer product has rank 1: every row is a
            scaled copy of every other row. One moment of data
            gives you a rank-1 snapshot of co-fluctuation.
          </p>

          <p>
            Now average over all time bins:
          </p>

          <Equation
            tex="C = \frac{1}{T} \sum_{t=1}^{T} x_t\, x_t^\top = \frac{1}{T}\, X^\top X"
            number={7}
          />

          <p>
            where <InlineMath tex="X" /> is the centered data matrix
            (rows are time bins, columns are neurons). This
            is the <em>covariance matrix</em>.
            Entry <InlineMath tex="C_{jk}" /> tells you how much
            neurons <InlineMath tex="j" /> and <InlineMath tex="k" />{" "}
            tend to fluctuate together.
            Entry <InlineMath tex="C_{jj}" /> is the variance of
            neuron <InlineMath tex="j" />.
            <Sidenote number={3}>
              Equation (7) uses <InlineMath tex="T" /> in the
              denominator rather than <InlineMath tex="T-1" />. The
              sample covariance uses <InlineMath tex="T-1" />, which
              corrects for bias. The distinction does not matter for our
              purposes. What matters: always center first. If you forget,
              the first principal component may simply point toward the
              mean instead of capturing variance.
              Cunningham and Yu <Citation numbers={[4]} /> and
              Yu et al. <Citation numbers={[8]} /> (GPFA) both work
              with centered covariance structure as the starting point
              for neural dimensionality reduction.
            </Sidenote>
          </p>

          <p>
            Let's make this concrete. Suppose your two neurons have
            covariance matrix:
          </p>

          <Equation
            tex={`C = \\begin{bmatrix} 4 & 3 \\\\ 3 & 9 \\end{bmatrix}`}
            number={8}
          />

          <p>
            Neuron 1 has variance 4, neuron 2 has variance 9, and
            their covariance is 3 (positively correlated: when one is
            above its mean, the other tends to be too). The total
            variance is <InlineMath tex="4 + 9 = 13" />, which is the
            trace.
          </p>

          <p>
            Now: what are this matrix's eigenvectors?
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                The covariance ellipse of a 2D neural population.
                Drag the direction vector to read off the variance
                along any direction (<InlineMath tex="z^\top C z" />).
                The maximum and minimum coincide with the eigenvectors.
              </>
            }
          >
            <CovarianceEllipseExplorer />
          </FigureContainer>

          {/* ===================================================================
              Section 5 — Why Covariance Matrices Are Special
              =================================================================== */}
          <h2 id="spectral">The spectral theorem</h2>

          <p>
            The covariance matrix has two properties that make it much
            easier to work with than a general matrix.
          </p>

          <p>
            First, it is <em>symmetric</em>:{" "}
            <InlineMath tex="C = C^\top" />. The covariance of neuron 1
            with neuron 2 equals the covariance of neuron 2 with
            neuron 1. This follows from the outer
            product: <InlineMath tex="x_{t,1} x_{t,2} = x_{t,2} x_{t,1}" />.
          </p>

          <p>
            Second, it is <em>positive semidefinite</em>: for any
            vector <InlineMath tex="z" />,
          </p>

          <Equation
            tex="z^\top C\, z \;\geq\; 0"
            number={9}
          />

          <p>
            Why? Expand
            it: <InlineMath tex="z^\top C z = \frac{1}{T} \sum_t (x_t^\top z)^2" />.
            A sum of squares. Always nonnegative. The
            quantity <InlineMath tex="z^\top C z" /> has a name: it is
            the variance of the data projected onto the
            direction <InlineMath tex="z" />. So equation (9) says
            variance is never negative. Good.
          </p>

          <p>
            These two properties together give the spectral theorem.
            For a symmetric matrix:
          </p>

          <p>
            The eigenvectors are <em>orthogonal</em>. They point in
            perpendicular directions. And the eigenvalues are all real
            numbers (no complex eigenvalues, no oscillations).
          </p>

          <p>
            For a positive semidefinite matrix, the eigenvalues are
            additionally nonnegative. The proof is one line:
            if <InlineMath tex="Cv = \lambda v" />,
            then <InlineMath tex="v^\top C v = \lambda \|v\|^2" />,
            and <InlineMath tex="v^\top C v \geq 0" /> since{" "}
            <InlineMath tex="C" /> is PSD,
            so <InlineMath tex="\lambda \geq 0" />. Zero eigenvalues
            mean the data do not move in that direction. Positive
            eigenvalues mean there is real variance there.
          </p>

          <p>
            So the eigendecomposition of the covariance matrix simplifies
            to:
          </p>

          <Equation
            tex="C = V \Lambda V^\top"
            number={10}
          />

          <p>
            where <InlineMath tex="V" /> is orthogonal (its columns
            are perpendicular, each of unit
            length) and <InlineMath tex="\Lambda" /> is diagonal with
            nonnegative entries. Compare this to the general
            eigendecomposition{" "}
            <InlineMath tex="A = V \Lambda V^{-1}" /> from
            equation (5). For symmetric matrices,{" "}
            <InlineMath tex="V^{-1} = V^\top" />. The inverse is
            the transpose. Free. No computation. This is the payoff
            of orthogonality we saw in the basis
            post.
            <Sidenote number={4}>
              The spectral theorem says: every real symmetric matrix
              can be diagonalized by an orthogonal change of basis,
              with real eigenvalues. Most of multivariate statistics
              rests on this single fact.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                The spectral theorem in action. Step through{" "}
                <InlineMath tex="Q^\top" /> (align eigenvectors),{" "}
                <InlineMath tex="\Lambda" /> (scale by eigenvalues),{" "}
                <InlineMath tex="Q" /> (rotate back). A symmetric matrix
                is a rotation, a scaling, and the reverse rotation.
              </>
            }
          >
            <SpectralTheoremExplorer />
          </FigureContainer>

          <p>
            Let's find the eigenvectors of our covariance
            matrix <InlineMath tex="C" /> from equation (8). Solving
            the characteristic
            equation <InlineMath tex="\det(C - \lambda I) = 0" />:{" "}
            <InlineMath tex="(4 - \lambda)(9 - \lambda) - 9 = 0" />,
            which gives{" "}
            <InlineMath tex="\lambda^2 - 13\lambda + 27 = 0" />.
            The eigenvalues
            are <InlineMath tex="\lambda_1 \approx 10.3" /> and{" "}
            <InlineMath tex="\lambda_2 \approx 2.7" />.
          </p>

          <p>
            Check: <InlineMath tex="10.3 + 2.7 = 13" />, which is
            the trace (total variance). The eigenvalues split the total
            variance into two perpendicular components. The first
            eigenvector direction captures 10.3 out of 13 units of
            variance. The second captures 2.7. Most of the action is
            along one direction.
          </p>

          <p>
            That direction is the first principal component.
          </p>

          <p>
            How did we find those eigenvalues? We solved the
            characteristic
            equation <InlineMath tex="\det(C - \lambda I) = 0" />,
            which gives a polynomial whose roots are the eigenvalues.
            For a 2-by-2 matrix this is a quadratic; for
            an <InlineMath tex="n \times n" /> matrix it is
            degree <InlineMath tex="n" />. Once you have the
            eigenvalues, the eigenvectors come from finding the null
            space of <InlineMath tex="C - \lambda I" /> for
            each <InlineMath tex="\lambda" />.
            <Sidenote number={5}>
              Nobody solves the characteristic equation for large
              matrices. Iterative methods (QR algorithm, Lanczos) find
              eigenvalues without forming the polynomial. But the
              characteristic equation is the right way to understand
              what eigenvalues are: roots of a polynomial defined by
              the matrix.
            </Sidenote>
          </p>

          <p>
            Polynomials can have complex roots. A rotation matrix
            like <InlineMath tex="\bigl(\begin{smallmatrix} 0 & -1 \\ 1 & 0 \end{smallmatrix}\bigr)" />{" "}
            has eigenvalues <InlineMath tex="\pm i" />: no real
            direction is preserved, because a 90-degree rotation moves
            every direction. Complex eigenvalues come in conjugate
            pairs <InlineMath tex="a \pm bi" />,
            where <InlineMath tex="a" /> controls growth/decay
            and <InlineMath tex="b" /> controls rotation rate. For
            neural dynamics, complex eigenvalues mean the system
            oscillates. The rotational dynamics in motor
            cortex <Citation numbers={[3]} /> correspond to complex
            eigenvalues of the estimated transition matrix.
          </p>

          <p>
            Matrix powers make this precise.
            From <InlineMath tex="A = V\Lambda V^{-1}" />,
            raising to the <InlineMath tex="k" />-th power
            gives <InlineMath tex="A^k = V\Lambda^k V^{-1}" />.
            Each eigenvalue gets raised independently. A real eigenvalue
            with <InlineMath tex="|\lambda| < 1" /> decays
            exponentially; with <InlineMath tex="|\lambda| > 1" />, it
            explodes. A complex eigenvalue
            with <InlineMath tex="|\lambda| < 1" /> spirals inward;
            with <InlineMath tex="|\lambda| = 1" />, it orbits
            forever.
          </p>

          <p>
            One more tool the covariance matrix gives us. Take a unit
            vector <InlineMath tex="z" /> and
            compute <InlineMath tex="z^\top C\, z" />. Expanding
            with <InlineMath tex="C = \tfrac{1}{T} X^\top X" />
            gives <InlineMath tex="\tfrac{1}{T}\sum_t (x_t \cdot z)^2" />:
            the variance of the data projected onto
            direction <InlineMath tex="z" />. This is a <em>quadratic
            form</em>. The covariance matrix encodes a variance field:
            point in any direction and read off the spread. The
            eigenvectors are where this field is extremal: the largest
            eigenvalue is the maximum variance in any direction.
          </p>

          <p>
            What if you want all directions to have the <em>same</em>{" "}
            variance? Define <InlineMath tex="W = \Lambda^{-1/2} V^\top" />{" "}
            and transform:{" "}
            <InlineMath tex="\tilde{x}_t = Wx_t" />. The new
            covariance
            is <InlineMath tex="WCW^\top = \Lambda^{-1/2} V^\top V \Lambda V^\top V \Lambda^{-1/2} = I" />.
            This is <em>whitening</em>: rotate to the eigenvector basis,
            then scale each direction by one over its standard
            deviation. The result has unit variance in every direction
            and zero correlation between directions. CCA needs this
            preprocessing to work, and we will see why
            in <Link to="/blog/cca/">that post</Link>.
          </p>

          {/* ===================================================================
              Section 6 — The Bridge to PCA
              =================================================================== */}
          <h2 id="the-bridge-to-pca">What comes next</h2>

          <p>
            We now have all the pieces. A neural population's
            firing-rate data gives you a covariance matrix. That matrix
            is symmetric and positive semidefinite, so the spectral
            theorem applies: it can be diagonalized by an orthogonal
            matrix of eigenvectors, with nonnegative eigenvalues on the
            diagonal.
          </p>

          <p>
            The eigenvectors are perpendicular directions. In the
            eigenvector basis, the covariance matrix is diagonal:
            each direction has its own variance, and there is no
            correlation between directions. The eigenvalues tell you
            the variance along each eigenvector direction: the largest
            eigenvalue picks out the direction of maximum spread, the
            second-largest picks out the direction of maximum spread
            perpendicular to the first, and so on.
          </p>

          <p>
            And because the eigenvector basis is orthonormal, extracting
            coordinates is just dot products (equation (2) from{" "}
            <Link to="/blog/bases-coordinates/">Post 2</Link>).
            Reconstructing from a subset of coordinates is just the
            truncated sum (equation (4) from that same post). Keep the
            first <InlineMath tex="k" /> eigenvectors — the ones with
            the largest eigenvalues — and you capture as much variance
            as possible in <InlineMath tex="k" /> dimensions.
          </p>

          <p>
            That is PCA. No new operation. It is the spectral theorem
            applied to the covariance matrix, combined with the
            truncated reconstruction formula from the basis post. Every
            concept in this series played a role: vectors as population
            states, independence as the number of real dimensions, dot
            products as coordinates, basis change as the core modeling
            decision, column space as what a matrix preserves,
            projection as the best approximation in a subspace, and
            eigenvectors as the directions that make the covariance
            matrix diagonal.
          </p>

          <p>
            One decomposition ties everything together. The singular
            value decomposition factorizes any matrix — square or
            rectangular, symmetric or not — into a rotation, a scaling,
            and another rotation. It turns out to be the computational
            backbone of PCA, CCA, least squares, and subspace
            identification. That is
            the <Link to="/blog/svd/">next post</Link>.
          </p>

          {/* ===================================================================
              References
              =================================================================== */}
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
              Yu, B. M., Cunningham, J. P., Santhanam, G., et al.
              "Gaussian-process factor analysis for low-dimensional
              single-trial analysis of neural population activity,"{" "}
              <em>Journal of Neurophysiology</em>, vol. 102, no. 1,
              pp. 614-635, 2009.
            </li>
          </ol>
        </div>

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
    Eigenvectors and covariance &mdash; Felix Taschbach
  </title>
)

export default EigenvectorsCovariancePost
