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
            Here is a story about how a scientific field can lose two decades to
            a question it had the tools to settle much sooner.
          </p>

          <p>
            In 1986, Apostolos Georgopoulos and colleagues published one of the
            most cited results in motor
            neuroscience <Citation numbers={1} />. They recorded from neurons in
            monkey motor cortex during reaching and found that each neuron fired
            most for one preferred direction. Weight each neuron's preferred
            direction by its firing rate, sum the result, and you get a
            "population vector" that predicts the direction of the upcoming
            reach. It was elegant. It felt explanatory. Motor cortex represents
            direction.
          </p>

          <p>
            Fourteen years later, Emanuel Todorov showed this inference was
            almost certainly wrong <Citation numbers={2} />. Not the data. The
            interpretation. Motor cortex sends signals to muscles. Muscles move
            a limb with particular lengths, masses, and joint configurations.
            Todorov built a model of this biomechanical chain and showed that
            commands to muscles will naturally produce neural activity correlated
            with movement direction, simply because of arm geometry. Sanger had
            shown earlier, on purely mathematical grounds, that a population
            vector can always be found under very general
            assumptions <Citation numbers={3} />. Direction tuning was not a
            neural code for direction. It was a byproduct of controlling a
            physical limb.
          </p>

          <p>
            You might expect this to have forced a course correction. It didn't.
            The debate about what motor cortex neurons "encode" continued for
            another twenty years. When the field eventually shifted toward
            dynamical systems models in the 2010s, many of the same confusions
            reappeared in new vocabulary. Todorov's deeper question, what you
            can actually infer from neural correlations once you account for
            biomechanics, was never cleanly resolved.
          </p>

          <p>
            I run into this pattern constantly. My own work develops methods for
            aligning neural representations across subjects and
            species <Citation numbers={4} />, which means I regularly
            collaborate with experimentalists in motor cortex, songbird vocal
            production, and prefrontal decision-making. Before I can compare
            results, I spend weeks doing something that feels absurd for a
            mature science. I reconstruct, from scratch, which published claims
            are genuinely in tension, which ones merely appear contradictory
            because they depend on different preprocessing choices, and which
            reflect real disagreements about the underlying biology. This is
            slow even for specialists. For newcomers it is nearly impossible.
          </p>

          <p>
            The standard explanation is incentives. Scientists are rewarded for
            novelty, not synthesis. That matters, but it's incomplete. Consider
            a different explanation. Science has become very good at
            distributing papers and very bad at storing structured knowledge
            about what's inside those papers. The bottleneck is not just
            motivation. It's infrastructure.
          </p>

          <p>
            Today's scientific databases can tell you that Paper A cites Paper B
            and that both concern motor cortex. What they cannot tell you is
            whether Paper A's central inference depends on a particular
            smoothing kernel, whether Paper C later showed that kernel changes
            the result qualitatively, or whether Paper D's apparent disagreement
            with Paper A is about theory, preprocessing, or task design. When
            the only durable unit of scientific knowledge is the paper, every
            kind of relationship gets flattened into the same object. Support,
            challenge, scope restriction, and methodological dependence all
            become a citation. That is an extraordinarily poor basis for
            collective memory.
          </p>

          <h2 id="recycling">The recycling pattern</h2>

          <p>
            Motor cortex is a useful case study because its debates are well
            documented and they keep restarting. Force in the 1960s. Direction
            in the 1980s. Kinematics versus kinetics. Then representation versus
            dynamics. Each generation partly absorbed the previous one, but
            rarely made the inheritance explicit.
          </p>

          <p>
            Why? Theoretical critiques fail to propagate.
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
            body?" <Citation numbers={5} />, many of the older disputes
            collapse. But the older framing persisted because it was
            operationally easier. Computing a population vector is
            straightforward. Building a feedback control model is hard. The
            easier analysis generates results faster, even if it answers a less
            well-posed question.
          </p>

          <FigureContainer
            width="wide"
            caption="Three cases where motor neuroscience lost decades to siloed work, ignored critiques, and recycled debates. Hover for details."
          >
            <MotorCortexTimeline />
          </FigureContainer>

          <p>
            You can watch a version of this happening right now, in real time.
            In 2012, Churchland et al. <Citation numbers={6} /> showed that
            reaching-related neural activity is well described by rotational
            dynamics, a result that reshaped the field. Since then, a series of
            papers have each changed what that result means, but without anyone
            connecting them into a coherent picture. Sauerbrei
            et al. <Citation numbers={7} /> showed cortical activity depends on
            continuous thalamic input, challenging the idea that the dynamics are
            autonomous. Kalidindi et al. <Citation numbers={8} /> showed
            rotational structure is what you'd expect from a feedback
            controller, not necessarily evidence for a central pattern
            generator. Elsayed and Cunningham <Citation numbers={9} /> showed
            that temporal autocorrelations preserved by standard smoothing can
            produce spurious rotational structure, making the detection of
            rotations sensitive to preprocessing choices. And Suresh
            et al. <Citation numbers={10} /> showed the dynamics seen during
            reaching do not appear during grasping. Each finding should change
            how you interpret the 2012 result. But there is no standard resource
            connecting them, so the field carries on as if each paper exists in
            isolation.
          </p>

          <h2 id="existing-tools">Why existing tools are not enough</h2>

          <p>
            You might think review articles fill this gap. They help, but a
            review captures one author's interpretation at one moment in time.
            Nobody updates it when new results arrive. And reviews narrate
            rather than decompose. A review might say "the autonomous dynamics
            view has been challenged," but it won't tell you that the challenge
            comes from two logically independent sources, neither of which has
            anything to do with the separate problem of preprocessing
            sensitivity.
          </p>

          <p>
            Tools like Semantic Scholar and Scite.ai are better. They classify
            citations. They can tell you Paper A cites Paper B in a contrasting
            way. But they still operate at the level of documents. They cannot
            tell you that Paper A's claim depends on a 20 ms Gaussian smoothing
            kernel, that Paper C showed this choice qualitatively changes the
            result, and that Paper D's disagreement is about theoretical
            interpretation rather than data.
          </p>

          <p>
            The citation graph itself makes things worse. It treats a supportive
            citation, a methodological critique, and a background nod as the
            same type of edge. Serra-Garcia and
            Gneezy <Citation numbers={11} /> found that nonreplicable papers
            accumulate far more citations than replicable ones.
            Greenberg <Citation numbers={12} /> traced a single biomedical claim
            through 242 papers and found that 94% of citations to primary data
            went to supportive studies. The citation graph is not neutral
            infrastructure. It actively amplifies unreliable claims. This is
            especially dangerous when median statistical power in neuroscience
            is around 21% <Citation numbers={13} />.
          </p>

          <h2 id="what-is-missing">What is missing</h2>

          <p>
            Every major literature platform indexes documents. None index claim
            structure.
            <Sidenote number={2}>
              A complete system would eventually need additional layers:
              experimental design rationale, operationalization of variables,
              interpretation and framing, and consensus tracking. The pilot
              proposed here starts with claims and dependencies, where the gap
              is most acute.
            </Sidenote>
            {" "}The missing piece is a structured claim layer tied to an
            explicit dependency layer. The unit would not be the paper. It would
            be the claim, with typed edges for support, dependency, challenge,
            replication, and scope restriction. A dependency layer would record
            what each claim actually rests on. Data source, preprocessing
            pipeline, model class, statistical test, species, task design. Later
            work could then challenge a specific dependency, replicate under
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
            Notice what this makes visible. A study that narrows the scope of a
            famous claim would create a concrete restriction in the record,
            rather than vanishing into prose that nobody reads. A null result
            would become a real object, an update about where a claim fails to
            hold. Convergence across methods, species, or task designs would be
            easier to detect because the evidence would no longer be trapped
            inside separate narratives that no single person has time to read.
          </p>

          <h2 id="what-it-would-do">What it would actually do</h2>

          <p>
            To make this concrete, consider the rotational dynamics case.
            Churchland et al. 2012 would not appear as a single entry. It would
            be decomposed into constituent claims, each carrying its
            dependencies. One claim is that reaching activity shows rotational
            structure under a particular analysis pipeline. The dependencies
            include Utah-array recordings in macaques, condition averaging,
            Gaussian smoothing, dimensionality reduction via PCA, and jPCA.
            Elsayed and Cunningham's paper would then attach not to the
            Churchland document in general but to one specific dependency node.
            The detection of rotational structure depends strongly on
            preprocessing. That update would propagate selectively. Studies
            whose inferences depend on similar smoothing would be flagged.
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
            field has two modes. Either nothing happens when a critique is
            published, or some individual reader happens to hold the entire web
            of dependencies in their head. A claim-dependency graph creates a
            third option, one where challenges move along actual epistemic
            connections rather than relying on social memory.
          </p>

          <p>
            The implications go beyond catching errors. If five labs have tested
            a claim using different preprocessing, species, and task designs,
            that convergence is far stronger evidence than any single paper, but
            no existing system makes it visible. Follow-up work that tightens
            the scope of a claim has almost no career value today, because it is
            not "new." In a claim graph, it strengthens an edge, and that
            contribution becomes legible. Null results gain a function. A study
            that tests a claim under new conditions and finds it doesn't hold is
            not a failure but a scope restriction, represented as a real object
            in the graph. And claims that cannot both be true, because they
            assume incompatible preprocessing or theoretical commitments, would
            be flagged by the structure of the graph itself.
          </p>

          <p>
            This is what I mean by a "<em>lean for science</em>." Not a
            proof assistant. Empirical science is far too messy for formal
            verification. But a system where claims must be situated relative to
            other claims, and where contradictions become visible by default
            rather than buried by convention.
          </p>

          <p>
            Building this requires solving a genuinely hard design problem. What
            counts as a "claim"? Churchland et al. 2012 contains at least three
            separable claims, and reasonable people will decompose it
            differently. Too coarse and you lose the dependency structure. Too
            fine and experts can't verify entries in reasonable time. The right
            granularity has to be found empirically.
          </p>

          <p>
            The architecture I'd propose has three layers. Language models
            extract candidate claims, dependencies, and edges from paper text. A
            graph-level algorithm propagates sensitivity flags along dependency
            chains, detects inconsistencies between claims with incompatible
            assumptions, and surfaces clusters of claims that converge through
            independent paths. Domain experts adjudicate the outputs of both
            layers. The schema would cover a fixed set of dependency types (data
            source, species, task, preprocessing, statistical test, model class,
            theoretical commitment) and edge types (supports, depends-on,
            challenges, restricts-scope, replicates). Whether this is expressive
            enough is one of the things the pilot would test.
          </p>

          <h2 id="experiment">The experiment</h2>

          <p>
            Three things have recently changed that make this buildable now.
          </p>

          <p>
            First, standardized neural data archives mean claims can link back
            to queryable data rather than figure panels. DANDI now hosts over
            1,000 datasets. The Neural Latents Benchmark provides preprocessed
            population recordings from the exact motor cortex experiments at
            issue.
          </p>

          <p>
            Second, language models have dropped the cost of structured
            extraction from scientific text by roughly an order of magnitude.
            What previously required expert annotators reading each paper can
            now be bootstrapped by LLM extraction with expert correction. That
            makes a 300{"\u2013"}500 paper corpus tractable for a small team.
          </p>

          <p>
            Third, AI-assisted writing is accelerating paper production without
            adding any structure <Citation numbers={14} />. The problem is
            getting worse faster than the field is building tools to address it.
          </p>

          <p>
            I propose building a claim-dependency graph for a single,
            well-documented subfield. Motor neuroscience is the case I've
            developed here, but the approach is not specific to it. Assemble a
            corpus of 300 to 500 core papers. Define the schema. Use language
            models to propose candidate entries. Have domain experts adjudicate.
            Release the graph publicly.
          </p>

          <p>
            The most informative test is a backtest. Build the graph using only
            papers published before some cutoff, say 2018. Then ask whether the
            dependency structure flags problems the field took years to notice
            on its own. Does it surface the tension between autonomous and
            input-driven dynamics before Sauerbrei 2020? The possibility that
            reaching results might not generalize to grasping before Suresh
            2020? The fact that Elsayed and Cunningham's preprocessing concerns
            should have prompted more caution about downstream claims? If yes,
            the infrastructure would have saved years of confused debate. If no,
            either the schema is too coarse or the dependencies that matter were
            not visible in the earlier literature, and the bottleneck is
            elsewhere.
          </p>

          <p>
            No existing institution is built to maintain this. Universities
            don't reward infrastructure work. Grant panels evaluate novelty.
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
            rigid. The graph may capture real structure but fail the backtest,
            surfacing only tensions already obvious from the pre-2018
            literature. Or the backtest may succeed for known cases but fail to
            generalize, because we built it knowing what to look for. Any of
            these outcomes would be worth knowing.
          </p>

          <p>
            Motor neuroscience is a good pilot domain because it has a bounded
            literature, standardized data formats, and active disputes with
            identifiable dependency structure. But it is not unique. Gene
            Ontology gave biology a shared vocabulary. The Protein Data Bank
            gave structural biology a shared archive. Lean gave mathematics a
            shared verification layer. Neuroscience has already built the data
            archives and the computation standards. What it still lacks is the
            glue, a structured and queryable layer connecting claims to evidence
            to data to code. Building that layer for one subfield is a tractable
            experiment. If it works, it becomes a template.
          </p>

          <h2 id="references">References</h2>

          <ol className="blog-references">
            <li id="ref-1">
              A. P. Georgopoulos, A. B. Schwartz, R. E. Kettner, "Neuronal
              population coding of movement direction,"{" "}
              <em>Science</em>, vol. 233, pp. 1416{"\u2013"}1419, 1986.
            </li>
            <li id="ref-2">
              E. Todorov, "Direct cortical control of muscle activation in
              voluntary arm movements,"{" "}
              <em>Nature Neuroscience</em>, vol. 3, pp. 391{"\u2013"}398, 2000.
            </li>
            <li id="ref-3">
              T. D. Sanger, "Theoretical considerations for the analysis
              of population coding in motor cortex,"{" "}
              <em>Neural Computation</em>, vol. 6, pp. 29{"\u2013"}37, 1994.
            </li>
            <li id="ref-4">
              A. Ramot, F. H. Taschbach, Y. C. Yang, et al., "Motor learning
              refines thalamic influence on motor cortex,"{" "}
              <em>Nature</em>, 2025.
            </li>
            <li id="ref-5">
              S. H. Scott, "Optimal feedback control and the neural basis of
              volitional motor control,"{" "}
              <em>Nature Reviews Neuroscience</em>, vol. 5, pp. 532{"\u2013"}546, 2004.
            </li>
            <li id="ref-6">
              M. M. Churchland, J. P. Cunningham, et al., "Neural population
              dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51{"\u2013"}56, 2012.
            </li>
            <li id="ref-7">
              B. A. Sauerbrei, J.-Z. Guo, et al., "Cortical pattern generation
              during dexterous movement is input-driven,"{" "}
              <em>Nature</em>, vol. 577, pp. 386{"\u2013"}391, 2020.
            </li>
            <li id="ref-8">
              H. T. Kalidindi et al., "Rotational dynamics in motor cortex are
              consistent with a feedback controller,"{" "}
              <em>eLife</em>, vol. 10, e67256, 2021.
            </li>
            <li id="ref-9">
              G. F. Elsayed, J. P. Cunningham, "Structure in neural
              population recordings: an expected byproduct of simpler
              phenomena?"{" "}
              <em>Nature Neuroscience</em>, vol. 20, pp. 1310{"\u2013"}1318, 2017.
            </li>
            <li id="ref-10">
              A. K. Suresh, J. M. Goodman, et al., "Neural population dynamics
              in motor cortex are different for reach and grasp,"{" "}
              <em>eLife</em>, vol. 9, e58848, 2020.
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
              K. S. Button et al., "Power failure: why small sample size
              undermines the reliability of neuroscience,"{" "}
              <em>Nature Reviews Neuroscience</em>, vol. 14, pp. 365{"\u2013"}376, 2013.
            </li>
            <li id="ref-14">
              W. Liang, Z. Izzo, Y. Zhang, et al., "Monitoring
              AI-modified content at scale: a case study on the impact of
              ChatGPT on AI conference peer reviews,"{" "}
              <em>Proceedings of the 41st International Conference on
              Machine Learning</em>, PMLR 235, pp. 29575{"\u2013"}29620, 2024.
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
