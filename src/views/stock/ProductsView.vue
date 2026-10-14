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
const view = ref('catalog') // catalog = disponibles | stock = en stock
const stockFilter = ref('all')
const loading = ref(true)
const products = ref([])
const qtyByProduct = ref({})

const stockFilters = [
  { id: 'all', label: 'Tous' },
  { id: 'ok', label: 'OK' },
  { id: 'low', label: 'Faible' },
  { id: 'out', label: 'Rupture' },
]

function qtyOf(product) {
  return Number(qtyByProduct.value[product.id] ?? 0)
}

function productTaxLabel(product) {
  const label = product.product_label
  if (!label) return 'Sans TVA'
  if (label.is_tax_exempt) return 'Exonéré'
  return `TVA ${Number(label.default_tax_rate || 0)} %`
}

const catalogProducts = computed(() => products.value)

const stockProducts = computed(() => {
  return products.value.filter((product) => {
    const qty = qtyOf(product)
    const min = Number(product.min_stock_level ?? 0)
    if (stockFilter.value === 'ok') return qty > min
    if (stockFilter.value === 'low') return qty > 0 && qty <= min
    if (stockFilter.value === 'out') return qty <= 0
    // "all" dans l'onglet stock = produits déjà présents (qty > 0) + rupture connue
    if (stockFilter.value === 'all') return qty > 0 || qtyByProduct.value[product.id] !== undefined
    return true
  })
})

const displayed = computed(() => (view.value === 'catalog' ? catalogProducts.value : stockProducts.value))

function productStockValue(product) {
  return qtyOf(product) * Number(product.selling_price || 0)
}

function productPurchaseValue(product) {
  return qtyOf(product) * Number(product.purchase_price || 0)
}

const stockValueSale = computed(() =>
  products.value.reduce((sum, product) => sum + productStockValue(product), 0),
)
const stockValuePurchase = computed(() =>
  products.value.reduce((sum, product) => sum + productPurchaseValue(product), 0),
)
const unitsInStock = computed(() =>
  products.value.reduce((sum, product) => sum + qtyOf(product), 0),
)
const catalogCount = computed(() => products.value.length)
const inStockCount = computed(() => products.value.filter((p) => qtyOf(p) > 0).length)

function stockTone(product) {
  const qty = qtyOf(product)
  const min = Number(product.min_stock_level ?? 0)
  if (qty <= 0) return 'danger'
  if (qty <= min) return 'warning'
  return 'success'
}

function stockLabel(product) {
  const qty = qtyOf(product)
  if (qty <= 0) return 'Rupture'
  if (qty <= Number(product.min_stock_level ?? 0)) return `Faible (${qty})`
  return `En stock (${qty})`
}

function goEntry(product, event) {
  event.stopPropagation()
  router.push({
    name: 'movement-new',
    query: { type: 'entry', product_id: String(product.id) },
  })
}

function goExit(product, event) {
  event.stopPropagation()
  router.push({
    name: 'movement-new',
    query: { type: 'exit', product_id: String(product.id) },
  })
}

