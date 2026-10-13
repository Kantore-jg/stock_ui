import { http } from './http'

export const authApi = {
  login(payload) {
    return http.post('/api/auth/login', {
      email: payload.email,
      password: payload.password,
      device_name: payload.device_name || 'pwa-web',
    })
  },
  me() {
    return http.get('/api/auth/me')
  },
  logout() {
    return http.post('/api/auth/logout')
  },
}
