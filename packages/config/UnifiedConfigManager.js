/**
 * 统一配置管理器
 * 整合所有配置源，提供统一的配置访问接口
 */

const fs = require('fs')
const path = require('path')
const { ConfigValidator } = require('./schema')

/**
 * 配置源类型
 */
const ConfigSources = {
  ENV: 'environment',
  FILE: 'file',
  DEFAULT: 'default'
}

/**
 * 统一配置管理器
 */
class UnifiedConfigManager {
  constructor(options = {}) {
    this.options = {
      configDir: options.configDir || path.join(process.cwd(), 'config'),
      envPrefix: options.envPrefix || '',
      validateOnLoad: false, // 默认不验证，避免阻塞
      createMissingFiles: false, // 默认不创建缺失的文件，避免阻塞
      ...options
    }

    this.config = {}
    this.configSources = new Map()
    this.watchers = new Map()
    this.listeners = new Map()

    this.init()
  }

  /**
   * 初始化配置管理器
   */
  async init() {
    // 确保配置目录存在
    this.ensureConfigDir()

    // 加载配置
    await this.loadAllConfigs()

    // 设置文件监听
    this.setupFileWatchers()
  }

  /**
   * 初始化配置管理器
   */ 
  async init() {
    // 确保配置目录存在
    this.ensureConfigDir()

    // 加载配置
    this.loadAllConfigs()

    // 设置文件监听
    this.setupFileWatchers()
  }

  /**
   * 确保配置目录存在
   */
  ensureConfigDir() {
    if (!fs.existsSync(this.options.configDir)) {
      fs.mkdirSync(this.options.configDir, { recursive: true })
    }
  }

  /**
   * 加载所有配置
   */
  loadAllConfigs() {
    try {
      console.log('🔄 开始加载所有配置...')
      
      // 1. 加载默认配置
      console.log('📊 加载默认配置...')
      const defaultConfig = ConfigValidator.getDefaultConfig()
      this.mergeConfig(defaultConfig, ConfigSources.DEFAULT)
      console.log('✅ 默认配置加载完成')

      // 2. 加载文件配置
      console.log('📊 开始加载文件配置...')
      this.loadFileConfigs()
      console.log('✅ 文件配置加载完成')

      // 3. 加载环境变量配置
      console.log('📊 开始加载环境变量配置...')
      this.loadEnvironmentConfig()
      console.log('✅ 环境变量配置加载完成')

      // 4. 验证最终配置
      if (this.options.validateOnLoad) {
        console.log('📊 开始验证配置...')
        this.validateConfig()
        console.log('✅ 配置验证完成')
      }

      console.log('🎉 所有配置加载完成')

    } catch (error) {
      console.error('配置加载失败:', error)
      throw error
    }
  }

  /**
   * 加载文件配置
   */
  loadFileConfigs() {
    // 只加载关键配置文件，避免阻塞
    const essentialFiles = [
      'services.json'
    ]

    for (const filename of essentialFiles) {
      this.loadConfigFile(filename)
    }
  }

