
import { Hono } from 'hono';
import * as db from './db';
import { RANDOM_DATA_POOL } from './data';
import { SystemModelConfig } from './types';
import { DEFAULT_AI_MODEL } from './config';

/**
 * 公共路由模块
 * 提供无需登录即可访问的配置和数据接口
 */
export const publicRouter = new Hono();

/**
 * 获取随机素材池配置
 * GET /api/config/pool
 */
publicRouter.get('/config/pool', (c) => c.json(RANDOM_DATA_POOL));

/**
 * 获取可用 AI 模型列表
 * GET /api/config/models
 */
publicRouter.get('/config/models', (c) => {
    try {
        const modelsStr = db.getSystemConfig('ai_models');
        const defaultModel = db.getSystemConfig('default_model');
        const allModels: SystemModelConfig[] = modelsStr ? JSON.parse(modelsStr) : [];
        // 仅返回激活的模型
        return c.json({ 
            models: allModels.filter(m => m.isActive !== false), 
            defaultModel: defaultModel || DEFAULT_AI_MODEL 
        });
    } catch (e) { 
        return c.json({ models: [], defaultModel: DEFAULT_AI_MODEL }); 
    }
});

/**
 * 获取付费商品列表
 * GET /api/products
 */
publicRouter.get('/products', (c) => {
    try {
        const plansStr = db.getSystemConfig('product_plans');
        return c.json(plansStr ? JSON.parse(plansStr) : []);
    } catch (e) { 
        return c.json([]); 
    }
});

/**
 * 获取已发布的系统公告
 * GET /api/announcements
 */
publicRouter.get('/announcements', (c) => c.json(db.getPublishedAnnouncements()));
