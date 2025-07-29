# 聊天记录管理系统 - 完整系统架构图

## 📊 系统总览

```mermaid
graph TB
    subgraph "前端应用 (Vue 3 + Element Plus)"
        subgraph "现有功能模块"
            A1[仪表盘 Dashboard]
            A2[数据分析 Analytics]
            A3[AI智能分析 AIAnalysis]
            A4[聊天记录 ChatLog]
            A5[联系人管理 Contacts]
            A6[群聊管理 ChatRooms]
            A7[会话列表 Sessions]
            A8[多媒体管理 Media]
        end
        
        subgraph "新增管理模块"
            B1[AI模型管理 ModelManagement]
            B2[分析历史管理 AnalysisHistory]
            B3[定时任务管理 ScheduleManagement]
            B4[缓存管理 CacheManagement]
            B5[系统监控 SystemMonitoring]
        end
        
        subgraph "共享基础设施"
            C1[Layout 布局组件]
            C2[Router 路由管理]
            C3[Vuex 状态管理]
            C4[API Client 统一客户端]
            C5[Error Handler 错误处理]
        end
    end
    
    subgraph "后端服务"
        subgraph "Chatlog 服务 (Port 5030)"
            D1[联系人 API]
            D2[群聊 API]
            D3[会话 API]
            D4[聊天记录 API]
            D5[多媒体资源 API]
        end
        
        subgraph "AI 服务 (Port 3001)"
            E1[AI分析 API]
            E2[模型管理 API]
            E3[定时任务 API]
            E4[缓存管理 API]
            E5[系统监控 API]
        end
    end
    
    subgraph "数据存储"
        F1[(聊天记录数据库)]
        F2[(AI分析结果)]
        F3[(系统配置)]
        F4[/多媒体文件/]
    end
    
    %% 现有功能连接
    A1 --> C4
    A2 --> C4
    A3 --> C4
    A4 --> C4
    A5 --> C4
    A6 --> C4
    A7 --> C4
    A8 --> C4
    
    %% 新增管理模块连接
    B1 --> C4
    B2 --> C4
    B3 --> C4
    B4 --> C4
    B5 --> C4
    
    %% API 连接
    C4 --> D1
    C4 --> D2
    C4 --> D3
    C4 --> D4
    C4 --> D5
    C4 --> E1
    C4 --> E2
    C4 --> E3
    C4 --> E4
    C4 --> E5
    
    %% 数据存储连接
    D1 --> F1
    D2 --> F1
    D3 --> F1
    D4 --> F1
    D5 --> F4
    E1 --> F2
    E2 --> F3
    E3 --> F3
    E4 --> F2
    E5 --> F3
```

## 🏗️ 前端架构详细图

