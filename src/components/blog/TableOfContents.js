import React, { useState, useEffect, useRef } from "react"

export default function TableOfContents({ items }) {
  const [activeId, setActiveId] = useState(null)
  const observerRef = useRef(null)

  useEffect(() => {
    const headings = items
      .map(item => document.getElementById(item.id))
      .filter(Boolean)

    if (headings.length === 0) return

    observerRef.current = new IntersectionObserver(
      entries => {
        // Find the topmost visible heading
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    )

    headings.forEach(h => observerRef.current.observe(h))

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [items])

  const handleClick = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <nav className="blog-toc" aria-label="Table of contents">
      <ul className="blog-toc__list">
        {items.map(item => (
          <li key={item.id} className="blog-toc__item">
            <a
              href={`#${item.id}`}
              onClick={e => handleClick(e, item.id)}
              className={`blog-toc__link${activeId === item.id ? " blog-toc__link--active" : ""}`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
