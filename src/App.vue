<script setup lang="ts">
import { ref } from 'vue'
import LoginView from './features/auth/LoginView.vue'
import DirectoryView from './features/directory/DirectoryView.vue'

const sessionKey = 'profiplatform.demo-session'
const actor = ref(Number(sessionStorage.getItem(sessionKey)) || 0)

function login(id: number) {
  sessionStorage.setItem(sessionKey, String(id))
  actor.value = id
}

function logout() {
  sessionStorage.removeItem(sessionKey)
  actor.value = 0
  location.hash = 'employees'
}
</script>

<template>
  <DirectoryView v-if="actor" :actor="actor" @logout="logout"/>
  <LoginView v-else @enter="login"/>
</template>
