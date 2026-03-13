// src/components/blog/figureConstants.js

// Shared color palette
export const COLORS = {
  encoding:   "#3d6cb9",
  kinematics: "#8b6aad",
  dynamics:   "#d4a03c",
  challenge:  "#c0503a",
  critique:   "#6a8a6e",
  bci:        "#7a5f9a",
  flag:       "#c0503a",
}

// Responsive breakpoints (container width)
export const BREAKPOINTS = { wide: 900, medium: 600 }

// Shared tooltip style (used as inline style on a <div>)
export const TOOLTIP_STYLE = {
  position: "absolute",
  background: "rgba(250,249,246,0.95)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 6,
  padding: "10px 14px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  maxWidth: 280,
  pointerEvents: "none",
  zIndex: 10,
  lineHeight: 1.5,
  fontSize: "12.5px",
}

// Shared toggle button base style
export const BTN_BASE = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 600,
  padding: "7px 16px",
  border: "1.5px solid #d0d0cc",
  borderRadius: 4,
  background: "#fff",
  color: "#555",
  cursor: "pointer",
}

// Active button variant — caller merges with BTN_BASE
export const btnActive = (color) => ({
  background: color,
  borderColor: color,
  color: "#fff",
})
