# 🔒 安全配置参考

## 📋 安全配置模板

本文档提供了生产环境和开发环境的安全配置模板。

## 🌍 环境变量配置

### 开发环境 (.env.development)
```bash
# 应用配置
NODE_ENV=development
APP_NAME=Chatlog Web
APP_VERSION=1.0.0

# 服务端口配置
AI_PORT=3001
FRONTEND_PORT=8080
CHATLOG_PORT=5030

# JWT配置
JWT_SECRET=dev-jwt-secret-change-in-production-very-long-random-string
JWT_EXPIRES_IN=24h
JWT_ISSUER=chatlog-web-dev

# 加密配置
ENCRYPTION_KEY=dev-encryption-key-32-characters-long-random-string
HASH_SALT_ROUNDS=10

# 数据库配置（如使用）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatlog_web_dev
DB_USER=chatlog_dev
DB_PASS=dev_password_123

# Redis配置（缓存和会话）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# API密钥（开发环境使用测试密钥）
DEEPSEEK_API_KEY=test-key-for-development
GEMINI_API_KEY=test-key-for-development
OPENAI_API_KEY=test-key-for-development

# 日志配置
LOG_LEVEL=debug
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# 安全配置
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=200
ENABLE_SECURITY_HEADERS=true

# 监控配置
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000

# 文件上传配置
MAX_FILE_SIZE=10MB
ALLOWED_FILE_TYPES=.jpg,.jpeg,.png,.gif,.pdf,.txt,.csv
UPLOAD_DIR=./uploads

# 缓存配置
CACHE_TTL=3600
CACHE_MAX_ITEMS=1000
ENABLE_RESPONSE_CACHE=true
```

### 生产环境 (.env.production)
```bash
# 应用配置
NODE_ENV=production
APP_NAME=Chatlog Web
APP_VERSION=1.0.0

# 服务端口配置
AI_PORT=3001
FRONTEND_PORT=80
CHATLOG_PORT=5030

# JWT配置（必须使用强密钥）
JWT_SECRET=super-secure-jwt-secret-at-least-256-bits-long-random-generated-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=chatlog-web-prod

# 加密配置（必须使用强密钥）
ENCRYPTION_KEY=super-secure-encryption-key-32-chars-random-generated-string
HASH_SALT_ROUNDS=12

# 数据库配置
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=chatlog_web_prod
DB_USER=chatlog_prod_user
DB_PASS=super-secure-db-password
DB_SSL=true
DB_CONNECTION_POOL_MIN=5
DB_CONNECTION_POOL_MAX=20

# Redis配置
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=super-secure-redis-password
REDIS_DB=0
REDIS_TLS=true

# API密钥（加密存储）
DEEPSEEK_API_KEY=encrypted:your-actual-encrypted-deepseek-key
GEMINI_API_KEY=encrypted:your-actual-encrypted-gemini-key
OPENAI_API_KEY=encrypted:your-actual-encrypted-openai-key

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/chatlog-web/app.log
LOG_MAX_SIZE=50m
LOG_MAX_FILES=10
LOG_COMPRESS=true

# 安全配置
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=50
ENABLE_SECURITY_HEADERS=true
FORCE_HTTPS=true
HSTS_MAX_AGE=31536000

# 监控配置
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=60000
ENABLE_APM=true
APM_SERVICE_NAME=chatlog-web-ai

# 文件上传配置
MAX_FILE_SIZE=5MB
ALLOWED_FILE_TYPES=.jpg,.jpeg,.png,.pdf,.txt,.csv
UPLOAD_DIR=/var/uploads/chatlog-web
VIRUS_SCAN_ENABLED=true

# 缓存配置
CACHE_TTL=1800
CACHE_MAX_ITEMS=5000
ENABLE_RESPONSE_CACHE=true
CACHE_COMPRESSION=true

# 安全监控
SECURITY_MONITORING_ENABLED=true
FAILED_LOGIN_THRESHOLD=5
SUSPICIOUS_ACTIVITY_THRESHOLD=10
ALERT_WEBHOOK_URL=https://your-alert-webhook-url

# SSL证书配置
SSL_CERT_PATH=/etc/ssl/certs/chatlog-web.crt
SSL_KEY_PATH=/etc/ssl/private/chatlog-web.key
SSL_CA_PATH=/etc/ssl/certs/ca-bundle.crt
```

