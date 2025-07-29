<template>
  <div class="scheduler-management">
    <!-- 调度配置卡片 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>⏰ 调度器配置</span>
          <el-button type="primary" @click="saveScheduleConfig" :loading="saving">
            保存配置
          </el-button>
        </div>
      </template>

      <el-form :model="scheduleConfig" label-width="150px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="启用调度器">
              <el-switch v-model="scheduleConfig.enabled" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="并发任务数">
              <el-input-number
                v-model="scheduleConfig.maxConcurrentTasks"
                :min="1"
                :max="10"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="任务超时时间(分钟)">
              <el-input-number
                v-model="scheduleConfig.taskTimeout"
                :min="1"
                :max="120"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="重试次数">
              <el-input-number
                v-model="scheduleConfig.maxRetries"
                :min="0"
                :max="5"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="通知设置">
          <el-checkbox-group v-model="scheduleConfig.notifications">
            <el-checkbox value="taskStart">任务开始</el-checkbox>
            <el-checkbox value="taskComplete">任务完成</el-checkbox>
            <el-checkbox value="taskFailed">任务失败</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 调度任务列表 -->
    <el-card class="tasks-card">
      <template #header>
        <div class="card-header">
          <span>📋 调度任务</span>
          <el-button type="primary" @click="showAddTaskDialog = true">
            添加任务
          </el-button>
        </div>
      </template>

      <el-table :data="tasks" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="任务名称" width="200">
          <template #default="{ row }">
            <div class="task-name">
              <el-icon :color="getTaskStatusColor(row.status)">
                <Component :is="getTaskStatusIcon(row.status)" />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="type" label="任务类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTaskTypeTag(row.type)">{{ getTaskTypeName(row.type) }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="schedule" label="执行计划" width="150">
          <template #default="{ row }">
            <span>{{ formatSchedule(row.schedule) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="lastRun" label="最后执行" width="150">
          <template #default="{ row }">
            <span>{{ formatTime(row.lastRun) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="nextRun" label="下次执行" width="150">
          <template #default="{ row }">
            <span>{{ formatTime(row.nextRun) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" fixed="right" width="220">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                @click="triggerTask(row)"
                :loading="row.triggering"
                :disabled="row.status === 'running'"
              >
                <el-icon><VideoPlay /></el-icon>
                立即执行
              </el-button>
              <el-button size="small" @click="editTask(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="deleteTask(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑任务对话框 -->
    <el-dialog
      v-model="showAddTaskDialog"
      :title="editingTask ? '编辑任务' : '添加任务'"
      width="600px"
      @close="resetTaskForm"
    >
      <el-form :model="taskForm" :rules="taskFormRules" ref="taskFormRef" label-width="120px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="taskForm.name" placeholder="输入任务名称" />
        </el-form-item>
        
        <el-form-item label="任务类型" prop="type">
          <el-select v-model="taskForm.type" placeholder="选择任务类型" style="width: 100%">
            <el-option value="analysis" label="数据分析">
              <span>📊 数据分析</span>
            </el-option>
            <el-option value="cleanup" label="数据清理">
              <span>🧹 数据清理</span>
            </el-option>
            <el-option value="backup" label="数据备份">
              <span>💾 数据备份</span>
            </el-option>
            <el-option value="report" label="报告生成">
              <span>📈 报告生成</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="执行计划" prop="schedule">
                        <el-radio-group v-model="taskForm.scheduleType" @change="onScheduleTypeChange">
                <el-radio value="cron">Cron表达式</el-radio>
                <el-radio value="interval">定时间隔</el-radio>
                <el-radio value="once">执行一次</el-radio>
              </el-radio-group>
          
          <div style="margin-top: 10px;">
            <el-input
              v-if="taskForm.scheduleType === 'cron'"
              v-model="taskForm.schedule"
              placeholder="0 0 * * * (每天凌晨执行)"
            />
            <el-select
              v-else-if="taskForm.scheduleType === 'interval'"
              v-model="taskForm.schedule"
              placeholder="选择间隔"
              style="width: 100%"
            >
              <el-option value="*/5 * * * *" label="每5分钟" />
              <el-option value="0 * * * *" label="每小时" />
              <el-option value="0 0 * * *" label="每天" />
              <el-option value="0 0 * * 0" label="每周" />
              <el-option value="0 0 1 * *" label="每月" />
            </el-select>
            <el-date-picker
              v-else
              v-model="taskForm.scheduleTime"
              type="datetime"
              placeholder="选择执行时间"
              style="width: 100%"
            />
          </div>
        </el-form-item>

        <el-form-item label="目标群聊" prop="targetGroup">
          <el-select
            v-model="taskForm.targetGroup"
            placeholder="选择要分析的群聊"
            style="width: 100%"
            multiple
            collapse-tags
          >
            <el-option
              v-for="group in chatrooms"
              :key="group.id"
              :label="group.displayName"
              :value="group.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="任务描述">
          <el-input
            v-model="taskForm.description"
            type="textarea"
            :rows="3"
            placeholder="任务描述（可选）"
          />
        </el-form-item>

        <el-form-item label="高级设置">
          <el-collapse>
            <el-collapse-item title="通知设置" name="notifications">
              <el-checkbox-group v-model="taskForm.notifications">
                <el-checkbox value="start">任务开始时通知</el-checkbox>
                <el-checkbox value="complete">任务完成时通知</el-checkbox>
                <el-checkbox value="failed">任务失败时通知</el-checkbox>
              </el-checkbox-group>
            </el-collapse-item>
            
            <el-collapse-item title="重试设置" name="retry">
              <el-form-item label="最大重试次数">
                <el-input-number
                  v-model="taskForm.maxRetries"
                  :min="0"
                  :max="5"
                  style="width: 200px"
                />
              </el-form-item>
              <el-form-item label="重试间隔(分钟)">
                <el-input-number
                  v-model="taskForm.retryInterval"
                  :min="1"
                  :max="60"
                  style="width: 200px"
                />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddTaskDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTask" :loading="taskSaving">
          {{ editingTask ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { aiApi, chatlogApi } from '@/api/ApiClient.js'
import dayjs from 'dayjs'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const taskSaving = ref(false)
const showAddTaskDialog = ref(false)
const editingTask = ref(null)

const scheduleConfig = reactive({
  enabled: true,
  maxConcurrentTasks: 3,
  taskTimeout: 30,
  maxRetries: 2,
  notifications: ['taskComplete', 'taskFailed']
})

const tasks = ref([])
const chatrooms = ref([])

const taskForm = reactive({
  name: '',
  type: '',
  scheduleType: 'interval',
  schedule: '',
  scheduleTime: null,
  targetGroup: [],
  description: '',
  notifications: ['complete'],
  maxRetries: 2,
  retryInterval: 5
})

const taskFormRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
  schedule: [{ required: true, message: '请设置执行计划', trigger: 'blur' }]
}

const taskFormRef = ref()

// 计算属性
const activeTasks = computed(() => tasks.value.filter(task => task.status === 'active'))
const runningTasks = computed(() => tasks.value.filter(task => task.status === 'running'))

// 生命周期
onMounted(async () => {
  await Promise.all([
    loadScheduleConfig(),
    loadTasks(),
    loadChatrooms()
  ])
})

// 方法
const loadScheduleConfig = async () => {
  try {
    const response = await aiApi.getScheduleConfig()
    Object.assign(scheduleConfig, response.data.data)
  } catch (error) {
    console.error('加载调度配置失败:', error)
    ElMessage.error('加载调度配置失败')
  }
}

const saveScheduleConfig = async () => {
  saving.value = true
  try {
    await aiApi.updateScheduleConfig(scheduleConfig)
    ElMessage.success('配置保存成功')
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

const loadTasks = async () => {
  loading.value = true
  try {
    const response = await aiApi.getScheduledTasks()
    tasks.value = response.data.data || []
  } catch (error) {
    console.error('加载任务列表失败:', error)
    ElMessage.error('加载任务列表失败')
  } finally {
    loading.value = false
  }
}

const loadChatrooms = async () => {
  try {
    const response = await chatlogApi.getChatrooms()
    chatrooms.value = response.data || []
  } catch (error) {
    console.error('加载群聊列表失败:', error)
  }
}

const triggerTask = async (task) => {
  task.triggering = true
  try {
    await aiApi.triggerScheduledTask(task.id)
    ElMessage.success('任务已触发执行')
    await loadTasks()
  } catch (error) {
    console.error('触发任务失败:', error)
    ElMessage.error('触发任务失败')
  } finally {
    task.triggering = false
  }
}

const editTask = (task) => {
  editingTask.value = task
  Object.assign(taskForm, {
    ...task,
    scheduleType: task.schedule.includes('/') ? 'interval' : 'cron'
  })
  showAddTaskDialog.value = true
}

const deleteTask = async (task) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除任务"${task.name}"吗？`,
      '确认删除',
      { type: 'warning' }
    )
    
    await aiApi.deleteScheduledTask(task.id)
    ElMessage.success('删除成功')
    await loadTasks()
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  }
}

const saveTask = async () => {
  if (!taskFormRef.value) return
  
  try {
    const valid = await taskFormRef.value.validate()
    if (!valid) return
    
    taskSaving.value = true
    
    // 处理执行时间
    if (taskForm.scheduleType === 'once' && taskForm.scheduleTime) {
      taskForm.schedule = dayjs(taskForm.scheduleTime).format('YYYY-MM-DD HH:mm:ss')
    }
    
    if (editingTask.value) {
      await aiApi.updateScheduledTask(editingTask.value.id, taskForm)
      ElMessage.success('更新成功')
    } else {
      await aiApi.createScheduledTask(taskForm)
      ElMessage.success('添加成功')
    }
    
    showAddTaskDialog.value = false
    await loadTasks()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    taskSaving.value = false
  }
}

const resetTaskForm = () => {
  editingTask.value = null
  Object.assign(taskForm, {
    name: '',
    type: '',
    scheduleType: 'interval',
    schedule: '',
    scheduleTime: null,
    targetGroup: [],
    description: '',
    notifications: ['complete'],
    maxRetries: 2,
    retryInterval: 5
  })
  taskFormRef.value?.clearValidate()
}

const onScheduleTypeChange = () => {
  taskForm.schedule = ''
  taskForm.scheduleTime = null
}

// 工具函数
const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '从未执行'
}

const formatSchedule = (schedule) => {
  const scheduleMap = {
    '*/5 * * * *': '每5分钟',
    '0 * * * *': '每小时',
    '0 0 * * *': '每天',
    '0 0 * * 0': '每周',
    '0 0 1 * *': '每月'
  }
  return scheduleMap[schedule] || schedule
}

const getTaskStatusColor = (status) => {
  const colors = {
    active: '#67c23a',
    inactive: '#909399',
    running: '#409eff',
    failed: '#f56c6c'
  }
  return colors[status] || '#909399'
}

const getTaskStatusIcon = (status) => {
  const icons = {
    active: 'CircleCheckFilled',
    inactive: 'CirclePausFilled',
    running: 'Loading',
    failed: 'CircleCloseFilled'
  }
  return icons[status] || 'QuestionFilled'
}

const getTaskTypeTag = (type) => {
  const tags = {
    analysis: 'primary',
    cleanup: 'success',
    backup: 'warning',
    report: 'info'
  }
  return tags[type] || 'info'
}

const getTaskTypeName = (type) => {
  const names = {
    analysis: '数据分析',
    cleanup: '数据清理',
    backup: '数据备份',
    report: '报告生成'
  }
  return names[type] || type
}

const getStatusTagType = (status) => {
  const types = {
    active: 'success',
    inactive: 'info',
    running: 'primary',
    failed: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    active: '活跃',
    inactive: '暂停',
    running: '运行中',
    failed: '失败'
  }
  return texts[status] || '未知'
}
</script>

<style scoped>
.scheduler-management {
  padding: 20px;
}

.config-card, .tasks-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.el-collapse {
  border: none;
}

.el-collapse-item :deep(.el-collapse-item__header) {
  background-color: #f5f7fa;
  border: none;
  padding-left: 15px;
}

.el-collapse-item :deep(.el-collapse-item__content) {
  padding: 15px;
  background-color: #fafafa;
}
</style>