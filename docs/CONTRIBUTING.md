# 贡献指南

感谢您对 Chatlog Web 项目的关注！我们欢迎各种形式的贡献，包括但不限于：

- 🐛 报告问题和错误
- 💡 提出新功能建议  
- 🔧 修复问题和改进功能
- 📖 完善文档和注释
- 🎨 优化UI/UX设计
- 🚀 性能优化

## 开始之前

在开始贡献之前，请确保：

1. **阅读项目文档** - 仔细阅读 [README.md](README.md) 了解项目背景和功能
2. **检查现有 Issues** - 在提交新的 Issue 之前，请先搜索是否已有相关问题
3. **了解技术栈** - 熟悉 Vue.js 3、Element Plus、ECharts 等技术

## 🐛 报告问题

如果您发现了问题，请按以下格式创建 Issue：

### Issue 模板

```markdown
## 问题描述
简要描述遇到的问题

## 复现步骤
1. 进入页面 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

## 期望行为
描述您期望看到的正确行为

## 实际行为  
描述实际发生的错误行为

## 环境信息
- 操作系统: [例如 macOS 12.6]
- 浏览器: [例如 Chrome 108]
- Node.js 版本: [例如 16.18.0]
- 项目版本: [例如 v1.0.0]

## 附加信息
- 错误截图
- 控制台错误日志
- 其他相关信息
```

## 💡 功能建议

提出新功能建议时，请包含：

1. **需求背景** - 为什么需要这个功能
2. **功能描述** - 详细描述功能如何工作
3. **用户场景** - 具体的使用场景
4. **设计草图** - 如果涉及UI，请提供设计图或原型

## 🛠️ 开发环境设置

### 前置条件

- Node.js >= 16.0
- npm >= 8.0 或 yarn >= 1.22
- Git

### 本地开发

1. **Fork 项目**
   ```bash
   # 在 GitHub 上点击 Fork 按钮
   ```

2. **克隆仓库**
   ```bash
       git clone https://github.com/sinyu1012/chatlog-web.git
   cd chatlog-web
   ```

3. **安装依赖**
   ```bash
   npm install
   # 或使用 yarn
   yarn install
   ```

4. **启动开发服务器**
   ```bash
   npm run serve
   ```

5. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🔄 提交流程

### 1. 代码规范

我们使用以下代码规范：

- **ESLint** - JavaScript/Vue 代码检查
- **Prettier** - 代码格式化
- **Vue.js 风格指南** - 遵循官方推荐

运行代码检查：
```bash
npm run lint
```

自动修复可修复的问题：
```bash
npm run lint:fix
```

### 2. 提交信息规范

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 格式
<type>[optional scope]: <description>

# 示例
feat: 添加消息趋势分析图表
fix: 修复联系人搜索功能
docs: 更新API文档
style: 调整按钮样式
refactor: 重构数据获取逻辑
test: 添加单元测试
chore: 更新依赖包
```

**提交类型说明：**
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 3. 分支命名规范

- `feature/功能名` - 新功能分支
- `fix/问题描述` - 错误修复分支
- `docs/文档类型` - 文档更新分支
- `refactor/重构描述` - 重构分支

### 4. Pull Request

1. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新的数据可视化图表"
   git push origin feature/your-feature-name
   ```

2. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写详细的 PR 描述
   - 关联相关的 Issue

3. **PR 模板**
   ```markdown
   ## 更改描述
   简要描述这个 PR 的更改内容
   
   ## 更改类型
   - [ ] 🐛 错误修复
   - [ ] ✨ 新功能
   - [ ] 💄 UI/样式更新
   - [ ] ♻️ 代码重构
   - [ ] 📝 文档更新
   - [ ] ⚡ 性能优化
   
   ## 测试
   - [ ] 已在本地测试
   - [ ] 已添加单元测试
   - [ ] 已通过 ESLint 检查
   
   ## 截图（如适用）
   [添加截图展示更改效果]
   
   ## 关联 Issue
   Closes #issue_number
   ```

## 📁 项目结构指南

### 目录说明

