
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v3.3.0)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 稳定性优先 (API Key Rotation + LRU Strategy) | 解耦优先 (Modular Router) | 资产化沉淀 (Structured Cards) | **商业化闭环 (Membership & Economy)** | **社区化 (Community)**

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构，并支持多用户登录、云端存档和全链路监控。

**v3.3.0 更新：API 实验室与本地化精简。修复思维导图交互问题。**

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

### 1. 服务端 (Backend) - `server/`
*   **核心框架**: **Hono**。极速 Web 标准框架。
*   **数据库**: **SQLite (better-sqlite3)**。
    *   **Recycle Bin (New)**: `projects` 表新增 `deleted_at` 字段实现软删除。系统启动时自动清理 30 天前的已删除项目。
    *   **Community (New)**: 新增 `messages` (留言板) 和 `announcements` (公告) 表。
    *   **Economy System**: `users` 表支持 Tokens 和 VIP。
    *   **API Key Management**: 支持 Key 轮询与统计。
*   **Prompt Engineering**: 针对思维导图扩展新增 `MIND_MAP_NODE` 模式，针对正文新增 `CHAPTER` 上下文注入模式。

### 2. 客户端 (Frontend) - 根目录
*   **UI 框架**: React 18 + Tailwind CSS。
*   **Features**:
    *   **Project List**: 升级为支持“进行中”和“回收站”双视图。
    *   **Community UI**: 新增侧边栏“留言反馈”和“公告”入口。
*   **Localization**: SettingsContext 支持 7 种语言切换。

---

---

## 🚀 服务器部署详细指南 (Server)

本项目的服务端基于 Node.js 环境，推荐部署在 Linux 服务器 (如 Ubuntu/CentOS) 上。

### 1. 环境准备
*   **Node.js**: v18.0.0 或更高版本
*   **PM2**: 用于进程守护 (`npm install -g pm2`)
*   **Nginx** (可选): 用于反向代理和 SSL 配置

### 2. 部署步骤
1.  **上传代码**: 将项目代码上传至服务器。
2.  **安装依赖**:
    ```bash
    npm install
    ```
3.  **配置环境变量**:
    复制 `.env.example` 为 `.env` (如果没有则新建)，并填入必要信息：
    ```env
    PORT=3000
    DB_PATH=skycraft.db
    JWT_SECRET=your_secure_jwt_secret
    GEMINI_API_KEY=your_google_api_key
    ADMIN_PASSWORD=your_admin_password
    ```
4.  **启动服务**:
    ```bash
    # 方式一：直接运行 (开发调试)
    npx tsx server/index.ts

    # 方式二：使用 PM2 (生产环境推荐)
    pm2 start "npx tsx server/index.ts" --name skycraft-backend
    pm2 save
    pm2 startup
    ```

---

## 📦 前端部署手册 (Client)

### 方案 A: 静态托管 (Vercel) - 推荐

由于本项目采用前后端分离架构，推荐将前端部署在 Vercel 等 CDN 边缘网络，后端部署在 VPS。

#### 1. 准备工作
*   确保后端 API 已经部署并可通过公网访问 (例如 `https://api.yourdomain.com`)。
*   **注意**: Vercel 部署的是前端静态资源，它需要通过公网访问你的后端 API。

#### 2. Vercel 部署步骤
1.  登录 [Vercel](https://vercel.com) 并连接你的 Git 仓库。
2.  **Import Project**: 选择本项目仓库。
3.  **Build Settings**:
    *   **Framework Preset**: Vite
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
4.  **Environment Variables (环境变量)**:
    *   在 Vercel 项目设置中添加以下变量，指向你的后端地址：
    *   `VITE_API_BASE_URL`: `https://api.yourdomain.com` (注意不要带末尾的 /)
5.  **Deploy**: 点击部署。

### 方案 B: 统一通过 Nginx 部署 (VPS)

如果你只有一台服务器，可以使用 Nginx 同时托管前端静态文件和反向代理后端 API。

1.  **构建前端**:
    在本地或服务器上执行构建命令：
    ```bash
    npm run build
    ```
    构建完成后，会生成 `dist/` 目录。

2.  **配置 Nginx**:
    编辑 Nginx 配置文件 (如 `/etc/nginx/sites-available/default`)：

    ```nginx
    server {
        listen 80;
        server_name yourdomain.com;

        # 前端静态文件
        location / {
            root /path/to/your/project/dist;
            try_files $uri $uri/ /index.html;
        }

        # 后端 API 反向代理
        location /api {
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        # 后台管理 API
        location /admin {
            proxy_pass http://localhost:3000;
        }
    }
    ```
3.  **重启 Nginx**: `sudo systemctl restart nginx`

---

## 🔐 后台管理系统 (Admin Dashboard)

访问地址: `http://YOUR_SERVER_IP:3000/admin` (默认密码: `admin123`)

### 1. 社区管理 (Community) - NEW
*   **公告发布**: 发布系统更新、维护通知或活动公告。支持草稿/发布状态切换。
*   **留言回复**: 查看用户提交的反馈，并直接进行回复。回复内容将在用户端的留言板中高亮显示。

### 2. 经济与会员 (Economy)
*   **商品配置**: JSON 配置 `product_plans`。
*   **模型权限**: 配置 VIP 专属模型。

### 3. 密钥管理 (Key Management)
*   **Key 池维护**: 轮询策略，状态控制，性能监控。

---

## 📝 版本历史 (Changelog)

**v3.3.1 (Proxy Fixes)**
*   **Fix (Dev)**: 修复本地开发环境代理配置，解决商品列表和用户数据无法加载的问题。
*   **Optimization**: 优化前后端端口冲突处理 (Vite 5173 / Server 3000)。

**v3.3.0 (API Lab & Localization)**
*   **Feature (Admin)**: 后台管理系统新增“API 实验室”，提供可视化接口测试、文档浏览与监控。
*   **Fix**: 修复思维导图添加节点无反应的问题 (UUID 兼容性)。
*   **Optimization**: 本地化策略调整，精简语言选项并移除主题/字体配置。

**v3.2.0 (Community & Safety)**
*   **Feature**: 项目回收站机制（软删除、30天自动清理、恢复功能）。
*   **Feature**: 留言板与系统公告功能，增强作者与用户的互动。

**v3.1.0 (Membership Economy)**
*   **Backend**: 实现 Token 扣费逻辑、VIP 权限校验拦截器、交易流水记录。
*   **Frontend**: 新增会员充值弹窗、VIP 标识、非会员使用限制提示。

**v3.0.0 (Key Pool System)**
*   **Backend**: 引入数据库驱动的 Key 轮询池。

*Powered by Google Gemini & Hono & SQLite*
