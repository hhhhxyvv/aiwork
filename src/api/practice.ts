import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { InternshipApply, InternshipLog, Evaluation, ApplyStatus, LogType } from './types'

// ============ 实习申请与审批 ============

let applyStore: InternshipApply[] = [
  {
    id: 1,
    company: '字节跳动',
    position: '前端开发实习生',
    startDate: '2024-07-01',
    endDate: '2024-12-31',
    content: '参与抖音电商前端项目开发',
    applyDate: '2024-06-15',
    status: 'approved'
  },
  {
    id: 2,
    company: '阿里巴巴',
    position: 'Java 后端实习生',
    startDate: '2024-09-01',
    endDate: '2025-03-01',
    content: '参与淘宝搜索系统优化',
    applyDate: '2024-08-20',
    status: 'counselor_passed'
  },
  {
    id: 3,
    company: '某创业公司',
    position: '产品实习生',
    startDate: '2024-10-01',
    endDate: '2025-01-01',
    content: '产品需求分析与原型设计',
    applyDate: '2024-09-25',
    status: 'rejected',
    rejectReason: '企业资质材料不完整，请补充营业执照扫描件后重新申请'
  }
]

/**
 * 获取实习申请列表
 * 真实后端: GET /api/practice/applications
 */
export function getApplyList() {
  return mockOrReal<InternshipApply[]>(
    () => [...applyStore],
    () => request.get('/practice/applications')
  )
}

/**
 * 提交实习申请
 * 真实后端: POST /api/practice/applications
 */
export function submitApplication(data: Omit<InternshipApply, 'id' | 'applyDate' | 'status'>) {
  return mockOrReal<InternshipApply>(
    () => {
      const item: InternshipApply = {
        ...data,
        id: Date.now(),
        applyDate: new Date().toISOString().slice(0, 10),
        status: 'pending' as ApplyStatus
      }
      applyStore.unshift(item)
      return item
    },
    () => request.post('/practice/applications', data)
  )
}

// ============ 实习日志 ============

let logStore: InternshipLog[] = [
  {
    id: 1,
    type: 'weekly',
    period: '2024年第40周',
    content: '完成电商首页组件重构，优化首屏加载速度，参与代码评审',
    reflection: '对 Vue3 性能优化有了更深理解，但对微前端架构还不够熟悉',
    submitDate: '2024-10-05',
    feedback: '本周工作扎实，性能优化成果显著。建议深入学习微前端相关技术，拓展技术广度。继续保持！'
  },
  {
    id: 2,
    type: 'weekly',
    period: '2024年第39周',
    content: '参与需求评审，完成商品详情页开发，修复3个线上Bug',
    reflection: '需求理解能力有所提升，但沟通效率还需加强',
    submitDate: '2024-09-28',
    feedback: '任务完成度高，Bug 修复及时。建议在需求评审时多提问，确保理解准确。'
  },
  {
    id: 3,
    type: 'monthly',
    period: '2024年9月',
    content: '完成3个需求迭代，代码提交42次，参与技术分享1次',
    reflection: '整体节奏适应良好，技术成长明显，但文档撰写能力有待提高',
    submitDate: '2024-09-30',
    feedback: '本月表现优秀，技术分享准备充分。注意提升技术文档的规范性，养成写文档的好习惯。'
  },
  {
    id: 4,
    type: 'weekly',
    period: '2024年第41周',
    content: '开发购物车模块，联调后端接口',
    reflection: '接口联调中遇到跨域问题，已解决',
    submitDate: '2024-10-12'
  }
]

/**
 * 获取实习日志列表
 * 真实后端: GET /api/practice/logs
 */
export function getLogList() {
  return mockOrReal<InternshipLog[]>(
    () => [...logStore],
    () => request.get('/practice/logs')
  )
}

/**
 * 提交实习日志
 * 真实后端: POST /api/practice/logs
 */
export function submitLog(data: Omit<InternshipLog, 'id' | 'submitDate'>) {
  return mockOrReal<InternshipLog>(
    () => {
      const item: InternshipLog = {
        ...data,
        id: Date.now(),
        submitDate: new Date().toISOString().slice(0, 10)
      }
      logStore.unshift(item)
      return item
    },
    () => request.post('/practice/logs', data)
  )
}

// ============ 三方评价 ============

/**
 * 获取三方综合评价
 * 真实后端: GET /api/practice/evaluation
 */
export function getEvaluation() {
  return mockOrReal<Evaluation>(
    () => ({
      self: { score: 88, comment: '实习期间认真负责，主动学习新技术，按时完成各项任务，团队协作能力良好。' },
      enterprise: { score: 92, comment: '该生专业基础扎实，学习能力强，能快速融入团队，代码质量高，建议录用。' },
      school: { score: 90, comment: '实习态度端正，日志记录详实，与辅导员沟通及时，圆满完成实习任务。' }
    }),
    () => request.get('/practice/evaluation')
  )
}
