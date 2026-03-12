/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/
 */

/**
 * @type {import('gatsby').GatsbyNode['createPages']}
 */
exports.createPages = async ({ actions }) => {
  const { createPage } = actions

  // Create the About page
  createPage({
    path: "/about",
    component: require.resolve("./src/templates/about-page.js"),
    context: {},
  })
}
