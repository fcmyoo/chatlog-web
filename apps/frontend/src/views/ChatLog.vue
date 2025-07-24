<template>
  <div class="chatlog-page">
    <!-- 搜索表单 -->
    <div class="search-form">
      <el-form
        ref="searchForm"
        :model="searchParams"
        label-width="100px"
        @submit.prevent="handleSearch"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="聊天对象">
              <el-select
                v-model="searchParams.talker"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="选择或输入聊天对象（支持多选）"
                style="width: 100%"
                @change="handleTalkerChange"
              >
                <el-option
                  v-for="item in talkerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
              <div class="input-hint">
                可输入微信ID、群聊ID、备注名、昵称等，支持多个选择
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="关键词">
              <el-select
                v-model="searchParams.keyword"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="输入关键词（支持多个）"
                style="width: 100%"
                @change="handleKeywordChange"
              >
                <el-option
                  v-for="item in keywordOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
              <div class="input-hint">
                输入消息内容关键词，支持多个关键词搜索
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="搜索模式">
              <el-radio-group v-model="searchMode">
                <el-radio value="and">全部匹配</el-radio>
                <el-radio value="or">任意匹配</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="数据格式">
              <el-select v-model="searchParams.format" style="width: 100%">
                <el-option label="JSON" value="json" />
                <el-option label="CSV" value="csv" />
                <el-option label="纯文本" value="text" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="每页数量">
              <el-select v-model="searchParams.limit" style="width: 100%">
                <el-option label="20条" :value="20" />
                <el-option label="50条" :value="50" />
                <el-option label="100条" :value="100" />
                <el-option label="200条" :value="200" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item>
              <el-button type="primary" @click="handleSearch" :loading="loading">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="handleReset">
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
              <el-button
                type="success"
                @click="handleExport"
                :disabled="!chatLogs.length"
              >
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 搜索条件预览 -->
        <div v-if="searchParams.talker.length || searchParams.keyword.length" class="search-preview">
          <div class="preview-title">当前搜索条件：</div>
          <div class="preview-tags">
            <el-tag
              v-for="talker in searchParams.talker"
              :key="talker"
              type="primary"
              closable
              @close="removeTalker(talker)"
            >
              群聊: {{ talker }}
            </el-tag>
            <el-tag
              v-for="keyword in searchParams.keyword"
              :key="keyword"
              type="success"
              closable
              @close="removeKeyword(keyword)"
            >
              关键词: {{ keyword }}
            </el-tag>
          </div>
          <div class="preview-mode">
            <el-text type="info">
              搜索模式: {{ searchMode === 'and' ? '全部匹配（AND）' : '任意匹配（OR）' }}
            </el-text>
          </div>
        </div>
      </el-form>
    </div>

    <!-- 聊天记录列表 -->
    <div class="card">
      <div class="card-header">
        <h3>聊天记录 ({{ total }} 条)</h3>
        <div class="search-info">
          <span v-if="searchParams.talker.length">
            搜索对象: {{ searchParams.talker.length }}个
          </span>
          <span v-if="searchParams.keyword.length">
            关键词: {{ searchParams.keyword.length }}个
          </span>
        </div>
      </div>
      <div class="card-body">
        <div v-if="loading" class="loading">
          <el-skeleton :rows="10" animated />
        </div>
        <div v-else-if="!chatLogs.length" class="empty-state">
          <el-empty description="暂无聊天记录" />
        </div>
        <div v-else class="chat-messages">
          <div
            v-for="(message, index) in chatLogs"
            :key="index"
            class="chat-message"
          >
            <div class="message-header">
              <div class="message-sender">
                <el-avatar :size="32" class="sender-avatar">
                  {{ getSenderInitial(message.senderName) }}
                </el-avatar>
                <span class="sender-name">{{ message.senderName || '未知' }}</span>
                <el-tag
                  v-if="message.senderId"
                  size="small"
                  type="info"
                  class="talker-tag"
                >
                  {{ message.senderId }}
                </el-tag>
                <!-- 高亮匹配的关键词 -->
                <el-tag
                  v-if="getMatchedKeywords(message.content).length > 0"
                  size="small"
                  type="success"
                  effect="light"
                  class="keyword-tag"
                >
                  匹配: {{ getMatchedKeywords(message.content).join(', ') }}
                </el-tag>
              </div>
              <div class="message-time">
                {{ formatTime(message.time) }}
              </div>
            </div>
            <div class="message-content">
              <!-- 解析消息内容中的多媒体格式 -->
              <div v-if="message.content && message.content.includes('![图片]')" class="text-message">
                <div v-html="parseMediaContent(message.content)"></div>
              </div>
              <div v-else-if="message.content && message.content.includes('![视频]')" class="text-message">
                <div v-html="parseMediaContent(message.content)"></div>
              </div>
              <div v-else-if="message.content && message.content.includes('![语音]')" class="text-message">
                <div v-html="parseMediaContent(message.content)"></div>
              </div>
              <div v-else-if="message.content && message.content.includes('![文件]')" class="text-message">
                <div v-html="parseMediaContent(message.content)"></div>
              </div>
              <div v-else class="text-message">
                <span v-html="highlightKeywords(message.content || '空消息')"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="chatLogs.length" class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="searchParams.limit"
            :page-sizes="[20, 50, 100, 200]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </div>

    <!-- 图片预览对话框 -->
    <el-dialog
      v-model="imagePreviewVisible"
      title="图片预览"
      width="50%"
    >
      <img
        :src="previewImageUrl"
        style="width: 100%; max-height: 500px; object-fit: contain;"
        alt="预览图片"
      />
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'
import api from '@/api'

