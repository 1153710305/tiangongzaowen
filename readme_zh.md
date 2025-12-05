# 天工造文 (SkyCraft Novel AI)

基于 Google Gemini API 构建的专业级 AI 小说生成器。专为中国网文市场设计，能够生成符合番茄、起点等平台风格的"爆款"网文内容。

## 核心特性

*   **爆款逻辑引擎**: 内置资深网文主编的思维逻辑，注重黄金三章、爽点节奏、情绪价值。
*   **Gemini 驱动**: 使用最新的 `gemini-2.5-flash` 和 `gemini-3-pro` 模型，支持超长上下文和逻辑推理。
*   **流式生成**: 实时看到文字生成过程，提供流畅的创作体验。
*   **结构化工作流**:
    1.  **创意脑暴**: 自动生成符合潮流的开篇脑洞。
    2.  **大纲生成**: 自动规划前15章细纲，埋钩子。
    3.  **人设完善**: 打造立体的主角与反派。
    4.  **正文撰写**: 自动扩写章节内容。
*   **极致UI体验**: 赛博朋克风格深色模式，沉浸式写作环境。
*   **健壮性**: 内置完整日志系统，方便排查 API 问题。

## 技术栈

*   **Runtime**: React 18+
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **AI SDK**: @google/genai (Gemini SDK)
*   **Build**: ESM Module System

## 快速开始

1.  **安装依赖**:
    ```bash
    npm install
    ```

2.  **配置 API KEY**:
    本项目需要 Google Gemini API Key。
    请在启动前设置环境变量 `API_KEY` 或在 `services/geminiService.ts` 中暂时硬编码进行测试（注意不要提交 Key）。

3.  **启动开发服务器**:
    ```bash
    npm start
    ```

## 目录结构

*   `services/`: 核心服务层（API调用、Prompt管理、日志）。
*   `components/`: UI 组件。
*   `types.ts`: 全局类型定义。
*   `constants.ts`: 提示词模板与系统常量。

## 提示词管理

所有的 AI 提示词（Prompt）都统一管理在 `constants.ts` 文件中，方便非开发人员（如策划、编辑）进行调整和优化。

## 注意事项

*   本项目默认使用流式传输（Streaming）以提高响应速度。
*   请确保网络环境可以访问 Google API。

---
*Created by AI Senior Engineer & Gold Level Author*