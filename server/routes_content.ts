
import { Hono } from 'hono';
import { GoogleGenAI } from '@google/genai';
import * as db from './db';
import { logger } from './logger';
import { SYSTEM_INSTRUCTION, PROMPT_BUILDERS } from './prompts';
import { WorkflowStep, SystemModelConfig } from './types';
import { DEFAULT_AI_MODEL } from './config';

/**
 * 内容生成路由模块
 * 包含核心的 AI 生成逻辑和 API 实验室接口
 */
export const contentRouter = new Hono();

/**
 * API 实验室 (Raw Mode)
 * POST /api/lab
 * 允许自定义 System Prompt 和参数进行测试
 */
contentRouter.post('/lab', async (c) => {
    const startTime = Date.now();
    const payload = c.get('jwtPayload');
    const user = db.getUserById(payload.id);
    
    // 1. 余额检查
    if (!user || user.tokens <= 0) return c.json({ error: "代币不足" }, 402);

    const { model, systemInstruction, prompt, temperature } = await c.req.json();
    
    // 2. VIP 模型权限检查
    const allModels: SystemModelConfig[] = JSON.parse(db.getSystemConfig('ai_models') || '[]');
    const targetModel = allModels.find(m => m.id === model);
    if (targetModel?.isVip) {
        const isVip = user.vip_expiry ? new Date(user.vip_expiry) > new Date() : false;
        if (!isVip) return c.json({ error: "会员专属模型" }, 403);
    }

    // 3. 获取 API Key
    const apiKeyData = db.getNextAvailableApiKey();
    if (!apiKeyData) return c.json({ error: "暂无可用计算资源" }, 503);

    try {
        const ai = new GoogleGenAI({ apiKey: apiKeyData.key });
        const responseStream = await ai.models.generateContentStream({
            model: model || DEFAULT_AI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { 
                systemInstruction: systemInstruction || undefined, 
                temperature: Number(temperature) || 0.7 
            }
        });

        // 4. 构建流式响应
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        (async () => {
            let fullText = '';
            let totalTokens = 0;
            try {
                for await (const chunk of responseStream) {
                    if (chunk.text) { 
                        fullText += chunk.text; 
                        await writer.write(encoder.encode(chunk.text)); 
                    }
                    if (chunk.usageMetadata) {
                        totalTokens = (chunk.usageMetadata.promptTokenCount || 0) + (chunk.usageMetadata.candidatesTokenCount || 0);
                    }
                }
                
                // 兜底 Token 计算
                if (totalTokens === 0) totalTokens = (prompt.length + (systemInstruction?.length || 0)) + fullText.length;
                
                // 5. 扣费与统计
                if (totalTokens > 0) {
                    db.deductUserTokens(payload.id, totalTokens, `API实验室:${model}`);
                    db.updateApiKeyStats(apiKeyData.id, Date.now() - startTime, totalTokens);
                }
            } catch (err: any) {
                logger.error(`Lab stream error: ${err.message}`);
                await writer.write(encoder.encode(`\n[Error: ${err.message}]`));
            } finally { 
                await writer.close(); 
            }
        })();

        return c.newResponse(readable, { 
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' } 
        });
    } catch (e: any) { 
        return c.json({ error: e.message }, 500); 
    }
});

/**
 * 标准创作工作流生成
 * POST /api/generate
 * 根据 step 参数调用不同的 Prompt 构建器
 */
contentRouter.post('/generate', async (c) => {
    const startTime = Date.now();
    const payload = c.get('jwtPayload');
    const user = db.getUserById(payload.id);
    
    if (!user || user.tokens <= 0) return c.json({ error: "代币不足" }, 402);

    const body = await c.req.json();
    const { settings, step, context, references, extraPrompt, model } = body as any;
    
    // VIP 检查
    let modelName = model || db.getSystemConfig('default_model') || DEFAULT_AI_MODEL;
    const allModels: SystemModelConfig[] = JSON.parse(db.getSystemConfig('ai_models') || '[]');
    const targetModel = allModels.find(m => m.id === modelName);
    if (targetModel?.isVip) {
        const isVip = user.vip_expiry ? new Date(user.vip_expiry) > new Date() : false;
        if (!isVip) return c.json({ error: "会员专属模型" }, 403);
    }

    const apiKeyData = db.getNextAvailableApiKey();
    if (!apiKeyData) return c.json({ error: "暂无可用计算资源" }, 503);

    try {
        const ai = new GoogleGenAI({ apiKey: apiKeyData.key });
        let prompt = '';
        
        // 根据步骤构建 Prompt
        switch (step) {
            case WorkflowStep.IDEA: prompt = PROMPT_BUILDERS.IDEA(settings, context); break;
            case WorkflowStep.ANALYSIS_IDEA: prompt = PROMPT_BUILDERS.ANALYSIS_IDEA(settings, references); break;
            case WorkflowStep.OUTLINE: prompt = PROMPT_BUILDERS.OUTLINE(settings, context); break;
            case WorkflowStep.CHARACTER: prompt = PROMPT_BUILDERS.CHARACTER(settings); break;
            case WorkflowStep.CHAPTER: prompt = PROMPT_BUILDERS.CHAPTER(settings, context, references); break;
            case WorkflowStep.MIND_MAP_NODE: prompt = PROMPT_BUILDERS.MIND_MAP_NODE(context, extraPrompt, references); break;
            default: return c.json({ error: "Unknown step" }, 400);
        }
        
        // 附加用户指令
        if (extraPrompt && step !== WorkflowStep.MIND_MAP_NODE) {
            prompt += `\n\n【用户指令】:\n${extraPrompt}`;
        }

        const responseStream = await ai.models.generateContentStream({
            model: modelName, 
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.85 }
        });

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        (async () => {
            let fullText = '';
            let totalTokens = 0;
            try {
                for await (const chunk of responseStream) {
                    if (chunk.text) { 
                        fullText += chunk.text; 
                        await writer.write(encoder.encode(chunk.text)); 
                    }
                    if (chunk.usageMetadata) {
                        totalTokens = (chunk.usageMetadata.promptTokenCount || 0) + (chunk.usageMetadata.candidatesTokenCount || 0);
                    }
                }
                if (totalTokens === 0) totalTokens = prompt.length + fullText.length;
                
                if (totalTokens > 0) {
                    db.deductUserTokens(payload.id, totalTokens, `AI生成:${step}`);
                    db.updateApiKeyStats(apiKeyData.id, Date.now() - startTime, totalTokens);
                }
            } catch (err: any) {
                await writer.write(encoder.encode(`\n[Error: ${err.message}]`));
            } finally { 
                await writer.close(); 
            }
        })();

        return c.newResponse(readable, { 
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' } 
        });
    } catch (e: any) { 
        return c.json({ error: e.message }, 500); 
    }
});
