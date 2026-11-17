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

/** 覆盖自定义授权；空数组沿用现有后端规则，恢复内置默认权限。 */
export function assignRolePermissions(data: { roleId: number; permissions: string[] }): Promise<unknown> {
  return request.put(`/system/roles/${data.roleId}/permissions`, {
    permissions: data.permissions
  })
}
