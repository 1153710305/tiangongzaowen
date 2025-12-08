
import { Hono } from 'hono';
import { jwt, sign } from 'hono/jwt';
import { logger } from './logger.ts';
import * as db from './db.ts';
import { ADMIN_HTML } from './admin_ui.ts';

// 环境变量配置
const JWT_SECRET = process.env.JWT_SECRET || 'skycraft_secret_key_change_me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const adminRouter = new Hono();

// 1. 渲染后台 HTML 页面 (服务端渲染)
adminRouter.get('/', (c) => {
    return c.html(ADMIN_HTML);
});

// 2. 后台登录接口 (公开)
adminRouter.post('/api/login', async (c) => {
    try {
        const { password } = await c.req.json();
        if (password === ADMIN_PASSWORD) {
            logger.warn("管理员登录后台成功");
            // 签发管理员 Token，有效期 1 小时
            const token = await sign({ role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
            return c.json({ token });
        }
        logger.warn("管理员登录失败：密码错误");
        return c.json({ error: '管理员密码错误' }, 401);
    } catch (e: any) {
        logger.error("管理员登录接口异常", { error: e.message });
        return c.json({ error: '登录失败' }, 500);
    }
});

// === 受保护的 API 路由组 ===
const protectedApi = new Hono();

// JWT 鉴权中间件
protectedApi.use('/*', jwt({ secret: JWT_SECRET }));

// 管理员角色校验中间件
protectedApi.use('/*', async (c, next) => {
    const payload = c.get('jwtPayload');
    if (payload.role !== 'admin') {
        logger.warn(`非管理员尝试访问后台API`, { user: payload });
        return c.json({ error: '无权限访问' }, 403);
    }
    await next();
});

// 获取系统统计数据
protectedApi.get('/stats', (c) => {
    try {
        const stats = db.getSystemStats();
        return c.json(stats);
    } catch (e: any) {
        logger.error("获取系统统计失败", { error: e.message });
        return c.json({ error: "获取统计失败" }, 500);
    }
});

// 获取用户列表 (增加了 Token 和 VIP 字段)
protectedApi.get('/users', (c) => {
    try {
        const users = db.getAllUsers();
        // 隐藏密码hash，保护隐私
        const safeUsers = users.map(u => ({ 
            id: u.id, 
            username: u.username, 
            tokens: u.tokens,
            vip_expiry: u.vip_expiry,
            created_at: u.created_at 
        }));
        return c.json(safeUsers);
    } catch (e: any) {
        logger.error("获取用户列表失败", { error: e.message });
        return c.json({ error: "获取用户列表失败" }, 500);
    }
});

// 获取指定用户的存档列表 (Admin)
protectedApi.get('/users/:id/archives', (c) => {
    const id = c.req.param('id');
    try {
        const archives = db.getArchivesByUser(id);
        const result = archives.map(a => {
            try {
                const content = JSON.parse(a.content);
                return { 
                    id: a.id,
                    title: a.title,
                    settings: content.settings, 
                    created_at: a.created_at, 
                    updated_at: a.updated_at 
                };
            } catch (e) {
                return { 
                    id: a.id, 
                    title: a.title, 
                    created_at: a.created_at, 
                    updated_at: a.updated_at,
                    settings: null 
                };
            }
        });
        return c.json(result);
    } catch (e: any) {
        logger.error(`管理员获取用户存档失败: ${id}`, { error: e.message });
        return c.json({ error: "获取存档列表失败" }, 500);
    }
});

// 获取单个存档详情 (Admin)
protectedApi.get('/archives/:id', (c) => {
    const id = c.req.param('id');
    try {
        const archive = db.getArchiveById(id);
        if (!archive) {
            return c.json({ error: "存档不存在" }, 404);
        }

        try {
            const content = JSON.parse(archive.content);
            return c.json({
                id: archive.id,
                user_id: archive.user_id,
                title: archive.title,
                created_at: archive.created_at,
                updated_at: archive.updated_at,
                settings: content.settings,
                history: content.history
            });
        } catch (e) {
            logger.error(`解析存档JSON失败: ${id}`);
            return c.json({ error: "存档数据损坏" }, 500);
        }
    } catch (e: any) {
        logger.error(`获取存档详情失败: ${id}`, { error: e.message });
        return c.json({ error: "获取详情失败" }, 500);
    }
});

// 创建新用户 (Admin)
protectedApi.post('/users', async (c) => {
    try {
        const { username, password } = await c.req.json();
        if (!username || !password || password.length < 6) {
            return c.json({ error: '参数无效' }, 400);
        }
        
        const existing = db.getUserByUsername(username);
        if (existing) return c.json({ error: '用户名已存在' }, 400);

        const userId = crypto.randomUUID();
        db.createUser(userId, username, password); 
        logger.info(`管理员手动创建了用户: ${username}`);
        return c.json({ success: true, userId });
    } catch (e: any) {
        logger.error("管理员创建用户失败", { error: e.message });
        return c.json({ error: "创建失败" }, 500);
    }
});

// 重置用户密码 (Admin)
protectedApi.put('/users/:id/password', async (c) => {
    const id = c.req.param('id');
    try {
        const { password } = await c.req.json();
        if (!password || password.length < 6) return c.json({ error: '密码过短' }, 400);
        
        db.updateUserPassword(id, password);
        logger.warn(`管理员重置了用户 ${id} 的密码`);
        return c.json({ success: true });
    } catch (e: any) {
        logger.error("重置密码失败", { error: e.message });
        return c.json({ error: "重置失败" }, 500);
    }
});

// 删除用户
protectedApi.delete('/users/:id', (c) => {
    const id = c.req.param('id');
    try {
        db.deleteUserFull(id);
        logger.warn(`管理员删除了用户: ${id}`);
        return c.json({ success: true });
    } catch (e: any) {
        logger.error(`删除用户失败: ${id}`, { error: e.message });
        return c.json({ error: '删除失败' }, 500);
    }
});

// 获取服务器实时日志
protectedApi.get('/logs', (c) => {
    try {
        const logs = logger.getRecentLogs();
        return c.json(logs);
    } catch (e: any) {
        logger.error("获取日志失败", { error: e.message });
        return c.json({ error: "获取日志失败" }, 500);
    }
});

// === 系统配置管理接口 ===
protectedApi.get('/configs', (c) => {
    const aiModels = db.getSystemConfig('ai_models');
    const defaultModel = db.getSystemConfig('default_model');
    const productPlans = db.getSystemConfig('product_plans');
    return c.json({ 
        ai_models: aiModels ? JSON.parse(aiModels) : [],
        default_model: defaultModel,
        product_plans: productPlans ? JSON.parse(productPlans) : []
    });
});

protectedApi.put('/configs', async (c) => {
    const { key, value } = await c.req.json();
    if (!key || value === undefined) return c.json({ error: "Invalid params" }, 400);
    
    // 简单校验 JSON
    if (key === 'ai_models' || key === 'product_plans') {
        try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) throw new Error("Must be array");
            db.setSystemConfig(key, value);
        } catch(e) {
            return c.json({ error: `Invalid JSON for ${key}` }, 400);
        }
    } else {
        db.setSystemConfig(key, value);
    }
    logger.warn(`Admin updated config: ${key}`);
    return c.json({ success: true });
});

