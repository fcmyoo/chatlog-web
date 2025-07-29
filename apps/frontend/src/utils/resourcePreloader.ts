/**
 * 资源预加载工具
 * 基于优先级和策略的智能资源预加载系统
 */

export interface PreloadStrategy {
  images: boolean
  fonts: boolean
  scripts: boolean
  stylesheets: boolean
  prefetch: boolean
  preconnect: boolean
}

export interface PreloadOptions {
  priority?: 'high' | 'medium' | 'low'
  strategy?: Partial<PreloadStrategy>
  delay?: number
  condition?: () => boolean
}

/**
 * 资源预加载管理器
 */
export class ResourcePreloader {
  private preloadedResources = new Set<string>()
  private preloadPromises = new Map<string, Promise<void>>()
  private defaultStrategy: PreloadStrategy = {
    images: true,
    fonts: true,
    scripts: true,
    stylesheets: true,
    prefetch: true,
    preconnect: true
  }

  /**
   * 预加载图片资源
   */
  async preloadImages(urls: string[], options: PreloadOptions = {}): Promise<void> {
    const { priority = 'medium', delay = 0 } = options

    if (delay > 0) {
      await this.delay(delay)
    }

    const promises = urls.map(url => this.preloadImage(url, priority))
    await Promise.allSettled(promises)
  }

