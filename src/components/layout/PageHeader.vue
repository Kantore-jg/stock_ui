<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  backTo: { type: [String, Object], default: null },
})
</script>

<template>
  <header class="mb-4 flex items-start justify-between gap-3">
    <div class="flex min-w-0 items-start gap-3">
      <RouterLink
        v-if="backTo"
        :to="backTo"
        class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-ink"
        aria-label="Retour"
      >
        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </RouterLink>
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-ink">{{ title }}</h1>
        <p v-if="subtitle" class="mt-0.5 truncate text-sm text-muted">{{ subtitle }}</p>
        <slot name="subtitle" />
      </div>
    </div>
    <div class="shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
