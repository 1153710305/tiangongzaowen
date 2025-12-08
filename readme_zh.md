
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v3.0.0)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 稳定性优先 (API Key Rotation + LRU Strategy) | 解耦优先 (Modular Router) | 资产化沉淀 (Structured Cards) | **全球化视野 (Localization)**

本项目是一个专业的 AI 爆款网文生成系统，已从原型升级为可部署的前后端分离架构，并支持多用户登录、云端存档和全链路监控。

**v3.0.0 重磅更新：企业级 API 密钥池管理。支持多 Key 轮询（LRU 策略）、用量统计、延迟监控以及可视化模型配置。**

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
*   **核心框架**: **Hono**。极速 Web 标准框架。
*   **数据库**: **SQLite (better-sqlite3)**。
    *   **API Key Management (New)**: `api_keys` 表支持存储多个 API 密钥，并记录每个密钥的调用次数、Token 消耗和总耗时。
    *   **Rotation Strategy**: 采用 **LRU (Least Recently Used)** 策略。每次请求会自动选取 `is_active=1` 且 `last_used_at` 最早的 Key，确保负载均衡并规避单 Key 速率限制。
*   **Prompt Engineering**: 针对思维导图扩展新增 `MIND_MAP_NODE` 模式，针对正文新增 `CHAPTER` 上下文注入模式。

### 2. 客户端 (Frontend) - 根目录
*   **UI 框架**: React 18 + Tailwind CSS。
*   **Localization**: 内置 SettingsContext 支持 7 种语言切换。

---

## 🔐 后台管理系统 (Admin Dashboard)

访问地址: `http://YOUR_SERVER_IP:3000/admin` (默认密码: `admin123`)

### 1. 密钥管理 (Key Management) - NEW
*   **Key 池维护**: 支持添加无限个 Gemini API Key。
*   **状态控制**: 可一键启用/禁用特定 Key，故障 Key 不会影响系统运行。
*   **性能监控**: 实时查看每个 Key 的累计 Token 消耗和平均响应时延，帮助优化成本。

### 2. 模型配置 (Model Config) - NEW
*   **动态配置**: 在后台“系统设置”中，可视化配置前端可见的模型列表。
*   **启用/禁用**: 可通过复选框控制哪些模型对用户开放（例如暂时下线维护中的模型）。

---

## 📝 版本历史 (Changelog)

**v3.0.0 (Key Pool System)**
*   **Backend**: 重构 AI 调用层，移除单 Key 依赖，引入数据库驱动的 Key 轮询池。
*   **Admin**: 新增 Key 管理界面和模型配置界面。
*   **Database**: 新增 `api_keys` 表，升级 `system_configs` 逻辑。

**v2.9.8 (Localization)**
*   **Feature**: 多语言、多主题、多字体支持。

*Powered by Google Gemini & Hono & SQLite*
