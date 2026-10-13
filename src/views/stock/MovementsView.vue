<script setup>
import { computed, onMounted, ref } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { movementsApi } from '@/services/stock'
import { useUiStore } from '@/stores/ui'
import { formatDateTime, unwrapList } from '@/utils/format'

const ui = useUiStore()
const loading = ref(true)
const movements = ref([])
const typeFilter = ref('')

const typeOptions = [
  { value: '', label: 'Tous les types' },
  { value: 'in', label: 'Entrées' },
  { value: 'out', label: 'Sorties' },
  { value: 'transfer', label: 'Transferts' },
  { value: 'adjustment', label: 'Ajustements' },
]

const filtered = computed(() => {
  if (!typeFilter.value) return movements.value
  return movements.value.filter((item) => {
    const type = String(item.movement_type || '').toLowerCase()
    if (typeFilter.value === 'in') {
      return ['entry', 'initial_entry', 'transfer_in', 'sale_return'].includes(type)
    }
    if (typeFilter.value === 'out') {
      return ['exit', 'transfer_out', 'sale'].includes(type)
    }
    if (typeFilter.value === 'transfer') return type.includes('transfer')
    if (typeFilter.value === 'adjustment') return type === 'adjustment'
    return true
  })
})

function isOutbound(type) {
  const value = String(type || '').toLowerCase()
  return ['exit', 'transfer_out', 'sale'].includes(value)
}

function qtyLabel(movement) {
  const lines = movement.lines || []
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0)
  const sign = isOutbound(movement.movement_type) ? '-' : '+'
  return `${sign}${total || lines.length || 0}`
}

async function load() {
  loading.value = true
  try {
    const response = await movementsApi.list({ per_page: 50 })
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
    <PageHeader title="Mouvements de stock" subtitle="Historique" :back-to="{ name: 'products' }" />

    <AppSelect v-model="typeFilter" class="mb-4" :options="typeOptions" placeholder="Type de mouvement" />

    <div class="space-y-2">
      <AppCard v-for="movement in filtered" :key="movement.id" class="!p-3">
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 items-center justify-center rounded-full text-sm font-bold"
            :class="isOutbound(movement.movement_type) ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'"
          >
            {{ isOutbound(movement.movement_type) ? '↓' : '↑' }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-ink">
              {{ movement.reason || movement.reference || movement.movement_type }}
            </p>
            <p class="text-xs text-muted">
              {{ formatDateTime(movement.validated_at || movement.document_date || movement.created_at) }}
            </p>
          </div>
          <div class="text-right">
            <p
              class="font-bold"
              :class="isOutbound(movement.movement_type) ? 'text-danger-600' : 'text-success-700'"
            >
              {{ qtyLabel(movement) }}
            </p>
            <AppBadge class="mt-1" :tone="movement.status === 'validated' ? 'success' : 'neutral'">
              {{ movement.status }}
            </AppBadge>
          </div>
        </div>
      </AppCard>
      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="!filtered.length" class="py-10 text-center text-sm text-muted">Aucun mouvement</p>
    </div>
  </div>
</template>
