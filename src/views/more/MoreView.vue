<script setup>
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

const links = [
  { label: 'Caisses', to: { name: 'cash' }, hint: 'Ouvrir / fermer / mouvements' },
  { label: 'Factures', to: { name: 'invoices' }, hint: 'Consulter et rechercher' },
  { label: 'Historique des ventes', to: { name: 'sales-history' }, hint: 'Ventes et paiements partiels' },
  { label: 'Dépenses', to: { name: 'expenses' }, hint: 'Suivi des frais' },
  { label: 'Mouvements de stock', to: { name: 'movements' }, hint: 'Entrées et sorties' },
  { label: 'Nouvelle vente', to: { name: 'sales' }, hint: 'Point de vente' },
]

async function logout() {
  await auth.logout()
  ui.success('Déconnecté')
  router.replace({ name: 'login' })
}
</script>

<template>
  <div>
    <PageHeader title="Plus" subtitle="Paramètres et raccourcis" />

    <AppCard class="mb-4">
      <p class="text-sm text-muted">Connecté en tant que</p>
      <p class="mt-1 font-semibold text-ink">{{ auth.user?.name }}</p>
      <p class="text-sm text-muted">{{ auth.user?.email }}</p>
      <p class="mt-3 text-sm text-muted">Entreprise</p>
      <p class="font-semibold text-ink">{{ auth.company?.name || '—' }}</p>
      <label class="mt-4 block text-sm font-medium text-ink">Magasin courant</label>
      <select
        class="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm"
        :value="stockStore.currentStockId || ''"
        @change="stockStore.setCurrentStock($event.target.value)"
      >
        <option v-for="stock in stockStore.stocks" :key="stock.id" :value="stock.id">
          {{ stock.name }}
        </option>
      </select>
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
      class="mt-6 w-full rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700"
      @click="logout"
    >
      Se déconnecter
    </button>
  </div>
</template>
