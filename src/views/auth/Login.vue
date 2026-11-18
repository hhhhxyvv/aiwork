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

      <!-- 登录方式页签 -->
      <div class="login-tabs">
        <div
          class="tab-item"
          :class="{ active: loginMode === 'account' }"
          @click="switchLoginMode('account')"
        >
          账号登录
        </div>
        <div
          class="tab-item"
          :class="{ active: loginMode === 'qrcode' }"
          @click="switchLoginMode('qrcode')"
        >
          扫码登录
        </div>
        <div
          class="tab-item"
          :class="{ active: loginMode === 'email' }"
          @click="switchLoginMode('email')"
        >
          邮箱登录
        </div>
      </div>

      <!-- 表单 -->
      <el-form
        v-show="loginMode === 'account'"
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

      <!-- 扫码登录面板：手机扫描后打开确认页，手机确认后本页自动登录 -->
      <div v-show="loginMode === 'qrcode'" class="qr-panel">
        <div class="qr-box">
          <img
            v-if="qrImg && qrStatus !== 'EXPIRED' && qrStatus !== 'CANCELED'"
            :src="qrImg"
            class="qr-img"
            alt="登录二维码"
          />
          <div v-else class="qr-placeholder" @click="createQr">
            <el-icon><Refresh /></el-icon>
            <span>{{ qrLoading ? '二维码生成中…' : '二维码已失效，点击刷新' }}</span>
          </div>
          <!-- 已扫码：提示回到手机上确认 -->
          <div v-if="qrStatus === 'SCANNED'" class="qr-mask">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>已扫码，请在手机上确认</span>
          </div>
        </div>

        <p class="qr-tip">
          <template v-if="qrStatus === 'SCANNED'">已扫码，请在手机上点击“确认登录”</template>
          <template v-else-if="qrStatus === 'CONFIRMED'">登录成功，正在跳转…</template>
          <template v-else-if="qrLoading">正在生成二维码…</template>
          <template v-else-if="qrStatus === 'EXPIRED'">二维码已失效，点击上方重新生成</template>
          <template v-else-if="qrStatus === 'CANCELED'">手机端已取消登录，点击上方重新生成</template>
          <template v-else>请使用手机扫描二维码，{{ qrRemain }} 秒内有效</template>
        </p>

        <!-- 二维码实际指向的地址：手机访问不到时据此排查 -->
        <p class="qr-url" :title="qrScanUrl">{{ qrScanUrl }}</p>
        <p v-if="qrOriginWarn" class="qr-warn">
          当前通过 localhost 打开本页，手机访问不到该地址。请改用本机局域网地址访问登录页，或在该地址基础上重新生成二维码。
        </p>
      </div>

      <!-- 邮箱验证码登录面板：验证码真实发送到邮箱，仅支持已绑定账号的邮箱 -->
      <div v-show="loginMode === 'email'" class="email-panel">
        <el-form
          ref="emailFormRef"
          :model="emailForm"
          :rules="emailRules"
          size="large"
          class="login-form"
          @keyup.enter="handleEmailLogin"
        >
          <el-form-item prop="email">
            <el-input
              v-model="emailForm.email"
              placeholder="请输入已绑定账号的邮箱"
              :prefix-icon="Message"
              clearable
            />
          </el-form-item>

          <el-form-item prop="code">
            <div class="captcha-row">
              <el-input
                v-model="emailForm.code"
                placeholder="请输入 6 位邮箱验证码"
                :prefix-icon="Key"
                maxlength="6"
                clearable
              />
              <el-button
                class="code-btn"
                :disabled="emailCountdown > 0"
                :loading="sending"
                @click="handleSendCode"
              >
                {{ emailCountdown > 0 ? `${emailCountdown}s 后重发` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              class="login-btn"
              :loading="emailLoading"
              @click="handleEmailLogin"
            >
              {{ emailLoading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <p class="email-tip">
          验证码会真实发送到该邮箱，5 分钟内有效、仅可使用一次；当前仅支持已绑定系统账号的邮箱。
        </p>
      </div>

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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { login, getCaptcha, getQrTicket, getQrStatus, sendEmailCode, loginByEmail } from '@/api/auth'
// 二维码渲染：把后端下发的扫码地址画成二维码图片，纯前端完成，不依赖第三方图片接口
import QRCode from 'qrcode'
import {
  User,
  Lock,
  Key,
  View,
  Hide,
  Compass,
  Refresh,
  Loading,
  Message
} from '@element-plus/icons-vue'

const router = useRouter()

// 系统支持的合法角色集合（与路由守卫 meta.roles / dashboard 四套工作台保持一致）
const VALID_ROLES = ['student', 'counselor', 'hr', 'admin']

// 表单数据（角色由后端根据账号密码查询返回，登录页不再选择）
const form = reactive({
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
      // 角色由后端根据账号密码查询返回，前端不发送 roleCode
      const res = await login({
        username: form.username,
        password: form.password,
        captchaKey: form.captchaKey,
        captchaCode: form.captchaCode
      })

      // 按项目现有解析方式读取后端 RBAC 字段：roles 优先，回退 role
      const backendRoles: string[] = res.roles && res.roles.length > 0 ? res.roles : [res.role || '']
      const mainRole = (backendRoles[0] || '').toLowerCase()

      // 后端角色不在系统支持映射中：提示并保持在登录页，不进入错误工作台
      if (!VALID_ROLES.includes(mainRole)) {
        ElMessage.error(`未能识别该账号的角色（${mainRole || '空'}），请联系管理员检查角色配置`)
        form.captchaCode = ''
        fetchCaptcha()
        return
      }

      // 存入 localStorage（对齐后端 userInfo 新契约：department / className 替代 deptId）
      // RBAC：roles/permissions 数组以 JSON 持久化；role 保留 roles[0] 向后兼容老代码
      localStorage.setItem('token', res.token)
      localStorage.setItem('roles', JSON.stringify(backendRoles))
      localStorage.setItem('permissions', JSON.stringify(res.permissions || []))
      localStorage.setItem('role', mainRole)
      localStorage.setItem('username', res.userInfo?.name || form.username)
      localStorage.setItem('department', res.userInfo?.department || '')
      localStorage.setItem('className', res.userInfo?.className || '')

      ElMessage.success('登录成功，正在跳转...')
      // 复用现有跳转逻辑：/ 重定向到 /dashboard，由 dashboard 按真实角色渲染对应工作台；
      // 带 redirect 参数时回跳原目标页（路由守卫 meta.roles 会做二次校验）
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

/* ==================== 扫码登录 ==================== */
type QrState = 'PENDING' | 'SCANNED' | 'CONFIRMED' | 'CANCELED' | 'EXPIRED'

// 当前登录方式：账号表单 / 扫码 / 邮箱验证码
const loginMode = ref<'account' | 'qrcode' | 'email'>('account')
// 二维码图片（dataURL，由 qrcode 库在前端生成）
const qrImg = ref('')
// 二维码是否正在生成
const qrLoading = ref(false)
// 二维码状态
const qrStatus = ref<QrState>('PENDING')
// 剩余有效秒数（后端下发 TTL，前端本地倒计时）
const qrRemain = ref(0)
// 二维码实际指向的地址（供手机访问与排查）
const qrScanUrl = ref('')
// 地址是否为回环地址（手机访问不到，需要提示用户换成局域网地址）
const qrOriginWarn = ref(false)

// 当前票据号与两个定时器（轮询、倒计时）
let currentTicket = ''
let pollTimer: number | null = null
let countTimer: number | null = null

// 轮询间隔：2 秒；倒计时 1 秒
const POLL_INTERVAL = 2000

/** 停止轮询与倒计时（切换方式、登录成功、页面卸载时都要清掉，避免定时器泄漏） */
const stopQrTasks = () => {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
  if (countTimer !== null) {
    window.clearInterval(countTimer)
    countTimer = null
  }
}

/** 判断地址是否指向本机回环地址（手机无法访问） */
const isLoopbackUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
  } catch {
    return false
  }
}

/**
 * 计算二维码内容
 * 用局域网 IP 打开登录页时以当前 origin 为准（永远与用户实际访问地址一致，IP 变了也不用改配置）；
 * 用 localhost 打开时才采用后端下发的地址，此时若后端也未配置局域网地址会给出提示。
 */
const buildScanUrl = (ticket: string, backendUrl: string): string => {
  const host = window.location.hostname
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `${window.location.origin}/scan-login?ticket=${ticket}`
  }
  return backendUrl || `${window.location.origin}/scan-login?ticket=${ticket}`
}

/** 生成二维码（首次进入扫码页签、失效后点击刷新都会调用） */
const createQr = async () => {
  stopQrTasks()
  qrLoading.value = true
  qrStatus.value = 'PENDING'
  qrImg.value = ''
  try {
    const ticketVO = await getQrTicket()
    currentTicket = ticketVO.ticket
    const url = buildScanUrl(ticketVO.ticket, ticketVO.scanUrl)
    qrScanUrl.value = url
    qrOriginWarn.value = isLoopbackUrl(url)
    qrImg.value = await QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M'
    })
    qrRemain.value = ticketVO.expireSeconds || 300
    startCountdown()
    startPolling()
  } catch {
    // 出码失败（后端未启动 / 网络异常）：按失效处理，点击可重试
    qrStatus.value = 'EXPIRED'
  } finally {
    qrLoading.value = false
  }
}

/** 本地倒计时：归零即认定二维码过期，不必等后端清理 Redis */
const startCountdown = () => {
  countTimer = window.setInterval(() => {
    qrRemain.value -= 1
    if (qrRemain.value <= 0) {
      stopQrTasks()
      qrStatus.value = 'EXPIRED'
    }
  }, 1000)
}

/** 轮询票据状态：确认后取走后端一次性下发的结果并自动登录 */
const startPolling = () => {
  pollTimer = window.setInterval(async () => {
    if (!currentTicket) return
    try {
      const res = await getQrStatus(currentTicket)
      if (res.status === 'CONFIRMED' && res.login) {
        stopQrTasks()
        qrStatus.value = 'CONFIRMED'
        persistFromQr(res.login)
        return
      }
      if (res.status === 'CANCELED' || res.status === 'EXPIRED') {
        stopQrTasks()
        qrStatus.value = res.status
        return
      }
      qrStatus.value = res.status
    } catch {
      // 单次轮询失败（网络抖动）不终止轮询，继续等待下一次
    }
  }, POLL_INTERVAL)
}

/**
 * 扫码登录结果落库并跳转
 * 与账号登录保持完全一致的 key 与跳转规则，后端 RBAC 返回结构相同
 */
const persistFromQr = (res: any) => {
  const backendRoles: string[] = res.roles && res.roles.length > 0 ? res.roles : [res.role || '']
  const mainRole = (backendRoles[0] || '').toLowerCase()

  if (!VALID_ROLES.includes(mainRole)) {
    ElMessage.error(`未能识别该账号的角色（${mainRole || '空'}），请联系管理员检查角色配置`)
    qrStatus.value = 'EXPIRED'
    return
  }

  localStorage.setItem('token', res.token)
  localStorage.setItem('roles', JSON.stringify(backendRoles))
  localStorage.setItem('permissions', JSON.stringify(res.permissions || []))
  localStorage.setItem('role', mainRole)
  localStorage.setItem('username', res.userInfo?.name || '')
  localStorage.setItem('department', res.userInfo?.department || '')
  localStorage.setItem('className', res.userInfo?.className || '')

  ElMessage.success('扫码登录成功，正在跳转...')
  const redirect = (router.currentRoute.value.query.redirect as string) || '/'
  router.push(redirect)
}

/* ==================== 邮箱验证码登录 ==================== */
// 邮箱表单：邮箱 + 6 位验证码
const emailForm = reactive({
  email: '',
  code: ''
})
const emailFormRef = ref<FormInstance>()
// 验证码是否正在请求发送
const sending = ref(false)
// 登录请求中
const emailLoading = ref(false)
// 重发倒计时（秒），0 表示可以再次发送
const emailCountdown = ref(0)
let emailTimer: number | null = null

const emailRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] }
  ],
  code: [
    { required: true, message: '请输入邮箱验证码', trigger: 'blur' },
    { len: 6, message: '验证码为 6 位数字', trigger: 'blur' }
  ]
}

