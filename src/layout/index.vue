<!-- src/layout/index.vue -->
<template>
  <div class="app-layout">
    <!-- 左侧可折叠侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapse }">
      <div class="logo-area">
        <el-icon class="logo-icon"><Compass /></el-icon>
        <span v-show="!isCollapse" class="logo-text">AI就业智能体</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="menu-vertical"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#eef7ff"
        text-color="#5a7ba6"
        active-text-color="#ffffff"
      >
        <el-menu-item
          v-for="item in menuList"
          :key="item.path"
          :index="'/' + item.path"
        >
          <el-icon><component :is="item.meta?.icon as string" /></el-icon>
          <template #title>{{ item.meta?.title }}</template>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧主体 -->
    <div class="main-container">
      <!-- 顶部 Navbar -->
      <header class="navbar">
        <div class="nav-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentRouteTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="nav-right">
          <el-tag effect="dark" type="primary" class="role-badge">
            {{ roleNameMap[currentRole] || '未知角色' }}
          </el-tag>
          <el-dropdown @command="handleCommand">
            <span class="user-profile">
              <el-avatar :size="32" class="user-avatar">
                <el-icon><UserFilled /></el-icon>
              </el-avatar>
              <span class="username">{{ currentUsername }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 主体内容区 -->
      <main class="content-body">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { routes } from '@/router'
import { hasPermission } from '@/utils/permission'
import {
  Compass,
  DataAnalysis,
  Document,
  Briefcase,
  OfficeBuilding,
  ChatDotRound,
  Reading,
  Fold,
  Expand,
  ArrowDown,
  UserFilled,
  Key
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 折叠状态
const isCollapse = ref(false)

// 从 localStorage 读取用户信息
const currentRole = computed(() => localStorage.getItem('role') || 'student')
const currentUsername = ref(localStorage.getItem('username') || '测试同学')

// 角色名称映射
const roleNameMap: Record<string, string> = {
  student: '学生',
  counselor: '辅导员',
  hr: '企业 HR',
  admin: '院系管理员'
}

// 过滤出当前角色有权看到的菜单列表（从路由表读取）
const menuList = computed(() => {
  const layoutRoute = routes.find((r) => r.path === '/')
  if (!layoutRoute || !layoutRoute.children) return []

  return layoutRoute.children.filter((item) => {
    // 1) 优先兼容 meta.roles：声明了角色列表则必须包含当前角色
    const itemRoles = (item.meta?.roles as string[]) || []
    if (itemRoles.length > 0 && !itemRoles.includes(currentRole.value)) return false
    // 2) 声明了 meta.permission：必须通过权限点校验（后端 RBAC）
    const requiredPerm = item.meta?.permission as string | undefined
    if (requiredPerm && !hasPermission(requiredPerm)) return false
    return true
  })
})

// 当前激活菜单
const activeMenu = computed(() => route.path)
// 当前路由标题
const currentRouteTitle = computed(() => (route.meta.title as string) || '工作台')

// 下拉菜单命令处理
const handleCommand = (command: string) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出当前系统吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        // 完整清理登录态与 RBAC 缓存（与 Login.vue 写入的 key 一一对应）
        const keys = ['token', 'role', 'roles', 'permissions', 'username', 'department', 'className', 'userId', 'realName']
        keys.forEach((k) => localStorage.removeItem(k))
        ElMessage.success('已安全退出')
        router.push('/login')
      })
      .catch(() => {})
  } else if (command === 'profile') {
    ElMessage.info('个人中心开发中')
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f3f4f6;
}

/* 侧边栏 */
.sidebar {
  width: 220px;
  height: 100%;
  background-color: #eef7ff;
  border-right: 1px solid #cbe7fd;
  display: flex;
  flex-direction: column;
  transition: width 0.28s ease;
  user-select: none;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 64px;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
  background: linear-gradient(135deg, #ddf0fe 0%, #cbe7fd 100%);
  border-bottom: 1px solid #cbe7fd;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 26px;
  color: #1971c2;
  flex-shrink: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #1971c2;
  white-space: nowrap;
  letter-spacing: 1px;
}

.menu-vertical {
  flex: 1;
  border-right: none;
}

:deep(.el-menu-item) {
  margin: 4px 10px;
  border-radius: 8px;
  height: 46px;
}

:deep(.el-menu-item:hover) {
  background: #ddf0fe !important;
  color: #1971c2 !important;
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 3px 8px rgba(77, 171, 247, 0.35);
}

/* 右侧主体 */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 顶部导航 */
.navbar {
  height: 60px;
  background: linear-gradient(135deg, #eef7ff 0%, #ddf0fe 100%);
  border-bottom: 1px solid #cbe7fd;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #4b5563;
  transition: color 0.2s;
}

.collapse-btn:hover {
  color: #4dabf7;
}

.breadcrumb {
  font-size: 14px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.role-badge {
  font-size: 12px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-avatar {
  background-color: #4dabf7;
}

.username {
  font-size: 14px;
  color: #374151;
}

/* 内容区 */
.content-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
</style>
