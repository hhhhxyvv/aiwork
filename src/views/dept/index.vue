<template>
  <div class="dept-container">
    <!-- 顶部操作与说明卡片 -->
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div>
          <h2 class="title">院系与专业组织架构</h2>
          <p class="subtitle">
            基于数据库 <code>sys_dept</code> 表构建的树形层次结构，支持多级展开、实时搜索过滤与层级批量管理。
          </p>
        </div>
        <div class="header-actions">
          <el-button type="primary" icon="Plus" @click="handleOpenDialog()">新增顶级院系</el-button>
          <el-button icon="Refresh" @click="resetTree">重置视图</el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" class="main-row">
      <!-- 左侧：树形结构可视化区 -->
      <el-col :xs="24" :sm="24" :md="10" :lg="9">
        <el-card shadow="never" class="tree-card">
          <template #header>
            <div class="card-header">
              <span class="header-title">组织架构树（Tree View）</span>
              <el-tag size="small" type="info">共 {{ flatList.length }} 个节点</el-tag>
            </div>
          </template>

          <!-- 搜索过滤框 -->
          <el-input
            v-model="filterText"
            placeholder="输入院系或专业名称搜索..."
            prefix-icon="Search"
            clearable
            class="filter-input"
          />

          <!-- 工具控制条 -->
          <div class="tree-toolbar">
            <el-checkbox v-model="isExpandAll" @change="toggleExpandAll">全部展开</el-checkbox>
            <span class="checked-count" v-if="checkedKeys.length">
              已勾选 <b>{{ checkedKeys.length }}</b> 项
            </span>
          </div>

          <!-- Element Plus 树形组件 -->
          <div class="tree-wrapper">
            <!-- ui渲染 -->
            <el-tree
              ref="treeRef"
              :data="treeData"
              :props="defaultProps"
              node-key="id"
              show-checkbox
              highlight-current
              :default-expand-all="isExpandAll"
              :filter-node-method="filterNode"
              :expand-on-click-node="false"
              @node-click="handleNodeClick"
              @check="handleCheck"
            >
              <template #default="{ node, data }">
                <span class="custom-tree-node">
                  <span class="node-label">
                    <el-icon class="node-icon">
                      <OfficeBuilding v-if="data.level === 1" />
                      <School v-else-if="data.level === 2" />
                      <User v-else />
                    </el-icon>
                    <span>{{ node.label }}</span>
                  </span>
                  <span class="node-tags">
                    <el-tag
                      :type="data.level === 1 ? 'danger' : data.level === 2 ? 'warning' : 'success'"
                      size="small"
                      effect="plain"
                    >
                      {{ data.level === 1 ? '学院' : data.level === 2 ? '专业' : '班级' }}
                    </el-tag>
                  </span>
                </span>
              </template>
            </el-tree>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：当前节点详情与统计看板 -->
      <el-col :xs="24" :sm="24" :md="14" :lg="15">
        <el-card shadow="never" class="detail-card">
          <template #header>
            <div class="card-header">
              <span class="header-title">
                {{ selectedNode ? `【${selectedNode.deptName}】详细信息` : '节点详情与学情监控' }}
              </span>
              <div v-if="selectedNode">
                <el-button size="small" type="primary" plain @click="handleOpenDialog(selectedNode)">
                  添加子部门/专业
                </el-button>
                <el-button size="small" type="danger" plain @click="handleDelete(selectedNode)">
                  删除
                </el-button>
              </div>
            </div>
          </template>

          <div v-if="selectedNode" class="node-detail">
            <!-- 关键指标卡 -->
            <el-row :gutter="16" class="stat-row">
              <el-col :span="8">
                <div class="stat-box">
                  <div class="stat-num">{{ selectedNode.studentCount || 0 }}</div>
                  <div class="stat-label">在读学生总数</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="stat-box">
                  <div class="stat-num success-text">{{ selectedNode.employmentRate || '0%' }}</div>
                  <div class="stat-label">当前毕业去向落实率</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="stat-box">
                  <div class="stat-num warning-text">{{ selectedNode.counselor || '暂未分配' }}</div>
                  <div class="stat-label">负责老师 / 辅导员</div>
                </div>
              </el-col>
            </el-row>

            <!-- 基本属性描述表 -->
            <el-descriptions title="基础配置（sys_dept 映射）" :column="2" border class="desc-table">
              <el-descriptions-item label="机构/专业 ID">{{ selectedNode.id }}</el-descriptions-item>
              <el-descriptions-item label="父级 ID (parent_id)">
                {{ selectedNode.parentId === 0 ? '0 (顶级根节点)' : selectedNode.parentId }}
              </el-descriptions-item>
              <el-descriptions-item label="机构名称">{{ selectedNode.deptName }}</el-descriptions-item>
              <el-descriptions-item label="层级属性">
                <el-tag size="small">{{ selectedNode.level === 1 ? '一级院系' : '二级专业' }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="启用状态">
                <el-tag :type="selectedNode.status === 1 ? 'success' : 'info'">
                  {{ selectedNode.status === 1 ? '正常启用' : '已停用' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="排序权重 (order_num)">{{ selectedNode.orderNum || 1 }}</el-descriptions-item>
              <el-descriptions-item label="创建时间" :span="2">2026-09-01 10:00:00</el-descriptions-item>
              <el-descriptions-item label="职责简介" :span="2">
                {{ selectedNode.description || '负责该专业学生的培养方案落地、实习双选会组织及就业对口率追踪。' }}
              </el-descriptions-item>
            </el-descriptions>

            <!-- 下属子节点快速列表 -->
            <div class="sub-nodes" v-if="selectedNode.children && selectedNode.children.length">
              <h4 class="sub-title">下设直属机构/专业（{{ selectedNode.children.length }} 个）</h4>
              <el-table :data="selectedNode.children" size="small" border>
                <el-table-column prop="id" label="ID" width="70" />
                <el-table-column prop="deptName" label="机构/专业名称" />
                <el-table-column prop="studentCount" label="学生人数" width="100" />
                <el-table-column prop="employmentRate" label="就业率" width="100" />
                <el-table-column prop="counselor" label="辅导员" width="110" />
                <el-table-column label="状态" width="90">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">
                      {{ row.status === 1 ? '正常' : '禁用' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>

          <el-empty v-else description="请在左侧组织架构树中点击任意院系或专业查看详情" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="上级机构">
          <el-input :model-value="parentDeptName" disabled />
        </el-form-item>
        <el-form-item label="机构/专业名" required>
          <el-input v-model="form.deptName" placeholder="如：人工智能与大数据学院 / 软件工程" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.counselor" placeholder="负责人或辅导员姓名" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { OfficeBuilding, School, User, Plus, Refresh, Search } from '@element-plus/icons-vue'

interface DeptNode {
  id: number
  parentId: number
  deptName: string
  orderNum?: number
  status: number
  level: number
  studentCount?: number
  employmentRate?: string
  counselor?: string
  description?: string
  children?: DeptNode[]
}

const flatList = ref<DeptNode[]>([
  { id: 1, parentId: 0, deptName: '信息工程学院', orderNum: 1, status: 1, level: 1, studentCount: 1240, employmentRate: '92.4%', counselor: '李院长', description: '涵盖计算机、软件工程与人工智能核心IT专业。' },
  { id: 2, parentId: 1, deptName: '软件工程专业', orderNum: 1, status: 1, level: 2, studentCount: 420, employmentRate: '95.1%', counselor: '王老师（辅导员）', description: '国家级特色专业，主攻全栈开发与移动架构。' },
  { id: 3, parentId: 1, deptName: '计算机科学与技术', orderNum: 2, status: 1, level: 2, studentCount: 480, employmentRate: '93.5%', counselor: '张老师（辅导员）', description: '重点培养系统研发、底层架构与算法工程人才。' },
  { id: 4, parentId: 1, deptName: '人工智能专业', orderNum: 3, status: 1, level: 3, studentCount: 340, employmentRate: '88.6%', counselor: '刘老师（辅导员）', description: '新兴交叉学科，主攻大语言模型与CV落地应用。' },
  
  { id: 5, parentId: 0, deptName: '经济管理学院', orderNum: 2, status: 1, level: 1, studentCount: 980, employmentRate: '87.2%', counselor: '赵院长', description: '依托数字化商业，培养经管实战型创新人才。' },
  { id: 6, parentId: 5, deptName: '电子商务专业', orderNum: 1, status: 1, level: 2, studentCount: 320, employmentRate: '89.4%', counselor: '孙老师（辅导员）', description: '聚焦直播电商供应链与跨境数字贸易。' },
  { id: 7, parentId: 5, deptName: '财务管理专业', orderNum: 2, status: 1, level: 2, studentCount: 360, employmentRate: '86.1%', counselor: '周老师（辅导员）', description: '培养智能财税、数据审计与企业投融资管理人才。' },
  { id: 8, parentId: 5, deptName: '国际经济与贸易', orderNum: 3, status: 1, level: 2, studentCount: 300, employmentRate: '85.8%', counselor: '吴老师（辅导员）', description: '结合大宗外贸和自贸港政策的实务型人才培养。' },

  { id: 9, parentId: 0, deptName: '机械电气与自动化学院', orderNum: 3, status: 1, level: 1, studentCount: 860, employmentRate: '94.0%', counselor: '陈院长', description: '面向智能制造与高端装备制造的国家急需工科基地。' },
  { id: 10, parentId: 9, deptName: '智能制造工程', orderNum: 1, status: 1, level: 2, studentCount: 410, employmentRate: '96.2%', counselor: '钱老师（辅导员）', description: '工业互联网、数控系统与工业机器人应用。' },
  { id: 11, parentId: 9, deptName: '电气工程及其自动化', orderNum: 2, status: 1, level: 2, studentCount: 450, employmentRate: '92.0%', counselor: '郑老师（辅导员）', description: '聚焦国家电网、新能源电力与嵌入式控制系统。' }
])
//树形结构转换
function listToTree(list: DeptNode[]): DeptNode[] {
  const map = new Map<number, DeptNode>()
  const roots: DeptNode[] = []

  list.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })

  list.forEach(item => {
    const node = map.get(item.id)!
    if (item.parentId === 0) {
      roots.push(node)
    } else {
      const parent = map.get(item.parentId)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }
  })

  return roots
}

const filterText = ref('')
const isExpandAll = ref(true)
const treeRef = ref()
const selectedNode = ref<DeptNode | null>(flatList.value[0])
const checkedKeys = ref<number[]>([])

const defaultProps = {
  children: 'children',
  label: 'deptName'
}

const treeData = computed(() => listToTree(flatList.value))
// 监听搜索框输入，调用 el-tree 的过滤函数
watch(filterText, (val) => {
  treeRef.value?.filter(val)
})
// 过滤算法：判断节点名称是否包含输入字符
const filterNode = (value: string, data: DeptNode) => {
  if (!value) return true
  return data.deptName.includes(value)
}
// 点击树节点时触发，更新当前选中对象
const handleNodeClick = (data: DeptNode) => {
  selectedNode.value = data
}

const handleCheck = (_: any, info: { checkedKeys: number[] }) => {
  checkedKeys.value = info.checkedKeys
}

const toggleExpandAll = (val: any) => {
  const nodes = treeRef.value?.store.nodesMap
  for (const key in nodes) {
    nodes[key].expanded = val
  }
}

const resetTree = () => {
  filterText.value = ''
  selectedNode.value = flatList.value[0]
  ElMessage.success('视图已重置')
}

const dialogVisible = ref(false)
const dialogTitle = ref('新增部门/专业')
const parentDeptName = ref('无（顶级学院）')
const form = reactive({
  parentId: 0,
  deptName: '',
  counselor: '',
  status: 1
})

const handleOpenDialog = (parent?: DeptNode) => {
  if (parent) {
    form.parentId = parent.id
    parentDeptName.value = parent.deptName
    dialogTitle.value = `在【${parent.deptName}】下新增子专业`
  } else {
    form.parentId = 0
    parentDeptName.value = '无（顶级学院）'
    dialogTitle.value = '新增顶级院系'
  }
  form.deptName = ''
  form.counselor = ''
  form.status = 1
  dialogVisible.value = true
}

const submitForm = () => {
  if (!form.deptName.trim()) {
    ElMessage.warning('请输入名称')
    return
  }
  const newId = Date.now()
  flatList.value.push({
    id: newId,
    parentId: form.parentId,
    deptName: form.deptName,
    status: form.status,
    level: form.parentId === 0 ? 1 : 2,
    studentCount: 120,
    employmentRate: '0.0%',
    counselor: form.counselor || '未指定',
    description: '新设专业或直属机构。'
  })
  ElMessage.success('添加成功，组织树已实时更新')
  dialogVisible.value = false
}

const handleDelete = (node: DeptNode) => {
  ElMessageBox.confirm(`确定要移除【${node.deptName}】及其下级数据吗？`, '警告', {
    type: 'warning',
    confirmButtonText: '确定删除',
    cancelButtonText: '取消'
  }).then(() => {
    flatList.value = flatList.value.filter(item => item.id !== node.id && item.parentId !== node.id)
    selectedNode.value = null
    ElMessage.success('删除成功')
  })
}
</script>

<style scoped>
.dept-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.subtitle code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  color: #4f46e5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-weight: 600;
  font-size: 15px;
}

.filter-input {
  margin-bottom: 12px;
}

.tree-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0 12px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
  font-size: 13px;
}

.checked-count {
  color: #4f46e5;
}

.tree-wrapper {
  max-height: 580px;
  overflow-y: auto;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
}

.node-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-icon {
  color: #4f46e5;
}

.stat-row {
  margin-bottom: 20px;
}

.stat-box {
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.success-text {
  color: #10b981;
}

.warning-text {
  color: #f59e0b;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.desc-table {
  margin-bottom: 24px;
}

.sub-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #374151;
}
</style>
