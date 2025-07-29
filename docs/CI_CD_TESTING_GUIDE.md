# CI/CD 自动化测试集成指南

本文档描述了Chatlog Web项目的持续集成和持续部署(CI/CD)自动化测试系统。

## 🎯 概述

我们的CI/CD流水线包括以下关键组件：
- **代码质量检查**: ESLint、TypeScript检查
- **单元测试**: Vitest + Vue Test Utils
- **集成测试**: API集成测试
- **E2E测试**: Playwright跨浏览器测试
- **安全扫描**: 依赖漏洞、代码分析、密钥检测
- **性能测试**: Lighthouse性能评估
- **测试覆盖率**: 代码覆盖率监控和报告

## 📁 工作流文件结构

```
.github/workflows/
├── frontend-tests.yml      # 前端测试工作流
├── ai-service-tests.yml    # AI服务测试工作流
├── ci-cd.yml              # 主CI/CD流水线
└── security-scan.yml      # 安全扫描工作流
```

## 🔄 工作流触发条件

### 前端测试工作流 (`frontend-tests.yml`)
**触发条件:**
- Push到 `main`, `develop`, `feature/monorepo-architecture-refactor` 分支
- Pull Request到 `main`, `develop` 分支
- 仅当 `apps/frontend/**` 路径有变更时触发

**执行内容:**
- 代码lint检查
- TypeScript类型检查
- 单元测试 + 覆盖率报告
- E2E测试
- 构建验证

### AI服务测试工作流 (`ai-service-tests.yml`)
**触发条件:**
- Push到 `main`, `develop`, `feature/monorepo-architecture-refactor` 分支
- Pull Request到 `main`, `develop` 分支
- 仅当 `apps/ai-service/**` 路径有变更时触发

**执行内容:**
- 代码lint检查
- 单元测试 + 覆盖率报告
- 集成测试
- 安全审计

### 主CI/CD流水线 (`ci-cd.yml`)
**触发条件:**
- Push到 `main` 分支
- Pull Request到 `main` 分支

**执行内容:**
- 代码质量检查
- 调用前端和AI服务测试流
- 集成测试
- 构建和部署
- 性能测试
- 结果通知

### 安全扫描工作流 (`security-scan.yml`)
**触发条件:**
- Push到 `main`, `develop` 分支
- Pull Request到 `main` 分支
- 定时执行（每周一早上8点）

**执行内容:**
- 依赖安全扫描
- CodeQL代码分析
- 密钥泄露检测
- 许可证合规检查

## 🧪 测试类型和配置

### 1. 单元测试
**框架**: Vitest + Vue Test Utils
**配置文件**: `vitest.config.ts`
**运行命令**: 
```bash
# 运行单元测试
pnpm test

# 生成覆盖率报告
pnpm test:coverage
```

**覆盖率标准**:
- 全局覆盖率: ≥80%
- 单文件覆盖率: ≥70%
- 关键文件(API, stores, utils): ≥90%

### 2. E2E测试
**框架**: Playwright
**配置文件**: `playwright.config.ts`
**运行命令**:
```bash
# 运行E2E测试
pnpm test:e2e

# 交互式运行
pnpm test:e2e:ui

# 调试模式
pnpm test:e2e:debug
```

**浏览器支持**:
- Desktop: Chrome, Firefox, Safari
- Mobile: Chrome Mobile, Safari Mobile

### 3. 集成测试
**范围**: API接口测试、服务间交互测试
**运行环境**: Docker compose + 真实服务
**数据**: Mock数据和测试数据库

### 4. 性能测试
**工具**: Lighthouse CI
**指标**:
- Performance Score: ≥90
- Accessibility Score: ≥95
- Best Practices Score: ≥90
- SEO Score: ≥90

## 📊 覆盖率报告

### 报告格式
- **HTML报告**: `coverage/index.html` - 交互式详细报告
- **JSON报告**: `coverage/coverage-final.json` - 机器可读格式
- **LCOV报告**: `coverage/lcov.info` - 第三方工具集成

### 覆盖率监控
- **Codecov集成**: 自动上传覆盖率到Codecov平台
- **GitHub集成**: PR中显示覆盖率变化
- **覆盖率徽章**: README中显示当前覆盖率

