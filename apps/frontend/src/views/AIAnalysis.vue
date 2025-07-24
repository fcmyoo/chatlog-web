<template>
  <div class="ai-analysis">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>🤖 AI智能分析</h1>
      <p class="description">基于人工智能的聊天数据深度分析，提供专业洞察和可视化报告</p>
    </div>

    <!-- 分析配置区域 -->
    <el-card class="config-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>📊 配置分析</span>
          <el-button
            type="primary"
            :icon="analyzing ? 'Loading' : 'TrendCharts'"
            @click="startAnalysis"
            :loading="analyzing"
            :disabled="!canAnalyze"
          >
            {{ analyzing ? '分析中...' : '开始AI分析' }}
          </el-button>
        </div>
      </template>

      <el-row :gutter="20">
        <!-- 群聊选择 -->
        <el-col :span="12">
          <div class="config-item">
            <label>选择群聊</label>
            <el-select
              v-model="analysisForm.groupName"
              placeholder="请选择要分析的群聊"
              style="width: 100%"
              filterable
              @change="onGroupChange"
            >
              <el-option
                v-for="group in chatrooms"
                :key="group.id"
                :label="group.displayName"
                :value="group.displayName"
              />
            </el-select>
          </div>
        </el-col>

        <!-- 分析类型 -->
        <el-col :span="12">
          <div class="config-item">
            <label>分析类型</label>
            <el-select
              v-model="analysisForm.analysisType"
              placeholder="请选择分析类型"
              style="width: 100%"
            >
              <el-option
                v-for="(type, key) in analysisTypes"
                :key="key"
                :label="type.name"
                :value="key"
              >
                <template #default>
                  <span>{{ getTypeIcon(type.icon) }} {{ type.name }}</span>
                  <p style="font-size: 12px; color: #999; margin: 0;">{{ type.description }}</p>
                </template>
              </el-option>
            </el-select>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 时间范围 -->
        <el-col :span="12">
          <div class="config-item">
            <label>时间范围</label>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              @change="onDateChange"
            />
          </div>
        </el-col>

        <!-- 快速选择 -->
        <el-col :span="12">
          <div class="config-item">
            <label>快速选择</label>
            <el-button-group style="width: 100%">
              <el-button @click="setDateRange(7)">最近7天</el-button>
              <el-button @click="setDateRange(30)">最近30天</el-button>
              <el-button @click="setDateRange(90)">最近90天</el-button>
            </el-button-group>
          </div>
        </el-col>
      </el-row>

      <!-- 自定义提示词 -->
      <div class="config-item" style="margin-top: 20px;" v-if="analysisForm.analysisType === 'custom'">
        <label>自定义分析要求</label>
        <el-input
          v-model="analysisForm.customPrompt"
          type="textarea"
          :rows="4"
          placeholder="请输入您希望AI关注的具体分析角度，例如：请重点分析技术讨论的深度和广度，识别出主要的技术话题..."
        />
      </div>
    </el-card>

    <!-- 分析进度 -->
    <el-card v-if="analyzing" class="progress-card" shadow="hover">
      <div class="progress-content">
        <div class="progress-info">
          <el-icon class="rotating"><Loading /></el-icon>
          <div>
            <h3>{{ progressInfo.stage }}</h3>
            <p>{{ progressInfo.message }}</p>
          </div>
        </div>
        <el-progress
          :percentage="progressInfo.percentage"
          :status="progressInfo.status"
          style="margin-top: 15px;"
        />
      </div>
    </el-card>

    <!-- 分析结果 -->
    <AnalysisResult
      v-if="currentResult"
      :result="currentResult"
      @save="saveAnalysis"
      @retry="retryAnalysis"
    />

    <!-- 分析历史 -->
    <el-card class="history-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>📚 分析历史</span>
          <div>
            <el-select
              v-model="historyFilter.type"
              placeholder="筛选类型"
              clearable
              size="small"
              style="width: 150px; margin-right: 10px;"
            >
              <el-option
                v-for="(type, key) in analysisTypes"
                :key="key"
                :label="type.name"
                :value="key"
              />
            </el-select>
            <el-button size="small" @click="loadHistory">刷新</el-button>
          </div>
        </div>
      </template>

      <AnalysisHistory
        :histories="analysisHistory"
        :loading="historyLoading"
        @view="viewHistory"
        @delete="deleteHistory"
        @load-more="loadMoreHistory"
      />
    </el-card>
  </div>
</template>

<script>
import AnalysisResult from '@/components/analysis/AnalysisResult.vue'
import AnalysisHistory from '@/components/analysis/AnalysisHistory.vue'
import { aiApi } from '@/api/ai'

