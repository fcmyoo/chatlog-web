<template>
  <div 
    ref="containerRef" 
    class="virtual-scroll-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <!-- 虚拟滚动区域 -->
    <div 
      class="virtual-scroll-content"
      :style="{ 
        height: totalHeight + 'px',
        paddingTop: offsetY + 'px'
      }"
    >
      <!-- 渲染的可见项目 -->
      <div
        v-for="(item, index) in visibleItems"
        :key="getItemKey(item, startIndex + index)"
        class="virtual-scroll-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot 
          :item="item" 
          :index="startIndex + index"
          :isVisible="true"
        >
          {{ item }}
        </slot>
      </div>
    </div>

    <!-- 加载更多指示器 -->
    <div 
      v-if="loading" 
      class="virtual-scroll-loading"
    >
      <slot name="loading">
        <div class="loading-spinner">加载中...</div>
      </slot>
    </div>

    <!-- 空状态 -->
    <div 
      v-if="!loading && items.length === 0" 
      class="virtual-scroll-empty"
    >
      <slot name="empty">
        <div class="empty-message">暂无数据</div>
      </slot>
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
  type PropType 
} from 'vue'

interface VirtualScrollProps {
  items: any[]                    // 数据列表
  itemHeight: number             // 每项高度
  containerHeight: number        // 容器高度
  overscan?: number              // 预渲染项目数
  threshold?: number             // 触发加载更多的阈值
  loading?: boolean              // 加载状态
  hasMore?: boolean              // 是否还有更多数据
  keyField?: string              // 唯一标识字段
  buffer?: number                // 缓冲区大小
  estimatedItemHeight?: number   // 预估项目高度（动态高度支持）
}

const props = withDefaults(defineProps<VirtualScrollProps>(), {
  overscan: 5,
  threshold: 100,
  loading: false,
  hasMore: true,
  keyField: 'id',
  buffer: 200,
  estimatedItemHeight: 0
})

const emit = defineEmits<{
  loadMore: []
  scroll: [scrollTop: number]
  itemVisible: [item: any, index: number]
  itemHidden: [item: any, index: number]
}>()

// 响应式引用
const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)
const isScrolling = ref(false)
const scrollTimeout = ref<number>()

// 计算属性
const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

const visibleCount = computed(() => {
  return Math.ceil(props.containerHeight / props.itemHeight) + props.overscan * 2
})

const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight) - props.overscan
  return Math.max(0, index)
})

const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value
  return Math.min(props.items.length - 1, index)
})

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value + 1)
})

const offsetY = computed(() => {
  return startIndex.value * props.itemHeight
})

// 获取项目唯一键
const getItemKey = (item: any, index: number): string | number => {
  if (props.keyField && item[props.keyField] !== undefined) {
    return item[props.keyField]
  }
  return index
}

// 滚动处理
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const newScrollTop = target.scrollTop
  
  scrollTop.value = newScrollTop
  isScrolling.value = true
  
  // 发射滚动事件
  emit('scroll', newScrollTop)
  
  // 检查是否需要加载更多
  const distanceToBottom = totalHeight.value - newScrollTop - props.containerHeight
  if (distanceToBottom <= props.threshold && props.hasMore && !props.loading) {
    emit('loadMore')
  }
  
  // 滚动结束检测
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
  
  scrollTimeout.value = window.setTimeout(() => {
    isScrolling.value = false
  }, 150)
}

// 滚动到指定位置
const scrollTo = (offset: number, smooth: boolean = false) => {
  if (containerRef.value) {
    containerRef.value.scrollTo({
      top: offset,
      behavior: smooth ? 'smooth' : 'auto'
    })
  }
}

// 滚动到指定项目
const scrollToItem = (index: number, align: 'start' | 'center' | 'end' = 'start', smooth: boolean = false) => {
  let offset: number
  
  switch (align) {
    case 'center':
      offset = index * props.itemHeight - props.containerHeight / 2 + props.itemHeight / 2
      break
    case 'end':
      offset = index * props.itemHeight - props.containerHeight + props.itemHeight
      break
    default:
      offset = index * props.itemHeight
  }
  
  offset = Math.max(0, Math.min(offset, totalHeight.value - props.containerHeight))
  scrollTo(offset, smooth)
}

