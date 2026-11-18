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

/** 后端 MetricItem 结构（DashboardVO.MetricItem：label/value/sampleTotal） */
interface BackendMetricItem {
  label: string
  value: number | string
  sampleTotal?: number | string
}

/** 判断字段是否为后端的 MetricItem 数组（而非前端已适配的结构） */
const isMetricList = (v: unknown): v is BackendMetricItem[] =>
  Array.isArray(v) && v.length > 0 && typeof (v[0] as BackendMetricItem)?.label === 'string'

/** 薪资区间标签 → [下界, 上界]（与后端 StatServiceImpl 固定区间一一对应） */
const SALARY_RANGE_MAP: Record<string, [number, number]> = {
  '5k以下': [3000, 5000],
  '5k-8k': [5000, 8000],
  '8k-10k': [8000, 10000],
  '10k-15k': [10000, 15000],
  '15k-20k': [15000, 20000],
  '20k以上': [20000, 30000]
}

/**
 * 适配层：后端 GET /api/stat/dashboard 返回的是分组聚合结构
 * （employmentRate / industryDist / salaryAnalysis 均为 MetricItem 数组），
 * 前端页面期待的是汇总标量 + {name,value}[] + {avg,max,min}，在此统一转换。
 */
const adaptDashboardStats = (raw: Record<string, unknown>): DashboardStats => {
  // ---- 就业率：按学院分组 → 样本数加权平均 ----
  const rates = isMetricList(raw.employmentRate) ? raw.employmentRate : null
  const totalGraduates = rates
    ? rates.reduce((s, i) => s + Number(i.sampleTotal || 0), 0)
    : Number(raw.totalGraduates || 0)
  const employmentRate = rates
    ? totalGraduates > 0
      ? Number(
          (rates.reduce((s, i) => s + Number(i.value || 0) * Number(i.sampleTotal || 0), 0) / totalGraduates).toFixed(1)
        )
      : 0
    : Number(raw.employmentRate || 0)
  const employedCount = Math.round((totalGraduates * employmentRate) / 100)

  // ---- 行业分布：label/value → name/value ----
  const industryDistribution = isMetricList(raw.industryDist)
    ? raw.industryDist.map((i) => ({ name: i.label, value: Number(i.value || 0) }))
    : (raw.industryDistribution as DashboardStats['industryDistribution']) || []

  // ---- 薪资分析：固定区间计数 → 平均/最高/最低（按岗位数加权） ----
  let salaryStats = raw.salaryStats as DashboardStats['salaryStats']
  if (isMetricList(raw.salaryAnalysis)) {
    const buckets = raw.salaryAnalysis
      .map((i) => ({ range: SALARY_RANGE_MAP[i.label], count: Number(i.value || 0) }))
      .filter((b) => b.range && b.count > 0)
    salaryStats = buckets.length
      ? {
          avgSalary: Math.round(
            buckets.reduce((s, b) => s + ((b.range![0] + b.range![1]) / 2) * b.count, 0) /
              buckets.reduce((s, b) => s + b.count, 0)
          ),
          maxSalary: Math.max(...buckets.map((b) => b.range![1])),
          minSalary: Math.min(...buckets.map((b) => b.range![0]))
        }
      : { avgSalary: 0, maxSalary: 0, minSalary: 0 }
  }

  return { employmentRate, totalGraduates, employedCount, industryDistribution, salaryStats }
}

/**
 * 获取就业数据大屏统计（就业率 / 行业分布 / 薪资聚合）
 * 真实后端: GET /api/stat/dashboard
 */
export function getDashboardStats() {
  return mockOrReal<DashboardStats>(
    () => ({ ...mockStats }),
    () => request.get('/stat/dashboard').then((raw) => adaptDashboardStats(raw as unknown as Record<string, unknown>))
  )
}

export interface StatSnapshotTask {
  id: string
  status: 'QUEUED' | 'COMPLETED' | 'FAILED'
}

export function createStatSnapshotTask() {
  return request.post('/stat/snapshot-tasks') as unknown as Promise<StatSnapshotTask>
}

export function getStatSnapshotTask(id: string) {
  return request.get(`/stat/snapshot-tasks/${encodeURIComponent(id)}`) as unknown as Promise<StatSnapshotTask>
}
