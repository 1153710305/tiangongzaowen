
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v2.2 Admin+Auth+DB)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 数据安全优先 (服务端 Prompt 管理 + JWT 鉴权)

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构，支持多用户登录、云端存档及**后台管理热更新**。

---

## 📚 目录 (Table of Contents)

1. [技术架构解析](#-技术架构解析)
2. [服务器部署详细指南 (Server)](#-服务器部署详细指南-server)
3. [前端部署手册 (Client)](#-前端部署手册-client)
4. [使用说明书 (User Manual)](#-使用说明书-user-manual)
5. [管理员功能 (Admin Features)](#-管理员功能-admin-features)

---

## 🛠 技术架构解析

为了实现极致的响应速度和扩展性，我们选用了以下技术栈：

### 1. 服务端 (Backend) - `server/`
*   **核心框架**: **Hono**。极速 Web 标准框架，TTFB (首字节时间) 极低。
*   **数据库**: **SQLite (better-sqlite3)**。开启 **WAL 模式**，并发读写性能极佳，无网络延迟。
*   **权限管理**: **JWT** 无状态认证 + **RBAC** (Role-Based Access Control) 角色管理。
*   **热更新**: 素材池数据存储在内存中，支持通过 Admin API 实时修改，无需重启服务。

### 2. 客户端 (Frontend) - 根目录
*   **UI 框架**: React 18 + Tailwind CSS。
*   **Admin Dashboard**: 内置管理后台，懒加载渲染，不影响普通用户体验。

---

## 🖥 服务器部署详细指南 (Server)

### 1. 服务器目录结构

请在远程服务器创建文件夹 `skycraft-server`：

```
skycraft-server/
├── package.json
├── skycraft.db        (自动生成) 
└── server/
    ├── index.ts       (入口)
    ├── db.ts          (数据库层 - 自动迁移)
    ├── data.ts        (可变素材池)
    ├── prompts.ts     (提示词)
    └── types.ts       (类型定义)
```

### 2. 部署步骤

#### 第一步：安装环境 (Node 18+)
```bash
npm init -y
npm install hono @hono/node-server @google/genai better-sqlite3 dotenv tsx
npm install --save-dev @types/better-sqlite3 @types/node
```

#### 第二步：启动服务
```bash
export API_KEY="your_api_key"
export JWT_SECRET="secure_secret"
npx tsx server/index.ts
```
系统启动时会自动创建数据库并执行 Migration，为旧表添加字段。

---

## 💻 前端部署手册 (Client)
(同上个版本，无需特殊变更，只需确保 API 地址正确)

---

## 📖 使用说明书 (User Manual)
1. **注册/登录**: 支持多用户隔离。
2. **创作**: 创意 -> 大纲 -> 人设 -> 正文。
3. **存档**: 自动保存进度，云端同步。

---

## 🛡 管理员功能 (Admin Features)

### 如何成为管理员？
系统采用 **"首位即皇" (First-User-Admin)** 策略：
**数据库初始化后，第一个注册的用户将自动获得超级管理员 (Admin) 权限。**

### 后台功能
登录管理员账号后，侧边栏会出现红色 **"ADMIN"** 按钮，点击进入后台：
1.  **系统监控**: 实时查看注册用户数、存档总量、数据库体积。
2.  **素材池热更新**:
    *   内置 JSON 编辑器，可直接修改爆款素材库（如新增一种“流派”或“金手指”）。
    *   点击“保存并热更新”后，更改立即生效，所有前端用户下一次点击“随机生成”时即可看到新内容。
    *   **优势**: 运营人员调整内容策略无需技术人员介入重启服务器。

---

*Powered by Google Gemini & Hono & SQLite*
