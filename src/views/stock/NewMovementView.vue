<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import { productsApi } from '@/services/products'
import { MOVEMENT_TYPES, movementsApi } from '@/services/stock'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'
import { unwrapItem, unwrapList } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const stockStore = useStockStore()
const ui = useUiStore()

const allowedTypes = ['entry', 'exit', 'transfer_out', 'initial_entry', 'adjustment']
const initialType = allowedTypes.includes(String(route.query.type))
  ? String(route.query.type)
  : 'entry'

const loading = ref(true)
const saving = ref(false)
const search = ref('')
const products = ref([])
const lines = ref([])

const form = reactive({
  movement_type: initialType,
  source_stock_id: '',
  destination_stock_id: '',
  reason: '',
  document_date: new Date().toISOString().slice(0, 10),
})

const typeMeta = computed(() => MOVEMENT_TYPES[form.movement_type] || MOVEMENT_TYPES.entry)

const typeOptions = computed(() =>
  allowedTypes.map((key) => ({
    value: key,
    label: MOVEMENT_TYPES[key].label,
  })),
)

const stockOptions = computed(() =>
  stockStore.stocks.map((stock) => ({ value: stock.id, label: stock.name })),
)

const needsSource = computed(() =>
  ['exit', 'transfer_out', 'adjustment'].includes(form.movement_type),
)
const needsDestination = computed(() =>
  ['entry', 'initial_entry', 'transfer_out'].includes(form.movement_type),
)

const filteredProducts = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return products.value.slice(0, 10)
  return products.value
    .filter((product) =>
      [product.name, product.sku, product.barcode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
    .slice(0, 10)
})

const linesTotalQty = computed(() =>
  lines.value.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
)

function syncDefaultStocks() {
  const current = stockStore.currentStockId || stockStore.stocks[0]?.id || ''
  if (form.movement_type === 'entry' || form.movement_type === 'initial_entry') {
    form.source_stock_id = ''
    form.destination_stock_id = current
  } else if (form.movement_type === 'exit') {
    form.source_stock_id = current
    form.destination_stock_id = ''
  } else if (form.movement_type === 'transfer_out') {
    form.source_stock_id = current
    const other = stockStore.stocks.find((stock) => stock.id !== Number(current))
    form.destination_stock_id = other?.id || ''
  } else if (form.movement_type === 'adjustment') {
    form.source_stock_id = current
    form.destination_stock_id = ''
  }
}

function addProduct(product) {
  const existing = lines.value.find((line) => line.product_id === product.id)
  if (existing) {
    existing.quantity = Number(existing.quantity) + 1
    return
  }
  lines.value.push({
    product_id: product.id,
    name: product.name,
    sku: product.sku,
    quantity: 1,
    unit_cost: Number(product.purchase_price || 0),
    note: '',
  })
  search.value = ''
}

function removeLine(index) {
  lines.value.splice(index, 1)
}

async function load() {
  loading.value = true
  try {
    if (!stockStore.stocks.length && auth.user) {
      stockStore.syncFromUser(auth.user)
    }
    syncDefaultStocks()
    const productsRes = await productsApi.list({ per_page: 100 })
    products.value = unwrapList(productsRes)

    const prefillId = route.query.product_id ? Number(route.query.product_id) : null
    if (prefillId) {
      const product = products.value.find((item) => item.id === prefillId)
      if (product) addProduct(product)
    }
  } catch (error) {
    ui.error(error.message || 'Chargement impossible')
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!lines.value.length) {
    ui.error('Ajoutez au moins un produit')
    return
  }
  if (needsSource.value && !form.source_stock_id) {
    ui.error('Stock source obligatoire')
    return
  }
  if (needsDestination.value && !form.destination_stock_id) {
    ui.error('Stock destination obligatoire')
    return
  }
  if (
    form.movement_type === 'transfer_out' &&
    Number(form.source_stock_id) === Number(form.destination_stock_id)
  ) {
    ui.error('Source et destination doivent être différents')
    return
  }

  saving.value = true
  try {
    const payload = {
      movement_type: form.movement_type,
      document_date: form.document_date,
      reason: form.reason || typeMeta.value.label,
      source_stock_id: form.source_stock_id ? Number(form.source_stock_id) : null,
      destination_stock_id: form.destination_stock_id ? Number(form.destination_stock_id) : null,
      lines: lines.value.map((line) => ({
        product_id: line.product_id,
        quantity: Number(line.quantity),
        unit_cost: line.unit_cost === '' ? null : Number(line.unit_cost),
        note: line.note || null,
      })),
    }

    const created = unwrapItem(await movementsApi.create(payload))
    await movementsApi.validate(created.id)
    ui.success(`${typeMeta.value.short} validée`)
    router.replace({ name: 'movements' })
  } catch (error) {
    ui.error(error.message || 'Mouvement impossible')
  } finally {
    saving.value = false
  }
}

