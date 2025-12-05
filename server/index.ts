
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION, PROMPT_BUILDERS } from './prompts.ts';
import { RANDOM_DATA_POOL } from './data.ts';
import { NovelSettings, WorkflowStep } from './types.ts';
import * as db from './db.ts';

// 初始化数据库
db.initDB();

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

// API Key & JWT Secret
const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'skycraft_secret_key_change_me';

if (!API_KEY) {
    console.error("❌ 严重错误: API_KEY 未设置");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

// === 公开路由 ===

app.get('/', (c) => c.text('SkyCraft AI Backend (Auth Enabled) is Running! 🚀'));

app.get('/api/config/pool', (c) => c.json(RANDOM_DATA_POOL));

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

        // 简单模拟 Hash，生产环境建议使用 bcryptjs (但在纯 serverless/edge 环境 bcrypt 可能有问题，Hono 推荐 web crypto)
        // 为了性能和兼容性，这里使用简单的 Web Crypto 模拟
        // 注意：实际生产请用 bcryptjs 或 argon2
        const passwordHash = password; // ⚠️ DEMO ONLY: 真实项目请务必 Hash!
        
        const userId = crypto.randomUUID();
        const user = db.createUser(userId, username, passwordHash);
        
        const token = await sign({ id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, JWT_SECRET); // 7天过期
        
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
        
        // ⚠️ DEMO ONLY: 真实项目请对比 Hash
        if (!user || user.password_hash !== password) {
            return c.json({ error: '用户名或密码错误' }, 401);
        }

        const token = await sign({ id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, JWT_SECRET);
        
        return c.json({ token, user: { id: user.id, username: user.username } });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// === 受保护路由 (需要 Bearer Token) ===

// 中间件：JWT 验证
app.use('/api/generate', jwt({ secret: JWT_SECRET }));
app.use('/api/archives/*', jwt({ secret: JWT_SECRET }));

// AI 生成 (受保护)
app.post('/api/generate', async (c) => {
    if (!API_KEY) return c.json({ error: "Server API Key not configured" }, 500);

    const payload = c.get('jwtPayload'); // 获取用户信息 (Payload)
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

// 获取存档列表
app.get('/api/archives', (c) => {
    const payload = c.get('jwtPayload');
    const archives = db.getArchivesByUser(payload.id);
    // 解析 JSON 内容
    const result = archives.map(a => {
        try {
            const content = JSON.parse(a.content);
            return { ...a, ...content, content: undefined }; // 展平结构
        } catch (e) {
            return a;
        }
    });
    return c.json(result);
});

// 保存存档
app.post('/api/archives', async (c) => {
    const payload = c.get('jwtPayload');
    const { id, title, settings, history } = await c.req.json();
    
    const contentStr = JSON.stringify({ settings, history });
    
    if (id) {
        // Update
        db.updateArchive(id, payload.id, title, contentStr);
        return c.json({ success: true, id });
    } else {
        // Create
        const newId = crypto.randomUUID();
        db.createArchive(newId, payload.id, title, contentStr);
        return c.json({ success: true, id: newId });
    }
});

// 删除存档
app.delete('/api/archives/:id', (c) => {
    const payload = c.get('jwtPayload');
    const id = c.req.param('id');
    db.deleteArchive(id, payload.id);
    return c.json({ success: true });
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