export default {
  name: 'AIAnalysis',
  components: {
    AnalysisResult,
    AnalysisHistory
  },
  data () {
    return {
      // 分析表单
      analysisForm: {
        groupName: '',
        analysisType: 'programming',
        customPrompt: ''
      },

      // 时间范围
      dateRange: [],

      // 分析状态
      analyzing: false,
      progressInfo: {
        stage: '准备分析...',
        message: '',
        percentage: 0,
        status: ''
      },

      // 数据
      chatrooms: [],
      analysisTypes: {},
      currentResult: null,
      analysisHistory: [],

      // 历史筛选
      historyFilter: {
        type: '',
        page: 1,
        pageSize: 10
      },
      historyLoading: false
    }
  },
  computed: {
    canAnalyze () {
      return this.analysisForm.groupName &&
             this.analysisForm.analysisType &&
             this.dateRange &&
             this.dateRange.length === 2 &&
             !this.analyzing
    },
    timeRange () {
      if (!this.dateRange || this.dateRange.length !== 2) {
        return ''
      }
      return `${this.dateRange[0]}~${this.dateRange[1]}`
    }
  },
  async created () {
    await this.initializeData()
  },
  methods: {
    async initializeData () {
      try {
        // 并行加载初始数据
        const [chatroomsRes, typesRes] = await Promise.all([
          this.$store.dispatch('fetchChatrooms'),
          aiApi.getAnalysisTypes()
        ])

        this.chatrooms = this.$store.getters.getChatrooms
        this.analysisTypes = typesRes.data.data

        // 设置默认时间范围为最近30天
        this.setDateRange(30)

        // 加载分析历史
        await this.loadHistory()
      } catch (error) {
        console.error('初始化数据失败:', error)
        this.$message.error('加载数据失败，请刷新页面重试')
      }
    },

    onGroupChange () {
      console.log('选择群聊:', this.analysisForm.groupName)
    },

    onDateChange () {
      console.log('时间范围变更:', this.timeRange)
    },

    setDateRange (days) {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - days)

      this.dateRange = [
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      ]
    },

    async startAnalysis () {
      if (!this.canAnalyze) {
        this.$message.warning('请完善分析配置')
        return
      }

      this.analyzing = true
      this.currentResult = null

      try {
        // 模拟进度更新
        this.updateProgress('获取聊天数据...', 20)

        await new Promise(resolve => setTimeout(resolve, 1000))
        this.updateProgress('AI模型分析中...', 60)

        await new Promise(resolve => setTimeout(resolve, 2000))
        this.updateProgress('生成分析报告...', 90)

        // 实际API调用
        const response = await aiApi.performAnalysis({
          groupName: this.analysisForm.groupName,
          analysisType: this.analysisForm.analysisType,
          customPrompt: this.analysisForm.customPrompt,
          timeRange: this.timeRange
        })

        this.updateProgress('分析完成!', 100, 'success')

        if (response.data.success) {
          this.currentResult = response.data.data
          this.$message.success('AI分析完成!')

          // 刷新历史列表
          await this.loadHistory()
        } else {
          throw new Error(response.data.error || '分析失败')
        }
      } catch (error) {
        console.error('AI分析失败:', error)
        this.updateProgress('分析失败', 0, 'exception')

        let errorMessage = '分析失败，请重试'
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.message) {
          errorMessage = error.message
        }

        this.$message.error(errorMessage)

        // 显示建议
        if (error.response?.data?.suggestions) {
          const suggestions = error.response.data.suggestions
          this.$notify({
            title: '建议',
            message: suggestions.join('\n'),
            type: 'info',
            duration: 8000
          })
        }
      } finally {
        setTimeout(() => {
          this.analyzing = false
          this.progressInfo = {
            stage: '准备分析...',
            message: '',
            percentage: 0,
            status: ''
          }
        }, 2000)
      }
    },

    updateProgress (stage, percentage, status = '') {
      this.progressInfo = {
        stage,
        message: `${stage} ${percentage}%`,
        percentage,
        status
      }
    },

    async retryAnalysis () {
      await this.startAnalysis()
    },

    saveAnalysis (result) {
      console.log('保存分析结果:', result)
      this.$message.success('分析结果已保存')
    },

    async loadHistory () {
      this.historyLoading = true

      try {
        const response = await aiApi.getAnalysisHistory({
          page: this.historyFilter.page,
          pageSize: this.historyFilter.pageSize,
          analysisType: this.historyFilter.type
        })

        if (response.data.success) {
          this.analysisHistory = response.data.data.histories
        }
      } catch (error) {
        console.error('加载分析历史失败:', error)
        this.$message.error('加载历史记录失败')
      } finally {
        this.historyLoading = false
      }
    },

    async loadMoreHistory () {
      this.historyFilter.page++
      await this.loadHistory()
    },

    async viewHistory (item) {
      try {
        const response = await aiApi.getAnalysisById(item.id)

        if (response.data.success) {
          this.currentResult = {
            ...response.data.data,
            isHistoryView: true
          }
        }
      } catch (error) {
        console.error('查看历史失败:', error)
        this.$message.error('加载分析结果失败')
      }
    },

    async deleteHistory (item) {
      try {
        await this.$confirm(`确定要删除"${item.title}"吗？`, '确认删除', {
          type: 'warning'
        })

        const response = await aiApi.deleteAnalysis(item.id)

        if (response.data.success) {
          this.$message.success('删除成功')
          await this.loadHistory()
        }
      } catch (error) {
        if (error === 'cancel') return
        console.error('删除失败:', error)
        this.$message.error('删除失败')
      }
    },

    getTypeIcon (iconType) {
      const icons = {
        code: '💻',
        experiment: '🧪',
        book: '📖',
        setting: '⚙️'
      }
      return icons[iconType] || '📊'
    }
  }
}
</script>

<style scoped>
.ai-analysis {
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0 0 10px 0;
  color: #409eff;
  font-size: 28px;
}

.description {
  color: #606266;
  font-size: 14px;
  margin: 0;
}

.config-card, .progress-card, .history-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-item {
  margin-bottom: 20px;
}

.config-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
}

.progress-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.progress-content {
  padding: 20px;
}

.progress-info {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.progress-info .el-icon {
  font-size: 24px;
  margin-right: 15px;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-info h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.progress-info p {
  margin: 0;
  opacity: 0.9;
}
</style>
