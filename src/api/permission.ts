import request from '@/utils/request'

/** GET /system/permissions：后端按权限编码提供授权选项。 */
export interface PermissionVO {
  code: string
  name: string
}

/** GET /system/roles：角色 ID、名称及当前生效的权限均由后端返回。 */
export interface RoleVO {
  id: number
  roleCode: string
  roleName: string
  dataScope: number
  permissions: string[]
  configured: boolean
}

export function getPermissions(): Promise<PermissionVO[]> {
  return request.get('/system/permissions') as unknown as Promise<PermissionVO[]>
}

export function getRoles(): Promise<RoleVO[]> {
  return request.get('/system/roles') as unknown as Promise<RoleVO[]>
}

/** 覆盖自定义授权；空数组明确撤销该角色全部功能授权。 */
export function assignRolePermissions(data: { roleId: number; permissions: string[] }): Promise<unknown> {
  return request.put(`/system/roles/${data.roleId}/permissions`, {
    permissions: data.permissions
  })
}

export interface UserVO { id: number; username: string; realName: string; status: number; roleCodes: string[] }
export interface StudentScope { department: string; className: string }
export function getUsers(params: { keyword?: string; pageNum: number; pageSize: number }): Promise<{ records: UserVO[]; total: number; current: number; size: number }> {
  return request.get('/system/users', { params }) as any
}
export function createRole(data: { roleCode: string; roleName: string }) { return request.post('/system/roles', data) }
export function assignUserRoles(id: number, roleCodes: string[]) { return request.post(`/system/users/${id}/roles`, { roleCodes }) }
export function updateRoleDataScope(id: number, dataScope: number) { return request.put(`/system/roles/${id}/data-scope`, { dataScope }) }
export function getStudentScopes(id: number): Promise<StudentScope[]> { return request.get(`/system/users/${id}/student-scopes`) as any }
export function updateStudentScopes(id: number, scopes: StudentScope[]) { return request.put(`/system/users/${id}/student-scopes`, { scopes }) }
