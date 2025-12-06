
# 提示词历史记录 (Prompt History)

> 记录每次代码迭代后固化的核心 Prompt 逻辑，便于回溯和优化。

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
