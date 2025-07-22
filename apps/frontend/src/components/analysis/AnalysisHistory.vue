<template>
  <div class="analysis-history">
    <!-- 历史列表 -->
    <div v-if="histories.length === 0 && !loading" class="empty-state">
      <el-empty description="还没有分析历史">
        <template #image>
          <div class="empty-icon">📊</div>
        </template>
      </el-empty>
    </div>

    <div v-else class="history-list">
      <div 
        v-for="item in histories" 
        :key="item.id"
        class="history-item"
        @click="$emit('view', item)"
      >
        <div class="item-content">
          <div class="item-main">
            <div class="item-header">
              <h4 class="item-title">{{ item.title }}</h4>
              <div class="item-actions" @click.stop>
                <el-button size="small" type="primary" plain @click="$emit('view', item)">
                  <el-icon><View /></el-icon>
                  查看
                </el-button>
                <el-button size="small" type="danger" plain @click="confirmDelete(item)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </div>
            
            <div class="item-meta">
              <div class="meta-tags">
                <el-tag size="small" :type="getTypeColor(item.analysisType)">
                  {{ getTypeName(item.analysisType) }}
                </el-tag>
                <span class="meta-text">{{ item.groupName }}</span>
                <span class="meta-text">{{ item.messageCount }} 条消息</span>
              </div>
              
              <div class="meta-info">
                <span class="time">{{ formatTime(item.timestamp) }}</span>
                <span class="file-size">{{ formatFileSize(item.fileSize) }}</span>
              </div>
            </div>

            <div class="item-preview" v-if="item.preview">
              <p>{{ item.preview }}</p>
            </div>
          </div>

          <!-- 时间范围信息 -->
          <div class="item-details">
            <div class="detail-item">
              <el-icon><Calendar /></el-icon>
              <span>{{ item.timeRange }}</span>
            </div>
            <div class="detail-item" v-if="item.createdAt">
              <el-icon><Clock /></el-icon>
              <span>创建于 {{ formatTime(item.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 悬停效果 -->
        <div class="item-hover-effect"></div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore && histories.length > 0" class="load-more">
      <el-button @click="$emit('load-more')" :loading="loading">
        加载更多
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AnalysisHistory',
  props: {
    histories: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: false
    }
  },
  emits: ['view', 'delete', 'load-more'],
  methods: {
    getTypeName(type) {
      const typeNames = {
        programming: '编程技术',
        science: '科学学习',
        reading: '阅读讨论',
        custom: '自定义'
      }
      return typeNames[type] || '数据分析'
    },

    getTypeColor(type) {
      const typeColors = {
        programming: 'primary',
        science: 'success',
        reading: 'warning',
        custom: 'info'
      }
      return typeColors[type] || ''
    },

    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      
      // 如果是今天
      if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return '今天 ' + date.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
      
      // 如果是昨天
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (date.getDate() === yesterday.getDate()) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
      
      // 其他情况显示完整日期
      return date.toLocaleString('zh-CN', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    formatFileSize(bytes) {
      if (!bytes) return ''
      const sizes = ['B', 'KB', 'MB']
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    },

    async confirmDelete(item) {
      try {
        await this.$confirm(
          `确定要删除分析记录"${item.title}"吗？此操作无法撤销。`,
          '确认删除',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
            confirmButtonClass: 'el-button--danger'
          }
        )
        
        this.$emit('delete', item)
        
      } catch (error) {
        // 用户取消删除
      }
    }
  }
}
</script>

<style scoped>
.analysis-history {
  min-height: 200px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.history-item {
  position: relative;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.history-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.item-hover-effect {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(64, 158, 255, 0.03), transparent);
  transition: left 0.5s ease;
}

.history-item:hover .item-hover-effect {
  left: 100%;
}

.item-content {
  position: relative;
  z-index: 1;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.item-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  flex: 1;
  line-height: 1.4;
}

.item-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.history-item:hover .item-actions {
  opacity: 1;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.meta-tags {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-text {
  font-size: 13px;
  color: #909399;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 13px;
  color: #909399;
}

.time {
  font-weight: 500;
}

.item-preview {
  margin-bottom: 12px;
}

.item-preview p {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-details {
  display: flex;
  gap: 20px;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #c0c4cc;
}

.detail-item .el-icon {
  font-size: 14px;
}

.loading-state {
  padding: 20px;
}

.load-more {
  text-align: center;
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .history-item {
    padding: 15px;
  }
  
  .item-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .item-actions {
    opacity: 1;
    width: 100%;
    justify-content: flex-end;
  }
  
  .item-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .meta-tags {
    flex-wrap: wrap;
  }
  
  .item-details {
    flex-direction: column;
    gap: 8px;
  }
}
</style>