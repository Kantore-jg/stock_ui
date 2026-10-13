import { http } from './http'

export const salesApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/sales${qs ? `?${qs}` : ''}`)
  },
  get(id) {
    return http.get(`/api/sales/${id}`)
  },
  create(payload) {
    return http.post('/api/sales', payload)
  },
  update(id, payload) {
    return http.put(`/api/sales/${id}`, payload)
  },
  validate(id) {
    return http.post(`/api/sales/${id}/validate`)
  },
  cancel(id, payload) {
    return http.post(`/api/sales/${id}/cancel`, payload)
  },
  addPayment(saleId, payload) {
    return http.post(`/api/sales/${saleId}/payments`, payload)
  },
}

export const invoicesApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/invoices${qs ? `?${qs}` : ''}`)
  },
  get(id) {
    return http.get(`/api/invoices/${id}`)
  },
}

export const paymentsApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/payments${qs ? `?${qs}` : ''}`)
  },
}

export const paymentMethodsApi = {
  list() {
    return http.get('/api/payment-methods')
  },
}
