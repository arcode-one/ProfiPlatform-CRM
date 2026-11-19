<script setup lang="ts">
type IconName = 'building' | 'users-round' | 'shield-check' | 'door-open' | 'mail' | 'plus' | 'search' | 'x' |
  'log-out' | 'chevron-right' | 'chevron-left' | 'eye' | 'eye-off' | 'settings-2' | 'arrow-up-down'

withDefaults(defineProps<{ name: IconName, size?: number }>(), { size: 19 })
const sprite = import.meta.env.BASE_URL + 'icons/lucide.svg'
</script>

<template>
  <svg class="app-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">
    <use :href="sprite + '#' + name"/>
  </svg>
</template>
