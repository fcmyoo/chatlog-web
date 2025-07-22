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

        <div v-if="loading" class="loading">
          <el-skeleton :rows="10" animated />
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
            <el-table-column prop="UserName" label="用户名" width="200" />
            <el-table-column prop="NickName" label="昵称" width="200" />
            <el-table-column prop="Remark" label="备注" width="200" />
            <el-table-column prop="Alias" label="别名" width="200" />
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

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api'

export default {
  name: 'Contacts',
  setup() {
    const store = useStore()
    const router = useRouter()
    const loading = ref(false)
    const contacts = ref([])
    const searchKeyword = ref('')
    const currentPage = ref(1)
    const pageSize = ref(20)

    // 过滤后的联系人列表
    const filteredContacts = computed(() => {
      // 首先过滤掉包含 @chatroom 的联系人（这些属于聊天群）
      const contactsWithoutChatrooms = contacts.value.filter(contact => 
        !(contact.UserName || '').includes('@chatroom') 
        && !(contact.UserName || '').includes('@openim') 
        && !(contact.UserName || '').includes('@kefu.openim')
        && !(contact.UserName || '').includes('@im.chatroom')
      )
      
      // 如果没有搜索关键词，返回过滤后的所有联系人
      if (!searchKeyword.value) return contactsWithoutChatrooms
      
      // 应用搜索过滤
      return contactsWithoutChatrooms.filter(contact => 
        (contact.UserName || '').toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
        (contact.NickName || '').toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
        (contact.Remark || '').toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
        (contact.Alias || '').toLowerCase().includes(searchKeyword.value.toLowerCase())
      )
    })

    // 分页后的联系人列表
    const paginatedContacts = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredContacts.value.slice(start, end)
    })

    // 加载联系人列表
    const loadContacts = async () => {
      loading.value = true
      try {
        const response = await api.getContacts()
        contacts.value = response.data || []
        
        // 计算过滤后的联系人数量（排除聊天群）@openim
        const actualContactsCount = contacts.value.filter(contact => 
          !(contact.UserName || '').includes('@chatroom')
          && !(contact.UserName || '').includes('@openim')
          && !(contact.UserName || '').includes('@kefu.openim')
          && !(contact.UserName || '').includes('@im.chatroom')
        ).length
        const chatroomsCount = contacts.value.length - actualContactsCount
        
        ElMessage.success(`加载了 ${actualContactsCount} 个联系人${chatroomsCount > 0 ? ` (已过滤 ${chatroomsCount} 个聊天群)` : ''}`)
      } catch (error) {
        ElMessage.error('加载联系人失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 搜索处理
    const handleSearch = () => {
      currentPage.value = 1
    }

    // 分页处理
    const handlePageChange = (page) => {
      currentPage.value = page
    }

    // 行点击处理
    const handleRowClick = (row) => {
      console.log('联系人详情:', row)
    }

    // 查看聊天记录
    const viewChatHistory = (contact) => {
      router.push({
        path: '/chatlog',
        query: {
          talker: contact.UserName || contact.NickName || contact.Alias
        }
      })
    }

    // 复制联系人ID
    const copyContactId = (contact) => {
      const id = contact.UserName || contact.NickName || contact.Alias
      if (id) {
        navigator.clipboard.writeText(id).then(() => {
          ElMessage.success('联系人ID已复制到剪贴板')
        }).catch(() => {
          ElMessage.error('复制失败')
        })
      } else {
        ElMessage.warning('无可复制的ID')
      }
    }

    onMounted(() => {
      loadContacts()
    })

    return {
      loading,
      contacts,
      searchKeyword,
      currentPage,
      pageSize,
      filteredContacts,
      paginatedContacts,
      loadContacts,
      handleSearch,
      handlePageChange,
      handleRowClick,
      viewChatHistory,
      copyContactId
    }
  }
}
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
</style> 