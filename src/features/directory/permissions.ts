import type { Employee, Role } from './model'

export const groups = [
  { name: 'Сотрудники', column: 'Работа с сотрудниками', items: [
    { id: 'users.read', name: 'Просмотр списка и карточек', short: 'Просмотр' },
    { id: 'users.add', name: 'Создание сотрудников', short: 'Создание' },
    { id: 'users.edit', name: 'Редактирование карточек', short: 'Редактирование' },
    { id: 'users.status', name: 'Изменение статуса сотрудника', short: 'Смена статуса' },
    { id: 'roles.assign', name: 'Назначение ролей сотруднику', short: 'Назначение ролей' }
  ] },
  { name: 'Роли', column: 'Управление ролями', items: [
    { id: 'roles.read', name: 'Просмотр ролей', short: 'Просмотр' },
    { id: 'roles.add', name: 'Создание ролей', short: 'Создание' },
    { id: 'roles.edit', name: 'Редактирование роли и её прав', short: 'Редактирование' },
    { id: 'roles.disable', name: 'Отключение ролей', short: 'Отключение' },
    { id: 'roles.restore', name: 'Восстановление ролей', short: 'Восстановление' }
  ] }
]
export const systemRole = (id: number) => id === 1 || id === 7

export function recordAccess(kind: 'employee' | 'role', previous: Employee | Role | undefined, rights: Set<string>, actor: number) {
  const staff = kind === 'employee'
  const section = staff ? 'users' : 'roles'
  const available = rights.has(section + '.read') && (staff || !systemRole(previous?.id ?? 0)) &&
    (!!previous || rights.has(section + '.add'))
  const edit = available && (!previous || rights.has(section + '.edit'))
  const statusRight = staff ? 'users.status' : previous?.active === false ? 'roles.restore' : 'roles.disable'
  const status = available && previous?.id !== actor && rights.has(statusRight)
  const assign = available && staff && rights.has('roles.assign')
  return { edit, status, assign, writable: edit || status || assign }
}