```mermaid
graph TB
    subgraph "Vue 3 应用架构"
        subgraph "视图层 (Views)"
            subgraph "现有页面"
                V1[Dashboard.vue<br/>仪表盘统计]
                V2[Analytics.vue<br/>数据可视化]
                V3[AIAnalysis.vue<br/>AI分析配置]
                V4[ChatLog.vue<br/>聊天记录查询]
                V5[Contacts.vue<br/>联系人列表]
                V6[ChatRooms.vue<br/>群聊管理]
                V7[Sessions.vue<br/>会话卡片]
                V8[Media.vue<br/>多媒体管理]
            end
            
            subgraph "新增管理页面"
                V9[AIModelManagement.vue<br/>模型配置管理]
                V10[AnalysisHistory.vue<br/>历史记录管理]
                V11[ScheduleManagement.vue<br/>定时任务管理]
                V12[CacheManagement.vue<br/>缓存管理]
                V13[SystemMonitoring.vue<br/>系统监控]
            end
        end
        
        subgraph "组件层 (Components)"
            subgraph "现有组件"
                C1[AnalysisHistory.vue<br/>分析历史列表]
                C2[AnalysisResult.vue<br/>分析结果展示]
            end
            
            subgraph "新增管理组件"
                C3[ModelConfigForm.vue<br/>模型配置表单]
                C4[ScheduleConfigForm.vue<br/>任务配置表单]
                C5[CacheStatsCard.vue<br/>缓存统计卡片]
                C6[HealthStatusCard.vue<br/>健康状态卡片]
                C7[SystemMetricsChart.vue<br/>系统指标图表]
                C8[LogViewer.vue<br/>日志查看器]
            end
        end
        
        subgraph "布局层 (Layout)"
            L1[Layout/index.vue<br/>主布局容器]
            L2[侧边栏导航<br/>Sidebar Navigation]
            L3[顶部导航栏<br/>Top Navigation]
            L4[内容区域<br/>Content Area]
        end
        
        subgraph "路由层 (Router)"
            R1[Vue Router 4<br/>路由管理]
            R2[现有路由配置<br/>Existing Routes]
            R3[管理模块路由<br/>Management Routes]
            R4[路由守卫<br/>Route Guards]
        end
        
        subgraph "状态管理 (Vuex)"
            S1[Store/index.js<br/>主状态管理]
            S2[现有状态模块<br/>Existing State]
            S3[Management Module<br/>管理模块状态]
            S4[Actions & Mutations<br/>状态操作]
        end
        
        subgraph "API层 (API)"
            A1[ApiClient.js<br/>统一API客户端]
            A2[unified.js<br/>现有API接口]
            A3[ai.js<br/>AI相关API]
            A4[management.js<br/>管理API接口]
            A5[errorHandling.js<br/>错误处理]
        end
        
        subgraph "工具层 (Utils)"
            U1[errorHandler.js<br/>错误处理工具]
            U2[contactUtils.ts<br/>联系人工具]
            U3[其他工具函数<br/>Other Utils]
        end
    end
    
    %% 层级关系
    V1 --> L1
    V2 --> L1
    V3 --> L1
    V4 --> L1
    V5 --> L1
    V6 --> L1
    V7 --> L1
    V8 --> L1
    V9 --> L1
    V10 --> L1
    V11 --> L1
    V12 --> L1
    V13 --> L1
    
    L1 --> R1
    R1 --> S1
    S1 --> A1
    A1 --> U1
    
    %% 组件使用关系
    V3 --> C1
    V3 --> C2
    V9 --> C3
    V11 --> C4
    V12 --> C5
    V13 --> C6
    V13 --> C7
    V13 --> C8
    
    %% API 调用关系
    V1 --> A2
    V2 --> A2
    V3 --> A3
    V4 --> A2
    V5 --> A2
    V6 --> A2
    V7 --> A2
    V8 --> A2
    V9 --> A4
    V10 --> A4
    V11 --> A4
    V12 --> A4
    V13 --> A4
```

## 🔄 数据流架构图

```mermaid
sequenceDiagram
    participant U as 用户 User
    participant V as 视图层 Views
    participant C as 组件层 Components
    participant S as 状态管理 Vuex
    participant A as API层 API Client
    participant B1 as Chatlog服务
    participant B2 as AI服务
    participant D as 数据存储 Database
    
    Note over U,D: 现有功能数据流
    U->>V: 访问页面 (Dashboard/Analytics/ChatLog等)
    V->>S: 触发状态更新
    S->>A: 调用API接口
    A->>B1: 请求Chatlog数据
    B1->>D: 查询数据库
    D-->>B1: 返回数据
    B1-->>A: 返回响应
    A-->>S: 更新状态
    S-->>V: 响应式更新
    V-->>U: 展示数据
    
    Note over U,D: 新增管理功能数据流
    U->>V: 访问管理页面 (/management/*)
    V->>C: 使用管理组件
    C->>S: 触发管理状态更新
    S->>A: 调用管理API
    A->>B2: 请求AI服务
    B2->>D: 操作配置/缓存/监控数据
    D-->>B2: 返回结果
    B2-->>A: 返回响应
    A-->>S: 更新管理状态
    S-->>C: 响应式更新
    C-->>V: 组件状态更新
    V-->>U: 展示管理界面
```

## 🗂️ 文件结构架构图

