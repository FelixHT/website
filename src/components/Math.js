import React from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

const InlineMath = ({ tex }) => {
  const html = katex.renderToString(tex, { throwOnError: false })
  return <span className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />
}

const BlockMath = ({ tex }) => {
  const html = katex.renderToString(tex, { displayMode: true, throwOnError: false })
  return <div className="math-block" dangerouslySetInnerHTML={{ __html: html }} />
}

const Equation = ({ tex, number }) => {
  const html = katex.renderToString(tex, { displayMode: true, throwOnError: false })
  return (
    <div className="equation-row">
      <div className="math-block" dangerouslySetInnerHTML={{ __html: html }} />
      {number && <span className="equation-number">({number})</span>}
    </div>
  )
}

export { InlineMath, BlockMath, Equation }
