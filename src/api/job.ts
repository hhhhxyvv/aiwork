import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { JobItem, JobQuery, JobPublishParams, ApplyParams } from './types'

/** Mock 岗位数据（新契约：jobTitle + minSalary/maxSalary 元/月 + status） */
const mockJobs: JobItem[] = [
  {
    id: 1,
    jobTitle: '前端开发工程师',
    company: '字节跳动',
    minSalary: 20000,
    maxSalary: 35000,
    status: 1,
    requirements: '熟悉 Vue3/TypeScript，有性能优化经验优先',
    location: '北京',
    skills: ['Vue3', 'TypeScript', 'Webpack', '性能优化'],
    matchScore: 93,
    matchReason: '技能重合度高，具备大型项目经验',
    applied: false
  },
  {
    id: 2,
    jobTitle: 'Java 后端开发',
    company: '阿里巴巴',
    minSalary: 18000,
    maxSalary: 30000,
    status: 1,
    requirements: '熟悉 Spring Boot/MySQL/Redis，有分布式项目经验优先',
    location: '杭州',
    skills: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
    matchScore: 87,
    matchReason: '技术栈匹配，有分布式项目经验',
    applied: false
  },
  {
    id: 3,
    jobTitle: '数据分析师',
    company: '腾讯',
    minSalary: 15000,
    maxSalary: 25000,
    status: 1,
    location: '深圳',
    skills: ['Python', 'SQL', '数据可视化', '统计学'],
    matchScore: 78,
    matchReason: '数据分析技能匹配，需加强业务理解',
    applied: false
  },
  {
    id: 4,
    jobTitle: 'UI/UX 设计师',
    company: '网易',
    minSalary: 12000,
    maxSalary: 20000,
    status: 1,
    location: '广州',
    skills: ['Figma', 'Sketch', '交互设计', '用户研究'],
    matchScore: 82,
    matchReason: '设计工具熟练，作品集质量较高',
    applied: false
  },
  {
    id: 5,
    jobTitle: 'AI 算法工程师',
    company: '百度',
    minSalary: 25000,
    maxSalary: 45000,
    status: 1,
    location: '北京',
    skills: ['Python', 'PyTorch', 'NLP', '深度学习'],
    matchScore: 71,
    matchReason: '基础扎实，需补充工业界项目经验',
    applied: false
  },
  {
    id: 6,
    jobTitle: '产品经理',
    company: '美团',
    minSalary: 16000,
    maxSalary: 28000,
    status: 0,
    location: '上海',
    skills: ['需求分析', 'Axure', '数据驱动', '项目管理'],
    matchScore: 65,
    matchReason: '部分技能匹配，建议加强产品思维训练',
    applied: false
  }
]

// 运行时维护的岗位列表（含投递状态）
let jobStore = [...mockJobs]

/**
 * 获取岗位列表（可根据 status 数字状态筛选）
 * 真实后端: GET /api/jobs
 */
export function getJobList(query?: JobQuery) {
  return mockOrReal<JobItem[]>(
    () => {
      let list = [...jobStore]
      if (query?.keyword) {
        const kw = query.keyword.toLowerCase()
        list = list.filter(
          (j) =>
            j.jobTitle.toLowerCase().includes(kw) ||
            j.company.toLowerCase().includes(kw) ||
            j.skills.some((s) => s.toLowerCase().includes(kw))
        )
      }
      if (query?.salaryRange) {
        const [min, max] = query.salaryRange.split('-').map(Number)
        list = list.filter((j) => j.minSalary >= min && j.maxSalary <= max)
      }
      if (query?.status !== undefined) {
        list = list.filter((j) => j.status === query.status)
      }
      if (query?.sortBy === 'match') {
        list.sort((a, b) => b.matchScore - a.matchScore)
      }
      return list
    },
    () => request.get('/jobs', { params: query })
  )
}

/**
 * AI 智能匹配（获取推荐岗位）
 * 真实后端: GET /api/jobs/recommend
 */
export function getRecommendJobs() {
  return mockOrReal<JobItem[]>(
    () => [...jobStore].sort((a, b) => b.matchScore - a.matchScore).slice(0, 3),
    () => request.get('/jobs/recommend')
  )
}

/**
 * HR 发布新岗位（新契约入参：jobTitle / minSalary / maxSalary / status / requirements）
 * 真实后端: POST /api/jobs
 */
export function publishJob(params: JobPublishParams) {
  return mockOrReal<boolean>(
    () => {
      jobStore.unshift({
        id: Date.now(),
        jobTitle: params.jobTitle,
        company: '本企业',
        minSalary: params.minSalary,
        maxSalary: params.maxSalary,
        status: params.status,
        requirements: params.requirements,
        location: '待定',
        skills: [],
        matchScore: 0,
        matchReason: '',
        applied: false
      })
      return true
    },
    () => request.post('/jobs', params)
  )
}

/**
 * 投递岗位
 * 真实后端: POST /api/jobs/apply
 */
export function applyJob(params: ApplyParams) {
  return mockOrReal<boolean>(
    () => {
      const job = jobStore.find((j) => j.id === params.jobId)
      if (job) job.applied = true
      return true
    },
    () => request.post('/jobs/apply', params)
  )
}

/**
 * 获取我的投递记录
 * 真实后端: GET /api/jobs/my-applications
 */
export function getMyApplications() {
  return mockOrReal<JobItem[]>(
    () => jobStore.filter((j) => j.applied),
    () => request.get('/jobs/my-applications')
  )
}
