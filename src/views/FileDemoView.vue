<template>
  <el-alert title="文件传输接口演示：当前业务后端尚未接入文件服务，上传、下载和历史记录依赖文件服务支持。" type="warning" :closable="false" />
  <div class="file-demo">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">文件传输演示中心</h2>
        <p class="page-desc">小文件批量并发上传 · 大文件切片断点续传 · 流式下载与 HTTP 206 断点下载</p>
      </div>
      <el-button :icon="Back" @click="$router.push(getLandingPath())">返回系统</el-button>
    </div>

    <el-alert
      class="storage-alert"
      type="success"
      :closable="false"
      show-icon
      title="三种大数据存储方式分流：本地存储(LOCAL)、数据库BLOB(DATABASE)、OSS对象存储直连(OSS)"
    />

    <!-- ================= 模块一：小文件批量并发上传 ================= -->
    <el-card v-if="hasPermission('storage:upload')" shadow="never" class="module-card">
      <template #header>
        <div class="module-header">
          <span class="module-title">模块一：小文件批量并发上传</span>
          <span class="module-sub">POST /api/storage/batch-upload · 多文件一次并发提交</span>
        </div>
      </template>

      <el-upload
        v-model:file-list="smallFileList"
        class="small-upload"
        drag
        multiple
        :auto-upload="false"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.log,.xls,.xlsx,.zip"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div class="upload-text">多选小文件（简历 PDF / 证书图片 / 日志文本等），拖拽或点击添加</div>
      </el-upload>

      <div class="action-row">
        <el-button v-permission="'storage:upload'"
          type="primary"
          :icon="Promotion"
          :loading="batchUploading"
          :disabled="smallFileList.length === 0"
          @click="handleBatchUpload"
        >
          {{ batchUploading ? '并发上传中...' : `批量并发上传（已选 ${smallFileList.length} 个）` }}
        </el-button>
      </div>

      <el-table v-if="batchResults.length" :data="batchResults" stripe size="small" class="result-table">
        <el-table-column prop="fileName" label="文件名" min-width="220" show-overflow-tooltip />
        <el-table-column label="上传状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'uploading'" type="warning" size="small">上传中</el-tag>
            <el-tag v-else-if="row.status === 'success'" type="success" size="small">成功</el-tag>
            <el-tag v-else type="danger" size="small">失败</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="返回结果" min-width="260" show-overflow-tooltip />
      </el-table>
    </el-card>

    <!-- ================= 模块二：大文件切片与断点续传 ================= -->
    <el-card v-if="hasPermission('storage:upload')" shadow="never" class="module-card">
      <template #header>
        <div class="module-header">
          <span class="module-title">模块二：大文件切片与断点续传</span>
          <span class="module-sub">Blob.slice 按 5MB 切片 · check 秒传/续传 · chunk/upload · merge 合并</span>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="10">
          <el-upload
            v-model:file-list="bigFileList"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="onBigFileChange"
          >
            <el-button type="primary" plain :icon="FolderOpened">
              选择大文件（建议 100MB+）
            </el-button>
          </el-upload>

          <div class="big-file-info">
            <div class="info-line"><span class="label">文件名：</span>{{ bigFile?.name || '未选择' }}</div>
            <div class="info-line"><span class="label">大小：</span>{{ bigFile ? formatSize(bigFile.size) : '-' }}</div>
            <div class="info-line"><span class="label">切片总数：</span>{{ chunkTotal }} 片（每片 5MB）</div>
            <div class="info-line hash-line">
              <span class="label">SHA-256 指纹：</span>
              <span v-if="hashComputing">计算中...</span>
              <el-tooltip v-else-if="fileHash" :content="fileHash" placement="top">
                <span class="hash-text">{{ fileHash.slice(0, 24) }}...</span>
              </el-tooltip>
              <span v-else>-</span>
            </div>
          </div>

          <div class="action-row">
            <el-button v-permission="'storage:upload'"
              type="primary"
              :icon="VideoPlay"
              :loading="chunkUploading"
              :disabled="!bigFile || hashComputing"
              @click="handleChunkUpload"
            >
              {{ uploadedCount > 0 ? '继续上传（断点续传）' : '开始切片上传' }}
            </el-button>
            <el-button type="warning" plain :icon="VideoPause" :disabled="!chunkUploading" @click="handlePause">
              暂停 / 模拟网络中断
            </el-button>
            <el-button v-permission="'storage:upload'"
              v-if="corruptedPending !== null"
              type="danger"
              :icon="Refresh"
              :loading="chunkUploading"
              @click="repairCorruptedChunk"
            >
              修复损坏（重传分片 {{ corruptedPending + 1 }}）
            </el-button>
            <el-button :icon="Delete" @click="resetChunkState">重置</el-button>
            <el-divider direction="vertical" />
            <el-switch v-model="simulateCorruption" active-text="模拟分片损坏" />
            <el-input-number
              v-model="corruptChunkIndex"
              :min="0"
              :max="chunkTotal > 0 ? chunkTotal - 1 : 0"
              size="small"
              :disabled="!simulateCorruption"
              controls-position="right"
              style="width: 100px"
            />
            <span v-if="simulateCorruption" class="corrupt-tip">
              上传第 {{ corruptChunkIndex + 1 }} 片时篡改传输字节 → 服务端 MD5 校验拦截（code=5001）→ 上传停在该分片、禁止合并，修复后才可继续
            </span>
          </div>
        </el-col>

        <el-col :span="14">
          <div class="progress-panel">
            <div class="progress-label">
              全局进度：已上传 <b>{{ uploadedCount }}</b> / {{ chunkTotal }} 片
              <el-tag size="small" type="success" effect="plain">{{ percent }}%</el-tag>
            </div>
            <el-progress
              :percentage="percent"
              :stroke-width="18"
              :text-inside="true"
              :status="percent === 100 ? 'success' : undefined"
            />
          </div>

          <div class="log-panel">
            <div class="log-title">操作日志（实时请求记录）</div>
            <el-scrollbar max-height="220px">
              <div v-for="(log, idx) in logs" :key="logs.length - idx" class="log-line" :class="log.type">
                <span class="log-time">[{{ log.time }}]</span> {{ log.text }}
              </div>
              <div v-if="!logs.length" class="log-empty">暂无日志，选择文件后开始上传</div>
            </el-scrollbar>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- ================= 模块三：流式下载与断点下载 ================= -->
    <el-card v-if="hasAnyStorageRead" shadow="never" class="module-card">
      <template #header>
        <div class="module-header">
          <span class="module-title">模块三：高并发流式下载与断点下载</span>
          <span class="module-sub">GET /api/storage/list · GET /api/storage/download/{id} · Range 请求触发 HTTP 206</span>
        </div>
      </template>

      <!-- 全局下载进度 -->
      <div v-if="dl.active || dl.percent > 0" class="progress-panel">
        <div class="progress-label">
          {{ dl.mode === 'range' ? 'HTTP 206 断点下载' : '普通下载' }}：<b>{{ dl.detail }}</b>
          <el-tag size="small" type="success" effect="plain">{{ dl.percent }}%</el-tag>
        </div>
        <el-progress :percentage="dl.percent" :stroke-width="14" :text-inside="true" />
        <div v-if="dl.mode === 'range' && (dl.active || dlPaused)" class="dl-controls">
          <el-button size="small" type="warning" plain :icon="dlPaused ? VideoPlay : VideoPause" @click="toggleRangePause">
            {{ dlPaused ? '继续下载（断点恢复）' : '暂停（模拟网络断开）' }}
          </el-button>
          <span class="dl-controls-tip">断点下载按 5MB 分段传输，暂停将停在分段边界，恢复时从断点偏移处继续发起 Range 请求</span>
        </div>
      </div>

      <!-- 高并发下载控制条 -->
      <div class="batch-dl-bar">
        <span class="batch-dl-label">并发连接数：</span>
        <el-input-number
          v-model="concurrency"
          :min="1"
          :max="5"
          size="small"
          controls-position="right"
          style="width: 100px"
        />
        <el-button v-permission="'storage:download'"
          type="primary"
          size="small"
          :icon="Download"
          :loading="batchDl.active"
          :disabled="selectedFiles.length === 0 || dl.active"
          @click="concurrentDownload"
        >
          {{ batchDl.active ? '并发下载中...' : `并发下载所选文件（已选 ${selectedFiles.length} 个）` }}
        </el-button>
        <span class="batch-dl-tip">同时为所选文件建立 N 条下载连接，模拟多用户高并发下载场景</span>
      </div>

      <!-- 并发下载任务面板 -->
      <div v-if="batchDl.tasks.length" class="batch-dl-panel">
        <div v-for="t in batchDl.tasks" :key="t.id" class="batch-dl-task">
          <span class="task-name" :title="t.fileName">{{ t.fileName }}</span>
          <el-progress
            class="task-progress"
            :percentage="t.percent"
            :stroke-width="10"
            :status="t.status === 'error' ? 'exception' : t.status === 'success' ? 'success' : undefined"
          />
          <el-tag size="small" :type="t.status === 'error' ? 'danger' : t.status === 'success' ? 'success' : 'warning'">
            {{ t.status === 'waiting' ? '排队中' : t.status === 'downloading' ? '下载中' : t.status === 'success' ? '完成' : '失败' }}
          </el-tag>
        </div>
      </div>

      <el-table v-if="hasPermission('storage:view')"
        v-loading="listLoading"
        :data="storageFiles"
        stripe
        size="small"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="42" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="fileName" label="文件名" min-width="200" show-overflow-tooltip />
        <el-table-column label="大小" width="100" align="center">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="存储介质" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagMap[row.storageType as StorageType]?.type || 'info'" size="small">
              {{ typeTagMap[row.storageType as StorageType]?.label || row.storageType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="上传时间" width="165" />
        <el-table-column label="下载操作" width="230" align="center">
          <template #default="{ row }">
            <el-button v-permission="'storage:download'"
              size="small"
              type="primary"
              :icon="Download"
              :disabled="dl.active || batchDl.active"
              @click="downloadNormal(row)"
            >
              普通下载
            </el-button>
            <el-button v-permission="'storage:download'"
              size="small"
              type="success"
              :icon="Cpu"
              :disabled="dl.active || batchDl.active"
              @click="downloadRange(row)"
            >
              206 断点下载
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="dl-refresh">
        <el-button v-permission="'storage:view'" size="small" :icon="Refresh" :loading="listLoading" @click="fetchList">刷新文件列表</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { hasPermission, getLandingPath } from '@/utils/permission'
import { invalidatePermissions, refreshSession, clearSession } from '@/store/user'

import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import SparkMD5 from 'spark-md5'
import type { UploadFile, UploadUserFile } from 'element-plus'
import {
  UploadFilled,
  FolderOpened,
  VideoPlay,
  VideoPause,
  Delete,
  Promotion,
  Download,
  Cpu,
  Refresh,
  Back
} from '@element-plus/icons-vue'
import {
  batchUploadFiles,
  checkChunks,
  uploadChunk,
  mergeChunks,
  downloadFileById,
  getStorageList
} from '@/api/storage'
import type { StorageFile, StorageType } from '@/api/types'

// ★演示点1：分片大小 5MB，分片序号即临时文件名（后端 merge 按序号排序重组）
const hasAnyStorageRead = computed(() => hasPermission('storage:view') || hasPermission('storage:download'))
const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB 分片
// ★演示点3：206 断点下载每段 5MB
const RANGE_SIZE = 5 * 1024 * 1024

const typeTagMap: Record<StorageType, { label: string; type: 'info' | 'warning' | 'success' }> = {
  LOCAL: { label: '本地磁盘', type: 'info' },
  DATABASE: { label: '数据库BLOB', type: 'warning' },
  OSS: { label: '云OSS', type: 'success' }
}

// 文件大小格式化：B → KB → MB
const formatSize = (bytes: number): string => {
  if (bytes === null || bytes === undefined) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// ==================== 模块一：小文件批量并发上传 ====================
const smallFileList = ref<UploadUserFile[]>([])
const batchUploading = ref(false)
const batchResults = ref<{ fileName: string; status: 'uploading' | 'success' | 'error'; message: string }[]>([])

// ★演示点2：多选文件一次性封装进 FormData，后端 thread pool 并行落盘
const handleBatchUpload = async () => {
  if (!hasPermission('storage:upload')) return
  const files = smallFileList.value.map((f) => f.raw as File).filter(Boolean)
  if (!files.length) return
  batchUploading.value = true
  batchResults.value = files.map((f) => ({ fileName: f.name, status: 'uploading', message: '等待响应' }))
  try {
    const res = await batchUploadFiles(files)
    // 后端返回数组则逐条展示，否则整体标记成功
    const list = Array.isArray(res) ? (res as { fileName?: string; success?: boolean; message?: string; url?: string }[]) : null
    batchResults.value = files.map((f, i) => {
      const item = list?.[i]
      const ok = !list || item?.success !== false
      return {
        fileName: f.name,
        status: ok ? 'success' : 'error',
        message: item?.message || item?.url || (ok ? '上传成功' : '上传失败')
      }
    })
    ElMessage.success('批量并发上传完成')
    fetchList()
  } catch {
    batchResults.value.forEach((r) => {
      if (r.status === 'uploading') r.status = 'error'
    })
  } finally {
    batchUploading.value = false
  }
}

// ==================== 模块二：大文件切片与断点续传 ====================
const bigFileList = ref<UploadUserFile[]>([])
const bigFile = ref<File | null>(null)
const fileHash = ref('')
const hashComputing = ref(false)
const chunkUploading = ref(false)
const paused = ref(false)
const uploadedCount = ref(0)
const doneIndexes = ref<Set<number>>(new Set())

const chunkTotal = computed(() => (bigFile.value ? Math.ceil(bigFile.value.size / CHUNK_SIZE) : 0))
// ★演示点4：大文件上传进度 = 已成功分片数 / 总分片数（真实进度，不是假动画）
const percent = computed(() =>
  chunkTotal.value ? Math.min(100, Math.round((uploadedCount.value / chunkTotal.value) * 100)) : 0
)

// 操作日志（新日志在前，最多保留 60 条）
const logs = ref<{ time: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([])
const pushLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  logs.value.unshift({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), text, type })
  if (logs.value.length > 60) logs.value.pop()
}

// 选择大文件后：重置状态并计算 SHA-256 指纹（秒传/续传唯一标识）
const onBigFileChange = async (uploadFile: UploadFile) => {
  const raw = uploadFile.raw as File | undefined
  if (!raw) return
  resetChunkState()
  bigFile.value = raw
  hashComputing.value = true
  pushLog(`已选择文件「${raw.name}」（${formatSize(raw.size)}），开始计算 SHA-256 指纹...`)
  try {
    const digest = await crypto.subtle.digest('SHA-256', await raw.arrayBuffer())
    fileHash.value = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    pushLog(`指纹计算完成：${fileHash.value.slice(0, 32)}...`)
  } catch {
    pushLog('指纹计算失败，请重新选择文件', 'error')
    bigFile.value = null
  } finally {
    hashComputing.value = false
  }
}

// 防御式解析 /chunk/check 返回：支持 number[]、{chunkIndex}[]、{uploadedIndexes:number[]}、空
const extractUploadedIndexes = (data: unknown): number[] => {
  let arr: unknown[] = []
  if (Array.isArray(data)) arr = data
  else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.uploadedIndexes)) arr = obj.uploadedIndexes
    else if (Array.isArray(obj.uploadedChunks)) arr = obj.uploadedChunks
  }
  return arr
    .map((item) =>
      typeof item === 'number' ? item : Number((item as { chunkIndex?: number })?.chunkIndex)
    )
    .filter((n) => Number.isFinite(n))
}

