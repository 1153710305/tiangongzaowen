

# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v2.1 Auth+DB)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 数据安全优先 (服务端 Prompt 管理 + JWT 鉴权)

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构，并支持多用户登录和云端存档。

---

## 📚 目录 (Table of Contents)

1. [技术架构解析](#-技术架构解析)
2. [服务器部署详细指南 (Server)](#-服务器部署详细指南-server)
3. [前端部署手册 (Client)](#-前端部署手册-client)
4. [使用说明书 (User Manual)](#-使用说明书-user-manual)

---

## 🛠 技术架构解析

为了实现极致的响应速度和扩展性，我们选用了以下技术栈：

### 1. 服务端 (Backend) - `server/`
*   **核心框架**: **Hono**。极速 Web 标准框架，TTFB (首字节时间) 极低。
*   **数据库**: **SQLite (better-sqlite3)**。基于 C++ 的高性能进程内数据库，开启 **WAL 模式** 后，并发读写性能极佳，且无网络延迟，非常适合存档系统。
*   **鉴权**: **JWT (JSON Web Token)**。无状态认证，服务端无需查找 Session，验证速度极快。
*   **AI 交互**: Gemini API 流式响应。

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
    ├── db.ts          (数据库层)
    ├── data.ts        (素材池)
    ├── prompts.ts     (提示词)
    └── types.ts       (类型定义)
```

### 2. 部署步骤

#### 第一步：安装环境
服务器需安装 Node.js (v18+) 和 Python/Build Tools (用于编译 sqlite3，大部分 Linux 发行版自带)。

#### 第二步：初始化与安装
在 `skycraft-server` 目录下：

```bash
npm init -y

# 安装依赖 (新增 better-sqlite3)
npm install hono @hono/node-server @google/genai better-sqlite3 dotenv tsx
# 可选：安装 Typescript 类型
npm install --save-dev @types/better-sqlite3 @types/node
```

#### 第三步：设置环境变量
```bash
# 必须配置 JWT_SECRET 用于签名 Token
export API_KEY="your_google_api_key_here"
export JWT_SECRET="your_secure_random_string" 
export PORT=3000
```

#### 第四步：启动服务
```bash
npx tsx server/index.ts
```

启动后，系统会自动创建 `skycraft.db` 数据库文件并初始化表结构。

---

## 💻 前端部署手册 (Client)

前端部署流程与之前一致，但需要确保后端 API 地址正确。

1.  修改 `constants.ts` 或环境变量 `VITE_API_BASE_URL` 指向后端。
2.  `npm run build`
3.  上传 dist 目录到 Nginx。

---

## 📖 使用说明书 (User Manual)

### 1. 注册与登录
访问首页，系统会弹出登录框。首次使用请直接输入用户名密码点击 **"注册账号"**。
*注意：演示版密码使用明文存储模拟 Hash，生产环境请自行接入 bcryptjs。*

### 2. 存档管理
*   **新建**: 点击左侧边栏的 "+ 新建"。
*   **保存**: 修改标题后点击 "保存" 按钮，或每次 AI 生成完成后，系统会自动保存最新进度。
*   **加载**: 点击左侧列表中的任意存档即可秒级恢复现场。

### 3. AI 创作
流程与之前一致：创意 -> 大纲 -> 人设 -> 正文。所有生成的历史记录都会被持久化保存到当前存档中。

---

*Powered by Google Gemini & Hono & SQLite*
