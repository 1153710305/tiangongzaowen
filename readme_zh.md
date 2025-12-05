
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版

> **架构理念**: 响应速度优先 (Hono + Streaming) | 数据安全优先 (服务端 Prompt 管理) | 体验优先 (React + Tailwind)

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构。

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
*   **核心框架**: **Hono**。Hono 是目前 Node.js 生态中最快的 Web 框架之一，极简且高性能，完美支持 Edge Runtime。
*   **AI 交互**: 直接对接 Google Gemini API，采用 **Streaming (流式响应)** 技术。这意味着 AI 生成一个字，前端就显示一个字，极大降低了用户的等待焦虑。
*   **资产管理**: 所有的 Prompt（提示词）、素材库（梗、人设）均硬编码在服务端内存中，前端无法直接查看，保护您的 Prompt 知识产权。

### 2. 客户端 (Frontend) - 根目录
*   **UI 框架**: React 18 + Tailwind CSS。
*   **通信协议**: 标准 REST API。前端只发送“意图”（例如：生成大纲），具体的“咒语”（Prompt）由后端拼接。

---

## 🖥 服务器部署详细指南 (Server)

### 1. 服务器目录结构

在您的远程服务器上，请创建一个名为 `skycraft-server`（或任意名称）的文件夹，并保持以下文件结构。**注意：服务端是完全独立的，不需要前端文件。**

```
skycraft-server/
├── package.json       (必须) 用于安装依赖
├── tsconfig.json      (可选) 如果您需要自定义TS配置
└── server/            (核心代码目录)
    ├── index.ts       (入口文件)
    ├── data.ts        (爆款素材池)
    ├── prompts.ts     (提示词管理)
    └── types.ts       (类型定义，已解耦)
```

### 2. 部署步骤与命令

请在服务器终端按照以下层级顺序执行命令：

#### 第一步：准备环境
确保服务器安装了 Node.js (v18+)。

#### 第二步：上传文件
将项目中的 `server/` 文件夹整体上传到服务器，同时在同级目录创建或上传 `package.json`。
如果没有 `package.json`，可以使用以下命令快速初始化：

```bash
mkdir skycraft-server
cd skycraft-server
npm init -y
```

#### 第三步：安装依赖
在 `skycraft-server` 目录下（即包含 `package.json` 的目录）执行：

```bash
# 安装运行时依赖
npm install hono @hono/node-server @google/genai dotenv tsx
```

#### 第四步：设置环境变量
在当前目录下设置 API Key：

```bash
# Linux/Mac
export API_KEY="your_google_api_key_here"
export PORT=3000

# Windows Powershell
$env:API_KEY="your_google_api_key_here"
$env:PORT="3000"
```

#### 第五步：启动服务
**关键**：命令执行目录必须是 `skycraft-server` 根目录。

```bash
# 启动命令
npx tsx server/index.ts
```

如果看到以下输出，说明启动成功：
```
SkyCraft AI Server (v2.0) is running!
➜  Local:   http://localhost:3000
➜  API Key: Configured ✅
```

---

## 💻 前端部署手册 (Client)

前端是用户操作界面，可以部署在 Vercel, Netlify, Nginx 或任何静态资源托管服务上。

### 部署步骤

1.  **修改 API 地址**:
    打开 `constants.ts` 或配置构建环境变量。
    *   如果您使用 Vercel/Netlify，请在后台设置环境变量 `VITE_API_BASE_URL`。
    *   **重要**: 将其指向您刚才部署的后端地址（例如 `https://api.yourdomain.com` 或 `http://your-server-ip:3000`）。

2.  **安装依赖**:
    ```bash
    npm install
    ```

3.  **构建项目**:
    ```bash
    npm run build
    # 这将在 /dist 或 /build 目录下生成静态文件
    ```

4.  **托管静态文件**:
    将构建生成的文件夹内容上传至 Nginx 的 `html` 目录或 CDN。

---

## 📖 使用说明书 (User Manual)

### 1. 启动项目
确保后端服务已运行，前端页面已加载。

### 2. 爆款设定 (Configuration)
在左侧面板配置小说参数。
*   **手动配置**: 输入您想写的流派、主角类型等。
*   **一键随机**: 点击右上角的 **“一键随机爆款”** 按钮。系统会从服务器拉取最新的热门素材（如“规则怪谈”、“系统流”）自动填充。

### 3. 工作流 (Workflow)
系统设计了标准的网文创作四步走：

*   **Step 1: 生成创意 (Idea)**
    点击生成后，AI 会提供 3 个高概念的开篇脑洞。
*   **Step 2: 生成大纲 (Outline)**
    **关键**: 系统会自动读取上一步生成的创意作为上下文。点击生成，AI 会产出前 15 章的黄金开篇细纲，标注爽点和钩子。
*   **Step 3: 生成人设 (Character)**
    生成详细的主角、反派和配角小传，包含性格和金手指设定。
*   **Step 4: 撰写正文 (Chapter)**
    系统会根据大纲和人设，尝试撰写第一章正文。

---

*Powered by Google Gemini & Hono Framework*