/** 停止重发倒计时 */
const stopEmailCountdown = () => {
  if (emailTimer !== null) {
    window.clearInterval(emailTimer)
    emailTimer = null
  }
}

/** 启动重发倒计时（时长以后端返回的 cooldownSeconds 为准） */
const startEmailCountdown = (seconds: number) => {
  stopEmailCountdown()
  emailCountdown.value = seconds
  emailTimer = window.setInterval(() => {
    emailCountdown.value -= 1
    if (emailCountdown.value <= 0) {
      stopEmailCountdown()
    }
  }, 1000)
}

/**
 * 发送邮箱验证码
 * 后端通过真实 SMTP 发信，失败会直接报错（不会出现"假发送成功"）
 */
const handleSendCode = async () => {
  if (!emailFormRef.value) return
  try {
    await emailFormRef.value.validateField('email')
  } catch {
    return
  }
  sending.value = true
  try {
    const res = await sendEmailCode(emailForm.email.trim())
    startEmailCountdown(res?.cooldownSeconds || 60)
    ElMessage.success(`验证码已发送至 ${res?.email || emailForm.email}`)
  } catch {
    // 请求拦截器已提示（邮箱未绑定账号 / 发信失败 / 发送过于频繁）
  } finally {
    sending.value = false
  }
}

