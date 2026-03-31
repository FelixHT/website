import React, { useRef, useState, useEffect } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
import Sidenote from "../../components/Sidenote"
import Citation from "../../components/Citation"
import { InlineMath, BlockMath, Equation } from "../../components/Math"
import FigureContainer from "../../components/blog/FigureContainer"
import TableOfContents from "../../components/blog/TableOfContents"
import EigenvalueExplorer from "../../components/blog/EigenvalueExplorer"
import PSIDTeaser from "../../components/blog/PSIDTeaser"
import LatentDynamicsExplorer from "../../components/blog/LatentDynamicsExplorer"
import ObservabilityExplorer from "../../components/blog/ObservabilityExplorer"
import HankelBuilder from "../../components/blog/HankelBuilder"
import HankelSVD from "../../components/blog/HankelSVD"
import CCATimeLagged from "../../components/blog/CCATimeLagged"
import SubspaceIDResult from "../../components/blog/SubspaceIDResult"
import MixingProblem from "../../components/blog/MixingProblem"
import PSIDExplorer from "../../components/blog/PSIDExplorer"
import DimSpecExplorer from "../../components/blog/DimSpecExplorer"
import PSIDValidation from "../../components/blog/PSIDValidation"
import SubspacePartition from "../../components/blog/SubspacePartition"
import CodeBlock from "../../components/blog/CodeBlock"
import VariableLegend from "../../components/blog/VariableLegend"
import SeriesNav from "../../components/SeriesNav"
import "./blog-post.css"

const TOC_ITEMS = [
  { id: "introduction", label: "Introduction" },
  { id: "state-space", label: "State-space models" },
  { id: "subspace-id", label: "Subspace identification" },
  { id: "behavior", label: "Adding behavior" },
  { id: "psid", label: "Preferential subspace identification" },
  { id: "misleads", label: "When PSID misleads" },
  { id: "extensions", label: "Extensions" },
  { id: "limitations", label: "Assumptions and limitations" },
  { id: "neighbors", label: "PSID and its neighbors" },
  { id: "implementation", label: "Implementation" },
  { id: "references", label: "References" },
]

