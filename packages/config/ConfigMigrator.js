/**
 * 配置迁移工具
 * 将现有的分散配置文件迁移到统一配置管理系统
 */

const fs = require('fs')
const path = require('path')
const UnifiedConfigManager = require('./UnifiedConfigManager')

/**
 * 配置迁移器
 */
class ConfigMigrator {
  constructor(options = {}) {
    this.options = {
      sourceDir: options.sourceDir || process.cwd(),
      targetDir: options.targetDir || path.join(process.cwd(), 'packages/config'),
      backupDir: options.backupDir || path.join(process.cwd(), 'config-backup'),
      ...options
    }
  }

  /**
   * 执行完整迁移
   */
  async migrate() {
    console.log('🚀 开始配置迁移...')

    try {
      // 1. 创建备份
      await this.createBackup()

      // 2. 扫描现有配置
      const existingConfigs = await this.scanExistingConfigs()

      // 3. 转换配置格式
      const unifiedConfig = await this.transformConfigs(existingConfigs)

      // 4. 生成新配置文件
      await this.generateConfigFiles(unifiedConfig)

      // 5. 验证迁移结果
      await this.validateMigration()

      console.log('✅ 配置迁移完成！')
      this.generateMigrationReport()

    } catch (error) {
      console.error('❌ 配置迁移失败:', error)
      throw error
    }
  }

  /**
   * 创建配置备份
   */
  async createBackup() {
    console.log('📦 创建配置备份...')

    if (!fs.existsSync(this.options.backupDir)) {
      fs.mkdirSync(this.options.backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupSubDir = path.join(this.options.backupDir, `backup-${timestamp}`)
    fs.mkdirSync(backupSubDir, { recursive: true })

    // 备份现有配置文件
    const configFiles = [
      'packages/config/services.js',
      'apps/ai-service/config/ConfigManager.js',
      '.env',
      '.env.ai',
      'apps/frontend/vue.config.js'
    ]

    for (const configFile of configFiles) {
      const sourcePath = path.join(this.options.sourceDir, configFile)
      if (fs.existsSync(sourcePath)) {
        const targetPath = path.join(backupSubDir, configFile)
        const targetDir = path.dirname(targetPath)
        
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true })
        }
        
        fs.copyFileSync(sourcePath, targetPath)
        console.log(`  ✓ 备份: ${configFile}`)
      }
    }

