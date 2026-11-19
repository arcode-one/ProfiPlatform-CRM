export interface Employee {
  id: number
  name: string
  surname: string
  firstName: string
  patronymic: string
  gender: string
  login: string
  email: string
  phone: string
  job: string
  telegram: string
  max: string
  notes: string
  active: boolean
  roles: number[]
}
export interface Role {
  id: number
  name: string
  tag: string
  active: boolean
  permissions: string[]
}
export interface Directory { employees: Employee[], roles: Role[] }

export const jobs = ['Администратор', 'Менеджер', 'Методист', 'Преподаватель', 'Куратор', 'Технический специалист']
export function emptyEmployee(): Employee {
  return { id: 0, name: '', surname: '', firstName: '', patronymic: '', gender: '', login: '', email: '', phone: '', job: '', telegram: '', max: '', notes: '', active: true, roles: [] }
}
export function emptyRole(): Role {
  return { id: 0, name: '', tag: '', active: true, permissions: [] }
}
