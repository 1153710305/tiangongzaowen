
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION, PROMPT_BUILDERS } from './prompts.ts';
import { RANDOM_DATA_POOL } from './data.ts';
import { NovelSettings, WorkflowStep, ReferenceNovel } from './types.ts';
import { logger } from './logger.ts'; // 引入日志模块
import { adminRouter } from './admin_router.ts'; // 引入解耦后的后台路由
import * as db from './db.ts';

// 初始化数据库
try {
    db.initDB();
    logger.info("数据库初始化成功");
} catch (e: any) {
    logger.error("数据库初始化失败", { error: e.message });
    // 使用 process.exit(1) 而不是 casting，确保 Node 环境下正常退出
    if (typeof process !== 'undefined') {
        (process as any).exit(1);
    }
}

const app = new Hono();

// 配置 CORS
app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}));

// === 全局日志与错误处理中间件 ===

// 1. 请求日志中间件
app.use('*', async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const url = c.req.url;

    await next();

    const ms = Date.now() - start;
    const status = c.res.status;
    
    // 记录请求日志
    const logMsg = `${method} ${url} - ${status} (${ms}ms)`;
    if (status >= 500) {
        logger.error(logMsg);
    } else if (status >= 400 && status !== 401) { // 401 属于正常鉴权失败，降级为 info 或 warn
        logger.warn(logMsg);
    } else {
        logger.info(logMsg);
    }
});

// 2. 全局错误捕获
app.onError((err, c) => {
    // 专门处理 JWT 鉴权失败的错误
    if (err.message.includes('Unauthorized')) {
        return c.json({ error: 'Unauthorized', message: '未授权访问，请重新登录' }, 401);
    }

    logger.error(`全局未捕获异常: ${err.message}`, { stack: err.stack });
    return c.json({ error: '服务器内部错误', details: err.message }, 500);
});

// API Key & JWT Secret
const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'skycraft_secret_key_change_me';

if (!API_KEY) {
    logger.error("❌ 严重错误: API_KEY 未设置");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

// === 挂载后台管理路由 (功能解耦) ===
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
        if (existing) {
            return c.json({ error: '用户名已存在' }, 400);
        }

        const passwordHash = password; // ⚠️ DEMO ONLY: 真实项目请务必 Hash!
        
        const userId = crypto.randomUUID();
        const user = db.createUser(userId, username, passwordHash);
        
        logger.info(`新用户注册: ${username} (${userId})`);

        const token = await sign({ id: user.id, username: user.username, role: 'user', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, JWT_SECRET);
        
        return c.json({ token, user: { id: user.id, username: user.username } });
    } catch (e: any) {
        logger.error(`注册失败`, { error: e.message });
        return c.json({ error: e.message }, 500);
    }
});

