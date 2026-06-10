"use client"

import { useEffect, useRef, useState } from "react"

type Bokeh = {
  x: number
  y: number
  radius: number
  baseOpacity: number
  hue: number
  driftX: number
  driftY: number
  phase: number
  speed: number
}

export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const target = useRef({ x: 0, y: 0 })
  const smooth = useRef({ x: 0, y: 0 })
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      target.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      }
    }
    window.addEventListener("pointermove", handleMove)
    return () => window.removeEventListener("pointermove", handleMove)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0, height = 0, dpr = 1
    let bokehs: Bokeh[] = []

    const buildBokehs = () => {
      const count = Math.min(46, Math.floor((width * height) / 32000))
      bokehs = Array.from({ length: count }).map(() => {
        const radius = 14 + Math.random() * 70
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          baseOpacity: 0.04 + Math.random() * 0.16,
          hue: 28 + Math.random() * 22,
          driftX: (Math.random() - 0.5) * 0.18,
          driftY: -0.05 - Math.random() * 0.22,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.8,
        }
      })
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildBokehs()
    }
    resize()
    window.addEventListener("resize", resize)

    let raf = 0, t = 0
    const render = () => {
      t += 0.006
      smooth.current.x += (target.current.x - smooth.current.x) * 0.05
      smooth.current.y += (target.current.y - smooth.current.y) * 0.05
      setParallax({ x: smooth.current.x, y: smooth.current.y })

      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = "lighter"

      const mx = (smooth.current.x * 0.5 + 0.5) * width
      const my = (smooth.current.y * 0.5 + 0.5) * height

      for (const b of bokehs) {
        b.x += b.driftX * b.speed
        b.y += b.driftY * b.speed
        if (b.y + b.radius < 0) b.y = height + b.radius
        if (b.x - b.radius > width) b.x = -b.radius
        if (b.x + b.radius < 0) b.x = width + b.radius

        const dx = b.x - mx, dy = b.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const proximity = Math.max(0, 1 - dist / 360)
        const flicker = 0.5 + 0.5 * Math.sin(t * b.speed * 3 + b.phase)
        const opacity = b.baseOpacity * (0.6 + flicker * 0.4) + proximity * 0.22

        const depth = b.radius / 84
        const ox = -smooth.current.x * 26 * depth
        const oy = -smooth.current.y * 26 * depth
        const gx = b.x + ox, gy = b.y + oy

        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, b.radius)
        grad.addColorStop(0, `hsla(${b.hue}, 85%, 66%, ${opacity})`)
        grad.addColorStop(0.5, `hsla(${b.hue}, 80%, 55%, ${opacity * 0.4})`)
        grad.addColorStop(1, "hsla(30, 80%, 50%, 0)")
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(gx, gy, b.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      const lightGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 420)
      lightGrad.addColorStop(0, "hsla(40, 90%, 60%, 0.10)")
      lightGrad.addColorStop(1, "hsla(40, 90%, 60%, 0)")
      ctx.fillStyle = lightGrad
      ctx.fillRect(0, 0, width, height)

      ctx.globalCompositeOperation = "source-over"
      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  const layer = (depth: number) => ({
    transform: `translate3d(${-parallax.x * depth}px, ${-parallax.y * depth}px, 0) scale(1.08)`,
  })

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
        {/* фото комнаты — приглушённое */}
<div
  className="absolute inset-0 bg-cover bg-center"
  style={{
    backgroundImage: "url(/images/bg-room.png)",
    opacity: 0.35,
  }}
  aria-hidden="true"
/>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(130% 110% at 50% 45%, transparent 45%, oklch(0.16 0.018 56 / 0.35) 85%, oklch(0.13 0.015 50 / 0.7) 100%)",
        }}
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: "linear-gradient(to bottom, transparent, oklch(0.14 0.016 52 / 0.6))",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />
    </div>
  )
}