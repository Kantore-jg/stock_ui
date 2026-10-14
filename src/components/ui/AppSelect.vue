<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Sélectionner' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  allowEmpty: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <label class="block space-y-1.5">
    <span v-if="label" class="text-sm font-medium text-ink">{{ label }}</span>
    <select
      :value="modelValue"
      :disabled="disabled"
      class="w-full appearance-none rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-60 dark:focus:ring-brand-900"
      :class="error ? 'border-danger-500' : ''"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="allowEmpty" value="">
        {{ placeholder || 'Sélectionner' }}
      </option>
      <option v-else-if="placeholder && (modelValue === '' || modelValue === null || modelValue === undefined)" value="" disabled>
        {{ placeholder }}
      </option>
      <option v-for="option in options" :key="String(option.value)" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <span v-if="error" class="text-xs text-danger-600">{{ error }}</span>
  </label>
</template>
