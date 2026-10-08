import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { Job, JobQuery, ApplyParams } from './types'

/** Mock 岗位数据 */
const mockJobs: Job[] = [
  {
    id: 1,
    name: '前端开发工程师',
    company: '字节跳动',
    salary: '20K-35K',
    salaryMin: 20,
    salaryMax: 35,
    location: '北京',
    skills: ['Vue3', 'TypeScript', 'Webpack', '性能优化'],
    matchScore: 93,
    matchReason: '技能重合度高，具备大型项目经验',
    applied: false
  },
  {
    id: 2,
    name: 'Java 后端开发',
    company: '阿里巴巴',
    salary: '18K-30K',
    salaryMin: 18,
    salaryMax: 30,
    location: '杭州',
    skills: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
    matchScore: 87,
    matchReason: '技术栈匹配，有分布式项目经验',
    applied: false
  },
  {
    id: 3,
    name: '数据分析师',
    company: '腾讯',
    salary: '15K-25K',
    salaryMin: 15,
    salaryMax: 25,
    location: '深圳',
    skills: ['Python', 'SQL', '数据可视化', '统计学'],
    matchScore: 78,
    matchReason: '数据分析技能匹配，需加强业务理解',
    applied: false
  },
  {
    id: 4,
    name: 'UI/UX 设计师',
    company: '网易',
    salary: '12K-20K',
    salaryMin: 12,
    salaryMax: 20,
    location: '广州',
    skills: ['Figma', 'Sketch', '交互设计', '用户研究'],
    matchScore: 82,
    matchReason: '设计工具熟练，作品集质量较高',
    applied: false
  },
  {
    id: 5,
    name: 'AI 算法工程师',
    company: '百度',
    salary: '25K-45K',
    salaryMin: 25,
    salaryMax: 45,
    location: '北京',
    skills: ['Python', 'PyTorch', 'NLP', '深度学习'],
    matchScore: 71,
    matchReason: '基础扎实，需补充工业界项目经验',
    applied: false
  },
  {
    id: 6,
    name: '产品经理',
    company: '美团',
    salary: '16K-28K',
    salaryMin: 16,
    salaryMax: 28,
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
 * 获取岗位列表
 * 真实后端: GET /api/jobs
 */
export function getJobList(query?: JobQuery) {
  return mockOrReal<Job[]>(
    () => {
      let list = [...jobStore]
      if (query?.keyword) {
        const kw = query.keyword.toLowerCase()
        list = list.filter(
          (j) =>
            j.name.toLowerCase().includes(kw) ||
            j.company.toLowerCase().includes(kw) ||
            j.skills.some((s) => s.toLowerCase().includes(kw))
        )
      }
      if (query?.salaryRange) {
        const [min, max] = query.salaryRange.split('-').map(Number)
        list = list.filter((j) => j.salaryMin >= min && j.salaryMax <= max)
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
  return mockOrReal<Job[]>(
    () => [...jobStore].sort((a, b) => b.matchScore - a.matchScore).slice(0, 3),
    () => request.get('/jobs/recommend')
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
  return mockOrReal<Job[]>(
    () => jobStore.filter((j) => j.applied),
    () => request.get('/jobs/my-applications')
  )
}
