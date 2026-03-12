/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-ssr/
 */

const React = require("react")

/**
 * @type {import('gatsby').GatsbySSR['onRenderBody']}
 */
exports.onRenderBody = ({ setHtmlAttributes, setHeadComponents }) => {
  setHtmlAttributes({ lang: `en` })
  setHeadComponents([
    React.createElement("link", {
      key: "google-fonts-preconnect",
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    }),
    React.createElement("link", {
      key: "google-fonts-preconnect-gstatic",
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "anonymous",
    }),
    React.createElement("link", {
      key: "google-fonts-css",
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap",
    }),
    React.createElement("script", {
      key: "goatcounter",
      "data-goatcounter": "https://consent716.goatcounter.com/count",
      async: true,
      src: "//gc.zgo.at/count.js",
    }),
  ])
}
