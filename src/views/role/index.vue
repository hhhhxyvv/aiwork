<template>
  <div class="role-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">角色权限配置</h2>
        <p class="page-desc">RBAC 动态授权：为各角色勾选菜单 / 按钮 / 接口权限，保存后立即生效（重新登录获取新 Token）</p>
      </div>
    </div>

    <!-- 角色卡片列表 -->
    <el-row :gutter="20">
      <el-col v-for="r in roleList" :key="r.roleId" :span="6">
        <el-card shadow="hover" class="role-card">
          <div class="role-head">
            <el-avatar :size="46" class="role-avatar">{{ r.label.charAt(0) }}</el-avatar>
            <div class="role-meta">
              <div class="role-name">{{ r.label }}</div>
              <div class="role-code">roleId: {{ r.roleId }}</div>
            </div>
          </div>
          <div class="role-desc">{{ r.desc }}</div>
          <el-button
            type="primary"
            class="assign-btn"
            :icon="Key"
            :loading="loadingRoleId === r.roleId"
            @click="openAssignDialog(r)"
          >
            分配权限
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <!-- 授权弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="`分配权限 - ${currentRole?.label || ''}`"
      width="560px"
      :close-on-click-modal="false"
      @closed="resetDialogState"
    >
      <div v-loading="treeLoading" class="tree-wrap">
        <div class="tree-tip">
          当前角色：<el-tag size="small" type="primary">{{ currentRole?.label }}</el-tag>
          <span class="tip-text">勾选后点击保存，覆盖式提交该角色全部权限</span>
        </div>

        <el-tree
          ref="treeRef"
          :data="groupedTree"
          node-key="id"
          show-checkbox
          default-expand-all
          :props="{ label: 'name', children: 'children', disabled: 'disabled' }"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <!-- 分组节点 -->
              <template v-if="data.isGroup">
                <el-icon class="group-icon"><Folder /></el-icon>
                <span class="group-name">{{ data.name }}</span>
                <el-tag size="small" effect="plain">{{ data.children.length }} 项</el-tag>
              </template>
              <!-- 权限叶子节点：name + code (+ apiPath) -->
              <template v-else>
                <span class="leaf-name">{{ data.name }}</span>
                <span class="leaf-code">{{ data.code }}</span>
                <span v-if="data.apiPath" class="leaf-api">{{ data.apiPath }}</span>
              </template>
            </span>
          </template>
        </el-tree>

        <el-empty v-if="!treeLoading && groupedTree.length === 0" description="后端未返回任何权限数据" :image-size="80" />
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="treeLoading || groupedTree.length === 0" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { ElTree } from 'element-plus'
import { Key, Folder } from '@element-plus/icons-vue'
import {
  getPermissionTree,
  getRolePermissionIds,
  assignRolePermissions,
  type PermissionVO
} from '@/api/permission'

// 角色列表：roleId 与后端 sys_role 表主键对应（admin=1 / counselor=2 / hr=3 / student=4，如与库不一致按实际调整）
const roleList = [
  { roleId: 1, label: '院系管理员', code: 'admin', desc: '全院数据大屏、院系专业、角色权限、存储中心' },
  { roleId: 2, label: '辅导员', code: 'counselor', desc: '实习审批、周报检查、所带班级就业统计' },
  { roleId: 3, label: '企业 HR', code: 'hr', desc: '岗位发布与下架、简历初筛、实习评价' },
  { roleId: 4, label: '学生', code: 'student', desc: '简历中心、岗位投递、AI 面试、政策问答' }
]

const treeRef = ref<InstanceType<typeof ElTree>>()
const dialogVisible = ref(false)
const treeLoading = ref(false)
const saving = ref(false)
const loadingRoleId = ref<number | null>(null)
const currentRole = ref<(typeof roleList)[number] | null>(null)
const permissionList = ref<PermissionVO[]>([])