## ⚙️ 应用配置文件

### 安全配置 (config/security.js)
```javascript
const env = process.env.NODE_ENV || 'development';

const baseConfig = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: process.env.JWT_ISSUER || 'chatlog-web'
  },
  
  encryption: {
    algorithm: 'aes-256-cbc',
    key: process.env.ENCRYPTION_KEY,
    keyLength: 32
  },
  
  hashing: {
    algorithm: 'bcrypt',
    saltRounds: parseInt(process.env.HASH_SALT_ROUNDS) || 10
  },
  
  rateLimit: {
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false
  },
  
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  
  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
  }
};

const environmentConfigs = {
  development: {
    ...baseConfig,
    jwt: {
      ...baseConfig.jwt,
      expiresIn: '24h' // 开发环境更长过期时间
    },
    rateLimit: {
      ...baseConfig.rateLimit,
      max: 200 // 开发环境更宽松限制
    },
    cors: {
      ...baseConfig.cors,
      origin: ['http://localhost:8080', 'http://127.0.0.1:8080']
    },
    logging: {
      level: 'debug',
      console: true
    }
  },
  
  production: {
    ...baseConfig,
    jwt: {
      ...baseConfig.jwt,
      expiresIn: '15m' // 生产环境更短过期时间
    },
    rateLimit: {
      ...baseConfig.rateLimit,
      max: 50 // 生产环境更严格限制
    },
    security: {
      helmet: true,
      hsts: {
        enabled: true,
        maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000
      },
      forceHTTPS: process.env.FORCE_HTTPS === 'true',
      noSniff: true,
      xssFilter: true,
      frameguard: { action: 'deny' }
    },
    logging: {
      level: 'info',
      console: false,
      file: {
        enabled: true,
        path: process.env.LOG_FILE_PATH || './logs/app.log'
      }
    }
  },
  
  test: {
    ...baseConfig,
    jwt: {
      ...baseConfig.jwt,
      secret: 'test-secret',
      expiresIn: '1h'
    },
    rateLimit: {
      ...baseConfig.rateLimit,
      max: 1000 // 测试环境无限制
    },
    logging: {
      level: 'error',
      console: false
    }
  }
};

module.exports = environmentConfigs[env];
```

### 数据库配置 (config/database.js)
```javascript
const env = process.env.NODE_ENV || 'development';

const configurations = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'chatlog_web_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'password',
    dialect: 'postgres',
    logging: console.log,
    pool: {
      min: 0,
      max: 5,
      acquire: 30000,
      idle: 10000
    }
  },
  
  production: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    dialect: 'postgres',
    logging: false,
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_CONNECTION_POOL_MIN) || 5,
      max: parseInt(process.env.DB_CONNECTION_POOL_MAX) || 20,
      acquire: 60000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  },
  
  test: {
    host: 'localhost',
    port: 5432,
    database: 'chatlog_web_test',
    username: 'postgres',
    password: 'password',
    dialect: 'postgres',
    logging: false
  }
};

module.exports = configurations[env];
```

### Redis配置 (config/redis.js)
```javascript
const env = process.env.NODE_ENV || 'development';

const configurations = {
  development: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  },
  
  production: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    tls: process.env.REDIS_TLS === 'true' ? {} : null,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    family: 4
  },
  
  test: {
    host: 'localhost',
    port: 6379,
    db: 15, // 使用不同的数据库避免冲突
    lazyConnect: true
  }
};

module.exports = configurations[env];
```

## 🔐 Nginx安全配置

### SSL配置 (nginx/ssl.conf)
```nginx
# SSL配置
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# SSL证书
ssl_certificate /etc/ssl/certs/chatlog-web.crt;
ssl_certificate_key /etc/ssl/private/chatlog-web.key;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/ssl/certs/ca-bundle.crt;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

### 安全头配置 (nginx/security-headers.conf)
```nginx
# 安全响应头
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';" always;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# 隐藏Nginx版本
server_tokens off;
```

### 主配置 (nginx/chatlog-web.conf)
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # 包含SSL配置
    include /etc/nginx/ssl.conf;
    
    # 包含安全头配置
    include /etc/nginx/security-headers.conf;
    
    # 限制请求大小
    client_max_body_size 10M;
    
    # 限制请求速率
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # 前端静态文件
    location / {
        root /var/www/chatlog-web/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存配置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API代理
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时配置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # 登录API特殊限制
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 隐藏敏感文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|config)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

## 🛡️ 防火墙配置

### UFW配置 (Ubuntu)
```bash
#!/bin/bash
# scripts/setup-firewall.sh

