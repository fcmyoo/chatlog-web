<template>
  <el-card class="analysis-result" shadow="hover">
    <template #header>
      <div class="result-header">
        <div class="title-info">
          <h3>{{ result.title || result.metadata?.title }}</h3>
          <div class="meta-info">
            <el-tag size="small" type="primary">{{ getTypeName(result.analysisType || result.metadata?.analysisType) }}</el-tag>
            <span class="time">{{ formatTime(result.timestamp || result.metadata?.timestamp) }}</span>
            <span class="count">{{ result.messageCount || result.metadata?.messageCount || 0 }} 条消息</span>
          </div>
        </div>
        <div class="actions">
          <el-button size="small" @click="toggleFullscreen">
            <el-icon><FullScreen /></el-icon>
            {{ isFullscreen ? '退出全屏' : '全屏查看' }}
          </el-button>
          <el-button size="small" @click="downloadReport" v-if="!result.isHistoryView">
            <el-icon><Download /></el-icon>
            下载报告
          </el-button>
          <el-button size="small" @click="retryAnalysis" v-if="!result.isHistoryView">
            <el-icon><Refresh /></el-icon>
            重新分析
          </el-button>
        </div>
      </div>
    </template>

    <div class="result-content" :class="{ fullscreen: isFullscreen }">
      <!-- 分析概览 -->
      <div class="analysis-overview" v-if="result.preview">
        <h4>📝 分析概览</h4>
        <p class="preview-text">{{ result.preview }}</p>
      </div>

      <!-- HTML报告展示 -->
      <div class="report-container">
        <div class="report-header">
          <h4>📊 详细分析报告</h4>
          <div class="report-controls">
            <el-switch 
              v-model="showRawHtml"
              active-text="源码模式"
              inactive-text="预览模式"
              size="small"
            />
          </div>
        </div>
        
        <!-- HTML预览 -->
        <div v-if="!showRawHtml" class="html-preview">
          <iframe 
            ref="reportFrame"
            :srcdoc="htmlContent"
            frameborder="0"
            sandbox="allow-scripts allow-same-origin"
            @load="onFrameLoad"
          ></iframe>
        </div>

        <!-- HTML源码 -->
        <div v-else class="html-source">
          <el-input
            v-model="htmlContent"
            type="textarea"
            :rows="20"
            readonly
            class="html-code"
          />
        </div>
      </div>

      <!-- 分析统计 -->
      <div class="analysis-stats" v-if="analysisStats">
        <h4>📈 分析统计</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-number">{{ analysisStats.wordCount }}</div>
              <div class="stat-label">报告字数</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-number">{{ analysisStats.chartCount }}</div>
              <div class="stat-label">图表数量</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-number">{{ formatFileSize(result.fileSize) }}</div>
              <div class="stat-label">文件大小</div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 全屏遮罩 -->
    <div v-if="isFullscreen" class="fullscreen-overlay" @click="toggleFullscreen">
      <div class="fullscreen-content" @click.stop>
        <div class="fullscreen-header">
          <h3>{{ result.title || result.metadata?.title }}</h3>
          <el-button @click="toggleFullscreen" type="danger" size="small">
            <el-icon><Close /></el-icon>
            关闭
          </el-button>
        </div>
        <iframe 
          :srcdoc="htmlContent"
          frameborder="0"
          class="fullscreen-frame"
          sandbox="allow-scripts allow-same-origin"
        ></iframe>
      </div>
    </div>
  </el-card>
</template>

<script>
export default {
  name: 'AnalysisResult',
  props: {
    result: {
      type: Object,
      required: true
    }
  },
  emits: ['save', 'retry'],
  data() {
    return {
      isFullscreen: false,
      showRawHtml: false,
      analysisStats: null
    }
  },
  computed: {
    htmlContent() {
      return this.result.htmlContent || this.result.analysisResult || ''
    }
  },
  watch: {
    result: {
      handler(newResult) {
        if (newResult) {
          this.calculateStats()
        }
      },
      immediate: true
    }
  },
  methods: {
    getTypeName(type) {
      const typeNames = {
        programming: '编程技术分析',
        science: '科学学习分析',
        reading: '阅读讨论分析',
        custom: '自定义分析'
      }
      return typeNames[type] || '数据分析'
    },

    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN')
    },

    formatFileSize(bytes) {
      if (!bytes) return '0 B'
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    },

    calculateStats() {
      if (!this.htmlContent) return

      // 计算报告统计信息
      const textContent = this.htmlContent.replace(/<[^>]*>/g, '')
      const chartMatches = this.htmlContent.match(/<(canvas|svg|chart)/gi) || []
      
      this.analysisStats = {
        wordCount: textContent.length,
        chartCount: chartMatches.length,
        generatedAt: new Date().toLocaleString('zh-CN')
      }
    },

    onFrameLoad() {
      // iframe加载完成后的处理
      console.log('分析报告加载完成')
      
      // 可以在这里注入一些样式优化
      try {
        const frame = this.$refs.reportFrame
        if (frame && frame.contentDocument) {
          const style = frame.contentDocument.createElement('style')
          style.textContent = `
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
            }
            * { box-sizing: border-box; }
          `
          frame.contentDocument.head.appendChild(style)
        }
      } catch (error) {
        console.warn('无法注入iframe样式:', error)
      }
    },

    toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen
      
      if (this.isFullscreen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    },

    downloadReport() {
      try {
        const blob = new Blob([this.htmlContent], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        
        const filename = `${this.result.title || 'AI分析报告'}_${new Date().toISOString().split('T')[0]}.html`
        
        link.href = url
        link.download = filename
        link.click()
        
        URL.revokeObjectURL(url)
        
        this.$message.success('报告下载成功')
      } catch (error) {
        console.error('下载报告失败:', error)
        this.$message.error('下载失败，请重试')
      }
    },

    retryAnalysis() {
      this.$emit('retry')
    },

    saveAnalysis() {
      this.$emit('save', this.result)
    }
  },
  beforeUnmount() {
    // 清理全屏状态
    if (this.isFullscreen) {
      document.body.style.overflow = ''
    }
  }
}
</script>

<style scoped>
.analysis-result {
  margin-bottom: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-info h3 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 18px;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 13px;
  color: #909399;
}

.meta-info .el-tag {
  margin-right: 0;
}

.actions {
  display: flex;
  gap: 10px;
}

.result-content {
  min-height: 400px;
}

.analysis-overview {
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.analysis-overview h4 {
  margin: 0 0 10px 0;
  color: #409eff;
}

.preview-text {
  margin: 0;
  line-height: 1.6;
  color: #606266;
}

.report-container {
  margin-bottom: 25px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.report-header h4 {
  margin: 0;
  color: #409eff;
}

.html-preview {
  position: relative;
  height: 600px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
}

.html-preview iframe {
  width: 100%;
  height: 100%;
}

.html-source {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
}

.html-code {
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
}

.analysis-stats {
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.analysis-stats h4 {
  margin: 0 0 15px 0;
  color: #409eff;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 全屏样式 */
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-content {
  width: 95%;
  height: 95%;
  background: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fullscreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.fullscreen-header h3 {
  margin: 0;
  color: #303133;
}

.fullscreen-frame {
  flex: 1;
  width: 100%;
  border: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .result-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .meta-info {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .html-preview {
    height: 400px;
  }
}
</style>