const TYPE_LABEL: Record<string, string> = {
  MENU: '菜单权限',
  BUTTON: '按钮权限',
  API: '接口权限'
}

/** 平铺权限数组 → 按 resourceType 二级分组树（分组节点 disabled，仅叶子可勾选） */
const groupedTree = computed(() => {
  const groups = new Map<string, PermissionVO[]>()
  for (const p of permissionList.value) {
    const key = (p.resourceType || 'API').toUpperCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  // 固定顺序：MENU → BUTTON → API，其余类型追加在后
  const ordered = ['MENU', 'BUTTON', 'API', ...groups.keys().filter((k) => !['MENU', 'BUTTON', 'API'].includes(k))]
  return ordered
    .filter((k) => groups.has(k))
    .map((k) => ({
      id: `group-${k}`,
      name: TYPE_LABEL[k] || k,
      isGroup: true,
      disabled: true,
      children: groups.get(k)!
    }))
})

/** 打开弹窗：并行拉取全量权限 + 该角色已授权 ID，并回显勾选 */
const openAssignDialog = async (role: (typeof roleList)[number]) => {
  currentRole.value = role
  dialogVisible.value = true
  treeLoading.value = true
  loadingRoleId.value = role.roleId
  try {
    // 权限树有缓存时不必重复拉取，但角色勾选每次都要查
    const [list, checkedIds] = await Promise.all([
      permissionList.value.length ? Promise.resolve(permissionList.value) : getPermissionTree(),
      getRolePermissionIds(role.roleId)
    ])
    permissionList.value = Array.isArray(list) ? list : []
    await nextTick()
    treeRef.value?.setCheckedKeys(Array.isArray(checkedIds) ? checkedIds : [], false)
  } catch (e) {
    ElMessage.error('加载权限数据失败，请稍后重试')
  } finally {
    treeLoading.value = false
    loadingRoleId.value = null
  }
}

/** 保存授权：getCheckedKeys(false) 仅取全选节点，过滤掉字符串分组 key */
const handleSave = async () => {
  if (!currentRole.value) return
  const rawKeys = (treeRef.value?.getCheckedKeys(false) || []) as Array<number | string>
  const permissionIds = rawKeys.filter((k): k is number => typeof k === 'number')
  saving.value = true
  try {
    await assignRolePermissions({ roleId: currentRole.value.roleId, permissionIds })
    ElMessage.success(`已保存「${currentRole.value.label}」的 ${permissionIds.length} 项权限，重新登录后生效`)
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const resetDialogState = () => {
  treeRef.value?.setCheckedKeys([], false)
  currentRole.value = null
}
</script>

<style scoped>
.role-page {
  padding: 4px 8px 24px;
}
.page-header {
  margin-bottom: 20px;
}
.page-title {
  margin: 0 0 6px;
  font-size: 20px;
}
.page-desc {
  margin: 0;
  color: #8a94a6;
  font-size: 13px;
}
.role-card {
  margin-bottom: 16px;
}
.role-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.role-avatar {
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  color: #fff;
  font-size: 20px;
  flex-shrink: 0;
}
.role-name {
  font-size: 16px;
  font-weight: 600;
}
.role-code {
  font-size: 12px;
  color: #8a94a6;
}
.role-desc {
  margin: 12px 0 14px;
  font-size: 13px;
  color: #5a6478;
  min-height: 38px;
}
.assign-btn {
  width: 100%;
}
.tree-wrap {
  min-height: 220px;
}
.tree-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.tip-text {
  font-size: 12px;
  color: #8a94a6;
}
.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.group-icon {
  color: #4dabf7;
}
.group-name {
  font-weight: 600;
}
.leaf-name {
  color: #303133;
}
.leaf-code {
  font-size: 12px;
  color: #8a94a6;
  font-family: Consolas, Monaco, monospace;
}
.leaf-api {
  font-size: 12px;
  color: #b0b8c7;
  font-family: Consolas, Monaco, monospace;
}
</style>
