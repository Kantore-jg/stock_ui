import { http } from './http'

export const stocksApi = {
  list() {
    return http.get('/api/stocks')
  },
  items(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/stock-items${qs ? `?${qs}` : ''}`)
  },
  itemsByStock(stockId) {
    return http.get(`/api/stocks/${stockId}/items`)
  },
}

export const movementsApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/stock-movements${qs ? `?${qs}` : ''}`)
  },
  get(id) {
    return http.get(`/api/stock-movements/${id}`)
  },
  create(payload) {
    return http.post('/api/stock-movements', payload)
  },
  validate(id) {
    return http.post(`/api/stock-movements/${id}/validate`)
  },
  cancel(id, payload = {}) {
    return http.post(`/api/stock-movements/${id}/cancel`, payload)
  },
}

export const MOVEMENT_TYPES = {
  entry: {
    value: 'entry',
    label: 'Entrée multiple',
    short: 'Entrée',
    hint: 'Ajouter des produits au stock',
    tone: 'success',
  },
  exit: {
    value: 'exit',
    label: 'Sortie multiple',
    short: 'Sortie',
    hint: 'Retirer des produits du stock',
    tone: 'danger',
  },
  transfer_out: {
    value: 'transfer_out',
    label: 'Transfert',
    short: 'Transfert',
    hint: 'Déplacer entre magasins',
    tone: 'brand',
  },
  initial_entry: {
    value: 'initial_entry',
    label: 'Entrée initiale',
    short: 'Initiale',
    hint: 'Stock de démarrage',
    tone: 'success',
  },
  adjustment: {
    value: 'adjustment',
    label: 'Ajustement',
    short: 'Ajustement',
    hint: 'Corriger une quantité',
    tone: 'warning',
  },
}

export function movementTypeLabel(type) {
  const map = {
    entry: 'Entrée',
    initial_entry: 'Entrée initiale',
    exit: 'Sortie',
    transfer_out: 'Transfert',
    transfer_in: 'Transfert entrant',
    adjustment: 'Ajustement',
    sale: 'Vente',
    sale_return: 'Retour vente',
  }
  return map[type] || type
}

export function isOutboundType(type) {
  return ['exit', 'transfer_out', 'sale'].includes(String(type || ''))
}