/**
 * 邮箱验证码登录
 * 成功后按与账号登录完全一致的 key 写入本地会话并跳转
 */
const handleEmailLogin = async () => {
  if (!emailFormRef.value) return
  await emailFormRef.value.validate(async (valid) => {
    if (!valid) return
    emailLoading.value = true
    try {
      const res: any = await loginByEmail(emailForm.email.trim(), emailForm.code.trim())

      const backendRoles: string[] = res.roles && res.roles.length > 0 ? res.roles : [res.role || '']
      const mainRole = (backendRoles[0] || '').toLowerCase()

      if (!VALID_ROLES.includes(mainRole)) {
        ElMessage.error(`未能识别该账号的角色（${mainRole || '空'}），请联系管理员检查角色配置`)
        emailForm.code = ''
        return
      }

      localStorage.setItem('token', res.token)
      localStorage.setItem('roles', JSON.stringify(backendRoles))
      localStorage.setItem('permissions', JSON.stringify(res.permissions || []))
      localStorage.setItem('role', mainRole)
      localStorage.setItem('username', res.userInfo?.name || emailForm.email)
      localStorage.setItem('department', res.userInfo?.department || '')
      localStorage.setItem('className', res.userInfo?.className || '')

      ElMessage.success('登录成功，正在跳转...')
      const redirect = (router.currentRoute.value.query.redirect as string) || '/'
      router.push(redirect)
    } catch {
      // 请求拦截器已提示（验证码错误/过期），清空验证码便于重新输入
      emailForm.code = ''
    } finally {
      emailLoading.value = false
    }
  })
}

