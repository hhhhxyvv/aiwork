<template>
  <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
    <div class="logo">
      <el-icon><Compass /></el-icon>
      <span v-show="!isCollapse" class="logo-text">人间岗位寻宝司</span>
    </div>

    <el-menu
      :default-active="activeMenu"
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
        :index="item.path"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <template #title>{{ item.title }}</template>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { canAccessPath } from '@/utils/permission'

const route = useRoute()
const isCollapse = ref(false)

// 监听 Navbar 派发的折叠事件
const handleToggle = () => {
  isCollapse.value = !isCollapse.value
}

onMounted(() => {
  window.addEventListener('toggle-sidebar', handleToggle)
})

onBeforeUnmount(() => {
  window.removeEventListener('toggle-sidebar', handleToggle)
})

const menuItems = [
  { path: "/chat", title: "招聘消息", icon: "ChatDotRound" },
  { path: '/dashboard', title: '统计看板', icon: 'HomeFilled' },
  { path: '/resume', title: '简历中心', icon: 'Document' },
  { path: '/job', title: '岗位推荐', icon: 'Briefcase' },
  { path: '/interview', title: '面试辅导', icon: 'ChatLineRound' },
  { path: '/practice', title: '实习实践', icon: 'OfficeBuilding' },
  { path: '/policy', title: '就业政策', icon: 'Reading' }
]

const menuList = computed(() => menuItems.filter(item => canAccessPath(item.path)))
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.sidebar {
  background: #eef7ff;
  transition: width 0.3s;
  overflow: hidden;
  border-right: 1px solid #cbe7fd;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #1971c2;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #ddf0fe 0%, #cbe7fd 100%);
  letter-spacing: 1px;
}

.logo .el-icon {
  font-size: 24px;
}

.logo-text {
  white-space: nowrap;
}

.el-menu {
  border-right: none;
}

:deep(.el-menu-item) {
  margin: 4px 10px;
  border-radius: 8px;
  height: 46px;
}

:deep(.el-menu-item:hover) {
  background: #ddf0fe;
  color: #1971c2;
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  color: #ffffff !important;
  box-shadow: 0 3px 8px rgba(77, 171, 247, 0.35);
}
</style>
