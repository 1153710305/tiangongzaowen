
# 提示词历史记录 (Prompt History)

> 记录每次代码迭代后固化的核心 Prompt 逻辑，便于回溯和优化。

## 版本 v2.8 (Mind Map AI Expansion)

### 功能变更
- **New Workflow Step**: `MIND_MAP_NODE`。
- **Context Injection**: 
    - **Local**: 支持通过 `[引用:NodeName]` 注入当前导图的局部结构。
    - **Global**: 支持通过 `[参考导图:MapName]` 注入项目内其他导图的全局摘要（需要前端异步 Fetch 数据）。
- **Output Format**: 强制要求输出 Markdown List (`- content` 或 `  - content`)，以便前端正则解析器能将其转化为递归的树状 JSON 结构。

## 版本 v2.7 (IDE Structure Support)

### 架构变更
- 引入了 `createProjectFromCard` 接口，虽然目前没有修改 AI Prompt，但后端数据库结构已调整为支持 IDE 模式。
- 后续版本 (v2.8+) 将引入针对 IDE 内 `MindMap` 和 `Chapter` 的精细化 AI 编辑 Prompt。

## 版本 v2.6 (Idea Cards Structure)

### 功能变更
- **JSON Enforcement**: `IDEA` 和 `ANALYSIS_IDEA` 提示词发生重大变更。
    - **旧逻辑**: 输出 Markdown 列表。
    - **新逻辑**: 强制输出严格的 JSON 数组字符串，不包含 Markdown 标记。
    - **字段映射**: 明确要求返回 `title`, `intro`, `highlight`, `explosive_point`, `golden_finger` 五个核心字段。
- **Rationale**: 为了实现前端“脑洞卡片”的可视化和数据库结构化存储，必须让 LLM 充当结构化数据生成器的角色。

## 版本 v2.5.1 (Analysis Mode)

### 功能变更
- **New Workflow Step**: 引入 `ANALYSIS_IDEA`。
- **Prompt Logic**: 
    - 接收 `references` 数组（Title, Intro）。
    - 指令 AI 扮演市场分析师，先完成 "Why it works?" 的逻辑拆解，再进行 "Generate New Ideas" 的创意裂变。
