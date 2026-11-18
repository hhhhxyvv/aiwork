<template>
  <el-header class="navbar">
    <div class="left">
      <el-icon class="collapse-btn" @click="toggleCollapse">
        <Fold v-if="!isCollapse" />
        <Expand v-else />
      </el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ route.meta.title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="right">
      <!-- 文件传输演示页跳转入口 -->
      <el-button v-if="canAccessPath('/file-demo')" link type="primary" class="demo-link" @click="router.push('/file-demo')">
        <el-icon style="margin-right: 4px"><Upload /></el-icon>文件传输演示
      </el-button>
      <el-dropdown @command="handleCommand">
        <span class="user-info">
          <el-avatar :size="32" :icon="UserFilled" />
          <span class="username">{{ username }}</span>
          <!-- 院系/班级展示（对齐新契约 userInfo.department / userInfo.className） -->
          <el-tag v-if="deptClass" size="small" type="info" effect="plain" class="dept-tag">{{ deptClass }}</el-tag>
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
  </el-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { canAccessPath } from '@/utils/permission'
import { userSession, clearSession } from '@/store/user'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 从 localStorage 读取用户名
const username = computed(() => userSession.userInfo.realName || userSession.userInfo.username || userSession.userInfo.name || '用户')

// 院系与班级（新契约：department/className 替代原 deptId，为空时不展示）
const department = computed(() => userSession.userInfo.department || '')
const className = computed(() => userSession.userInfo.className || '')
const deptClass = computed(() => [department.value, className.value].filter(Boolean).join(' · '))

// 侧边栏折叠状态（与 Sidebar 共享，简单起见用自定义事件或 store；这里通过事件总线简易实现）
const isCollapse = computed(() => false)

const toggleCollapse = () => {
  // 通知 Sidebar 切换（实际项目可通过 Pinia/事件总线）
  const event = new CustomEvent('toggle-sidebar')
  window.dispatchEvent(event)
}

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning'
    })
    clearSession()
    ElMessage.success('已退出登录')
    router.push('/login')
  } else if (command === 'profile') {
    ElMessage.info('个人中心开发中')
  }
}
</script>

<style scoped>
.navbar {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.collapse-btn:hover {
  color: #4dabf7;
}

.right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.demo-link {
  font-size: 13px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #606266;
}

.username {
  font-size: 14px;
}

.dept-tag {
  font-weight: normal;
}
</style>
