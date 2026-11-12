// 全局共享类型定义
// 已对齐后端破坏性重构后的最新契约（字段不兼容更新）
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

/** 用户信息（新契约：department/className 替代原 deptId） */
export interface UserInfo {
  id: number
  username: string
  role: UserRole
  name: string
  avatar?: string
  /** 所属院系（如：信息工程学院） */
  department: string
  /** 所属班级（如：软件2101班） */
  className: string
}

export interface LoginParams {
  username: string
  password: string
  role: UserRole
  /** 图形验证码 key（GET /auth/captcha 返回） */
  captchaKey?: string
  /** 用户输入的图形验证码 */
  captchaCode?: string
}

export interface LoginResult {
  token: string
  role: UserRole
  userInfo: UserInfo
  /** 后端 RBAC：角色编码数组（后端暂未同步时可能缺省） */
  roles?: string[]
  /** 后端 RBAC：权限点编码数组（后端暂未同步时可能缺省） */
  permissions?: string[]
}

// ============ 岗位相关 ============
/**
 * 岗位信息（新契约 JobItem / JobVO）
 * - jobName 更名为 jobTitle
 * - 单个 salary 拆分为 minSalary / maxSalary 两个数值字段（单位：元/月）
 * - 新增 status 数字状态
 * - 移除弃用字段：companyName、auditStatus、aiRiskAlert
 */
export interface JobItem {
  id: number
  /** 岗位名称（原 jobName） */
  jobTitle: string
  /** 发布企业名称 */
  company: string
  /** 最低薪资（元/月） */
  minSalary: number
  /** 最高薪资（元/月） */
  maxSalary: number
  /** 岗位状态：1-招聘中 0-已暂停 */
  status: number
  /** 岗位任职要求 */
  requirements?: string
  location: string
  skills: string[]
  matchScore: number
  matchReason: string
  applied: boolean
}

export interface JobQuery {
  keyword?: string
  /** 薪资区间，如 "5000-10000"（单位：元/月） */
  salaryRange?: string
  /** 按岗位状态筛选：1-招聘中 0-已暂停 */
  status?: number
  sortBy?: 'default' | 'match'
}

/** HR 发布岗位入参（新契约） */
export interface JobPublishParams {
  /** 岗位名称 */
  jobTitle: string
  /** 最低薪资（元/月） */
  minSalary: number
  /** 最高薪资（元/月） */
  maxSalary: number
  /** 岗位状态：1-招聘中 0-已暂停 */
  status: number
  /** 岗位任职要求 */
  requirements?: string
  /** 所属部门 */
  department?: string
  /** 招聘人数 */
  headcount?: number
}

export interface ApplyParams {
  jobId: number
  resumeId: number
  note?: string
}

// ============ 简历相关 ============
/**
 * 简历详情（新契约 ResumeVO）
 * - 移除：projectExp、educationExp、selfEvaluate、certInfo
 * - 新增：title、parsedContent、templateCode、integrityScore、sourceType
 */
export interface ResumeVO {
  id?: number
  /** 简历标题 */
  title: string
  /** 解析/富文本内容（教育经历、项目经历、自我评价、证书等统一整合于此） */
  parsedContent: string
  /** 简历模板编码（如 classic / modern / tech） */
  templateCode: string
  /** 简历完整度得分（0-100） */
  integrityScore: number
  /** 简历来源：1-文件上传解析 2-在线编辑 */
  sourceType?: number
  /** 上传的简历原件在服务端的存储路径（未上传附件时为空） */
  fileUrl?: string
}

/** 简历保存/更新入参 DTO */
export interface ResumeDTO {
  title: string
  parsedContent: string
  templateCode: string
}

/** 简历列表查询参数（班级维度改为字符串 className，不再传数字 classId） */
export interface ResumeQuery {
  /** 班级名称，如：软件2101班 */
  className?: string
  keyword?: string
}

/** AI 简历诊断响应（新契约） */
export interface DiagnosisResult {
  /** 诊断报告 ID */
  reportId: number
  /** 目标岗位名称 */
  targetJobName: string
  /** 综合总分 */
  overallScore: number
  /** 优势（纯文本，可含换行） */
  strengths: string
  /** 短板（纯文本） */
  shortcomings: string
  /** 提升建议（纯文本） */
  suggestions: string
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

/**
 * AI 面试评分记录（新契约 InterviewRecord）
 * - 移除弃用字段：score、suggest、screenCheck
 * - 改为五维评分：logicScore / completenessScore / expressionScore / roundScore / realtimeFeedback
 */
export interface InterviewRecord {
  id?: number
  /** 逻辑思维得分 */
  logicScore: number
  /** 作答完整度得分 */
  completenessScore: number
  /** 语言表达得分 */
  expressionScore: number
  /** 本轮综合得分 */
  roundScore: number
  /** AI 实时评语 */
  realtimeFeedback: string
}

// ============ 就业数据统计相关 ============
/** 行业分布项 */
export interface IndustryDistributionItem {
  /** 行业名称 */
  name: string
  /** 该行业就业人数 */
  value: number
}

/** 薪资聚合统计（元/月） */
export interface SalaryStats {
  /** 平均薪资 */
  avgSalary: number
  /** 最高薪资 */
  maxSalary: number
  /** 最低薪资 */
  minSalary: number
}

/** 就业数据大屏统计（GET /api/stat/dashboard 响应） */
export interface DashboardStats {
  /** 全院就业率（%，保留一位小数） */
  employmentRate: number
  /** 毕业生总数 */
  totalGraduates: number
  /** 已落实就业人数 */
  employedCount: number
  /** 行业分布 */
  industryDistribution: IndustryDistributionItem[]
  /** 薪资聚合统计 */
  salaryStats: SalaryStats
}

// ============ 大数据存储中心相关 ============
/** 存储介质：LOCAL-本地磁盘 DATABASE-数据库BLOB OSS-云对象存储 */
export type StorageType = 'LOCAL' | 'DATABASE' | 'OSS'

/** 存储文件记录 */
export interface StorageFile {
  id: number | string
  /** 原始文件名 */
  fileName: string
  /** 文件格式（如 pdf / jpg / log） */
  fileType: string
  /** 文件大小（字节） */
  fileSize: number
  /** 存储介质 */
  storageType: StorageType
  /** 存储路径 / 公网访问地址 */
  filePath: string
  /** 上传时间 */
  createTime: string
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
