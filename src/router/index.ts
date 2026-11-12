import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'
import { hasPermission } from '@/utils/permission'

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
    path: '/file-demo',
    name: 'FileDemo',
    component: () => import('@/views/FileDemoView.vue'),
    meta: { title: '文件传输演示', requiresAuth: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '首页概览',
          icon: 'HomeFilled',
          requiresAuth: true,
          roles: ['student', 'counselor', 'hr', 'admin']
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
          roles: ['student', 'counselor', 'hr', 'admin']
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
          roles: ['student', 'counselor', 'hr', 'admin']
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
          roles: ['student', 'counselor', 'admin'] // 企业HR不可见
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
          roles: ['student', 'counselor', 'hr', 'admin']
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
          roles: ['student', 'counselor', 'admin'] // 企业HR不可见
        }
      },
      // ====== 新增：树形数据结构可视化（院系/专业管理，仅管理员可见） ======
      {
        path: 'dept',
        name: 'Dept',
        component: () => import('@/views/dept/index.vue'),
        meta: {
          title: '院系专业',
          icon: 'SetUp',
          requiresAuth: true,
          roles: ['admin'] // 仅院系管理员可见与访问
        }
      },
      // ====== 新增：大数据存储中心（本地磁盘 / 数据库BLOB / 云OSS 演示，仅管理员可见） ======
      {
        path: 'storage',
        name: 'StorageManagement',
        component: () => import('@/views/storage/index.vue'),
        meta: {
          title: '大数据存储中心',
          icon: 'FolderOpened',
          requiresAuth: true,
          roles: ['admin'] // 仅院系管理员可见与访问
        }
      },
      // ====== 新增：角色权限配置（RBAC 动态授权，仅管理员可见） ======
      {
        path: 'role',
        name: 'RolePermission',
        component: () => import('@/views/role/index.vue'),
        meta: {
          title: '角色权限配置',
          icon: 'Key',
          requiresAuth: true,
          roles: ['admin'] // 仅院系管理员可见与访问
        }
      }
    ]
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '无权访问', requiresAuth: false }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// 全局前置守卫：登录态 + 页面访问权限拦截
router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const currentRole = localStorage.getItem('role') || 'student'

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - AI大学生就业服务智能体`
  }

  // 1. 未登录拦截
  if (to.meta.requiresAuth && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 2. 已登录防重回登录页
  if (to.path === '/login' && token) {
    return { path: '/' }
  }

  // 3. 角色路由权限拦截（防止手动在地址栏输入无权访问的 URL）
  const allowedRoles = (to.meta.roles as string[]) || []
  if (to.meta.requiresAuth && allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
    return { path: '/dashboard' } // 没权限就踢回首页概览
  }

  // 4. 权限点拦截（后端 RBAC：路由声明了 meta.permission 时必须通过权限校验）
  const requiredPerm = to.meta.permission as string | undefined
  if (to.meta.requiresAuth && requiredPerm && !hasPermission(requiredPerm)) {
    return { path: '/dashboard' }
  }
})

export default router
