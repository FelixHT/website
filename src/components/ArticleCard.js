import React from "react"
// import { Link } from "gatsby"
import "./article-card.css"

const ArticleCard = ({
  title,
  author,
  description,
  tag,
  year,
  link,
  headerBgColor,
  headerFontColor
}) => {
  return (
    <article className="article-card-container">
      <div className="article-card-content-wrapper">
        <div className="article-card-header" style={{
          backgroundColor: headerBgColor || undefined,
          color: headerFontColor || undefined
        }}>
          <h3 className="article-card-title" style={{
            color: headerFontColor || undefined
          }}>{title}</h3>
          <p className="article-card-author" style={{
            color: headerFontColor ? headerFontColor : undefined
          }}>{author}</p>
        </div>
        <div className="article-card-content">
          <p className="article-card-description">
            {description}
          </p>
        </div>
        <div className="article-card-footer">
          <span className="article-card-tag">{tag}</span>
          {year && <span className="article-card-tag">{year}</span>}
          {link && (
            <a href={link} className="article-card-readmore-link" target="_blank" rel="noopener noreferrer" aria-label={`Read article: ${title}`}>
              <span className="article-card-readmore">Read more →</span>
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default ArticleCard