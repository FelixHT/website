import React, { useState, useEffect, useRef, useCallback } from "react"

export default function TableOfContents({ items }) {
  const [activeId, setActiveId] = useState(null)
  const [dodgeShift, setDodgeShift] = useState(0)
  const observerRef = useRef(null)
  const tocRef = useRef(null)
  const rafRef = useRef(null)

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

  const checkOverlap = useCallback(() => {
    const toc = tocRef.current
    if (!toc) return

    // Use the parent .blog-toc-wrapper as stable horizontal reference
    // (it never transforms, so its rect is always the base position)
    const wrapper = toc.closest(".blog-toc-wrapper")
    if (!wrapper) return

    const wrapperRect = wrapper.getBoundingClientRect()
    const tocRect = toc.getBoundingClientRect()

    const figures = document.querySelectorAll(
      ".blog-figure--wide, .l-body-outset, .l-page, .l-screen"
    )

    let shift = 0
    figures.forEach(fig => {
      const figRect = fig.getBoundingClientRect()
      // Vertical overlap (translateX doesn't affect y)
      if (figRect.top < tocRect.bottom + 20 && figRect.bottom > tocRect.top - 20) {
        // Horizontal: wrapper.right is the TOC's untransformed right edge
        // Only dodge if overlap is significant (>40px), not just from centering margins
        if (figRect.left < wrapperRect.right) {
          const overlap = wrapperRect.right - figRect.left
          if (overlap > 40) {
            shift = Math.max(shift, overlap + 16)
          }
        }
      }
    })

    const maxShift = Math.max(0, wrapperRect.left - 8)
    shift = Math.min(shift, maxShift)

    setDodgeShift(shift)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        checkOverlap()
        rafRef.current = null
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    checkOverlap()

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [checkOverlap])

  const handleClick = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <nav
      ref={tocRef}
      className="blog-toc"
      style={dodgeShift > 0 ? { transform: `translateX(-${dodgeShift}px)` } : undefined}
      aria-label="Table of contents"
    >
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
