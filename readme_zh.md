
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v3.2.0)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 稳定性优先 (API Key Rotation + LRU Strategy) | 解耦优先 (Modular Router) | 资产化沉淀 (Structured Cards) | **商业化闭环 (Membership & Economy)** | **社区化 (Community)**

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构，并支持多用户登录、云端存档和全链路监控。

**v3.2.0 更新：社区互动与数据安全。新增留言板、系统公告、项目回收站（防误删）机制。**

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

**v3.2.0 (Community & Safety)**
*   **Feature**: 项目回收站机制（软删除、30天自动清理、恢复功能）。
*   **Feature**: 留言板与系统公告功能，增强作者与用户的互动。

**v3.1.0 (Membership Economy)**
*   **Backend**: 实现 Token 扣费逻辑、VIP 权限校验拦截器、交易流水记录。
*   **Frontend**: 新增会员充值弹窗、VIP 标识、非会员使用限制提示。

**v3.0.0 (Key Pool System)**
*   **Backend**: 引入数据库驱动的 Key 轮询池。

*Powered by Google Gemini & Hono & SQLite*
