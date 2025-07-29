/**
 * 资源加载优化工具
 * 实现图片预加载、懒加载、渐进式加载等功能
 */

export interface LoadResourceOptions {
  priority?: 'high' | 'medium' | 'low'
  timeout?: number
  retries?: number
  cache?: boolean
  compress?: boolean
  webp?: boolean
  placeholder?: string
  quality?: number
}

export interface ImageLoadOptions extends LoadResourceOptions {
  sizes?: string
  srcset?: string
  loading?: 'lazy' | 'eager'
  critical?: boolean
}

export interface ResourceMetrics {
  loadTime: number
  size: number
  cached: boolean
  format: string
  compressed: boolean
}

/**
 * 智能资源加载器
 */
export class SmartResourceLoader {
  private cache = new Map<string, { data: any; metrics: ResourceMetrics; timestamp: number }>()
  private loadingQueue = new Map<string, Promise<any>>()
  private imageObserver?: IntersectionObserver
  private preloadQueue: Array<{ url: string; priority: number }> = []
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    errors: 0,
    totalLoadTime: 0,
    totalSize: 0
  }

  constructor() {
    this.setupIntersectionObserver()
    this.startPreloadWorker()
  }

  /**
   * 设置交叉观察器用于懒加载
   */
  private setupIntersectionObserver() {
    if (typeof IntersectionObserver === 'undefined') return

    this.imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const src = img.dataset.src
            const srcset = img.dataset.srcset
            
            if (src) {
              this.loadImage(src, {
                loading: 'eager',
                srcset: srcset || undefined
              }).then(loadedSrc => {
                img.src = loadedSrc
                if (srcset) img.srcset = srcset
                img.classList.remove('lazy-loading')
                img.classList.add('lazy-loaded')
                this.imageObserver?.unobserve(img)
              }).catch(error => {
                console.error('懒加载图片失败:', error)
                img.classList.add('lazy-error')
              })
            }
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    )
  }

  /**
   * 启动预加载工作进程
   */
  private startPreloadWorker() {
    const processQueue = () => {
      if (this.preloadQueue.length === 0) {
        setTimeout(processQueue, 1000)
        return
      }

      // 按优先级排序
      this.preloadQueue.sort((a, b) => b.priority - a.priority)
      
      // 处理高优先级资源
      const highPriority = this.preloadQueue.splice(0, 3)
      
      Promise.all(
        highPriority.map(item => 
          this.loadResource(item.url, { priority: 'high' })
            .catch(error => console.warn('预加载失败:', item.url, error))
        )
      ).then(() => {
        // 继续处理队列
        setTimeout(processQueue, 500)
      })
    }

    // 空闲时开始处理
    if ('requestIdleCallback' in window) {
      requestIdleCallback(processQueue)
    } else {
      setTimeout(processQueue, 1000)
    }
  }

  /**
   * 加载图片资源
   */
  async loadImage(url: string, options: ImageLoadOptions = {}): Promise<string> {
    const {
      priority = 'medium',
      timeout = 10000,
      retries = 2,
      cache = true,
      webp = true,
      quality = 85,
      placeholder
    } = options

    this.metrics.totalRequests++

    // 检查缓存
    if (cache && this.cache.has(url)) {
      const cached = this.cache.get(url)!
      // 检查缓存是否过期（24小时）
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        this.metrics.cacheHits++
        return cached.data
      } else {
        this.cache.delete(url)
      }
    }

    // 检查是否正在加载
    if (this.loadingQueue.has(url)) {
      return this.loadingQueue.get(url)!
    }

    // 开始加载
    const loadPromise = this.performImageLoad(url, {
      priority,
      timeout,
      retries,
      webp,
      quality,
      placeholder
    })

    this.loadingQueue.set(url, loadPromise)

    try {
      const result = await loadPromise
      
      // 缓存结果
      if (cache) {
        this.cache.set(url, {
          data: result.url,
          metrics: result.metrics,
          timestamp: Date.now()
        })
      }

      return result.url
    } finally {
      this.loadingQueue.delete(url)
    }
  }

  /**
   * 执行图片加载
   */
  private async performImageLoad(
    url: string,
    options: Required<Pick<ImageLoadOptions, 'priority' | 'timeout' | 'retries' | 'webp' | 'quality' | 'placeholder'>>
  ): Promise<{ url: string; metrics: ResourceMetrics }> {
    const startTime = performance.now()
    let lastError: Error | null = null

    // 尝试 WebP 格式
    const urlsToTry = options.webp ? [this.getWebPUrl(url), url] : [url]

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      for (const tryUrl of urlsToTry) {
        try {
          const result = await this.loadImageWithTimeout(tryUrl, options.timeout)
          const loadTime = performance.now() - startTime
          
          this.metrics.totalLoadTime += loadTime
          
          const metrics: ResourceMetrics = {
            loadTime,
            size: result.size,
            cached: false,
            format: this.getImageFormat(tryUrl),
            compressed: tryUrl.includes('webp') || tryUrl.includes('quality')
          }

          this.metrics.totalSize += result.size

          return { url: tryUrl, metrics }
        } catch (error) {
          lastError = error as Error
          console.warn(`图片加载失败 (尝试 ${attempt + 1}/${options.retries + 1}):`, tryUrl, error)
        }
      }
    }

    this.metrics.errors++

    // 如果有占位符，返回占位符
    if (options.placeholder) {
      return {
        url: options.placeholder,
        metrics: {
          loadTime: performance.now() - startTime,
          size: 0,
          cached: false,
          format: 'placeholder',
          compressed: false
        }
      }
    }

    throw lastError || new Error('图片加载失败')
  }

  /**
   * 带超时的图片加载
   */
  private loadImageWithTimeout(url: string, timeout: number): Promise<{ size: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const timer = setTimeout(() => {
        reject(new Error('图片加载超时'))
      }, timeout)

      img.onload = () => {
        clearTimeout(timer)
        
        // 估算图片大小
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const size = imageData.data.length
          resolve({ size })
        } else {
          // 降级估算
          resolve({ size: img.naturalWidth * img.naturalHeight * 4 })
        }
      }

      img.onerror = () => {
        clearTimeout(timer)
        reject(new Error('图片加载失败'))
      }

      img.src = url
    })
  }

  /**
   * 加载通用资源
   */
  async loadResource(url: string, options: LoadResourceOptions = {}): Promise<any> {
    const {
      priority = 'medium',
      timeout = 15000,
      retries = 2,
      cache = true
    } = options

    this.metrics.totalRequests++

    // 检查缓存
    if (cache && this.cache.has(url)) {
      const cached = this.cache.get(url)!
      if (Date.now() - cached.timestamp < 60 * 60 * 1000) { // 1小时缓存
        this.metrics.cacheHits++
        return cached.data
      } else {
        this.cache.delete(url)
      }
    }

    // 检查加载队列
    if (this.loadingQueue.has(url)) {
      return this.loadingQueue.get(url)!
    }

    const loadPromise = this.performResourceLoad(url, { timeout, retries })
    this.loadingQueue.set(url, loadPromise)

    try {
      const result = await loadPromise
      
      if (cache) {
        this.cache.set(url, {
          data: result.data,
          metrics: result.metrics,
          timestamp: Date.now()
        })
      }

      return result.data
    } finally {
      this.loadingQueue.delete(url)
    }
  }

  /**
   * 执行资源加载
   */
  private async performResourceLoad(
    url: string,
    options: { timeout: number; retries: number }
  ): Promise<{ data: any; metrics: ResourceMetrics }> {
    const startTime = performance.now()
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options.timeout)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.blob()
        const loadTime = performance.now() - startTime
        
        this.metrics.totalLoadTime += loadTime
        this.metrics.totalSize += data.size

        const metrics: ResourceMetrics = {
          loadTime,
          size: data.size,
          cached: false,
          format: response.headers.get('content-type') || 'unknown',
          compressed: response.headers.get('content-encoding') === 'gzip'
        }

        return { data, metrics }
      } catch (error) {
        lastError = error as Error
        console.warn(`资源加载失败 (尝试 ${attempt + 1}/${options.retries + 1}):`, url, error)
      }
    }

    this.metrics.errors++
    throw lastError || new Error('资源加载失败')
  }

  /**
   * 带超时的 fetch
   */
  private fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController()
      const timer = setTimeout(() => {
        controller.abort()
        reject(new Error('请求超时'))
      }, timeout)

      fetch(url, { signal: controller.signal })
        .then(response => {
          clearTimeout(timer)
          resolve(response)
        })
        .catch(error => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  /**
   * 预加载资源
   */
  preload(urls: string | string[], priority: 'high' | 'medium' | 'low' = 'medium') {
    const urlArray = Array.isArray(urls) ? urls : [urls]
    const priorityValue = { high: 3, medium: 2, low: 1 }[priority]

    urlArray.forEach(url => {
      if (!this.cache.has(url) && !this.loadingQueue.has(url)) {
        this.preloadQueue.push({ url, priority: priorityValue })
      }
    })
  }

  /**
   * 设置懒加载
   */
  setupLazyLoading(selector: string = 'img[data-src]') {
    if (!this.imageObserver) return

    const images = document.querySelectorAll(selector)
    images.forEach(img => {
      img.classList.add('lazy-loading')
      this.imageObserver!.observe(img)
    })
  }

  /**
   * 获取 WebP 版本 URL
   */
  private getWebPUrl(url: string): string {
    if (url.includes('.webp') || !this.supportsWebP()) return url
    
    // 简单的 WebP 转换逻辑
    return url.replace(/\.(jpg|jpeg|png)(\?.*)?$/i, '.webp$2')
  }

  /**
   * 检测 WebP 支持
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }

  /**
   * 获取图片格式
   */
  private getImageFormat(url: string): string {
    const match = url.match(/\.(\w+)(\?|$)/)
    return match ? match[1].toLowerCase() : 'unknown'
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? Math.round((this.metrics.cacheHits / this.metrics.totalRequests) * 100)
      : 0

    const averageLoadTime = this.metrics.totalRequests > 0
      ? Math.round(this.metrics.totalLoadTime / this.metrics.totalRequests)
      : 0

    return {
      ...this.metrics,
      cacheHitRate,
      averageLoadTime,
      cacheSize: this.cache.size,
      queueSize: this.preloadQueue.length
    }
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear()
    this.preloadQueue.length = 0
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.imageObserver?.disconnect()
    this.clearCache()
    this.loadingQueue.clear()
  }
}

