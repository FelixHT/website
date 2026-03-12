import React, { useMemo } from "react"
import Prism from "prismjs"
import "prismjs/components/prism-python"

export default function CodeBlock({ code, language = "python" }) {
  const html = useMemo(
    () => Prism.highlight(code, Prism.languages[language], language),
    [code, language]
  )

  return (
    <pre className={`language-${language}`}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  )
}
