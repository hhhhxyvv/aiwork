<template>
  <div class="resume-container">
    <el-alert title="候选人筛选和班级建档区为本地演示；本人简历上传、保存、下载与诊断连接业务接口。" type="info" :closable="false" />
    <el-empty v-if="hasAnyPermission(['resume:candidate:invite','resume:candidate:reject']) && !hasPermission('resume:candidate:view')" description="已获得候选人操作权限；请配置候选人查看权限以选择记录。" />
    <el-empty v-if="hasPermission('student:archive:remind') && !hasAnyPermission(['student:list:view','student:warning:view'])" description="已获得建档提醒权限；请配置学生列表或预警查看权限以选择对象。" />
    <!-- ================= 1. HR 视角：应聘简历筛选池 ================= -->
    <div v-if="hasPermission('resume:candidate:view')" class="hr-resume-view">
      <el-card shadow="hover">
        <template #header>
          <div class="header-box">
            <div>
              <span class="title">应聘候选人人才库</span>
              <span class="subtitle">AI 智能提取简历关键技能并计算人岗匹配度 (Match Score)</span>
            </div>
            <div class="actions">
              <el-input v-model="filterKeyword" placeholder="搜索技能(如Vue/Java)/院校" style="width: 220px;" clearable />
            </div>
          </div>
        </template>

        <el-table :data="filteredApplicants" stripe style="width: 100%">
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="school" label="院校与学历" width="180" />
          <el-table-column prop="jobApplied" label="投递职位" width="140" />
          <el-table-column prop="matchScore" label="AI人岗匹配度" width="130" align="center">
            <template #default="{ row }">
              <el-progress
                :percentage="row.matchScore"
                :color="row.matchScore >= 80 ? '#67c23a' : '#e6a23c'"
              />
            </template>
          </el-table-column>
          <el-table-column prop="highlights" label="AI 提取优势亮点" min-width="260">
            <template #default="{ row }">
              <el-tag v-for="tag in row.tags" :key="tag" size="small" style="margin-right: 6px;">{{ tag }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="初筛状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'invited'" type="success">已约面试</el-tag>
              <el-tag v-else-if="row.status === 'rejected'" type="info">已婉拒</el-tag>
              <el-tag v-else type="primary">新投递</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="简历操作" width="220" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="previewPdf(row)">查看简历</el-button>
              <el-button v-permission="'resume:candidate:invite'" link type="success" :disabled="row.status !== 'pending'" @click="inviteInterview(row)">邀约</el-button>
              <el-button v-permission="'resume:candidate:reject'" link type="danger" :disabled="row.status !== 'pending'" @click="rejectResume(row)">淘汰</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- ================= 2. 辅导员视角：班级建档率与督查（班级维度按字符串 className 筛选） ================= -->
    <div v-if="hasAnyPermission(['student:list:view','student:warning:view'])" class="counselor-resume-view">
      <el-card shadow="hover">
        <template #header>
          <div class="header-box">
            <span class="title">班级毕业生简历建档数据库</span>
            <div class="actions">
              <span class="filter-label">按班级筛选：</span>
              <el-select v-model="selectedClassName" placeholder="全部班级" clearable style="width: 160px">
                <el-option v-for="c in classList" :key="c" :label="c" :value="c" />
              </el-select>
            </div>
          </div>
        </template>

        <el-table :data="filteredArchive" stripe style="width: 100%">
          <el-table-column prop="studentName" label="姓名" width="100" />
          <el-table-column prop="className" label="班级" width="140" />
          <el-table-column prop="title" label="简历标题" min-width="200" />
          <el-table-column prop="templateCode" label="使用模板" width="110" align="center" />
          <el-table-column prop="integrityScore" label="简历完整度" width="160">
            <template #default="{ row }">
              <el-progress
                :percentage="row.integrityScore"
                :color="row.integrityScore >= 80 ? '#67c23a' : '#e6a23c'"
              />
            </template>
          </el-table-column>
        </el-table>

        <div v-if="hasPermission('student:warning:view')" class="counselor-footer">
          <p>全班 45 人，已完善简历 38 人，未建档 7 人。</p>
          <el-button v-permission="'student:archive:remind'" type="primary" plain @click="counselorRemind">一键督促未建档同学</el-button>
        </div>
      </el-card>
    </div>

    <!-- ================= 3. 学生视角：在线智能写简历（内容统一整合进 parsedContent） ================= -->
    <div v-if="hasAnyPermission(['student:profile:view','student:resume:edit','student:resume:upload','student:resume:download','student:resume:diagnose'])" class="student-resume-view">
      <el-card shadow="hover">
        <template #header>
          <div class="header-box">
            <span class="title">我的求职简历 (AI 润色优化)</span>
            <el-tag :type="integrityScore >= 80 ? 'success' : 'warning'">简历完整度：{{ integrityScore }} 分</el-tag>
          </div>
        </template>

        <!-- 简历附件上传：从本地电脑选择 Word/PDF 文件，后端保存原件并自动解析内容 -->
        <div class="upload-section">
          <el-upload v-if="hasPermission('student:resume:upload')"
            drag
            accept=".doc,.docx,.pdf"
            :show-file-list="false"
            :http-request="handleUploadFile"
          >
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <div class="upload-text">
              {{ uploading ? '正在上传解析中...' : '点击或拖拽上传简历文件（Word .doc/.docx、PDF，20MB 以内）' }}
            </div>
            <div class="upload-sub">从本地电脑选择简历文件上传，系统保存原件并自动解析内容填入下方编辑框</div>
          </el-upload>

          <!-- 已上传原件信息条 -->
          <div v-if="uploadedFile || hasPermission('student:resume:download')" class="uploaded-file-bar">
            <el-icon><Document /></el-icon>
            <span class="file-name">{{ uploadedFile?.name || '服务器保存的简历原件' }}</span>
            <el-tag v-if="uploadedFile" size="small" type="success" effect="plain">原件已保存</el-tag>
            <el-button v-permission="'student:resume:download'" link type="primary" size="small" :loading="downloading" @click="handleDownloadFile">
              下载原件
            </el-button>
          </div>
        </div>

        <el-form v-if="hasAnyPermission(['student:profile:view','student:resume:edit'])" :disabled="!hasPermission('student:resume:edit')" label-width="90px">
          <el-form-item label="简历标题">
            <el-input v-model="resumeForm.title" placeholder="如：张同学-前端开发求职简历" />
          </el-form-item>
          <el-form-item label="简历模板">
            <el-radio-group v-model="resumeForm.templateCode">
              <el-radio-button value="classic">经典款</el-radio-button>
              <el-radio-button value="modern">简约款</el-radio-button>
              <el-radio-button value="tech">科技款</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="简历内容">
            <el-input
              v-model="resumeForm.parsedContent"
              type="textarea"
              :rows="10"
              placeholder="统一在此维护解析后的简历内容：教育经历、项目经历、自我评价、技能证书等（支持多行文本）"
            />
          </el-form-item>
        </el-form>

        <div class="integrity-box">
          <span class="integrity-label">简历完整度</span>
          <el-progress
            class="integrity-bar"
            :percentage="integrityScore"
            :color="integrityScore >= 80 ? '#67c23a' : '#e6a23c'"
          />
        </div>

        <div class="student-actions">
          <el-button v-permission="'student:resume:edit'" type="primary" :loading="saving" @click="handleSaveResume">保存简历</el-button>
          <el-button v-permission="'student:resume:diagnose'" type="success" :loading="diagnosing" @click="handleDiagnose">AI 一键诊断</el-button>
        </div>
        <p class="tip">支持一键解析求职意向并使用 STAR 原则润色项目经验，教育/项目等经历统一保存在「简历内容」中。</p>
      </el-card>

      <!-- AI 诊断报告弹窗（新契约：overallScore / strengths / shortcomings / suggestions） -->
      <el-dialog v-model="reportVisible" title="AI 简历诊断报告" width="640px">
        <div v-if="report" class="report-box">
          <div class="report-score">
            <span class="score-num">{{ report.overallScore }}</span>
            <div class="score-meta">
              <div class="score-label">综合评分</div>
              <div class="score-target">目标岗位：{{ report.targetJobName }}</div>
            </div>
          </div>
          <div class="report-section">
            <div class="section-title strengths">✅ 我的优势</div>
            <div class="section-content">{{ report.strengths }}</div>
          </div>
          <div class="report-section">
            <div class="section-title shortcomings">⚠️ 我的短板</div>
            <div class="section-content">{{ report.shortcomings }}</div>
          </div>
          <div class="report-section">
            <div class="section-title suggestions">💡 提升建议</div>
            <div class="section-content">{{ report.suggestions }}</div>
          </div>
        </div>
        <template #footer>
          <el-button type="primary" @click="reportVisible = false">我知道了</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { hasPermission, hasAnyPermission } from '@/utils/permission'

import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Document } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import { updateResume, diagnoseResume, uploadResume, getMyResume, downloadMyResume } from '@/api/resume'
import type { ResumeDTO, DiagnosisResult } from '@/api/types'