  /**
   * 预加载单个图片
   */
  private preloadImage(url: string, priority: string): Promise<void> {
    if (this.preloadedResources.has(url)) {
      return Promise.resolve()
    }

    if (this.preloadPromises.has(url)) {
      return this.preloadPromises.get(url)!
    }

    const promise = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = url
      
      if (priority === 'high') {
        link.fetchPriority = 'high'
      } else if (priority === 'low') {
        link.fetchPriority = 'low'
      }

      link.onload = () => {
        this.preloadedResources.add(url)
        resolve()
      }

      link.onerror = () => {
        console.warn('图片预加载失败:', url)
        reject(new Error(`预加载失败: ${url}`))
      }

      document.head.appendChild(link)
    })

    this.preloadPromises.set(url, promise)
    return promise
  }

  /**
   * 预加载字体
   */
  async preloadFonts(fonts: Array<{ url: string; format?: string }>): Promise<void> {
    const promises = fonts.map(font => this.preloadFont(font.url, font.format))
    await Promise.allSettled(promises)
  }

  /**
   * 预加载单个字体
   */
  private preloadFont(url: string, format?: string): Promise<void> {
    if (this.preloadedResources.has(url)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.href = url
      link.crossOrigin = 'anonymous'
      
      if (format) {
        link.type = `font/${format}`
      }

      link.onload = () => {
        this.preloadedResources.add(url)
        resolve()
      }

      link.onerror = () => {
        console.warn('字体预加载失败:', url)
        reject(new Error(`字体预加载失败: ${url}`))
      }

      document.head.appendChild(link)
    })
  }

  /**
   * 预加载脚本
   */
  async preloadScripts(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.preloadScript(url))
    await Promise.allSettled(promises)
  }

  /**
   * 预加载单个脚本
   */
  private preloadScript(url: string): Promise<void> {
    if (this.preloadedResources.has(url)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'script'
      link.href = url

      link.onload = () => {
        this.preloadedResources.add(url)
        resolve()
      }

      link.onerror = () => {
        console.warn('脚本预加载失败:', url)
        reject(new Error(`脚本预加载失败: ${url}`))
      }

      document.head.appendChild(link)
    })
  }

  /**
   * 预连接到域名
   */
  preconnect(domains: string[]): void {
    domains.forEach(domain => {
      if (this.preloadedResources.has(`preconnect:${domain}`)) return

      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      link.crossOrigin = 'anonymous'

      document.head.appendChild(link)
      this.preloadedResources.add(`preconnect:${domain}`)
    })
  }

  /**
   * DNS 预解析
   */
  dnsPrefetch(domains: string[]): void {
    domains.forEach(domain => {
      if (this.preloadedResources.has(`dns:${domain}`)) return

      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = domain

      document.head.appendChild(link)
      this.preloadedResources.add(`dns:${domain}`)
    })
  }

  /**
   * 预取资源
   */
  prefetch(urls: string[]): void {
    urls.forEach(url => {
      if (this.preloadedResources.has(`prefetch:${url}`)) return

      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url

      document.head.appendChild(link)
      this.preloadedResources.add(`prefetch:${url}`)
    })
  }

  /**
   * 基于用户行为的智能预加载
   */
  setupIntelligentPreloading(): void {
    // 鼠标悬停预加载
    this.setupHoverPreloading()
    
    // 视口内预加载
    this.setupViewportPreloading()
    
    // 空闲时间预加载
    this.setupIdlePreloading()
  }

  /**
   * 鼠标悬停预加载
   */
  private setupHoverPreloading(): void {
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement
      
      if (link && link.href) {
        const url = new URL(link.href, location.origin)
        
        // 只预加载同域链接
        if (url.origin === location.origin) {
          this.prefetch([url.pathname])
        }
      }
      
      // 预加载图片
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement
        const dataSrc = img.dataset.src
        if (dataSrc && !img.src) {
          this.preloadImages([dataSrc], { priority: 'high' })
        }
      }
    })
  }

  /**
   * 视口内预加载
   */
  private setupViewportPreloading(): void {
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            const preloadUrls = element.dataset.preload?.split(',') || []
            
            if (preloadUrls.length > 0) {
              this.preloadImages(preloadUrls, { priority: 'medium' })
              observer.unobserve(element)
            }
          }
        })
      },
      {
        rootMargin: '100px'
      }
    )

    // 观察带有 data-preload 属性的元素
    document.querySelectorAll('[data-preload]').forEach(el => {
      observer.observe(el)
    })
  }

  /**
   * 空闲时间预加载
   */
  private setupIdlePreloading(): void {
    const preloadInIdle = () => {
      // 预加载关键资源
      const criticalImages = document.querySelectorAll('img[data-critical]')
      const urls = Array.from(criticalImages).map(img => 
        (img as HTMLImageElement).dataset.critical!
      ).filter(Boolean)

      if (urls.length > 0) {
        this.preloadImages(urls, { priority: 'high' })
      }
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadInIdle)
    } else {
      setTimeout(preloadInIdle, 2000)
    }
  }

  /**
   * 批量预加载资源
   */
  async preloadResources(resources: {
    images?: string[]
    fonts?: Array<{ url: string; format?: string }>
    scripts?: string[]
    domains?: string[]
  }, options: PreloadOptions = {}): Promise<void> {
    const { strategy = this.defaultStrategy, condition } = options

    // 检查条件
    if (condition && !condition()) {
      return
    }

    const promises: Promise<void>[] = []

    // 预连接域名
    if (resources.domains && strategy.preconnect) {
      this.preconnect(resources.domains)
    }

    // 预加载图片
    if (resources.images && strategy.images) {
      promises.push(this.preloadImages(resources.images, options))
    }

    // 预加载字体
    if (resources.fonts && strategy.fonts) {
      promises.push(this.preloadFonts(resources.fonts))
    }

    // 预加载脚本
    if (resources.scripts && strategy.scripts) {
      promises.push(this.preloadScripts(resources.scripts))
    }

    await Promise.allSettled(promises)
  }

  /**
   * 预加载页面关键资源
   */
  async preloadCriticalResources(): Promise<void> {
    // 预加载首屏图片
    const aboveFoldImages = this.getAboveFoldImages()
    await this.preloadImages(aboveFoldImages, { priority: 'high' })

    // 预加载关键字体
    const criticalFonts = this.getCriticalFonts()
    await this.preloadFonts(criticalFonts)

    // 预连接到重要域名
    const importantDomains = this.getImportantDomains()
    this.preconnect(importantDomains)
  }

  /**
   * 获取首屏图片
   */
  private getAboveFoldImages(): string[] {
    const images: string[] = []
    const viewportHeight = window.innerHeight

    document.querySelectorAll('img').forEach(img => {
      const rect = img.getBoundingClientRect()
      if (rect.top < viewportHeight && img.src) {
        images.push(img.src)
      }
      
      // 检查 data-src（懒加载图片）
      if (rect.top < viewportHeight && img.dataset.src) {
        images.push(img.dataset.src)
      }
    })

    return images
  }

  /**
   * 获取关键字体
   */
  private getCriticalFonts(): Array<{ url: string; format?: string }> {
    const fonts: Array<{ url: string; format?: string }> = []
    
    // 从 CSS 中提取字体信息
    const stylesheets = document.styleSheets
    
    for (const sheet of stylesheets) {
      try {
        const rules = sheet.cssRules || sheet.rules
        for (const rule of rules) {
          if (rule instanceof CSSFontFaceRule) {
            const src = rule.style.getPropertyValue('src')
            if (src) {
              const urlMatch = src.match(/url\(['"]?([^'"]+)['"]?\)/)
              if (urlMatch) {
                const format = src.includes('woff2') ? 'woff2' : 
                              src.includes('woff') ? 'woff' : 
                              src.includes('ttf') ? 'truetype' : undefined
                fonts.push({ url: urlMatch[1], format })
              }
            }
          }
        }
      } catch (e) {
        // 跨域样式表无法访问，忽略
      }
    }

    return fonts
  }

  /**
   * 获取重要域名
   */
  private getImportantDomains(): string[] {
    const domains = new Set<string>()

    // 从图片中提取域名
    document.querySelectorAll('img[src]').forEach(img => {
      try {
        const url = new URL((img as HTMLImageElement).src)
        if (url.origin !== location.origin) {
          domains.add(url.origin)
        }
      } catch (e) {
        // 忽略无效 URL
      }
    })

    // 添加常见的 CDN 域名
    const commonCDNs = [
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ]

    commonCDNs.forEach(cdn => domains.add(cdn))

    return Array.from(domains)
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取预加载统计
   */
  getStats() {
    return {
      preloadedCount: this.preloadedResources.size,
      pendingCount: this.preloadPromises.size,
      preloadedResources: Array.from(this.preloadedResources)
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.preloadedResources.clear()
    this.preloadPromises.clear()
  }
}

// 创建全局实例
export const resourcePreloader = new ResourcePreloader()

// 自动设置智能预加载
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    resourcePreloader.setupIntelligentPreloading()
    
    // 预加载关键资源
    resourcePreloader.preloadCriticalResources().catch(error => {
      console.warn('关键资源预加载失败:', error)
    })
  })
}