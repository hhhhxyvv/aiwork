import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { ResumeVO, ResumeDTO, ResumeQuery, DiagnosisResult } from './types'

/** Mock 简历库（带班级维度，供辅导员筛选演示） */
interface MockResumeRow extends ResumeVO {
  className: string
  studentName: string
}

const mockResumeStore: MockResumeRow[] = [
  {
    id: 1,
    studentName: '张同学',
    className: '软件2101班',
    title: '张同学-前端开发求职简历',
    parsedContent:
      '【教育经历】软件工程 本科 2022-2026\n【项目经历】AI 就业服务智能体：负责前端架构与核心模块开发\n【技能特长】Vue3 / TypeScript / Element Plus',
    templateCode: 'classic',
    integrityScore: 88,
    sourceType: 2
  },
  {
    id: 2,
    studentName: '李同学',
    className: '软件2101班',
    title: '李同学-Java开发求职简历',
    parsedContent: '【教育经历】计算机科学 本科 2022-2026\n【项目经历】校园二手交易平台：后端接口设计与开发\n【技能特长】Java / Spring Boot / MySQL',
    templateCode: 'modern',
    integrityScore: 76,
    sourceType: 1
  },
  {
    id: 3,
    studentName: '王同学',
    className: '软件2102班',
    title: '王同学-数据分析求职简历',
    parsedContent: '【教育经历】大数据管理 本科 2022-2026\n【项目经历】就业数据可视化看板：负责数据清洗与图表呈现\n【技能特长】Python / SQL / ECharts',
    templateCode: 'classic',
    integrityScore: 64,
    sourceType: 1
  }
]

/**
 * 上传简历文件并解析（后端保存原件 + 解析文本，返回 ResumeVO，内容统一在 parsedContent 中）
 * 真实后端: POST /api/resume/upload（multipart/form-data，字段名 file）
 */
export function uploadResume(file: File) {
  return mockOrReal<ResumeVO>(
    () => ({
      id: 1,
      title: '张同学-前端开发求职简历',
      parsedContent:
        '【教育经历】软件工程 本科 2022-2026\n【项目经历】企业官网重构：性能提升 40%\n【技能特长】Vue3 / TypeScript / Git',
      templateCode: 'classic',
      integrityScore: 72,
      sourceType: 1
    }),
    () => {
      const formData = new FormData()
      formData.append('file', file)
      return request.post('/resume/upload', formData)
    }
  )
}

/**
 * 学生查询自己的简历详情（未建档时返回 null）
 * 真实后端: GET /api/resume/detail
 */
export function getMyResume() {
  return mockOrReal<ResumeVO | null>(
    () => mockResumeStore[0],
    () => request.get('/resume/detail')
  )
}

/**
 * 下载学生自己上传的简历原件（字节流）
 * 真实后端: GET /api/resume/download
 */
export function downloadMyResume() {
  return mockOrReal<Blob>(
    () => new Blob(['mock resume'], { type: 'application/octet-stream' }),
    () => request.get('/resume/download', { responseType: 'blob' })
  )
}

/**
 * 按班级查询学生简历建档列表（新契约：班级维度传字符串 className，不再传数字 classId）
 * 真实后端: GET /api/resume/list?className=xxx
 */
export function getResumeList(params?: ResumeQuery) {
  return mockOrReal<ResumeVO[]>(
    () => {
      let list = [...mockResumeStore]
      if (params?.className) {
        list = list.filter((r) => r.className === params.className)
      }
      return list
    },
    () => request.get('/resume/list', { params })
  )
}

/**
 * 保存/更新简历
 * 真实后端: POST /api/resume/save
 */
export function updateResume(dto: ResumeDTO & { sourceType?: number }) {
  return mockOrReal<boolean>(
    () => true,
    () => request.post('/resume/save', dto)
  )
}

/**
 * AI 简历诊断（新契约响应：reportId / targetJobName / overallScore / strengths / shortcomings / suggestions）
 * 真实后端: POST /api/resume/diagnose
 */
export function diagnoseResume(targetJobName: string) {
  return mockOrReal<DiagnosisResult>(
    () => ({
      reportId: Date.now(),
      targetJobName,
      overallScore: 82,
      strengths:
        'Vue3 + TypeScript 技术栈匹配度高，掌握组合式 API\n具备完整的企业级项目经验，能独立负责模块开发\n工程化能力较好，熟悉 Vite 构建与 Git 协作流程',
      shortcomings: '算法与数据结构基础相对薄弱，笔试可能受限\n缺少性能优化的量化案例，简历中未体现\n没有开源项目或技术博客，技术影响力不足',
      suggestions:
        '补充 2-3 个算法题成果，标注 LeetCode 刷题数量\n在项目描述中加入性能量化指标（如首屏加载从 3s 优化至 1.2s）\n整理 1-2 篇技术博客或开源项目，放在简历末尾提升竞争力'
    }),
    () => request.post('/resume/ai-evaluate', null, { params: { targetJobName } })
  )
}
