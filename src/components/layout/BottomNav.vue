<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const active = computed(() => route.meta.tab || 'home')

const tabs = [
  { id: 'home', label: 'Accueil', to: { name: 'home' }, icon: 'home' },
  { id: 'stock', label: 'Stock', to: { name: 'products' }, icon: 'box' },
  { id: 'sales', label: 'Ventes', to: { name: 'sales' }, icon: 'cart' },
  { id: 'customers', label: 'Clients', to: { name: 'customers' }, icon: 'users' },
  { id: 'more', label: 'Plus', to: { name: 'more' }, icon: 'more' },
]
</script>

<template>
  <nav
    class="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
  >
    <div class="phone-shell grid grid-cols-5 px-1 pt-2 pb-1">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.id"
        :to="tab.to"
        class="flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-[11px] font-medium transition"
        :class="active === tab.id ? 'text-brand-600' : 'text-muted'"
      >
        <span
          class="flex size-8 items-center justify-center rounded-xl"
          :class="active === tab.id ? 'bg-brand-50 dark:bg-brand-900/50' : ''"
        >
          <svg
            v-if="tab.icon === 'home'"
            class="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
          </svg>
          <svg
            v-else-if="tab.icon === 'box'"
            class="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 8-9-5-9 5v8l9 5 9-5V8Zm-9 5V3m0 10 9-5m-9 5-9-5" />
          </svg>
          <svg
            v-else-if="tab.icon === 'cart'"
            class="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.8 4M7 13h10l3-8H5.8M7 13 5.8 7M7 13l-1.5 5h13M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
          </svg>
          <svg
            v-else-if="tab.icon === 'users'"
            class="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m16-5a4 4 0 0 0 0-8m-4 4a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
          </svg>
          <svg
            v-else
            class="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />
          </svg>
        </span>
        {{ tab.label }}
      </RouterLink>
    </div>
  </nav>
</template>
