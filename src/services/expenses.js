import { http } from './http'

export const expensesApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/expenses${qs ? `?${qs}` : ''}`)
  },
  get(id) {
    return http.get(`/api/expenses/${id}`)
  },
  create(payload) {
    return http.post('/api/expenses', payload)
  },
  validate(id) {
    return http.post(`/api/expenses/${id}/validate`)
  },
  cancel(id) {
    return http.post(`/api/expenses/${id}/cancel`)
  },
}

export const expenseCategoriesApi = {
  list() {
    return http.get('/api/expense-categories')
  },
}
