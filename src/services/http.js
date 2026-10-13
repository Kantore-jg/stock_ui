const TOKEN_KEY = 'stock_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

function resolveUrl(path) {
  if (path.startsWith('http')) return path
  const base = import.meta.env.VITE_API_URL || ''
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

export class ApiError extends Error {
  constructor(message, { status, errors, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors || {}
    this.data = data
  }
}

export async function api(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...options.headers,
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(resolveUrl(path), {
    ...options,
    headers,
    body:
      options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await response.json().catch(() => null) : await response.text()

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      (response.status === 401 ? 'Session expirée.' : 'Une erreur est survenue.')
    throw new ApiError(message, {
      status: response.status,
      errors: data?.errors,
      data,
    })
  }

  return data
}

export const http = {
  get: (path, options) => api(path, { ...options, method: 'GET' }),
  post: (path, body, options) => api(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => api(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => api(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => api(path, { ...options, method: 'DELETE' }),
}
