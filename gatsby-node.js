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
  
  // Create sample article pages
  const sampleArticles = [
  ]
  
  sampleArticles.forEach(article => {
    createPage({
      path: `/article/${article.slug}`,
      component: require.resolve("./src/templates/article-template.js"),
      context: {
        slug: article.slug,
        title: article.title
      },
    })
  })
  
  // Original DSG page
  createPage({
    path: "/using-dsg",
    component: require.resolve("./src/templates/using-dsg.js"),
    context: {},
    defer: true,
  })
}
