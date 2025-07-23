# 🔧 安全修复实施指南

## 📋 快速修复指南

本文档提供了基于安全审计报告的具体修复步骤和代码实现。

### 🚨 紧急修复任务 (7天内完成)

#### 任务1: 实施JWT身份验证系统

**优先级**: 🔴 P0 - 严重  
**预计时间**: 4-6小时  
**负责人**: 后端开发  

**实施步骤**:

1. **安装依赖**
```bash
cd apps/ai-service
npm install jsonwebtoken bcryptjs express-rate-limit
```

2. **创建认证中间件**
```javascript
// apps/ai-service/middleware/auth.js
const jwt = require('jsonwebtoken');

class AuthMiddleware {
  static generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role || 'user' 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        issuer: 'chatlog-web'
      }
    );
  }

  static authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '需要访问令牌',
        code: 'MISSING_TOKEN'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: '无效或过期的令牌',
          code: 'INVALID_TOKEN'
        });
      }
      
      req.user = user;
      next();
    });
  }

  static requireRole(role) {
    return (req, res, next) => {
      if (!req.user || req.user.role !== role) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      next();
    };
  }
}

module.exports = AuthMiddleware;
```

3. **应用到路由**
```javascript
// apps/ai-service/routes/aiRoutes.js - 修改现有文件
const AuthMiddleware = require('../middleware/auth');

// 需要认证的路由
router.use('/analysis', AuthMiddleware.authenticateToken);
router.use('/models', AuthMiddleware.authenticateToken);
router.use('/cache', AuthMiddleware.authenticateToken);
router.use('/schedule', AuthMiddleware.requireRole('admin'));

// 公开路由保持不变
router.get('/analysis-types', (req, res) => {
  // 分析类型查询无需认证
});

router.get('/system/health', (req, res) => {
  // 健康检查无需认证
});
```

4. **添加登录接口**
```javascript
// apps/ai-service/routes/authRoutes.js - 新建文件
const express = require('express');
const bcrypt = require('bcryptjs');
const AuthMiddleware = require('../middleware/auth');
const router = express.Router();

// 临时用户存储（生产环境应使用数据库）
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$hash_of_password', // 使用bcrypt哈希
    role: 'admin'
  }
];

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名和密码都是必需的'
      });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    const token = AuthMiddleware.generateToken(user);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

module.exports = router;
```

5. **环境变量配置**
```bash
# .env - 添加以下配置
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRES_IN=1h
```

#### 任务2: 输入验证增强

**优先级**: 🔴 P0 - 严重  
**预计时间**: 3-4小时  

1. **安装验证库**
```bash
npm install joi helmet express-validator
```

2. **创建验证中间件**
```javascript
// apps/ai-service/middleware/validation.js
const Joi = require('joi');

class ValidationMiddleware {
  static validateAnalysisRequest(req, res, next) {
    const schema = Joi.object({
      groupName: Joi.string()
        .alphanum()
        .min(1)
        .max(50)
        .required()
        .messages({
          'string.alphanum': '群组名称只能包含字母和数字',
          'string.max': '群组名称不能超过50个字符',
          'any.required': '群组名称是必需的'
        }),
      
      analysisType: Joi.string()
        .valid('trend', 'sentiment', 'summary', 'keyword', 'activity', 'insight')
        .required()
        .messages({
          'any.only': '分析类型无效',
          'any.required': '分析类型是必需的'
        }),
      
      customPrompt: Joi.string()
        .max(200)
        .pattern(/^[^<>{}]*$/)
        .optional()
        .messages({
          'string.pattern.base': '自定义提示包含非法字符',
          'string.max': '自定义提示不能超过200个字符'
        }),
      
      timeRange: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$/)
        .optional()
        .messages({
          'string.pattern.base': '时间范围格式无效，应为YYYY-MM-DD~YYYY-MM-DD'
        })
    });

    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: '请求参数验证失败',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        })),
        code: 'VALIDATION_ERROR'
      });
    }
    
    req.validatedBody = value;
    next();
  }

  static validateModelConfig(req, res, next) {
    const schema = Joi.object({
      provider: Joi.string()
        .valid('openai', 'deepseek', 'gemini')
        .required(),
      
      model: Joi.string()
        .min(1)
        .max(100)
        .required(),
      
      apiKey: Joi.string()
        .min(10)
        .max(500)
        .required()
        .messages({
          'string.min': 'API密钥长度不足',
          'string.max': 'API密钥长度过长'
        }),
      
      temperature: Joi.number()
        .min(0)
        .max(2)
        .optional(),
      
      maxTokens: Joi.number()
        .integer()
        .min(1)
        .max(32000)
        .optional()
    });

    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: '模型配置验证失败',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        })),
        code: 'VALIDATION_ERROR'
      });
    }
    
    req.validatedBody = value;
    next();
  }
}

module.exports = ValidationMiddleware;
```

