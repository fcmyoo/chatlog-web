<template>
  <div class="media-page">
    <div class="card">
      <div class="card-header">
        <h3>多媒体管理</h3>
        <div class="header-actions">
          <el-select v-model="mediaType" @change="handleTypeChange">
            <el-option label="所有" value="" />
            <el-option label="图片" value="image" />
            <el-option label="视频" value="video" />
            <el-option label="语音" value="voice" />
            <el-option label="文件" value="file" />
          </el-select>
        </div>
      </div>
      <div class="card-body">
        <div class="search-bar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索多媒体文件..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div v-if="loading" class="loading">
          <el-skeleton :rows="5" animated />
        </div>
        <div v-else-if="!filteredMedia.length" class="empty-state">
          <el-empty description="暂无多媒体文件" />
        </div>
        <div v-else>
          <div class="media-grid">
            <div 
              v-for="media in paginatedMedia" 
              :key="media.id"
              class="media-item"
                             @click="handlePreviewMedia(media)"
            >
              <div class="media-preview">
                <img 
                  v-if="media.type === 'image'"
                  :src="getMediaUrl(media)"
                  :alt="media.name"
                  class="media-thumbnail"
                />
                <video 
                  v-else-if="media.type === 'video'"
                  :src="getMediaUrl(media)"
                  class="media-thumbnail"
                  muted
                />
                <div 
                  v-else
                  class="media-thumbnail file-thumbnail"
                >
                  <el-icon size="40">
                    <Document v-if="media.type === 'file'" />
                    <Microphone v-else-if="media.type === 'voice'" />
                    <QuestionFilled v-else />
                  </el-icon>
                </div>
                <div class="media-overlay">
                  <el-icon size="24">
                    <View />
                  </el-icon>
                </div>
              </div>
              <div class="media-info">
                <p class="media-name">{{ media.name || '未知' }}</p>
                <p class="media-details">
                  <el-tag :type="getTypeColor(media.type)" size="small">
                    {{ getTypeLabel(media.type) }}
                  </el-tag>
                  <span class="media-size">{{ formatSize(media.size) }}</span>
                </p>
                <p class="media-sender" v-if="media.sender">
                  <el-icon><User /></el-icon>
                  {{ media.sender }}
                </p>
                <p class="media-time">{{ formatTime(media.time) }}</p>
              </div>
              <div class="media-actions">
                <el-button 
                  link 
                  @click.stop="downloadMedia(media)"
                  title="下载"
                >
                  <el-icon><Download /></el-icon>
                </el-button>
                <el-button 
                  link 
                  @click.stop="copyMediaUrl(media)"
                  title="复制链接"
                >
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="filteredMedia.length"
              layout="total, prev, pager, next, jumper"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 媒体预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewMediaRef?.name || '预览'"
      width="70%"
      @close="closePreview"
    >
      <div class="preview-container">
        <img 
          v-if="previewMediaRef?.type === 'image'"
          :src="getMediaUrl(previewMediaRef)"
          class="preview-image"
          alt="预览图片"
        />
        <video 
          v-else-if="previewMediaRef?.type === 'video'"
          :src="getMediaUrl(previewMediaRef)"
          class="preview-video"
          controls
        />
        <audio 
          v-else-if="previewMediaRef?.type === 'voice'"
          :src="getMediaUrl(previewMediaRef)"
          class="preview-audio"
          controls
        />
        <div v-else class="preview-file">
          <el-icon size="60"><Document /></el-icon>
          <p>{{ previewMediaRef?.name }}</p>
          <el-button 
            type="primary" 
            @click="downloadMedia(previewMediaRef)"
          >
            下载文件
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import api from '@/api'

