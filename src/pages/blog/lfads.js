import React, { useRef, useState, useEffect } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
import Sidenote from "../../components/Sidenote"
import Citation from "../../components/Citation"
import { InlineMath, BlockMath, Equation } from "../../components/Math"
import FigureContainer from "../../components/blog/FigureContainer"
import TableOfContents from "../../components/blog/TableOfContents"
import CodeBlock from "../../components/blog/CodeBlock"
import VariableLegend from "../../components/blog/VariableLegend"
import LFADSTeaser from "../../components/blog/LFADSTeaser"
import TrialVariabilityExplorer from "../../components/blog/TrialVariabilityExplorer"
import NonlinearFailure from "../../components/blog/NonlinearFailure"
import RNNUnrolled from "../../components/blog/RNNUnrolled"
import VanishingGradientExplorer from "../../components/blog/VanishingGradientExplorer"
import GRUGateExplorer from "../../components/blog/GRUGateExplorer"
import GeneratorExplorer from "../../components/blog/GeneratorExplorer"
import FactorToRateMapping from "../../components/blog/FactorToRateMapping"
import VariationalIntuition from "../../components/blog/VariationalIntuition"
import ELBODecomposition from "../../components/blog/ELBODecomposition"
import EncoderArchitecture from "../../components/blog/EncoderArchitecture"
import PoissonObservationModel from "../../components/blog/PoissonObservationModel"
import TrainingDynamicsExplorer from "../../components/blog/TrainingDynamicsExplorer"
import LFADSvsPSIDComparison from "../../components/blog/LFADSvsPSIDComparison"
import ControllerAbsorption from "../../components/blog/ControllerAbsorption"
import DimensionalityOverfit from "../../components/blog/DimensionalityOverfit"
import "./blog-post.css"

const LFADS_LEGEND_GROUPS = [
  { color: "#4A90D9", label: "Generator", vars: ["x_t", "A", "g_t"] },
  { color: "#4A7C6F", label: "Observations", vars: ["y_t", "C", "\\lambda_t"] },
  { color: "#D4783C", label: "Behavior", vars: ["z_t"] },
  { color: "#7b68ae", label: "Encoder", vars: ["e_t", "\\mu_0", "\\sigma_0"] },
  { color: "#d4a03c", label: "Controller", vars: ["u_t", "K"] },
  { color: "#c0503a", label: "Regularization", vars: ["\\text{KL}", "\\beta", "\\text{ELBO}"] },
]

const TOC_ITEMS = [
  { id: "introduction", label: "Introduction" },
  { id: "from-linear-to-nonlinear", label: "From linear to nonlinear dynamics" },
  { id: "rnn", label: "Recurrent neural networks" },
  { id: "gru", label: "Gated recurrent units" },
  { id: "generative-model", label: "The generative model" },
  { id: "variational-inference", label: "Variational inference" },
  { id: "inference-network", label: "The inference network" },
  { id: "gaussian-to-poisson", label: "From Gaussian to Poisson" },
  { id: "training", label: "Training" },
  { id: "single-trials", label: "LFADS on single trials" },
  { id: "misleads", label: "When LFADS misleads" },
  { id: "limitations", label: "Assumptions and limitations" },
  { id: "neighbors", label: "LFADS and its neighbors" },
  { id: "implementation", label: "Implementation" },
  { id: "references", label: "References" },
]

