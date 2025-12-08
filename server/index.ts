
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { logger } from './logger';
import { adminRouter } from './admin_router';
import * as db from './db';
import { PORT, JWT_SECRET } from './config';

// 导入拆分后的路由模块
import { authRouter } from './routes_auth';
import { publicRouter } from './routes_public';
import { contentRouter } from './routes_content';
import { projectRouter } from './routes_project';
import { userRouter } from './routes_user';

// === 初始化系统 ===
try {
    db.initDB();
    // 启动时自动清理回收站 (物理删除过期项目)
    const deletedCount = db.cleanupRecycleBin();
    if(deletedCount > 0) {
        logger.info(`[Startup] Cleaned ${deletedCount} expired projects from recycle bin.`);
    }
    logger.info("✅ Database & System modules loaded successfully.");
} catch (e: any) {
    logger.error("System init failed", { error: e.message });
}

const app = new Hono();

// === 全局中间件 ===
app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}));

// 请求日志中间件
app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    if (c.res.status >= 500) logger.error(`${c.req.method} ${c.req.url} - ${c.res.status} (${ms}ms)`);
    else if (c.res.status >= 400 && c.res.status !== 401) logger.warn(`${c.req.method} ${c.req.url} - ${c.res.status} (${ms}ms)`);
});

// 全局错误处理
app.onError((err, c) => {
    logger.error(`Global Exception: ${err.message}`, { stack: err.stack });
    return c.json({ error: 'Internal Server Error', details: err.message }, 500);
});

// === 路由挂载 ===

// 1. 根路径
app.get('/', (c) => c.text(`SkyCraft AI Backend (v3.2.2) is Running on port ${PORT}`));

// 2. 后台管理系统 (/admin)
app.route('/admin', adminRouter);

// 3. 公共 API (/api) - 无需鉴权
app.route('/api/auth', authRouter); // 登录注册
app.route('/api', publicRouter);    // 配置、商品、公告

// 4. 受保护 API (/api) - 需 JWT 鉴权
// 创建一个子应用来统一应用 JWT 中间件
const protectedApi = new Hono();
protectedApi.use('/*', jwt({ secret: JWT_SECRET }));

// 挂载业务路由
protectedApi.route('/', contentRouter); // 生成、实验室
protectedApi.route('/projects', projectRouter); // 项目管理
protectedApi.route('/user', userRouter); // 用户状态、资产
protectedApi.route('/', userRouter); // 兼容旧路径: /api/archives, /api/cards, /api/prompts, /api/messages

// 将受保护的子应用挂载到主应用
app.route('/api', protectedApi);

// === 启动服务 ===
if (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.node) {
    import('@hono/node-server').then(({ serve }) => {
        logger.info(`🚀 SkyCraft Server running on port ${PORT}`);
        serve({ fetch: app.fetch, port: PORT });
    });
}

export default app;
