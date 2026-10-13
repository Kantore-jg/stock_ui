import { http } from './http'

export const cashRegistersApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/cash-registers${qs ? `?${qs}` : ''}`)
  },
  create(payload) {
    return http.post('/api/cash-registers', payload)
  },
  get(id) {
    return http.get(`/api/cash-registers/${id}`)
  },
}

export const cashSessionsApi = {
  list(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const qs = query.toString()
    return http.get(`/api/cash-sessions${qs ? `?${qs}` : ''}`)
  },
  get(id) {
    return http.get(`/api/cash-sessions/${id}`)
  },
  open(registerId, payload = {}) {
    return http.post(`/api/cash-registers/${registerId}/sessions`, payload)
  },
  close(sessionId, payload) {
    return http.post(`/api/cash-sessions/${sessionId}/close`, payload)
  },
  addMovement(sessionId, payload) {
    return http.post(`/api/cash-sessions/${sessionId}/movements`, payload)
  },
}
