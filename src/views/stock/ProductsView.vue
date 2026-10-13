<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppFab from '@/components/ui/AppFab.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import { productsApi } from '@/services/products'
import { stocksApi } from '@/services/stock'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'
import { formatMoney, unwrapList } from '@/utils/format'

const auth = useAuthStore()
const stockStore = useStockStore()
const ui = useUiStore()
const router = useRouter()

const search = ref('')
const filter = ref('all')
const loading = ref(true)
const products = ref([])
const qtyByProduct = ref({})

const filters = [
  { id: 'all', label: 'Tous' },
  { id: 'in_stock', label: 'En stock' },
  { id: 'low', label: 'Stock faible' },
  { id: 'out', label: 'Rupture' },
]

const filtered = computed(() =>
  products.value.filter((product) => {
    const qty = Number(qtyByProduct.value[product.id] ?? 0)
    const min = Number(product.min_stock_level ?? 0)
    if (filter.value === 'in_stock') return qty > min
    if (filter.value === 'low') return qty > 0 && qty <= min
    if (filter.value === 'out') return qty <= 0
    return true
  }),
)

function stockTone(product) {
  const qty = Number(qtyByProduct.value[product.id] ?? 0)
  const min = Number(product.min_stock_level ?? 0)
  if (qty <= 0) return 'danger'
  if (qty <= min) return 'warning'
  return 'success'
}

function stockLabel(product) {
  const qty = Number(qtyByProduct.value[product.id] ?? 0)
  if (qty <= 0) return 'Rupture'
  if (qty <= Number(product.min_stock_level ?? 0)) return `Faible (${qty})`
  return `En stock (${qty})`
}

async function load() {
  loading.value = true
  try {
    const [productsRes, itemsRes] = await Promise.all([
      productsApi.list({ search: search.value, per_page: 50 }),
      stockStore.currentStockId
        ? stocksApi.itemsByStock(stockStore.currentStockId)
        : stocksApi.items(),
    ])
    products.value = unwrapList(productsRes)
    const map = {}
    unwrapList(itemsRes).forEach((item) => {
      map[item.product_id] = Number(item.quantity_available ?? item.quantity_on_hand ?? 0)
    })
    qtyByProduct.value = map
  } catch (error) {
    ui.error(error.message || 'Impossible de charger les produits')
  } finally {
    loading.value = false
  }
}

let timer
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 300)
})

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="Produits" :subtitle="stockStore.currentStock?.name || 'Catalogue'">
      <template #actions>
        <RouterLink
          :to="{ name: 'movements' }"
          class="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-brand-700 ring-1 ring-black/5"
        >
          Mouvements
        </RouterLink>
      </template>
    </PageHeader>

    <SearchBar v-model="search" placeholder="Rechercher un produit…" show-scan class="mb-3" />

    <div class="mb-4 flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="item in filters"
        :key="item.id"
        type="button"
        class="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
        :class="filter === item.id ? 'bg-brand-600 text-white' : 'bg-white text-muted ring-1 ring-black/5'"
        @click="filter = item.id"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="space-y-3">
      <AppCard
        v-for="product in filtered"
        :key="product.id"
        class="!p-3 cursor-pointer"
        @click="router.push({ name: 'product-detail', params: { id: product.id } })"
      >
        <div class="flex gap-3">
          <div class="flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 8-9-5-9 5v8l9 5 9-5V8Z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate font-semibold text-ink">{{ product.name }}</p>
                <p class="text-xs text-muted">{{ product.sku }} · {{ product.category?.name || 'Sans catégorie' }}</p>
              </div>
              <AppBadge :tone="stockTone(product)">{{ stockLabel(product) }}</AppBadge>
            </div>
            <p class="mt-2 text-sm font-bold text-brand-700">
              {{ formatMoney(product.selling_price, auth.currencyCode) }}
            </p>
          </div>
        </div>
      </AppCard>

      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="!filtered.length" class="py-10 text-center text-sm text-muted">Aucun produit</p>
    </div>

    <AppFab :to="{ name: 'product-detail', params: { id: 'new' } }" />
  </div>
</template>
