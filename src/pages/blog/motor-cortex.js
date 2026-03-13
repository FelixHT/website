import React, { useRef, useState, useEffect } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
import Sidenote from "../../components/Sidenote"
import Citation from "../../components/Citation"
import FigureContainer from "../../components/blog/FigureContainer"
import ClaimDependency from "../../components/blog/ClaimDependency"
import MotorCortexTimeline from "../../components/blog/MotorCortexTimeline"
import TableOfContents from "../../components/blog/TableOfContents"
import "../../components/blog/prism-theme.css"
import "./blog-post.css"

const TOC_ITEMS = [
  { id: "introduction", label: "Introduction" },
  { id: "oral-tradition", label: "Oral tradition" },
  { id: "contradictions", label: "Contradictions nobody tracks" },
  { id: "structural-problem", label: "The structural problem" },
  { id: "lean-for-science", label: "Lean for science" },
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
            A structured claim-dependency layer for science, and an experiment to test whether it accelerates convergence.
          </p>
          <div className="blog-post__byline">
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Published</span>
              <span className="blog-post__byline-value">April 2026</span>
            </div>
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Reading time</span>
              <span className="blog-post__byline-value">{readingTime ? `${readingTime} min` : ""}</span>
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
            In 2000, Emanuel Todorov showed through mathematical
            modeling <Citation numbers={1} /> that if motor cortex controls
            muscles, then correlations between neural activity and movement
            direction are guaranteed by limb biomechanics. The population
            vector, the framework that had dominated motor neuroscience since
            1986 and formed the basis for an entire generation of
            brain-computer interfaces, did not actually demonstrate what it
            claimed to demonstrate. The paper was published
            in <em>Nature Neuroscience</em>. It was largely ignored. The field
            continued debating what motor cortex encodes for another two
            decades.
          </p>

          <p>
            The pattern repeats.
            <Sidenote number={1}>
              I develop methods for aligning neural representations across
              subjects and species <Citation numbers={8} />. This work
              requires moving between subfields, collaborating with
              experimentalists who record from mice, monkeys, and songbirds.
              The pattern described here shows up in every community I've
              worked with.
            </Sidenote>
            {" "}The kinematics-versus-kinetics controversy of
            the 1990s and the representational-versus-dynamical debate of the
            2010s echo each other closely. Multi-variable responses in motor
            cortex neurons were documented in the
            1990s <Citation numbers={6} /> but treated as a complication to be
            controlled for. Meanwhile, a separate lineage of researchers working
            in prefrontal cortex formalized why such responses, which they
            called "mixed selectivity," are computationally
            essential <Citation numbers={7, 8} />. Two communities studied
            overlapping phenomena for years without the connection being made
            explicit, in part because the field is organized by brain region
            rather than by computation. Scott <Citation numbers={9} /> catalogued
            what he called the "inconvenient truths" about motor cortex,
            findings that contradicted the dominant framework, and the field
            absorbed them slowly if at all. These redundancies are consequences
            of a knowledge structure that makes it difficult to see when
            different subfields are asking the same question.
          </p>

          <FigureContainer width="page" caption="Six decades of motor cortex debate. Circle size reflects citation count. Papers above the axis support the dominant framework; papers below challenge it. Toggle 'Show recycled arguments' to see how later debates echo earlier ones.">
            <MotorCortexTimeline />
          </FigureContainer>

          <h2 id="oral-tradition">Oral tradition</h2>

          <p>
            The knowledge that would prevent this rediscovery is trapped in
            oral tradition. A senior postdoc tells you over coffee that a
            finding doesn't replicate if you change the smoothing kernel. A
            reviewer mentions that two high-profile papers use incompatible
            definitions of the same quantity. A conference hallway conversation
            reveals that a widely cited result depends on trial averaging in a
            way that obscures single-trial variability. None of this is written
            down anywhere structured. It lives in the heads of people who have
            been in the field for twenty years. When they move on, the
            knowledge goes with them, and the next generation solves the same
            problems from scratch.
          </p>

          <p>
            The same dynamic plays out across brain areas. In hippocampal
            research, the debate over whether place cells encode position or
            predict goals has recycled the same arguments under new terminology.
            In sensory neuroscience, neural variability was treated as noise
            in the 1990s, then reopened as signal. Cross-species translation
            failures are treated as one-offs rather than patterns. Published
            papers report positive results roughly 85% of the
            time <Citation numbers={10} />. The failed approach leaves no trace.
          </p>

          <h2 id="contradictions">Contradictions nobody tracks</h2>

          <p>
            The motor cortex debate contains specific, active contradictions
            that no system flags. Churchland and
            colleagues <Citation numbers={2} /> showed motor cortex operates
            as an autonomous dynamical system. Sauerbrei and
            colleagues <Citation numbers={3} /> used optogenetics to show it
            requires continuous thalamic input throughout movement. Kalidindi
            and colleagues <Citation numbers={4} /> showed the signature
            rotational dynamics emerge from sensory feedback alone, even without
            recurrence. These findings point in opposite directions. You learn
            about the contradiction by talking to the right people, not from any
            database or structured resource.
            <Sidenote number={2}>
              Kuzmina and colleagues <Citation numbers={5} /> demonstrated
              that changing preprocessing parameters, specifically the Gaussian
              smoothing kernel width, can qualitatively alter whether rotational
              dynamics are detected. A graduate student entering motor
              neuroscience has no way to learn this from the published record.
            </Sidenote>
          </p>

          <p>
            Suresh, Goodman and colleagues <Citation numbers={11} /> found
            that motor cortex exhibits robust rotational dynamics during reaching
            but weak or absent dynamics during grasping, meaning the dominant
            computational framework may describe one behavior but not another.
            This is a major open question that is not flagged as such anywhere
            outside specialist reviews.
          </p>

          <p>
            The cost extends beyond academia. Most clinical BCIs still use
            decoders built on the representational framework. Dynamics-based
            approaches have shown substantial performance improvements when
            electrodes degrade and stable decoding for months without
            recalibration. How quickly these advances reach patients depends
            on how quickly the field converges, and it is converging through
            decades of redundant argumentation.
          </p>

          <h2 id="structural-problem">The structural problem</h2>

          <p>
            Every major scientific database (Semantic Scholar, OpenAlex, PubMed)
            indexes documents. None of them index claims. They know that Paper A
            cites Paper B. They do not know that Claim X in Paper A contradicts
            Claim Y in Paper B, that the contradiction depends on a
            preprocessing choice, and that a third paper showed this sensitivity
            five years ago. A structured representation of what a field actually
            knows is missing entirely.
          </p>

          <FigureContainer width="outset" caption="What a claim-dependency layer would look like. The claim that motor cortex exhibits rotational dynamics rests on specific evidence, methods, and preprocessing choices. Click 'Propagate sensitivity' to see what happens when a preprocessing parameter is shown to qualitatively change the result.">
            <ClaimDependency />
          </FigureContainer>

          <p>
            The consequences compound. Button et
            al. <Citation numbers={12} /> found the median statistical power
            in neuroscience is just 21%. Szucs and
            Ioannidis <Citation numbers={13} /> estimated the false-report
            probability for the cognitive neuroscience and psychology literature
            likely exceeds 50%. When contradicting evidence does appear, it
            barely registers: Serra-Garcia and
            Gneezy <Citation numbers={14} /> showed that non-replicable papers
            accumulate on average 153 more citations than replicable ones, and
            only 12% of post-replication citations acknowledge the failure.
            Greenberg <Citation numbers={15} /> traced a single biomedical
            claim through a citation network of 242 papers and found that 94%
            of citations to primary data went to supportive studies while
            contradictory evidence was systematically ignored.
            <Sidenote number={3}>
              The motor cortex literature illustrates this asymmetry concretely.
              Georgopoulos et al. <Citation numbers={16} /> has roughly 4,000
              citations. Churchland et al. <Citation numbers={2} /> has roughly
              1,500. The papers that challenge them have between 20 and 300
              each. The ratio between a foundational claim and its most serious
              challenge can exceed 20 to 1.
            </Sidenote>
          </p>

          <p>
            People have tried to build this layer. The Cyc project spent over
            $200 million across decades of manual knowledge encoding. The
            Semantic Web assumed researchers would annotate their own work.
            SWAN modeled scientific discourse for Alzheimer's research and is
            now dormant. The Open Research Knowledge Graph captures structured
            claims but covers thousands of papers, not millions. Every system
            that captures what science actually claims cannot scale, and every
            system that scales cannot capture what science claims. Systematic
            reviews take over a year and 23% show a signal for updating within
            two years <Citation numbers={17} />. When journals required data
            availability statements, 93% of authors who wrote "data available
            upon request" never responded or declined to
            share <Citation numbers={18} />. The bottleneck is organizational:
            no institution has a mandate to maintain what a field knows, and no
            career rewards building it.
          </p>

          <h2 id="lean-for-science">Lean for science</h2>

          <p>
            In mathematics, Lean and its Mathlib library have formalized over
            200,000 theorems with explicit dependency chains back to axioms.
            If a lemma breaks, everything downstream is immediately flagged.
            The community catches errors structurally rather than through
            individual heroics. Science cannot achieve the same mechanical
            verification, because evidence is probabilistic rather than
            deductive. But it can formalize much more of the dependency
            structure than anyone currently assumes, because the lower layers
            of infrastructure already exist.
          </p>

          <p>
            Neuroscience has been building the pieces of a Lean-like system
            for years, without connecting them. The data layer is partly in
            place: DANDI and OpenNeuro host standardized open datasets, the
            Allen Brain Observatory provides curated population recordings,
            and the International Brain Laboratory has built standardized
            pipelines across dozens of labs. The computation layer is emerging:
            Neurodata Without Borders (NWB) and BIDS standardize data formats,
            containerized pipelines make preprocessing reproducible, and tools
            like DataJoint and SpikeInterface version-control analysis
            workflows. What is entirely missing is the claim layer: the
            structured link between "this claim in this paper" and "this
            specific computation on this specific dataset, with these specific
            parameters." And beyond that, the dependency layer: which claims
            depend on which computations, which computations depend on which
            data, and what breaks downstream when any link in the chain is
            challenged.
            <Sidenote number={4}>
              The four layers: <strong>data</strong> (DANDI, OpenNeuro, Allen
              Brain Observatory), <strong>computation</strong> (NWB, BIDS,
              DataJoint, SpikeInterface), <strong>claim</strong> (missing),
              and <strong>dependency</strong> (missing). The first two exist.
              This essay proposes building the second two.
            </Sidenote>
          </p>

          <p>
            The claim and dependency layers are the glue. If Churchland et
            al. <Citation numbers={2} /> claim rotational dynamics in motor
            cortex, the system records: data from these arrays, smoothed with a
            20ms Gaussian kernel, projected via jPCA, producing Figure 2.
            Kuzmina et al. <Citation numbers={5} /> then shows the result
            changes qualitatively with different kernel widths. The system
            propagates this fragility to every downstream paper that cited
            rotational dynamics as established, including the hundreds that did
            so without acknowledging the sensitivity. A new PhD student searches
            "rotational dynamics" and sees: claimed (Churchland 2012, ~1,500
            citations), challenged (Sauerbrei 2020, Kalidindi 2021, ~100
            citations each), sensitivity flag (Kuzmina 2024, ~20 citations).
            The citation asymmetry, currently invisible, becomes the first
            thing you see.
          </p>

          <h2 id="experiment">The experiment</h2>

          <p>
            <strong>Hypothesis.</strong> Connecting existing data and
            computation infrastructure through a structured claim-dependency
            layer will measurably accelerate knowledge convergence within a
            scientific subfield.
          </p>

          <p>
            <strong>The pilot.</strong> Build this for motor cortex population
            coding. The domain has thousands of papers, six decades of
            literature, well-documented contradictions, publicly available
            datasets (Neural Latents Benchmark, DANDI archives), and a
            downstream engineering application (BCIs) that provides concrete
            outcome measures. The claim layer would capture four things:
            claims linked to specific computations on specific data, so that
            dependencies are machine-readable; epistemic status labels
            (established, contested, superseded) that update as new evidence
            arrives; analysis-method dependency flags propagating fragility
            when preprocessing sensitivity is demonstrated; and structured
            negative results documenting what was tried, what broke, and why.
          </p>

          <p>
            Extraction would combine LLMs, which now achieve high accuracy on
            structured scientific information extraction, with domain expert
            verification. This hybrid approach changes the economics of
            knowledge curation, but it requires a dedicated team of perhaps
            three to five people combining NLP engineering with motor
            neuroscience expertise. This is the kind of professionalized
            infrastructure team that Focused Research Organizations were
            designed to support and that universities are structurally unable
            to sustain: building infrastructure does not count toward tenure,
            grant review panels evaluate novelty rather than plumbing, and
            publishers have no incentive to flag contradictions in their own
            product.
            <Sidenote number={5}>
              The GenBank model is instructive. GenBank succeeded because journal
              mandates made data deposition a requirement for publication,
              government funding sustained the infrastructure indefinitely, and
              the data type (DNA sequences as ACGT strings) was canonical and
              well-defined. Scientific claims are harder: they are ambiguous,
              contested, context-dependent, and expressed in natural language.
              The LLM-plus-expert hybrid is the first approach that might
              bridge this gap at reasonable cost.
            </Sidenote>
          </p>

          <p>
            <strong>Measuring success.</strong> The experiment is informative
            regardless of outcome. If the system helps, we measure newcomer
            ramp-up time, contradiction identification speed, redundancy
            reduction, and dead-end avoidance. If it does not help, that tells
            us the bottleneck to scientific convergence lies in incentive
            structures rather than knowledge organization, redirecting future
            metascience interventions.
          </p>

          <p>
            <strong>Why now.</strong> The lower infrastructure layers (DANDI,
            NWB, containerized pipelines) have matured enough that the claim
            layer is buildable for the first time. LLMs have crossed the
            extraction accuracy threshold. But the same technology is making the
            problem more urgent: AI-assisted writing is accelerating paper
            production without adding structure, what Narayanan and Kapoor have
            called the "production-progress
            paradox" <Citation numbers={19} />. Meanwhile, the motor cortex
            field is at a critical juncture, with cross-animal
            studies <Citation numbers={20, 21} /> producing evidence that could
            resolve longstanding questions if the field had infrastructure to
            synthesize it.
          </p>

          <p>
            Gene Ontology gave biology a shared vocabulary. The Protein Data
            Bank gave structural biology a shared archive. Lean gave mathematics
            a shared verification layer. Neuroscience has the data archives and
            the computation standards. What it still lacks is the glue: a
            structured, queryable layer connecting claims to evidence to data to
            code. Building it for one subfield is a tractable experiment. If it
            works, it becomes a template. If it doesn't, we learn where the real
            bottlenecks lie. Either way, we should run the experiment.
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
              H. T. Kalidindi, K. C. Cross, T. P. Lillicrap, et al., "Rotational
              dynamics in motor cortex are consistent with a feedback
              controller,"{" "}
              <em>eLife</em>, vol. 10, e67256, 2021.
            </li>
            <li id="ref-5">
              E. Kuzmina, D. Kriukov, M. Lebedev, "Neuronal travelling waves
              explain rotational dynamics in experimental datasets and
              modelling,"{" "}
              <em>Scientific Reports</em>, vol. 14, 3566, 2024.
            </li>
            <li id="ref-6">
              J. F. Kalaska, D. A. D. Cohen, M. L. Hyde, S. A. Prud'homme, "A
              comparison of movement direction-related versus load
              direction-related activity in primate motor cortex,"{" "}
              <em>Journal of Neuroscience</em>, vol. 9, pp. 2080–2102, 1989.
            </li>
            <li id="ref-7">
              M. Rigotti, O. Barak, M. R. Warden, et al., "The importance of
              mixed selectivity in complex cognitive tasks,"{" "}
              <em>Nature</em>, vol. 497, pp. 585–590, 2013.
            </li>
            <li id="ref-8">
              K. M. Tye, E. K. Miller, F. H. Taschbach, M. K. Benna,
              M. Rigotti, S. Fusi, "Mixed selectivity: Cellular computations
              for complexity,"{" "}
              <em>Neuron</em>, vol. 112, pp. 2289–2303, 2024.
            </li>
            <li id="ref-9">
              S. H. Scott, "Inconvenient truths about neural processing in
              primary motor cortex,"{" "}
              <em>Journal of Physiology</em>, vol. 586, pp. 1217–1224, 2008.
            </li>
            <li id="ref-10">
              D. Fanelli, "'Positive' results increase down the hierarchy of the
              sciences,"{" "}
              <em>PLoS ONE</em>, vol. 5, e10068, 2010.
            </li>
            <li id="ref-11">
              A. K. Suresh, J. M. Goodman, et al., "Neural population dynamics
              in motor cortex are different for reach and grasp,"{" "}
              <em>eLife</em>, vol. 9, e58848, 2020.
            </li>
            <li id="ref-12">
              K. S. Button, J. P. A. Ioannidis, et al., "Power failure: why
              small sample size undermines the reliability of neuroscience,"{" "}
              <em>Nature Reviews Neuroscience</em>, vol. 14, pp. 365–376, 2013.
            </li>
            <li id="ref-13">
              D. Szucs, J. P. A. Ioannidis, "Empirical assessment of published
              effect sizes and power in the recent cognitive neuroscience and
              psychology literature,"{" "}
              <em>PLoS Biology</em>, vol. 15, e2000797, 2017.
            </li>
            <li id="ref-14">
              M. Serra-Garcia, U. Gneezy, "Nonreplicable publications are cited
              more than replicable ones,"{" "}
              <em>Science Advances</em>, vol. 7, eabd1705, 2021.
            </li>
            <li id="ref-15">
              S. A. Greenberg, "How citation distortions create unfounded
              authority: analysis of a citation network,"{" "}
              <em>BMJ</em>, vol. 339, b2680, 2009.
            </li>
            <li id="ref-16">
              A. P. Georgopoulos, A. B. Schwartz, R. E. Kettner, "Neuronal
              population coding of movement direction,"{" "}
              <em>Science</em>, vol. 233, pp. 1416–1419, 1986.
            </li>
            <li id="ref-17">
              K. G. Shojania, M. Sampson, M. T. Ansari, et al., "How quickly do
              systematic reviews go out of date? A survival analysis,"{" "}
              <em>Annals of Internal Medicine</em>, vol. 147, pp. 224–233, 2007.
            </li>
            <li id="ref-18">
              M. Gabelica, R. Bojčić, L. Puljak, "Many researchers were not
              compliant with their published data sharing statement: a
              mixed-methods study,"{" "}
              <em>Journal of Clinical Epidemiology</em>, vol. 150, pp. 33–41,
              2022.
            </li>
            <li id="ref-19">
              A. Narayanan, S. Kapoor,{" "}
              <em>AI Snake Oil: What Artificial Intelligence Can Do, What It
              Can't, and How to Tell the Difference</em>, Princeton University
              Press, 2024.
            </li>
            <li id="ref-20">
              M. Safaie, J. C. Chang, et al., "Preserved neural dynamics across
              animals performing similar behaviour,"{" "}
              <em>Nature</em>, vol. 623, pp. 765–771, 2023.
            </li>
            <li id="ref-21">
              E. R. Oby et al., "Latent neural population dynamics during
              skilled motor behavior across species,"{" "}
              2025.
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
  <title>Neuroscience Keeps Solving the Same Problems Twice — Felix Taschbach</title>
)

export default LeanForSciencePost
