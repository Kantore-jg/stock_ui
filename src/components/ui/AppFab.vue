<script setup>
defineProps({
  to: { type: [String, Object], default: null },
})
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'button'"
    :to="to || undefined"
    type="button"
    class="fixed bottom-24 right-[max(1rem,calc((100vw-430px)/2+1rem))] z-30 flex size-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg shadow-brand-600/40 transition hover:bg-brand-700 active:scale-95"
  >
    <slot>+</slot>
  </component>
</template>
