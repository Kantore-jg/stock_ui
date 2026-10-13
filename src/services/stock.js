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
}
