import './style.css'
import { initBubbles } from './bubbles.js'
import { initForm } from './form.js'
import { initMetrics } from './metrics.js'

initBubbles(document.getElementById('bubbles-canvas'))
initForm()
initMetrics()