/** 切换登录方式：进入扫码时出码，切到其他方式时停掉扫码定时器 */
const switchLoginMode = (mode: 'account' | 'qrcode' | 'email') => {
  if (loginMode.value === mode) return
  loginMode.value = mode
  if (mode === 'qrcode') {
    createQr()
  } else {
    stopQrTasks()
  }
}

// 离开登录页时清理所有定时器
onUnmounted(() => {
  stopQrTasks()
  stopEmailCountdown()
})
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

/* 登录方式页签 */
.login-tabs {
  display: flex;
  margin-bottom: 22px;
  padding: 4px;
  background: #f2f7fd;
  border-radius: 10px;
}

.tab-item {
  flex: 1;
  padding: 9px 0;
  font-size: 14px;
  color: #606266;
  text-align: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.tab-item:hover {
  color: #4dabf7;
}

.tab-item.active {
  color: #fff;
  font-weight: 600;
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  box-shadow: 0 4px 12px rgba(77, 171, 247, 0.3);
}

/* 扫码登录面板 */
.qr-panel {
  padding: 4px 0 8px;
  text-align: center;
}

.qr-box {
  position: relative;
  width: 220px;
  height: 220px;
  margin: 0 auto 14px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  overflow: hidden;
}

.qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  font-size: 13px;
  color: #909399;
  cursor: pointer;
  background: #fafbfc;
}

.qr-placeholder .el-icon {
  font-size: 26px;
  color: #c0c4cc;
}

/* 已扫码蒙层：盖住二维码，提示到手机上确认 */
.qr-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #303133;
  background: rgba(255, 255, 255, 0.92);
}

.qr-mask .el-icon {
  font-size: 26px;
  color: #4dabf7;
}

.qr-tip {
  margin: 0 0 6px;
  font-size: 14px;
  color: #303133;
}

.qr-url {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: #909399;
  word-break: break-all;
}

.qr-warn {
  margin: 10px 0 0;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.6;
  color: #b26a00;
  text-align: left;
  background: #fff8e6;
  border-radius: 8px;
}

/* 邮箱验证码登录面板 */
.email-panel {
  padding: 4px 0 8px;
}

.code-btn {
  flex-shrink: 0;
  width: 118px;
  height: 40px;
  padding: 0;
  font-size: 13px;
  color: #2b8ae2;
  background: #f2f9ff;
  border-color: #cfe6fb;
  border-radius: 8px;
}

.code-btn:hover:not(.is-disabled) {
  color: #fff;
  background: #4dabf7;
  border-color: #4dabf7;
}

.code-btn.is-disabled {
  color: #a8b6c4;
  background: #f5f7fa;
  border-color: #e4e7ed;
}

.email-tip {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #909399;
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

  .qr-box {
    width: 180px;
    height: 180px;
  }
}
</style>
