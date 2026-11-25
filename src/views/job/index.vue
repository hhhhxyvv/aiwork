<template>
  <div class="job-container">
    <el-alert title="学生岗位列表及投递已连接真实后端；本页审核、HR 发布及班级推送仍为本地演示。" type="info" :closable="false" />
    <!-- ================= 1. 院系管理员视角：入校企业准入与安全风控审核 ================= -->
    <div v-if="hasPermission('job:post:audit')" class="role-box">
      <el-row :gutter="16" class="stat-cards">
        <el-col :span="6">
          <el-card shadow="hover">
            <template #header><div class="card-title">待审核入校企业/岗位</div></template>
            <div class="stat-number text-danger">{{ adminAuditList.length }} <span class="unit">条</span></div>
            <div class="stat-desc">企业进校资质与职位合规审查</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <template #header><div class="card-title">校企合作企业库</div></template>
            <div class="stat-number text-primary">142 <span class="unit">家</span></div>
            <div class="stat-desc">含 18 家省级实践基地</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <template #header><div class="card-title">当前全院在招岗位</div></template>
            <div class="stat-number text-success">418 <span class="unit">个</span></div>
            <div class="stat-desc">供需比达 1:3.2</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <template #header><div class="card-title">AI 风控高危拦截</div></template>
            <div class="stat-number text-warning">3 <span class="unit">起</span></div>
            <div class="stat-desc">已成功阻断虚假招聘与培训贷</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="hover" class="mt-4">
        <template #header>
          <div class="header-flex">
            <div>
              <span class="section-title">企业入校招聘资质与岗位准入审核</span>
              <span class="sub-tip">依据教育部要求防范培训贷、虚假薪酬与就业歧视</span>
            </div>
          </div>
        </template>
        <el-table :data="adminAuditList" stripe style="width: 100%">
          <el-table-column prop="company" label="申请企业" width="180" />
          <el-table-column prop="jobTitle" label="招聘职位" width="150" />
          <el-table-column label="标注薪资" width="170">
            <template #default="{ row }">{{ row.minSalary }} - {{ row.maxSalary }} 元/月</template>
          </el-table-column>
          <el-table-column prop="aiRisk" label="AI 风控诊断结论" min-width="240">
            <template #default="{ row }">
              <el-tag :type="row.riskLevel === 'safe' ? 'success' : 'danger'">
                {{ row.aiRisk }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="applyDate" label="提交时间" width="120" align="center" />
          <el-table-column label="审核操作" width="180" fixed="right" align="center">
            <template #default="{ row }">
              <el-button v-permission="'job:post:audit'" link type="success" @click="handleAdminApprove(row)">批准入校</el-button>
              <el-button v-permission="'job:post:audit'" link type="danger" @click="handleAdminReject(row)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- ================= 2. 企业 HR 视角：校招岗位发布与管理 ================= -->
    <div v-if="hasAnyPermission(['job:post:publish','job:post:edit'])" class="role-box">
      <el-card shadow="hover">
        <div class="header-flex">
          <div>
            <span class="section-title">本企业在招校招与实习职位</span>
            <span class="sub-tip">发布新需求，查看各岗位投递与初筛进展</span>
          </div>
          <el-button v-permission="'job:post:publish'" type="primary" @click="publishVisible = true">+ 发布新校招岗位</el-button>
        </div>

        <el-table :data="hrJobList" stripe class="mt-4" style="width: 100%">
          <el-table-column prop="jobTitle" label="职位名称" min-width="150" />
          <el-table-column prop="department" label="所属部门" width="130" />
          <el-table-column label="薪资范围" width="170">
            <template #default="{ row }">{{ row.minSalary }} - {{ row.maxSalary }} 元/月</template>
          </el-table-column>
          <el-table-column prop="headcount" label="招聘人数" width="100" align="center" />
          <el-table-column prop="applyCount" label="已收到简历" width="110" align="center">
            <template #default="{ row }">
              <el-tag type="info">{{ row.applyCount }} 份</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="岗位状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">
                {{ row.status === 1 ? '招聘中' : '已暂停' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center">
            <template #default="{ row }">
              <el-button v-permission="'job:post:edit'" link :type="row.status === 1 ? 'warning' : 'success'" @click="toggleJobStatus(row)">
                {{ row.status === 1 ? '暂停' : '恢复' }}
              </el-button>
              <el-button v-permission="'job:post:edit'" link type="danger" @click="deleteJob(row)">下线</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 发布弹窗（入参对齐新契约：jobTitle / minSalary / maxSalary / status / requirements） -->
      <el-dialog v-model="publishVisible" title="发布新校招/实习岗位" width="520px">
        <el-form :model="jobForm" label-width="80px">
          <el-form-item label="职位名称"><el-input v-model="jobForm.jobTitle" placeholder="如：前端实习生" /></el-form-item>
          <el-form-item label="所属部门"><el-input v-model="jobForm.department" placeholder="如：技术中心" /></el-form-item>
          <el-form-item label="薪资范围">
            <div class="salary-range">
              <el-input-number v-model="jobForm.minSalary" :min="0" :max="100000" :step="500" controls-position="right" />
              <span class="salary-sep">-</span>
              <el-input-number v-model="jobForm.maxSalary" :min="0" :max="100000" :step="500" controls-position="right" />
              <span class="salary-unit">元/月</span>
            </div>
          </el-form-item>
          <el-form-item label="招聘人数"><el-input-number v-model="jobForm.headcount" :min="1" :max="50" /></el-form-item>
          <el-form-item label="岗位要求">
            <el-input v-model="jobForm.requirements" type="textarea" :rows="3" placeholder="如：熟悉 Vue3 / TypeScript，有项目经验优先" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="publishVisible = false">取消</el-button>
          <el-button v-permission="'job:post:publish'" type="primary" @click="submitJobPublish">提交审核并发布</el-button>
        </template>
      </el-dialog>
    </div>

    <!-- ================= 3. 辅导员/学生 视角：岗位大厅与内推 ================= -->
    <div v-if="hasAnyPermission(['job:post:view','job:apply:submit','job:recommend:push'])" class="role-box">
      <el-card shadow="hover">
        <div class="header-flex">
          <span class="section-title">校园招聘与实习岗位大厅</span>
          <el-tag v-if="hasPermission('job:recommend:push')" type="warning">辅导员模式：可一键推送至班级群</el-tag>
        </div>
        <el-alert v-if="jobsError" :title="jobsError" type="error" :closable="false" /><el-button link @click="loadJobs">刷新岗位</el-button>
        <el-table v-loading="jobsLoading" :data="publicJobList" stripe class="mt-4" style="width: 100%">
          <el-table-column prop="company" label="企业名称" width="180" />
          <el-table-column prop="jobTitle" label="岗位名称" min-width="160" />
          <el-table-column label="薪资" width="170">
            <template #default="{ row }">{{ row.minSalary }} - {{ row.maxSalary }} 元/月</template>
          </el-table-column>
          <el-table-column prop="location" label="工作地点" width="120" />
          <el-table-column label="操作" width="160" align="center">
            <template #default="{ row }">
              <el-button v-if="hasPermission('job:recommend:push')" link type="primary" @click="pushToClass(row)">一键推给全班</el-button>
              <el-button v-permission="'job:apply:submit'" link type="primary" :loading="applying === row.id" @click="applyJob(row)">投递简历</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination v-model:current-page="jobPage" :page-size="10" :total="jobTotal" layout="prev, pager, next" @current-change="loadJobs" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { hasPermission, hasAnyPermission } from '@/utils/permission'

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { listApplications, openChat } from '@/api/chat'
const router = useRouter()
import { ElMessage } from 'element-plus'


// 1. 管理员数据（薪资字段对齐新契约：minSalary / maxSalary 元/月）
const adminAuditList = ref([
  { company: '华智未来科技', jobTitle: '前端开发实习生', minSalary: 4400, maxSalary: 6600, riskLevel: 'safe', aiRisk: '资质正常，薪酬符合常规', applyDate: '2026-10-08' },
  { company: '盛达远航教育', jobTitle: '管培生 (保底20万)', minSalary: 15000, maxSalary: 20000, riskLevel: 'danger', aiRisk: '⚠️ 疑似培训贷：要求入职前缴纳培训认证费', applyDate: '2026-10-07' }
])
const handleAdminApprove = (row: any) => {
  adminAuditList.value = adminAuditList.value.filter(item => item !== row)
  ElMessage.success(`已批准【${row.company}】的招聘需求入校展示`)
}
const handleAdminReject = (row: any) => {
  adminAuditList.value = adminAuditList.value.filter(item => item !== row)
  ElMessage.error(`已驳回该异常岗位入校申请`)
}

// 2. HR 数据（status 为数字：1-招聘中 0-已暂停）
const hrJobList = ref([
  { id: 1, jobTitle: '前端开发实习生', department: '研发中心', minSalary: 4400, maxSalary: 6600, headcount: 3, applyCount: 14, status: 1 },
  { id: 2, jobTitle: 'Java后端研发', department: '云原生组', minSalary: 9000, maxSalary: 14000, headcount: 2, applyCount: 22, status: 1 }
])
const publishVisible = ref(false)
// 发布表单入参对齐新契约：jobTitle / minSalary / maxSalary / status / requirements
const jobForm = ref({ jobTitle: '', department: '', minSalary: 3000, maxSalary: 6000, headcount: 2, status: 1, requirements: '' })
const submitJobPublish = () => {
  if (!jobForm.value.jobTitle) return ElMessage.warning('请填写职位名称')
  if (jobForm.value.minSalary > jobForm.value.maxSalary) return ElMessage.warning('最低薪资不能高于最高薪资')
  hrJobList.value.unshift({
    id: Date.now(),
    jobTitle: jobForm.value.jobTitle,
    department: jobForm.value.department || '通用',
    minSalary: jobForm.value.minSalary,
    maxSalary: jobForm.value.maxSalary,
    headcount: jobForm.value.headcount,
    applyCount: 0,
    status: jobForm.value.status
  })
  publishVisible.value = false
  ElMessage.success('岗位已提交学院审核，审核通过后即可对学生开放')
}
const toggleJobStatus = (row: any) => { row.status = row.status === 1 ? 0 : 1; ElMessage.info('岗位状态已更新') }
const deleteJob = (row: any) => { hrJobList.value = hrJobList.value.filter(j => j.id !== row.id); ElMessage.success('岗位已下线') }

// 3. 学生与辅导员通用数据
const publicJobList = ref<any[]>([])
const jobsLoading = ref(false)
const jobsError = ref('')
const jobPage = ref(1)
const jobTotal = ref(0)
async function loadJobs() {
  if (!hasPermission('job:post:view')) return
  jobsLoading.value = true; jobsError.value = ''
  try {
    const data = await request.get('/job/list', { params: { pageNum: jobPage.value, pageSize: 10 } }) as any
    publicJobList.value = (data.records || []).map((job: any) => ({ ...job, company: job.publisherRole === 'HR' ? '企业招聘' : '校园岗位', location: job.city }))
    jobTotal.value = data.total || 0
  } catch { jobsError.value = '岗位加载失败，请重试'; publicJobList.value = [] }
  finally { jobsLoading.value = false }
}
onMounted(loadJobs)
const pushToClass = (row: any) => ElMessage.success(`已将“${row.company} - ${row.jobTitle}”定向推送给全班！`)
const applying = ref<number | null>(null)
const applyJob = async (row: any) => {
  if (applying.value) return
  applying.value = row.id
  try {
    let existing = hasPermission('chat:view') ? (await listApplications()).find(a => a.jobId === row.id) : undefined
    if (!existing) {
      await request.post('/job/apply', { jobId: row.id })
      ElMessage.success('简历投递成功')
      if (hasPermission('chat:view')) existing = (await listApplications()).find(a => a.jobId === row.id)
    }
    if (existing && existing.publisherRole === 'HR' && hasPermission('chat:view')) {
      const conversation = await openChat(existing.applicationId)
      await router.push({ path: '/chat', query: { conversation: conversation.id } })
    }
  } finally { applying.value = null }
}
</script>

<style scoped>
.job-container { padding: 20px; }
.card-title { font-size: 14px; color: #606266; }
.stat-number { font-size: 28px; font-weight: bold; line-height: 1.2; }
.unit { font-size: 14px; font-weight: normal; }
.stat-desc { font-size: 12px; color: #909399; margin-top: 6px; }
.text-danger { color: #f56c6c; }
.text-primary { color: #4dabf7; }
.text-success { color: #67c23a; }
.text-warning { color: #e6a23c; }
.mt-4 { margin-top: 16px; }
.header-flex { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-size: 16px; font-weight: bold; }
.sub-tip { font-size: 12px; color: #909399; margin-left: 10px; }
.salary-range { display: flex; align-items: center; gap: 6px; }
.salary-sep { color: #909399; }
.salary-unit { color: #909399; font-size: 13px; }
</style>
