import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/services/auth'
import { getToken, setToken } from '@/services/http'
import { unwrapItem } from '@/utils/format'
import { useStockStore } from './stock'

const REMEMBER_KEY = 'stock_remember_email'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(getToken())
  const loading = ref(false)
  const bootstrapped = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value))
  const isSuperAdmin = computed(() => Boolean(user.value?.is_super_admin))
  const company = computed(() => user.value?.company || null)
  const currencyCode = computed(
    () => company.value?.default_currency?.code || company.value?.defaultCurrency?.code || 'BIF',
  )

  async function login({ email, password, remember }) {
    loading.value = true
    try {
      const response = await authApi.login({ email, password })
      token.value = response.token
      setToken(response.token)
      user.value = unwrapItem(response.user)
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
      useStockStore().syncFromUser(user.value)
      return user.value
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) {
      bootstrapped.value = true
      return null
    }
    try {
      const response = await authApi.me()
      user.value = unwrapItem(response)
      useStockStore().syncFromUser(user.value)
      return user.value
    } catch (error) {
      if (error.status === 401) {
        clearSession()
      }
      throw error
    } finally {
      bootstrapped.value = true
    }
  }

  async function logout() {
    try {
      if (token.value) await authApi.logout()
    } catch {
      // ignore network errors on logout
    } finally {
      clearSession()
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
    setToken(null)
    useStockStore().clear()
  }

  function rememberedEmail() {
    return localStorage.getItem(REMEMBER_KEY) || ''
  }

  return {
    user,
    token,
    loading,
    bootstrapped,
    isAuthenticated,
    isSuperAdmin,
    company,
    currencyCode,
    login,
    fetchMe,
    logout,
    clearSession,
    rememberedEmail,
  }
})
