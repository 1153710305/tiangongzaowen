
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

// 获取用户列表
protectedApi.get('/users', (c) => {
    try {
        const users = db.getAllUsers();
        // 隐藏密码hash，保护隐私
        const safeUsers = users.map(u => ({ id: u.id, username: u.username, created_at: u.created_at }));
        return c.json(safeUsers);
    } catch (e: any) {
        logger.error("获取用户列表失败", { error: e.message });
        return c.json({ error: "获取用户列表失败" }, 500);
    }
});

// 获取指定用户的存档列表 (Admin) - 新增接口
protectedApi.get('/users/:id/archives', (c) => {
    const id = c.req.param('id');
    try {
        const archives = db.getArchivesByUser(id);
        // 解析 content JSON，以便前端直接展示 settings 等信息
        const result = archives.map(a => {
            try {
                const content = JSON.parse(a.content);
                // 解构 content 提取 settings，并将 content 字段移除以减小体积
                // 我们不返回 history，因为通常太大了，列表页不需要
                return { 
                    id: a.id,
                    title: a.title,
                    settings: content.settings, 
                    created_at: a.created_at, 
                    updated_at: a.updated_at 
                };
            } catch (e) {
                // 如果解析失败，返回基础信息
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

// 获取单个存档详情 (Admin) - 新增接口
protectedApi.get('/archives/:id', (c) => {
    const id = c.req.param('id');
    try {
        const archive = db.getArchiveById(id);
        if (!archive) {
            return c.json({ error: "存档不存在" }, 404);
        }

        try {
            // 解析完整 JSON 内容，包含 history
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
        db.createUser(userId, username, password); // 注意：生产环境应Hash
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
        
        db.updateUserPassword(id, password); // 注意：生产环境应Hash
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

// === 系统配置管理接口 (New) ===
protectedApi.get('/configs', (c) => {
    const aiModels = db.getSystemConfig('ai_models');
    const defaultModel = db.getSystemConfig('default_model');
    return c.json({ 
        ai_models: aiModels ? JSON.parse(aiModels) : [],
        default_model: defaultModel
    });
});

protectedApi.put('/configs', async (c) => {
    const { key, value } = await c.req.json();
    if (!key || value === undefined) return c.json({ error: "Invalid params" }, 400);
    
    if (key === 'ai_models') {
        // 校验 JSON 格式
        try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) throw new Error("Must be array");
            db.setSystemConfig(key, value);
        } catch(e) {
            return c.json({ error: "Invalid JSON for ai_models" }, 400);
        }
    } else {
        db.setSystemConfig(key, value);
    }
    logger.warn(`Admin updated config: ${key}`);
    return c.json({ success: true });
});

// 挂载受保护的路由
adminRouter.route('/api', protectedApi);

export { adminRouter };
