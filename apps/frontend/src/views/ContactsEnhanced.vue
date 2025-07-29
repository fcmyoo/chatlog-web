<template>
  <div class="contacts-page">
    <div class="card">
      <div class="card-header">
        <h3>联系人管理</h3>
        <div class="header-actions">
          <el-button-group>
            <el-button 
              type="primary" 
              :loading="loading"
              @click="handleRefresh"
            >
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button 
              :type="viewMode === 'virtual' ? 'primary' : ''"
              @click="toggleViewMode"
            >
              <el-icon><List /></el-icon>
              {{ viewMode === 'virtual' ? '虚拟滚动' : '表格视图' }}
            </el-button>
          </el-button-group>
        </div>
      </div>
      
      <div class="card-body">
        <!-- 搜索和筛选 -->
        <div class="toolbar">
          <div class="search-section">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索联系人..."
              clearable
              @input="handleSearch"
              @clear="handleSearchClear"
              class="search-input"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            
            <el-select
              v-model="sortBy"
              placeholder="排序方式"
              @change="handleSortChange"
              class="sort-select"
            >
              <el-option label="昵称" value="nickname" />
              <el-option label="用户名" value="username" />
              <el-option label="最近联系" value="lastContact" />
            </el-select>
          </div>
          
          <div class="stats-section">
            <el-tag type="info">
              共 {{ totalContacts }} 个联系人
            </el-tag>
            <el-tag v-if="searchKeyword" type="success">
              筛选出 {{ filteredContacts.length }} 个
            </el-tag>
          </div>
        </div>

        <!-- 虚拟滚动列表 -->
        <div v-if="viewMode === 'virtual'" class="virtual-list-container">
          <VirtualContactList
            :contacts="sortedContacts"
            :loading="loading"
            :has-more="hasMore"
            :container-height="listHeight"
            :item-height="80"
            :selected-contact="selectedContact"
            :show-online-status="true"
            :show-last-message="true"
            :show-index="true"
            :filter-keyword="searchKeyword"
            @contact-click="handleContactClick"
            @contact-hover="handleContactHover"
            @view-chat="handleViewChat"
            @copy-id="handleCopyId"
            @contact-action="handleContactAction"
            @load-more="handleLoadMore"
            @refresh="handleRefresh"
            @scroll="handleScroll"
            ref="virtualListRef"
          />
        </div>

        <!-- 传统表格视图 -->
        <div v-else-if="viewMode === 'table'" class="table-container">
          <div v-if="loading" class="loading">
            <el-skeleton :rows="10" animated />
          </div>
          <div v-else-if="!filteredContacts.length" class="empty-state">
            <el-empty description="暂无联系人数据">
              <el-button type="primary" @click="handleRefresh">
                刷新数据
              </el-button>
            </el-empty>
          </div>
          <div v-else>
            <el-table
              :data="paginatedContacts"
              stripe
              style="width: 100%"
              @row-click="handleRowClick"
              v-loading="loading"
            >
              <el-table-column prop="username" label="用户名" width="200" />
              <el-table-column prop="alias" label="别名" width="200" />
              <el-table-column prop="nickname" label="昵称" width="200" />
              <el-table-column prop="remark" label="备注" width="200" />
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button
                    link
                    type="primary"
                    @click="viewChatHistory(scope.row)"
                  >
                    查看聊天记录
                  </el-button>
                  <el-button
                    link
                    type="info"
                    @click="copyContactId(scope.row)"
                  >
                    复制ID
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination">
              <el-pagination
                v-model:current-page="currentPage"
                :page-size="pageSize"
                :total="filteredContacts.length"
                layout="total, prev, pager, next, jumper"
                @current-change="handlePageChange"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 缓存统计面板 -->
    <div v-if="showCacheStats" class="cache-stats-panel">
      <div class="stats-header">
        <span>缓存统计</span>
        <el-button text @click="showCacheStats = false">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div class="stats-content">
        <div class="stat-item">
          <span class="label">命中率:</span>
          <span class="value">{{ cacheStats.hitRate }}%</span>
        </div>
        <div class="stat-item">
          <span class="label">缓存大小:</span>
          <span class="value">{{ cacheStats.memorySizeText }}</span>
        </div>
        <div class="stat-item">
          <span class="label">缓存项:</span>
          <span class="value">{{ cacheStats.size }}</span>
        </div>
      </div>
    </div>

    <!-- 浮动操作按钮 -->
    <div class="floating-actions">
      <el-tooltip content="缓存统计" placement="left">
        <el-button 
          circle 
          type="info" 
          @click="showCacheStats = !showCacheStats"
        >
          <el-icon><DataBoard /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="回到顶部" placement="left">
        <el-button 
          circle 
          type="primary" 
          @click="scrollToTop"
          v-show="showBackToTop"
        >
          <el-icon><Top /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Refresh, 
  Search, 
  List, 
  Close, 
  DataBoard, 
  Top 
} from '@element-plus/icons-vue'
import VirtualContactList from '@/components/VirtualContactList.vue'
import { useMainStore } from '@/stores/main'
import { useSmartCache } from '@/utils/smartCache'
import { handleError, withErrorHandling } from '@/utils/errorHandler'
import { resourceLoader, resourcePreloader } from '@/utils/resourceLoader'
import type { Contact } from '@/types'

