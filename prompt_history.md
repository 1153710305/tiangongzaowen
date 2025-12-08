
# 提示词历史记录 (Prompt History)

> 记录每次代码迭代后固化的核心 Prompt 逻辑，便于回溯和优化。

## 版本 v3.5.0 (Dependency Fix & Documentation)

### 核心修复
- **Dependencies**: 
    - 修复了 `Error: Cannot find module 'zod'` 报错。
    - 根目录新增 `package.json`，明确列出了 `hono`, `zod`, `better-sqlite3`, `@google/genai` 等核心依赖。
    - 新增 `npm run dev` 和 `npm run build` 脚本，规范了开发和部署流程。
- **Documentation**:
    - 重写 `readme_zh.md`，增加了“快速开始”、“安装依赖”、“排错指南”章节。
    - 提供了 PM2 和 Docker 的部署示例。

### 代码优化
- **Middleware**:
    - 在 `server/middleware.ts` 中为 `rateLimiter` (限流器) 和 `validateJson` (Zod 校验器) 添加了详细的中文注释。
    - 明确了安全标头 (Security Headers) 的作用，如防止 XSS 和点击劫持。

## 版本 v3.2.1 (Admin Power-Up)

### 功能变更
- **User Management**:
    - **Edit User**: 管理员可以直接修改用户的 Tokens 数量。
    - **VIP Control**: 管理员可以设置用户的 VIP 过期时间（支持 +30天 / +1年 快捷操作），或取消 VIP。
- **System Configurations**:
    - **Initial Tokens**: 在后台“系统设置”中配置新用户注册时默认赠送的 Tokens 数量。
    - **Product Plans**: 提供 JSON 编辑器直接配置 `product_plans`，支持灵活调整月卡、季卡、加油包等商品属性。
    - **VIP Models**: 在模型配置中显式标记 `isVip`，控制哪些模型仅供会员使用。

## 版本 v3.2.0 (Community & Safety)
... (Previous history remains unchanged)
