import { http } from './http'

export const productsApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/products${qs ? `?${qs}` : ''}`)
  },
  get(id) {
    return http.get(`/api/products/${id}`)
  },
  create(payload) {
    return http.post('/api/products', payload)
  },
  update(id, payload) {
    return http.put(`/api/products/${id}`, payload)
  },
  remove(id) {
    return http.delete(`/api/products/${id}`)
  },
}

export const categoriesApi = {
  list() {
    return http.get('/api/categories')
  },
}

export const unitsApi = {
  list() {
    return http.get('/api/units')
  },
}

export const labelsApi = {
  list() {
    return http.get('/api/product-labels')
  },
}
