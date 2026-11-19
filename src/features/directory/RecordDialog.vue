<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue'
import { emptyEmployee, emptyRole, jobs } from './model'
import { groups, recordAccess, systemRole } from './permissions'
import { saveRecord } from './storage'
import type { Directory, Employee, Role } from './model'
import Icon from '../../components/Icon.vue'
const props = defineProps<{ kind: 'employee' | 'role', record?: Employee | Role, directory: Directory, actor: number, rights: Set<string> }>()
const emit = defineEmits<{ close: [], saved: [Directory, number] }>()
const original = JSON.stringify(props.record) || ''
const employee = ref<Employee>(props.kind === 'employee' && props.record ? structuredClone(toRaw(props.record as Employee)) : emptyEmployee())
const role = ref<Role>(props.kind === 'role' && props.record ? structuredClone(toRaw(props.record as Role)) : emptyRole())
const dialog = ref<HTMLDialogElement>()
const tab = ref('main')
const employeeTabs = computed(() => {
  const tabs = [['main','Основное'], ['contacts','Контакты']]
  if (props.rights.has('roles.read') || props.rights.has('roles.assign')) tabs.push(['access','Роли'])
  return tabs
})
const error = ref('')
const access = computed(() => recordAccess(props.kind, props.record, props.rights, props.actor))
const locked = computed(() => !access.value.writable)
const title = props.record?.name || (props.kind === 'employee' ? 'Новый сотрудник' : 'Новая роль')
onMounted(() => dialog.value?.showModal())
const saving = ref(false)
async function save() {
  if (saving.value || locked.value) return
  saving.value = true
  try {
    const draft = props.kind === 'employee' ? employee.value : role.value
    const persist = () => saveRecord(props.kind, draft, original, props.actor)
    const next = navigator.locks ? await navigator.locks.request('profiplatform-directory-write', persist) : persist()
    emit('saved', next, draft.id || (props.kind === 'employee' ? next.employees : next.roles).at(-1)!.id)
  } catch (e) { error.value = e instanceof Error ? e.message : 'Не удалось сохранить изменения.' }
  finally { saving.value = false }
}
</script>
<template>
<dialog ref="dialog" class="modal record-panel" :class="{ 'role-dialog': kind === 'role' }" closedby="any" aria-labelledby="dialog-title" @cancel.prevent="emit('close')" @close="emit('close')">
  <header class="modal-head">
    <div><small>{{ kind === 'employee' ? 'Сотрудники' : 'Роли' }}<template v-if="record"> / № {{ record.id }}</template></small><h2 id="dialog-title">{{ title }}</h2></div>
    <button class="modal-close" aria-label="Закрыть" @click="emit('close')"><Icon name="x" :size="20"/></button>
  </header>
  <form @submit.prevent="save">
    <div class="modal-scroll">
      <template v-if="kind === 'employee'">
        <div class="tabs" aria-label="Разделы карточки">
          <button v-for="item in employeeTabs" :key="item[0]" type="button" :aria-pressed="tab === item[0]" @click="tab = item[0]">{{ item[1] }}</button>
        </div>
        <div v-if="tab === 'main'" class="field-grid">
          <label class="wide">Имя для отображения<input :disabled="!access.edit" v-model.trim="employee.name" required maxlength="100" placeholder="Имя и фамилия"></label>
          <label>Логин<input :disabled="!access.edit" v-model.trim="employee.login" required autocomplete="off" maxlength="80"></label>
          <label>Должность<select :disabled="!access.edit" v-model="employee.job"><option value="">Не указана</option><option v-for="j in jobs" :key="j">{{ j }}</option></select></label>
          <label>Фамилия<input :disabled="!access.edit" v-model.trim="employee.surname" maxlength="35"></label>
          <label>Имя<input :disabled="!access.edit" v-model.trim="employee.firstName" maxlength="35"></label>
          <label>Отчество<input :disabled="!access.edit" v-model.trim="employee.patronymic" maxlength="40"></label>
          <label>Пол<select :disabled="!access.edit" v-model="employee.gender"><option value="">Не указан</option><option>Мужской</option><option>Женский</option></select></label>
          <label>Статус<select v-model="employee.active" :disabled="!access.status"><option :value="true">Активен</option><option :value="false">Отключён</option></select></label>
          <label class="wide">Примечание<textarea :disabled="!access.edit" v-model="employee.notes" rows="2"/></label>
        </div>
        <fieldset v-else-if="tab === 'contacts'" :disabled="!access.edit" class="field-grid">
          <label>E-mail<input v-model.trim="employee.email" type="email" autocomplete="off"></label>
          <label>Телефон<input v-model.trim="employee.phone" type="tel"></label>
          <label>Код в Telegram<input v-model.trim="employee.telegram" inputmode="numeric"></label>
          <label>Код в MAX<input v-model.trim="employee.max" inputmode="numeric"></label>
        </fieldset>
        <div v-else-if="rights.has('roles.read') || rights.has('roles.assign')" class="checks">
          <p class="hint">Можно назначить несколько ролей.</p>
          <label v-for="r in directory.roles.filter(r => r.active || employee.roles.includes(r.id))" :key="r.id">
            <input type="checkbox" :value="r.id" v-model="employee.roles" :disabled="!access.assign || systemRole(r.id)">
            {{ r.name }}<small v-if="systemRole(r.id)">Системная</small><small v-else-if="!r.active">Отключена</small>
          </label>
        </div>
      </template>
      <template v-else>
        <div class="field-grid">
          <label class="wide">Название роли<input v-model.trim="role.name" :disabled="!access.edit" required maxlength="100"></label>
          <label>Тег<input v-model.trim="role.tag" :disabled="!access.edit" required placeholder="Например, curator" autocomplete="off"></label>
          <label>Статус<select v-model="role.active" :disabled="!access.status"><option :value="true">Активна</option><option :value="false">Отключена</option></select></label>
        </div>
        <h3>Права доступа</h3><p v-if="locked" class="hint">{{ systemRole(role.id) ? 'Системная роль' : 'Роль' }} доступна для просмотра.</p>
        <div class="permission-groups">
          <fieldset v-for="group in groups" :key="group.name" class="permission-group">
            <legend>{{ group.name }} <span class="group-count">{{ group.items.filter(item => role.permissions.includes(item.id)).length }} из {{ group.items.length }}</span></legend>
            <label v-for="permission in group.items" :key="permission.id">
              <input v-model="role.permissions" type="checkbox" :value="permission.id" :disabled="!access.edit">
              {{ permission.name }}
            </label>
          </fieldset>
        </div>
      </template>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>
    <footer class="modal-foot"><button class="secondary" type="button" @click="emit('close')">{{ locked ? 'Закрыть' : 'Отмена' }}</button><button v-if="!locked" class="primary" type="submit" :disabled="saving">Сохранить</button></footer>
  </form>
</dialog>
</template>
