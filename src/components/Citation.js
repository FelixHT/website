import React from "react"

const Citation = ({ numbers }) => {
  const nums = Array.isArray(numbers) ? numbers : [numbers]
  return (
    <span className="citation">
      [
      {nums.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && ", "}
          <a href={`#ref-${n}`} className="citation__link">{n}</a>
        </React.Fragment>
      ))}
      ]
    </span>
  )
}

export default Citation
