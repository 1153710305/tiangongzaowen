

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION, PROMPT_BUILDERS } from './prompts';
import { RANDOM_DATA_POOL } from './data';
import { NovelSettings, WorkflowStep } from '../types';

// 初始化应用
// Hono 实例
const app = new Hono();

// 启用跨域资源共享
// 允许所有来源访问
app.use('/*', cors());

// 获取 API Key (从环境变量)
// 必须在环境变量中配置 API_KEY
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("⚠️ 警告: 服务器未配置 API_KEY，AI 功能将不可用。");
}

// 初始化 Google GenAI 客户端
// 使用 API Key 实例化
const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * 路由：获取爆款素材池配置
 * 前端初始化时调用，用于填充随机生成器的选项
 * @returns JSON 格式的素材池数据
 */
app.get('/api/config/pool', (c) => {
    return c.json(RANDOM_DATA_POOL);
});

/**
 * 路由：通用 AI 生成接口 (流式)
 * 接收前端的设定和步骤，在后端组装 Prompt 并调用 Gemini
 * @param c Hono 上下文
 * @returns 流式响应
 */
app.post('/api/generate', async (c) => {
    try {
        const body = await c.req.json();
        const { settings, step, context } = body as { 
            settings: NovelSettings, 
            step: WorkflowStep,
            context?: string 
        };

        if (!settings || !step) {
            return c.json({ error: "Missing required parameters" }, 400);
        }

        console.log(`[Server] 收到生成请求: ${step}`);

        // 1. 根据步骤构建 Prompt
        let prompt = '';
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
                return c.json({ error: "Invalid step" }, 400);
        }

        // 2. 调用 Gemini API (流式)
        // 使用 gemini-2.5-flash 作为主力模型，速度快
        const modelId = 'gemini-2.5-flash'; 

        const responseStream = await ai.models.generateContentStream({
            model: modelId,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.8, // 稍微提高创造性
            }
        });

        // 3. 构建 HTTP 流式响应
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // 异步处理流
        (async () => {
            try {
                for await (const chunk of responseStream) {
                    const text = chunk.text;
                    if (text) {
                        await writer.write(encoder.encode(text));
                    }
                }
            } catch (err) {
                console.error("Stream error:", err);
                await writer.write(encoder.encode(`\n[系统错误: 生成中断 - ${err}]`));
            } finally {
                await writer.close();
            }
        })();

        return c.newResponse(readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
                'X-Content-Type-Options': 'nosniff',
            },
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return c.json({ error: error.message }, 500);
    }
});

// 简单的健康检查
app.get('/', (c) => c.text('SkyCraft AI Backend is Running!'));

export default app;

// 本地开发启动 (如果使用 node 直接运行)
// 实际部署时可能通过 serve-node 或其他适配器启动
// 使用类型断言解决 process.versions 类型定义缺失的问题
if (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.node) {
    const { serve } = await import('@hono/node-server');
    const port = 3000;
    console.log(`Server is running on port ${port}`);
    serve({
        fetch: app.fetch,
        port
    });
}
