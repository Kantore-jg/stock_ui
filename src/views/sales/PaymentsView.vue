<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { paymentMethodsApi, salesApi } from '@/services/sales'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { formatDate, formatMoney, unwrapItem, unwrapList } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const loading = ref(true)
const saving = ref(false)
const sale = ref(null)
const methods = ref([])
const form = reactive({
  amount: '',
  payment_method_id: '',
  reference: '',
  payment_date: new Date().toISOString().slice(0, 10),
})

const statusTone = computed(() => {
  const balance = Number(sale.value?.balance_due || 0)
  const paid = Number(sale.value?.amount_paid || 0)
  if (balance <= 0) return 'success'
  if (paid > 0) return 'warning'
  return 'danger'
})

const statusLabel = computed(() => {
  const balance = Number(sale.value?.balance_due || 0)
  const paid = Number(sale.value?.amount_paid || 0)
  if (balance <= 0) return 'Payé'
  if (paid > 0) return 'Partiellement payé'
  return 'Impayé'
})

const methodOptions = computed(() =>
  methods.value.map((item) => ({ value: item.id, label: item.name })),
)

async function load() {
  loading.value = true
  try {
    const [saleRes, methodsRes] = await Promise.all([
      salesApi.get(route.params.id),
      paymentMethodsApi.list(),
    ])
    sale.value = unwrapItem(saleRes)
    methods.value = unwrapList(methodsRes)
    if (methods.value[0]) form.payment_method_id = methods.value[0].id
    form.amount = sale.value.balance_due || ''
  } catch (error) {
    ui.error(error.message || 'Paiements introuvables')
    router.replace({ name: 'sales' })
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (saving.value) return
  saving.value = true
  try {
    const due = Math.round(Number(sale.value?.balance_due || 0) * 10000) / 10000
    const requested = Math.round(Number(form.amount || 0) * 10000) / 10000
    const amount = Math.min(Math.max(0, requested), due)
    if (amount <= 0) {
      ui.error('Montant invalide ou solde déjà réglé')
      return
    }
    await salesApi.addPayment(route.params.id, {
      amount,
      payment_method_id: Number(form.payment_method_id),
      reference: form.reference || null,
      payment_date: form.payment_date,
      currency_id:
        sale.value?.currency_id ||
        auth.company?.default_currency_id ||
        auth.company?.default_currency?.id,
    })
    ui.success('Paiement enregistré')
    await load()
  } catch (error) {
    ui.error(error.message || 'Paiement impossible')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader
      title="Paiements"
      :subtitle="sale?.invoice_number || `Vente #${route.params.id}`"
      :back-to="{ name: 'invoice', params: { id: route.params.id } }"
    >
      <template #actions>
        <AppBadge :tone="statusTone">{{ statusLabel }}</AppBadge>
      </template>
    </PageHeader>

    <div v-if="loading" class="py-16 text-center text-sm text-muted">Chargement…</div>
    <template v-else-if="sale">
      <div class="mb-4 grid grid-cols-3 gap-2">
        <AppCard class="!p-3 text-center">
          <p class="text-[11px] text-muted">Total</p>
          <p class="mt-1 text-sm font-bold">{{ formatMoney(sale.total_amount, auth.currencyCode) }}</p>
        </AppCard>
        <AppCard class="!p-3 text-center !bg-success-50">
          <p class="text-[11px] text-success-700">Payé</p>
          <p class="mt-1 text-sm font-bold text-success-700">{{ formatMoney(sale.amount_paid, auth.currencyCode) }}</p>
        </AppCard>
        <AppCard class="!p-3 text-center !bg-danger-50">
          <p class="text-[11px] text-danger-700">Reste</p>
          <p class="mt-1 text-sm font-bold text-danger-700">{{ formatMoney(sale.balance_due, auth.currencyCode) }}</p>
        </AppCard>
      </div>

      <AppCard class="mb-4 space-y-3">
        <h2 class="font-semibold text-ink">Nouveau paiement</h2>
        <AppInput v-model="form.amount" label="Montant" type="number" />
        <AppSelect v-model="form.payment_method_id" label="Mode de paiement" :options="methodOptions" />
        <AppInput v-model="form.reference" label="Référence" />
        <AppInput v-model="form.payment_date" label="Date" type="date" />
        <AppButton block :loading="saving" :disabled="Number(sale.balance_due) <= 0" @click="submit">
          Enregistrer le paiement
        </AppButton>
      </AppCard>

      <h2 class="mb-2 font-semibold text-ink">Historique des paiements</h2>
      <div class="space-y-2">
        <AppCard v-for="payment in sale.payments || []" :key="payment.id" class="!p-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-ink">{{ formatMoney(payment.amount, auth.currencyCode) }}</p>
              <p class="text-xs text-muted">
                {{ payment.payment_method?.name || 'Paiement' }} · {{ formatDate(payment.payment_date) }}
              </p>
            </div>
            <AppBadge tone="success">{{ payment.status || 'validé' }}</AppBadge>
          </div>
        </AppCard>
        <p v-if="!(sale.payments || []).length" class="py-6 text-center text-sm text-muted">
          Aucun paiement pour le moment
        </p>
      </div>
    </template>
  </div>
</template>
