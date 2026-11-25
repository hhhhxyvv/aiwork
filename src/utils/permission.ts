import { watchEffect, type Directive, type DirectiveBinding } from 'vue'
import { userSession } from '@/store/user'
export function hasPermission(code: string): boolean { return userSession.permissions.includes(code) }
export function hasAnyPermission(codes: readonly string[]): boolean { return codes.some(hasPermission) }
export const pagePermissions: Record<string, string[]> = {
  '/chat': ['chat:view'],
  '/dashboard': ['stat:dashboard:view'],
  '/resume': ['student:profile:view', 'student:resume:edit', 'student:resume:upload', 'student:resume:download', 'student:resume:diagnose', 'student:list:view', 'student:warning:view', 'resume:candidate:view', 'resume:candidate:invite', 'resume:candidate:reject', 'student:archive:remind'],
  '/job': ['job:post:view', 'job:post:publish', 'job:post:edit', 'job:post:audit', 'job:apply:submit', 'job:recommend:push'],
  '/interview': ['interview:practice:use', 'interview:stats:view', 'interview:candidate:view', 'interview:question:manage', 'student:warning:view', 'interview:candidate:review', 'interview:coaching:record', 'interview:supervision:send', 'interview:training:remind', 'interview:ledger:export'],
  '/practice': ['internship:apply:view', 'internship:apply:submit', 'internship:apply:audit', 'internship:log:view', 'internship:log:submit', 'internship:log:review', 'internship:evaluate:view', 'internship:evaluate:submit'],
  '/policy': ['policy:qa:use', 'policy:manage'],
  '/dept': ['dept:manage'],
  '/storage': ['storage:view', 'storage:upload', 'storage:download', 'storage:delete'],
  '/role': ['sys:role:assign', 'sys:data-scope:assign'],
  '/file-demo': ['storage:view', 'storage:upload', 'storage:download', 'storage:delete']
}
export function canAccessPath(path: string): boolean {
  if (path === '/pending-authorization') return true
  return hasAnyPermission(pagePermissions[path] || [])
}
export function getLandingPath(): string {
  if (canAccessPath('/role')) return '/role'
  return Object.keys(pagePermissions).find(canAccessPath) || '/pending-authorization'
}
const stops = new WeakMap<HTMLElement, () => void>()
const originalDisplay = new WeakMap<HTMLElement, string>()
function bind(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
  stops.get(el)?.()
  if (!originalDisplay.has(el)) originalDisplay.set(el, el.style.display)
  const required = Array.isArray(binding.value) ? binding.value : [binding.value]
  stops.set(el, watchEffect(() => { el.style.display = hasAnyPermission(required) ? originalDisplay.get(el)! : 'none' }, { flush: 'sync' }))
}
export const vPermission: Directive<HTMLElement, string | string[]> = {
  mounted: bind, updated: bind,
  unmounted(el) { stops.get(el)?.(); stops.delete(el); originalDisplay.delete(el) }
}
