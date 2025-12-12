
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION, PROMPT_BUILDERS } from './prompts.ts';
import { RANDOM_DATA_POOL } from './data.ts';
import { NovelSettings, WorkflowStep, ReferenceNovel, SystemModelConfig, User } from './types.ts';
import { logger } from './logger.ts';
import { adminRouter } from './admin_router.ts';
import * as db from './db.ts';

// 初始化数据库
try {
    db.initDB();
    // 启动时清理回收站
    const deletedCount = db.cleanupRecycleBin();
    if (deletedCount > 0) logger.info(`[Startup] Cleaned ${deletedCount} expired projects from recycle bin.`);
    logger.info("✅ Database module loaded successfully (Messages & Announcements enabled)");
} catch (e: any) {
    logger.error("数据库初始化失败", { error: e.message });
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
    await next();
    const ms = Date.now() - start;
    if (c.res.status >= 500) logger.error(`${c.req.method} ${c.req.url} - ${c.res.status} (${ms}ms)`);
    else if (c.res.status >= 400 && c.res.status !== 401) logger.warn(`${c.req.method} ${c.req.url} - ${c.res.status} (${ms}ms)`);
});

app.onError((err, c) => {
    // 特殊处理 JWT 认证失败
    if (err.message === 'Unauthorized' || (err as any).status === 401) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    logger.error(`全局异常: ${err.message}`, { stack: err.stack });
    return c.json({ error: '服务器内部错误', details: err.message }, 500);
});

const JWT_SECRET = process.env.JWT_SECRET || 'skycraft_secret_key_change_me';

// === 挂载后台管理路由 ===
app.route('/admin', adminRouter);

// === 公开路由 ===
app.get('/', (c) => c.text('SkyCraft AI Backend (v3.1.0) is Running!'));
app.get('/api/config/pool', (c) => c.json(RANDOM_DATA_POOL));
app.get('/api/config/models', (c) => {
    try {
        const modelsStr = db.getSystemConfig('ai_models');
        const defaultModel = db.getSystemConfig('default_model');
        const allModels: SystemModelConfig[] = modelsStr ? JSON.parse(modelsStr) : [];
        return c.json({ models: allModels.filter(m => m.isActive !== false), defaultModel: defaultModel || 'gemini-2.5-flash' });
    } catch (e) { return c.json({ models: [], defaultModel: 'gemini-2.5-flash' }); }
});
app.get('/api/products', (c) => {
    try {
        const plansStr = db.getSystemConfig('product_plans');
        return c.json(plansStr ? JSON.parse(plansStr) : []);
    } catch (e) { return c.json([]); }
});
// 获取系统公告 (Public)
app.get('/api/announcements', (c) => c.json(db.getPublishedAnnouncements()));