3. **应用验证到路由**
```javascript
// 修改 apps/ai-service/routes/aiRoutes.js
const ValidationMiddleware = require('../middleware/validation');

// 应用验证中间件
router.post('/analysis', 
  AuthMiddleware.authenticateToken,
  ValidationMiddleware.validateAnalysisRequest,
  asyncErrorHandler(async (req, res) => {
    // 使用 req.validatedBody 替代 req.body
    const { groupName, analysisType, customPrompt, timeRange } = req.validatedBody;
    // ... 其余逻辑保持不变
  })
);

router.post('/models/config',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireRole('admin'),
  ValidationMiddleware.validateModelConfig,
  asyncErrorHandler(async (req, res) => {
    const config = req.validatedBody;
    // ... 处理逻辑
  })
);
```

#### 任务3: API密钥安全化

**优先级**: 🔴 P0 - 严重  
**预计时间**: 2-3小时  

1. **创建密钥加密工具**
```javascript
// apps/ai-service/utils/encryption.js
const crypto = require('crypto');

class EncryptionUtil {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY || this.generateKey();
  }

  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  encrypt(text) {
    if (!text) return text;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.includes(':')) {
      return encryptedData; // 返回原始数据（向后兼容）
    }
    
    const [ivHex, encrypted] = encryptedData.split(':');
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = new EncryptionUtil();
```

2. **修改配置管理器**
```javascript
// apps/ai-service/config/ConfigManager.js - 添加加密支持
const EncryptionUtil = require('../utils/encryption');

class ConfigManager {
  // ... 现有代码 ...

  setApiKey(provider, apiKey) {
    const encryptedKey = EncryptionUtil.encrypt(apiKey);
    // 存储加密后的密钥
    this.config.aiModels[provider].apiKey = encryptedKey;
    this.saveConfig();
  }

  getApiKey(provider) {
    const encryptedKey = this.config.aiModels[provider]?.apiKey;
    return EncryptionUtil.decrypt(encryptedKey);
  }
}
```

3. **环境变量安全配置**
```bash
# .env.example - 创建模板文件
# 复制此文件为.env并填入实际值

# 服务配置
NODE_ENV=development
AI_PORT=3001

# 安全配置
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here

# API密钥（加密存储）
DEEPSEEK_API_KEY=encrypted:your-encrypted-key
GEMINI_API_KEY=encrypted:your-encrypted-key

# 数据库配置（如果使用）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatlog_web
DB_USER=your-db-user
DB_PASS=your-db-password
```

4. **安全文件权限脚本**
```bash
#!/bin/bash
# scripts/secure-config.sh

echo "🔒 设置配置文件安全权限..."

# 设置环境变量文件权限
chmod 600 .env 2>/dev/null || echo "⚠️  .env文件不存在"
chmod 600 .env.* 2>/dev/null || echo "⚠️  环境变量文件不存在"
chmod 600 apps/ai-service/.env 2>/dev/null || echo "⚠️  AI服务环境变量文件不存在"

# 确保配置目录权限
chmod 755 apps/ai-service/config/
chmod 600 apps/ai-service/config/*.json 2>/dev/null || echo "⚠️  配置文件不存在"

# 检查敏感文件是否在git中
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    echo "🚨 警告: .env文件已被git跟踪，请立即移除！"
    echo "运行: git rm --cached .env"
fi

echo "✅ 配置文件权限设置完成"
```

### ⚡ 中期修复任务 (30天内完成)

#### 任务4: 速率限制实施