```
apps/frontend/src/
├── 📁 views/                          # 页面组件
│   ├── 📄 Dashboard.vue               # ✅ 现有 - 仪表盘
│   ├── 📄 Analytics.vue               # ✅ 现有 - 数据分析
│   ├── 📄 AIAnalysis.vue              # ✅ 现有 - AI分析
│   ├── 📄 ChatLog.vue                 # ✅ 现有 - 聊天记录
│   ├── 📄 Contacts.vue                # ✅ 现有 - 联系人
│   ├── 📄 ChatRooms.vue               # ✅ 现有 - 群聊
│   ├── 📄 Sessions.vue                # ✅ 现有 - 会话
│   ├── 📄 Media.vue                   # ✅ 现有 - 多媒体
│   └── 📁 management/                 # 🆕 新增 - 管理模块
│       ├── 📄 AIModelManagement.vue   # 🆕 AI模型管理
│       ├── 📄 AnalysisHistory.vue     # 🆕 分析历史管理
│       ├── 📄 ScheduleManagement.vue  # 🆕 定时任务管理
│       ├── 📄 CacheManagement.vue     # 🆕 缓存管理
│       └── 📄 SystemMonitoring.vue    # 🆕 系统监控
├── 📁 components/                     # 组件库
│   ├── 📁 analysis/                   # ✅ 现有 - 分析组件
│   │   ├── 📄 AnalysisHistory.vue     # ✅ 分析历史列表
│   │   └── 📄 AnalysisResult.vue      # ✅ 分析结果展示
│   └── 📁 management/                 # 🆕 新增 - 管理组件
│       ├── 📄 ModelConfigForm.vue     # 🆕 模型配置表单
│       ├── 📄 ScheduleConfigForm.vue  # 🆕 任务配置表单
│       ├── 📄 CacheStatsCard.vue      # 🆕 缓存统计卡片
│       ├── 📄 HealthStatusCard.vue    # 🆕 健康状态卡片
│       ├── 📄 SystemMetricsChart.vue  # 🆕 系统指标图表
│       └── 📄 LogViewer.vue           # 🆕 日志查看器
├── 📁 layout/                         # 布局组件
│   └── 📄 index.vue                   # ✅ 现有 - 主布局 (需扩展导航)
├── 📁 router/                         # 路由配置
│   └── 📄 index.js                    # ✅ 现有 - 路由配置 (需扩展管理路由)
├── 📁 store/                          # 状态管理
│   ├── 📄 index.js                    # ✅ 现有 - 主状态管理
│   └── 📁 modules/                    # 状态模块
│       └── 📄 management.js           # 🆕 新增 - 管理状态模块
├── 📁 api/                            # API接口
│   ├── 📄 ApiClient.js                # ✅ 现有 - 统一API客户端
│   ├── 📄 unified.js                  # ✅ 现有 - 统一API接口
│   ├── 📄 ai.js                       # ✅ 现有 - AI相关API
│   ├── 📄 management.js               # 🆕 新增 - 管理API接口
│   ├── 📄 index.js                    # ✅ 现有 - API入口
│   └── 📄 errorHandling.js            # ✅ 现有 - 错误处理
├── 📁 utils/                          # 工具函数
│   ├── 📄 errorHandler.js             # ✅ 现有 - 错误处理工具
│   ├── 📄 errorHandler.ts             # ✅ 现有 - TS错误处理
│   └── 📄 contactUtils.ts             # ✅ 现有 - 联系人工具
├```
─── 📁 tests/                          # 测试用例
│   ├── 📁 unit/                       # 单元测试
│   │   ├── 📄 ModelConfigForm.test.js # 🆕 模型配置表单测试
│   │   ├── 📄 ScheduleConfigForm.test.js # 🆕 任务配置表单测试
│   │   ├── 📄 CacheStatsCard.test.js  # 🆕 缓存统计卡片测试
│   │   └── 📄 HealthStatusCard.test.js # 🆕 健康状态卡片测试
│   └── 📁 integration/                # 集成测试
│       ├── 📄 api.test.js             # ✅ API集成测试
│       └── 📄 management.test.js       # 🆕 管理模块集成测试
└─── 📄 App.vue                        # ✅ 现有 - 主应用组件