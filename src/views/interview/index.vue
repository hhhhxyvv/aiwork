<template>
  <div class="interview-container">
    <!-- ================= 1. 院系管理员：全院各专业 AI 面试学情与工作督办 ================= -->
    <div v-if="role === 'admin'" class="role-box">
      <el-card shadow="hover">
        <template #header>
          <div class="header-flex">
            <div>
              <span class="section-title">全院各专业毕业生模拟面试学情诊断总览</span>
              <span class="sub-tip">监控各专业参训率、面试均分与辅导员帮扶台账落实度</span>
            </div>
            <el-button type="danger" plain @click="sendSupervisionOrder">一键下发学院重点督办令</el-button>
          </div>
        </template>
        <el-table :data="adminMajorStats" stripe style="width: 100%">
          <el-table-column prop="major" label="专业名称" width="160" />
          <el-table-column prop="counselor" label="辅导员" width="110" />
          <el-table-column prop="total" label="毕业生总数" width="110" align="center" />
          <el-table-column prop="rate" label="模考参训率" width="150">
            <template #default="{ row }">
              <el-progress :percentage="row.rate" :status="row.rate >= 80 ? 'success' : 'exception'" />
            </template>
          </el-table-column>
          <el-table-column prop="avgScore" label="平均分" width="110" align="center">
            <template #default="{ row }">
              <span :class="row.avgScore < 70 ? 'text-danger font-bold' : 'font-bold'">{{ row.avgScore }} 分</span>
            </template>
          </el-table-column>
          <el-table-column prop="warnCount" label="低分预警人数" width="120" align="center">
            <template #default="{ row }">
              <el-tag type="danger">{{ row.warnCount }} 人</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="taskRate" label="帮扶完成度" width="150">
            <template #default="{ row }">
              <el-progress :percentage="row.taskRate" :status="row.taskRate === 100 ? 'success' : 'warning'" />
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- ================= 2. 企业 HR：AI 校招视频初筛中心 ================= -->
    <div v-else-if="role === 'hr'" class="role-box">
      <el-card shadow="hover">
        <template #header>
          <div class="header-flex">
            <div>
              <span class="section-title">候选人 AI 视频初面评估库</span>
              <span class="sub-tip">AI 自动提取回答逐字稿、情绪分析与防作弊切片</span>
            </div>
          </div>
        </template>
        <el-table :data="hrCandidateList" stripe style="width: 100%">
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="school" label="毕业院校/专业" width="180" />
          <el-table-column prop="jobTitle" label="应聘岗位" width="140" />
          <el-table-column prop="aiScore" label="AI 胜任分" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.aiScore >= 80 ? 'success' : 'danger'">{{ row.aiScore }} 分</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="AI 面评摘要" min-width="260" />
          <el-table-column prop="status" label="流程状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'passed'" type="success">已发复试</el-tag>
              <el-tag v-else-if="row.status === 'rejected'" type="info">已淘汰</el-tag>
              <el-tag v-else type="primary">待复核</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="previewVideo(row)">看切片</el-button>
              <el-button link type="success" :disabled="row.status !== 'pending'" @click="passCandidate(row)">发复试</el-button>
              <el-button link type="danger" :disabled="row.status !== 'pending'" @click="rejectCandidate(row)">淘汰</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- ================= 3. 辅导员：班级面试学情与帮扶台账 ================= -->
    <div v-else-if="role === 'counselor'" class="role-box">
      <el-card shadow="hover">
        <template #header>
          <div class="header-flex">
            <div>
              <span class="section-title">班级面试学情监控与帮扶台账</span>
              <span class="sub-tip">全班 45 人，已模考 37 人，低分预警 5 人</span>
            </div>
            <div>
              <el-button type="primary" plain @click="remindStudents">一键催促未参训 (8人)</el-button>
              <el-button type="success" @click="exportLedger">导出帮扶台账 (Excel)</el-button>
            </div>
          </div>
        </template>
        <el-table :data="counselorStudents" stripe style="width: 100%">
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="studentId" label="学号" width="130" />
          <el-table-column prop="targetRole" label="求职意向" width="140" />
          <el-table-column prop="score" label="最高分" width="100" align="center">
            <template #default="{ row }">
              <span :class="row.score < 60 ? 'text-danger font-bold' : ''">{{ row.score }} 分</span>
            </template>
          </el-table-column>
          <el-table-column prop="weakness" label="AI 核心诊断薄弱项" min-width="220" />
          <el-table-column label="管理操作" width="140" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="talkStudent(row)">{{ row.talked ? '已约谈' : '一键约谈' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- ================= 4. 学生：真视频摄像头实战面试 ================= -->
    <div v-else class="role-box">
      <!-- 准备接通卡片 -->
      <div v-if="!isInterviewing" class="student-center">
        <el-card shadow="hover" class="student-card">
          <h2>🎯 AI 全真模拟视频面试 (学生实战)</h2>
          <p class="desc">点击下方按钮接通面试，系统将启动高清摄像头与麦克风，由 AI 面试官实时提问并生成诊断报告</p>
          <el-button type="primary" size="large" @click="startInterview">接通面试 (开启音视频通话)</el-button>
        </el-card>
      </div>

      <!-- 正在视频通话实战界面 -->
      <div v-else class="video-room">
        <!-- 考生全屏主画面 -->
        <video ref="videoRef" autoplay playsinline muted class="camera-stream"></video>

        <!-- 右上角：AI 面试官画中画浮窗 -->
        <div class="ai-pip-box">
          <div class="ai-avatar">🤖</div>
          <div class="ai-info">
            <div class="ai-name">AI 智能面试官</div>
            <div class="ai-status">
              <span class="dot"></span> 正在提问 / 实时评估中
            </div>
          </div>
        </div>

        <!-- 顶部面试状态条 -->
        <div class="room-header">
          <el-tag type="danger" effect="dark" round>🔴 录制中</el-tag>
          <span class="room-title">第 {{ currentQuestionIndex + 1 }} / {{ questionList.length }} 题：{{ currentQuestion }}</span>
          <el-tag type="warning" effect="dark">作答倒计时: {{ countdown }}s</el-tag>
        </div>

        <!-- 底部字幕与控制条 -->
        <div class="room-footer">
          <div class="subtitle-box">
            <div class="sub-label">【AI 提问】</div>
            <div class="sub-text">{{ currentQuestion }}</div>
          </div>
          <div class="ctrl-btns">
            <el-button type="primary" @click="nextQuestion">
              {{ currentQuestionIndex < questionList.length - 1 ? '回答完毕 (下一题)' : '完成面试提交报告' }}
            </el-button>
            <el-button type="danger" @click="stopInterview">结束并退出面试</el-button>
          </div>
        </div>
      </div>

      <!-- AI 五维评分报告看板（新契约：roundScore / logicScore / completenessScore / expressionScore / realtimeFeedback） -->
      <el-dialog v-model="reportVisible" title="AI 模拟面试评估报告" width="620px" :close-on-click-modal="false">
        <div class="report-grid">
          <div class="score-card main">
            <div class="score-num">{{ report.roundScore }}</div>
            <div class="score-label">综合得分</div>
          </div>
          <div class="score-card">
            <div class="score-num">{{ report.logicScore }}</div>
            <div class="score-label">逻辑思维</div>
          </div>
          <div class="score-card">
            <div class="score-num">{{ report.completenessScore }}</div>
            <div class="score-label">作答完整度</div>
          </div>
          <div class="score-card">
            <div class="score-num">{{ report.expressionScore }}</div>
            <div class="score-label">语言表达</div>
          </div>
        </div>
        <div class="feedback-box">
          <div class="feedback-title">AI 详细评语</div>
          <div class="feedback-text">{{ report.realtimeFeedback }}</div>
        </div>
        <template #footer>
          <el-button type="primary" @click="reportVisible = false">完成并退出</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { finishInterview } from '@/api/interview'
import type { InterviewRecord } from '@/api/types'

const role = ref(localStorage.getItem('role') || 'student')

// 1. 管理员数据
const adminMajorStats = ref([
  { major: '计算机科学与技术', counselor: '王老师', total: 120, rate: 91, avgScore: 78.5, warnCount: 6, taskRate: 83 },
  { major: '大数据科学与技术', counselor: '赵老师', total: 85, rate: 64, avgScore: 68.4, warnCount: 14, taskRate: 42 }
])
const sendSupervisionOrder = () => ElMessage.warning('已向参训率落后的辅导员（赵老师）下达《重点就业帮扶督办单》！')

// 2. HR 数据
const hrCandidateList = ref([
  { name: '陈同学', school: '计科 / 本科', jobTitle: '前端实习生', aiScore: 88, summary: 'Vue3 与工程化熟练，STAR 逻辑清晰，推荐复试。', status: 'pending' },
  { name: '刘同学', school: '信管 / 本科', jobTitle: '产品助理', aiScore: 56, summary: '作答多次严重停顿，缺乏项目实战沉淀，匹配度较低。', status: 'pending' }
])
const previewVideo = (row: any) => ElMessage.info(`正在加载 ${row.name} 的面试回答高光切片视频与逐字稿...`)
const passCandidate = (row: any) => { row.status = 'passed'; ElMessage.success(`已向 ${row.name} 发送技术复试通知！`) }
const rejectCandidate = (row: any) => { row.status = 'rejected'; ElMessage.info(`已淘汰该候选人并归档至人才库`) }

// 3. 辅导员数据
const counselorStudents = ref([
  { name: '张同学', studentId: '2021030101', targetRole: '前端工程师', score: 54, weakness: '技术陈述无条理、语速偏快', talked: false },
  { name: '李同学', studentId: '2021030102', targetRole: 'Java开发', score: 58, weakness: 'STAR 原则缺失、量化数据少', talked: true }
])
const remindStudents = () => ElMessage.success('已给未模考同学推送督导通知！')
const exportLedger = () => ElMessage.success('就业帮扶台账 Excel 导出成功！')
const talkStudent = (row: any) => { row.talked = true; ElMessage.success(`已发起对 ${row.name} 的帮扶约谈并计入台账`) }

// ================= 4. 学生实战视频面试核心逻辑 =================
const isInterviewing = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
let mediaStream: MediaStream | null = null

// 题库与倒计时
const questionList = ref([
  '请简要用 1 分钟做个自我介绍，并重点说明你最熟悉的前端技术栈与亮点。',
  '在你的项目经历中，遇到的最大技术难题是什么？你是如何定位并解决的？',
  '谈谈你对 Vue3 响应式原理与组合式 API（Composition API）设计思想的理解。'
])
const currentQuestionIndex = ref(0)
const currentQuestion = ref(questionList.value[0])
const countdown = ref(60)
let timer: any = null

// 语音播报方法 (Web Speech API)
const speakQuestion = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1.0
    window.speechSynthesis.speak(utterance)
  }
}

