<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
import AppToast from '@/components/ui/AppToast.vue'

const route = useRoute()
const hideNav = computed(() => Boolean(route.meta.hideNav))
</script>

<template>
  <div class="min-h-full bg-surface">
    <div class="phone-shell relative min-h-full bg-surface">
      <main class="safe-top px-4 pt-4" :class="hideNav ? 'pb-8' : 'pb-28'">
        <RouterView />
      </main>
      <BottomNav v-if="!hideNav" />
    </div>
    <AppToast />
  </div>
</template>