// 获取可见项目信息
const getVisibleRange = () => {
  return {
    startIndex: startIndex.value,
    endIndex: endIndex.value,
    visibleItems: visibleItems.value
  }
}

// 动态高度支持（实验性）
const itemHeights = ref<Map<string | number, number>>(new Map())
const resizeObserver = ref<ResizeObserver>()

const setupDynamicHeight = () => {
  if (!props.estimatedItemHeight || typeof ResizeObserver === 'undefined') {
    return
  }

  resizeObserver.value = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const target = entry.target as HTMLElement
      const key = target.dataset.itemKey
      if (key) {
        itemHeights.value.set(key, entry.contentRect.height)
      }
    })
  })
}

const observeItemHeight = (element: HTMLElement, key: string | number) => {
  if (resizeObserver.value && element) {
    element.dataset.itemKey = String(key)
    resizeObserver.value.observe(element)
  }
}

// 性能优化：防抖滚动处理
const debouncedScrollHandler = (() => {
  let timeoutId: number
  return (event: Event) => {
    clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => {
      handleScroll(event)
    }, 16) // 约60fps
  }
})()

// 监听可见项目变化，发射相应事件
watch(
  () => [startIndex.value, endIndex.value],
  ([newStart, newEnd], [oldStart, oldEnd]) => {
    if (oldStart !== undefined && oldEnd !== undefined) {
      // 检测新显示的项目
      for (let i = newStart; i <= newEnd; i++) {
        if (i < oldStart || i > oldEnd) {
          const item = props.items[i]
          if (item) {
            emit('itemVisible', item, i)
          }
        }
      }
      
      // 检测隐藏的项目
      for (let i = oldStart; i <= oldEnd; i++) {
        if (i < newStart || i > newEnd) {
          const item = props.items[i]
          if (item) {
            emit('itemHidden', item, i)
          }
        }
      }
    }
  }
)

// 监听数据变化
watch(
  () => props.items.length,
  (newLength, oldLength) => {
    // 数据长度变化时，可能需要调整滚动位置
    if (newLength === 0) {
      scrollTo(0)
    } else if (oldLength && newLength < oldLength) {
      // 数据减少时，检查当前滚动位置是否超出范围
      const maxScrollTop = Math.max(0, totalHeight.value - props.containerHeight)
      if (scrollTop.value > maxScrollTop) {
        scrollTo(maxScrollTop)
      }
    }
  }
)

// 生命周期
onMounted(() => {
  setupDynamicHeight()
  
  // 初始化滚动位置
  nextTick(() => {
    if (containerRef.value) {
      scrollTop.value = containerRef.value.scrollTop
    }
  })
})

onUnmounted(() => {
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
  
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }
})

// 暴露方法给父组件
defineExpose({
  scrollTo,
  scrollToItem,
  getVisibleRange,
  scrollTop: () => scrollTop.value,
  isScrolling: () => isScrolling.value
})
</script>

<style scoped>
.virtual-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  -webkit-overflow-scrolling: touch; /* iOS 流畅滚动 */
}

.virtual-scroll-content {
  position: relative;
  width: 100%;
}

.virtual-scroll-item {
  box-sizing: border-box;
  overflow: hidden;
}

.virtual-scroll-loading {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

.virtual-scroll-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #999;
}

.loading-spinner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.loading-spinner::before {
  content: '';
  width: 16px;
  height: 16px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #666;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.empty-message {
  font-size: 14px;
  color: #999;
  padding: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 滚动条样式优化 */
.virtual-scroll-container::-webkit-scrollbar {
  width: 6px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.2s;
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .virtual-scroll-container::-webkit-scrollbar {
    width: 4px;
  }
  
  .virtual-scroll-loading {
    padding: 12px;
  }
}
</style>