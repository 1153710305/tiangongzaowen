
import { Hono } from 'hono';
import { jwt, sign } from 'hono/jwt';
import { logger } from './logger';
import * as db from './db';
import { ADMIN_HTML } from './admin_ui';
import { JWT_SECRET, ADMIN_PASSWORD } from './config';

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
            const token = await sign({ role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
            return c.json({ token });
        }
        return c.json({ error: '管理员密码错误' }, 401);
    } catch (e: any) {
        return c.json({ error: '登录失败' }, 500);
    }
});

// === 受保护的 API 路由组 ===
const protectedApi = new Hono();
protectedApi.use('/*', jwt({ secret: JWT_SECRET }));
protectedApi.use('/*', async (c, next) => {
    const payload = c.get('jwtPayload');
    if (payload.role !== 'admin') return c.json({ error: '无权限访问' }, 403);
    await next();
});

// Stats
protectedApi.get('/stats', (c) => c.json(db.getSystemStats()));

// Users
protectedApi.get('/users', (c) => c.json(db.getAllUsers().map(u => ({ id: u.id, username: u.username, tokens: u.tokens, vip_expiry: u.vip_expiry, created_at: u.created_at }))));
protectedApi.get('/users/:id/archives', (c) => c.json(db.getArchivesByUser(c.req.param('id')).map(a => { try { return { id: a.id, title: a.title, settings: JSON.parse(a.content).settings, created_at: a.created_at, updated_at: a.updated_at }; } catch (e) { return a; } })));
protectedApi.get('/archives/:id', (c) => { const a = db.getArchiveById(c.req.param('id')); return a ? c.json({...a, ...JSON.parse(a.content)}) : c.json({error:'Not found'},404); });
protectedApi.post('/users', async (c) => { const {username,password}=await c.req.json(); if(!username||password.length<6) return c.json({error:'Invalid'},400); if(db.getUserByUsername(username)) return c.json({error:'Exists'},400); const uid=crypto.randomUUID(); db.createUser(uid, username, password); return c.json({success:true, userId:uid}); });
protectedApi.put('/users/:id/password', async (c) => { db.updateUserPassword(c.req.param('id'), (await c.req.json()).password); return c.json({success:true}); });
protectedApi.delete('/users/:id', (c) => { db.deleteUserFull(c.req.param('id')); return c.json({success:true}); });

// Update User (Admin only)
protectedApi.put('/users/:id', async (c) => {
    const { tokens, vip_expiry } = await c.req.json();
    db.updateUserAdmin(c.req.param('id'), tokens, vip_expiry);
    return c.json({ success: true });
});

// Logs
protectedApi.get('/logs', (c) => c.json(logger.getRecentLogs()));

// Configs
protectedApi.get('/configs', (c) => c.json({ 
    ai_models: JSON.parse(db.getSystemConfig('ai_models')||'[]'), 
    default_model: db.getSystemConfig('default_model'), 
    product_plans: JSON.parse(db.getSystemConfig('product_plans')||'[]'),
    initial_user_tokens: db.getSystemConfig('initial_user_tokens') || '1000'
}));
protectedApi.put('/configs', async (c) => { const {key,value}=await c.req.json(); db.setSystemConfig(key, value); return c.json({success:true}); });

// Keys
protectedApi.get('/keys', (c) => c.json(db.getAllApiKeys().map(k => ({...k, key: `${k.key.substring(0,4)}...${k.key.substring(k.key.length-4)}`}))));
protectedApi.post('/keys', async (c) => { const {key,provider}=await c.req.json(); try{db.createApiKey(key,provider); return c.json({success:true});}catch(e){return c.json({error:'Failed'},500);} });
protectedApi.put('/keys/:id', async (c) => { db.toggleApiKeyStatus(c.req.param('id'), (await c.req.json()).is_active); return c.json({success:true}); });
protectedApi.delete('/keys/:id', (c) => { db.deleteApiKey(c.req.param('id')); return c.json({success:true}); });

// === Messages Management ===
protectedApi.get('/messages', (c) => c.json(db.getAllMessagesAdmin()));
protectedApi.put('/messages/:id/reply', async (c) => {
    const { reply } = await c.req.json();
    db.replyMessage(c.req.param('id'), reply);
    return c.json({ success: true });
});

// === Announcements Management ===
protectedApi.get('/announcements', (c) => c.json(db.getAllAnnouncementsAdmin()));
protectedApi.post('/announcements', async (c) => {
    const { title, content } = await c.req.json();
    db.createAnnouncement(title, content);
    return c.json({ success: true });
});
protectedApi.put('/announcements/:id', async (c) => {
    const { title, content, is_published } = await c.req.json();
    db.updateAnnouncement(c.req.param('id'), title, content, is_published);
    return c.json({ success: true });
});
protectedApi.delete('/announcements/:id', (c) => {
    db.deleteAnnouncement(c.req.param('id'));
    return c.json({ success: true });
});

adminRouter.route('/api', protectedApi);

export { adminRouter };
