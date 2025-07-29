<template>
  <div class="ai-service-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h1>🤖 AI服务管理中心</h1>
        <p class="description">统一管理和监控所有AI服务，包括模型配置、任务调度和性能监控</p>
      </div>
      <div class="header-actions">
        <el-button-group>
          <el-button @click="refreshServices" :loading="refreshing">
            <el-icon><Refresh /></el-icon>
            刷新状态
          </el-button>
          <el-button type="primary" @click="$router.push('/ai/analysis')">
            <el-icon><TrendCharts /></el-icon>
            开始分析
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 服务状态概览 -->
    <el-row :gutter="20" class="service-overview">
      <el-col :span="6">
        <el-card class="status-card" :class="{ 'status-healthy': serviceStatus.overall === 'healthy' }">
          <div class="status-content">
            <div class="status-icon">
              <el-icon :color="getStatusColor(serviceStatus.overall)">
                <Component :is="getStatusIcon(serviceStatus.overall)" />
              </el-icon>
            </div>
            <div class="status-info">
              <h3>{{ getStatusText(serviceStatus.overall) }}</h3>
              <p>整体服务状态</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="status-card">
          <div class="status-content">
            <div class="status-icon models">
              <el-icon><Setting /></el-icon>
            </div>
            <div class="status-info">
              <h3>{{ serviceStats.activeModels }}</h3>
              <p>活跃模型数</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="status-card">
          <div class="status-content">
            <div class="status-icon tasks">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="status-info">
              <h3>{{ serviceStats.runningTasks }}</h3>
              <p>运行中任务</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="status-card">
          <div class="status-content">
            <div class="status-icon analyses">
              <el-icon><DataAnalysis /></el-icon>
            </div>
            <div class="status-info">
              <h3>{{ serviceStats.todayAnalyses }}</h3>
              <p>今日分析次数</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 服务管理选项卡 -->
    <el-card class="management-tabs">
      <el-tabs v-model="activeTab" type="card" @tab-click="onTabChange">
        <el-tab-pane label="模型管理" name="models">
          <ModelManagement />
        </el-tab-pane>
        
        <el-tab-pane label="任务调度" name="scheduler">
          <SchedulerManagement />
        </el-tab-pane>
        
        <el-tab-pane label="性能监控" name="performance">
          <PerformanceMonitor />
        </el-tab-pane>
        
        <el-tab-pane label="服务配置" name="config">
          <ServiceConfig />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 快速操作面板 -->
    <el-card class="quick-actions" v-if="activeTab === 'models'">
      <template #header>
        <span>⚡ 快速操作</span>
      </template>
      
      <el-row :gutter="15">
        <el-col :span="6">
          <el-button
            type="primary"
            size="large"
            @click="quickTestAllModels"
            :loading="testing"
            style="width: 100%"
          >
            <el-icon><Connection /></el-icon>
            测试所有模型
          </el-button>
        </el-col>
        
        <el-col :span="6">
          <el-button
            type="success"
            size="large"
            @click="syncModelConfig"
            :loading="syncing"
            style="width: 100%"
          >
            <el-icon><Refresh /></el-icon>
            同步模型配置
          </el-button>
        </el-col>
        
        <el-col :span="6">
          <el-button
            type="warning"
            size="large"
            @click="clearModelCache"
            style="width: 100%"
          >
            <el-icon><Delete /></el-icon>
            清理模型缓存
          </el-button>
        </el-col>
        
        <el-col :span="6">
          <el-button
            type="info"
            size="large"
            @click="viewModelLogs"
            style="width: 100%"
          >
            <el-icon><Document /></el-icon>
            查看模型日志
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 系统通知 -->
    <el-card class="system-notifications" v-if="notifications.length > 0">
      <template #header>
        <div class="notifications-header">
          <span>🔔 系统通知</span>
          <el-button text @click="clearAllNotifications">清空通知</el-button>
        </div>
      </template>
      
      <div class="notifications-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="`notification-${notification.type}`"
        >
          <div class="notification-content">
            <div class="notification-icon">
              <el-icon>
                <Component :is="getNotificationIcon(notification.type)" />
              </el-icon>
            </div>
            <div class="notification-info">
              <h4>{{ notification.title }}</h4>
              <p>{{ notification.message }}</p>
              <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
            </div>
          </div>
          <el-button
            text
            @click="dismissNotification(notification.id)"
            class="notification-dismiss"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import { aiApi } from '@/api/ApiClient.js'
import dayjs from 'dayjs'
import ModelManagement from '@/components/ai/ModelManagement.vue'
import SchedulerManagement from '@/components/ai/SchedulerManagement.vue'
import PerformanceMonitor from '@/components/ai/PerformanceMonitor.vue'
import ServiceConfig from '@/components/ai/ServiceConfig.vue'

// 使用store
const store = useStore()

// 响应式数据
const activeTab = ref('models')
const refreshing = ref(false)
const testing = ref(false)
const syncing = ref(false)

// 从store获取状态
const serviceStatus = computed(() => store.getters.getServiceStatus)
const serviceStats = computed(() => store.getters.getServiceStats)
const isServiceHealthy = computed(() => store.getters.isAIServiceHealthy)

const notifications = ref([])

let statusCheckTimer = null

// 生命周期
onMounted(() => {
  // 初始化AI服务数据
  store.dispatch('refreshAIServiceData')
  loadNotifications()
  startStatusCheck()
})

onUnmounted(() => {
  stopStatusCheck()
})

