<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

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
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  User,
  Lock,
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
  password: ''
})

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
  ]
}

// 登录处理
const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      // 模拟登录请求
      await new Promise((resolve) => setTimeout(resolve, 800))

      // 模拟返回的 token
      const token = 'mock-token-' + Date.now()

      // 存入 localStorage
      localStorage.setItem('token', token)
      localStorage.setItem('role', form.role)
      localStorage.setItem('username', form.username)

      ElMessage.success('登录成功，正在跳转...')
      // 支持登录后回跳到原本想去的页面
      const redirect = (router.currentRoute.value.query.redirect as string) || '/'
      router.push(redirect)
    } catch (err) {
      ElMessage.error('登录失败，请稍后重试')
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
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 背景装饰球 */
.bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float 18s ease-in-out infinite;
}

.blob-1 {
  width: 380px;
  height: 380px;
  background: #ff6ec4;
  top: -80px;
  left: -80px;
}

.blob-2 {
  width: 460px;
  height: 460px;
  background: #4facfe;
  bottom: -120px;
  right: -100px;
  animation-delay: -6s;
}

.blob-3 {
  width: 300px;
  height: 300px;
  background: #ffd86f;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -40px) scale(1.05);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.95);
  }
}

/* 登录卡片 */
.login-card {
  position: relative;
  z-index: 10;
  width: 420px;
  padding: 40px 36px 28px;
  background: rgba(255, 255, 255, 0.95);
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
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  border-radius: 18px;
  box-shadow: 0 8px 20px rgba(106, 17, 203, 0.35);
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
  color: #2575fc;
  background: #fff;
}

.role-item.active {
  color: #fff;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  box-shadow: 0 4px 12px rgba(37, 117, 252, 0.35);
}

/* 表单 */
.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 12px;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2575fc inset;
}

.pwd-toggle {
  cursor: pointer;
  color: #909399;
  transition: color 0.2s;
}

.pwd-toggle:hover {
  color: #2575fc;
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
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 117, 252, 0.4);
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
