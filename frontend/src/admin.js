// Canvas background logic (reused for visual consistency)
import { initBubbles } from './bubbles.js'

document.addEventListener('DOMContentLoaded', async () => {
  const canvasEl = document.getElementById('bubbles-canvas')
  if (canvasEl) initBubbles(canvasEl)

  const token = localStorage.getItem('admin_token')
  
  if (token) {
    // Verify token
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        showDashboard(data.username)
        return
      } else {
        localStorage.removeItem('admin_token')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Not logged in or token invalid. Check if admin exists.
  try {
    const res = await fetch('/api/v1/auth/exists')
    const data = await res.json()
    renderAuthForm(data.exists)
  } catch (err) {
    console.error('Failed to check admin status:', err)
    document.getElementById('auth-dynamic-form').innerHTML = '<p class="error">Ошибка подключения к серверу</p>'
  }
})

function renderAuthForm(adminExists) {
  const container = document.getElementById('auth-dynamic-form')
  
  const title = adminExists ? 'Авторизация' : 'Регистрация первого администратора'
  const btnText = adminExists ? 'Войти' : 'Зарегистрироваться'
  
  container.innerHTML = `
    <h2 class="step-title" style="margin-bottom: 20px;">${title}</h2>
    <form id="auth-form">
      <div class="field">
        <label for="username">Логин (Имя пользователя)</label>
        <input id="username" name="username" type="text" required />
      </div>
      <div class="field" style="margin-bottom: 24px;">
        <label for="password">Пароль</label>
        <input id="password" name="password" type="password" required />
      </div>
      <div id="auth-error" class="error" style="color: #ff5a5a; font-size: 0.9rem; margin-bottom: 15px;" hidden></div>
      <div class="step-nav" style="justify-content: flex-end;">
        <button type="submit" class="btn-submit">
          <span class="btn-text">${btnText}</span>
        </button>
      </div>
    </form>
  `

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const errorDiv = document.getElementById('auth-error')
    errorDiv.hidden = true
    const formData = new FormData(e.target)
    
    // Convert to JSON for register, or keep as FormData for OAuth2 login
    
    if (adminExists) {
      // Login uses OAuth2PasswordRequestForm which is form-encoded
      const urlEncoded = new URLSearchParams()
      urlEncoded.append('username', formData.get('username'))
      urlEncoded.append('password', formData.get('password'))

      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: urlEncoded
        })
        
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || 'Ошибка авторизации')
        }
        
        const data = await res.json()
        localStorage.setItem('admin_token', data.access_token)
        window.location.reload()
        
      } catch (err) {
        errorDiv.textContent = err.message
        errorDiv.hidden = false
      }
    } else {
      // Register uses JSON
      const payload = Object.fromEntries(formData.entries())
      
      try {
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || 'Ошибка регистрации')
        }
        
        // After successful registration, reload to show login screen
        window.location.reload()
      } catch (err) {
        errorDiv.textContent = err.message
        errorDiv.hidden = false
      }
    }
  })
}

function showDashboard(username) {
  document.getElementById('auth-section').hidden = true
  const dash = document.getElementById('dashboard-section')
  dash.hidden = false
  
  document.getElementById('admin-username').textContent = `, ${username}`
  
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('admin_token')
    window.location.reload()
  })

  initTabs()
  loadConfigs()
  initConfigForm()
}

// --- Tabs Logic ---
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn')
  const tabContents = document.querySelectorAll('.tab-content')

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      tabBtns.forEach(b => b.classList.remove('active'))
      tabContents.forEach(c => {
        c.hidden = true
        c.classList.remove('active')
      })

      // Set active
      btn.classList.add('active')
      const targetId = btn.getAttribute('data-tab')
      const targetContent = document.getElementById(targetId)
      targetContent.hidden = false
      targetContent.classList.add('active')
    })
  })
}

// --- Config CRUD Logic ---

let configsMap = new Map()

