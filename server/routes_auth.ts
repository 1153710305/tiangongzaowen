
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import * as db from './db';
import { JWT_SECRET } from './config';

/**
 * 认证路由模块
 * 处理用户的注册和登录请求
 */
export const authRouter = new Hono();

/**
 * 用户注册接口
 * POST /api/auth/register
 */
authRouter.post('/register', async (c) => {
    try {
        const { username, password } = await c.req.json();
        if (!username || !password || String(password).length < 6) {
            return c.json({ error: '无效输入，密码需至少6位' }, 400);
        }
        if (db.getUserByUsername(username)) {
            return c.json({ error: '用户名已存在' }, 400);
        }
        
        const userId = crypto.randomUUID();
        const user = db.createUser(userId, username, password);
        // 签发 JWT，有效期 7 天
        const token = await sign({ 
            id: user.id, 
            username: user.username, 
            role: 'user', 
            exp: Math.floor(Date.now() / 1000) + 604800 
        }, JWT_SECRET);
        
        return c.json({ token, user });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

/**
 * 用户登录接口
 * POST /api/auth/login
 */
authRouter.post('/login', async (c) => {
    try {
        const { username, password } = await c.req.json();
        const user = db.getUserByUsername(username);
        
        if (!user || user.password_hash !== password) {
            return c.json({ error: '用户名或密码错误' }, 401);
        }
        
        const token = await sign({ 
            id: user.id, 
            username: user.username, 
            role: 'user', 
            exp: Math.floor(Date.now() / 1000) + 604800 
        }, JWT_SECRET);
        
        return c.json({ token, user });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});