// 路由和存储
const router = useRouter()
const mainStore = useMainStore()
const { cache, cacheInfo, updateMetrics } = useSmartCache()

// 响应式状态
const loading = ref<boolean>(false)
const searching = ref<boolean>(false)
const searchKeyword = ref<string>('')
const currentPage = ref<number>(1)
const pageSize = ref<number>(20)
const viewMode = ref<'virtual' | 'table'>('virtual')
const sortBy = ref<string>('nickname')
const selectedContact = ref<Contact | null>(null)
const hoveredContact = ref<Contact | null>(null)
const showCacheStats = ref<boolean>(false)
const showBackToTop = ref<boolean>(false)
const listHeight = ref<number>(600)

// 组件引用
const virtualListRef = ref<InstanceType<typeof VirtualContactList>>()

// 计算属性
const totalContacts = computed(() => mainStore.getContacts.length)

const filteredContacts = computed(() => {
  let contacts = mainStore.getContacts
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    contacts = contacts.filter(contact => {
      const searchText = [
        contact.nickname,
        contact.username,
        contact.alias,
        contact.remark
      ].filter(Boolean).join(' ').toLowerCase()
      
      return searchText.includes(keyword)
    })
  }
  
  return contacts
})

const sortedContacts = computed(() => {
  const contacts = [...filteredContacts.value]
  
  switch (sortBy.value) {
    case 'nickname':
      return contacts.sort((a, b) => 
        (a.nickname || a.username || '').localeCompare(b.nickname || b.username || '')
      )
    case 'username':
      return contacts.sort((a, b) => 
        (a.username || '').localeCompare(b.username || '')
      )
    case 'lastContact':
      // 这里可以根据最后联系时间排序
      return contacts
    default:
      return contacts
  }
})

const paginatedContacts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredContacts.value.slice(start, end)
})

const hasMore = computed(() => {
  // 这里可以根据实际情况判断是否还有更多数据
  return false
})

const cacheStats = computed(() => {
  updateMetrics()
  return cacheInfo.value
})

// 生命周期
onMounted(async () => {
  await loadContacts()
  calculateListHeight()
  window.addEventListener('resize', calculateListHeight)
  window.addEventListener('scroll', handleWindowScroll)
  
  // 预加载联系人头像
  preloadContactAvatars()
  
  // 设置资源预加载
  setupResourcePreloading()
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateListHeight)
  window.removeEventListener('scroll', handleWindowScroll)
  
  // 清理资源加载器
  resourceLoader.clearCache()
})

// 方法
const calculateListHeight = () => {
  // 计算可用的列表高度
  const headerHeight = 120
  const toolbarHeight = 80
  const viewportHeight = window.innerHeight
  listHeight.value = Math.max(400, viewportHeight - headerHeight - toolbarHeight - 100)
}

const loadContacts = withErrorHandling(async () => {
  loading.value = true
  try {
    await mainStore.fetchContacts(true) // 使用缓存
    
    ElMessage.success({
      message: `加载了 ${totalContacts.value} 个联系人` as any
    })
  } finally {
    loading.value = false
  }
}, '加载联系人列表')

const handleRefresh = async () => {
  await loadContacts()
  if (viewMode.value === 'virtual') {
    virtualListRef.value?.scrollToItem(0)
  }
}

const handleSearch = async (): Promise<void> => {
  currentPage.value = 1
  
  if (!searchKeyword.value.trim()) {
    return
  }

  // 使用store的搜索方法
  searching.value = true
  try {
    const results = await mainStore.searchContacts(searchKeyword.value.trim())
    
    ElMessage.success({
      message: `找到 ${results.length} 个匹配的联系人` as any
    })
  } catch (error) {
    handleError(error, '搜索联系人')
  } finally {
    searching.value = false
  }
}

const handleSearchClear = () => {
  searchKeyword.value = ''
  currentPage.value = 1
}

const handleSortChange = () => {
  currentPage.value = 1
}

const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'virtual' ? 'table' : 'virtual'
  nextTick(() => {
    if (viewMode.value === 'virtual') {
      calculateListHeight()
    }
  })
}

