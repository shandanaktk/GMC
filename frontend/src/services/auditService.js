const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'MerchantAudit',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const message = typeof payload === 'object' ? payload.detail || payload.message : payload
    throw new ApiError(message || `Request failed (${response.status})`, response.status, payload)
  }
  return payload
}

async function download(path, fallbackFilename) {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include' })
  if (!response.ok) {
    let detail = `Download failed (${response.status})`
    try { detail = (await response.json()).detail || detail } catch { /* non-JSON upstream */ }
    throw new ApiError(detail, response.status)
  }
  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackFilename
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export const auditService = {
  signInWithGoogle(returnTo = '/dashboard') {
    window.location.assign(`${API_URL}/auth/google/start?return_to=${encodeURIComponent(returnTo)}`)
  },

  getDashboard() {
    return request('/dashboard')
  },

  async logout() {
    await request('/auth/logout', { method: 'POST' })
  },

  setAccount(merchantId) {
    return request(`/accounts/${encodeURIComponent(merchantId)}/select`, { method: 'PUT' })
  },

  async selectAccount(merchantId) {
    await this.setAccount(merchantId)
    return this.getDashboard()
  },

  async runAudit(onProgress) {
    const started = await request('/audits', { method: 'POST' })
    onProgress?.({ index: 0, label: started.label, percent: started.progress })
    for (;;) {
      await wait(900)
      const current = await request(`/audits/${started.id}`)
      onProgress?.({ index: Math.min(5, Math.floor(current.progress / 17)), label: current.label, percent: current.progress })
      if (current.status === 'failed') throw new ApiError(current.error || 'Audit failed', 502, current)
      if (current.status === 'completed') return this.getDashboard()
    }
  },

  requestSpecialist(details) {
    return request('/specialist-requests', { method: 'POST', body: JSON.stringify(details) })
  },

  exportProducts() {
    return download('/exports/products.csv', 'merchant-audit-products.csv')
  },

  downloadReport() {
    return download('/reports/current.pdf', 'merchant-audit-report.pdf')
  },

  sendClientReport(details) {
    return request('/client-reports/send', { method: 'POST', body: JSON.stringify(details) })
  },

  supportChat(message, history) {
    return request('/support/chat', { method: 'POST', body: JSON.stringify({ message, history }) })
  },
}