export default {
  name: 'Media',
  setup() {
    const loading = ref(false)
    const mediaList = ref([])
    const searchKeyword = ref('')
    const mediaType = ref('')
    const currentPage = ref(1)
    const pageSize = ref(20)
    const previewVisible = ref(false)
    const previewMediaRef = ref(null)

    // 过滤后的媒体列表
    const filteredMedia = computed(() => {
      let filtered = mediaList.value
      
      if (mediaType.value) {
        filtered = filtered.filter(media => media.type === mediaType.value)
      }
      
      if (searchKeyword.value) {
        filtered = filtered.filter(media => 
          (media.name || '').toLowerCase().includes(searchKeyword.value.toLowerCase())
        )
      }
      
      return filtered
    })

    // 分页后的媒体列表
    const paginatedMedia = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredMedia.value.slice(start, end)
    })

    // 从聊天记录中提取多媒体文件
    const extractMediaFromChatLogs = (chatLogs) => {
      const mediaFiles = []
      let mediaIndex = 1
      
      chatLogs.forEach(log => {
        const content = log.content || ''
        
        // 提取图片 ![图片](url)
        const imageMatches = content.match(/!\[图片\]\((.*?)\)/g)
        if (imageMatches) {
          imageMatches.forEach(match => {
            const urlMatch = match.match(/!\[图片\]\((.*?)\)/)
            if (urlMatch && urlMatch[1]) {
              const url = urlMatch[1]
              const id = url.split('/').pop() || `img_${mediaIndex++}`
              mediaFiles.push({
                id: id,
                name: `图片_${log.senderName}_${log.time}.jpg`,
                type: 'image',
                size: Math.floor(Math.random() * 2000000) + 100000, // 模拟文件大小
                time: log.time,
                url: url,
                sender: log.senderName,
                senderId: log.senderId
              })
            }
          })
        }
        
        // 提取视频 ![视频](url)
        const videoMatches = content.match(/!\[视频\]\((.*?)\)/g)
        if (videoMatches) {
          videoMatches.forEach(match => {
            const urlMatch = match.match(/!\[视频\]\((.*?)\)/)
            if (urlMatch && urlMatch[1]) {
              const url = urlMatch[1]
              const id = url.split('/').pop() || `video_${mediaIndex++}`
              mediaFiles.push({
                id: id,
                name: `视频_${log.senderName}_${log.time}.mp4`,
                type: 'video',
                size: Math.floor(Math.random() * 10000000) + 1000000,
                time: log.time,
                url: url,
                sender: log.senderName,
                senderId: log.senderId
              })
            }
          })
        }
        
        // 提取语音 ![语音](url)
        const voiceMatches = content.match(/!\[语音\]\((.*?)\)/g)
        if (voiceMatches) {
          voiceMatches.forEach(match => {
            const urlMatch = match.match(/!\[语音\]\((.*?)\)/)
            if (urlMatch && urlMatch[1]) {
              const url = urlMatch[1]
              const id = url.split('/').pop() || `voice_${mediaIndex++}`
              mediaFiles.push({
                id: id,
                name: `语音_${log.senderName}_${log.time}.mp3`,
                type: 'voice',
                size: Math.floor(Math.random() * 1000000) + 50000,
                time: log.time,
                url: url,
                sender: log.senderName,
                senderId: log.senderId
              })
            }
          })
        }
        
        // 提取文件 ![文件](url)
        const fileMatches = content.match(/!\[文件\]\((.*?)\)/g)
        if (fileMatches) {
          fileMatches.forEach(match => {
            const urlMatch = match.match(/!\[文件\]\((.*?)\)/)
            if (urlMatch && urlMatch[1]) {
              const url = urlMatch[1]
              const id = url.split('/').pop() || `file_${mediaIndex++}`
              mediaFiles.push({
                id: id,
                name: `文件_${log.senderName}_${log.time}`,
                type: 'file',
                size: Math.floor(Math.random() * 5000000) + 100000,
                time: log.time,
                url: url,
                sender: log.senderName,
                senderId: log.senderId
              })
            }
          })
        }
        
        // 检查是否包含HTTP链接的图片
        if (content.includes('http://127.0.0.1:5030/image/')) {
          const imageUrls = content.match(/http:\/\/127\.0\.0\.1:5030\/image\/[a-zA-Z0-9]+/g)
          if (imageUrls) {
            imageUrls.forEach(url => {
              const id = url.split('/').pop()
              mediaFiles.push({
                id: id,
                name: `图片_${log.senderName}_${dayjs(log.time).format('MMDD_HHmm')}.jpg`,
                type: 'image',
                size: Math.floor(Math.random() * 2000000) + 100000,
                time: log.time,
                url: url,
                sender: log.senderName,
                senderId: log.senderId
              })
            })
          }
        }
      })
      
      return mediaFiles
    }

    // 加载多媒体数据
    const loadMedia = async () => {
      loading.value = true
      try {
        // 获取最近7天的聊天记录来提取多媒体文件
        const endDate = dayjs()
        const startDate = endDate.subtract(7, 'day')
        
        // 获取所有会话
        const sessionsResponse = await api.getSessions()
        const sessions = sessionsResponse.data || []
        
        if (sessions.length === 0) {
          mediaList.value = []
          ElMessage.info('暂无会话数据')
          return
        }
        
        // 从前几个活跃会话中获取聊天记录
        const activeSessions = sessions.slice(0, 5) // 获取前5个会话
        const allMediaFiles = []
        
        for (const session of activeSessions) {
          try {
            console.log('获取会话聊天记录:', session.name || session.id)
            
            const chatLogsResponse = await api.getChatLogs({
              talker: session.id || session.name,
              time: `${startDate.format('YYYY-MM-DD')}~${endDate.format('YYYY-MM-DD')}`,
              limit: 200
            })
            
            console.log('聊天记录响应类型:', typeof chatLogsResponse.data)
            console.log('聊天记录响应内容:', chatLogsResponse.data)
            
            const chatLogs = chatLogsResponse.data || []
            console.log('解析后的聊天记录数量:', chatLogs.length)
            
            const mediaFiles = extractMediaFromChatLogs(chatLogs)
            console.log('提取的媒体文件数量:', mediaFiles.length)
            
            allMediaFiles.push(...mediaFiles)
          } catch (error) {
            console.error(`获取会话 ${session.name} 的聊天记录失败:`, error)
            ElMessage.warning(`获取会话 ${session.name} 的聊天记录失败: ${error.message}`)
          }
        }
        
        // 去重并按时间排序
        const uniqueMediaFiles = allMediaFiles.reduce((unique, item) => {
          const exists = unique.find(u => u.id === item.id && u.url === item.url)
          if (!exists) {
            unique.push(item)
          }
          return unique
        }, [])
        
        uniqueMediaFiles.sort((a, b) => dayjs(b.time).valueOf() - dayjs(a.time).valueOf())
        
        mediaList.value = uniqueMediaFiles
        ElMessage.success(`加载了 ${mediaList.value.length} 个媒体文件`)
        
        // 如果没有找到媒体文件，添加一些提示数据
        if (mediaList.value.length === 0) {
          mediaList.value = [
            {
              id: 'sample_1',
              name: '暂无媒体文件',
              type: 'info',
              size: 0,
              time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              url: '',
              sender: '系统',
              senderId: 'system'
            }
          ]
        }
        
      } catch (error) {
        console.error('加载媒体文件失败:', error)
        ElMessage.error('加载媒体文件失败: ' + error.message)
        
        // 如果失败，使用模拟数据
        mediaList.value = [
          {
            id: 'sample_1',
            name: '示例图片.jpg',
            type: 'image',
            size: 1024000,
            time: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
            url: 'https://via.placeholder.com/300x200',
            sender: '示例用户',
            senderId: 'sample_user'
          },
          {
            id: 'sample_2',
            name: '示例文档.pdf',
            type: 'file',
            size: 2048000,
            time: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
            url: '',
            sender: '示例用户',
            senderId: 'sample_user'
          }
        ]
      } finally {
        loading.value = false
      }
    }

    // 类型变化处理
    const handleTypeChange = () => {
      currentPage.value = 1
    }

    // 搜索处理
    const handleSearch = () => {
      currentPage.value = 1
    }

    // 分页处理
    const handlePageChange = (page) => {
      currentPage.value = page
    }

    // 预览媒体
    const handlePreviewMedia = (media) => {
      previewMediaRef.value = media
      previewVisible.value = true
    }

    // 关闭预览
    const closePreview = () => {
      previewVisible.value = false
      previewMediaRef.value = null
    }

    // 下载媒体
    const downloadMedia = (media) => {
      const url = getMediaUrl(media)
      if (url) {
        window.open(url, '_blank')
      } else {
        ElMessage.warning('无法获取下载链接')
      }
    }

    // 复制媒体链接
    const copyMediaUrl = (media) => {
      const url = getMediaUrl(media)
      if (url) {
        navigator.clipboard.writeText(url).then(() => {
          ElMessage.success('链接已复制到剪贴板')
        }).catch(() => {
          ElMessage.error('复制失败')
        })
      } else {
        ElMessage.warning('无法获取媒体链接')
      }
    }

    // 获取媒体URL
    const getMediaUrl = (media) => {
      if (media.url) return media.url
      
      switch (media.type) {
        case 'image':
          return api.getImageUrl(media.id)
        case 'video':
          return api.getVideoUrl(media.id)
        case 'voice':
          return api.getVoiceUrl(media.id)
        case 'file':
          return api.getFileUrl(media.id)
        default:
          return ''
      }
    }

    // 获取类型标签
    const getTypeLabel = (type) => {
      const labels = {
        image: '图片',
        video: '视频',
        voice: '语音',
        file: '文件'
      }
      return labels[type] || '未知'
    }

    // 获取类型颜色
    const getTypeColor = (type) => {
      const colors = {
        image: 'success',
        video: 'primary',
        voice: 'warning',
        file: 'info'
      }
      return colors[type] || 'default'
    }

    // 格式化文件大小
    const formatSize = (size) => {
      if (!size) return '未知'
      const units = ['B', 'KB', 'MB', 'GB']
      let index = 0
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024
        index++
      }
      return `${size.toFixed(1)} ${units[index]}`
    }

    // 格式化时间
    const formatTime = (time) => {
      if (!time) return '未知'
      return dayjs(time).format('YYYY-MM-DD HH:mm')
    }

    onMounted(() => {
      loadMedia()
    })

    return {
      loading,
      mediaList,
      searchKeyword,
      mediaType,
      currentPage,
      pageSize,
      previewVisible,
      previewMediaRef,
      filteredMedia,
      paginatedMedia,
      loadMedia,
      handleTypeChange,
      handleSearch,
      handlePageChange,
      handlePreviewMedia,
      closePreview,
      downloadMedia,
      copyMediaUrl,
      getMediaUrl,
      getTypeLabel,
      getTypeColor,
      formatSize,
      formatTime
    }
  }
}
</script>