const PSIDPost = () => {
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
            Preferential Subspace Identification
          </h1>
          <p className="blog-post__subtitle">
            Recovering latent dynamics from neural recordings and separating
            behaviorally relevant from irrelevant structure, derived from scratch
            with interactive figures.
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
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Series</span>
              <span className="blog-post__byline-value">
                Linear Algebra for Neural Data, Part 14
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          <VariableLegend />

          <FigureContainer width="outset" caption="PSID separates neural dynamics into behaviorally relevant (orange) and irrelevant (gray) subspaces. Top: raw neural activity (teal). Middle: behavioral readout (orange). Bottom: recovered latent dimensions.">
            <PSIDTeaser />
          </FigureContainer>

          <h2 id="introduction">Introduction</h2>

          <p>
            In the <Link to="/blog/subspace-identification/">previous post</Link>, we
            recovered latent dynamics from neural recordings using subspace
            identification. The method finds the subspace that best explains the
            observed neural activity — the directions in which the population
            moves in ways that are consistent, low-dimensional, and temporally
            structured. But "best for explaining observations" is not the same as
            "best for predicting behavior."
          </p>

          <p>
            This post extends subspace identification to preferentially extract the
            dynamics that relate to behavior. The result is Preferential Subspace
            Identification, or PSID <Citation numbers={1} />, a method that
            cleanly partitions latent neural dynamics into a behaviorally
            relevant subspace and an irrelevant one.
            <Sidenote number={1}>
              PSID was introduced by Sani et al. <Citation numbers={1} /> as a
              way to dissociate behaviorally relevant neural dynamics from
              the full latent state. The key idea: use CCA in a subspace
              identification framework to preferentially extract the dynamics
              that predict behavior.
            </Sidenote>
          </p>

          <p>
            Everything is derived from scratch. I assume you are comfortable with
            linear algebra basics (matrix multiplication, eigenvalues, SVD) but
            nothing about state-space models, system identification, or dynamics.
            If you have read the CCA post, you will recognize some of the
            machinery (particularly the whitening-then-SVD step), but it is not
            required.
          </p>

          <h2 id="state-space">State-space models</h2>

          <p>
            A linear state-space model describes a system evolving through time
            in two equations. The <em>state equation</em> says that the latent
            state <InlineMath tex="{\color{#4A90D9}x_t} \in \mathbb{R}^{\color{#4A90D9}d}" /> evolves linearly:
          </p>

          <Equation number={1} tex="{\color{#4A90D9}x_{t+1}} = {\color{#4A90D9}A}\, {\color{#4A90D9}x_t} + {\color{#999999}w_t}" />

          <p>
            where <InlineMath tex="{\color{#4A90D9}A} \in \mathbb{R}^{{\color{#4A90D9}d} \times {\color{#4A90D9}d}}" /> is the
            state transition matrix and{" "}
            <InlineMath tex="{\color{#999999}w_t} \sim \mathcal{N}(0, \sigma_w^2 I)" /> is
            process noise. The matrix <InlineMath tex="{\color{#4A90D9}A}" /> encodes the
            dynamics: its eigenvalues determine whether the system oscillates,
            decays, or drifts, and how fast.
            <Sidenote number={2}>
              Linear state-space models date to Kalman's foundational
              work <Citation numbers={2} /> on optimal filtering. The framework
              is general enough to describe everything from electrical circuits
              to population dynamics, and it remains the default starting point
              for modeling temporal neural data.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="Drag the eigenvalue in the complex plane. Inside the unit circle: decaying. Outside: growing. Off the real axis: oscillating. The trajectory on the right shows what these dynamics look like in practice.">
            <EigenvalueExplorer />
          </FigureContainer>

          <p>
            The <em>observation equation</em> says that we never see the latent
            state directly. Instead, we observe a noisy linear function of it:
          </p>

          <Equation number={2} tex="{\color{#4A7C6F}y_t} = {\color{#4A7C6F}C}\, {\color{#4A90D9}x_t} + {\color{#999999}v_t}" />

          <p>
            where <InlineMath tex="{\color{#4A7C6F}C} \in \mathbb{R}^{{\color{#4A7C6F}m} \times {\color{#4A90D9}d}}" /> maps the{" "}
            <InlineMath tex="{\color{#4A90D9}d}" />-dimensional latent state to{" "}
            <InlineMath tex="{\color{#4A7C6F}m}" /> observed variables (e.g., neurons), and{" "}
            <InlineMath tex="{\color{#999999}v_t} \sim \mathcal{N}(0, \sigma_v^2 I)" /> is
            observation noise. In a neural recording,{" "}
            <InlineMath tex="{\color{#4A7C6F}y_t}" /> might be the firing rates of 100 neurons at
            time <InlineMath tex="t" />, each a noisy weighted sum of a handful
            of latent dimensions.
          </p>

          <p>
            Together, the two equations define the generative model: a
            low-dimensional state evolves according to <InlineMath tex="{\color{#4A90D9}A}" />,
            and we observe it through the lens of <InlineMath tex="{\color{#4A7C6F}C}" />. The
            inverse problem is: given only the observed{" "}
            <InlineMath tex="{\color{#4A7C6F}y_1}, \ldots, {\color{#4A7C6F}y_T}" />, recover{" "}
            <InlineMath tex="{\color{#4A90D9}A}" />, <InlineMath tex="{\color{#4A7C6F}C}" />, and the latent
            trajectory <InlineMath tex="{\color{#4A90D9}x_1}, \ldots, {\color{#4A90D9}x_T}" />.
          </p>

          <FigureContainer width="outset" caption="Figure 1: Explore the relationship between latent dynamics and neural observations. Left: the 3D latent state trajectory. Right: the resulting observed neural firing rates. Adjust noise levels to see how observability degrades.">
            <LatentDynamicsExplorer />
          </FigureContainer>

          <p>
            The figure above shows a synthetic system with three latent
            dimensions and six observed neurons. Two latent dimensions form a
            slow rotation (the circular trajectory in the x₁–x₂ projection),
            while the third is an independent, faster oscillation. All six
            neurons are noisy linear combinations of these three latent
            variables. As you increase the observation noise, the neural traces
            become harder to distinguish from each other, but the underlying
            latent structure is still there, waiting to be extracted.
          </p>

          <h2 id="subspace-id">Subspace identification</h2>

          <p>
            The key insight behind subspace identification is that future
            observations carry information about the current latent state, and
            this information has a specific structure that we can exploit.
            Unrolling the state equation forward from time <InlineMath tex="t" />{" "}
            gives:
          </p>

          <Equation number={3} tex="{\color{#4A90D9}x_{t+k}} = {\color{#4A90D9}A}^k {\color{#4A90D9}x_t} + \sum_{j=0}^{k-1} {\color{#4A90D9}A}^j {\color{#999999}w_{t+k-1-j}}" />

          <p>
            Substituting into the observation equation, the observation at
            time <InlineMath tex="t+k" /> is:
          </p>

          <Equation number={4} tex="{\color{#4A7C6F}y_{t+k}} = {\color{#4A7C6F}C} {\color{#4A90D9}A}^k {\color{#4A90D9}x_t} + {\color{#4A7C6F}C} \sum_{j=0}^{k-1} {\color{#4A90D9}A}^j {\color{#999999}w_{t+k-1-j}} + {\color{#999999}v_{t+k}}" />

          <p>
            If we stack several future observations into a
            vector <InlineMath tex="{\color{#4A7C6F}Y_f} = [{\color{#4A7C6F}y_t}^\top, {\color{#4A7C6F}y_{t+1}}^\top, \ldots, {\color{#4A7C6F}y_{t+i-1}}^\top]^\top" />,
            the signal part factors as:
          </p>

          <Equation number={5} tex="{\color{#4A7C6F}Y_f} = {\color{#4A7C6F}\mathcal{O}_i} \, {\color{#4A90D9}x_t} + {\color{#999999}\text{noise}}" />

          <p>
            where <InlineMath tex="{\color{#4A7C6F}\mathcal{O}_i}" /> is the <em>extended
            observability matrix</em>:
          </p>

          <Equation number={6} tex="{\color{#4A7C6F}\mathcal{O}_i} = \begin{bmatrix} {\color{#4A7C6F}C} \\ {\color{#4A7C6F}C}{\color{#4A90D9}A} \\ {\color{#4A7C6F}C}{\color{#4A90D9}A}^2 \\ \vdots \\ {\color{#4A7C6F}C}{\color{#4A90D9}A}^{i-1} \end{bmatrix}" />

          <p>
            This matrix has <InlineMath tex="i{\color{#4A7C6F}m}" /> rows
            and <InlineMath tex="{\color{#4A90D9}d}" /> columns.
            Its column space is the <em>observability subspace</em>: the set of
            directions in observation space that the latent state can influence.
            The rank of <InlineMath tex="{\color{#4A7C6F}\mathcal{O}_i}" /> equals the latent
            dimensionality <InlineMath tex="{\color{#4A90D9}d}" />, as long as the system is
            observable and <InlineMath tex="i" /> is large enough.
            <Sidenote number={3}>
              A system is <em>observable</em> if different initial
              states produce different output sequences. For linear systems,
              this is equivalent to <InlineMath tex="{\color{#4A7C6F}\mathcal{O}_i}" /> having
              full column rank. When this fails (say two latent dimensions
              project identically onto all neurons), those dimensions become
              indistinguishable from observations alone.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="Figure 2: Drag the arrow to change the projection direction and see how well the latent state can be reconstructed from observations. Some directions are easily recovered (high R²), others are not.">
            <ObservabilityExplorer />
          </FigureContainer>

          <p>
            Now stack these future observation vectors for every time
            point into columns of a matrix. The result is the{" "}
            <em>block Hankel matrix</em>. Each column
            contains <InlineMath tex="i" /> consecutive observation vectors
            starting from a different time step. Columns shift forward by one
            time step, giving the matrix its characteristic diagonal-constant
            structure:
          </p>

          <Equation number={7} tex="H = \begin{bmatrix} {\color{#4A7C6F}y_1} & {\color{#4A7C6F}y_2} & {\color{#4A7C6F}y_3} & \cdots & {\color{#4A7C6F}y_N} \\ {\color{#4A7C6F}y_2} & {\color{#4A7C6F}y_3} & {\color{#4A7C6F}y_4} & \cdots & {\color{#4A7C6F}y_{N+1}} \\ {\color{#4A7C6F}y_3} & {\color{#4A7C6F}y_4} & {\color{#4A7C6F}y_5} & \cdots & {\color{#4A7C6F}y_{N+2}} \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ {\color{#4A7C6F}y_i} & {\color{#4A7C6F}y_{i+1}} & {\color{#4A7C6F}y_{i+2}} & \cdots & {\color{#4A7C6F}y_{N+i-1}} \end{bmatrix}" />

          <p>
            Each entry <InlineMath tex="{\color{#4A7C6F}y_t}" /> is itself an{" "}
            <InlineMath tex="{\color{#4A7C6F}m}" />-dimensional vector (one value per neuron), so
            each column of <InlineMath tex="H" /> is an{" "}
            <InlineMath tex="i{\color{#4A7C6F}m}" />-dimensional vector. The word "block" refers
            to this: <InlineMath tex="H" /> is a matrix of vectors, not scalars.
            Notice the structure: moving one step down a column shifts the time
            index by one, and moving one step right across a row also shifts by
            one. This means that every anti-diagonal contains the same
            observation vector, the defining property of a Hankel matrix.
          </p>

          <FigureContainer width="outset" caption="Watch the block Hankel matrix being built column by column. Each column stacks a window of consecutive observations. As the window slides right, the next column fills in.">
            <HankelBuilder />
          </FigureContainer>

          <p>
            Using our factorization from Equation (5), the signal part of each
            column is <InlineMath tex="{\color{#4A7C6F}\mathcal{O}_i}\, {\color{#4A90D9}x_t}" /> for some{" "}
            <InlineMath tex="{\color{#4A90D9}x_t}" />. This means the signal part
            of <InlineMath tex="H" /> has rank at most{" "}
            <InlineMath tex="{\color{#4A90D9}d}" />, so all columns live in the{" "}
            <InlineMath tex="{\color{#4A90D9}d}" />-dimensional column space
            of <InlineMath tex="{\color{#4A7C6F}\mathcal{O}_i}" />, regardless of how
            many time points <InlineMath tex="N" /> we have.
          </p>

          <p>
            Taking the SVD of the block Hankel matrix reveals the latent
            dimensionality as a gap in the singular value spectrum. The
            first <InlineMath tex="{\color{#4A90D9}d}" /> singular values correspond to the
            signal; the rest correspond to noise. The left singular vectors span
            the observability subspace, giving us <InlineMath tex="{\color{#4A7C6F}C}" /> (from
            the first block of rows) and <InlineMath tex="{\color{#4A90D9}A}" /> (from the shift
            structure). The right singular vectors, scaled by the singular
            values, give the latent state sequence.
            <Sidenote number={4}>
              This procedure is the essence of N4SID and related
              algorithms <Citation numbers={3} />. The name "subspace
              identification" comes from the fact that we identify the system by
              finding the column subspace of the observability matrix. In
              practice, an oblique projection step removes the effect of past
              inputs before taking the SVD; the algebra is similar to the
              whitening step in CCA.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="Figure 3: The block Hankel matrix and its singular value spectrum. The gap after the first 3 singular values reveals the true latent dimensionality. Adjust the number of time lags to see how the matrix structure changes.">
            <HankelSVD />
          </FigureContainer>

          <p>
            With the observability subspace in hand, extracting the system
            matrices is straightforward. Write the SVD
            as <InlineMath tex="H \approx U_{\color{#4A90D9}d}\, S_{\color{#4A90D9}d}\, V_{\color{#4A90D9}d}^\top" />,
            keeping only the
            first <InlineMath tex="{\color{#4A90D9}d}" /> components (the ones above
            the gap). The left singular
            vectors <InlineMath tex="U_{\color{#4A90D9}d}" /> estimate the column
            space of the observability
            matrix <InlineMath tex="{\color{#4A7C6F}\mathcal{O}_i}" />.
            The observation
            matrix <InlineMath tex="{\color{#4A7C6F}C}" /> is the
            first <InlineMath tex="{\color{#4A7C6F}m}" /> rows
            of <InlineMath tex="U_{\color{#4A90D9}d}" />.
            The latent state sequence is recovered by multiplying the
            pseudoinverse of this observability estimate by the original Hankel
            columns: <InlineMath tex="{\color{#4A90D9}\hat{x}_t} = U_{\color{#4A90D9}d}^+ \, H_{:,t}" />.
            Finally, the state transition
            matrix <InlineMath tex="{\color{#4A90D9}A}" /> is estimated by
            least-squares regression: find the matrix that best maps each
            recovered state <InlineMath tex="{\color{#4A90D9}\hat{x}_t}" /> to the next
            state <InlineMath tex="{\color{#4A90D9}\hat{x}_{t+1}}" />.
          </p>

          <FigureContainer width="outset" caption="Figure 4: Recovered latent states (dark) overlaid on the true states (blue, dashed). The match is good, but the recovered dimensions are an arbitrary rotation of the true ones. There is no way to tell which dimensions relate to behavior.">
            <SubspaceIDResult />
          </FigureContainer>

          <p>
            The figure above shows the punchline of standard subspace
            identification: the latent states are recovered accurately (up to an
            invertible linear transformation), but the individual recovered
            dimensions have no particular meaning. The first recovered dimension
            might be a mixture of the behaviorally relevant rotation and the
            irrelevant oscillation. There is nothing in the procedure that
            distinguishes them.
          </p>

          <h2 id="behavior">Adding behavior</h2>

          <p>
            So far we have been recovering the full latent state without asking
            what any of it means. But in practice, we care about specific aspects
            of the latent dynamics, specifically the part that drives behavior. The figure
            below illustrates the problem. The brain's full latent state space
            contains signals that are encoded in our neural recordings and signals
            that are not. Of the encoded signals, only a subset relates to the
            behavior we measure. Different methods see different parts of this
            picture.
          </p>

          <FigureContainer width="outset" caption="The subspace partition. The full latent space (dashed) contains signals encoded in neural recordings (middle ellipse) and signals we cannot observe. Of the encoded signals, only a subset is behaviorally relevant (inner ellipse). Toggle between methods to see what each one captures.">
            <SubspacePartition />
          </FigureContainer>

          <p>
            Now suppose we also have a behavioral measurement{" "}
            <InlineMath tex="{\color{#D4783C}z_t} \in \mathbb{R}^{\color{#D4783C}p}" /> that is a linear function
            of the latent state:
          </p>

          <Equation number={8} tex="{\color{#D4783C}z_t} = {\color{#D4783C}L}\, {\color{#4A90D9}x_t} + {\color{#999999}e_t}" />

          <p>
            where <InlineMath tex="{\color{#D4783C}L} \in \mathbb{R}^{{\color{#D4783C}p} \times {\color{#4A90D9}d}}" /> picks out
            the behaviorally relevant latent dimensions and{" "}
            <InlineMath tex="{\color{#999999}e_t}" /> is noise. In our synthetic system,{" "}
            <InlineMath tex="{\color{#D4783C}L} = [1, 1, 0]" />, giving a scalar
            behavior (<InlineMath tex="{\color{#D4783C}p} = 1" />) that depends on
            the first two latent dimensions (the slow rotation) and ignores
            the third (the fast oscillation).
          </p>

          <p>
            Standard subspace identification does not know
            about <InlineMath tex="{\color{#D4783C}z_t}" />. It recovers the full latent
            state, but in an arbitrary coordinate system. The behavioral
            information ends up smeared across all recovered dimensions.
          </p>

          <FigureContainer width="outset" caption="Figure 5: The mixing problem. Left: recovered latent dimensions from standard subspace identification. Right: each dimension's correlation with the behavioral variable. Information about behavior is distributed across all three dimensions.">
            <MixingProblem />
          </FigureContainer>

          <p>
            This is the central limitation: if you want to know which part of
            the neural dynamics drives behavior, standard subspace
            identification cannot tell you. The behavioral signal is there, but
            it is mixed with irrelevant dynamics. Can we modify the procedure to
            extract the behaviorally relevant dynamics first?
          </p>

          <h2 id="psid">Preferential subspace identification</h2>

          <p>
            PSID answers this question with a two-stage
            procedure <Citation numbers={1} />. The idea is to use CCA (the
            same whitening-and-SVD machinery from the{" "}
            <Link to="/blog/cca/">CCA post</Link>) to find the part of the
            neural state space that predicts future behavior, and then recover
            the remaining dynamics from the residual.
          </p>

          <p>
            <strong>Stage 1: behaviorally relevant subspace.</strong> Build two
            block Hankel matrices: one from past neural
            observations <InlineMath tex="{\color{#4A7C6F}Y_\text{past}}" /> and one from future
            behavioral
            measurements <InlineMath tex="{\color{#D4783C}Z_\text{future}}" />.
            Run a procedure analogous to CCA: an oblique projection of
            future behavior onto past neural activity. The top directions
            from the neural side span the subspace of past neural activity
            that is maximally predictive of future behavior. These are the
            behaviorally relevant directions.
            <Sidenote number={5}>
              Unlike symmetric CCA (which finds mutual directions in both
              spaces), this projection is asymmetric: we care about
              directions in neural space that predict behavior, not the
              reverse. The whitening-then-SVD machinery is the same as in
              the <Link to="/blog/cca">CCA post</Link>, but the
              past-neural-to-future-behavior cross-covariance replaces the
              static <InlineMath tex="\Sigma_{ab}" />.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="CCA between time-lagged matrices. Left: past neural Hankel matrix. Middle: future behavioral Hankel matrix. Right: the canonical correlations. The first few are strong, indicating shared structure between past neural activity and future behavior.">
            <CCATimeLagged />
          </FigureContainer>

          <p>
            Project the neural data onto these canonical directions to get a
            low-dimensional state estimate for the relevant subspace. Extract
            the transition matrix <InlineMath tex="{\color{#D4783C}A_1}" /> and observation
            matrix <InlineMath tex="{\color{#D4783C}C_1}" /> by the same least-squares procedure
            as before.
          </p>

          <p>
            <strong>Stage 2: remaining dynamics.</strong> Project out the
            behaviorally relevant component from the observations:{" "}
            <InlineMath tex="{\color{#4A7C6F}Y_\text{resid}} = {\color{#4A7C6F}Y} - {\color{#D4783C}\hat{X}_\text{rel}}\, {\color{#D4783C}C_1}^\top" />.
            Run standard subspace identification on the residual to capture the
            remaining latent dynamics. This gives <InlineMath tex="{\color{#999999}A_2}" />{" "}
            and <InlineMath tex="{\color{#999999}C_2}" />.
          </p>

          <p>
            The combined model has a block lower-triangular transition matrix
            and a concatenated observation matrix:
          </p>

          <Equation number={9} tex="{\color{#4A90D9}A} = \begin{bmatrix} {\color{#D4783C}A_{11}} & 0 \\ {\color{#999999}A_{21}} & {\color{#999999}A_{22}} \end{bmatrix} \qquad {\color{#4A7C6F}C} = [{\color{#D4783C}C_1},\; {\color{#999999}C_2}]" />

          <p>
            The zero in the upper-right block is the key constraint: the
            relevant subspace evolves independently of the irrelevant one
            (governed
            by <InlineMath tex="{\color{#D4783C}A_{11}}" /> alone), but the
            irrelevant subspace can be driven by the relevant state
            through <InlineMath tex="{\color{#999999}A_{21}}" />.
            The <InlineMath tex="{\color{#D4783C}\text{orange}}" /> parts talk to
            behavior; the <InlineMath tex="{\color{#999999}\text{gray}}" /> parts
            don't. The latent state is cleanly partitioned.
          </p>

          <FigureContainer width="outset" caption="Figure 6: Toggle between standard subspace identification and PSID. In PSID mode, the first two dimensions (orange) cleanly track the behavioral variable (faint orange overlay), while the third (gray) captures the independent oscillation.">
            <PSIDExplorer />
          </FigureContainer>

          <p>
            The difference is immediate. Standard subspace identification gives
            three dimensions with behavioral information mixed across all of
            them. PSID gives two dimensions that are strongly correlated with
            behavior and one that is not. The partition matches the ground truth
            of the synthetic system: two relevant dimensions (the slow rotation)
            and one irrelevant dimension (the fast oscillation).
          </p>

          <h2 id="misleads">When PSID misleads</h2>

          <p>
            PSID requires you to specify the relevant
            dimensionality: how many latent dimensions should be assigned to the
            behaviorally relevant subspace. If you get this wrong, the results
            can be misleading.
          </p>

          <p>
            <strong>Over-specifying the relevant dimensionality.</strong> If you
            tell PSID to extract more relevant dimensions than truly exist, the
            extra dimensions will fit noise or capture dynamics that are actually
            irrelevant to behavior. In the figure below, the true relevant
            dimensionality is 2. Setting it to 3 or higher forces PSID to
            designate additional dimensions as "relevant," but their correlation
            with the behavioral variable is low.
          </p>

          <FigureContainer width="outset" caption="Figure 7a: Adjust the specified relevant dimensionality. At the correct value (2), PSID cleanly separates relevant from irrelevant. Over-specifying forces extra dimensions into the relevant subspace, where they capture noise.">
            <DimSpecExplorer />
          </FigureContainer>

          <p>
            <strong>No real behavioral relevance.</strong> If the behavioral
            variable is actually independent of the neural activity, PSID will
            still extract "relevant" dimensions. It has no way to know that the
            CCA directions are fitting noise rather than signal. Cross-validation
            is the standard defense: fit PSID on a training set, predict
            behavior on a held-out test set, and check whether the
            prediction <InlineMath tex="R^2" /> exceeds what you would expect by
            chance.
          </p>

          <FigureContainer width="outset" caption="Figure 7b: Cross-validated prediction accuracy as a function of specified relevant dimensionality. With real behavior (orange), R² peaks at the true dimensionality and plateaus. With independent behavior (gray, dashed), R² stays near zero.">
            <PSIDValidation />
          </FigureContainer>

          <p>
            In practice, the right approach is to sweep the relevant
            dimensionality from 0 upward and monitor the cross-validated
            prediction accuracy. The point where the curve plateaus tells you
            how many latent dimensions truly contribute to behavior.
          </p>

          <h2 id="extensions">Extensions</h2>

          <p>
            PSID assumes a linear autonomous system: no external inputs,
            linear dynamics, linear observations. Three subsequent papers
            relax these assumptions while preserving the dissociative
            structure that separates behaviorally relevant from irrelevant
            dynamics.
          </p>

          <p>
            <strong>IPSID: measured inputs.</strong> In many experiments,
            subjects receive sensory stimuli or perturbations under the
            experimenter's control. Standard PSID folds these input-driven
            responses into the latent state, conflating intrinsic dynamics
            with stimulus-evoked activity.
            IPSID <Citation numbers={6} /> adds measured
            inputs <InlineMath tex="{\color{#D4783C}u_t}" /> to the state
            equation:
          </p>

          <BlockMath tex="{\color{#4A90D9}x_{t+1}} = {\color{#4A90D9}A}\,{\color{#4A90D9}x_t} + {\color{#D4783C}B}\,{\color{#D4783C}u_t} + {\color{#999999}w_t}" />

          <p>
            This dissociates intrinsic dynamics (governed
            by <InlineMath tex="{\color{#4A90D9}A}" />) from input-driven
            responses (governed by <InlineMath tex="{\color{#D4783C}B}" />),
            letting you ask which part of neural activity reflects the brain's
            own dynamics versus what is driven by external events.
          </p>

          <p>
            <strong>DPAD: nonlinear dynamics.</strong> PSID's linear machinery
            cannot capture thresholding, gating, or other nonlinear
            interactions in neural circuits.
            DPAD <Citation numbers={8} /> replaces the linear state-space
            model with a multisection recurrent neural network, trained to
            prioritize behaviorally relevant dynamics in the first sections
            and capture the remainder in the rest. This lets the model learn
            nonlinear latent dynamics without sacrificing the
            relevant/irrelevant partition.
          </p>

          <p>
            <strong>Optimal smoothing.</strong> PSID uses past neural activity
            to predict future behavior, a purely causal (filtering)
            direction. Sani &amp; Shanechi <Citation numbers={9} /> extend
            this by incorporating concurrent and future neural observations
            through optimal smoothing. The hierarchy is clean: prediction
            uses only past neural data, filtering adds concurrent data, and
            smoothing adds future data as well. Each step reduces estimation
            error in the latent states, which matters for offline analyses
            where the full recording is available.
            <Sidenote number={6}>
              The progression from prediction to filtering to smoothing
              mirrors the classical Kalman filter
              literature <Citation numbers={2} />: the Kalman filter is a
              causal estimator, while the Rauch–Tung–Striebel smoother
              refines those estimates by running backward through the data.
            </Sidenote>
          </p>

          <h2 id="limitations">Assumptions and limitations</h2>

          <p>
            <strong>What PSID gives you.</strong> A latent dynamical system with
            a clean partition into behaviorally relevant and irrelevant
            subspaces, identified directly from data. The system matrices
            (<InlineMath tex="{\color{#4A90D9}A}" />, <InlineMath tex="{\color{#4A7C6F}C}" />) are estimated
            without iterative optimization, and the partition comes from the
            structure of the CCA solution.
          </p>

          <p>
            <strong>Linearity.</strong> Both the dynamics and the observation
            model are assumed linear. If the true dynamics involve nonlinear
            interactions (thresholding, saturation, gating), the linear model
            will capture only the best linear approximation, which may miss
            important structure. This is the same limitation as linear CCA, just
            extended to the temporal domain.
          </p>

          <p>
            <strong>Stationarity.</strong> The system
            matrices <InlineMath tex="{\color{#4A90D9}A}" /> and <InlineMath tex="{\color{#4A7C6F}C}" /> are
            assumed constant over time. If the neural code changes over the
            course of a session (as it does during learning), PSID will average
            over these changes rather than tracking them.
          </p>

          <p>
            <strong>Linear behavioral readout.</strong> The behavioral
            variable <InlineMath tex="{\color{#D4783C}z_t}" /> is assumed to be a linear
            function of the latent state. If the relationship is nonlinear (for
            example, behavior depends on the phase of a neural oscillation rather
            than its amplitude), PSID's "relevant" subspace will not capture the
            full picture.
          </p>

          <p>
            <strong>Two-stage is greedy.</strong> PSID extracts the relevant
            subspace first, then the irrelevant subspace from the residual. This
            greedy approach is not jointly optimal: errors in the first stage
            propagate to the second.
          </p>

          <p>
            <strong>Where this leads.</strong> The{" "}
            <a href="#extensions">extensions above</a> address some of these
            limitations directly: DPAD relaxes linearity, IPSID handles
            exogenous inputs, and smoothing improves offline estimates. Beyond
            the PSID family, LFADS <Citation numbers={5} /> learns nonlinear
            latent dynamics through a sequential autoencoder, and switching
            linear dynamical systems can relax stationarity by allowing the
            matrices to change over time.
          </p>

          <h2 id="neighbors">PSID and its neighbors</h2>

          <div className="blog-comparison-table-wrapper">
            <table className="blog-comparison-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Key matrix</th>
                  <th>Dynamics?</th>
                  <th>Behavior-aware?</th>
                  <th>Relationship to PSID</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>PCA</td>
                  <td><InlineMath tex="{\color{#4A7C6F}\Sigma_{yy}}" /></td>
                  <td>No</td>
                  <td>No</td>
                  <td>SVD of one covariance instead of a cross-covariance</td>
                </tr>
                <tr>
                  <td>CCA</td>
                  <td><InlineMath tex="{\color{#4A7C6F}\Sigma_{yy}}^{-1/2} {\color{#D4783C}\Sigma_{yz}} {\color{#D4783C}\Sigma_{zz}}^{-1/2}" /></td>
                  <td>No</td>
                  <td>Yes</td>
                  <td>Static version of PSID's stage 1</td>
                  {/* In the CCA post, both datasets were neural (X_a, X_b);
                      here one is neural and one is behavioral, same math */}
                </tr>
                <tr>
                  <td>N4SID</td>
                  <td><InlineMath tex="H({\color{#4A7C6F}Y})" /></td>
                  <td>Yes</td>
                  <td>No</td>
                  <td>PSID without the preferential step</td>
                </tr>
                <tr>
                  <td>PSID</td>
                  <td><InlineMath tex="H({\color{#4A7C6F}Y_\text{past}})\ \text{vs}\ H({\color{#D4783C}Z_\text{fut}})" /></td>
                  <td>Yes</td>
                  <td>Yes</td>
                  <td>(this post)</td>
                </tr>
                <tr>
                  <td>IPSID</td>
                  <td><InlineMath tex="H({\color{#4A7C6F}Y_\text{past}}),\, {\color{#D4783C}U}" /></td>
                  <td>Yes</td>
                  <td>Yes</td>
                  <td>PSID + measured inputs; dissociates intrinsic from input-driven</td>
                </tr>
                <tr>
                  <td>DPAD</td>
                  <td><InlineMath tex="{\color{#4A7C6F}Y}" /> (RNN)</td>
                  <td>Yes (nonlinear)</td>
                  <td>Yes</td>
                  <td>Nonlinear PSID; RNNs replace linear state-space</td>
                </tr>
                <tr>
                  <td>Shared-AE</td>
                  <td><InlineMath tex="{\color{#4A7C6F}Y}" /> (autoencoder)</td>
                  <td>No</td>
                  <td>Yes</td>
                  <td>Nonlinear shared/private split via CS-divergence; extends to 3+ modalities</td>
                </tr>
                <tr>
                  <td>LFADS</td>
                  <td><InlineMath tex="{\color{#4A7C6F}Y}" /> (seq. autoencoder)</td>
                  <td>Yes</td>
                  <td>Optional</td>
                  <td>Nonlinear, requires training a neural network</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            CCA <Citation numbers={4} /> gave us static shared directions between paired datasets. PSID
            adds two things: temporal structure (dynamics) and a principled
            partition between behaviorally relevant and irrelevant latent
            dimensions. The connection between the two methods is direct:
            PSID's first stage is CCA applied to time-lagged neural and
            behavioral data, using the same whitening-and-SVD pipeline.
            <Sidenote number={7}>
              In the <Link to="/blog/cca">CCA post</Link>, both datasets were
              neural recordings from different subjects, and the goal was to find
              shared directions between two populations. Here, one dataset is
              neural and the other is behavioral. The math is identical (whiten,
              then SVD the cross-covariance), but the interpretation changes:
              instead of "shared across subjects," we get "predictive of
              behavior."
            </Sidenote>
          </p>

          <p>
            The original PSID paper <Citation numbers={1} /> demonstrated the
            method on intracortical recordings from monkeys performing reaching
            tasks, showing that behaviorally relevant dynamics occupied a
            low-dimensional subspace that standard methods like N4SID missed.
            Subsequent work extended the framework in three
            directions: IPSID <Citation numbers={6} /> adds measured inputs
            to dissociate intrinsic from stimulus-driven dynamics,
            DPAD <Citation numbers={8} /> replaces the linear model with
            recurrent neural networks, and optimal
            smoothing <Citation numbers={9} /> leverages future neural data
            for offline estimation. All methods come with a publicly available
            MATLAB/Python toolbox <Citation numbers={7} />.
          </p>

          <p>
            A different line of work drops the dynamical model entirely.
            Shared-AE <Citation numbers={10} /> uses dual autoencoders with
            Cauchy-Schwarz divergence regularization to split each modality's
            latent space into shared and private components. Because the
            encoders are nonlinear, Shared-AE can capture richer
            neural-behavioral relationships than PSID's linear model, and it
            generalizes naturally to more than two modalities. The trade-off
            is that it gives up the temporal structure and closed-form
            identifiability that make PSID's latent dynamics directly
            interpretable.
          </p>

          <h2 id="implementation">Implementation</h2>

          <p>
            The full PSID algorithm is compact enough to fit in about 50 lines
            of NumPy. Here is a self-contained implementation that takes
            observations <InlineMath tex="{\color{#4A7C6F}Y}" />, behavioral
            measurements <InlineMath tex="{\color{#D4783C}Z}" />, the relevant
            dimensionality, and the total dimensionality, and returns the
            system
            matrices <InlineMath tex="{\color{#4A90D9}A}" />, <InlineMath tex="{\color{#4A7C6F}C}" />,
            the behavioral
            readout <InlineMath tex="{\color{#D4783C}C_z}" />, and the recovered
            latent states <InlineMath tex="{\color{#4A90D9}\hat{X}}" />.
          </p>

          <CodeBlock code={`import numpy as np
from scipy.linalg import svd, sqrtm, pinv

def build_hankel(data, num_lags):
    """Stack time-lagged snapshots into a block Hankel matrix."""
    T, d = data.shape
    N = T - 2 * num_lags + 1
    past = np.zeros((num_lags * d, N))
    future = np.zeros((num_lags * d, N))
    for lag in range(num_lags):
        past[lag*d:(lag+1)*d] = data[lag:lag+N].T
        future[lag*d:(lag+1)*d] = data[num_lags+lag:num_lags+lag+N].T
    return past, future

def psid(Y, Z, d_rel, d_total, num_lags):
    """
    Preferential Subspace Identification.

    Parameters
    ----------
    Y : (T, m) neural observations
    Z : (T, p) behavioral measurements
    d_rel : number of behaviorally relevant latent dimensions
    d_total : total latent dimensionality
    num_lags : number of time lags for Hankel matrices

    Returns
    -------
    A, C, Cz, Xhat : system matrices, behavioral readout, and states
    """
    # Center
    Y = Y - Y.mean(0)
    Z = Z - Z.mean(0)
    m = Y.shape[1]

    # Stage 1: CCA between past-neural and future-behavior
    Y_past, Y_future = build_hankel(Y, num_lags)
    Z_past, Z_future = build_hankel(Z, num_lags)

    Cyy = Y_past @ Y_past.T / Y_past.shape[1]
    Czz = Z_future @ Z_future.T / Z_future.shape[1]
    Cyz = Y_past @ Z_future.T / Y_past.shape[1]

    # Whiten, then SVD of cross-covariance
    Cyy_inv_sqrt = np.real(pinv(sqrtm(Cyy)))
    Czz_inv_sqrt = np.real(pinv(sqrtm(Czz)))
    M = Cyy_inv_sqrt @ Cyz @ Czz_inv_sqrt

    U, s, Vt = svd(M, full_matrices=False)

    # Top d_rel canonical directions (in neural Hankel space)
    W_rel = Cyy_inv_sqrt @ U[:, :d_rel]

    # Recover relevant states from past observations
    Xhat_rel = W_rel.T @ Y_past  # (d_rel, N)

    # Observability matrix estimate and single-lag C1
    O_rel = W_rel[:m, :]  # first block = C1
    C1 = O_rel

    # Fit A1 by least squares: x_{t+1} = A1 @ x_t
    A1 = Xhat_rel[:, 1:] @ pinv(Xhat_rel[:, :-1])

    # Behavioral readout: regress Z onto relevant states
    N = Y_past.shape[1]
    Z_aligned = Z[num_lags:num_lags+N]  # (N, p)
    Cz = Z_aligned.T @ pinv(Xhat_rel).T  # (p, d_rel)

    # Stage 2: residual subspace identification
    d_irr = d_total - d_rel
    if d_irr > 0:
        # Project out relevant component, then re-embed as Hankel
        Y_single = Y[num_lags:num_lags+N].T  # (m, N)
        Y_resid_ts = (Y_single - C1 @ Xhat_rel).T  # (N, m)
        Yr_past, _ = build_hankel(Y_resid_ts, num_lags)

        U2, s2, V2t = svd(Yr_past, full_matrices=False)
        Xhat_irr = np.diag(s2[:d_irr]) @ V2t[:d_irr]  # (d_irr, N2)
        C2 = U2[:m, :d_irr]
        A2 = Xhat_irr[:, 1:] @ pinv(Xhat_irr[:, :-1])

        # Trim relevant states to match residual length
        N2 = Xhat_irr.shape[1]
        Xhat_rel = Xhat_rel[:, :N2]
    else:
        N2 = Xhat_rel.shape[1]
        Xhat_irr = np.zeros((0, N2))
        C2 = np.zeros((m, 0))
        A2 = np.zeros((0, 0))

    # Combine: block lower-triangular A
    d1, d2 = d_rel, d_irr
    A = np.zeros((d1 + d2, d1 + d2))
    A[:d1, :d1] = A1
    if d2 > 0:
        A[d1:, d1:] = A2
        # A21: regression of irrelevant next-state on relevant state
        A[d1:, :d1] = Xhat_irr[:, 1:] @ pinv(Xhat_rel[:, :-1])

    C = np.hstack([C1, C2])
    Xhat = np.vstack([Xhat_rel, Xhat_irr]).T  # (N2, d_total)

    return A, C, Cz, Xhat`} />

          <p>
            The structure mirrors the two stages. Lines 1–20 build block
            Hankel matrices. Lines 21–40 run the oblique projection between
            past neural and future behavioral Hankel matrices to get the
            relevant subspace, then estimate the behavioral
            readout <InlineMath tex="{\color{#D4783C}C_z}" /> by regressing
            behavior onto the relevant states. Lines 41–65 project out the
            relevant component, re-embed the residual as a new Hankel
            matrix, and run standard subspace ID on it. The final assembly
            builds the block lower-triangular{" "}
            <InlineMath tex="{\color{#4A90D9}A}" /> (including
            the <InlineMath tex="{\color{#999999}A_{21}}" /> coupling term),
            concatenated <InlineMath tex="{\color{#4A7C6F}C}" />, and the
            full latent state sequence.
          </p>

          <h2 id="references">References</h2>

          <ol className="blog-post__references">
            <li id="ref-1">
              O. G. Sani, H. Abbaspourazad, Y. T. Wong, B. Pesaran, and
              M. M. Shanechi, "Modeling behaviorally relevant neural dynamics
              enabled by preferential subspace identification,"{" "}
              <em>Nature Neuroscience</em>, vol. 24, pp. 140–149, 2021.
            </li>
            <li id="ref-2">
              R. E. Kalman, "A new approach to linear filtering and prediction
              problems,"{" "}
              <em>Journal of Basic Engineering</em>, vol. 82, no. 1, pp. 35–45,
              1960.
            </li>
            <li id="ref-3">
              P. Van Overschee and B. De Moor,{" "}
              <em>Subspace Identification for Linear Systems: Theory,
              Implementation, Applications</em>. Springer, 1996.
            </li>
            <li id="ref-4">
              H. Hotelling, "Relations between two sets of variates,"{" "}
              <em>Biometrika</em>, vol. 28, no. 3/4, pp. 321–377, 1936.
            </li>
            <li id="ref-5">
              C. Pandarinath, D. J. O'Shea, J. Collins, et al., "Inferring
              single-trial neural population dynamics using sequential
              auto-encoders,"{" "}
              <em>Nature Methods</em>, vol. 15, pp. 805–815, 2018.
            </li>
            <li id="ref-6">
              P. Vahidi*, O. G. Sani*, and M. M. Shanechi, "Modeling and
              dissociation of intrinsic and input-driven neural population
              dynamics underlying behavior,"{" "}
              <em>PNAS</em>, vol. 121, no. 7, e2212887121, 2024.
            </li>
            <li id="ref-7">
              O. G. Sani and M. M. Shanechi,{" "}
              <a href="https://github.com/ShanechiLab/PSID">
                "PSID: Preferential Subspace Identification"
              </a>{" "}
              (MATLAB/Python toolbox), GitHub.
            </li>
            <li id="ref-8">
              O. G. Sani, B. Pesaran, and M. M. Shanechi, "Dissociative and
              prioritized modeling of behaviorally relevant neural dynamics
              using recurrent neural networks,"{" "}
              <em>Nature Neuroscience</em>, vol. 27, pp. 2033–2045, 2024.
            </li>
            <li id="ref-9">
              O. G. Sani and M. M. Shanechi, "Preferential subspace
              identification (PSID) with forward-backward smoothing,"{" "}
              <em>arXiv</em>:2507.15288, 2025.
            </li>
            <li id="ref-10">
              D. Yi, H. Dong, M. J. Higley, A. Churchland, and
              S. Saxena, "Shared-AE: automatic identification of shared
              subspaces in high-dimensional neural and behavioral activity,"{" "}
              <em>ICLR</em>, 2025.
            </li>
          </ol>
        </div>

        <SeriesNav part={14} />
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
  <title>Preferential Subspace Identification | Felix Taschbach</title>
)

export default PSIDPost
