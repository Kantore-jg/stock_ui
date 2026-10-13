export function formatMoney(value, currency = 'BIF') {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat('fr-BI', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'BIF' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString('fr-FR')} ${currency}`
  }
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function initials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export function unwrapItem(payload) {
  if (!payload || typeof payload !== 'object') return payload
  if (payload.data && !Array.isArray(payload.data) && typeof payload.data === 'object') {
    return payload.data
  }
  return payload
}
