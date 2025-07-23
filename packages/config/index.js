/**
 * 配置管理工具集
 * 提供配置管理相关的所有工具和接口
 */

const UnifiedConfigManager = require('./UnifiedConfigManager')
const ConfigMigrator = require('./ConfigMigrator')
const { ConfigValidator } = require('./schema')

// 导出现有的services配置以保持向后兼容
const { services, proxyConfig, getServiceUrl, getApiUrl } = require('./services')

/**
 * 创建配置管理器实例
 */
function createConfigManager(options = {}) {
  return new UnifiedConfigManager({
    configDir: options.configDir || require('path').join(__dirname),
    validateOnLoad: options.validateOnLoad !== false,
    watchFiles: options.watchFiles === true,
    ...options
  })
}

/**
 * 执行配置迁移
 */
async function migrateConfigs(options = {}) {
  const migrator = new ConfigMigrator(options)
  return await migrator.migrate()
}

/**
 * 验证配置
 */
function validateConfig(config, section = null) {
  if (section) {
    return ConfigValidator.validateSection(section, config)
  }
  return ConfigValidator.validateFullConfig(config)
}

/**
 * 获取默认配置
 */
function getDefaultConfig(section = null) {
  if (section) {
    return ConfigValidator.getDefaultSection(section)
  }
  return ConfigValidator.getDefaultConfig()
}

// 全局配置管理器实例（单例）
let globalConfigManager = null

/**
 * 获取全局配置管理器
 */
function getGlobalConfig() {
  if (!globalConfigManager) {
    globalConfigManager = createConfigManager({
      validateOnLoad: false, // 暂时禁用验证，避免启动阻塞
      watchFiles: process.env.NODE_ENV === 'development'
    })
  }
  return globalConfigManager
}

/**
 * 初始化全局配置
 */
async function initGlobalConfig(options = {}) {
  if (globalConfigManager) {
    globalConfigManager.destroy()
  }
  
  globalConfigManager = createConfigManager(options)
  await globalConfigManager.init()
  
  return globalConfigManager
}

module.exports = {
  // 核心类
  UnifiedConfigManager,
  ConfigMigrator,
  ConfigValidator,

  // 工厂函数
  createConfigManager,
  migrateConfigs,
  validateConfig,
  getDefaultConfig,

  // 全局配置管理
  getGlobalConfig,
  initGlobalConfig,

  // 向后兼容
  services,
  proxyConfig,
  getServiceUrl,
  getApiUrl
}