<template>
  <div v-loading="rolesLoading" class="role-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">角色权限配置</h2>
        <p class="page-desc">按模块授予功能，保存后即时生效。清空勾选将撤销该角色全部功能。</p>
      </div>
    </div>

    <el-alert v-if="rolesError" :title="rolesError" type="error" :closable="false">
      <el-button link type="primary" @click="loadRoles">重新加载</el-button>
    </el-alert>
    <el-empty v-else-if="!rolesLoading && roleList.length === 0" description="暂无角色" />

    <el-card v-if="hasPermission('sys:role:assign')" class="role-card">
      <template #header>新建角色（初始零功能权限、数据范围为本人）</template>
      <el-form inline @submit.prevent="handleCreateRole">
        <el-form-item label="角色编码"><el-input v-model="newRole.roleCode" placeholder="ROLE_CUSTOM" /></el-form-item>
        <el-form-item label="显示名称"><el-input v-model="newRole.roleName" placeholder="角色名称" /></el-form-item>
        <el-button type="primary" :loading="creating" @click="handleCreateRole">创建空权限角色</el-button>
      </el-form>
    </el-card>
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
            v-if="hasPermission('sys:role:assign')"
            type="primary"
            class="assign-btn"
            :icon="Key"
            :loading="loadingRoleId === r.id"
            :disabled="treeLoading || saving"
            @click="openAssignDialog(r)"
          >
            分配权限
          </el-button>
          <div v-if="hasPermission('sys:data-scope:assign')" style="margin-top:12px">
            <el-select v-model="r.dataScope" aria-label="角色数据范围"><el-option v-for="scope in dataScopes" :key="scope.value" :label="scope.label" :value="scope.value" /></el-select>
            <el-button link type="primary" :loading="scopeSavingId === r.id" @click="saveRoleScope(r)">保存数据范围</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="role-card">
      <template #header>账号角色与院系班级归属</template>
      <el-form inline @submit.prevent="searchUsers">
        <el-input v-model="userKeyword" clearable placeholder="搜索用户名 / 姓名" style="width:240px" />
        <el-button :loading="usersLoading" @click="searchUsers">查询</el-button>
      </el-form>
      <el-alert v-if="usersError" :title="usersError" type="error" :closable="false" />
      <el-table :data="userList" v-loading="usersLoading">
        <el-table-column prop="username" label="账号" /><el-table-column prop="realName" label="姓名" />
        <el-table-column label="状态"><template #default="{ row }">{{ row.status === 1 ? '正常' : '停用' }}</template></el-table-column>
        <el-table-column label="角色"><template #default="{ row }">{{ row.roleCodes.map((code: string) => roleList.find(r => r.roleCode === code)?.roleName || code).join(' / ') || '未分配角色' }}</template></el-table-column>
        <el-table-column label="配置" min-width="200"><template #default="{ row }">
          <el-button v-if="hasPermission('sys:role:assign')" link type="primary" @click="openUserRoles(row)">分配角色</el-button>
          <el-button v-if="hasPermission('sys:data-scope:assign')" link type="primary" @click="openUserScopes(row)">院系 / 班级归属</el-button>
        </template></el-table-column>
      </el-table>
      <el-pagination layout="prev, pager, next, total" :total="userTotal" :page-size="20" v-model:current-page="userPage" @current-change="loadUsers" />
    </el-card>
    <el-dialog v-if="hasPermission('sys:role:assign')" v-model="userRolesVisible" :title="`配置角色 - ${selectedUser?.username || ''}`" width="500px">
      <el-select v-model="selectedRoleCodes" multiple clearable style="width:100%" placeholder="可选择任意角色；清空将移除全部角色">
        <el-option v-for="r in roleList" :key="r.id" :label="`${r.roleName} (${r.roleCode})`" :value="r.roleCode" />
      </el-select>
      <template #footer><el-button @click="userRolesVisible = false">取消</el-button><el-button type="primary" :loading="userSaving" @click="saveUserRoles">保存</el-button></template>
    </el-dialog>
    <el-dialog v-if="hasPermission('sys:data-scope:assign')" v-model="userScopesVisible" :title="`配置院系班级归属 - ${selectedUser?.username || ''}`" width="620px">
      <el-alert title="范围1使用院系，范围2要求院系与班级均明确；清空归属不会获得全量数据。" type="info" :closable="false" />
      <div v-loading="userScopesLoading">
        <el-form v-for="(scope, i) in userScopes" :key="i" inline style="margin-top:12px">
          <el-input v-model="scope.department" placeholder="院系（必填）" style="width:220px" />
          <el-input v-model="scope.className" placeholder="班级（按班级范围时必填）" style="width:180px" />
          <el-button type="danger" link @click="userScopes.splice(i,1)">移除</el-button>
        </el-form>
        <el-button @click="userScopes.push({department:'',className:''})">添加归属</el-button>
      </div>
      <template #footer><el-button @click="userScopesVisible = false">取消</el-button><el-button type="primary" :disabled="!userScopesReady" :loading="userSaving" @click="saveUserScopes">保存归属</el-button></template>
    </el-dialog>
    <!-- 授权弹窗 -->
    <el-dialog
      v-if="hasPermission('sys:role:assign')"
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
          :data="permissionGroups"
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
        <p class="tip-text">清空勾选后保存，将撤销该角色的全部功能权限；其他角色的授权仍独立生效。</p>
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
import { ref, computed, nextTick, onMounted } from 'vue'
import { hasPermission } from '@/utils/permission'
import { refreshSession } from '@/store/user'
import { ElMessage } from 'element-plus'
import type { ElTree } from 'element-plus'
import { Key } from '@element-plus/icons-vue'
import {
  getUsers, createRole, assignUserRoles, updateRoleDataScope, getStudentScopes, updateStudentScopes,
  type UserVO, type StudentScope,
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
  if (!hasPermission('sys:role:assign') && !hasPermission('sys:data-scope:assign')) return
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
  if (!hasPermission('sys:role:assign')) return
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
  if (!hasPermission('sys:role:assign')) return
  if (!currentRole.value || !permissionsReady.value || treeLoading.value || saving.value || !treeRef.value) return
  const role = currentRole.value
  const rawKeys = (treeRef.value?.getCheckedKeys(false) || []) as Array<number | string>
  const availableCodes = new Set(permissionList.value.map((item) => item.code))
  const permissions = rawKeys.filter((key): key is string => typeof key === 'string' && availableCodes.has(key))
  saving.value = true
  try {
    await assignRolePermissions({ roleId: role.id, permissions })
    ElMessage.success(`已保存「${role.roleName}」的权限配置`)
    await refreshSession(true)
    window.dispatchEvent(new Event('session-refreshed'))
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

const moduleNames: Record<string,string> = { student:'学生与简历', resume:'候选人简历', job:'岗位与投递', interview:'面试辅导', internship:'实习实践', policy:'就业政策', stat:'统计看板', dept:'院系演示', storage:'存储演示', sys:'权限与数据范围' }
const permissionGroups = computed(() => {
  const groups = new Map<string, { code:string; name:string; children:PermissionVO[] }>()
  for (const p of permissionList.value) {
    const module = p.code.split(':')[0]
    if (!groups.has(module)) groups.set(module, {code:'module:' + module, name:moduleNames[module] || module, children:[]})
    groups.get(module)!.children.push(p)
  }
  return [...groups.values()]
})
const newRole = ref({roleCode:'',roleName:''})
const creating = ref(false)
async function handleCreateRole() {
  if (!hasPermission('sys:role:assign') || creating.value) return
  const data = {roleCode:newRole.value.roleCode.trim(),roleName:newRole.value.roleName.trim()}
  if (!data.roleCode || !data.roleName) return ElMessage.warning('请填写角色编码和名称')
  creating.value = true
  try { await createRole(data); newRole.value = {roleCode:'',roleName:''}; await loadRoles(); ElMessage.success('已创建零权限角色') }
  catch { ElMessage.error('创建角色失败') } finally { creating.value = false }
}
const dataScopes = [{value:1,label:'明确院系'}, {value:2,label:'明确院系 + 班级'}, {value:3,label:'本人岗位有效投递'}, {value:4,label:'本人'}]
const scopeSavingId = ref<number|null>(null)
async function saveRoleScope(role:RoleVO) {
  if (!hasPermission('sys:data-scope:assign')) return
  scopeSavingId.value = role.id
  try { await updateRoleDataScope(role.id,role.dataScope); await refreshSession(true); ElMessage.success('数据范围已更新') }
  catch { ElMessage.error('保存范围失败'); await loadRoles() } finally { scopeSavingId.value = null }
}
const userList = ref<UserVO[]>([]), userTotal = ref(0), userPage = ref(1), userKeyword = ref(''), usersLoading = ref(false), usersError = ref('')
async function loadUsers() {
  if (!hasPermission('sys:role:assign') && !hasPermission('sys:data-scope:assign')) return
  usersLoading.value = true; usersError.value = ''
  try { const page = await getUsers({keyword:userKeyword.value.trim(),pageNum:userPage.value,pageSize:20}); userList.value = page.records; userTotal.value = page.total }
  catch { userList.value = []; usersError.value = '加载账号失败，请重试' } finally { usersLoading.value = false }
}
async function searchUsers() { userPage.value = 1; await loadUsers() }
const selectedUser = ref<UserVO|null>(null), selectedRoleCodes = ref<string[]>([]), userRolesVisible = ref(false), userSaving = ref(false)
function openUserRoles(user:UserVO) { selectedUser.value = user; selectedRoleCodes.value = [...user.roleCodes]; userRolesVisible.value = true }
async function saveUserRoles() {
  if (!hasPermission('sys:role:assign') || !selectedUser.value || userSaving.value) return
  userSaving.value = true
  try { await assignUserRoles(selectedUser.value.id,selectedRoleCodes.value); userRolesVisible.value = false; await refreshSession(true); await loadUsers(); ElMessage.success('账号角色已更新'); window.dispatchEvent(new Event('session-refreshed')) }
  catch { ElMessage.error('保存角色失败') } finally { userSaving.value = false }
}
const userScopes = ref<StudentScope[]>([]), userScopesVisible = ref(false), userScopesLoading = ref(false), userScopesReady = ref(false)
async function openUserScopes(user:UserVO) {
  if (!hasPermission('sys:data-scope:assign')) return
  selectedUser.value = user; userScopes.value = []; userScopesReady.value = false; userScopesVisible.value = true; userScopesLoading.value = true
  try { const result = await getStudentScopes(user.id); if (!Array.isArray(result)) throw new Error('归属列表格式不正确'); if (selectedUser.value?.id === user.id) { userScopes.value = result; userScopesReady.value = true } }
  catch { ElMessage.error('读取归属失败，请关闭后重试') } finally { userScopesLoading.value = false }
}
async function saveUserScopes() {
  if (!hasPermission('sys:data-scope:assign') || !selectedUser.value || !userScopesReady.value || userSaving.value) return
  if (userScopes.value.some(s => !s.department.trim())) return ElMessage.warning('每条归属必须填写院系')
  userSaving.value = true
  try { await updateStudentScopes(selectedUser.value.id, userScopes.value.map(s => ({department:s.department.trim(),className:s.className.trim()}))); userScopesVisible.value = false; await refreshSession(true); ElMessage.success('院系班级归属已更新') }
  catch { ElMessage.error('保存归属失败') } finally { userSaving.value = false }
}
onMounted(async () => { await loadRoles(); await loadUsers() })
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
