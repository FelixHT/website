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
import HankelBuilder from "../../components/blog/HankelBuilder"
import HankelSVD from "../../components/blog/HankelSVD"
import SubspaceRecoveryExplorer from "../../components/blog/SubspaceRecoveryExplorer"
import DimensionalityCriterionExplorer from "../../components/blog/DimensionalityCriterionExplorer"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "inverse-problem", label: "The inverse problem" },
  { id: "time-lagged", label: "Time-lagged structure" },
  { id: "hankel-svd", label: "The Hankel SVD" },
  { id: "recovering", label: "Recovering the system" },
  { id: "dimensionality", label: "How many latent dimensions" },
  { id: "what-comes-next", label: "What comes next" },
  { id: "references", label: "References" },
]

const SubspaceIdentificationPost = () => {
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
            Subspace identification
          </h1>
          <p className="blog-post__subtitle">
            Recovering latent dynamics from recorded neural activity.
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
                Linear Algebra for Neural Data, Part 13
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          {/* ===================================================================
              Section 1 — The inverse problem
              =================================================================== */}
          <h2 id="inverse-problem">The inverse problem</h2>

          <p>
            You recorded 100 neurons in motor cortex during a reaching
            task. From{" "}
            <Link to="/blog/linear-dynamical-systems">Part 12</Link>,
            you know a useful model for what is going on: there is a
            low-dimensional latent state{" "}
            <InlineMath tex="x_t \in \mathbb{R}^d" /> that evolves
            according to linear dynamics, and each neuron's firing rate
            is a linear readout of that state plus noise. Written out:
          </p>

          <Equation
            tex="x_{t+1} = A x_t"
            number={1}
          />

          <Equation
            tex="y_t = C x_t + w_t"
            number={2}
          />

          <p>
            Here <InlineMath tex="A" /> is{" "}
            <InlineMath tex="d \times d" /> (the dynamics),{" "}
            <InlineMath tex="C" /> is{" "}
            <InlineMath tex="N \times d" /> (the observation map from
            latent state to neural activity), and{" "}
            <InlineMath tex="w_t" /> is observation noise. You
            observe <InlineMath tex="y_t" />, the full vector of 100
            firing rates at each time step. You want{" "}
            <InlineMath tex="A" /> and <InlineMath tex="C" />.
          </p>

          <p>
            The naive approach is to treat the latent
            states <InlineMath tex="x_t" /> as unknowns and estimate
            everything jointly. This runs into trouble fast. With{" "}
            <InlineMath tex="d" /> latent dimensions
            and <InlineMath tex="N" /> neurons, you need a{" "}
            <InlineMath tex="d \times d" /> dynamics
            matrix <InlineMath tex="A" />, an{" "}
            <InlineMath tex="N \times d" /> observation
            matrix <InlineMath tex="C" />, and{" "}
            <InlineMath tex="T" /> latent state
            vectors <InlineMath tex="x_t" />. The number of unknowns
            grows with the length of the recording, and the problem is
            not identified without additional constraints. You could
            impose structure and iterate (EM does exactly this), but
            there is a more direct route.
          </p>

          <p>
            The key idea: don't try to estimate the latent
            states <InlineMath tex="x_t" /> directly. Instead, exploit
            the temporal structure of the observations themselves.
            Consecutive observations are not independent. They are
            generated by the same latent state evolving
            through <InlineMath tex="A" />. That shared dynamical
            structure leaves a signature in the data: a particular
            pattern of correlations across time lags that can be read
            off with the SVD.
          </p>

          {/* ===================================================================
              Section 2 — Time-lagged structure
              =================================================================== */}
          <h2 id="time-lagged">Time-lagged structure</h2>

          <p>
            To see the signature, stack consecutive observations into a
            single tall vector. Pick a window length{" "}
            <InlineMath tex="p" /> and, starting at time{" "}
            <InlineMath tex="t" />, concatenate{" "}
            <InlineMath tex="p" /> successive observation vectors:
          </p>

          <Equation
            tex="z_t = \begin{bmatrix} y_t \\ y_{t+1} \\ y_{t+2} \\ \vdots \\ y_{t+p-1} \end{bmatrix}"
            number={3}
          />

          <p>
            Each <InlineMath tex="z_t" /> lives in{" "}
            <InlineMath tex="\mathbb{R}^{pN}" />, a{" "}
            <InlineMath tex="pN" />-dimensional vector built from{" "}
            <InlineMath tex="p" /> windows of{" "}
            <InlineMath tex="N" /> neurons. Now substitute the
            state-space model. The observation at
            time <InlineMath tex="t" /> is{" "}
            <InlineMath tex="y_t = Cx_t" /> (ignoring noise for the
            moment). The observation at{" "}
            <InlineMath tex="t+1" /> is{" "}
            <InlineMath tex="y_{t+1} = Cx_{t+1} = CAx_t" />. At{" "}
            <InlineMath tex="t+2" />,{" "}
            <InlineMath tex="y_{t+2} = CA^2 x_t" />. In general, the
            observation <InlineMath tex="k" /> steps ahead is{" "}
            <InlineMath tex="CA^k x_t" />. So the stacked vector has a
            compact form:
          </p>

          <Equation
            tex="z_t = \underbrace{\begin{bmatrix} C \\ CA \\ CA^2 \\ \vdots \\ CA^{p-1} \end{bmatrix}}_{\mathcal{O}} x_t"
            number={4}
          />

          <p>
            The matrix <InlineMath tex="\mathcal{O}" /> is called
            the <em>extended observability matrix</em>.
            <Sidenote number={1}>
              The observability matrix comes from control theory. A
              system <InlineMath tex="(A, C)" /> is said to
              be <em>observable</em> if{" "}
              <InlineMath tex="\mathcal{O}" /> has full column rank,
              meaning the latent state can, in principle, be
              reconstructed from the observations. For the subspace
              identification method to work, the system must be
              observable: every latent dimension must leave some trace
              in the recorded neurons.
            </Sidenote>
            {" "}Each block row tells you how the latent state at
            time <InlineMath tex="t" /> maps to the observation at a
            particular lag: <InlineMath tex="C" /> maps it to the
            current observation, <InlineMath tex="CA" /> maps it to
            the next time step, <InlineMath tex="CA^2" /> to two
            steps ahead, and so on. The dynamics
            matrix <InlineMath tex="A" /> is baked into the structure
            of <InlineMath tex="\mathcal{O}" />.
          </p>

          <p>
            Now collect <InlineMath tex="z_t" /> for all valid starting
            times <InlineMath tex="t = 1, \ldots, T - p + 1" /> and
            arrange them as columns of a matrix:
          </p>

          <Equation
            tex="H = \begin{bmatrix} z_1 & z_2 & \cdots & z_{T-p+1} \end{bmatrix} = \mathcal{O} \begin{bmatrix} x_1 & x_2 & \cdots & x_{T-p+1} \end{bmatrix}"
            number={5}
          />

          <p>
            This is the <em>Hankel matrix</em>. It has{" "}
            <InlineMath tex="pN" /> rows and{" "}
            <InlineMath tex="T - p + 1" /> columns, but its rank is at
            most <InlineMath tex="d" />, the latent dimensionality. It
            does not matter how many neurons you recorded or how many
            time lags you stacked. The rank
            of <InlineMath tex="H" /> is bounded by the rank
            of <InlineMath tex="\mathcal{O}" />, which
            is <InlineMath tex="d" /> (assuming observability). The
            observations are high-dimensional, but the time-lagged
            structure they contain is low-rank because it is generated
            by a low-dimensional latent process.
          </p>

          <FigureContainer
            width="outset"
            caption="The Hankel matrix stacks time-lagged windows of observations. Each row is a history of p consecutive time steps. The rank of this matrix equals the latent dimensionality."
          >
            <HankelBuilder />
          </FigureContainer>

          {/* ===================================================================
              Section 3 — The Hankel SVD
              =================================================================== */}
          <h2 id="hankel-svd">The Hankel SVD</h2>

          <p>
            The Hankel matrix <InlineMath tex="H" /> is large, potentially thousands of rows and columns, but its rank is
            small. From{" "}
            <Link to="/blog/svd">Part 6</Link>, you know what to do
            with a matrix like that: take its SVD.
          </p>

          <Equation
            tex="H = U \Sigma V^\top"
            number={6}
          />

          <p>
            The singular values{" "}
            <InlineMath tex="\sigma_1 \geq \sigma_2 \geq \cdots" />{" "}
            drop off. In the noiseless case, exactly{" "}
            <InlineMath tex="d" /> of them are nonzero and the rest are
            zero. With noise, you get a gap: the
            first <InlineMath tex="d" /> singular values are large
            (they correspond to the latent dynamics) and the remaining
            ones are small (they correspond to noise). The number of
            significant singular values tells you the latent
            dimensionality, just as it did for PCA. The difference is that
            the matrix here is not a covariance matrix but a matrix of
            time-lagged observations.
          </p>

          <p>
            The left singular vectors carry the observability subspace.
            The first <InlineMath tex="d" /> columns
            of <InlineMath tex="U" /> span the same column space
            as <InlineMath tex="\mathcal{O}" />, the subspace through
            which the latent state is observed by the neurons. Denote
            the truncated SVD as{" "}
            <InlineMath tex="H \approx U_d \Sigma_d V_d^\top" />,
            keeping only the first <InlineMath tex="d" /> components.
            Then <InlineMath tex="U_d" /> is a{" "}
            <InlineMath tex="pN \times d" /> matrix whose columns are
            an orthonormal basis for the observability subspace.
          </p>

          <p>
            The right singular vectors encode the latent state sequence.
            The columns of <InlineMath tex="V_d" /> are
            the <InlineMath tex="d" />-dimensional latent
            trajectories, up to a change of basis. You do not recover
            the original <InlineMath tex="x_t" /> (as discussed in{" "}
            <Link to="/blog/bases-coordinates">Part 2</Link>, the
            latent state is only defined up to an invertible linear
            transformation), but you recover a version of it that
            preserves all the structure that matters: the subspace it
            lives in, the dynamics it obeys, and the observations it
            generates.
            <Sidenote number={2}>
              This is the core of all subspace identification methods:
              N4SID <Citation numbers={[1]} />,
              MOESP <Citation numbers={[2]} />,
              and CVA <Citation numbers={[3]} />. They differ in how
              they weight the Hankel matrix before taking the SVD.
              N4SID uses an oblique projection, MOESP uses an
              orthogonal one, CVA normalizes by the noise covariance.
              But the skeleton is the same everywhere. Build a Hankel
              matrix, take its SVD, read off the subspace. The
              differences in weighting affect statistical efficiency,
              not the fundamental structure.
            </Sidenote>
          </p>

          <p>
            The singular values themselves tell you how much variance
            each latent mode explains in the time-lagged observations.
            A mode with a large singular value contributes strongly to
            the temporal correlations in the data. A mode with a small
            singular value contributes little. If it is below the
            noise floor, it is probably not real. This gives you a
            principled way to choose the latent dimensionality, which
            we return to in a later section.
          </p>

          <FigureContainer
            width="outset"
            caption="The SVD of the Hankel matrix. The number of significant singular values reveals the latent dimensionality. The left singular vectors span the subspace through which the latent state is observed."
          >
            <HankelSVD />
          </FigureContainer>

          {/* ===================================================================
              Section 4 — Recovering the system
              =================================================================== */}
          <h2 id="recovering">Recovering the system</h2>

          <p>
            You now have the observability subspace: the
            first <InlineMath tex="d" /> columns
            of <InlineMath tex="U" /> from the Hankel SVD. Call
            this <InlineMath tex="pN \times d" /> matrix{" "}
            <InlineMath tex="\hat{\mathcal{O}}" />. It is an estimate
            of the extended observability
            matrix <InlineMath tex="\mathcal{O}" />, and it contains
            everything you need to extract <InlineMath tex="A" /> and{" "}
            <InlineMath tex="C" />.
          </p>

          <p>
            Start with <InlineMath tex="C" />. Look at the structure
            of <InlineMath tex="\mathcal{O}" />: its first block row
            is <InlineMath tex="C" /> itself. So{" "}
            <InlineMath tex="C" /> is just the first{" "}
            <InlineMath tex="N" /> rows
            of <InlineMath tex="\hat{\mathcal{O}}" />. That is the
            observation matrix, which is the linear map from the latent state to
            neural activity at a single time step. No optimization
            required, no iteration. You read it off.
          </p>

          <p>
            Getting <InlineMath tex="A" /> takes one more step. The key
            is a shift relation between consecutive block rows
            of <InlineMath tex="\mathcal{O}" />. The second block row
            is <InlineMath tex="CA" />, the third
            is <InlineMath tex="CA^2" />, and so on. If you
            define <InlineMath tex="\mathcal{O}_\uparrow" /> as{" "}
            <InlineMath tex="\mathcal{O}" /> with its last block row
            removed and <InlineMath tex="\mathcal{O}_\downarrow" /> as{" "}
            <InlineMath tex="\mathcal{O}" /> with its first block row
            removed, then:
          </p>

          <Equation
            tex="\mathcal{O}_\downarrow = \mathcal{O}_\uparrow \, A"
            number={7}
          />

          <p>
            Every row of <InlineMath tex="\mathcal{O}_\downarrow" /> is
            the corresponding row
            of <InlineMath tex="\mathcal{O}_\uparrow" /> multiplied
            by <InlineMath tex="A" />. You know both sides of this
            equation (they come from{" "}
            <InlineMath tex="\hat{\mathcal{O}}" />), so you solve
            for <InlineMath tex="A" /> by least squares. In practice this
            is a single line of code: <InlineMath tex="A = \mathcal{O}_\uparrow^{\dagger} \, \mathcal{O}_\downarrow" />,
            where the dagger denotes the pseudoinverse.
          </p>

          <p>
            Finally, the latent states themselves. Given{" "}
            <InlineMath tex="C" />, you can recover the latent state at
            any time step by projecting the observation onto the
            identified subspace:{" "}
            <InlineMath tex="\hat{x}_t = C^{\dagger} y_t" />. Or you can
            read the full trajectory from the right singular
            vectors: <InlineMath tex="\hat{x}_t" /> is the{" "}
            <InlineMath tex="t" />-th row
            of <InlineMath tex="\Sigma_d V_d^\top" />, rescaled
            appropriately. Either way, you get a{" "}
            <InlineMath tex="d" />-dimensional trajectory that captures
            the latent dynamics underlying the recorded neural activity.
          </p>

          <p>
            One important caveat. The recovered coordinates are not
            unique. If <InlineMath tex="T" /> is any{" "}
            <InlineMath tex="d \times d" /> invertible matrix, you
            can define a new latent
            state <InlineMath tex="x' = Tx" />, a new dynamics
            matrix <InlineMath tex="A' = TAT^{-1}" />, and a new
            observation matrix <InlineMath tex="C' = CT^{-1}" />.
            This transformed system produces exactly the same
            observations as the original. The subspace is unique: the
            column space of <InlineMath tex="\mathcal{O}" /> does not
            depend on <InlineMath tex="T" />. But the coordinates
            within it are not. This is the same basis ambiguity you
            encountered in{" "}
            <Link to="/blog/bases-coordinates">Part 2</Link>: any
            invertible change of basis gives an equally valid
            representation.
            <Sidenote number={3}>
              The coordinate ambiguity is why you cannot directly compare
              latent states across two separately identified systems. If
              you fit a model to monkey A's motor cortex and another to
              monkey B's, the two latent spaces may capture similar
              dynamics but in different coordinate systems. Aligning them
              requires Procrustes rotation ({" "}
              <Link to="/blog/procrustes-alignment">Part 10</Link>) or
              CCA (<Link to="/blog/cca">Part 9</Link>).
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="True latent trajectory (left) vs recovered (right). At d = 2 the recovered spiral matches the true one. At d = 1 it collapses. At d > 2 extra noisy dimensions appear. Adjust d with the slider."
          >
            <SubspaceRecoveryExplorer />
          </FigureContainer>

          {/* ===================================================================
              Section 5 — How many latent dimensions
              =================================================================== */}
          <h2 id="dimensionality">How many latent dimensions</h2>

          <p>
            Everything so far has assumed you know{" "}
            <InlineMath tex="d" />, the number of latent dimensions.
            In practice, you have to choose it. The singular values of
            the Hankel matrix tell you how.
          </p>

          <p>
            In the noiseless case, the answer is exact. The Hankel matrix
            has rank <InlineMath tex="d" />, so exactly{" "}
            <InlineMath tex="d" /> singular values are nonzero and the
            rest are zero. With noise, this clean picture blurs. The
            first few singular values are large (they correspond to the
            true latent modes) and the remaining ones are small but not
            zero. You are looking for a gap: a point where the singular
            values drop from "large" to "small." The number of singular
            values above the gap is your estimate of{" "}
            <InlineMath tex="d" />.
          </p>

          <p>
            This is the same logic as PCA's scree plot from{" "}
            <Link to="/blog/pca">Part 7</Link>, applied to the Hankel
            matrix instead of the data covariance. Large singular values
            correspond to directions that carry structured temporal
            correlations. Small ones carry noise. The gap separates the
            two.
          </p>

          <p>
            In practice, the gap is rarely clean. Finite data smooths the
            transition from signal to noise, and the drop-off is gradual
            rather than sharp. Choosing <InlineMath tex="d" /> requires
            judgment. Cross-validation is one option: fit models with
            different values of <InlineMath tex="d" />, hold out a
            portion of the data, and pick the <InlineMath tex="d" /> that
            predicts held-out observations best. Information criteria
            like AIC or BIC penalize model complexity and provide an
            alternative. The parallel analysis approach from PCA also works
            here: compare the singular values to those obtained from shuffled data
            and keep the components that exceed the shuffled baseline. None of these methods is perfect, but they
            all point in the same direction: pick the smallest{" "}
            <InlineMath tex="d" /> that captures the temporal structure
            in the data without fitting the noise.
            <Sidenote number={4}>
              For neural data, the singular value gap is often ambiguous
              because neural noise is correlated, not white. Correlated
              noise inflates the small singular values, pushing them
              closer to the signal range and obscuring the boundary.
              Methods like GPFA <Citation numbers={[4]} /> handle this by
              modeling the noise structure explicitly by fitting a
              Gaussian process prior over the latent states and a
              separate noise covariance for the observations.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="Singular values of the Hankel matrix. The first two are large (signal); the rest are small (noise). Drag the threshold to choose how many dimensions to keep."
          >
            <DimensionalityCriterionExplorer />
          </FigureContainer>

          {/* ===================================================================
              Section 6 — What comes next
              =================================================================== */}
          <h2 id="what-comes-next">What comes next</h2>

          <p>
            Standard subspace identification recovers the latent dynamics
            that best explain the neural observations. "Best" here means
            the dynamics that account for the most variance in the
            time-lagged observation matrix. This is the right criterion
            if you want a compact description of what the neural
            population is doing. But it has a blind spot: it privileges
            directions of high variance in the neural population, the
            same bias PCA has. If the behaviorally relevant dynamics
            happen to lie along low-variance directions (directions
            that move the arm but do not dominate the population
            firing rates), standard subspace identification will miss
            them or bury them in the noise.
          </p>

          <p>
            Preferential subspace identification (PSID) fixes
            this <Citation numbers={[5]} />. Instead of asking "what
            dynamics explain the most neural variance?", PSID asks "what
            dynamics are most relevant to behavior?" Its first stage uses
            CCA between time-lagged neural activity and behavioral
            variables to find the behaviorally relevant subspace: the
            latent directions that predict movements, forces, or
            whatever behavioral signal you recorded. Its second stage
            recovers the remaining dynamics from the residual neural
            activity. The result is a latent system cleanly partitioned
            into two components: one that drives behavior and one that
            does not.
          </p>

          <p>
            That partition is the subject of the{" "}
            <Link to="/blog/psid/">next post</Link>.
          </p>

          {/* ===================================================================
              References
              =================================================================== */}
          <h2 id="references">References</h2>
          <ol className="blog-references">
            <li id="ref-1">
              Van Overschee, P. and De Moor, B.{" "}
              <em>Subspace Identification for Linear Systems</em>.
              Kluwer Academic Publishers, 1996.
            </li>
            <li id="ref-2">
              Churchland, M. M., Cunningham, J. P., Kaufman, M. T., et al.
              "Neural population dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51-56, 2012.
            </li>
            <li id="ref-3">
              Cunningham, J. P. and Yu, B. M. "Dimensionality reduction
              for large-scale neural recordings,"{" "}
              <em>Nature Neuroscience</em>, vol. 17, pp. 1500-1509, 2014.
            </li>
            <li id="ref-4">
              Yu, B. M., Cunningham, J. P., Santhanam, G., et al.
              "Gaussian-process factor analysis for low-dimensional
              single-trial analysis of neural population activity,"{" "}
              <em>Journal of Neurophysiology</em>, vol. 102, no. 1,
              pp. 614-635, 2009.
            </li>
            <li id="ref-5">
              Sani, O. G., Abbaspourazad, H., Wong, Y. T., et al.
              "Modeling behaviorally relevant neural dynamics enabled by
              preferential subspace identification,"{" "}
              <em>Nature Neuroscience</em>, vol. 24, pp. 140-149, 2021.
            </li>
            <li id="ref-6">
              Pandarinath, C., O'Shea, D. J., Collins, J., et al.
              "Inferring single-trial neural population dynamics using
              sequential auto-encoders,"{" "}
              <em>Nature Methods</em>, vol. 15, no. 10, pp. 805-815, 2018.
            </li>
          </ol>
        </div>

        <SeriesNav part={13} />

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
    Subspace identification &mdash; Felix Taschbach
  </title>
)

export default SubspaceIdentificationPost
