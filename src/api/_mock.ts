/**
 * Mock 数据辅助工具
 * 切换真实后端时，可删除此文件或将 USE_MOCK 设为 false
 */

/** 是否启用 Mock 模式（true: 使用本地 Mock 数据；false: 使用真实后端） */
export const USE_MOCK = false

/** 模拟网络延迟 */
export const mockDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Mock 包装器：在 USE_MOCK=true 时返回 mock 数据，否则调用真实请求
 * @param mockFn 返回 mock 数据的函数
 * @param realFn 真实请求函数（可选）
 */
export async function mockOrReal<T>(mockFn: () => T, realFn?: () => Promise<T>): Promise<T> {
  if (USE_MOCK || !realFn) {
    await mockDelay()
    return mockFn()
  }
  return realFn()
}
