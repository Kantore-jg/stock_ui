<script setup>
import AppToast from '@/components/ui/AppToast.vue'
</script>

<template>
  <div class="fixed inset-0 bg-slate-900">
    <div class="phone-shell relative h-full min-h-dvh overflow-hidden">
      <div
        class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=60')] bg-cover bg-center"
      />
      <div class="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
      <div class="relative z-10 flex h-full min-h-dvh flex-col px-5 py-8 safe-top safe-bottom">
        <RouterView />
      </div>
    </div>
    <AppToast />
  </div>
</template>
