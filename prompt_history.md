
# 提示词历史记录 (Prompt History)

> 记录每次代码迭代后固化的核心 Prompt 逻辑，便于回溯和优化。

## 2025-12-09 UX Update
前端左侧菜单栏可折叠；
如果用户未打开前端页面查看过最新公告，则打开页面时，默认弹出公告，公告页面更简洁好看些，提升用户体验；
登陆后，用户可以在网页查看自己的信息；
增强用户的小说作品库的回收站功能，最多保存一个月的小说项目记录，并在前端显示剩余天数；

## 版本 v3.3.1 (Proxy Fixes)

### 功能变更
- **Development Environment**:
    - **Vite Proxy**: 修复了本地开发环境下的代理配置问题。
        - 移除了 `vite.config.ts` 中的固定端口 3000，允许 Vite 自动选择可用端口（通常为 5173），避免与后端服务端口冲突。
        - 新增了 `/api` 和 `/admin` 的反向代理配置，将请求转发至 `http://localhost:3000`，解决了本地浏览器无法获取商品信息和用户数据的问题。
    - **User Experience**:
        - 解决了因 API 请求 404 导致的用户状态显示异常（如已登录但无法加载数据）的问题。

## 版本 v3.3.0 (API Lab & Localization Optimization)

### 功能变更
- **Mind Map Editor Fixes**:
    - 修复了思维导图“添加节点”点击无反应的问题。
    - 增加了 `generateUUID` 兼容性处理，防止在非安全上下文下 `crypto.randomUUID` 报错导致程序崩溃。
    - 增强了节点操作的日志输出，便于排查问题。
- **API Laboratory (Admin)**:
    - 在 **后台管理系统 (Admin Dashboard)** 中集成可视化 API 实验室。
    - 提供 API 文档浏览、参数调试与性能监控中心。
    - 支持模拟指定用户身份进行接口测试。
- **Localization Refinement**:
    - 优化了本地化策略，精简支持语言为：**简体中文**、**English (US)**、**日本語**。
    - 移除了设置面板中的 **主题 (Theme)** 和 **字体 (Font)** 自定义选项，统一 UI 风格体验，降低维护复杂度。

## 版本 v3.2.1 (Admin Power-Up)

### 功能变更
- **User Management**:
    - **Edit User**: 管理员可以直接修改用户的 Tokens 数量。
    - **VIP Control**: 管理员可以设置用户的 VIP 过期时间（支持 +30天 / +1年 快捷操作），或取消 VIP。
- **System Configurations**:
    - **Initial Tokens**: 在后台“系统设置”中配置新用户注册时默认赠送的 Tokens 数量。
    - **Product Plans**: 提供 JSON 编辑器直接配置 `product_plans`，支持灵活调整月卡、季卡、加油包等商品属性。
    - **VIP Models**: 在模型配置中显式标记 `isVip`，控制哪些模型仅供会员使用。

## 版本 v3.2.0 (Community & Safety)

### 功能变更
- **Recycle Bin (Project Safety)**:
    - 数据库 `projects` 表新增 `deleted_at` 字段。
    - 修改 API `DELETE /api/projects/:id` 为软删除（更新时间戳）。
    - 新增 API `POST /api/projects/:id/restore` 用于恢复项目。
    - 新增 API `DELETE /api/projects/:id/permanent` 用于彻底物理删除。
    - 后端启动时运行 `db.cleanupRecycleBin()`，物理删除超过 30 天的记录。
- **Community Features**:
    - **Guestbook**: 用户可提交留言，管理员后台回复。数据结构包含 `reply` 和 `reply_at` 字段。
    - **Announcements**: 管理员发布公告，前端侧边栏展示。
- **UI Updates**:
    - `ProjectListModal` 增加 Tab 切换（进行中/回收站）。
    - 侧边栏增加留言和公告入口。

## 版本 v3.1.0 (Membership & Economy)

### 功能变更
- **Token System**:
    - 引入了 `tokens` 概念，对标 Model 消耗的 Token 数。
    - 后端 `/api/generate` 在流式生成结束后，解析 Gemini 的 `usageMetadata`，精确扣除用户代币。
    - 数据库新增 `user_transactions` 表，完整记录每一次生成消耗、充值入账流水。
- **Membership (VIP)**:
    - 用户表新增 `vip_expiry` 字段。
    - 模型配置 (`ai_models` config) 新增 `isVip` 属性。
    - 后端拦截逻辑：若请求的模型标记为 `isVip=true`，且用户非 VIP（或已过期），直接拒绝请求并返回 403。
