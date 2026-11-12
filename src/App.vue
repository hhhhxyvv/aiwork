<template>
  <router-view />
</template>

<script setup lang="ts"></script>

<style>
/* ==================== 全局主题：浅蓝色主色调 ==================== */
/* 覆盖 Element Plus 主色变量，登录后所有页面的按钮/链接/开关/分页等统一为浅蓝 */
:root {
  --el-color-primary: #4dabf7;
  --el-color-primary-light-3: #7fc3f9;
  --el-color-primary-light-5: #a5d6fb;
  --el-color-primary-light-7: #cbe7fd;
  --el-color-primary-light-8: #ddf0fe;
  --el-color-primary-light-9: #eef7ff;
  --el-color-primary-dark-2: #3c98e0;
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>
