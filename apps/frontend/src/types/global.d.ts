/**
 * 全局TypeScript声明文件
 * 整合所有全局类型定义，避免分散的声明文件
 */

// ===== Vue 相关声明 =====
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// ===== 环境变量声明 =====
declare global {
  interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string
    readonly VITE_API_BASE_URL: string
    readonly VITE_AI_API_BASE_URL: string
    readonly VITE_VAPID_KEY: string
    readonly NODE_ENV: 'development' | 'production' | 'test'
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

// ===== Vite 全局变量 =====
declare const __VUE_OPTIONS_API__: boolean
declare const __VUE_PROD_DEVTOOLS__: boolean

// ===== 开发环境调试接口 =====
declare global {
  interface Window {
    __VUE_APP__?: any
    __VUE_PINIA__?: any
    __VUE_ROUTER__?: any
    __SW_MANAGER__?: any
    __PERFORMANCE_MONITOR__?: any
  }
}

// ===== 静态资源模块声明 =====
declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.gif' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}

declare module '*.ico' {
  const src: string
  export default src
}

declare module '*.css' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.scss' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.sass' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.less' {
  const classes: { [key: string]: string }
  export default classes
}

// ===== JSON 模块声明 =====
declare module '*.json' {
  const value: any
  export default value
}

// ===== Element Plus 扩展 =====
declare module 'element-plus/dist/locale/zh-cn.mjs' {
  const locale: any
  export default locale
}

// Element Plus 消息组件类型扩展
declare global {
  interface ElMessageOptions {
    message?: string
    type?: 'success' | 'warning' | 'info' | 'error'
    duration?: number
    showClose?: boolean
    center?: boolean
    onClose?: () => void
  }
}

// ===== Service Worker 相关 =====
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: any
  }
}

// ===== 性能监控相关 =====
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }
}

// ===== 网络信息API =====
declare global {
  interface Navigator {
    connection?: {
      effectiveType: string
      downlink: number
      rtt: number
      saveData: boolean
    }
  }
}

// ===== Web Share API =====
declare global {
  interface Navigator {
    share?: (data: {
      title?: string
      text?: string
      url?: string
    }) => Promise<void>
  }
}

// ===== 文件系统访问API =====
declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      multiple?: boolean
      excludeAcceptAllOption?: boolean
      types?: Array<{
        description: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle[]>

    showSaveFilePicker?: (options?: {
      suggestedName?: string
      types?: Array<{
        description: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle>
  }
}

// ===== 通知API扩展 =====
declare global {
  interface NotificationOptions {
    badge?: string
    image?: string
    renotify?: boolean
    requireInteraction?: boolean
    silent?: boolean
    timestamp?: number
    vibrate?: number[]
  }
}

// 确保文件被识别为模块
export {} 