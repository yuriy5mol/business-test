/**
 * Passive behaviour metrics collector.
 * Tracks: time on page, button clicks, hover zones, return visits.
 * Stores results in window.__leadMetrics for form.js to read on submit.
 */
export function initMetrics() {
  const startTime   = Date.now()
  const clicks      = {}
  const hovers      = {}
  let   returnVisits = +(sessionStorage.getItem('rv') || 0)

  // track return visits within session
  returnVisits++
  sessionStorage.setItem('rv', returnVisits)

  // --- Click tracking ---
  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, input, select, a, [data-track]')
    if (!el) return
    const key = el.id || el.dataset.track || el.tagName.toLowerCase()
    clicks[key] = (clicks[key] || 0) + 1
  }, { passive: true })

  // --- Hover / dwell tracking ---
  const TRACKED_ZONES = ['#lead-form', '.form-card', '.page-header']
  const timers = {}

  TRACKED_ZONES.forEach(selector => {
    const el = document.querySelector(selector)
    if (!el) return
    el.addEventListener('mouseenter', () => {
      timers[selector] = Date.now()
    }, { passive: true })
    el.addEventListener('mouseleave', () => {
      if (timers[selector]) {
        hovers[selector] = (hovers[selector] || 0) + (Date.now() - timers[selector])
        delete timers[selector]
      }
    }, { passive: true })
  })

  // --- Publish to window on page hide / before submit ---
  function publish() {
    const timeOnPage = Math.round((Date.now() - startTime) / 1000)
    window.__leadMetrics = {
      time_on_page:  timeOnPage,
      button_clicks: Object.entries(clicks).map(([element, count]) => ({ element, count })),
      hover_zones:   Object.entries(hovers).map(([zone, ms]) => ({ zone, seconds: Math.round(ms / 1000) })),
      return_visits: returnVisits,
    }
  }

  document.addEventListener('visibilitychange', publish, { passive: true })
  window.addEventListener('pagehide', publish, { passive: true })
  // also publish every 10 s so submit always has fresh data
  setInterval(publish, 10_000)
  publish()
}
