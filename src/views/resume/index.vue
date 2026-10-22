<template>
  <div class="resume-container">
    <!-- ================= 1. HR 视角：应聘简历筛选池 ================= -->
    <div v-if="role === 'hr'" class="hr-resume-view">
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
              <el-button link type="success" :disabled="row.status !== 'pending'" @click="inviteInterview(row)">邀约</el-button>
              <el-button link type="danger" :disabled="row.status !== 'pending'" @click="rejectResume(row)">淘汰</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- ================= 2. 辅导员视角：班级建档率与督查（班级维度按字符串 className 筛选） ================= -->
    <div v-else-if="role === 'counselor'" class="counselor-resume-view">
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

        <div class="counselor-footer">
          <p>全班 45 人，已完善简历 38 人，未建档 7 人。</p>
          <el-button type="primary" plain @click="counselorRemind">一键督促未建档同学</el-button>
        </div>
      </el-card>
    </div>

    <!-- ================= 3. 学生视角：在线智能写简历（内容统一整合进 parsedContent） ================= -->
    <div v-else class="student-resume-view">
      <el-card shadow="hover">
        <template #header>
          <div class="header-box">
            <span class="title">我的求职简历 (AI 润色优化)</span>
            <el-tag :type="integrityScore >= 80 ? 'success' : 'warning'">简历完整度：{{ integrityScore }} 分</el-tag>
          </div>
        </template>

        <el-form label-width="90px">
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
          <el-button type="primary" :loading="saving" @click="handleSaveResume">保存简历</el-button>
          <el-button type="success" :loading="diagnosing" @click="handleDiagnose">AI 一键诊断</el-button>
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
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { updateResume, diagnoseResume } from '@/api/resume'
import type { ResumeDTO, DiagnosisResult } from '@/api/types'

const role = ref(localStorage.getItem('role') || 'hr')
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
  parsedContent:
    '【教育经历】软件工程专业 本科 2022-2026\n【项目经历】AI 就业服务智能体：负责前端架构与核心模块开发\n【技能特长】Vue3 / TypeScript / Element Plus\n【自我评价】学习能力强，具备良好的团队协作意识',
  templateCode: 'classic'
})
const integrityScore = ref(72)

const saving = ref(false)
const handleSaveResume = async () => {
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
.integrity-label { font-size: 13px; color: #606266; white-space: nowrap; }
.integrity-bar { flex: 1; }
.student-actions { display: flex; gap: 12px; }
.tip { margin: 12px 0 0; font-size: 12px; color: #909399; }

/* AI 诊断报告 */
.report-score { display: flex; align-items: center; gap: 16px; padding: 16px 20px; margin-bottom: 16px; background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); border-radius: 12px; color: #fff; }
.score-num { font-size: 44px; font-weight: 700; line-height: 1; }
.score-label { font-size: 14px; font-weight: 600; }
.score-target { font-size: 12px; opacity: 0.85; margin-top: 4px; }
.report-section { margin-bottom: 14px; }
.section-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
.section-title.strengths { color: #67c23a; }
.section-title.shortcomings { color: #e6a23c; }
.section-title.suggestions { color: #409eff; }
.section-content { padding: 10px 14px; background: #f5f7fa; border-radius: 8px; font-size: 13px; line-height: 1.8; color: #303133; white-space: pre-wrap; }
</style>
