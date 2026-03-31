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
import BasisDecomposition from "../../components/blog/BasisDecomposition"
import ChangeOfBasisExplorer from "../../components/blog/ChangeOfBasisExplorer"
import GramSchmidtExplorer from "../../components/blog/GramSchmidtExplorer"
import NeuralBasisChange from "../../components/blog/NeuralBasisChange"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "same-state-different-descriptions", label: "The same data, different descriptions" },
  { id: "what-makes-a-basis", label: "What a basis is" },
  { id: "coordinates-depend-on-axes", label: "Coordinates in a new basis" },
  { id: "wrong-basis", label: "The standard basis" },
  { id: "orthonormal", label: "Orthonormal bases" },
  { id: "choosing-axes", label: "What comes next" },
  { id: "references", label: "References" },
]

const BasesCoordinatesPost = () => {
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
            Bases and coordinates
          </h1>
          <p className="blog-post__subtitle">
            The neural state is the object. Coordinates are just a
            description.
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
                Linear Algebra for Neural Data, Part 2
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          {/* ===================================================================
              Section 1 — The Same State, Different Descriptions
              =================================================================== */}
          <h2 id="same-state-different-descriptions">
            The same data, different descriptions
          </h2>

          <p>
            At the end of
            the <Link to="/blog/vectors-geometry/">previous post</Link>,
            there was a figure where you could click different neurons
            to serve as axes, and the trajectory of population activity
            changed shape each time. The data were the same. The firing
            rates were the same. Only the axes changed, and the picture
            looked completely different.
          </p>

          <p>
            If the same data can look
            structured or unstructured depending on which neurons you
            happen to plot, then the question "does this population have
            low-dimensional structure?" is not really about the data. It
            is about the axes. And we never chose those axes. The
            electrode chose them.
          </p>

          <p>
            What, precisely, are "axes"? If you wanted to replace the axes
            your electrode gave you with better ones, what would "better"
            mean? And how would you know when you had enough axes to
            describe everything?
          </p>

          {/* ===================================================================
              Section 2 — What Makes a Basis a Basis?
              =================================================================== */}
          <h2 id="what-makes-a-basis">What a basis is</h2>

          <p>
            Let's think about this from scratch. Suppose you want to
            build a coordinate system for a population of three neurons.
            You need a set of reference directions, axes that you can
            use to describe any possible firing-rate vector. What
            properties should those reference directions have?
          </p>

          <p>
            Start with one reference
            vector: <InlineMath tex="b_1 = (1, 0, 0)" />, pointing
            along neuron 1. Using just this axis, you can describe any
            vector that lies along the neuron-1 direction. But if
            neuron 2 fires, you are stuck. You cannot express{" "}
            <InlineMath tex="(0, 5, 0)" /> as a multiple
            of <InlineMath tex="(1, 0, 0)" />. One axis is not
            enough.
          </p>

          <p>
            Add a second: <InlineMath tex="b_2 = (0, 1, 0)" />. Now
            you can reach anything in the neuron-1-neuron-2 plane by
            combining <InlineMath tex="b_1" /> and{" "}
            <InlineMath tex="b_2" />. But a vector
            like <InlineMath tex="(0, 0, 3)" /> is still out of reach.
            Two axes in three dimensions: not enough.
          </p>

          <p>
            Add a third: <InlineMath tex="b_3 = (0, 0, 1)" />. Now
            every firing-rate vector in{" "}
            <InlineMath tex="\mathbb{R}^3" /> can be written
            as <InlineMath tex="c_1 b_1 + c_2 b_2 + c_3 b_3" />. The
            three reference directions <em>span</em> the space. Good.
          </p>

          <p>
            But what if we now add a fourth
            axis, <InlineMath tex="b_4 = (1, 1, 0)" />? We can still
            describe every vector, but now there is a problem. The
            vector <InlineMath tex="(1, 1, 0)" /> can be described
            as <InlineMath tex="1 \cdot b_1 + 1 \cdot b_2 + 0 \cdot b_3" />,
            or as <InlineMath tex="1 \cdot b_4" />. Two different
            descriptions for the same vector. The fourth axis was
            unnecessary. It introduced ambiguity without adding reach.
          </p>

          <p>
            So we need two properties. The reference directions
            should <em>span</em> the space (every vector is reachable)
            and they should be <em>linearly independent</em> (no axis
            is a combination of the others). A set of vectors
            with both properties is a <em>basis</em>.
          </p>

          <p>
            A basis is exactly enough axes: complete coverage, no
            redundancy. And something that might seem surprising
            turns out to be inevitable: every basis for the same
            space has the same number of vectors. You cannot span{" "}
            <InlineMath tex="\mathbb{R}^{100}" /> with 99 vectors
            (some state would be unreachable), and 101 independent
            vectors in <InlineMath tex="\mathbb{R}^{100}" /> cannot
            exist (there is no room). The count is
            always 100. That invariant count is
            the <em>dimension</em> of the space.
            <Sidenote number={1}>
              This is a theorem, not a definition. Proving that the
              number of basis vectors is invariant takes work; see
              Axler <Citation numbers={[5]} />, Chapter 2. What matters
              for us is the consequence: dimension is a property of the
              space itself, not of any particular set of axes.
            </Sidenote>
          </p>

          {/* ===================================================================
              Section 3 — Coordinates Depend on the Axes
              =================================================================== */}
          <h2 id="coordinates-depend-on-axes">
            Coordinates in a new basis
          </h2>

          <p>
            Once you fix a basis, every vector gets a unique set of
            numbers: the scalars in the linear combination that
            produces it.
          </p>

          <Equation
            tex="v = c_1\,{\color{#D4626E}b_1} + c_2\,{\color{#4A90D9}b_2} + \cdots + c_n\,b_n"
            number={1}
          />

          <p>
            These scalars are the <em>coordinates</em>
            of <InlineMath tex="v" /> in that basis. Because the basis
            vectors are independent, the coordinates are unique: there
            is exactly one set of <InlineMath tex="c_i" />'s that works.
          </p>

          <p>
            With the standard
            basis <InlineMath tex="{\color{#D4626E}e_1} = (1, 0)" />,{" "}
            <InlineMath tex="{\color{#4A90D9}e_2} = (0, 1)" />,
            coordinates are trivial. The
            vector <InlineMath tex="v = (3, 7)" /> has
            coordinates 3 and 7
            because <InlineMath tex="v = 3\,{\color{#D4626E}e_1} + 7\,{\color{#4A90D9}e_2}" />.
            So natural you don't even notice it.
          </p>

          <p>
            Now let's switch to a different basis and see what happens.
            Take <InlineMath tex="{\color{#D4626E}b_1} = (1, 1)" /> and{" "}
            <InlineMath tex="{\color{#4A90D9}b_2} = (1, -1)" />. These
            are independent (neither is a multiple of the other), so
            they form a basis
            for <InlineMath tex="\mathbb{R}^2" />. What are the
            coordinates of the same
            vector <InlineMath tex="v = (3, 7)" /> in this new basis?
          </p>

          <p>
            We need <InlineMath tex="c_1" /> and{" "}
            <InlineMath tex="c_2" /> such
            that <InlineMath tex="c_1(1,1) + c_2(1,-1) = (3,7)" />.
            Writing this out component by
            component: <InlineMath tex="c_1 + c_2 = 3" /> and{" "}
            <InlineMath tex="c_1 - c_2 = 7" />. Add the two
            equations: <InlineMath tex="2c_1 = 10" />,
            so <InlineMath tex="c_1 = 5" />.
            Subtract: <InlineMath tex="2c_2 = -4" />,
            so <InlineMath tex="c_2 = -2" />.
          </p>

          <p>
            Let's check. Does <InlineMath tex="5(1,1) + (-2)(1,-1)" />{" "}
            give us <InlineMath tex="(3, 7)" />?
            That's <InlineMath tex="(5, 5) + (-2, 2) = (3, 7)" />. Yes.
          </p>

          <p>
            The vector did not move. It is still the point{" "}
            <InlineMath tex="(3, 7)" /> in the plane. But its
            description changed from <InlineMath tex="(3, 7)" /> to{" "}
            <InlineMath tex="(5, -2)" />. Different basis, different
            numbers, same vector.
          </p>

          <FigureContainer
            width="outset"
            caption="Drag the basis vectors. The target vector stays fixed; only its coordinates change. Toggle the grid to see how the basis tiles the plane."
          >
            <BasisDecomposition />
          </FigureContainer>

          <p>
            Drag the basis vectors in the figure above. The target
            vector does not move. But the numbers that describe it
            change continuously as the axes shift underneath it.
          </p>

          <p>
            The vector is the object. The
            coordinates are a description of that object, relative to a
            chosen basis. Change the basis and you change the
            description. The object stays put.
          </p>

          <p>
            Whenever you see a column of numbers representing neural
            activity, ask: in which basis? Relative to what axes? The
            numbers are not the population state. They are one
            particular way of writing it down.
          </p>

          <p>
            One more thing. Solving two equations by hand was fine for a
            2-dimensional example. But what if you have a hundred
            neurons and a different basis? You need a systematic way to
            convert. Write the basis vectors as columns of a
            matrix <InlineMath tex="P = [b_1 \mid b_2]" />. Then{" "}
            <InlineMath tex="P" /> converts from the new basis to
            standard
            coordinates: <InlineMath tex="x_{\text{std}} = P\, x_{\mathcal{B}}" />.
            Going the other way
            requires <InlineMath tex="P^{-1}" />:{" "}
            <InlineMath tex="x_{\mathcal{B}} = P^{-1}\, x_{\text{std}}" />.
            When the basis is orthonormal,{" "}
            <InlineMath tex="P^{-1} = P^\top" /> and no inversion is
            needed. The change of basis is just a rotation.
          </p>

          <FigureContainer
            width="outset"
            caption="Toggle between coordinate systems. Drag either basis to see the change-of-basis matrix update live."
          >
            <ChangeOfBasisExplorer />
          </FigureContainer>

          {/* ===================================================================
              Section 4 — Why the Standard Basis Is Usually the Wrong One
              =================================================================== */}
          <h2 id="wrong-basis">
            The standard basis
          </h2>

          <p>
            When you record from a hundred neurons, your data arrives
            in the standard basis. Axis 1 is neuron 1. Axis 2 is
            neuron 2. Each firing rate is a coordinate along the axis of
            the neuron that produced it.
          </p>

          <p>
            Now ask: who chose this basis? Not you. The surgical
            placement of the electrode chose it. The particular neurons
            that happened to sit near each contact chose it. The basis
            is a fact about your hardware, not about the computation
            the brain is performing.
          </p>

          <p>
            There is nothing wrong with this basis. It is a legal
            description of the population state. But think about what
            happens when the population's activity lives near a
            ten-dimensional subspace of the hundred-dimensional neuron
            space. That subspace is tilted at some arbitrary angle
            relative to the neuron axes. In the standard basis, the
            ten-dimensional structure is smeared across all hundred
            coordinates. Every neuron participates a little. No single
            coordinate isolates the structure.
          </p>

          <p>
            Now imagine switching to a basis where the first ten vectors
            point along that subspace and the remaining ninety point
            away from it. In this new basis, the first ten coordinates
            capture all the structure. The other ninety hover near zero.
            You did not change the data. You changed the description.
            And the description became dramatically
            simpler.
            <Sidenote number={6}>
              Churchland et al. <Citation numbers={[3]} /> demonstrated
              this dramatically with jPCA. Rotational dynamics in motor
              cortex were invisible in the standard neuron-by-neuron
              basis but became a clear circular trajectory once the data
              were projected onto a basis defined by the dynamics
              themselves. The structure was always there; the electrode
              basis hid it.
            </Sidenote>
          </p>

          <p>
            This is what PCA does. It does not transform the data. It
            does not warp the trajectory or add or remove information.
            It finds a new basis where the interesting structure
            concentrates in the first few coordinates.
            <Sidenote number={2}>
              Framing PCA as a "basis change" rather than a "data
              transformation" is deliberate. Both descriptions are
              correct, but the basis-change framing makes clear that
              nothing about the data itself changed. Cunningham and
              Yu <Citation numbers={[4]} /> review how this framing
              unifies PCA, factor analysis, and GPFA. The same idea
              applies to CCA (find a basis that exposes cross-dataset
              correlation) and PSID (find a basis that separates
              behaviorally relevant dynamics from irrelevant ones).
            </Sidenote>
          </p>

          <p>
            And PCA is just one answer to the question "which basis
            should I use?" Different methods give different answers
            because they are looking for different kinds of structure.
            With PCA, the goal is to capture variance: the basis vectors
            point along the directions where the population's activity
            fluctuates most. With PSID, the goal is behavioral
            relevance: the first basis vectors point along directions
            that predict behavior, and the rest capture dynamics that
            do not. With reduced-rank regression, the first basis
            vectors maximize prediction of a target variable.
          </p>

          <p>
            All three are valid descriptions of the same population
            state. They differ in what they are optimized to make
            visible. The modeling decision, the real scientific choice,
            is which basis to use.
          </p>

          {/* ===================================================================
              Section 5 — Orthonormal Bases and Dot-Product Coordinates
              =================================================================== */}
          <h2 id="orthonormal">
            Orthonormal bases
          </h2>

          <p>
            Go back to the example where we found coordinates in
            the <InlineMath tex="(1,1), (1,-1)" /> basis. To get the
            coordinates of <InlineMath tex="(3, 7)" />, we had to set
            up two equations and solve them simultaneously. With a
            hundred neurons, that would be a hundred equations in a
            hundred unknowns. A computer can handle it, but the
            conceptual picture is cluttered: every coordinate depends on
            every basis vector at once.
          </p>

          <p>
            Is there a kind of basis where finding coordinates is
            simpler? Let's think about what made the standard basis so
            easy. In the standard basis, the coordinate along axis 1
            was just "the first entry of the vector." You did not need
            to solve anything. Why?
          </p>

          <p>
            Because the standard basis vectors are perpendicular to each
            other and each has length 1. When you dot{" "}
            <InlineMath tex="v = (3, 7)" />{" "}
            with <InlineMath tex="e_1 = (1, 0)" />, you
            get <InlineMath tex="3(1) + 7(0) = 3" />: the first
            coordinate. Dot with{" "}
            <InlineMath tex="e_2 = (0, 1)" />: <InlineMath tex="3(0) + 7(1) = 7" />.
            The second coordinate. Each coordinate is a single dot
            product. No system of equations needed.
          </p>

          <p>
            The key property was not that the basis was "standard." It
            was that the basis vectors were mutually perpendicular and
            each had unit length. A basis with both properties is
            called <em>orthonormal</em>. And any orthonormal basis,
            not just the standard one, gives you this same shortcut.
          </p>

          <p>
            Let's verify this with a different orthonormal basis. Take{" "}
            <InlineMath tex="q_1 = \tfrac{1}{\sqrt{2}}(1, 1)" /> and{" "}
            <InlineMath tex="q_2 = \tfrac{1}{\sqrt{2}}(1, -1)" />.
            These are perpendicular
            (check: <InlineMath tex="q_1 \cdot q_2 = \tfrac{1}{2}(1 - 1) = 0" />)
            and each has length 1
            (check: <InlineMath tex="\|q_1\| = \sqrt{\tfrac{1}{2} + \tfrac{1}{2}} = 1" />).
          </p>

          <p>
            Now find the coordinates
            of <InlineMath tex="v = (3, 7)" />. Just take dot
            products: <InlineMath tex="v \cdot q_1 = \tfrac{1}{\sqrt{2}}(3 + 7) = \tfrac{10}{\sqrt{2}}" /> and{" "}
            <InlineMath tex="v \cdot q_2 = \tfrac{1}{\sqrt{2}}(3 - 7) = \tfrac{-4}{\sqrt{2}}" />.
            Done.
          </p>

          <p>
            Let's check that this actually works. Does{" "}
            <InlineMath tex="\tfrac{10}{\sqrt{2}}\, q_1 + \tfrac{-4}{\sqrt{2}}\, q_2" />{" "}
            reconstruct <InlineMath tex="(3, 7)" />? Expanding:{" "}
            <InlineMath tex="\tfrac{10}{\sqrt{2}} \cdot \tfrac{1}{\sqrt{2}}(1,1) + \tfrac{-4}{\sqrt{2}} \cdot \tfrac{1}{\sqrt{2}}(1,-1) = 5(1,1) + (-2)(1,-1) = (3, 7)" />.
            Yes.
          </p>

          <p>
            Compare this to the earlier approach with the non-normalized
            basis <InlineMath tex="(1,1), (1,-1)" />, where we had to
            solve simultaneous equations. Same basis directions, but
            because the vectors have unit length, the dot product gives
            us the coordinates directly. That is the payoff of
            orthonormality.
          </p>

          <p>
            Why does this work? The derivation is short. Write{" "}
            <InlineMath tex="v = c_1 q_1 + c_2 q_2 + \cdots + c_n q_n" />{" "}
            and take the dot product of both sides
            with <InlineMath tex="q_j" />:
          </p>

          <Equation
            tex="v \cdot q_j = c_1\underbrace{(q_1 \cdot q_j)}_{0} + \cdots + c_j\underbrace{(q_j \cdot q_j)}_{1} + \cdots + c_n\underbrace{(q_n \cdot q_j)}_{0} = c_j"
            number={2}
          />

          <p>
            Orthonormality kills every term except the <InlineMath tex="j" />-th.
            The cross-talk between coordinates vanishes. Each basis
            direction captures its own piece of the vector without
            interference from the
            others.
            <Sidenote number={3}>
              In a non-orthogonal basis, the dot product with a basis
              vector does <em>not</em> give you the coordinate. It gives
              you a number contaminated by contributions from other basis
              directions. Untangling this contamination requires solving
              the full system, which is equivalent to inverting a matrix.
              Orthonormality makes that matrix the identity, so there is
              nothing to invert.
            </Sidenote>
          </p>

          <p>
            So in any orthonormal
            basis, <InlineMath tex="c_j = v \cdot q_j" />. This means
            you can decompose a vector into its basis components and
            reconstruct it by adding them back:
          </p>

          <Equation
            tex="v = \sum_{j=1}^{n} (v \cdot q_j)\; q_j"
            number={3}
          />

          <p>
            Read this formula carefully. It says: project the vector
            onto each basis direction (that's the dot product), scale
            each basis vector by the result, and add them up. You get
            the original vector back. The decomposition and
            reconstruction are both done with dot products. Nothing
            else is needed.
          </p>

          <p>
            What happens if you stop the sum early? Instead
            of summing over all <InlineMath tex="n" /> basis vectors,
            what if you only sum over the
            first <InlineMath tex="k" />?
          </p>

          <Equation
            tex="\hat{v} = \sum_{j=1}^{k} (v \cdot q_j)\; q_j"
            number={4}
          />

          <p>
            You get an approximation. It lives in
            a <InlineMath tex="k" />-dimensional subspace, the one
            spanned by the <InlineMath tex="k" /> basis vectors you
            kept. Everything you threw away (the
            remaining <InlineMath tex="n - k" /> terms) is the residual:
            the part of <InlineMath tex="v" /> that your approximation
            missed.
          </p>

          <p>
            How good is the approximation? That depends entirely on
            which <InlineMath tex="k" /> basis vectors you kept. If they
            point along directions where the data varies a lot, the dot
            products are large and the kept terms carry most of the
            information. The residual is small. If they point in
            directions where the data barely moves, the kept terms are
            tiny and the residual is everything.
          </p>

          <p>
            This is why basis choice matters so much. Equation (4) is
            the skeleton of dimensionality reduction. It is the same
            equation whether you are doing PCA, projecting onto a
            decoder subspace, or extracting latent factors. What changes
            from method to method is how the <InlineMath tex="q_j" />'s
            are chosen. PCA chooses them to capture maximum variance.
            PSID chooses them to capture behavioral relevance. But the
            mechanism is always equation (4): project onto a few
            directions, sum the
            results.
            <Sidenote number={4}>
              Equation (4) is also the starting point for understanding
              linear decoders, linear classifiers, and encoder-decoder
              architectures. In each case, you project data onto a set
              of directions (encode) and reconstruct from those
              projections (decode). The methods diverge in how they
              choose the directions.
            </Sidenote>
          </p>

          <p>
            But where do orthonormal bases come from? You rarely start
            with one. More often you have a set of independent vectors
            from a data analysis and need to turn them into an
            orthonormal set spanning the same subspace. The procedure
            is called <em>Gram-Schmidt</em>: take the first vector and
            normalize it. Take the second, subtract its projection onto
            the first, normalize the residual. Take the third, subtract
            its projections onto both, normalize. At each step you
            remove the component that would violate orthogonality. What
            survives is the genuinely new
            direction.
            <Sidenote number={5}>
              The matrix form of Gram-Schmidt is the <em>QR
              decomposition</em>: any matrix with independent columns
              can be written as <InlineMath tex="A = QR" />,
              where <InlineMath tex="Q" /> has orthonormal columns
              and <InlineMath tex="R" /> is upper triangular. QR is how
              computers solve least-squares problems stably.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="Step through Gram-Schmidt on two vectors. At each stage, the projection onto previous vectors is subtracted and the residual is normalized. The result is an orthonormal pair spanning the same subspace."
          >
            <GramSchmidtExplorer />
          </FigureContainer>

          {/* ===================================================================
              Section 6 — Why Choosing Axes Is the Core Move
              =================================================================== */}
          <h2 id="choosing-axes">
            What comes next
          </h2>

          <FigureContainer
            width="page"
            caption="The same neural trajectory in two bases. Left: neuron-space axes. Right: a basis aligned with the low-dimensional structure. The trajectory has not changed. Only the description has."
          >
            <NeuralBasisChange />
          </FigureContainer>

          <p>
            Look at the two panels above. On the left, the population
            trajectory is plotted in the neuron basis, the axes your
            electrode gives you. On the right, the same trajectory in
            a basis aligned with the low-dimensional structure. Same
            data. Same geometric object. But in the right panel, the
            structure is concentrated in the first two or three
            coordinates. The remaining coordinates are flat: close to
            zero, carrying nothing.
          </p>

          <p>
            You have data described in a
            basis chosen by your hardware. You switch to a basis chosen
            by the structure in the data. In the new basis, a few
            coordinates carry the signal and the rest carry noise. You
            keep the informative coordinates and discard the rest.
          </p>

          <p>
            Three things determined the outcome. Which basis you chose.
            How you extracted coordinates (dot products, if the basis
            is orthonormal). And how many coordinates you kept. Every
            method we will encounter in this series is machinery for
            making those three choices well.
          </p>

          <p>
            But we have not said how to actually compute the switch from
            one basis to another. For a single vector, it is
            straightforward: project it onto each new basis vector. For
            an entire dataset, systematically and all at once, you need
            a tool that takes in a vector described one way and outputs
            the same vector described another way. Or, more generally,
            a tool that takes in a vector and produces a different
            vector entirely: a prediction, a readout, a compressed
            representation.
          </p>

          <p>
            That tool is the matrix. In
            the <Link to="/blog/matrices-linear-maps/">next post</Link>,
            we will see that a matrix is not a grid of numbers but a
            rule that turns one vector into another. And that every
            linear method in computational neuroscience, from decoders
            to dynamics to dimensionality reduction, is built from such
            rules.
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
          </ol>
        </div>

        <SeriesNav part={2} />

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
    Bases and coordinates &mdash; Felix Taschbach
  </title>
)

export default BasesCoordinatesPost
