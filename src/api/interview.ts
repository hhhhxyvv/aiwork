import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { InterviewQuestion, InterviewRecord } from './types'

/** Mock 题库 */
const questionBank: Record<string, InterviewQuestion[]> = {
  tech: [
    { text: '请简述 Vue 3 相比 Vue 2 的主要改进，并说明 Composition API 的优势。', hint: '可从响应式原理、API 设计、TypeScript 支持等角度回答' },
    { text: '什么是事件循环（Event Loop）？请解释宏任务和微任务的执行顺序。', hint: '结合 Promise、setTimeout 举例说明' },
    { text: '如何优化前端页面的首屏加载性能？请列举至少 5 种方法。', hint: '从资源、网络、渲染等维度思考' },
    { text: '请解释 HTTPS 的工作原理，以及它如何保证数据传输安全。', hint: '涉及 TLS 握手、非对称加密、对称加密' },
    { text: '设计一个高并发的秒杀系统，你会考虑哪些技术点？', hint: '限流、削峰、缓存、分布式锁等' }
  ],
  management: [
    { text: '如果你是团队负责人，如何处理团队成员之间的矛盾？', hint: '结合实际案例，体现沟通与协调能力' },
    { text: '当项目进度落后于计划时，你会如何应对？', hint: '分析原因、调整资源、沟通协调' },
    { text: '请描述一次你做过的重要决策，以及决策的依据和结果。', hint: '体现决策思维和复盘能力' },
    { text: '如何激励团队成员保持高绩效？', hint: '从目标、认可、成长等维度回答' }
  ],
  general: [
    { text: '请做一个简短的自我介绍，突出你的核心优势。', hint: '控制在 1-2 分钟，结构清晰' },
    { text: '你遇到过最大的挫折是什么？如何克服的？', hint: '体现抗压能力和成长思维' },
    { text: '你的职业规划是怎样的？', hint: '短期、中期、长期，结合岗位' },
    { text: '如果和领导意见不一致，你会怎么处理？', hint: '体现职业素养和沟通技巧' },
    { text: '你认为自己最大的缺点是什么？如何改进？', hint: '真诚但不致命，有改进措施' }
  ]
}

const comments = [
  '回答结构清晰，逻辑严谨，能够抓住核心要点，建议增加具体案例支撑。',
  '整体回答较为完整，但部分细节展开不足，建议补充实际项目经验。',
  '表达流畅，观点明确，但逻辑性可进一步加强，建议采用 STAR 法则组织答案。',
  '回答内容充实，表达自然，展现了扎实的基础和良好的沟通能力。'
]

/**
 * 获取面试题目（AI 生成）
 * 真实后端: POST /api/interview/questions
 */
export function getQuestions(scene: string) {
  return mockOrReal<InterviewQuestion[]>(
    () => questionBank[scene] || questionBank.tech,
    () => request.post('/interview/questions', { scene })
  )
}

/** 最近一次作答长度（用于本地模拟评分基准） */
let lastAnswerLength = 60

/** 生成本地模拟的五维评分 */
const mockRecord = (): InterviewRecord => {
  const base = Math.min(95, 50 + Math.floor(lastAnswerLength / 10))
  const rand = () => Math.min(98, base + Math.floor(Math.random() * 8))
  return {
    logicScore: rand(),
    completenessScore: rand(),
    expressionScore: rand(),
    roundScore: rand(),
    realtimeFeedback: comments[Math.floor(Math.random() * comments.length)]
  }
}

/**
 * 提交回答并获取 AI 五维评分
 * 真实后端: POST /api/interview/score
 */
export function scoreAnswer(answer: string) {
  lastAnswerLength = answer.length
  return mockOrReal<InterviewRecord>(
    () => mockRecord(),
    () => request.post('/interview/score', { answer })
  )
}

/**
 * 结束面试，获取整场面试的五维评估报告
 * 真实后端: POST /api/interview/finish
 */
export function finishInterview() {
  return mockOrReal<InterviewRecord>(
    () => {
      lastAnswerLength = 80
      return mockRecord()
    },
    () => request.post('/interview/finish')
  )
}