watch(
  () => form.movement_type,
  () => syncDefaultStocks(),
)

onMounted(load)
</script>

<template>
  <div>
    <PageHeader
      :title="typeMeta.label"
      :subtitle="typeMeta.hint"
      :back-to="{ name: 'movements' }"
    />

    <div v-if="loading" class="py-16 text-center text-sm text-muted">Chargement…</div>
    <div v-else class="space-y-4">
      <AppSelect v-model="form.movement_type" label="Type de mouvement" :options="typeOptions" />
      <AppInput v-model="form.document_date" label="Date" type="date" />
      <AppInput v-model="form.reason" label="Motif / référence" placeholder="Ex. Réapprovisionnement" />

      <AppSelect
        v-if="needsSource"
        v-model="form.source_stock_id"
        label="Stock source"
        :options="stockOptions"
      />
      <AppSelect
        v-if="needsDestination"
        v-model="form.destination_stock_id"
        :label="form.movement_type === 'transfer_out' ? 'Stock destination' : 'Magasin / dépôt'"
        :options="stockOptions"
      />

      <div>
        <p class="mb-2 text-sm font-medium text-ink">Produits (lignes multiples)</p>
        <SearchBar v-model="search" placeholder="Ajouter un produit…" show-scan />
      </div>

      <div v-if="search || !lines.length" class="space-y-2">
        <button
          v-for="product in filteredProducts"
          :key="product.id"
          type="button"
          class="flex w-full items-center justify-between rounded-xl bg-white px-3 py-3 text-left text-sm ring-1 ring-black/5"
          @click="addProduct(product)"
        >
          <span>
            <span class="font-semibold text-ink">{{ product.name }}</span>
            <span class="block text-xs text-muted">{{ product.sku }}</span>
          </span>
          <span class="text-xs font-semibold text-brand-700">Ajouter</span>
        </button>
      </div>

      <div class="space-y-2">
        <AppCard v-for="(line, index) in lines" :key="line.product_id" class="!p-3 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-semibold text-ink">{{ line.name }}</p>
              <p class="text-xs text-muted">{{ line.sku }}</p>
            </div>
            <button type="button" class="text-danger-600" @click="removeLine(index)">Suppr.</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <AppInput v-model="line.quantity" label="Quantité" type="number" />
            <AppInput
              v-if="form.movement_type === 'entry' || form.movement_type === 'initial_entry'"
              v-model="line.unit_cost"
              label="Coût unitaire"
              type="number"
            />
          </div>
        </AppCard>
      </div>

      <AppCard class="flex items-center justify-between text-sm">
        <span class="text-muted">{{ lines.length }} produit(s)</span>
        <span class="font-bold text-ink">Qté totale : {{ linesTotalQty }}</span>
      </AppCard>

      <AppButton block :loading="saving" @click="submit">
        Valider {{ typeMeta.short.toLowerCase() }}
      </AppButton>
    </div>
  </div>
</template>
