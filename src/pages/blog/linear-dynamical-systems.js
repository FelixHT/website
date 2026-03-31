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
import ScalarDynamicsExplorer from "../../components/blog/ScalarDynamicsExplorer"
import PhasePortraitExplorer from "../../components/blog/PhasePortraitExplorer"
import ObservationMixingExplorer from "../../components/blog/ObservationMixingExplorer"
import EigenvalueMapExplorer from "../../components/blog/EigenvalueMapExplorer"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "one-neuron", label: "One neuron, one eigenvalue" },
  { id: "state-equation", label: "Populations and the state equation" },
  { id: "observation", label: "What we observe is not what evolves" },
  { id: "eigenvalue-map", label: "The eigenvalue map" },
  { id: "what-comes-next", label: "What comes next" },
  { id: "references", label: "References" },
]

const LinearDynamicalSystemsPost = () => {
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
            Linear dynamical systems and latent state
          </h1>
          <p className="blog-post__subtitle">
            Why neural trajectories are not just clouds of points.
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
                Linear Algebra for Neural Data, Part 12
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          {/* ===================================================================
              Section 1 — One neuron, one eigenvalue
              =================================================================== */}
          <h2 id="one-neuron">One neuron, one eigenvalue</h2>

          <p>
            Everything so far in this series has been static. We took a
            snapshot of neural activity at one moment, wrote it as a
            vector, and asked questions about its structure. But neural
            activity unfolds over time. The firing rate at time step{" "}
            <InlineMath tex="t" /> depends on the firing rate at time
            step <InlineMath tex="t-1" />. To say anything about how
            neural populations evolve, we need a model of dynamics. Start
            with the simplest possible case: a single neuron.
          </p>

          <p>
            Let <InlineMath tex="x_t" /> be the firing rate of one neuron
            at time step <InlineMath tex="t" />. Suppose it evolves by a
            fixed rule: the rate at the next time step is some
            fraction <InlineMath tex="\lambda" /> of the current rate.
          </p>

          <Equation
            tex="x_{t+1} = \lambda \, x_t, \qquad \text{solution: } x_t = \lambda^t \, x_0"
            number={1}
          />

          <p>
            The scalar <InlineMath tex="\lambda" /> controls everything.
            Consider a neuron in prefrontal cortex during a working memory
            delay. The monkey saw the target, the target disappeared, and
            now the neuron holds its firing rate steady across several
            seconds of empty waiting. In the language of Equation 1, that
            is <InlineMath tex="\lambda \approx 1" />. Each time step,
            the rate reproduces itself. The state persists.
          </p>

          <p>
            Now consider a V1 neuron responding to a brief flash. The
            firing rate spikes and then decays back to baseline. That
            is <InlineMath tex="\lambda \approx 0.7" />. Each time step,
            the rate shrinks to 70% of what it was. After ten steps,
            it is down to{" "}
            <InlineMath tex="0.7^{10} \approx 0.028" /> of its initial
            value. The state fades.
          </p>

          <p>
            If <InlineMath tex="\lambda > 1" />, the rate explodes. Real
            neurons do not sustain this for long, but it matters for
            understanding stability. A network with even one unstable
            mode will, absent some nonlinearity to rein it in, blow up.
          </p>

          <p>
            The eigenvalue controls the timescale. Define the time
            constant as{" "}
            <InlineMath tex="\tau = -1 / \log |\lambda|" />. When{" "}
            <InlineMath tex="\lambda = 0.9" />,{" "}
            <InlineMath tex="\tau \approx 9.5" /> time steps: the rate
            falls to <InlineMath tex="1/e" /> of its initial value in
            about 9.5 steps. When{" "}
            <InlineMath tex="\lambda = 0.99" />,{" "}
            <InlineMath tex="\tau \approx 99.5" /> time steps. As{" "}
            <InlineMath tex="\lambda" /> approaches 1, the timescale
            diverges. The state persists
            indefinitely.
            <Sidenote number={1}>
              Working memory models in prefrontal cortex often use
              recurrent networks tuned so that the dominant eigenvalue
              sits near 1 <Citation numbers={[1, 2]} />. This gives
              persistent activity without external input. The eigenvalue
              is the knob that controls how long information is
              held. Continuous attractor models achieve{" "}
              <InlineMath tex="\lambda = 1" /> exactly through fine-tuned
              symmetry in the weight matrix, while more robust
              implementations allow <InlineMath tex="\lambda" /> slightly
              below 1 and periodically refresh the state.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Adjust <InlineMath tex="\lambda" />. Below 1 the firing
                rate decays; at 1 it persists; above 1 it grows. The time
                constant <InlineMath tex="\tau" /> diverges
                as <InlineMath tex="\lambda" /> approaches 1.
              </>
            }
          >
            <ScalarDynamicsExplorer />
          </FigureContainer>

          <p>
            This one-dimensional model is almost trivially simple. But
            every idea that matters for high-dimensional dynamics is
            already present.
            The eigenvalue <InlineMath tex="\lambda" /> determines
            stability, timescale, and qualitative behavior. In the
            next section, those scalar eigenvalues become a spectrum,
            and the system becomes far richer.
          </p>

          {/* ===================================================================
              Section 2 — Populations and the state equation
              =================================================================== */}
          <h2 id="state-equation">Populations and the state equation</h2>

          <p>
            Scale up from one neuron to a population. Instead of a
            single firing rate <InlineMath tex="x_t" />, we now have
            a <InlineMath tex="d" />-dimensional latent state
            vector <InlineMath tex="\mathbf{x}_t" /> that evolves
            according to a matrix:
          </p>

          <Equation
            tex="\mathbf{x}_{t+1} = A \, \mathbf{x}_t"
            number={2}
          />

          <p>
            The matrix <InlineMath tex="A" /> is the rule that advances
            the state by one time step. It encodes the coupling between
            dimensions: how the activity along one direction at
            time <InlineMath tex="t" /> influences every direction at
            time <InlineMath tex="t+1" />. This is the state equation,
            the core of every linear dynamical system.
          </p>

          <p>
            From Part 5, we know that if <InlineMath tex="A" /> has a
            full set of eigenvectors, it factorizes as:
          </p>

          <Equation
            tex="A = V \Lambda V^{-1}"
            number={3}
          />

          <p>
            where <InlineMath tex="\Lambda" /> is the diagonal matrix of
            eigenvalues
            and <InlineMath tex="V" /> is the matrix of eigenvectors.
            This decomposition turns the coupled system into a set of
            independent modes. Define{" "}
            <InlineMath tex="\mathbf{z}_t = V^{-1} \mathbf{x}_t" />,
            the state expressed in the eigenvector basis. Then{" "}
            <InlineMath tex="\mathbf{z}_{t+1} = \Lambda \, \mathbf{z}_t" />,
            which is just <InlineMath tex="d" /> copies of Equation 1
            running in parallel. Each eigenvector defines a mode. Its
            eigenvalue controls whether that mode grows, decays, or
            oscillates, exactly as in the scalar case.
          </p>

          <p>
            Real eigenvalues give modes that scale, one dimension at a
            time. A positive eigenvalue with{" "}
            <InlineMath tex="|\lambda| < 1" /> decays monotonically. A
            negative eigenvalue oscillates between positive and negative
            values while decaying (or growing, if{" "}
            <InlineMath tex="|\lambda| > 1" />).
          </p>

          <p>
            Complex eigenvalues give modes that rotate. A complex
            conjugate pair{" "}
            <InlineMath tex="a \pm bi" /> corresponds to a 2-by-2
            rotation-scaling block:
          </p>

          <BlockMath tex="\begin{bmatrix} a & -b \\ b & a \end{bmatrix}" />

          <p>
            The magnitude{" "}
            <InlineMath tex="|\lambda| = \sqrt{a^2 + b^2}" /> controls
            whether the rotation spirals inward (decaying), outward
            (growing), or holds a fixed radius (neutral). The
            angle <InlineMath tex="\omega = \arctan(b/a)" /> controls
            the rotation frequency. A pair of complex eigenvalues
            on the unit circle gives a perpetual oscillation. Inside
            it, a decaying spiral. Outside, an exploding one.
          </p>

          <p>
            This is not just formalism.
            Churchland et al. <Citation numbers={[3]} /> fit a linear
            dynamics model to motor cortex population activity during
            reaching. They found that the dominant eigenvalues were
            complex: the neural trajectory rotated in state space. The
            rotation frequency matched the reach duration. Their
            method, jPCA, was essentially finding the subspace where the
            dynamics matrix <InlineMath tex="A" /> has complex eigenvalues
            with the largest imaginary parts. The rotational structure
            was not imposed; it was extracted from the data by looking
            for the eigenvalues that produce rotation.
            <Sidenote number={2}>
              The distinction between discrete
              time (<InlineMath tex="\mathbf{x}_{t+1} = A\mathbf{x}_t" />)
              and continuous
              time (<InlineMath tex="d\mathbf{x}/dt = A\mathbf{x}" />)
              matters more than it might seem. In discrete time, the
              stability boundary is the unit
              circle: <InlineMath tex="|\lambda| = 1" />. In continuous
              time, it is the imaginary
              axis: <InlineMath tex="\text{Re}(\lambda) = 0" />. Most
              neural data is sampled in discrete time (binned spike
              counts, calcium imaging frames), so this series uses the
              discrete formulation. The conversion
              is <InlineMath tex="A_{\text{discrete}} = \exp(A_{\text{continuous}} \cdot \Delta t)" />,
              where <InlineMath tex="\Delta t" /> is the time bin width.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption={
              <>
                Toggle between dynamics types. Stable node: real eigenvalues
                inside the unit circle. Spiral: complex eigenvalues. Center:
                eigenvalues on the unit circle. The eigenvalue plane (right)
                shows where each pair sits relative to the stability boundary.
              </>
            }
          >
            <PhasePortraitExplorer />
          </FigureContainer>

          <p>
            So the eigendecomposition from Part 5 is not just a
            factorization trick. Applied to a dynamics
            matrix <InlineMath tex="A" />, it gives you the independent
            modes of the system, their timescales, and their frequencies.
            Every linear dynamical system is, in the eigenvector basis,
            a collection of independent scalars and 2D rotators. The
            complexity comes from how many modes there are, where
            their eigenvalues sit, and how the initial state projects
            onto each one.
          </p>

          {/* ===================================================================
              Section 3 — What we observe is not what evolves
              =================================================================== */}
          <h2 id="observation">What we observe is not what evolves</h2>

          <p>
            The state vector <InlineMath tex="\mathbf{x}_t" /> is latent. We
            never record it. What we actually measure is the activity of{" "}
            <InlineMath tex="N" /> neurons, each of which reflects the latent
            state through its own linear weighting. If the latent state
            is <InlineMath tex="d" />-dimensional and we
            record <InlineMath tex="N" /> neurons
            with <InlineMath tex="N \gg d" />, the observation equation is:
          </p>

          <Equation
            tex="\mathbf{y}_t = C \, \mathbf{x}_t + \mathbf{w}_t"
            number={4}
          />

          <p>
            Here <InlineMath tex="C" /> is
            an <InlineMath tex="N \times d" /> observation matrix
            and <InlineMath tex="\mathbf{w}_t" /> is noise. Each row
            of <InlineMath tex="C" /> belongs to one neuron. Neuron{" "}
            <InlineMath tex="i" /> fires at a rate proportional
            to <InlineMath tex="C_{i,:} \cdot \mathbf{x}_t" />, plus noise.
            The matrix <InlineMath tex="C" /> tells you how each neuron
            weighs the latent dimensions — how much of mode 1, how much
            of mode 2, and so on.
          </p>

          <p>
            Consider what this means concretely. Suppose the latent state
            is a clean 2D spiral — two dimensions rotating with a slow
            decay, exactly the kind of trajectory Churchland et
            al. <Citation numbers={[3]} /> found in motor cortex.
            Project that spiral through a{" "}
            <InlineMath tex="100 \times 2" /> matrix <InlineMath tex="C" />,
            and you get 100 correlated time series. Each neuron sees a
            different linear combination of the same two latent variables.
            Add noise, and the spiral is invisible in individual traces.
            Neuron 37 shows a bump then a dip. Neuron 84 shows two bumps.
            No single neuron reveals the structure. The structure lives in
            the relationships between neurons, encoded
            in <InlineMath tex="C" />.
          </p>

          <FigureContainer
            width="outset"
            caption="Left: a clean spiral in 2D latent space. Right: what six neurons observe — each trace is a noisy linear combination of the latent state. Toggle 'show latent' to reveal the two hidden dimensions driving all six traces."
          >
            <ObservationMixingExplorer />
          </FigureContainer>

          <p>
            This is the same idea we encountered in Part 2 (a basis change
            hides structure) and Part 4 (projection loses dimensions), but
            now it plays out over time. The question is no longer "which
            subspace does the data live in" but "which subspace does the
            data <em>evolve</em> in." The latent state has dynamics; the
            observations are a high-dimensional shadow of those dynamics.
          </p>

          <p>
            Together, Equations 2 and 4 form a{" "}
            <strong>linear dynamical system</strong> (LDS), also called a
            state-space model. The state equation (Equation 2) governs how
            the latent state evolves. The observation equation (Equation 4)
            governs what we see. Fitting an LDS to neural data means
            estimating <InlineMath tex="A" />, <InlineMath tex="C" />,
            and the noise statistics from the recorded spike trains or
            fluorescence traces.
            <Sidenote number={3}>
              GPFA <Citation numbers={[4]} /> and
              LFADS <Citation numbers={[5]} /> both use this state-space
              structure. GPFA assumes linear dynamics with Gaussian process
              smoothing of the latent trajectories. LFADS replaces the
              linear dynamics with a recurrent neural network, gaining the
              ability to model nonlinear evolution. But the observation
              equation is the same in
              both: <InlineMath tex="\mathbf{y} = C\mathbf{x} + \text{noise}" />.
              The split between latent dynamics and observed projection
              is the shared scaffold.
            </Sidenote>
          </p>

          {/* ===================================================================
              Section 4 — The eigenvalue map
              =================================================================== */}
          <h2 id="eigenvalue-map">The eigenvalue map</h2>

          <p>
            Every linear dynamical system is characterized by the
            eigenvalues of its dynamics matrix <InlineMath tex="A" />.
            Plot them in the complex plane.
          </p>

          <p>
            The unit circle is the stability boundary. An eigenvalue
            inside the circle corresponds to a decaying mode. Outside,
            a growing mode. On the circle, a mode that neither grows
            nor decays — sustained indefinitely.
          </p>

          <p>
            Position on the real axis matters too. An eigenvalue sitting
            on the real axis produces no oscillation — the mode simply
            scales up or down each time step. An eigenvalue off the real
            axis oscillates. The angle from the positive real axis gives
            the frequency: larger angles mean faster rotation. The
            distance from the origin gives the growth or decay rate per
            step.
          </p>

          <p>
            Translate this to neural populations. Slow modes — eigenvalues
            near 1 on the real axis — correspond to persistent activity.
            A prefrontal population holding a stimulus identity across a
            delay period lives in a mode like this. Fast modes —
            eigenvalues near 0 — correspond to transient responses that
            die out within a few time steps: a brief sensory-evoked volley
            that fades before the next stimulus arrives. Complex
            eigenvalues correspond to rhythmic or rotational structure. The
            motor cortex reaching dynamics from Section 2, where the neural
            trajectory traces a spiral in state space, arise from a
            conjugate pair sitting just inside the unit circle. The angle
            sets the rotation speed; the radius sets how quickly the
            spiral decays.
          </p>

          <FigureContainer
            width="outset"
            caption="Drag eigenvalues in the complex plane. The right panel shows each mode's time course. Inside the unit circle: decaying. Outside: growing. Off the real axis: oscillating."
          >
            <EigenvalueMapExplorer />
          </FigureContainer>

          <p>
            The eigenvalue map is the complete signature of a linear
            dynamical system. Two systems with the same eigenvalues —
            possibly expressed in entirely different coordinate systems,
            with different observation matrices, different neuron
            counts — have the same qualitative dynamics. This is the
            dynamical analogue of the basis-change story from Part 2:
            the eigenvalues are invariant, the coordinates are not.
            <Sidenote number={4}>
              For neural data, you estimate <InlineMath tex="A" /> from
              recordings and then inspect its eigenvalues to learn the
              population's dynamical repertoire. Macke et
              al. <Citation numbers={[7]} /> used this approach to
              characterize the timescales and oscillation frequencies of
              cortical population dynamics, reading off the decay rates
              and rotational periods directly from the eigenvalue
              spectrum.
            </Sidenote>
          </p>

          {/* ===================================================================
              Section 5 — What comes next
              =================================================================== */}
          <h2 id="what-comes-next">What comes next</h2>

          <p>
            The state-space model has two unknowns: the dynamics
            matrix <InlineMath tex="A" /> and the observation
            matrix <InlineMath tex="C" />. Given recorded neural
            data <InlineMath tex="\mathbf{y}_1, \ldots, \mathbf{y}_T" />,
            can we recover them? In practice we record only the
            observations — the spiking of hundreds of neurons across
            time — and the latent state is never directly accessible.
            The question of recovering the model from data is not
            just a technical convenience; it is the only way to test
            whether a linear dynamical system is actually a good
            description of how a population evolves.
          </p>

          <p>
            This is the system identification problem. The key tool
            turns out to be the Hankel matrix — a matrix built from
            time-lagged observations, where row <InlineMath tex="i" />
            and column <InlineMath tex="j" /> holds the observation at
            lag <InlineMath tex="i + j - 2" />. Its SVD reveals the
            latent dimensionality and the subspace structure of the
            system: the singular values tell you how many dimensions
            the dynamics actually occupy, and the singular vectors
            encode the observation and state subspaces. The next post
            derives subspace identification
            <Citation numbers={[8]} /> from this starting point,
            connecting the Hankel construction back to the SVD
            and low-rank approximation tools developed earlier in
            this series.
          </p>

          {/* ===================================================================
              References
              =================================================================== */}
          <h2 id="references">References</h2>
          <ol className="blog-references">
            <li id="ref-1">
              Romo, R., Brody, C. D., Hernández, A., and Lemus, L.
              "Neuronal correlates of parametric working memory in the
              prefrontal cortex,"{" "}
              <em>Nature</em>, vol. 399, pp. 470-473, 1999.
            </li>
            <li id="ref-2">
              Goldman, M. S. "Memory without feedback in a neural
              network,"{" "}
              <em>Neuron</em>, vol. 61, no. 4, pp. 621-634, 2009.
            </li>
            <li id="ref-3">
              Churchland, M. M., Cunningham, J. P., Kaufman, M. T., et al.
              "Neural population dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51-56, 2012.
            </li>
            <li id="ref-4">
              Yu, B. M., Cunningham, J. P., Santhanam, G., et al.
              "Gaussian-process factor analysis for low-dimensional
              single-trial analysis of neural population activity,"{" "}
              <em>Journal of Neurophysiology</em>, vol. 102, no. 1,
              pp. 614-635, 2009.
            </li>
            <li id="ref-5">
              Pandarinath, C., O'Shea, D. J., Collins, J., et al.
              "Inferring single-trial neural population dynamics using
              sequential auto-encoders,"{" "}
              <em>Nature Methods</em>, vol. 15, no. 10, pp. 805-815, 2018.
            </li>
            <li id="ref-6">
              Shenoy, K. V., Sahani, M., and Churchland, M. M.
              "Cortical control of arm movements: a dynamical systems
              perspective,"{" "}
              <em>Annual Review of Neuroscience</em>, vol. 36, pp. 337-359, 2013.
            </li>
            <li id="ref-7">
              Macke, J. H., Buesing, L., Cunningham, J. P., et al.
              "Empirical models of spiking in neural populations,"{" "}
              <em>Advances in Neural Information Processing Systems</em>,
              vol. 24, 2011.
            </li>
            <li id="ref-8">
              Van Overschee, P. and De Moor, B.{" "}
              <em>Subspace Identification for Linear Systems</em>.
              Kluwer Academic Publishers, 1996.
            </li>
          </ol>
        </div>

        <SeriesNav part={12} />

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
    Linear dynamical systems and latent state &mdash; Felix Taschbach
  </title>
)

export default LinearDynamicalSystemsPost
