
# 提示词历史记录 (Prompt History)

> 记录每次代码迭代后固化的核心 Prompt 逻辑，便于回溯和优化。

## 版本 v3.2.2 (Decoupled Architecture)

### 架构变更
- **Backend Refactoring**: 将原本庞大的 `server/index.ts` 拆分为多个单一职责的路由模块：
    - `routes_auth.ts`: 鉴权 (Login/Register)。
    - `routes_public.ts`: 公共数据 (Config/Products/Announcements)。
    - `routes_content.ts`: 核心生产力 (Generate/Lab)。
    - `routes_project.ts`: 项目管理 (IDE/Chapters/Maps)。
    - `routes_user.ts`: 用户资产 (Status/Archives/Cards/Prompts/Messages)。
- **Configuration**: 引入 `server/config.ts` 统一管理 `JWT_SECRET`, `PORT`, `DB_PATH` 等环境变量。

### 文档更新
- **Readme Overhaul**: 重写 `readme_zh.md`，提供了详尽的服务器环境准备、PM2 部署、前端构建与 Nginx 配置指南。

## 版本 v3.2.1 (Admin Power-Up)
...
