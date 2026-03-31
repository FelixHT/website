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
import NeuralPopulationExplorer from "../../components/blog/NeuralPopulationExplorer"
import LinearCombinationBuilder from "../../components/blog/LinearCombinationBuilder"
import SpanExplorer from "../../components/blog/SpanExplorer"
import DotProductExplorer from "../../components/blog/DotProductExplorer"
import NormBallExplorer from "../../components/blog/NormBallExplorer"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "a-hundred-neurons", label: "Population vectors" },
  { id: "linear-combinations", label: "Linear combinations and span" },
  { id: "independence", label: "Independence and dimensionality" },
  { id: "dot-product", label: "The dot product" },
  { id: "norms-and-distance", label: "Norms and distance" },
  { id: "why-geometry", label: "What comes next" },
  { id: "references", label: "References" },
]

const VectorsGeometryPost = () => {
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
            Vectors and neural geometry
          </h1>
          <p className="blog-post__subtitle">
            Representing neural populations as points in a shared space.
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
                Linear Algebra for Neural Data, Part 1
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          {/* ===================================================================
              Section 1 — A Hundred Neurons, One Point
              =================================================================== */}
          <h2 id="a-hundred-neurons">Population vectors</h2>

          <p>
            Suppose you stick an electrode array into motor cortex and
            record from a hundred neurons while a monkey reaches to a
            target. You get a hundred time-varying traces, one per
            neuron. The natural thing to do is plot them. Pick a neuron,
            look at its firing rate, note when it peaks. Repeat for the
            next neuron. Build up a picture of the population one cell
            at a time.
          </p>

          <p>
            This works for a while. Many motor cortex neurons have clean,
            interpretable responses. But you have a hundred of them, each
            with its own time-varying trace, across dozens of conditions.
            At some point, a hundred overlaid traces stop being
            informative and start being a wall of spaghetti.
          </p>

          <p>
            So let's try a completely different representation. At a
            single moment in time, each neuron has a firing rate. Neuron
            1 fires at 12 spikes/s, neuron 2 at 7, neuron 3 at 31, and
            so on. Write these hundred numbers as a column:
          </p>

          <Equation
            tex="r = \begin{bmatrix} 12 \\ 7 \\ 31 \\ \vdots \\ r_{100} \end{bmatrix}"
            number={1}
          />

          <p>
            That column is a <em>vector</em>. And here is the key move:
            we can think of it as a single point in a
            hundred-dimensional space, where each axis corresponds to
            one neuron's firing rate. The next time bin gives a different
            column, a different point. As time passes, the point moves,
            tracing out a trajectory through this high-dimensional space.
          </p>

          <p>
            Try this in the figure below. Each axis is a neuron. Click
            different neurons to choose which ones define the axes you
            see, and watch the trajectory reshape itself.
          </p>

          <FigureContainer
            width="wide"
            caption="Click neurons to choose which ones define the axes. The trajectory changes shape, but the underlying activity is the same. Only the viewpoint has changed."
          >
            <NeuralPopulationExplorer />
          </FigureContainer>

          <p>
            Notice what happened. The trajectory looks completely
            different depending on which neurons you pick as axes. But
            the data did not change. The firing rates are identical. Only
            the coordinates changed. The
            trajectory is a geometric object that exists independently
            of how you describe it. The coordinates are just one
            particular
            description.
            <Sidenote number={1}>
              The idea of treating neural population activity as a
              trajectory through a high-dimensional state space goes
              back to Churchland et al. <Citation numbers={[3]} /> and
              is now a standard framework in computational neuroscience.
              Cunningham and Yu <Citation numbers={[4]} /> give a review,
              and Safaie et al. <Citation numbers={[7]} /> show that
              these low-dimensional trajectories are preserved across
              individuals of the same species.
            </Sidenote>
          </p>

          <p>
            This distinction between object and description will turn
            out to be the central idea behind dimensionality reduction.
            But before we can talk about finding better descriptions,
            we need to understand what you can do with vectors.
          </p>

          <p>
            Two operations matter. You can <em>scale</em> a vector
            (multiply every entry by the same number, stretching or
            shrinking it). And you can <em>add</em> two vectors (add
            their entries, which geometrically places them tip to tail).
            Any collection of objects that supports these two operations,
            with a short list of rules about how they interact, forms
            a <em>vector space</em>.
            <Sidenote number={2}>
              Axler <Citation numbers={[5]} /> has the formal definition.
              The key implication: anything that can be added and scaled
              is a vector. Columns of firing rates qualify. But so do
              entire firing-rate trajectories{" "}
              <InlineMath tex="r(t)" />, matrices, and polynomials. The
              same theory covers all of them. For the rest of this post,
              our vectors will be concrete columns of real numbers.
            </Sidenote>
          </p>

          <p>
            Scaling and adding seem like modest operations. It is
            surprising how much structure they give you.
          </p>

          {/* ===================================================================
              Section 2 — What Can You Reach?
              =================================================================== */}
          <h2 id="linear-combinations">Linear combinations and span</h2>

          <p>
            Start small. Forget the hundred neurons. Think about two
            vectors, <InlineMath tex="u" /> and <InlineMath tex="v" />.
            Scale each by a number and add:
          </p>

          <Equation
            tex="w = \alpha\, u + \beta\, v"
            number={2}
          />

          <p>
            The result <InlineMath tex="w" /> is called
            a <em>linear combination</em>. Try it below: adjust the
            scalars and watch the resultant vector move.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Adjust <InlineMath tex="\alpha" /> and{" "}
                <InlineMath tex="\beta" /> to scale the two vectors.
                The resultant (teal) is their sum.
              </>
            }
          >
            <LinearCombinationBuilder />
          </FigureContainer>

          <p>
            Now let <InlineMath tex="\alpha" /> and{" "}
            <InlineMath tex="\beta" /> range over all real numbers. What
            is the set of all vectors you can produce this way?
          </p>

          <p>
            It depends on <InlineMath tex="u" />{" "}
            and <InlineMath tex="v" />. If they point in genuinely
            different directions, you can reach any point on a plane.
            Every point on that plane corresponds to some choice
            of <InlineMath tex="\alpha" /> and{" "}
            <InlineMath tex="\beta" />. This set of reachable vectors
            is the <em>span</em>{" "}
            of <InlineMath tex="\{u, v\}" />.
          </p>

          <p>
            But what if <InlineMath tex="v" /> happens to lie along the
            same line as <InlineMath tex="u" />? Say,{" "}
            <InlineMath tex="v = 3u" />. Then{" "}
            <InlineMath tex="\alpha u + \beta v = (\alpha + 3\beta)\, u" />.
            No matter what scalars you pick, you can only produce
            multiples of <InlineMath tex="u" />. The span collapsed from
            a plane to a line. Adding <InlineMath tex="v" /> bought you
            nothing.
          </p>

          <p>
            Drag the vectors in the figure below and watch this happen.
            When they point in different directions, the shaded region
            fills the plane. When one is a scaled copy of the other,
            the span collapses.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Drag the two vectors. When they are independent, their
                span fills the plane (shaded). When they are collinear,
                the span collapses to a line.
              </>
            }
          >
            <SpanExplorer />
          </FigureContainer>

          <p>
            This collapse is exactly what we want to detect. A set of
            vectors is <em>linearly independent</em> when none of them
            can be written as a linear combination of the others.
            Equivalently: the only way to combine them to get the zero
            vector is to use all-zero scalars. Each independent vector
            adds a genuine new direction to the span. Each dependent
            vector adds nothing.
          </p>

          <p>
            The same idea extends to any number of vectors. Three
            independent vectors in three dimensions span all of{" "}
            <InlineMath tex="\mathbb{R}^3" />. But if the third is a
            combination of the first two, you are still stuck in a plane.
            Four vectors in three dimensions must be dependent: there is
            no room for a fourth independent direction.
          </p>

          {/* ===================================================================
              Section 3 — When Does a New Neuron Help?
              =================================================================== */}
          <h2 id="independence">Independence and dimensionality</h2>

          <p>
            Here is where this connects back to the hundred-neuron
            problem.
          </p>

          <p>
            Imagine that neuron 47 always fires at exactly twice the
            rate of neuron 12. Always. Across every condition, every
            time bin. If you already recorded neuron 12, then neuron 47
            tells you nothing new. Its firing-rate vector is a scalar
            multiple of neuron 12's. It is linearly dependent on what
            you already have.
          </p>

          <p>
            Now suppose instead that neuron 47 responds during grasping,
            while neuron 12 responds during reaching. These are
            genuinely different patterns. Recording both tells you
            something about the population that recording either one
            alone could not. Neuron 47 is independent of neuron 12.
          </p>

          <p>
            Let's push this further. Suppose you go through all hundred
            neurons and find that, for every neuron beyond the first
            ten, its firing rate can be predicted as a weighted sum of
            those ten. Then the activity of the entire population is
            confined to a ten-dimensional subspace of the
            hundred-dimensional neuron space. Ten independent patterns
            explain everything. The other ninety neurons are redundant:
            they carry no information that the ten do
            not.
            <Sidenote number={3}>
              In practice, neural firing rates are never exactly linearly
              dependent. Noise ensures that. But they are often
              approximately so. Gallego et al. <Citation numbers={[8]} />{" "}
              showed that motor cortex populations of hundreds of neurons
              typically have an effective dimensionality of 10–20,
              meaning the activity is confined near a low-dimensional
              subspace. The degree of approximate confinement is
              precisely what makes PCA, factor analysis, and
              GPFA useful <Citation numbers={[4]} />.
            </Sidenote>
          </p>

          <p>
            This is the core observation behind dimensionality reduction:
            neural populations are redundant. Their activity, despite
            nominally living in a space with as many dimensions as there
            are neurons, stays close to a much smaller subspace. Finding
            that subspace is the goal. And "finding a subspace" turns
            out to mean "finding a good set of independent directions."
          </p>

          <p>
            Span and independence are not just abstract concepts. They
            tell you how many dimensions of structure your population
            actually uses. But knowing the dimensionality is only half
            the story. You also want to know whether two activity
            patterns are similar, whether they are different, and how
            different. For that, you need a way to measure.
          </p>

          {/* ===================================================================
              Section 4 — Comparing Patterns
              =================================================================== */}
          <h2 id="dot-product">The dot product</h2>

          <p>
            You record two vectors of firing rates: one from a
            leftward reach, one from a rightward reach. Are these
            population patterns similar or different? And can you
            quantify the answer?
          </p>

          <p>
            Here is a natural idea. Go neuron by neuron: multiply the
            two firing rates, then add up all the products.
          </p>

          <Equation
            tex="u \cdot v = u_1 v_1 + u_2 v_2 + \cdots + u_n v_n"
            number={3}
          />

          <p>
            This is the <em>dot product</em>. Let's think about what it
            captures. If neuron <InlineMath tex="i" /> fires strongly in
            both conditions, the product <InlineMath tex="u_i v_i" /> is
            large and positive, pulling the sum up. If it fires strongly
            in one condition and barely in the other, the product is
            small. If it fires in one and is suppressed in the other
            (positive times negative), the product is negative, pulling
            the sum down.
          </p>

          <p>
            The result is a single number that summarizes how much the
            two patterns overlap across the whole population. Large and
            positive: the same neurons are active in both conditions.
            Near zero: they activate different neurons. Negative: they
            tend to be anti-correlated.
          </p>

          <p>
            Let's make this concrete. Suppose you have three neurons.
            During a leftward
            reach, <InlineMath tex="u = (8, 2, 1)" />. During a
            rightward
            reach, <InlineMath tex="v = (1, 3, 9)" />. The dot product
            is <InlineMath tex="8(1) + 2(3) + 1(9) = 23" />. Positive,
            but not huge. Now compare <InlineMath tex="u" /> with
            itself: <InlineMath tex="8(8) + 2(2) + 1(1) = 69" />. Much
            larger. And compare <InlineMath tex="u" /> with the
            pattern <InlineMath tex="w = (-8, -2, -1)" />: you
            get <InlineMath tex="-69" />. The dot product tracks what
            your intuition
            expects.
            <Sidenote number={6}>
              Representational similarity analysis
              (RSA) <Citation numbers={[9]} /> is exactly this idea
              applied systematically. You compute the dot product (or
              cosine similarity, or correlation) between every pair of
              condition-averaged population vectors, building a
              "representational dissimilarity matrix." The geometry of
              that matrix tells you how the population organizes its
              representations. The dot product is the foundation.
            </Sidenote>
          </p>

          <p>
            There is a geometric way to state the same thing:
          </p>

          <Equation
            tex="u \cdot v = \|u\|\;\|v\|\;\cos\theta"
            number={4}
          />

          <p>
            where <InlineMath tex="\theta" /> is the angle between the
            two vectors and <InlineMath tex="\|u\|" /> is the length
            of <InlineMath tex="u" />. When the vectors point in the
            same direction, the cosine is 1 and the dot product is as
            large as the lengths allow. When they are perpendicular, the
            cosine is zero and the dot product vanishes. Perpendicular
            vectors have a name: <em>orthogonal</em>.
          </p>

          <p>
            This geometric picture gives you a way to ask: how much of
            one pattern lies along a particular direction? Imagine
            shining a flashlight perpendicular to some
            direction <InlineMath tex="v" /> and looking at the
            shadow <InlineMath tex="u" /> casts along it. The signed
            length of that shadow is the <em>scalar projection</em>:
          </p>

          <Equation
            tex="\text{proj}_v\, u = \frac{u \cdot v}{\|v\|}"
            number={5}
          />

          <p>
            When <InlineMath tex="v" /> has unit length, the
            denominator is 1. The projection is
            just <InlineMath tex="u \cdot v" />. A single dot product.
            No division, no correction.
          </p>

          <p>
            When we get to PCA in a later post, the entire computation
            will reduce to dot products with unit vectors. "How much of
            this data point lies along this principal component?" is
            answered by one dot product. That only works because
            unit-length reference vectors make the projection formula
            collapse to a single
            operation.
            <Sidenote number={4}>
              This simplification is so convenient that much of applied
              linear algebra is devoted to constructing sets of
              unit-length, mutually perpendicular vectors (orthonormal
              sets) with specific properties. PCA, the Fourier transform,
              and wavelet decompositions all amount to choosing an
              orthonormal set tailored to a particular problem.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Drag the two vectors. The projection
                of <InlineMath tex="u" /> onto <InlineMath tex="v" /> is
                drawn as a shadow. When the vectors are perpendicular,
                the dot product is zero and the shadow vanishes.
              </>
            }
          >
            <DotProductExplorer />
          </FigureContainer>

          <p>
            One more thing worth noticing. Dotting a vector with itself
            gives <InlineMath tex="v \cdot v = \|v\|^2" />, the squared
            length. So the dot product does double duty: it measures
            similarity between two vectors, and size of a single vector.
            This connection is not a coincidence. Both jobs come from the
            same underlying structure, called an <em>inner product</em>.
            The inner product on
            functions, <InlineMath tex="\langle f, g \rangle = \int f(t)\, g(t)\, dt" />,
            is what makes Fourier analysis work. Every inner product
            gives you lengths, angles, projections, and orthogonality.
            The dot product is the version for columns of numbers.
          </p>

          {/* ===================================================================
              Section 5 — What Does "Close" Mean?
              =================================================================== */}
          <h2 id="norms-and-distance">Norms and distance</h2>

          <p>
            The dot product gave us a way to measure length:{" "}
            <InlineMath tex="\|v\| = \sqrt{v \cdot v}" />. This is
            called the <InlineMath tex="L^2" /> norm:
          </p>

          <Equation
            tex="\|v\|_2 = \sqrt{v_1^2 + v_2^2 + \cdots + v_n^2}"
            number={6}
          />

          <p>
            It is the most common way to measure size. But it is not
            the only way, and the choice has consequences that are easy
            to miss.
          </p>

          <p>
            Consider two firing-rate vectors. In the first, one neuron
            fires at 100 spikes/s and the other ninety-nine are silent.
            In the second, all hundred neurons fire at 1 spike/s. Both
            vectors have the same total spike count: 100. But
            their <InlineMath tex="L^2" /> norms are 100
            and <InlineMath tex="\sqrt{100} = 10" />. The squaring
            inside the norm amplifies the single dominant entry. By
            this measure, the concentrated pattern is ten times "larger"
            than the distributed one, even though total activity is
            identical.
          </p>

          <p>
            That might or might not match what you care about. If you
            want a measure that treats total activity as size, you
            want the <InlineMath tex="L^1" /> norm, which sums absolute
            values: <InlineMath tex="\|v\|_1 = |v_1| + \cdots + |v_n|" />.
            Under this norm, both patterns have size 100. If you care
            only about the single most active neuron, you want
            the <InlineMath tex="L^\infty" /> norm:{" "}
            <InlineMath tex="\|v\|_\infty = \max_i |v_i|" />, which
            gives 100 for the first pattern and 1 for the second.
          </p>

          <p>
            These are all special cases of a single family:
          </p>

          <Equation
            tex="\|v\|_p = \left(\sum_{i=1}^{n} |v_i|^p\right)^{1/p}"
            number={7}
          />

          <p>
            Each value of <InlineMath tex="p" /> gives a different
            geometry. You can see this by looking at the <em>unit
            ball</em>, the set of all vectors with norm at most 1. Adjust{" "}
            <InlineMath tex="p" /> below and watch the shape change.
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Adjust <InlineMath tex="p" /> to see how the unit ball
                changes shape. At <InlineMath tex="p = 2" /> you get the
                familiar circle. At <InlineMath tex="p = 1" />, a diamond.
                As <InlineMath tex="p \to \infty" />, a square.
              </>
            }
          >
            <NormBallExplorer />
          </FigureContainer>

          <p>
            Why does this matter? Because when you say two population
            activity patterns are "close," you are implicitly choosing a
            norm. The distance between
            vectors <InlineMath tex="u" /> and <InlineMath tex="v" />{" "}
            is <InlineMath tex="d(u,v) = \|u - v\|" />. Change the
            norm, and two patterns that seemed close can become far
            apart, or the
            reverse.
            <Sidenote number={5}>
              Most dimensionality reduction methods (PCA, factor
              analysis, GPFA) implicitly use
              the <InlineMath tex="L^2" /> norm, inherited from the dot
              product. Sparse methods use <InlineMath tex="L^1" />{" "}
              penalties precisely because the <InlineMath tex="L^1" />{" "}
              ball has corners on the coordinate axes, which encourages
              solutions where some coordinates are exactly zero.
            </Sidenote>
          </p>

          <p>
            Everything in this series uses
            the <InlineMath tex="L^2" /> norm unless stated otherwise.
            But the choice exists, and it shapes the answers you get.
            When a method "finds the nearest point" or "minimizes
            distance," ask: distance in what sense?
          </p>

          {/* ===================================================================
              Section 6 — Why This Geometry Matters
              =================================================================== */}
          <h2 id="why-geometry">What comes next</h2>

          <p>
            These are the building blocks for almost every linear method
            in computational neuroscience. PCA finds the directions of
            greatest variance, one dot product at a time. CCA compares
            projections across two datasets. Linear decoding builds a map
            from neural space to behavioral space, which is a stack of
            dot products.
          </p>

          <p>
            But we left something unfinished. When you clicked different
            neurons as axes in the first figure, the trajectory changed
            shape. The data did not change. The description did. The
            electrode gave you one set of axes. Anatomy chose it, not
            anything about the structure in the data. There should be a
            way to choose axes that make the structure visible. And there
            should be a way to convert between different sets of axes.
          </p>

          <p>
            That is the problem of choosing a <em>basis</em> and
            converting between <em>coordinate systems</em>. It is what
            the <Link to="/blog/bases-coordinates/">next post</Link> is
            about. And it is, in a sense, the whole point: PCA, CCA,
            and PSID all amount to choosing the right basis for the
            question you are asking. What changes from method to method
            is what "right" means.
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
              Gallego, J. A., Perich, M. G., Miller, L. E., and
              Solla, S. A. "Neural manifolds for the control of
              movement,"{" "}
              <em>Neuron</em>, vol. 94, no. 5, pp. 978-984, 2017.
            </li>
            <li id="ref-9">
              Kriegeskorte, N., Mur, M., and Bandettini, P. A.
              "Representational similarity analysis — connecting the
              branches of systems neuroscience,"{" "}
              <em>Frontiers in Systems Neuroscience</em>, vol. 2, 4, 2008.
            </li>
          </ol>
        </div>

        <SeriesNav part={1} />

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
    Vectors and neural geometry &mdash; Felix Taschbach
  </title>
)

export default VectorsGeometryPost
