<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import { invoicesApi } from '@/services/sales'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { formatDate, formatMoney, unwrapList } from '@/utils/format'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const search = ref('')
const status = ref('')
const loading = ref(true)
const invoices = ref([])

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'issued', label: 'Émises' },
  { value: 'cancelled', label: 'Annulées' },
]

const filteredHint = computed(() => {
  if (search.value.trim()) return `Recherche : ${search.value.trim()}`
  if (status.value) return statusOptions.find((item) => item.value === status.value)?.label
  return `${invoices.value.length} facture(s)`
})

function invoiceTone(invoice) {
  if (invoice.status === 'cancelled') return 'danger'
  const balance = Number(invoice.sale?.balance_due || 0)
  const paid = Number(invoice.sale?.amount_paid || 0)
  if (balance <= 0 && paid > 0) return 'success'
  if (paid > 0) return 'warning'
  return 'brand'
}

function paymentLabel(invoice) {
  if (invoice.status === 'cancelled') return 'Annulée'
  const balance = Number(invoice.sale?.balance_due || 0)
  const paid = Number(invoice.sale?.amount_paid || 0)
  if (balance <= 0 && paid > 0) return 'Payée'
  if (paid > 0) return 'Partielle'
  return 'Impayée'
}

function customerName(invoice) {
  return (
    invoice.customer_name_snapshot ||
    invoice.sale?.customer?.name ||
    'Client passage'
  )
}

function canPay(invoice) {
  return (
    invoice.status !== 'cancelled' &&
    invoice.sale_id &&
    Number(invoice.sale?.balance_due || 0) > 0
  )
}

async function load() {
  loading.value = true
  try {
    const response = await invoicesApi.list({
      search: search.value.trim() || undefined,
      status: status.value || undefined,
      per_page: 50,
    })
    invoices.value = unwrapList(response)
  } catch (error) {
    ui.error(error.message || 'Impossible de charger les factures')
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
    <PageHeader title="Factures" :subtitle="filteredHint" :back-to="{ name: 'more' }">
      <template #actions>
        <RouterLink
          :to="{ name: 'sales' }"
          class="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
        >
          + Vente
        </RouterLink>
      </template>
    </PageHeader>

    <SearchBar
      v-model="search"
      placeholder="N° facture, client, téléphone…"
      class="mb-3"
    />
    <AppSelect v-model="status" class="mb-4" :options="statusOptions" placeholder="Statut" />

    <div class="space-y-2 pb-4">
      <AppCard v-for="invoice in invoices" :key="invoice.id" class="!p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-ink">{{ invoice.invoice_number }}</p>
              <AppBadge :tone="invoiceTone(invoice)">{{ paymentLabel(invoice) }}</AppBadge>
            </div>
            <p class="truncate text-xs text-muted">
              {{ customerName(invoice) }}
              · {{ formatDate(invoice.invoice_date) }}
              <span v-if="invoice.sale?.stock?.name"> · {{ invoice.sale.stock.name }}</span>
            </p>
            <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span class="text-muted">
                Total
                <strong class="text-ink">{{ formatMoney(invoice.total_amount, auth.currencyCode) }}</strong>
              </span>
              <span v-if="invoice.sale" class="text-success-700">
                Payé {{ formatMoney(invoice.sale.amount_paid, auth.currencyCode) }}
              </span>
              <span
                v-if="invoice.sale && Number(invoice.sale.balance_due) > 0"
                class="text-danger-600"
              >
                Reste {{ formatMoney(invoice.sale.balance_due, auth.currencyCode) }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <AppButton
            variant="secondary"
            class="!py-2 text-xs"
            :disabled="!invoice.sale_id"
            @click="router.push({ name: 'invoice', params: { id: invoice.sale_id } })"
          >
            Voir facture
          </AppButton>
          <AppButton
            :variant="canPay(invoice) ? 'primary' : 'soft'"
            class="!py-2 text-xs"
            :disabled="!invoice.sale_id"
            @click="router.push({ name: 'payments', params: { id: invoice.sale_id } })"
          >
            {{ canPay(invoice) ? 'Compléter paiement' : 'Paiements' }}
          </AppButton>
        </div>
      </AppCard>

      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="!invoices.length" class="py-10 text-center text-sm text-muted">
        Aucune facture trouvée
      </p>
    </div>
  </div>
</template>
