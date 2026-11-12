<template>
  <div class="practice-page">
    <div class="page-header">
      <div>
        <h2 class="title">实习实践协同管理</h2>
        <p class="subtitle">基于 RBAC 的多级审批流、周报批阅与校企三方综合评价体系</p>
      </div>
      <div class="header-actions">
        <!-- 学生才显示申报按钮 -->
        <el-button v-if="currentRole === 'student'" v-permission="'internship:apply:submit'" type="primary" @click="applyDialogVisible = true">
          <el-icon><Plus /></el-icon> 提交新的实习申请
        </el-button>
        <!-- 角色标签 -->
        <el-tag size="large" effect="plain">当前视角：{{ roleNames[currentRole] }}</el-tag>
      </div>
    </div>

    <!-- 顶部标签页切换 -->
    <el-tabs v-model="activeTab" class="practice-tabs">
      <el-tab-pane label="实习申请与审批流" name="applyFlow">
        <!-- 辅导员/管理员视角：审批大厅 -->
        <div v-if="currentRole === 'counselor' || currentRole === 'admin'" class="approval-panel">
          <el-card shadow="never">
            <template #header>
              <div class="panel-header">
                <span>学生实习多级审批工作台</span>
                <el-tag type="warning">待您处理：{{ pendingList.length }} 笔</el-tag>
              </div>
            </template>
            <el-table :data="pendingList" stripe>
              <el-table-column prop="studentName" label="学生姓名" width="110" />
              <el-table-column prop="studentId" label="学号" width="110" />
              <el-table-column prop="company" label="实习单位" min-width="150" />
              <el-table-column prop="position" label="岗位" width="130" />
              <el-table-column prop="duration" label="实习起止周期" min-width="180" />
              <el-table-column prop="currentNode" label="当前审批节点" width="140">
                <template #default="{ row }">
                  <el-tag>{{ row.currentNode }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="多级审批操作" width="220" fixed="right">
                <template #default="{ row }">
                  <el-button v-permission="'internship:apply:audit'" type="success" size="small" @click="handlePassNode(row)">通过节点</el-button>
                  <el-button v-permission="'internship:apply:audit'" type="danger" size="small" plain @click="handleRejectNode(row)">节点回退</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>

        <!-- 学生视角：我的申报与进度轴 -->
        <div v-else-if="currentRole === 'student'" class="student-apply-panel">
          <el-card shadow="never">
            <template #header>
              <div class="panel-header">
                <span>我的实习备案与审批跟踪</span>
                <el-tag type="primary">进行中</el-tag>
              </div>
            </template>
            <div class="apply-info">
              <el-descriptions title="当前在岗实习档案" :column="3" border>
                <el-descriptions-item label="实习企业">杭州智能信息技术有限公司</el-descriptions-item>
                <el-descriptions-item label="实习岗位">前端开发实习生</el-descriptions-item>
                <el-descriptions-item label="企业导师">陈经理 (13800138000)</el-descriptions-item>
                <el-descriptions-item label="实习周期">2026-07-01 ~ 2026-11-30</el-descriptions-item>
                <el-descriptions-item label="薪资补贴">220元/天</el-descriptions-item>
                <el-descriptions-item label="当前状态"><el-tag type="warning">二级院系审核中</el-tag></el-descriptions-item>
              </el-descriptions>

              <h4 style="margin: 24px 0 16px;">审批节点流转记录（可节点回退）</h4>
              <el-steps :active="2" finish-status="success" align-center>
                <el-step title="提交申请" description="学生本人提交 2026-07-01" />
                <el-step title="辅导员一审" description="已通过 (王辅导员)" />
                <el-step title="院系领导复审" description="审核中..." />
                <el-step title="教务处备案归档" description="待流转" />
              </el-steps>
            </div>
          </el-card>
        </div>

        <!-- 企业 HR 视角：企业接收实习生名单 -->
        <div v-else class="hr-panel">
          <el-card shadow="never">
            <template #header>
              <span>本公司在岗实习生管理</span>
            </template>
            <el-table :data="hrInternList" stripe>
              <el-table-column prop="name" label="实习生姓名" width="120" />
              <el-table-column prop="school" label="所在院系" min-width="160" />
              <el-table-column prop="post" label="岗位" width="140" />
              <el-table-column prop="startDate" label="入职日期" width="130" />
              <el-table-column prop="status" label="在职状态" width="110">
                <template #default>
                  <el-tag type="success">正常在岗</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 第二标签页：实习周报日志 -->
      <el-tab-pane label="实习日志与周报批阅" name="logReport">
        <el-card shadow="never">
          <template #header>
            <div class="panel-header">
              <span>实习日志互动记录</span>
              <el-button v-if="currentRole === 'student'" type="primary" size="small" @click="logDialogVisible = true">
                填写本周实习日志
              </el-button>
            </div>
          </template>

          <div v-for="log in logList" :key="log.id" class="log-card">
            <div class="log-top">
              <span class="log-week">{{ log.weekTitle }}（{{ log.author }}）</span>
              <span class="log-date">{{ log.date }}</span>
            </div>
            <div class="log-body">{{ log.content }}</div>

            <!-- 辅导员批阅留言区域 -->
            <div class="log-reply">
              <div class="reply-header">
                <span class="reply-title">辅导员评阅留言：</span>
                <span v-if="log.replyDate" class="reply-date">{{ log.replyDate }}</span>
              </div>
              <div v-if="log.reply" class="reply-content">{{ log.reply }}</div>
              <div v-else class="no-reply">
                <span v-if="currentRole !== 'counselor'">暂无批阅留言</span>
                <div v-else class="reply-box">
                  <el-input v-model="log.draftReply" placeholder="请输入辅导员指导留言..." size="small" />
                  <el-button type="primary" size="small" @click="submitReply(log)">留言</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 第三标签页：三方综合评分汇总 -->
      <el-tab-pane label="校企三方综合评价汇总" name="evaluation">
        <el-card shadow="never">
          <template #header>
            <div class="panel-header">
              <span>实习综合评分汇总（学生自评 20% + 企业评价 50% + 学院评定 30%）</span>
              <el-button v-if="currentRole === 'hr'" v-permission="'internship:evaluate:submit'" type="warning" size="small" @click="scoreDialogVisible = true">
                企业导师评分入口
              </el-button>
            </div>
          </template>
          <el-table :data="evaluationData" stripe>
            <el-table-column prop="studentName" label="学生姓名" width="110" />
            <el-table-column prop="selfScore" label="学生自评(20%)" width="130">
              <template #default="{ row }">{{ row.selfScore || '-' }} 分</template>
            </el-table-column>
            <el-table-column prop="companyScore" label="企业导师评定(50%)" width="160">
              <template #default="{ row }">
                <el-tag :type="row.companyScore ? 'success' : 'info'">{{ row.companyScore ? row.companyScore + ' 分' : '待企业评定' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="schoolScore" label="校方评定(30%)" width="140">
              <template #default="{ row }">{{ row.schoolScore || '-' }} 分</template>
            </el-table-column>
            <el-table-column prop="totalScore" label="三方总评" min-width="120">
              <template #default="{ row }">
                <span style="font-weight: 700; color: #409EFF; font-size: 16px;">{{ row.totalScore ? row.totalScore + ' 分' : '核算中' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 弹窗1：学生申报弹窗 -->
    <el-dialog v-model="applyDialogVisible" title="发起实习申报" width="520px">
      <el-form label-width="90px">
        <el-form-item label="企业名称"><el-input placeholder="如：阿里巴巴网络技术有限公司" /></el-form-item>
        <el-form-item label="申报岗位"><el-input placeholder="如：Java 后端助理" /></el-form-item>
        <el-form-item label="企业导师"><el-input placeholder="姓名及联系方式" /></el-form-item>
        <el-form-item label="实习周期"><el-date-picker type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button v-permission="'internship:apply:submit'" @click="applyDialogVisible = false">取消</el-button>
        <el-button v-permission="'internship:apply:submit'" type="primary" @click="handleApplySubmit">确认提交审批</el-button>
      </template>
    </el-dialog>

    <!-- 弹窗2：写周报弹窗 -->
    <el-dialog v-model="logDialogVisible" title="填写实习周报日志" width="500px">
      <el-form label-width="80px">
        <el-form-item label="周次"><el-input placeholder="例如：第 4 周实习日志" /></el-form-item>
        <el-form-item label="日志正文"><el-input type="textarea" :rows="4" placeholder="总结本周工作产出、技术难点及收获..." /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="logDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleLogSubmit">提交周报</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const currentRole = ref(localStorage.getItem('role') || 'student')
const activeTab = ref('applyFlow')
const applyDialogVisible = ref(false)
const logDialogVisible = ref(false)
const scoreDialogVisible = ref(false)

const roleNames: Record<string, string> = {
  student: '学生 (申报与写周报)',
  counselor: '辅导员 (多级审批与批阅)',
  hr: '企业导师 (评定与查看)',
  admin: '院系管理员 (全院监管)'
}

// 审批数据
const pendingList = ref([
  { id: 1, studentName: '李梦琪', studentId: '20220142', company: '上海互联新程信息技术', position: '前端开发', duration: '2026-07-01 ~ 2026-11-30', currentNode: '辅导员一审' },
  { id: 2, studentName: '王浩宇', studentId: '20220215', company: '苏州汇通数据中心', position: '网络安全助理', duration: '2026-08-01 ~ 2026-12-31', currentNode: '辅导员一审' }
])

const handlePassNode = (row: any) => {
  ElMessage.success(`【${row.studentName}】的申请已通过当前节点，进入下一级院系审批`)
  pendingList.value = pendingList.value.filter(item => item.id !== row.id)
}

const handleRejectNode = (row: any) => {
  ElMessageBox.prompt('请输入回退原因：', '审批节点回退', {
    confirmButtonText: '确定回退',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '请填写原因'
  }).then(({ value }) => {
    ElMessage.warning(`已将申请回退至上一节点，原因：${value}`)
    pendingList.value = pendingList.value.filter(item => item.id !== row.id)
  }).catch(() => {})
}

// 周报日志数据
const logList = ref([
  { id: 1, weekTitle: '第 3 周实习周报', author: '学生本人', date: '2026-09-22', content: '本周完成了登录模块与 RBAC 权限路由的代码编写，学习了 Vue 3 组合式 API 及 Pinia 的实际用法。', reply: '工作很有成效，注意和后端同学对齐接口契约。', replyDate: '2026-09-23', draftReply: '' },
  { id: 2, weekTitle: '第 4 周实习周报', author: '学生本人', date: '2026-09-29', content: '协助组内老师调试 Spring Boot 接口，掌握了 SQL Server 的常见调优和 Navicat 脚本执行规范。', reply: '', replyDate: '', draftReply: '' }
])

const submitReply = (log: any) => {
  if (!log.draftReply) return
  log.reply = log.draftReply
  log.replyDate = '刚刚'
  log.draftReply = ''
  ElMessage.success('已成功发表辅导员批阅留言！')
}

const handleApplySubmit = () => {
  ElMessage.success('实习申请已成功提交，等待辅导员第一级审核')
  applyDialogVisible.value = false
}

const handleLogSubmit = () => {
  ElMessage.success('本周实习日志已提交！')
  logDialogVisible.value = false
}

// 企业实习生与评分
const hrInternList = ref([
  { name: '张子轩', school: '软件工程学院', post: 'Java后端实习生', startDate: '2026-07-01' },
  { name: '林依晨', school: '计算机科学学院', post: 'Web前端实习生', startDate: '2026-07-15' }
])

const evaluationData = ref([
  { studentName: '张子轩', selfScore: 90, companyScore: 92, schoolScore: 88, totalScore: 90.4 },
  { studentName: '李梦琪', selfScore: 88, companyScore: null, schoolScore: 85, totalScore: null }
])
</script>

<style scoped>
.practice-page { padding: 8px 4px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { margin: 0 0 6px; font-size: 22px; color: #2c3e50; }
.subtitle { margin: 0; font-size: 13px; color: #909399; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
.log-card { border: 1px solid #ebeef5; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #fafbfc; }
.log-top { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 600; color: #2c3e50; }
.log-date { font-size: 12px; color: #909399; font-weight: normal; }
.log-body { font-size: 14px; color: #606266; line-height: 1.6; margin-bottom: 12px; }
.log-reply { background: #fff; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #409EFF; font-size: 13px; }
.reply-header { display: flex; justify-content: space-between; margin-bottom: 4px; color: #409EFF; font-weight: 600; }
.reply-date { font-size: 12px; color: #909399; font-weight: normal; }
.reply-box { display: flex; gap: 8px; margin-top: 6px; }
</style>
