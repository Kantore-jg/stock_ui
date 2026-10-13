<script setup>
defineProps({
  tone: { type: String, default: 'neutral' },
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :class="{
      'bg-gray-100 text-gray-700': tone === 'neutral',
      'bg-success-50 text-success-700': tone === 'success',
      'bg-danger-50 text-danger-700': tone === 'danger',
      'bg-warning-50 text-warning-600': tone === 'warning',
      'bg-brand-50 text-brand-700': tone === 'brand',
    }"
  >
    <slot />
  </span>
</template>
