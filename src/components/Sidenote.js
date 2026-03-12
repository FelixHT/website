import React from "react"

const Sidenote = ({ number, children }) => (
  <span className="sidenote-wrapper">
    <label htmlFor={`sn-${number}`} className="sidenote-toggle">*</label>
    <input type="checkbox" id={`sn-${number}`} className="sidenote-checkbox" />
    <span className="sidenote">{children}</span>
  </span>
)

export default Sidenote
