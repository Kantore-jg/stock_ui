import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STOCK_KEY = 'stock_current_id'

export const useStockStore = defineStore('stock', () => {
  const stocks = ref([])
  const currentStockId = ref(
    localStorage.getItem(STOCK_KEY) ? Number(localStorage.getItem(STOCK_KEY)) : null,
  )

  const currentStock = computed(
    () => stocks.value.find((item) => item.id === currentStockId.value) || stocks.value[0] || null,
  )

  function syncFromUser(user) {
    const list = Array.isArray(user?.stocks) ? user.stocks : []
    stocks.value = list
    if (!list.length) {
      currentStockId.value = null
      localStorage.removeItem(STOCK_KEY)
      return
    }
    const preferred =
      list.find((item) => item.pivot?.is_default) ||
      list.find((item) => item.id === currentStockId.value) ||
      list[0]
    setCurrentStock(preferred.id)
  }

  function setCurrentStock(id) {
    currentStockId.value = Number(id)
    localStorage.setItem(STOCK_KEY, String(id))
  }

  function clear() {
    stocks.value = []
    currentStockId.value = null
    localStorage.removeItem(STOCK_KEY)
  }

  return {
    stocks,
    currentStockId,
    currentStock,
    syncFromUser,
    setCurrentStock,
    clear,
  }
})