// 方法
const refreshServices = async () => {
  refreshing.value = true
  try {
    await store.dispatch('refreshAIServiceData')
    await loadNotifications()
    ElMessage.success('服务状态已刷新')
  } catch (error) {
    console.error('刷新服务失败:', error)
    ElMessage.error('刷新服务失败')
  } finally {
    refreshing.value = false
  }
}

const loadNotifications = async () => {
  try {
    const response = await aiApi.getServiceLogs({
      level: 'info',
      type: 'notification',
      limit: 10
    })
    
    notifications.value = (response.data.data || []).map(log => ({
      id: log.id,
      type: log.level,
      title: log.title || '系统通知',
      message: log.message,
      timestamp: log.timestamp
    }))
  } catch (error) {
    console.error('加载通知失败:', error)
  }
}

const quickTestAllModels = async () => {
  testing.value = true
  try {
    const response = await aiApi.testAllModels()
    const results = response.data.data
    
    const successCount = results.filter(r => r.status === 'success').length
    const totalCount = results.length
    
    if (successCount === totalCount) {
      ElMessage.success(`所有 ${totalCount} 个模型测试通过`)
    } else {
      ElMessage.warning(`${successCount}/${totalCount} 个模型测试通过`)
    }
    
    // 刷新统计数据
    await store.dispatch('fetchServiceStats')
  } catch (error) {
    console.error('测试模型失败:', error)
    ElMessage.error('测试模型失败')
  } finally {
    testing.value = false
  }
}

const syncModelConfig = async () => {
  syncing.value = true
  try {
    await aiApi.syncModelConfig()
    ElMessage.success('模型配置已同步')
    await store.dispatch('fetchServiceStats')
  } catch (error) {
    console.error('同步配置失败:', error)
    ElMessage.error('同步配置失败')
  } finally {
    syncing.value = false
  }
}

const clearModelCache = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清理模型缓存吗？这可能会影响模型响应速度。',
      '确认清理',
      { type: 'warning' }
    )
    
    await aiApi.clearModelCache()
    ElMessage.success('模型缓存已清理')
  } catch (error) {
    if (error === 'cancel') return
    console.error('清理缓存失败:', error)
    ElMessage.error('清理缓存失败')
  }
}

const viewModelLogs = () => {
  // 这里可以打开日志查看器或跳转到日志页面
  ElMessage.info('日志查看功能开发中...')
}

const onTabChange = (tab) => {
  console.log('切换到标签页:', tab.name)
}

const dismissNotification = (id) => {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

const clearAllNotifications = () => {
  notifications.value = []
  ElMessage.success('已清空所有通知')
}

const startStatusCheck = () => {
  statusCheckTimer = setInterval(() => {
    store.dispatch('fetchServiceStatus')
    store.dispatch('fetchServiceStats')
  }, 60000) // 每分钟检查一次
}

const stopStatusCheck = () => {
  if (statusCheckTimer) {
    clearInterval(statusCheckTimer)
    statusCheckTimer = null
  }
}

// 工具函数
const formatTime = (time) => {
  return dayjs(time).fromNow()
}

const getStatusColor = (status) => {
  const colors = {
    healthy: '#67c23a',
    warning: '#e6a23c',
    error: '#f56c6c'
  }
  return colors[status] || '#909399'
}

const getStatusIcon = (status) => {
  const icons = {
    healthy: 'CircleCheckFilled',
    warning: 'WarningFilled',
    error: 'CircleCloseFilled'
  }
  return icons[status] || 'QuestionFilled'
}

const getStatusText = (status) => {
  const texts = {
    healthy: '运行正常',
    warning: '存在警告',
    error: '服务异常'
  }
  return texts[status] || '状态未知'
}

const getNotificationIcon = (type) => {
  const icons = {
    info: 'InfoFilled',
    success: 'CircleCheckFilled',
    warning: 'WarningFilled',
    error: 'CircleCloseFilled'
  }
  return icons[type] || 'InfoFilled'
}
</script>

<style scoped>
.ai-service-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
}

.header-info h1 {
  margin: 0 0 10px 0;
  color: #409eff;
  font-size: 28px;
}

.description {
  color: #606266;
  margin: 0;
  font-size: 14px;
}

.service-overview {
  margin-bottom: 30px;
}

.status-card {
  height: 100px;
  transition: all 0.3s ease;
}

.status-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}

.status-card.status-healthy {
  border-left: 4px solid #67c23a;
}

.status-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.status-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
}

.status-icon.models {
  background: linear-gradient(135deg, #409eff, #66b3ff);
  color: white;
}

.status-icon.tasks {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
  color: white;
}

.status-icon.analyses {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: white;
}

.status-info h3 {
  margin: 0 0 5px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.status-info p {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.management-tabs {
  margin-bottom: 20px;
}

.quick-actions {
  margin-bottom: 20px;
}

.system-notifications {
  margin-bottom: 20px;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  transition: background-color 0.3s;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-content {
  display: flex;
  align-items: flex-start;
  flex: 1;
}

.notification-icon {
  width: 24px;
  height: 24px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-info h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.notification-info p {
  margin: 0 0 5px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.notification-time {
  font-size: 12px;
  color: #909399;
}

.notification-dismiss {
  opacity: 0.6;
  transition: opacity 0.3s;
}

.notification-dismiss:hover {
  opacity: 1;
}

.notification-info {
  color: #409eff;
}

.notification-success {
  border-left: 3px solid #67c23a;
}

.notification-warning {
  border-left: 3px solid #e6a23c;
}

.notification-error {
  border-left: 3px solid #f56c6c;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }
  
  .service-overview .el-col {
    margin-bottom: 10px;
  }
  
  .quick-actions .el-col {
    margin-bottom: 10px;
  }
}
</style>