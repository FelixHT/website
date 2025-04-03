import * as React from "react"
// import { Link } from "gatsby"
// import { StaticImage } from "gatsby-plugin-image"
import Layout from "../components/layout"
import SpotlightCard from "../components/SpotlightCard"
import ArticleCard from "../components/ArticleCard"
import SpotlightCardAlt from "../components/SpotlightCardAlt"
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
                  <li>[Apr. 2025] Paper in collaboration with the phenomenal Assaf Ramot has been accepted for publication. Link coming soon!</li>
                  <li>[Jul. 2024] Published review on mixed selectivity in <a href="https://www.cell.com/neuron/fulltext/S0896-6273(24)00278-2">Neuron</a> with <a href="https://zuckermaninstitute.columbia.edu/stefano-fusi-phd">Stefano Fusi</a>.</li>
                  <li>[Mar. 2024] Paper with <a href="https://reeshapatellab.org/">Reesha Patel</a> uploaded to bioRxiv.</li>
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
                  <li>Graduate Instruction Assistant, Python for Biologists at University of California San Diego, Winter 2023</li>
                  <li>Teaching Assistant, Computational Neuroscience at Neuromatch Academy, Summer 2022</li>
                  <li>Graduate Instruction Assistant, Bioinformatics Laboratory at University of California San Diego, Spring 2022</li>
                  <li>Graduate Instruction Assistant, Computational Models of the Brain at University of California San Diego, Spring 2021</li>
                  <li>Teaching Assistant, Imperative Programming at Maastricht University, Spring 2017</li>
                  <li>Teaching Assistant, Introduction to Programming at Maastricht University, Fall 2016</li>
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
                  <li>[CoSyNe 2025] Workshop on Individual Differences</li>
                  <li>[SfN 2024] Shared Representation Discovery</li>
                  <li>[FENS 2024] Shared Representation Discovery</li>
                  <li>[SfN 2022] Functional characterization of input-defined neurons within the primary motor cortex during motor learning.</li>
                  <li>[CCN 2019] Abstract representations of space in the mouse dentate gyrus.</li>
                </ul>
              </div>
            </article>
          </div>
        </div>

        {/* Section divider */}
        <div className="section-divider"></div>

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
              description="Upcoming.."
              tag="Nature, in press"
              // link=""
            />
            <ArticleCard 
              title="Amygdalostriatal transition zone neurons encode sustained valence to direct conditioned behaviors"
              author="Fergil Mills et al."
              description="Here, we present the amygdalostriatal transition zone (ASt) as a missing piece of a highly conserved process of paramount importance for survival, which represents an internal state (e.g. fear) that can be expressed in multiple motor outputs (e.g. freezing or escape). From in vivo cellular resolution recordings that include both electrophysiology and calcium imaging, we find that ASt neurons are sparse coding, extremely high signal-to-noise, and maintain a sustained response for negative valence stimuli for the duration of the defensive behavior."
              tag="Preprint"
              link="https://www.biorxiv.org/content/10.1101/2022.10.28.514263v1"
            />
            
            <ArticleCard 
              title="Social isolation recruits amygdala-cortical circuitry to escalate alcohol drinking"
              author="Reesha Patel et al."
              description="How do social factors impact the brain and contribute to increased alcohol drinking? We found that social rank predicts alcohol drinking, where subordinates drink more than dominants. Furthermore, social isolation escalates alcohol drinking, particularly impacting subordinates who display a greater increase in alcohol drinking compared to dominants."
              tag="Preprint"
              link="https://pmc.ncbi.nlm.nih.gov/articles/PMC10984017/"
            />
            
            <ArticleCard 
              title="Cortical ensembles orchestrate social competition through hypothalamic outputs"
              author="Padilla-Coreano & Batra et al."
              description="Most social species self-organize into dominance hierarchies, which decreases aggression and conserves energy, but it is not clear how individuals know their social rank. We have only begun to learn how the brain represents social rank, and guides behavior on the basis of this representation. The medial prefrontal cortex (mPFC) is involved in social dominance in rodents, and humans. Yet, precisely how the mPFC encodes relative social rank and which circuits mediate this computation is not known. "
              tag="Nature"
              link="https://www.nature.com/articles/s41586-022-04507-5"
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
