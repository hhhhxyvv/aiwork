<template>
  <div class="policy-page">
    <el-alert title="本页政策问答与知识库维护为本地演示，未调用真实AI服务或保存到数据库。" type="info" :closable="false" />
    <el-card v-if="hasPermission('policy:manage')" style="margin:16px 0">
      <template #header>政策知识库维护（本地演示）</template>
      <el-input v-model="policyKeyword" placeholder="关键词" />
      <el-input v-model="policyContent" type="textarea" :rows="3" placeholder="政策说明" />
      <el-button type="primary" @click="savePolicy">保存本地条目</el-button>
    </el-card>
    <div v-if="hasPermission('policy:qa:use')" class="chat-window">
      <!-- 顶部说明 -->
      <div class="chat-header">
        <div class="header-left">
          <el-icon class="header-icon"><Reading /></el-icon>
          <div>
            <h3 class="header-title">政策智能问答</h3>
            <p class="header-desc">基于 50+ 权威政策库进行语义检索与条款溯源</p>
          </div>
        </div>
        <el-tag type="success" effect="dark" class="online-tag">本地演示</el-tag>
      </div>

      <!-- 消息列表 -->
      <div class="message-list" ref="messageListRef">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="message-item"
          :class="msg.role === 'user' ? 'is-user' : 'is-ai'"
        >
          <!-- AI 头像 -->
          <el-avatar v-if="msg.role === 'ai'" :size="36" class="ai-avatar">
            <el-icon><ChatDotRound /></el-icon>
          </el-avatar>

          <div class="bubble-wrapper">
            <!-- 消息气泡 -->
            <div class="bubble" :class="msg.role === 'user' ? 'user-bubble' : 'ai-bubble'">
              <span v-if="msg.typing" class="typing-dots">
                <i></i><i></i><i></i>
              </span>
              <template v-else>{{ msg.content }}</template>
            </div>

            <!-- 政策引用溯源卡片（仅 AI 消息且有引用时显示） -->
            <div v-if="msg.role === 'ai' && msg.citations && !msg.typing" class="citation-card">
              <div class="citation-title">
                <el-icon><Document /></el-icon>
                <span>政策引用溯源</span>
              </div>
              <div
                v-for="(cite, cIdx) in msg.citations"
                :key="cIdx"
                class="citation-item"
                @click="showCitationDetail(cite)"
              >
                <div class="cite-left">
                  <div class="cite-name">{{ cite.name }}</div>
                  <div class="cite-meta">{{ cite.issuer }} · {{ cite.clause }}</div>
                </div>
                <el-icon class="cite-arrow"><ArrowRight /></el-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- 滚动到底部的占位 -->
        <div ref="bottomRef"></div>
      </div>

      <!-- 快捷标签 -->
      <div class="quick-tags">
        <el-tag
          v-for="tag in quickTags"
          :key="tag"
          class="quick-tag"
          effect="plain"
          @click="sendQuick(tag)"
        >
          {{ tag }}
        </el-tag>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <el-input
          v-model="inputText"
          class="message-input"
          placeholder="请输入您想咨询的政策问题..."
          :prefix-icon="Search"
          clearable
          @keyup.enter="handleSend"
        />
        <el-button type="primary" class="send-btn" @click="handleSend">
          <el-icon><Promotion /></el-icon>
          <span>发送</span>
        </el-button>
      </div>
    </div>

    <!-- 政策详情 Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentCitation?.name || '政策详情'"
      width="560px"
      class="citation-dialog"
    >
      <div v-if="currentCitation" class="detail-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="政策名称">{{ currentCitation.name }}</el-descriptions-item>
          <el-descriptions-item label="发文单位">{{ currentCitation.issuer }}</el-descriptions-item>
          <el-descriptions-item label="条款项">{{ currentCitation.clause }}</el-descriptions-item>
          <el-descriptions-item label="发布日期">{{ currentCitation.date }}</el-descriptions-item>
        </el-descriptions>
        <div class="detail-text">
          <h4>条款原文</h4>
          <p>{{ currentCitation.content }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { hasPermission, hasAnyPermission } from '@/utils/permission'

import { ref, nextTick, onMounted } from 'vue'
import {
  Reading,
  ChatDotRound,
  Document,
  ArrowRight,
  Search,
  Promotion
} from '@element-plus/icons-vue'

// 政策引用类型
interface Citation {
  name: string
  issuer: string
  clause: string
  date: string
  content: string
}

// 消息类型
interface Message {
  role: 'user' | 'ai'
  content: string
  citations?: Citation[]
  typing?: boolean
}

const policyKeyword = ref(''), policyContent = ref('')
function savePolicy() {
  if (!hasPermission('policy:manage') || !policyKeyword.value.trim() || !policyContent.value.trim()) return
  mockReplies[policyKeyword.value.trim()] = {content:policyContent.value.trim(),citations:[]}
  policyKeyword.value = ''; policyContent.value = ''
}
// 快捷问题
const quickTags = ['基层就业补贴', '三方协议注意事项', '高校毕业生免税政策']

// Mock 数据库：根据关键词返回 AI 回复
const mockReplies: Record<string, { content: string; citations: Citation[] }> = {
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
          '第二条 高校毕业生到中西部地区和艰苦边远地区基层单位就业、服务期在 3 年以上（含 3 年）的，其学费由国家实行代偿。在校学习期间获得国家助学贷款（含高校国家助学贷款和生源地信用助学贷款，下同）的，代偿的学费优先用于偿还国家助学贷款本金及其全部偿还之前产生的利息。\n第三条 本办法中高校毕业生是指中央部门所属普通高等学校中的全日制本专科生（含高职）、研究生、第二学士学位应届毕业生。'
      },
      {
        name: '关于做好当前和今后一段时期就业创业工作的意见',
        issuer: '国务院',
        clause: '第五条第（二）项',
        date: '2017-04-13',
        content:
          '第五条 促进高校毕业生就业创业。（二）对到农村基层和城市社区从事社会管理和公共服务工作的高校毕业生，符合公益性岗位就业条件并在公益性岗位就业的，按照现行国家促进就业政策的规定，给予社会保险补贴和公益性岗位补贴。'
      }
    ]
  },
  三方协议注意事项: {
    content:
      '三方协议即《就业协议书》，是明确毕业生、用人单位和学校三方在毕业生就业工作中权利和义务的书面表现形式。签订时需注意：1. 核实用人单位资质；2. 明确试用期、薪资、岗位等核心条款；3. 注意违约金条款，一般不超过 5000 元；4. 协议签订后即具有法律效力，违约需承担相应责任。建议毕业生在签订前仔细阅读全部条款。',
    citations: [
      {
        name: '普通高等学校毕业生就业工作暂行规定',
        issuer: '国家教育委员会',
        clause: '第四十条',
        date: '1997-03-24',
        content:
          '第四十条 经过供需见面和双向选择后，毕业生、用人单位和高等学校应当签订《普通高等学校毕业生就业协议书》，作为制定就业方案和毕业生就业的依据。就业协议书是明确毕业生、用人单位和学校在毕业生就业工作中权利和义务的书面表现形式，对三方均具有约束力。'
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
      '高校毕业生创业可享受税收优惠政策。对持《就业创业证》的高校毕业生在毕业年度内从事个体经营的，自办理个体工商户登记当月起，在 3 年内按每户每年 12000 元为限额依次扣减其当年实际应缴纳的增值税、城市维护建设税、教育费附加和个人所得税。限额标准最高可上浮 20%。',
    citations: [
      {
        name: '关于进一步支持重点群体创业就业有关税收政策的公告',
        issuer: '财政部 税务总局 人力资源社会保障部 农业农村部',
        clause: '第一条',
        date: '2023-08-02',
        content:
          '第一条 自 2023 年 1 月 1 日至 2027 年 12 月 31 日，脱贫人口（含防止返贫监测对象）、持《就业创业证》（注明“自主创业税收政策”或“毕业年度内自主创业税收政策”）或《就业失业登记证》（注明“自主创业税收政策”）的人员，从事个体经营的，自办理个体工商户登记当月起，在 3 年内按每户每年 20000 元为限额依次扣减其当年实际应缴纳的增值税、城市维护建设税、教育费附加、地方教育附加和个人所得税。'
      },
      {
        name: '关于支持和促进重点群体创业就业有关税收政策的通知',
        issuer: '财政部 国家税务总局 人力资源社会保障部',
        clause: '第一条',
        date: '2017-06-12',
        content:
          '第一条 对持《就业创业证》（注明“自主创业税收政策”或“毕业年度内自主创业税收政策”）或《就业失业登记证》（注明“自主创业税收政策”）的人员从事个体经营的，在 3 年内按每户每年 8000 元为限额依次扣减其当年实际应缴纳的增值税、城市维护建设税、教育费附加、地方教育附加和个人所得税。'
      }
    ]
  }
}

// 默认欢迎语
const welcomeMsg: Message = {
  role: 'ai',
  content:
    '您好！我是就业政策智能助手，可为您解答基层就业、三方协议、创业税收等政策问题。请输入您的问题，或点击下方快捷标签。'
}

const messages = ref<Message[]>([welcomeMsg])
const inputText = ref('')
const messageListRef = ref<HTMLElement>()
const bottomRef = ref<HTMLElement>()

// 政策详情弹窗
const dialogVisible = ref(false)
const currentCitation = ref<Citation | null>(null)

const showCitationDetail = (cite: Citation) => {
  currentCitation.value = cite
  dialogVisible.value = true
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    bottomRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

// 模拟 AI 回复
const mockAIReply = (question: string) => {
  // 先显示打字中
  const typingMsg: Message = { role: 'ai', content: '', typing: true }
  messages.value.push(typingMsg)
  scrollToBottom()

  // 根据关键词匹配 Mock 回复
  const key = Object.keys(mockReplies).find((k) => question.includes(k))
  const reply = key
    ? mockReplies[key]
    : {
        content:
          '抱歉，我暂时未能在政策库中检索到与该问题精确匹配的条款。建议您尝试使用更具体的政策关键词（如"基层就业补贴""三方协议""免税政策"等），或查阅当地人力资源和社会保障局官网获取最新政策原文。',
        citations: []
      }

  // 模拟打字延迟
  setTimeout(() => {
    // 移除打字中的消息
    const idx = messages.value.indexOf(typingMsg)
    if (idx > -1) {
      messages.value.splice(idx, 1, {
        role: 'ai',
        content: reply.content,
        citations: reply.citations
      })
    }
    scrollToBottom()
  }, 1200)
}

// 发送消息
const handleSend = () => {
  const text = inputText.value.trim()
  if (!text) return
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  scrollToBottom()
  mockAIReply(text)
}

// 快捷标签发送
const sendQuick = (tag: string) => {
  messages.value.push({ role: 'user', content: tag })
  scrollToBottom()
  mockAIReply(tag)
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.policy-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* 聊天窗口 */
.chat-window {
  width: 100%;
  max-width: 860px;
  height: calc(100vh - 140px);
  min-height: 560px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部 */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 100%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  font-size: 28px;
  color: #2563eb;
}

.header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.header-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.online-tag {
  font-size: 12px;
}

/* 消息列表 */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #fafbfc;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-item.is-user {
  justify-content: flex-end;
}

.ai-avatar {
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  color: #fff;
  flex-shrink: 0;
}

.bubble-wrapper {
  max-width: 72%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.is-user .bubble-wrapper {
  align-items: flex-end;
}

.bubble {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.ai-bubble {
  background: #ffffff;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-top-left-radius: 4px;
}

.user-bubble {
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  color: #ffffff;
  border-top-right-radius: 4px;
}

/* 打字动画 */
.typing-dots {
  display: inline-flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.typing-dots i:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots i:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 政策引用卡片 */
.citation-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 14px;
  width: 100%;
}

.citation-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 10px;
}

.citation-title .el-icon {
  color: #2563eb;
}

.citation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.citation-item:last-child {
  margin-bottom: 0;
}

.citation-item:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.cite-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.cite-meta {
  font-size: 12px;
  color: #9ca3af;
}

.cite-arrow {
  color: #9ca3af;
  font-size: 14px;
}

.citation-item:hover .cite-arrow {
  color: #2563eb;
}

/* 快捷标签 */
.quick-tags {
  padding: 12px 24px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.quick-tag {
  cursor: pointer;
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 16px;
  transition: all 0.2s;
}

.quick-tag:hover {
  background: #2563eb !important;
  color: #fff !important;
  border-color: #2563eb !important;
}

/* 输入区 */
.input-area {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.message-input {
  flex: 1;
}

.send-btn {
  padding: 0 22px;
}

/* 详情弹窗 */
.detail-content {
  font-size: 14px;
}

.detail-text {
  margin-top: 20px;
}

.detail-text h4 {
  margin: 0 0 10px;
  color: #1f2937;
  font-size: 15px;
}

.detail-text p {
  margin: 0;
  padding: 14px;
  background: #f8fafc;
  border-radius: 8px;
  color: #4b5563;
  line-height: 1.8;
  white-space: pre-line;
}

/* 滚动条美化 */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}
</style>