```
src/
├── api/              # API 接口封装
├── components/       # 通用组件
├── layout/          # 布局组件
├── router/          # 路由配置
├── store/           # 状态管理
├── styles/          # 全局样式
├── utils/           # 工具函数
├── views/           # 页面组件
└── main.js          # 应用入口
```

### 组件开发规范

1. **组件命名**
   - 使用 PascalCase（如 `DataChart.vue`）
   - 名称要具有描述性

2. **组件结构**
   ```vue
   <template>
     <!-- HTML 模板 -->
   </template>
   
   <script>
   // JavaScript 逻辑
   export default {
     name: 'ComponentName',
     // ...
   }
   </script>
   
   <style scoped>
   /* CSS 样式 */
   </style>
   ```

3. **Props 定义**
   ```javascript
   props: {
     title: {
       type: String,
       required: true,
       default: ''
     }
   }
   ```

### API 接口规范

1. **接口函数命名**
   ```javascript
   // 好的命名
   getChatLogs()
   getContactList()
   updateUserInfo()
   
   // 避免的命名
   getData()
   api1()
   fetch()
   ```

2. **错误处理**
   ```javascript
   try {
     const response = await apiCall()
     return response.data
   } catch (error) {
     console.error('API Error:', error)
     throw error
   }
   ```

## 🧪 测试

我们鼓励为新功能添加测试：

```bash
# 运行测试
npm run test

# 运行测试覆盖率检查
npm run test:coverage
```

### 测试文件位置
- 单元测试：`tests/unit/`
- 集成测试：`tests/integration/`
- E2E测试：`tests/e2e/`

## 📖 文档贡献

### 文档类型

1. **API 文档** - 接口使用说明
2. **组件文档** - 组件 Props 和使用示例
3. **用户指南** - 功能使用教程
4. **开发文档** - 技术实现细节

### 文档格式

- 使用 Markdown 格式
- 包含代码示例
- 添加清晰的标题和结构
- 提供截图或图表（如适用）

## 🎨 设计贡献

如果您想贡献 UI/UX 设计：

1. **设计原则**
   - 简洁现代
   - 用户友好
   - 响应式设计
   - 无障碍访问

2. **设计工具**
   - Figma、Sketch 或其他设计工具
   - 提供源文件和导出的 PNG/SVG

3. **设计规范**
   - 颜色：主色调为 Element Plus 蓝色（#409EFF）
   - 字体：系统默认字体栈
   - 间距：8px 基础网格

## 📚 学习资源

- [Vue.js 官方文档](https://vuejs.org/)
- [Element Plus 官方文档](https://element-plus.org/)
- [ECharts 官方文档](https://echarts.apache.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 🤝 社区

### 讨论渠道

- **GitHub Issues** - 错误报告和功能请求
- **GitHub Discussions** - 一般讨论和问题
- **Pull Requests** - 代码审查和讨论

### 行为准则

我们期望所有贡献者：

1. **尊重他人** - 友善、包容、建设性
2. **专业沟通** - 清晰、准确、有礼貌
3. **协作精神** - 开放、分享、互助
4. **质量意识** - 重视代码质量和用户体验

## ❓ 常见问题

### Q: 如何开始第一次贡献？
A: 建议从简单的问题开始，如文档更新、样式调整等。查看标有 `good first issue` 的 Issues。

### Q: PR 被拒绝了怎么办？
A: 根据审查者的反馈进行修改，或在 PR 中讨论具体问题。

### Q: 如何提议大的功能更改？
A: 先创建 Issue 讨论功能的必要性和设计方案，获得认可后再开始开发。

### Q: 遇到技术问题怎么办？
A: 可以在 GitHub Discussions 中提问，或查看项目文档和相关技术的官方文档。

## 📞 联系我们

如果您有任何问题或建议，请通过以下方式联系：

- 创建 [GitHub Issue](https://github.com/your-username/chatlog-web/issues)
- 参与 [GitHub Discussions](https://github.com/your-username/chatlog-web/discussions)

---

感谢您的贡献！每一个贡献都会让 Chatlog Web 变得更好。 🚀 