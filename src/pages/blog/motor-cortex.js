import React, { useRef, useState, useEffect } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
import FigureContainer from "../../components/blog/FigureContainer"
import CitationNetwork from "../../components/blog/CitationNetwork"
import TableOfContents from "../../components/blog/TableOfContents"
import "./blog-post.css"

const TOC_ITEMS = [
  { id: "introduction", label: "Introduction" },
  { id: "problem", label: "The problem" },
  { id: "case-study", label: "A case study" },
  { id: "lean-science", label: "Lean for science" },
  { id: "proposal", label: "A testable proposal" },
  { id: "references", label: "References" },
]

const MotorCortexPost = () => {
  const bodyRef = useRef(null)
  const [readingTime, setReadingTime] = useState(null)

  useEffect(() => {
    if (bodyRef.current) {
      const words = bodyRef.current.textContent.trim().split(/\s+/).length
      setReadingTime(Math.ceil(words / 250))
    }
  }, [])

  return (
    <Layout>
      <article className="blog-post">
        <div className="blog-post__header">
          <h1 className="blog-post__title">
            Lean for Science
          </h1>
          <p className="blog-post__subtitle">
            Why science lacks systematic knowledge infrastructure, and what we can do about it.
          </p>
          <div className="blog-post__byline">
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Published</span>
              <span className="blog-post__byline-value">March 2026</span>
            </div>
            <div className="blog-post__byline-group">
              <span className="blog-post__byline-label">Reading time</span>
              <span className="blog-post__byline-value">{readingTime ? `${readingTime} min` : ""}</span>
            </div>
          </div>
        </div>

        <div className="blog-post__body" ref={bodyRef}>
          <div className="blog-toc-wrapper">
            <TableOfContents items={TOC_ITEMS} />
          </div>

          <h2 id="introduction">Introduction</h2>
          <p>
          </p>

          <h2 id="problem">The problem</h2>
          <p>
          </p>

          <h2 id="case-study">A case study</h2>
          <p>
          </p>

          <FigureContainer width="outset" caption="Citation network of motor cortex research, 1968–2024. Papers are positioned by year and grouped by paradigm. Node size reflects citation count. Hover or tap a paper for details.">
            <CitationNetwork />
          </FigureContainer>

          <p>
          </p>

          <h2 id="lean-science">Lean for science</h2>
          <p>
          </p>

          <h2 id="proposal">A testable proposal</h2>
          <p>
          </p>

          <h2 id="references">References</h2>
          <ol className="blog-references">
          </ol>
        </div>

        <div className="blog-post__footer-sep" />
        <div className="blog-post__back">
          <Link to="/" className="blog-post__back-link">← Back to home</Link>
        </div>
      </article>
    </Layout>
  )
}

export default MotorCortexPost

export const Head = () => (
  <>
    <title>Lean for Science — Felix Taschbach</title>
    <meta name="description" content="Why science lacks systematic knowledge infrastructure, and what we can do about it." />
  </>
)
