<template>
  <div class="service-config">
    <el-row :gutter="20">
      <!-- 基础配置 -->
      <el-col :span="12">
        <el-card class="config-card">
          <template #header>
            <span>⚙️ 基础配置</span>
          </template>
          
          <el-form :model="basicConfig" label-width="120px">
            <el-form-item label="服务端口">
              <el-input-number
                v-model="basicConfig.port"
                :min="3000"
                :max="9999"
                style="width: 100%"
              />
            </el-form-item>
            
            <el-form-item label="日志级别">
              <el-select v-model="basicConfig.logLevel" style="width: 100%">
                <el-option value="debug" label="Debug" />
                <el-option value="info" label="Info" />
                <el-option value="warn" label="Warning" />
                <el-option value="error" label="Error" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="最大并发数">
              <el-input-number
                v-model="basicConfig.maxConcurrency"
                :min="1"
                :max="20"
                style="width: 100%"
              />
            </el-form-item>
            
            <el-form-item label="请求超时(秒)">
              <el-input-number
                v-model="basicConfig.requestTimeout"
                :min="10"
                :max="300"
                style="width: 100%"
              />
            </el-form-item>
            
            <el-form-item label="启用缓存">
              <el-switch v-model="basicConfig.enableCache" />
            </el-form-item>
            
            <el-form-item label="缓存过期时间(分钟)">
              <el-input-number
                v-model="basicConfig.cacheExpire"
                :min="1"
                :max="1440"
                :disabled="!basicConfig.enableCache"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 安全配置 -->
      <el-col :span="12">
        <el-card class="config-card">
          <template #header>
            <span>🔒 安全配置</span>
          </template>
          
          <el-form :model="securityConfig" label-width="120px">
            <el-form-item label="启用认证">
              <el-switch v-model="securityConfig.enableAuth" />
            </el-form-item>
            
            <el-form-item label="API密钥" v-if="securityConfig.enableAuth">
              <el-input
                v-model="securityConfig.apiKey"
                type="password"
                placeholder="输入API密钥"
                show-password
              />
            </el-form-item>
            
            <el-form-item label="允许的域名">
              <el-select
                v-model="securityConfig.allowedOrigins"
                multiple
                filterable
                allow-create
                placeholder="输入允许的域名"
                style="width: 100%"
              >
                <el-option value="http://localhost:8080" label="本地开发" />
                <el-option value="https://yourdomain.com" label="生产域名" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="速率限制(请求/分钟)">
              <el-input-number
                v-model="securityConfig.rateLimit"
                :min="10"
                :max="1000"
                style="width: 100%"
              />
            </el-form-item>
            
            <el-form-item label="IP白名单">
              <el-input
                v-model="securityConfig.ipWhitelist"
                type="textarea"
                :rows="3"
                placeholder="每行一个IP地址或CIDR块"
              />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 数据库配置 -->
      <el-col :span="12">
        <el-card class="config-card">
          <template #header>
            <span>🗄️ 数据库配置</span>
          </template>
          
          <el-form :model="databaseConfig" label-width="120px">
            <el-form-item label="数据库类型">
              <el-select v-model="databaseConfig.type" style="width: 100%">
                <el-option value="sqlite" label="SQLite" />
                <el-option value="mysql" label="MySQL" />
                <el-option value="postgresql" label="PostgreSQL" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="数据库文件" v-if="databaseConfig.type === 'sqlite'">
              <el-input v-model="databaseConfig.filename" placeholder="数据库文件路径" />
            </el-form-item>
            
            <template v-else>
              <el-form-item label="主机地址">
                <el-input v-model="databaseConfig.host" placeholder="localhost" />
              </el-form-item>
              
              <el-form-item label="端口">
                <el-input-number
                  v-model="databaseConfig.port"
                  :min="1"
                  :max="65535"
                  style="width: 100%"
                />
              </el-form-item>
              
              <el-form-item label="数据库名">
                <el-input v-model="databaseConfig.database" placeholder="数据库名称" />
              </el-form-item>
              
              <el-form-item label="用户名">
                <el-input v-model="databaseConfig.username" placeholder="数据库用户名" />
              </el-form-item>
              
              <el-form-item label="密码">
                <el-input
                  v-model="databaseConfig.password"
                  type="password"
                  placeholder="数据库密码"
                  show-password
                />
              </el-form-item>
            </template>
            
            <el-form-item label="连接池大小">
              <el-input-number
                v-model="databaseConfig.poolSize"
                :min="1"
                :max="50"
                style="width: 100%"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button @click="testDatabaseConnection" :loading="testingDb">
                <el-icon><Connection /></el-icon>
                测试连接
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 通知配置 -->
      <el-col :span="12">
        <el-card class="config-card">
          <template #header>
            <span>📢 通知配置</span>
          </template>
          
          <el-form :model="notificationConfig" label-width="120px">
            <el-form-item label="启用邮件通知">
              <el-switch v-model="notificationConfig.email.enabled" />
            </el-form-item>
            
            <template v-if="notificationConfig.email.enabled">
              <el-form-item label="SMTP服务器">
                <el-input v-model="notificationConfig.email.smtp.host" placeholder="smtp.gmail.com" />
              </el-form-item>
              
              <el-form-item label="SMTP端口">
                <el-input-number
                  v-model="notificationConfig.email.smtp.port"
                  :min="1"
                  :max="65535"
                  style="width: 100%"
                />
              </el-form-item>
              
              <el-form-item label="发件人邮箱">
                <el-input v-model="notificationConfig.email.from" placeholder="sender@example.com" />
              </el-form-item>
              
              <el-form-item label="邮箱密码">
                <el-input
                  v-model="notificationConfig.email.password"
                  type="password"
                  placeholder="邮箱密码或应用密码"
                  show-password
                />
              </el-form-item>
              
              <el-form-item label="收件人">
                <el-select
                  v-model="notificationConfig.email.recipients"
                  multiple
                  filterable
                  allow-create
                  placeholder="输入邮箱地址"
                  style="width: 100%"
                />
              </el-form-item>
            </template>
            
            <el-form-item label="启用Webhook">
              <el-switch v-model="notificationConfig.webhook.enabled" />
            </el-form-item>
            
            <el-form-item label="Webhook URL" v-if="notificationConfig.webhook.enabled">
              <el-input v-model="notificationConfig.webhook.url" placeholder="https://hooks.slack.com/..." />
            </el-form-item>
            
            <el-form-item label="通知事件">
              <el-checkbox-group v-model="notificationConfig.events">
                <el-checkbox value="taskStart">任务开始</el-checkbox>
                <el-checkbox value="taskComplete">任务完成</el-checkbox>
                <el-checkbox value="taskFailed">任务失败</el-checkbox>
                <el-checkbox value="systemError">系统错误</el-checkbox>
                <el-checkbox value="modelOffline">模型离线</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作按钮 -->
    <div class="config-actions">
      <el-button-group>
        <el-button @click="resetConfig">重置配置</el-button>
        <el-button @click="exportConfig">导出配置</el-button>
        <el-button @click="importConfig">导入配置</el-button>
        <el-button type="primary" @click="saveConfig" :loading="saving">
          保存配置
        </el-button>
      </el-button-group>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { aiApi } from '@/api/ApiClient.js'