// 分片损坏模拟：开启后上传指定分片时篡改传输字节（MD5 校验码仍按原始分片计算），
// 服务端 MD5 复核必然失败并返回 code=5001，演示「服务端检测损坏 → 通知重传 → 客户端自动重传」
const simulateCorruption = ref(false)
const corruptChunkIndex = ref(2)
// 损坏待修复的分片索引：非 null 表示上传被服务端 5001 拦截停在该分片，禁止合并，等待「修复损坏」
const corruptedPending = ref<number | null>(null)
const repairing = ref(false)

// ★演示点1+3：先 check 已传分片 → Blob.slice 切片 → 逐片 MD5 上传 → merge 合并
const handleChunkUpload = async () => {
  if (!hasPermission('storage:upload')) return
  if (!bigFile.value || !fileHash.value) return
  chunkUploading.value = true
  paused.value = false
  try {
    // 1. 请求已上传分片列表（秒传/续传依据）
    // ★演示点3：上传前查询服务端已有分片，作为断点续传 / 秒传依据
    pushLog(`GET /api/storage/chunk/check?fileHash=${fileHash.value.slice(0, 16)}...`)
    const uploaded = extractUploadedIndexes(await checkChunks(fileHash.value))
    uploaded.forEach((i) => doneIndexes.value.add(i))
    uploadedCount.value = doneIndexes.value.size
    if (uploaded.length > 0) {
      pushLog(`服务端已有 ${uploaded.length}/${chunkTotal.value} 片，本次自动跳过（断点续传）`, 'success')
    }

    // 2. 逐片上传：Blob.slice 切 5MB，携带 fileHash + chunkIndex（暂停在分片边界生效）
    for (let i = 0; i < chunkTotal.value; i++) {
      if (!hasPermission('storage:upload')) return
      if (paused.value) {
        pushLog('已暂停（模拟网络中断），进度已保留，可点击「继续上传」断点续传', 'warning')
        return
      }
      if (doneIndexes.value.has(i)) continue // ★演示点3：已存在的分片直接跳过，只补传缺失分片
      // ★演示点1：Blob.slice 切出 5MB 分片
      const start = i * CHUNK_SIZE
      const chunk = bigFile.value.slice(start, Math.min(start + CHUNK_SIZE, bigFile.value.size))
      // 基于原始分片字节计算 MD5 校验码（服务端以 DigestUtils.md5DigestAsHex 同算法复核）
      const chunkBuf = await chunk.arrayBuffer()
      // ★演示点1：每片单独计算 MD5，随 chunkMd5 提交，服务端用相同算法复核
      const chunkMd5 = SparkMD5.ArrayBuffer.hash(chunkBuf)
      // 模拟分片损坏：对指定分片篡改传输字节，校验码仍为原始分片 MD5 → 服务端必然拦截
      let payload: Blob = chunk
      // ★演示点1（彩蛋）：篡改传输字节但保留原 MD5，服务端必然校验失败返回 5001
      if (simulateCorruption.value && !repairing.value && i === corruptChunkIndex.value) {
        const bytes = new Uint8Array(chunkBuf.slice(0))
        bytes[0] = bytes[0] ^ 0xff
        payload = new Blob([bytes])
        pushLog(`已人为篡改分片 ${i + 1} 的传输字节（模拟链路损坏），等待服务端 MD5 校验拦截`, 'warning')
      }
      try {
        await uploadChunk(payload, fileHash.value, i, chunkMd5)
        doneIndexes.value.add(i)
        uploadedCount.value = doneIndexes.value.size
        pushLog(`POST /api/storage/chunk/upload 分片 ${i + 1}/${chunkTotal.value} 上传成功（MD5 ${chunkMd5.slice(0, 12)}... 校验通过）`)
      } catch {
        // request 拦截器已弹出服务端 5001 通知（「分块损坏，校验失败，请重传该分片！」）
        // 上传流程停在损坏分片：进度不再前进、不会触发合并，等待人工「修复损坏」
        // ★演示点1：停在该分片、禁止合并，等待「修复损坏」只重传这一片
        corruptedPending.value = i
        pushLog(`服务端检测到分片 ${i + 1} 损坏（MD5 校验失败，code=5001），上传已停在第 ${i + 1} 片、禁止合并 → 请点击「修复损坏」`, 'error')
        ElMessage.error(`分片 ${i + 1} 损坏，上传已停止，请点击「修复损坏」重传该分片`)
        return
      }
    }

    // 3. 全部分片完成后请求合并
    // ★演示点1：全部分片到齐后请求合并，后端按序号用 RandomAccessFile 重组
    pushLog(`POST /api/storage/chunk/merge 请求合并 ${chunkTotal.value} 个分片...`)
    if (!hasPermission('storage:upload')) return
    await mergeChunks({
      fileHash: fileHash.value,
      fileName: bigFile.value.name,
      chunkTotal: chunkTotal.value,
      fileSize: bigFile.value.size
    })
    pushLog('合并完成，文件已在服务端就绪', 'success')
    ElMessage.success('大文件上传并合并完成')
    fetchList()
  } catch {
    pushLog('上传过程出现错误，已停止（可点击继续重试）', 'error')
  } finally {
    chunkUploading.value = false
  }
}

