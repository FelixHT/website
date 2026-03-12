import React from "react"

const FigureContainer = ({ children, caption, width = "body" }) => {
  const className = width === "outset" ? "l-body-outset" :
    width === "page" ? "l-page" :
    width === "screen" ? "l-screen" : ""

  return (
    <figure className={`blog-figure ${className}`}>
      {children}
      {caption && <figcaption className="blog-figure__caption">{caption}</figcaption>}
    </figure>
  )
}

export default FigureContainer
