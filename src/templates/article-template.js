import * as React from "react"
import { Link } from "gatsby"
import Layout from "../components/layout"
import Seo from "../components/seo"
import "./article-template.css"

const ArticleTemplate = ({ pageContext }) => {
  // In a real implementation, this data would come from pageContext
  // For now, we'll use sample data
  const article = {
    title: "",
    author: "",
    date: "May 15, 2023",
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    `,
    tags: [""],
    relatedArticles: [
    ]
  }

  return (
    <Layout>
      <article className="article">
        <header className="article__header">
          <h1 className="article__title">{article.title}</h1>
          <div className="article__meta">
            <span className="article__author">By {article.author}</span>
            <span className="article__date">{article.date}</span>
          </div>
        </header>

        <div 
          className="article__content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <footer className="article__footer">
          <div className="article__tags">
            {article.tags.map(tag => (
              <Link key={tag} to={`/tag/${tag.toLowerCase().replace(/ /g, '-')}`} className="article__tag">
                {tag}
              </Link>
            ))}
          </div>

          <div className="related-articles">
            <h3 className="related-articles__title">Related Articles</h3>
            <div className="related-articles__grid">
              {article.relatedArticles.map(related => (
                <div key={related.slug} className="related-article">
                  <Link to={`/article/${related.slug}`} className="related-article__link">
                    <h4 className="related-article__title">{related.title}</h4>
                    <span className="related-article__author">By {related.author}</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </article>
    </Layout>
  )
}

export const Head = ({ pageContext }) => {
  // In a real implementation, the title would come from pageContext
  return <Seo title="" />
}

export default ArticleTemplate 