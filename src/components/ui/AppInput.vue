<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  autocomplete: { type: String, default: 'off' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <label class="block space-y-1.5">
    <span v-if="label" class="text-sm font-medium text-ink">{{ label }}</span>
    <div class="relative">
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :autocomplete="autocomplete"
        class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
        :class="error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-50' : ''"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <div v-if="$slots.suffix" class="absolute inset-y-0 right-3 flex items-center">
        <slot name="suffix" />
      </div>
    </div>
    <span v-if="error" class="text-xs text-danger-600">{{ error }}</span>
  </label>
</template>
