
import { Context, Next } from 'hono';
import { logger } from './logger.ts';

// === 1. 速率限制 (Rate Limiting) ===
const ipRequestCounts = new Map<string, { count: number; expires: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟
const MAX_REQUESTS_PER_MINUTE = 100; // 普通接口限制

export const rateLimiter = (limit: number = MAX_REQUESTS_PER_MINUTE) => async (c: Context, next: Next) => {
    // 获取 IP (兼容反向代理)
    const ip = c.req.header('x-forwarded-for') || 'unknown-ip';
    const now = Date.now();

    let record = ipRequestCounts.get(ip);
    
    // 清理过期记录
    if (record && now > record.expires) {
        ipRequestCounts.delete(ip);
        record = undefined;
    }

    if (!record) {
        record = { count: 1, expires: now + RATE_LIMIT_WINDOW };
        ipRequestCounts.set(ip, record);
    } else {
        record.count++;
        if (record.count > limit) {
            logger.warn(`[Security] Rate limit exceeded for IP: ${ip}`);
            return c.json({ error: "Too many requests, please try again later." }, 429);
        }
    }

    await next();
};

// === 2. 简易请求体验证 (No External Deps) ===
// 替代 Zod，避免安装依赖失败

export interface SimpleSchema {
    validate: (data: any) => { success: boolean; error?: string };
}

export const validateJson = (schema: SimpleSchema) => async (c: Context, next: Next) => {
    try {
        const body = await c.req.json();
        const result = schema.validate(body);
        
        if (!result.success) {
            logger.warn(`[Security] Invalid input: ${result.error}`);
            return c.json({ error: "Invalid input parameters", details: result.error }, 400);
        }
        
        await next();
    } catch (e) {
        return c.json({ error: "Invalid JSON body" }, 400);
    }
};

// === 3. 安全标头 (Security Headers) ===
export const secureHeaders = () => async (c: Context, next: Next) => {
    await next();
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('X-Frame-Options', 'DENY'); 
    c.res.headers.set('X-XSS-Protection', '1; mode=block');
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.res.headers.set('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
};

// === 4. 定义校验 Schema (Manual Implementation) ===

export const authSchema: SimpleSchema = {
    validate: (data: any) => {
        if (!data || typeof data !== 'object') return { success: false, error: 'Body must be object' };
        if (!data.username || typeof data.username !== 'string' || data.username.length < 3) 
            return { success: false, error: 'Invalid username (min 3 chars)' };
        if (!data.password || typeof data.password !== 'string' || data.password.length < 6) 
            return { success: false, error: 'Invalid password (min 6 chars)' };
        return { success: true };
    }
};

export const generateSchema: SimpleSchema = {
    validate: (data: any) => {
        if (!data || typeof data !== 'object') return { success: false, error: 'Body must be object' };
        if (!data.step || typeof data.step !== 'string') return { success: false, error: 'Missing step' };
        if (!data.settings || typeof data.settings !== 'object') return { success: false, error: 'Missing settings' };
        // 允许可选字段通过
        return { success: true };
    }
};
