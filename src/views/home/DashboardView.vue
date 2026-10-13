<script setup>
import { computed, onMounted, ref } from 'vue'
import AppCard from '@/components/ui/AppCard.vue'
import { expensesApi } from '@/services/expenses'
import { salesApi } from '@/services/sales'
import { stocksApi } from '@/services/stock'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { formatDateTime, formatMoney, unwrapList } from '@/utils/format'

const auth = useAuthStore()
const stockStore = useStockStore()

const loading = ref(true)
const sales = ref([])
const expenses = ref([])
const stockItems = ref([])

const firstName = computed(() => auth.user?.name?.split(' ')[0] || 'Utilisateur')
const stockName = computed(() => stockStore.currentStock?.name || 'Aucun magasin')
const currency = computed(() => auth.currencyCode)

const todaySalesTotal = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return sales.value
    .filter(
      (sale) =>
        String(sale.sale_date || '').startsWith(today) &&
        !['draft', 'cancelled'].includes(sale.status),
    )
    .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0)
})

const productCount = computed(() => stockItems.value.length)
const lowStockCount = computed(
  () =>
    stockItems.value.filter((item) => {
      const qty = Number(item.quantity_available ?? item.quantity_on_hand ?? 0)
      const min = Number(item.product?.min_stock_level ?? 0)
      return qty <= min
    }).length,
)

const customerHint = computed(() => {
  const ids = new Set(sales.value.map((sale) => sale.customer_id).filter(Boolean))
  return ids.size
})

const expensesTotal = computed(() =>
  expenses.value.reduce((sum, item) => sum + Number(item.amount || 0), 0),
)

const chartPoints = computed(() => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return date.toISOString().slice(0, 10)
  })
  const totals = days.map((day) =>
    sales.value
      .filter(
        (sale) =>
          String(sale.sale_date || '').startsWith(day) &&
          !['draft', 'cancelled'].includes(sale.status),
      )
      .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
  )
  const max = Math.max(...totals, 1)
  return totals.map((value, index) => ({
    day: days[index].slice(8),
    value,
    height: Math.max(8, Math.round((value / max) * 100)),
  }))
})

const recent = computed(() => {
  const saleRows = sales.value.slice(0, 5).map((sale) => ({
    id: `sale-${sale.id}`,
    label: sale.customer?.name || sale.invoice_number || `Vente #${sale.id}`,
    type: 'Vente',
    tone: 'success',
    amount: Number(sale.total_amount || 0),
    at: sale.validated_at || sale.sale_date || sale.created_at,
  }))
  const expenseRows = expenses.value.slice(0, 5).map((expense) => ({
    id: `exp-${expense.id}`,
    label: expense.description || expense.category?.name || expense.reference || 'Dépense',
    type: 'Dépense',
    tone: 'danger',
    amount: -Number(expense.amount || 0),
    at: expense.expense_date || expense.created_at,
  }))
  return [...saleRows, ...expenseRows]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6)
})

async function load() {
  loading.value = true
  try {
    const [salesRes, expensesRes, itemsRes] = await Promise.all([
      salesApi.list({ per_page: 50 }),
      expensesApi.list({ per_page: 50 }),
      stockStore.currentStockId
        ? stocksApi.itemsByStock(stockStore.currentStockId)
        : stocksApi.items(),
    ])
    sales.value = unwrapList(salesRes)
    expenses.value = unwrapList(expensesRes)
    stockItems.value = unwrapList(itemsRes)
  } catch {
    sales.value = []
    expenses.value = []
    stockItems.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <header class="mb-5 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex size-11 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {{ firstName.slice(0, 1).toUpperCase() }}
        </div>
        <div>
          <p class="text-sm text-muted">Bonjour,</p>
          <h1 class="text-lg font-bold text-ink">{{ firstName }}</h1>
          <p class="text-xs text-muted">{{ stockName }}</p>
        </div>
      </div>
      <button type="button" class="flex size-10 items-center justify-center rounded-full bg-white text-ink shadow-sm ring-1 ring-black/5">
        <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" />
        </svg>
      </button>
    </header>

    <div class="mb-5 grid grid-cols-2 gap-3">
      <AppCard class="!bg-success-600 !text-white !ring-0">
        <p class="text-xs text-white/80">Ventes du jour</p>
        <p class="mt-2 text-lg font-bold">{{ formatMoney(todaySalesTotal, currency) }}</p>
      </AppCard>
      <AppCard class="!bg-brand-600 !text-white !ring-0">
        <p class="text-xs text-white/80">Produits en stock</p>
        <p class="mt-2 text-lg font-bold">{{ productCount }}</p>
        <p v-if="lowStockCount" class="mt-1 text-[11px] text-white/80">{{ lowStockCount }} stock faible</p>
      </AppCard>
      <AppCard class="!bg-warning-500 !text-white !ring-0">
        <p class="text-xs text-white/80">Clients actifs</p>
        <p class="mt-2 text-lg font-bold">{{ customerHint }}</p>
      </AppCard>
      <AppCard class="!bg-danger-600 !text-white !ring-0">
        <p class="text-xs text-white/80">Dépenses</p>
        <p class="mt-2 text-lg font-bold">{{ formatMoney(expensesTotal, currency) }}</p>
      </AppCard>
    </div>

    <AppCard class="mb-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-semibold text-ink">Évolution des ventes</h2>
        <span class="text-xs text-muted">7 jours</span>
      </div>
      <div class="flex h-32 items-end gap-2">
        <div v-for="point in chartPoints" :key="point.day" class="flex flex-1 flex-col items-center gap-2">
          <div class="w-full rounded-t-lg bg-brand-500/90" :style="{ height: `${point.height}%` }" />
          <span class="text-[10px] text-muted">{{ point.day }}</span>
        </div>
      </div>
    </AppCard>

    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-semibold text-ink">Dernières transactions</h2>
      <span v-if="loading" class="text-xs text-muted">Chargement…</span>
    </div>
    <div class="space-y-2">
      <AppCard v-for="item in recent" :key="item.id" class="!p-3">
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 items-center justify-center rounded-full"
            :class="item.tone === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'"
          >
            <span class="text-sm font-bold">{{ item.tone === 'success' ? '+' : '−' }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-ink">{{ item.label }}</p>
            <p class="text-xs text-muted">{{ item.type }} · {{ formatDateTime(item.at) }}</p>
          </div>
          <p
            class="text-sm font-semibold"
            :class="item.amount >= 0 ? 'text-success-700' : 'text-danger-600'"
          >
            {{ formatMoney(item.amount, currency) }}
          </p>
        </div>
      </AppCard>
      <p v-if="!loading && !recent.length" class="py-8 text-center text-sm text-muted">
        Aucune transaction récente
      </p>
    </div>
  </div>
</template>