// ★演示点1：修复损坏 
const repairCorruptedChunk = async () => {
  if (!hasPermission('storage:upload')) return
  if (corruptedPending.value === null || chunkUploading.value) return
  const i = corruptedPending.value
  chunkUploading.value = true
  repairing.value = true
  try {
    const start = i * CHUNK_SIZE
    const chunk = bigFile.value!.slice(start, Math.min(start + CHUNK_SIZE, bigFile.value!.size))
    const chunkMd5 = SparkMD5.ArrayBuffer.hash(await chunk.arrayBuffer())
    pushLog(`修复损坏：重传分片 ${i + 1}（原始字节，MD5 ${chunkMd5.slice(0, 12)}...）`)
    await uploadChunk(chunk, fileHash.value, i, chunkMd5)
    doneIndexes.value.add(i)
    uploadedCount.value = doneIndexes.value.size
    corruptedPending.value = null
    simulateCorruption.value = false // 修复成功后自动关闭损坏模拟，避免继续上传时再次损坏
    pushLog(`分片 ${i + 1} 修复成功（MD5 校验通过），已关闭损坏模拟，自动继续上传剩余分片...`, 'success')
    ElMessage.success(`分片 ${i + 1} 修复成功`)
    await handleChunkUpload() // 复用主流程：跳过已传分片 → 传剩余分片 → merge
  } catch {
    pushLog(`分片 ${i + 1} 修复失败，请再次点击「修复损坏」重试`, 'error')
    ElMessage.error(`分片 ${i + 1} 修复失败，请重试`)
  } finally {
    repairing.value = false
    chunkUploading.value = false
  }
}

