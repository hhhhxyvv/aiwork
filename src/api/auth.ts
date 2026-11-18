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
    // Mock 模式兜底（真实登录时角色由后端返回）
    () => ({
      token: `mock-token-${Date.now()}`,
      role: params.role || 'student',
      roles: [params.role || 'student'],
      permissions: [],
      userInfo: {
        id: 1,
        username: params.username,
        name: params.username,
        role: params.role || 'student',
        avatar: '',
        department: '信息工程学院',
        className: '软件2101班'
      }
    }),
    // 真实后端请求
    async () => {
      // 角色由后端根据账号密码查询返回，登录请求不再发送 role/role_code
      const res: any = await request.post('/auth/login', {
        username: params.username,
        password: params.password,
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

/* ==================== 扫码登录 ==================== */

/** 二维码票据（PC 端生成二维码用） */
export interface QrTicket {
  ticket: string
  /** 手机扫码打开的确认页地址（已携带 ticket 参数） */
  scanUrl: string
  expireSeconds: number
  status: string
}

/** 扫码状态（PC 端轮询用） */
export interface QrStatus {
  status: 'PENDING' | 'SCANNED' | 'CONFIRMED' | 'CANCELED' | 'EXPIRED'
  /** 仅 CONFIRMED 时返回，取走后不可再次获取 */
  login?: LoginResult | null
}

/**
 * 生成扫码登录二维码票据
 * 真实后端: GET /api/auth/qrcode（免登录白名单）
 */
export function getQrTicket(): Promise<QrTicket> {
  return request.get('/auth/qrcode') as any
}

/**
 * 轮询扫码状态
 * 真实后端: GET /api/auth/qrcode/status?ticket=xxx（免登录白名单）
 */
export function getQrStatus(ticket: string): Promise<QrStatus> {
  return request.get('/auth/qrcode/status', { params: { ticket } }) as any
}

/**
 * 手机端标记已扫码（打开确认页时调用）
 * 真实后端: POST /api/auth/qrcode/scan（免登录白名单）
 */
export function markQrScanned(ticket: string) {
  return request.post('/auth/qrcode/scan', { ticket })
}

/**
 * 手机端确认登录（以手机端 Token 中的身份签发 PC 端 Token）
 * 真实后端: POST /api/auth/qrcode/confirm（需 Token）
 */
export function confirmQrLogin(ticket: string) {
  return request.post('/auth/qrcode/confirm', { ticket })
}

/**
 * 手机端取消登录
 * 真实后端: POST /api/auth/qrcode/cancel（需 Token）
 */
export function cancelQrLogin(ticket: string) {
  return request.post('/auth/qrcode/cancel', { ticket })
}

/* ==================== 邮箱验证码登录 ==================== */

/** 邮箱验证码发送结果 */
export interface EmailCodeResult {
  /** 脱敏后的收件邮箱 */
  email: string
  /** 验证码有效期（秒） */
  expireSeconds: number
  /** 重发间隔（秒） */
  cooldownSeconds: number
}

/** 发码可选项：注册场景需要口令区分，并携带图形验证码 */
export interface SendEmailCodeOptions {
  /** login=登录发码（要求邮箱已绑定账号，默认）；register=注册发码（要求邮箱未被占用，且必须带图形验证码） */
  scene?: 'login' | 'register'
  /** 图形验证码标识 */
  captchaKey?: string
  /** 图形验证码内容 */
  captchaCode?: string
}

/**
 * 发送邮箱验证码（真实 SMTP 发信到邮箱）
 * 真实后端: POST /api/auth/email/code（免登录白名单）
 * 注意：同步等待 SMTP 发信完成，QQ 邮箱 SSL 握手 + 投递常需 5-20 秒，
 * 因此单独放宽到 30 秒，避免用全局 10 秒超时误判为失败（邮件其实已发出）。
 */
export function sendEmailCode(
  email: string,
  options: SendEmailCodeOptions = {}
): Promise<EmailCodeResult> {
  return request.post(
    '/auth/email/code',
    {
      email,
      scene: options.scene || 'login',
      captchaKey: options.captchaKey,
      captchaCode: options.captchaCode
    },
    { timeout: 30000 }
  ) as any
}

/**
 * 邮箱验证码登录
 * 真实后端: POST /api/auth/email/login（免登录白名单）
 * 返回结构与账号密码登录一致：{ token, role, roles, permissions, userInfo }
 */
export function loginByEmail(email: string, code: string): Promise<LoginResult> {
  return request.post('/auth/email/login', { email, code }) as any
}
