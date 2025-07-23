/**
 * 统一配置Schema和验证器
 * 提供类型定义、默认值和验证规则
 */

const Joi = require('joi')

/**
 * 配置Schema定义
 */
const ConfigSchemas = {
  // 服务配置Schema
  services: Joi.object({
    chatlog: Joi.object({
      host: Joi.string().hostname().default('127.0.0.1'),
      port: Joi.number().port().default(5030),
      protocol: Joi.string().valid('http', 'https').default('http'),
      timeout: Joi.number().positive().default(10000),
      retries: Joi.number().integer().min(0).max(5).default(3),
      retryDelay: Joi.number().positive().default(1000)
    }).required(),

    ai: Joi.object({
      host: Joi.string().hostname().default('localhost'),
      port: Joi.number().port().default(3001),
      protocol: Joi.string().valid('http', 'https').default('http'),
      timeout: Joi.number().positive().default(300000),
      maxConcurrency: Joi.number().integer().min(1).max(10).default(3)
    }).required(),

    frontend: Joi.object({
      host: Joi.string().hostname().default('localhost'),
      port: Joi.number().port().default(8080),
      protocol: Joi.string().valid('http', 'https').default('http'),
      proxy: Joi.object().pattern(Joi.string(), Joi.object({
        target: Joi.string().uri().required(),
        changeOrigin: Joi.boolean().default(true),
        pathRewrite: Joi.object().pattern(Joi.string(), Joi.string())
      })).default({})
    }).required()
  }).required(),

  // AI模型配置Schema
  aiModels: Joi.object({
    provider: Joi.string().valid('openai', 'gemini', 'deepseek').required(),
    models: Joi.object({
      openai: Joi.object({
        apiKey: Joi.string().required(),
        model: Joi.string().default('gpt-4'),
        baseURL: Joi.string().uri().default('https://api.openai.com/v1'),
        maxTokens: Joi.number().integer().positive().default(4096),
        temperature: Joi.number().min(0).max(2).default(0.7),
        timeout: Joi.number().positive().default(60000)
      }),
      
      gemini: Joi.object({
        apiKey: Joi.string().required(),
        model: Joi.string().default('gemini-1.5-pro'),
        baseURL: Joi.string().uri().default('https://generativelanguage.googleapis.com/v1beta'),
        maxTokens: Joi.number().integer().positive().default(8192),
        temperature: Joi.number().min(0).max(2).default(0.9),
        timeout: Joi.number().positive().default(60000)
      }),
      
      deepseek: Joi.object({
        apiKey: Joi.string().required(),
        model: Joi.string().default('deepseek-reasoner'),
        baseURL: Joi.string().uri().default('https://api.deepseek.com/v1'),
        maxTokens: Joi.number().integer().positive().default(64000),
        temperature: Joi.number().min(0).max(2).default(1.0),
        timeout: Joi.number().positive().default(300000)
      })
    }).required(),
    
    // AI分析设置
    analysis: Joi.object({
      systemPrompt: Joi.string().required(),
      retryAttempts: Joi.number().integer().min(0).max(5).default(3),
      retryDelay: Joi.number().positive().default(5000),
      maxConcurrentAnalysis: Joi.number().integer().min(1).max(10).default(2)
    }).required()
  }).required(),

  // 应用配置Schema
  application: Joi.object({
    name: Joi.string().default('Chatlog Web'),
    version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).default('1.0.0'),
    environment: Joi.string().valid('development', 'production', 'test').default('development'),
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    cors: Joi.object({
      origin: Joi.alternatives().try(
        Joi.boolean(),
        Joi.string(),
        Joi.array().items(Joi.string())
      ).default(true),
      credentials: Joi.boolean().default(true),
      methods: Joi.array().items(Joi.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    }).default({})
  }).required(),

  // 数据库/存储配置Schema
  storage: Joi.object({
    analysisHistory: Joi.object({
      directory: Joi.string().default('./storage/analysis_history'),
      maxFiles: Joi.number().integer().positive().default(1000),
      maxFileSize: Joi.number().positive().default(10 * 1024 * 1024), // 10MB
      compression: Joi.boolean().default(true),
      cleanup: Joi.object({
        enabled: Joi.boolean().default(true),
        maxAge: Joi.number().positive().default(30 * 24 * 60 * 60 * 1000), // 30天
        schedule: Joi.string().default('0 2 * * *') // 每天凌晨2点
      }).default({})
    }).default({}),
    
    cache: Joi.object({
      provider: Joi.string().valid('memory', 'redis').default('memory'),
      memory: Joi.object({
        maxSize: Joi.number().integer().positive().default(100),
        ttl: Joi.number().positive().default(300000) // 5分钟
      }).default({}),
      redis: Joi.object({
        host: Joi.string().hostname().default('localhost'),
        port: Joi.number().port().default(6379),
        password: Joi.string().allow(''),
        db: Joi.number().integer().min(0).default(0),
        keyPrefix: Joi.string().default('chatlog:')
      })
    }).default({})
  }).required(),

  // 定时任务配置Schema
  scheduler: Joi.object({
    enabled: Joi.boolean().default(false),
    jobs: Joi.object({
      analysis: Joi.object({
        enabled: Joi.boolean().default(false),
        schedule: Joi.string().default('0 0 8 * * *'), // 每天上午8点
        maxConcurrent: Joi.number().integer().min(1).max(5).default(2),
        timeout: Joi.number().positive().default(3600000), // 1小时
        retryAttempts: Joi.number().integer().min(0).max(3).default(2),
        retryDelay: Joi.number().positive().default(60000) // 1分钟
      }).default({}),
      
      cleanup: Joi.object({
        enabled: Joi.boolean().default(true),
        schedule: Joi.string().default('0 2 * * *'), // 每天凌晨2点
        maxAge: Joi.number().positive().default(30 * 24 * 60 * 60 * 1000) // 30天
      }).default({})
    }).default({})
  }).required(),

  // 监控和可观测性配置Schema
  monitoring: Joi.object({
    healthCheck: Joi.object({
      enabled: Joi.boolean().default(true),
      interval: Joi.number().positive().default(30000), // 30秒
      timeout: Joi.number().positive().default(5000),
      endpoints: Joi.array().items(Joi.string().uri()).default([])
    }).default({}),
    
    metrics: Joi.object({
      enabled: Joi.boolean().default(false),
      provider: Joi.string().valid('prometheus', 'statsd').default('prometheus'),
      port: Joi.number().port().default(9090),
      path: Joi.string().default('/metrics')
    }).default({}),
    
    logging: Joi.object({
      enabled: Joi.boolean().default(true),
      level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
      format: Joi.string().valid('json', 'text').default('text'),
      file: Joi.object({
        enabled: Joi.boolean().default(false),
        path: Joi.string().default('./logs/app.log'),
        maxSize: Joi.number().positive().default(10 * 1024 * 1024), // 10MB
        maxFiles: Joi.number().integer().positive().default(5)
      }).default({})
    }).default({})
  }).required(),

  // 安全配置Schema
  security: Joi.object({
    rateLimit: Joi.object({
      enabled: Joi.boolean().default(true),
      windowMs: Joi.number().positive().default(15 * 60 * 1000), // 15分钟
      max: Joi.number().integer().positive().default(100),
      message: Joi.string().default('请求过于频繁，请稍后重试')
    }).default({}),
    
    apiKeys: Joi.object({
      encryption: Joi.boolean().default(true),
      algorithm: Joi.string().default('aes-256-gcm'),
      keyRotation: Joi.object({
        enabled: Joi.boolean().default(false),
        interval: Joi.number().positive().default(7 * 24 * 60 * 60 * 1000) // 7天
      }).default({})
    }).default({}),
    
    validation: Joi.object({
      strictMode: Joi.boolean().default(true),
      sanitizeInput: Joi.boolean().default(true),
      maxRequestSize: Joi.number().positive().default(10 * 1024 * 1024) // 10MB
    }).default({})
  }).required()
}

