<template>
  <div class="contacts-page">
    <div class="card">
      <div class="card-header">
        <h3>联系人管理</h3>
        <el-button type="primary" @click="loadContacts">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
      <div class="card-body">
        <div class="search-bar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索联系人..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div v-if="loading || searching" class="loading">
          <el-skeleton :rows="10" animated />
          <div v-if="searching" class="search-loading-text">正在搜索联系人...</div>
        </div>
        <div v-else-if="!filteredContacts.length" class="empty-state">
          <el-empty description="暂无联系人数据" />
        </div>
        <div v-else>
          <el-table
            :data="paginatedContacts"
            stripe
            style="width: 100%"
            @row-click="handleRowClick"
          >
            <el-table-column prop="username" label="用户名" width="200" />
            <el-table-column prop="alias" label="别名" width="200" />
            <el-table-column prop="nickname" label="昵称" width="200" />
            <el-table-column prop="remark" label="备注" width="200" />
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button
                  link
                  @click="viewChatHistory(scope.row)"
                >
                  查看聊天记录
                </el-button>
                <el-button
                  link
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api/ApiClient'
import { handleError, withErrorHandling } from '@/utils/errorHandler'
import type { Contact } from '@/types'

// 路由
const router = useRouter()

// 响应式状态
const loading = ref<boolean>(false)
const searching = ref<boolean>(false)
const contacts = ref<Contact[]>([])
const searchResults = ref<Contact[]>([])
const searchKeyword = ref<string>('')
const currentPage = ref<number>(1)
const pageSize = ref<number>(20)

// 过滤后的联系人列表
const filteredContacts = computed(() => {
  // 如果有搜索关键词，使用搜索结果
  if (searchKeyword.value && Array.isArray(searchResults.value) && searchResults.value.length > 0) {
    return searchResults.value.filter(contact =>
      !(contact.username || '').includes('@chatroom') &&
      !(contact.username || '').includes('@openim') &&
      !(contact.username || '').includes('@kefu.openim') &&
      !(contact.username || '').includes('@im.chatroom')
    )
  }

  // 确保contacts.value是数组，否则使用全部联系人，过滤掉聊天群
  if (!Array.isArray(contacts.value)) {
    console.warn('contacts.value不是数组:', contacts.value)
    return []
  }

  return contacts.value.filter(contact =>
    !(contact.username || '').includes('@chatroom') &&
    !(contact.username || '').includes('@openim') &&
    !(contact.username || '').includes('@kefu.openim') &&
    !(contact.username || '').includes('@im.chatroom')
  )
})

// 分页后的联系人列表
const paginatedContacts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredContacts.value.slice(start, end)
})

// 加载联系人列表
const loadContacts = withErrorHandling(async () => {
  loading.value = true
  try {
    const response = await api.getContacts()
    console.log('加载联系人列表：API响应:', response)
    
    // 确保返回的数据是数组
    const contactsData = response.data || []
    if (!Array.isArray(contactsData)) {
      console.error('API返回的联系人数据不是数组:', contactsData)
      contacts.value = []
      ElMessage.error({ message: 'API返回的数据格式错误' as any })
      return
    }
    
    contacts.value = contactsData

    // 计算过滤后的联系人数量（排除聊天群）
    const actualContactsCount = contacts.value.filter(contact =>
      !(contact.username || '').includes('@chatroom') &&
      !(contact.username || '').includes('@openim') &&
      !(contact.username || '').includes('@kefu.openim') &&
      !(contact.username || '').includes('@im.chatroom')
    ).length
    const chatroomsCount = contacts.value.length - actualContactsCount

    ElMessage.success({
      message: `加载了 ${actualContactsCount} 个联系人${chatroomsCount > 0 ? ` (已过滤 ${chatroomsCount} 个聊天群)` : ''}` as any
    })
  } finally {
    loading.value = false
  }
}, '加载联系人列表')

// 搜索处理
const handleSearch = async (): Promise<void> => {
  currentPage.value = 1
  
  if (!searchKeyword.value.trim()) {
    // 如果搜索关键词为空，清空搜索结果
    searchResults.value = []
    return
  }

  // 调用后端搜索API
  await searchContacts(searchKeyword.value.trim())
}

// 搜索联系人
const searchContacts = withErrorHandling(async (keyword: string) => {
  searching.value = true
  try {
    const response = await api.searchContacts(keyword)
    console.log('搜索API响应:', response)
    
    // 确保返回的数据是数组
    const searchData = response.data || []
    if (!Array.isArray(searchData)) {
      console.error('搜索API返回的数据不是数组:', searchData)
      searchResults.value = []
      ElMessage.error({ message: '搜索API返回的数据格式错误' as any })
      return
    }
    
    searchResults.value = searchData

    const actualContactsCount = searchResults.value.filter(contact =>
      !(contact.username || '').includes('@chatroom') &&
      !(contact.username || '').includes('@openim') &&
      !(contact.username || '').includes('@kefu.openim') &&
      !(contact.username || '').includes('@im.chatroom')
    ).length

    ElMessage.success({
      message: `找到 ${actualContactsCount} 个匹配的联系人` as any
    })
  } finally {
    searching.value = false
  }
}, '搜索联系人')

// 分页处理
const handlePageChange = (page: number): void => {
  currentPage.value = page
}

// 行点击处理
const handleRowClick = (row: Contact): void => {
  console.log('联系人详情:', row)
}

// 查看聊天记录
const viewChatHistory = (contact: Contact): void => {
  router.push({
    path: '/chatlog',
    query: {
      talker: contact.username || contact.nickname
    }
  })
}

// 复制联系人ID
const copyContactId = (contact: Contact): void => {
  const id = contact.username || contact.nickname
  if (id) {
    navigator.clipboard.writeText(id).then(() => {
      ElMessage.success({ message: '联系人ID已复制到剪贴板' as any })
    }).catch((error) => {
      handleError(error, '复制联系人ID')
    })
  } else {
    ElMessage.warning({ message: '无可复制的ID' as any })
  }
}

// 组件挂载
onMounted(() => {
  loadContacts()
})
</script>

<style scoped>
.contacts-page {
  padding: 20px;
}

.search-bar {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.loading {
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 50px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-loading-text {
  text-align: center;
  margin-top: 10px;
  color: #606266;
  font-size: 14px;
}
</style>
