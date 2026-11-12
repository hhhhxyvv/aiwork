import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import { vPermission } from '@/utils/permission'

const app = createApp(App)

// 全局注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局注册 RBAC 权限指令：v-permission="'xxx:yyy'"
app.directive('permission', vPermission)

app.use(ElementPlus)
app.use(router)
app.mount('#app')
