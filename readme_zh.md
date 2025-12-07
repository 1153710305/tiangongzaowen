
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v2.7)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 稳定性优先 (Server Logger + Robust Error Handling) | 解耦优先 (Modular Router) | 资产化沉淀 (Structured Cards)

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构，并支持多用户登录、云端存档和全链路监控。

**v2.6 更新：引入“脑洞卡片 (Idea Cards)”系统，将创意生成过程结构化，支持收藏、管理和历史回溯。**

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
    *   **IdeaCard Table [NEW]**: 存储结构化的脑洞创意（Title, Intro, Highlights）。
*   **Prompt Engineering**: 强制模型输出 JSON 格式，便于前端解析。

### 2. 客户端 (Frontend) - 根目录
*   **UI 框架**: React 18 + Tailwind CSS。
*   **State**: 增加 `draftCards` 和 `savedCards` 状态管理。

---

## 🖥 服务器部署详细指南 (Server)

### 1. 数据库变更 (Schema Migration)
v2.6 自动新增 `idea_cards` 表：

```sql
CREATE TABLE IF NOT EXISTS idea_cards (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT, 
    content TEXT, -- JSON String: {intro, highlight, explosive_point, golden_finger}
    created_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```
此表设计优先考虑读取性能，将结构化详情打包为 JSON 存储，减少 Join 操作。

---

## 📖 使用说明书 (User Manual)

### 1. 创意生成与收藏 (NEW)
1.  在左侧选择“参数配置”、“脑洞发散”或“爆款仿写”模式点击生成。
2.  AI 会流式输出生成的 JSON 过程。
3.  生成结束后，系统自动解析并展示为 **“脑洞卡片”**。
4.  点击卡片下方的 **“收藏此脑洞”** 按钮，将其保存到云端。

### 2. 查看历史卡片
在左侧边栏顶部，点击 **“脑洞卡片库”** 切换视图，即可查看所有收藏的历史创意。

---

## 📝 版本历史 (Changelog)

**v2.7.3 (Stability Fix: Fetch Error)**
*   **Server**: 将 `GoogleGenAI` 客户端的初始化移动到 `POST /api/generate` 请求处理函数内部。这遵循了 SDK 的最佳实践，确保每次请求都使用最新的环境配置，解决了部分 Node 环境下因全局单例导致的 `fetch failed` 问题。
*   **Error Handling**: 增加了针对网络超时和连接失败的具体错误捕获，现在会返回 503 状态码并提示用户检查网络，而不是泛泛的 500 错误。

**v2.7.2 (Bug Fix: Auth/FK)**
*   **Server**: 修复了“Foreign Key constraint failed”错误。现在所有写入操作（存档、卡片、项目）前都会校验 Token 用户是否真实存在于数据库中，若不存在则返回 401。
*   **Client**: 增强了对 401 Unauthorized 错误的处理。当后端返回 401 时，前端会自动登出并弹出登录框，解决因服务端数据库重置导致的 Token 失效问题。

**v2.7.1 (Guest Mode UI)**
*   **UX**: 移除了强制登录限制，支持访客浏览主界面。
*   **UI**: 在侧边栏新增“登录/注册”按钮，点击后以模态框形式弹出认证表单。
*   **Logic**: 未登录状态下尝试生成内容或保存数据时，会自动触发登录弹窗。

**v2.7 (IDE Environment)**
*   **Architecture**: 引入 `Projects` (项目), `Chapters` (章节), `MindMaps` (思维导图) 三层关系模型。
*   **Performance**: 章节列表查询不再返回 content 字段，支持大文本量的正文管理。
*   **UI**: 新增 IDE 视图，支持侧边栏文件树导航和编辑区展示。

**v2.6 (Idea Cards)**
*   **Feature**: 创意生成结果结构化，不再是纯文本。
*   **DB**: 新增 `idea_cards` 表。
*   **UI**: 新增待选卡片展示区和侧边栏卡片库视图。

**v2.5.1 (Analysis Mode)**
*   **Feature**: 新增“爆款仿写/分析模式”。

*Powered by Google Gemini & Hono & SQLite*
