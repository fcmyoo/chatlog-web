<template>
  <div class="virtual-contact-list">
    <VirtualScroll
      :items="filteredContacts"
      :item-height="itemHeight"
      :container-height="containerHeight"
      :overscan="5"
      :threshold="200"
      :loading="loading"
      :has-more="hasMore"
      key-field="username"
      @load-more="handleLoadMore"
      @scroll="handleScroll"
      @item-visible="handleItemVisible"
      ref="virtualScrollRef"
    >
      <template #default="{ item, index }">
        <div 
          class="contact-item"
          :class="{ 
            'contact-item--selected': selectedContact?.username === item.username,
            'contact-item--highlight': highlightedContacts.has(item.username)
          }"
          @click="handleContactClick(item, index)"
          @mouseenter="handleContactHover(item, true)"
          @mouseleave="handleContactHover(item, false)"
        >
          <!-- 头像 -->
          <div class="contact-avatar">
            <img 
              v-if="item.avatar" 
              :src="item.avatar" 
              :alt="item.nickname || item.username"
              class="avatar-image"
              loading="lazy"
              :data-src="item.avatar"
              @error="handleAvatarError"
              @load="handleAvatarLoad"
            />
            <div v-else class="avatar-placeholder">
              {{ getAvatarText(item) }}
            </div>
            
            <!-- 在线状态指示器 -->
            <div 
              v-if="showOnlineStatus" 
              class="online-indicator"
              :class="getOnlineStatus(item)"
            ></div>
          </div>

          <!-- 联系人信息 -->
          <div class="contact-info">
            <div class="contact-name">
              <span class="nickname">{{ item.nickname || item.username }}</span>
              <span v-if="item.alias && item.alias !== item.nickname" class="alias">
                ({{ item.alias }})
              </span>
            </div>
            
            <div class="contact-details">
              <span class="username">{{ item.username }}</span>
              <span v-if="item.remark" class="remark">{{ item.remark }}</span>
            </div>

            <!-- 最后消息预览 -->
            <div v-if="showLastMessage && getLastMessage(item)" class="last-message">
              <span class="message-content">{{ getLastMessage(item)?.content }}</span>
              <span class="message-time">{{ formatTime(getLastMessage(item)?.time) }}</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="contact-actions" v-show="hoveredContact === item.username">
            <el-button 
              link 
              type="primary" 
              size="small"
              @click.stop="handleViewChat(item)"
            >
              聊天
            </el-button>
            <el-button 
              link 
              type="info" 
              size="small"
              @click.stop="handleCopyId(item)"
            >
              复制ID
            </el-button>
            <el-dropdown 
              @command="handleContactAction"
              trigger="click"
              @click.stop
            >
              <el-button link type="info" size="small">
                更多
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', contact: item }">
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'delete', contact: item }">
                    删除
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'block', contact: item }">
                    屏蔽
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- 未读消息计数 -->
          <div 
            v-if="getUnreadCount(item) > 0" 
            class="unread-badge"
          >
            {{ getUnreadCount(item) > 99 ? '99+' : getUnreadCount(item) }}
          </div>
        </div>
      </template>

      <template #loading>
        <div class="loading-container">
          <el-skeleton :rows="3" animated />
          <span class="loading-text">加载更多联系人...</span>
        </div>
      </template>

      <template #empty>
        <div class="empty-container">
          <el-empty description="暂无联系人数据">
            <el-button type="primary" @click="handleRefresh">
              刷新数据
            </el-button>
          </el-empty>
        </div>
      </template>
    </VirtualScroll>

    <!-- 快速跳转索引 -->
    <div v-if="showIndex" class="contact-index">
      <div 
        v-for="letter in indexLetters"
        :key="letter"
        class="index-letter"
        :class="{ active: currentIndexLetter === letter }"
        @click="scrollToLetter(letter)"
      >
        {{ letter }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  ref, 
  computed, 
  watch, 
  nextTick,
  type PropType 
} from 'vue'
import { ElMessage } from 'element-plus'
import VirtualScroll from './VirtualScroll.vue'
import { resourceLoader } from '@/utils/resourceLoader'
import type { Contact } from '@/types'

interface VirtualContactListProps {
  contacts: Contact[]
  loading?: boolean
  hasMore?: boolean
  containerHeight?: number
  itemHeight?: number
  selectedContact?: Contact | null
  showOnlineStatus?: boolean
  showLastMessage?: boolean
  showIndex?: boolean
  filterKeyword?: string
}

