import type { Directory, Employee, Role } from './model'
import { recordAccess, systemRole } from './permissions'
import { demoSupervisor, managerPermissions, permissions, retiredSamples, seed } from './demo'

export const storageKey = 'profiplatform.directory.v1'
const sampleRevision = 4
const splitRolePermissions = ['roles.add', 'roles.disable', 'roles.restore']

export function accountFor(data: Directory, id: number) {
  return id === demoSupervisor.id ? demoSupervisor : data.employees.find(e => e.id === id)
}

export function loadDirectory(): Directory {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return seed()
  const data: Directory & { sampleRevision?: number } = JSON.parse(raw)
  if (!Array.isArray(data.employees) || !Array.isArray(data.roles)) throw new Error('Не удалось прочитать локальные данные.')
  if (!data.sampleRevision) {
    data.employees = data.employees.filter(employee => !retiredSamples.has(JSON.stringify(employee)))
  }
  if ((data.sampleRevision ?? 0) < 3) {
    const manager = data.roles.find(r => r.id === 27)
    if (manager) manager.permissions = [...managerPermissions]
    const admin = data.roles.find(r => r.id === 7)
    const oldPermissions = permissions.filter(p => !splitRolePermissions.includes(p))
    if (admin && oldPermissions.every(p => admin.permissions.includes(p))) {
      admin.permissions = admin.permissions.filter(p => !oldPermissions.includes(p))
    }
  }
  if ((data.sampleRevision ?? 0) < 4) {
    for (const role of data.roles) {
      if (role.permissions.includes('roles.edit')) {
        role.permissions = [...new Set([...role.permissions, ...splitRolePermissions])]
      }
    }
  }
  return data
}
export function rightsFor(data: Directory, id: number): Set<string> {
  const user = accountFor(data, id)
  if (!user?.active) return new Set()
  return new Set(data.roles.filter(r => r.active && user.roles.includes(r.id)).flatMap(r => r.permissions))
}

export function saveRecord(kind: 'employee' | 'role', draft: Employee | Role, original: string, actor: number): Directory {
  const data = loadDirectory()
  const rights = rightsFor(data, actor)
  const rows = kind === 'employee' ? data.employees : data.roles
  const previous = rows.find(row => row.id === draft.id)
  const access = recordAccess(kind, previous, rights, actor)
  if (!access.writable) throw new Error('Недостаточно прав для сохранения.')
  if (draft.id && JSON.stringify(previous) !== original) throw new Error('Запись изменилась. Открой карточку заново.')
  if (!draft.name.trim()) throw new Error('Введи название или имя.')
  const id = draft.id || Math.max(kind === 'employee' ? 108 : 0, ...rows.map(row => row.id)) + 1
  if (kind === 'employee') {
    const employee = draft as Employee
    if (!employee.login.trim()) throw new Error('Укажи логин сотрудника.')
    if (employee.login.trim().toLowerCase() === demoSupervisor.login) throw new Error('Логин demo зарезервирован для демо-супервизора.')
    if (data.employees.some(e => e.id !== id && e.login.toLowerCase() === employee.login.trim().toLowerCase()))
      throw new Error('Этот логин уже занят.')
    if (employee.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) throw new Error('Проверь e-mail на вкладке «Контакты».')
    const old = previous as Employee | undefined
    if (old && !access.edit) {
      const fields = Object.keys(old) as (keyof Employee)[]
      if (fields.some(key => key !== 'roles' && key !== 'active' && old[key] !== employee[key])) {
        throw new Error('Недостаточно прав для редактирования сотрудника.')
      }
    }
    if ((old?.active ?? true) !== employee.active && !access.status) throw new Error('Недостаточно прав для изменения статуса.')
    if (actor === id && !employee.active) throw new Error('Нельзя отключить собственную учётную запись.')
    const oldRoles = old?.roles || []
    if (!access.assign && (oldRoles.length !== employee.roles.length || employee.roles.some(r => !oldRoles.includes(r))))
      throw new Error('Недостаточно прав для назначения ролей.')
    if (employee.roles.some(r => !data.roles.some(role => role.id === r && (role.active || oldRoles.includes(r)))))
      throw new Error('Список ролей изменился. Открой карточку заново.')
    const roles = [...oldRoles.filter(systemRole), ...employee.roles.filter(r => !systemRole(r))]
    const saved = { ...employee, id, name: employee.name.trim(), login: employee.login.trim(), roles }
    data.employees = previous ? data.employees.map(e => e.id === id ? saved : e) : [...data.employees, saved]
  } else {
    const target = draft as Role
    const old = previous as Role | undefined
    if (old && !access.edit && (target.name !== old.name || target.tag !== old.tag ||
      target.permissions.length !== old.permissions.length || old.permissions.some(p => !target.permissions.includes(p)))) {
      throw new Error('Недостаточно прав для редактирования роли.')
    }
    if ((old?.active ?? true) !== target.active && !access.status) {
      throw new Error('Недостаточно прав для изменения статуса роли.')
    }
    if (!/^[a-z][a-z0-9_-]*$/i.test(target.tag.trim())) throw new Error('Тег должен начинаться с латинской буквы. Допустимы цифры, дефис и подчёркивание.')
    if (data.roles.some(r => r.id !== id && r.tag.toLowerCase() === target.tag.trim().toLowerCase()))
      throw new Error('Этот тег уже используется.')
    if (systemRole(id)) throw new Error('Это системная роль.')
    const saved = { ...target, id, name: target.name.trim(), tag: target.tag.trim().toLowerCase(), permissions: [...target.permissions] }
    data.roles = previous ? data.roles.map(r => r.id === id ? saved : r) : [...data.roles, saved]
  }
  localStorage.setItem(storageKey, JSON.stringify({ ...data, sampleRevision }))
  return data
}