// 开启面试与摄像头
const startInterview = async () => {
  try {
    isInterviewing.value = true
    await nextTick()

    // 1. 请求音视频权限
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: true
    })

    // 2. 绑定到 video 标签播放画面
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play()
    }

    ElMessage.success('摄像头与麦克风接通成功，面试正式开始！')

    // 3. 开始第一题与倒计时
    currentQuestionIndex.value = 0
    currentQuestion.value = questionList.value[0]
    countdown.value = 60
    speakQuestion(currentQuestion.value)

    clearInterval(timer)
    timer = setInterval(() => {
      if (countdown.value > 0) {
        countdown.value--
      } else {
        nextQuestion()
      }
    }, 1000)

  } catch (err: any) {
    console.error('获取摄像头失败:', err)
    isInterviewing.value = false
    if (err.name === 'NotAllowedError') {
      ElMessage.error('请在浏览器地址栏允许摄像头和麦克风权限！')
    } else if (err.name === 'NotFoundError') {
      ElMessage.error('未检测到可用的摄像头或麦克风硬件设备！')
    } else {
      ElMessage.error('接通失败: ' + err.message)
    }
  }
}

// 下一题
const nextQuestion = () => {
  if (currentQuestionIndex.value < questionList.value.length - 1) {
    currentQuestionIndex.value++
    currentQuestion.value = questionList.value[currentQuestionIndex.value]
    countdown.value = 60
    speakQuestion(currentQuestion.value)
    ElMessage.info(`进入第 ${currentQuestionIndex.value + 1} 题`)
  } else {
    // 面试完毕，提交并展示五维评分报告
    finishReport()
  }
}

