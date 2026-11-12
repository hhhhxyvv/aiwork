<template>
  <div class="dashboard-page">
    <!-- 顶部欢迎栏与身份标识 -->
    <div class="welcome-banner">
      <div class="user-info">
        <el-avatar :size="54" class="role-avatar">{{ roleText.charAt(0) }}</el-avatar>
        <div class="text">
          <h2>欢迎回来，{{ username }}！</h2>
          <p class="role-desc">当前工作台角色：<el-tag :type="roleTagType" effect="dark">{{ roleText }}</el-tag></p>
        </div>
      </div>
      <div class="quick-status">
        <span class="date">{{ currentDate }}</span>
      </div>
    </div>

    <!-- 1. 学生视角工作台 -->
    <div v-if="currentRole === 'student'" class="role-section">
      <!-- 核心指标 -->
      <el-row :gutter="20" class="metric-row">
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>简历综合评分</span>
              <el-tag type="success">AI 评估</el-tag>
            </div>
            <div class="metric-value">88<span class="unit">分</span></div>
            <el-progress :percentage="88" status="success" :show-text="false" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>已投递岗位</span>
              <el-tag type="primary">求职跟踪</el-tag>
            </div>
            <div class="metric-value">6<span class="unit">家</span></div>
            <div class="metric-hint">2 家已通过初筛，1 场待面试</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>AI 面试模拟</span>
              <el-tag type="warning">模考练兵</el-tag>
            </div>
            <div class="metric-value">4<span class="unit">次</span></div>
            <div class="metric-hint">最近一次：后端开发岗 (85分)</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>实习申报状态</span>
              <el-tag type="info">审批中</el-tag>
            </div>
            <div class="metric-value status-text">二级院系审批中</div>
            <div class="metric-hint">周报已提交 3/8 篇</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 投递进度跟踪表格 -->
      <el-card shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span>我的求职投递动态追踪</span>
            <el-button type="primary" link @click="$router.push('/job')">去投递更多</el-button>
          </div>
        </template>
        <el-table :data="studentApplications" stripe>
          <el-table-column prop="jobTitle" label="应聘岗位" min-width="140" />
          <el-table-column prop="company" label="企业名称" min-width="160" />
          <el-table-column prop="salary" label="薪资待遇" width="120" />
          <el-table-column prop="applyDate" label="投递日期" width="130" />
          <el-table-column prop="matchScore" label="匹配度" width="100">
            <template #default="{ row }">
              <el-tag type="success">{{ row.matchScore }}%</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="当前进度" width="140">
            <template #default="{ row }">
              <el-tag :type="statusTagMap[row.status]">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 2. 辅导员视角工作台 -->
    <div v-else-if="currentRole === 'counselor'" class="role-section">
      <el-row :gutter="20" class="metric-row">
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card alert-card">
            <div class="metric-header">
              <span>待处理实习审批</span>
              <el-tag type="danger">紧急</el-tag>
            </div>
            <div class="metric-value">5<span class="unit">份</span></div>
            <div class="metric-hint">今日新增 2 份待审批申报</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>所带班级就业率</span>
              <el-tag type="success">实时</el-tag>
            </div>
            <div class="metric-value">76.4<span class="unit">%</span></div>
            <el-progress :percentage="76.4" :show-text="false" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>实习周报未交</span>
              <el-tag type="warning">需提醒</el-tag>
            </div>
            <div class="metric-value">7<span class="unit">人</span></div>
            <div class="metric-hint">第 4 周实习日志缺交</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>已达标三方评定</span>
              <el-tag type="info">归档</el-tag>
            </div>
            <div class="metric-value">38<span class="unit">人</span></div>
            <div class="metric-hint">全班共 45 人</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 辅导员待审批列表快捷操作 -->
      <el-card shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span>待审批学生实习申请（辅导员一审）</span>
            <el-button type="primary" link @click="$router.push('/practice')">进入实习审批大厅</el-button>
          </div>
        </template>
        <el-table :data="counselorPendingList">
          <el-table-column prop="studentName" label="学生姓名" width="110" />
          <el-table-column prop="studentId" label="学号" width="120" />
          <el-table-column prop="company" label="实习企业" min-width="160" />
          <el-table-column prop="post" label="申报岗位" min-width="140" />
          <el-table-column prop="submitTime" label="提交时间" width="130" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="handlePass(row)">通过</el-button>
              <el-button type="danger" size="small" plain @click="handleReject(row)">退回节点</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 3. 企业 HR 视角工作台 -->
    <div v-else-if="currentRole === 'hr'" class="role-section">
      <el-row :gutter="20" class="metric-row">
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>在招校招职位</span>
              <el-tag type="primary">招聘中</el-tag>
            </div>
            <div class="metric-value">4<span class="unit">个</span></div>
            <div class="metric-hint">Java工程师、前端、产品等</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card alert-card">
            <div class="metric-header">
              <span>待初筛简历</span>
              <el-tag type="danger">待处理</el-tag>
            </div>
            <div class="metric-value">19<span class="unit">份</span></div>
            <div class="metric-hint">今日新增 8 份新投递</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>待录入实习评价</span>
              <el-tag type="warning">企业导师</el-tag>
            </div>
            <div class="metric-value">3<span class="unit">人</span></div>
            <div class="metric-hint">已完成实习期学生评价</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>意向 Offer 发放</span>
              <el-tag type="success">已达成</el-tag>
            </div>
            <div class="metric-value">5<span class="unit">人</span></div>
            <div class="metric-hint">已有 3 人签约回执</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- HR 收到的学生投递记录 -->
      <el-card shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span>最新应聘候选人</span>
            <el-button type="primary" link @click="$router.push('/job')">发布新校招岗位</el-button>
          </div>
        </template>
        <el-table :data="hrCandidateList">
          <el-table-column prop="candidateName" label="候选人" width="100" />
          <el-table-column prop="major" label="专业背景" width="140" />
          <el-table-column prop="targetJob" label="应聘岗位" min-width="140" />
          <el-table-column prop="aiScore" label="AI 匹配诊断分" width="130">
            <template #default="{ row }">
              <el-tag type="success">{{ row.aiScore }} 分</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="筛选状态" width="130">
            <template #default="{ row }">
              <el-tag :type="row.status === '待初筛' ? 'warning' : 'primary'">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="快捷操作" width="180" fixed="right">
            <template #default>
              <el-button type="primary" size="small">邀约面试</el-button>
              <el-button type="info" size="small" plain>查看简历</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 4. 院系管理员视角工作台 -->
    <div v-else class="role-section">
      <el-row v-permission="'stat:dashboard:view'" :gutter="20" class="metric-row">
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>全院2026届就业率</span>
              <el-tag type="success">核心考核</el-tag>
            </div>
            <div class="metric-value">{{ stats.employmentRate }}<span class="unit">%</span></div>
            <el-progress :percentage="stats.employmentRate" :show-text="false" status="success" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>入驻合作企业</span>
              <el-tag type="primary">校企合作</el-tag>
            </div>
            <div class="metric-value">128<span class="unit">家</span></div>
            <div class="metric-hint">提供实习/就业岗位 1,420 个</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>政策智能体问答量</span>
              <el-tag type="info">RAG 知识库</el-tag>
            </div>
            <div class="metric-value">3,540<span class="unit">次</span></div>
            <div class="metric-hint">政策库条目 52 条</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-header">
              <span>实习三方协议签署</span>
              <el-tag type="warning">归档进度</el-tag>
            </div>
            <div class="metric-value">91.5<span class="unit">%</span></div>
            <el-progress :percentage="91.5" :show-text="false" />
          </el-card>
        </el-col>
      </el-row>

      <!-- 就业数据大屏统计（真实接口 GET /api/stat/dashboard：就业率 / 行业分布 / 薪资聚合） -->
      <el-card v-permission="'stat:dashboard:view'" shadow="never" class="content-card stats-card">
        <template #header>
          <div class="card-header">
            <span>全院就业数据统计</span>
            <el-tag type="success">实时聚合</el-tag>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col :span="7">
            <div class="stat-block">
              <div class="stat-title">毕业生去向</div>
              <div class="stat-line">毕业生 <b>{{ stats.totalGraduates }}</b> 人 · 已落实 <b>{{ stats.employedCount }}</b> 人</div>
              <el-progress :percentage="stats.employmentRate" status="success" />
            </div>
          </el-col>
          <el-col :span="9">
            <div class="stat-block">
              <div class="stat-title">行业分布</div>
              <div class="industry-tags">
                <el-tag v-for="item in stats.industryDistribution" :key="item.name" size="small" class="industry-tag">
                  {{ item.name }} · {{ item.value }} 人
                </el-tag>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-block">
              <div class="stat-title">薪资聚合（元/月）</div>
              <div class="salary-stats">
                <div class="salary-item">
                  <span class="num">{{ stats.salaryStats.avgSalary }}</span>
                  <span class="lbl">平均薪资</span>
                </div>
                <div class="salary-item">
                  <span class="num">{{ stats.salaryStats.maxSalary }}</span>
                  <span class="lbl">最高薪资</span>
                </div>
                <div class="salary-item">
                  <span class="num">{{ stats.salaryStats.minSalary }}</span>
                  <span class="lbl">最低薪资</span>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <el-card v-permission="'stat:dashboard:view'" shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span>各专业就业与实习达标进度监控</span>
            <el-tag type="primary">院系全局</el-tag>
          </div>
        </template>
        <el-table :data="adminMajorStats">
          <el-table-column prop="major" label="专业名称" min-width="150" />
          <el-table-column prop="totalStudents" label="毕业生人数" width="120" />
          <el-table-column prop="employedCount" label="已落实人数" width="120" />
          <el-table-column prop="rate" label="就业率" min-width="160">
            <template #default="{ row }">
              <el-progress :percentage="row.rate" :color="row.rate >= 80 ? '#67C23A' : '#E6A23C'" />
            </template>
          </el-table-column>
          <el-table-column prop="internshipDone" label="实习考核完成率" width="140">
            <template #default="{ row }">
              <span>{{ row.internshipDone }}%</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDashboardStats } from '@/api/stat'
