<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const stockStore = useStockStore()
const ui = useUiStore()
const router = useRouter()

const tenantLinks = [
  { label: 'Caisses', to: { name: 'cash' }, hint: 'Ouvrir / fermer / mouvements' },
  { label: 'Factures', to: { name: 'invoices' }, hint: 'Consulter et rechercher' },
  { label: 'Historique des ventes', to: { name: 'sales-history' }, hint: 'Ventes et paiements partiels' },
  { label: 'Dépenses', to: { name: 'expenses' }, hint: 'Suivi des frais' },
  { label: 'Mouvements de stock', to: { name: 'movements' }, hint: 'Entrées et sorties' },
  { label: 'Nouvelle vente', to: { name: 'sales' }, hint: 'Point de vente' },
]

const links = computed(() => {
  if (auth.isSuperAdmin) {
    return [
      { label: 'Entreprises', to: { name: 'admin-companies' }, hint: 'Créer / activer les tenants' },
    ]
  }
  return tenantLinks
})

const themeOptions = [
  { value: 'light', label: 'Clair', hint: 'Fond clair' },
  { value: 'dark', label: 'Sombre', hint: 'Fond sombre' },
  { value: 'system', label: 'Système', hint: 'Selon l’appareil' },
]

async function logout() {
  await auth.logout()
  ui.success('Déconnecté')
  router.replace({ name: 'login' })
}
</script>

<template>
  <div>
    <PageHeader title="Plus" :subtitle="auth.isSuperAdmin ? 'Superadmin plateforme' : 'Paramètres et raccourcis'" />

    <AppCard class="mb-4">
      <p class="text-sm text-muted">Connecté en tant que</p>
      <p class="mt-1 font-semibold text-ink">{{ auth.user?.name }}</p>
      <p class="text-sm text-muted">{{ auth.user?.email }}</p>
      <p v-if="auth.isSuperAdmin" class="mt-2 text-xs font-semibold text-brand-700 dark:text-brand-300">Superadmin</p>
      <template v-else>
        <p class="mt-3 text-sm text-muted">Entreprise</p>
        <p class="font-semibold text-ink">{{ auth.company?.name || '—' }}</p>
        <p class="text-xs text-muted">ID entreprise : {{ auth.user?.company_id || '—' }}</p>
        <label class="mt-4 block text-sm font-medium text-ink">Magasin courant</label>
        <select
          class="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-ink"
          :value="stockStore.currentStockId || ''"
          @change="stockStore.setCurrentStock($event.target.value)"
        >
          <option v-for="stock in stockStore.stocks" :key="stock.id" :value="stock.id">
            {{ stock.name }}
          </option>
        </select>
      </template>
    </AppCard>

    <AppCard class="mb-4">
      <h2 class="font-semibold text-ink">Apparence</h2>
      <p class="mt-1 text-xs text-muted">Thème de l’application</p>
      <div class="mt-3 grid grid-cols-3 gap-2">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          class="rounded-xl border px-2 py-3 text-center transition"
          :class="
            ui.theme === option.value
              ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/30 dark:bg-brand-900/40 dark:text-brand-200'
              : 'border-border bg-surface text-ink'
          "
          @click="ui.setTheme(option.value)"
        >
          <p class="text-sm font-semibold">{{ option.label }}</p>
          <p class="mt-0.5 text-[10px] text-muted">{{ option.hint }}</p>
        </button>
      </div>
    </AppCard>

    <div class="space-y-2">
      <RouterLink v-for="link in links" :key="link.label" :to="link.to">
        <AppCard class="!p-4 mb-2 flex items-center justify-between">
          <div>
            <p class="font-semibold text-ink">{{ link.label }}</p>
            <p class="text-xs text-muted">{{ link.hint }}</p>
          </div>
          <span class="text-muted">›</span>
        </AppCard>
      </RouterLink>
    </div>

    <button
      type="button"
      class="mt-6 w-full rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700 dark:text-danger-500"
      @click="logout"
    >
      Se déconnecter
    </button>
  </div>
</template>
