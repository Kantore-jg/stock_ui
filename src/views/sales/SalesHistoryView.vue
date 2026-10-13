<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import { salesApi } from '@/services/sales'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'
import { formatDate, formatMoney, unwrapList } from '@/utils/format'

const auth = useAuthStore()
const stockStore = useStockStore()
const ui = useUiStore()
const router = useRouter()

const search = ref('')
const status = ref('')
const loading = ref(true)
const sales = ref([])

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'validated', label: 'Validées' },
  { value: 'partially_paid', label: 'Partiellement payées' },
  { value: 'paid', label: 'Payées' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'cancelled', label: 'Annulées' },
]

const filteredHint = computed(() => {
  if (search.value.trim()) return `Recherche : ${search.value.trim()}`
  if (status.value) return statusOptions.find((item) => item.value === status.value)?.label
  return `${sales.value.length} vente(s)`
})

function statusTone(sale) {
  if (sale.status === 'paid') return 'success'
  if (sale.status === 'partially_paid') return 'warning'
  if (sale.status === 'cancelled') return 'danger'
  if (sale.status === 'validated') return 'brand'
  return 'neutral'
}

function statusLabel(sale) {
  const map = {
    draft: 'Brouillon',
    validated: 'Validée',
    partially_paid: 'Partiel',
    paid: 'Payée',
    cancelled: 'Annulée',
  }
  return map[sale.status] || sale.status
}

function invoiceLabel(sale) {
  return sale.invoice?.invoice_number || sale.invoice_number || `Vente #${sale.id}`
}

function canPay(sale) {
  return Number(sale.balance_due || 0) > 0 && !['draft', 'cancelled'].includes(sale.status)
}

async function load() {
  loading.value = true
  try {
    const response = await salesApi.list({
      search: search.value.trim() || undefined,
      status: status.value || undefined,
      stock_id: stockStore.currentStockId || undefined,
      per_page: 50,
    })
    sales.value = unwrapList(response)
  } catch (error) {
    ui.error(error.message || 'Impossible de charger les ventes')
  } finally {
    loading.value = false
  }
}

let timer
watch([search, status], () => {
  clearTimeout(timer)
  timer = setTimeout(load, 300)
})

onMounted(load)
</script>

<template>
  <div>
    <PageHeader
      title="Historique des ventes"
      :subtitle="filteredHint"
      :back-to="{ name: 'more' }"
    >
      <template #actions>
        <div class="flex gap-2">
          <RouterLink
            :to="{ name: 'invoices' }"
            class="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-brand-700 ring-1 ring-black/5"
          >
            Factures
          </RouterLink>
          <RouterLink
            :to="{ name: 'sales' }"
            class="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
          >
            + Vente
          </RouterLink>
        </div>
      </template>
    </PageHeader>

    <SearchBar
      v-model="search"
      placeholder="N° facture, client, téléphone…"
      class="mb-3"
    />
    <AppSelect v-model="status" class="mb-4" :options="statusOptions" placeholder="Statut" />

    <div class="space-y-2 pb-4">
      <AppCard v-for="sale in sales" :key="sale.id" class="!p-3">
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="truncate font-semibold text-ink">{{ invoiceLabel(sale) }}</p>
              <AppBadge :tone="statusTone(sale)">{{ statusLabel(sale) }}</AppBadge>
            </div>
            <p class="truncate text-xs text-muted">
              {{ sale.customer?.name || 'Client passage' }}
              · {{ formatDate(sale.sale_date) }}
              <span v-if="sale.stock?.name"> · {{ sale.stock.name }}</span>
            </p>
            <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span class="text-muted">
                Total
                <strong class="text-ink">{{ formatMoney(sale.total_amount, auth.currencyCode) }}</strong>
              </span>
              <span class="text-success-700">
                Payé {{ formatMoney(sale.amount_paid, auth.currencyCode) }}
              </span>
              <span v-if="Number(sale.balance_due) > 0" class="text-danger-600">
                Reste {{ formatMoney(sale.balance_due, auth.currencyCode) }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <AppButton
            variant="secondary"
            class="!py-2 text-xs"
            @click="router.push({ name: 'invoice', params: { id: sale.id } })"
          >
            Facture
          </AppButton>
          <AppButton
            :variant="canPay(sale) ? 'primary' : 'soft'"
            class="!py-2 text-xs"
            @click="router.push({ name: 'payments', params: { id: sale.id } })"
          >
            {{ canPay(sale) ? 'Compléter paiement' : 'Paiements' }}
          </AppButton>
        </div>
      </AppCard>

      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="!sales.length" class="py-10 text-center text-sm text-muted">
        Aucune vente trouvée
      </p>
    </div>
  </div>
</template>
