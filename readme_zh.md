
# 天工造文 (SkyCraft AI) - 企业级 AI 小说创作平台

> **当前版本**: v3.2.2 (Decoupled & Enhanced)
> **核心理念**: 极速响应 | 稳定架构 | 模块解耦 | 社区互动 | 商业闭环

本项目是一个基于 Google Gemini 模型的专业网文创作辅助系统，采用前后端分离架构，集成了从灵感激发、大纲设计、角色构建到正文生成的全流程工作流。支持 IDE 式的项目管理、思维导图编辑、会员经济系统以及社区互动功能。

---

## 🏗️ 技术架构

### 后端 (Server)
*   **框架**: Hono (极轻量、高性能 Web 标准框架)
*   **运行时**: Node.js (v18+)
*   **数据库**: SQLite (better-sqlite3) + WAL 模式 (高并发读写)
*   **核心特性**:
    *   **Modular Router**: 路由按业务拆分为 Auth, Project, User, Content, Public 模块。
    *   **Key Pool**: 数据库驱动的 API Key 轮询池，支持 LRU 策略和用量统计。
    *   **Safety**: 项目回收站机制（软删除），防止误操作。
    *   **Economy**: 完整的代币 (Token) 扣费、充值、交易流水记录。

### 前端 (Client)
*   **框架**: React 18 + Vite
*   **样式**: Tailwind CSS (支持动态主题切换)
*   **状态管理**: React Context (Global Settings)
*   **核心特性**:
    *   **Mind Map**: 深度集成的思维导图编辑器，支持 AI 节点扩展。
    *   **IDE**: 类似 VS Code 的写作环境，左侧资源管理，右侧多标签编辑。
    *   **I18n**: 内置 7 种语言支持。

---

## 🚀 服务器部署指南 (Server Deployment)

请遵循以下步骤在 Linux (Ubuntu/CentOS) 或 Windows Server 上部署后端服务。

### 1. 环境准备
确保服务器已安装 **Node.js 18.0.0** 或更高版本。
```bash
node -v
# 如果未安装，推荐使用 nvm 安装:
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
# nvm install 18
```

### 2. 获取代码与安装依赖
将 `server/` 目录下的代码上传至服务器（或拉取 Git 仓库）。
```bash
cd server
npm install
```

### 3. 配置环境变量
在 `server` 目录下不需要创建 `.env` 文件（代码已内置默认值），但为了生产环境安全，**强烈建议**在启动命令中设置环境变量，或创建 `.env` 文件。

关键变量说明：
*   `PORT`: 服务端口 (默认 3000)
*   `JWT_SECRET`: JWT 签名密钥 (务必修改!)
*   `ADMIN_PASSWORD`: 后台管理密码 (默认 admin123)
*   `DB_PATH`: 数据库路径 (默认 skycraft.db)

### 4. 启动服务
**开发模式**:
```bash
npm run dev
# 或直接运行
npx tsx --watch index.ts
```

**生产模式 (推荐使用 PM2)**:
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start index.ts --name "skycraft-server" --interpreter ./node_modules/.bin/tsx

# 查看日志
pm2 logs skycraft-server
```

### 5. 后台初始化
服务启动后，访问后台管理系统进行初始化配置。
*   **地址**: `http://YOUR_SERVER_IP:3000/admin`
*   **默认密码**: `admin123` (或你设置的环境变量)

**首次配置清单**:
1.  进入 **🔑 密钥管理**，添加 Google Gemini API Key。
2.  进入 **⚙️ 系统设置**，确认 AI 模型列表和商品配置。
3.  进入 **⚙️ 系统设置**，设置新用户初始 Tokens 数量。

---

## 💻 前端部署指南 (Client Deployment)

### 1. 环境配置
在项目根目录（`package.json` 所在位置），找到或修改 `constants.ts` 文件（或使用 Vite 环境变量）。
确保 `API_BASE_URL` 指向你的后端服务器地址。

**方式一：修改代码 (简单)**
打开 `constants.ts`，修改 `API_BASE_URL` 的默认值：
```typescript
export const API_BASE_URL = 'http://YOUR_SERVER_IP:3000'; // 替换为实际后端地址
```

**方式二：构建时注入 (推荐)**
```bash
export VITE_API_BASE_URL=http://YOUR_SERVER_IP:3000
npm run build
```

### 2. 安装依赖与构建
```bash
# 在根目录执行
npm install
npm run build
```
构建完成后，会生成 `dist` 目录。

### 3. 静态资源托管
你可以使用 Nginx、Apache 或任何静态文件服务器来托管 `dist` 目录。

**使用 `serve` 快速测试**:
```bash
npm install -g serve
serve -s dist -l 5173
```

**Nginx 配置示例**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/skycraft/dist;
        index index.html;
        try_files $uri $uri/ /index.html; # 支持 SPA 路由
    }

    # 可选：反向代理后端 API，解决跨域问题
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

---

## 📘 使用指南 (User Guide)

### 对于普通用户
1.  **注册/登录**: 首次访问需注册账号，系统会赠送初始 Tokens。
2.  **创意脑暴**: 在首页左侧“参数配置”中填入偏好，点击生成。
3.  **项目 IDE**: 点击生成的“脑洞卡片”，选择“初始化项目”，进入 IDE 界面。
4.  **思维导图**: 在 IDE 中使用思维导图梳理剧情。输入 `:` 可引用其他导图，输入 `@` 可引用节点。选中节点点击“AI”图标可自动扩展子节点。
5.  **正文写作**: 在章节编辑器中，输入 `@` 引用设定资料，点击“AI 续写”辅助创作。

### 对于管理员
1.  **用户管理**: 可查看所有用户，修改其 Tokens余额，设置 VIP 过期时间。
2.  **社区管理**: 发布系统公告，回复用户留言（用户的留言板会收到通知）。
3.  **监控**: 在 Dashboard 查看 API Key 的健康状态、延迟和 Token 消耗。

---

## 🛠 目录结构说明

```
/
├── components/         # 前端 React 组件
├── contexts/           # 前端全局状态 (SettingsContext)
├── services/           # 前端 API 服务封装
├── server/             # 后端完整代码
│   ├── index.ts        # 入口文件 (App Wiring)
│   ├── config.ts       # 配置中心
│   ├── db.ts           # 数据库操作层 (SQLite)
│   ├── admin_router.ts # 后台管理路由
│   ├── routes_*.ts     # 业务路由模块 (解耦)
│   ├── prompts.ts      # Prompt 模板
│   ├── data.ts         # 静态素材数据
│   └── ...
├── dist/               # 前端构建产物
└── README.md           # 说明文档
```
