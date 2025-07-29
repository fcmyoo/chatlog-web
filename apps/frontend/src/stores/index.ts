import { createPinia } from 'pinia'
import { useMainStore } from './main'
import { useAIStore } from './ai'

/**
 * Pinia 状态管理入口文件
 * 统一导出所有stores和Pinia实例
 */

// 创建Pinia实例
export const pinia = createPinia()

// 导出所有stores
export { useMainStore, useAIStore }

// 默认导出Pinia实例
export default pinia

// 类型声明模块增强
declare module 'pinia' {
  export interface PiniaCustomProperties {
    // 可以在这里添加全局属性
  }
}