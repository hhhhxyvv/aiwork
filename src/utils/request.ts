// src/utils/request.ts
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

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
    const res = response.data

    // code 为 200：直接返回业务核心数据
    if (res.code === 200) {
      return res.data as any
    }

    // code 为 401：登录过期，清空缓存并跳转登录页
    if (res.code === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      window.location.href = '/login'
      return Promise.reject(new Error(res.message || '登录已过期'))
    }

    // 其他业务异常：统一弹窗提醒
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    // 处理 HTTP 状态码为 401 的情况（后端直接返回 HTTP 401 而非 JSON 401）
    if (error.response && error.response.status === 401) {
      ElMessage.error('登录已失效，请重新登录')
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      window.location.href = '/login'
    } else {
      ElMessage.error(error.message || '网络连接异常')
    }
    return Promise.reject(error)
  }
)

export default request