export default {
  name: 'ChatLog',
  setup () {
    const store = useStore()
    const loading = ref(false)
    const dateRange = ref(['', ''])
    const searchParams = reactive({
      time: '',
      talker: [], // 改为数组支持多选
      keyword: [], // 改为数组支持多选
      format: 'json',
      limit: 20,
      offset: 0
    })
    const searchMode = ref('and') // 搜索模式：and 或 or
    const currentPage = ref(1)
    const total = ref(0)
    const chatLogs = ref([])
    const imagePreviewVisible = ref(false)
    const previewImageUrl = ref('')

    // 选项数据
    const talkerOptions = ref([])
    const keywordOptions = ref([])

    // 用于存储历史搜索记录
    const searchHistory = ref({
      talkers: [],
      keywords: []
    })

    // 搜索聊天记录
    const handleSearch = async () => {
      loading.value = true
      try {
        // 构建时间参数
        let timeParam = ''
        if (dateRange.value[0] && dateRange.value[1]) {
          timeParam = `${dateRange.value[0]}~${dateRange.value[1]}`
        }

        // 构建搜索参数
        const params = {
          time: timeParam,
          format: searchParams.format,
          limit: searchParams.limit,
          offset: (currentPage.value - 1) * searchParams.limit
        }

        // 处理多个聊天对象
        if (searchParams.talker.length > 0) {
          params.talker = searchParams.talker.join(',')
        }

        // 处理多个关键词
        if (searchParams.keyword.length > 0) {
          if (searchMode.value === 'and') {
            // 全部匹配模式：将关键词组合成一个查询
            params.keyword = searchParams.keyword.join(' ')
          } else {
            // 任意匹配模式：用 | 分隔关键词（支持正则表达式）
            params.keyword = searchParams.keyword.join('|')
          }
        }

        // 移除空参数
        Object.keys(params).forEach(key => {
          if (!params[key] && params[key] !== 0) {
            delete params[key]
          }
        })

        console.log('查询参数:', params)

        const response = await api.getChatLogs(params)
        chatLogs.value = response.data || []

        // 修复分页：如果API没有返回总数，则估算总数
        const responseTotal = response.headers['x-total-count'] || response.headers['X-Total-Count']
        if (responseTotal) {
          total.value = parseInt(responseTotal)
        } else {
          // 如果没有总数信息，根据返回的数据估算
          if (chatLogs.value.length === searchParams.limit) {
            // 如果返回的数据等于limit，说明可能还有更多数据
            total.value = (currentPage.value - 1) * searchParams.limit + chatLogs.value.length + 1
          } else {
            // 如果返回的数据少于limit，说明这是最后一页
            total.value = (currentPage.value - 1) * searchParams.limit + chatLogs.value.length
          }
        }

        console.log('查询结果:', chatLogs.value.length, '条记录，总数:', total.value)

        if (chatLogs.value.length === 0) {
          ElMessage.info('未找到匹配的聊天记录')
        } else {
          const talkerText = searchParams.talker.length > 0 ? `${searchParams.talker.length}个对象` : '所有对象'
          const keywordText = searchParams.keyword.length > 0 ? `${searchParams.keyword.length}个关键词` : '无关键词'
          ElMessage.success(`找到 ${chatLogs.value.length} 条记录 (搜索: ${talkerText}, ${keywordText})`)
        }
      } catch (error) {
        console.error('查询聊天记录失败:', error)
        ElMessage.error('查询聊天记录失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 重置搜索条件
    const handleReset = () => {
      dateRange.value = ['', '']
      searchParams.time = ''
      searchParams.talker = []
      searchParams.keyword = []
      searchParams.format = 'json'
      searchParams.limit = 20
      searchMode.value = 'and'
      currentPage.value = 1
      chatLogs.value = []
      total.value = 0
    }

    // 处理聊天对象变化
    const handleTalkerChange = (values) => {
      // 更新历史记录
      values.forEach(value => {
        if (!searchHistory.value.talkers.includes(value)) {
          searchHistory.value.talkers.unshift(value)
        }
      })
      // 限制历史记录数量
      searchHistory.value.talkers = searchHistory.value.talkers.slice(0, 20)
      updateTalkerOptions()
      saveHistory()
    }

    // 处理关键词变化
    const handleKeywordChange = (values) => {
      // 更新历史记录
      values.forEach(value => {
        if (!searchHistory.value.keywords.includes(value)) {
          searchHistory.value.keywords.unshift(value)
        }
      })
      // 限制历史记录数量
      searchHistory.value.keywords = searchHistory.value.keywords.slice(0, 20)
      updateKeywordOptions()
      saveHistory()
    }

    // 更新聊天对象选项
    const updateTalkerOptions = () => {
      talkerOptions.value = searchHistory.value.talkers.map(talker => ({
        value: talker,
        label: talker
      }))
    }

    // 更新关键词选项
    const updateKeywordOptions = () => {
      keywordOptions.value = searchHistory.value.keywords.map(keyword => ({
        value: keyword,
        label: keyword
      }))
    }

    // 移除聊天对象
    const removeTalker = (talker) => {
      const index = searchParams.talker.indexOf(talker)
      if (index > -1) {
        searchParams.talker.splice(index, 1)
      }
    }

    // 移除关键词
    const removeKeyword = (keyword) => {
      const index = searchParams.keyword.indexOf(keyword)
      if (index > -1) {
        searchParams.keyword.splice(index, 1)
      }
    }

    // 获取匹配的关键词
    const getMatchedKeywords = (content) => {
      if (!content || !searchParams.keyword.length) return []

      const matched = []
      searchParams.keyword.forEach(keyword => {
        if (content.includes(keyword)) {
          matched.push(keyword)
        }
      })
      return matched
    }

    // 高亮关键词
    const highlightKeywords = (content) => {
      if (!content || !searchParams.keyword.length) return content

      let highlightedContent = content
      searchParams.keyword.forEach(keyword => {
        const regex = new RegExp(`(${keyword})`, 'gi')
        highlightedContent = highlightedContent.replace(regex, '<span class="keyword-highlight">$1</span>')
      })
      return highlightedContent
    }

    // 导出聊天记录
    const handleExport = async () => {
      try {
        console.log('开始导出聊天记录...')

        // 构建时间参数
        let timeParam = ''
        if (dateRange.value[0] && dateRange.value[1]) {
          timeParam = `${dateRange.value[0]}~${dateRange.value[1]}`
        }

        const params = {
          time: timeParam,
          format: 'csv',
          limit: 5000 // 导出时增加限制，避免数据过大
        }

        // 处理多个聊天对象
        if (searchParams.talker.length > 0) {
          params.talker = searchParams.talker.join(',')
        }

        // 处理多个关键词
        if (searchParams.keyword.length > 0) {
          if (searchMode.value === 'and') {
            params.keyword = searchParams.keyword.join(' ')
          } else {
            params.keyword = searchParams.keyword.join('|')
          }
        }

        // 移除空参数
        Object.keys(params).forEach(key => {
          if (!params[key] && params[key] !== 0) {
            delete params[key]
          }
        })

        console.log('导出参数:', params)

        // 使用原始API调用，不进行解析
        const response = await api.getChatLogsRaw(params)
        console.log('导出响应:', response.data)

        // 处理响应数据
        let csvData = response.data
        if (typeof csvData === 'object') {
          // 如果返回的是对象，转换为CSV格式
          csvData = convertToCsv(csvData)
        } else if (typeof csvData !== 'string') {
          csvData = String(csvData)
        }

        // 创建Blob并下载
        const blob = new Blob([csvData], {
          type: 'text/csv;charset=utf-8'
        })
        const filename = `聊天记录_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`
        saveAs(blob, filename)
        ElMessage.success('导出成功')
      } catch (error) {
        console.error('导出失败:', error)
        ElMessage.error('导出失败: ' + error.message)
      }
    }

    // 将对象数组转换为CSV格式
    const convertToCsv = (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        return '发送者,时间,内容\n'
      }

      const headers = ['发送者', '时间', '内容']
      const csvHeaders = headers.join(',') + '\n'

      const csvRows = data.map(item => {
        const sender = item.senderName || item.sender || '未知'
        const time = item.time || item.timestamp || ''
        const content = (item.content || '').replace(/"/g, '""').replace(/,/g, '，')
        return `"${sender}","${time}","${content}"`
      }).join('\n')

      return csvHeaders + csvRows
    }

    // 解析消息内容中的多媒体格式
    const parseMediaContent = (content) => {
      if (!content) return ''

      let parsedContent = content

      // 解析图片 ![图片](url)
      parsedContent = parsedContent.replace(/!\[图片\]\((.*?)\)/g, (match, url) => {
        return `<img src="${url}" style="max-width: 200px; max-height: 200px; cursor: pointer; border-radius: 4px;" onclick="window.open('${url}', '_blank')" alt="图片" />`
      })

      // 解析视频 ![视频](url)
      parsedContent = parsedContent.replace(/!\[视频\]\((.*?)\)/g, (match, url) => {
        return `<video src="${url}" controls style="max-width: 300px; max-height: 200px; border-radius: 4px;" /></video>`
      })

      // 解析语音 ![语音](url)
      parsedContent = parsedContent.replace(/!\[语音\]\((.*?)\)/g, (match, url) => {
        return `<audio src="${url}" controls style="max-width: 300px;" /></audio>`
      })

      // 解析文件 ![文件](url)
      parsedContent = parsedContent.replace(/!\[文件\]\((.*?)\)/g, (match, url) => {
        const fileName = url.split('/').pop() || '文件'
        return `<a href="${url}" target="_blank" style="color: #409eff; text-decoration: none;">📁 ${fileName}</a>`
      })

      // 解析HTTP链接
      parsedContent = parsedContent.replace(/(https?:\/\/[^\s]+)/g, (match, url) => {
        return `<a href="${url}" target="_blank" style="color: #409eff; text-decoration: none;">${url}</a>`
      })

      return parsedContent
    }

    // 分页处理
    const handlePageChange = (page) => {
      currentPage.value = page
      handleSearch()
    }

    // 页面大小改变处理
    const handleSizeChange = (size) => {
      searchParams.limit = size
      currentPage.value = 1
      handleSearch()
    }

    // 获取多媒体URL
    const getMediaUrl = (type, id) => {
      switch (type) {
        case 'image':
          return api.getImageUrl(id)
        case 'video':
          return api.getVideoUrl(id)
        case 'voice':
          return api.getVoiceUrl(id)
        case 'file':
          return api.getFileUrl(id)
        default:
          return ''
      }
    }

    // 图片预览
    const previewImage = (imageId) => {
      previewImageUrl.value = api.getImageUrl(imageId)
      imagePreviewVisible.value = true
    }

    // 下载文件
    const downloadFile = (fileId) => {
      const url = api.getFileUrl(fileId)
      window.open(url, '_blank')
    }

    // 获取发送者首字母
    const getSenderInitial = (sender) => {
      if (!sender) return '?'
      return sender.charAt(0).toUpperCase()
    }

    // 格式化时间
    const formatTime = (time) => {
      return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    }

    // 初始化历史记录
    const initializeHistory = () => {
      try {
        const savedHistory = localStorage.getItem('chatlog-search-history')
        if (savedHistory) {
          const history = JSON.parse(savedHistory)
          searchHistory.value = {
            talkers: history.talkers || [],
            keywords: history.keywords || []
          }
          updateTalkerOptions()
          updateKeywordOptions()
        }
      } catch (error) {
        console.warn('恢复搜索历史失败:', error)
      }
    }

    // 保存历史记录
    const saveHistory = () => {
      try {
        localStorage.setItem('chatlog-search-history', JSON.stringify(searchHistory.value))
      } catch (error) {
        console.warn('保存搜索历史失败:', error)
      }
    }

    // 监听搜索历史变化并保存
    const saveHistoryOnChange = () => {
      saveHistory()
    }

    // 组件挂载时初始化
    onMounted(() => {
      initializeHistory()
    })

    return {
      loading,
      dateRange,
      searchParams,
      searchMode,
      currentPage,
      total,
      chatLogs,
      imagePreviewVisible,
      previewImageUrl,
      talkerOptions,
      keywordOptions,
      handleSearch,
      handleReset,
      handleExport,
      handlePageChange,
      handleSizeChange,
      getMediaUrl,
      previewImage,
      downloadFile,
      getSenderInitial,
      formatTime,
      parseMediaContent,
      getMatchedKeywords,
      highlightKeywords,
      removeTalker,
      removeKeyword,
      handleTalkerChange,
      handleKeywordChange,
      updateTalkerOptions,
      updateKeywordOptions,
      initializeHistory,
      saveHistory
    }
  }
}
</script>

<style scoped>
.chatlog-page {
  padding: 20px;
}

.chat-messages {
  max-height: 600px;
  overflow-y: auto;
}

.chat-message {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  transition: background-color 0.3s;
}

.chat-message:hover {
  background-color: #f8f9fa;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.message-sender {
  display: flex;
  align-items: center;
}

.sender-avatar {
  margin-right: 10px;
}

.sender-name {
  font-weight: 600;
  color: #409eff;
  margin-right: 10px;
}

.talker-tag {
  margin-left: 10px;
}

.message-time {
  color: #909399;
  font-size: 12px;
}

.message-content {
  line-height: 1.6;
}

.text-message {
  word-wrap: break-word;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.message-image:hover {
  transform: scale(1.05);
}

.message-video {
  max-width: 300px;
  max-height: 200px;
  border-radius: 8px;
}

.message-audio {
  width: 100%;
  max-width: 300px;
}

.file-message {
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  display: inline-block;
}

.other-message {
  padding: 10px;
  background-color: #fff3cd;
  border-radius: 4px;
  border-left: 4px solid #ffc107;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 50px;
}

.loading {
  padding: 20px;
}

/* 新增功能样式 */
.input-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.2;
}

.search-preview {
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  margin-top: 20px;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 10px;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.preview-tags .el-tag {
  margin: 0;
}

.preview-mode {
  font-size: 12px;
}

.search-info {
  display: flex;
  gap: 15px;
  align-items: center;
  font-size: 14px;
  color: #606266;
}

.search-info span {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background-color: #e1f3ff;
  border-radius: 4px;
  font-size: 12px;
}

.keyword-tag {
  margin-left: 10px;
}

.keyword-highlight {
  background-color: #fff3cd;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
  color: #856404;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-top: 20px;
}

.card-body {
  padding: 0;
}

.search-form {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-form .el-form-item {
  margin-bottom: 18px;
}

.search-form .el-form-item__label {
  font-weight: 600;
  color: #303133;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .message-sender {
    margin-bottom: 5px;
  }

  .message-image,
  .message-video {
    max-width: 100%;
  }

  .search-info {
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
  }

  .preview-tags {
    flex-direction: column;
    gap: 5px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .chatlog-page {
    padding: 10px;
  }
}

@media (max-width: 480px) {
  .search-form {
    padding: 15px;
  }

  .search-form .el-col {
    width: 100%;
  }

  .search-form .el-row {
    flex-direction: column;
  }
}
</style>