/**
 * 图片压缩工具
 */
export class ImageCompressor {
  /**
   * 压缩图片
   */
  static async compress(
    file: File,
    options: {
      quality?: number
      maxWidth?: number
      maxHeight?: number
      format?: 'webp' | 'jpeg' | 'png'
    } = {}
  ): Promise<Blob> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'webp'
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // 计算新尺寸
        let { width, height } = img
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height

        // 绘制并压缩
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('图片压缩失败'))
              }
            },
            `image/${format}`,
            quality
          )
        } else {
          reject(new Error('无法获取 Canvas 上下文'))
        }
      }

      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = URL.createObjectURL(file)
    })
  }
}

// 创建全局实例
export const resourceLoader = new SmartResourceLoader()

// 导出工具函数
export const preloadImages = (urls: string[], priority?: 'high' | 'medium' | 'low') => {
  resourceLoader.preload(urls, priority)
}

export const setupLazyImages = (selector?: string) => {
  resourceLoader.setupLazyLoading(selector)
}

export const loadImage = (url: string, options?: ImageLoadOptions) => {
  return resourceLoader.loadImage(url, options)
}

export const compressImage = (file: File, options?: Parameters<typeof ImageCompressor.compress>[1]) => {
  return ImageCompressor.compress(file, options)
}