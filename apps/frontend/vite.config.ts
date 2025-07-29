import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

// 读取服务配置
let serviceConfig: any = {}
try {
  const configPath = resolve(__dirname, '../../packages/config/services.js')
  serviceConfig = require(configPath)
} catch (error) {
  console.warn('无法加载服务配置，使用默认配置:', (error as Error).message)
  serviceConfig = {
    services: { frontend: { port: 8080 } },
    proxyConfig: {
      '/api': { target: 'http://127.0.0.1:5030', changeOrigin: true },
      '/image': { target: 'http://127.0.0.1:5030', changeOrigin: true },
      '/video': { target: 'http://127.0.0.1:5030', changeOrigin: true },
      '/voice': { target: 'http://127.0.0.1:5030', changeOrigin: true },
      '/file': { target: 'http://127.0.0.1:5030', changeOrigin: true },
      '/data': { target: 'http://127.0.0.1:5030', changeOrigin: true }
    }
  }
}

export default defineConfig({
  plugins: [vue()],
  
  // 指定根目录和入口文件
  root: '.',
  base: './',
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/packages': resolve(__dirname, '../../packages'),
      '@/config': resolve(__dirname, '../../packages/config'),
      '@/observability': resolve(__dirname, '../../packages/observability'),
      '@/performance': resolve(__dirname, '../../packages/performance'),
      '@/shared': resolve(__dirname, '../../packages/shared')
    }
  },
  
  server: {
    port: serviceConfig.services?.frontend?.port || 8080,
    host: 'localhost',
    open: true,
    proxy: serviceConfig.proxyConfig || {
      '/api': { target: 'http://127.0.0.1:5030', changeOrigin: true }
    }
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vue 相关
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          
          // UI 库
          'ui-vendor': ['element-plus', '@element-plus/icons-vue'],
          
          // 图表库
          'chart-vendor': ['echarts', 'vue-echarts'],
          
          // 工具库
          'utils-vendor': ['axios', 'dayjs', '@vueuse/core'],
          
          // 异步组件分离
          'async-components': [
            './src/components/VirtualScroll.vue',
            './src/components/VirtualContactList.vue',
            './src/components/ResponsiveImage.vue'
          ]
        },
        
        // 资源文件命名
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop()
          if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
            return 'images/[name]-[hash].[ext]'
          }
          if (['woff', 'woff2', 'eot', 'ttf', 'otf'].includes(ext || '')) {
            return 'fonts/[name]-[hash].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    },
    
    // 优化构建性能
    target: 'es2015',
    minify: 'esbuild',
    
    // 资源内联阈值
    assetsInlineLimit: 4096, // 4KB 以下的资源内联
    
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    
    // 预加载资源
    manifest: true, // 生成 manifest.json 用于预加载
  },
  
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/variables.scss";'
      }
    }
  },
  
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia', // 使用 pinia 替代 vuex
      'element-plus',
      '@element-plus/icons-vue',
      'echarts',
      'vue-echarts',
      'axios'
    ],
    
    // 排除大型依赖，使用动态导入
    exclude: ['@vueuse/core'],
    
    // 强制预构建
    force: process.env.NODE_ENV === 'development'
  },
  
  // 开发环境配置
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
}) 