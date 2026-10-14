<script setup>
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import { customersApi } from '@/services/customers'
import { productsApi } from '@/services/products'
import { paymentMethodsApi, salesApi } from '@/services/sales'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'
import { formatMoney, unwrapItem, unwrapList } from '@/utils/format'

const auth = useAuthStore()
const stockStore = useStockStore()
const ui = useUiStore()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const creatingCustomer = ref(false)
const showCustomerForm = ref(false)
const search = ref('')
const customers = ref([])
const products = ref([])
const paymentMethods = ref([])
const lines = ref([])

const form = reactive({
  customer_id: '',
  payment_method_id: '',
  amount_received: '',
})

const newCustomer = reactive({
  name: '',
  phone: '',
  email: '',
})

function productTaxRate(product) {
  const label = product?.product_label
  if (!label || label.is_tax_exempt) return 0
  return Number(label.default_tax_rate || 0)
}

const customerOptions = computed(() =>
  customers.value.map((item) => ({
    value: String(item.id),
    label: item.phone ? `${item.name} · ${item.phone}` : item.name,
  })),
)
const paymentOptions = computed(() =>
  paymentMethods.value.map((item) => ({ value: String(item.id), label: item.name })),
)
const selectedPaymentMethod = computed(() =>
  paymentMethods.value.find((item) => String(item.id) === String(form.payment_method_id)),
)
const isCreditSale = computed(() => {
  const code = String(selectedPaymentMethod.value?.code || '').toLowerCase()
  const name = String(selectedPaymentMethod.value?.name || '').toLowerCase()
  return code === 'credit' || name.includes('crédit') || name.includes('credit')
})
const selectedCustomerName = computed(() => {
  if (!form.customer_id) return 'Client passage'
  return customers.value.find((item) => String(item.id) === String(form.customer_id))?.name || 'Client'
})

const filteredProducts = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return products.value.slice(0, 8)
  return products.value
    .filter((product) =>
      [product.name, product.sku, product.barcode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
    .slice(0, 8)
})

const subtotal = computed(() =>
  lines.value.reduce((sum, line) => sum + Number(line.unit_price) * Number(line.quantity), 0),
)
const taxAmount = computed(() =>
  lines.value.reduce((sum, line) => {
    const lineHt = Number(line.unit_price) * Number(line.quantity)
    return sum + (lineHt * Number(line.tax_rate || 0)) / 100
  }, 0),
)
const total = computed(() => subtotal.value + taxAmount.value)
const avgTaxLabel = computed(() => {
  if (!lines.value.length) return '—'
  const rates = [...new Set(lines.value.map((line) => Number(line.tax_rate || 0)))]
  if (rates.length === 1) return `${rates[0]} %`
  return 'mixte'
})

function addProduct(product) {
  const existing = lines.value.find((line) => line.product_id === product.id)
  if (existing) {
    existing.quantity += 1
    return
  }
  lines.value.push({
    product_id: product.id,
    name: product.name,
    unit_price: Number(product.selling_price || 0),
    quantity: 1,
    tax_rate: productTaxRate(product),
    tax_label: product.product_label?.name || 'Sans TVA',
  })
  search.value = ''
}

function changeQty(line, delta) {
  line.quantity = Math.max(1, Number(line.quantity) + delta)
}

function removeLine(index) {
  lines.value.splice(index, 1)
}

async function loadCustomers() {
  customers.value = unwrapList(await customersApi.list({ per_page: 100 }))
}

async function load() {
  loading.value = true
  try {
    const [productsRes, methodsRes] = await Promise.all([
      productsApi.list({ per_page: 100 }),
      paymentMethodsApi.list(),
      loadCustomers(),
    ])
    products.value = unwrapList(productsRes)
    paymentMethods.value = unwrapList(methodsRes)
    if (!form.payment_method_id && paymentMethods.value.length) {
      const cash =
        paymentMethods.value.find((item) => String(item.code).toLowerCase() === 'cash') ||
        paymentMethods.value.find((item) => String(item.code).toLowerCase() !== 'credit') ||
        paymentMethods.value[0]
      form.payment_method_id = String(cash.id)
    }
  } catch (error) {
    ui.error(error.message || 'Chargement impossible')
  } finally {
    loading.value = false
  }
}