const filterKeyword = ref('')

// HR 应聘库
const applicants = ref([
  { id: 1, name: '张同学', school: '软工 / 2026届本科', jobApplied: '前端开发实习生', matchScore: 92, tags: ['熟悉Vue3生态', '有软考中级', '全栈实训经验'], status: 'pending' },
  { id: 2, name: '李同学', school: '计算机 / 2026届本科', jobApplied: 'Java开发工程师', matchScore: 84, tags: ['熟悉微服务架构', '了解Redis缓存'], status: 'pending' },
  { id: 3, name: '王同学', school: '大数据 / 2026届本科', jobApplied: '前端开发实习生', matchScore: 61, tags: ['有基础但缺项目实战', 'JS语法熟练'], status: 'pending' }
])

const filteredApplicants = computed(() => {
  return applicants.value.filter(a => !filterKeyword.value || a.name.includes(filterKeyword.value) || a.school.includes(filterKeyword.value) || a.tags.some(t => t.includes(filterKeyword.value)))
})

const previewPdf = (row: any) => ElMessage.info(`正在打开 ${row.name} 的《个人简历_标准化排版.pdf》预览窗...`)
const inviteInterview = (row: any) => { row.status = 'invited'; ElMessage.success(`已向 ${row.name} 发送面试邀约通知短信与邮件！`) }
const rejectResume = (row: any) => { row.status = 'rejected'; ElMessage.info(`已标记为不合适并发送感谢信`) }

