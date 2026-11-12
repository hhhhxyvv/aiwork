// src/api/auth.ts
import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { LoginParams, LoginResult } from './types'

/**
 * 获取图形验证码（防爬防刷）
 * 真实后端: GET /api/auth/captcha
 * 响应: { captchaKey: "uuid...", captchaImg: "data:image/png;base64,..." }
 */
export function getCaptcha(): Promise<{ captchaKey: string; captchaImg: string }> {
  return mockOrReal(
    () => ({ captchaKey: 'mock-key', captchaImg: '' }),
    () => request.get('/auth/captcha') as any
  ) as Promise<{ captchaKey: string; captchaImg: string }>
}

/**
 * 登录接口
 * 真实后端: POST /api/auth/login
 */
export function login(params: LoginParams) {
  return mockOrReal<LoginResult>(
    // Mock 模式兜底
    () => ({
      token: `mock-token-${Date.now()}`,
      role: params.role,
      roles: [params.role as string],
      permissions: [],
      userInfo: {
        id: 1,
        username: params.username,
        name: params.username,
        role: params.role,
        avatar: '',
        department: '信息工程学院',
        className: '软件2101班'
      }
    }),
    // 真实后端请求
    async () => {
      // 同时传递 role 与 role_code，保证后端无论是用哪一个字段接收都能兼容
      const res: any = await request.post('/auth/login', {
        username: params.username,
        password: params.password,
        role: params.role,
        role_code: params.role,
        // 图形验证码（后端登录拦截器校验，错误/过期返回 400）
        captchaKey: params.captchaKey,
        captchaCode: params.captchaCode
      })

      // 提取后端的真实字段并平铺兼容前端
      const role = (res.role || params.role) as LoginResult['role']
      const realName = res.userInfo?.realName || res.userInfo?.name || params.username
      // RBAC 字段防御性解析：后端已返回 roles/permissions 数组则透传；
      // 本地后端暂未同步时回退为单角色 + 空权限，保持系统可用
      const roles: string[] =
        Array.isArray(res.roles) && res.roles.length > 0 ? res.roles : [role as string]
      const permissions: string[] = Array.isArray(res.permissions) ? res.permissions : []

      return {
        token: res.token,
        role: role,
        roles,
        permissions,
        userInfo: {
          id: res.userInfo?.id || 1,
          username: res.userInfo?.name || res.userInfo?.username || params.username,
          name: realName,
          role: role,
          // 新契约：院系与班级为字符串字段，替代原 deptId
          department: res.userInfo?.department || '',
          className: res.userInfo?.className || '',
          avatar: res.userInfo?.avatar || ''
        }
      }
    }
  )
}

/**
 * 注册接口
 * 真实后端: POST /api/auth/register
 */
export function register(data: any) {
  return mockOrReal(
    () => ({ success: true, message: '注册成功(Mock)' }),
    () => request.post('/auth/register', data)
  )
}

/**
 * 获取当前用户信息
 * 真实后端: GET /api/auth/me
 */
export function getCurrentUser() {
  return mockOrReal(
    () => ({
      id: Number(localStorage.getItem('userId')) || 1,
      username: localStorage.getItem('username') || 'student',
      name: localStorage.getItem('realName') || localStorage.getItem('username') || '同学',
      realName: localStorage.getItem('realName') || '同学',
      role: (localStorage.getItem('role') as any) || 'student',
      avatar: '',
      department: localStorage.getItem('department') || '',
      className: localStorage.getItem('className') || ''
    }),
    async () => {
      try {
        const res: any = await request.get('/auth/me')
        return res
      } catch (err) {
        // 后端若尚未提供 /auth/me，不阻断系统，平滑降级读取本地存储
        return {
          id: Number(localStorage.getItem('userId')) || 1,
          username: localStorage.getItem('username') || 'student',
          name: localStorage.getItem('realName') || localStorage.getItem('username') || '同学',
          realName: localStorage.getItem('realName') || '同学',
          role: (localStorage.getItem('role') as any) || 'student',
          avatar: '',
          department: localStorage.getItem('department') || '',
          className: localStorage.getItem('className') || ''
        }
      }
    }
  )
}

/**
 * 退出登录
 * 真实后端: POST /api/auth/logout
 */
export function logout() {
  return mockOrReal(
    () => true,
    async () => {
      try {
        await request.post('/auth/logout')
      } catch (e) {
        // 忽略退出接口的报错，前端照常退出清缓存
      }
      return true
    }
  )
}
