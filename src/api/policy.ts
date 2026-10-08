import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { PolicyCitation } from './types'

/** Mock 政策数据库 */
const mockReplies: Record<string, { content: string; citations: PolicyCitation[] }> = {
  基层就业补贴: {
    content:
      '根据现行政策，高校毕业生到基层就业可享受多项补贴。对于到中西部地区和艰苦边远地区基层单位就业、服务期在 3 年以上（含 3 年）的高校毕业生，其学费由国家实行代偿。此外，部分地区还提供一次性基层就业补贴，具体金额因地区而异，建议咨询当地人社部门。',
    citations: [
      {
        name: '高等学校毕业生学费和国家助学贷款代偿暂行办法',
        issuer: '财政部 教育部',
        clause: '第二条、第三条',
        date: '2009-03-11',
        content:
          '第二条 高校毕业生到中西部地区和艰苦边远地区基层单位就业、服务期在 3 年以上（含 3 年）的，其学费由国家实行代偿。在校学习期间获得国家助学贷款的，代偿的学费优先用于偿还国家助学贷款本金及其全部偿还之前产生的利息。\n第三条 本办法中高校毕业生是指中央部门所属普通高等学校中的全日制本专科生（含高职）、研究生、第二学士学位应届毕业生。'
      },
      {
        name: '关于做好当前和今后一段时期就业创业工作的意见',
        issuer: '国务院',
        clause: '第五条第（二）项',
        date: '2017-04-13',
        content:
          '对到农村基层和城市社区从事社会管理和公共服务工作的高校毕业生，符合公益性岗位就业条件并在公益性岗位就业的，按照现行国家促进就业政策的规定，给予社会保险补贴和公益性岗位补贴。'
      }
    ]
  },
  三方协议注意事项: {
    content:
      '三方协议即《就业协议书》，是明确毕业生、用人单位和学校三方在毕业生就业工作中权利和义务的书面表现形式。签订时需注意：1. 核实用人单位资质；2. 明确试用期、薪资、岗位等核心条款；3. 注意违约金条款，一般不超过 5000 元；4. 协议签订后即具有法律效力，违约需承担相应责任。',
    citations: [
      {
        name: '普通高等学校毕业生就业工作暂行规定',
        issuer: '国家教育委员会',
        clause: '第四十条',
        date: '1997-03-24',
        content:
          '第四十条 经过供需见面和双向选择后，毕业生、用人单位和高等学校应当签订《普通高等学校毕业生就业协议书》，作为制定就业方案和毕业生就业的依据。'
      },
      {
        name: '中华人民共和国民法典',
        issuer: '全国人民代表大会',
        clause: '第五百七十七条',
        date: '2020-05-28',
        content:
          '第五百七十七条 当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。'
      }
    ]
  },
  高校毕业生免税政策: {
    content:
      '高校毕业生创业可享受税收优惠政策。对持《就业创业证》的高校毕业生在毕业年度内从事个体经营的，自办理个体工商户登记当月起，在 3 年内按每户每年 12000 元为限额依次扣减其当年实际应缴纳的增值税、城市维护建设税、教育费附加和个人所得税。',
    citations: [
      {
        name: '关于进一步支持重点群体创业就业有关税收政策的公告',
        issuer: '财政部 税务总局 人力资源社会保障部 农业农村部',
        clause: '第一条',
        date: '2023-08-02',
        content:
          '自 2023 年 1 月 1 日至 2027 年 12 月 31 日，脱贫人口、持《就业创业证》的人员，从事个体经营的，自办理个体工商户登记当月起，在 3 年内按每户每年 20000 元为限额依次扣减其当年实际应缴纳的增值税、城市维护建设税、教育费附加、地方教育附加和个人所得税。'
      }
    ]
  }
}

/**
 * 政策问答
 * 真实后端: POST /api/policy/chat
 */
export function chatPolicy(question: string) {
  return mockOrReal(
    () => {
      const key = Object.keys(mockReplies).find((k) => question.includes(k))
      if (key) return mockReplies[key]
      return {
        content:
          '抱歉，我暂时未能在政策库中检索到与该问题精确匹配的条款。建议您尝试使用更具体的政策关键词（如"基层就业补贴""三方协议""免税政策"等），或查阅当地人力资源和社会保障局官网获取最新政策原文。',
        citations: [] as PolicyCitation[]
      }
    },
    () => request.post('/policy/chat', { question })
  )
}

/**
 * 获取政策条目列表
 * 真实后端: GET /api/policy/list
 */
export function getPolicyList() {
  return mockOrReal<PolicyCitation[]>(
    () => Object.values(mockReplies).flatMap((r) => r.citations),
    () => request.get('/policy/list')
  )
}