// Auth
app.post('/api/auth/register', async (c) => {
    try {
        const { username, password } = await c.req.json();
        if (!username || !password || String(password).length < 6) return c.json({ error: '无效输入' }, 400);
        if (db.getUserByUsername(username)) return c.json({ error: '用户名已存在' }, 400);
        const userId = crypto.randomUUID();
        const user = db.createUser(userId, username, password);
        const token = await sign({ id: user.id, username: user.username, role: 'user', exp: Math.floor(Date.now() / 1000) + 604800 }, JWT_SECRET);
        return c.json({ token, user });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/api/auth/login', async (c) => {
    try {
        const { username, password } = await c.req.json();
        const user = db.getUserByUsername(username);
        if (!user || user.password_hash !== password) return c.json({ error: '用户名或密码错误' }, 401);
        const token = await sign({ id: user.id, username: user.username, role: 'user', exp: Math.floor(Date.now() / 1000) + 604800 }, JWT_SECRET);
        return c.json({ token, user });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// === 受保护路由 ===
app.use('/api/*', jwt({ secret: JWT_SECRET }));

app.get('/api/user/status', (c) => {
    const payload = c.get('jwtPayload');
    const user = db.getUserById(payload.id);
    if (!user) return c.json({ error: 'User not found' }, 404);
    const isVip = user.vip_expiry ? new Date(user.vip_expiry) > new Date() : false;
    return c.json({ id: user.id, username: user.username, tokens: user.tokens, vip_expiry: user.vip_expiry, isVip, referral_code: user.referral_code });
});

app.post('/api/user/buy', async (c) => {
    const payload = c.get('jwtPayload');
    const { productId } = await c.req.json();
    const plans = JSON.parse(db.getSystemConfig('product_plans') || '[]');
    const product = plans.find((p: any) => p.id === productId);
    if (!product) return c.json({ error: '商品不存在' }, 404);
    db.rechargeUser(payload.id, product.tokens, product.days, `购买:${product.name}`);
    return c.json({ success: true });
});

// AI Generate
app.post('/api/generate', async (c) => {
    const startTime = Date.now();
    const payload = c.get('jwtPayload');
    const user = db.getUserById(payload.id);
    if (!user || user.tokens <= 0) return c.json({ error: "代币不足" }, 402);

    const body = await c.req.json();
    const { settings, step, context, references, extraPrompt, model } = body as any;

    // VIP Check
    let modelName = model || db.getSystemConfig('default_model') || 'gemini-2.5-flash';
    const allModels: SystemModelConfig[] = JSON.parse(db.getSystemConfig('ai_models') || '[]');
    const targetModel = allModels.find(m => m.id === modelName);
    if (targetModel?.isVip) {
        const isVip = user.vip_expiry ? new Date(user.vip_expiry) > new Date() : false;
        if (!isVip) return c.json({ error: "会员专属模型" }, 403);
    }

    const apiKeyData = db.getNextAvailableApiKey();
    if (!apiKeyData) return c.json({ error: "暂无可用资源" }, 503);

    try {
        const ai = new GoogleGenAI({ apiKey: apiKeyData.key });
        let prompt = '';
        if (step === WorkflowStep.IDEA) prompt = PROMPT_BUILDERS.IDEA(settings, context);
        else if (step === WorkflowStep.ANALYSIS_IDEA) prompt = PROMPT_BUILDERS.ANALYSIS_IDEA(settings, references);
        else if (step === WorkflowStep.OUTLINE) prompt = PROMPT_BUILDERS.OUTLINE(settings, context);
        else if (step === WorkflowStep.CHARACTER) prompt = PROMPT_BUILDERS.CHARACTER(settings);
        else if (step === WorkflowStep.CHAPTER) prompt = PROMPT_BUILDERS.CHAPTER(settings, context, references);
        else if (step === WorkflowStep.MIND_MAP_NODE) prompt = PROMPT_BUILDERS.MIND_MAP_NODE(context, extraPrompt, references);

        if (extraPrompt && step !== WorkflowStep.MIND_MAP_NODE) prompt += `\n\n【用户指令】:\n${extraPrompt}`;

        const responseStream = await ai.models.generateContentStream({
            model: modelName, contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
                    if (chunk.text) { fullText += chunk.text; await writer.write(encoder.encode(chunk.text)); }
                    if (chunk.usageMetadata) totalTokens = (chunk.usageMetadata.promptTokenCount || 0) + (chunk.usageMetadata.candidatesTokenCount || 0);
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
                // Enhanced Logging for AI Tasks
                logger.info("AI Generation Task Completed", {
                    systemInstruction: SYSTEM_INSTRUCTION,
                    context: prompt,
                    response: fullText,
                    tokens: totalTokens,
                    model: modelName,
                    apiKey: `...${apiKeyData.key.slice(-4)}`,
                    duration: `${Date.now() - startTime}ms`
                });
            }
        })();

        return c.newResponse(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' } });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Archives & Cards (Existing...)
app.get('/api/archives', (c) => c.json(db.getArchivesByUser(c.get('jwtPayload').id).map(a => { try { return { ...a, ...JSON.parse(a.content), content: undefined }; } catch (e) { return a; } })));
app.post('/api/archives', async (c) => {
    const { id, title, settings, history } = await c.req.json();
    const uid = c.get('jwtPayload').id;
    const content = JSON.stringify({ settings, history });
    if (id) { db.updateArchive(id, uid, title, content); return c.json({ success: true, id }); }
    else { const nid = crypto.randomUUID(); db.createArchive(nid, uid, title, content); return c.json({ id: nid, title, settings, history }); }
});
app.delete('/api/archives/:id', (c) => { db.deleteArchive(c.req.param('id'), c.get('jwtPayload').id); return c.json({ success: true }); });

app.get('/api/cards', (c) => c.json(db.getIdeaCardsByUser(c.get('jwtPayload').id).map(x => { try { return { ...x, ...JSON.parse(x.content) }; } catch (e) { return x; } })));
app.post('/api/cards', async (c) => {
    const data = await c.req.json();
    const card = db.createIdeaCard(crypto.randomUUID(), c.get('jwtPayload').id, data);
    return c.json({ ...card, ...data });
});
app.delete('/api/cards/:id', (c) => { db.deleteIdeaCard(c.req.param('id'), c.get('jwtPayload').id); return c.json({ success: true }); });

// === Project / IDE (Updated) ===
app.post('/api/projects/from-card', async (c) => {
    const { cardId, title, description } = await c.req.json();
    const pid = crypto.randomUUID();
    const proj = db.createProject(pid, c.get('jwtPayload').id, title, description, cardId);
    db.createMindMap(crypto.randomUUID(), pid, '核心架构', JSON.stringify({ root: { id: 'root', label: title || '核心创意', children: [] } }));
    db.createChapter(crypto.randomUUID(), pid, '第一章', '', 1);
    return c.json(proj);
});
app.get('/api/projects', (c) => c.json(db.getProjectsByUser(c.get('jwtPayload').id)));
app.delete('/api/projects/:id', (c) => {
    // 软删除
    db.deleteProject(c.req.param('id'), c.get('jwtPayload').id);
    return c.json({ success: true });
});
// 回收站相关
app.get('/api/projects/trash/all', (c) => c.json(db.getDeletedProjectsByUser(c.get('jwtPayload').id)));
app.post('/api/projects/:id/restore', (c) => {
    db.restoreProject(c.req.param('id'), c.get('jwtPayload').id);
    return c.json({ success: true });
});
app.delete('/api/projects/:id/permanent', (c) => {
    db.permanentDeleteProject(c.req.param('id'), c.get('jwtPayload').id);
    return c.json({ success: true });
});

app.get('/api/projects/:id/structure', (c) => c.json({ chapters: db.getChaptersByProject(c.req.param('id')), maps: db.getMindMapsByProject(c.req.param('id')) }));
app.get('/api/projects/:pid/maps/:mid', (c) => c.json(db.getMindMapById(c.req.param('mid'))));
app.post('/api/projects/:pid/maps', async (c) => c.json(db.createMindMap(crypto.randomUUID(), c.req.param('pid'), '未命名导图', JSON.stringify({ root: { id: 'root', label: '新导图', children: [] } }))));
app.put('/api/projects/:pid/maps/:mid', async (c) => { const { title, data } = await c.req.json(); db.updateMindMap(c.req.param('mid'), c.req.param('pid'), title, data); return c.json({ success: true }); });
app.delete('/api/projects/:pid/maps/:mid', (c) => { db.deleteMindMap(c.req.param('mid'), c.req.param('pid')); return c.json({ success: true }); });
app.post('/api/projects/:pid/chapters', async (c) => { const { title, order } = await c.req.json(); return c.json(db.createChapter(crypto.randomUUID(), c.req.param('pid'), title || '新章节', '', order || 99)); });
app.get('/api/projects/:pid/chapters/:cid', (c) => c.json(db.getChapterById(c.req.param('cid'))));
app.put('/api/projects/:pid/chapters/:cid', async (c) => { const { title, content } = await c.req.json(); db.updateChapter(c.req.param('cid'), c.req.param('pid'), title, content); return c.json({ success: true }); });
app.delete('/api/projects/:pid/chapters/:cid', (c) => { db.deleteChapter(c.req.param('cid'), c.req.param('pid')); return c.json({ success: true }); });

// Prompts
app.get('/api/prompts', (c) => c.json(db.getUserPrompts(c.get('jwtPayload').id)));
app.post('/api/prompts', async (c) => { const { type, title, content } = await c.req.json(); return c.json(db.createUserPrompt(crypto.randomUUID(), c.get('jwtPayload').id, type, title, content)); });
app.put('/api/prompts/:id', async (c) => { const { title, content } = await c.req.json(); db.updateUserPrompt(c.req.param('id'), c.get('jwtPayload').id, title, content); return c.json({ success: true }); });
app.delete('/api/prompts/:id', (c) => { db.deleteUserPrompt(c.req.param('id'), c.get('jwtPayload').id); return c.json({ success: true }); });

// === Messages (Guestbook) ===
app.get('/api/messages', (c) => c.json(db.getMessagesByUser(c.get('jwtPayload').id)));
app.post('/api/messages', async (c) => {
    const { content } = await c.req.json();
    if (!content) return c.json({ error: '内容不能为空' }, 400);
    const msg = db.createMessage(crypto.randomUUID(), c.get('jwtPayload').id, content);
    return c.json(msg);
});

export default app;

if (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.node) {
    import('@hono/node-server').then(({ serve }) => {
        const port = Number(process.env.PORT) || 3000;
        logger.info(`🚀 SkyCraft Server running on port ${port}`);
        serve({ fetch: app.fetch, port });
    });
}