echo "🔥 配置UFW防火墙..."

# 重置防火墙规则
sudo ufw --force reset

# 默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH访问（根据实际端口修改）
sudo ufw allow 22/tcp comment 'SSH'

# HTTP和HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# 应用端口（仅本地访问）
sudo ufw allow from 127.0.0.1 to any port 3001 comment 'AI Service'
sudo ufw allow from 127.0.0.1 to any port 5030 comment 'Chatlog Service'

# 数据库端口（仅从应用服务器访问）
# sudo ufw allow from APP_SERVER_IP to any port 5432 comment 'PostgreSQL'

# Redis端口（仅从应用服务器访问）
# sudo ufw allow from APP_SERVER_IP to any port 6379 comment 'Redis'

# 启用防火墙
sudo ufw --force enable

# 显示状态
sudo ufw status verbose

echo "✅ 防火墙配置完成"
```

## 📋 安全检查脚本

### 配置验证脚本 (scripts/security-check.sh)
```bash
#!/bin/bash
# 安全配置检查脚本

echo "🔍 开始安全配置检查..."

# 检查必需的环境变量
required_vars=(
    "JWT_SECRET"
    "ENCRYPTION_KEY"
    "DB_PASS"
    "REDIS_PASSWORD"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ 缺少必需的环境变量: ${missing_vars[*]}"
    exit 1
fi

# 检查JWT密钥强度
if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "⚠️  JWT_SECRET长度不足32个字符"
fi

# 检查加密密钥强度
if [ ${#ENCRYPTION_KEY} -lt 32 ]; then
    echo "⚠️  ENCRYPTION_KEY长度不足32个字符"
fi

# 检查文件权限
files_to_check=(
    ".env"
    ".env.production"
    "apps/ai-service/.env"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        perms=$(stat -c "%a" "$file")
        if [ "$perms" != "600" ]; then
            echo "⚠️  $file 权限不安全 ($perms)，应该是600"
        fi
    fi
done

# 检查是否在生产环境
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 生产环境检查..."
    
    # 检查SSL配置
    if [ "$FORCE_HTTPS" != "true" ]; then
        echo "⚠️  生产环境未启用HTTPS强制"
    fi
    
    # 检查日志级别
    if [ "$LOG_LEVEL" = "debug" ]; then
        echo "⚠️  生产环境不应使用debug日志级别"
    fi
    
    # 检查CORS配置
    if [[ "$CORS_ORIGINS" == *"localhost"* ]]; then
        echo "⚠️  生产环境CORS配置包含localhost"
    fi
fi

echo "✅ 安全配置检查完成"
```

### SSL证书检查脚本 (scripts/ssl-check.sh)
```bash
#!/bin/bash
# SSL证书检查脚本

DOMAIN=${1:-yourdomain.com}
PORT=${2:-443}

echo "🔍 检查 $DOMAIN:$PORT 的SSL证书..."

# 检查证书有效期
cert_info=$(echo | openssl s_client -connect $DOMAIN:$PORT -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "📜 证书信息:"
    echo "$cert_info"
    
    # 检查证书是否即将过期（30天内）
    end_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
    end_timestamp=$(date -d "$end_date" +%s)
    current_timestamp=$(date +%s)
    days_until_expiry=$(( (end_timestamp - current_timestamp) / 86400 ))
    
    if [ $days_until_expiry -lt 30 ]; then
        echo "⚠️  证书将在 $days_until_expiry 天后过期"
    else
        echo "✅ 证书有效期还有 $days_until_expiry 天"
    fi
else
    echo "❌ 无法获取SSL证书信息"
fi

# 检查SSL配置
echo "🔍 检查SSL配置..."
ssl_test=$(echo | openssl s_client -connect $DOMAIN:$PORT -servername $DOMAIN 2>&1)

if echo "$ssl_test" | grep -q "TLSv1.3\|TLSv1.2"; then
    echo "✅ SSL协议版本正确"
else
    echo "⚠️  SSL协议版本可能过旧"
fi

echo "✅ SSL检查完成"
```

---

*本配置参考文档提供生产就绪的安全配置模板 | 更新时间：2025年7月23日*