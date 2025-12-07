
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION, PROMPT_BUILDERS } from './prompts.ts';
import { RANDOM_DATA_POOL } from './data.ts';
import { NovelSettings, WorkflowStep, ReferenceNovel } from './types.ts';
import { logger } from './logger.ts';
import { adminRouter } from './admin_router.ts';
import * as db from './db.ts';

// 初始化数据库
try {
    db.initDB();
    if (typeof db.createProject !== 'function') {
        logger.error("❌ CRITICAL: db.createProject function is missing from exports!");
    } else {
        logger.info("✅ Database module loaded successfully (Project API enabled)");
    }
} catch (e: any) {
    logger.error("数据库初始化失败", { error: e.message });
    if (typeof process !== 'undefined') {
        (process as any).exit(1);
    }
}

const app = new Hono();

// 配置 CORS
app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}));

// === 全局日志与错误处理中间件 ===
app.use('*', async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const url = c.req.url;
    await next();
    const ms = Date.now() - start;
    const status = c.res.status;
    const logMsg = `${method} ${url} - ${status} (${ms}ms)`;
    if (status >= 500) logger.error(logMsg);
    else if (status >= 400 && status !== 401) logger.warn(logMsg);
    else logger.info(logMsg);
});

app.onError((err, c) => {
    if (err.message.includes('Unauthorized')) {
        return c.json({ error: 'Unauthorized', message: '未授权访问，请重新登录' }, 401);
    }
    logger.error(`全局未捕获异常: ${err.message}`, { stack: err.stack });
    return c.json({ error: '服务器内部错误', details: err.message }, 500);
});

const JWT_SECRET = process.env.JWT_SECRET || 'skycraft_secret_key_change_me';

// === 挂载后台管理路由 ===
app.route('/admin', adminRouter);

// === 公开路由 ===
app.get('/', (c) => c.text('SkyCraft AI Backend (Auth Enabled) is Running! 🚀'));
app.get('/api/config/pool', (c) => c.json(RANDOM_DATA_POOL));

