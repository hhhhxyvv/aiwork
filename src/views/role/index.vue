<template>
  <div v-loading="rolesLoading" class="role-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">角色权限配置</h2>
        <p class="page-desc">选择角色并配置权限，保存后重新登录可更新页面权限。</p>
      </div>
    </div>

    <el-alert v-if="rolesError" :title="rolesError" type="error" :closable="false">
      <el-button link type="primary" @click="loadRoles">重新加载</el-button>
    </el-alert>
    <el-empty v-else-if="!rolesLoading && roleList.length === 0" description="暂无角色" />

    <!-- 角色 ID 和名称直接使用后端数据，避免向错误角色提交授权。 -->
    <el-row :gutter="20">
      <el-col v-for="r in roleList" :key="r.id" :span="6">
        <el-card shadow="hover" class="role-card">
          <div class="role-head">
            <el-avatar :size="46" class="role-avatar">{{ r.roleName.charAt(0) }}</el-avatar>
            <div class="role-meta">
              <div class="role-name">{{ r.roleName }}</div>
              <div class="role-code">roleId: {{ r.id }}</div>
            </div>
          </div>
          <div class="role-desc">{{ r.roleCode }}</div>
          <el-button
            type="primary"
            class="assign-btn"
            :icon="Key"
            :loading="loadingRoleId === r.id"
            :disabled="treeLoading || saving"
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
      :title="`分配权限 - ${currentRole?.roleName || ''}`"
      width="560px"
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
      @closed="resetDialogState"
    >
      <div v-loading="treeLoading" class="tree-wrap">
        <div class="tree-tip">
          当前角色：<el-tag size="small" type="primary">{{ currentRole?.roleName }}</el-tag>
          <span class="tip-text">勾选后点击保存，覆盖该角色的自定义授权</span>
        </div>

        <el-tree
          ref="treeRef"
          :data="permissionList"
          node-key="code"
          show-checkbox
          default-expand-all
          :props="{ label: 'name' }"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <span class="leaf-name">{{ data.name }}</span>
              <span class="leaf-code">{{ data.code }}</span>
            </span>
          </template>
        </el-tree>

        <el-alert v-if="permissionError" :title="permissionError" type="error" :closable="false" />
        <el-empty v-else-if="!treeLoading && permissionList.length === 0" description="后端未返回任何权限数据" :image-size="80" />
        <p class="tip-text">当前规则：清空勾选后保存，将恢复后端内置默认权限。</p>
      </div>

      <template #footer>
        <el-button :disabled="saving" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!permissionsReady || treeLoading || permissionList.length === 0" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { ElTree } from 'element-plus'
import { Key } from '@element-plus/icons-vue'
import {
  getPermissions,
  getRoles,
  assignRolePermissions,
  type PermissionVO,
  type RoleVO
} from '@/api/permission'

const roleList = ref<RoleVO[]>([])
const rolesLoading = ref(false)
const rolesError = ref('')
const treeRef = ref<InstanceType<typeof ElTree>>()
const dialogVisible = ref(false)
const treeLoading = ref(false)
const saving = ref(false)
const loadingRoleId = ref<number | null>(null)
const currentRole = ref<RoleVO | null>(null)
const permissionList = ref<PermissionVO[]>([])
const permissionsReady = ref(false)
const permissionError = ref('')
let permissionRequestId = 0

const loadRoles = async () => {
  rolesLoading.value = true
  rolesError.value = ''
  try {
    const roles = await getRoles()
    if (!Array.isArray(roles)) throw new Error('角色数据格式不正确')
    roleList.value = roles
  } catch {
    roleList.value = []
    rolesError.value = '加载角色失败，请重新加载'
  } finally {
    rolesLoading.value = false
  }
}

/** 每次打开都读取最新角色权限；后端以 code 授权，不使用权限 ID。 */
const openAssignDialog = async (role: RoleVO) => {
  const requestId = ++permissionRequestId
  currentRole.value = role
  dialogVisible.value = true
  treeLoading.value = true
  permissionsReady.value = false
  permissionError.value = ''
  permissionList.value = []
  treeRef.value?.setCheckedKeys([])
  loadingRoleId.value = role.id
  try {
    const [list, roles] = await Promise.all([getPermissions(), getRoles()])
    if (requestId !== permissionRequestId || !dialogVisible.value) return
    if (!Array.isArray(list) || !Array.isArray(roles)) throw new Error('权限数据格式不正确')
    const latestRole = roles.find((item) => item.id === role.id)
    if (!latestRole || !Array.isArray(latestRole.permissions)) throw new Error('角色不存在或权限数据不完整')
    roleList.value = roles
    currentRole.value = latestRole
    permissionList.value = list
    const availableCodes = new Set(list.map((item) => item.code))
    await nextTick()
    if (requestId !== permissionRequestId || !dialogVisible.value) return
    treeRef.value?.setCheckedKeys(latestRole.permissions.filter((code) => availableCodes.has(code)), false)
    permissionsReady.value = true
  } catch {
    if (requestId !== permissionRequestId || !dialogVisible.value) return
    permissionError.value = '加载权限数据失败，请关闭后重试'
    ElMessage.error(permissionError.value)
  } finally {
    if (requestId === permissionRequestId) {
      treeLoading.value = false
      loadingRoleId.value = null
    }
  }
}

/** PUT /system/roles/{roleId}/permissions，提交权限编码数组。 */
const handleSave = async () => {
  if (!currentRole.value || !permissionsReady.value || treeLoading.value || saving.value || !treeRef.value) return
  const role = currentRole.value
  const rawKeys = (treeRef.value?.getCheckedKeys(false) || []) as Array<number | string>
  const availableCodes = new Set(permissionList.value.map((item) => item.code))
  const permissions = rawKeys.filter((key): key is string => typeof key === 'string' && availableCodes.has(key))
  saving.value = true
  try {
    await assignRolePermissions({ roleId: role.id, permissions })
    ElMessage.success(`已保存「${role.roleName}」的权限配置，重新登录可更新页面权限`)
    dialogVisible.value = false
    await loadRoles()
  } catch {
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const resetDialogState = () => {
  ++permissionRequestId
  treeRef.value?.setCheckedKeys([], false)
  currentRole.value = null
  permissionList.value = []
  permissionsReady.value = false
  permissionError.value = ''
  treeLoading.value = false
  loadingRoleId.value = null
}

onMounted(loadRoles)
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
