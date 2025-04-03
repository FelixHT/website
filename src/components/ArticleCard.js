import React from "react"
// import { Link } from "gatsby"
import "./article-card.css"

const ArticleCard = ({ 
  title,
  author,
  description,
  tag,
  link
}) => {
  return (
    <article className="article-card-container">
      <div className="article-card-content-wrapper">
        <div className="article-card-header">
          <h3 className="article-card-title">{title}</h3>
          <p className="article-card-author">{author}</p>
        </div>
        <div className="article-card-content">
          <p className="article-card-description">
            {description}
          </p>
          {link && (
            <a href={link} className="article-card-readmore-link" target="_blank" rel="noopener noreferrer" aria-label={`Read article: ${title}`}>
              <span className="article-card-readmore">Read more →</span>
            </a>
          )}
        </div>
        <div className="article-card-footer">
          <span className="article-card-tag">{tag}</span>
        </div>
      </div>
    </article>
  )
}

export default ArticleCard 