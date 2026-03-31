import React, { useRef, useEffect } from "react"

const NUM = 56
const CONNECT_DIST = 200
const PALETTE = [
  [160, 145, 115],
  [135, 155, 140],
  [145, 135, 160],
  [175, 150, 110],
  [125, 150, 145],
  [155, 140, 130],
]

export default function SpikeRasterBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const container = canvas.parentElement
    let W, H, animId

    function resize() {
      W = container.offsetWidth
      H = container.offsetHeight
      canvas.width = W * devicePixelRatio
      canvas.height = H * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const nodes = Array.from({ length: NUM }, () => {
      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)]
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 2.5 + Math.random() * 2,
        color: c,
      }
    })

    const edges = {}
    function edgeKey(i, j) {
      return i < j ? i + "-" + j : j + "-" + i
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < -20) n.x = W + 20
        if (n.x > W + 20) n.x = -20
        if (n.y < -20) n.y = H + 20
        if (n.y > H + 20) n.y = -20
      }

      for (let i = 0; i < NUM; i++) {
        for (let j = i + 1; j < NUM; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          const key = edgeKey(i, j)
          const target = d < CONNECT_DIST ? 1 : 0
          if (!(key in edges)) edges[key] = 0
          edges[key] += (target - edges[key]) * 0.02

          if (edges[key] > 0.01) {
            const alpha = edges[key] * 0.18 * (1 - d / (CONNECT_DIST * 1.3))
            const ci = nodes[i].color
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(${ci[0]},${ci[1]},${ci[2]},${Math.max(0, alpha)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${n.color[0]},${n.color[1]},${n.color[2]},0.3)`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      if (animId) cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  )
}
