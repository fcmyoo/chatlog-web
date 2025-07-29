/**
 * AI Service 核心类型定义
 * 为 TypeScript 重构提供基础类型支持
 */

// ==================== 配置相关类型 ====================

export interface ModelConfig {
  provider: string;
  config: {
    model?: string | undefined;
    apiKey?: string | undefined;
    baseURL?: string | undefined;
    [key: string]: any;
  };
}

export interface AISettings {
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface ChatlogConfig {
  baseURL: string;
  timeout: number;
}

export interface ScheduleConfig {
  enabled: boolean;
  cronTime: string;
  maxConcurrent: number;
  retryAttempts: number;
  retryDelay: number;
}

// ==================== 数据模型类型 ====================

export interface ChatMessage {
  senderName: string;
  senderId: string;
  time: string;
  content: string;
  timestamp: number;
  groupName: string;
  talkerName: string;
}

export interface AnalysisMetadata {
  id: string;
  title: string;
  groupName: string;
  analysisType: string;
  timeRange: string;
  messageCount: number;
  timestamp: string;
  customPrompt?: string | null;
}

export interface AnalysisResult {
  historyId: string;
  title: string;
  metadata: AnalysisMetadata;
  preview: string;
}

export interface AnalysisHistoryItem {
  id: string;
  title: string;
  groupName: string;
  analysisType: string;
  timeRange: string;
  messageCount: number;
  timestamp: string;
  preview: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== API 响应类型 ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    timestamp: string;
    details?: any;
  };
  suggestions?: string[];
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  response?: string;
  duration?: number;
  provider?: string;
  model?: string;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services?: {
    ai?: any;
    data?: any;
    storage?: any;
  };
  error?: string;
}

// ==================== 缓存相关类型 ====================

export interface CacheStats {
  size: number;
  maxSize: number;
  timeout: number;
  keys: string[];
}

export interface CacheItem<T = any> {
  data: T;
  expiry: number;
  timestamp: string;
}

// ==================== 错误处理类型 ====================

export interface ErrorDetails {
  originalError?: string;
  stack?: string;
  [key: string]: any;
}

export interface AppErrorOptions {
  type?: string;
  statusCode?: number;
  details?: ErrorDetails;
}

// ==================== Express 扩展类型 ====================

declare global {
  namespace Express {
    interface Request {
      logger?: any;
      optimizedRequest?: (id: string, fn: () => Promise<any>, options?: any) => Promise<any>;
      batchRequest?: (requests: any[], options?: any) => Promise<any>;
    }
  }
}

// ==================== 工具类型 ====================

export type AnalysisType = 'programming' | 'science' | 'reading' | 'custom';

export type ErrorType =
  | 'VALIDATION_ERROR'
  | 'BUSINESS_ERROR'
  | 'EXTERNAL_API_ERROR'
  | 'SYSTEM_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR';

// 错误类型常量，用于避免索引访问问题
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR' as const,
  BUSINESS_ERROR: 'BUSINESS_ERROR' as const,
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR' as const,
  SYSTEM_ERROR: 'SYSTEM_ERROR' as const,
  TIMEOUT_ERROR: 'TIMEOUT_ERROR' as const,
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR' as const,
} as const;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ==================== 过渡期类型 ====================

// 允许 any 类型作为过渡，逐步替换为具体类型
export type AnyObject = { [key: string]: any };
export type AnyFunction = (...args: any[]) => any;
export type AnyPromise = Promise<any>;

// 兼容现有代码的宽松类型
export interface LooseConfig extends Record<string, any> {
  [key: string]: any;
}

export interface LooseRequest extends Record<string, any> {
  body?: any;
  query?: any;
  params?: any;
  [key: string]: any;
}

export interface LooseResponse extends Record<string, any> {
  json?: (data: any) => any;
  status?: (code: number) => any;
  send?: (data: any) => any;
  [key: string]: any;
}