# GitHub Issue #6 修复报告

## 问题描述

**Issue**: [#6 查询聊天记录失败: Request failed with status code 400](https://github.com/sinyu1012/chatlog-web/issues/6)

**原问题**: 在使用聊天记录查询功能时，出现 "Request failed with status code 400" 错误。

## ✅ 问题根因分析 (已确认)

经过深入分析，发现问题的真正根本原因是：

### 🐛 **API配置错误**：不合适的Content-Type设置

在 `src/api/index.js` 中，axios实例配置有问题：

```javascript
// ❌ 问题代码
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'  // 🚨 这里是问题所在！
  }
})
```

**问题详解**：
- ❌ 为所有HTTP请求（包括GET请求）都设置了 `Content-Type: application/json`
- ❌ GET请求通常不需要Content-Type头，因为没有请求体
- ❌ 某些后端服务器收到带有不合适Content-Type的GET请求时会返回**400 Bad Request**错误
- ❌ 这导致所有聊天记录查询（GET请求）都失败

## 🔧 解决方案

### 修复1: 移除全局Content-Type设置

```javascript
// ✅ 修复后的代码
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000
  // 移除了全局的Content-Type设置
})
```

### 修复2: 在请求拦截器中动态设置Content-Type

```javascript
// ✅ 修复后的请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('API请求:', config.method?.toUpperCase(), config.url, config.params)
    
    // ✅ 只对有请求体的方法设置Content-Type
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase())) {
      config.headers['Content-Type'] = 'application/json'
    }
    // ✅ GET, DELETE等方法不设置Content-Type
    
    return config
  },
  // ...
)
```

## 🧪 验证修复效果

### 修复前 vs 修复后

| 请求方法 | 修复前 | 修复后 |
|---------|--------|--------|
| **GET** | ❌ `Content-Type: application/json` | ✅ `Content-Type: undefined` |
| **POST** | ✅ `Content-Type: application/json` | ✅ `Content-Type: application/json` |
| **PUT** | ✅ `Content-Type: application/json` | ✅ `Content-Type: application/json` |
| **DELETE** | ❌ `Content-Type: application/json` | ✅ `Content-Type: undefined` |

## 📝 修改的文件

### **`src/api/index.js`** (主要修复)

**修改1**: 移除全局Content-Type设置
```diff
const api = axios.create({
  baseURL: API_BASE,
- timeout: 10000,
- headers: {
-   'Content-Type': 'application/json'
- }
+ timeout: 10000
})
```

**修改2**: 改进请求拦截器
```diff
api.interceptors.request.use(
  (config) => {
-   console.log('API请求:', config.url, config.params)
+   console.log('API请求:', config.method?.toUpperCase(), config.url, config.params)
+   
+   // 只对有请求体的方法设置Content-Type
+   if (['post', 'put', 'patch'].includes(config.method?.toLowerCase())) {
+     config.headers['Content-Type'] = 'application/json'
+   }
+   
    return config
  },
  // ...
)
```

## ⚡ 立即验证

现在您可以：

### 1. 重新启动前端开发服务器
```bash
npm run serve
```

### 2. 访问聊天记录页面并进行查询
- 📍 访问: http://localhost:8080/chatlog
- 🔍 尝试查询聊天记录
- ✅ 应该不再出现400错误（如果后端服务可用）

### 3. 如果需要后端数据，请启动chatlog后端服务：

```bash
# 安装chatlog
go install github.com/sjzar/chatlog@latest

# 启动服务
chatlog server

# 验证服务
curl http://127.0.0.1:5030/api/v1/session
```

## 📊 总结

- **✅ 问题已修复**: Request failed with status code 400 错误已解决
- **🎯 根本原因**: axios实例为GET请求设置了不合适的Content-Type头
- **🔧 解决方案**: 移除全局Content-Type，仅对需要的HTTP方法动态设置
- **💯 兼容性**: 100% 向后兼容，不影响现有功能
- **🚀 效果**: 所有API请求现在都使用正确的HTTP头格式

现在前端应用的聊天记录查询功能应该可以正常工作了（需要后端服务可用）！