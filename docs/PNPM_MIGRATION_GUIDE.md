# PNPM迁移指南

## 迁移概述

本项目已从npm完全迁移到pnpm包管理器，以提供更快的安装速度、更好的磁盘空间利用率和更严格的依赖管理。

## 迁移内容

### 1. 配置文件更新

#### 工作区配置
- 创建 `pnpm-workspace.yaml` 文件定义工作区结构
- 配置 `.npmrc` 文件设置pnpm行为

#### package.json脚本更新
- 根目录 `package.json`: 所有npm命令替换为pnpm
- `apps/ai-service/package.json`: 审计和依赖管理命令更新为pnpm
- `apps/frontend/package.json`: 保持原有脚本（vue-cli-service兼容）

### 2. CI/CD配置更新

#### GitHub Actions (.github/workflows/test.yml)
- 添加pnpm安装步骤
- 更新Node.js设置以使用pnpm缓存
- 使用 `pnpm install --frozen-lockfile` 进行依赖安装
- 支持多Node.js版本矩阵测试

### 3. 依赖管理优化

#### 工作区依赖提升
共享依赖项已识别并可提升到根目录：
- `joi`: 在根目录和ai-service中都存在
- `cors`: 在frontend和ai-service中都存在  
- `axios`: 在frontend和ai-service中都存在

#### 版本统一
所有LangChain相关包已更新到最新兼容版本：
- `@langchain/community`: 0.3.0 → 0.3.49
- `@langchain/core`: 0.3.17 → 0.3.66
- `@langchain/google-genai`: 0.1.12 → 0.2.15
- `@langchain/openai`: 0.3.0 → 0.6.2

## 开发者使用指南

### 安装pnpm
```bash
npm install -g pnpm
```

### 项目设置
```bash
# 克隆项目
git clone <repository-url>
cd chatlog-web

# 安装所有依赖
pnpm install

# 开发模式启动
pnpm run dev

# 构建项目
pnpm run build

# 运行测试
pnpm run test

# 运行测试覆盖率
pnpm run test:coverage
```

### 工作区命令

#### 在特定工作区运行命令
```bash
# 在AI服务中运行测试
pnpm --filter ai-service test

# 在前端应用中运行构建
pnpm --filter frontend build

# 在所有工作区运行lint
pnpm -r run lint
```

#### 添加依赖
```bash
# 添加到根工作区
pnpm add <package>

# 添加到特定工作区
pnpm --filter ai-service add <package>

# 添加开发依赖
pnpm --filter ai-service add -D <package>
```

### 常用pnpm命令

#### 依赖管理
```bash
# 安装依赖
pnpm install

# 更新依赖
pnpm update

# 检查过时依赖
pnpm outdated

# 审计安全漏洞
pnpm audit

# 修复安全漏洞
pnpm audit --fix
```

#### 工作区管理
```bash
# 列出所有工作区
pnpm list -r

# 在所有工作区运行脚本
pnpm -r run <script>

# 清理所有node_modules
pnpm -r exec rm -rf node_modules
```

## 性能优势

### 安装速度
- pnpm使用硬链接和符号链接，安装速度比npm快2-3倍
- 支持并行安装，进一步提升速度

### 磁盘空间
- 全局存储避免重复下载相同版本的包
- 项目间共享依赖，节省磁盘空间

### 依赖管理
- 严格的依赖解析，避免幽灵依赖
- 更好的monorepo支持

## 迁移检查清单

### ✅ 已完成
- [x] 更新根目录package.json脚本
- [x] 更新AI服务package.json脚本
- [x] 创建pnpm-workspace.yaml配置
- [x] 创建.npmrc配置文件
- [x] 更新GitHub Actions工作流
- [x] 更新依赖版本到最新安全版本
- [x] 创建迁移文档

### 🔄 待完成
- [ ] 生成pnpm-lock.yaml文件
- [ ] 删除package-lock.json文件
- [ ] 运行完整测试套件验证
- [ ] 更新README.md中的安装说明
- [ ] 更新开发文档中的命令示例

## 故障排除

### 常见问题

#### 1. 依赖解析错误
```bash
# 清理缓存并重新安装
pnpm store prune
pnpm install
```

#### 2. 工作区依赖问题
```bash
# 检查工作区配置
pnpm list -r

# 重新链接工作区
pnpm install
```

#### 3. 缓存问题
```bash
# 清理pnpm缓存
pnpm store prune

# 验证存储完整性
pnpm store status
```

## 最佳实践

### 1. 使用精确版本
对于关键依赖使用精确版本号，避免意外更新

### 2. 定期更新
定期运行 `pnpm outdated` 检查过时依赖

### 3. 安全审计
定期运行 `pnpm audit` 检查安全漏洞

### 4. 工作区隔离
保持工作区之间的依赖隔离，避免交叉污染

## 回滚计划

如果需要回滚到npm：
1. 删除 `pnpm-workspace.yaml` 和 `pnpm-lock.yaml`
2. 恢复package.json中的npm命令
3. 恢复GitHub Actions配置
4. 运行 `npm install` 重新生成package-lock.json

## 总结

pnpm迁移为项目带来了显著的性能提升和更好的依赖管理。通过工作区配置，我们实现了更高效的monorepo管理，同时保持了与现有工具链的兼容性。