// 登录
app.post('/api/auth/login', async (c) => {
    try {
        const { username, password } = await c.req.json();
        const user = db.getUserByUsername(username);
        
        if (!user || user.password_hash !== password) {
            logger.warn(`登录失败: ${username} (凭证错误)`);
            return c.json({ error: '用户名或密码错误' }, 401);
        }

        logger.info(`用户登录: ${username}`);
        const token = await sign({ id: user.id, username: user.username, role: 'user', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, JWT_SECRET);
        
        return c.json({ token, user: { id: user.id, username: user.username } });
    } catch (e: any) {
        logger.error(`登录接口异常`, { error: e.message });
        return c.json({ error: e.message }, 500);
    }
});

// === 普通用户受保护路由 ===

app.use('/api/generate', jwt({ secret: JWT_SECRET }));
app.use('/api/archives/*', jwt({ secret: JWT_SECRET }));
app.use('/api/cards/*', jwt({ secret: JWT_SECRET }));
app.use('/api/projects/*', jwt({ secret: JWT_SECRET })); // 新增: Projects API

// AI 生成 (受保护)
app.post('/api/generate', async (c) => {
    if (!API_KEY) return c.json({ error: "Server API Key not configured" }, 500);

    const payload = c.get('jwtPayload'); 
    logger.info(`[AI生成] 用户: ${payload.username} 请求生成`);

    try {
        const body = await c.req.json();
        const { settings, step, context, references } = body as { 
            settings: NovelSettings, 
            step: WorkflowStep,
            context?: string,
            references?: ReferenceNovel[] 
        };

        if (!settings || !step) return c.json({ error: "Missing parameters" }, 400);

        let prompt = '';
        try {
            switch (step) {
                // IDEA 步骤支持传入 context (一句话灵感)
                case WorkflowStep.IDEA: 
                    prompt = PROMPT_BUILDERS.IDEA(settings, context); 
                    break;
                // 分析仿写模式
                case WorkflowStep.ANALYSIS_IDEA:
                    if (!references || references.length === 0) {
                        return c.json({ error: "分析模式需要提供参考小说" }, 400);
                    }
                    prompt = PROMPT_BUILDERS.ANALYSIS_IDEA(settings, references);
                    break;
                case WorkflowStep.OUTLINE: prompt = PROMPT_BUILDERS.OUTLINE(settings, context || ''); break;
                case WorkflowStep.CHARACTER: prompt = PROMPT_BUILDERS.CHARACTER(settings); break;
                case WorkflowStep.CHAPTER: prompt = PROMPT_BUILDERS.CHAPTER(settings, context || ''); break;
                default: return c.json({ error: "Invalid step" }, 400);
            }
        } catch (err) { return c.json({ error: "Prompt build failed" }, 500); }

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.85, 
                topP: 0.95,
                topK: 40,
            }
        });

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        (async () => {
            try {
                for await (const chunk of responseStream) {
                    if (chunk.text) await writer.write(encoder.encode(chunk.text));
                }
            } catch (err: any) {
                logger.error("AI流式传输中断", { error: err.message });
                await writer.write(encoder.encode(`\n[System Error: ${err.message}]`));
            } finally {
                await writer.close();
            }
        })();

        return c.newResponse(readable, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
        });

    } catch (error: any) {
        logger.error("AI生成请求失败", { error: error.message });
        return c.json({ error: error.message }, 500);
    }
});

// 获取存档列表
app.get('/api/archives', (c) => {
    const payload = c.get('jwtPayload');
    try {
        const archives = db.getArchivesByUser(payload.id);
        const result = archives.map(a => {
            try {
                const content = JSON.parse(a.content);
                return { ...a, ...content, content: undefined };
            } catch (e) {
                return a;
            }
        });
        return c.json(result);
    } catch (e: any) {
        logger.error(`获取存档失败`, { user: payload.username, error: e.message });
        return c.json({ error: '获取失败' }, 500);
    }
});

// 保存存档
app.post('/api/archives', async (c) => {
    const payload = c.get('jwtPayload');
    try {
        const { id, title, settings, history } = await c.req.json();
        
        const contentStr = JSON.stringify({ settings, history });
        
        if (id) {
            db.updateArchive(id, payload.id, title, contentStr);
            logger.info(`用户 ${payload.username} 更新了存档: ${id}`);
            return c.json({ success: true, id });
        } else {
            const newId = crypto.randomUUID();
            const archive = db.createArchive(newId, payload.id, title, contentStr);
            logger.info(`用户 ${payload.username} 创建了新存档: ${newId}`);
            
            return c.json({ 
                ...archive, 
                settings, 
                history, 
                content: undefined 
            });
        }
    } catch (e: any) {
        logger.error(`保存存档失败`, { error: e.message });
        return c.json({ error: '保存失败' }, 500);
    }
});

