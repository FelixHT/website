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
import MatrixVectorExplorer from "../../components/blog/MatrixVectorExplorer"
import TransformationExplorer from "../../components/blog/TransformationExplorer"
import MatrixMultiplicationExplorer from "../../components/blog/MatrixMultiplicationExplorer"
import InverseExplorer from "../../components/blog/InverseExplorer"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "decoding-a-reach", label: "Decoding a reach" },
  { id: "two-pictures", label: "Two ways to read a matrix" },
  { id: "where-basis-vectors-go", label: "What a matrix does to basis vectors" },
  { id: "geometry", label: "Linear transformations" },
  { id: "composition", label: "Composition" },
  { id: "when-maps-can-be-undone", label: "Inverses" },
  { id: "why-matrices", label: "What comes next" },
  { id: "references", label: "References" },
]

const MatricesLinearMapsPost = () => {
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
            Matrices as linear maps
          </h1>
          <p className="blog-post__subtitle">
            A matrix is not a grid of numbers. It is a rule that turns
            one vector into another.
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
                Linear Algebra for Neural Data, Part 3
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          {/* ===================================================================
              Section 1 — Decoding a Reach
              =================================================================== */}
          <h2 id="decoding-a-reach">Decoding a reach</h2>

          <p>
            You record from three neurons in motor cortex while a monkey
            reaches toward a target. At one moment during the reach, the
            firing rates
            are <InlineMath tex="x = (12,\; 7,\; 31)" /> spikes/s.
            You want to predict the hand's velocity at that moment:
            two numbers, horizontal and vertical.
          </p>

          <p>
            A collaborator hands you a decoder. She says: take the
            firing rates, multiply them by these weights, and add up.
            Horizontal velocity is{" "}
            <InlineMath tex="0.3(12) + 0.1(7) + (-0.2)(31) = 3.6 + 0.7 - 6.2 = -1.9" />.
            Vertical velocity is{" "}
            <InlineMath tex="(-0.1)(12) + 0.4(7) + 0.1(31) = -1.2 + 2.8 + 3.1 = 4.7" />.
            So the predicted velocity
            is <InlineMath tex="(-1.9,\; 4.7)" /> cm/s.
          </p>

          <p>
            You could write this more compactly as:
          </p>

          <Equation
            tex={`\\begin{bmatrix} -1.9 \\\\ 4.7 \\end{bmatrix}
= \\begin{bmatrix} 0.3 & 0.1 & -0.2 \\\\ -0.1 & 0.4 & 0.1 \\end{bmatrix}
\\begin{bmatrix} 12 \\\\ 7 \\\\ 31 \\end{bmatrix}`}
            number={1}
          />

          <p>
            The grid of weights in the
            middle is a <em>matrix</em>. Call
            it <InlineMath tex="A" />. The computation you just did
            is <em>matrix-vector multiplication</em>:{" "}
            <InlineMath tex="y = Ax" />. Input: a 3-dimensional neural
            state. Output: a 2-dimensional velocity prediction. The
            matrix is the rule connecting them.
          </p>

          <p>
            That is the entire idea of this post. A matrix is not a
            table of numbers you happen to store in a rectangle. It is
            a map from one vector space to another. It takes in a
            vector and gives back a vector, and the way it does so is
            completely determined by those numbers.
          </p>

          <p>
            But this framing raises a question. The computation above
            was a specific recipe: multiply corresponding entries and
            add. Why that recipe? Why not something else? To understand
            what a matrix is really doing, we need to look at the
            product <InlineMath tex="Ax" /> more carefully.
          </p>

          {/* ===================================================================
              Section 2 — Two Ways to Read a Matrix
              =================================================================== */}
          <h2 id="two-pictures">Two ways to read a matrix</h2>

          <p>
            There are two ways to understand what happens when you
            multiply a matrix by a vector. Both give the same answer.
            But they expose different structure, and for different
            problems, different pictures are more useful.
          </p>

          <p>
            <strong>The row picture.</strong> Look at the computation we
            just did. Each output entry was a dot product: the
            horizontal velocity was a dot product of the first row
            of <InlineMath tex="A" /> with the input, and the
            vertical velocity was a dot product of the second row with
            the input.
          </p>

          <p>
            Think about what each row is doing. The first row,{" "}
            <InlineMath tex="(0.3,\; 0.1,\; -0.2)" />, is a pattern
            of weights across the three neurons. Dotting the firing
            rates with this pattern produces a single number: a
            similarity score. How much does the current population state
            look like this particular pattern? The second row is a
            different pattern, producing a different score. Each row is
            a detector, and the matrix computes all the detectors at
            once.
            <Sidenote number={1}>
              This is exactly how a linear decoder works in a
              BCI <Citation numbers={[8]} />. Each row of the decoding
              matrix is a "readout direction" in neural space. The
              decoded output on each channel is the projection of the
              population state onto that direction. It is also how the
              first layer of a neural network works: each row of the
              weight matrix is a feature detector.
            </Sidenote>
          </p>

          <p>
            <strong>The column picture.</strong> Now rearrange the same
            calculation. Write out the columns
            of <InlineMath tex="A" /> separately:{" "}
            <InlineMath tex="a_1 = (0.3,\; -0.1)" />,{" "}
            <InlineMath tex="a_2 = (0.1,\; 0.4)" />,{" "}
            <InlineMath tex="a_3 = (-0.2,\; 0.1)" />.
            The product is:
          </p>

          <Equation
            tex={`Ax = 12 \\begin{bmatrix} 0.3 \\\\ -0.1 \\end{bmatrix}
+ 7 \\begin{bmatrix} 0.1 \\\\ 0.4 \\end{bmatrix}
+ 31 \\begin{bmatrix} -0.2 \\\\ 0.1 \\end{bmatrix}`}
            number={2}
          />

          <p>
            The output is a linear combination of the columns
            of <InlineMath tex="A" />, with the entries of the input
            vector as the weights. Each column represents the
            contribution of one neuron to the output. The first column
            is what neuron 1 "pushes" when it fires; the input
            entry <InlineMath tex="x_1 = 12" /> tells you how hard it
            pushes. The output is the combined effect of all neurons
            pushing at once.
          </p>

          <p>
            Let's check that both pictures give the same answer.
            Column picture:{" "}
            <InlineMath tex="12(0.3, -0.1) + 7(0.1, 0.4) + 31(-0.2, 0.1) = (3.6, -1.2) + (0.7, 2.8) + (-6.2, 3.1) = (-1.9, 4.7)" />.
            Same as before.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Adjust the entries of <InlineMath tex="x" /> to see the
                linear combination of columns. The output vector is always
                in the span of the columns.
              </>
            }
          >
            <MatrixVectorExplorer />
          </FigureContainer>

          <p>
            The column picture is the one to internalize. It says
            something geometric: the output of a matrix-vector product
            is always a linear combination of the columns. That means
            the output always lies in the span of the columns, no
            matter what input you feed in. The set of all possible
            outputs has a name, the <em>column space</em>, which we
            will study in a later post. For now, the point is that the
            columns of a matrix define the building blocks of the
            output, and the input vector is a recipe for combining them.
          </p>

          <p>
            One piece of notation before we move on.
            The <em>transpose</em> of a matrix, written{" "}
            <InlineMath tex="A^\top" />, flips rows and columns:
            entry <InlineMath tex="(i, j)" /> of{" "}
            <InlineMath tex="A^\top" /> is
            entry <InlineMath tex="(j, i)" /> of <InlineMath tex="A" />.
            For column vectors, transposing turns a column into a row.
            This gives a compact notation for the dot product:{" "}
            <InlineMath tex="u \cdot v = u^\top v" />. You will see
            this everywhere.
          </p>

          {/* ===================================================================
              Section 3 — Where Do the Basis Vectors Go?
              =================================================================== */}
          <h2 id="where-basis-vectors-go">
            What a matrix does to basis vectors
          </h2>

          <p>
            What does our decoder matrix do to the standard
            basis vectors?
          </p>

          <p>
            Feed in <InlineMath tex="e_1 = (1, 0, 0)" />, meaning only
            neuron 1 fires at 1 spike/s and the rest are
            silent. The column picture
            gives <InlineMath tex="A e_1 = 1 \cdot a_1 + 0 \cdot a_2 + 0 \cdot a_3 = a_1 = (0.3, -0.1)" />.
            The output is just the first column. Similarly,{" "}
            <InlineMath tex="Ae_2 = a_2" /> and{" "}
            <InlineMath tex="Ae_3 = a_3" />.
          </p>

          <p>
            So the columns of <InlineMath tex="A" /> are literally where
            the matrix sends the standard basis vectors. The first
            column is where <InlineMath tex="e_1" /> goes. The second
            is where <InlineMath tex="e_2" /> goes. And so on.
          </p>

          <p>
            Now think about what this means. Any input is a linear
            combination of basis vectors:{" "}
            <InlineMath tex="x = x_1 e_1 + x_2 e_2 + x_3 e_3" />.
            If you know what happens to each basis vector, you know
            what happens to every vector, because the map preserves
            linear combinations. That is: if doubling the input doubles
            the output, and adding inputs adds outputs, then knowing
            the output on the ingredients tells you the output on any
            recipe.
          </p>

          <p>
            This connects directly to
            the <Link to="/blog/bases-coordinates/">previous
            post</Link>. A basis is a set of reference directions. A
            matrix is completely determined by where it sends those
            reference directions. Change the basis, and the same
            geometric map gets described by a different matrix. The map
            did not change. The description did. We will make this
            precise with change-of-basis matrices in a later post.
          </p>

          {/* ===================================================================
              Section 4 — What Transformations Look Like
              =================================================================== */}
          <h2 id="geometry">Linear transformations</h2>

          <p>
            Not every function from vectors to vectors can be written
            as a matrix. Only a special class: functions where doubling
            the input doubles the output, and where transforming a sum
            gives the sum of the transforms. These are{" "}
            <em>linear transformations</em>.
          </p>

          <p>
            Rotations are linear. Reflections are linear. Stretching
            along one axis is linear. Shearing (tilting a grid) is
            linear. Projecting onto a subspace is linear. Translating
            (shifting everything by a fixed amount) is
            not.
            <Sidenote number={2}>
              The test is simple: does the origin stay put? A linear
              transformation maps the zero vector to the zero vector.
              A translation moves it somewhere else.
            </Sidenote>
          </p>

          <p>
            A linear transformation <Citation numbers={[2]} />
            warps the coordinate grid, but in a very constrained way.
            Straight lines stay straight. The origin stays fixed.
            Parallel lines remain parallel. Grid lines stay evenly
            spaced. The grid can stretch, rotate, shear, or flip, but
            it cannot bend.
          </p>

          <FigureContainer
            width="outset"
            caption="Pick a transformation (rotation, shear, reflection, projection) and watch the grid deform. The matrix updates to reflect where the basis vectors land."
          >
            <TransformationExplorer />
          </FigureContainer>

          <p>
            Play with the figure. Try a rotation: the grid rotates
            rigidly. Try a shear: the grid tilts, but lines stay
            straight and parallel. Try a projection: the grid collapses
            onto a line, and information is lost. Every one of these is
            a matrix, and every matrix does one of these things.
          </p>

          <p>
            For neural data, think of it this way. A linear decoder maps
            population activity into a behavioral readout. A projection
            matrix collapses a high-dimensional population state onto
            a low-dimensional subspace. A rotation matrix switches
            coordinate systems without distorting distances. A dynamics
            matrix maps the population state at time <InlineMath tex="t" />{" "}
            to its state at time <InlineMath tex="t+1" />. All of these
            are linear transformations. All of them are matrices.
          </p>

          {/* ===================================================================
              Section 5 — Composition
              =================================================================== */}
          <h2 id="composition">
            Composition
          </h2>

          <p>
            Suppose your analysis pipeline has two steps. First, you
            project the neural state into a 10-dimensional latent
            space: <InlineMath tex="z = Bx" />,
            where <InlineMath tex="B" /> is a 10-by-100 matrix.
            Then, you decode hand velocity from the latent
            state: <InlineMath tex="y = Az" />,
            where <InlineMath tex="A" /> is a 2-by-10 matrix.
          </p>

          <p>
            Combining both steps: <InlineMath tex="y = A(Bx)" />. Is
            there a single matrix that goes straight from the
            100-dimensional neural state to the 2-dimensional velocity,
            doing both steps at once?
          </p>

          <p>
            Yes. The product <InlineMath tex="AB" /> is a 2-by-100
            matrix, and <InlineMath tex="(AB)x = A(Bx)" />. One
            matrix, one multiplication, same result. This is why matrix
            multiplication exists. The formula for computing it is not
            an arbitrary rule someone invented. It is the rule you
            are forced to use if you want composition of maps to work.
            <Sidenote number={3}>
              This is worth verifying. If you define the product{" "}
              <InlineMath tex="AB" /> by requiring{" "}
              <InlineMath tex="(AB)x = A(Bx)" /> for all{" "}
              <InlineMath tex="x" />, and you expand both sides using
              the column picture, the entry-by-entry formula falls
              out. The formula is a consequence of the requirement,
              not an independent definition.
            </Sidenote>
          </p>

          <p>
            The entry in row <InlineMath tex="i" />,
            column <InlineMath tex="j" /> of the product is:
          </p>

          <Equation
            tex="(AB)_{ij} = \sum_{k} A_{ik}\, B_{kj}"
            number={3}
          />

          <p>
            A dot product between the <InlineMath tex="i" />-th row
            of <InlineMath tex="A" /> and the{" "}
            <InlineMath tex="j" />-th column of <InlineMath tex="B" />.
            But the entry-by-entry formula is less useful than the
            column-level picture: each column of{" "}
            <InlineMath tex="AB" /> is what <InlineMath tex="A" /> does
            to the corresponding column of <InlineMath tex="B" />.
          </p>

          <Equation
            tex={`AB = A \\begin{bmatrix} \\mid & \\mid & & \\mid \\\\[-4pt]
b_1 & b_2 & \\cdots & b_p \\\\[-4pt]
\\mid & \\mid & & \\mid \\end{bmatrix}
= \\begin{bmatrix} \\mid & \\mid & & \\mid \\\\[-4pt]
Ab_1 & Ab_2 & \\cdots & Ab_p \\\\[-4pt]
\\mid & \\mid & & \\mid \\end{bmatrix}`}
            number={4}
          />

          <p>
            This makes the composition tangible. The columns
            of <InlineMath tex="B" /> are where <InlineMath tex="B" />{" "}
            sends the basis vectors. The columns
            of <InlineMath tex="AB" /> are where the
            composition <InlineMath tex="A" />-after-<InlineMath tex="B" />{" "}
            sends them: first <InlineMath tex="B" /> moves each basis
            vector, then <InlineMath tex="A" /> moves the result.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Two transformations in sequence. Drag the basis vectors
                of <InlineMath tex="A" /> and <InlineMath tex="B" /> to
                see how <InlineMath tex="AB" /> updates. Swap the order
                to confirm <InlineMath tex="AB \neq BA" />.
              </>
            }
          >
            <MatrixMultiplicationExplorer />
          </FigureContainer>

          <p>
            Try swapping the order in the figure. Rotate then shear
            is different from shear then
            rotate: <InlineMath tex="AB \neq BA" /> in general.
            Composition is order-dependent, which is why matrix
            multiplication is not commutative. But it is associative:{" "}
            <InlineMath tex="(AB)C = A(BC)" />. You can regroup a
            chain of transformations without changing the result.
            <Sidenote number={5}>
              Non-commutativity matters in neural data pipelines.
              "Project onto a latent space, then decode" is a different
              operation from "decode, then project." The order of
              matrix multiplications determines the analysis result, and
              swapping steps can give qualitatively different answers.
            </Sidenote>
          </p>

          <p>
            One algebraic fact is useful often enough to note now. The
            transpose of a product reverses the
            order: <InlineMath tex="(AB)^\top = B^\top A^\top" />.
            Think of it as taking off two layers of clothing: if you
            put on a shirt then a jacket, you take off the jacket first,
            then the shirt. We will use this when computing
            covariance.
            <Sidenote number={6}>
              You will see this identity constantly. The covariance
              matrix <InlineMath tex="\tfrac{1}{T}X^\top X" /> uses
              it. The normal equations <InlineMath tex="A^\top A \hat{x} = A^\top b" />{" "}
              use it. The SVD
              derivation uses it. Every time a product gets transposed
              in this series, the reversal rule is doing the work.
            </Sidenote>
          </p>

          {/* ===================================================================
              Section 6 — When a Map Can Be Undone
              =================================================================== */}
          <h2 id="when-maps-can-be-undone">Inverses</h2>

          <p>
            You apply your decoder to a population state and get a
            velocity prediction. Can you recover the original population
            state from the prediction? Can you go backward?
          </p>

          <p>
            Think about what the decoder did. It took a 3-dimensional
            input and produced a 2-dimensional output. Three numbers
            went in; two came out. Some information was lost. Different
            population states could produce the same velocity. There is
            no way to tell which one you started from.
          </p>

          <p>
            What about a square matrix, where the input and output have
            the same dimension? It depends. If the columns of the matrix
            are linearly independent, the transformation maps distinct
            inputs to distinct outputs. Nothing collapses. In that
            case, there exists an <em>inverse</em> matrix{" "}
            <InlineMath tex="A^{-1}" /> that reverses the
            map: <InlineMath tex="A^{-1}(Ax) = x" /> for every{" "}
            <InlineMath tex="x" />.
          </p>

          <p>
            But if the columns are dependent, some direction gets
            crushed. The transformation flattens a plane to a line, or
            a volume to a plane. Distinct points merge into the same
            output. Once that happens, the information is gone. No
            inverse exists.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Drag the two column vectors. The parallelogram shows
                the area the transformation maps the unit square to.
                When the columns become collinear, the area collapses to
                zero and no inverse exists.
              </>
            }
          >
            <InverseExplorer />
          </FigureContainer>

          <p>
            There is a single number that tells you whether
            a square matrix is
            invertible: the <em>determinant</em>. In two dimensions, it
            equals the signed area of the parallelogram spanned by the
            two columns. Determinant zero means the parallelogram has
            collapsed: the columns are dependent. Determinant nonzero
            means the transformation can be reversed.
            <Sidenote number={4}>
              You rarely compute{" "}
              <InlineMath tex="A^{-1}" /> explicitly in practice.
              Gaussian elimination, LU decomposition, and iterative
              solvers are faster and more numerically stable. The
              conceptual importance of the inverse is knowing <em>whether</em> a
              map can be undone, not the mechanics of undoing it.
            </Sidenote>
          </p>

          <p>
            In neural data, you almost never have a square, invertible
            matrix. You record 100 neurons over 500 time points and want
            to predict a 2-dimensional behavioral variable. The decoder
            is 2-by-100. Not square, not invertible. But you can still
            ask: what is the best decoder? What set of weights minimizes
            the prediction error? The answer is least squares, and its
            formula involves a construction called the pseudoinverse.
            That is for the next post.
          </p>

          <p>
            There is one type of square matrix that deserves special
            mention. When the columns are orthonormal, the matrix is
            called <em>orthogonal</em>, and its inverse is its
            transpose: <InlineMath tex="Q^{-1} = Q^\top" />.
            Free. No computation. Orthogonal matrices preserve lengths
            and angles: <InlineMath tex="\|Qx\| = \|x\|" /> for
            any <InlineMath tex="x" />. They are pure rotations (or
            reflections). This is why PCA's change of basis preserves
            the distances between data points: the basis-change matrix
            is orthogonal.
          </p>

          {/* ===================================================================
              Section 7 — Why Every Linear Method Uses Matrices
              =================================================================== */}
          <h2 id="why-matrices">
            What comes next
          </h2>

          <p>
            With this machinery you can describe, at least in
            outline, every linear method in computational neuroscience.
            A linear decoder is a matrix: it maps neural states to
            behavioral predictions. A projection onto a low-dimensional
            subspace is a matrix: it maps the full population state onto
            a few coordinates. A change of basis is a matrix: it
            redescribes the same state in a different coordinate system.
            A linear dynamics model says
            that <InlineMath tex="x_{t+1} = Ax_t" />: the state at the
            next time step is the current state, transformed by a
            matrix. Even PCA, which we have been building toward, is
            a matrix multiplication: you project your data onto the
            principal component directions, and those directions are
            the columns of a matrix.
          </p>

          <p>
            What varies from method to method is what the matrix is
            optimized to do. PCA finds the matrix that captures the
            most variance. CCA finds the matrices that produce the most
            correlated projections across two datasets. PSID finds the
            matrix that separates behaviorally relevant dynamics from
            irrelevant ones. But the object, a linear map from one
            vector space to another, is the same.
          </p>

          <p>
            We left one question open. When the decoder maps
            100-dimensional neural activity to 2-dimensional velocity,
            what happens to the other 98 dimensions? Which directions
            survive the map, and which ones get crushed? To answer that,
            we need the concepts of column space, null space, and
            rank, which tell you exactly what a matrix preserves and
            what it destroys. That is
            the <Link to="/blog/subspaces-rank-projection/">next
            post</Link>.
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
              Musallam, S., Corneil, B. D., Greger, B., Scherberger, H.,
              and Andersen, R. A. "Cognitive control signals for neural
              prosthetics,"{" "}
              <em>Science</em>, vol. 305, no. 5681, pp. 258-262, 2004.
            </li>
          </ol>
        </div>

        <SeriesNav part={3} />

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
    Matrices as linear maps &mdash; Felix Taschbach
  </title>
)

export default MatricesLinearMapsPost