- **Economy UI**:
    - 新增 `PricingModal` 组件，展示月卡、季卡、加油包等商品。
    - 侧边栏实时展示用户 Token 余额和 VIP 身份徽章。
    - 模型选择器自动识别 VIP 模型，为非会员用户提供弹窗提示。

## 版本 v3.0.0 (Key Pool & Stats)

### 功能变更
- **Key Rotation Logic**: 
    - 废弃了对环境变量 `API_KEY` 的单一依赖（仅作为初始化 fallback）。
    - 实现了 `getNextAvailableApiKey` 函数，逻辑为 `SELECT * FROM api_keys WHERE is_active=1 ORDER BY last_used_at ASC LIMIT 1`。这确保了在多个 Key 之间进行最久未使用（LRU）轮询，有效降低触发 Google API Rate Limit 的概率。
- **Statistics**: 
    - 每次 AI 请求结束后，异步调用 `updateApiKeyStats`，原子化更新该 Key 的 `usage_count`, `total_tokens` 和 `total_latency_ms`。
- **Model Configuration**:
    - 将模型配置从纯 JSON 字符串升级为支持 `isActive` 字段的对象数组。
    - 后端 `/api/config/models` 接口现在会过滤掉 `isActive: false` 的模型，实现了前端模型列表的动态上下线。

## 版本 v2.9.8 (Localization)

### 功能变更
- **Global Settings Context**: 创建了 `SettingsContext.tsx`，通过 React Context API 管理全局的 `language`, `theme`, `fontFamily` 状态，并自动持久化到 `localStorage`。
- **Translation System**: 实现了一个轻量级的 i18n 字典，包含中、英、葡、西、越、泰、印尼七种语言的 UI 文本映射。
- **Theme Engine**:
    - 扩展了 Tailwind 配置，支持通过 `data-theme` 属性或 body class 切换主题。
    - 实现了 `theme-midnight` 和 `theme-forest` 的 CSS 变量动态注入，允许在不重载页面的情况下改变整个应用的色调。
- **Typography**: 引入了 Google Fonts 的多语言字体包（包括 Noto Sans SC/TC/Thai, Ma Shan Zheng 等），并根据用户选择动态修改 `body.style.fontFamily`。

## 版本 v2.9.7 (Mind Map AI Config)

### 功能变更
- **Mind Map Editor AI**: 
    - **Prompt Configuration**: 在思维导图节点的 AI 扩展弹窗中，新增了三个预设输入字段：
        1. **身份设定 (System)**: 允许用户指定 AI 的角色（例如：“资深架构师”、“反派设计专家”）。
        2. **约束条件 (Constraint)**: 允许用户添加必须遵守的规则（例如：“禁止生成超过3个子节点”、“风格必须黑暗压抑”）。
        3. **常用指令 (Normal)**: 提供快捷插入常用 Prompt 的功能（例如：“生成5个分支”、“补充细节设定”）。
    - **Prompt Construction**: 前端在发送请求前，会自动将用户选择的“身份设定”和“约束条件”拼接到最终的 Prompt 文本中，格式为 `【身份设定】:...\n` 和 `【强制约束】:...\n`，确保后端模型能接收到完整的上下文指令。

## 版本 v3.5.0 (Platform Styles)

### Prompt Logic Updates
- **网文平台风格适配 (IDEA Prompt)**:
    - **Context**: 用户在创建脑洞时，可以选择目标发布平台（番茄、起点、晋江、飞卢、知乎、七猫）。
    - **Logic**: Prompt Builder 会根据选择的平台，注入特定的“主编人设”和“生成要求”。
    - **Prompt Snippet**:
```javascript
// 当选择了 "番茄" 平台
const platform = '番茄';
const guide = `
**平台风格参考**：
- 番茄：节奏极快，脑洞大，情绪价值高，书名直白吸睛（如《开局...》、《我能...》）。
...
**生成要求**：
1. **书名**：必须符合"${platform}"平台的取名套路。
2. **简介**：必须符合"${platform}"平台的简介风格。
3. **爽点/爆点**：必须精准击中"${platform}"读者的核心爽点。
`
```

## Response 5
**User Request**: 当在AI扩展思维导图和AI续写正文的时候，选择的身份设定暂时替换systemInstruction。执行完再换回默认的systemInstruction。

**Action Taken**:
1.  Modified `server/index.ts` to accept `systemInstruction` in `/api/generate` request body and use it if present.
2.  Updated `services/geminiService.ts` to support the new parameter in `generateStream`.
3.  Updated `components/MindMapEditor.tsx` to pass the selected identity as `systemInstruction` instead of prepending it to the user prompt.
4.  Updated `components/ChapterEditor.tsx` to pass the selected identity as `systemInstruction` instead of prepending it to the user prompt.