async function load() {
  loading.value = true
  try {
    const [productsRes, itemsRes] = await Promise.all([
      productsApi.list({ search: search.value, per_page: 100 }),
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
    <PageHeader title="Stock" :subtitle="stockStore.currentStock?.name || 'Catalogue'">
      <template #actions>
        <div class="flex gap-2">
          <RouterLink
            :to="{ name: 'movement-new', query: { type: 'entry' } }"
            class="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
          >
            + Entrée
          </RouterLink>
          <RouterLink
            :to="{ name: 'movement-new', query: { type: 'exit' } }"
            class="rounded-xl bg-card px-3 py-2 text-xs font-semibold text-danger-700 ring-1 ring-border"
          >
            − Sortie
          </RouterLink>
        </div>
      </template>
    </PageHeader>

    <div class="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-card p-1 ring-1 ring-border">
      <button
        type="button"
        class="rounded-xl px-3 py-2.5 text-sm font-semibold transition"
        :class="view === 'catalog' ? 'bg-brand-600 text-white' : 'text-muted'"
        @click="view = 'catalog'"
      >
        Disponibles
        <span class="ml-1 text-xs opacity-80">({{ catalogCount }})</span>
      </button>
      <button
        type="button"
        class="rounded-xl px-3 py-2.5 text-sm font-semibold transition"
        :class="view === 'stock' ? 'bg-brand-600 text-white' : 'text-muted'"
        @click="view = 'stock'"
      >
        En stock
        <span class="ml-1 text-xs opacity-80">({{ inStockCount }})</span>
      </button>
    </div>

    <SearchBar v-model="search" placeholder="Rechercher un produit…" show-scan class="mb-3" />

    <div v-if="view === 'stock'" class="mb-4 grid grid-cols-2 gap-2">
      <AppCard class="!p-3">
        <p class="text-[11px] text-muted">Valeur stock (vente)</p>
        <p class="mt-1 text-sm font-bold text-brand-700">
          {{ formatMoney(stockValueSale, auth.currencyCode) }}
        </p>
        <p class="text-[11px] text-muted">{{ unitsInStock }} unité(s)</p>
      </AppCard>
      <AppCard class="!p-3">
        <p class="text-[11px] text-muted">Valeur stock (achat)</p>
        <p class="mt-1 text-sm font-bold text-ink">
          {{ formatMoney(stockValuePurchase, auth.currencyCode) }}
        </p>
        <p class="text-[11px] text-muted">
          Marge {{ formatMoney(stockValueSale - stockValuePurchase, auth.currencyCode) }}
        </p>
      </AppCard>
    </div>

    <p v-if="view === 'catalog'" class="mb-3 text-xs text-muted">
      Catalogue des produits. Ajoutez-les au magasin via <strong>+ Entrée</strong>.
    </p>
    <p v-else class="mb-3 text-xs text-muted">
      Quantités du magasin courant. Utilisez + Entrée / − Sortie pour ajuster.
    </p>

    <div v-if="view === 'stock'" class="mb-4 flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="item in stockFilters"
        :key="item.id"
        type="button"
        class="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
        :class="stockFilter === item.id ? 'bg-brand-600 text-white' : 'bg-card text-muted ring-1 ring-border'"
        @click="stockFilter = item.id"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="space-y-3">
      <AppCard
        v-for="product in displayed"
        :key="product.id"
        class="!p-3 cursor-pointer"
        @click="router.push({ name: 'product-detail', params: { id: product.id } })"
      >
        <div class="flex gap-3">
          <div class="flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40">
            <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 8-9-5-9 5v8l9 5 9-5V8Z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate font-semibold text-ink">{{ product.name }}</p>
                <p class="text-xs text-muted">
                  {{ product.sku }} · {{ product.category?.name || 'Sans catégorie' }}
                </p>
                <p class="text-[11px] text-muted">{{ productTaxLabel(product) }}</p>
              </div>
              <AppBadge :tone="stockTone(product)">{{ stockLabel(product) }}</AppBadge>
            </div>
            <div class="mt-2 flex items-end justify-between gap-2">
              <p class="text-sm font-bold text-brand-700">
                {{ formatMoney(product.selling_price, auth.currencyCode) }}
                <span class="text-[11px] font-medium text-muted">HT / u.</span>
              </p>
              <div class="flex gap-1.5" @click.stop>
                <button
                  type="button"
                  class="rounded-lg bg-success-50 px-2.5 py-1 text-[11px] font-semibold text-success-700"
                  @click="goEntry(product, $event)"
                >
                  + Entrée
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-danger-50 px-2.5 py-1 text-[11px] font-semibold text-danger-700"
                  :disabled="qtyOf(product) <= 0"
                  @click="goExit(product, $event)"
                >
                  − Sortie
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppCard>

      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="!displayed.length" class="py-10 text-center text-sm text-muted">
        {{ view === 'catalog' ? 'Aucun produit dans le catalogue' : 'Aucun produit en stock' }}
      </p>
    </div>

    <AppFab :to="{ name: 'product-detail', params: { id: 'new' } }" />
  </div>
</template>
