/**
 * 共享类型定义和工具函数
 */

// 通用类型定义
export interface ServiceConfig {
  host: string
  port: number
  protocol: 'http' | 'https'
  baseURL: string
  apiPath?: string
}

export interface ChatlogData {
  senderName: string
  senderId: string
  time: string
  content: string
  timestamp: number
}

export interface AnalysisResult {
  id: string
  type: string
  groupName: string
  startTime: string
  endTime: string
  result: string
  createdAt: string
  status: 'pending' | 'completed' | 'failed'
}

// 工具函数
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

export const parseCSV = (csvText: string): Record<string, string>[] => {
  if (!csvText || typeof csvText !== 'string') {
    console.warn('parseCSV: 输入数据不是字符串')
    return []
  }
  
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim())
  const data = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    data.push(row)
  }
  
  return data
}

// API 响应标准化
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export const createApiResponse = <T>(
  success: boolean, 
  data?: T, 
  error?: string
): ApiResponse<T> => ({
  success,
  data,
  error
})