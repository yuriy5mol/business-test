/**
 * Multi-step form — navigation, validation, API submission.
 */
export function initForm() {
  const form        = document.getElementById('lead-form')
  const panels      = [...document.querySelectorAll('.step-panel')]
  const stepBtns    = [...document.querySelectorAll('.step')]
  const stepLines   = [...document.querySelectorAll('.step-line')]
  const stateOk     = document.getElementById('state-success')
  const stateErr    = document.getElementById('state-error')
  const errText     = document.getElementById('error-text')
  const btnReset    = document.getElementById('btn-reset')
  const btnRetry    = document.getElementById('btn-retry')
  const budgetInput = document.getElementById('budget')
  const budgetLabel = document.getElementById('budget-label')
  const servicesCont = document.getElementById('services-container')

  let availableServices = []
  let selectedService  = null

  // --- Services loading ---
  async function loadServices() {
    try {
      const res = await fetch('/api/v1/admin/config/')
      if (!res.ok) throw new Error('Failed to load services')
      availableServices = await res.json()
      renderServices()
    } catch (err) {
      console.error(err)
      if (servicesCont) servicesCont.innerHTML = '<p class="error">Не удалось загрузить услуги :(</p>'
    }
  }

  function renderServices() {
    if (!servicesCont) return
    const select = document.getElementById('service_id')
    if (!select) return

    select.innerHTML = '<option value="">— выберите услугу —</option>'

    if (availableServices.length === 0) {
      select.innerHTML = '<option value="">Услуги временно недоступны</option>'
      return
    }

    availableServices.forEach(s => {
      const opt = document.createElement('option')
      opt.value = s.id
      opt.textContent = s.service_name
      select.appendChild(opt)
    })

    select.addEventListener('change', () => {
      const sid = +select.value
      selectedService = availableServices.find(s => s.id === sid)
      if (selectedService) {
        updateSliderRanges(selectedService)
      }
    })
  }

  function updateSliderRanges(service) {
    if (!budgetInput) return
    budgetInput.min = service.budget_min
    budgetInput.max = service.budget_max
    budgetInput.step = service.budget_step
    // reset value to min if current is out of bounds
    if (+budgetInput.value < service.budget_min) budgetInput.value = service.budget_min
    if (+budgetInput.value > service.budget_max) budgetInput.value = service.budget_max
    updateSlider()
  }

  // --- Budget slider ---
  function updateSlider() {
    const min = +budgetInput.min
    const max = +budgetInput.max
    const val = +budgetInput.value
    const pct = ((val - min) / (max - min) * 100).toFixed(1)
    budgetInput.style.setProperty('--pct', pct + '%')
    budgetLabel.textContent = val.toLocaleString('ru-RU') + ' ₽'
    budgetInput.setAttribute('aria-valuenow', val)
  }
  budgetInput?.addEventListener('input', updateSlider)
  updateSlider()

  // --- Step navigation ---
  let currentStep = 1

  function goToStep(n) {
    panels.forEach(p => p.classList.remove('active'))
    stepBtns.forEach((b, i) => {
      b.classList.toggle('active', i + 1 === n)
      b.classList.toggle('done',   i + 1 < n)
    })
    stepLines.forEach((l, i) => l.classList.toggle('done', i + 1 < n))
    const panel = document.querySelector(`[data-panel="${n}"]`)
    if (panel) panel.classList.add('active')
    currentStep = n
  }

  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = +btn.dataset.goto
      if (target > currentStep) {
        // validate current panel before advancing
        const panel = document.querySelector(`[data-panel="${currentStep}"]`)
        if (!validatePanel(panel)) return
      }
      goToStep(target)
    })
  })

  stepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = +btn.dataset.step
      if (target < currentStep) goToStep(target)
    })
  })

  // --- Validation ---
  function validatePanel(panel) {
    let ok = true
    panel.querySelectorAll('[required]').forEach(input => {
      input.classList.remove('invalid')
      if (!input.value.trim()) {
        input.classList.add('invalid')
        ok = false
        input.focus()
      }
    })
    return ok
  }

  // --- Collect data ---
  function collectData() {
    const fd = new FormData(form)
    const data = {}
    fd.forEach((v, k) => { if (v !== '' && k !== 'service_id') data[k] = v })

    // service_id as int
    const sid = fd.get('service_id')
    if (sid) data.service_id = parseInt(sid)

    // budget as string from slider
    if (budgetInput) data.budget = budgetInput.value + ' ₽'
    return data
  }

  // --- Submit ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const panel = document.querySelector(`[data-panel="${currentStep}"]`)
    if (!validatePanel(panel)) return

    const submitBtn = document.getElementById('submit-btn')
    const btnText   = submitBtn.querySelector('.btn-text')
    const btnLoader = submitBtn.querySelector('.btn-loader')

    submitBtn.disabled = true
    btnText.hidden     = true
    btnLoader.hidden   = false

    const leadData = collectData()

    try {
      const res = await fetch('/api/v1/leads/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      const lead = await res.json()

      // send metrics in background (non-blocking)
      sendMetrics(lead.id).catch(() => {})

      showState('success')
    } catch (err) {
      errText.textContent = err.message || 'Неизвестная ошибка. Попробуйте снова.'
      showState('error')
    } finally {
      submitBtn.disabled = false
      btnText.hidden     = false
      btnLoader.hidden   = true
    }
  })

  // --- State helpers ---
  function showState(state) {
    form.hidden         = true
    document.querySelector('.steps').hidden = true
    stateOk.hidden = state !== 'success'
    stateErr.hidden = state !== 'error'
  }

  function resetForm() {
    form.reset()
    updateSlider()
    form.hidden = false
    document.querySelector('.steps').hidden = false
    stateOk.hidden = true
    stateErr.hidden = true
    goToStep(1)
  }

  btnReset?.addEventListener('click', resetForm)
  btnRetry?.addEventListener('click', () => {
    stateErr.hidden = true
    form.hidden = false
    document.querySelector('.steps').hidden = false
  })

  // --- Metrics helper (imported from metrics.js via window) ---
  async function sendMetrics(leadId) {
    const metrics = window.__leadMetrics || {}
    await fetch('/api/v1/metrics/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, ...metrics }),
    })
  }

  // Initial load
  loadServices()
}
