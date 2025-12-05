
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v2.5.0)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 稳定性优先 (Server Logger + Robust Error Handling) | 解耦优先 (Modular Router)

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构，并支持多用户登录、云端存档和全链路监控。

**v2.5.0 更新：后台管理系统深度查阅功能，支持可视化查看小说参数与生成历史流。**

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
*   **路由解耦**: 使用 `adminRouter` (`server/admin_router.ts`) 独立管理后台逻辑，不影响主业务。
*   **数据库**: **SQLite (better-sqlite3)**。基于 C++ 的高性能进程内数据库，开启 **WAL 模式** 后，并发读写性能极佳。
    *   **优化策略**: 列表查询与大文本详情查询分离，防止内存溢出。
*   **日志系统**: 自研内存环形缓冲日志 (`server/logger.ts`)。支持控制台彩色输出 + 后台界面实时搜索/筛选。
*   **鉴权**: **JWT**。无状态认证，服务端无需查找 Session。
*   **管理后台**: **SSR + Alpine.js**。服务端直接返回 HTML 页面，配合 Alpine.js 实现复杂的前端交互（如 API 测试、弹窗），无需编译步骤。

### 2. 客户端 (Frontend) - 根目录
*   **UI 框架**: React 18 + Tailwind CSS。
*   **状态管理**: 本地乐观更新策略，操作顺滑无卡顿。

---

## 🖥 服务器部署详细指南 (Server)

### 1. 服务器目录结构

请在远程服务器创建文件夹 `skycraft-server`：

```
skycraft-server/
├── package.json       (必须)
├── skycraft.db        (自动生成) SQLite 数据库文件
└── server/            (代码目录)
    ├── index.ts       (入口)
    ├── admin_router.ts(后台路由-增强)
    ├── db.ts          (数据库层-增强)
    ├── data.ts        (素材池)
    ├── logger.ts      (日志系统)
    ├── prompts.ts     (提示词)
    ├── admin_ui.ts    (后台模板-增强)
    └── types.ts       (类型定义)
```

### 2. 部署步骤

#### 第一步：安装环境
服务器需安装 Node.js (v18+) 和 Python/Build Tools。

#### 第二步：初始化与安装
在 `skycraft-server` 目录下：

```bash
npm init -y
npm install hono @hono/node-server @google/genai better-sqlite3 dotenv tsx
npm install --save-dev @types/better-sqlite3 @types/node
```

#### 第三步：设置环境变量
```bash
export API_KEY="your_google_api_key_here"
export JWT_SECRET="your_secure_random_string" 
export PORT=3000
export ADMIN_PASSWORD="your_admin_password" # 后台密码
```

#### 第三步：启动服务
```bash
npx tsx server/index.ts
```

---

## 🛡 后台管理系统 (Admin Dashboard)

访问地址: `http://你的服务器IP:3000/admin`

**主要功能模块：**

1.  **Dashboard (概览)**
    *   实时监控注册用户总数。
    *   查看累计生成的存档数量。
    *   服务器运行状态（DB模式、API健康度）。

2.  **Users (用户管理) - [NEW]**
    *   **用户列表**: 查看所有注册用户。
    *   **新增用户**: 管理员可手动创建测试账号。
    *   **存档审计**: 点击“存档”按钮可查看该用户的所有小说项目。
    *   **[v2.5] 深度详情**: 在存档列表中点击“详情”，弹出全屏模态框。
        *   **参数设定**: 查看该书的流派、基调、核心梗等 JSON 配置。
        *   **内容流**: 以时间轴方式阅读所有历史记录（包括大纲、人设、正文）。
    *   **违规处理**: 级联删除用户及其所有存档数据。

3.  **Logs (系统日志)**
    *   **实时流**: 支持自动轮询。
    *   **高级筛选**: 支持按日志级别 (INFO/WARN/ERROR) 和关键词筛选。
    *   **堆栈追踪**: 发生 Error 时，支持展开查看 Stack Trace。

4.  **API Lab (实验室) - [NEW]**
    *   **可视化测试**: 内置类似 Postman 的调试界面。
    *   **模板预设**: 包含登录、生成、存档详情等接口预设。
    *   **性能分析**: 显示请求耗时 (Time) 和状态码。
    *   **成本估算**: 自动估算 Token 消耗量（基于字符数折算）。
    *   **鉴权注入**: 一键将 Admin Token 注入请求头，方便测试受保护接口。

---

## 📊 日志与监控 (Logging & Monitoring)

我们设计了一套轻量但强大的日志系统，位于 `server/logger.ts`。

### 开发者排查指南
1.  **控制台输出**: 
    *   所有请求都会打印 `METHOD URL - STATUS (TIMEms)`。
    *   ERROR 级别会红色高亮。
2.  **全局错误捕获**: 
    *   `server/index.ts` 中配置了全局 `onError` 钩子。
    *   JWT 鉴权失败会返回 401 而不是 500。
    *   未捕获异常会记录完整堆栈并在后台 Logs 面板显示。

---

## 📖 使用说明书 (User Manual)

### 1. 注册与登录
访问首页，系统会弹出登录框。首次使用请直接输入用户名密码点击 **"注册账号"**。

### 2. 创作模式 (v2.4.4 新增)
系统现在支持两种创作模式：
*   **参数配置模式**：适合新手，通过选择流派、核心梗、主角类型等参数，由 AI 自动生成脑洞。
*   **一句话脑洞模式**：适合有灵感的作者，输入一句话核心创意（如“主角是只猫，统治了宇宙”），AI 会基于此进行专业扩充。

### 3. AI 创作流程
创意 -> 大纲 -> 人设 -> 正文。

### 4. 存档管理
*   **新建**: 点击左侧边栏的 "+ 新建"。
*   **保存**: 修改标题后点击 "保存" 按钮，或每次 AI 生成完成后，系统会自动保存最新进度。

---

## 📝 版本历史 (Changelog)

**v2.5.0 (Admin Deep View)**
*   **Database**: 新增 `getArchiveById` 高性能查询接口，优化大文本读取策略。
*   **Admin UI**: 新增存档详情模态框，支持 Tabs 切换查看 Settings 和 Content History。

**v2.4.4 (One-Liner Idea)**
*   **Feature**: 新增“一句话生成创意脑洞”功能，允许用户输入非结构化灵感。
*   **UI**: 侧边栏配置区增加 Tab 切换。

**v2.4.2 (Admin Archives)**
*   **Feature**: 后台管理系统新增“查看用户存档”功能。
*   **API Extension**: 新增 `GET /admin/api/users/:id/archives` 接口。

*Powered by Google Gemini & Hono & SQLite*
