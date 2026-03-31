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
import ColumnNullSpaceExplorer from "../../components/blog/ColumnNullSpaceExplorer"
import FourSubspacesExplorer from "../../components/blog/FourSubspacesExplorer"
import SubspaceProjectionExplorer from "../../components/blog/SubspaceProjectionExplorer"
import NullSpaceMotorCortex from "../../components/blog/NullSpaceMotorCortex"

const TOC_ITEMS = [
  { id: "what-gets-destroyed", label: "What gets destroyed" },
  { id: "column-space", label: "The column space" },
  { id: "null-space", label: "The null space" },
  { id: "rank-nullity", label: "Rank and nullity" },
  { id: "four-subspaces", label: "The four subspaces" },
  { id: "projection", label: "Projection and least squares" },
  { id: "what-comes-next", label: "What comes next" },
  { id: "references", label: "References" },
]

const SubspacesRankProjectionPost = () => {
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
            Subspaces, rank, and projection
          </h1>
          <p className="blog-post__subtitle">
            Column spaces, null spaces, and what a linear map preserves
            and destroys.
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
                Linear Algebra for Neural Data, Part 4
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          {/* ===================================================================
              Section 1 — What Gets Destroyed?
              =================================================================== */}
          <h2 id="what-gets-destroyed">What gets destroyed</h2>

          <p>
            In the <Link to="/blog/matrices-linear-maps/">previous
            post</Link>, we had a decoder matrix that mapped
            3-dimensional neural activity to 2-dimensional hand
            velocity:
          </p>

          <Equation
            tex={`A = \\begin{bmatrix} 0.3 & 0.1 & -0.2 \\\\ -0.1 & 0.4 & 0.1 \\end{bmatrix}`}
            number={1}
          />

          <p>
            Three numbers go in. Two come out. That means something is
            being lost. Not just "some precision" or "some detail" —
            an entire dimension of information is being annihilated.
            There must be directions in the 3-dimensional input space
            that this matrix sends to zero, directions where the neural
            activity changes but the predicted velocity does not.
          </p>

          <p>
            Can we find one? We need a
            vector <InlineMath tex="x" /> such
            that <InlineMath tex="Ax = 0" />. That
            means <InlineMath tex="0.3x_1 + 0.1x_2 - 0.2x_3 = 0" />{" "}
            and <InlineMath tex="-0.1x_1 + 0.4x_2 + 0.1x_3 = 0" />.
            From the first
            equation, <InlineMath tex="x_3 = 1.5x_1 + 0.5x_2" />.
            Substituting into the
            second: <InlineMath tex="-0.1x_1 + 0.4x_2 + 0.1(1.5x_1 + 0.5x_2) = 0" />,
            which
            simplifies to <InlineMath tex="0.05x_1 + 0.45x_2 = 0" />,
            giving <InlineMath tex="x_1 = -9x_2" />.
            Setting <InlineMath tex="x_2 = 1" />:{" "}
            <InlineMath tex="x = (-9,\; 1,\; -13)" />.
          </p>

          <p>
            Let's check. Does <InlineMath tex="Ax = 0" />?
            First
            row: <InlineMath tex="0.3(-9) + 0.1(1) + (-0.2)(-13) = -2.7 + 0.1 + 2.6 = 0" />.
            Second
            row: <InlineMath tex="(-0.1)(-9) + 0.4(1) + 0.1(-13) = 0.9 + 0.4 - 1.3 = 0" />.
            Yes. This vector is invisible to the decoder. A neuron can
            change its firing rate along this direction and the
            predicted velocity will not budge.
          </p>

          <p>
            This post is about what a matrix preserves and what it
            destroys. Every matrix carries this structure: a set of
            directions that survive the map and a set that get
            annihilated. Understanding this split is what makes
            dimensionality reduction, least-squares fitting, and
            subspace identification precise.
          </p>

          {/* ===================================================================
              Section 2 — What a Matrix Can Produce
              =================================================================== */}
          <h2 id="column-space">The column space</h2>

          <p>
            Start with the output side. What are all the possible
            outputs of the decoder <InlineMath tex="A" />?
          </p>

          <p>
            From the column picture in the previous post, we know
            that <InlineMath tex="Ax" /> is always a linear combination
            of the columns of <InlineMath tex="A" />. So the set of
            all possible outputs is the span of those columns. This
            set is the <em>column space</em> of <InlineMath tex="A" />.
          </p>

          <p>
            Our decoder has
            columns <InlineMath tex="a_1 = (0.3, -0.1)" />,{" "}
            <InlineMath tex="a_2 = (0.1, 0.4)" />,{" "}
            <InlineMath tex="a_3 = (-0.2, 0.1)" />. These are three
            vectors in <InlineMath tex="\mathbb{R}^2" />. Can three
            2-dimensional vectors be independent? No. In two dimensions,
            at most two vectors can be independent. The third must be a
            combination of the first two.
          </p>

          <p>
            Let's check. Is <InlineMath tex="a_3" /> a combination
            of <InlineMath tex="a_1" /> and <InlineMath tex="a_2" />?
            We
            need <InlineMath tex="\alpha(0.3, -0.1) + \beta(0.1, 0.4) = (-0.2, 0.1)" />.
            First
            component: <InlineMath tex="0.3\alpha + 0.1\beta = -0.2" />.
            Second: <InlineMath tex="-0.1\alpha + 0.4\beta = 0.1" />.
            From the
            first: <InlineMath tex="\alpha = (-0.2 - 0.1\beta) / 0.3" />.
            Substituting and
            solving: <InlineMath tex="\beta \approx 0.154" />,{" "}
            <InlineMath tex="\alpha \approx -0.718" />. So yes,{" "}
            <InlineMath tex="a_3" /> is in the span
            of <InlineMath tex="a_1" /> and <InlineMath tex="a_2" />.
          </p>

          <p>
            The column space is all of{" "}
            <InlineMath tex="\mathbb{R}^2" />: this decoder can produce
            any velocity vector. Two independent columns in a
            2-dimensional output space is enough to fill it. The third
            column adds no new reachable outputs.
          </p>

          <p>
            Now consider a different situation. Suppose the decoder
            has columns <InlineMath tex="(1, 2)" />,{" "}
            <InlineMath tex="(2, 4)" />, <InlineMath tex="(3, 6)" />.
            Every column is a multiple of <InlineMath tex="(1, 2)" />.
            The column space is a single line through the origin. This
            decoder can only produce velocities along one direction,
            regardless of what the neural population does. The output
            is trapped on that line.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Drag the columns of the matrix. The column space (green)
                is their span. When the columns become dependent, the
                rank drops and a null-space direction (gold) appears.
              </>
            }
          >
            <ColumnNullSpaceExplorer />
          </FigureContainer>

          <p>
            The <em>rank</em> of a matrix is the dimension of its
            column space: the number of independent columns. Our
            original decoder has rank 2 (two independent columns in a
            2-dimensional output). The degenerate decoder has rank 1
            (all columns lie along one line). Rank tells you the
            effective dimensionality of the map's output, not the
            nominal size of the matrix.
            <Sidenote number={1}>
              For neural data, the useful notion is "effective rank."
              A 500-by-100 data matrix is nearly always full rank
              because of noise, but most of that rank is noise-driven.
              The useful rank is the number of dimensions carrying
              substantial variance, which is what PCA eigenvalues
              quantify. Cunningham and Yu <Citation numbers={[4]} />{" "}
              review methods for estimating effective dimensionality
              in neural populations.
            </Sidenote>
          </p>

          {/* ===================================================================
              Section 3 — What a Matrix Kills
              =================================================================== */}
          <h2 id="null-space">The null space</h2>

          <p>
            We already found one vector that the decoder sends to
            zero: <InlineMath tex="(-9, 1, -13)" />. Any scalar
            multiple of this vector also gets sent to zero (the map is
            linear: if <InlineMath tex="Ax = 0" />,
            then <InlineMath tex="A(cx) = cAx = c \cdot 0 = 0" />).
            The set of all inputs that the matrix
            kills is the <em>null space</em>.
          </p>

          <p>
            For our decoder, the null space is a line in 3-dimensional
            space: all multiples
            of <InlineMath tex="(-9, 1, -13)" />. Neural activity can
            vary freely along this line without changing the decoded
            velocity at all. The decoder is blind to it.
          </p>

          <p>
            This is not just a mathematical curiosity. In neuroscience,
            the null space of a decoder has a specific interpretation:
            it is the set of neural activity patterns that produce no
            behavioral output. Kaufman et al. showed that preparatory
            activity in motor cortex lives largely in the null space of
            the neural-to-muscle
            map.
            <Sidenote number={2}>
              Kaufman et al. <Citation numbers={[8]} /> demonstrated
              that preparatory neural activity in motor cortex is
              largely confined to directions that do not drive muscles.
              The language of null spaces makes this finding precise:
              preparation involves large changes in neural state along
              directions that the motor output mapping annihilates.
            </Sidenote>
            {" "}The population state changes significantly during
            planning, but those changes are confined to directions the
            downstream readout ignores. Large neural changes, zero
            behavioral effect.
          </p>

          <FigureContainer
            width="outset"
            caption="Drag the neural state. Movement along the null-space direction (gold) does not change the decoded output. Movement along the output direction (teal) does. The decoder is blind to the null space."
          >
            <NullSpaceMotorCortex />
          </FigureContainer>

          <p>
            The dimension of the null space is
            the <em>nullity</em>. For our 2-by-3 decoder, the null
            space is 1-dimensional (a line). If the matrix were 2-by-100
            (a realistic decoder), the null space would be
            98-dimensional. Out of 100 possible directions of neural
            activity, only 2 would affect the output. The other 98
            would be invisible.
          </p>

          {/* ===================================================================
              Section 4 — The Conservation Law
              =================================================================== */}
          <h2 id="rank-nullity">Rank and nullity</h2>

          <p>
            Look at the numbers. Our decoder is 2-by-3. It has rank 2
            (two independent columns) and nullity 1 (a 1-dimensional
            null space). Notice: 2 + 1 = 3, the number of columns.
          </p>

          <p>
            This is not a coincidence. It is a theorem:
          </p>

          <Equation
            tex="\text{rank}(A) + \text{nullity}(A) = n"
            number={2}
          />

          <p>
            where <InlineMath tex="n" /> is the number of columns (the
            dimension of the input space). Directions preserved plus
            directions destroyed equals the total number of input
            dimensions. Nothing is unaccounted for. Every input
            direction either survives the map or gets annihilated; none
            falls through the cracks.
          </p>

          <p>
            For a 2-by-100 neural decoder: rank at most 2, so nullity
            at least 98. The vast majority of neural activity patterns
            are invisible to the decoder. This is not a deficiency of
            the decoder. It is arithmetic: a 2-dimensional output
            simply cannot distinguish among 100-dimensional inputs. At
            most 2 directions survive.
          </p>

          <p>
            For a 500-by-100 data matrix (500 time points, 100
            neurons): if the rank is 10, then the nullity is 90. The
            population's activity is confined near a 10-dimensional
            subspace. The other 90 dimensions are the directions along
            which the data does not move (or moves only due to noise).
            Finding those 10 directions is what dimensionality reduction
            does.
          </p>

          {/* ===================================================================
              Section 5 — The Full Picture
              =================================================================== */}
          <h2 id="four-subspaces">The four subspaces</h2>

          <p>
            The column space lives in the output. The null space lives
            in the input. Is there a way to see both sides at once?
          </p>

          <p>
            An <InlineMath tex="m \times n" /> matrix
            connects two spaces: the
            input <InlineMath tex="\mathbb{R}^n" /> and the
            output <InlineMath tex="\mathbb{R}^m" />. Each of these
            spaces splits into two perpendicular pieces, giving four
            subspaces in
            all <Citation numbers={[6]} />.
          </p>

          <p>
            On the input side: the <em>row space</em> (the span of the
            rows of <InlineMath tex="A" />) and the null space. These
            are perpendicular to each other and together they fill the
            entire input space. Every input vector splits uniquely into
            a row-space part and a null-space part.
          </p>

          <p>
            On the output side: the column space and
            the <em>left null space</em> (vectors{" "}
            <InlineMath tex="y" /> satisfying{" "}
            <InlineMath tex="A^\top y = 0" />). These are also
            perpendicular, and together they fill the output space.
          </p>

          <Equation
            tex={`\\begin{aligned}
\\mathbb{R}^n &= \\text{row space} \\;\\oplus\\; \\text{null space} \\\\[4pt]
\\mathbb{R}^m &= \\text{column space} \\;\\oplus\\; \\text{left null space}
\\end{aligned}`}
            number={3}
          />

          <p>
            The <InlineMath tex="\oplus" /> means "direct sum": every
            vector in the space can be written as one piece from each
            subspace, the decomposition is unique, and the two pieces
            are perpendicular.
          </p>

          <p>
            Now watch what the matrix does. Take an input vector and
            split it into its row-space part and its null-space part.
            The matrix maps the row-space part to the column space and
            sends the null-space part to zero. That is the entire story.
            The row space is what the matrix reads; the null space is
            what it ignores; the column space is what it can produce;
            the left null space is what it cannot.
          </p>

          <FigureContainer
            width="page"
            caption={
              <>
                The four fundamental subspaces. Left: the input space,
                split into row space and null space. Right: the output
                space, split into column space and left null space. The
                matrix maps the row space to the column space and
                crushes the null space to zero.
              </>
            }
          >
            <FourSubspacesExplorer />
          </FigureContainer>

          <p>
            The rank appears everywhere in this picture. The row space
            and column space always have the same dimension: both
            equal the rank. This must be true because the matrix maps
            the row space onto the column space without crushing
            anything (the crushing happens only in the null space).
            <Sidenote number={3}>
              The singular value decomposition, which we develop in a
              later post, finds orthonormal bases for the row space and
              column space such that the matrix maps one to the other
              by pure scaling. Each scale factor is a singular value.
              The number of nonzero singular values equals the rank.
            </Sidenote>
          </p>

          <p>
            For PSID, the four-subspace picture shows up directly. The
            cross-covariance between neural activity and behavior has a
            row space that identifies the behaviorally relevant
            directions in neural space. The null space of the same
            matrix captures everything the brain does that behavior
            does not reflect. PSID's two-stage algorithm is, at heart,
            a procedure for finding these two perpendicular pieces.
          </p>

          {/* ===================================================================
              Section 6 — When There Is No Exact Answer
              =================================================================== */}
          <h2 id="projection">Projection and least squares</h2>

          <p>
            You record
            from 100 neurons over 500 time points and want to
            predict hand velocity from the neural state. You have
            a system <InlineMath tex="Ax = b" />,
            where <InlineMath tex="A" /> is the 500-by-100 data matrix
            (each row is a time point, each column is a neuron),{" "}
            <InlineMath tex="x" /> is the 100-dimensional weight vector
            you want, and <InlineMath tex="b" /> is the 500-dimensional
            vector of velocity measurements.
          </p>

          <p>
            You have 500 equations and 100 unknowns. In general, no
            exact solution exists:
            there is no <InlineMath tex="x" /> that satisfies all 500
            equations. The target <InlineMath tex="b" /> does not lie
            in the column space of <InlineMath tex="A" />. You are
            asking the matrix to produce something outside its
            repertoire.
          </p>

          <p>
            What do you do? You find the closest point in the column
            space. You <em>project</em> <InlineMath tex="b" /> onto
            the column space of <InlineMath tex="A" />, and solve for
            the <InlineMath tex="x" /> that produces that projection.
          </p>

          <p>
            Think about what projection means geometrically. You have a
            target point <InlineMath tex="b" /> floating somewhere in
            the 500-dimensional output space. The column space
            of <InlineMath tex="A" /> is a 100-dimensional subspace
            within that space (assuming the columns are independent).
            The projection is the point in the column space that is
            closest to <InlineMath tex="b" />. The residual, the
            vector from the projection
            to <InlineMath tex="b" />, is perpendicular to the column
            space.
          </p>

          <FigureContainer
            width="outset"
            caption="Drag the green line to rotate the subspace. The projection of each data point is shown, along with the residual. The dashed line shows the optimal direction (PC₁)."
          >
            <SubspaceProjectionExplorer />
          </FigureContainer>

          <p>
            If the subspace is spanned by orthonormal
            columns <InlineMath tex="U = [u_1 \mid \cdots \mid u_k]" />,
            the projection formula is one we have seen before, from
            the <Link to="/blog/bases-coordinates/">basis post</Link>:
          </p>

          <Equation
            tex="\hat{b} = UU^\top b"
            number={4}
          />

          <p>
            Two steps. <InlineMath tex="U^\top b" /> computes{" "}
            <InlineMath tex="k" /> dot products, giving the coordinates
            of the projection in the subspace.
            Then <InlineMath tex="U" /> reconstructs the projected
            vector in the full space. The
            matrix <InlineMath tex="P = UU^\top" /> is a projection
            matrix. Apply it twice and nothing changes:{" "}
            <InlineMath tex="P^2 = P" />. Once you are in the
            subspace, projecting again leaves you there.
          </p>

          <p>
            When the columns of <InlineMath tex="A" /> are not
            orthonormal (they almost never are), the formula adjusts to
            account for the internal geometry:
          </p>

          <Equation
            tex="\hat{x} = (A^\top A)^{-1} A^\top\, b"
            number={5}
          />

          <p>
            This is the <em>least-squares</em> solution. Where does the
            formula come from? One geometric fact: the residual of the
            best approximation is perpendicular to the column space.
            Perpendicular to every column
            means <InlineMath tex="A^\top(b - A\hat{x}) = 0" />.
            Expand: <InlineMath tex="A^\top b = A^\top A\, \hat{x}" />.
            These are the <em>normal equations</em>.
            If <InlineMath tex="A^\top A" /> is invertible, solve
            for <InlineMath tex="\hat{x}" /> and the formula drops
            out. The entire derivation was perpendicularity.
          </p>

          <p>
            And now something connects. Look at the
            structure: <InlineMath tex="(A^\top A)^{-1} A^\top" /> is
            the <em>pseudoinverse</em> of <InlineMath tex="A" />. The
            projection of <InlineMath tex="b" /> onto the column space
            is <InlineMath tex="A\hat{x} = A(A^\top A)^{-1}A^\top b" />.
            <Sidenote number={4}>
              Compare with the orthonormal
              case: <InlineMath tex="UU^\top b" />.
              When <InlineMath tex="A" /> has orthonormal columns,{" "}
              <InlineMath tex="A^\top A = I" />, so the formula
              collapses to <InlineMath tex="AA^\top b" />. Same formula,
              no correction needed. This is the payoff of
              orthonormality, again.
            </Sidenote>
          </p>

          <p>
            Two ideas from different posts turned out to be the same
            operation. Least-squares fitting, which seemed like an
            optimization problem (minimize squared error), is also
            projection onto the column space, which is a geometric
            operation (find the nearest point). The formula is the
            same. This is not a coincidence. The residual of the least-
            squares fit, <InlineMath tex="b - A\hat{x}" />, is
            perpendicular to the column space. Perpendicularity is what
            makes the approximation closest. Geometry and optimization
            are saying the same thing in different
            languages.
            <Sidenote number={5}>
              The distinction between orthogonal and oblique projection
              matters for some neural data methods. PSID uses an
              oblique projection to separate behaviorally relevant and
              irrelevant subspaces, which need not be perpendicular.
              Van Overschee and De Moor <Citation numbers={[9]} />{" "}
              develop the theory of oblique projections for subspace
              identification, where they are essential for separating
              past and future information in time-series data.
            </Sidenote>
          </p>

          {/* ===================================================================
              Section 7 — What Comes Next
              =================================================================== */}
          <h2 id="what-comes-next">What comes next</h2>

          <p>
            We now have a precise language for what a matrix does to a
            vector space. It reads the row-space component of the input,
            maps it to the column space, and ignores the rest. The rank
            tells you how many dimensions survive. The null space tells
            you what gets destroyed. When the target lies outside the
            column space, projection gives you the best approximation.
          </p>

          <p>
            Projection chooses the nearest point in a fixed subspace.
            But we have not said how to choose the subspace itself.
            Which 10-dimensional subspace of a 100-dimensional neuron
            space should you project onto? The answer depends on the
            question. If you want to preserve variance, you want the
            subspace where the data spread out the most. If you want
            behavioral relevance, you want the subspace most predictive
            of a target variable.
          </p>

          <p>
            Both questions lead to eigendecomposition. The directions
            of maximum variance turn out to be the eigenvectors of the
            covariance matrix. The directions of maximum behavioral
            relevance turn out to come from the eigenvectors of a
            cross-covariance matrix. In
            the <Link to="/blog/eigenvectors-covariance/">next
            post</Link>, we will see what eigenvectors are, why they
            are the natural coordinates for symmetric matrices, and
            why every covariance matrix has a clean eigendecomposition
            that leads directly to PCA.
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
              Kaufman, M. T., Churchland, M. M., Ryu, S. I., and
              Shenoy, K. V. "Cortical activity in the null space:
              permitting preparation without movement,"{" "}
              <em>Nature Neuroscience</em>, vol. 17, pp. 440-448, 2014.
            </li>
            <li id="ref-9">
              Van Overschee, P. and De Moor, B.{" "}
              <em>Subspace Identification for Linear Systems</em>.
              Kluwer Academic Publishers, 1996.
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
    Subspaces, rank, and projection &mdash; Felix Taschbach
  </title>
)

export default SubspacesRankProjectionPost
