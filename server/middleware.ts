import { Context, Next } from 'hono';
import { z } from 'zod';
import { logger } from './logger.ts';

// === 1. 速率限制 (Rate Limiting) ===
// 简单的内存限流策略：每分钟每个IP允许N次请求
// 生产环境建议使用 Redis 替代 Map 以支持分布式部署
const ipRequestCounts = new Map<string, { count: number; expires: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 时间窗口：1分钟
const MAX_REQUESTS_PER_MINUTE = 100; // 普通接口限制
const MAX_AUTH_REQUESTS = 10;        // 登录/注册接口限制 (防止暴力破解)

/**
 * 全局速率限制中间件
 * @param limit 每分钟最大请求数，默认为 100
 */
export const rateLimiter = (limit: number = MAX_REQUESTS_PER_MINUTE) => async (c: Context, next: Next) => {
    // 获取客户端 IP (如果是反向代理环境，如 Nginx，可能需要读取 x-forwarded-for)
    const ip = c.req.header('x-forwarded-for') || 'unknown-ip';
    const now = Date.now();

    let record = ipRequestCounts.get(ip);
    
    // 清理过期记录，释放内存
    if (record && now > record.expires) {
        ipRequestCounts.delete(ip);
        record = undefined;
    }

    if (!record) {
        // 新 IP 访问，初始化记录
        record = { count: 1, expires: now + RATE_LIMIT_WINDOW };
        ipRequestCounts.set(ip, record);
    } else {
        // 已有记录，增加计数
        record.count++;
        if (record.count > limit) {
            logger.warn(`[安全警报] IP 请求频率过高: ${ip}`);
            // 返回 429 Too Many Requests 状态码
            return c.json({ error: "请求过于频繁，请稍后再试 (Too many requests)." }, 429);
        }
    }

    await next();
};

// === 2. 请求体验证 (Zod Validation) ===
/**
 * 统一的参数校验中间件
 * 使用 Zod Schema 验证请求体，防止边界溢出和恶意 Payload
 * @param schema Zod 定义的数据结构
 */
export const validateJson = <T>(schema: z.ZodSchema<T>) => async (c: Context, next: Next) => {
    try {
        const body = await c.req.json();
        // 使用 safeParse 进行非抛出式验证
        const result = schema.safeParse(body);
        
        if (!result.success) {
            // 格式化错误信息，方便前端调试
            // 注意：zod 的错误对象包含 issues 数组
            const errorMsg = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            logger.warn(`[安全警报] 非法输入参数: ${errorMsg}`);
            return c.json({ error: "参数校验失败 (Invalid input parameters)", details: errorMsg }, 400);
        }
        
        // 验证通过，继续处理
        await next();
    } catch (e) {
        // 捕获 JSON 解析错误 (如 JSON 格式不合法)
        return c.json({ error: "非法 JSON 格式 (Invalid JSON body)" }, 400);
    }
};

// === 3. 安全标头 (Security Headers) ===
/**
 * 增强浏览器安全性的 HTTP 标头设置
 * 防止 XSS、点击劫持等常见攻击
 */
export const secureHeaders = () => async (c: Context, next: Next) => {
    await next();
    // 禁止浏览器猜测 Content-Type
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    // 禁止在 iframe 中嵌入 (防止点击劫持)
    c.res.headers.set('X-Frame-Options', 'DENY'); 
    // 启用 XSS 过滤器
    c.res.headers.set('X-XSS-Protection', '1; mode=block');
    // 控制 Referrer 泄露
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // 内容安全策略 (CSP)
    // 注意：当前允许 'unsafe-inline' 是为了适配 CDN 引入的脚本，生产环境应更严格
    c.res.headers.set('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"); 
};

// === 4. 定义校验 Schema (Zod Schemas) ===

// 登录/注册参数校验
export const authSchema = z.object({
    username: z.string()
        .min(3, "用户名至少3位")
        .max(20, "用户名过长")
        .regex(/^[a-zA-Z0-9_]+$/, "用户名仅限字母、数字、下划线"),
    password: z.string()
        .min(6, "密码至少6位")
        .max(100, "密码过长")
});

// AI 生成内容参数校验
export const generateSchema = z.object({
    step: z.string(), // 工作流步骤
    model: z.string().optional(), // 指定模型
    settings: z.object({
        genre: z.string().max(50),
        targetAudience: z.enum(['male', 'female']).optional()
    }).passthrough(), // 允许其他 settings 字段通过 (宽松模式)
    context: z.string().max(20000).optional(), // 限制上下文长度，防止大包攻击 (Token 消耗过大)
    extraPrompt: z.string().max(2000).optional() // 限制额外提示词长度
});