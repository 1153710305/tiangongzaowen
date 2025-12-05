
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION, PROMPT_BUILDERS } from './prompts.ts';
import { getDataPool, updateDataPool } from './data.ts';
import { NovelSettings, WorkflowStep, UserRole } from './types.ts';
import * as db from './db.ts';

// 初始化数据库
db.initDB();

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

// API Key & JWT Secret
const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'skycraft_secret_key_change_me';

if (!API_KEY) {
    console.error("❌ 严重错误: API_KEY 未设置");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

// === 公开路由 ===

app.get('/', (c) => c.text('SkyCraft AI Backend (Auth Enabled) is Running! 🚀'));

// 获取素材池 (公开，但数据由 Admin 控制)
app.get('/api/config/pool', (c) => c.json(getDataPool()));

// 注册
app.post('/api/auth/register', async (c) => {
    try {
        const { username, password } = await c.req.json();
        if (!username || !password || password.length < 6) {
            return c.json({ error: '用户名或密码无效 (密码至少6位)' }, 400);
        }
        
        const existing = db.getUserByUsername(username);
        if (existing) {
            return c.json({ error: '用户名已存在' }, 400);
        }

        // 简单模拟 Hash
        const passwordHash = password; 
        
        const userId = crypto.randomUUID();
        const user = db.createUser(userId, username, passwordHash);
        
        const token = await sign({ 
            id: user.id, 
            username: user.username, 
            role: user.role, // Payload 中包含 role
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 
        }, JWT_SECRET); 
        
        return c.json({ token, user: { id: user.id, username: user.username, role: user.role } });
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

        const token = await sign({ 
            id: user.id, 
            username: user.username, 
            role: user.role, 
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 
        }, JWT_SECRET);
        
        return c.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// === 受保护路由 (通用) ===

app.use('/api/generate', jwt({ secret: JWT_SECRET }));
app.use('/api/archives/*', jwt({ secret: JWT_SECRET }));
app.use('/api/admin/*', jwt({ secret: JWT_SECRET }));

// AI 生成
app.post('/api/generate', async (c) => {
    if (!API_KEY) return c.json({ error: "Server API Key not configured" }, 500);

    const payload = c.get('jwtPayload'); 
    console.log(`[Generate] User: ${payload.username}`);

    try {
        const body = await c.req.json();
        const { settings, step, context } = body as { 
            settings: NovelSettings, 
            step: WorkflowStep,
            context?: string 
        };

        if (!settings || !step) return c.json({ error: "Missing parameters" }, 400);

        let prompt = '';
        try {
            switch (step) {
                case WorkflowStep.IDEA: prompt = PROMPT_BUILDERS.IDEA(settings); break;
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
                temperature: 0.8,
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
            } catch (err) {
                console.error("Stream Error", err);
                await writer.write(encoder.encode(`\n[Error: ${err}]`));
            } finally {
                await writer.close();
            }
        })();

        return c.newResponse(readable, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
        });

    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Archive CRUD
app.get('/api/archives', (c) => {
    const payload = c.get('jwtPayload');
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
        db.createArchive(newId, payload.id, title, contentStr);
        return c.json({ success: true, id: newId });
    }
});

app.delete('/api/archives/:id', (c) => {
    const payload = c.get('jwtPayload');
    const id = c.req.param('id');
    db.deleteArchive(id, payload.id);
    return c.json({ success: true });
});

// === Admin 路由 ===

// 中间件：管理员权限检查
const adminCheck = async (c: any, next: any) => {
    const payload = c.get('jwtPayload');
    // 双重校验：Token Claim + DB Lookup (最安全，但会有一次极快的DB查询)
    const user = db.getUserById(payload.id);
    if (!user || user.role !== UserRole.ADMIN) {
        return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }
    await next();
};

app.get('/api/admin/stats', adminCheck, (c) => {
    return c.json(db.getSystemStats());
});

app.get('/api/admin/users', adminCheck, (c) => {
    return c.json(db.getAllUsers());
});

// 获取素材池（管理员用，可能包含未公开字段）
app.get('/api/admin/pool', adminCheck, (c) => {
    return c.json(getDataPool());
});

// 更新素材池（热更新）
app.post('/api/admin/pool', adminCheck, async (c) => {
    try {
        const newData = await c.req.json();
        updateDataPool(newData);
        return c.json({ success: true, message: "Pool updated successfully" });
    } catch (e: any) {
        return c.json({ error: e.message }, 400);
    }
});

export default app;

// 本地启动
if (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.node) {
    import('@hono/node-server').then(({ serve }) => {
        const port = Number(process.env.PORT) || 3000;
        console.log(`SkyCraft Server running on port ${port}`);
        serve({ fetch: app.fetch, port });
    });
}
