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
