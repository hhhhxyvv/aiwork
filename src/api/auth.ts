import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { LoginParams, LoginResult } from './types'

/**
 * 登录接口
 * 真实后端: POST /api/auth/login
 */
export function login(params: LoginParams) {
  return mockOrReal<LoginResult>(
    () => ({
      token: `mock-token-${Date.now()}`,
      userInfo: {
        id: 1,
        username: params.username,
        role: params.role,
        name: params.username,
        avatar: ''
      }
    }),
    () => request.post('/auth/login', params)
  )
}

/**
 * 获取当前用户信息
 * 真实后端: GET /api/auth/me
 */
export function getCurrentUser() {
  return mockOrReal(
    () => ({
      id: 1,
      username: localStorage.getItem('username') || 'student01',
      role: (localStorage.getItem('role') as any) || 'student',
      name: localStorage.getItem('username') || '测试同学',
      avatar: ''
    }),
    () => request.get('/auth/me')
  )
}

/**
 * 退出登录
 * 真实后端: POST /api/auth/logout
 */
export function logout() {
  return mockOrReal(
    () => true,
    () => request.post('/auth/logout')
  )
}
