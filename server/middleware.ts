
import { Context, Next } from 'hono';
import { z } from 'zod';
import { logger } from './logger.ts';

// === 1. 速率限制 (Rate Limiting) ===
// 简单的内存限流：每分钟每个IP允许N次请求
const ipRequestCounts = new Map<string, { count: number; expires: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟
const MAX_REQUESTS_PER_MINUTE = 100; // 普通接口限制
const MAX_AUTH_REQUESTS = 10;        // 登录/注册接口限制

export const rateLimiter = (limit: number = MAX_REQUESTS_PER_MINUTE) => async (c: Context, next: Next) => {
    // 获取 IP (如果是反向代理，可能需要 x-forwarded-for)
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

// === 2. 请求体验证 (Zod Validation) ===
// 统一的参数校验中间件，防止边界溢出和恶意Payload
export const validateJson = <T>(schema: z.ZodSchema<T>) => async (c: Context, next: Next) => {
    try {
        const body = await c.req.json();
        const result = schema.safeParse(body);
        
        if (!result.success) {
            const errorMsg = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            logger.warn(`[Security] Invalid input: ${errorMsg}`);
            return c.json({ error: "Invalid input parameters", details: errorMsg }, 400);
        }
        
        // 将清洗后的数据挂载到 context，供后续使用 (可选，目前保持原始 body 读取)
        await next();
    } catch (e) {
        return c.json({ error: "Invalid JSON body" }, 400);
    }
};

// === 3. 安全标头 (Security Headers) ===
// 增强浏览器安全性
export const secureHeaders = () => async (c: Context, next: Next) => {
    await next();
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('X-Frame-Options', 'DENY'); // 防止点击劫持
    c.res.headers.set('X-XSS-Protection', '1; mode=block');
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.res.headers.set('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"); // 允许宽松策略以适配当前CDN环境，生产环境应更严格
};

// === 4. 定义校验 Schema ===

// 登录/注册校验
export const authSchema = z.object({
    username: z.string().min(3, "用户名至少3位").max(20, "用户名过长").regex(/^[a-zA-Z0-9_]+$/, "仅限字母数字下划线"),
    password: z.string().min(6, "密码至少6位").max(100, "密码过长")
});

// 生成内容校验
export const generateSchema = z.object({
    step: z.string(),
    model: z.string().optional(),
    settings: z.object({
        genre: z.string().max(50),
        targetAudience: z.enum(['male', 'female']).optional()
    }).passthrough(), // 允许其他 settings 字段
    context: z.string().max(20000).optional(), // 限制上下文长度，防止大包攻击
    extraPrompt: z.string().max(2000).optional()
});