// 删除存档
app.delete('/api/archives/:id', (c) => {
    const payload = c.get('jwtPayload');
    const id = c.req.param('id');
    try {
        db.deleteArchive(id, payload.id);
        logger.info(`用户 ${payload.username} 删除了存档: ${id}`);
        return c.json({ success: true });
    } catch (e: any) {
        logger.error(`删除存档失败`, { error: e.message });
        return c.json({ error: '删除失败' }, 500);
    }
});

// === 脑洞卡片接口 ===

app.get('/api/cards', (c) => {
    const payload = c.get('jwtPayload');
    try {
        const cards = db.getIdeaCardsByUser(payload.id);
        const result = cards.map(c => {
            try {
                const content = JSON.parse(c.content);
                return { 
                    id: c.id, 
                    userId: c.user_id, 
                    title: c.title, 
                    created_at: c.created_at,
                    ...content 
                };
            } catch(e) { return c; }
        });
        return c.json(result);
    } catch (e: any) {
        return c.json({ error: "获取失败" }, 500);
    }
});

app.post('/api/cards', async (c) => {
    const payload = c.get('jwtPayload');
    try {
        const data = await c.req.json();
        const id = crypto.randomUUID();
        const card = db.createIdeaCard(id, payload.id, data);
        logger.info(`用户 ${payload.username} 保存了脑洞卡片: ${data.title}`);
        return c.json({ 
            id: card.id, 
            userId: card.user_id, 
            title: card.title, 
            created_at: card.created_at,
            ...data
        });
    } catch (e: any) {
        return c.json({ error: "保存失败" }, 500);
    }
});

app.delete('/api/cards/:id', (c) => {
    const payload = c.get('jwtPayload');
    const id = c.req.param('id');
    try {
        db.deleteIdeaCard(id, payload.id);
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: '删除失败' }, 500);
    }
});

// === IDE 项目相关接口 (v2.7 新增) ===

// 1. 从脑洞卡片创建新项目
app.post('/api/projects/from-card', async (c) => {
    const payload = c.get('jwtPayload');
    try {
        const { cardId, title, description } = await c.req.json();
        const projectId = crypto.randomUUID();
        
        // 1. 创建项目
        const project = db.createProject(projectId, payload.id, title, description || '', cardId);
        
        // 2. 初始化思维导图 (空)
        const mapId = crypto.randomUUID();
        const initialMapData = JSON.stringify({ nodes: [{ id: 'root', label: '核心创意', type: 'root' }] });
        db.createMindMap(mapId, projectId, '核心架构', initialMapData);

        // 3. 初始化正文第一章 (空)
        const chapterId = crypto.randomUUID();
        db.createChapter(chapterId, projectId, '第一章', '', 1);

        logger.info(`用户 ${payload.username} 从卡片创建了项目: ${title}`);
        return c.json(project);
    } catch (e: any) {
        logger.error("创建项目失败", { error: e.message });
        return c.json({ error: "创建项目失败" }, 500);
    }
});

// 2. 获取项目列表
app.get('/api/projects', (c) => {
    const payload = c.get('jwtPayload');
    try {
        const projects = db.getProjectsByUser(payload.id);
        return c.json(projects);
    } catch (e: any) {
        return c.json({ error: "获取项目失败" }, 500);
    }
});

// 3. 获取项目结构 (Chapters & MindMaps)
app.get('/api/projects/:id/structure', (c) => {
    const projectId = c.req.param('id');
    try {
        const chapters = db.getChaptersByProject(projectId);
        const maps = db.getMindMapsByProject(projectId);
        return c.json({ chapters, maps });
    } catch (e: any) {
        return c.json({ error: "获取结构失败" }, 500);
    }
});

export default app;

// 本地启动
if (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.node) {
    import('@hono/node-server').then(({ serve }) => {
        const port = Number(process.env.PORT) || 3000;
        logger.info(`🚀 SkyCraft Server 正在启动... 端口: ${port}`);
        logger.info(`👉 后台管理入口: http://localhost:${port}/admin`);
        serve({ fetch: app.fetch, port });
    });
}
