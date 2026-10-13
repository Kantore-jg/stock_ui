<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { categoriesApi, labelsApi, productsApi, unitsApi } from '@/services/products'
import { stocksApi } from '@/services/stock'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'
import { formatMoney, unwrapItem, unwrapList } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const stockStore = useStockStore()
const ui = useUiStore()

const isNew = computed(() => route.params.id === 'new')
const tab = ref('info')
const loading = ref(true)
const saving = ref(false)
const stockQty = ref(0)
const categories = ref([])
const labels = ref([])
const units = ref([])

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
  labels.value.map((item) => ({ value: item.id, label: item.name })),
)
const unitOptions = computed(() =>
  units.value.map((item) => ({ value: item.id, label: item.name || item.code })),
)

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
    if (stockStore.currentStockId) {
      const items = unwrapList(await stocksApi.itemsByStock(stockStore.currentStockId))
      const match = items.find((item) => Number(item.product_id) === Number(product.id))
      stockQty.value = Number(match?.quantity_available ?? match?.quantity_on_hand ?? 0)
    }
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
        <AppBadge v-if="!isNew" :tone="stockQty > 0 ? 'success' : 'danger'">
          {{ stockQty > 0 ? 'En stock' : 'Rupture' }}
        </AppBadge>
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
        <AppSelect v-model="form.product_label_id" label="Étiquette" :options="labelOptions" />
        <div class="grid grid-cols-2 gap-3">
          <AppInput v-model="form.purchase_price" label="Prix d'achat" type="number" />
          <AppInput v-model="form.selling_price" label="Prix de vente" type="number" />
        </div>
        <AppSelect v-model="form.unit_id" label="Unité" :options="unitOptions" />
        <AppInput v-model="form.barcode" label="Code-barres" />
        <AppInput v-model="form.description" label="Description" />
        <AppInput v-model="form.min_stock_level" label="Stock minimum" type="number" />
      </div>

      <AppCard v-show="tab === 'stock'">
        <p class="text-sm text-muted">Quantité disponible</p>
        <p class="mt-1 text-3xl font-bold text-ink">{{ stockQty }}</p>
        <p class="mt-2 text-sm text-muted">
          Magasin : {{ stockStore.currentStock?.name || '—' }}
        </p>
        <p class="mt-1 text-sm text-muted">
          Valeur stock ≈ {{ formatMoney(stockQty * Number(form.selling_price || 0), auth.currencyCode) }}
        </p>
      </AppCard>

      <AppCard v-show="tab === 'history'">
        <p class="text-sm text-muted">
          Consultez l’historique détaillé dans
          <RouterLink :to="{ name: 'movements' }" class="font-semibold text-brand-600">Mouvements de stock</RouterLink>.
        </p>
      </AppCard>

      <div class="mt-6 grid grid-cols-2 gap-3">
        <AppButton v-if="!isNew" variant="danger" @click="remove">Supprimer</AppButton>
        <AppButton :class="isNew ? 'col-span-2' : ''" :loading="saving" @click="save">
          Enregistrer
        </AppButton>
      </div>
    </template>
  </div>
</template>