1. **创建速率限制配置**
```javascript
// apps/ai-service/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { RateLimiterMemory } = require('rate-limiter-flexible');

class RateLimitMiddleware {
  constructor() {
    // 内存存储的限制器（生产环境建议使用Redis）
    this.analysisLimiter = new RateLimiterMemory({
      keyPrefix: 'ai_analysis',
      points: 10, // 10次请求
      duration: 3600, // 1小时
    });
    
    this.configLimiter = new RateLimiterMemory({
      keyPrefix: 'config_change',
      points: 5, // 5次配置更改
      duration: 3600, // 1小时
    });
  }

  // 全局速率限制
  static createGlobalLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 每IP限制100请求
      message: {
        success: false,
        error: '请求过于频繁，请稍后重试',
        retryAfter: '15分钟',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true, // 返回rate limit信息到headers
      legacyHeaders: false,
      skip: (req) => {
        // 跳过健康检查请求
        return req.path === '/api/system/health';
      }
    });
  }

  // AI分析专用限制
  createAnalysisLimiter() {
    return async (req, res, next) => {
      const key = req.user ? req.user.id : req.ip;
      
      try {
        await this.analysisLimiter.consume(key);
        next();
      } catch (rejRes) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        
        res.status(429).json({
          success: false,
          error: 'AI分析请求过于频繁',
          retryAfter: `${secs}秒`,
          code: 'AI_RATE_LIMIT_EXCEEDED'
        });
      }
    };
  }

  // 配置更改限制
  createConfigLimiter() {
    return async (req, res, next) => {
      const key = req.user ? req.user.id : req.ip;
      
      try {
        await this.configLimiter.consume(key);
        next();
      } catch (rejRes) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        
        res.status(429).json({
          success: false,
          error: '配置更改过于频繁',
          retryAfter: `${secs}秒`,
          code: 'CONFIG_RATE_LIMIT_EXCEEDED'
        });
      }
    };
  }
}

module.exports = RateLimitMiddleware;
```

2. **应用速率限制**
```javascript
// apps/ai-service/app.js - 修改现有文件
const RateLimitMiddleware = require('./middleware/rateLimiter');

const rateLimitMiddleware = new RateLimitMiddleware();

// 应用全局速率限制
app.use('/api', RateLimitMiddleware.createGlobalLimiter());

// 应用到特定路由
app.use('/api/analysis', rateLimitMiddleware.createAnalysisLimiter());
app.use('/api/models/config', rateLimitMiddleware.createConfigLimiter());
app.use('/api/schedule/config', rateLimitMiddleware.createConfigLimiter());
```

### 🔧 长期安全改进

#### 任务5: 安全监控系统

1. **创建安全监控中间件**
```javascript
// apps/ai-service/middleware/securityMonitor.js
class SecurityMonitor {
  constructor(observabilityManager) {
    this.logger = observabilityManager.getLogger('security');
    this.suspiciousActivity = new Map();
    this.alertThresholds = {
      failedLogins: 5,
      rapidRequests: 50,
      suspiciousPatterns: 3
    };
  }

  createSecurityMiddleware() {
    return (req, res, next) => {
      // 记录请求信息
      this.logRequest(req);
      
      // 检测可疑活动
      this.detectSuspiciousActivity(req);
      
      // 检测XSS和注入尝试
      this.detectMaliciousPayload(req);
      
      next();
    };
  }

  logRequest(req) {
    this.logger.info('API请求', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      user: req.user?.username,
      timestamp: new Date().toISOString()
    });
  }

  detectSuspiciousActivity(req) {
    const clientIP = req.ip;
    const now = Date.now();
    
    // 检测快速连续请求
    if (!this.suspiciousActivity.has(clientIP)) {
      this.suspiciousActivity.set(clientIP, []);
    }
    
    const requests = this.suspiciousActivity.get(clientIP);
    requests.push(now);
    
    // 清理1分钟前的记录
    const oneMinuteAgo = now - 60000;
    const recentRequests = requests.filter(time => time > oneMinuteAgo);
    this.suspiciousActivity.set(clientIP, recentRequests);
    
    // 检测异常频率
    if (recentRequests.length > this.alertThresholds.rapidRequests) {
      this.reportSecurityEvent('RAPID_REQUESTS', {
        ip: clientIP,
        requestCount: recentRequests.length,
        timeWindow: '1分钟',
        user: req.user?.username
      });
    }
  }

  detectMaliciousPayload(req) {
    const suspiciousPatterns = [
      /script/i,
      /union.*select/i,
      /<script>/i,
      /javascript:/i,
      /eval\(/i,
      /exec\(/i,
      /\.\.\/\.\.\//i
    ];
    
    const requestContent = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    const detectedPatterns = suspiciousPatterns.filter(pattern => 
      pattern.test(requestContent)
    );
    
    if (detectedPatterns.length > 0) {
      this.reportSecurityEvent('MALICIOUS_PAYLOAD', {
        ip: req.ip,
        url: req.url,
        patterns: detectedPatterns.map(p => p.toString()),
        payload: requestContent.substring(0, 500), // 截断长内容
        user: req.user?.username
      });
    }
  }

  reportSecurityEvent(type, details) {
    this.logger.warn('安全威胁检测', {
      eventType: type,
      severity: 'HIGH',
      details,
      timestamp: new Date().toISOString()
    });
    
    // TODO: 集成告警系统（钉钉、企业微信、邮件等）
    this.sendAlert(type, details);
  }

  sendAlert(type, details) {
    // 这里可以集成实际的告警系统
    console.log(`🚨 安全告警: ${type}`, details);
  }
}

module.exports = SecurityMonitor;
```

