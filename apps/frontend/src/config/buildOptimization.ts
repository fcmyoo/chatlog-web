/**
 * Vite 构建优化配置
 * 针对资源加载和构建性能进行优化
 */

import { defineConfig } from 'vite'
import { resolve } from 'path'

// 图片优化插件配置
const imageOptimizationConfig = {
  // 启用图片压缩
  compress: {
    jpeg: { quality: 85 },
    png: { quality: 85 },
    webp: { quality: 85 }
  },
  
  // 自动生成 WebP 格式
  generateWebP: true,
  
  // 响应式图片尺寸
  responsiveImages: {
    sizes: [320, 640, 768, 1024, 1280, 1920],
    formats: ['webp', 'jpeg']
  }
}

// 字体优化配置
const fontOptimizationConfig = {
  // 字体子集化
  subset: {
    chinese: true,
    latin: true
  },
  
  // 字体格式转换
  formats: ['woff2', 'woff'],
  
  // 字体预加载
  preload: [
    '/fonts/chinese-subset.woff2',
    '/fonts/icons.woff2'
  ]
}

// 代码分割配置
const codeSplittingConfig = {
  // 供应商库分离
  vendor: {
    vue: ['vue', 'vue-router', 'pinia'],
    ui: ['element-plus'],
    charts: ['echarts', 'vue-echarts'],
    utils: ['axios', 'dayjs']
  },
  
  // 路由级别代码分割
  routes: true,
  
  // 组件级别代码分割
  components: {
    threshold: 50, // KB
    async: true
  }
}

// 资源预加载配置
const preloadConfig = {
  // 关键资源预加载
  critical: [
    '/css/critical.css',
    '/js/critical.js',
    '/fonts/main.woff2'
  ],
  
  // 预连接域名
  preconnect: [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ],
  
  // DNS 预解析
  dnsPrefetch: [
    'https://cdn.jsdelivr.net',
    'https://unpkg.com'
  ]
}

export {
  imageOptimizationConfig,
  fontOptimizationConfig,
  codeSplittingConfig,
  preloadConfig
}