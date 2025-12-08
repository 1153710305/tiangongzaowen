# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v3.5.0)

> **核心理念**: 极速响应 | 商业闭环 | 安全稳健 | 社区驱动
> 
> 本项目基于 **Google Gemini API**，专为中国网文市场打造，集成了爆款逻辑分析、黄金三章生成、思维导图扩写等功能。采用 **Hono + SQLite + React** 架构，单机即可承载高并发。

---

## 📚 目录 (Table of Contents)

1.  [🚀 快速开始 (安装与运行)](#-快速开始-安装与运行)
2.  [🔧 环境配置 (Environment)](#-环境配置-environment)
3.  [🐞 常见问题与排错 (Troubleshooting)](#-常见问题与排错-troubleshooting)
4.  [🛠 技术架构解析](#-技术架构解析)
5.  [📦 部署指南 (Deployment)](#-部署指南-deployment)
6.  [📖 功能使用手册](#-功能使用手册)

---

## 🚀 快速开始 (安装与运行)

### 前置要求
*   **Node.js**: v18.0.0 或更高版本
*   **API Key**: Google Gemini API Key (可选，系统内置 Key 轮询池，但建议自备一个用于初始化)

### 第一步：安装依赖

**非常重要**：如果您遇到 `Error: Cannot find module 'zod'` 错误，是因为缺少依赖。请务必执行以下命令：

```bash
# 在项目根目录下执行
npm install
```

这将会安装包括 `hono`, `zod`, `better-sqlite3`, `tsx` 等在内的所有核心库。

### 第二步：启动服务

建议在开发模式下启动，支持热重载。

```bash
# 启动后端服务 (默认端口 3000)
npm run dev
```

启动成功后，控制台应输出：
`🚀 SkyCraft Server running on port 3000 (Security Enabled)`

### 第三步：访问应用

由于本项目采用轻量化设计，前端直接通过 `index.html` 加载。您可以使用 VS Code 的 "Live Server" 插件打开 `index.html`，或者直接在浏览器访问后端的静态文件服务（如果已配置）。

默认前端入口：`http://localhost:3000` (假设后端也托管了静态资源，或者您使用 Vite 单独启动了前端)

---

## 🔧 环境配置 (Environment)

您可以在项目根目录创建 `.env` 文件来覆盖默认配置：

```env
# 服务端口
PORT=3000

# 数据库路径
DB_PATH=skycraft.db

# JWT 密钥 (生产环境请务必修改)
JWT_SECRET=your_complex_secret_key

# 后台管理员密码
ADMIN_PASSWORD=admin123

# Gemini API Key (用于系统初始化默认Key，后续请在后台管理界面添加)
API_KEY=your_google_gemini_key
```

---

## 🐞 常见问题与排错 (Troubleshooting)

### Q1: 启动报错 `Error: Cannot find module 'zod'`
*   **原因**: 未安装依赖包。
*   **解决**: 确保根目录下有 `package.json` 文件，并执行 `npm install`。如果依然报错，尝试手动安装：`npm install zod`。

### Q2: 数据库报错 `SqliteError: ...`
*   **原因**: 数据库文件可能损坏或版本不兼容。
*   **解决**: 删除根目录下的 `skycraft.db` 文件，重启服务。系统会自动重新初始化数据库表结构和默认数据。

### Q3: 提示 "代币不足" 或 "Unauthorized"
*   **原因**: 您的账户 Tokens 已耗尽，或 Token 失效。
*   **解决**: 
    1. 前往后台管理 (`/admin`) -> 用户管理，手动给用户增加 Tokens。
    2. 或者在前端点击 "充值" 模拟购买加油包。

### Q4: 端口被占用 `EADDRINUSE`
*   **原因**: 3000 端口已被其他程序占用。
*   **解决**: 修改 `.env` 中的 `PORT` 变量，例如 `PORT=3001`，或关闭占用端口的程序。

---

## 🛠 技术架构解析

### 1. 服务端 (Backend) - `server/`
*   **核心框架**: **Hono**。极速 Web 标准框架，支持 Edge 运行时。
*   **安全层**: 
    *   `zod`: 严格的输入参数校验。
    *   `rateLimiter`: 自研内存限流器，防止恶意刷接口。
    *   `secureHeaders`: 注入安全响应头。
*   **数据库**: **SQLite (better-sqlite3)** + WAL 模式，单文件数据库，备份方便，读写极快。
*   **AI 引擎**: Google GenAI SDK，封装了流式输出 (`stream`) 和多轮对话管理。

### 2. 客户端 (Frontend) - 根目录
*   **UI 框架**: React 18 (CDN 引入) + Tailwind CSS。
*   **模块化**: 使用 ES Modules (`importmap`) 直接在浏览器运行，无需复杂的 Webpack/Vite 配置（适合快速原型与演示）。
*   **状态管理**: Context API (`SettingsContext`) + Custom Hooks。

---

## 📦 部署指南 (Deployment)

### 使用 PM2 部署 (推荐)

1.  **编译 TypeScript**:
    ```bash
    npm run build
    ```
2.  **启动进程**:
    ```bash
    pm2 start dist/server/index.js --name "skycraft-ai"
    ```
3.  **保存进程列表**:
    ```bash
    pm2 save
    ```

### Docker 部署

创建 `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

运行:
```bash
docker build -t skycraft-ai .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data skycraft-ai
```

---

## 📖 功能使用手册

### 1. 创作模式
*   **参数配置**: 适合有明确方向的作者，通过下拉菜单组合 "流派+梗+人设"。
*   **脑洞发散**: 输入一句话灵感（如“重生变成一只猫”），AI 自动裂变出三个不同方向的开篇。
*   **爆款仿写**: 粘贴 1-3 本对标小说的简介，AI 分析其爽点并生成类似风格的新创意。

### 2. IDE 编辑器
*   **思维导图**: 右键点击节点可呼出 AI 辅助，支持 "引用其他导图" 或 "自动扩写子节点"。
*   **正文写作**: 输入 `:` 可引用其他章节内容，输入 `@` 可引用思维导图中的具体设定节点。

### 3. 后台管理 (`/admin`)
*   **默认密码**: `admin123`
*   **Key 池管理**: 支持添加多个 Google API Key，系统会自动轮询，避免单 Key 速率限制。
*   **商品配置**: 可在线修改 VIP 价格和赠送的 Token 数量，实时生效。

---

*Powered by Google Gemini & Hono & SQLite*
*Document Updated: v3.5.0*