<script setup lang="ts">
import { nextTick, ref } from 'vue'
import Icon from '../../components/Icon.vue'
import Brand from '../../components/Brand.vue'
import { demoSupervisor } from '../directory/demo'
import { loadDirectory } from '../directory/storage'
const emit = defineEmits<{ enter: [number] }>()
const login = ref('')
const password = ref('')
const reveal = ref(false)
type Screen = 'login' | 'recovery' | 'confirmation'
const screen = ref<Screen>('login')
const titles = { login: 'Вход в кабинет', recovery: 'Восстановление доступа', confirmation: 'Запрос принят' }
const heading = ref<HTMLHeadingElement>()
const error = ref('')
async function changeScreen(next: Screen) {
  password.value = ''
  reveal.value = false
  error.value = ''
  screen.value = next
  await nextTick()
  heading.value?.focus()
}
function submit() {
  let directory
  try { directory = loadDirectory() } catch { error.value = 'Не удалось открыть локальное хранилище.'; return }
  const name = login.value.trim().toLowerCase()
  const account = name === demoSupervisor.login ? demoSupervisor : directory.employees.find(e => e.login.toLowerCase() === name)
  if (!account?.active || password.value !== 'demo') { error.value = 'Проверь логин и пароль. Учётная запись должна быть активна.'; return }
  emit('enter', account.id)
}
</script>
<template>
  <div class="login-page">
    <header class="login-brand">
      <Brand/>
      <span class="login-brand__product">CRM</span>
    </header>
    <div class="auth-stage">
      <div class="auth-art" aria-hidden="true"><div class="brand-steps"><i/><i/><i/></div></div>
      <main class="login-form" :data-screen="screen">
      <h1 ref="heading" tabindex="-1">{{ titles[screen] }}</h1>
      <form v-if="screen === 'login'" key="login" @submit.prevent="submit">
        <label>Логин<input v-model="login" required autocomplete="username"></label>
        <div class="password-field">
          <div class="password-heading">
            <label for="login-password">Пароль</label>
            <button type="button" class="forgot-password" @click="changeScreen('recovery')">Забыли пароль?</button>
          </div>
          <div class="password">
            <input id="login-password" v-model="password" :type="reveal ? 'text' : 'password'" required autocomplete="current-password">
            <button type="button" class="icon-btn" @click="reveal = !reveal" :aria-label="reveal ? 'Скрыть пароль' : 'Показать пароль'"><Icon :name="reveal ? 'eye-off' : 'eye'"/></button>
          </div>
        </div>
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <button type="submit" class="primary submit"><Icon name="door-open" :size="24"/>Войти</button>
      </form>
      <form v-else-if="screen === 'recovery'" key="recovery" @submit.prevent="changeScreen('confirmation')">
        <label>Логин<input v-model.trim="login" required pattern=".*\S.*" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
        <button type="submit" class="primary submit"><Icon name="mail" :size="24"/>Продолжить</button>
        <button type="button" class="forgot-password" @click="changeScreen('login')">Вернуться ко входу</button>
      </form>
      <div v-else class="recovery-result">
        <p>Если такой логин зарегистрирован, ссылка для восстановления придёт на почту из карточки сотрудника. В демоверсии письмо не отправляется.</p>
        <button type="button" class="primary submit" @click="changeScreen('login')"><Icon name="door-open" :size="24"/>Вернуться ко входу</button>
      </div>
      </main>
    </div>
  </div>
</template>
