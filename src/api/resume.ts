import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { ResumeForm, DiagnosisResult } from './types'

/**
 * 上传简历并解析
 * 真实后端: POST /api/resume/upload（FormData）
 */
export function uploadResume(file: File) {
  return mockOrReal<ResumeForm>(
    () => ({
      name: '张同学',
      target: '前端开发工程师',
      skills: ['Vue3', 'TypeScript', 'Webpack', 'Git'],
      projects: [
        { name: 'AI 就业服务智能体', desc: '基于 Vue3 + TypeScript + Element Plus 开发，负责前端架构与核心模块' },
        { name: '企业官网重构', desc: '使用 React + Next.js 重构，性能提升 40%，Lighthouse 评分 95+' }
      ]
    }),
    () => {
      const formData = new FormData()
      formData.append('file', file)
      return request.post('/resume/upload', formData)
    }
  )
}

/**
 * 更新简历
 * 真实后端: PUT /api/resume
 */
export function updateResume(form: ResumeForm) {
  return mockOrReal<boolean>(
    () => true,
    () => request.put('/resume', form)
  )
}

/**
 * AI 简历诊断
 * 真实后端: POST /api/resume/diagnose
 */
export function diagnoseResume(targetJob: string) {
  return mockOrReal<DiagnosisResult>(
    () => {
      const mockMap: Record<string, DiagnosisResult> = {
        frontend: {
          score: 82,
          radar: {
            indicators: ['技术栈', '项目经验', '工程化', '算法基础', '软实力', '学历背景'],
            values: [85, 78, 80, 65, 88, 75]
          },
          strengths: [
            'Vue3 + TypeScript 技术栈匹配度高，掌握核心 API 与组合式 API',
            '具备完整的企业级项目经验，能独立负责模块开发',
            '工程化能力较好，熟悉 Webpack/Vite 构建工具与 Git 协作流程',
            '沟通表达清晰，团队协作能力强'
          ],
          weaknesses: [
            '算法与数据结构基础相对薄弱，大厂笔试可能受限',
            '缺少性能优化的实际案例，简历中未体现',
            '没有开源项目或技术博客，技术影响力不足'
          ],
          suggestions: [
            '补充 2-3 个算法题到简历「个人能力」栏，标注 LeetCode 刷题数量',
            '在项目描述中加入性能量化指标（如首屏加载从 3s 优化至 1.2s）',
            '针对目标岗位定向学习：React 生态、微前端架构、Node.js 服务端',
            '整理 1-2 篇技术博客或开源项目，放在简历末尾提升竞争力'
          ]
        },
        backend: {
          score: 71,
          radar: {
            indicators: ['技术栈', '项目经验', '系统设计', '数据库', '算法', '软实力'],
            values: [60, 55, 50, 72, 58, 80]
          },
          strengths: ['数据库基础扎实，熟悉 MySQL 索引优化与事务', '学习能力强，能快速上手新技术', '沟通协作能力较好'],
          weaknesses: ['Java/Spring Boot 相关经验不足，缺少后端项目', '系统设计与分布式概念薄弱', '算法能力有待加强'],
          suggestions: ['系统学习 Spring Boot + MyBatis，完成 1 个完整后端项目', '补充 Redis、消息队列、微服务等中间件知识', '刷题至 LeetCode Hot 100']
        }
      }
      return mockMap[targetJob] || mockMap.frontend
    },
    () => request.post('/resume/diagnose', { targetJob })
  )
}
