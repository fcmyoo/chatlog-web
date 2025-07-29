import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'
import type { RouteConfig } from '@/types'

// 带预加载的动态导入函数
const lazyLoad = (path: string, chunkName?: string) => {
  return () => {
    const component = import(
      /* webpackChunkName: "[request]" */
      /* webpackPreload: true */
      `@/views/${path}.vue`
    )
    
    return component
  }
}

// 带错误边界的懒加载
const lazyLoadWithErrorBoundary = (path: string, fallback?: string) => {
  return () => {
    return import(`@/views/${path}.vue`).catch((error) => {
      console.error(`Failed to load component: ${path}`, error)
      // 回退到默认组件或错误页面
      return fallback ? import(`@/views/${fallback}.vue`) : Promise.reject(error)
    })
  }
}

// 路由配置类型
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: lazyLoad('Dashboard'),
        meta: { 
          title: '仪表盘',
          preload: true, // 预加载标记
          priority: 'high'
        }
      },
      {
        path: '/analytics',
        name: 'Analytics',
        component: lazyLoad('Analytics'),
        meta: { 
          title: '数据分析',
          preload: true,
          priority: 'high'
        }
      },
      {
        path: '/ai-analysis',
        name: 'AIAnalysis',
        component: lazyLoad('AIAnalysis'),
        meta: { 
          title: 'AI智能分析',
          preload: false,
          priority: 'medium'
        }
      },
      {
        path: '/ai-service',
        name: 'AIServiceManagement',
        component: lazyLoad('AIServiceManagement'),
        meta: { 
          title: 'AI服务管理',
          preload: false,
          priority: 'low'
        }
      },
      {
        path: '/chatlog',
        name: 'ChatLog',
        component: lazyLoad('ChatLog'),
        meta: { 
          title: '聊天记录',
          preload: true,
          priority: 'high'
        }
      },
      {
        path: '/contacts',
        name: 'Contacts',
        component: lazyLoad('Contacts'),
        meta: { 
          title: '联系人管理',
          preload: true,
          priority: 'high'
        }
      },
      {
        path: '/contacts-enhanced',
        name: 'ContactsEnhanced',
        component: lazyLoad('ContactsEnhanced'),
        meta: { 
          title: '联系人管理 (增强版)',
          preload: false,
          priority: 'medium'
        }
      },
      {
        path: '/chatrooms',
        name: 'ChatRooms',
        component: lazyLoad('ChatRooms'),
        meta: { 
          title: '群聊管理',
          preload: true,
          priority: 'high'
        }
      },
      {
        path: '/sessions',
        name: 'Sessions',
        component: lazyLoad('Sessions'),
        meta: { 
          title: '会话列表',
          preload: false,
          priority: 'medium'
        }
      },
      {
        path: '/media',
        name: 'Media',
        component: lazyLoad('Media'),
        meta: { 
          title: '多媒体管理',
          preload: false,
          priority: 'low'
        }
      }
    ]
  }
]

// 智能预加载系统
class RouterPreloader {
  private loadedChunks = new Set<string>()
  private loadingChunks = new Set<string>()
  private preloadQueue: Array<{ route: RouteRecordRaw; priority: number }> = []

  constructor(private routes: RouteRecordRaw[]) {
    this.initializePreloader()
  }

