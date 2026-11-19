import { emptyEmployee, jobs } from './model'
import type { Directory, Employee, Role } from './model'
import { groups } from './permissions'

export const permissions = groups.flatMap(g => g.items.map(item => item.id))
export const managerPermissions = ['users.read', 'users.edit']

function role(id: number, name: string, tag: string, rights: string[]): Role {
  return { id, name, tag, permissions: rights, active: true }
}
function sample(id: number, name: string, login: string, job: string, roles: number[], active = true): Employee {
  const [firstName, surname] = name.split(' ')
  return { ...emptyEmployee(), id, name, firstName, surname, login, job, roles, active, email: login + '@example.test' }
}
// The local preview has its own supervisor login, separate from employee records.
export const demoSupervisor = { id: -1, login: 'demo', name: 'Демо-супервизор', active: true, roles: [1] }

export function seed(): Directory {
  return {
    roles: [
      role(27, 'Менеджер', 'manager', [...managerPermissions]),
      role(4, 'Методист', 'metodist', ['users.read']),
      role(2, 'Преподаватель', 'teacher', ['users.read']),
      role(6, 'Руководитель практики', 'senior', ['users.read', 'users.edit']),
      role(7, 'Админ аккаунта', 'admin', []),
      role(1, 'Супервизор', 'supervisor', permissions),
      role(3, 'Ученик', 'student', []),
      role(14, 'Тестировщик', 'tester', ['users.read', 'roles.read']),
      role(20, 'Технический админ', 'texadmin', ['users.read','roles.read','users.edit']),
      role(22, 'Тестер конструктора программ', 'constest', [])
    ],
    employees: [
      sample(101, 'Анна Соколова', 'a.sokolova', jobs[0], [7]),
      sample(103, 'Вера Ланская', 'v.lanskaya', jobs[2], [4, 2])
    ]
  }
}

// Drop only untouched examples from older local directories.
export const retiredSamples = new Set([
  sample(102, 'Михаил Белов', 'm.belov', jobs[1], [27]),
  sample(104, 'Кирилл Лукин', 'k.lukin', jobs[3], [2]),
  sample(105, 'Софья Тихонова', 's.tikhonova', jobs[4], [6]),
  sample(106, 'Егор Зимин', 'e.zimin', jobs[5], [20]),
  sample(107, 'Мария Берг', 'm.berg', jobs[1], [27], false),
  sample(108, 'Тимур Волков', 't.volkov', jobs[3], [2])
].map(employee => JSON.stringify(employee)))
