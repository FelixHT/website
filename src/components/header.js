import * as React from "react"
import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"
import "./header.css"

const Header = ({ siteTitle }) => (
  <header className="site-header">
    <div className="site-header__inner">
      <div className="site-header__logo-container">
        <Link to="/" className="site-header__logo">
          <div className="site-header__logo-text">
            <div>Felix</div>
            <div>Taschbach</div>
          </div>
        </Link>
      </div>
      <nav className="site-header__nav">
        <ul className="site-header__nav-list">
          {/* <li className="site-header__nav-item"><Link to="/about" className="site-header__nav-link">ABOUT</Link></li>
          <li className="site-header__nav-item"><Link to="/publications" className="site-header__nav-link">PUBLICATIONS</Link></li>
          <li className="site-header__nav-item"><Link to="/conferences" className="site-header__nav-link">CONFERENCES</Link></li>
          <li className="site-header__nav-item"><Link to="/contact" className="site-header__nav-link">CONTACT</Link></li> */}
        </ul>
      </nav>
      <button className="site-header__menu-button" aria-label="Toggle menu">
        <span className="site-header__menu-icon"></span>
      </button>
    </div>
    <div className="site-header__issue-bar">
      <div className="site-header__issue-bar-inner">
        <span>University of California San Diego</span>
        <span className="site-header__issue-bar-separator">|</span>
        <span>updated April 2025</span>
        {/* <div className="site-header__issue-bar-links"> */}
          {/* <Link to="/archive" className="site-header__issue-bar-link">Archive</Link>
          <Link to="/notes" className="site-header__issue-bar-link">Notes</Link>
          <Link to="/subscribe" className="site-header__issue-bar-link site-header__issue-bar-link--subscribe">Subscribe</Link> */}
        {/* </div> */}
      </div>
    </div>
  </header>
)

export default Header