import { hasPermission } from '@/utils/permission'
import type { DashboardStats } from '@/api/types'

const currentRole = ref(localStorage.getItem('role') || 'student')
const username = ref(localStorage.getItem('username') || '用户')

const roleConfig: Record<string, { text: string; tagType: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  student: { text: '在校学生', tagType: 'success' },
  counselor: { text: '毕业班辅导员', tagType: 'warning' },
  hr: { text: '企业招聘 HR', tagType: 'danger' },
  admin: { text: '院系管理员', tagType: 'info' }
}

const roleText = computed(() => roleConfig[currentRole.value]?.text || '用户')
const roleTagType = computed(() => roleConfig[currentRole.value]?.tagType || 'info')
const currentDate = computed(() => new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }))

const statusTagMap: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
  '初筛通过': 'success',
  '面试待安排': 'warning',
  '企业已查看': 'info',
  '已发意向书': 'danger'
}

// 1. 学生数据
const studentApplications = ref([
  { jobTitle: '前端开发工程师', company: '某某科技有限公司', salary: '8k-12k', applyDate: '2026-10-02', matchScore: 92, status: '面试待安排' },
  { jobTitle: 'Java 后端助理', company: '数智网络创新基地', salary: '9k-13k', applyDate: '2026-10-05', matchScore: 86, status: '初筛通过' },
  { jobTitle: 'AI 交互测试实习生', company: '未来科技创新工场', salary: '200/天', applyDate: '2026-10-06', matchScore: 78, status: '企业已查看' }
])

