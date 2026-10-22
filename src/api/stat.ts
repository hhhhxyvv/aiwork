import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { DashboardStats } from './types'

/** Mock 统计数据 */
const mockStats: DashboardStats = {
  employmentRate: 84.2,
  totalGraduates: 355,
  employedCount: 301,
  industryDistribution: [
    { name: '互联网/软件', value: 128 },
    { name: '智能制造', value: 54 },
    { name: '金融服务', value: 47 },
    { name: '教育科研', value: 38 },
    { name: '其他行业', value: 34 }
  ],
  salaryStats: {
    avgSalary: 8600,
    maxSalary: 25000,
    minSalary: 4500
  }
}

/**
 * 获取就业数据大屏统计（就业率 / 行业分布 / 薪资聚合）
 * 真实后端: GET /api/stat/dashboard
 */
export function getDashboardStats() {
  return mockOrReal<DashboardStats>(
    () => ({ ...mockStats }),
    () => request.get('/stat/dashboard')
  )
}
