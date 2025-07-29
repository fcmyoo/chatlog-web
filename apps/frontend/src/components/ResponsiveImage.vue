/**
 * 响应式图片组件
 * 支持懒加载、WebP、响应式尺寸、渐进式加载等特性
 */

<template>
  <div 
    class="responsive-image"
    :class="{
      'loading': isLoading,
      'loaded': isLoaded,
      'error': hasError,
      'lazy': lazy
    }"
    :style="containerStyle"
  >
    <!-- 占位符 -->
    <div 
      v-if="showPlaceholder"
      class="image-placeholder"
      :style="placeholderStyle"
    >
      <div v-if="!customPlaceholder" class="default-placeholder">
        <div class="placeholder-icon">📷</div>
        <div class="placeholder-text">{{ placeholderText }}</div>
      </div>
      <slot v-else name="placeholder" />
    </div>

    <!-- 模糊预览图 -->
    <img
      v-if="blurHash && showBlurPreview"
      :src="blurDataUrl"
      class="blur-preview"
      :style="imageStyle"
      alt=""
    />

    <!-- 主图片 -->
    <img
      ref="imageRef"
      :src="currentSrc"
      :srcset="currentSrcset"
      :sizes="sizes"
      :alt="alt"
      :loading="loading"
      :fetchpriority="fetchPriority"
      class="main-image"
      :style="imageStyle"
      @load="handleLoad"
      @error="handleError"
      @loadstart="handleLoadStart"
    />

    <!-- 加载进度条 -->
    <div 
      v-if="showProgress && isLoading"
      class="loading-progress"
    >
      <div 
        class="progress-bar"
        :style="{ width: `${loadingProgress}%` }"
      ></div>
    </div>

    <!-- 错误状态 -->
    <div 
      v-if="hasError"
      class="error-state"
      @click="retry"
    >
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ errorMessage }}</div>
      <button class="retry-button">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  ref, 
  computed, 
  watch, 
  onMounted, 
  onUnmounted,
  nextTick,
  type CSSProperties
} from 'vue'
import { resourceLoader } from '@/utils/resourceLoader'

interface ResponsiveImageProps {
  src: string
  srcset?: string
  sizes?: string
  alt?: string
  width?: number | string
  height?: number | string
  lazy?: boolean
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
  webp?: boolean
  placeholder?: string
  blurHash?: string
  quality?: number
  fallback?: string
  retries?: number
  timeout?: number
  showProgress?: boolean
  aspectRatio?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none'
  customPlaceholder?: boolean
  placeholderText?: string
}

const props = withDefaults(defineProps<ResponsiveImageProps>(), {
  alt: '',
  lazy: true,
  loading: 'lazy',
  fetchPriority: 'auto',
  webp: true,
  quality: 85,
  retries: 2,
  timeout: 10000,
  showProgress: false,
  objectFit: 'cover',
  customPlaceholder: false,
  placeholderText: '加载中...'
})

const emit = defineEmits<{
  load: [event: Event]
  error: [error: Error]
  loadStart: [event: Event]
  progress: [progress: number]
}>()

// 响应式状态
const imageRef = ref<HTMLImageElement>()
const isLoading = ref(false)
const isLoaded = ref(false)
const hasError = ref(false)
const loadingProgress = ref(0)
const currentSrc = ref('')
const currentSrcset = ref('')
const errorMessage = ref('')
const retryCount = ref(0)
const blurDataUrl = ref('')

// 计算属性
const showPlaceholder = computed(() => {
  return !isLoaded.value && !hasError.value
})

const showBlurPreview = computed(() => {
  return !isLoaded.value && !hasError.value && blurDataUrl.value
})

const containerStyle = computed((): CSSProperties => {
  const style: CSSProperties = {}
  
  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  
  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  
  if (props.aspectRatio) {
    style.aspectRatio = props.aspectRatio
  }
  
  return style
})

const imageStyle = computed((): CSSProperties => ({
  objectFit: props.objectFit,
  width: '100%',
  height: '100%'
}))

