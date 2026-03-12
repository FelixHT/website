import React, { useState, useEffect, useRef } from "react"
import { InlineMath } from "../Math"

const DEFAULT_GROUPS = [
  {
    color: "#4A90D9",
    label: "Latent",
    vars: ["x_t", "A", "d"],
  },
  {
    color: "#4A7C6F",
    label: "Observations",
    vars: ["y_t", "C", "m"],
  },
  {
    color: "#D4783C",
    label: "Behavior",
    vars: ["z_t", "L"],
  },
  {
    color: "#999999",
    label: "Noise",
    vars: ["w_t", "v_t", "e_t"],
  },
]

export default function VariableLegend({ groups = DEFAULT_GROUPS, scrollTargetId = "state-space" }) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const sentinelRef = useRef(null)

  // Show the legend only after the reader scrolls past the state-space heading
  useEffect(() => {
    const target = document.getElementById(scrollTargetId)
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the heading scrolls above the viewport, show the legend
        if (entry.boundingClientRect.top < 0) {
          setVisible(true)
        } else {
          setVisible(false)
          setOpen(false)
        }
      },
      { threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  // Also check on scroll for more reliable detection
  useEffect(() => {
    function check() {
      const el = document.getElementById(scrollTargetId)
      if (!el) return
      const rect = el.getBoundingClientRect()
      setVisible(rect.top < 100)
    }
    window.addEventListener("scroll", check, { passive: true })
    check()
    return () => window.removeEventListener("scroll", check)
  }, [])

  if (!visible) return null

  return (
    <div className="variable-legend">
      {open && (
        <div className="variable-legend__card">
          <div className="variable-legend__title">Variable reference</div>
          {groups.map(({ color, label, vars }) => (
            <div key={label} className="variable-legend__row">
              <span
                className="variable-legend__dot"
                style={{ background: color }}
              />
              <span className="variable-legend__label">{label}</span>
              <span className="variable-legend__vars">
                {vars.map((v, i) => (
                  <span key={v}>
                    <InlineMath tex={`{\\color{${color}}${v}}`} />
                    {i < vars.length - 1 ? ", " : ""}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
      <button
        className="variable-legend__toggle"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Hide variable legend" : "Show variable legend"}
      >
        {open ? "×" : (
          <span className="variable-legend__toggle-dots">
            {groups.slice(0, 4).map((g, i) => (
              <span key={i} style={{ background: g.color }} />
            ))}
          </span>
        )}
      </button>
    </div>
  )
}
