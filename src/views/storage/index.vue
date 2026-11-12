<template>
  <div class="storage-container">
    <!-- ================= 1. 顶部操作与控制卡片 ================= -->
    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="header-title">
          <span class="title">大数据多级存储管理中心</span>
          <span class="subtitle">
            支持本地磁盘 (Local)、数据库二进制 (MySQL BLOB)、云对象存储 (Aliyun OSS) 三种介质分流存储与生命周期管理
          </span>
        </div>
      </template>

      <el-row :gutter="24" align="middle">
        <!-- 存储介质切换 -->
        <el-col :span="9">
          <div class="radio-label">请选择存储介质：</div>
          <el-radio-group v-model="storageType" class="type-radio-group">
            <el-radio-button value="LOCAL">1. 本地磁盘存储 (Local Disk)</el-radio-button>
            <el-radio-button value="DATABASE">2. 数据库BLOB存储 (MySQL LONGBLOB)</el-radio-button>
            <el-radio-button value="OSS">3. 对象存储 (Aliyun OSS)</el-radio-button>
          </el-radio-group>
        </el-col>

        <!-- 拖拽上传 -->
        <el-col :span="15">
          <el-upload
            class="upload-area"
            drag
            multiple
            :show-file-list="false"
            :http-request="handleUpload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.log,.xls,.xlsx,.zip"
          >
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <div class="upload-text">将简历 PDF、证书图片、日志文本等文件拖到此处，或 <em>点击上传</em></div>
            <template #tip>
              <div class="upload-tip">
                当前存储介质：<el-tag :type="typeTagMap[storageType].type" size="small">{{ typeTagMap[storageType].label }}</el-tag>
                上传成功后自动刷新下方记录明细
              </div>
            </template>
          </el-upload>
        </el-col>
      </el-row>
    </el-card>

    <!-- ================= 2. 存储介质对比分析 ================= -->
    <el-row :gutter="16" class="compare-row">
      <el-col :span="8">
        <el-card shadow="hover" class="compare-card">
          <div class="compare-title local"><el-icon><Monitor /></el-icon>本地磁盘存储</div>
          <div class="compare-desc">高 I/O 读写、零费用，适用于临时缓存、导出报表。</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="compare-card">
          <div class="compare-title db"><el-icon><Coin /></el-icon>数据库 BLOB</div>
          <div class="compare-desc">事务强一致、安全防篡改，适用于数字证书、签章凭证。</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="compare-card">
          <div class="compare-title oss"><el-icon><Cloudy /></el-icon>云 OSS</div>
          <div class="compare-desc">海量弹性、公网 CDN、多节点共享，适用于简历附件、面试录像。</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ================= 3. 历史存储记录明细表格 ================= -->
    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="table-header">
          <span class="title">历史存储记录明细</span>
          <div class="header-actions">
            <el-input
              v-model="keyword"
              placeholder="按文件名搜索..."
              clearable
              :prefix-icon="Search"
              style="width: 220px"
            />
            <el-button type="primary" plain :icon="Refresh" :loading="loading" @click="fetchList">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="filteredRecords" stripe style="width: 100%">
        <el-table-column prop="id" label="记录 ID" width="120" />
        <el-table-column prop="fileName" label="原始文件名" min-width="200" show-overflow-tooltip />
        <el-table-column label="文件格式" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ (row.fileType || 'N/A').toUpperCase() }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="文件大小" width="110" align="center">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="存储介质" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagMap[row.storageType as StorageType]?.type || 'info'">
              {{ typeTagMap[row.storageType as StorageType]?.label || row.storageType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="存储路径 / 访问地址" min-width="300">
          <template #default="{ row }">
            <div class="path-cell">
              <el-link
                v-if="row.filePath.startsWith('http')"
                :href="row.filePath"
                target="_blank"
                type="primary"
                class="path-text"
              >
                {{ row.filePath }}
              </el-link>
              <span v-else class="path-text plain">{{ row.filePath }}</span>
              <el-button link type="primary" :icon="CopyDocument" title="复制路径" @click="copyPath(row.filePath)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="上传时间" width="170" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'
import { Search, Refresh, CopyDocument } from '@element-plus/icons-vue'
import { uploadFile, getStorageList } from '@/api/storage'
import type { StorageFile, StorageType } from '@/api/types'

// 存储介质元信息：中文标签 + 对应 el-tag 颜色
const typeTagMap: Record<StorageType, { label: string; type: 'info' | 'warning' | 'success' }> = {
  LOCAL: { label: '本地磁盘', type: 'info' },
  DATABASE: { label: '数据库BLOB', type: 'warning' },
  OSS: { label: '云OSS', type: 'success' }
}

// 当前选中的存储介质（上传时自动附带）
const storageType = ref<StorageType>('LOCAL')

// ================= 历史记录列表 =================
const records = ref<StorageFile[]>([])
const loading = ref(false)
const keyword = ref('')

const filteredRecords = computed(() =>
  records.value.filter(
    (r) => !keyword.value || r.fileName.toLowerCase().includes(keyword.value.toLowerCase())
  )
)

const fetchList = async () => {
  loading.value = true
  try {
    records.value = await getStorageList()
  } catch {
    // 请求拦截器已统一弹错，保留已有数据
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

// 文件大小格式化：B → KB → MB
const formatSize = (bytes: number): string => {
  if (bytes === null || bytes === undefined) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// 复制存储路径
const copyPath = async (path: string) => {
  try {
    await navigator.clipboard.writeText(path)
    ElMessage.success('路径已复制到剪贴板')
  } catch {
    // 非 https 环境降级方案
    const input = document.createElement('textarea')
    input.value = path
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('路径已复制到剪贴板')
  }
}

// ================= 自定义上传（走统一 request 实例，自动附带 storageType） =================
const handleUpload = async (options: UploadRequestOptions) => {
  const mode = typeTagMap[storageType.value].label
  try {
    await uploadFile(options.file, storageType.value)
    ElMessage.success(`上传成功！文件已存入「${mode}」`)
    await fetchList()
  } catch {
    // 请求拦截器已统一弹错
  }
}
</script>

<style scoped>
.storage-container {
  padding: 20px;
}
.panel-card {
  margin-bottom: 20px;
}
.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title {
  font-size: 16px;
  font-weight: 700;
  color: #2c3e50;
}
.subtitle {
  font-size: 12px;
  color: #909399;
}
.radio-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}
.type-radio-group :deep(.el-radio-button__inner) {
  padding: 10px 14px;
  font-size: 12px;
}
.upload-area :deep(.el-upload-dragger) {
  padding: 18px 20px;
}
.upload-icon {
  font-size: 40px;
  color: #4dabf7;
  margin-bottom: 6px;
}
.upload-text {
  font-size: 13px;
  color: #606266;
}
.upload-text em {
  color: #4dabf7;
  font-style: normal;
}
.upload-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

/* 对比分析卡片 */
.compare-row {
  margin-bottom: 20px;
}
.compare-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 8px;
}
.compare-title.local {
  color: #909399;
}
.compare-title.db {
  color: #e6a23c;
}
.compare-title.oss {
  color: #67c23a;
}
.compare-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}

/* 明细表格 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions {
  display: flex;
  gap: 10px;
}
.path-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
.path-text {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.path-text.plain {
  color: #606266;
}
</style>
