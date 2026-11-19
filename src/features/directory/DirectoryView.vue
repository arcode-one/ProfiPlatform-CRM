<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Icon from '../../components/Icon.vue'
import Brand from '../../components/Brand.vue'
import RecordDialog from './RecordDialog.vue'
import RolePermissionSummary from './RolePermissionSummary.vue'
import { groups, systemRole } from './permissions'
import { accountFor, loadDirectory, storageKey, rightsFor } from './storage'
import type { Directory, Employee, Role } from './model'

type Section = 'employees' | 'roles'
const props = defineProps<{ actor: number }>()
const emit = defineEmits<{ logout: [] }>()
const section = ref<Section>(location.hash === '#roles' ? 'roles' : 'employees')
const directory = ref<Directory>({ employees: [], roles: [] })
const loadError = ref('')
const profile = computed(() => accountFor(directory.value, props.actor))
const rights = computed(() => rightsFor(directory.value, props.actor))
const query = ref('')
const status = ref('all')
const roleFilter = ref('')
const settings = ref<HTMLDialogElement>()
const tableScroll = ref<HTMLDivElement>()
const extraColumns = ref(false)
const page = ref(1)
const perPage = ref(10)
const sort = ref<'name'|'id'>('id')
const ascending = ref(true)
const notice = ref('')
const editing = ref<{ kind: 'employee'|'role', record?: Employee | Role } | null>(null)
const isStaff = computed(() => section.value === 'employees')
const title = computed(() => isStaff.value ? 'Сотрудники' : 'Роли и права')
const rows = computed(() => isStaff.value ? directory.value.employees : directory.value.roles)
const roleNames = computed(() => new Map(directory.value.roles.map(r => [r.id, r.name])))
const filtered = computed(() => {
  const term = query.value.trim().toLocaleLowerCase('ru')
  return rows.value.filter(row => {
    if (status.value !== 'all' && row.active !== (status.value === 'active')) return false
    let fields: (string|number)[] = [row.name, row.id]
    if ('login' in row) {
      if (roleFilter.value && !row.roles.includes(Number(roleFilter.value))) return false
      fields = fields.concat(row.login, row.email, row.phone, row.job, row.telegram, row.max, row.roles.map(id => roleNames.value.get(id)).join(' '))
    } else fields.push(row.tag)
    return fields.some(field => String(field).toLocaleLowerCase('ru').includes(term))
  }).sort((a,b) => {
    const diff = sort.value === 'id' ? a.id-b.id : a.name.localeCompare(b.name,'ru')
    return ascending.value ? diff : -diff
  })
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage.value)))
const visible = computed(() => filtered.value.slice((page.value-1)*perPage.value, page.value*perPage.value))
const visibleStaff = computed(() => visible.value.filter((r): r is Employee => 'login' in r))
const visibleRoles = computed(() => visible.value.filter((r): r is Role => 'permissions' in r))
const hasFilters = computed(() => !!(query.value || roleFilter.value || status.value !== 'all'))
function reset() { query.value = ''; roleFilter.value = ''; status.value = 'all' }
function hashChanged() {
  const wantsRoles = location.hash === '#roles'
  section.value = (wantsRoles && rights.value.has('roles.read')) || !rights.value.has('users.read') ? 'roles' : 'employees'
  editing.value = null
  settings.value?.close()
  page.value = 1
  reset()
}
function read(keepView = false) {
  try {
    directory.value = loadDirectory(); loadError.value = ''
    if (props.actor && !profile.value?.active) { emit('logout'); return }
    if (!keepView || !rights.value.has(isStaff.value ? 'users.read' : 'roles.read')) hashChanged()
  }
  catch { loadError.value = 'Не удалось открыть данные браузера. Проверь доступ к локальному хранилищу и повтори попытку.' }
}
function showEditor(record?: Employee|Role) {
  notice.value = ''
  editing.value = { kind: isStaff.value ? 'employee' : 'role', record }
}
function saved(next: Directory, id: number) {
  directory.value = next
  editing.value = null
  if (!rights.value.has(isStaff.value ? 'users.read' : 'roles.read')) { hashChanged(); return }
  reset()
  const index = filtered.value.findIndex(row => row.id === id)
  page.value = Math.floor(Math.max(index,0)/perPage.value)+1
  notice.value = isStaff.value ? 'Карточка сотрудника сохранена' : 'Роль сохранена'
}
function setSort(key: 'name'|'id') {
  ascending.value = sort.value === key ? !ascending.value : true
  sort.value = key
}
function initials(name: string) { return name.split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase() }
function storageChanged(e: StorageEvent) { if (e.key === storageKey || e.key === null) read(true) }
watch([query, status, roleFilter, perPage], () => {page.value=1}, {flush:'sync'})
watch(pages, n => {if (page.value > n) page.value=n})
watch([section, page, perPage, query, status, roleFilter, sort, ascending], () => {
  if (tableScroll.value) tableScroll.value.scrollTop = 0
}, { flush: 'post' })
onMounted(() => { read(); window.addEventListener('hashchange',hashChanged); window.addEventListener('storage',storageChanged) })
onUnmounted(() => {window.removeEventListener('hashchange',hashChanged);window.removeEventListener('storage',storageChanged)})
</script>
<template>
<div class="shell">
  <aside class="sidebar">
    <Brand><span class="sidebar-product">CRM</span></Brand>
    <h2 id="workspace-heading" class="nav-label">Рабочее пространство</h2>
    <nav aria-labelledby="workspace-heading">
      <a v-if="rights.has('users.read')" href="#employees" title="Сотрудники" :aria-current="isStaff ? 'page' : undefined"><Icon name="users-round" :size="18"/><span>Сотрудники</span></a>
      <a v-if="rights.has('roles.read')" href="#roles" title="Роли и права" :aria-current="!isStaff ? 'page' : undefined"><Icon name="shield-check" :size="18"/><span>Роли и права</span></a>
    </nav>
  </aside>
  <div class="content">
    <header class="topbar">
      <div class="workspace-name"><Icon name="building" :size="18"/><span>Демо-аккаунт</span></div>
      <div class="account"><span class="avatar account-img" aria-hidden="true">{{ initials(profile?.name || '') }}</span><b>{{ profile?.name }}</b></div>
      <button class="logout" @click="emit('logout')"><Icon name="log-out" :size="17"/><span>Выйти</span></button>
    </header>
    <main class="directory">
      <header v-if="rights.has('users.read') || rights.has('roles.read')" class="directory-head">
        <div class="directory-art" aria-hidden="true"><div class="brand-steps"><i/><i/><i/></div></div>
        <div class="directory-title">
          <h1>{{ title }}</h1>
          <button v-if="rights.has(isStaff ? 'users.add' : 'roles.add')" class="primary" :aria-label="isStaff ? 'Добавить сотрудника' : 'Добавить роль'" :disabled="!!loadError" @click="showEditor()">
            <Icon name="plus"/><span>Добавить<span class="add-subject">{{ isStaff ? ' сотрудника' : ' роль' }}</span></span>
          </button>
        </div>
        <div v-if="!loadError" class="status-tabs" role="group" aria-label="Фильтр по статусу">
          <button v-for="s in [['all','Все'],['active','Активные'],['inactive','Отключённые']]" :key="s[0]" :aria-pressed="status === s[0]" @click="status=s[0]">{{ s[1] }} <span>{{ s[0] === 'all' ? rows.length : rows.filter(r => r.active === (s[0] === 'active')).length }}</span></button>
        </div>
      </header>
      <div v-if="loadError" class="error" role="alert">{{ loadError }} <button @click="read()">Повторить</button></div>
      <div v-else-if="!rights.has('users.read') && !rights.has('roles.read')" class="empty"><h2>Нет доступных разделов</h2><p>Обратись к администратору для назначения роли.</p></div>
      <section v-else class="data-panel" :aria-label="title">
        <div class="directory-tools">
            <label class="search"><Icon name="search" :size="18"/><input v-model="query" type="search" :placeholder="isStaff ? 'Имя, логин или почта' : 'Название или тег'" :aria-label="'Поиск: '+title"></label>
            <button v-if="hasFilters" class="clear-filters" aria-label="Сбросить фильтры" title="Сбросить фильтры" @click="reset"><Icon name="x" :size="15"/><span>Сбросить</span></button>
            <button class="secondary" aria-label="Настройки списка" aria-haspopup="dialog" @click="settings?.showModal()"><Icon name="settings-2"/><span>Настройки списка</span></button>
        </div>
        <dialog ref="settings" class="modal list-settings" closedby="any" aria-labelledby="settings-title">
          <header class="modal-head"><h2 id="settings-title">Настройки списка</h2><button class="modal-close" aria-label="Закрыть" @click="settings?.close()"><Icon name="x"/></button></header>
          <div class="modal-scroll filter-box">
          <label v-if="isStaff && rights.has('roles.read')">Роль<select v-model="roleFilter"><option value="">Все роли</option><option v-for="r in directory.roles" :key="r.id" :value="String(r.id)">{{ r.name }}</option></select></label>
          <label>Сортировка<select v-model="sort"><option value="id">По коду</option><option value="name">По названию</option></select></label>
          <label>Порядок<select v-model="ascending"><option :value="true">По возрастанию</option><option :value="false">По убыванию</option></select></label>
          <label v-if="isStaff" class="inline-check"><input type="checkbox" v-model="extraColumns">Телефон и мессенджеры</label>
          </div>
        </dialog>
        <div ref="tableScroll" class="table-scroll" tabindex="0" :aria-label="title">
          <table v-if="isStaff" class="staff-table">
            <thead><tr>
              <th :aria-sort="sort === 'name' ? (ascending ? 'ascending' : 'descending') : 'none'"><button @click="setSort('name')">Сотрудник <Icon name="arrow-up-down" :size="13"/></button></th>
              <th>Учётная запись</th><th>Роли</th>
              <template v-if="extraColumns"><th>Телефон</th><th>Telegram</th><th>MAX</th></template>
              <th>Статус</th><th><span class="sr-only">Карточка</span></th>
            </tr></thead>
            <tbody>
              <tr v-for="employee in visibleStaff" :key="employee.id">
                <td><button class="row-name" @click="showEditor(employee)">
                  <span class="avatar" :class="'tone-'+employee.id%4" aria-hidden="true">{{ initials(employee.name) }}</span>
                  <span><strong>{{ employee.name }}</strong><small>{{ employee.job || 'Должность не указана' }}</small></span>
                </button></td>
                <td><span>{{ employee.email || 'Почта не указана' }}</span><small class="login-detail">{{ employee.login }} · № {{ employee.id }}</small></td>
                <td><div class="role-tags"><span v-for="id in employee.roles" :key="id">{{ roleNames.get(id) }}</span><small v-if="!employee.roles.length">Без роли</small></div></td>
                <template v-if="extraColumns"><td>{{ employee.phone || '–' }}</td><td>{{ employee.telegram || '–' }}</td><td>{{ employee.max || '–' }}</td></template>
                <td><span class="status" :class="{ off: !employee.active }"><i/>{{ employee.active ? 'Активен' : 'Отключён' }}</span></td>
                <td><button class="icon-btn" :aria-label="'Открыть: '+employee.name" @click="showEditor(employee)"><Icon name="chevron-right" :size="17"/></button></td>
              </tr>
            </tbody>
          </table>
          <table v-else class="roles-table">
            <thead><tr>
              <th :aria-sort="sort === 'name' ? (ascending ? 'ascending' : 'descending') : 'none'"><button @click="setSort('name')">Название роли <Icon name="arrow-up-down" :size="13"/></button></th>
              <th v-for="group in groups" :key="group.name">{{ group.column }}</th><th>Назначено</th>
              <th>Статус</th><th><span class="sr-only">Карточка</span></th>
            </tr></thead>
            <tbody>
              <tr v-for="r in visibleRoles" :key="r.id">
                <td><button class="row-name" @click="showEditor(r)">
                  <span>
                    <strong>{{ r.name }}</strong>
                    <small class="role-meta">
                      <span>№ {{ r.id }}</span><span>{{ r.tag }}</span>
                      <span v-if="systemRole(r.id)" class="system-role"><Icon name="shield-check" :size="13"/>Системная</span>
                    </small>
                  </span></button></td>
                  <td v-for="group in groups" :key="group.name" :data-label="group.column"><RolePermissionSummary :group="group" :permissions="r.permissions"/></td>
                  <td data-label="Назначено"><span class="role-members" title="Сотрудники с этой ролью"><Icon name="users-round" :size="15"/>{{ directory.employees.filter(e => e.roles.includes(r.id)).length }}</span></td>
                <td data-label="Статус"><span class="status" :class="{ off: !r.active }"><i/>{{ r.active ? 'Активна' : 'Отключена' }}</span></td>
                <td><button class="icon-btn" @click="showEditor(r)" :aria-label="'Открыть: '+r.name"><Icon name="chevron-right" :size="17"/></button></td>
              </tr>
            </tbody>
          </table>
          <div v-if="!visible.length" class="empty"><h3>Записей не найдено</h3><button v-if="hasFilters" class="secondary" @click="reset">Сбросить поиск и фильтры</button></div>
        </div>
        <footer class="pager"><span>{{ filtered.length ? (page-1)*perPage+1 : 0 }}–{{ Math.min(page*perPage,filtered.length) }} из {{ filtered.length }}</span>
          <div><select v-model.number="perPage" aria-label="Записей на странице"><option v-for="n in [5,10,25]" :key="n" :value="n">По {{ n }}</option></select>
          <button class="icon-btn" :disabled="page===1" aria-label="Предыдущая страница" @click="page--"><Icon name="chevron-left" :size="15"/></button>
          <span>{{ page }} / {{ pages }}</span><button class="icon-btn" :disabled="page>=pages" aria-label="Следующая страница" @click="page++"><Icon name="chevron-right" :size="15"/></button></div>
        </footer>
      </section>
      <p class="feedback" role="status">{{ notice }}</p>
    </main>
  </div>
  <RecordDialog v-if="editing" :kind="editing.kind" :record="editing.record" :directory="directory" :actor="actor" :rights="rights" @close="editing=null" @saved="saved"/>
</div>
</template>
