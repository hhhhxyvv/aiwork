import request from '@/utils/request'
import { mockOrReal } from './_mock'
import type { StorageFile, StorageType } from './types'

/** Mock 存储记录库 */
const mockStore: StorageFile[] = [
  {
    id: 3,
    fileName: '2026届毕业生就业质量年报.pdf',
    fileType: 'pdf',
    fileSize: 2 * 1024 * 1024 + 350 * 1024,
    storageType: 'OSS',
    filePath: 'https://ai-job-oss.oss-cn-hangzhou.aliyuncs.com/reports/2026-annual.pdf',
    createTime: '2026-10-14 10:22:31'
  },
  {
    id: 2,
    fileName: '毕业证与学位证扫描件.jpg',
    fileType: 'jpg',
    fileSize: 860 * 1024,
    storageType: 'DATABASE',
    filePath: 'db://ai_job/storage_file/blob_id_20481',
    createTime: '2026-10-12 16:05:09'
  },
  {
    id: 1,
    fileName: 'career-fair-access.log',
    fileType: 'log',
    fileSize: 42 * 1024,
    storageType: 'LOCAL',
    filePath: 'D:/storage/local/2026/10/career-fair-access.log',
    createTime: '2026-10-11 09:41:52'
  }
]

/** 根据介质生成本地模拟的存储路径 */
const mockPath = (fileName: string, storageType: StorageType): string => {
  if (storageType === 'OSS') return `https://ai-job-oss.oss-cn-hangzhou.aliyuncs.com/demo/${fileName}`
  if (storageType === 'DATABASE') return `db://ai_job/storage_file/blob_id_${Date.now()}`
  return `D:/storage/local/2026/10/${fileName}`
}

/**
 * 上传文件到指定存储介质（FormData：file + storageType）
 * 真实后端: POST /api/storage/upload
 */
export function uploadFile(file: File, storageType: StorageType) {
  return mockOrReal<StorageFile>(
    () => {
      const record: StorageFile = {
        id: Date.now(),
        fileName: file.name,
        fileType: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        fileSize: file.size,
        storageType,
        filePath: mockPath(file.name, storageType),
        createTime: new Date().toLocaleString('zh-CN', { hour12: false })
      }
      mockStore.unshift(record)
      return record
    },
    () => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('storageType', storageType)
      return request.post('/storage/upload', formData)
    }
  )
}

/**
 * 获取历史存储文件记录
 * 真实后端: GET /api/storage/list
 */
export function getStorageList() {
  return mockOrReal<StorageFile[]>(
    () => [...mockStore],
    () => request.get('/storage/list')
  )
}

// ==================== 文件传输演示（大/小文件上传下载） ====================

/**
 * ★演示点2：小文件批量上传 —— 多个文件 append 进同一个 FormData 的 files 字段
 * 真实后端: POST /api/storage/batch-upload（FormData: files 多文件）
 */
export function batchUploadFiles(files: File[]) {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  return request.post('/storage/batch-upload', formData)
}

/**
 * ★演示点3：上传断点续传 —— 上传前查询已存在分片（秒传 / 续传依据）
 * 真实后端: GET /api/storage/chunk/check?fileHash=xxx
 */
export function checkChunks(fileHash: string) {
  return request.get('/storage/chunk/check', { params: { fileHash } })
}

/**
 * ★演示点1：上传单个分片，携带 chunkMd5 供服务端损坏校验（不匹配返回 code=5001）
 * 真实后端: POST /api/storage/chunk/upload
 */
export function uploadChunk(chunk: Blob, fileHash: string, chunkIndex: number, chunkMd5?: string) {
  const formData = new FormData()
  formData.append('file', chunk, `chunk-${chunkIndex}`)
  formData.append('fileHash', fileHash)
  formData.append('chunkIndex', String(chunkIndex))
  if (chunkMd5) formData.append('chunkMd5', chunkMd5)
  return request.post('/storage/chunk/upload', formData)
}

/**
 * ★演示点1：分片合并 —— 后端接口用 @RequestParam，必须用 FormData 提交
 * 真实后端: POST /api/storage/chunk/merge
 */
export function mergeChunks(params: {
  fileHash: string
  fileName: string
  chunkTotal: number
  fileSize: number
}) {
  const formData = new FormData()
  formData.append('fileHash', params.fileHash)
  formData.append('fileName', params.fileName)
  formData.append('chunkTotal', String(params.chunkTotal))
  formData.append('fileSize', String(params.fileSize))
  return request.post('/storage/chunk/merge', formData)
}

/**
 * ★演示点4：普通下载 —— axios onDownloadProgress 用 loaded/total 驱动进度条
 * 真实后端: GET /api/storage/download/{id}
 */
export function downloadFileById(
  id: number | string,
  onProgress?: (loaded: number, total: number) => void
) {
  return request.get(`/storage/download/${id}`, {
    responseType: 'blob',
    timeout: 0, // 大文件/并发下载不限时（request 实例默认 10s 会中断长下载）
    onDownloadProgress: (e) => onProgress?.(e.loaded, e.total ?? 0)
  })
}
