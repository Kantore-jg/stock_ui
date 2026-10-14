<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Rechercher…' },
  showScan: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'scan'])
</script>

<template>
  <div class="relative flex items-center gap-2">
    <div class="relative flex-1">
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
        </svg>
      </span>
      <input
        :value="modelValue"
        :placeholder="placeholder"
        class="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>
    <button
      v-if="showScan"
      type="button"
      class="flex size-11 items-center justify-center rounded-xl border border-border bg-card text-brand-600"
      aria-label="Scanner"
      @click="$emit('scan')"
    >
      <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2m10-16h2a1 1 0 0 1 1 1v2m0 10v2a1 1 0 0 1-1 1h-2M7 12h10" />
      </svg>
    </button>
  </div>
</template>
