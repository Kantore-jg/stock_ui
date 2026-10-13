<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { cashRegistersApi, cashSessionsApi } from '@/services/cash'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { useUiStore } from '@/stores/ui'
import { formatDateTime, formatMoney, unwrapItem, unwrapList } from '@/utils/format'

const auth = useAuthStore()
const stockStore = useStockStore()
const ui = useUiStore()

const loading = ref(true)
const busy = ref(false)
const registers = ref([])
const openSessions = ref([])
const selectedRegisterId = ref('')
const activeSession = ref(null)

const openForm = reactive({ opening_amount: '0' })
const closeForm = reactive({ counted_amount: '', closing_notes: '' })
const movementForm = reactive({
  movement_type: 'in',
  amount: '',
  description: '',
})
const createForm = reactive({
  name: 'Caisse principale',
  stock_id: '',
})

const registerOptions = computed(() =>
  registers.value.map((item) => ({ value: item.id, label: `${item.name} (${item.stock?.name || '—'})` })),
)

const selectedRegister = computed(
  () => registers.value.find((item) => Number(item.id) === Number(selectedRegisterId.value)) || null,
)

const movementOptions = [
  { value: 'in', label: 'Entrée de caisse' },
  { value: 'out', label: 'Sortie de caisse' },
  { value: 'adjustment', label: 'Ajustement' },
]

const sessionMovements = computed(() => activeSession.value?.movements || [])

const expectedNow = computed(() => {
  if (!activeSession.value) return 0
  let total = Number(activeSession.value.opening_amount || 0)
  sessionMovements.value.forEach((movement) => {
    const amount = Number(movement.amount || 0)
    if (movement.movement_type === 'out') total -= amount
    else total += amount
  })
  return total
})

async function load() {
  loading.value = true
  try {
    const [registersRes, sessionsRes] = await Promise.all([
      cashRegistersApi.list({
        stock_id: stockStore.currentStockId || undefined,
        per_page: 50,
      }),
      cashSessionsApi.list({ status: 'open', per_page: 20 }),
    ])

    let list = unwrapList(registersRes)
    if (!list.length && stockStore.currentStockId) {
      // fallback: all registers if none for current stock
      list = unwrapList(await cashRegistersApi.list({ per_page: 50 }))
    }
    registers.value = list.filter((item) => item.is_active !== false)
    openSessions.value = unwrapList(sessionsRes)

    if (!selectedRegisterId.value && registers.value[0]) {
      selectedRegisterId.value = registers.value[0].id
    }
    createForm.stock_id = stockStore.currentStockId || stockStore.stocks[0]?.id || ''
    await refreshActiveSession()
  } catch (error) {
    ui.error(error.message || 'Impossible de charger les caisses')
  } finally {
    loading.value = false
  }
}

async function refreshActiveSession() {
  const open = openSessions.value.find(
    (session) => Number(session.cash_register_id) === Number(selectedRegisterId.value),
  )
  if (!open) {
    activeSession.value = null
    return
  }
  activeSession.value = unwrapItem(await cashSessionsApi.get(open.id))
  closeForm.counted_amount = String(
    Number(activeSession.value.expected_amount ?? activeSession.value.opening_amount ?? 0),
  )
}

async function createRegister() {
  if (!createForm.name || !createForm.stock_id) {
    ui.error('Nom et magasin requis')
    return
  }
  busy.value = true
  try {
    const created = unwrapItem(
      await cashRegistersApi.create({
        name: createForm.name,
        stock_id: Number(createForm.stock_id),
        currency_id: Number(
          auth.company?.default_currency_id || auth.company?.default_currency?.id,
        ),
        is_active: true,
      }),
    )
    ui.success('Caisse créée')
    selectedRegisterId.value = created.id
    await load()
  } catch (error) {
    ui.error(error.message || 'Création impossible')
  } finally {
    busy.value = false
  }
}

async function openSession() {
  if (!selectedRegisterId.value) return
  busy.value = true
  try {
    const session = unwrapItem(
      await cashSessionsApi.open(selectedRegisterId.value, {
        opening_amount: Number(openForm.opening_amount || 0),
      }),
    )
    ui.success('Caisse ouverte')
    openSessions.value = [session, ...openSessions.value]
    activeSession.value = session
  } catch (error) {
    ui.error(error.message || 'Ouverture impossible')
  } finally {
    busy.value = false
  }
}

async function closeSession() {
  if (!activeSession.value) return
  busy.value = true
  try {
    await cashSessionsApi.close(activeSession.value.id, {
      counted_amount: Number(closeForm.counted_amount || 0),
      closing_notes: closeForm.closing_notes || null,
    })
    ui.success('Caisse fermée')
    openSessions.value = openSessions.value.filter((item) => item.id !== activeSession.value.id)
    activeSession.value = null
    closeForm.counted_amount = ''
    closeForm.closing_notes = ''
  } catch (error) {
    ui.error(error.message || 'Fermeture impossible')
  } finally {
    busy.value = false
  }
}

