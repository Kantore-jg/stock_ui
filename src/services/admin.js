import { http } from './http'

export const adminCompaniesApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/admin/companies${qs ? `?${qs}` : ''}`)
  },
  create(payload) {
    return http.post('/api/admin/companies', payload)
  },
  get(id) {
    return http.get(`/api/admin/companies/${id}`)
  },
  update(id, payload) {
    return http.put(`/api/admin/companies/${id}`, payload)
  },
}
