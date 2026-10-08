<template>
  <div class="register-container">
    <div class="bg-decoration">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <div class="register-card">
      <div class="header">
        <h1 class="title">新用户注册</h1>
        <p class="subtitle">AI 大学生就业服务智能体 · 人间寻宝司</p>
      </div>

      <!-- 四类角色切换 -->
      <div class="role-switcher">
        <div
          v-for="r in roles"
          :key="r.value"
          class="role-item"
          :class="{ active: form.role === r.value }"
          @click="changeRole(r.value)"
        >
          {{ r.label }}
        </div>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleRegister">
        <!-- 通用基础字段 -->
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名 / 账号" :prefix-icon="User" clearable />
        </el-form-item>
        <el-form-item prop="realName">
          <el-input v-model="form.realName" :placeholder="getRealNamePlaceholder()" :prefix-icon="Postcard" clearable />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="设置密码（不少于 6 位）" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="再次确认密码" :prefix-icon="Lock" show-password />
        </el-form-item>

        <!-- 1. 学生专属字段 -->
        <template v-if="form.role === 'student'">
          <el-form-item prop="studentId">
            <el-input v-model="form.studentId" placeholder="请输入学号（8位数字）" :prefix-icon="Collection" clearable />
          </el-form-item>
          <el-form-item prop="major">
            <el-input v-model="form.major" placeholder="请输入专业（如：软件工程）" :prefix-icon="Reading" clearable />
          </el-form-item>
        </template>

        <!-- 2. 辅导员专属字段 -->
        <template v-else-if="form.role === 'counselor'">
          <el-form-item prop="teacherId">
            <el-input v-model="form.teacherId" placeholder="请输入教工号" :prefix-icon="Collection" clearable />
          </el-form-item>
          <el-form-item prop="department">
            <el-input v-model="form.department" placeholder="所带院系 / 班级（如：信息工程学院）" :prefix-icon="OfficeBuilding" clearable />
          </el-form-item>
        </template>

        <!-- 3. 企业HR专属字段 -->
        <template v-else-if="form.role === 'hr'">
          <el-form-item prop="company">
            <el-input v-model="form.company" placeholder="请输入所属企业全称" :prefix-icon="OfficeBuilding" clearable />
          </el-form-item>
          <el-form-item prop="industry">
            <el-input v-model="form.industry" placeholder="所属行业（如：互联网/金融）" :prefix-icon="Briefcase" clearable />
          </el-form-item>
        </template>

        <!-- 4. 院系管理员专属字段 -->
        <template v-else-if="form.role === 'admin'">
          <el-form-item prop="adminCode">
            <el-input v-model="form.adminCode" placeholder="请输入管理员注册邀请码" :prefix-icon="Lock" clearable />
          </el-form-item>
          <el-form-item prop="department">
            <el-input v-model="form.department" placeholder="管辖院系（如：计算机学院）" :prefix-icon="OfficeBuilding" clearable />
          </el-form-item>
        </template>
      </el-form>

      <el-button type="primary" class="submit-btn" :loading="loading" @click="handleRegister">
        {{ loading ? '正在注册...' : '立即注册并完成认证' }}
      </el-button>

      <div class="footer">
        已有账号？
        <el-link type="primary" :underline="false" @click="$router.push('/login')">直接登录</el-link>
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
  Postcard,
  OfficeBuilding,
  Collection,
  Reading,
  Briefcase
} from '@element-plus/icons-vue'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const roles = [
  { label: '学生', value: 'student' },
  { label: '辅导员', value: 'counselor' },
  { label: '企业HR', value: 'hr' },
  { label: '院系管理员', value: 'admin' }
]

const form = reactive({
  role: 'student',
  username: '',
  realName: '',
  password: '',
  confirmPassword: '',
  // 角色专属
  studentId: '',
  major: '',
  teacherId: '',
  department: '',
  company: '',
  industry: '',
  adminCode: ''
})

const changeRole = (roleValue: string) => {
  form.role = roleValue
  formRef.value?.clearValidate()
}

const getRealNamePlaceholder = () => {
  if (form.role === 'student') return '学生真实姓名'
  if (form.role === 'counselor') return '辅导员姓名'
  if (form.role === 'hr') return 'HR / 招聘负责人姓名'
  return '管理员姓名'
}

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少 3 个字符', trigger: 'blur' }
  ],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  studentId: [{ required: true, message: '学号不能为空', trigger: 'blur' }],
  major: [{ required: true, message: '专业不能为空', trigger: 'blur' }],
  teacherId: [{ required: true, message: '教工号不能为空', trigger: 'blur' }],
  department: [{ required: true, message: '院系信息不能为空', trigger: 'blur' }],
  company: [{ required: true, message: '企业全称不能为空', trigger: 'blur' }],
  industry: [{ required: true, message: '所属行业不能为空', trigger: 'blur' }],
  adminCode: [{ required: true, message: '管理员注册必须输入校验码', trigger: 'blur' }]
}

const handleRegister = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      // 模拟注册写入，联调时替换为真实的 POST /api/auth/register
      await new Promise((resolve) => setTimeout(resolve, 800))

      // 注册成功后暂存角色与用户名，跳回登录页自动填充
      localStorage.setItem('registered_username', form.username)
      localStorage.setItem('registered_role', form.role)

      ElMessage.success('注册成功！已为您转至登录')
      router.push('/login')
    } catch {
      ElMessage.error('注册遇到问题，请重试')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.register-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 720px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.blob-1 {
  width: 380px;
  height: 380px;
  background: #ff6ec4;
  top: -80px;
  left: -80px;
}

.blob-2 {
  width: 440px;
  height: 440px;
  background: #4facfe;
  bottom: -100px;
  right: -80px;
}

.register-card {
  position: relative;
  z-index: 10;
  width: 440px;
  margin: 30px 0;
  padding: 34px 36px 26px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(20px);
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: 2px;
}

.subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
}

.role-switcher {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 20px;
  padding: 5px;
  background: #f4f6fa;
  border-radius: 10px;
}

.role-item {
  padding: 8px 0;
  text-align: center;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.role-item:hover {
  color: #2575fc;
}

.role-item.active {
  color: #fff;
  font-weight: 600;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  box-shadow: 0 4px 10px rgba(37, 117, 252, 0.3);
}

.submit-btn {
  width: 100%;
  height: 44px;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  transition: all 0.25s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(37, 117, 252, 0.35);
}

.footer {
  margin-top: 14px;
  text-align: center;
  font-size: 13px;
  color: #909399;
}
</style>
