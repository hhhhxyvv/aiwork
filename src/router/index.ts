import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'
import { canAccessPath, getLandingPath, pagePermissions } from '@/utils/permission'
import { refreshSession, userSession, clearSession } from '@/store/user'

// 路由记录
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { title: '注册', requiresAuth: false }
  },
  {
    // 手机扫码后打开的确认页：票据号在 query.ticket 中，页面自身判断手机端是否已登录
    path: '/scan-login',
    name: 'ScanLogin',
    component: () => import('@/views/auth/ScanLogin.vue'),
    meta: { title: '扫码确认', requiresAuth: false }
  },
  {
    path: '/file-demo',
    name: 'FileDemo',
    component: () => import('@/views/FileDemoView.vue'),
    meta: { title: '文件传输演示', requiresAuth: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: () => getLandingPath(),
    children: [
      { path: 'pending-authorization', name: 'PendingAuthorization', component: () => import('@/views/auth/PendingAuthorization.vue'), meta: { title: '等待授权', requiresAuth: true, hidden: true } },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '首页概览',
          icon: 'HomeFilled',
          requiresAuth: true,
        }
      },
      {
        path: 'resume',
        name: 'Resume',
        component: () => import('@/views/resume/index.vue'),
        meta: {
          title: '简历中心',
          icon: 'Document',
          requiresAuth: true,
        }
      },
      {
        path: 'job',
        name: 'Job',
        component: () => import('@/views/job/index.vue'),
        meta: {
          title: '岗位推荐',
          icon: 'Briefcase',
          requiresAuth: true,
        }
      },
      {
        path: 'interview',
        name: 'Interview',
        component: () => import('@/views/interview/index.vue'),
        meta: {
          title: '面试辅导',
          icon: 'ChatLineRound',
          requiresAuth: true,
        }
      },
      {
        path: 'practice',
        name: 'Practice',
        component: () => import('@/views/practice/index.vue'),
        meta: {
          title: '实习实践',
          icon: 'OfficeBuilding',
          requiresAuth: true,
        }
      },
      {
        path: 'policy',
        name: 'Policy',
        component: () => import('@/views/policy/index.vue'),
        meta: {
          title: '就业政策',
          icon: 'Reading',
          requiresAuth: true,
        }
      },
      // ====== 新增：树形数据结构可视化（院系/专业管理，按功能权限显示） ======
      {
        path: 'dept',
        name: 'Dept',
        component: () => import('@/views/dept/index.vue'),
        meta: {
          title: '院系专业',
          icon: 'SetUp',
          requiresAuth: true,
        }
      },
      // ====== 新增：大数据存储中心（本地磁盘 / 数据库BLOB / 云OSS 演示，按功能权限显示） ======
      {
        path: 'storage',
        name: 'StorageManagement',
        component: () => import('@/views/storage/index.vue'),
        meta: {
          title: '大数据存储中心',
          icon: 'FolderOpened',
          requiresAuth: true,
        }
      },
      // ====== 新增：角色权限配置（RBAC 动态授权，按功能权限显示） ======
      {
        path: 'role',
        name: 'RolePermission',
        component: () => import('@/views/role/index.vue'),
        meta: {
          title: '角色权限配置',
          icon: 'Key',
          requiresAuth: true,
        }
      }
    ]
  },
  {
    path: '/403',
    name: 'Forbidden',
    redirect: '/pending-authorization'
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: () => getLandingPath()
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// 每次切页先读取服务器当前授权；首页/待授权页都是稳定终点。
router.beforeEach(async (to) => {
  if (to.meta.title) document.title = `${to.meta.title} - AI大学生就业服务智能体`
  if (to.meta.requiresAuth && !localStorage.getItem('token')) return { path: '/login' }
  if (to.meta.requiresAuth || (to.path === '/login' && localStorage.getItem('token'))) {
    await refreshSession()
    if (!localStorage.getItem('token')) return to.path === '/login' ? true : { path: '/login' }
    if (to.path === '/login') return getLandingPath()
    if (to.path === '/pending-authorization' && getLandingPath() !== to.path) return getLandingPath()
    if (pagePermissions[to.path] && !canAccessPath(to.path)) return getLandingPath()
  }
})

// 窗口回到前台及拦截器刷新会话后，撤销当前页面访问权。
async function syncCurrentAccess() {
  await refreshSession()
  const current = router.currentRoute.value
  if (current.meta.requiresAuth && !localStorage.getItem('token')) { await router.replace('/login'); return }
  if (current.meta.requiresAuth && pagePermissions[current.path] && !canAccessPath(current.path)) await router.replace(getLandingPath())
  else if (current.path === '/pending-authorization' && userSession.ready && getLandingPath() !== current.path) await router.replace(getLandingPath())
}
window.addEventListener('focus', () => { if (localStorage.getItem('token')) void syncCurrentAccess() })
window.addEventListener('session-refreshed', () => {
  const current = router.currentRoute.value
  if (current.meta.requiresAuth && pagePermissions[current.path] && !canAccessPath(current.path)) void router.replace(getLandingPath())
})
window.addEventListener('storage', (event) => { if (event.key === 'token') { clearSession(false); void syncCurrentAccess() } })
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && localStorage.getItem('token')) void syncCurrentAccess() })
export default router
