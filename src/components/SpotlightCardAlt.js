import React from "react"
// import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"
import "../pages/spotlight.css"

const SpotlightCardAlt = () => {
  return (
    <div className="spotlight-card">
      <div className="spotlight-card__image" style={{ backgroundColor: "white" }}>
        <StaticImage
          src="../images/mixed_selectivity.png"
          alt="Neural mixed selectivity diagram"
          className="spotlight-card__img"
          width={700}
          objectPosition="center center"
          objectFit="contain"
          backgroundColor="white"
        />
      </div>
      <div className="spotlight-card__content" style={{ backgroundColor: "#F4D06F" }}>
        <div className="spotlight-card__meta">
          <div className="spotlight-card__label" style={{ 
            color: "#F4D06F", 
            backgroundColor: "black", 
            border: "1px solid black" 
          }}>Neuron</div>
          <div className="spotlight-card__issue" style={{ 
            color: "black", 
            backgroundColor: "#F4D06F", 
            border: "1px solid black" 
          }}>2024</div>
        </div>
        <h2 className="spotlight-card__title">Mixed selectivity: Cellular computations for complexity</h2>
        <div className="spotlight-card__excerpt">
          <p>
          The property of mixed selectivity has been discussed at a computational level and offers a strategy to maximize computational power by adding versatility to the functional role of each neuron. Here, we offer a biologically grounded implementational-level mechanistic explanation for mixed selectivity in neural circuits. 
          </p>
        </div>
        <div className="spotlight-card__footer">
          <div className="spotlight-card__author">Computational Neuroscience</div>
          <a href="https://www.cell.com/neuron/fulltext/S0896-6273(24)00278-2" className="spotlight-card__link" target="_blank" rel="noopener noreferrer">Read more →</a>
        </div>
      </div>
    </div>
  )
}

export default SpotlightCardAlt 