  /**
   * 加载单个配置文件
   */
  loadConfigFile(filename) {
    const filepath = path.join(this.options.configDir, filename)
    
    try {
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8')
        const fileConfig = JSON.parse(content)
        
        // 记录配置源
        this.configSources.set(filepath, {
          type: ConfigSources.FILE,
          lastModified: fs.statSync(filepath).mtime,
          content: fileConfig
        })

        this.mergeConfig(fileConfig, ConfigSources.FILE)
        console.log(`✅ 加载配置文件: ${filename}`)
      } else {
        // 创建缺失的配置文件
        if (this.options.createMissingFiles) {
          this.createDefaultConfigFile(filename)
        }
      }
    } catch (error) {
      console.warn(`⚠️ 加载配置文件失败: ${filename}`, error.message)
    }
  }

  /**
   * 创建默认配置文件
   */
  createDefaultConfigFile(filename) {
    const sectionName = path.basename(filename, '.json').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    
    try {
      const defaultSection = ConfigValidator.getDefaultSection(sectionName)
      const filepath = path.join(this.options.configDir, filename)
      
      fs.writeFileSync(filepath, JSON.stringify(defaultSection, null, 2))
      console.log(`📄 创建默认配置文件: ${filename}`)
      
      return defaultSection
    } catch (error) {
      console.warn(`创建默认配置文件失败: ${filename}`, error.message)
    }
  }

  /**
   * 加载环境变量配置
   */
  loadEnvironmentConfig() {
    const envConfig = this.parseEnvironmentVariables()
    
    if (Object.keys(envConfig).length > 0) {
      this.mergeConfig(envConfig, ConfigSources.ENV)
      console.log('✅ 加载环境变量配置')
    }
  }

  /**
   * 解析环境变量
   */
  parseEnvironmentVariables() {
    console.log('🔄 开始解析环境变量...')
    const envConfig = {}
    const prefix = this.options.envPrefix

    // 服务配置
    this.setNestedValue(envConfig, 'services.chatlog.host', process.env.CHATLOG_HOST)
    this.setNestedValue(envConfig, 'services.chatlog.port', this.parseNumber(process.env.CHATLOG_PORT))
    this.setNestedValue(envConfig, 'services.chatlog.protocol', process.env.CHATLOG_PROTOCOL)

    this.setNestedValue(envConfig, 'services.ai.host', process.env.AI_HOST)
    this.setNestedValue(envConfig, 'services.ai.port', this.parseNumber(process.env.AI_PORT))
    this.setNestedValue(envConfig, 'services.ai.protocol', process.env.AI_PROTOCOL)

    this.setNestedValue(envConfig, 'services.frontend.host', process.env.FRONTEND_HOST)
    this.setNestedValue(envConfig, 'services.frontend.port', this.parseNumber(process.env.FRONTEND_PORT))
    this.setNestedValue(envConfig, 'services.frontend.protocol', process.env.FRONTEND_PROTOCOL)

    // AI模型配置
    this.setNestedValue(envConfig, 'aiModels.provider', process.env.DEFAULT_AI_MODEL)
    this.setNestedValue(envConfig, 'aiModels.models.deepseek.apiKey', process.env.DEEPSEEK_API_KEY)
    this.setNestedValue(envConfig, 'aiModels.models.gemini.apiKey', process.env.GEMINI_API_KEY)
    this.setNestedValue(envConfig, 'aiModels.models.openai.apiKey', process.env.OPENAI_API_KEY)

    // 应用配置
    this.setNestedValue(envConfig, 'application.environment', process.env.NODE_ENV)
    this.setNestedValue(envConfig, 'application.logLevel', process.env.LOG_LEVEL)

    // 定时任务配置
    this.setNestedValue(envConfig, 'scheduler.enabled', this.parseBoolean(process.env.ENABLE_SCHEDULED_ANALYSIS))
    this.setNestedValue(envConfig, 'scheduler.jobs.analysis.schedule', process.env.SCHEDULED_ANALYSIS_TIME)
    this.setNestedValue(envConfig, 'scheduler.jobs.analysis.maxConcurrent', this.parseNumber(process.env.MAX_CONCURRENT_ANALYSIS))

    console.log('✅ 环境变量解析完成')
    return envConfig
  }

  /**
   * 合并配置
   */
  mergeConfig(newConfig, source) {
    this.config = this.deepMerge(this.config, newConfig)
    console.log(`🔄 配置合并完成 (源: ${source})`)
  }

  /**
   * 深度合并对象
   */
  deepMerge(target, source) {
    const result = { ...target }

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key])
      } else if (source[key] !== undefined) {
        result[key] = source[key]
      }
    }

    return result
  }

  /**
   * 设置嵌套值
   */
  setNestedValue(obj, path, value) {
    if (value === undefined || value === null) return

    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
  }

  /**
   * 解析数字
   */
  parseNumber(value) {
    if (value === undefined || value === null || value === '') return undefined
    const num = parseInt(value, 10)
    return isNaN(num) ? undefined : num
  }

  /**
   * 解析布尔值
   */
  parseBoolean(value) {
    if (value === undefined || value === null || value === '') return undefined
    return value === 'true' || value === '1' || value === 'yes'
  }

  /**
   * 验证配置
   */
  validateConfig() {
    const validation = ConfigValidator.validateFullConfig(this.config)
    
    if (!validation.valid) {
      console.error('❌ 配置验证失败:')
      validation.errors.forEach(error => {
        console.error(`  - ${error.path}: ${error.message}`)
      })
      throw new Error('配置验证失败')
    }

    this.config = validation.config
    console.log('✅ 配置验证通过')
  }

  /**
   * 获取配置值
   */
  get(path, defaultValue = undefined) {
    return this.getNestedValue(this.config, path, defaultValue)
  }

  /**
   * 获取嵌套值
   */
  getNestedValue(obj, path, defaultValue = undefined) {
    const keys = path.split('.')
    let current = obj

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return defaultValue
      }
    }

    return current
  }

  /**
   * 设置配置值
   */
  set(path, value) {
    this.setNestedValue(this.config, path, value)
    this.emit('configChanged', { path, value })
  }

  /**
   * 获取完整配置
   */
  getAll() {
    return { ...this.config }
  }

  /**
   * 获取配置部分
   */
  getSection(sectionName) {
    return this.config[sectionName] || {}
  }

  /**
   * 保存配置到文件
   */
  async saveConfig(sectionName, config) {
    const filename = sectionName.replace(/([A-Z])/g, '-$1').toLowerCase() + '.json'
    const filepath = path.join(this.options.configDir, filename)

    try {
      // 验证配置部分
      const validation = ConfigValidator.validateSection(sectionName, config)
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      // 保存到文件
      fs.writeFileSync(filepath, JSON.stringify(validation.config, null, 2))
      
      // 更新内存配置
      this.config[sectionName] = validation.config
      
      console.log(`💾 配置保存成功: ${filename}`)
      this.emit('configSaved', { sectionName, config: validation.config })
      
    } catch (error) {
      console.error(`配置保存失败: ${filename}`, error.message)
      throw error
    }
  }

  /**
   * 设置文件监听
   */
  setupFileWatchers() {
    if (!this.options.watchFiles) return

    const configFiles = fs.readdirSync(this.options.configDir)
      .filter(file => file.endsWith('.json'))

    for (const filename of configFiles) {
      const filepath = path.join(this.options.configDir, filename)
      
      const watcher = fs.watchFile(filepath, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log(`📝 配置文件变更: ${filename}`)
          this.loadConfigFile(filename)
        }
      })

      this.watchers.set(filepath, watcher)
    }
  }

  /**
   * 事件监听
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(listener)
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    const listeners = this.listeners.get(event) || []
    listeners.forEach(listener => listener(data))
  }

  /**
   * 辅助方法：解析数字
   */
  parseNumber(value) {
    if (value === undefined || value === null || value === '') return undefined
    const num = parseInt(value, 10)
    return isNaN(num) ? undefined : num
  }

  /**
   * 辅助方法：解析布尔值
   */
  parseBoolean(value) {
    if (value === undefined || value === null || value === '') return undefined
    return value === 'true' || value === '1' || value === 'yes'
  }

  /**
   * 销毁配置管理器
   */
  destroy() {
    // 清理文件监听器
    for (const watcher of this.watchers.values()) {
      fs.unwatchFile(watcher)
    }
    this.watchers.clear()
    this.listeners.clear()
  }
}

module.exports = UnifiedConfigManager