#### 任务6: 数据加密存储

1. **数据库加密字段支持**
```javascript
// apps/ai-service/models/User.js
const bcrypt = require('bcryptjs');
const EncryptionUtil = require('../utils/encryption');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.role = data.role || 'user';
    this.createdAt = data.createdAt || new Date();
    this.lastLoginAt = data.lastLoginAt;
  }

  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password) {
    return await bcrypt.compare(password, this.passwordHash);
  }

  // 加密敏感字段
  encryptSensitiveData() {
    if (this.email) {
      this.email = EncryptionUtil.encrypt(this.email);
    }
  }

  // 解密敏感字段
  decryptSensitiveData() {
    if (this.email) {
      this.email = EncryptionUtil.decrypt(this.email);
    }
  }

  toJSON() {
    // 不包含密码哈希在JSON输出中
    const { passwordHash, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
```

## 📋 实施时间表

| 阶段 | 任务 | 预计时间 | 截止日期 | 负责人 |
|------|------|----------|----------|---------|
| 紧急 | JWT身份验证 | 6小时 | Day 1 | 后端开发 |
| 紧急 | 输入验证 | 4小时 | Day 2 | 后端开发 |
| 紧急 | API密钥加密 | 3小时 | Day 3 | 后端开发 |
| 中期 | 速率限制 | 4小时 | Week 2 | 后端开发 |
| 中期 | CORS安全化 | 2小时 | Week 2 | 后端开发 |
| 中期 | 加密算法升级 | 3小时 | Week 3 | 后端开发 |
| 长期 | 安全监控 | 8小时 | Week 4 | 全栈开发 |
| 长期 | 数据加密 | 6小时 | Week 5 | 后端开发 |
| 长期 | 安全测试 | 4小时 | Week 6 | QA团队 |

## ✅ 验证检查清单

### 身份验证验证
- [ ] 无令牌访问被拒绝（401状态码）
- [ ] 无效令牌被拒绝（403状态码）
- [ ] 令牌过期自动失效
- [ ] 用户角色权限正确控制
- [ ] 登录失败次数限制

### 输入验证验证
- [ ] 所有API端点都有输入验证
- [ ] XSS攻击被正确阻止
- [ ] SQL注入尝试被阻止
- [ ] 文件上传安全检查
- [ ] 请求大小限制生效

### 配置安全验证
- [ ] API密钥已加密存储
- [ ] 环境变量权限正确设置
- [ ] 生产配置与开发配置分离
- [ ] 默认凭据已更改
- [ ] 敏感文件不在版本控制中

### 网络安全验证
- [ ] CORS策略正确配置
- [ ] 速率限制正常工作
- [ ] HTTPS强制启用（生产环境）
- [ ] 安全HTTP头正确设置
- [ ] IP白名单功能正常

### 监控验证
- [ ] 安全事件正确记录
- [ ] 异常活动被检测
- [ ] 告警系统正常工作
- [ ] 日志轮转正常
- [ ] 审计追踪完整

## 🆘 故障排除

### 常见问题

**问题1: JWT令牌验证失败**
```bash
# 检查环境变量
echo $JWT_SECRET

# 检查令牌格式
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/analysis
```

**问题2: 速率限制过于严格**
```javascript
// 临时调整限制（仅开发环境）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // 临时增加限制
  skip: (req) => req.ip === '127.0.0.1' // 跳过本地请求
});
```

**问题3: 加密/解密失败**
```javascript
// 检查加密密钥
console.log('Encryption key length:', process.env.ENCRYPTION_KEY?.length);

// 测试加密解密
const EncryptionUtil = require('./utils/encryption');
const test = 'test-data';
const encrypted = EncryptionUtil.encrypt(test);
const decrypted = EncryptionUtil.decrypt(encrypted);
console.log('Test passed:', test === decrypted);
```

---

*本实施指南配合《安全审计报告》使用 | 更新时间：2025年7月23日*