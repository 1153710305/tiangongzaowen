
# 提示词历史记录 (Prompt History)

> 记录每次代码迭代后固化的核心 Prompt 逻辑，便于回溯和优化。

## 版本 v2.9.6 (Idea Card UI Polish)

### 功能变更
- **Idea Card UI**: 
    - 重构了前端脑洞卡片 (`AppMainContent.tsx`) 的渲染逻辑。
    - 将卡片内容拆分为“简介”、“开局爆点”、“核心爽点”、“金手指”四个独立模块，每个模块配有专用图标和背景色。
    - 修复了 `explosive_point` 字段未在界面显示的 Bug。
    - 优化了卡片的高度和滚动体验，使其在移动端和桌面端都能完整展示长文本。

## 版本 v2.9.5 (UI Polish)

### 功能变更
- **Model Switching**: 后端接口 `/api/generate` 新增可选参数 `model`。思维导图编辑器现允许用户针对复杂的扩展任务选择性能更强的 `Gemini 3 Pro` 模型，而默认为 `Gemini 2.5 Flash` 以保持速度。
- **User Instruction**: 在 UI 层面显式增加了关于触发智能引用（`:` 和 `@`）以及换行操作的文本提示，降低用户学习成本。

## 版本 v2.9.4 (Context Injection)

### 功能变更
- **Mind Map AI Context**:
    - **Local Node Reference**: 在思维导图 AI 扩展弹窗中，输入 `@` 时，如果没有前置的 `[参考导图:...]` 标签，系统将自动加载**当前导图**的所有节点供用户选择。
    - **Optimization**: 当引用的是当前导图的节点时（`[引用节点:MapID:NodeID]` 中 MapID 等于当前 ID），前端将直接从内存中的 `rootNode` 提取最新结构数据并序列化，避免了 API 请求带来的延迟和数据即时性问题。

## 版本 v2.9.3 (Interaction Polish)

### 功能变更
- **Mind Map Undo/Redo**:
    - 在 `MindMapEditor` 中引入了 `history` (历史栈) 和 `future` (重做栈) 状态管理。
    - 封装了 `updateMapState` 函数，将所有节点操作（增删改、移动、折叠、AI 生成）统一收口。该函数负责快照当前状态、清空重做栈并触发自动保存。
    - 实现了撤销 (`handleUndo`) 和重做 (`handleRedo`) 逻辑，且这两个操作也会触发自动保存 (`triggerAutoSave`)，确保后端数据的一致性。
    - 添加了快捷键支持：`Ctrl+Z` (Undo) 和 `Ctrl+Y` (Redo)，并在工具栏新增了对应的图标按钮。
- **Mind Map UX**: 
    - 修复了画布 `canvasRef` 缺失导致自动聚焦失效的 Bug。
    - 新增 `editingNodeId` 状态流，实现新建节点后自动进入文字编辑模式。
    - 优化了新建节点的视觉反馈：点击添加 -> 视角平滑移至新节点 -> 自动选中 -> 自动弹出输入框。

## 版本 v2.9.2 (UX Optimization)

### 功能变更
- **Mind Map Auto-Focus**: 
    - 优化了新建节点时的交互体验。通过在 `NodeContent` 组件中注入唯一的 DOM ID (`node-content-${id}`)，实现了画布视角精确跳转到节点文字内容的中心，而非整个子树的几何中心。
    - 引入 `requestAnimationFrame` 确保在 DOM 重排（Reflow）完成后再进行坐标计算，解决了复杂布局下定位偏移的问题。
- **Node Styling**: 进一步精简了普通节点的样式，默认采用 `whitespace-nowrap` 强制单行显示，仅在字数超长时换行，并降低了背景和边框的视觉权重，让用户聚焦于内容。

## 版本 v2.9 (Layout Support)

### 功能变更
- **Visualization**: 虽然 AI Prompt 本身没有变动，但前端渲染引擎 (`NodeRenderer`) 进行了重构，以支持不同的 CSS Flexbox 布局（`row` vs `col`）来呈现不同的思维导图结构。
- **Context**: 布局信息的变更（如从逻辑图变为时间轴）目前仅保存在前端状态中，暂未持久化到 `data` JSON 字段（目前只保存 `root` 节点）。后续版本可考虑将 `layout` 字段一并存入数据库，以便重新打开时恢复视图。

## 版本 v2.8 (Mind Map AI Expansion)

### 功能变更
- **New Workflow Step**: `MIND_MAP_NODE`。
- **Context Injection**: 
    - **Local**: 支持通过 `[引用:NodeName]` 注入当前导图的局部结构。
    - **Global**: 支持通过 `[参考导图:MapName]` 注入项目内其他导图的全局摘要。
    - **Cascading (v2.8.3)**: 
        - 逻辑：当同时检测到 `[参考导图:MapA]` 和 `[引用:NodeB]` 时，系统会优先在 `MapA` 中查找 `NodeB` 的结构数据。
        - 目的：实现跨文件的细粒度引用（如引用“世界观设定”文件中的“魔法等级”节点）。
- **Output Format**: 强制要求输出 Markdown List (`- content` 或 `  - content`)，以便前端正则解析器能将其转化为递归的树状 JSON 结构。
- **Canvas UI (v2.8.4)**: 新增了画布平移、缩放和节点拖拽的纯前端交互逻辑。此部分不涉及后端 Prompt 变更。

### 审计与调试
- **Log**: 现已在后台日志中完整记录 `MIND_MAP_NODE` 步骤的完整 Prompt（含注入后的 Context）和 Token 消耗，用于排查“上下文窗口溢出”或“指令不遵循”问题。

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