// ================= 辅导员：班级维度筛选（传字符串 className，不再传数字 classId） =================
const classList = ref(['软件2101班', '软件2102班', '大数据2101班'])
const selectedClassName = ref('')
interface ArchiveRow {
  id: number
  studentName: string
  className: string
  title: string
  templateCode: string
  integrityScore: number
}
const archiveList = ref<ArchiveRow[]>([
  { id: 1, studentName: '张同学', className: '软件2101班', title: '张同学-前端开发求职简历', templateCode: 'classic', integrityScore: 88 },
  { id: 2, studentName: '李同学', className: '软件2101班', title: '李同学-Java开发求职简历', templateCode: 'modern', integrityScore: 76 },
  { id: 3, studentName: '王同学', className: '软件2102班', title: '王同学-数据分析求职简历', templateCode: 'classic', integrityScore: 64 }
])
const filteredArchive = computed(() =>
  archiveList.value.filter(a => !selectedClassName.value || a.className === selectedClassName.value)
)
const counselorRemind = () => ElMessage.success('已给未完成简历的学生发送站内通知')

// ================= 学生：parsedContent 编辑 + integrityScore + AI 诊断 =================
/** 简历表单（新契约）：教育/项目等经历统一整合进 parsedContent，不再分散填写 */
const resumeForm = reactive<ResumeDTO>({
  title: '我的求职简历',
  parsedContent: '',
  templateCode: 'classic'
})
const integrityScore = ref(0)

// ================= 简历附件上传（本地 Word/PDF 文件 → 后端保存原件 + 解析文本） =================
const uploading = ref(false)
const downloading = ref(false)
/** 已上传的原件信息（用于展示与下载） */
const uploadedFile = ref<{ name: string } | null>(null)

const handleUploadFile = async (options: UploadRequestOptions) => {
  if (!hasPermission('student:resume:upload')) return
  const file = options.file as File
  uploading.value = true
  try {
    const vo = await uploadResume(file)
    // 解析结果回填编辑框，可继续手工微调后保存
    resumeForm.title = vo.title
    resumeForm.parsedContent = vo.parsedContent
    if (vo.templateCode) resumeForm.templateCode = vo.templateCode
    if (vo.integrityScore != null) integrityScore.value = vo.integrityScore
    uploadedFile.value = { name: file.name }
    ElMessage.success('简历文件上传成功，内容已自动解析到下方编辑框')
  } catch {
    // 请求拦截器已统一弹错
  } finally {
    uploading.value = false
  }
}

