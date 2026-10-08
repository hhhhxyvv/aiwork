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
    <div v-else class="role-box student-center">
      <el-card shadow="hover" class="student-card">
        <h2>🎯 AI 全真模拟视频面试 (学生实战)</h2>
        <p class="desc">打开摄像头与麦克风，体验 AI 面试官语音发问与智能多维复盘评估</p>
        <el-button type="primary" size="large" @click="startInterview">接通面试 (开启音视频)</el-button>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

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

// 4. 学生数据
const startInterview = () => ElMessage.info('正在唤起摄像头与麦克风进入面试流程...')
</script>

<style scoped>
.interview-container { padding: 20px; }
.header-flex { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-size: 16px; font-weight: bold; }
.sub-tip { font-size: 12px; color: #909399; margin-left: 10px; }
.text-danger { color: #f56c6c; }
.font-bold { font-weight: bold; }
.student-center { display: flex; justify-content: center; align-items: center; min-height: 400px; }
.student-card { text-align: center; padding: 40px; }
.desc { color: #909399; margin: 16px 0 24px; }
</style>