// 2. 辅导员数据
const counselorPendingList = ref([
  { id: 1, studentName: '张子轩', studentId: '20220108', company: '杭州知行科技有限公司', post: '软件测试实习生', submitTime: '2026-10-08 09:20' },
  { id: 2, studentName: '李梦琪', studentId: '20220142', company: '上海互联新程信息技术', post: '前端开发助理', submitTime: '2026-10-08 10:15' },
  { id: 3, studentName: '王浩宇', studentId: '20220215', company: '苏州汇通数据中心', post: '运维工程师', submitTime: '2026-10-07 16:40' }
])

const handlePass = (row: any) => {
  ElMessage.success(`已通过学生【${row.studentName}】的实习申报，流转至下一审批节点`)
  counselorPendingList.value = counselorPendingList.value.filter(item => item.id !== row.id)
}

const handleReject = (row: any) => {
  ElMessageBox.prompt('请输入退回原因：', '退回实习申请', {
    confirmButtonText: '确定退回',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '原因不能为空'
  }).then(({ value }) => {
    ElMessage.warning(`已将【${row.studentName}】的申请退回，驳回理由：${value}`)
    counselorPendingList.value = counselorPendingList.value.filter(item => item.id !== row.id)
  }).catch(() => {})
}

// 3. 企业 HR 数据
const hrCandidateList = ref([
  { candidateName: '林依晨', major: '软件工程', targetJob: 'Web前端开发工程师', aiScore: 93, status: '待初筛' },
  { candidateName: '陈伟霆', major: '计算机科学与技术', targetJob: 'Java开发工程师', aiScore: 89, status: '待初筛' },
  { candidateName: '赵若楠', major: '数据科学与大数据', targetJob: '数据分析助理', aiScore: 85, status: '已进入面试' }
])