const handleDownloadFile = async () => {
  if (!hasPermission('student:resume:download')) return
  downloading.value = true
  try {
    const blob = (await downloadMyResume()) as Blob
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = uploadedFile.value?.name || '我的简历'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // 请求拦截器已统一弹错
  } finally {
    downloading.value = false
  }
}

// 进入页面时加载已保存的简历（仅学生角色，/resume/detail 需要 RESUME_SELF_VIEW 权限）
onMounted(async () => {
  if (!hasPermission('student:profile:view')) return
  try {
    const detail = await getMyResume()
    if (detail) {
      resumeForm.title = detail.title || resumeForm.title
      resumeForm.parsedContent = detail.parsedContent || resumeForm.parsedContent
      if (detail.templateCode) resumeForm.templateCode = detail.templateCode
      if (detail.integrityScore != null) integrityScore.value = detail.integrityScore
      if (detail.parsedContent?.startsWith('【简历原件】')) {
        uploadedFile.value = { name: detail.parsedContent.split('\n')[0].replace('【简历原件】', '').trim() }
      }
    }
  } catch {
    // 未建档或请求失败时保持默认值
  }
})

const saving = ref(false)
const handleSaveResume = async () => {
  if (!hasPermission('student:resume:edit')) return
  if (!resumeForm.title) return ElMessage.warning('请填写简历标题')
  saving.value = true
  try {
    await updateResume({ ...resumeForm })
    ElMessage.success('简历保存成功')
  } catch {
    // 请求拦截器已统一弹错，这里不再重复提示
  } finally {
    saving.value = false
  }
}

const diagnosing = ref(false)
const reportVisible = ref(false)
const report = ref<DiagnosisResult | null>(null)
const handleDiagnose = async () => {
  if (!hasPermission('student:resume:diagnose')) return
  diagnosing.value = true
  try {
    // 新契约响应：reportId / targetJobName / overallScore / strengths / shortcomings / suggestions
    report.value = await diagnoseResume(resumeForm.title)
    reportVisible.value = true
  } catch {
    // 请求拦截器已统一弹错
  } finally {
    diagnosing.value = false
  }
}
</script>

<style scoped>
.resume-container { padding: 20px; }
.header-box { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 16px; font-weight: bold; }
.subtitle { font-size: 12px; color: #909399; margin-left: 10px; }
.filter-label { font-size: 13px; color: #606266; margin-right: 6px; }

.counselor-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.counselor-footer p { margin: 0; color: #606266; font-size: 13px; }

.integrity-box { display: flex; align-items: center; gap: 12px; margin: 4px 0 16px; padding: 12px 16px; background: #f5f7fa; border-radius: 8px; }

/* 简历附件上传区 */
.upload-section { margin-bottom: 18px; }
.upload-section :deep(.el-upload-dragger) { padding: 22px 20px; }
.upload-icon { font-size: 40px; color: #4dabf7; margin-bottom: 8px; }
.upload-text { font-size: 14px; color: #606266; }
.upload-sub { margin-top: 4px; font-size: 12px; color: #909399; }
.uploaded-file-bar { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 8px 14px; background: #eef7ff; border: 1px solid #cbe7fd; border-radius: 8px; font-size: 13px; color: #1971c2; }
.uploaded-file-bar .file-name { font-weight: 600; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.integrity-label { font-size: 13px; color: #606266; white-space: nowrap; }
.integrity-bar { flex: 1; }
.student-actions { display: flex; gap: 12px; }
.tip { margin: 12px 0 0; font-size: 12px; color: #909399; }

/* AI 诊断报告 */
.report-score { display: flex; align-items: center; gap: 16px; padding: 16px 20px; margin-bottom: 16px; background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%); border-radius: 12px; color: #fff; }
.score-num { font-size: 44px; font-weight: 700; line-height: 1; }
.score-label { font-size: 14px; font-weight: 600; }
.score-target { font-size: 12px; opacity: 0.85; margin-top: 4px; }
.report-section { margin-bottom: 14px; }
.section-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
.section-title.strengths { color: #67c23a; }
.section-title.shortcomings { color: #e6a23c; }
.section-title.suggestions { color: #4dabf7; }
.section-content { padding: 10px 14px; background: #f5f7fa; border-radius: 8px; font-size: 13px; line-height: 1.8; color: #303133; white-space: pre-wrap; }
</style>
