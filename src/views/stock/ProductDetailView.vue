<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { categoriesApi, labelsApi, productsApi, unitsApi } from '@/services/products'
import {
  isOutboundType,
  movementTypeLabel,
  movementsApi,
  stocksApi,
} from '@/services/stock'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'
import { formatDateTime, formatMoney, unwrapItem, unwrapList } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const stockStore = useStockStore()
const ui = useUiStore()

const isNew = computed(() => route.params.id === 'new')
const tab = ref('info')
const loading = ref(true)
const saving = ref(false)
const categories = ref([])
const labels = ref([])
const units = ref([])
const stockRows = ref([])
const history = ref([])
const historyLoading = ref(false)

const form = reactive({
  name: '',
  sku: '',
  category_id: '',
  product_label_id: '',
  unit_id: '',
  purchase_price: '',
  selling_price: '',
  barcode: '',
  description: '',
  min_stock_level: '0',
  currency_id: '',
  is_active: true,
})

const categoryOptions = computed(() =>
  categories.value.map((item) => ({ value: item.id, label: item.name })),
)
const labelOptions = computed(() =>
  labels.value.map((item) => {
    const rate = item.is_tax_exempt ? 0 : Number(item.default_tax_rate || 0)
    return {
      value: item.id,
      label: `${item.name} · ${rate} %`,
    }
  }),
)
const unitOptions = computed(() =>
  units.value.map((item) => ({ value: item.id, label: item.name || item.code })),
)

const currentStockRow = computed(() => {
  if (!stockStore.currentStockId) return stockRows.value[0] || null
  return (
    stockRows.value.find((row) => Number(row.stock_id) === Number(stockStore.currentStockId)) ||
    null
  )
})

const totalOnHand = computed(() =>
  stockRows.value.reduce((sum, row) => sum + Number(row.quantity_on_hand || 0), 0),
)
const totalAvailable = computed(() =>
  stockRows.value.reduce(
    (sum, row) => sum + Number(row.quantity_available ?? row.quantity_on_hand ?? 0),
    0,
  ),
)
const totalReserved = computed(() =>
  stockRows.value.reduce((sum, row) => sum + Number(row.quantity_reserved || 0), 0),
)
const currentQty = computed(() =>
  Number(currentStockRow.value?.quantity_available ?? currentStockRow.value?.quantity_on_hand ?? 0),
)
const purchaseValue = computed(
  () => totalOnHand.value * Number(form.purchase_price || 0),
)
const sellingValue = computed(
  () => totalOnHand.value * Number(form.selling_price || 0),
)
const marginValue = computed(() => sellingValue.value - purchaseValue.value)

const stockTone = computed(() => {
  const qty = currentQty.value
  const min = Number(form.min_stock_level || 0)
  if (qty <= 0) return 'danger'
  if (qty <= min) return 'warning'
  return 'success'
})

const stockLabel = computed(() => {
  const qty = currentQty.value
  if (qty <= 0) return 'Rupture'
  if (qty <= Number(form.min_stock_level || 0)) return 'Stock faible'
  return 'En stock'
})

async function loadMeta() {
  const [cats, labs, uns] = await Promise.all([
    categoriesApi.list(),
    labelsApi.list(),
    unitsApi.list(),
  ])
  categories.value = unwrapList(cats)
  labels.value = unwrapList(labs)
  units.value = unwrapList(uns)
  form.currency_id =
    auth.company?.default_currency_id ||
    auth.company?.default_currency?.id ||
    form.currency_id
}

async function loadStockRows(productId) {
  const items = unwrapList(await stocksApi.items({ product_id: productId, per_page: 100 }))
  stockRows.value = items
}

async function loadHistory(productId) {
  historyLoading.value = true
  try {
    const response = await movementsApi.list({
      per_page: 50,
      stock_id: stockStore.currentStockId || undefined,
    })
    const movements = unwrapList(response)
    const rows = []
    movements.forEach((movement) => {
      ;(movement.lines || []).forEach((line) => {
        if (Number(line.product_id) !== Number(productId)) return
        rows.push({
          id: `${movement.id}-${line.id}`,
          movement_id: movement.id,
          type: movement.movement_type,
          status: movement.status,
          reference: movement.reference,
          reason: movement.reason,
          quantity: Number(line.quantity || 0),
          unit_cost: line.unit_cost,
          source: movement.source_stock?.name,
          destination: movement.destination_stock?.name,
          at: movement.validated_at || movement.document_date || movement.created_at,
          outbound: isOutboundType(movement.movement_type),
        })
      })
    })
    history.value = rows.sort((a, b) => new Date(b.at) - new Date(a.at))
  } catch {
    history.value = []
  } finally {
    historyLoading.value = false
  }
}

