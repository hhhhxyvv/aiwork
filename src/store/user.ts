import { reactive } from 'vue'
export interface SessionInfo { roles?: string[]; role?: string; permissions?: string[]; userInfo?: Record<string, any> }
// 旧版本的持久化授权不能成为离线兜底。
const legacyKeys = ['role', 'roles', 'permissions', 'userInfo', 'username', 'department', 'className', 'userId', 'realName']
legacyKeys.forEach(key => localStorage.removeItem(key))
export const userSession = reactive({ roles: [] as string[], permissions: [] as string[], userInfo: {} as Record<string, any>, ready: false, error: '', revision: 0 })
let generation = 0
let pending: Promise<boolean> | null = null
export function clearSession(removeToken = true) {
  generation++
  pending = null
  legacyKeys.forEach(key => localStorage.removeItem(key))
  if (removeToken) localStorage.removeItem('token')
  userSession.roles = []; userSession.permissions = []; userSession.userInfo = {}
  userSession.ready = false; userSession.error = ''; userSession.revision++
}
export function invalidatePermissions() { userSession.permissions = []; userSession.ready = false }
/** 唯一授权来源；独立读取 info，避免 403 拦截器递归刷新。 */
export function refreshSession(force = false): Promise<boolean> {
  if (force) { generation++; pending = null }
  const token = localStorage.getItem('token')
  if (!token) { clearSession(); return Promise.resolve(false) }
  if (pending) return pending
  const version = generation
  legacyKeys.forEach(key => localStorage.removeItem(key))
  pending = (async () => {
    try {
      const response = await fetch('/api/auth/info', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) })
      const body = await response.json()
      if (version !== generation || token !== localStorage.getItem('token')) return false
      if (response.status === 401 || body.code === 401) { clearSession(); return false }
      if (!response.ok || body.code !== 200 || !body.data || !Array.isArray(body.data.permissions)) throw new Error(body.message || '获取当前授权失败')
      const info: SessionInfo = body.data
      userSession.permissions = info.permissions!.filter(p => typeof p === 'string')
      userSession.roles = (Array.isArray(info.roles) ? info.roles : info.role ? [info.role] : []).filter(r => typeof r === 'string')
      userSession.userInfo = info.userInfo || {}; userSession.ready = true; userSession.error = ''; userSession.revision++
      return true
    } catch {
      if (version === generation) {
        userSession.roles = []; userSession.permissions = []; userSession.userInfo = {}; userSession.ready = false
        userSession.error = '无法获取当前权限，请重试或联系管理员'; userSession.revision++
      }
      return false
    } finally { if (version === generation) pending = null }
  })()
  return pending
}
export async function acceptLogin(result: { token: string }) {
  clearSession()
  if (!result.token) throw new Error('登录结果缺少令牌')
  localStorage.setItem('token', result.token)
  await refreshSession()
}
