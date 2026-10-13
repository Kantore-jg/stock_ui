<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppFab from '@/components/ui/AppFab.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import { expenseCategoriesApi, expensesApi } from '@/services/expenses'
import { paymentMethodsApi } from '@/services/sales'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'
import { formatDate, formatMoney, unwrapList } from '@/utils/format'

const auth = useAuthStore()
const stockStore = useStockStore()
const ui = useUiStore()

const search = ref('')
const loading = ref(true)
const showForm = ref(false)
const saving = ref(false)
const expenses = ref([])
const categories = ref([])
const methods = ref([])

const form = reactive({
  expense_category_id: '',
  description: '',
  amount: '',
  payment_method_id: '',
  expense_date: new Date().toISOString().slice(0, 10),
})

const categoryOptions = computed(() =>
  categories.value.map((item) => ({ value: item.id, label: item.name })),
)
const methodOptions = computed(() =>
  methods.value.map((item) => ({ value: item.id, label: item.name })),
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return expenses.value
  return expenses.value.filter((expense) =>
    [expense.description, expense.reference, expense.category?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)),
  )
})

function iconFor(name = '') {
  const value = name.toLowerCase()
  if (value.includes('carbur') || value.includes('fuel')) return '⛽'
  if (value.includes('maint')) return '🔧'
  if (value.includes('banque') || value.includes('bank')) return '🏦'
  if (value.includes('élect') || value.includes('elec')) return '⚡'
  if (value.includes('télé') || value.includes('phone')) return '📱'
  return '🧾'
}

async function load() {
  loading.value = true
  try {
    const [expensesRes, categoriesRes, methodsRes] = await Promise.all([
      expensesApi.list({ per_page: 50 }),
      expenseCategoriesApi.list(),
      paymentMethodsApi.list(),
    ])
    expenses.value = unwrapList(expensesRes)
    categories.value = unwrapList(categoriesRes)
    methods.value = unwrapList(methodsRes)
    if (!form.expense_category_id && categories.value[0]) {
      form.expense_category_id = categories.value[0].id
    }
    if (!form.payment_method_id && methods.value[0]) {
      form.payment_method_id = methods.value[0].id
    }
  } catch (error) {
    ui.error(error.message || 'Impossible de charger les dépenses')
  } finally {
    loading.value = false
  }
}

async function createExpense() {
  saving.value = true
  try {
    await expensesApi.create({
      stock_id: stockStore.currentStockId || null,
      expense_category_id: Number(form.expense_category_id),
      description: form.description,
      amount: Number(form.amount),
      currency_id:
        auth.company?.default_currency_id || auth.company?.default_currency?.id,
      payment_method_id: Number(form.payment_method_id),
      expense_date: form.expense_date,
    })
    showForm.value = false
    form.description = ''
    form.amount = ''
    ui.success('Dépense créée')
    await load()
  } catch (error) {
    ui.error(error.message || 'Création impossible')
  } finally {
    saving.value = false
  }
}

watch(search, () => {})

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="Dépenses" subtitle="Suivi des frais" :back-to="{ name: 'more' }" />
    <SearchBar v-model="search" placeholder="Rechercher une dépense…" class="mb-4" />

    <AppCard v-if="showForm" class="mb-4 space-y-3">
      <h2 class="font-semibold text-ink">Nouvelle dépense</h2>
      <AppSelect v-model="form.expense_category_id" label="Catégorie" :options="categoryOptions" />
      <AppInput v-model="form.description" label="Description" />
      <AppInput v-model="form.amount" label="Montant" type="number" />
      <AppSelect v-model="form.payment_method_id" label="Paiement" :options="methodOptions" />
      <AppInput v-model="form.expense_date" label="Date" type="date" />
      <div class="grid grid-cols-2 gap-2">
        <AppButton variant="secondary" @click="showForm = false">Annuler</AppButton>
        <AppButton :loading="saving" :disabled="!form.amount" @click="createExpense">Créer</AppButton>
      </div>
    </AppCard>

    <div class="space-y-2">
      <AppCard v-for="expense in filtered" :key="expense.id" class="!p-3">
        <div class="flex items-center gap-3">
          <div class="flex size-11 items-center justify-center rounded-xl bg-surface text-lg">
            {{ iconFor(expense.category?.name) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-ink">
              {{ expense.category?.name || expense.description || 'Dépense' }}
            </p>
            <p class="truncate text-xs text-muted">
              {{ expense.description || expense.reference || '—' }} · {{ formatDate(expense.expense_date) }}
            </p>
          </div>
          <p class="font-bold text-danger-600">{{ formatMoney(expense.amount, auth.currencyCode) }}</p>
        </div>
      </AppCard>
      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="!filtered.length" class="py-10 text-center text-sm text-muted">Aucune dépense</p>
    </div>

    <AppFab @click="showForm = true" />
  </div>
</template>