async function loadProduct() {
  loading.value = true
  try {
    await loadMeta()
    if (isNew.value) {
      if (!form.category_id && categories.value[0]) form.category_id = categories.value[0].id
      if (!form.product_label_id && labels.value[0]) form.product_label_id = labels.value[0].id
      if (!form.unit_id && units.value[0]) form.unit_id = units.value[0].id
      return
    }
    const product = unwrapItem(await productsApi.get(route.params.id))
    Object.assign(form, {
      name: product.name || '',
      sku: product.sku || '',
      category_id: product.category_id || '',
      product_label_id: product.product_label_id || '',
      unit_id: product.unit_id || '',
      purchase_price: product.purchase_price ?? '',
      selling_price: product.selling_price ?? '',
      barcode: product.barcode || '',
      description: product.description || '',
      min_stock_level: product.min_stock_level ?? '0',
      currency_id: product.currency_id || form.currency_id,
      is_active: product.is_active !== false,
    })
    await Promise.all([loadStockRows(product.id), loadHistory(product.id)])
  } catch (error) {
    ui.error(error.message || 'Produit introuvable')
    router.replace({ name: 'products' })
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const payload = {
      ...form,
      category_id: Number(form.category_id),
      product_label_id: Number(form.product_label_id),
      unit_id: Number(form.unit_id),
      currency_id: Number(form.currency_id),
      purchase_price: Number(form.purchase_price || 0),
      selling_price: Number(form.selling_price || 0),
      min_stock_level: Number(form.min_stock_level || 0),
    }
    if (isNew.value) {
      const created = unwrapItem(await productsApi.create(payload))
      ui.success('Produit créé')
      router.replace({ name: 'product-detail', params: { id: created.id } })
    } else {
      await productsApi.update(route.params.id, payload)
      ui.success('Produit enregistré')
    }
  } catch (error) {
    ui.error(error.message || 'Enregistrement impossible')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (isNew.value) return
  if (!confirm('Supprimer ce produit ?')) return
  try {
    await productsApi.remove(route.params.id)
    ui.success('Produit supprimé')
    router.replace({ name: 'products' })
  } catch (error) {
    ui.error(error.message || 'Suppression impossible')
  }
}

watch(tab, (value) => {
  if (value === 'history' && !isNew.value && !history.value.length) {
    loadHistory(route.params.id)
  }
})

onMounted(loadProduct)
</script>

<template>
  <div>
    <PageHeader
      :title="isNew ? 'Nouveau produit' : form.name || 'Détail produit'"
      :subtitle="form.sku"
      :back-to="{ name: 'products' }"
    >
      <template #actions>
        <AppBadge v-if="!isNew" :tone="stockTone">{{ stockLabel }}</AppBadge>
      </template>
    </PageHeader>

    <div v-if="loading" class="py-16 text-center text-sm text-muted">Chargement…</div>
    <template v-else>
      <div class="mb-4 flex gap-2 rounded-2xl bg-white p-1 ring-1 ring-black/5">
        <button
          v-for="item in [
            { id: 'info', label: 'Informations' },
            { id: 'stock', label: 'Stock' },
            { id: 'history', label: 'Historique' },
          ]"
          :key="item.id"
          type="button"
          class="flex-1 rounded-xl px-2 py-2 text-xs font-semibold"
          :class="tab === item.id ? 'bg-brand-600 text-white' : 'text-muted'"
          @click="tab = item.id"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-show="tab === 'info'" class="space-y-3">
        <AppInput v-model="form.name" label="Libellé" />
        <AppInput v-model="form.sku" label="SKU / Code" />
        <AppSelect v-model="form.category_id" label="Catégorie" :options="categoryOptions" />
        <AppSelect
          v-model="form.product_label_id"
          label="TVA du produit"
          :options="labelOptions"
          placeholder="Choisir la TVA"
        />
        <p class="text-xs text-muted -mt-1">
          Cette TVA sera appliquée automatiquement à chaque vente de ce produit.
        </p>
        <div class="grid grid-cols-2 gap-3">
          <AppInput v-model="form.purchase_price" label="Prix d'achat (HT)" type="number" />
          <AppInput v-model="form.selling_price" label="Prix de vente (HT)" type="number" />
        </div>
        <AppSelect v-model="form.unit_id" label="Unité" :options="unitOptions" />
        <AppInput v-model="form.barcode" label="Code-barres" />
        <AppInput v-model="form.description" label="Description" />
        <AppInput v-model="form.min_stock_level" label="Stock minimum" type="number" />
      </div>

      <div v-show="tab === 'stock'" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <AppCard class="!p-3">
            <p class="text-[11px] text-muted">Disponible (magasin)</p>
            <p class="mt-1 text-2xl font-bold text-ink">{{ currentQty }}</p>
            <p class="text-xs text-muted">{{ stockStore.currentStock?.name || '—' }}</p>
          </AppCard>
          <AppCard class="!p-3">
            <p class="text-[11px] text-muted">Total tous magasins</p>
            <p class="mt-1 text-2xl font-bold text-ink">{{ totalAvailable }}</p>
            <p class="text-xs text-muted">Réservé : {{ totalReserved }}</p>
          </AppCard>
        </div>

        <AppCard class="space-y-2">
          <h3 class="font-semibold text-ink">Valeur du stock</h3>
          <div class="flex justify-between text-sm">
            <span class="text-muted">À l’achat</span>
            <span class="font-semibold">{{ formatMoney(purchaseValue, auth.currencyCode) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted">À la vente</span>
            <span class="font-semibold text-brand-700">{{ formatMoney(sellingValue, auth.currencyCode) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-100 pt-2 text-sm">
            <span class="text-muted">Marge potentielle</span>
            <span class="font-bold" :class="marginValue >= 0 ? 'text-success-700' : 'text-danger-600'">
              {{ formatMoney(marginValue, auth.currencyCode) }}
            </span>
          </div>
          <p class="text-xs text-muted">
            Sur {{ totalOnHand }} unité(s) · min. {{ form.min_stock_level || 0 }}
          </p>
        </AppCard>

        <AppCard>
          <h3 class="mb-3 font-semibold text-ink">Par magasin</h3>
          <div v-if="stockRows.length" class="space-y-2">
            <div
              v-for="row in stockRows"
              :key="row.id"
              class="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm"
            >
              <div>
                <p class="font-medium text-ink">{{ row.stock?.name || `Stock #${row.stock_id}` }}</p>
                <p class="text-xs text-muted">
                  Réservé {{ row.quantity_reserved || 0 }}
                </p>
              </div>
              <p class="font-bold text-ink">
                {{ row.quantity_available ?? row.quantity_on_hand ?? 0 }}
              </p>
            </div>
          </div>
          <p v-else class="text-sm text-muted">Aucune quantité en stock pour ce produit.</p>
        </AppCard>

        <div v-if="!isNew" class="grid grid-cols-2 gap-2">
          <AppButton
            variant="soft"
            @click="router.push({ name: 'movement-new', query: { type: 'entry', product_id: route.params.id } })"
          >
            + Entrée
          </AppButton>
          <AppButton
            variant="secondary"
            @click="router.push({ name: 'movement-new', query: { type: 'exit', product_id: route.params.id } })"
          >
            − Sortie
          </AppButton>
        </div>
      </div>

      <div v-show="tab === 'history'" class="space-y-2">
        <p v-if="historyLoading" class="py-8 text-center text-sm text-muted">Chargement…</p>
        <template v-else>
          <AppCard v-for="item in history" :key="item.id" class="!p-3">
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-full text-sm font-bold"
                :class="item.outbound ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'"
              >
                {{ item.outbound ? '↓' : '↑' }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold text-ink">
                  {{ item.reason || item.reference || movementTypeLabel(item.type) }}
                </p>
                <p class="truncate text-xs text-muted">
                  {{ movementTypeLabel(item.type) }}
                  <span v-if="item.source"> · {{ item.source }}</span>
                  <span v-if="item.destination"> → {{ item.destination }}</span>
                </p>
                <p class="text-[11px] text-muted">{{ formatDateTime(item.at) }}</p>
              </div>
              <div class="text-right">
                <p class="font-bold" :class="item.outbound ? 'text-danger-600' : 'text-success-700'">
                  {{ item.outbound ? '-' : '+' }}{{ item.quantity }}
                </p>
                <AppBadge class="mt-1" :tone="item.status === 'validated' ? 'success' : 'neutral'">
                  {{ item.status }}
                </AppBadge>
              </div>
            </div>
          </AppCard>
          <p v-if="!history.length" class="py-8 text-center text-sm text-muted">
            Aucun mouvement pour ce produit
          </p>
          <AppButton
            v-if="!isNew"
            block
            variant="ghost"
            @click="router.push({ name: 'movements' })"
          >
            Voir tous les mouvements
          </AppButton>
        </template>
      </div>

      <div v-if="tab === 'info'" class="mt-6 grid grid-cols-2 gap-3">
        <AppButton v-if="!isNew" variant="danger" @click="remove">Supprimer</AppButton>
        <AppButton :class="isNew ? 'col-span-2' : ''" :loading="saving" @click="save">
          Enregistrer
        </AppButton>
      </div>
    </template>
  </div>
</template>