const LFADSPost = () => {
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
            Latent Factor Analysis via Dynamical Systems
          </h1>
          <p className="blog-post__subtitle">
            Inferring single-trial neural dynamics with a deep generative model,
            derived from scratch with interactive figures.
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
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          <VariableLegend groups={LFADS_LEGEND_GROUPS} scrollTargetId="from-linear-to-nonlinear" />

          <FigureContainer width="outset" caption="LFADS recovers single-trial neural dynamics from noisy spike trains. Top: raw spike counts across neurons and trials. Bottom: the smooth, low-dimensional latent trajectories that LFADS infers for each trial individually.">
            <LFADSTeaser />
          </FigureContainer>

          <h2 id="introduction">Introduction</h2>

          <p>
            In the <Link to="/blog/psid">previous post</Link>, PSID gave us a
            way to recover latent dynamics from neural recordings and separate
            behaviorally relevant from irrelevant structure. But PSID recovers
            one set of dynamics per dataset — an average across all trials. The
            trial where the monkey hesitated, the one where it overshot, the one
            where it changed its mind mid-reach — PSID collapses them all into
            the same trajectory.
          </p>

          <p>
            This matters because trial-to-trial variability is not just noise.
            When a monkey reaches toward the same target on two successive
            trials, the hand paths are nearly identical, but the underlying
            neural activity can differ substantially. Reaction times vary.
            Preparatory activity fluctuates. Entire subpopulations shift their
            baseline firing. These differences carry information about the
            internal state of the brain — motivation, attention, confidence —
            that a trial-averaged model discards.
            <Sidenote number={1}>
              LFADS was introduced by Pandarinath et al. <Citation numbers={1} /> to
              address exactly this problem: inferring smooth, single-trial
              neural population dynamics from noisy spike trains. The method
              learns a nonlinear dynamical system that generates each trial's
              neural activity from a trial-specific initial condition.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="Trial-to-trial variability in a reaching task. Each trace is one trial to the same target. The hand paths (left) are similar, but the neural trajectories (right) differ. LFADS recovers the smooth dynamics underlying each trial individually.">
            <TrialVariabilityExplorer />
          </FigureContainer>

          <p>
            LFADS (Latent Factor Analysis via Dynamical Systems) takes a
            different approach. Instead of fitting one linear model to the
            trial-averaged data, it trains a deep generative model that produces
            each trial's neural activity from a trial-specific initial condition
            fed through a nonlinear dynamical system. The model is a variational
            autoencoder whose decoder is a recurrent neural network — a
            sequential autoencoder, in the paper's terminology. Given a new
            trial of noisy spike counts, LFADS infers the initial condition that
            best explains the observed activity, runs the dynamics forward, and
            outputs smooth firing rate estimates for every neuron at every time
            step.
            <Sidenote number={2}>
              Single-trial methods have a long history in neural data analysis.
              Gaussian process factor analysis (GPFA) by Yu et al. (2009) was
              an early approach that assumed smooth latent trajectories but
              linear dynamics. Hidden Markov models captured discrete state
              switches. LFADS was among the first to combine nonlinear dynamics
              with scalable variational inference for neural populations.
            </Sidenote>
          </p>

          <p>
            This post derives LFADS from scratch. We start from the linear
            state-space model of the previous post, show where it breaks, and
            build up the machinery needed to replace it: recurrent neural
            networks, gated recurrent units, generative models, and variational
            inference. By the end, every equation in the LFADS model will have
            been motivated and derived. I assume comfort with linear algebra and
            state-space models from the <Link to="/blog/psid">PSID post</Link>;
            no prior exposure to neural networks, variational inference, or
            deep learning is needed.
          </p>

          <h2 id="from-linear-to-nonlinear">From linear to nonlinear dynamics</h2>

          <p>
            The linear state-space model from the previous post updates the
            latent state as:
          </p>

          <Equation number={1} tex="{\color{#4A90D9}x_{t+1}} = {\color{#4A90D9}A}\, {\color{#4A90D9}x_t} + {\color{#999999}w_t}" />

          <p>
            The matrix <InlineMath tex="{\color{#4A90D9}A}" /> is fixed: the same
            linear map applied at every time step. This means the dynamics are
            constrained to a narrow repertoire. If the eigenvalues
            of <InlineMath tex="{\color{#4A90D9}A}" /> lie inside the unit circle,
            trajectories decay exponentially. If they lie on the circle,
            trajectories oscillate at fixed frequencies. The system cannot
            produce limit cycles, chaotic orbits, or state-dependent switching
            between dynamical regimes — all behaviors observed in neural
            circuits.
          </p>

          <p>
            Consider a concrete failure case. The Van der Pol oscillator is a
            two-dimensional nonlinear system where trajectories spiral inward
            from far away and spiral outward from near the origin, converging to
            a stable limit cycle.
            <Sidenote number={3}>
              The Van der Pol oscillator was originally introduced to describe
              oscillations in vacuum tube circuits. Its dynamics
              are <InlineMath tex="\ddot{x} - \mu(1 - x^2)\dot{x} + x = 0" />,
              where <InlineMath tex="\mu" /> controls the nonlinearity. For any <InlineMath tex="\mu > 0" />,
              all trajectories converge to the same limit cycle regardless of
              initial conditions — a behavior that no linear system can produce.
            </Sidenote>
            {" "}No linear system can do this. A linear system with decaying
            eigenvalues will collapse trajectories to the origin; one with
            growing eigenvalues will blow them up; one with eigenvalues on the
            unit circle will preserve distances. None of these matches the
            amplitude-dependent damping that creates a limit cycle.
          </p>

          <FigureContainer width="outset" caption="A linear system (left) tries and fails to reproduce the Van der Pol oscillator (right). The linear fit decays to the origin or diverges, while the nonlinear system converges to a stable limit cycle regardless of initial conditions.">
            <NonlinearFailure />
          </FigureContainer>

          <p>
            The fix is to replace the fixed
            matrix <InlineMath tex="{\color{#4A90D9}A}" /> with a nonlinear
            function:
          </p>

          <Equation number={2} tex="{\color{#4A90D9}x_{t+1}} = f({\color{#4A90D9}x_t}) + {\color{#999999}w_t}" />

          <p>
            If <InlineMath tex="f" /> is expressive enough, it can represent limit
            cycles, chaos, state-dependent switching, and any other dynamical
            behavior we might encounter in neural data.
            <Sidenote number={4}>
              The idea that neural population activity lies on a low-dimensional
              nonlinear manifold has been supported by a growing body of
              experimental evidence. Churchland et al. (2012) showed that motor
              cortex dynamics during reaching are well described by rotational
              dynamics in a low-dimensional space. Sussillo et al. (2015) used
              recurrent neural networks to model these dynamics and found that
              the networks learned similar rotational structure.
            </Sidenote>
            {" "}But we need a parameterization
            of <InlineMath tex="f" /> that is flexible, differentiable (so we can
            train it from data), and capable of maintaining long-range temporal
            dependencies. This is where recurrent neural networks enter.
          </p>

          <h2 id="rnn">Recurrent neural networks</h2>

          <p>
            A recurrent neural network (RNN) is a direct generalization of the
            linear state equation. Replace the
            matrix <InlineMath tex="{\color{#4A90D9}A}" /> with a nonlinear
            function of both the current hidden
            state <InlineMath tex="{\color{#4A90D9}h_t}" /> and an
            input <InlineMath tex="{\color{#4A7C6F}x_t}" />:
          </p>

          <Equation number={3} tex="{\color{#4A90D9}h_{t+1}} = \tanh\!\bigl({\color{#4A90D9}W_h}\, {\color{#4A90D9}h_t} + {\color{#4A7C6F}W_x}\, {\color{#4A7C6F}x_t} + b\bigr)" />

          <p>
            The weight
            matrix <InlineMath tex="{\color{#4A90D9}W_h}" /> plays the role
            of <InlineMath tex="{\color{#4A90D9}A}" />, but the <InlineMath tex="\tanh" /> nonlinearity
            means the effective dynamics change depending on where the state is.
            Near the origin where <InlineMath tex="\tanh" /> is approximately
            linear, the RNN behaves like a linear system. Far from the origin
            where <InlineMath tex="\tanh" /> saturates, the dynamics compress
            toward <InlineMath tex="\pm 1" />. This state-dependent behavior is
            what allows RNNs to represent nonlinear dynamics.
          </p>

          <FigureContainer width="outset" caption="An RNN unrolled through time. Each box applies the same weights. The hidden state flows forward, accumulating information from inputs at each step. The recurrent connection (red arrow) is what distinguishes this from a feedforward network.">
            <RNNUnrolled />
          </FigureContainer>

          <p>
            To train an RNN, we need gradients of a loss
            function <InlineMath tex="\mathcal{L}" /> with respect to the
            weights. The standard approach is backpropagation through time
            (BPTT): unroll the recurrence for <InlineMath tex="T" /> steps, then
            apply the chain rule backward. The gradient of the loss with respect
            to the hidden state at time <InlineMath tex="t" /> involves a product
            of Jacobians:
          </p>

          <Equation number={4} tex="\frac{\partial \mathcal{L}}{\partial {\color{#4A90D9}h_t}} = \prod_{k=t}^{T-1} {\color{#4A90D9}J_k} \;\cdot\; \frac{\partial \mathcal{L}}{\partial {\color{#4A90D9}h_T}}" />

          <p>
            where each Jacobian is:
          </p>

          <Equation number={5} tex="{\color{#4A90D9}J_k} = \frac{\partial {\color{#4A90D9}h_{k+1}}}{\partial {\color{#4A90D9}h_k}} = \mathrm{diag}\!\bigl(1 - {\color{#4A90D9}h_k}^2\bigr) \;\cdot\; {\color{#4A90D9}W_h}" />

          <p>
            The <InlineMath tex="\mathrm{diag}(1 - {\color{#4A90D9}h_k}^2)" /> term
            comes from the derivative of <InlineMath tex="\tanh" />. When hidden
            units saturate (<InlineMath tex="{\color{#4A90D9}h_k} \approx \pm 1" />),
            the diagonal entries approach zero, shrinking the gradient.
            Multiplying <InlineMath tex="T - t" /> such Jacobians together means
            the gradient either vanishes (if the spectral radius is below 1) or
            explodes (if it is above 1). For long sequences, this makes
            vanilla RNNs difficult to train: gradients from distant time steps
            disappear before they reach the early weights.
            <Sidenote number={5}>
              The vanishing gradient problem was first characterized by Bengio
              et al. <Citation numbers={3} /> and independently by Hochreiter
              (1991). The core issue is that the product of many matrices with
              spectral radius less than one converges exponentially to zero.
              Gradient clipping addresses the exploding direction, but the
              vanishing direction requires architectural changes.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="The vanishing gradient in action. As the sequence length grows, the gradient signal from late time steps decays exponentially as it propagates backward. Adjust the spectral radius of the weight matrix to see the transition from vanishing to exploding gradients.">
            <VanishingGradientExplorer />
          </FigureContainer>

          <p>
            The vanishing gradient problem is not just a training nuisance — it
            is a fundamental limitation on what the network can learn. If
            gradients from time step <InlineMath tex="T" /> cannot reach time
            step <InlineMath tex="1" />, the network has no training signal for
            learning dependencies that span the full sequence.
            <Sidenote number={6}>
              Despite the vanishing gradient problem, RNNs with <InlineMath tex="\tanh" /> nonlinearities
              are universal approximators of dynamical systems: given enough
              hidden units, they can approximate any continuous sequence-to-sequence
              mapping to arbitrary precision (Schäfer & Zimmermann, 2006).
              The issue is not representational capacity but trainability.
            </Sidenote>
            {" "}We need an architecture that can
            maintain information over long time scales without requiring
            gradients to pass through many multiplicative steps. The solution
            is to add gates.
          </p>

          <h2 id="gru">Gated recurrent units</h2>

          <p>
            The gated recurrent unit (GRU) solves the vanishing gradient problem
            by giving the network explicit control over how much of the previous
            state to keep and how much to overwrite. The key insight is: what if
            the effective transition
            matrix <InlineMath tex="{\color{#4A90D9}A}" /> could depend on the
            current state? Instead of a fixed matrix that either shrinks or
            grows gradients uniformly, a gated architecture lets each hidden
            dimension independently decide whether to update or persist.
          </p>

          <p>
            The GRU computes three quantities at each time step. First,
            a <em>reset gate</em> that controls how much of the previous hidden
            state to expose when computing a candidate update:
          </p>

          <Equation number={6} tex="{\color{#d4a03c}r_t} = \sigma\!\bigl({\color{#d4a03c}W_r}\, [{\color{#4A90D9}h_{t-1}},\, {\color{#4A7C6F}x_t}] + {\color{#d4a03c}b_r}\bigr)" />

          <p>
            Second, an <em>update gate</em> that controls the interpolation
            between the old state and the candidate:
          </p>

          <Equation number={7} tex="{\color{#d4a03c}z_t} = \sigma\!\bigl({\color{#d4a03c}W_u}\, [{\color{#4A90D9}h_{t-1}},\, {\color{#4A7C6F}x_t}] + {\color{#d4a03c}b_u}\bigr)" />

          <p>
            Third, a <em>candidate hidden state</em> computed from the input and
            the reset-gated previous state:
          </p>

          <Equation number={8} tex="{\color{#4A90D9}\tilde{h}_t} = \tanh\!\bigl({\color{#4A90D9}W_c}\, [{\color{#d4a03c}r_t} \odot {\color{#4A90D9}h_{t-1}},\, {\color{#4A7C6F}x_t}] + {\color{#4A90D9}b_c}\bigr)" />

          <p>
            Finally, the new hidden state is an interpolation between the old
            state and the candidate, controlled by the update gate:
          </p>

          <Equation number={9} tex="{\color{#4A90D9}h_t} = (1 - {\color{#d4a03c}z_t}) \odot {\color{#4A90D9}h_{t-1}} + {\color{#d4a03c}z_t} \odot {\color{#4A90D9}\tilde{h}_t}" />

          <p>
            Here <InlineMath tex="\sigma" /> is the sigmoid function
            (output in <InlineMath tex="[0, 1]" />) and <InlineMath tex="\odot" /> is
            element-wise multiplication. The
            notation <InlineMath tex="[{\color{#4A90D9}h_{t-1}},\, {\color{#4A7C6F}x_t}]" /> means
            concatenation of the two vectors.
            <Sidenote number={7}>
              The GRU was introduced by Cho et al. <Citation numbers={4} /> as a
              simpler alternative to the LSTM (Long Short-Term Memory) of
              Hochreiter & Schmidhuber (1997). The LSTM uses three gates
              (input, forget, output) and a separate cell state, while the GRU
              merges the cell state and hidden state and uses two gates. In
              practice, performance is comparable on most tasks, and the GRU
              has fewer parameters.
            </Sidenote>
          </p>

          <p>
            The update gate is the mechanism that solves the vanishing gradient
            problem. Look at Equation (9): when <InlineMath tex="{\color{#d4a03c}z_t} \approx 0" />,
            the hidden state passes through unchanged: <InlineMath tex="{\color{#4A90D9}h_t} \approx {\color{#4A90D9}h_{t-1}}" />.
            The gradient along this path
            is <InlineMath tex="\partial {\color{#4A90D9}h_t} / \partial {\color{#4A90D9}h_{t-1}} \approx I" />,
            the identity matrix. No shrinkage, no saturation. Information and
            gradients flow through this identity path without decay, regardless
            of how many time steps separate cause and effect. The network learns
            when to open the gate (<InlineMath tex="{\color{#d4a03c}z_t} \approx 1" />, writing
            new information) and when to keep it closed
            (<InlineMath tex="{\color{#d4a03c}z_t} \approx 0" />, preserving the current
            state).
            <Sidenote number={8}>
              The LSTM achieves the same effect with a forget
              gate <InlineMath tex="f_t" /> that multiplies the cell state
              directly: <InlineMath tex="c_t = f_t \odot c_{t-1} + i_t \odot \tilde{c}_t" />.
              When <InlineMath tex="f_t \approx 1" />, information persists.
              The GRU's update gate <InlineMath tex="{\color{#d4a03c}z_t}" /> plays
              the combined role of the LSTM's input and forget gates. LFADS
              uses GRUs throughout its architecture.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="Inside a GRU cell. The reset gate controls how much history enters the candidate computation. The update gate interpolates between keeping the old state and writing the new candidate. When the update gate is near zero, the state passes through unchanged.">
            <GRUGateExplorer />
          </FigureContainer>

          <p>
            The GRU gives us an expressive, trainable nonlinear dynamical
            system. We now have the building block for LFADS: a recurrent
            network that can represent complex dynamics and be trained end-to-end
            with gradient descent. The next step is to define the generative
            model that LFADS uses to produce neural observations from latent
            dynamics.
          </p>

          <h2 id="generative-model">The generative model</h2>

          <p>
            LFADS is a generative model: it defines a probability distribution
            over neural observations by specifying how those observations are
            produced from latent variables. The generative process has five
            steps, each building on the previous.
          </p>

          <p>
            <strong>Step 1: sample the initial condition.</strong> Each trial
            starts with a latent initial
            condition <InlineMath tex="{\color{#7b68ae}g_0}" /> drawn from a
            Gaussian prior:
          </p>

          <Equation number={10} tex="{\color{#7b68ae}g_0} \sim \mathcal{N}\!\bigl({\color{#7b68ae}\mu_0},\; {\color{#7b68ae}\sigma_0}^2 I\bigr)" />

          <p>
            This is the only source of trial-to-trial variability in the basic
            LFADS model (without the controller). Different initial conditions
            produce different neural trajectories. The
            prior <InlineMath tex="\mathcal{N}({\color{#7b68ae}\mu_0}, {\color{#7b68ae}\sigma_0}^2 I)" /> is
            typically fixed to the standard
            normal <InlineMath tex="\mathcal{N}(0, I)" />, and the inference
            network (described in the next section) learns to map each trial's
            observations to a trial-specific posterior
            over <InlineMath tex="{\color{#7b68ae}g_0}" />.
          </p>

          <p>
            <strong>Step 2: run the generator.</strong> The initial condition
            seeds a GRU that runs forward through time, producing a sequence of
            hidden states:
          </p>

          <Equation number={11} tex="{\color{#4A90D9}g_t} = \mathrm{GRU}\!\bigl({\color{#4A90D9}g_{t-1}},\; {\color{#d4a03c}u_t}\bigr)" />

          <p>
            The input <InlineMath tex="{\color{#d4a03c}u_t}" /> is a per-timestep
            perturbation from the controller (another GRU that we will derive in
            the inference network section). In the simplest version of LFADS,
            there is no controller
            (<InlineMath tex="{\color{#d4a03c}u_t} = 0" /> for all <InlineMath tex="t" />),
            and the generator is an autonomous dynamical system whose trajectory
            is fully determined by its initial
            condition <InlineMath tex="{\color{#7b68ae}g_0}" />.
            <Sidenote number={9}>
              The generator's hidden state is high-dimensional (typically 64 to
              128 units), but the factors that emerge from the next step are
              low-dimensional. This separation serves two purposes: the
              generator has enough capacity to represent rich dynamics, while
              the factor bottleneck forces the output to be low-rank, acting as
              a regularizer that prevents the model from memorizing individual
              trials.
            </Sidenote>
          </p>

          <p>
            <strong>Step 3: extract factors.</strong> At each time step, a
            linear projection maps the generator's high-dimensional hidden state
            to a low-dimensional factor vector:
          </p>

          <Equation number={12} tex="{\color{#4A90D9}f_t} = W_f \, {\color{#4A90D9}g_t} + b_f" />

          <p>
            The factors <InlineMath tex="{\color{#4A90D9}f_t}" /> are the analogue
            of the latent
            state <InlineMath tex="{\color{#4A90D9}x_t}" /> in the linear model
            from the PSID post. They are the low-dimensional representation
            of the neural population's state at time <InlineMath tex="t" />.
          </p>

          <p>
            <strong>Step 4: compute firing rates.</strong> The factors are mapped
            to firing rates through a linear transformation followed by an
            exponential nonlinearity:
          </p>

          <Equation number={13} tex="{\color{#4A7C6F}\lambda_t} = \exp\!\bigl(W_r \, {\color{#4A90D9}f_t} + b_r\bigr)" />

          <p>
            The exponential ensures that rates are positive. Each entry
            of <InlineMath tex="{\color{#4A7C6F}\lambda_t}" /> is the predicted
            firing rate of one neuron at time <InlineMath tex="t" />. The
            matrix <InlineMath tex="W_r" /> maps
            from <InlineMath tex="{\color{#4A90D9}d}" />-dimensional factor space
            to <InlineMath tex="{\color{#4A7C6F}m}" />-dimensional neuron space,
            analogous to the observation
            matrix <InlineMath tex="{\color{#4A7C6F}C}" /> in the linear model.
            <Sidenote number={10}>
              The connection to the linear state-space model is direct. In the
              PSID model, <InlineMath tex="{\color{#4A7C6F}y_t} = {\color{#4A7C6F}C}\,{\color{#4A90D9}x_t} + {\color{#999999}v_t}" /> maps
              latent states to observations linearly. In LFADS, the factor-to-rate
              mapping <InlineMath tex="{\color{#4A7C6F}\lambda_t} = \exp(W_r\, {\color{#4A90D9}f_t} + b_r)" /> plays
              the same role, but the log-link and the nonlinear generator
              allow the model to capture dynamics that a linear system cannot.
            </Sidenote>
          </p>

          <p>
            <strong>Step 5: generate observations.</strong> For now, we model
            the observations as Gaussian (we will switch to Poisson in a later
            section):
          </p>

          <Equation number={14} tex="{\color{#4A7C6F}y_t} \sim \mathcal{N}\!\bigl({\color{#4A7C6F}\lambda_t},\; \sigma^2 I\bigr)" />

          <p>
            Under this Gaussian observation model, the log-likelihood of one
            trial's data given the latent trajectory is a sum of squared
            differences between observed and predicted rates, which makes the
            derivations cleaner. We will revisit this assumption when we
            discuss the Poisson observation model for spike count data.
          </p>

          <FigureContainer width="outset" caption="The LFADS generative model. An initial condition seeds the GRU generator, which produces a sequence of hidden states. A linear projection extracts low-dimensional factors, which are mapped through an exponential to firing rates. Observations are drawn from these rates.">
            <GeneratorExplorer />
          </FigureContainer>

          <FigureContainer width="outset" caption="The factor-to-rate mapping. Low-dimensional factors (left) are linearly projected and exponentiated to produce firing rates for each neuron (right). The exponential link ensures positivity and introduces a mild nonlinearity in the observation model.">
            <FactorToRateMapping />
          </FigureContainer>

          <p>
            The full generative model defines a joint distribution over latent
            variables and observations:
          </p>

          <Equation number={15} tex="p({\color{#4A7C6F}y_{1:T}}, {\color{#7b68ae}g_0}, {\color{#d4a03c}u_{1:T}}) = p({\color{#7b68ae}g_0}) \prod_{t=1}^{T} p({\color{#d4a03c}u_t}) \prod_{t=1}^{T} p({\color{#4A7C6F}y_t} \mid {\color{#4A7C6F}\lambda_t})" />

          <p>
            where <InlineMath tex="{\color{#4A7C6F}\lambda_t}" /> is determined
            by the chain of operations above. The challenge is that fitting this
            model requires integrating over the latent
            variables <InlineMath tex="{\color{#7b68ae}g_0}" /> and <InlineMath tex="{\color{#d4a03c}u_{1:T}}" />,
            an integral that is analytically intractable because of the
            nonlinear generator. This is where variational inference comes in.
          </p>

          <h2 id="variational-inference">Variational inference</h2>

          <p>
            We want to maximize the log-likelihood of the observed
            data, <InlineMath tex="\log p({\color{#4A7C6F}y_{1:T}})" />. Writing
            this out by marginalizing over the latent
            variables <InlineMath tex="{\color{#7b68ae}z}" /> (collecting all
            latent variables — initial condition and controller
            inputs — into one symbol for clarity):
          </p>

          <Equation number={16} tex="\log p({\color{#4A7C6F}y}) = \log \int p({\color{#4A7C6F}y}, {\color{#7b68ae}z})\, d{\color{#7b68ae}z}" />

          <p>
            This integral is intractable: the nonlinear generator makes it
            impossible to evaluate in closed form. Variational inference
            sidesteps the problem by introducing an approximate posterior
            distribution <InlineMath tex="q({\color{#7b68ae}z} \mid {\color{#4A7C6F}y})" /> and
            deriving a tractable lower bound on the log-likelihood.
          </p>

          <p>
            The derivation proceeds in three steps. First, multiply and divide
            by <InlineMath tex="q" /> inside the integral:
          </p>

          <Equation number={17} tex="\log p({\color{#4A7C6F}y}) = \log \int \frac{p({\color{#4A7C6F}y}, {\color{#7b68ae}z})}{q({\color{#7b68ae}z} \mid {\color{#4A7C6F}y})} \, q({\color{#7b68ae}z} \mid {\color{#4A7C6F}y})\, d{\color{#7b68ae}z}" />

          <p>
            This is still exact — we have only multiplied by one. Now apply
            Jensen's inequality. Because <InlineMath tex="\log" /> is concave, the
            log of an expectation is at least as large as the expectation of the
            log:
          </p>

          <Equation number={18} tex="\log p({\color{#4A7C6F}y}) \geq \mathbb{E}_{q}\!\left[\log \frac{p({\color{#4A7C6F}y}, {\color{#7b68ae}z})}{q({\color{#7b68ae}z} \mid {\color{#4A7C6F}y})}\right]" />

          <p>
            The right side is the <em>evidence lower bound</em> (ELBO). Expand
            the joint probability <InlineMath tex="p({\color{#4A7C6F}y}, {\color{#7b68ae}z}) = p({\color{#4A7C6F}y} \mid {\color{#7b68ae}z})\, p({\color{#7b68ae}z})" /> and
            rearrange:
          </p>

          <Equation number={19} tex="\text{ELBO} = \underbrace{\mathbb{E}_{q}\!\bigl[\log p({\color{#4A7C6F}y} \mid {\color{#7b68ae}z})\bigr]}_{\text{reconstruction}} - \underbrace{{\color{#c0503a}\mathrm{KL}}\!\bigl(q({\color{#7b68ae}z} \mid {\color{#4A7C6F}y})\, \|\, p({\color{#7b68ae}z})\bigr)}_{\text{regularization}}" />

          <p>
            The ELBO has two terms. The <em>reconstruction term</em> measures
            how well the latent variables explain the observed data: sample a
            latent state from the approximate posterior, run the generator,
            and compute how likely the observations are under the resulting
            rates. The <em>regularization term</em> is the KL divergence between
            the approximate posterior and the prior, penalizing the model for
            straying too far from the prior distribution over latent variables.
          </p>

          <FigureContainer width="outset" caption="Variational inference visualized. The true posterior (gray) is intractable. The approximate posterior (purple) is a Gaussian chosen to be as close as possible to the true posterior while remaining tractable. The ELBO is tight when the two distributions match.">
            <VariationalIntuition />
          </FigureContainer>

          <p>
            For LFADS, the latent variables factorize into the initial
            condition <InlineMath tex="{\color{#7b68ae}g_0}" /> and the controller
            inputs <InlineMath tex="{\color{#d4a03c}u_{1:T}}" />, so the KL term
            decomposes:
          </p>

          <Equation number={20} tex="{\color{#c0503a}\mathrm{KL}} = {\color{#c0503a}\mathrm{KL}}\!\bigl(q({\color{#7b68ae}g_0} \mid {\color{#4A7C6F}y})\, \|\, p({\color{#7b68ae}g_0})\bigr) + \sum_{t=1}^{T} {\color{#c0503a}\mathrm{KL}}\!\bigl(q({\color{#d4a03c}u_t} \mid {\color{#4A7C6F}y})\, \|\, p({\color{#d4a03c}u_t})\bigr)" />

          <p>
            Both the prior and the approximate posterior are Gaussian, so each
            KL divergence has a closed-form expression. For two
            Gaussians <InlineMath tex="\mathcal{N}(\mu_1, \sigma_1^2)" /> and <InlineMath tex="\mathcal{N}(\mu_2, \sigma_2^2)" /> in
            one dimension:
          </p>

          <Equation number={21} tex="{\color{#c0503a}\mathrm{KL}} = \log\frac{\sigma_2}{\sigma_1} + \frac{\sigma_1^2 + (\mu_1 - \mu_2)^2}{2\sigma_2^2} - \frac{1}{2}" />

          <p>
            For the Gaussian observation model of Equation (14), the
            reconstruction term reduces to a sum of squared errors between
            predicted and observed rates, scaled by the noise variance:
          </p>

          <Equation number={22} tex="\mathbb{E}_{q}\!\bigl[\log p({\color{#4A7C6F}y} \mid {\color{#7b68ae}z})\bigr] \approx -\frac{1}{2\sigma^2} \sum_{t=1}^{T} \|{\color{#4A7C6F}y_t} - {\color{#4A7C6F}\lambda_t}\|^2 + \text{const}" />

          <p>
            The approximation comes from replacing the expectation over <InlineMath tex="q" /> with
            a single sample, estimated via the reparameterization
            trick: sample <InlineMath tex="{\color{#7b68ae}\epsilon} \sim \mathcal{N}(0, I)" /> and
            set <InlineMath tex="{\color{#7b68ae}g_0} = {\color{#7b68ae}\mu_0} + {\color{#7b68ae}\sigma_0} \odot {\color{#7b68ae}\epsilon}" />.
            This makes the sampling operation differentiable with respect to the
            parameters <InlineMath tex="{\color{#7b68ae}\mu_0}" /> and <InlineMath tex="{\color{#7b68ae}\sigma_0}" />,
            so we can backpropagate through it.
            <Sidenote number={11}>
              The reparameterization trick was introduced by Kingma &
              Welling <Citation numbers={5} /> in the variational autoencoder
              (VAE) paper, the foundational framework on which LFADS is built.
              The idea: instead of sampling from a distribution with
              learnable parameters (which blocks gradient flow), sample from a
              fixed distribution and apply a deterministic transformation.
              This moves the stochasticity outside the computational graph.
            </Sidenote>
          </p>

          <FigureContainer width="outset" caption="The ELBO decomposition for LFADS. The reconstruction term (green) rewards accurate predictions of neural activity. The KL term (red) penalizes the posterior for deviating from the prior. Training maximizes their sum.">
            <ELBODecomposition />
          </FigureContainer>

          <p>
            Training LFADS means maximizing the ELBO with respect to all model
            parameters (generator weights, factor matrices, rate matrices) and
            all inference network parameters (the encoder that maps observations
            to approximate posteriors). Both sets of parameters are trained
            jointly by gradient ascent.
            <Sidenote number={12}>
              In practice, the KL term is often weighted by a
              coefficient <InlineMath tex="{\color{#c0503a}\beta}" /> that is
              annealed from 0 to 1 during training — a technique called KL
              annealing or <InlineMath tex="{\color{#c0503a}\beta}" />-VAE
              training. Starting with <InlineMath tex="{\color{#c0503a}\beta} = 0" /> lets the model
              first learn to reconstruct the data before the regularization
              term pushes the posterior toward the prior. Without annealing,
              the KL term can dominate early in training and cause the model
              to ignore the data (posterior collapse).
            </Sidenote>
          </p>

          {/* Sections 7-15 added in next task */}

          <h2 id="references">References</h2>

          <ol className="blog-post__references">
            <li id="ref-1">
              C. Pandarinath, D. J. O'Shea, J. Collins, et al., "Inferring
              single-trial neural population dynamics using sequential
              auto-encoders,"{" "}
              <em>Nature Methods</em>, vol. 15, pp. 805–815, 2018.
            </li>
            <li id="ref-2">
              D. Sussillo, R. Jozefowicz, L. F. Abbott, and C. Pandarinath,
              "LFADS — Latent Factor Analysis via Dynamical Systems,"{" "}
              <em>arXiv</em>:1608.06315, 2016.
            </li>
            <li id="ref-3">
              Y. Bengio, P. Simard, and P. Frasconi, "Learning long-term
              dependencies with gradient descent is difficult,"{" "}
              <em>IEEE Transactions on Neural Networks</em>, vol. 5, no. 2,
              pp. 157–166, 1994.
            </li>
            <li id="ref-4">
              K. Cho, B. van Merrienboer, C. Gulcehre, D. Bahdanau,
              F. Bougares, H. Schwenk, and Y. Bengio, "Learning phrase
              representations using RNN encoder-decoder for statistical
              machine translation,"{" "}
              <em>EMNLP</em>, 2014.
            </li>
            <li id="ref-5">
              D. P. Kingma and M. Welling, "Auto-encoding variational Bayes,"{" "}
              <em>ICLR</em>, 2014.
            </li>
            <li id="ref-6">
              S. Hochreiter and J. Schmidhuber, "Long short-term memory,"{" "}
              <em>Neural Computation</em>, vol. 9, no. 8, pp. 1735–1780, 1997.
            </li>
            <li id="ref-7">
              O. G. Sani, H. Abbaspourazad, Y. T. Wong, B. Pesaran, and
              M. M. Shanechi, "Modeling behaviorally relevant neural dynamics
              enabled by preferential subspace identification,"{" "}
              <em>Nature Neuroscience</em>, vol. 24, pp. 140–149, 2021.
            </li>
            <li id="ref-8">
              B. M. Yu, J. P. Cunningham, G. Santhanam, S. I. Ryu,
              K. V. Shenoy, and M. Sahani, "Gaussian-process factor analysis
              for low-dimensional single-trial analysis of neural population
              activity,"{" "}
              <em>Journal of Neurophysiology</em>, vol. 102, no. 1,
              pp. 614–635, 2009.
            </li>
            <li id="ref-9">
              M. M. Churchland, J. P. Cunningham, M. T. Kaufman, et al.,
              "Neural population dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51–56, 2012.
            </li>
            <li id="ref-10">
              D. Sussillo, M. M. Churchland, M. T. Kaufman, and
              K. V. Shenoy, "A neural network that finds a naturalistic
              solution for the production of muscle activity,"{" "}
              <em>Nature Neuroscience</em>, vol. 18, pp. 1025–1033, 2015.
            </li>
            <li id="ref-11">
              A. K. Duncker, L. Deng, T. H. Kim, et al., "Scalable
              variational inference for dynamical systems,"{" "}
              <em>NeurIPS</em>, 2024.
            </li>
            <li id="ref-12">
              M. Keshtkaran, A. R. Sedler, R. H. Chowdhury, et al., "A
              large-scale neural network training framework for generalized
              estimation of single-trial population dynamics,"{" "}
              <em>Nature Methods</em>, vol. 19, pp. 1572–1577, 2022.
            </li>
            <li id="ref-13">
              K. Keshtkaran and C. Pandarinath, "Enabling hyperparameter
              optimization in sequential autoencoders for spiking neural
              data,"{" "}
              <em>NeurIPS</em>, 2019.
            </li>
            <li id="ref-14">
              O. G. Sani, B. Pesaran, and M. M. Shanechi, "Dissociative and
              prioritized modeling of behaviorally relevant neural dynamics
              using recurrent neural networks,"{" "}
              <em>Nature Neuroscience</em>, vol. 27, pp. 2033–2045, 2024.
            </li>
          </ol>
        </div>

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
  <title>Latent Factor Analysis via Dynamical Systems | Felix Taschbach</title>
)

export default LFADSPost
