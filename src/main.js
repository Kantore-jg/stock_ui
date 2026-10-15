import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useUiStore } from './stores/ui'
import './styles/main.css'

// En dev, désinscrire tout ancien Service Worker PWA (sinon Workbox spam la console
// et peut bloquer les modules Vite).
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister())
  })
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key))
    })
  }
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
useUiStore(pinia).applyTheme()
app.mount('#app')
