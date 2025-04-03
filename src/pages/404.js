import * as React from "react"
import { Link } from "gatsby"
import Layout from "../components/layout"
import Seo from "../components/seo"
import "./404.css"

const NotFoundPage = () => (
  <Layout>
    <div className="not-found">
      <h1 className="not-found__title">404: Page Not Found</h1>
      <p className="not-found__text">
        We couldn't find the page you were looking for. The page might have been moved, 
        deleted, or perhaps the URL was mistyped.
      </p>
      <div className="not-found__suggestions">
        <h2 className="not-found__subtitle">You might want to check out:</h2>
        <ul className="not-found__links">
          <li><Link to="/">Home Page</Link></li>

        </ul>
      </div>
      <Link to="/" className="not-found__button">
        Return to Homepage
      </Link>
    </div>
  </Layout>
)

export const Head = () => <Seo title="404: Not Found" />

export default NotFoundPage