async function createCustomerInline() {
  if (!newCustomer.name.trim()) {
    ui.error('Nom du client requis')
    return
  }
  creatingCustomer.value = true
  try {
    const created = unwrapItem(
      await customersApi.create({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone || null,
        email: newCustomer.email || null,
      }),
    )
    await loadCustomers()
    form.customer_id = String(created.id)
    newCustomer.name = ''
    newCustomer.phone = ''
    newCustomer.email = ''
    showCustomerForm.value = false
    ui.success(`Client « ${created.name} » ajouté`)
  } catch (error) {
    ui.error(error.message || 'Création client impossible')
  } finally {
    creatingCustomer.value = false
  }
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 10000) / 10000
}

async function submit() {
  if (saving.value) return
  saving.value = true
  try {
    if (!stockStore.currentStockId) {
      ui.error('Aucun magasin sélectionné')
      return
    }
    if (!lines.value.length) {
      ui.error('Ajoutez au moins un produit')
      return
    }
    const currencyId =
      auth.company?.default_currency_id ||
      auth.company?.default_currency?.id ||
      products.value[0]?.currency_id
    const customerId = form.customer_id ? Number(form.customer_id) : null
    const created = unwrapItem(
      await salesApi.create({
        stock_id: Number(stockStore.currentStockId),
        customer_id: customerId,
        sale_date: new Date().toISOString().slice(0, 10),
        currency_id: Number(currencyId),
        items: lines.value.map((line) => ({
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
        })),
      }),
    )
    const validated = unwrapItem(await salesApi.validate(created.id))
    const due = roundMoney(validated.balance_due ?? validated.total_amount ?? 0)

    // À crédit : aucun encaissement — la facture reste due / non payée.
    if (!isCreditSale.value) {
      const tenderedRaw = form.amount_received
      const tendered =
        tenderedRaw === '' || tenderedRaw === null || tenderedRaw === undefined
          ? due
          : roundMoney(tenderedRaw)
      const amount = roundMoney(Math.min(Math.max(0, tendered), due))
      if (amount > 0 && form.payment_method_id) {
        await salesApi.addPayment(validated.id || created.id, {
          payment_method_id: Number(form.payment_method_id),
          amount,
          payment_date: new Date().toISOString().slice(0, 10),
          currency_id: Number(currencyId),
        })
      }
      const change = roundMoney(Math.max(0, tendered - due))
      ui.success(
        change > 0
          ? `Vente validée · monnaie ${formatMoney(change, auth.currencyCode)}`
          : `Vente validée · ${selectedCustomerName.value}`,
      )
    } else {
      ui.success(`Vente à crédit · reste dû ${formatMoney(due, auth.currencyCode)}`)
    }
    lines.value = []
    form.amount_received = ''
    await router.push({ name: 'invoice', params: { id: validated.id || created.id } })
  } catch (error) {
    ui.error(error.message || 'Validation impossible')
  } finally {
    saving.value = false
  }
}

onMounted(load)
onActivated(loadCustomers)
</script>

