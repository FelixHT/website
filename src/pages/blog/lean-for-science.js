import React, { useRef, useState, useEffect } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
import Sidenote from "../../components/Sidenote"
import Citation from "../../components/Citation"
import FigureContainer from "../../components/blog/FigureContainer"
import ClaimDependency from "../../components/blog/ClaimDependency"
import MotorCortexTimeline from "../../components/blog/MotorCortexTimeline"
import InfrastructureLayers from "../../components/blog/InfrastructureLayers"
import TableOfContents from "../../components/blog/TableOfContents"
import "../../components/blog/prism-theme.css"
import "./blog-post.css"

const TOC_ITEMS = [
  { id: "introduction", label: "Introduction" },
  { id: "recycling", label: "The recycling pattern" },
  { id: "existing-tools", label: "Why existing tools are not enough" },
  { id: "what-is-missing", label: "What is missing" },
  { id: "experiment", label: "The experiment" },
  { id: "references", label: "References" },
]

const LeanForSciencePost = () => {
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
            Neuroscience Keeps Solving the Same Problems Twice
          </h1>
          <p className="blog-post__subtitle">
            A structured claim-dependency layer for science, and an experiment
            to test whether it accelerates convergence.
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
              <span className="blog-post__byline-label">Context</span>
              <span className="blog-post__byline-value">
                <a href="https://astera.org/essay-competition/" target="_blank" rel="noopener noreferrer">
                  Astera Essay Competition
                </a>
              </span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          <h2 id="introduction">Introduction</h2>

          <p>
            In 1986, Apostolos Georgopoulos and his colleagues published a
            paper in <em>Science</em> <Citation numbers={2} /> that became one
            of the most influential results in motor neuroscience. They
            recorded from neurons in motor cortex while monkeys reached in
            different directions, and found that each neuron was "tuned" to a
            preferred direction. Add up these preferences across a population,
            weighted by activity, and you get a "population vector" pointing
            where the monkey is about to reach. The result was clean, intuitive,
            and felt like it answered a basic question: what does motor cortex
            represent? Movement direction.
          </p>

          <p>
            Fourteen years later, Emanuel Todorov published a paper
            in <em>Nature Neuroscience</em>{"\u00A0"}<Citation numbers={1} /> that, if
            you followed the argument carefully, showed something unsettling. He
            did not dispute the correlations. What he disputed was the
            inference. Motor cortex sends signals to muscles, and muscles move a
            limb with particular lengths, masses, and joint configurations. Work
            through the biomechanics, and almost any reasonable pattern of
            muscle commands will produce neural activity that <em>looks</em>{" "}
            correlated with movement direction, simply because of the geometry
            of the arm. Direction tuning might not reflect a neural code for
            direction. It might be a byproduct of controlling a physical limb.
          </p>

          <p>
            This should have forced the field to reconsider its foundations. It
            did not. The debate about what neurons "encode" continued for
            another two decades. When the field shifted toward dynamical systems
            in the 2010s, many of the same issues reappeared in new vocabulary,
            but Todorov's deeper question, about what you can infer from neural
            correlations given biomechanics, was never cleanly resolved.
          </p>

          <p>
            Why? Partly incentives: you get published for new results, not for
            re-examining old ones. But I think there is also an infrastructure
            problem, and the reason I think this is that I keep running into it.
          </p>

          <p>
            I develop methods for aligning neural representations across
            subjects and species <Citation numbers={3} />, which means I
            regularly collaborate with experimentalists in fields outside my
            own: motor cortex, songbird vocal production, prefrontal
            decision-making. Each time I enter a new literature, I go through
            the same process. I read the big highly cited papers, build a
            picture of the field, and then slowly discover that some of those
            landmark results have been substantially weakened by later work with
            a fraction of the citation count. The critiques are published,
            peer-reviewed, sometimes technically decisive, but nothing in the
            literature connects them to the earlier result in a way that would
            tell you "before you rely on this finding, you should know about
            these complications." Before I can do my actual research, I have to
            reconstruct the dependency structure by hand: which results still
            stand, which have been narrowed, which depend on methodological
            choices that later turned out to matter more than anyone expected.
            That reconstruction takes weeks even when I already know roughly
            what questions to ask. A first-year PhD student entering the same
            literature would have no reason to suspect the landmark papers were
            contested at all.
          </p>

          <p>
            My hypothesis is that this is not mainly a problem of bad
            incentives. It is a problem of missing infrastructure. Science has
            become very good at distributing papers, and very bad at storing
            structured knowledge about the claims those papers contain.
          </p>

          <h2 id="recycling">The recycling pattern</h2>

          <p>
            Motor cortex is a clean example because the arguments are well
            documented. Debates restart under new labels: force in the 1960s,
            direction in the 1980s, kinematics versus kinetics, then
            representation versus dynamics. Each generation partly absorbed the
            previous one, but rarely made the inheritance explicit.
          </p>

          <p>
            Theoretical critiques fail to propagate.
            <Sidenote number={1}>
              This is not unique to motor cortex. In any field where the
              dominant framework is easier to use than its replacement, the
              easier one keeps generating results faster, keeps getting cited,
              and persists long after the theoretical reasons for preferring it
              have eroded.
            </Sidenote>
            {" "}Todorov and others showed that once you ask not "what variable
            do neurons encode?" but "what control law does the circuit
            implement, given sensory feedback and the biomechanics of the
            body?" <Citation numbers={4} />, many of the older disputes look
            much narrower than they seemed. Yet the older framing persists,
            because it is easier to operationalize. Computing a population
            vector is straightforward. Building a feedback control model is
            hard. The easier analysis generates results faster, even if it
            answers a less well-posed question.
          </p>

          <FigureContainer
            width="wide"
            caption="Three cases where motor neuroscience lost decades to siloed work, ignored critiques, and recycled debates. Hover for details."
          >
            <MotorCortexTimeline />
          </FigureContainer>

          <p>
            You can see this playing out right now. Churchland and
            colleagues <Citation numbers={5} /> showed in 2012 that
            reaching-related neural activity is well described by rotational
            dynamics, a result that reshaped the field. But then Sauerbrei and
            colleagues <Citation numbers={6} /> showed cortical activity depends
            on continuous thalamic input, challenging the idea of autonomous
            dynamics. Kalidindi and colleagues <Citation numbers={7} /> showed
            rotational structure is what you'd expect from a feedback
            controller. Kuzmina and colleagues <Citation numbers={8} /> showed
            that whether you detect rotations at all depends on your smoothing
            kernel. And Suresh and colleagues <Citation numbers={9} /> showed
            the dynamics seen during reaching do not appear during grasping.
            Each of these should change how you interpret the earlier results.
            But there is no standard resource that connects them.
          </p>

          <h2 id="existing-tools">Why existing tools are not enough</h2>

          <p>
            You might think review articles solve this. They help, but a review
            captures one author's interpretation at a single moment. Nobody
            updates it when new results come in. And it narrates the landscape
            rather than decomposing it: a review might say "the autonomous
            dynamics view has been challenged," but it won't tell you that the
            challenge has two logically independent sources, neither of which
            touches the separate problem of preprocessing sensitivity.
          </p>

          <p>
            Tools like Semantic Scholar and Scite.ai classify citations, but
            they work at the level of documents. They can tell you that paper A
            cites paper B in a contrasting way. They cannot tell you that paper
            A's claim depends on a 20 ms smoothing kernel, that paper C showed
            this choice qualitatively changes the result, and that paper D's
            disagreement is about theoretical interpretation rather than data.
          </p>

          <p>
            The citation graph compounds the problem. Serra-Garcia and
            Gneezy <Citation numbers={10} /> found that papers which fail to
            replicate accumulate more citations than those that replicate.
            Greenberg <Citation numbers={11} /> traced a single claim through
            242 papers and found the vast majority of citations went to
            supportive studies. A citation graph that cannot distinguish support
            from challenge is actively misleading when median statistical power
            is around 21% <Citation numbers={12} />.
          </p>

          <h2 id="what-is-missing">What is missing</h2>

          <p>
            What would it look like to actually fix this? The key idea is to
            change the unit of scientific infrastructure from the paper to the
            claim. Each claim would carry its dependencies explicitly (what data
            it rests on, what analysis choices it requires, what theoretical
            commitments it assumes) and have typed connections to other claims:
            supports, challenges, restricts scope, replicates under different
            conditions.
            <Sidenote number={2}>
              A complete system would eventually need additional layers:
              experimental design rationale, operationalization of variables,
              interpretation and framing, and consensus tracking. The pilot
              proposed here starts with claims and dependencies, where the gap
              is most acute.
            </Sidenote>
          </p>

          <FigureContainer
            width="page"
            caption="Layers of scientific infrastructure. The data and computation layers exist. This essay proposes building the claim and dependency layers. Additional layers (faded) represent future extensions. Hover for details."
          >
            <InfrastructureLayers />
          </FigureContainer>

          <p>
            Consider the rotational dynamics debate. Churchland et al. 2012
            would not appear as a single entry but be decomposed into
            constituent claims, each carrying its dependencies. Kuzmina's
            preprocessing result would attach to the specific dependency on the
            smoothing kernel. That flag would propagate to every downstream
            study whose inference depends on similar preprocessing. Studies that
            reached related conclusions through optogenetic perturbation or
            feedback-control modeling would be unaffected, because their
            evidence goes through different dependencies.
          </p>

          <FigureContainer
            width="wide"
            caption="The claim dependency structure for rotational dynamics. Click 'Propagate sensitivity' to see how a preprocessing finding cascades through central dependencies but not contextual citations or independent methods."
          >
            <ClaimDependency />
          </FigureContainer>

          <p>
            This selective propagation is the core of the idea. Right now the
            field has two modes: nothing happens when a critique is published,
            or some human reader holds the entire web of dependencies in their
            head. A claim-dependency graph would create a third option, where
            challenges move along actual epistemic connections rather than
            relying on social memory.
          </p>

          <p>
            But the implications go further. If five labs have tested a claim
            using different preprocessing, species, and task designs, that
            convergence is far stronger evidence than any single paper, but no
            existing system makes it visible. Follow-up work that tightens the
            scope of a claim currently has almost no career value because it is
            not "new"; in a claim layer, it strengthens an edge, and that
            contribution is visible. Null results gain a role: a study that
            tests a claim under new conditions and finds it does not hold is
            not a failure but a scope restriction, and the graph would
            represent that as a real object. And claims that cannot both be true, because they assume
            incompatible preprocessing or theoretical commitments, would be
            flagged by the structure of the graph itself.
          </p>

          <p>
            This is what I mean by a "lean for science." Not a
            proof assistant. Empirical science is too messy for that. But a
            system where claims must be situated relative to other claims, and
            where contradictions become visible by default rather than buried by
            convention.
          </p>

          <p>
            Realizing any of this requires solving a genuinely hard design
            problem: what counts as a "claim"? Churchland et al. 2012 contains
            at least three separable claims, and reasonable people could
            decompose it differently. Too coarse and you lose the dependency
            structure; too fine and experts cannot verify entries in reasonable
            time. The schema has to be tested empirically.
          </p>

          <p>
            The approach I'd propose has three layers. Language models extract
            candidate claims, dependencies, and edges from paper text. A
            graph-level algorithm propagates sensitivity flags along dependency
            chains, detects inconsistencies between claims with incompatible
            assumptions, and surfaces clusters of claims that converge through
            independent paths. Domain experts adjudicate the outputs of both
            layers. The schema would cover a fixed set of dependency types (data
            source, species, task, preprocessing, statistical test, model class,
            theoretical commitment) and edge types (supports, depends-on,
            challenges, restricts-scope, replicates). Whether it is expressive
            enough is one of the things the pilot would test.
          </p>

          <h2 id="experiment">The experiment</h2>

          <p>
            Why now? Standardized neural data archives have reached critical
            mass: DANDI hosts over 1,000 datasets, and the Neural Latents
            Benchmark provides preprocessed recordings from the motor cortex
            experiments at issue.
            <Sidenote number={3}>
              Before language models, structured extraction from papers meant
              either building narrow rule-based parsers or paying domain experts
              to annotate each paper from scratch. Language models can propose a
              candidate decomposition that is wrong often enough to need expert
              review, but right often enough that the expert's job shifts from
              generation to correction. That shift is what makes a 400-paper
              corpus tractable.
            </Sidenote>
            {" "}Language models have made structured extraction from scientific
            text much cheaper, making a few-hundred-paper corpus tractable for a
            small team. And AI-assisted writing is accelerating paper production
            without adding structure <Citation numbers={13} />, making the
            problem worse faster than anyone is building tools to address it.
          </p>

          <p>
            I propose building a claim-dependency graph for a relatively small,
            well-documented field (motor neuroscience is the example I've
            developed here, but the approach is not specific to it). Assemble a
            corpus of roughly 300 to 500 core papers. Define the schema. Use
            language models to propose candidate entries; have domain experts
            adjudicate. Release the graph publicly.
          </p>

          <p>
            The most informative test is a backtest. Build the graph using only
            papers published before some cutoff, say 2018. Then ask: does the
            dependency structure flag the problems the field took years to
            notice? Does it surface the preprocessing sensitivity that Kuzmina
            published in 2024, the tension between autonomous and input-driven
            dynamics before Sauerbrei 2020, the possibility that reaching
            results might not generalize to grasping? If yes, the
            infrastructure would have saved years of confused debate. If no,
            either the schema is too coarse or the dependencies that matter were
            not visible in the earlier literature, and the bottleneck is
            elsewhere.
          </p>

          <p>
            No existing institution is built to maintain this. Universities do
            not reward infrastructure work. Grant panels evaluate novelty.
            Publishers have no reason to flag contradictions in their own
            product. It would require a dedicated team, probably something like
            a Focused Research Organization.
            <Sidenote number={4}>
              The GenBank model is instructive. GenBank succeeded because ACGT
              strings are canonical, journal mandates required deposition, and
              government funding sustained it indefinitely. Scientific claims
              are harder: ambiguous, contested, expressed in natural language.
              The LLM-plus-expert-plus-algorithm hybrid is the first approach
              that might bridge this gap at reasonable cost.
            </Sidenote>
          </p>

          <p>
            I want to be honest about how this could fail. The schema may be too
            rigid to capture the distinctions that matter. The graph may capture
            real structure but fail the backtest, surfacing only tensions
            already obvious from the pre-2018 literature. Or the backtest may
            succeed for known cases but fail to generalize, because we built it
            knowing what to look for. Any of these would be worth knowing.
          </p>

          <p>
            Motor neuroscience is a good pilot domain because it has a bounded
            literature, standardized data formats, and active disputes with
            identifiable dependency structure. But it is not unique. Gene
            Ontology gave biology a shared vocabulary. The Protein Data Bank
            gave structural biology a shared archive. Lean gave mathematics a
            shared verification layer. Neuroscience has built the data archives
            and the computation standards. What it still lacks is the glue: a
            structured, queryable layer connecting claims to evidence to data to
            code. Building that layer for one subfield is a tractable
            experiment. If it works, it becomes a template.
          </p>

          <h2 id="references">References</h2>

          <ol className="blog-references">
            <li id="ref-1">
              E. Todorov, "Direct cortical control of muscle activation in
              voluntary arm movements: a model,"{" "}
              <em>Nature Neuroscience</em>, vol. 3, pp. 391–398, 2000.
            </li>
            <li id="ref-2">
              A. P. Georgopoulos, A. B. Schwartz, R. E. Kettner, "Neuronal
              population coding of movement direction,"{" "}
              <em>Science</em>, vol. 233, pp. 1416–1419, 1986.
            </li>
            <li id="ref-3">
              A. Ramot, F. H. Taschbach, Y. C. Yang, et al., "Motor learning
              refines thalamic influence on motor cortex,"{" "}
              <em>Nature</em>, 2025.
            </li>
            <li id="ref-4">
              S. H. Scott, "Optimal feedback control and the neural basis of
              volitional motor control,"{" "}
              <em>Nature Reviews Neuroscience</em>, vol. 5, pp. 532–546, 2004.
            </li>
            <li id="ref-5">
              M. M. Churchland, J. P. Cunningham, et al., "Neural population
              dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51–56, 2012.
            </li>
            <li id="ref-6">
              B. A. Sauerbrei, J.-Z. Guo, et al., "Cortical pattern generation
              during dexterous movement is input-driven,"{" "}
              <em>Nature</em>, vol. 577, pp. 386–391, 2020.
            </li>
            <li id="ref-7">
              H. T. Kalidindi et al., "Rotational dynamics in motor cortex are
              consistent with a feedback controller,"{" "}
              <em>eLife</em>, vol. 10, e67256, 2021.
            </li>
            <li id="ref-8">
              E. Kuzmina, D. Kriukov, M. Lebedev, "Neuronal travelling waves
              explain rotational dynamics in experimental datasets and
              modelling,"{" "}
              <em>Scientific Reports</em>, vol. 14, 3566, 2024.
            </li>
            <li id="ref-9">
              A. K. Suresh, J. M. Goodman, et al., "Neural population dynamics
              in motor cortex are different for reach and grasp,"{" "}
              <em>eLife</em>, vol. 9, e58848, 2020.
            </li>
            <li id="ref-10">
              M. Serra-Garcia, U. Gneezy, "Nonreplicable publications are cited
              more than replicable ones,"{" "}
              <em>Science Advances</em>, vol. 7, eabd1705, 2021.
            </li>
            <li id="ref-11">
              S. A. Greenberg, "How citation distortions create unfounded
              authority: analysis of a citation network,"{" "}
              <em>BMJ</em>, vol. 339, b2680, 2009.
            </li>
            <li id="ref-12">
              K. S. Button et al., "Power failure: why small sample size
              undermines the reliability of neuroscience,"{" "}
              <em>Nature Reviews Neuroscience</em>, vol. 14, pp. 365–376, 2013.
            </li>
            <li id="ref-13">
              A. Narayanan, S. Kapoor,{" "}
              <em>
                AI Snake Oil: What Artificial Intelligence Can Do, What It
                Can't, and How to Tell the Difference
              </em>
              , Princeton University Press, 2024.
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
  <title>
    Neuroscience Keeps Solving the Same Problems Twice | Felix Taschbach
  </title>
)

export default LeanForSciencePost
