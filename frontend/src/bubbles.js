/**
 * Animated canvas background — floating golden semi-transparent circles.
 */
export function initBubbles(canvas) {
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  let bubbles = []
  let animId

  const COLORS = [
    'rgba(201, 168, 76, 0.10)',
    'rgba(201, 168, 76, 0.06)',
    'rgba(232, 201, 122, 0.08)',
    'rgba(160, 120, 48, 0.12)',
  ]

  function resize() {
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
  }

  function createBubble() {
    const r = 40 + Math.random() * 140
    return {
      x:    Math.random() * window.innerWidth,
      y:    window.innerHeight + r,
      r,
      vx:   (Math.random() - 0.5) * 0.4,
      vy:   -(0.25 + Math.random() * 0.55),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      // gentle wobble
      phase: Math.random() * Math.PI * 2,
      amp:   8 + Math.random() * 16,
      freq:  0.003 + Math.random() * 0.004,
    }
  }

  function spawn() {
    bubbles.push(createBubble())
  }

  // initial population
  for (let i = 0; i < 14; i++) {
    const b = createBubble()
    b.y = Math.random() * window.innerHeight // spread vertically at start
    bubbles.push(b)
  }

  let spawnTimer = 0

  function draw(ts) {
    animId = requestAnimationFrame(draw)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    spawnTimer++
    if (spawnTimer % 90 === 0 && bubbles.length < 20) spawn()

    bubbles = bubbles.filter(b => b.y + b.r > -50)

    for (const b of bubbles) {
      b.phase += b.freq
      b.x += b.vx + Math.sin(b.phase) * b.amp * 0.012
      b.y += b.vy

      ctx.beginPath()
      const grad = ctx.createRadialGradient(
        b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.1,
        b.x, b.y, b.r
      )
      grad.addColorStop(0, b.color.replace(/[\d.]+\)$/, v => `${Math.min(parseFloat(v) * 2, 1)})`))
      grad.addColorStop(1, 'transparent')

      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // subtle rim highlight
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.strokeStyle = b.color.replace(/[\d.]+\)$/, '0.25)')
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  }

  resize()
  window.addEventListener('resize', resize)
  animId = requestAnimationFrame(draw)

  return () => {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', resize)
  }
}
