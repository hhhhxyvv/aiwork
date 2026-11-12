import request from '@/utils/request'

/** 后端权限点 VO（GET /auth/permission/tree 返回平铺数组） */
export interface PermissionVO {
  id: number
  code: string
  name: string
  resourceType: 'MENU' | 'BUTTON' | 'API'
  apiPath?: string
}

/**
 * 获取全量权限平铺列表
 * 响应（拦截器解包后）：List<PermissionVO>，字段 id/code/name/resourceType/apiPath
 */
export function getPermissionTree(): Promise<PermissionVO[]> {
  return request.get('/auth/permission/tree') as unknown as Promise<PermissionVO[]>
}

/**
 * 查询指定角色已拥有的权限 ID 数组
 * 响应（拦截器解包后）：number[]，如 [3, 4, 8]
 */
export function getRolePermissionIds(roleId: number): Promise<number[]> {
  return request.get(`/auth/permission/role/${roleId}`) as unknown as Promise<number[]>
}

/**
 * 角色授权：覆盖式保存该角色的权限集合
 * 请求体：{ roleId, permissionIds }
 */
export function assignRolePermissions(data: { roleId: number; permissionIds: number[] }): Promise<unknown> {
  return request.post('/auth/permission/role/assign', data)
}