async function loadConfigs() {
  const loader = document.getElementById('config-loader')
  const tbody = document.getElementById('config-table-body')
  
  loader.hidden = false
  tbody.innerHTML = ''
  
  try {
    const res = await fetch('/api/v1/admin/config/?only_active=false')
    if (!res.ok) throw new Error('Failed to fetch configs')
    const configs = await res.json()
    
    configsMap.clear()
    
    if (configs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Нет ни одной услуги</td></tr>'
    } else {
      configs.forEach(c => {
        configsMap.set(c.id, c)
        
        const tr = document.createElement('tr')
        tr.innerHTML = `
          <td>${c.id}</td>
          <td><strong>${c.service_name}</strong></td>
          <td><code>${c.service_slug}</code></td>
          <td>${c.budget_min.toLocaleString()} - ${c.budget_max.toLocaleString()} <br><small>Шаг: ${c.budget_step.toLocaleString()}</small></td>
          <td><span class="badge ${c.is_active ? 'active' : 'inactive'}">${c.is_active ? 'Да' : 'Нет'}</span></td>
          <td>
            <button class="btn-small" style="background: rgba(255,255,255,0.1); border:none; cursor:pointer; color:#fff;" onclick="editConfig(${c.id})">✏️</button>
            <button class="btn-small" style="background: rgba(255,90,90,0.2); border:none; cursor:pointer; color:#ff5a5a; margin-left:5px;" onclick="deleteConfig(${c.id})">🗑️</button>
          </td>
        `
        tbody.appendChild(tr)
      })
    }
  } catch (err) {
    console.error(err)
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Ошибка загрузки: ${err.message}</td></tr>`
  } finally {
    loader.hidden = true
  }
}

window.editConfig = function(id) {
  const c = configsMap.get(id)
  if (!c) return

  document.getElementById('form-config-title').textContent = 'Редактирование услуги #' + id
  document.getElementById('config_id').value = id
  document.getElementById('service_name').value = c.service_name
  document.getElementById('service_slug').value = c.service_slug
  document.getElementById('budget_min').value = c.budget_min
  document.getElementById('budget_max').value = c.budget_max
  document.getElementById('budget_step').value = c.budget_step
  document.getElementById('sort_order').value = c.sort_order
  document.getElementById('is_active').checked = c.is_active

  document.getElementById('btn-save-config').textContent = 'Сохранить изменения'
}

function initConfigForm() {
  const form = document.getElementById('config-form')
  const msgDiv = document.getElementById('config-form-msg')
  const resetBtn = document.getElementById('btn-reset-config')
  
  const resetForm = () => {
    form.reset()
    document.getElementById('config_id').value = ''
    document.getElementById('form-config-title').textContent = 'Новая услуга'
    document.getElementById('btn-save-config').textContent = 'Создать'
    msgDiv.textContent = ''
  }

  resetBtn.addEventListener('click', resetForm)

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    msgDiv.textContent = 'Сохранение...'
    msgDiv.style.color = 'var(--text-secondary)'
    
    const id = document.getElementById('config_id').value
    const payload = {
      service_name: document.getElementById('service_name').value,
      service_slug: document.getElementById('service_slug').value,
      budget_min: parseInt(document.getElementById('budget_min').value),
      budget_max: parseInt(document.getElementById('budget_max').value),
      budget_step: parseInt(document.getElementById('budget_step').value),
      sort_order: parseInt(document.getElementById('sort_order').value),
      is_active: document.getElementById('is_active').checked
    }

    const token = localStorage.getItem('admin_token')
    const url = id ? `/api/v1/admin/config/${id}` : '/api/v1/admin/config/'
    const method = id ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Неизвестная ошибка сервера')
      }

      msgDiv.textContent = id ? 'Изменения успешно сохранены!' : 'Новая услуга успешно создана!'
      msgDiv.style.color = '#2ed573'
      
      if (!id) resetForm()
      
      loadConfigs() // Refresh table
      
    } catch (err) {
      msgDiv.textContent = 'Ошибка: ' + err.message
      msgDiv.style.color = '#ff4757'
    }
  })
}

window.deleteConfig = async function(id) {
  if (!confirm('Вы уверены, что хотите удалить эту услугу? Это действие нельзя отменить.')) return

  const token = localStorage.getItem('admin_token')
  try {
    const res = await fetch(`/api/v1/admin/config/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Ошибка удаления')
    }

    // Если удалили ту же услугу, что сейчас редактируется в форме - сбросим форму
    if (document.getElementById('config_id').value == id) {
      document.getElementById('btn-reset-config').click()
    }
    
    loadConfigs()
  } catch (err) {
    alert('Ошибка при удалении: ' + err.message)
  }
}

/* ============================================================
   Analytics Dashboard modal logic
   ============================================================ */
const btnAnalytics = document.getElementById('btn-analytics')
const btnCloseAnalytics = document.getElementById('btn-close-analytics')
const analyticsModal = document.getElementById('analytics-modal')
const canvas = document.getElementById('heatmap-canvas')
const ctx = canvas ? canvas.getContext('2d') : null

if (btnAnalytics && btnCloseAnalytics && analyticsModal) {
  btnAnalytics.addEventListener('click', () => {
    analyticsModal.removeAttribute('hidden')
    loadAnalytics()
  })

  btnCloseAnalytics.addEventListener('click', () => {
    analyticsModal.setAttribute('hidden', 'true')
  })
}

async function loadAnalytics() {
  const token = localStorage.getItem('admin_token')
  if (!token) return

  try {
    const res = await fetch('/api/v1/metrics/analytics/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Ошибка загрузки статистики')
    const data = await res.json()

    // 1. Fill averages
    document.getElementById('stat-1d').textContent = `${Math.round(data.averages.day_1)} сек`
    document.getElementById('stat-7d').textContent = `${Math.round(data.averages.day_7)} сек`
    document.getElementById('stat-30d').textContent = `${Math.round(data.averages.day_30)} сек`

    // 2. Draw Heatmap
    if (ctx && data.heatmap) {
      drawHeatmap(data.heatmap)
    }
  } catch (err) {
    console.error(err)
    alert(err.message)
  }
}

