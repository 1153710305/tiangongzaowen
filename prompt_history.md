
# 提示词历史记录 (Prompt History)

> 记录每次代码迭代后固化的核心 Prompt 逻辑，便于回溯和优化。

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
