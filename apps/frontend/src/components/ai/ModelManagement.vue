<template>
  <div class="model-management">
    <!-- 模型列表 -->
    <el-card class="models-card">
      <template #header>
        <div class="card-header">
          <span>🤖 AI模型管理</span>
          <el-button type="primary" @click="showAddDialog = true">添加模型</el-button>
        </div>
      </template>

      <el-table :data="models" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="模型名称" width="180">
          <template #default="{ row }">
            <div class="model-name">
              <el-icon :color="getStatusColor(row.status)">
                <Component :is="getStatusIcon(row.status)" />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="provider" label="提供商" width="120" />
        <el-table-column prop="type" label="模型类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastUsed" label="最后使用" width="150">
          <template #default="{ row }">
            <span>{{ formatTime(row.lastUsed) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="usageCount" label="使用次数" width="100" />
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="testModel(row)" :loading="row.testing">
                <el-icon><Connection /></el-icon>
                测试
              </el-button>
              <el-button size="small" @click="editModel(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="deleteModel(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑模型对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingModel ? '编辑模型' : '添加模型'"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="modelForm" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="模型名称" prop="name">
          <el-input v-model="modelForm.name" placeholder="输入模型名称" />
        </el-form-item>
        
        <el-form-item label="提供商" prop="provider">
          <el-select v-model="modelForm.provider" placeholder="选择提供商" style="width: 100%">
            <el-option value="deepseek" label="DeepSeek">
              <span>🧠 DeepSeek</span>
            </el-option>
            <el-option value="openai" label="OpenAI">
              <span>🤖 OpenAI</span>
            </el-option>
            <el-option value="google" label="Google">
              <span>🌟 Google</span>
            </el-option>
            <el-option value="anthropic" label="Anthropic">
              <span>🔮 Anthropic</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="模型类型" prop="type">
          <el-select v-model="modelForm.type" placeholder="选择类型" style="width: 100%">
            <el-option value="chat" label="对话模型" />
            <el-option value="completion" label="文本补全" />
            <el-option value="embedding" label="向量嵌入" />
          </el-select>
        </el-form-item>

        <el-form-item label="API密钥" prop="apiKey">
          <el-input
            v-model="modelForm.apiKey"
            type="password"
            placeholder="输入API密钥"
            show-password
          />
        </el-form-item>

        <el-form-item label="API端点" prop="apiEndpoint">
          <el-input v-model="modelForm.apiEndpoint" placeholder="https://api.example.com/v1" />
        </el-form-item>

        <el-form-item label="最大Tokens" prop="maxTokens">
          <el-input-number
            v-model="modelForm.maxTokens"
            :min="1"
            :max="1000000"
            placeholder="最大令牌数"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="温度参数" prop="temperature">
          <el-slider
            v-model="modelForm.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            show-input
          />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="modelForm.description"
            type="textarea"
            :rows="3"
            placeholder="模型描述（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveModel" :loading="saving">
          {{ editingModel ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 测试结果对话框 -->
    <el-dialog v-model="showTestDialog" title="模型测试结果" width="500px">
      <div class="test-result">
        <div v-if="testResult.status === 'success'" class="success-result">
          <el-icon color="#67c23a" size="24"><SuccessFilled /></el-icon>
          <h3>连接成功</h3>
          <p>模型响应正常，延迟: {{ testResult.latency }}ms</p>
          <div class="test-response">
            <strong>测试响应:</strong>
            <p>{{ testResult.response }}</p>
          </div>
        </div>
        <div v-else class="error-result">
          <el-icon color="#f56c6c" size="24"><CircleCloseFilled /></el-icon>
          <h3>连接失败</h3>
          <p>{{ testResult.error }}</p>
          <div v-if="testResult.suggestions" class="suggestions">
            <strong>建议:</strong>
            <ul>
              <li v-for="suggestion in testResult.suggestions" :key="suggestion">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { aiApi } from '@/api/ApiClient.js'
import dayjs from 'dayjs'

// 响应式数据
const models = ref([])
const loading = ref(false)
const saving = ref(false)
const showAddDialog = ref(false)
const showTestDialog = ref(false)
const editingModel = ref(null)
const testResult = ref({})

// 表单数据
const modelForm = reactive({
  name: '',
  provider: '',
  type: '',
  apiKey: '',
  apiEndpoint: '',
  maxTokens: 4000,
  temperature: 0.7,
  description: ''
})

// 表单验证规则
const formRules = {
  name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择提供商', trigger: 'change' }],
  type: [{ required: true, message: '请选择模型类型', trigger: 'change' }],
  apiKey: [{ required: true, message: '请输入API密钥', trigger: 'blur' }],
  apiEndpoint: [{ required: true, message: '请输入API端点', trigger: 'blur' }]
}

const formRef = ref()

// 生命周期
onMounted(() => {
  loadModels()
})

// 方法
const loadModels = async () => {
  loading.value = true
  try {
    const response = await aiApi.getModelList()
    models.value = response.data.data || []
  } catch (error) {
    console.error('加载模型列表失败:', error)
    ElMessage.error('加载模型列表失败')
  } finally {
    loading.value = false
  }
}

const testModel = async (model) => {
  model.testing = true
  try {
    const response = await aiApi.testModelConnection(model.id, {
      prompt: '请简单回复"测试成功"'
    })
    
    testResult.value = response.data.data
    showTestDialog.value = true
    
    if (testResult.value.status === 'success') {
      ElMessage.success('模型测试成功')
      // 更新模型状态
      model.status = 'active'
    }
  } catch (error) {
    console.error('模型测试失败:', error)
    testResult.value = {
      status: 'error',
      error: error.message || '测试失败',
      suggestions: ['检查API密钥是否正确', '确认网络连接正常', '验证API端点地址']
    }
    showTestDialog.value = true
  } finally {
    model.testing = false
  }
}

const editModel = (model) => {
  editingModel.value = model
  Object.assign(modelForm, model)
  showAddDialog.value = true
}

const deleteModel = async (model) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模型"${model.name}"吗？`,
      '确认删除',
      { type: 'warning' }
    )
    
    // 这里调用删除API
    await aiApi.deleteModel(model.id)
    ElMessage.success('删除成功')
    await loadModels()
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  }
}

const saveModel = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    saving.value = true
    
    if (editingModel.value) {
      await aiApi.updateModel(editingModel.value.id, modelForm)
      ElMessage.success('更新成功')
    } else {
      await aiApi.createModel(modelForm)
      ElMessage.success('添加成功')
    }
    
    showAddDialog.value = false
    await loadModels()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  editingModel.value = null
  Object.assign(modelForm, {
    name: '',
    provider: '',
    type: '',
    apiKey: '',
    apiEndpoint: '',
    maxTokens: 4000,
    temperature: 0.7,
    description: ''
  })
  formRef.value?.clearValidate()
}

// 工具函数
const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '从未使用'
}

const getStatusColor = (status) => {
  const colors = {
    active: '#67c23a',
    inactive: '#909399',
    error: '#f56c6c'
  }
  return colors[status] || '#909399'
}

const getStatusIcon = (status) => {
  const icons = {
    active: 'CircleCheckFilled',
    inactive: 'WarningFilled',
    error: 'CircleCloseFilled'
  }
  return icons[status] || 'QuestionFilled'
}

const getStatusTagType = (status) => {
  const types = {
    active: 'success',
    inactive: 'info',
    error: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    active: '正常',
    inactive: '未激活',
    error: '错误'
  }
  return texts[status] || '未知'
}

const getTypeTagType = (type) => {
  const types = {
    chat: 'primary',
    completion: 'success',
    embedding: 'warning'
  }
  return types[type] || 'info'
}
</script>

<style scoped>
.model-management {
  padding: 20px;
}

.models-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-result {
  text-align: center;
  padding: 20px;
}

.success-result, .error-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.test-response, .suggestions {
  text-align: left;
  width: 100%;
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-top: 15px;
}

.suggestions ul {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.suggestions li {
  margin-bottom: 5px;
}
</style>