// ★演示点3：暂停在分片边界生效，已传分片保留在服务端，继续时自动跳过
const handlePause = () => {
  if (!chunkUploading.value) return
  paused.value = true
  pushLog('已发出暂停指令，等待当前分片传输完成...', 'warning')
}

const resetChunkState = () => {
  bigFile.value = null
  fileHash.value = ''
  hashComputing.value = false
  chunkUploading.value = false
  paused.value = false
  uploadedCount.value = 0
  doneIndexes.value = new Set()
  bigFileList.value = []
  logs.value = []
  corruptedPending.value = null
  repairing.value = false
}

// ==================== 模块三：流式下载与断点下载 ====================
const storageFiles = ref<StorageFile[]>([])
const listLoading = ref(false)
const dl = reactive({
  active: false,
  mode: '' as '' | 'normal' | 'range',
  percent: 0,
  detail: ''
})

const fetchList = async () => {
  if (!hasPermission('storage:view')) return
  listLoading.value = true
  try {
    storageFiles.value = await getStorageList()
  } catch {
    // 拦截器已统一弹错
  } finally {
    listLoading.value = false
  }
}

onMounted(fetchList)

// 保存 Blob 到本地
const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

// ==================== 高并发下载（工作池模式） ==================== ★演示点5
// 用户在表格勾选多个文件 → 设置并发连接数 N → 同时建立 N 条下载流，
// 每条流独立进度；完成一个任务自动从队列取下一个，模拟多用户并发下载
const selectedFiles = ref<StorageFile[]>([])
const concurrency = ref(3)
const batchDl = reactive({
  active: false,
  tasks: [] as { id: number | string; fileName: string; percent: number; status: 'waiting' | 'downloading' | 'success' | 'error' }[]
})