/**
 * 完整配置Schema
 */
const FullConfigSchema = Joi.object({
  services: ConfigSchemas.services,
  aiModels: ConfigSchemas.aiModels,
  application: ConfigSchemas.application,
  storage: ConfigSchemas.storage,
  scheduler: ConfigSchemas.scheduler,
  monitoring: ConfigSchemas.monitoring,
  security: ConfigSchemas.security
}).required()

/**
 * 配置验证器
 */
class ConfigValidator {
  /**
   * 验证完整配置
   */
  static validateFullConfig(config) {
    const { error, value } = FullConfigSchema.validate(config, {
      allowUnknown: false,
      abortEarly: false
    })

    if (error) {
      const errorMessages = error.details.map(detail => ({
        path: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
      
      return {
        valid: false,
        errors: errorMessages,
        config: null
      }
    }

    return {
      valid: true,
      errors: [],
      config: value
    }
  }

  /**
   * 验证特定配置部分
   */
  static validateSection(sectionName, config) {
    const schema = ConfigSchemas[sectionName]
    if (!schema) {
      return {
        valid: false,
        errors: [{ path: sectionName, message: `未知的配置部分: ${sectionName}` }],
        config: null
      }
    }

    const { error, value } = schema.validate(config, {
      allowUnknown: false,
      abortEarly: false
    })

    if (error) {
      const errorMessages = error.details.map(detail => ({
        path: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
      
      return {
        valid: false,
        errors: errorMessages,
        config: null
      }
    }

    return {
      valid: true,
      errors: [],
      config: value
    }
  }

  /**
   * 获取默认配置
   */
  static getDefaultConfig() {
    const { value } = FullConfigSchema.validate({}, { allowUnknown: false })
    return value
  }

  /**
   * 获取特定部分的默认配置
   */
  static getDefaultSection(sectionName) {
    const schema = ConfigSchemas[sectionName]
    if (!schema) {
      throw new Error(`未知的配置部分: ${sectionName}`)
    }

    const { value } = schema.validate({}, { allowUnknown: false })
    return value
  }
}

module.exports = {
  ConfigSchemas,
  FullConfigSchema,
  ConfigValidator
}