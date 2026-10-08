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

    <!-- ================= 2. 辅导员视角：班级建档率与督查 ================= -->
    <div v-else-if="role === 'counselor'" class="counselor-resume-view">
      <el-card shadow="hover">
        <template #header><span class="title">班级毕业生简历建档数据库</span></template>
        <p>全班 45 人，已完善简历 38 人，未建档 7 人。</p>
        <el-button type="primary" plain @click="counselorRemind">一键督促未建档同学</el-button>
      </el-card>
    </div>

    <!-- ================= 3. 学生视角：在线智能写简历 ================= -->
    <div v-else class="student-resume-view">
      <el-card shadow="hover">
        <template #header><span class="title">我的求职简历 (AI 润色优化)</span></template>
        <p>支持一键解析求职意向并使用 STAR 原则润色项目经验。</p>
        <el-button type="primary">进入简历编辑器</el-button>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

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

const counselorRemind = () => ElMessage.success('已给未完成简历的学生发送站内通知')
</script>

<style scoped>
.resume-container { padding: 20px; }
.header-box { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 16px; font-weight: bold; }
.subtitle { font-size: 12px; color: #909399; margin-left: 10px; }
</style>