// === API Key 管理接口 ===
protectedApi.get('/keys', (c) => {
    try {
        const keys = db.getAllApiKeys();
        // 隐藏 Key 的中间部分
        const safeKeys = keys.map(k => ({
            ...k,
            key: `${k.key.substring(0, 4)}...${k.key.substring(k.key.length - 4)}`
        }));
        return c.json(safeKeys);
    } catch (e: any) {
        logger.error("获取 API Keys 失败", { error: e.message });
        return c.json({ error: "获取失败" }, 500);
    }
});

protectedApi.post('/keys', async (c) => {
    const { key, provider } = await c.req.json();
    if (!key) return c.json({ error: "API Key is required" }, 400);
    try {
        db.createApiKey(key, provider || 'google');
        logger.info("管理员添加了新的 API Key");
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: "添加失败，可能 Key 已存在" }, 500);
    }
});

protectedApi.put('/keys/:id', async (c) => {
    const id = c.req.param('id');
    const { is_active } = await c.req.json();
    try {
        db.toggleApiKeyStatus(id, !!is_active);
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: "更新失败" }, 500);
    }
});

protectedApi.delete('/keys/:id', (c) => {
    const id = c.req.param('id');
    try {
        db.deleteApiKey(id);
        logger.warn(`管理员删除了 API Key: ${id}`);
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: "删除失败" }, 500);
    }
});

// 挂载受保护的路由
adminRouter.route('/api', protectedApi);

export { adminRouter };
