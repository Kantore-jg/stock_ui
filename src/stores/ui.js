import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const toast = ref(null)
  let timer = null

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

  return { toast, notify, success, error }
})
