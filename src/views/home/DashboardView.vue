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

function toLocalDateKey(value) {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDayKey(offsetFromToday = 0) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offsetFromToday)
  return toLocalDateKey(date)
}

function isCountedSale(sale) {
  return !['draft', 'cancelled'].includes(sale.status)
}

const todaySalesTotal = computed(() => {
  const today = localDayKey(0)
  return sales.value
    .filter((sale) => toLocalDateKey(sale.sale_date) === today && isCountedSale(sale))
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

const stockMoneyValue = computed(() =>
  stockItems.value.reduce((sum, item) => {
    const qty = Number(item.quantity_available ?? item.quantity_on_hand ?? 0)
    const price = Number(item.product?.selling_price || 0)
    return sum + qty * price
  }, 0),
)

const customerHint = computed(() => {
  const ids = new Set(sales.value.map((sale) => sale.customer_id).filter(Boolean))
  return ids.size
})

const expensesTotal = computed(() =>
  expenses.value.reduce((sum, item) => sum + Number(item.amount || 0), 0),
)

const chartPoints = computed(() => {
  const days = Array.from({ length: 7 }, (_, index) => localDayKey(index - 6))
  const totals = days.map((day) =>
    sales.value
      .filter((sale) => toLocalDateKey(sale.sale_date) === day && isCountedSale(sale))
      .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
  )
  const max = Math.max(...totals, 1)
  const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  return totals.map((value, index) => {
    const date = new Date(`${days[index]}T12:00:00`)
    return {
      key: days[index],
      label: labels[date.getDay()],
      dayNum: days[index].slice(8),
      value,
      height: value > 0 ? Math.max(12, Math.round((value / max) * 100)) : 4,
    }
  })
})

const chartHasData = computed(() => chartPoints.value.some((point) => point.value > 0))

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
    <!-- <header class="mb-5">
      <div class="flex items-center gap-3">
        <div class="flex size-11 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {{ firstName.slice(0, 1).toUpperCase() }}
        </div> -->
        <!-- <div>
          <p class="text-sm text-muted">Bonjour,</p>
          <h1 class="text-lg font-bold text-ink">{{ firstName }}</h1>
          <p class="text-xs text-muted">{{ stockName }}</p>
        </div> -->
      <!-- </div>
    </header> -->

    <div class="mb-5 grid grid-cols-2 gap-3">
      <AppCard class="!bg-success-600 !text-white !ring-0">
        <p class="text-xs text-white/80">Ventes du jour</p>
        <p class="mt-2 text-lg font-bold">{{ formatMoney(todaySalesTotal, currency) }}</p>
      </AppCard>
      <AppCard class="!bg-brand-600 !text-white !ring-0">
        <p class="text-xs text-white/80">Valeur du stock</p>
        <p class="mt-2 text-lg font-bold">{{ formatMoney(stockMoneyValue, currency) }}</p>
        <p class="mt-1 text-[11px] text-white/80">
          {{ productCount }} produit(s)
          <span v-if="lowStockCount"> · {{ lowStockCount }} faible</span>
        </p>
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
      <div class="flex h-36 items-end gap-2">
        <div
          v-for="point in chartPoints"
          :key="point.key"
          class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          :title="`${point.key} · ${formatMoney(point.value, currency)}`"
        >
          <span class="max-w-full truncate text-[9px] font-medium text-muted">
            {{ point.value > 0 ? formatMoney(point.value, currency).replace(/\s?BIF$/, '') : '' }}
          </span>
          <div class="flex w-full flex-1 items-end">
            <div
              class="w-full rounded-t-lg transition-all"
              :class="point.value > 0 ? 'bg-brand-500' : 'bg-gray-200'"
              :style="{ height: `${point.height}%` }"
            />
          </div>
          <span class="text-[10px] font-semibold text-ink">{{ point.label }}</span>
          <span class="text-[9px] text-muted">{{ point.dayNum }}</span>
        </div>
      </div>
      <p v-if="!chartHasData && !loading" class="mt-3 text-center text-xs text-muted">
        Aucune vente sur les 7 derniers jours
      </p>
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