// 虚拟列表事件处理
const handleContactClick = (contact: Contact, index: number) => {
  selectedContact.value = contact
  console.log('选中联系人:', contact)
}

const handleContactHover = (contact: Contact, isHover: boolean) => {
  hoveredContact.value = isHover ? contact : null
}

const handleViewChat = (contact: Contact) => {
  router.push({
    path: '/chatlog',
    query: {
      talker: contact.username || contact.nickname
    }
  })
}

const handleCopyId = async (contact: Contact) => {
  const id = contact.username || contact.nickname
  if (id) {
    try {
      await navigator.clipboard.writeText(id)
      ElMessage.success({ message: '联系人ID已复制到剪贴板' as any })
    } catch (error) {
      handleError(error, '复制联系人ID')
    }
  } else {
    ElMessage.warning({ message: '无可复制的ID' as any })
  }
}

const handleContactAction = (action: string, contact: Contact) => {
  console.log('联系人操作:', action, contact)
  
  switch (action) {
    case 'edit':
      ElMessage.info('编辑功能开发中...')
      break
    case 'delete':
      ElMessage.warning('删除功能开发中...')
      break
    case 'block':
      ElMessage.warning('屏蔽功能开发中...')
      break
  }
}

const handleLoadMore = () => {
  // 虚拟滚动列表的加载更多
  console.log('加载更多联系人...')
}

const handleScroll = (scrollTop: number) => {
  showBackToTop.value = scrollTop > 300
}

// 表格视图事件处理
const handleRowClick = (row: Contact) => {
  selectedContact.value = row
  console.log('联系人详情:', row)
}

const viewChatHistory = (contact: Contact) => {
  handleViewChat(contact)
}

const copyContactId = (contact: Contact) => {
  handleCopyId(contact)
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handleWindowScroll = () => {
  if (viewMode.value === 'table') {
    showBackToTop.value = window.scrollY > 300
  }
}

const scrollToTop = () => {
  if (viewMode.value === 'virtual') {
    virtualListRef.value?.scrollToItem(0)
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// 资源优化方法
const preloadContactAvatars = async () => {
  const contacts = mainStore.getContacts.slice(0, 20) // 预加载前20个联系人头像
  const avatarUrls = contacts
    .map(contact => contact.avatar)
    .filter(Boolean)
    .slice(0, 10) // 限制预加载数量

  if (avatarUrls.length > 0) {
    resourceLoader.preload(avatarUrls, 'medium')
    console.log(`预加载 ${avatarUrls.length} 个联系人头像`)
  }
}

const setupResourcePreloading = () => {
  // 预加载聊天记录页面
  resourcePreloader.preloadResources({
    domains: [window.location.origin],
    images: ['/images/chat-bg.jpg', '/images/default-avatar.png']
  }, {
    priority: 'low',
    delay: 2000,
    condition: () => mainStore.getContacts.length > 0
  })

  // 预连接到可能的图片服务域名
  const imageDomains = ['https://cdn.example.com', 'https://images.example.com']
  resourcePreloader.preconnect(imageDomains)
}
</script>

<style scoped>
.contacts-page {
  padding: 20px;
  position: relative;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.card-header h3 {
  margin: 0;
  color: #262626;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.card-body {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.search-section {
  display: flex;
  gap: 12px;
  flex: 1;
}

.search-input {
  max-width: 300px;
}

.sort-select {
  width: 120px;
}

.stats-section {
  display: flex;
  gap: 8px;
  align-items: center;
}

.virtual-list-container {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.table-container {
  min-height: 400px;
}

.loading {
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 50px;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.cache-stats-panel {
  position: fixed;
  top: 100px;
  right: 20px;
  width: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  font-weight: 600;
}

.stats-content {
  padding: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #666;
  font-size: 13px;
}

.value {
  color: #1890ff;
  font-weight: 600;
  font-size: 13px;
}

.floating-actions {
  position: fixed;
  bottom: 30px;
  right: 30px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 999;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .contacts-page {
    padding: 12px;
  }
  
  .card-header {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .search-section {
    flex-direction: column;
  }
  
  .search-input {
    max-width: none;
  }
  
  .cache-stats-panel {
    right: 12px;
    width: 180px;
  }
  
  .floating-actions {
    right: 20px;
    bottom: 20px;
  }
}

/* 滚动条优化 */
:deep(.el-table__body-wrapper) {
  scrollbar-width: thin;
}

:deep(.el-table__body-wrapper)::-webkit-scrollbar {
  width: 6px;
}

:deep(.el-table__body-wrapper)::-webkit-scrollbar-track {
  background: #f1f1f1;
}

:deep(.el-table__body-wrapper)::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
</style>