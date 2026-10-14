import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const THEME_KEY = 'stock-theme'
const THEME_OPTIONS = ['light', 'dark', 'system']

function readStoredTheme() {
  const value = localStorage.getItem(THEME_KEY)
  return THEME_OPTIONS.includes(value) ? value : 'system'
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(preference) {
  if (preference === 'system') {
    return systemPrefersDark() ? 'dark' : 'light'
  }
  return preference
}

function applyDocumentTheme(preference) {
  const resolved = resolveTheme(preference)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#2563eb')
  }
}

export const useUiStore = defineStore('ui', () => {
  const toast = ref(null)
  const theme = ref(readStoredTheme())
  let timer = null

  const resolvedTheme = computed(() => resolveTheme(theme.value))

  function notify(message, type = 'info') {
    toast.value = { message, type, id: Date.now() }
    clearTimeout(timer)
    timer = setTimeout(() => {
      toast.value = null
    }, 3200)
  }

  function success(message) {
    notify(message, 'success')
  }

  function error(message) {
    notify(message, 'error')
  }

  function applyTheme() {
    applyDocumentTheme(theme.value)
  }

  function setTheme(value) {
    if (!THEME_OPTIONS.includes(value)) return
    theme.value = value
    localStorage.setItem(THEME_KEY, value)
    applyTheme()
  }

  applyTheme()

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') applyTheme()
    })
  }

  return {
    toast,
    theme,
    resolvedTheme,
    notify,
    success,
    error,
    setTheme,
    applyTheme,
  }
})