async function addMovement() {
  if (!activeSession.value) return
  if (!movementForm.amount) {
    ui.error('Montant requis')
    return
  }
  busy.value = true
  try {
    await cashSessionsApi.addMovement(activeSession.value.id, {
      movement_type: movementForm.movement_type,
      amount: Number(movementForm.amount),
      description: movementForm.description || null,
    })
    ui.success('Mouvement enregistré')
    movementForm.amount = ''
    movementForm.description = ''
    activeSession.value = unwrapItem(await cashSessionsApi.get(activeSession.value.id))
    closeForm.counted_amount = String(expectedNow.value)
  } catch (error) {
    ui.error(error.message || 'Mouvement impossible')
  } finally {
    busy.value = false
  }
}

async function onRegisterChange() {
  await refreshActiveSession()
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="Caisses" subtitle="Ouverture, fermeture et mouvements" :back-to="{ name: 'more' }" />

    <div v-if="loading" class="py-16 text-center text-sm text-muted">Chargement…</div>
    <div v-else class="space-y-4">
      <AppCard v-if="!registers.length" class="space-y-3">
        <h2 class="font-semibold text-ink">Aucune caisse</h2>
        <p class="text-sm text-muted">Créez une caisse pour ce magasin afin d’ouvrir une session.</p>
        <AppInput v-model="createForm.name" label="Nom de la caisse" />
        <AppSelect
          v-model="createForm.stock_id"
          label="Magasin"
          :options="stockStore.stocks.map((s) => ({ value: s.id, label: s.name }))"
        />
        <AppButton block :loading="busy" @click="createRegister">Créer la caisse</AppButton>
      </AppCard>

      <template v-else>
        <AppSelect
          v-model="selectedRegisterId"
          label="Caisse"
          :options="registerOptions"
          @update:model-value="onRegisterChange"
        />

        <AppCard v-if="!activeSession" class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-ink">{{ selectedRegister?.name }}</p>
              <p class="text-xs text-muted">Session fermée</p>
            </div>
            <AppBadge tone="neutral">Fermée</AppBadge>
          </div>
          <AppInput v-model="openForm.opening_amount" label="Fond de caisse (ouverture)" type="number" />
          <AppButton block :loading="busy" @click="openSession">Ouvrir la caisse</AppButton>
        </AppCard>

        <template v-else>
          <AppCard class="space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold text-ink">{{ selectedRegister?.name }}</p>
                <p class="text-xs text-muted">
                  Ouverte {{ formatDateTime(activeSession.opened_at) }}
                  <span v-if="activeSession.user?.name"> · {{ activeSession.user.name }}</span>
                </p>
              </div>
              <AppBadge tone="success">Ouverte</AppBadge>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2">
              <div class="rounded-xl bg-surface p-3">
                <p class="text-[11px] text-muted">Ouverture</p>
                <p class="font-bold">{{ formatMoney(activeSession.opening_amount, auth.currencyCode) }}</p>
              </div>
              <div class="rounded-xl bg-surface p-3">
                <p class="text-[11px] text-muted">Attendu</p>
                <p class="font-bold text-brand-700">
                  {{ formatMoney(expectedNow, auth.currencyCode) }}
                </p>
              </div>
            </div>
          </AppCard>

          <AppCard class="space-y-3">
            <h2 class="font-semibold text-ink">Mouvement de caisse</h2>
            <AppSelect v-model="movementForm.movement_type" label="Type" :options="movementOptions" />
            <AppInput v-model="movementForm.amount" label="Montant" type="number" />
            <AppInput v-model="movementForm.description" label="Description" />
            <AppButton block variant="soft" :loading="busy" @click="addMovement">Enregistrer</AppButton>
          </AppCard>

          <div>
            <h2 class="mb-2 font-semibold text-ink">Historique session</h2>
            <div class="space-y-2">
              <AppCard v-for="movement in sessionMovements" :key="movement.id" class="!p-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="font-semibold capitalize text-ink">{{ movement.movement_type }}</p>
                    <p class="text-xs text-muted">
                      {{ movement.description || '—' }} · {{ formatDateTime(movement.created_at) }}
                    </p>
                  </div>
                  <p
                    class="font-bold"
                    :class="movement.movement_type === 'out' ? 'text-danger-600' : 'text-success-700'"
                  >
                    {{ movement.movement_type === 'out' ? '-' : '+' }}
                    {{ formatMoney(movement.amount, auth.currencyCode) }}
                  </p>
                </div>
              </AppCard>
              <p v-if="!sessionMovements.length" class="py-4 text-center text-sm text-muted">
                Aucun mouvement pour cette session
              </p>
            </div>
          </div>

          <AppCard class="space-y-3">
            <h2 class="font-semibold text-ink">Fermer la caisse</h2>
            <AppInput v-model="closeForm.counted_amount" label="Montant compté" type="number" />
            <AppInput v-model="closeForm.closing_notes" label="Notes de clôture" />
            <AppButton block variant="danger" :loading="busy" @click="closeSession">Fermer la session</AppButton>
          </AppCard>
        </template>
      </template>
    </div>
  </div>
</template>
