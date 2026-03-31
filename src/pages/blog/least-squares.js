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
import OverfitExplorer from "../../components/blog/OverfitExplorer"
import ConditionNumberExplorer from "../../components/blog/ConditionNumberExplorer"
import RidgeExplorer from "../../components/blog/RidgeExplorer"
import ShrinkageExplorer from "../../components/blog/ShrinkageExplorer"
import LassoVsRidgeExplorer from "../../components/blog/LassoVsRidgeExplorer"
import SeriesNav from "../../components/SeriesNav"

const TOC_ITEMS = [
  { id: "memorized-noise", label: "The decoder that memorized noise" },
  { id: "normal-equations", label: "The normal equations" },
  { id: "condition-number", label: "Condition number" },
  { id: "ridge", label: "Ridge regression" },
  { id: "choosing-lambda", label: "Choosing lambda" },
  { id: "shrinkage", label: "Why shrinkage works" },
  { id: "sparsity", label: "Sparsity and the L1 norm" },
  { id: "what-comes-next", label: "What comes next" },
  { id: "references", label: "References" },
]

const LeastSquaresPost = () => {
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
            Least squares and regularization
          </h1>
          <p className="blog-post__subtitle">
            Why the best-fitting decoder is usually the worst one to use.
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
                Linear Algebra for Neural Data, Part 8
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          <h2 id="memorized-noise">The decoder that memorized noise</h2>

          <p>
            In <Link to="/blog/matrices-linear-maps/">Post 3</Link>, a
            collaborator handed us a decoder: a weight
            matrix <InlineMath tex="W" /> that maps neural firing rates
            to hand velocity. We used it without asking where it came from.
            Now we need to build one ourselves.
          </p>

          <p>
            The setup is standard. You record from 100 neurons in motor
            cortex while a monkey makes repeated reaches. Each trial gives
            you a 100-dimensional firing-rate
            vector <InlineMath tex="a_i \in \mathbb{R}^{100}" /> and a
            2D hand velocity <InlineMath tex="v_i \in \mathbb{R}^2" />.
            You want a 2-by-100 weight matrix <InlineMath tex="W" /> such
            that <InlineMath tex="Wa_i \approx v_i" /> for every trial.
            Stack the trials: the neural data form a 50-by-100
            matrix <InlineMath tex="A" /> (one row per trial), and the
            velocities form a 50-by-2 matrix <InlineMath tex="V" />.
            You want <InlineMath tex="AW^\top \approx V" />, or
            equivalently, you want to solve each column of the velocity
            matrix separately as a least-squares problem.
          </p>

          <p>
            You have 50 training trials. You apply the least-squares
            formula (which we will derive in the next section) and get
            a weight matrix. On the training data, the predictions are
            nearly perfect: <InlineMath tex="R^2 = 0.99" />. You hold
            out 50 additional test trials that the decoder has never seen.
            On those, <InlineMath tex="R^2 = 0.03" />. The decoder
            explains almost none of the variance on new data.
          </p>

          <p>
            What happened is not subtle. You have 50 observations and 100
            unknowns (one weight per neuron). The system is
            underdetermined: there are infinitely many weight vectors that
            fit the training data exactly, and least squares picks one of
            them. That solution threads through every training point
            perfectly, but it does so by exploiting the particular pattern
            of trial-to-trial noise in those 50 trials. On new trials,
            the noise is different, and the decoder falls apart.
            <Sidenote number={1}>
              This is a general phenomenon, not specific to neural
              decoding. Whenever the number of predictors exceeds the
              number of observations, ordinary least squares will
              overfit. In neuroscience, the ratio is often extreme:
              hundreds of neurons, tens of trials. The overfitting is
              not a failure of the math. It is the math doing exactly
              what you asked.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="Adjust the number of neurons. Training R² stays high as N increases, but test R² collapses once N exceeds the number of training trials."
          >
            <OverfitExplorer />
          </FigureContainer>

          <p>
            The figure shows the pattern clearly. As you increase the
            number of neurons used in the decoder, training{" "}
            <InlineMath tex="R^2" /> climbs steadily toward 1. Test{" "}
            <InlineMath tex="R^2" /> follows at first, because the added
            neurons carry real information about the reach direction. But
            once the number of neurons exceeds the number of training
            trials, test <InlineMath tex="R^2" /> drops. With 100 neurons
            and 50 trials, the gap between training and test performance
            is enormous.
          </p>

          <p>
            The least-squares formula gave us an exact answer. The math
            was correct. The answer was useless. To understand why, we
            need to look at what the formula actually computes.
          </p>

          <h2 id="normal-equations">The normal equations</h2>

          <p>
            We want to solve <InlineMath tex="Ax = b" /> where{" "}
            <InlineMath tex="A" /> is an <InlineMath tex="m \times n" />{" "}
            matrix, <InlineMath tex="x \in \mathbb{R}^n" /> is the
            unknown, and <InlineMath tex="b \in \mathbb{R}^m" /> is the
            target. When <InlineMath tex="b" /> is not in the column
            space of <InlineMath tex="A" /> (and usually it is not),
            there is no exact solution. We settle for the{" "}
            <InlineMath tex="x" /> that makes{" "}
            <InlineMath tex="Ax" /> as close to{" "}
            <InlineMath tex="b" /> as possible, minimizing the squared
            error <InlineMath tex="\|Ax - b\|^2" />.
          </p>

          <p>
            The geometric answer comes from{" "}
            <Link to="/blog/subspaces-rank-projection/">Post 4</Link>.
            The closest point to <InlineMath tex="b" /> in the column
            space of <InlineMath tex="A" /> is the orthogonal projection
            of <InlineMath tex="b" /> onto that subspace. Call it{" "}
            <InlineMath tex="\hat{b} = A\hat{x}" />. The residual{" "}
            <InlineMath tex="b - A\hat{x}" /> is perpendicular to
            the column space.
          </p>

          <p>
            Perpendicular to the column space means perpendicular to every
            column of <InlineMath tex="A" />. Stacking those
            perpendicularity conditions into one matrix equation:
          </p>

          <Equation
            tex="A^\top (b - A\hat{x}) = 0"
            number={1}
          />

          <p>
            Distribute and rearrange:
          </p>

          <Equation
            tex="A^\top A\, \hat{x} = A^\top b"
            number={2}
          />

          <p>
            These are the normal equations. If{" "}
            <InlineMath tex="A^\top A" /> is invertible (which requires
            the columns of <InlineMath tex="A" /> to be linearly
            independent), the solution is unique:
          </p>

          <Equation
            tex="\hat{x} = (A^\top A)^{-1} A^\top b"
            number={3}
          />

          <p>
            The matrix <InlineMath tex="(A^\top A)^{-1} A^\top" /> is
            the pseudoinverse
            of <InlineMath tex="A" />, which we met in{" "}
            <Link to="/blog/svd/">Post 6</Link> through the SVD. The
            two derivations give the same object. The SVD
            route (<InlineMath tex="A^+ = V\Sigma^+ U^\top" />) works
            even when the columns are dependent; the normal-equations
            route requires invertibility
            of <InlineMath tex="A^\top A" /> but makes the geometry
            explicit.
            <Sidenote number={2}>
              The connection is direct. From the
              SVD <InlineMath tex="A = U\Sigma V^\top" />, we
              get <InlineMath tex="A^\top A = V\Sigma^2 V^\top" /> and{" "}
              <InlineMath tex="(A^\top A)^{-1} = V\Sigma^{-2} V^\top" />.
              Then{" "}
              <InlineMath tex="(A^\top A)^{-1} A^\top = V\Sigma^{-1} U^\top = A^+" />.
              The normal equations and the pseudoinverse are two ways of
              writing the same computation.
            </Sidenote>
          </p>

          <p>
            The derivation has a satisfying structure. We start from a
            geometric fact (the residual is perpendicular to the column
            space), translate it into algebra (equation 1), and arrive
            at an explicit formula (equation 3). The formula minimizes
            the squared error. It is the unique minimizer. So why did it
            fail on the decoder problem?
          </p>

          <p>
            The formula works. What goes wrong is the matrix it operates
            on. When <InlineMath tex="A^\top A" /> is nearly singular,
            the inverse amplifies noise. A column
            of <InlineMath tex="A" /> that carries almost no signal still
            contributes a direction in the solution, and the inverse
            inflates that direction by a factor proportional to the
            reciprocal of the smallest eigenvalue
            of <InlineMath tex="A^\top A" />. If the smallest eigenvalue
            is <InlineMath tex="10^{-6}" />, the noise in that direction
            gets amplified by <InlineMath tex="10^{6}" />.
            <Sidenote number={3}>
              In the SVD picture, this is the same observation. The
              pseudoinverse replaces each singular
              value <InlineMath tex="\sigma_i" /> with{" "}
              <InlineMath tex="1/\sigma_i" />. A tiny singular value
              becomes a huge reciprocal, and whatever noise happens to
              align with that direction gets blown up. The condition
              number <InlineMath tex="\sigma_1 / \sigma_n" /> measures
              how badly this can happen.
            </Sidenote>
          </p>

          <h2 id="condition-number">Condition number</h2>

          <p>
            The previous section ended with a specific claim: when{" "}
            <InlineMath tex="A^\top A" /> is nearly singular, the
            pseudoinverse amplifies noise. The condition number makes
            that claim precise.
          </p>

          <p>
            Take the SVD of <InlineMath tex="A" />. Its singular values{" "}
            <InlineMath tex="\sigma_1 \geq \sigma_2 \geq \cdots \geq \sigma_n" />{" "}
            measure how much <InlineMath tex="A" /> stretches each input
            direction. The condition number is the ratio of the largest
            stretch to the smallest:
          </p>

          <Equation
            tex="\kappa(A) = \frac{\sigma_{\max}}{\sigma_{\min}}"
            number={4}
          />

          <p>
            This ratio controls sensitivity. If you perturb the
            data <InlineMath tex="b" /> by a small relative
            amount <InlineMath tex="\epsilon" />, the least-squares
            solution can change by up
            to <InlineMath tex="\kappa(A) \cdot \epsilon" /> in relative
            terms. When <InlineMath tex="\kappa = 10^6" />, a 0.1% change
            in the data can produce a 1000x change in the estimated
            weights. The solution is not wrong in the algebraic sense — it
            still minimizes the squared error — but it is useless in the
            practical sense, because the weights are dominated by
            amplified noise rather than signal.
          </p>

          <p>
            Why does neural population data tend to have
            large <InlineMath tex="\kappa" />? Two reasons, both
            common in practice. First, neurons are correlated. Motor
            cortex neurons that prefer similar reach directions fire
            together, so the columns of <InlineMath tex="A" /> point
            in similar directions. That makes some singular values
            large (the shared activity patterns) and others tiny (the
            directions along which the population barely varies).{" "}
            <InlineMath tex="A^\top A" /> inherits this structure:
            its eigenvalues are the squared singular values, so a
            singular value of <InlineMath tex="10^{-3}" /> becomes
            an eigenvalue of <InlineMath tex="10^{-6}" />.
            <Sidenote number={4}>
              The neural manifold literature quantifies this
              directly. Gallego et al. (2017) showed that motor cortex
              population activity during reaching lives on a manifold
              whose dimensionality is far lower than the neuron count.
              If you record from 100 neurons but the data only spans
              10 dimensions, then 90 singular values are near zero.
              The condition number of such a matrix is enormous.
            </Sidenote>
          </p>

          <p>
            Second, when the number of neurons exceeds the number of
            trials (<InlineMath tex="n > m" />),{" "}
            <InlineMath tex="A^\top A" /> is not just nearly
            singular — it is exactly singular. It has
            at most <InlineMath tex="m" /> nonzero eigenvalues, and
            the remaining <InlineMath tex="n - m" /> eigenvalues are
            zero. The condition number is infinite. This is the
            situation from section 1: 100 neurons, 50 trials, and a
            decoder that memorized noise.
          </p>

          <p>
            The small singular values are the specific source of
            trouble. Each singular value <InlineMath tex="\sigma_i" />{" "}
            corresponds to a direction in the input space. The
            pseudoinverse divides by <InlineMath tex="\sigma_i" />{" "}
            along that direction. For the large singular values, this
            division is harmless — a signal that was stretched by 10
            gets compressed back by 1/10. For the tiny singular
            values, the division is catastrophic. A direction where
            the data barely varies (say <InlineMath tex="\sigma_i = 0.001" />)
            gets inflated by a factor of 1000. Whatever noise happens
            to project onto that direction is amplified into a huge
            weight component. The resulting weight vector has enormous
            norm and is almost entirely noise.
          </p>

          <FigureContainer
            width="outset"
            caption="Drag a data point. In the well-conditioned case, the regression line barely moves. In the ill-conditioned case, it swings wildly. The condition number κ quantifies the instability."
          >
            <ConditionNumberExplorer />
          </FigureContainer>

          <p>
            The figure lets you see the instability directly. In the
            well-conditioned panel, moving a single data point
            barely changes the fit. In the ill-conditioned panel,
            the same perturbation sends the regression line swinging
            through a completely different slope. Both panels solve
            the same least-squares problem. The only difference is
            the geometry of the data: one has singular values that
            are roughly equal, the other has singular values that
            span orders of magnitude.
          </p>

          <h2 id="ridge">Ridge regression</h2>

          <p>
            The diagnosis points directly to a fix. The problem is
            that small eigenvalues of <InlineMath tex="A^\top A" />{" "}
            produce enormous entries in the inverse. So make the
            small eigenvalues bigger. Add a positive
            constant <InlineMath tex="\lambda" /> to every diagonal
            entry of <InlineMath tex="A^\top A" /> before inverting:
          </p>

          <Equation
            tex="\hat{x}_{\text{ridge}} = (A^\top A + \lambda I)^{-1} A^\top b"
            number={5}
          />

          <p>
            This is ridge regression. The matrix{" "}
            <InlineMath tex="A^\top A + \lambda I" /> has eigenvalues{" "}
            <InlineMath tex="\sigma_i^2 + \lambda" /> instead
            of <InlineMath tex="\sigma_i^2" />. An eigenvalue that
            was <InlineMath tex="10^{-6}" /> becomes{" "}
            <InlineMath tex="\lambda + 10^{-6} \approx \lambda" />.
            The condition number drops from{" "}
            <InlineMath tex="\sigma_{\max}^2 / \sigma_{\min}^2" /> to{" "}
            <InlineMath tex="(\sigma_{\max}^2 + \lambda) / (\sigma_{\min}^2 + \lambda)" />,
            which is always closer to 1. The inverse no longer blows
            up along the low-variance directions.
            <Sidenote number={5}>
              Ridge regression is also called Tikhonov
              regularization, after the Soviet mathematician who
              studied it in the context of ill-posed integral
              equations. In BCI decoding, ridge is the standard
              method. The review by Glaser et al. (2020) found that
              ridge regression matched or outperformed more complex
              decoders across multiple datasets and brain areas.
              Nearly every practical neural decoder uses some form
              of regularization — the question is not whether to
              regularize, but how much.
            </Sidenote>
          </p>

          <p>
            There is an equivalent way to arrive at the same formula.
            Instead of modifying the matrix you invert, you can
            modify the objective you minimize. Add a penalty on the
            size of the weights:
          </p>

          <Equation
            tex="\min_x \|Ax - b\|^2 + \lambda \|x\|^2"
            number={6}
          />

          <p>
            Take the gradient, set it to zero, and you get equation 5
            back. The two views — inflating eigenvalues versus
            penalizing weight magnitude — describe the same
            computation. The penalty view makes the tradeoff
            explicit: the first term wants the predictions to match
            the data, the second term wants the weights to stay
            small. The parameter <InlineMath tex="\lambda" /> controls
            the balance.
          </p>

          <p>
            Geometrically, ridge regression constrains the solution
            to lie within a ball{" "}
            <InlineMath tex="\|x\|^2 \leq t" /> for some
            radius <InlineMath tex="t" /> that depends
            on <InlineMath tex="\lambda" />. Ordinary least squares
            finds the minimum of the squared error anywhere in
            parameter space. Ridge finds the minimum within the ball.
            If the unconstrained minimum has enormous norm (because
            tiny singular values inflated the weights), the ball
            pulls the solution back toward the origin. The weights
            shrink. The fit to the training data gets slightly worse.
            The fit to new data gets much better.
          </p>

          <p>
            This is the bias-variance tradeoff stated concretely.
            At <InlineMath tex="\lambda = 0" />, there is no penalty,
            and you recover ordinary least squares: zero bias (the
            expected estimate equals the true parameter), but
            potentially enormous variance (the estimate swings wildly
            with each new sample of noise). As <InlineMath tex="\lambda" />{" "}
            increases, the weights shrink toward zero, introducing
            bias (the estimate is systematically pulled away from
            the truth), but reducing variance (the estimate becomes
            stable across different noise realizations). Somewhere
            between these extremes is a value
            of <InlineMath tex="\lambda" /> that minimizes the total
            error on new data. Finding that value is the subject of
            the next section.
          </p>

          <FigureContainer
            width="outset"
            caption="Adjust λ. At λ = 0 the fit passes through the training points but overshoots on test points. Increasing λ stabilizes the regression line at the cost of a slightly worse training fit."
          >
            <RidgeExplorer />
          </FigureContainer>

          <p>
            The figure shows what happens as you turn the dial. With
            no regularization, the fit hugs the training data
            closely — too closely, because it is tracking noise. As
            you increase <InlineMath tex="\lambda" />, the regression
            line smooths out. The training error rises slightly, but
            the test error drops. Push <InlineMath tex="\lambda" />{" "}
            too far and the line flattens toward zero, ignoring the
            data entirely. The optimal <InlineMath tex="\lambda" />{" "}
            sits where test error is minimized: enough regularization
            to suppress noise, not so much that you suppress signal.
          </p>

          <h2 id="choosing-lambda">Choosing lambda</h2>

          <p>
            The bias-variance tradeoff tells you that an
            optimal <InlineMath tex="\lambda" /> exists. It does not tell
            you what it is. The answer depends on the data: on the
            singular values of <InlineMath tex="A" />, on the noise
            level, on how many trials you have. You cannot compute it
            from first principles. You have to estimate it empirically.
          </p>

          <p>
            The standard approach is cross-validation. Split
            your <InlineMath tex="m" /> trials into <InlineMath tex="K" />{" "}
            groups (folds). For each fold <InlineMath tex="k" />, hold
            it out, fit ridge regression on the
            remaining <InlineMath tex="K-1" /> folds using a
            candidate <InlineMath tex="\lambda" />, and measure the
            prediction error on the held-out fold. Average the error
            across folds:
          </p>

          <Equation
            tex="\text{CV}(\lambda) = \frac{1}{K} \sum_{k=1}^{K} \| A_k \hat{x}_{-k}(\lambda) - b_k \|^2"
            number={7}
          />

          <p>
            Here <InlineMath tex="A_k" /> and <InlineMath tex="b_k" /> are
            the data from fold <InlineMath tex="k" />,
            and <InlineMath tex="\hat{x}_{-k}(\lambda)" /> is the ridge
            solution fit on everything except fold <InlineMath tex="k" />.
            Repeat this for a grid of <InlineMath tex="\lambda" /> values
            (typically spaced logarithmically from{" "}
            <InlineMath tex="10^{-4}" /> to <InlineMath tex="10^4" />)
            and pick the <InlineMath tex="\lambda" /> that
            minimizes <InlineMath tex="\text{CV}(\lambda)" />.
            <Sidenote number={6}>
              In practice, most neuroscience toolboxes use generalized
              cross-validation (GCV) or leave-one-out CV, both of which
              have closed-form solutions for ridge regression. You do
              not need to loop over folds. GCV replaces the
              combinatorial leave-one-out procedure with a single
              matrix trace computation, making it fast even for large
              datasets.
            </Sidenote>
          </p>

          <p>
            If you plot <InlineMath tex="R^2" /> on held-out data
            against <InlineMath tex="\log \lambda" />, the curve is
            U-shaped. On the left (<InlineMath tex="\lambda" /> too
            small), the model overfits: the weights are large, the
            training fit is excellent, and the test fit is poor. On the
            right (<InlineMath tex="\lambda" /> too large), the model
            underfits: the weights are crushed toward zero, and the
            decoder ignores real structure in the data. The bottom of
            the U is the CV-optimal <InlineMath tex="\lambda" />. The
            RidgeExplorer above already shows this pattern — as you
            increase <InlineMath tex="\lambda" />, training error rises
            monotonically while test error dips and then climbs back up.
          </p>

          <p>
            Where the optimum falls depends on how ill-conditioned the
            problem is. Consider decoding hand velocity from motor
            cortex. With 100 neurons and 200 trials, the data matrix is
            overdetermined and reasonably well-conditioned. The
            optimal <InlineMath tex="\lambda" /> is small — perhaps 1 to
            10 — because there is enough data to estimate the weights
            reliably, and only a gentle nudge is needed. Now cut the
            trial count to 50. The problem becomes underdetermined (more
            neurons than trials), the condition number goes to infinity,
            and the optimal <InlineMath tex="\lambda" /> shifts higher,
            perhaps by an order of magnitude. Less data means more
            regularization. The cross-validation curve adapts
            automatically: it finds the <InlineMath tex="\lambda" /> that
            matches the severity of the problem.
          </p>

          <h2 id="shrinkage">Why shrinkage works</h2>

          <p>
            Cross-validation tells you which <InlineMath tex="\lambda" />{" "}
            to use. It does not tell you what ridge is actually doing to
            the solution. For that, go back to the SVD. Write{" "}
            <InlineMath tex="A = U\Sigma V^\top" />. The ordinary
            least-squares solution expands in the right singular
            vectors: the weight along direction <InlineMath tex="v_i" />{" "}
            is proportional to <InlineMath tex="1/\sigma_i" />. We saw
            in section 3 that this is the source of trouble — when{" "}
            <InlineMath tex="\sigma_i" /> is small,{" "}
            <InlineMath tex="1/\sigma_i" /> is enormous, and the
            corresponding weight component is dominated by noise.
          </p>

          <p>
            Ridge regression replaces the pseudoinverse
            filter <InlineMath tex="1/\sigma_i" /> with a different
            function:
          </p>

          <Equation
            tex="f_i = \frac{\sigma_i}{\sigma_i^2 + \lambda}"
            number={8}
          />

          <p>
            This filter has two regimes. When <InlineMath tex="\sigma_i" />{" "}
            is large relative to <InlineMath tex="\sqrt{\lambda}" />,
            the denominator is dominated by{" "}
            <InlineMath tex="\sigma_i^2" />,
            and <InlineMath tex="f_i \approx 1/\sigma_i" /> — essentially
            the same as the pseudoinverse. The well-measured directions
            pass through unchanged. When <InlineMath tex="\sigma_i" />{" "}
            is small relative to <InlineMath tex="\sqrt{\lambda}" />,
            the denominator is dominated by <InlineMath tex="\lambda" />,
            and <InlineMath tex="f_i \approx \sigma_i/\lambda" /> — a
            value close to zero. The poorly measured directions are
            heavily damped. There is no sharp cutoff. The transition
            is smooth: the filter rolls off continuously as the singular
            values shrink.
            <Sidenote number={7}>
              This perspective connects ridge to the broader family of
              spectral filters. Truncated SVD, ridge regression, and
              Landweber iteration are all linear filters applied to the
              singular values. They differ only in the shape of the
              filter function:{" "}
              <InlineMath tex="f_i = \mathbf{1}[\sigma_i > \text{threshold}] / \sigma_i" />{" "}
              for truncated SVD,{" "}
              <InlineMath tex="f_i = \sigma_i / (\sigma_i^2 + \lambda)" />{" "}
              for ridge, and an iterative approximation for Landweber.
              Ridge is the most widely used because its filter is smooth
              and its solution has a closed form.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="Singular values (bars) with two filter functions overlaid. The pseudoinverse (red) divides by each singular value — small values produce huge weights. Ridge (teal) damps the small ones. Adjust λ to see the filter change."
          >
            <ShrinkageExplorer />
          </FigureContainer>

          <p>
            The figure makes the mechanism visible. The bars show the
            singular values of a typical neural data matrix — a few
            large ones capturing the dominant population activity
            patterns, then a long tail of small values reflecting
            noise directions. The pseudoinverse filter (red) climbs
            steeply as the singular values shrink, amplifying whatever
            noise projects onto those directions. The ridge filter
            (teal) follows the pseudoinverse for the large singular
            values but peels away and stays small where the singular
            values are tiny. As you increase <InlineMath tex="\lambda" />,
            the point where the two curves diverge moves to the right,
            damping more and more directions.
          </p>

          <p>
            Compare this to the truncated SVD from{" "}
            <Link to="/blog/svd/">Part 6</Link>. Truncated SVD applies a
            hard threshold: keep the top <InlineMath tex="k" /> singular
            values, discard the rest entirely. The filter function is a
            step — <InlineMath tex="1/\sigma_i" /> for the
            first <InlineMath tex="k" /> directions, zero for the
            remainder. Ridge is a soft threshold: it gradually damps the
            contribution of each direction rather than making a binary
            keep-or-discard decision. In practice, ridge is often the
            better choice. The hard cutoff of truncated SVD forces you
            to pick <InlineMath tex="k" />, and directions just below
            the cutoff may still carry useful signal. Ridge avoids
            the arbitrary boundary. Each direction contributes in
            proportion to how well-measured it is, which is usually
            what you want when decoding from a noisy neural population.
          </p>

          <h2 id="sparsity">Sparsity and the L1 norm</h2>

          <p>
            Ridge regression shrinks all weights toward zero, but it never
            sets any of them exactly to zero. Every neuron retains some
            nonzero weight, no matter how small. Sometimes that is not what
            you want. If you record from 100 neurons in motor cortex but
            only 15 of them actually carry information about the decoded
            variable, you want the decoder to find those 15 and ignore the
            rest. A decoder that spreads its weights across all 100 neurons
            is harder to interpret, harder to validate, and often less
            stable than one that commits to a subset.
          </p>

          <p>
            The tool for this is a different penalty. Replace the squared
            L2 norm <InlineMath tex="\|w\|^2 = w_1^2 + w_2^2 + \cdots + w_n^2" />{" "}
            with the L1 norm{" "}
            <InlineMath tex="\|w\|_1 = |w_1| + |w_2| + \cdots + |w_n|" />.
            The resulting method is the lasso (least absolute shrinkage and
            selection operator), introduced by Tibshirani (1996):
          </p>

          <Equation
            tex="\min_w \|Aw - b\|^2 + \lambda \|w\|_1"
            number={9}
          />

          <p>
            The geometric reason the L1 penalty produces zeros connects
            back to the norm balls from{" "}
            <Link to="/blog/vectors-geometry/">Part 1</Link>. The L2 ball
            is round — a circle in two dimensions, a sphere in three. The
            L1 ball is a diamond (a rotated square in 2D, an octahedron in
            3D), with sharp corners sitting on the coordinate axes.
            Constrained optimization finds the point where the elliptical
            cost contours first touch the constraint region. For the L2
            circle, that tangent point generically lies on a smooth curve,
            so all weights are nonzero. For the L1 diamond, the contours
            almost always hit a corner first. A corner sits on a coordinate
            axis, which means one or more weights are exactly zero. The
            sharper the corner, the stronger the pull toward sparsity.
            <Sidenote number={8}>
              The elastic net, introduced by Zou and Hastie (2005),
              combines both penalties:{" "}
              <InlineMath tex="\lambda_1 \|w\|_1 + \lambda_2 \|w\|_2^2" />.
              This gives sparsity from the L1 term and stability from the
              L2 term. Unlike pure lasso, elastic net handles correlated
              predictors gracefully — it tends to include or exclude groups
              of correlated neurons together rather than arbitrarily
              picking one from each correlated pair.
            </Sidenote>
          </p>

          <FigureContainer
            width="outset"
            caption="Toggle between L₂ (circle) and L₁ (diamond) constraints. The L₁ diamond has corners on the axes — when the cost contours touch a corner, one weight is exactly zero."
          >
            <LassoVsRidgeExplorer />
          </FigureContainer>

          <p>
            In practice, the sparsity is real and useful. Apply lasso to
            the motor cortex decoding problem with 100 neurons, sweep{" "}
            <InlineMath tex="\lambda" /> upward, and watch what happens.
            At small <InlineMath tex="\lambda" />, all 100 weights are
            nonzero and the decoder overfits, just like unregularized
            least squares. As <InlineMath tex="\lambda" /> increases,
            weights start dropping to exactly zero, one by one. At some
            intermediate value, perhaps 15 to 20 neurons remain, and the
            test-set performance peaks. Push <InlineMath tex="\lambda" />{" "}
            further and even informative neurons get zeroed out, and
            performance degrades. The cross-validation procedure from
            section 5 works here too — plot held-out error
            against <InlineMath tex="\lambda" />, find the minimum, and
            read off both the optimal penalty and the set of neurons
            the decoder selected.
          </p>

          <p>
            There is one cost. Unlike ridge, the lasso objective has no
            closed-form solution. The absolute value in the L1 norm makes
            the penalty non-differentiable at zero, so you cannot just
            take the gradient and set it to zero. Numerical algorithms
            (coordinate descent, ISTA, ADMM) handle this efficiently, but
            the computation is iterative rather than a single matrix
            formula. For most neural decoding problems, this is a minor
            inconvenience. The real question is whether you need sparsity
            at all. If the goal is pure prediction accuracy, ridge usually
            wins. If the goal is identifying which neurons matter, lasso
            is the right tool.
          </p>

          <h2 id="what-comes-next">What comes next</h2>

          <p>
            Every method in the rest of this series will face a version of
            the same problem. Canonical correlation analysis (CCA) requires
            inverting sample covariance matrices. Record 100 neurons across
            50 trials and the sample covariance is 100-by-100 but rank 50
            at most — exactly singular. The same ill-conditioning that
            wrecked ordinary least squares wrecks ordinary CCA. The fix is
            the same too: add <InlineMath tex="\lambda I" /> to the
            covariance matrix before inverting. Regularized CCA is to CCA
            what ridge is to least squares. The{" "}
            <Link to="/blog/cca/">next post</Link> builds this up from
            scratch.
          </p>

          <p>
            The broader point is worth stating plainly. More parameters
            than data points, correlated features, noise in the target —
            these are not unusual conditions in neuroscience. They are the
            default. Regularization is not an optional add-on for when
            things go wrong. It is what makes any of these methods usable
            on real neural data. The normal equations give you the math.
            Regularization gives you something you can trust.
          </p>

          <h2 id="references">References</h2>
          <ol className="blog-references">
            <li id="ref-1">
              Hastie, T., Tibshirani, R., and Friedman, J.{" "}
              <em>The Elements of Statistical Learning</em>, 2nd ed.
              Springer, 2009.
            </li>
            <li id="ref-2">
              Hoerl, A. E. and Kennard, R. W. "Ridge regression:
              biased estimation for nonorthogonal problems,"{" "}
              <em>Technometrics</em>, vol. 12, no. 1, pp. 55-67, 1970.
            </li>
            <li id="ref-3">
              Tibshirani, R. "Regression shrinkage and selection via
              the lasso,"{" "}
              <em>Journal of the Royal Statistical Society: Series B</em>,
              vol. 58, no. 1, pp. 267-288, 1996.
            </li>
            <li id="ref-4">
              Glaser, J. I., Benjamin, A. S., Farhoodi, R., et al.
              "Machine learning for neural decoding,"{" "}
              <em>eNeuro</em>, vol. 7, no. 4, 2020.
            </li>
            <li id="ref-5">
              Strang, G. <em>Introduction to Linear Algebra</em>, 6th ed.
              Wellesley-Cambridge Press, 2023.
            </li>
            <li id="ref-6">
              Gallego, J. A., Perich, M. G., Miller, L. E., and
              Solla, S. A. "Neural manifolds for the control of
              movement,"{" "}
              <em>Neuron</em>, vol. 94, no. 5, pp. 978-984, 2017.
            </li>
            <li id="ref-7">
              Zou, H. and Hastie, T. "Regularization and variable
              selection via the elastic net,"{" "}
              <em>Journal of the Royal Statistical Society: Series B</em>,
              vol. 67, no. 2, pp. 301-320, 2005.
            </li>
          </ol>
        </div>

        <SeriesNav part={8} />

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
    Least squares and regularization &mdash; Felix Taschbach
  </title>
)

export default LeastSquaresPost
