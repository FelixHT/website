import * as React from "react"
import { Link } from "gatsby"
import Layout from "../components/layout"
import SpotlightCard from "../components/SpotlightCard"
import ArticleCard from "../components/ArticleCard"
import SpotlightCardAlt from "../components/SpotlightCardAlt"
import CCATeaser from "../components/blog/CCATeaser"
import "./index.css"

const IndexPage = () => {
  return (
    <Layout>
      <div className="home-page">
        {/* First spotlight section */}
        <div className="two-column-layout">
          {/* Spotlight Column */}
          <div className="spotlight-column">
            <SpotlightCard />
          </div>

          {/* Articles Column */}
          <div className="articles-column">
            <article className="article-item">
              <div className="article-item-header">
                <h3 className="article-item-title" style={{ marginBottom: "-1rem" }}>News</h3>
                {/* <p className="article-item-author"></p> */}
              </div>
              <div className="article-item-content">
                <ul className="article-item-list" style={{ listStyle: "none", paddingLeft: 0 }}>
                  <li>[Aug. 2025] Received the Ray Thomas Edwards Award for Research Excellence from the UCSD Department of Biological Sciences.</li>
                  <li>[May. 2025] Mario Aguilera was kind to write a short write-up about the recent paper for <a href="https://today.ucsd.edu/story/neuroscientists-pinpoint-where-and-how-brain-circuits-are-reshaped-as-we-learn-new-movements">UCSD Today</a>.</li>
                  <li>[May. 2025] Paper in collaboration with the phenomenal Assaf Ramot has published in <a href="https://www.nature.com/articles/s41586-025-08962-8">Nature</a>.</li>
                  <li>[2025] Paper with <a href="https://reeshapatellab.org/">Reesha Patel</a> accepted at Nature Neuroscience.</li>
                  <li>[Jul. 2024] Published review on mixed selectivity in <a href="https://www.cell.com/neuron/fulltext/S0896-6273(24)00278-2">Neuron</a> with <a href="https://zuckermaninstitute.columbia.edu/stefano-fusi-phd">Stefano Fusi</a>.</li>
                  <li>[Jul. 2023] I advanced to PhD candidacy.</li>
                  <li>[Oct. 2022] Paper with <a href="https://themillslab.com/">Fergil Mills</a> uploaded to bioRxiv.</li>
                </ul>
                {/* <span className="article-item-readmore">Read more →</span> */}
              </div>
              {/* <div className="article-item-tags">
                <span className="article-item-tag"></span>
              </div> */}
            </article>

            <article className="article-item">
              <div className="article-item-header">
                <h3 className="article-item-title" style={{ marginBottom: "-1rem" }}>Teaching</h3>
                {/* <p className="article-item-author"></p> */}
              </div>
              <div className="article-item-content">
                <ul className="article-item-list" style={{ listStyle: "none", paddingLeft: 0 }}>
                  <li><strong>Cellular Biology</strong> — UCSD, Fall 2025</li>
                  <li><strong>Neural Data Science</strong> — UCSD, Winter 2025</li>
                  <li><strong>Bioinformatics Laboratory</strong> — UCSD, Spring 2023</li>
                  <li><strong>Python for Biologists</strong> — UCSD, Winter 2023</li>
                  <li><strong>Computational Neuroscience</strong> — Neuromatch Academy, Summer 2022</li>
                  <li><strong>Computational Models of the Brain</strong> — UCSD, Spring 2022</li>
                  <li><strong>Imperative Programming</strong> — Maastricht University, Spring 2017</li>
                  <li><strong>Introduction to Programming</strong> — Maastricht University, Fall 2016</li>
                </ul>
              </div>
            </article>

            <article className="article-item">
              <div className="article-item-header">
                <h3 className="article-item-title" style={{ marginBottom: "-1rem" }}>Conferences</h3>
                {/* <p className="article-item-author"></p> */}
              </div>
              <div className="article-item-content">
                <ul className="article-item-list" style={{ listStyle: "none", paddingLeft: 0 }}>
                  <li>[SfN 2025] Identifying motor representations that robustly generalize across subjects and behavioral contexts.</li>
                  <li>[CoSyNe 2025] Co-organized workshop: "What makes us unique: Deconstructing the sources of individual differences."</li>
                  <li>[SfN & FENS 2024] Shared Representation Discovery for Multimodal Datasets.</li>
                  <li>[Salk Retreat 2024] Oral presentation: Unbiased discovery of interpretable shared representations.</li>
                  <li>[SfN 2023] Acute and chronic social isolation promote diverse behavior repertoires and differentially modify mPFC responses to social contact.</li>
                  <li>[Salk Retreat 2023] Poster: Unbiased discovery of interpretable shared representations.</li>
                  <li>[SfN 2022] Functional characterization of input-defined neurons within the primary motor cortex during motor learning.</li>
                  <li>[CCN 2019] Abstract representations of space in the mouse dentate gyrus.</li>
                </ul>
              </div>
            </article>

            <article className="article-item">
              <div className="article-item-header">
                <h3 className="article-item-title" style={{ marginBottom: "-1rem" }}>Awards</h3>
              </div>
              <div className="article-item-content">
                <ul className="article-item-list" style={{ listStyle: "none", paddingLeft: 0 }}>
                  <li><strong>Ray Thomas Edwards Award</strong> — UCSD Department of Biological Sciences, 2025</li>
                  <li><strong>MaCSBio Thesis Award</strong> — Maastricht Centre for Systems Biology, 2019</li>
                </ul>
              </div>
            </article>

            <article className="article-item">
              <div className="article-item-header">
                <h3 className="article-item-title" style={{ marginBottom: "-1rem" }}>Mentoring</h3>
              </div>
              <div className="article-item-content">
                <ul className="article-item-list" style={{ listStyle: "none", paddingLeft: 0 }}>
                  <li><strong>BUMMP</strong> — Undergraduate and Master's mentorship program, UCSD, 2023–present</li>
                  <li><strong>Heithoff-Brody Summer Scholars</strong> — High school mentor, Salk Institute, 2024</li>
                  <li><strong>Graduate Research Mentor</strong> — Visiting master student in computational neuroscience, 2022–2023</li>
                </ul>
              </div>
            </article>
          </div>
        </div>

        {/* Section divider */}
        <div className="section-divider-labeled">
          <span className="section-divider-label">Selected publications</span>
        </div>

        {/* Second spotlight section */}
        <div className="two-column-layout">
          {/* Spotlight Column */}
          <div className="spotlight-column">
            <SpotlightCardAlt />
          </div>

          {/* More Articles Column */}
          <div className="articles-column">
            <ArticleCard
              title="Motor learning refines thalamic influence on motor cortex"
              author="Assaf Ramot & Felix Taschbach et al."
              description="Longitudinal imaging of thalamic axons in M1 shows that motor learning reorganizes which cortical neurons the thalamus drives, shifting its influence toward the neurons that encode learned movements. Inactivating these thalamic inputs in expert mice impairs the learned movements."
              tag="Nature"
              year="2025"
              link="https://www.nature.com/articles/s41586-025-08962-8"
            />
            <ArticleCard
              title="Amygdalostriatal transition zone neurons encode sustained valence to direct conditioned behaviors"
              author="Fergil Mills et al."
              description="The amygdalostriatal transition zone (ASt) contains sparse, high signal-to-noise neurons that maintain sustained responses to negative valence stimuli throughout defensive behavior. Photostimulation of ASt drives freezing and avoidance; inhibiting its Drd2+ neurons reduces conditioned fear."
              tag="Preprint"
              year="2022"
              link="https://www.biorxiv.org/content/10.1101/2022.10.28.514263v1"
            />

            <ArticleCard
              title="Social isolation recruits amygdala-cortical circuitry to escalate alcohol drinking"
              author="Reesha Patel et al."
              description="Social rank predicts alcohol consumption in mice, with subordinates drinking more than dominants. Social isolation escalates drinking through a BLA-mPFC circuit that becomes hyperexcitable; optogenetically inhibiting this circuit after isolation reduces alcohol intake."
              tag="Accepted in principle"
              year="2023"
              link="https://pmc.ncbi.nlm.nih.gov/articles/PMC10984017/"
            />

            <ArticleCard
              title="Social exclusion amplifies behavioral responses to physical pain via insular neuromodulation"
              author="Kay Tye et al."
              description="Social exclusion increases sensitivity to physical pain. Blocking oxytocin signaling in the insula replicates this effect, suggesting social exclusion alters pain perception through insular neuromodulation."
              tag="Preprint"
              year="2025"
              link="https://doi.org/10.21203/rs.3.rs-6615222/v1"
            />

            <ArticleCard
              title="Cortical ensembles orchestrate social competition through hypothalamic outputs"
              author="Padilla-Coreano & Batra et al."
              description="mPFC population dynamics predict social rank and competitive outcomes in mice. The mPFC exerts top-down control over dominance behavior through projections to the lateral hypothalamus, establishing a cortico-hypothalamic circuit for social competition."
              tag="Nature"
              year="2022"
              link="https://www.nature.com/articles/s41586-022-04507-5"
            />
          </div>
        </div>

        {/* Section divider */}
        <div className="section-divider-labeled">
          <span className="section-divider-label">Research notes</span>
        </div>

        {/* Blog section */}
        <div className="two-column-layout">
          <div className="spotlight-column">
            <Link to="/blog/cca/" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="spotlight-card">
                <div className="spotlight-card__image" style={{ pointerEvents: "none" }}>
                  <CCATeaser hero />
                </div>
                <div className="spotlight-card__content" style={{ backgroundColor: "#D0DDE8" }}>
                  <div className="spotlight-card__meta">
                    <div className="spotlight-card__label" style={{
                      color: "#D0DDE8",
                      backgroundColor: "black",
                      border: "1px solid black"
                    }}>Dimensionality</div>
                    <div className="spotlight-card__issue" style={{
                      color: "black",
                      backgroundColor: "#D0DDE8",
                      border: "1px solid black"
                    }}>Reduction</div>
                  </div>
                  <h2 className="spotlight-card__title">Canonical Correlation Analysis</h2>
                  <div className="spotlight-card__excerpt">
                    <p>
                      Finding shared structure between two high-dimensional datasets, derived from scratch with interactive figures.
                    </p>
                  </div>
                  <div className="spotlight-card__footer">
                    <div className="spotlight-card__author">March 2026</div>
                    <span className="spotlight-card__link">Read more →</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="articles-column">
            <ArticleCard
              title="Preferential Subspace Identification"
              author="Dimensionality Reduction"
              description="Recovering latent dynamics from neural recordings and separating behaviorally relevant from irrelevant structure, derived from scratch."
              tag="March 2026"
              link="/blog/psid/"
              borderColor="#4A90D9"
              headerBgColor="rgba(74, 144, 217, 0.12)"
            />
            <ArticleCard
              title="Neuroscience Keeps Solving the Same Problems Twice"
              author="Essay"
              description="A structured claim-dependency layer for science, and an experiment to test whether it accelerates convergence."
              tag="March 2026"
              link="/blog/lean-for-science/"
              borderColor="#7a6fa0"
              headerBgColor="rgba(122, 111, 160, 0.12)"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**
 * Head export to define metadata for the page
 *
 * See: https://www.gatsbyjs.com/docs/reference/built-in-components/gatsby-head/
 */
export const Head = () => <title>Felix Taschbach</title>

export default IndexPage