function drawHeatmap(points) {
  // Determine bounds from points (minimum 1920x1080)
  let maxX = 1920
  let maxY = 1080
  for (let p of points) {
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  
  // Add symmetrical padding on all sides so circles aren't cropped at 0,0
  const pad = 120 
  canvas.width = maxX + pad * 2
  canvas.height = maxY + pad * 2
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Shift the origin so that a click at X=0 is drawn at X=120
  ctx.translate(pad, pad)

  // Glow composite to make overlapping sections brighter
  ctx.globalCompositeOperation = 'screen'

  // Determine max weight for color normalization
  let maxWeight = 1
  for (let p of points) {
    if (p.weight > maxWeight) maxWeight = p.weight
  }

  for (let p of points) {
    const intensity = Math.min(p.weight / maxWeight, 1)
    const radius = 60 + (intensity * 40) // 60px to 100px dots
    
    // Create radial gradient
    // High intensity = glowing orange/red. Low intensity = cool blue
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
    const r = Math.floor(50 + 205 * intensity)
    const g = Math.floor(100 + 50 * intensity)
    const b = Math.floor(250 * (1 - intensity))
    const alpha = 0.3 + (intensity * 0.5)

    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`)
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ============================================================
   CRM Leads Dashboard Logic
   ============================================================ */
const btnLeadsTab = document.querySelector('[data-tab="leads-tab"]')
const leadsTableBody = document.querySelector('#leads-table tbody')
const leadModal = document.getElementById('lead-modal')
const btnCloseLeadModal = document.getElementById('btn-close-lead-modal')

if (btnLeadsTab) {
  btnLeadsTab.addEventListener('click', () => {
    loadLeads()
  })
}

if (btnCloseLeadModal) {
  btnCloseLeadModal.addEventListener('click', () => {
    leadModal.setAttribute('hidden', 'true')
  })
}

async function loadLeads() {
  const token = localStorage.getItem('admin_token')
  if (!token) return

  try {
    const res = await fetch('/api/v1/leads/', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!res.ok) throw new Error('Ошибка загрузки заявок')
    
    const leads = await res.json()
    renderLeadsTable(leads)
  } catch (err) {
    console.error(err)
    leadsTableBody.innerHTML = `<tr><td colspan="6">Ошибка: ${err.message}</td></tr>`
  }
}

function renderLeadsTable(leads) {
  leadsTableBody.innerHTML = ''
  
  if (leads.length === 0) {
    leadsTableBody.innerHTML = '<tr><td colspan="6">Пока нет заявок</td></tr>'
    return
  }

  leads.forEach(lead => {
    const tr = document.createElement('tr')
    
    const score = lead.score_data || {}
    const temp = score.temperature || "Нет данных"
    
    // Style row based on priority
    let badgeClass = "badge-low"
    if (score.priority_level === 'high') badgeClass = "badge-high"
    else if (score.priority_level === 'medium') badgeClass = "badge-medium"
    
    tr.innerHTML = `
      <td>#${lead.id}</td>
      <td><span class="badge ${badgeClass}">${temp}</span></td>
      <td>${lead.first_name} ${lead.last_name || ''}</td>
      <td>${lead.company_size || '—'} / ${lead.role || '—'}</td>
      <td>${lead.task_deadline || '—'}</td>
      <td>
        <button class="btn-secondary btn-sm" onclick='openLeadModal(${JSON.stringify(lead).replace(/'/g, "&#39;")})'>Подробнее</button>
      </td>
    `
    leadsTableBody.appendChild(tr)
  })
}

window.openLeadModal = function(lead) {
  document.getElementById('lead-modal-id').textContent = lead.id
  
  const score = lead.score_data || {}
  document.getElementById('lead-modal-score').textContent = `${score.score}/100`
  document.getElementById('lead-modal-score').style.color = score.priority_level === 'high' ? 'red' : 'inherit'
  
  document.getElementById('lead-modal-recommendation').textContent = score.recommendation || '—'
  
  const body = document.getElementById('lead-modal-body')
  
  const fields = [
    { label: 'ФИО', value: `${lead.first_name} ${lead.last_name}` },
    { label: 'Email', value: lead.email },
    { label: 'Телефон', value: lead.phone },
    { label: 'Бизнес / Ниша', value: lead.business_niche },
    { label: 'Размер компании', value: lead.company_size },
    { label: 'Должность', value: lead.role },
    { label: 'Сроки задачи', value: lead.task_deadline },
    { label: 'Объем задачи', value: lead.task_volume },
    { label: 'Бюджет', value: lead.budget },
    { label: 'Связь', value: `${lead.preferred_contact || ''} (${lead.convenient_time || ''})` },
    { label: 'Комментарий', value: lead.comments, fullSpan: true },
    { label: 'Дата заявки', value: new Date(lead.created_at).toLocaleString() }
  ]
  
  body.innerHTML = fields.map(f => {
    let val = f.value || '—'
    return `
      <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); ${f.fullSpan ? 'grid-column: 1 / -1;' : ''}">
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.3rem;">${f.label}</div>
        <div style="font-size: 1rem; color: var(--text-color);">${val}</div>
      </div>
    `
  }).join('')
  
  leadModal.removeAttribute('hidden')
}