const props = withDefaults(defineProps<VirtualContactListProps>(), {
  loading: false,
  hasMore: false,
  containerHeight: 600,
  itemHeight: 80,
  selectedContact: null,
  showOnlineStatus: true,
  showLastMessage: true,
  showIndex: true,
  filterKeyword: ''
})

const emit = defineEmits<{
  contactClick: [contact: Contact, index: number]
  contactHover: [contact: Contact, isHover: boolean]
  viewChat: [contact: Contact]
  copyId: [contact: Contact]
  contactAction: [action: string, contact: Contact]
  loadMore: []
  refresh: []
  scroll: [scrollTop: number]
}>()

// 响应式引用
const virtualScrollRef = ref<InstanceType<typeof VirtualScroll>>()
const hoveredContact = ref<string>('')
const highlightedContacts = ref(new Set<string>())
const currentIndexLetter = ref<string>('A')

// 过滤联系人
const filteredContacts = computed(() => {
  if (!props.filterKeyword) {
    return props.contacts
  }
  
  const keyword = props.filterKeyword.toLowerCase()
  return props.contacts.filter(contact => {
    const searchText = [
      contact.nickname,
      contact.username,
      contact.alias,
      contact.remark
    ].filter(Boolean).join(' ').toLowerCase()
    
    return searchText.includes(keyword)
  })
})

// 索引字母
const indexLetters = computed(() => {
  const letters = new Set<string>()
  
  filteredContacts.value.forEach(contact => {
    const firstChar = (contact.nickname || contact.username || '').charAt(0).toUpperCase()
    if (/^[A-Z]$/.test(firstChar)) {
      letters.add(firstChar)
    } else {
      letters.add('#')
    }
  })
  
  return Array.from(letters).sort()
})

// 获取头像文字
const getAvatarText = (contact: Contact): string => {
  const name = contact.nickname || contact.username || ''
  return name.charAt(0).toUpperCase()
}

// 获取在线状态
const getOnlineStatus = (contact: Contact): string => {
  // 这里可以根据实际业务逻辑返回在线状态
  return 'offline' // online, offline, away, busy
}

// 获取最后一条消息
const getLastMessage = (contact: Contact): any => {
  // 这里可以从store或其他地方获取最后一条消息
  return null
}

// 获取未读消息数
const getUnreadCount = (contact: Contact): number => {
  // 这里可以从store或其他地方获取未读消息数
  return 0
}

// 格式化时间
const formatTime = (time: string | Date | undefined): string => {
  if (!time) return ''
  
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 24小时内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return date.toLocaleDateString()
  }
}

// 事件处理
const handleContactClick = (contact: Contact, index: number) => {
  emit('contactClick', contact, index)
}

const handleContactHover = (contact: Contact, isHover: boolean) => {
  hoveredContact.value = isHover ? contact.username || '' : ''
  emit('contactHover', contact, isHover)
}

const handleViewChat = (contact: Contact) => {
  emit('viewChat', contact)
}

const handleCopyId = async (contact: Contact) => {
  const id = contact.username || contact.nickname || ''
  if (id) {
    try {
      await navigator.clipboard.writeText(id)
      ElMessage.success('联系人ID已复制到剪贴板')
      emit('copyId', contact)
    } catch (error) {
      ElMessage.error('复制失败，请手动复制')
    }
  }
}

const handleContactAction = ({ action, contact }: { action: string; contact: Contact }) => {
  emit('contactAction', action, contact)
}

const handleLoadMore = () => {
  emit('loadMore')
}

const handleRefresh = () => {
  emit('refresh')
}

const handleScroll = (scrollTop: number) => {
  emit('scroll', scrollTop)
  
  // 更新当前索引字母
  updateCurrentIndexLetter(scrollTop)
}

const handleItemVisible = (item: Contact, index: number) => {
  // 预加载头像等资源
  if (item.avatar && !item.avatar.startsWith('data:')) {
    resourceLoader.loadImage(item.avatar, {
      priority: 'medium',
      cache: true,
      placeholder: '/images/default-avatar.png'
    }).catch(error => {
      console.warn('头像预加载失败:', error)
    })
  }
  
  // 预加载相邻联系人的头像
  const nextContact = filteredContacts.value[index + 1]
  if (nextContact?.avatar && !nextContact.avatar.startsWith('data:')) {
    resourceLoader.preload([nextContact.avatar], 'low')
  }
}

