import React from "react"
// import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"
import { FaGithub, FaLinkedin } from "react-icons/fa"
import { SiGooglescholar } from "react-icons/si"
import blueskyIcon from "../images/bluesky-1.svg"
import "../pages/spotlight.css"

const SpotlightCard = () => {
  // Light blue background color used in the content area
  const bgColor = "#D8E2DC";
  
  // Shared styling for divider lines
  const dividerStyle = {
    border: 'none',
    borderTop: '1px solid black',
    margin: '0',
    padding: '0',
    width: '100%',
    height: '0'
  };
  
  return (
    <div className="spotlight-card" style={{ margin: "0 auto" }}>
      <div className="spotlight-card__image">
        <StaticImage
          src="../images/avatar_anime.png"
          alt="Felix Taschbach profile"
          className="spotlight-card__img"
          width={700}
          objectPosition="center 30%"
          objectFit="cover"
        />
      </div>
      <div className="spotlight-card__content" style={{ backgroundColor: bgColor, textAlign: "left" }}>
        <div className="spotlight-card__meta">
          <div className="spotlight-card__label" style={{ 
            color: bgColor, 
            backgroundColor: "black", 
            border: "1px solid black" 
          }}>Felix</div>
          <div className="spotlight-card__issue" style={{ 
            color: "black", 
            backgroundColor: bgColor, 
            border: "1px solid black" 
          }}>Taschbach</div>
        </div>
        <h2 className="spotlight-card__title" style={{ textAlign: "left" }}>Biography</h2>
        <div className="spotlight-card__excerpt" style={{ textAlign: "left" }}>
          <p>
            I am currently a PhD candidate in the Biological Sciences Program at UCSD, where I am fortunate to work with Prof. Marcus Benna. I received my MSc in Systems Biology at Maastricht University. I completed my master thesis on computational neuroscience working in the lab of Stefano Fusi at Columbia University.
          </p>
          <p>
            My research is on how populations of neurons encode information within ethological contexts. Specifically, I am interested in how changes within an animal's internal state lead to changes within its neural representations and how these representations evolve over time. For instance, how chronic mild stress can induce depression.
          </p>
        </div>
        
        {/* Social links section with dividers */}
        <div className="social-links-section" style={{ 
          display: "block", 
          width: "100%",
          position: "relative",
          marginTop: "12px"
        }}>
          {/* Top divider */}
          <hr style={{...dividerStyle, marginBottom: "12px"}} />
          
          {/* Icons container */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            // alignItems: "center", 
            padding: "0",
            boxSizing: "border-box",
            width: "100%",
            marginBottom: "8px"
          }}>
            <div style={{ display: "flex", gap: "1.5rem", marginLeft: "2px" }}>
              {/* Google Scholar */}
              <a href="https://scholar.google.com/citations?hl=en&user=tytm25sAAAAJ" target="_blank" rel="noopener noreferrer" aria-label="Google Scholar">
                <SiGooglescholar size={18} color="black" />
              </a>
              
              {/* GitHub */}
              <a href="https://github.com/FelixHT" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <FaGithub size={18} color="black" />
              </a>
              
              {/* Bluesky */}
              <a href="https://bsky.app/profile/ftaschbach.bsky.social" target="_blank" rel="noopener noreferrer" aria-label="Bluesky">
                <img src={blueskyIcon} alt="Bluesky" width="18" height="18" style={{ display: "block" }} />
              </a>
              
              {/* LinkedIn */}
              <a href="https://www.linkedin.com/in/felix-taschbach" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <FaLinkedin size={18} color="black" />
              </a>
            </div>
            {/* <a href="https://bsky.app/profile/ftaschbach.bsky.social" className="spotlight-card__link" style={{ 
              display: "flex", 
              alignItems: "center", 
              // height: "20px", 
              marginRight: "2px" 
            }}>
              CV →
            </a> */}
          </div>
          
          {/* Bottom divider */}
          {/* <hr style={dividerStyle} /> */}
        </div>
      </div>
    </div>
  )
}

export default SpotlightCard 