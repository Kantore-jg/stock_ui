<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import { adminCompaniesApi } from '@/services/admin'
import { useUiStore } from '@/stores/ui'
import { formatDate, unwrapList } from '@/utils/format'

const ui = useUiStore()
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const search = ref('')
const companies = ref([])

const form = reactive({
  company_name: '',
  admin_name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  password_confirmation: '',
})

async function load() {
  loading.value = true
  try {
    companies.value = unwrapList(
      await adminCompaniesApi.list({ search: search.value.trim() || undefined, per_page: 50 }),
    )
  } catch (error) {
    ui.error(error.message || 'Impossible de charger les entreprises')
  } finally {
    loading.value = false
  }
}

async function createCompany() {
  if (!form.company_name || !form.admin_name || !form.email || !form.password) {
    ui.error('Champs obligatoires manquants')
    return
  }
  if (form.password !== form.password_confirmation) {
    ui.error('Les mots de passe ne correspondent pas')
    return
  }
  saving.value = true
  try {
    await adminCompaniesApi.create({
      company_name: form.company_name,
      admin_name: form.admin_name,
      email: form.email,
      phone: form.phone || null,
      address: form.address || null,
      password: form.password,
      password_confirmation: form.password_confirmation,
      currency_code: 'BIF',
    })
    ui.success('Entreprise créée')
    showForm.value = false
    form.company_name = ''
    form.admin_name = ''
    form.email = ''
    form.phone = ''
    form.address = ''
    form.password = ''
    form.password_confirmation = ''
    await load()
  } catch (error) {
    ui.error(error.message || 'Création impossible')
  } finally {
    saving.value = false
  }
}

async function toggleActive(company) {
  try {
    await adminCompaniesApi.update(company.id, { is_active: !company.is_active })
    ui.success(company.is_active ? 'Entreprise désactivée' : 'Entreprise activée')
    await load()
  } catch (error) {
    ui.error(error.message || 'Mise à jour impossible')
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
    <PageHeader title="Entreprises" subtitle="Multi-tenant · superadmin" :back-to="{ name: 'more' }">
      <template #actions>
        <AppButton class="!py-2 text-xs" @click="showForm = !showForm">
          {{ showForm ? 'Fermer' : '+ Entreprise' }}
        </AppButton>
      </template>
    </PageHeader>

    <SearchBar v-model="search" placeholder="Rechercher une entreprise…" class="mb-4" />

    <AppCard v-if="showForm" class="mb-4 space-y-3">
      <h2 class="font-semibold text-ink">Nouvelle entreprise client</h2>
      <AppInput v-model="form.company_name" label="Nom de l'entreprise" />
      <AppInput v-model="form.admin_name" label="Nom de l'admin client" />
      <AppInput v-model="form.email" label="Email admin (connexion)" type="email" />
      <AppInput v-model="form.phone" label="Téléphone" />
      <AppInput v-model="form.address" label="Adresse" />
      <AppInput v-model="form.password" label="Mot de passe admin" type="password" />
      <AppInput v-model="form.password_confirmation" label="Confirmer le mot de passe" type="password" />
      <AppButton block :loading="saving" @click="createCompany">Enregistrer l'entreprise</AppButton>
      <p class="text-xs text-muted">
        Crée l’entreprise + un admin avec <code>company_id</code>, stock, caisse et paramètres de base.
      </p>
    </AppCard>

    <div class="space-y-2">
      <AppCard v-for="company in companies" :key="company.id" class="!p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-ink">{{ company.name }}</p>
              <AppBadge :tone="company.is_active ? 'success' : 'danger'">
                {{ company.is_active ? 'Active' : 'Inactive' }}
              </AppBadge>
            </div>
            <p class="text-xs text-muted">
              ID {{ company.id }}
              · {{ company.users_count ?? '—' }} utilisateur(s)
              · {{ formatDate(company.created_at) }}
            </p>
            <p v-if="company.email" class="text-xs text-muted">{{ company.email }}</p>
          </div>
          <AppButton
            variant="secondary"
            class="!py-2 text-xs"
            @click="toggleActive(company)"
          >
            {{ company.is_active ? 'Désactiver' : 'Activer' }}
          </AppButton>
        </div>
      </AppCard>
      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="!companies.length" class="py-10 text-center text-sm text-muted">
        Aucune entreprise
      </p>
    </div>
  </div>
</template>
