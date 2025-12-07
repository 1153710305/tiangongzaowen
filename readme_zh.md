
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v2.9)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 稳定性优先 (Server Logger + Robust Error Handling) | 解耦优先 (Modular Router) | 资产化沉淀 (Structured Cards)

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构，并支持多用户登录、云端存档和全链路监控。

**v2.9.1 更新：正文 IDE 升级。新增智能引用系统、正文 AI 续写及流式章节编辑功能。**

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
    *   **Chapters Table**: 存储小说正文。**NEW**: 更新操作实现了原子化，列表查询不含正文内容以保证性能。
*   **Prompt Engineering**: 针对思维导图扩展新增 `MIND_MAP_NODE` 模式，针对正文新增 `CHAPTER` 上下文注入模式。

### 2. 客户端 (Frontend) - 根目录
*   **UI 框架**: React 18 + Tailwind CSS。
*   **Component**: 
    *   `MindMapEditor`: 可视化递归树状图编辑器。
    *   `ChapterEditor`: **NEW** 智能正文编辑器，支持 Shadow DOM 光标追踪。
*   **AI Integration**: 支持流式 Markdown 解析，支持多资源上下文并发抓取。

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
v2.9 完善了 `chapters` 表的 CRUD 操作。

```sql
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    title TEXT,
    content TEXT, -- 存储大文本
    order_index INTEGER,
    updated_at TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

## 📖 使用说明书 (User Manual)

### 1. IDE 创作模式 (Project IDE)
1.  **新建/进入项目**：从脑洞卡片转化或直接创建项目。
2.  **思维导图 (Mind Map)**：
    *   **布局切换**：支持逻辑结构图、组织结构图、时间轴视图。
    *   **画布操作**：支持无限拖拽、缩放、主题切换。
3.  **正文卷宗 (Chapters) - NEW**：
    *   **智能引用**：
        *   输入 `:` ：弹出资源菜单，可选择引用其他**章节**或**思维导图**。
        *   输入 `@` ：**级联引用**。在输入 `[参考导图:xxx]` 后紧跟 `@`，可进一步选择该导图内的具体**节点**。
    *   **AI 续写**：点击“AI 续写”时，系统会自动扫描文中的引用标签（如 `[引用节点:xxx]`），自动抓取对应的内容作为上下文发送给 AI，实现精准的设定一致性写作。

---

## 📝 版本历史 (Changelog)

**v2.9.1 (Chapter Editor)**
*   **Feature**: 正文编辑器升级。支持 `:` 和 `@` 触发的智能上下文引用。
*   **Feature**: 章节增删改查 (CRUD) 完整支持。
*   **AI**: 正文续写支持解析引用标签，自动注入设定资料。

**v2.9 (Layout Engine)**
*   **Feature**: 思维导图引入布局引擎，支持逻辑图(Right)、组织图(Down)、时间轴(Timeline)等多种结构切换。
*   **UI**: 新增赛博朋克(Cyberpunk)和复古(Retro)主题。

*Powered by Google Gemini & Hono & SQLite*
