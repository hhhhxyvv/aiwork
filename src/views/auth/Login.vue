<template>
  <div class="login-container">
    <!-- 登录卡片 -->
    <div class="login-card">
      <!-- 标题区 -->
      <div class="header">
        <div class="logo">
          <el-icon><Compass /></el-icon>
        </div>
        <h1 class="title">AI大学生就业服务智能体</h1>
      </div>

      <!-- 角色切换 -->
      <div class="role-switcher">
        <div
          v-for="role in roles"
          :key="role.value"
          class="role-item"
          :class="{ active: form.role === role.value }"
          @click="form.role = role.value"
        >
          <el-icon><component :is="role.icon" /></el-icon>
          <span>{{ role.label }}</span>
        </div>
      </div>

      <!-- 表单 -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            :type="passwordVisible ? 'text' : 'password'"
            placeholder="请输入密码（不少于 6 位）"
            :prefix-icon="Lock"
          >
            <template #suffix>
              <el-icon class="pwd-toggle" @click="passwordVisible = !passwordVisible">
                <View v-if="passwordVisible" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <!-- 图形验证码（防爬防刷）：输入框 + 可点击刷新的验证码图 -->
        <el-form-item prop="captchaCode">
          <div class="captcha-row">
            <el-input
              v-model="form.captchaCode"
              placeholder="请输入验证码"
              :prefix-icon="Key"
              maxlength="4"
              clearable
            />
            <el-tooltip content="点击更换" placement="top">
              <img
                v-if="captchaImg"
                :src="captchaImg"
                alt="验证码"
                class="captcha-img"
                @click="fetchCaptcha"
              />
              <div v-else class="captcha-img captcha-loading" @click="fetchCaptcha">加载中</div>
            </el-tooltip>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 底部提示 -->
      <div class="footer">
        登录即代表同意《用户服务协议》与《隐私政策》
        <div class="register-link">
          还没有账号？
          <el-link type="primary" :underline="false" @click="$router.push('/register')">立即注册</el-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { login, getCaptcha } from '@/api/auth'
import type { UserRole } from '@/api/types'
import {
  User,
  Lock,
  Key,
  View,
  Hide,
  Compass,
  Reading,
  Briefcase,
  OfficeBuilding
} from '@element-plus/icons-vue'

const router = useRouter()

// 角色列表
const roles = [
  { label: '学生', value: 'student', icon: Reading },
  { label: '辅导员', value: 'counselor', icon: User },
  { label: '企业HR', value: 'hr', icon: Briefcase },
  { label: '院系管理员', value: 'admin', icon: OfficeBuilding }
]

// 表单数据
const form = reactive({
  role: 'student',
  username: '',
  password: '',
  captchaKey: '',
  captchaCode: ''
})

// 图形验证码图片（base64 dataURL）
const captchaImg = ref('')

// 密码显示切换
const passwordVisible = ref(false)
// 加载状态
const loading = ref(false)
// 表单引用
const formRef = ref<FormInstance>()

// 表单校验规则
const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, message: '用户名至少 2 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  captchaCode: [
    { required: true, message: '请输入图形验证码', trigger: 'blur' },
    { min: 4, max: 4, message: '验证码为 4 位', trigger: 'blur' }
  ]
}

// 获取/刷新图形验证码：GET /auth/captcha → { captchaKey, captchaImg }
const fetchCaptcha = async () => {
  try {
    const res = await getCaptcha()
    form.captchaKey = res?.captchaKey || ''
    captchaImg.value = res?.captchaImg || ''
  } catch {
    // 验证码加载失败不阻断页面，图片区显示可点击重试的占位
    form.captchaKey = ''
    captchaImg.value = ''
  }
}

// 页面加载即请求验证码
onMounted(() => {
  fetchCaptcha()
})

// 登录处理：调用真实后端 /auth/login 获取有效 JWT
const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const res = await login({
        username: form.username,
        password: form.password,
        role: form.role as UserRole,
        captchaKey: form.captchaKey,
        captchaCode: form.captchaCode
      })

      // 存入 localStorage（对齐后端 userInfo 新契约：department / className 替代 deptId）
      // RBAC：roles/permissions 数组以 JSON 持久化；role 保留 roles[0] 向后兼容老代码
      const backendRoles: string[] = res.roles && res.roles.length > 0 ? res.roles : [res.role || form.role]
      localStorage.setItem('token', res.token)
      localStorage.setItem('roles', JSON.stringify(backendRoles))
      localStorage.setItem('permissions', JSON.stringify(res.permissions || []))
      localStorage.setItem('role', backendRoles[0] || form.role)
      localStorage.setItem('username', res.userInfo?.name || form.username)
      localStorage.setItem('department', res.userInfo?.department || '')
      localStorage.setItem('className', res.userInfo?.className || '')

      ElMessage.success('登录成功，正在跳转...')
      // 支持登录后回跳到原本想去的页面
      const redirect = (router.currentRoute.value.query.redirect as string) || '/'
      router.push(redirect)
    } catch {
      // 请求拦截器已统一弹错（验证码错误/过期 400、密码错误、后端不可用等）
      // 登录失败自动刷新验证码并清空已输入的验证码
      form.captchaCode = ''
      fetchCaptcha()
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 640px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: url('/image/login-bg.jpg') center center / cover no-repeat;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 登录卡片 */
.login-card {
  position: relative;
  z-index: 10;
  width: 420px;
  padding: 40px 36px 28px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(20px);
  animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 标题区 */
.header {
  text-align: center;
  margin-bottom: 28px;
}

.logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #fff;
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  border-radius: 18px;
  box-shadow: 0 8px 20px rgba(77, 171, 247, 0.35);
}

.title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: 2px;
}

.subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
  letter-spacing: 1px;
}

/* 角色切换 */
.role-switcher {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 24px;
  padding: 6px;
  background: #f5f7fa;
  border-radius: 12px;
}

.role-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.25s ease;
}

.role-item .el-icon {
  font-size: 18px;
}

.role-item:hover {
  color: #4dabf7;
  background: #fff;
}

.role-item.active {
  color: #fff;
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  box-shadow: 0 4px 12px rgba(77, 171, 247, 0.35);
}

/* 表单 */
.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 12px;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4dabf7 inset;
}

.pwd-toggle {
  cursor: pointer;
  color: #909399;
  transition: color 0.2s;
}

.pwd-toggle:hover {
  color: #4dabf7;
}

/* 图形验证码行：输入框 + 验证码图 */
.captcha-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.captcha-row .el-input {
  flex: 1;
}

.captcha-img {
  width: 118px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  object-fit: cover;
  background: #fff;
  transition: border-color 0.2s;
}

.captcha-img:hover {
  border-color: #4dabf7;
}

.captcha-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(77, 171, 247, 0.4);
}

.login-btn:active {
  transform: translateY(0);
}

/* 底部 */
.footer {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #c0c4cc;
}

.register-link {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
}

/* 响应式 */
@media (max-width: 480px) {
  .login-card {
    width: 92vw;
    padding: 32px 20px 20px;
  }

  .title {
    font-size: 22px;
  }

  .role-item {
    font-size: 11px;
  }
}
</style>
