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
              <div className="article-item-header" style={{ backgroundColor: "#5E76B4", color: "#000000" }}>
                <h3 className="article-item-title" style={{ marginBottom: "-1rem", color: "#000000" }}>News</h3>
                {/* <p className="article-item-author"></p> */}
              </div>
              <div className="article-item-content">
                <ul className="article-item-list" style={{ listStyle: "none", paddingLeft: 0 }}>
                  <li>[May. 2025] Mario Aguilera was kind to write a hort write-up about the recent paper for <a href="https://today.ucsd.edu/story/neuroscientists-pinpoint-where-and-how-brain-circuits-are-reshaped-as-we-learn-new-movements">UCSD Today</a></li>
                  <li>[May. 2025] Paper in collaboration with the phenomenal Assaf Ramot has published in <a href="https://www.nature.com/articles/s41586-025-08962-8">Nature</a>.</li>
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
              <div className="article-item-header" style={{ backgroundColor: "#8E7FA9", color: "#000000" }}>
                <h3 className="article-item-title" style={{ marginBottom: "-1rem", color: "#000000" }}>Teaching</h3>
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
              <div className="article-item-header" style={{ backgroundColor: "#DBDECE", color: "#000000" }}>
                <h3 className="article-item-title" style={{ marginBottom: "-1rem", color: "#000000" }}>Conferences</h3>
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
              description="The primary motor cortex (M1) is central for the learning and execution of dexterous motor skills1-3, and its superficial layer (layers 2 and 3; hereafter, L2/3) is a key locus of learning-related plasticity1,4-6. It remains unknown how motor learning shapes the way in which upstream regions activate M1 circuits to execute learned movements. Here, using longitudinal axonal imaging of the main inputs to M1 L2/3 in mice, we show that the motor thalamus is the key input source that encodes learned movements in experts (animals trained for two weeks). We then use optogenetics to identify the subset of M1 L2/3 neurons that are strongly driven by thalamic inputs before and after learning. We find that the thalamic influence on M1 changes with learning, such that the motor thalamus preferentially activates the M1 neurons that encode learned movements in experts. Inactivation of the thalamic inputs to M1 in experts impairs learned movements. Our study shows that motor learning reshapes the thalamic influence on M1 to enable the reliable execution of learned movements. "
              tag="Nature"
              link="https://www.nature.com/articles/s41586-025-08962-8"
              headerBgColor="#5E76B4"
              headerFontColor="#000000"
            />
            <ArticleCard 
              title="Amygdalostriatal transition zone neurons encode sustained valence to direct conditioned behaviors"
              author="Fergil Mills et al."
              description="Here, we present the amygdalostriatal transition zone (ASt) as a missing piece of a highly conserved process of paramount importance for survival, which represents an internal state (e.g. fear) that can be expressed in multiple motor outputs (e.g. freezing or escape). From in vivo cellular resolution recordings that include both electrophysiology and calcium imaging, we find that ASt neurons are sparse coding, extremely high signal-to-noise, and maintain a sustained response for negative valence stimuli for the duration of the defensive behavior."
              tag="Preprint"
              link="https://www.biorxiv.org/content/10.1101/2022.10.28.514263v1"
              headerBgColor="#8E7FA9"
              headerFontColor="#000000"
            />
            
            <ArticleCard 
              title="Social isolation recruits amygdala-cortical circuitry to escalate alcohol drinking"
              author="Reesha Patel et al."
              description="How do social factors impact the brain and contribute to increased alcohol drinking? We found that social rank predicts alcohol drinking, where subordinates drink more than dominants. Furthermore, social isolation escalates alcohol drinking, particularly impacting subordinates who display a greater increase in alcohol drinking compared to dominants."
              tag="Preprint"
              link="https://pmc.ncbi.nlm.nih.gov/articles/PMC10984017/"
              headerBgColor="#DBDECE"
              headerFontColor="#000000"
            />
            
            <ArticleCard 
              title="Cortical ensembles orchestrate social competition through hypothalamic outputs"
              author="Padilla-Coreano & Batra et al."
              description="Most social species self-organize into dominance hierarchies, which decreases aggression and conserves energy, but it is not clear how individuals know their social rank. We have only begun to learn how the brain represents social rank, and guides behavior on the basis of this representation. The medial prefrontal cortex (mPFC) is involved in social dominance in rodents, and humans. Yet, precisely how the mPFC encodes relative social rank and which circuits mediate this computation is not known. "
              tag="Nature"
              link="https://www.nature.com/articles/s41586-022-04507-5"
              headerBgColor="#D9B19C"
              headerFontColor="#000000"
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