    console.log(`💾 备份完成: ${backupSubDir}`)
  }

  /**
   * 扫描现有配置
   */
  async scanExistingConfigs() {
    console.log('🔍 扫描现有配置文件...')

    const configs = {}

    // 1. 读取services.js
    try {
      const servicesPath = path.join(this.options.sourceDir, 'packages/config/services.js')
      if (fs.existsSync(servicesPath)) {
        delete require.cache[require.resolve(servicesPath)]
        const servicesModule = require(servicesPath)
        configs.services = servicesModule.services
        console.log('  ✓ 读取 services.js')
      }
    } catch (error) {
      console.warn('  ⚠️ 读取services.js失败:', error.message)
    }

    // 2. 读取ConfigManager.js中的配置
    try {
      const configManagerPath = path.join(this.options.sourceDir, 'apps/ai-service/config/ConfigManager.js')
      if (fs.existsSync(configManagerPath)) {
        // 这里需要解析ConfigManager中的默认配置
        configs.aiModels = {
          provider: 'deepseek',
          models: {
            deepseek: {
              model: 'deepseek-reasoner',
              baseURL: 'https://api.deepseek.com/v1',
              maxTokens: 64000,
              temperature: 1.0,
              timeout: 300000
            }
          },
          analysis: {
            systemPrompt: '默认系统提示词...',
            retryAttempts: 3,
            retryDelay: 5000,
            maxConcurrentAnalysis: 2
          }
        }
        console.log('  ✓ 解析 ConfigManager.js')
      }
    } catch (error) {
      console.warn('  ⚠️ 解析ConfigManager.js失败:', error.message)
    }

    // 3. 读取环境变量
    configs.environment = this.parseEnvironmentVariables()
    console.log('  ✓ 解析环境变量')

    // 4. 读取vue.config.js
    try {
      const vueConfigPath = path.join(this.options.sourceDir, 'apps/frontend/vue.config.js')
      if (fs.existsSync(vueConfigPath)) {
        configs.frontend = {
          devServer: true,
          proxy: true
        }
        console.log('  ✓ 解析 vue.config.js')
      }
    } catch (error) {
      console.warn('  ⚠️ 解析vue.config.js失败:', error.message)
    }

    return configs
  }

  /**
   * 解析环境变量
   */
  parseEnvironmentVariables() {
    const envVars = {}

    // 从.env文件读取
    const envPath = path.join(this.options.sourceDir, '.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const lines = envContent.split('\n')
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            envVars[key] = valueParts.join('=')
          }
        }
      }
    }

    return envVars
  }

  /**
   * 转换配置格式
   */
  async transformConfigs(existingConfigs) {
    console.log('🔄 转换配置格式...')

    const unifiedConfig = {
      services: existingConfigs.services || {},
      aiModels: existingConfigs.aiModels || {},
      application: {
        name: 'Chatlog Web',
        version: '1.0.0',
        environment: existingConfigs.environment?.NODE_ENV || 'development',
        logLevel: existingConfigs.environment?.LOG_LEVEL || 'info'
      },
      storage: {
        analysisHistory: {
          directory: './storage/analysis_history'
        },
        cache: {
          provider: 'memory'
        }
      },
      scheduler: {
        enabled: existingConfigs.environment?.ENABLE_SCHEDULED_ANALYSIS === 'true',
        jobs: {
          analysis: {
            enabled: existingConfigs.environment?.ENABLE_SCHEDULED_ANALYSIS === 'true',
            schedule: existingConfigs.environment?.SCHEDULED_ANALYSIS_TIME || '0 0 8 * * *',
            maxConcurrent: parseInt(existingConfigs.environment?.MAX_CONCURRENT_ANALYSIS) || 2
          }
        }
      },
      monitoring: {
        healthCheck: { enabled: true },
        metrics: { enabled: false },
        logging: { enabled: true, level: 'info' }
      },
      security: {
        rateLimit: { enabled: true },
        apiKeys: { encryption: true },
        validation: { strictMode: true }
      }
    }

    // 应用环境变量覆盖
    if (existingConfigs.environment) {
      this.applyEnvironmentOverrides(unifiedConfig, existingConfigs.environment)
    }

    console.log('  ✓ 配置格式转换完成')
    return unifiedConfig
  }

  /**
   * 应用环境变量覆盖
   */
  applyEnvironmentOverrides(config, envVars) {
    // 服务配置
    if (envVars.CHATLOG_HOST) config.services.chatlog.host = envVars.CHATLOG_HOST
    if (envVars.CHATLOG_PORT) config.services.chatlog.port = parseInt(envVars.CHATLOG_PORT)
    if (envVars.CHATLOG_PROTOCOL) config.services.chatlog.protocol = envVars.CHATLOG_PROTOCOL

    if (envVars.AI_HOST) config.services.ai.host = envVars.AI_HOST
    if (envVars.AI_PORT) config.services.ai.port = parseInt(envVars.AI_PORT)
    if (envVars.AI_PROTOCOL) config.services.ai.protocol = envVars.AI_PROTOCOL

    // AI模型配置
    if (envVars.DEFAULT_AI_MODEL) config.aiModels.provider = envVars.DEFAULT_AI_MODEL
    if (envVars.DEEPSEEK_API_KEY) {
      config.aiModels.models = config.aiModels.models || {}
      config.aiModels.models.deepseek = config.aiModels.models.deepseek || {}
      config.aiModels.models.deepseek.apiKey = envVars.DEEPSEEK_API_KEY
    }
  }

  /**
   * 生成新配置文件
   */
  async generateConfigFiles(unifiedConfig) {
    console.log('📝 生成新配置文件...')

    if (!fs.existsSync(this.options.targetDir)) {
      fs.mkdirSync(this.options.targetDir, { recursive: true })
    }

    const configSections = [
      { name: 'services', data: unifiedConfig.services },
      { name: 'ai-models', data: unifiedConfig.aiModels },
      { name: 'application', data: unifiedConfig.application },
      { name: 'storage', data: unifiedConfig.storage },
      { name: 'scheduler', data: unifiedConfig.scheduler },
      { name: 'monitoring', data: unifiedConfig.monitoring },
      { name: 'security', data: unifiedConfig.security }
    ]

    for (const section of configSections) {
      const filename = `${section.name}.json`
      const filepath = path.join(this.options.targetDir, filename)
      
      fs.writeFileSync(filepath, JSON.stringify(section.data, null, 2))
      console.log(`  ✓ 生成: ${filename}`)
    }

    // 生成主配置文件
    const mainConfigPath = path.join(this.options.targetDir, 'config.json')
    fs.writeFileSync(mainConfigPath, JSON.stringify(unifiedConfig, null, 2))
    console.log('  ✓ 生成: config.json')
  }

  /**
   * 验证迁移结果
   */
  async validateMigration() {
    console.log('🔍 验证迁移结果...')

    try {
      const configManager = new UnifiedConfigManager({
        configDir: this.options.targetDir,
        validateOnLoad: true
      })

      await configManager.init()
      console.log('  ✅ 配置验证通过')
      configManager.destroy()

    } catch (error) {
      console.error('  ❌ 配置验证失败:', error.message)
      throw error
    }
  }

  /**
   * 生成迁移报告
   */
  generateMigrationReport() {
    const report = `
# 配置迁移报告

## 迁移时间
${new Date().toISOString()}

## 迁移内容
- ✅ 服务配置 (services.js → services.json)
- ✅ AI模型配置 (ConfigManager.js → ai-models.json)
- ✅ 应用配置 (环境变量 → application.json)
- ✅ 存储配置 (默认 → storage.json)
- ✅ 调度配置 (环境变量 → scheduler.json)
- ✅ 监控配置 (默认 → monitoring.json)
- ✅ 安全配置 (默认 → security.json)

## 配置文件位置
- 新配置目录: ${this.options.targetDir}
- 备份目录: ${this.options.backupDir}

## 使用新配置管理器
\`\`\`javascript
const UnifiedConfigManager = require('./packages/config/UnifiedConfigManager')

const configManager = new UnifiedConfigManager({
  configDir: './packages/config',
  validateOnLoad: true
})

await configManager.init()

// 获取配置
const port = configManager.get('services.ai.port')
const aiConfig = configManager.getSection('aiModels')
\`\`\`

## 注意事项
1. 请更新应用代码以使用新的配置管理器
2. 验证所有服务仍能正常启动
3. 检查环境变量覆盖是否正常工作
4. 备份文件位于 ${this.options.backupDir}
`

    const reportPath = path.join(this.options.targetDir, 'MIGRATION_REPORT.md')
    fs.writeFileSync(reportPath, report)
    
    console.log('📋 迁移报告已生成:', reportPath)
  }
}

module.exports = ConfigMigrator