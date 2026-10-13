<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const showPassword = ref(false)
const form = reactive({
  email: auth.rememberedEmail(),
  password: '',
  remember: Boolean(auth.rememberedEmail()),
})
const errors = reactive({ email: '', password: '' })

async function submit() {
  errors.email = ''
  errors.password = ''
  try {
    await auth.login(form)
    ui.success('Connexion réussie')
    router.replace((route.query.redirect && String(route.query.redirect)) || { name: 'home' })
  } catch (error) {
    if (error.errors?.email?.[0]) errors.email = error.errors.email[0]
    else if (error.errors?.password?.[0]) errors.password = error.errors.password[0]
    else ui.error(error.message || 'Identifiants incorrects')
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col justify-center">
    <div class="mb-8 text-center text-white">
      <div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-900/40">
        <svg class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 8-9-5-9 5v8l9 5 9-5V8Z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold tracking-tight">Stock Manager</h1>
      <p class="mt-1 text-sm text-white/75">Gestion de stock simple et efficace</p>
    </div>

    <form class="space-y-4 rounded-3xl bg-white p-5 shadow-2xl shadow-black/30" @submit.prevent="submit">
      <AppInput
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="admin@kanto-stock.demo"
        autocomplete="email"
        :error="errors.email"
      />
      <AppInput
        v-model="form.password"
        label="Mot de passe"
        :type="showPassword ? 'text' : 'password'"
        placeholder="••••••••"
        autocomplete="current-password"
        :error="errors.password"
      >
        <template #suffix>
          <button
            type="button"
            class="text-muted"
            aria-label="Afficher le mot de passe"
            @click="showPassword = !showPassword"
          >
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                v-if="!showPassword"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.8M9.9 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-3.1 3.9M6.1 6.1A17.5 17.5 0 0 0 2 12s3.5 7 10 7c1.3 0 2.5-.2 3.6-.6"
              />
            </svg>
          </button>
        </template>
      </AppInput>

      <label class="flex items-center gap-2 text-sm text-ink">
        <input v-model="form.remember" type="checkbox" class="size-4 rounded border-gray-300 text-brand-600" />
        Se souvenir de moi
      </label>

      <AppButton type="submit" block :loading="auth.loading">Se connecter</AppButton>

      <p class="text-center text-sm">
        <a href="#" class="font-medium text-brand-600" @click.prevent>Mot de passe oublié ?</a>
      </p>
    </form>
  </div>
</template>