const handleSelectionChange = (rows: StorageFile[]) => {
  selectedFiles.value = rows
}

const concurrentDownload = async () => {
  if (!hasPermission('storage:download')) return
  const files = selectedFiles.value
  if (!files.length) {
    ElMessage.warning('请先在表格中勾选要下载的文件')
    return
  }
  if (dl.active || batchDl.active) return
  batchDl.active = true
  batchDl.tasks = files.map((f) => ({ id: f.id, fileName: f.fileName, percent: 0, status: 'waiting' as const }))
  const parallel = Math.min(concurrency.value, files.length)
  pushLog(`启动并发下载：${files.length} 个文件，同时建立 ${parallel} 条下载连接（并发数 ${concurrency.value}）`, 'success')

  // 任务队列 + N 个 worker：保持任意时刻最多 parallel 条流在传输
  const queue = [...files]
  const worker = async () => {
    while (queue.length) {
      if (!hasPermission('storage:download')) return
      const file = queue.shift()!
      const task = batchDl.tasks.find((t) => t.id === file.id)!
      task.status = 'downloading'
      pushLog(`【并发】GET /api/storage/download/${file.id} 「${file.fileName}」开始传输`)
      try {
        const blob = (await downloadFileById(file.id, (loaded, total) => {
          task.percent = total > 0 ? Math.round((loaded / total) * 100) : 0
        })) as unknown as Blob
        saveBlob(blob, file.fileName)
        task.percent = 100
        task.status = 'success'
        pushLog(`【并发】「${file.fileName}」下载完成并保存`, 'success')
      } catch {
        task.status = 'error'
        pushLog(`【并发】「${file.fileName}」下载失败`, 'error')
      }
    }
  }
  await Promise.all(Array.from({ length: parallel }, () => worker()))

  const ok = batchDl.tasks.filter((t) => t.status === 'success').length
  pushLog(`并发下载全部结束：成功 ${ok} / 失败 ${files.length - ok}`, ok === files.length ? 'success' : 'warning')
  batchDl.active = false
}

