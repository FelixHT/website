import * as React from "react"
import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"

import Layout from "../components/layout"
import Seo from "../components/seo"
import "./article.css"

const ArticleTemplate = ({ pageContext }) => {
  // In a real implementation, this would come from pageContext
  const article = {
    title: "",
    author: "",
    date: "",
    excerpt: "",
    content: `
    `,
    tags: []
  };

  return (
    <Layout>
      <div className="article-page">
        <div className="article-header">
          <h1 className="article-header__title">{article.title}</h1>
          <div className="article-header__meta">
            <p className="article-header__author">{article.author}</p>
            <p className="article-header__date">{article.date}</p>
          </div>
        </div>

        <div className="article-featured-image">
          <StaticImage
            src="../images/placeholder.png"
            width={800}
            quality={95}
            formats={["auto", "webp", "avif"]}
            alt={article.title}
            className="article-featured-img"
          />
        </div>

        <div className="article-content">
          <p className="article-excerpt">{article.excerpt}</p>
          <div className="article-body" dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>

        <div className="article-tags">
          {article.tags.map((tag, index) => (
            <Link to={`/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`} className="tag" key={index}>
              {tag}
            </Link>
          ))}
        </div>

        <div className="article-footer">
          <div className="article-share">
            <h3 className="article-share__title">Share this article</h3>
            <div className="article-share__buttons">
              <a href="#" className="article-share__button">Facebook</a>
              <a href="#" className="article-share__button">LinkedIn</a>
            </div>
          </div>

          <div className="article-author-bio">
            <h3 className="article-author-bio__title">About the author</h3>
            <div className="article-author-bio__content">
              <div className="article-author-bio__image">
                <StaticImage
                  src="../images/placeholder.png"
                  width={80}
                  height={80}
                  quality={95}
                  formats={["auto", "webp", "avif"]}
                  alt={article.author}
                  className="article-author-bio__img"
                />
              </div>
              <div className="article-author-bio__text">
                <h4 className="article-author-bio__name">{article.author}</h4>
                <p className="article-author-bio__description">
                  
                </p>
                <Link to={`/authors/${article.author.toLowerCase().replace(/\s+/g, '-')}`} className="article-author-bio__link">
                  View all articles by {article.author}
                </Link>
              </div>
            </div>
          </div>

          <div className="related-articles">
            <h3 className="related-articles__title">Related articles</h3>
            <div className="related-articles__grid">
              <div className="related-article">
                <Link to="/article/placeholder.png" className="related-article__link">
                  <h4 className="related-article__title"></h4>
                  <p className="related-article__excerpt">
                    
                  </p>
                </Link>
              </div>
              <div className="related-article">
                <Link to="/article/placeholder.png" className="related-article__link">
                  <h4 className="related-article__title"></h4>
                  <p className="related-article__excerpt">
                    
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export const Head = ({ pageContext }) => <Seo title="" />

export default ArticleTemplate 