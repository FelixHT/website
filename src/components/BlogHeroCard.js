import React from "react"
import { Link } from "gatsby"
import CCATeaser from "./blog/CCATeaser"
import "./blog-hero-card.css"

const BlogHeroCard = ({ title, excerpt, tag, slug, teaser }) => {
  return (
    <Link to={slug} className="blog-hero-card">
      <div className="blog-hero-card__image" style={{ pointerEvents: "none" }}>
        {teaser || <CCATeaser hero />}
      </div>
      <div className="blog-hero-card__overlay">
        <h2 className="blog-hero-card__title">{title}</h2>
        <div className="blog-hero-card__divider"></div>
        <p className="blog-hero-card__excerpt">{excerpt}</p>
        <div className="blog-hero-card__divider"></div>
        <div className="blog-hero-card__meta">
          <span className="blog-hero-card__tag">{tag}</span>
        </div>
      </div>
    </Link>
  )
}

export default BlogHeroCard