<template>
  <div>
    <PageHeader title="Nouvelle vente" :subtitle="stockStore.currentStock?.name || 'POS'">
      <template #actions>
        <RouterLink
          :to="{ name: 'sales-history' }"
          class="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-brand-700 ring-1 ring-black/5"
        >
          Historique
        </RouterLink>
      </template>
    </PageHeader>

    <div v-if="loading" class="py-16 text-center text-sm text-muted">Chargement…</div>
    <div v-else class="space-y-4">
      <div class="flex items-end gap-2">
        <div class="flex-1">
          <AppSelect
            v-model="form.customer_id"
            label="Client"
            :options="customerOptions"
            placeholder="Client passage"
            allow-empty
          />
        </div>
        <button
          type="button"
          class="mb-0.5 flex size-11 items-center justify-center rounded-xl bg-brand-600 text-xl text-white"
          aria-label="Nouveau client"
          @click="showCustomerForm = !showCustomerForm"
        >
          +
        </button>
      </div>

      <AppCard v-if="showCustomerForm" class="space-y-3">
        <h3 class="font-semibold text-ink">Nouveau client</h3>
        <AppInput v-model="newCustomer.name" label="Nom" placeholder="Nom du client" />
        <AppInput v-model="newCustomer.phone" label="Téléphone" />
        <AppInput v-model="newCustomer.email" label="Email" type="email" />
        <div class="grid grid-cols-2 gap-2">
          <AppButton variant="secondary" @click="showCustomerForm = false">Annuler</AppButton>
          <AppButton :loading="creatingCustomer" @click="createCustomerInline">Ajouter</AppButton>
        </div>
      </AppCard>

      <p v-if="form.customer_id" class="text-xs text-muted">
        Client sélectionné : <span class="font-semibold text-ink">{{ selectedCustomerName }}</span>
      </p>

      <SearchBar v-model="search" placeholder="Ajouter un produit…" show-scan />
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
          <span class="font-semibold text-brand-700">
            {{ formatMoney(product.selling_price, auth.currencyCode) }}
          </span>
        </button>
      </div>

      <div class="space-y-2">
        <AppCard v-for="(line, index) in lines" :key="line.product_id" class="!p-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-semibold text-ink">{{ line.name }}</p>
              <p class="text-xs text-muted">
                {{ formatMoney(line.unit_price, auth.currencyCode) }}
                · TVA {{ line.tax_rate || 0 }}%
              </p>
            </div>
            <button type="button" class="text-danger-600" @click="removeLine(index)">
              <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5h6v2m-7 3v8m4-8v8m4-8v8M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
              </svg>
            </button>
          </div>
          <div class="mt-3 flex items-center gap-3">
            <button type="button" class="flex size-8 items-center justify-center rounded-lg bg-surface" @click="changeQty(line, -1)">−</button>
            <span class="min-w-8 text-center font-semibold">{{ line.quantity }}</span>
            <button type="button" class="flex size-8 items-center justify-center rounded-lg bg-surface" @click="changeQty(line, 1)">+</button>
            <span class="ml-auto font-bold text-ink">
              {{ formatMoney(line.unit_price * line.quantity, auth.currencyCode) }}
            </span>
          </div>
        </AppCard>
      </div>

      <AppCard class="space-y-2 text-sm">
        <div class="flex justify-between"><span class="text-muted">Total HT</span><span>{{ formatMoney(subtotal, auth.currencyCode) }}</span></div>
        <div class="flex justify-between">
          <span class="text-muted">TVA ({{ avgTaxLabel }})</span>
          <span>{{ formatMoney(taxAmount, auth.currencyCode) }}</span>
        </div>
        <div class="flex justify-between border-t border-border pt-2 text-base font-bold">
          <span>Total TTC</span><span>{{ formatMoney(total, auth.currencyCode) }}</span>
        </div>
        <p class="text-[11px] text-muted">La TVA vient du paramétrage de chaque produit.</p>
      </AppCard>

      <AppSelect v-model="form.payment_method_id" label="Mode de paiement" :options="paymentOptions" />
      <p v-if="isCreditSale" class="rounded-xl bg-warning-50 px-3 py-2 text-xs text-warning-600">
        Mode à crédit : aucun paiement ne sera enregistré. La facture restera due.
      </p>
      <template v-else>
        <AppInput
          v-model="form.amount_received"
          label="Montant reçu"
          type="number"
          :placeholder="String(total)"
        />
        <p
          v-if="form.amount_received !== '' && Number(form.amount_received) > total"
          class="text-xs text-muted"
        >
          Monnaie à rendre :
          {{ formatMoney(Number(form.amount_received) - total, auth.currencyCode) }}
        </p>
      </template>

      <AppButton block :loading="saving" :disabled="saving" @click="submit">
        Valider la vente
      </AppButton>
    </div>
  </div>
</template>
