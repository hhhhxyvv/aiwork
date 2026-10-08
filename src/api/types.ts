// 全局共享类型定义
// 切换真实后端时，只需保证返回结构与这些类型一致即可

/** 通用分页参数 */
export interface PageParams {
  page?: number
  pageSize?: number
}

/** 通用分页结果 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// ============ 认证相关 ============
export type UserRole = 'student' | 'counselor' | 'hr' | 'admin'

export interface LoginParams {
  username: string
  password: string
  role: UserRole
}

export interface LoginResult {
  token: string
  userInfo: {
    id: number
    username: string
    role: UserRole
    name: string
    avatar?: string
  }
}

// ============ 岗位相关 ============
export interface Job {
  id: number
  name: string
  company: string
  salary: string
  salaryMin: number
  salaryMax: number
  location: string
  skills: string[]
  matchScore: number
  matchReason: string
  applied: boolean
}

export interface JobQuery {
  keyword?: string
  salaryRange?: string
  sortBy?: 'default' | 'match'
}

export interface ApplyParams {
  jobId: number
  resumeId: number
  note?: string
}

// ============ 简历相关 ============
export interface ResumeForm {
  name: string
  target: string
  skills: string[]
  projects: { name: string; desc: string }[]
}

export interface DiagnosisResult {
  score: number
  radar: { indicators: string[]; values: number[] }
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
}

// ============ 实习相关 ============
export type ApplyStatus = 'pending' | 'counselor_passed' | 'approved' | 'rejected' | 'rolled_back'

export interface InternshipApply {
  id: number
  company: string
  position: string
  startDate: string
  endDate: string
  content: string
  applyDate: string
  status: ApplyStatus
  rejectReason?: string
}

export type LogType = 'weekly' | 'monthly'

export interface InternshipLog {
  id: number
  type: LogType
  period: string
  content: string
  reflection: string
  submitDate: string
  feedback?: string
}

export interface Evaluation {
  self: { score: number; comment: string }
  enterprise: { score: number; comment: string }
  school: { score: number; comment: string }
}

// ============ 面试相关 ============
export interface InterviewQuestion {
  text: string
  hint?: string
}

export interface InterviewFeedback {
  logic: number
  completeness: number
  expression: number
  comment: string
}

// ============ 政策问答相关 ============
export interface PolicyCitation {
  name: string
  issuer: string
  clause: string
  date: string
  content: string
}

export interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  citations?: PolicyCitation[]
}
