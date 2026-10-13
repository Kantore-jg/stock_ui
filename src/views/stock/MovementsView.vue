<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppFab from '@/components/ui/AppFab.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import {
  MOVEMENT_TYPES,
  isOutboundType,
  movementTypeLabel,
  movementsApi,
} from '@/services/stock'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'
import { formatDateTime, unwrapList } from '@/utils/format'

const ui = useUiStore()
const stockStore = useStockStore()
const router = useRouter()

const loading = ref(true)
const movements = ref([])
const typeFilter = ref('')

const quickActions = [
  MOVEMENT_TYPES.entry,
  MOVEMENT_TYPES.exit,
  MOVEMENT_TYPES.transfer_out,
]

const typeOptions = [
  { value: '', label: 'Tous les types' },
  { value: 'entry', label: 'Entrées' },
  { value: 'exit', label: 'Sorties' },
  { value: 'transfer', label: 'Transferts' },
  { value: 'adjustment', label: 'Ajustements' },
  { value: 'sale', label: 'Ventes' },
]

const filtered = computed(() => {
  if (!typeFilter.value) return movements.value
  return movements.value.filter((item) => {
    const type = String(item.movement_type || '')
    if (typeFilter.value === 'entry') {
      return ['entry', 'initial_entry', 'transfer_in', 'sale_return'].includes(type)
    }
    if (typeFilter.value === 'exit') return ['exit'].includes(type)
    if (typeFilter.value === 'transfer') return type.includes('transfer')
    if (typeFilter.value === 'adjustment') return type === 'adjustment'
    if (typeFilter.value === 'sale') return type === 'sale' || type === 'sale_return'
    return true
  })
})

function qtyLabel(movement) {
  const lines = movement.lines || []
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0)
  const sign = isOutboundType(movement.movement_type) ? '-' : '+'
  return `${sign}${total || 0}`
}

function title(movement) {
  return (
    movement.reason ||
    movement.reference ||
    movementTypeLabel(movement.movement_type)
  )
}

function subtitle(movement) {
  const parts = [movementTypeLabel(movement.movement_type)]
  if (movement.source_stock?.name) parts.push(`de ${movement.source_stock.name}`)
  if (movement.destination_stock?.name) parts.push(`→ ${movement.destination_stock.name}`)
  const productCount = (movement.lines || []).length
  if (productCount) parts.push(`${productCount} ligne(s)`)
  return parts.join(' · ')
}

async function load() {
  loading.value = true
  try {
    const response = await movementsApi.list({
      per_page: 50,
      stock_id: stockStore.currentStockId || undefined,
    })
    movements.value = unwrapList(response)
  } catch (error) {
    ui.error(error.message || 'Impossible de charger les mouvements')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="Mouvements de stock" subtitle="Entrées, sorties, transferts" :back-to="{ name: 'products' }" />

    <div class="mb-4 grid grid-cols-3 gap-2">
      <button
        v-for="action in quickActions"
        :key="action.value"
        type="button"
        class="rounded-2xl px-2 py-3 text-center text-xs font-semibold shadow-sm ring-1 ring-black/5"
        :class="{
          'bg-success-50 text-success-700': action.tone === 'success',
          'bg-danger-50 text-danger-700': action.tone === 'danger',
          'bg-brand-50 text-brand-700': action.tone === 'brand',
        }"
        @click="router.push({ name: 'movement-new', query: { type: action.value } })"
      >
        <span class="mb-1 block text-lg leading-none">
          {{ action.tone === 'danger' ? '↓' : action.tone === 'brand' ? '⇄' : '↑' }}
        </span>
        {{ action.short }}
      </button>
    </div>

    <AppSelect v-model="typeFilter" class="mb-4" :options="typeOptions" placeholder="Type de mouvement" />

    <div class="space-y-2 pb-20">
      <AppCard v-for="movement in filtered" :key="movement.id" class="!p-3">
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 items-center justify-center rounded-full text-sm font-bold"
            :class="isOutboundType(movement.movement_type) ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'"
          >
            {{ isOutboundType(movement.movement_type) ? '↓' : '↑' }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-ink">{{ title(movement) }}</p>
            <p class="truncate text-xs text-muted">{{ subtitle(movement) }}</p>
            <p class="text-[11px] text-muted">
              {{ formatDateTime(movement.validated_at || movement.document_date || movement.created_at) }}
            </p>
          </div>
          <div class="text-right">
            <p
              class="font-bold"
              :class="isOutboundType(movement.movement_type) ? 'text-danger-600' : 'text-success-700'"
            >
              {{ qtyLabel(movement) }}
            </p>
            <AppBadge class="mt-1" :tone="movement.status === 'validated' ? 'success' : movement.status === 'cancelled' ? 'danger' : 'neutral'">
              {{ movement.status }}
            </AppBadge>
          </div>
        </div>
        <div v-if="movement.lines?.length" class="mt-2 space-y-1 border-t border-gray-50 pt-2">
          <p
            v-for="line in movement.lines.slice(0, 3)"
            :key="line.id"
            class="flex justify-between text-xs text-muted"
          >
            <span class="truncate">{{ line.product?.name || `Produit #${line.product_id}` }}</span>
            <span class="font-semibold text-ink">× {{ line.quantity }}</span>
          </p>
          <p v-if="movement.lines.length > 3" class="text-[11px] text-muted">
            +{{ movement.lines.length - 3 }} autre(s)
          </p>
        </div>
      </AppCard>
      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="!filtered.length" class="py-10 text-center text-sm text-muted">
        Aucun mouvement — créez une entrée pour ajouter du stock
      </p>
    </div>

    <AppFab :to="{ name: 'movement-new', query: { type: 'entry' } }" />
  </div>
</template>