  private initializePreloader() {
    // 在空闲时间预加载高优先级路由
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        this.preloadHighPriorityRoutes()
      })
    } else {
      // 降级处理
      setTimeout(() => {
        this.preloadHighPriorityRoutes()
      }, 1000)
    }

    // 监听用户交互，预加载相关路由
    this.setupInteractionPreloading()
  }

  private preloadHighPriorityRoutes() {
    const highPriorityRoutes = this.getRoutesByPriority('high')
    highPriorityRoutes.forEach(route => {
      if (route.meta?.preload) {
        this.preloadRoute(route)
      }
    })
  }

  private getRoutesByPriority(priority: string): RouteRecordRaw[] {
    const extractRoutes = (routes: RouteRecordRaw[]): RouteRecordRaw[] => {
      const result: RouteRecordRaw[] = []
      routes.forEach(route => {
        if (route.meta?.priority === priority) {
          result.push(route)
        }
        if (route.children) {
          result.push(...extractRoutes(route.children))
        }
      })
      return result
    }
    
    return extractRoutes(this.routes)
  }

  private async preloadRoute(route: RouteRecordRaw) {
    const routeName = route.name as string
    if (this.loadedChunks.has(routeName) || this.loadingChunks.has(routeName)) {
      return
    }

    this.loadingChunks.add(routeName)
    
    try {
      if (typeof route.component === 'function') {
        await (route.component as Function)()
        this.loadedChunks.add(routeName)
        console.log(`预加载路由成功: ${routeName}`)
      }
    } catch (error) {
      console.warn(`预加载路由失败: ${routeName}`, error)
    } finally {
      this.loadingChunks.delete(routeName)
    }
  }

  private setupInteractionPreloading() {
    // 鼠标悬停预加载
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement
      const routerLink = target.closest('[href]') as HTMLAnchorElement
      
      if (routerLink && routerLink.href) {
        const route = this.findRouteByPath(routerLink.getAttribute('href') || '')
        if (route && route.meta?.priority !== 'low') {
          this.preloadRoute(route)
        }
      }
    })

    // 触摸开始预加载（移动端）
    document.addEventListener('touchstart', (event) => {
      const target = event.target as HTMLElement
      const routerLink = target.closest('[href]') as HTMLAnchorElement
      
      if (routerLink && routerLink.href) {
        const route = this.findRouteByPath(routerLink.getAttribute('href') || '')
        if (route) {
          this.preloadRoute(route)
        }
      }
    })
  }

  private findRouteByPath(path: string): RouteRecordRaw | null {
    const findInRoutes = (routes: RouteRecordRaw[]): RouteRecordRaw | null => {
      for (const route of routes) {
        if (route.path === path) {
          return route
        }
        if (route.children) {
          const found = findInRoutes(route.children)
          if (found) return found
        }
      }
      return null
    }
    
    return findInRoutes(this.routes)
  }

  // 根据用户行为预测下一个可能访问的路由
  predictNextRoute(currentRoute: string): string[] {
    const routeGraph: { [key: string]: string[] } = {
      '/dashboard': ['/analytics', '/contacts', '/chatlog'],
      '/contacts': ['/chatlog', '/chatrooms'],
      '/chatlog': ['/contacts', '/analytics'],
      '/analytics': ['/dashboard', '/chatlog'],
      '/chatrooms': ['/chatlog', '/contacts']
    }
    
    return routeGraph[currentRoute] || []
  }

  // 预加载相关路由
  preloadRelatedRoutes(currentRoute: string) {
    const relatedRoutes = this.predictNextRoute(currentRoute)
    relatedRoutes.forEach(path => {
      const route = this.findRouteByPath(path)
      if (route) {
        // 延迟预加载，避免影响当前页面性能
        setTimeout(() => {
          this.preloadRoute(route)
        }, 2000)
      }
    })
  }
}

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 创建预加载器实例
const preloader = new RouterPreloader(routes)

// 路由守卫 - 性能监控和预加载
router.beforeEach((to, from, next) => {
  // 记录路由切换开始时间
  const startTime = performance.now()
  
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - Chatlog Web`
  }
  
  // 预加载相关路由
  if (to.path) {
    preloader.preloadRelatedRoutes(to.path)
  }
  
  // 存储路由切换时间到meta中
  to.meta = {
    ...to.meta,
    navigationStartTime: startTime
  }
  
  next()
})

router.afterEach((to, from) => {
  // 计算路由切换时间
  const startTime = to.meta?.navigationStartTime as number
  if (startTime) {
    const navigationTime = performance.now() - startTime
    console.log(`路由切换耗时: ${to.path} - ${navigationTime.toFixed(2)}ms`)
    
    // 发送性能指标（可选）
    if (navigationTime > 1000) {
      console.warn(`路由切换较慢: ${to.path} - ${navigationTime.toFixed(2)}ms`)
    }
  }
  
  // 清理navigation timing
  delete to.meta?.navigationStartTime
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  
  // 这里可以添加错误上报逻辑
  // errorReporter.report('router_error', error)
})

export default router

// 导出预加载器供其他模块使用
export { preloader as routerPreloader }