// ================= AI 五维评分报告（新契约） =================
const reportVisible = ref(false)
const report = ref<InterviewRecord>({
  logicScore: 0,
  completenessScore: 0,
  expressionScore: 0,
  roundScore: 0,
  realtimeFeedback: ''
})

const finishReport = async () => {
  stopInterview()
  try {
    // 后端返回五维数据：roundScore / logicScore / completenessScore / expressionScore / realtimeFeedback
    report.value = await finishInterview()
  } catch {
    // 后端暂不可用时降级为本地模拟评分，保证面试流程可走通（拦截器已弹网络错误提示）
    const rand = () => Math.floor(70 + Math.random() * 28)
    report.value = {
      logicScore: rand(),
      completenessScore: rand(),
      expressionScore: rand(),
      roundScore: rand(),
      realtimeFeedback:
        '整体作答较为流畅，逻辑框架基本清晰，建议结合 STAR 法则补充量化成果，并注意控制语速与停顿。（本地模拟数据）'
    }
  }
  reportVisible.value = true
}

// 退出并关闭摄像头硬件
const stopInterview = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  if (timer) clearInterval(timer)
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  isInterviewing.value = false
}

// 组件卸载时释放硬件
onBeforeUnmount(() => {
  stopInterview()
})
</script>

<style scoped>
.interview-container { padding: 20px; }
.header-flex { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-size: 16px; font-weight: bold; }
.sub-tip { font-size: 12px; color: #909399; margin-left: 10px; }
.text-danger { color: #f56c6c; }
.font-bold { font-weight: bold; }
.student-center { display: flex; justify-content: center; align-items: center; min-height: 480px; }
.student-card { text-align: center; padding: 40px; max-width: 600px; }
.desc { color: #909399; margin: 16px 0 24px; line-height: 1.6; }

/* 视频通话实战界面样式 */
.video-room {
  position: relative;
  width: 100%;
  height: calc(100vh - 160px);
  min-height: 540px;
  background-color: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.camera-stream {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* 镜像翻转，符合镜子自拍习惯 */
}

/* 右上角 AI 面试官画中画 */
.ai-pip-box {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 10;
}
.ai-avatar { font-size: 32px; }
.ai-name { color: #fff; font-size: 14px; font-weight: bold; }
.ai-status { color: #67c23a; font-size: 12px; display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; background-color: #67c23a; border-radius: 50%; display: inline-block; }

/* 顶部状态栏 */
.room-header {
  position: relative;
  z-index: 10;
  padding: 16px 20px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
}
.room-title { font-size: 15px; font-weight: 500; }

/* 底部字幕与操作条 */
.room-footer {
  position: relative;
  z-index: 10;
  padding: 20px;
  background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.subtitle-box {
  background: rgba(0, 0, 0, 0.65);
  padding: 10px 20px;
  border-radius: 8px;
  color: #fff;
  text-align: center;
  max-width: 80%;
}
.sub-label { color: #409eff; font-size: 12px; margin-bottom: 4px; }
.sub-text { font-size: 15px; font-weight: bold; }
.ctrl-btns { display: flex; gap: 20px; }

/* AI 五维评分报告看板 */
.report-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.score-card { padding: 18px 8px; text-align: center; background: #f5f7fa; border-radius: 10px; }
.score-card.main { background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); color: #fff; }
.score-num { font-size: 34px; font-weight: 700; line-height: 1.2; }
.score-label { margin-top: 6px; font-size: 13px; color: #909399; }
.score-card.main .score-label { color: rgba(255, 255, 255, 0.85); }
.feedback-box { margin-top: 16px; padding: 14px 16px; background: #f5f7fa; border-radius: 10px; }
.feedback-title { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.feedback-text { font-size: 13px; line-height: 1.8; color: #606266; }
</style>
