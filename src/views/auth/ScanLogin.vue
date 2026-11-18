<template>
  <div class="scan-page">
    <div class="scan-card">
      <!-- 标题 -->
      <div class="header">
        <div class="logo">
          <el-icon><Compass /></el-icon>
        </div>
        <h1 class="title">确认登录</h1>
        <p class="subtitle">AI大学生就业服务智能体</p>
      </div>

      <!-- 1. 票据无效 / 已过期 -->
      <div v-if="pageState === 'invalid'" class="state-block">
        <el-icon class="state-icon error"><CircleClose /></el-icon>
        <p class="state-text">二维码已失效</p>
        <p class="state-tip">请回到电脑端刷新二维码后重新扫描</p>
      </div>

      <!-- 2. 手机端尚未登录：先登录账号 -->
      <div v-else-if="pageState === 'needLogin'" class="login-block">
        <div class="notice">
          <el-icon><InfoFilled /></el-icon>
          <span>当前手机尚未登录，请先登录账号，再确认电脑端登录</span>
        </div>
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          size="large"
          @keyup.enter="handlePhoneLogin"
        >
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名或邮箱" :prefix-icon="User" clearable />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              :type="passwordVisible ? 'text' : 'password'"
              placeholder="请输入密码"
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
          <el-form-item prop="captchaCode">
            <div class="captcha-row">
              <el-input
                v-model="form.captchaCode"
                placeholder="请输入验证码"
                :prefix-icon="Key"
                maxlength="4"
                clearable
              />
              <img
                v-if="captchaImg"
                :src="captchaImg"
                alt="验证码"
                class="captcha-img"
                @click="fetchCaptcha"
              />
              <div v-else class="captcha-img captcha-loading" @click="fetchCaptcha">加载中</div>
            </div>
          </el-form-item>
          <el-button type="primary" class="main-btn" :loading="loginLoading" @click="handlePhoneLogin">
            {{ loginLoading ? '登录中...' : '登录并确认' }}
          </el-button>
        </el-form>
      </div>

      <!-- 3. 已登录：确认授权 -->
      <div v-else-if="pageState === 'confirm'" class="confirm-block">
        <div class="user-box">
          <div class="avatar">{{ avatarText }}</div>
          <div class="user-info">
            <p class="user-name">{{ displayName }}</p>
            <p class="user-tip">将使用该账号登录电脑端</p>
          </div>
        </div>
        <div class="action-box">
          <el-button type="primary" class="main-btn" :loading="confirming" @click="handleConfirm">
            {{ confirming ? '确认中...' : '确认登录' }}
          </el-button>
          <el-button class="cancel-btn" :disabled="confirming" @click="handleCancel">取消</el-button>
          <!-- 手机端可能残留上一次的登录态：提供换号入口，避免只能确认上次登录的账号 -->
          <el-button link class="switch-btn" :disabled="confirming" @click="switchAccount">
            使用其他账号登录
          </el-button>
        </div>
      </div>

      <!-- 4. 已完成 -->
      <div v-else-if="pageState === 'done'" class="state-block">
        <el-icon class="state-icon success"><CircleCheck /></el-icon>
        <p class="state-text">确认成功</p>
        <p class="state-tip">请回到电脑端继续使用，本次扫码登录已完成</p>
      </div>

      <!-- 5. 已取消 -->
      <div v-else-if="pageState === 'canceled'" class="state-block">
        <el-icon class="state-icon gray"><CircleClose /></el-icon>
        <p class="state-text">已取消登录</p>
        <p class="state-tip">电脑端二维码已失效，如需登录请重新扫码</p>
      </div>

      <!-- 6. 初始化中 -->
      <div v-else class="state-block">
        <el-icon class="state-icon loading is-loading"><Loading /></el-icon>
        <p class="state-tip">正在校验二维码…</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { login, getCaptcha, markQrScanned, confirmQrLogin, cancelQrLogin } from '@/api/auth'
