// src/utils/permission.ts
// 轻量级 RBAC 权限判断工具：不引入 Pinia，直接从 localStorage 读取登录时持久化的权限数据
import type { Directive, DirectiveBinding } from 'vue'

/** 万能权限点：拥有它即视为拥有全部权限（与后端权限点编码约定一致） */
const ALL_PERMISSION = 'system:manage'

/** 管理员角色编码：默认拥有全部权限 */
const ADMIN_ROLE = 'admin'

/** 读取当前用户的权限点列表（登录时由 Login.vue 以 JSON 存入 localStorage） */
function getPermissions(): string[] {
  try {
    const raw = localStorage.getItem('permissions')
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((p) => typeof p === 'string') : []
  } catch {
    return []
  }
}

/** 读取当前角色编码（向后兼容单角色字段 role） */
function getCurrentRole(): string {
  return (localStorage.getItem('role') || '').trim().toLowerCase()
}

/**
 * 判断当前登录用户是否拥有指定权限点
 * - 角色为 admin，或权限列表包含 system:manage：视为拥有全部权限
 * - 否则精确匹配权限点编码
 */
export function hasPermission(perm: string): boolean {
  if (getCurrentRole() === ADMIN_ROLE) return true
  const list = getPermissions()
  if (list.includes(ALL_PERMISSION)) return true
  return list.includes(perm)
}

/**
 * v-permission 自定义指令：当前用户没有对应权限时，直接移除元素 DOM（按钮/入口不可见）
 * 用法：
 *   <el-button v-permission="'storage:delete'">删除</el-button>
 *   <el-button v-permission="['storage:edit', 'system:manage']">编辑</el-button>
 */
export const vPermission: Directive<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const required = Array.isArray(binding.value) ? binding.value : [binding.value]
    const allowed = required.some((p) => hasPermission(p))
    if (!allowed && el.parentNode) {
      el.parentNode.removeChild(el)
    }
  }
}
