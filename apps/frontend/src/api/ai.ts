/**
 * AI API客户端 - 重构为使用统一ApiClient
 * 保持向后兼容性，逐步迁移到新架构
 */

import { aiApi } from './ApiClient'

// 直接导出统一客户端的AI部分
export { aiApi }

// 保持向后兼容的默认导出
export default aiApi 