// 响应式数据
const saving = ref(false)
const testingDb = ref(false)

const basicConfig = reactive({
  port: 3001,
  logLevel: 'info',
  maxConcurrency: 5,
  requestTimeout: 60,
  enableCache: true,
  cacheExpire: 30
})

const securityConfig = reactive({
  enableAuth: false,
  apiKey: '',
  allowedOrigins: ['http://localhost:8080'],
  rateLimit: 100,
  ipWhitelist: ''
})

const databaseConfig = reactive({
  type: 'sqlite',
  filename: './data/ai-service.db',
  host: 'localhost',
  port: 3306,
  database: 'ai_service',
  username: '',
  password: '',
  poolSize: 10
})

const notificationConfig = reactive({
  email: {
    enabled: false,
    smtp: {
      host: '',
      port: 587
    },
    from: '',
    password: '',
    recipients: []
  },
  webhook: {
    enabled: false,
    url: ''
  },
  events: ['taskComplete', 'taskFailed', 'systemError']
})

const fileInput = ref()

// 生命周期
onMounted(() => {
  loadConfig()
})

// 方法
const loadConfig = async () => {
  try {
    const response = await aiApi.getServiceConfig()
    const config = response.data.data
    
    if (config.basic) Object.assign(basicConfig, config.basic)
    if (config.security) Object.assign(securityConfig, config.security)
    if (config.database) Object.assign(databaseConfig, config.database)
    if (config.notification) Object.assign(notificationConfig, config.notification)
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败')
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    const config = {
      basic: { ...basicConfig },
      security: { ...securityConfig },
      database: { ...databaseConfig },
      notification: { ...notificationConfig }
    }
    
    await aiApi.updateServiceConfig(config)
    ElMessage.success('配置保存成功')
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

const testDatabaseConnection = async () => {
  testingDb.value = true
  try {
    const response = await aiApi.testDatabaseConnection(databaseConfig)
    
    if (response.data.success) {
      ElMessage.success('数据库连接成功')
    } else {
      ElMessage.error(`连接失败: ${response.data.error}`)
    }
  } catch (error) {
    console.error('测试数据库连接失败:', error)
    ElMessage.error('测试数据库连接失败')
  } finally {
    testingDb.value = false
  }
}

const resetConfig = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有配置为默认值吗？此操作不可撤销。',
      '确认重置',
      { type: 'warning' }
    )
    
    await loadConfig()
    ElMessage.success('配置已重置')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置配置失败:', error)
      ElMessage.error('重置配置失败')
    }
  }
}

const exportConfig = () => {
  const config = {
    basic: { ...basicConfig },
    security: { ...securityConfig },
    database: { ...databaseConfig },
    notification: { ...notificationConfig },
    exportTime: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-service-config-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('配置导出成功')
}

const importConfig = () => {
  fileInput.value.click()
}

const handleFileImport = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target.result)
      
      if (config.basic) Object.assign(basicConfig, config.basic)
      if (config.security) Object.assign(securityConfig, config.security)
      if (config.database) Object.assign(databaseConfig, config.database)
      if (config.notification) Object.assign(notificationConfig, config.notification)
      
      ElMessage.success('配置导入成功')
    } catch (error) {
      console.error('解析配置文件失败:', error)
      ElMessage.error('配置文件格式错误')
    }
  }
  reader.readAsText(file)
  
  // 清空文件输入
  event.target.value = ''
}
</script>

<style scoped>
.service-config {
  padding: 20px;
}

.config-card {
  margin-bottom: 20px;
}

.config-actions {
  text-align: center;
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.el-form-item {
  margin-bottom: 18px;
}

.el-card :deep(.el-card__header) {
  font-weight: 600;
  font-size: 16px;
}

.el-checkbox-group .el-checkbox {
  margin-right: 15px;
  margin-bottom: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .config-actions {
    text-align: left;
  }
  
  .config-actions .el-button-group {
    width: 100%;
  }
  
  .config-actions .el-button-group .el-button {
    width: 25%;
  }
}
</style>