// 4. 管理员数据
const adminMajorStats = ref([
  { major: '计算机科学与技术', totalStudents: 120, employedCount: 104, rate: 86.6, internshipDone: 95 },
  { major: '软件工程', totalStudents: 110, employedCount: 96, rate: 87.2, internshipDone: 98 },
  { major: '人工智能', totalStudents: 65, employedCount: 56, rate: 86.1, internshipDone: 92 },
  { major: '信息安全', totalStudents: 60, employedCount: 45, rate: 75.0, internshipDone: 88 }
])

// ================= 就业数据大屏统计（GET /api/stat/dashboard） =================
// 默认值即本地兜底数据，接口成功后自动替换为真实统计
const stats = ref<DashboardStats>({
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
  salaryStats: { avgSalary: 8600, maxSalary: 25000, minSalary: 4500 }
})

onMounted(async () => {
  // 大屏接口要求 stat:dashboard:view 权限（仅管理员/辅导员授予），
  // 学生等其他角色无权限，直接使用本地兜底数据，避免无谓的 403 请求
  if (!hasPermission('stat:dashboard:view')) return
  try {
    stats.value = await getDashboardStats()
  } catch {
    // 请求拦截器已统一弹错，此处保留本地兜底数据，页面不空白
  }
})
</script>

<style scoped>
.dashboard-page {
  padding: 8px 4px;
}
.welcome-banner {
  background: linear-gradient(135deg, #ffffff 0%, #f4f7fb 100%);
  border-radius: 14px;
  padding: 22px 26px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid #ebeef5;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}
.role-avatar {
  background: linear-gradient(135deg, #74c0fc, #4dabf7);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
}
.user-info h2 {
  margin: 0 0 6px;
  font-size: 20px;
  color: #2c3e50;
}
.role-desc {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.date {
  font-size: 13px;
  color: #909399;
}
.metric-row {
  margin-bottom: 24px;
}
.metric-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
}
.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #606266;
}
.metric-value {
  font-size: 30px;
  font-weight: 700;
  color: #2c3e50;
  margin: 12px 0 8px;
}
.metric-value .unit {
  font-size: 14px;
  font-weight: normal;
  color: #909399;
  margin-left: 4px;
}
.status-text {
  font-size: 18px;
  color: #409EFF;
}
.metric-hint {
  font-size: 12px;
  color: #909399;
}
.content-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #2c3e50;
}
.stats-card {
  margin-bottom: 24px;
}
.stat-block {
  padding: 4px 2px;
}
.stat-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 10px;
}
.stat-line {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-line b {
  color: #2c3e50;
}
.industry-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.industry-tag {
  border-radius: 6px;
}
.salary-stats {
  display: flex;
  justify-content: space-between;
}
.salary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.salary-item .num {
  font-size: 22px;
  font-weight: 700;
  color: #2c3e50;
}
.salary-item .lbl {
  font-size: 12px;
  color: #909399;
}
</style>