// ★演示点4：普通下载 —— 一次请求整流，axios onDownloadProgress 回调实时进度
const downloadNormal = async (row: StorageFile) => {
  if (!hasPermission('storage:download')) return
  dl.active = true
  dl.mode = 'normal'
  dl.percent = 0
  dl.detail = `GET /api/storage/download/${row.id}（整流下载）`
  try {
    const blob = (await downloadFileById(row.id, (loaded, total) => {
      dl.percent = total > 0 ? Math.round((loaded / total) * 100) : 0
      if (total <= 0) dl.detail = `GET /api/storage/download/${row.id}（已接收 ${formatSize(loaded)}）`
    })) as unknown as Blob
    saveBlob(blob, row.fileName)
    dl.percent = 100
    pushLog(`【普通下载】「${row.fileName}」下载完成`, 'success')
    ElMessage.success('下载完成')
  } catch {
    pushLog(`【普通下载】「${row.fileName}」失败`, 'error')
  } finally {
    dl.active = false
  }
}

// ★演示点3：206 断点下载：探测总大小 → 按 5MB 分段携带 Range 头逐段请求（每段 HTTP 206）→ 合并保存
// 断点会话：暂停时保留已下载分段与偏移量，「继续下载」从断点处发送 Range 请求，不重下已收分段
const dlPaused = ref(false)
let rangeSession: { row: StorageFile; parts: Blob[]; start: number; total: number } | null = null
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const downloadRange = async (row: StorageFile) => {
  if (!hasPermission('storage:download')) return
  if (dl.active) return
  if (rangeSession && dlPaused.value) {
    ElMessage.warning('已有暂停中的断点下载会话，请先「继续下载」完成本次传输')
    return
  }
  dl.active = true
  dl.mode = 'range'
  dl.percent = 0
  dlPaused.value = false
  const url = `/api/storage/download/${row.id}`
  try {
    // 1. 探测总大小：Range: bytes=0-0，从 Content-Range: bytes 0-0/{total} 解析
    dl.detail = '探测文件总大小（Range: bytes=0-0）...'
    // ★演示点3：先用 Range: bytes=0-0 探测文件总大小（从 Content-Range 解析）
    const probe = await fetchRange(url, 'bytes=0-0')
    const contentRange = probe.headers.get('content-range')
    if (probe.status !== 206 || !contentRange) {
      await probe.body?.cancel()
      pushLog(`服务端未返回 206（状态码 ${probe.status}），不支持断点下载`, 'error')
      ElMessage.error('服务端不支持 Range 请求，无法进行 206 断点下载')
      return
    }
    const total = Number(contentRange.split('/')[1])
    pushLog(`探测成功：HTTP 206，Content-Range: ${contentRange}`)
    if (!Number.isFinite(total) || total <= 0) {
      ElMessage.error('无法解析文件总大小')
      return
    }
    rangeSession = { row, parts: [], start: 0, total }
    // 2. 进入分段下载主循环
    await runRangeLoop()
  } catch (err) {
    const msg = err instanceof Error ? err.message : '下载失败'
    pushLog(`【206下载】「${row.fileName}」失败：${msg}`, 'error')
    ElMessage.error(`断点下载失败：${msg}`)
  } finally {
    dl.active = false
  }
}

