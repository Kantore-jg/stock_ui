<script setup>
defineProps({
  padding: { type: Boolean, default: true },
})
</script>

<template>
  <div
    class="rounded-[var(--radius-card)] bg-white shadow-sm shadow-black/5 ring-1 ring-black/5"
    :class="padding ? 'p-4' : ''"
  >
    <slot />
  </div>
</template>
