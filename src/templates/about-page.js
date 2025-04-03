import * as React from "react"
import Layout from "../components/layout"
import Seo from "../components/seo"
import "./about-page.css"

const AboutPage = () => (
  <Layout>
    <div className="about-page">
      <div className="about-page__content">
        <h1>About</h1>
        <p>
          I am a PhD candidate in the Biological Sciences Program at UCSD, where I am fortunate to work with Prof. Marcus Benna. I received my MSc in Systems Biology at Maastricht University. I completed my master thesis on computational neuroscience working in the lab of Stefano Fusi at Columbia University.
        </p>
        <p>
          My research is on how populations of neurons encode information within ethological contexts. Specifically, I am interested in how changes within an animal's internal state lead to changes within its neural representations and how these representations evolve over time. For instance, how chronic mild stress can induce depression.
        </p>
      </div>
    </div>
  </Layout>
)

export const Head = () => <Seo title="About" />

export default AboutPage