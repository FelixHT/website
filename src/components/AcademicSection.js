import React from "react"
import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"
import "../pages/spotlight.css"

// Creating a reusable academic section component that can be used for:
// - Conferences & Talks
// - Selected Publications 
// - Research Projects
// - etc.

const AcademicSection = ({ 
  title, 
  label,
  subtitle,
  items,
  imageUrl,
  linkText,
  linkUrl
}) => {
  return (
    <div className="spotlight-card">
      {imageUrl && (
        <div className="spotlight-card__image">
          <StaticImage
            src="../images/placeholder.png" // Default placeholder - will be overridden by actual usage
            alt={title}
            className="spotlight-card__img"
            width={700}
          />
        </div>
      )}
      <div className="spotlight-card__content">
        <div className="spotlight-card__meta">
          <div className="spotlight-card__label">{label || "Academic"}</div>
          <div className="spotlight-card__issue">{subtitle || "Section"}</div>
        </div>
        <h2 className="spotlight-card__title">{title || "Section Title"}</h2>
        <div className="spotlight-card__excerpt">
          {items && items.map((item, index) => (
            <div key={index} className="academic-item">
              <h3 className="academic-item__title">{item.title}</h3>
              {item.authors && <p className="academic-item__authors">{item.authors}</p>}
              {item.venue && <p className="academic-item__venue">{item.venue}</p>}
              {item.date && <p className="academic-item__date">{item.date}</p>}
              {item.description && <p className="academic-item__description">{item.description}</p>}
              {item.link && (
                <a href={item.link} className="academic-item__link" target="_blank" rel="noopener noreferrer">
                  {item.linkText || "View"}
                </a>
              )}
            </div>
          ))}
        </div>
        
        {(linkText && linkUrl) && (
          <div className="spotlight-card__footer">
            <div></div>
            <Link to={linkUrl} className="spotlight-card__link">{linkText} →</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default AcademicSection 