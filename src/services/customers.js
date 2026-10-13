import { http } from './http'

export const customersApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/customers${qs ? `?${qs}` : ''}`)
  },
  get(id) {
    return http.get(`/api/customers/${id}`)
  },
  create(payload) {
    return http.post('/api/customers', payload)
  },
  update(id, payload) {
    return http.put(`/api/customers/${id}`, payload)
  },
  remove(id) {
    return http.delete(`/api/customers/${id}`)
  },
}