// 注册
app.post('/api/auth/register', async (c) => {
    try {
        const { username, password } = await c.req.json();
        if (!username || !password || String(password).length < 6) {
            return c.json({ error: '用户名或密码无效 (密码至少6位)' }, 400);
        }
        const existing = db.getUserByUsername(username);
        if (existing) return c.json({ error: '用户名已存在' }, 400);
        
        const userId = crypto.randomUUID();
        const user = db.createUser(userId, username, password);
        logger.info(`新用户注册: ${username} (${userId})`);
        const token = await sign({ id: user.id, username: user.username, role: 'user', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, JWT_SECRET);
        return c.json({ token, user: { id: user.id, username: user.username } });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// 登录
app.post('/api/auth/login', async (c) => {
    try {
        const { username, password } = await c.req.json();
        const user = db.getUserByUsername(username);
        if (!user || user.password_hash !== password) {
            return c.json({ error: '用户名或密码错误' }, 401);
        }
        logger.info(`用户登录: ${username}`);
        const token = await sign({ id: user.id, username: user.username, role: 'user', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, JWT_SECRET);
        return c.json({ token, user: { id: user.id, username: user.username } });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// === 受保护路由 ===
app.use('/api/generate', jwt({ secret: JWT_SECRET }));
app.use('/api/archives/*', jwt({ secret: JWT_SECRET }));
app.use('/api/cards/*', jwt({ secret: JWT_SECRET }));
app.use('/api/projects/*', jwt({ secret: JWT_SECRET }));

// AI 生成
app.post('/api/generate', async (c) => {
    const startTime = Date.now();
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        return c.json({ error: "Server API Key not configured" }, 500);
    }

    const apiKeyMasked = `...${API_KEY.slice(-4)}`;
    const modelName = 'gemini-2.5-flash';
    const payload = c.get('jwtPayload'); 
    
    // 准备审计日志对象
    let auditLog: any = {
        user: payload.username,
        model: modelName,
        apiKey: apiKeyMasked,
        systemInstruction: SYSTEM_INSTRUCTION,
        request: {},
        response: {},
    };

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const body = await c.req.json();
        const { settings, step, context, references, extraPrompt } = body as { 
            settings: NovelSettings, 
            step: WorkflowStep,
            context?: string,
            references?: ReferenceNovel[] | string,
            extraPrompt?: string 
        };

        if (!step) return c.json({ error: "Missing step parameter" }, 400);

        let prompt = '';
        try {
            switch (step) {
                case WorkflowStep.IDEA: 
                    prompt = PROMPT_BUILDERS.IDEA(settings, context); 
                    break;
                case WorkflowStep.ANALYSIS_IDEA:
                    if (!references || (Array.isArray(references) && references.length === 0)) return c.json({ error: "需提供参考小说" }, 400);
                    prompt = PROMPT_BUILDERS.ANALYSIS_IDEA(settings, references as ReferenceNovel[]);
                    break;
                case WorkflowStep.OUTLINE: prompt = PROMPT_BUILDERS.OUTLINE(settings, context || ''); break;
                case WorkflowStep.CHARACTER: prompt = PROMPT_BUILDERS.CHARACTER(settings); break;
                case WorkflowStep.CHAPTER: prompt = PROMPT_BUILDERS.CHAPTER(settings, context || ''); break;
                case WorkflowStep.MIND_MAP_NODE:
                     prompt = PROMPT_BUILDERS.MIND_MAP_NODE(context || '', extraPrompt || '', typeof references === 'string' ? references : undefined);
                     break;
                default: return c.json({ error: "Invalid step" }, 400);
            }
        } catch (err) { return c.json({ error: "Prompt build failed" }, 500); }

        // 填充请求日志
        auditLog.request = {
            step,
            fullPrompt: prompt,
            settings
        };
        
        logger.info(`[AI Start] ${step} by ${payload.username}`);

        const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.85, 
            }
        });

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // 异步处理流和日志
        (async () => {
            let fullResponseText = '';
            let tokenUsage = null;
            
            try {
                for await (const chunk of responseStream) {
                    if (chunk.text) {
                        const text = chunk.text;
                        fullResponseText += text;
                        await writer.write(encoder.encode(text));
                    }
                    if (chunk.usageMetadata) {
                        tokenUsage = chunk.usageMetadata;
                    }
                }
                
                // 记录成功日志
                const duration = Date.now() - startTime;
                auditLog.response = {
                    timeCost: `${duration}ms`,
                    tokenUsage: tokenUsage, // Gemini 返回 { promptTokenCount, candidatesTokenCount, totalTokenCount }
                    fullText: fullResponseText
                };
                
                logger.info(`[AI Success] ${step} Completed (${duration}ms)`, auditLog);

            } catch (err: any) {
                const duration = Date.now() - startTime;
                auditLog.response = {
                    timeCost: `${duration}ms`,
                    error: err.message,
                    partialText: fullResponseText
                };
                logger.error(`[AI Error] ${step} Failed`, auditLog);
                await writer.write(encoder.encode(`\n[Error: ${err.message}]`));
            } finally {
                await writer.close();
            }
        })();

        return c.newResponse(readable, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
        });

    } catch (error: any) {
        if (error.message && error.message.includes('fetch failed')) {
            logger.error("AI 服务连接失败", { error: error.message, apiKeyMasked });
            return c.json({ error: "AI 服务连接超时" }, 503);
        }
        logger.error("AI 请求初始化失败", { error: error.message, auditLog });
        return c.json({ error: error.message }, 500);
    }
});

// 存档接口
app.get('/api/archives', (c) => {
    const payload = c.get('jwtPayload');
    const archives = db.getArchivesByUser(payload.id);
    const result = archives.map(a => {
        try { return { ...a, ...JSON.parse(a.content), content: undefined }; } catch (e) { return a; }
    });
    return c.json(result);
});

app.post('/api/archives', async (c) => {
    const payload = c.get('jwtPayload');
    const { id, title, settings, history } = await c.req.json();
    const contentStr = JSON.stringify({ settings, history });
    if (id) {
        db.updateArchive(id, payload.id, title, contentStr);
        return c.json({ success: true, id });
    } else {
        const newId = crypto.randomUUID();
        const archive = db.createArchive(newId, payload.id, title, contentStr);
        return c.json({ ...archive, settings, history, content: undefined });
    }
});

app.delete('/api/archives/:id', (c) => {
    const payload = c.get('jwtPayload');
    db.deleteArchive(c.req.param('id'), payload.id);
    return c.json({ success: true });
});

// 卡片接口
app.get('/api/cards', (c) => {
    const payload = c.get('jwtPayload');
    const cards = db.getIdeaCardsByUser(payload.id);
    const result = cards.map(c => {
        try { return { id: c.id, userId: c.user_id, title: c.title, created_at: c.created_at, ...JSON.parse(c.content) }; } catch(e) { return c; }
    });
    return c.json(result);
});

app.post('/api/cards', async (c) => {
    const payload = c.get('jwtPayload');
    const data = await c.req.json();
    const id = crypto.randomUUID();
    const card = db.createIdeaCard(id, payload.id, data);
    return c.json({ id: card.id, userId: card.user_id, title: card.title, created_at: card.created_at, ...data });
});

app.delete('/api/cards/:id', (c) => {
    const payload = c.get('jwtPayload');
    db.deleteIdeaCard(c.req.param('id'), payload.id);
    return c.json({ success: true });
});

// === IDE 项目接口 ===

app.post('/api/projects/from-card', async (c) => {
    const payload = c.get('jwtPayload');
    const { cardId, title, description } = await c.req.json();
    const projectId = crypto.randomUUID();
    const project = db.createProject(projectId, payload.id, title, description || '', cardId);
    
    // 初始化空导图
    const mapId = crypto.randomUUID();
    const initialMapData = JSON.stringify({ root: { id: 'root', label: title || '核心创意', children: [] } });
    db.createMindMap(mapId, projectId, '核心架构', initialMapData);

    // 初始化第一章
    db.createChapter(crypto.randomUUID(), projectId, '第一章', '', 1);

    return c.json(project);
});

app.get('/api/projects', (c) => {
    const payload = c.get('jwtPayload');
    return c.json(db.getProjectsByUser(payload.id));
});

// 删除项目 (新增)
app.delete('/api/projects/:id', (c) => {
    const payload = c.get('jwtPayload');
    const projectId = c.req.param('id');
    db.deleteProject(projectId, payload.id);
    logger.info(`用户删除项目: ${projectId}`);
    return c.json({ success: true });
});

app.get('/api/projects/:id/structure', (c) => {
    const projectId = c.req.param('id');
    const chapters = db.getChaptersByProject(projectId);
    // 这里获取的是列表，不含 data 大字段
    const maps = db.getMindMapsByProject(projectId); 
    return c.json({ chapters, maps });
});

// 获取单个 MindMap 详情（含 data）
app.get('/api/projects/:pid/maps/:mid', (c) => {
    const map = db.getMindMapById(c.req.param('mid'));
    if (!map) return c.json({ error: "Not found" }, 404);
    return c.json(map);
});

app.post('/api/projects/:pid/maps', async (c) => {
    const projectId = c.req.param('pid');
    const mapId = crypto.randomUUID();
    const initialMapData = JSON.stringify({ root: { id: 'root', label: '新思维导图', children: [] } });
    const map = db.createMindMap(mapId, projectId, '未命名导图', initialMapData);
    return c.json(map);
});

app.put('/api/projects/:pid/maps/:mid', async (c) => {
    const projectId = c.req.param('pid');
    const mapId = c.req.param('mid');
    const { title, data } = await c.req.json();
    db.updateMindMap(mapId, projectId, title, data);
    return c.json({ success: true });
});

app.delete('/api/projects/:pid/maps/:mid', (c) => {
    const projectId = c.req.param('pid');
    const mapId = c.req.param('mid');
    db.deleteMindMap(mapId, projectId);
    return c.json({ success: true });
});

export default app;

if (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.node) {
    import('@hono/node-server').then(({ serve }) => {
        const port = Number(process.env.PORT) || 3000;
        logger.info(`🚀 SkyCraft Server running on port ${port}`);
        serve({ fetch: app.fetch, port });
    });
}