async function fetchRange(url: string, range: string) {
  if (!hasPermission('storage:download')) throw new Error('没有下载权限')
  const response = await fetch(url, {headers:{Range:range,Authorization:`Bearer ${localStorage.getItem('token') || ''}`}})
  if (response.status === 401) clearSession()
  if (response.status === 403) { invalidatePermissions(); await refreshSession(true); window.dispatchEvent(new Event('session-refreshed')) }
  return response
}
// 分段下载主循环：bytes=start-end 每段返回 206；暂停在分段边界生效
const runRangeLoop = async () => {
  if (!rangeSession) return
  const { row, total } = rangeSession
  const url = `/api/storage/download/${row.id}`
  while (rangeSession.start < total) {
    if (!hasPermission('storage:download')) return
    if (dlPaused.value) {
      pushLog(
        `已暂停（已接收 ${formatSize(rangeSession.start)} / ${formatSize(total)}），点击「继续下载」从断点恢复`,
        'warning'
      )
      return
    }
    const start = rangeSession.start
    const end = Math.min(start + RANGE_SIZE - 1, total - 1)
    // ★演示点3：按 5MB 分段请求 Range，后端返回 206，只传输该区间
    const resp = await fetchRange(url, `bytes=${start}-${end}`)
    if (resp.status !== 206) {
      throw new Error(`分段请求返回状态码 ${resp.status}，非 HTTP 206`)
    }
    rangeSession.parts.push(await resp.blob())
    rangeSession.start = end + 1
    dl.percent = Math.min(100, Math.round((rangeSession.start / total) * 100))
    dl.detail = `Range: bytes=${start}-${end} → HTTP 206`
    pushLog(`【206下载】bytes=${start}-${end} → HTTP 206 ✓（${formatSize(end - start + 1)}）`)
    // 模拟真实网络耗时：本地下载过快会瞬间完成，加节流让暂停/续传肉眼可见
    await sleep(600)
  }
  // 3. 合并分段 Blob 并保存
  saveBlob(new Blob(rangeSession.parts), row.fileName)
  dl.percent = 100
  dl.detail = `分段合并完成，共 ${rangeSession.parts.length} 段 / ${formatSize(total)}`
  pushLog(`【206下载】「${row.fileName}」断点下载完成`, 'success')
  ElMessage.success('HTTP 206 断点下载完成')
  rangeSession = null
}

