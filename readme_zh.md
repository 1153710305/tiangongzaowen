
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v2.8)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 稳定性优先 (Server Logger + Robust Error Handling) | 解耦优先 (Modular Router) | 资产化沉淀 (Structured Cards)

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构，并支持多用户登录、云端存档和全链路监控。

**v2.8 更新：IDE 思维导图全功能上线。支持可视化节点编辑、增删改查及上下文感知的 AI 扩展。**

---

## 📚 目录 (Table of Contents)

1. [技术架构解析](#-技术架构解析)
2. [服务器部署详细指南 (Server)](#-服务器部署详细指南-server)
3. [后台管理系统 (Admin Dashboard)](#-后台管理系统-admin-dashboard)
4. [日志与监控 (Logging & Monitoring)](#-日志与监控-logging--monitoring)
5. [前端部署手册 (Client)](#-前端部署手册-client)
6. [使用说明书 (User Manual)](#-使用说明书-user-manual)

---

## 🛠 技术架构解析

为了实现极致的响应速度和扩展性，我们选用了以下技术栈：

### 1. 服务端 (Backend) - `server/`
*   **核心框架**: **Hono**。极速 Web 标准框架，TTFB (首字节时间) 极低。
*   **数据库**: **SQLite (better-sqlite3)**。
    *   **Archive Table**: 存储完整的小说生成历史。
    *   **IdeaCard Table**: 存储结构化的脑洞创意。
    *   **MindMaps Table**: 存储树状 JSON 结构的小说架构。采用 **WAL Mode** 并优化了查询策略（Listing 操作不查大 JSON 字段）。
*   **Prompt Engineering**: 针对思维导图扩展新增 `MIND_MAP_NODE` 模式，支持上下文引用。

### 2. 客户端 (Frontend) - 根目录
*   **UI 框架**: React 18 + Tailwind CSS。
*   **Component**: 新增 `MindMapEditor`，基于 Flexbox 实现递归树状图渲染。
*   **AI Integration**: 支持流式 Markdown 解析，将 AI 生成的列表实时转化为思维导图节点。

---

## 📊 日志与监控 (Logging & Monitoring)

### 全链路审计日志 (Audit Log)
v2.8 版本增强了 AI 生成接口的日志能力。每次 AI 请求（无论成功或失败）都会生成一条详细的日志，包含：
*   **API Key Masked**: 仅显示后四位，确保安全。
*   **Token Usage**: 包含 Prompt Token (输入) 和 Candidate Token (输出) 数量，便于成本核算。
*   **Full Context**: 完整的 System Instruction 和用户 Prompt。
*   **Full Response**: 完整的 AI 生成结果。
*   **Latency**: 接口响应总耗时。

这些日志可以在前端“系统日志”面板或 `/admin/logs` 接口查看。

---

## 🖥 服务器部署详细指南 (Server)

### 1. 数据库变更 (Schema Migration)
v2.8 完善了 `mind_maps` 表的 CRUD 操作。

```sql
CREATE TABLE IF NOT EXISTS mind_maps (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    title TEXT,
    data TEXT, -- JSON 结构: { root: MindMapNode }
    updated_at TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

## 📖 使用说明书 (User Manual)

### 1. IDE 创作模式 (Project IDE)
1.  **新建/进入项目**：从脑洞卡片转化或直接创建项目。
2.  **思维导图 (Mind Map)**：
    *   **画布操作** (v2.8.4 NEW)：
        *   **拖拽**：按住空白处拖动即可平移画布。
        *   **缩放**：滚动鼠标滚轮，或使用顶部工具栏的放大/缩小按钮。
    *   **节点操作**：
        *   **编辑**：双击节点修改文本。
        *   **移动** (v2.8.4 NEW)：拖拽节点到另一个节点上，即可将其移动为该节点的子节点。
        *   **操作**：悬停节点显示菜单，支持添加子节点、删除节点。
    *   **AI 扩展高级用法**：
        *   **上下文引用 (@)**：直接输入 `@`，选择**当前导图**中的其他节点。
        *   **跨文件引用 (:)**：输入 `:`，选择项目内的**其他思维导图**。
        *   **级联引用 (Cascade)**：先输入 `[参考导图:世界设定]` (通过 : 选择)，然后紧接着输入 `@`。此时下拉菜单会自动加载“世界设定”这张图里的所有节点供你选择！
        *   **场景示例**：在写“第一章剧情”时，引用 `[参考导图:世界设定]` 里的 `[引用:境界划分]` 节点，AI 就能写出符合设定的升级剧情。

---

## 📝 版本历史 (Changelog)

**v2.8.4 (Canvas Interactions)**
*   **UX**: 实现了思维导图画布的**无限平移 (Pan)** 和**缩放 (Zoom)** 功能。
*   **Feature**: 支持**节点拖拽重组 (Drag & Drop)**，可轻松调整思维导图结构。

**v2.8.3 (Cascading Context)**
*   **Feature**: 思维导图编辑器新增级联引用功能。支持 `[参考导图:XXX] @` 语法，动态加载外部导图的节点结构并注入 AI 上下文。

**v2.8.2 (Audit Logs)**
*   **Backend**: 强化 AI 接口日志，记录完整的请求/响应体、Token 消耗和 API Key 摘要，助力 Prompt 调试。

**v2.8.1 (Context Refinement)**
*   **UX**: 优化了 AI 扩展输入框的引用体验。使用 Shadow Div 实现了 `@` 和 `:` 菜单的精确跟随。
*   **Feature**: 新增 `:` 语法，支持跨文件引用其他思维导图的结构。

**v2.8 (Mind Map Editor)**
*   **Feature**: 思维导图可视化编辑器。支持递归渲染、节点拖拽(UI基础)、增删改。
*   **AI**: 节点级 AI 扩展功能。支持使用 `@` 符号引用导图中的其他节点作为 Context。
*   **Backend**: 完善了 `mind_maps` 的 PUT/DELETE 接口。
*   **Schema**: 数据库 `mind_maps` 表结构定型，data 字段采用大 JSON 存储以优化单次读取性能。

**v2.7.4 (Hotfix: DB Export)**
*   **Server**: 修复了 `server/db.ts` 中 `createProject` 等函数未正确导出导致 `db.createProject is not a function` 错误的问题。

**v2.7.3 (Stability Fix: Fetch Error)**
*   **Server**: 优化 `GoogleGenAI` 初始化逻辑，修复 `fetch failed`。

**v2.7 (IDE Environment)**
*   **Architecture**: 引入项目、章节、思维导图三层结构。

*Powered by Google Gemini & Hono & SQLite*