### 覆盖率质量门禁
```javascript
thresholds: {
  global: {
    branches: 80,
    functions: 80, 
    lines: 80,
    statements: 80
  },
  perFile: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

## 🔒 安全扫描

### 依赖安全扫描
- **工具**: npm audit, Snyk
- **频率**: 每次PR + 每周定时
- **标准**: 无高危漏洞，中危漏洞需评估

### 代码质量分析
- **工具**: GitHub CodeQL
- **范围**: JavaScript/TypeScript代码
- **检查**: 安全漏洞、代码异味、潜在bug

### 密钥泄露检测
- **工具**: TruffleHog
- **范围**: 全代码库历史
- **检查**: API密钥、数据库连接串、证书等

### 许可证合规
- **工具**: license-checker
- **允许的许可证**: MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, CC0-1.0, Unlicense
- **检查**: 依赖包许可证兼容性

## 🚀 部署流程

### 环境配置
1. **开发环境**: 本地开发，实时热重载
2. **测试环境**: CI/CD自动部署，集成测试
3. **预生产环境**: 性能测试，用户验收测试
4. **生产环境**: 正式发布

### 部署步骤
1. **代码合并**: PR合并到main分支
2. **自动测试**: 全套测试流水线执行
3. **构建打包**: 生成生产环境构建包
4. **部署到测试环境**: 自动部署验证
5. **性能测试**: Lighthouse性能评估
6. **部署到生产**: 手动确认后自动部署

## 📋 使用指南

### 开发者工作流
1. **创建功能分支**: `feature/your-feature-name`
2. **本地开发**: 编写代码和测试
3. **本地测试**: 运行 `pnpm test:all`
4. **提交代码**: 符合commit规范
5. **创建PR**: 触发自动测试
6. **代码审查**: 等待review和测试通过
7. **合并代码**: 合并到主分支

### 本地测试命令

```bash
# 安装依赖
pnpm install

# 运行所有测试
pnpm test:all

# 生成覆盖率报告
pnpm test:coverage:report

# 运行E2E测试
pnpm test:e2e

# 查看测试报告
pnpm test:coverage:open
pnpm test:e2e:report
```

### CI/CD监控

#### GitHub Actions界面
- 查看工作流状态: `Actions` 选项卡
- 下载构建产物: `Artifacts` 部分
- 查看测试报告: 各个job的详细日志

#### 覆盖率监控
- **Codecov仪表板**: 查看覆盖率趋势和变化
- **GitHub PR检查**: 每个PR显示覆盖率变化
- **本地HTML报告**: 详细的文件级覆盖率分析

## 🛠 故障排除

### 常见问题

#### 测试失败
1. **单元测试失败**: 检查测试代码和业务逻辑
2. **E2E测试失败**: 检查页面元素选择器和网络状态
3. **覆盖率不达标**: 增加测试用例覆盖未测试代码

#### CI/CD失败
1. **依赖安装失败**: 检查`pnpm-lock.yaml`和网络状态
2. **构建失败**: 检查TypeScript错误和依赖问题
3. **部署失败**: 检查环境配置和权限设置

#### 安全扫描问题
1. **依赖漏洞**: 更新到安全版本或寻找替代包
2. **代码质量问题**: 修复CodeQL报告的问题
3. **许可证问题**: 替换不兼容许可证的依赖

### 调试技巧
```bash
# 本地调试E2E测试
pnpm test:e2e:debug

# 查看详细测试输出
pnpm test -- --reporter=verbose

# 生成详细覆盖率报告
pnpm test:coverage -- --reporter=verbose

# 检查依赖安全问题
pnpm audit

# 检查许可证
npx license-checker
```

## 📈 性能优化

### CI/CD优化
- **缓存策略**: 使用pnpm缓存和GitHub Actions缓存
- **并行执行**: 多个job并行运行
- **条件执行**: 仅在相关文件变更时运行测试
- **增量测试**: 仅测试变更的文件

### 测试优化
- **测试分片**: 将大型测试套件分片并行执行
- **Mock优化**: 使用高效的mock数据和服务
- **资源管理**: 合理使用测试资源，避免内存泄漏

## 🔄 持续改进

### 监控指标
- **测试执行时间**: 跟踪和优化测试性能
- **测试成功率**: 监控测试稳定性
- **覆盖率趋势**: 确保覆盖率持续改善
- **部署频率**: 提高交付效率

### 定期维护
- **依赖更新**: 定期更新依赖包
- **测试维护**: 清理过时测试，增加新场景
- **工具升级**: 升级测试工具和CI/CD平台
- **文档更新**: 保持文档与实际配置同步

## 📞 联系方式

如有CI/CD相关问题，请联系：
- **技术负责人**: [技术团队]
- **DevOps工程师**: [DevOps团队]
- **GitHub Issues**: 在项目仓库中创建issue