<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { salesApi } from '@/services/sales'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { formatDate, formatMoney, unwrapItem } from '@/utils/format'

function formatQty(value) {
  const amount = Number(value || 0)
  return Number.isInteger(amount) ? String(amount) : amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const loading = ref(true)
const sale = ref(null)

const invoiceNumber = computed(
  () => sale.value?.invoice?.invoice_number || sale.value?.invoice_number || `FAC-${sale.value?.id || ''}`,
)
const items = computed(() => sale.value?.items || [])
const currency = computed(() => auth.currencyCode)
const customerName = computed(() => {
  const saleCustomer = sale.value?.customer?.name
  const snapshot = sale.value?.invoice?.customer_name_snapshot
  if (saleCustomer) return saleCustomer
  if (snapshot && snapshot !== 'Client comptoir') return snapshot
  return snapshot || 'Client passage'
})
const customerDetails = computed(() => {
  const customer = sale.value?.customer
  const invoice = sale.value?.invoice
  return {
    phone: customer?.phone || null,
    email: customer?.email || null,
    address: customer?.address || invoice?.customer_address_snapshot || null,
    tax: customer?.tax_number || invoice?.customer_tax_number_snapshot || null,
  }
})

async function load() {
  loading.value = true
  try {
    sale.value = unwrapItem(await salesApi.get(route.params.id))
  } catch (error) {
    ui.error(error.message || 'Facture introuvable')
    router.replace({ name: 'sales' })
  } finally {
    loading.value = false
  }
}

function printInvoice() {
  window.print()
}

async function shareInvoice() {
  const text = `${invoiceNumber.value} — ${formatMoney(sale.value?.total_amount, currency.value)}`
  if (navigator.share) {
    try {
      await navigator.share({ title: invoiceNumber.value, text })
      return
    } catch {
      // cancelled
    }
  }
  await navigator.clipboard?.writeText(text)
  ui.success('Référence copiée')
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="Facture" :subtitle="invoiceNumber" :back-to="{ name: 'sales' }" />

    <div v-if="loading" class="py-16 text-center text-sm text-muted">Chargement…</div>
    <template v-else-if="sale">
      <AppCard class="mb-4 space-y-4 print:shadow-none print:ring-0">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-lg font-bold text-brand-700">Stock Manager</p>
            <p class="text-xs text-muted">{{ auth.company?.name || 'Magasin' }}</p>
          </div>
          <div class="text-right text-xs text-muted">
            <p class="font-semibold text-ink">{{ invoiceNumber }}</p>
            <p>{{ formatDate(sale.invoice?.invoice_date || sale.sale_date) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted">Client</p>
            <p class="font-semibold text-ink">{{ customerName }}</p>
            <p v-if="customerDetails.phone" class="text-xs text-muted">{{ customerDetails.phone }}</p>
            <p v-if="customerDetails.email" class="text-xs text-muted">{{ customerDetails.email }}</p>
            <p v-if="customerDetails.address" class="text-xs text-muted">{{ customerDetails.address }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs uppercase tracking-wide text-muted">Magasin</p>
            <p class="font-semibold text-ink">{{ sale.stock?.name || '—' }}</p>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-gray-100">
          <div
            class="grid grid-cols-[minmax(0,1fr)_2.75rem_5.75rem_6.25rem] gap-1 bg-surface px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted"
          >
            <span class="text-left">Produit</span>
            <span class="text-right">Qté</span>
            <span class="text-right">PU</span>
            <span class="text-right">Total</span>
          </div>
          <div
            v-for="item in items"
            :key="item.id"
            class="grid grid-cols-[minmax(0,1fr)_2.75rem_5.75rem_6.25rem] gap-1 border-t border-gray-50 px-3 py-2 text-xs"
          >
            <span class="min-w-0 truncate text-left">
              {{ item.product?.name || item.product_name_snapshot || `Produit #${item.product_id}` }}
            </span>
            <span class="text-right tabular-nums">{{ formatQty(item.quantity) }}</span>
            <span class="text-right tabular-nums leading-tight">
              {{ formatMoney(item.unit_price, currency) }}
            </span>
            <span class="text-right font-semibold tabular-nums leading-tight">
              {{
                formatMoney(
                  item.line_total || item.total || Number(item.unit_price) * Number(item.quantity),
                  currency,
                )
              }}
            </span>
          </div>
        </div>

        <div class="space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-muted">Sous-total</span><span>{{ formatMoney(sale.subtotal, currency) }}</span></div>
          <div class="flex justify-between"><span class="text-muted">TVA</span><span>{{ formatMoney(sale.tax_amount, currency) }}</span></div>
          <div class="flex justify-between text-base font-bold"><span>Total TTC</span><span>{{ formatMoney(sale.total_amount, currency) }}</span></div>
          <div class="flex justify-between"><span class="text-muted">Payé</span><span class="text-success-700">{{ formatMoney(sale.amount_paid, currency) }}</span></div>
          <div class="flex justify-between"><span class="text-muted">Reste</span><span class="text-danger-600">{{ formatMoney(sale.balance_due, currency) }}</span></div>
        </div>

        <div class="rounded-lg bg-surface px-3 py-4 text-center font-mono text-xs tracking-[0.35em] text-muted">
          ||||||||| {{ invoiceNumber }} |||||||||
        </div>
      </AppCard>

      <div class="grid grid-cols-3 gap-2 print:hidden">
        <AppButton variant="secondary" @click="printInvoice">Imprimer</AppButton>
        <AppButton variant="soft" @click="printInvoice">PDF</AppButton>
        <AppButton @click="shareInvoice">Partager</AppButton>
      </div>

      <div class="mt-3 print:hidden">
        <AppButton
          block
          variant="ghost"
          @click="router.push({ name: 'payments', params: { id: sale.id } })"
        >
          Gérer les paiements
        </AppButton>
      </div>
    </template>
  </div>
</template>
