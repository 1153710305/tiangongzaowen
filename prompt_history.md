
# 提示词历史记录 (Prompt History)

> 记录每次代码迭代后固化的核心 Prompt 逻辑，便于回溯和优化。

## 版本 v2.5.1 (Analysis Mode)

### 功能变更
- **New Workflow Step**: 引入 `ANALYSIS_IDEA`。
- **Prompt Logic**: 
    - 接收 `references` 数组（Title, Intro）。
    - 指令 AI 扮演市场分析师，先完成 "Why it works?" 的逻辑拆解，再进行 "Generate New Ideas" 的创意裂变。
    - 强制要求保留“爆火基因”（如爽点节奏），但更换题材背景，避免直接抄袭。

## 版本 v2.5.0 (Admin Deep View)

### 架构变更
- **DB Optimization**: 为了响应“数据库表设计性能优先”的要求，我们保持了 `archives` 表的 Document Store (JSON) 结构，但在查询层面进行了拆分。
    - 列表查询 `getArchivesByUser`: 仅返回元数据，不解析庞大的 Content JSON。
    - 详情查询 `getArchiveById`: 仅在管理员点击详情时触发，加载并解析完整 JSON。
- **Admin UI**: 引入了更复杂的 Alpine.js 状态管理 (`detailTab`, `detailData`) 来处理全屏模态框的渲染逻辑。

## 版本 v2.4.4 (One-Liner Idea)

### 功能变更
- **Idea Generation**: `PROMPT_BUILDERS.IDEA` 逻辑升级。
- **Decoupling**: 新增了对可选参数 `context` 的处理。如果传入 `context`，则进入“灵感扩充模式”，忽略具体的流派/梗设置，专注于发散用户的核心句子；否则保持原有的“结构化生成模式”。

## 版本 v2.4.3 (UX Improvement)

### 功能变更
- **Auth Logic**: 修改 `authService.logout` 移除页面刷新，转而在 `App.tsx` 中手动重置状态（包括 `history`, `archives` 等）并设 `user` 为 null，以实现无缝返回登录页的 SPA 体验。

## 版本 v2.4.2 (Admin Archives)

### 功能变更
- **Admin Feature**: 在后台管理系统增加了查看用户存档的能力。
- **API Extension**: 新增 `GET /admin/api/users/:id/archives` 接口，该接口返回轻量级的存档数据（解析了 settings，移除了 history）。

## 版本 v2.4.1 (Hotfix)

### 修复日志
- **Bug Fix**: 修复了 `POST /api/archives` 接口在创建新存档时仅返回 ID，导致前端列表项缺少 Title 和 History 数据，进而引发渲染崩溃的问题。
- **优化**: 现在创建存档接口会返回完整的 Archive 对象（解包后的 JSON），前端在 `loadArchive` 时也增加了对 `history` 和 `settings` 的空值兜底保护。

## 版本 v2.4 (Admin Pro - User & API Lab)

### 架构变更
- **Admin UI 增强**: 引入了 Alpine.js 实现的更复杂的交互逻辑。
- **User IAM**: 后端数据库和 API 增加了管理员修改用户密码和创建用户的能力。
- **API Lab**: 在后台实现了一个纯前端的可视化 API 测试工具，支持自定义请求、Token注入和性能/Token估算。此功能完全解耦，不影响服务端核心性能。

### 提示词变更
无。本次更新专注于后台管理功能的深度开发。

## 版本 v2.3 (Refactor & Admin V2)

### 架构变更
- **路由解耦**: 将后台管理路由从 `index.ts` 抽离至 `server/admin_router.ts`，主服务文件更加清爽。
- **错误处理优化**: 修复了 JWT 鉴权失败导致 500 错误的 Bug，现在能正确返回 401 并在前端提示重登。
- **UI 增强**: 后台日志界面增加了**搜索**和**级别筛选**功能，方便在海量日志中定位错误。

### 提示词变更
无。本次更新专注于服务端架构和后台功能。

## 版本 v2.2 (Logger & Monitoring)

### 架构变更
- **日志系统**: 引入 `server/logger.ts`，实现请求级日志记录和全局错误捕获。
- **Admin UI 升级**: 后台界面增加「系统日志」标签页，支持实时轮询服务端日志。
- **稳定性**: 所有的 API 路由都增加了 try-catch 块，确保单一请求失败不会导致服务器崩溃。

## 版本 v2.1 (Admin Dashboard)

### 架构变更
- **后台管理**: 新增 `/admin` 路由，提供服务端渲染的轻量级后台页面。
- **文件结构**: 新增 `server/admin_ui.ts` 用于存放后台 HTML 模板，保持业务逻辑分离。
- **权限管理**: 引入基于 JWT 的角色验证 (role: 'admin' vs 'user')。

## 版本 v2.0 (Backend Separation)

### 架构变更
提示词逻辑已完全迁移至服务端 (`server/prompts.ts`)。前端不再通过 API 发送 raw prompt，而是发送意图 (Intent) 和参数。

### Prompt 优化
- **结构化输出**: 在 System Instruction 中强化了 Markdown 格式要求，确保流式输出在前端渲染时不乱码。
- **Context 注入**: 大纲和正文生成步骤增加了 Context 参数，允许将上一步的生成结果无损传入下一步。

## 版本 v1.0 (Initial)

### 系统指令 (System Instruction)
角色：资深网文主编 + 爆款写手
核心能力：
1. 捕捉热点（规则怪谈、神豪等）。
2. 黄金三章（Hook设计）。
3. 情绪价值（爽、甜、虐）。
4. 拒绝水文。

### 功能 Prompt 模板

#### 1. 创意脑暴 (Idea Generation)
**输入**: 流派、核心梗、主角类型、金手指、受众、**新增：基调**。
**目标**: 生成3个具有差异化的开篇脑洞。
**关键要求**: 包含【书名】、【一句话简介】、【核心爽点】、【开篇冲突】。

#### 2. 大纲生成 (Outline Generation)
**输入**: 选定的创意 + 设定。
**目标**: 生成前15章细纲。
**结构**:
- 前3章：背景+金手指+小高潮。
- 4-10章：世界观+反派。
- 11-15章：大高潮爆发。
- 11-15章：第一个大剧情的高潮爆发，主角获得巨大收获。
**关键要求**: 必须注明【本章爽点】和【结尾钩子】。

#### 3. 人设设计 (Character Design)
**输入**: 小说设定。
**目标**: 主角 + 核心配角 + 反派。
**关键点**: 姓名、外貌、性格、核心欲望、反差萌点。

#### 4. 正文写作 (Chapter Writing)
**输入**: 章节号、标题、本章大纲、文风。
**目标**: 2000字左右的正文。
**技巧**: 少废话，多感官描写，必须断章（悬念）。