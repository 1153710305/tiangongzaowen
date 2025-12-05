
# 天工造文 (SkyCraft Novel AI) - Server Edition

专业的 AI 爆款小说生成器系统。本项目采用前后端分离架构，旨在提供高性能、低延迟、可扩展的创作体验。

## 🌟 核心升级 (v2.0)

*   **前后端分离**: 前端 (React) 专注于 UI 交互，后端 (Node.js/Hono) 负责逻辑推理与 Prompt 封装。
*   **Prompt 资产保护**: 所有的核心 Prompt、角色设定、系统指令均存储在服务端，前端不可见。
*   **动态素材池**: 爆款“梗”和“人设”数据由服务端统一管理，无需更新前端即可热更素材。
*   **高性能流式响应**: 基于 Hono 框架实现极低延迟的 Token 流式传输。

## 🛠 技术架构

### 客户端 (Client)
*   React 18 + Tailwind CSS
*   纯展示层，通过 REST API 与后端通信。
*   支持 Markdown 实时渲染。

### 服务端 (Server)
*   **Runtime**: Node.js
*   **Framework**: Hono (超高性能 Web 框架)
*   **AI SDK**: @google/genai
*   **Directory**: `server/`

## 🚀 安装与部署

### 1. 环境准备
确保已安装 Node.js (v18+) 和 npm。

### 2. 启动服务端 (Backend)

服务端代码位于 `server/` 目录下。

```bash
# 进入项目根目录
# 安装服务端依赖
npm install @hono/node-server hono @google/genai

# 配置环境变量
export API_KEY="your_google_gemini_api_key"

# 启动服务器 (使用 tsx 或 node 直接运行编译后的 js)
npx tsx server/index.ts
```

*服务器默认运行在 `http://localhost:3000`*

### 3. 启动客户端 (Frontend)

```bash
# 安装依赖
npm install

# 启动 React 开发服务器
npm start
```

## 📂 目录结构说明

```
.
├── server/                 # [后端] 核心逻辑层
│   ├── index.ts            # 服务入口 (API 路由)
│   ├── prompts.ts          # 提示词仓库 (Prompt Engineering)
│   └── data.ts             # 静态数据源 (爆款素材池)
├── components/             # [前端] UI 组件
├── services/               # [前端] API 通信服务
└── constants.ts            # [前端] 基础常量
```

## 📝 开发指南

### 修改提示词 (Prompt Engineering)
直接修改 `server/prompts.ts` 文件。
该文件包含 `SYSTEM_INSTRUCTION` 和各个步骤的 `PROMPT_BUILDERS`。修改后重启后端服务即可生效。

### 更新爆款素材 (Data Pool)
修改 `server/data.ts` 文件。
此处的 `RANDOM_DATA_POOL` 控制着前端“随机生成”按钮的数据源。

### 切换模型
在 `server/index.ts` 中修改 `modelId` 变量（例如切换为 `gemini-3-pro-preview`）。

## ⚠️ 注意事项

*   **跨域 (CORS)**: 后端默认开启了 CORS 允许所有来源 (`*`)，生产环境请在 `server/index.ts` 中限制域名。
*   **流式兼容性**: 确保网络环境支持 `Transfer-Encoding: chunked`。

---
*Created by AI Senior Engineer*
