import React from "react"
import "./footer.css"

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__bottom">
          <p className="site-footer__copyright">
            © {new Date().getFullYear()} Felix Taschbach. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 