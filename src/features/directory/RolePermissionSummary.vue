<script setup lang="ts">
import { computed } from 'vue'
import type { groups } from './permissions'

const props = defineProps<{ group: (typeof groups)[number], permissions: string[] }>()
const assigned = computed(() => props.group.items.filter(item => props.permissions.includes(item.id)))
</script>

<template>
  <span v-if="!assigned.length" class="permission-summary is-empty">Нет прав</span>
  <span v-else-if="assigned.length === group.items.length" class="permission-summary is-full">Все права</span>
  <span v-else class="permission-summary">{{ assigned.map((item, index) => index ? item.short.toLowerCase() : item.short).join(', ') }}</span>
</template>
