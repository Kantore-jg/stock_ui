<script setup>
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'

const { toast } = storeToRefs(useUiStore())
</script>

<template>
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="translate-y-3 opacity-0"
    leave-active-class="transition duration-150"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="toast"
      class="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div
        class="phone-shell pointer-events-auto w-full rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg"
        :class="{
          'bg-ink': toast.type === 'info',
          'bg-success-600': toast.type === 'success',
          'bg-danger-600': toast.type === 'error',
        }"
      >
        {{ toast.message }}
      </div>
    </div>
  </Transition>
</template>
