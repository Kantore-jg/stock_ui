<script setup>
defineProps({
  type: { type: String, default: 'button' },
  variant: { type: String, default: 'primary' },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
</script>

<template>
  <button
    :type="type"
    class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
    :class="[
      block ? 'w-full' : '',
      variant === 'primary' && 'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700',
      variant === 'danger' && 'bg-danger-600 text-white hover:bg-danger-700',
      variant === 'ghost' && 'bg-transparent text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40',
      variant === 'secondary' && 'bg-card text-ink border border-border hover:bg-surface',
      variant === 'soft' && 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:text-brand-200',
    ]"
    :disabled="disabled || loading"
  >
    <span
      v-if="loading"
      class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
    <slot />
  </button>
</template>
