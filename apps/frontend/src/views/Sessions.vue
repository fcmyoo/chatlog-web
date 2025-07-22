<template>
  <div class="sessions-page">
    <div class="card">
      <div class="card-header">
        <h3>会话列表</h3>
        <el-button type="primary" @click="loadSessions">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
      <div class="card-body">
        <div class="search-bar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索会话..."
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
        <div v-else-if="!filteredSessions.length" class="empty-state">
          <el-empty description="暂无会话数据" />
        </div>
        <div v-else>
          <el-row :gutter="20">
            <el-col 
              v-for="session in paginatedSessions" 
              :key="session.id"
              :xs="24" :sm="12" :md="8" :lg="6"
            >
              <el-card 
                class="session-card"
                @click="viewChatHistory(session)"
              >
                <div class="session-avatar">
                  <el-avatar :size="60">
                    {{ getSessionInitial(session.name) }}
                  </el-avatar>
                </div>
                <div class="session-info">
                  <h4 class="session-name">{{ session.name || '未知' }}</h4>
                  <p class="session-id">{{ session.id }}</p>
                  <p class="session-time">{{ formatTime(session.lastMessageTime) }}</p>
                </div>
                <div class="session-actions">
                  <el-button 
                    link 
                    @click.stop="copySessionId(session)"
                  >
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                  <el-button 
                    link 
                    @click.stop="viewChatHistory(session)"
                  >
                    <el-icon><ChatDotRound /></el-icon>
                  </el-button>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="filteredSessions.length"
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
import dayjs from 'dayjs'
import api from '@/api'

export default {
  name: 'Sessions',
  setup() {
    const store = useStore()
    const router = useRouter()
    const loading = ref(false)
    const sessions = ref([])
    const searchKeyword = ref('')
    const currentPage = ref(1)
    const pageSize = ref(20)

    // 过滤后的会话列表
    const filteredSessions = computed(() => {
      if (!searchKeyword.value) return sessions.value
      return sessions.value.filter(session => 
        (session.name || '').toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
        (session.id || '').toLowerCase().includes(searchKeyword.value.toLowerCase())
      )
    })

    // 分页后的会话列表
    const paginatedSessions = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredSessions.value.slice(start, end)
    })

    // 加载会话列表
    const loadSessions = async () => {
      loading.value = true
      try {
        const response = await api.getSessions()
        sessions.value = response.data || []
        ElMessage.success(`加载了 ${sessions.value.length} 个会话`)
      } catch (error) {
        ElMessage.error('加载会话失败: ' + error.message)
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

    // 查看聊天记录
    const viewChatHistory = (session) => {
      router.push({
        path: '/chatlog',
        query: {
          talker: session.name || session.id
        }
      })
    }

    // 复制会话ID
    const copySessionId = (session) => {
      const id = session.id || session.name
      if (id) {
        navigator.clipboard.writeText(id).then(() => {
          ElMessage.success('会话ID已复制到剪贴板')
        }).catch(() => {
          ElMessage.error('复制失败')
        })
      } else {
        ElMessage.warning('无可复制的ID')
      }
    }

    // 获取会话名称首字母
    const getSessionInitial = (name) => {
      if (!name) return '?'
      return name.charAt(0).toUpperCase()
    }

    // 格式化时间
    const formatTime = (time) => {
      if (!time) return '未知'
      return dayjs(time).format('YYYY-MM-DD HH:mm')
    }

    onMounted(() => {
      loadSessions()
    })

    return {
      loading,
      sessions,
      searchKeyword,
      currentPage,
      pageSize,
      filteredSessions,
      paginatedSessions,
      loadSessions,
      handleSearch,
      handlePageChange,
      viewChatHistory,
      copySessionId,
      getSessionInitial,
      formatTime
    }
  }
}
</script>

<style scoped>
.sessions-page {
  padding: 20px;
}

.search-bar {
  margin-bottom: 20px;
}

.session-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.session-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.session-avatar {
  text-align: center;
  margin-bottom: 15px;
}

.session-info {
  text-align: center;
}

.session-name {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-id {
  margin: 0 0 5px 0;
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.session-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  opacity: 0;
  transition: opacity 0.3s;
}

.session-card:hover .session-actions {
  opacity: 1;
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