/**
 * User activity tracker for Heatmaps.
 * Collects cursor positions, clicks, and page time, sending data every 1000ms.
 */

(function () {
  // Generate a random UUID for the session if not present
  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess-' + Math.random().toString(36).substring(2, 10)
    sessionStorage.setItem('analytics_session_id', sessionId)
  }

  const startTime = Date.now()
  let currentX = 0
  let currentY = 0
  let clicksQueue = []

  // Track mouse movement
  document.addEventListener('mousemove', (e) => {
    currentX = e.clientX
    currentY = e.clientY
  }, { passive: true })

  // Track clicks natively on interactive elements
  document.addEventListener('click', (e) => {
    // Only capture elements if they look like interactive targets (buttons, links)
    const target = e.target.closest('button, a, input, select') || e.target
    let identifier = target.getAttribute('id') || target.getAttribute('name')
    if (!identifier && target.textContent) {
      identifier = target.textContent.trim().substring(0, 30)
    }
    if (!identifier) identifier = target.tagName.toLowerCase()

    clicksQueue.push(identifier)
  }, { passive: true })

  // Send payload every second
  setInterval(() => {
    // We only send if window has focus to prevent spamming while user is AFK
    if (!document.hasFocus()) return

    const timeOnPage = Math.floor((Date.now() - startTime) / 1000)
    
    const payload = {
      session_id: sessionId,
      time_on_page: timeOnPage,
      cursor_x: currentX,
      cursor_y: currentY,
      window_width: window.innerWidth,
      window_height: window.innerHeight,
      clicks: clicksQueue.length > 0 ? clicksQueue : null
    }

    // Capture the current queue to clear it safely
    const sentClicksCount = clicksQueue.length

    // Send silently without blocking
    fetch('/api/v1/metrics/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Keepalive ensures request might finish even if page is closing
      keepalive: true 
    }).catch(() => {})

    // Clear only what we've sent
    clicksQueue = clicksQueue.slice(sentClicksCount)
    
  }, 1000)
})()
