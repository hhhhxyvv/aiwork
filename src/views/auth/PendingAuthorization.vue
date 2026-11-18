<template>
  <el-result icon="info" title="等待功能授权" :sub-title="userSession.error || '当前账号尚无可访问的功能，请联系权限管理员分配角色和功能。'">
    <template #extra><el-button type="primary" :loading="loading" @click="retry">刷新权限</el-button></template>
  </el-result>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { refreshSession, userSession } from '@/store/user'
import { getLandingPath } from '@/utils/permission'
const router = useRouter()
const loading = ref(false)
async function retry() { loading.value = true; try { await refreshSession(); await router.replace(getLandingPath()) } finally { loading.value = false } }
</script>