<style scoped>
.media-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  margin-bottom: 20px;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.media-item {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
}

.media-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.media-preview {
  position: relative;
  width: 100%;
  height: 150px;
  overflow: hidden;
}

.media-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-thumbnail {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  color: #999;
}

.media-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.media-item:hover .media-overlay {
  opacity: 1;
}

.media-overlay .el-icon {
  color: white;
}

.media-info {
  padding: 15px;
}

.media-name {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-details {
  margin: 0 0 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.media-size {
  font-size: 12px;
  color: #999;
}

.media-sender {
  margin: 0 0 5px 0;
  font-size: 12px;
  color: #409eff;
  display: flex;
  align-items: center;
  gap: 4px;
}

.media-sender .el-icon {
  font-size: 12px;
}

.media-time {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.media-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  opacity: 0;
  transition: opacity 0.3s;
}

.media-item:hover .media-actions {
  opacity: 1;
}

.media-actions .el-button {
  background: rgba(255,255,255,0.9);
  margin-left: 5px;
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

.preview-container {
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
}

.preview-video {
  width: 100%;
  max-height: 500px;
  border-radius: 8px;
}

.preview-audio {
  width: 100%;
  max-width: 400px;
}

.preview-file {
  padding: 50px;
}

.preview-file .el-icon {
  color: #999;
  margin-bottom: 20px;
}

.preview-file p {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #333;
}

@media (max-width: 768px) {
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }
}
</style> 