const placeholderStyle = computed((): CSSProperties => {
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5'
  }
  
  if (props.placeholder) {
    style.backgroundImage = `url(${props.placeholder})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  }
  
  return style
})

// 生命周期和监听
onMounted(async () => {
  if (props.blurHash) {
    await generateBlurPreview()
  }
  
  if (!props.lazy) {
    await loadImage()
  } else {
    setupLazyLoading()
  }
})

// 监听 src 变化
watch(() => props.src, async () => {
  reset()
  if (!props.lazy) {
    await loadImage()
  }
})

// 方法
const reset = () => {
  isLoading.value = false
  isLoaded.value = false
  hasError.value = false
  loadingProgress.value = 0
  currentSrc.value = ''
  currentSrcset.value = ''
  errorMessage.value = ''
  retryCount.value = 0
}

const loadImage = async () => {
  if (!props.src || isLoading.value) return

  isLoading.value = true
  hasError.value = false
  loadingProgress.value = 0

  try {
    // 构建源 URL（支持 WebP）
    const srcUrl = props.webp ? getWebPUrl(props.src) : props.src
    
    // 使用资源加载器加载图片
    const loadedSrc = await resourceLoader.loadImage(srcUrl, {
      timeout: props.timeout,
      retries: props.retries,
      quality: props.quality,
      webp: props.webp,
      placeholder: props.placeholder
    })

    currentSrc.value = loadedSrc
    
    // 处理 srcset
    if (props.srcset) {
      currentSrcset.value = props.webp ? getWebPSrcset(props.srcset) : props.srcset
    }

    // 模拟加载进度（实际项目中可能需要真实的进度信息）
    if (props.showProgress) {
      await animateProgress()
    }

  } catch (error) {
    console.error('图片加载失败:', error)
    handleLoadError(error as Error)
  }
}

const handleLoad = (event: Event) => {
  isLoading.value = false
  isLoaded.value = true
  loadingProgress.value = 100
  emit('load', event)
}

const handleError = (event: Event) => {
  const error = new Error('图片加载失败')
  handleLoadError(error)
  emit('error', error)
}

const handleLoadStart = (event: Event) => {
  emit('loadStart', event)
}

const handleLoadError = async (error: Error) => {
  isLoading.value = false
  hasError.value = true
  errorMessage.value = error.message

  // 尝试使用降级图片
  if (props.fallback && retryCount.value === 0) {
    currentSrc.value = props.fallback
    retryCount.value++
    return
  }

  // 如果有重试次数，尝试重新加载
  if (retryCount.value < props.retries) {
    retryCount.value++
    setTimeout(() => {
      loadImage()
    }, 1000 * retryCount.value) // 指数退避
  }
}

const retry = () => {
  retryCount.value = 0
  loadImage()
}

const setupLazyLoading = () => {
  if (typeof IntersectionObserver === 'undefined') {
    // 降级：直接加载
    loadImage()
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadImage()
          observer.unobserve(entry.target)
        }
      })
    },
    {
      rootMargin: '50px',
      threshold: 0.1
    }
  )

  nextTick(() => {
    if (imageRef.value?.parentElement) {
      observer.observe(imageRef.value.parentElement)
    }
  })
}

const generateBlurPreview = async () => {
  if (!props.blurHash) return

  try {
    // 这里应该使用 BlurHash 库来生成预览图
    // 简化实现：生成一个简单的渐变作为预览
    blurDataUrl.value = generateSimpleBlur()
  } catch (error) {
    console.warn('生成模糊预览失败:', error)
  }
}

const generateSimpleBlur = (): string => {
  const canvas = document.createElement('canvas')
  canvas.width = 40
  canvas.height = 30
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // 创建简单的渐变
  const gradient = ctx.createLinearGradient(0, 0, 40, 30)
  gradient.addColorStop(0, '#e0e0e0')
  gradient.addColorStop(1, '#f5f5f5')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 40, 30)
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

const animateProgress = async () => {
  return new Promise<void>(resolve => {
    const duration = 800
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / duration) * 100, 90)
      
      loadingProgress.value = progress
      emit('progress', progress)
      
      if (progress < 90) {
        requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }
    
    animate()
  })
}

const getWebPUrl = (url: string): string => {
  if (url.includes('.webp') || !supportsWebP()) {
    return url
  }
  
  // 简单的 WebP 转换逻辑
  return url.replace(/\.(jpg|jpeg|png)(\?.*)?$/i, '.webp$2')
}

const getWebPSrcset = (srcset: string): string => {
  if (!supportsWebP()) return srcset
  
  return srcset.replace(/\.(jpg|jpeg|png)(\s+\d+[wx])/gi, '.webp$2')
}

const supportsWebP = (): boolean => {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

// 暴露方法
defineExpose({
  retry,
  loadImage,
  reset
})
</script>

<style scoped>
.responsive-image {
  position: relative;
  display: inline-block;
  overflow: hidden;
  background-color: #f5f5f5;
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.default-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.placeholder-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.placeholder-text {
  font-size: 12px;
}

.blur-preview {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  filter: blur(20px);
  transform: scale(1.1);
  opacity: 0.8;
}

.main-image {
  position: relative;
  z-index: 3;
  transition: opacity 0.3s ease;
}

.loading .main-image {
  opacity: 0;
}

.loaded .main-image {
  opacity: 1;
}

.loading-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: rgba(0, 0, 0, 0.1);
  z-index: 4;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  transition: width 0.3s ease;
}

.error-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  color: #666;
  cursor: pointer;
  z-index: 5;
}

.error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.error-message {
  font-size: 12px;
  margin-bottom: 12px;
  text-align: center;
}

.retry-button {
  padding: 4px 12px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #40a9ff;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .placeholder-icon {
    font-size: 20px;
  }
  
  .placeholder-text,
  .error-message {
    font-size: 11px;
  }
  
  .retry-button {
    font-size: 11px;
    padding: 3px 10px;
  }
}

/* 加载动画 */
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.loading .image-placeholder {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}
</style>