const handleAvatarError = (event: Event) => {
  const img = event.target as HTMLImageElement
  // 尝试使用默认头像
  img.src = '/images/default-avatar.png'
  img.onerror = null // 防止无限循环
}

const handleAvatarLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.classList.add('loaded')
}

// 更新当前索引字母
const updateCurrentIndexLetter = (scrollTop: number) => {
  const itemIndex = Math.floor(scrollTop / props.itemHeight)
  const contact = filteredContacts.value[itemIndex]
  
  if (contact) {
    const firstChar = (contact.nickname || contact.username || '').charAt(0).toUpperCase()
    currentIndexLetter.value = /^[A-Z]$/.test(firstChar) ? firstChar : '#'
  }
}

// 滚动到指定字母
const scrollToLetter = (letter: string) => {
  const index = filteredContacts.value.findIndex(contact => {
    const firstChar = (contact.nickname || contact.username || '').charAt(0).toUpperCase()
    const contactLetter = /^[A-Z]$/.test(firstChar) ? firstChar : '#'
    return contactLetter === letter
  })
  
  if (index !== -1 && virtualScrollRef.value) {
    virtualScrollRef.value.scrollToItem(index, 'start', true)
  }
}

// 高亮联系人
const highlightContacts = (usernames: string[]) => {
  highlightedContacts.value = new Set(usernames)
  
  // 3秒后清除高亮
  setTimeout(() => {
    highlightedContacts.value.clear()
  }, 3000)
}

// 暴露方法
defineExpose({
  scrollToItem: (index: number) => {
    virtualScrollRef.value?.scrollToItem(index, 'start', true)
  },
  scrollToContact: (username: string) => {
    const index = filteredContacts.value.findIndex(c => c.username === username)
    if (index !== -1) {
      virtualScrollRef.value?.scrollToItem(index, 'center', true)
    }
  },
  highlightContacts,
  getVisibleRange: () => virtualScrollRef.value?.getVisibleRange()
})
</script>

<style scoped>
.virtual-contact-list {
  position: relative;
  width: 100%;
  height: 100%;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.contact-item:hover {
  background-color: #f5f7fa;
}

.contact-item--selected {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

.contact-item--highlight {
  background-color: #fff7e6;
  animation: highlight 2s ease-out;
}

.contact-avatar {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.avatar-image.loaded {
  opacity: 1;
}

.avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

.online-indicator.online {
  background-color: #52c41a;
}

.online-indicator.offline {
  background-color: #d9d9d9;
}

.online-indicator.away {
  background-color: #faad14;
}

.online-indicator.busy {
  background-color: #f5222d;
}

.contact-info {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.contact-name {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.nickname {
  font-weight: 500;
  color: #262626;
  font-size: 16px;
}

.alias {
  color: #8c8c8c;
  font-size: 14px;
  margin-left: 8px;
}

.contact-details {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.username {
  color: #595959;
  font-size: 13px;
}

.remark {
  color: #8c8c8c;
  font-size: 12px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.last-message {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.message-content {
  color: #8c8c8c;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.message-time {
  color: #bfbfbf;
  font-size: 11px;
  margin-left: 8px;
  flex-shrink: 0;
}

.contact-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.contact-item:hover .contact-actions {
  opacity: 1;
}

.unread-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ff4d4f;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1.2;
}

.contact-index {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 10;
}

.index-letter {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  color: #8c8c8c;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.index-letter:hover {
  background: #f5f5f5;
  color: #1890ff;
}

.index-letter.active {
  background: #1890ff;
  color: white;
}

.loading-container {
  padding: 20px;
  text-align: center;
}

.loading-text {
  display: block;
  margin-top: 12px;
  color: #8c8c8c;
  font-size: 14px;
}

.empty-container {
  padding: 40px 20px;
}

@keyframes highlight {
  0% {
    background-color: #fffbe6;
  }
  100% {
    background-color: transparent;
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .contact-item {
    padding: 10px 12px;
  }
  
  .avatar-image,
  .avatar-placeholder {
    width: 40px;
    height: 40px;
  }
  
  .avatar-placeholder {
    font-size: 16px;
  }
  
  .contact-actions {
    display: none; /* 移动端隐藏操作按钮 */
  }
  
  .contact-index {
    right: 4px;
  }
  
  .index-letter {
    width: 16px;
    height: 16px;
    font-size: 10px;
  }
}
</style>