import {
  Compass,
  User,
  Lock,
  Key,
  View,
  Hide,
  Loading,
  CircleCheck,
  CircleClose,
  InfoFilled
} from '@element-plus/icons-vue'

const route = useRoute()

// 二维码票据（由 PC 端二维码中的 URL 携带）
const ticket = computed(() => (route.query.ticket as string) || '')

// 页面状态：init 校验中 / needLogin 待登录 / confirm 待确认 / done 已确认 / canceled 已取消 / invalid 票据失效
const pageState = ref<'init' | 'needLogin' | 'confirm' | 'done' | 'canceled' | 'invalid'>('init')

// 手机端当前登录账号显示名
const displayName = ref('当前账号')

// 表单数据
const form = reactive({
  username: '',
  password: '',
  captchaKey: '',
  captchaCode: ''
})

const formRef = ref<FormInstance>()
const captchaImg = ref('')
const passwordVisible = ref(false)
const loginLoading = ref(false)
const confirming = ref(false)

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请输入图形验证码', trigger: 'blur' }]
}

// 头像显示首字母（取用户名第一个字符）
const avatarText = computed(() => (displayName.value || 'U').slice(0, 1).toUpperCase())

/**
 * 判断本地保存的 JWT 是否已过期
 * 手机端可能残留上一次的登录态，若直接进"确认"界面会出现"显示上次账号但确认失败"，
 * 因此先按 payload 中的 exp 自行判断；解析失败时不阻断流程，交由后端判定。
 */
const isTokenExpired = (token: string): boolean => {
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return false
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
  } catch {
    return false
  }
}

/**
 * 清除手机端本地会话
 * 用于"换一个账号登录"或本地 Token 已失效，避免下次扫码仍被绑定到旧账号
 */
const clearLocalSession = () => {
  const keys = ['token', 'roles', 'permissions', 'role', 'username', 'department', 'className', 'userInfo']
  keys.forEach((key) => localStorage.removeItem(key))
}

/**
 * 页面初始化：校验票据有效性并判断手机端是否已登录
 */
onMounted(async () => {
  if (!ticket.value) {
    pageState.value = 'invalid'
    return
  }
  try {
    // 白名单接口，无需登录即可标记"已扫码"，同时借它判断票据是否还有效
    await markQrScanned(ticket.value)
  } catch {
    pageState.value = 'invalid'
    return
  }
  const token = localStorage.getItem('token')
  if (token && !isTokenExpired(token)) {
    displayName.value = localStorage.getItem('username') || '当前账号'
    pageState.value = 'confirm'
  } else {
    // 没有 Token 或 Token 已过期：清掉残留会话，回到账号表单
    clearLocalSession()
    pageState.value = 'needLogin'
    await fetchCaptcha()
  }
})

/**
 * 换一个账号登录：清掉手机端会话后回到账号表单
 * 不提供该入口时，只要手机登录过一次，扫码页就一直只能确认上次那个账号
 */
const switchAccount = () => {
  clearLocalSession()
  displayName.value = '当前账号'
  pageState.value = 'needLogin'
  fetchCaptcha()
}

/**
 * 获取图形验证码
 */
const fetchCaptcha = async () => {
  try {
    const res = await getCaptcha()
    form.captchaKey = res?.captchaKey || ''
    captchaImg.value = res?.captchaImg || ''
  } catch {
    form.captchaKey = ''
    captchaImg.value = ''
  }
}

/**
 * 手机端登录：成功后把会话写入本地存储，随后进入确认界面
 */
const handlePhoneLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loginLoading.value = true
    try {
      const res: any = await login({
        username: form.username,
        password: form.password,
        captchaKey: form.captchaKey,
        captchaCode: form.captchaCode
      })
      // 与 PC 登录页一致的落库方式，保证手机端后续请求（确认/取消）携带有效 Token
      const backendRoles: string[] = res.roles && res.roles.length > 0 ? res.roles : [res.role || '']
      localStorage.setItem('token', res.token)
      localStorage.setItem('roles', JSON.stringify(backendRoles))
      localStorage.setItem('permissions', JSON.stringify(res.permissions || []))
      localStorage.setItem('role', (backendRoles[0] || '').toLowerCase())
      localStorage.setItem('username', res.userInfo?.name || form.username)
      localStorage.setItem('department', res.userInfo?.department || '')
      localStorage.setItem('className', res.userInfo?.className || '')

      displayName.value = res.userInfo?.name || form.username
      pageState.value = 'confirm'
      ElMessage.success('登录成功，请确认电脑端登录')
    } catch {
      // 请求拦截器已统一提示（密码错误 / 验证码错误 / 账号禁用等）
      form.captchaCode = ''
      fetchCaptcha()
    } finally {
      loginLoading.value = false
    }
  })
}

/**
 * 确认登录：后端以手机端 Token 中的身份签发电脑端 Token
 */
const handleConfirm = async () => {
  if (!ticket.value) {
    pageState.value = 'invalid'
    return
  }
  confirming.value = true
  try {
    await confirmQrLogin(ticket.value)
    pageState.value = 'done'
  } catch (err: any) {
    // 本地 Token 已失效：清掉会话就地回到登录表单，不把用户甩到"二维码已失效"
    if (err?.response?.status === 401) {
      clearLocalSession()
      pageState.value = 'needLogin'
      fetchCaptcha()
      return
    }
    // 票据过期/已使用等：统一提示后回到失效状态
    pageState.value = 'invalid'
  } finally {
    confirming.value = false
  }
}

/**
 * 取消本次扫码登录
 */
const handleCancel = async () => {
  try {
    await cancelQrLogin(ticket.value)
    pageState.value = 'canceled'
  } catch {
    pageState.value = 'canceled'
  }
}
</script>

<style scoped>
.scan-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  box-sizing: border-box;
  background: linear-gradient(160deg, #eef6ff 0%, #f7fbff 45%, #ffffff 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.scan-card {
  width: 100%;
  max-width: 400px;
  padding: 28px 22px 26px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(44, 62, 80, 0.12);
}

/* 标题区 */
.header {
  text-align: center;
  margin-bottom: 22px;
}

.logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(77, 171, 247, 0.32);
}

.title {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: 1px;
}

.subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
  letter-spacing: 1px;
}

/* 状态块 */
.state-block {
  padding: 26px 0 10px;
  text-align: center;
}

.state-icon {
  font-size: 52px;
}

.state-icon.success {
  color: #67c23a;
}

.state-icon.error {
  color: #f56c6c;
}

.state-icon.gray {
  color: #909399;
}

.state-icon.loading {
  color: #4dabf7;
}

.state-text {
  margin: 12px 0 6px;
  font-size: 17px;
  font-weight: 600;
  color: #2c3e50;
}

.state-tip {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #909399;
}

/* 未登录提示 */
.notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 18px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #8a6d3b;
  background: #fdf6ec;
  border-radius: 10px;
}

.notice .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.login-block :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 12px;
}

.login-block :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4dabf7 inset;
}

.pwd-toggle {
  cursor: pointer;
  color: #909399;
}

/* 验证码行 */
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
  width: 110px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  object-fit: cover;
  background: #fff;
}

.captcha-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
}

/* 已登录用户信息 */
.user-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin-bottom: 20px;
  background: #f5f9ff;
  border-radius: 14px;
}

.avatar {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  border-radius: 50%;
}

.user-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.user-tip {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}

/* 按钮 */
.action-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.main-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
}

.cancel-btn {
  width: 100%;
  height: 42px;
  font-size: 14px;
  border-radius: 10px;
}

/* 换号入口：弱化处理，不抢主按钮视觉 */
.switch-btn {
  margin-top: 2px;
  font-size: 13px;
  color: #4dabf7;
}

@media (max-width: 380px) {
  .scan-card {
    padding: 24px 16px;
  }

  .title {
    font-size: 19px;
  }
}
</style>
