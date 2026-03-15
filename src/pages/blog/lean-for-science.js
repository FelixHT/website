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
  { id: "what-it-would-do", label: "What it would actually do" },
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
                {" | "}
                <a href="/Lean_for_neuroscience.pdf" target="_blank" rel="noopener noreferrer">
                  Competition 3-page version
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
            and felt like it answered a basic question. What does motor cortex
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
            That should have forced a narrower reading of what the population
            vector result actually showed. It did not. The debate about what
            neurons "encode" continued for another two decades. When the field
            shifted toward dynamical systems in the 2010s, many of the same
            issues reappeared in new vocabulary, but Todorov's deeper question,
            about what you can infer from neural correlations given
            biomechanics, was never cleanly resolved.
          </p>

          <p>
            I encounter this directly. My own work develops methods for aligning
            neural representations across subjects and
            species <Citation numbers={3} />, which means I regularly
            collaborate with experimentalists in fields outside my own. Motor
            cortex, songbird vocal production, prefrontal decision-making.
            Before I can compare results, I routinely spend weeks
            reconstructing which published claims are actually in tension, which
            hinge on preprocessing choices, and which only appear contradictory
            because their underlying dependencies differ. That reconstruction
            is slow even for specialists and nearly impossible for newcomers.
          </p>

          <p>
            The usual explanation is incentives. Scientists are rewarded for
            novelty rather than synthesis. That matters. But it is incomplete.
            Science has become very good at distributing papers and very bad at
            storing structured knowledge about the claims inside those papers.
            My hypothesis is that some major scientific bottlenecks are caused
            not mainly by bad incentives but by the absence of infrastructure
            that represents claims and their methodological dependencies as
            structured public objects.
          </p>

          <p>
            Modern scientific databases can tell us that Paper A cites Paper B
            and that both concern motor cortex. What they cannot do is represent
            the internal structure of those claims. They cannot tell you whether
            Paper A's core inference depends on a particular smoothing kernel,
            whether Paper C later showed that this kernel can qualitatively
            change the result, or whether Paper D's apparent disagreement is
            really about theory, preprocessing, or task regime. If the only
            durable unit is the paper, then support, challenge, scope
            restriction, and dependence all get flattened into the same basic
            object. That is a poor basis for collective memory.
          </p>

          <h2 id="recycling">The recycling pattern</h2>

          <p>
            Motor cortex is a clean example because the arguments are well
            documented. Debates restart under new labels. Force in the 1960s,
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
            rather than decomposing it. A review might say "the autonomous
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
            The citation graph makes things worse. It treats a supportive
            citation, a methodological critique, and a background nod as the
            same object. Serra-Garcia and Gneezy <Citation numbers={11} />{" "}
            found that nonreplicable papers accumulate far more citations than
            replicable ones. Greenberg <Citation numbers={12} /> traced one
            claim through 242 papers and found 94% of citations to primary data
            went to supportive studies. A flat citation graph is a poor memory
            system, especially when median statistical power in neuroscience is
            roughly 21% <Citation numbers={10} />.
          </p>

          <h2 id="what-is-missing">What is missing</h2>

          <p>
            Every major literature platform indexes documents, not claim
            structure.
            <Sidenote number={2}>
              A complete system would eventually need additional layers:
              experimental design rationale, operationalization of variables,
              interpretation and framing, and consensus tracking. The pilot
              proposed here starts with claims and dependencies, where the gap
              is most acute.
            </Sidenote>
            {" "}The missing object is a structured claim layer tied to an
            explicit dependency layer. The unit would not be the paper; it would
            be the claim, with typed edges for evidence, dependency, challenge,
            replication, and scope restriction. A dependency layer would record
            what each claim relies on, including data source, preprocessing
            pipeline, model class, statistical test, species, and task design.
            Later work could challenge a specific dependency, replicate under
            altered conditions, or leave the core claim untouched while
            narrowing its domain of validity.
          </p>

          <FigureContainer
            width="page"
            caption="Layers of scientific infrastructure. The data and computation layers exist. This essay proposes building the claim and dependency layers. Additional layers (faded) represent future extensions. Hover for details."
          >
            <InfrastructureLayers />
          </FigureContainer>

          <p>
            This would also make undervalued scientific work legible. A study
            that narrows the scope of a famous claim would create a visible
            restriction in the record rather than disappearing into prose. A
            null result would become a concrete update about where a claim fails
            to hold. Convergence across methods, species, or task designs would
            be easier to see because the evidence would no longer be trapped
            inside separate narratives.
          </p>

          <h2 id="what-it-would-do">What it would actually do</h2>

          <p>
            Consider rotational dynamics. Churchland et al. 2012 would not
            appear as a single entry but be decomposed into constituent claims,
            each carrying its dependencies. Reaching activity shows rotational
            structure under a particular analysis pipeline, with dependencies on
            Utah-array recordings in macaques, condition averaging, Gaussian
            smoothing, dimensionality reduction, and jPCA. Kuzmina's paper
            would then attach not to the document in general but to one specific
            dependency. The detection of rotational structure depends strongly
            on preprocessing. That update would propagate selectively. Studies
            whose inference depends on similar smoothing would be flagged.
            Studies reaching related conclusions through optogenetic
            perturbation or feedback-control modeling would remain unaffected.
          </p>

          <FigureContainer
            width="wide"
            caption="The claim dependency structure for rotational dynamics. Click 'Propagate sensitivity' to see how a preprocessing finding cascades through central dependencies but not contextual citations or independent methods."
          >
            <ClaimDependency />
          </FigureContainer>

          <p>
            This selective propagation is the core of the idea. Right now the
            field has two modes. Nothing happens when a critique is published,
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
            contribution is visible. Null results gain a role. A study that
            tests a claim under new conditions and finds it does not hold is
            not a failure but a scope restriction, and the graph would
            represent that as a real object. And claims that cannot both be
            true, because they assume incompatible preprocessing or theoretical
            commitments, would be flagged by the structure of the graph itself.
          </p>

          <p>
            This is what I mean by a "<em>lean for science</em>." Not a
            proof assistant. Empirical science is too messy for that. But a
            system where claims must be situated relative to other claims, and
            where contradictions become visible by default rather than buried by
            convention.
          </p>

          <p>
            Realizing any of this requires solving a genuinely hard design
            problem. What counts as a "claim"? Churchland et al. 2012 contains
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
            Three things have recently changed that make this buildable now.
            First, standardized neural data archives mean claims can link back
            to queryable data rather than figure panels. DANDI now hosts over
            1,000 datasets, and the Neural Latents Benchmark provides
            preprocessed population recordings from the exact motor cortex
            experiments at issue. Second, language models have dropped the cost
            of structured extraction from scientific text by roughly an order of
            magnitude. What previously required expert annotators reading each
            paper can now be bootstrapped by LLM extraction with expert
            correction, making a 300{"\u2013"}500 paper corpus tractable for a small
            team. Third, AI-assisted writing is accelerating paper production
            without adding structure <Citation numbers={13} />, making the
            problem worse faster than the field is building tools to address it.
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
            papers published before some cutoff, say 2018. Then ask whether the
            dependency structure flags the problems the field took years to
            notice. Does it surface the preprocessing sensitivity that Kuzmina
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
            <Sidenote number={3}>
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
              <em>Nature Neuroscience</em>, vol. 3, pp. 391{"\u2013"}398, 2000.
            </li>
            <li id="ref-2">
              A. P. Georgopoulos, A. B. Schwartz, R. E. Kettner, "Neuronal
              population coding of movement direction,"{" "}
              <em>Science</em>, vol. 233, pp. 1416{"\u2013"}1419, 1986.
            </li>
            <li id="ref-3">
              A. Ramot, F. H. Taschbach, Y. C. Yang, et al., "Motor learning
              refines thalamic influence on motor cortex,"{" "}
              <em>Nature</em>, 2025.
            </li>
            <li id="ref-4">
              S. H. Scott, "Optimal feedback control and the neural basis of
              volitional motor control,"{" "}
              <em>Nature Reviews Neuroscience</em>, vol. 5, pp. 532{"\u2013"}546, 2004.
            </li>
            <li id="ref-5">
              M. M. Churchland, J. P. Cunningham, et al., "Neural population
              dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51{"\u2013"}56, 2012.
            </li>
            <li id="ref-6">
              B. A. Sauerbrei, J.-Z. Guo, et al., "Cortical pattern generation
              during dexterous movement is input-driven,"{" "}
              <em>Nature</em>, vol. 577, pp. 386{"\u2013"}391, 2020.
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
              K. S. Button et al., "Power failure: why small sample size
              undermines the reliability of neuroscience,"{" "}
              <em>Nature Reviews Neuroscience</em>, vol. 14, pp. 365{"\u2013"}376, 2013.
            </li>
            <li id="ref-11">
              M. Serra-Garcia, U. Gneezy, "Nonreplicable publications are cited
              more than replicable ones,"{" "}
              <em>Science Advances</em>, vol. 7, eabd1705, 2021.
            </li>
            <li id="ref-12">
              S. A. Greenberg, "How citation distortions create unfounded
              authority: analysis of a citation network,"{" "}
              <em>BMJ</em>, vol. 339, b2680, 2009.
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
