<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppFab from '@/components/ui/AppFab.vue'
import AppInput from '@/components/ui/AppInput.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import { customersApi } from '@/services/customers'
import { useUiStore } from '@/stores/ui'
import { initials, unwrapList } from '@/utils/format'

const ui = useUiStore()
const search = ref('')
const loading = ref(true)
const showForm = ref(false)
const saving = ref(false)
const customers = ref([])
const form = reactive({
  name: '',
  phone: '',
  email: '',
  code: '',
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return customers.value
  return customers.value.filter((customer) =>
    [customer.name, customer.code, customer.phone, customer.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)),
  )
})

async function load() {
  loading.value = true
  try {
    const response = await customersApi.list({ search: search.value, per_page: 50 })
    customers.value = unwrapList(response)
  } catch (error) {
    ui.error(error.message || 'Impossible de charger les clients')
  } finally {
    loading.value = false
  }
}

async function createCustomer() {
  saving.value = true
  try {
    await customersApi.create({
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      code: form.code || null,
    })
    form.name = ''
    form.phone = ''
    form.email = ''
    form.code = ''
    showForm.value = false
    ui.success('Client créé')
    await load()
  } catch (error) {
    ui.error(error.message || 'Création impossible')
  } finally {
    saving.value = false
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
    <PageHeader title="Clients" subtitle="Carnet clients" />
    <SearchBar v-model="search" placeholder="Rechercher un client…" class="mb-4" />

    <AppCard v-if="showForm" class="mb-4 space-y-3">
      <h2 class="font-semibold text-ink">Nouveau client</h2>
      <AppInput v-model="form.name" label="Nom" />
      <AppInput v-model="form.phone" label="Téléphone" />
      <AppInput v-model="form.email" label="Email" type="email" />
      <AppInput v-model="form.code" label="Code (optionnel)" />
      <div class="grid grid-cols-2 gap-2">
        <AppButton variant="secondary" @click="showForm = false">Annuler</AppButton>
        <AppButton :loading="saving" :disabled="!form.name" @click="createCustomer">Créer</AppButton>
      </div>
    </AppCard>

    <div class="space-y-2">
      <AppCard v-for="customer in filtered" :key="customer.id" class="!p-3">
        <div class="flex items-center gap-3">
          <div class="flex size-11 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
            {{ initials(customer.name) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-ink">{{ customer.name }}</p>
            <p class="truncate text-xs text-muted">
              {{ customer.code || `CLT-${customer.id}` }}
              <span v-if="customer.phone"> · {{ customer.phone }}</span>
            </p>
            <p v-if="customer.email" class="truncate text-xs text-muted">{{ customer.email }}</p>
          </div>
        </div>
      </AppCard>
      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="!filtered.length" class="py-10 text-center text-sm text-muted">Aucun client</p>
    </div>

    <AppFab @click="showForm = true" />
  </div>
</template>