// 暂停 / 继续断点下载（暂停停在分段边界，进度保留在 rangeSession 中）
const toggleRangePause = () => {
  if (!hasPermission('storage:download')) return
  if (dl.mode !== 'range' || !rangeSession) return
  if (!dlPaused.value) {
    dlPaused.value = true
    pushLog('已发出暂停指令，等待当前分段传输完成...', 'warning')
  } else {
    dlPaused.value = false
    pushLog('继续下载：从断点偏移处发送 Range 请求...')
    runRangeLoop().catch((err) => {
      pushLog(`【206下载】恢复失败：${err instanceof Error ? err.message : '下载失败'}`, 'error')
      dl.active = false
    })
  }
}
</script>

<style scoped>
.file-demo {
  min-height: 100vh;
  padding: 24px;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #2c3e50;
}
.page-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
}
.storage-alert {
  margin-bottom: 16px;
}
.module-card {
  margin-bottom: 18px;
  border-radius: 12px;
}
.module-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.module-title {
  font-size: 15px;
  font-weight: 700;
  color: #2c3e50;
}
.module-sub {
  font-size: 12px;
  color: #909399;
}
.upload-icon {
  font-size: 36px;
  color: #4dabf7;
  margin-bottom: 4px;
}
.upload-text {
  font-size: 13px;
  color: #606266;
}
.action-row {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.result-table {
  margin-top: 14px;
}
.big-file-info {
  margin-top: 14px;
  padding: 12px 14px;
  background: #f8f9fb;
  border-radius: 8px;
}
.info-line {
  font-size: 13px;
  color: #606266;
  line-height: 1.9;
}
.info-line .label {
  color: #909399;
}
.hash-line {
  display: flex;
  align-items: center;
}
.hash-text {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  color: #4dabf7;
  cursor: help;
}
.progress-panel {
  margin-bottom: 14px;
  padding: 12px 14px;
  background: #f8f9fb;
  border-radius: 8px;
}
.progress-label {
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
}
.progress-label b {
  color: #4dabf7;
}
.log-panel {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}
.log-title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #606266;
  background: #fafbfc;
  border-bottom: 1px solid #ebeef5;
}
.log-line {
  padding: 4px 12px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  color: #606266;
  line-height: 1.7;
}
.log-line.success {
  color: #67c23a;
}
.log-line.warning {
  color: #e6a23c;
}
.log-line.error {
  color: #f56c6c;
}
.log-time {
  color: #c0c4cc;
}
.log-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
}
.dl-controls {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.corrupt-tip {
  font-size: 12px;
  color: #e6a23c;
}
.dl-controls-tip {
  font-size: 12px;
  color: #909399;
}
.batch-dl-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: #f8f9fb;
  border-radius: 8px;
}
.batch-dl-label {
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}
.batch-dl-tip {
  font-size: 12px;
  color: #909399;
}
.batch-dl-panel {
  margin-bottom: 12px;
  padding: 10px 14px;
  background: #f8f9fb;
  border-radius: 8px;
}
.batch-dl-task {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
.task-name {
  width: 220px;
  font-size: 12px;
  color: #2c3e50;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-progress {
  flex: 1;
}
.dl-refresh {
  margin-top: 12px;
  text-align: right;
}
</style>
