
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
    logger.info("数据库初始化成功");
} catch (e: any) {
    logger.error("数据库初始化失败", { error: e.message });
    if (typeof process !== 'undefined') {
        (process as any).exit(1);
    }
}

const app = new Hono();

app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}));

// === 日志与错误处理 ===
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

const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'skycraft_secret_key_change_me';
if (!API_KEY) logger.error("❌ 严重错误: API_KEY 未设置");
const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

app.route('/admin', adminRouter);

// === 公开路由 ===
app.get('/', (c) => c.text('SkyCraft AI Backend (Auth Enabled) is Running! 🚀'));
app.get('/api/config/pool', (c) => c.json(RANDOM_DATA_POOL));

// 注册 & 登录
app.post('/api/auth/register', async (c) => {
    try {
        const { username, password } = await c.req.json();
        if (!username || !password || String(password).length < 6) return c.json({ error: '无效参数' }, 400);
        if (db.getUserByUsername(username)) return c.json({ error: '用户名已存在' }, 400);
        const user = db.createUser(crypto.randomUUID(), username, password);
        const token = await sign({ id: user.id, username: user.username, role: 'user', exp: Math.floor(Date.now() / 1000) + 604800 }, JWT_SECRET);
        return c.json({ token, user: { id: user.id, username: user.username } });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/api/auth/login', async (c) => {
    try {
        const { username, password } = await c.req.json();
        const user = db.getUserByUsername(username);
        if (!user || user.password_hash !== password) return c.json({ error: '用户名或密码错误' }, 401);
        const token = await sign({ id: user.id, username: user.username, role: 'user', exp: Math.floor(Date.now() / 1000) + 604800 }, JWT_SECRET);
        return c.json({ token, user: { id: user.id, username: user.username } });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// === 受保护路由 ===
app.use('/api/*', jwt({ secret: JWT_SECRET }));

// 1. AI 生成
app.post('/api/generate', async (c) => {
    if (!API_KEY) return c.json({ error: "API Key Missing" }, 500);
    const payload = c.get('jwtPayload');
    try {
        const body = await c.req.json();
        const { settings, step, context, references } = body;
        
        let prompt = '';
        if (step === WorkflowStep.IDEA) prompt = PROMPT_BUILDERS.IDEA(settings, context);
        else if (step === WorkflowStep.ANALYSIS_IDEA) prompt = PROMPT_BUILDERS.ANALYSIS_IDEA(settings, references || []);
        else if (step === WorkflowStep.OUTLINE) prompt = PROMPT_BUILDERS.OUTLINE(settings, context);
        else if (step === WorkflowStep.CHARACTER) prompt = PROMPT_BUILDERS.CHARACTER(settings);
        else if (step === WorkflowStep.CHAPTER) prompt = PROMPT_BUILDERS.CHAPTER(settings, context);
        else return c.json({ error: "Invalid step" }, 400);

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.85 }
        });

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        (async () => {
            try {
                for await (const chunk of responseStream) {
                    if (chunk.text) await writer.write(encoder.encode(chunk.text));
                }
            } catch (err: any) { await writer.write(encoder.encode(`\n[Error: ${err.message}]`)); } 
            finally { await writer.close(); }
        })();
        return c.newResponse(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// 2. 存档管理 (Archives)
app.get('/api/archives', (c) => {
    const payload = c.get('jwtPayload');
    const list = db.getArchivesByUser(payload.id).map(a => {
        try { return { ...a, ...JSON.parse(a.content), content: undefined }; } catch { return a; }
    });
    return c.json(list);
});
app.post('/api/archives', async (c) => {
    const payload = c.get('jwtPayload');
    const { id, title, settings, history } = await c.req.json();
    const content = JSON.stringify({ settings, history });
    if (id) { db.updateArchive(id, payload.id, title, content); return c.json({ success: true, id }); }
    const newArch = db.createArchive(crypto.randomUUID(), payload.id, title, content);
    return c.json({ ...newArch, settings, history, content: undefined });
});
app.delete('/api/archives/:id', (c) => {
    const id = c.req.param('id');
    db.deleteArchive(id, c.get('jwtPayload').id);
    return c.json({ success: true });
});

// 3. 脑洞卡片 (Cards)
app.get('/api/cards', (c) => {
    const payload = c.get('jwtPayload');
    const list = db.getIdeaCardsByUser(payload.id).map(c => {
        try { return { id: c.id, userId: c.user_id, title: c.title, created_at: c.created_at, ...JSON.parse(c.content) }; } catch { return c; }
    });
    return c.json(list);
});
app.post('/api/cards', async (c) => {
    const payload = c.get('jwtPayload');
    const data = await c.req.json();
    const id = crypto.randomUUID();
    const card = db.createIdeaCard(id, payload.id, data);
    return c.json({ id: card.id, userId: card.user_id, title: card.title, created_at: card.created_at, ...data });
});
app.delete('/api/cards/:id', (c) => {
    db.deleteIdeaCard(c.req.param('id'), c.get('jwtPayload').id);
    return c.json({ success: true });
});

// 4. 小说项目 (Novels) - New
app.post('/api/novels/init', async (c) => {
    const payload = c.get('jwtPayload');
    const { cardId, title } = await c.req.json();
    if (!cardId || !title) return c.json({ error: "Missing cardId or title" }, 400);
    
    try {
        const novel = db.initNovelFromCard(payload.id, cardId, title);
        logger.info(`初始化小说项目: ${title}`);
        return c.json(novel);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});
app.get('/api/novels', (c) => {
    const payload = c.get('jwtPayload');
    return c.json(db.getNovelsByUser(payload.id));
});

// 5. 章节管理 (Chapters) - New
app.get('/api/novels/:id/chapters', (c) => {
    const novelId = c.req.param('id');
    return c.json(db.getChaptersList(novelId));
});
app.get('/api/chapters/:id', (c) => {
    const chapter = db.getChapterContent(c.req.param('id'));
    if (!chapter) return c.json({ error: "Not found" }, 404);
    return c.json(chapter);
});
app.post('/api/chapters', async (c) => {
    const { novelId, title, content } = await c.req.json();
    return c.json(db.createChapter(novelId, title, content));
});
app.put('/api/chapters/:id', async (c) => {
    const { title, content } = await c.req.json();
    db.updateChapter(c.req.param('id'), title, content);
    return c.json({ success: true });
});
app.delete('/api/chapters/:id', (c) => {
    db.deleteChapter(c.req.param('id'));
    return c.json({ success: true });
});

// 6. 思维导图管理 (Mind Maps) - New
app.get('/api/novels/:id/mindmaps', (c) => {
    return c.json(db.getMindMapsList(c.req.param('id')));
});
app.post('/api/mindmaps', async (c) => {
    const { novelId, title, nodes } = await c.req.json();
    return c.json(db.createMindMap(novelId, title, nodes));
});
app.put('/api/mindmaps/:id', async (c) => {
    const { title, nodes } = await c.req.json();
    db.updateMindMap(c.req.param('id'), title, nodes);
    return c.json({ success: true });
});
app.delete('/api/mindmaps/:id', (c) => {
    db.deleteMindMap(c.req.param('id'));
    return c.json({ success: true });
});

export default app;
