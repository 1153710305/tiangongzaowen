
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版

> **架构理念**: 响应速度优先 (Hono + Streaming) | 数据安全优先 (服务端 Prompt 管理) | 体验优先 (React + Tailwind)

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构。

---

## 📚 目录 (Table of Contents)

1. [技术架构解析](#-技术架构解析)
2. [后端部署手册 (Server)](#-后端部署手册-server)
3. [前端部署手册 (Client)](#-前端部署手册-client)
4. [使用说明书 (User Manual)](#-使用说明书-user-manual)
5. [开发与配置](#-开发与配置)

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

## 🖥 后端部署手册 (Server)

后端负责处理业务逻辑和 AI 交互，必须部署在能够访问 Google API 的服务器上。

### 部署环境要求
*   Node.js v18.0.0 或更高版本。
*   一个有效的 Google Gemini API Key。

### 部署步骤

1.  **上传代码**: 将 `server/` 目录及 `package.json`, `tsconfig.json` 上传至服务器。
2.  **安装依赖**:
    ```bash
    npm install
    # 确保安装了服务端核心依赖
    npm install hono @hono/node-server @google/genai dotenv tsx
    ```
3.  **配置环境变量**:
    在服务器终端设置 API Key（或创建 `.env` 文件）：
    ```bash
    export API_KEY="your_actual_google_api_key_here"
    export PORT=3000
    ```
4.  **启动服务**:
    ```bash
    # 开发模式
    npx tsx server/index.ts

    # 生产模式 (使用 PM2 守护进程)
    npm install -g pm2
    pm2 start "npx tsx server/index.ts" --name skycraft-backend
    ```
5.  **验证**:
    访问 `http://your-server-ip:3000/`，如果看到 "SkyCraft AI Backend (Hono) is Running!" 即表示成功。

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
    *技巧*: 您可以在对话框中输入“继续写第二章”，系统会尝试接续（需后续版本支持完全的多轮对话记忆，目前建议手动调整上下文）。

### 4. 日志监控
点击右下角的 **“日志”** 按钮，可以查看前端与后端的通信状态，方便排查错误。

---

## ⚙️ 开发与配置

### 如何修改 Prompt? (服务端)
所有 Prompt 均位于 `server/prompts.ts`。
*   修改 `SYSTEM_INSTRUCTION` 可调整 AI 的整体人设（如变得更毒舌、更文青）。
*   修改 `PROMPT_BUILDERS` 下的函数可调整各个步骤的具体指令。
*   **注意**: 修改后需要重启后端服务。

### 如何更新爆款素材库? (服务端)
所有随机数据位于 `server/data.ts`。
*   您可以随时添加新的 `genres` (流派) 或 `tropes` (梗)。
*   **优势**: 无需重新构建前端，重启后端服务后，所有用户点击“随机”时即可获取新素材。

---

*Powered by Google Gemini & Hono Framework*
