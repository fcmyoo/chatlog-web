/**
 * 类型定义统一入口
 * 重新导出所有类型定义，提供统一的导入入口
 */

// 重新导出API相关类型
export * from './api'

// 重新导出现有的类型定义（从原来的types/index.ts）
export type {
  Contact,
  ChatRoom,
  Session,
  ChatMessage,
  ChatLog,
  ChatLogParams,
  MediaFile,
  AnalyticsData,
  AIModel,
  AIAnalysis,
  ScheduledTask,
  ApiResponse,
  PaginationData,
  RootState,
  AIServiceState,
  StatsCardProps,
  ChartComponentProps,
  DataTableProps,
  TableColumn,
  RouteConfig,
  AppError,
  ValidationRule,
  FormRules,
  DeepPartial,
  Optional,
  RequiredFields,
  MessageType,
  AIModelProvider,
  ServiceStatus
} from '../types'

// 应用级别的类型定义
export interface AppConfig {
  title: string
  version: string
  apiBaseUrl: string
  aiApiBaseUrl: string
  enablePWA: boolean
  enableAnalytics: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  pageSize: number
  autoRefresh: boolean
  notifications: boolean
}

export interface AppState {
  initialized: boolean
  loading: boolean
  error: string | null
  user: UserPreferences
  config: AppConfig
}