import React from "react"
import { Link } from "gatsby"
import "./series-nav.css"

const SERIES = [
  { part: 1, title: "Vectors and neural geometry", path: "/blog/vectors-geometry/" },
  { part: 2, title: "Bases and coordinates", path: "/blog/bases-coordinates/" },
  { part: 3, title: "Matrices as linear maps", path: "/blog/matrices-linear-maps/" },
  { part: 4, title: "Subspaces, rank, and projection", path: "/blog/subspaces-rank-projection/" },
  { part: 5, title: "Eigenvectors and covariance", path: "/blog/eigenvectors-covariance/" },
  { part: 6, title: "The singular value decomposition", path: "/blog/svd/" },
  { part: 7, title: "Principal component analysis", path: "/blog/pca/" },
  { part: 8, title: "Least squares and regularization", path: "/blog/least-squares/" },
  { part: 9, title: "Canonical correlation analysis", path: "/blog/cca/" },
  { part: 10, title: "Procrustes and hyperalignment", path: "/blog/procrustes-alignment/" },
  { part: 11, title: "Reduced-rank regression and dPCA", path: "/blog/rrr-dpca/" },
]

export default function SeriesNav({ part }) {
  const idx = SERIES.findIndex(s => s.part === part)
  if (idx === -1) return null
  const prev = idx > 0 ? SERIES[idx - 1] : null
  const next = idx < SERIES.length - 1 ? SERIES[idx + 1] : null

  return (
    <nav className="series-nav" aria-label="Series navigation">
      <div className="series-nav__label">
        Linear Algebra for Neural Data · Part {part} of {SERIES.length}
      </div>
      <div className="series-nav__links">
        {prev ? (
          <Link to={prev.path} className="series-nav__link series-nav__link--prev">
            <span className="series-nav__arrow">&larr;</span>
            <span className="series-nav__link-text">
              <span className="series-nav__link-part">Part {prev.part}</span>
              <span className="series-nav__link-title">{prev.title}</span>
            </span>
          </Link>
        ) : <div />}
        {next ? (
          <Link to={next.path} className="series-nav__link series-nav__link--next">
            <span className="series-nav__link-text">
              <span className="series-nav__link-part">Part {next.part}</span>
              <span className="series-nav__link-title">{next.title}</span>
            </span>
            <span className="series-nav__arrow">&rarr;</span>
          </Link>
        ) : <div />}
      </div>
    </nav>
  )
}
