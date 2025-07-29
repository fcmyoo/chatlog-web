import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './styles/main.css'
import 'animate.css'
import { serviceWorkerManager } from './utils/serviceWorkerManager'
import { resourcePreloader } from './utils/resourcePreloader'
import { performanceMonitor } from './utils/performanceMonitor'

// 创建Vue应用实例
const app = createApp(App)

// 注册所有Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 安装插件
app.use(pinia)  // 使用Pinia代替Vuex
app.use(router)
app.use(ElementPlus)

// 挂载应用
app.mount('#app')

// 初始化 PWA 功能
console.log('PWA 功能已启用')

// 预加载关键资源
document.addEventListener('DOMContentLoaded', () => {
  resourcePreloader.preloadCriticalResources().catch(error => {
    console.warn('关键资源预加载失败:', error)
  })
})

// 开发环境下暴露调试接口
if (import.meta.env.DEV) {
  // @ts-ignore
  window.__VUE_APP__ = app
  // @ts-ignore
  window.__VUE_PINIA__ = pinia
  // @ts-ignore  
  window.__VUE_ROUTER__ = router
  // @ts-ignore
  window.__SW_MANAGER__ = serviceWorkerManager
  // @ts-ignore
  window.__PERFORMANCE_MONITOR__ = performanceMonitor
}