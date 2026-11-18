// src/utils/request.ts
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { clearSession, invalidatePermissions, refreshSession } from '@/store/user'

function refreshAfterForbidden() {
  invalidatePermissions()
  void refreshSession(true).finally(() => window.dispatchEvent(new Event('session-refreshed')))
}

// 后端统一响应结构
interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 创建 axios 实例
const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器：携带 token
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：统一解包
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // 二进制响应（文件下载 blob）：没有 code/message 结构，直接返回 Blob 本体
    if (response.config.responseType === 'blob') {
      return response.data
    }

    const res = response.data

    // code 为 200：直接返回业务核心数据
    if (res.code === 200) {
      return res.data as any
    }

    // code 为 401：登录过期，清空缓存并跳转登录页
    if (res.code === 401) {
      ElMessage.error('登录已过期，请重新登录')
      clearSession()
      // 扫码确认页例外：手机端 Token 过期时由页面自己回到账号表单，整页跳转会把扫码流程打断
      if (!(window.location.pathname || '').startsWith('/scan-login')) {
        window.location.href = '/login'
      }
      return Promise.reject(new Error(res.message || '登录已过期'))
    }

    if (res.code === 403) refreshAfterForbidden()

    // 其他业务异常：统一弹窗提醒
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    // 处理 HTTP 状态码为 401 的情况（后端直接返回 HTTP 401 而非 JSON 401）
    if (error.response && error.response.status === 401) {
      ElMessage.error('登录已失效，请重新登录')
      clearSession()
      // 扫码确认页例外：Token 过期时由页面自己回到账号表单，不打断扫码流程
      if (!(window.location.pathname || '').startsWith('/scan-login')) {
        window.location.href = '/login'
      }
    } else if (error.response && error.response.status === 403) {
      refreshAfterForbidden()
      // HTTP 403：已登录但无权限（后端 RBAC 拦截）——只提示后端返回的无权限信息，严禁跳转登录页
      ElMessage.error(error.response.data?.message || '没有操作权限，请联系管理员')
    } else {
      ElMessage.error(error.message || '网络连接异常')
    }
    return Promise.reject(error)
  }
)

export default request
