
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION, PROMPT_BUILDERS } from './prompts.ts';
import { RANDOM_DATA_POOL } from './data.ts';
import { NovelSettings, WorkflowStep } from './types.ts';

// 初始化应用
// Hono 实例，以极速响应著称
const app = new Hono();

// === 中间件配置 ===

// 启用跨域资源共享 (CORS)
// 允许前端从任意域名访问 (生产环境建议限制 origin)
app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
}));

// === API Key 配置 ===
// 必须在服务器环境变量中配置 API_KEY
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.error("❌ 严重错误: 服务器未配置 API_KEY，AI 生成功能将无法使用。请在环境变量中设置 API_KEY。");
}

// 初始化 Google GenAI 客户端
const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

// === 路由定义 ===

/**
 * 路由：健康检查
 * 用于监控系统存活状态
 */
app.get('/', (c) => c.text('SkyCraft AI Backend (Hono) is Running! 🚀'));

/**
 * 路由：获取爆款素材池配置
 * 前端初始化时调用，用于填充随机生成器的选项
 * 数据源：server/data.ts
 */
app.get('/api/config/pool', (c) => {
    return c.json(RANDOM_DATA_POOL);
});

/**
 * 路由：通用 AI 生成接口 (流式)
 * 接收前端的设定和步骤，在后端组装 Prompt 并调用 Gemini
 */
app.post('/api/generate', async (c) => {
    if (!API_KEY) {
        return c.json({ error: "Server API Key not configured" }, 500);
    }

    try {
        const body = await c.req.json();
        const { settings, step, context } = body as { 
            settings: NovelSettings, 
            step: WorkflowStep,
            context?: string 
        };

        if (!settings || !step) {
            return c.json({ error: "Missing required parameters (settings or step)" }, 400);
        }

        console.log(`[Server] 收到生成请求: ${step} - ${settings.genre}`);

        // 1. 根据步骤构建 Prompt (核心逻辑保护)
        let prompt = '';
        try {
            switch (step) {
                case WorkflowStep.IDEA:
                    prompt = PROMPT_BUILDERS.IDEA(settings);
                    break;
                case WorkflowStep.OUTLINE:
                    prompt = PROMPT_BUILDERS.OUTLINE(settings, context || '');
                    break;
                case WorkflowStep.CHARACTER:
                    prompt = PROMPT_BUILDERS.CHARACTER(settings);
                    break;
                case WorkflowStep.CHAPTER:
                    prompt = PROMPT_BUILDERS.CHAPTER(settings, context || '');
                    break;
                default:
                    return c.json({ error: "Invalid workflow step" }, 400);
            }
        } catch (err: any) {
            console.error("Prompt construction error:", err);
            return c.json({ error: "Failed to build prompt" }, 500);
        }

        // 2. 调用 Gemini API (流式)
        // 使用 gemini-2.5-flash 作为主力模型，兼顾速度与质量
        const modelId = 'gemini-2.5-flash'; 

        const responseStream = await ai.models.generateContentStream({
            model: modelId,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.8, // 较高的创造性
                topP: 0.95,
                topK: 40,
            }
        });

        // 3. 构建 HTTP 流式响应 (Server-Sent Events 风格的纯文本流)
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // 异步处理流，不阻塞主线程
        (async () => {
            try {
                for await (const chunk of responseStream) {
                    const text = chunk.text;
                    if (text) {
                        await writer.write(encoder.encode(text));
                    }
                }
            } catch (err) {
                console.error("Streaming error:", err);
                await writer.write(encoder.encode(`\n\n[系统错误: 生成过程中断 - ${err}]`));
            } finally {
                await writer.close();
            }
        })();

        return c.newResponse(readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return c.json({ error: error.message || "Internal Server Error" }, 500);
    }
});

export default app;

// === 本地开发/自托管启动逻辑 ===
// 检测是否在 Node.js 环境下直接运行
if (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.node) {
    // 动态导入 node-server 适配器，避免非 Node 环境构建报错
    import('@hono/node-server').then(({ serve }) => {
        const port = Number(process.env.PORT) || 3000;
        console.log(`
┌──────────────────────────────────────────────────┐
│  SkyCraft AI Server (v2.0) is running!           │
│                                                  │
│  ➜  Local:   http://localhost:${port}                │
│  ➜  API Key: ${API_KEY ? 'Configured ✅' : 'Missing ❌'}                │
└──────────────────────────────────────────────────┘
        `);
        serve({
            fetch: app.fetch,
            port
        });
    }).catch(err => {
        console.error("Failed to start server:", err);
    });
}
