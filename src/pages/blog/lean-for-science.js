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
  { id: "tensions", label: "Tensions the literature does not surface" },
  { id: "incentives", label: "Why incentives are not enough" },
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
            In 2000, Emanuel Todorov published a paper
            in <em>Nature Neuroscience</em> <Citation numbers={1} /> showing
            that one of the most famous findings in motor neuroscience did not
            establish what many people thought it established.
            Georgopoulos's <Citation numbers={11} /> population vector result
            had become canonical evidence that neurons in primary motor cortex
            encode movement direction. Todorov accepted the correlations
            but argued the inference drawn from them was too strong. If motor cortex contributes to
            muscle activation, and movement emerges through the geometry and
            dynamics of the arm, then direction-related neural activity can
            arise as a fairly generic consequence of the output mapping from
            neural commands to bodily motion. Tuning to direction is not by
            itself decisive evidence for an abstract representational code. It
            may instead be an expected byproduct of controlling a biomechanical
            plant.
          </p>

          <p>
            That should have forced a substantial conceptual update. It did not.
            The field continued arguing for decades about what motor cortex
            "encodes," and when the debate later shifted into the language of
            dynamical systems, many of the old issues reappeared in altered form
            rather than being cleanly resolved. The vocabulary changed. The
            dependency structure remained largely implicit. I encounter this
            directly. My own work develops methods for aligning neural
            representations across subjects and
            species <Citation numbers={6} />, which requires reading across
            the motor, sensory, and prefrontal literatures simultaneously.
            Before I can compare results, I routinely spend weeks
            reconstructing which published claims are actually in tension,
            which hinge on preprocessing choices, and which only appear
            contradictory because their underlying dependencies differ. That
            reconstruction is slow even for specialists and nearly impossible
            for newcomers.
          </p>

          <p>
            This pattern is not unique to motor neuroscience, but motor cortex
            is a particularly clean example because the arguments are well
            documented. A field makes a strong claim. A critique appears and is
            absorbed unevenly. A new literature grows on top of the old one.
            Later, the same dispute returns under a different label. Part of
            this is normal progress. But part of it reflects that the literature
            has very weak machinery for representing what a claim depends on,
            what later results challenge it, and which disputes are substantive
            rather than terminological.
          </p>

          <p>
            The usual explanation is incentives: scientists are rewarded for
            novelty rather than synthesis; journals want new claims rather than
            maps of old contradictions. All of that matters. But it is not the
            whole story. There is also an infrastructural problem. Science has
            become very good at distributing papers and very bad at storing
            structured knowledge about the claims inside those papers. My
            hypothesis is that some major scientific bottlenecks are caused not
            mainly by bad incentives but by the absence of infrastructure that
            represents claims and their methodological dependencies as
            structured public objects.
          </p>

          <p>
            Modern scientific databases can tell us that Paper A cites Paper B
            and that both concern motor cortex. What they cannot do is represent
            the internal structure of those claims: whether Paper A's core
            inference depends on a particular smoothing kernel, whether Paper C
            later showed that this kernel can qualitatively change the result,
            or whether Paper D's apparent disagreement is really about theory,
            preprocessing, or task regime. They index documents, not claims. The
            distinction matters because much of scientific disagreement is not
            about raw observations. It is about dependency structure.
          </p>

          <h2 id="recycling">The recycling pattern</h2>

          <p>
            Motor cortex shows several recurrent failure modes. Debates restart
            under new labels: Evarts emphasized force, Georgopoulos direction,
            later work split along kinematics-versus-kinetics and then
            representation-versus-dynamics framings. Each layer partly absorbed
            the previous one, but rarely made the inheritance explicit.
          </p>

          <p>
            Theoretical critiques do not propagate cleanly.
            <Sidenote number={1}>
              There is a methodological ratchet here: the easier analysis wins
              because it generates results faster
              in the short term. This is not unique to motor cortex. Any field
              where one framework is easier to operationalize than its
              replacement will show a similar pattern.
            </Sidenote>
            {" "}Once one asks not "what variable do neurons encode?" but "what
            control law does the circuit implement under sensory feedback and
            biomechanical constraints?" <Citation numbers={13} />, many older
            disputes look narrower than they first appeared. Yet the older
            framing persists because it is methodologically easier to
            operationalize.
          </p>

          <FigureContainer
            width="page"
            caption="Three cases where motor neuroscience lost decades to siloed work, ignored critiques, and recycled debates. Hover for details."
          >
            <MotorCortexTimeline />
          </FigureContainer>

          <h2 id="tensions">Tensions the literature does not surface</h2>

          <p>
            The current motor cortex literature contains several high-profile
            findings that pull in different directions, but no standard
            database exposes their dependency structure in a way that
            would make those tensions obvious to a newcomer.
          </p>

          <p>
            Churchland and colleagues' 2012 <em>Nature</em>{" "}
            paper <Citation numbers={2} /> showed that reaching-related neural
            population activity is well described by low-dimensional dynamics,
            including rotational structure revealed by jPCA. Sauerbrei and
            colleagues <Citation numbers={3} /> then challenged an
            autonomous-generator reading: cortical activity during dexterous
            movement depends on continuous thalamic input. Kalidindi and
            colleagues <Citation numbers={4} /> further showed that rotational
            structure is consistent with feedback-control models. The
            disagreement amounts to a model-identification problem, and the
            literature does not show where these emphases are compatible and
            where they genuinely conflict. Meanwhile, Kuzmina and
            colleagues <Citation numbers={5} /> showed that preprocessing
            choices can qualitatively affect whether rotational structure is
            detected, and Suresh and
            colleagues <Citation numbers={7} /> showed that the dynamics seen
            in reaching do not carry over to grasping. These are findings that
            should update the evidential status of earlier results. Instead,
            they remain buried as ordinary papers.
          </p>

          <h2 id="incentives">Why incentives are not enough</h2>

          <p>
            Incentive explanations are real but incomplete. Even researchers who
            want synthesis lack infrastructure that makes it cheap. The citation
            graph makes things worse: it treats a supportive citation, a
            methodological critique, and a background nod as the same object.
            Serra-Garcia and Gneezy <Citation numbers={9} /> found that
            nonreplicable papers accumulate far more citations than replicable
            ones. Greenberg <Citation numbers={10} /> traced one claim through
            242 papers and found 94% of citations to primary data went to
            supportive studies. A flat citation graph is a poor memory system,
            especially when median statistical power in neuroscience is roughly
            21% <Citation numbers={8} />.
          </p>

          <h2 id="what-is-missing">What is missing</h2>

          <p>
            Every major literature platform indexes documents, not claim
            structure.
            <Sidenote number={2}>
              A complete system would eventually need additional layers beyond
              those discussed here: experimental design rationale below the
              data layer, operationalization of variables between data and
              computation, interpretation and framing between computation and
              claims, and consensus tracking above dependencies. The pilot
              proposed here starts with the claim and dependency layers, where
              the gap is most acute.
            </Sidenote>
            {" "}The missing object is a structured claim layer tied to
            an explicit dependency layer. The unit would not be the paper; it
            would be the claim, with typed edges for evidence, dependency,
            challenge, replication, and scope restriction. In mathematics,
            Lean and Mathlib have begun to represent theorems as structured
            objects with explicit dependency chains; empirical science has no
            equivalent for its claims. A dependency layer
            would record what each claim relies on: data source, preprocessing
            pipeline, model class, statistical test, species, and task design.
            Later work could challenge
            a specific dependency, replicate under altered conditions, or leave
            the core claim untouched while narrowing its domain of validity.
          </p>

          <FigureContainer
            width="page"
            caption="Layers of scientific infrastructure. The data and computation layers exist. This essay proposes building the claim and dependency layers. Additional layers (faded) represent future extensions. Hover for details."
          >
            <InfrastructureLayers />
          </FigureContainer>

          <h2 id="what-it-would-do">What it would actually do</h2>

          <p>
            Consider rotational dynamics. Churchland's paper would appear
            as an explicit claim: reaching
            activity shows rotational structure under a particular analysis
            pipeline, with dependencies on Utah-array recordings in macaques,
            condition averaging, Gaussian smoothing, dimensionality reduction,
            and jPCA. Kuzmina's paper would then attach not to the document in
            general but to one dependency: the detection of rotational structure
            depends strongly on preprocessing. That update would propagate
            selectively. Studies whose inference depends on similar smoothing
            would be flagged. Studies reaching related conclusions through
            optogenetic perturbation or feedback-control modeling would remain
            unaffected.
          </p>

          <FigureContainer
            width="page"
            caption="The claim dependency structure for rotational dynamics. Click 'Propagate sensitivity' to see how a preprocessing finding cascades through central dependencies but not contextual citations or independent methods."
          >
            <ClaimDependency />
          </FigureContainer>

          <p>
            This selective propagation is the point. The current system has two
            modes: nothing happens, or a human reader keeps the whole web of
            dependencies in their head. A claim-dependency layer would create
            an intermediate possibility where challenges move along epistemic
            edges rather than only through social memory.
          </p>

          <h2 id="experiment">The experiment</h2>

          <p>
            Three things have recently changed that make this buildable now.
            Standardized neural data archives (DANDI, Neural Latents Benchmark)
            mean claims can link back to real data. Language models have changed
            the economics of structured extraction from text. And AI-assisted
            writing is accelerating paper production without adding
            structure <Citation numbers={12} />, making the problem worse faster
            than the field is building tools to address it.
          </p>

          <p>
            I propose a motor-neuroscience pilot that builds a
            claim-dependency graph for a bounded literature and tests whether it
            improves synthesis relative to standard paper search. The output is
            a public resource for the field. The language models bootstrap
            structured entries that domain experts then verify and correct. The
            intervention is the resulting public infrastructure
            layer, which no existing institution is built to maintain:
            universities do not reward infrastructure, grant panels evaluate
            novelty, and publishers have no reason to flag contradictions in
            their own product. This requires a dedicated team, likely structured
            as something like a Focused Research Organization.
            <Sidenote number={3}>
              The GenBank model is instructive. GenBank succeeded because
              journal mandates made data deposition a publication requirement,
              government funding sustained the infrastructure indefinitely, and
              the data type (ACGT strings) was canonical. Scientific claims are
              harder: ambiguous, contested, context-dependent, expressed in
              natural language. The LLM-plus-expert hybrid is the first
              approach that might bridge this gap at reasonable cost.
            </Sidenote>
          </p>

          <p>
            Concretely: assemble a corpus of roughly 300–500 core papers in
            motor population coding and dynamics. Define a schema covering
            claims, evidence types, species, task regimes, preprocessing
            dependencies, and challenge or replication edges. Use language
            models to propose candidate entries; have domain experts adjudicate.
            Release the resulting graph publicly. Then test whether the graph's
            structure predicts real scientific outcomes. Claims with more
            preprocessing dependencies, fewer independent replications, and
            narrower task or species coverage should be more fragile. Derive a
            fragility score from the graph topology and test whether it
            correlates with which claims were actually challenged in subsequent
            years, which showed effect-size shrinkage, and which failed to
            generalize across tasks or species. As a concrete validation: build
            the graph without papers published after 2020, compute fragility
            scores, and check whether they predict the critiques that actually
            appeared in 2020–2025.
          </p>

          <p>
            The result would be informative either way. If graph-derived
            fragility scores predict where challenges actually landed, that is
            evidence that the dependency structure captures something real about
            epistemic risk, and the approach generalizes to any subfield with
            similar structure. If the most-challenged claims have no distinctive
            dependency signature, then the bottleneck is less infrastructural
            than I hypothesize, and future effort should target incentives and
            institutions instead. Empirical science has built data
            infrastructure and computational infrastructure. What it still
            lacks is claim infrastructure. Building that layer for one domain
            would be a concrete experiment in whether improving the memory of
            the scientific record can accelerate the accumulation of reliable
            knowledge.
          </p>

          <h2 id="references">References</h2>

          <ol className="blog-references">
            <li id="ref-1">
              E. Todorov, "Direct cortical control of muscle activation in
              voluntary arm movements: a model,"{" "}
              <em>Nature Neuroscience</em>, vol. 3, pp. 391–398, 2000.
            </li>
            <li id="ref-2">
              M. M. Churchland, J. P. Cunningham, et al., "Neural population
              dynamics during reaching,"{" "}
              <em>Nature</em>, vol. 487, pp. 51–56, 2012.
            </li>
            <li id="ref-3">
              B. A. Sauerbrei, J.-Z. Guo, et al., "Cortical pattern generation
              during dexterous movement is input-driven,"{" "}
              <em>Nature</em>, vol. 577, pp. 386–391, 2020.
            </li>
            <li id="ref-4">
              H. T. Kalidindi et al., "Rotational dynamics in motor cortex are
              consistent with a feedback controller,"{" "}
              <em>eLife</em>, vol. 10, e67256, 2021.
            </li>
            <li id="ref-5">
              E. Kuzmina, D. Kriukov, M. Lebedev, "Neuronal travelling waves
              explain rotational dynamics in experimental datasets and
              modelling,"{" "}
              <em>Scientific Reports</em>, vol. 14, 3566, 2024.
            </li>
            <li id="ref-6">
              A. Ramot, F. H. Taschbach, Y. C. Yang, et al., "Motor learning
              refines thalamic influence on motor cortex,"{" "}
              <em>Nature</em>, 2025.
            </li>
            <li id="ref-7">
              A. K. Suresh, J. M. Goodman, et al., "Neural population dynamics
              in motor cortex are different for reach and grasp,"{" "}
              <em>eLife</em>, vol. 9, e58848, 2020.
            </li>
            <li id="ref-8">
              K. S. Button et al., "Power failure: why small sample size
              undermines the reliability of neuroscience,"{" "}
              <em>Nature Reviews Neuroscience</em>, vol. 14, pp. 365–376, 2013.
            </li>
            <li id="ref-9">
              M. Serra-Garcia, U. Gneezy, "Nonreplicable publications are cited
              more than replicable ones,"{" "}
              <em>Science Advances</em>, vol. 7, eabd1705, 2021.
            </li>
            <li id="ref-10">
              S. A. Greenberg, "How citation distortions create unfounded
              authority: analysis of a citation network,"{" "}
              <em>BMJ</em>, vol. 339, b2680, 2009.
            </li>
            <li id="ref-11">
              A. P. Georgopoulos, A. B. Schwartz, R. E. Kettner, "Neuronal
              population coding of movement direction,"{" "}
              <em>Science</em>, vol. 233, pp. 1416–1419, 1986.
            </li>
            <li id="ref-12">
              A. Narayanan, S. Kapoor,{" "}
              <em>
                AI Snake Oil: What Artificial Intelligence Can Do, What It
                Can't, and How to Tell the Difference
              </em>
              , Princeton University Press, 2024.
            </li>
            <li id="ref-13">
              S. H. Scott, "Optimal feedback control and the neural basis of
              volitional motor control,"{" "}
              <em>Nature Reviews Neuroscience</em>, vol. 5, pp. 532–546, 2004.
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
    Neuroscience Keeps Solving the Same Problems Twice — Felix Taschbach
  </title>
)

export default LeanForSciencePost
