/**
 * API 注册表 - 统一管理所有 API 端点定义和测试范例
 * 
 * 新增 API 时，只需在此文件中添加配置，即可自动出现在 API 实验室中
 */

/**
 * API 端点定义接口
 */
export interface ApiEndpoint {
    /** API 显示名称 */
    name: string;
    /** API 路径 */
    url: string;
    /** HTTP 方法 */
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    /** API 功能描述 */
    description: string;
    /** 是否需要认证 */
    requiresAuth: boolean;
    /** 是否需要管理员权限 */
    requiresAdmin?: boolean;
    /** 请求体范例（JSON 对象） */
    exampleBody: Record<string, any>;
    /** 预期响应范例（可选，用于文档） */
    exampleResponse?: Record<string, any> | string;
    /** API 分类 */
    category: ApiCategory;
    /** 额外说明（可选） */
    notes?: string;
}

/**
 * API 分类枚举
 */
export enum ApiCategory {
    /** 公开接口（无需认证） */
    PUBLIC = '公开接口',
    /** 认证相关 */
    AUTH = '认证授权',
    /** 用户相关 */
    USER = '用户管理',
    /** AI 生成 */
    AI = 'AI生成',
    /** 存档管理 */
    ARCHIVE = '存档管理',
    /** 脑洞卡片 */
    CARD = '脑洞卡片',
    /** 项目/IDE */
    PROJECT = '项目管理',
    /** 思维导图 */
    MINDMAP = '思维导图',
    /** 章节管理 */
    CHAPTER = '章节管理',
    /** 提示词库 */
    PROMPT = '提示词库',
    /** 留言反馈 */
    MESSAGE = '留言反馈',
    /** 后台管理 */
    ADMIN = '后台管理',
}

/**
 * 完整的 API 注册表
 * 
 * 🔥 新增 API 时，在对应分类下添加配置即可自动集成到 API 实验室
 */
export const API_REGISTRY: ApiEndpoint[] = [
    // ==================== 公开接口 ====================
    {
        name: '服务器状态',
        url: '/',
        method: 'GET',
        description: '检查服务器是否正常运行',
        requiresAuth: false,
        category: ApiCategory.PUBLIC,
        exampleBody: {},
        exampleResponse: 'SkyCraft AI Backend (v3.1.0) is Running!'
    },
    {
        name: '获取随机数据池',
        url: '/api/config/pool',
        method: 'GET',
        description: '获取系统预设的随机数据池（题材、套路、金手指等）',
        requiresAuth: false,
        category: ApiCategory.PUBLIC,
        exampleBody: {},
        exampleResponse: {
            genres: ['玄幻', '都市', '科幻'],
            tropes: ['系统', '重生', '穿越']
        }
    },
    {
        name: '获取AI模型列表',
        url: '/api/config/models',
        method: 'GET',
        description: '获取系统可用的 AI 模型配置',
        requiresAuth: false,
        category: ApiCategory.PUBLIC,
        exampleBody: {},
        exampleResponse: {
            models: [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', isActive: true }],
            defaultModel: 'gemini-2.5-flash'
        }
    },
    {
        name: '获取商品列表',
        url: '/api/products',
        method: 'GET',
        description: '获取系统付费商品配置（月卡、季卡、加油包等）',
        requiresAuth: false,
        category: ApiCategory.PUBLIC,
        exampleBody: {},
        exampleResponse: [
            { id: 'monthly', name: '月卡', price: 2900, tokens: 500000, days: 30 }
        ]
    },
    {
        name: '获取系统公告',
        url: '/api/announcements',
        method: 'GET',
        description: '获取已发布的系统公告列表',
        requiresAuth: false,
        category: ApiCategory.PUBLIC,
        exampleBody: {},
        exampleResponse: [
            { id: '1', title: '欢迎使用', content: '系统上线啦！', created_at: '2025-01-01' }
        ]
    },

    // ==================== 认证授权 ====================
    {
        name: '用户注册',
        url: '/api/auth/register',
        method: 'POST',
        description: '新用户注册账号',
        requiresAuth: false,
        category: ApiCategory.AUTH,
        exampleBody: {
            username: 'testuser',
            password: 'password123'
        },
        exampleResponse: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: { id: 'uuid', username: 'testuser', tokens: 1000 }
        },
        notes: '密码至少6位'
    },
    {
        name: '用户登录',
        url: '/api/auth/login',
        method: 'POST',
        description: '用户登录获取 JWT Token',
        requiresAuth: false,
        category: ApiCategory.AUTH,
        exampleBody: {
            username: 'testuser',
            password: 'password123'
        },
        exampleResponse: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: { id: 'uuid', username: 'testuser', tokens: 1000 }
        }
    },

    // ==================== 用户管理 ====================
    {
        name: '获取用户状态',
        url: '/api/user/status',
        method: 'GET',
        description: '获取当前登录用户的 Token 余额和 VIP 状态',
        requiresAuth: true,
        category: ApiCategory.USER,
        exampleBody: {},
        exampleResponse: {
            id: 'uuid',
            username: 'testuser',
            tokens: 5000,
            vip_expiry: '2025-12-31T23:59:59Z',
            isVip: true,
            referral_code: 'ABC123'
        }
    },
    {
        name: '购买商品',
        url: '/api/user/buy',
        method: 'POST',
        description: '用户购买付费商品（月卡/加油包等）',
        requiresAuth: true,
        category: ApiCategory.USER,
        exampleBody: {
            productId: 'monthly'
        },
        exampleResponse: {
            success: true
        },
        notes: '实际支付流程需对接支付网关'
    },

    // ==================== AI 生成 ====================
    {
        name: 'AI 内容生成',
        url: '/api/generate',
        method: 'POST',
        description: '核心 AI 生成接口，支持流式返回。可生成创意、大纲、人物、章节等',
        requiresAuth: true,
        category: ApiCategory.AI,
        exampleBody: {
            settings: {
                genre: '玄幻',
                trope: '系统',
                protagonistType: '龙傲天',
                goldenFinger: '加点',
                pacing: 'fast',
                targetAudience: 'male',
                tone: '爽文'
            },
            step: 'idea',
            context: '',
            references: [],
            extraPrompt: '',
            model: 'gemini-2.5-flash'
        },
        exampleResponse: '流式文本输出...',
        notes: 'step 可选值: idea, analysis_idea, outline, character, chapter, mind_map_node'
    },

    // ==================== 存档管理 ====================
    {
        name: '获取存档列表',
        url: '/api/archives',
        method: 'GET',
        description: '获取当前用户的所有存档',
        requiresAuth: true,
        category: ApiCategory.ARCHIVE,
        exampleBody: {},
        exampleResponse: [
            { id: 'uuid', title: '我的小说', settings: {}, created_at: '2025-01-01' }
        ]
    },
    {
        name: '创建/更新存档',
        url: '/api/archives',
        method: 'POST',
        description: '创建新存档或更新已有存档',
        requiresAuth: true,
        category: ApiCategory.ARCHIVE,
        exampleBody: {
            id: '',
            title: '我的玄幻小说',
            settings: { genre: '玄幻', trope: '系统' },
            history: []
        },
        exampleResponse: {
            id: 'uuid',
            title: '我的玄幻小说',
            settings: {},
            history: []
        },
        notes: 'id 为空则创建新存档，否则更新已有存档'
    },
    {
        name: '删除存档',
        url: '/api/archives/:id',
        method: 'DELETE',
        description: '删除指定存档',
        requiresAuth: true,
        category: ApiCategory.ARCHIVE,
        exampleBody: {},
        exampleResponse: { success: true },
        notes: '将 :id 替换为实际存档 ID'
    },

    // ==================== 脑洞卡片 ====================
    {
        name: '获取卡片列表',
        url: '/api/cards',
        method: 'GET',
        description: '获取当前用户的所有脑洞卡片',
        requiresAuth: true,
        category: ApiCategory.CARD,
        exampleBody: {},
        exampleResponse: [
            {
                id: 'uuid',
                title: '重生之都市修仙',
                intro: '主角重生回到都市...',
                highlight: '爽点密集',
                explosive_point: '打脸',
                golden_finger: '系统',
                created_at: '2025-01-01'
            }
        ]
    },
    {
        name: '创建卡片',
        url: '/api/cards',
        method: 'POST',
        description: '创建新的脑洞卡片',
        requiresAuth: true,
        category: ApiCategory.CARD,
        exampleBody: {
            title: '重生之都市修仙',
            intro: '主角重生回到都市，开启修仙之路',
            highlight: '爽点密集，节奏快',
            explosive_point: '打脸装逼',
            golden_finger: '系统辅助'
        },
        exampleResponse: {
            id: 'uuid',
            title: '重生之都市修仙',
            created_at: '2025-01-01'
        }
    },
    {
        name: '删除卡片',
        url: '/api/cards/:id',
        method: 'DELETE',
        description: '删除指定脑洞卡片',
        requiresAuth: true,
        category: ApiCategory.CARD,
        exampleBody: {},
        exampleResponse: { success: true },
        notes: '将 :id 替换为实际卡片 ID'
    },

    // ==================== 项目管理 ====================
    {
        name: '从卡片创建项目',
        url: '/api/projects/from-card',
        method: 'POST',
        description: '基于脑洞卡片初始化一个 IDE 项目',
        requiresAuth: true,
        category: ApiCategory.PROJECT,
        exampleBody: {
            cardId: 'demo-card-id',
            title: '测试项目标题',
            description: '测试简介'
        },
        exampleResponse: {
            id: 'uuid',
            title: '测试项目标题',
            description: '测试简介',
            created_at: '2025-01-01'
        }
    },
    {
        name: '获取项目列表',
        url: '/api/projects',
        method: 'GET',
        description: '获取当前用户的所有项目（不含已删除）',
        requiresAuth: true,
        category: ApiCategory.PROJECT,
        exampleBody: {},
        exampleResponse: [
            { id: 'uuid', title: '我的小说项目', created_at: '2025-01-01' }
        ]
    },
    {
        name: '删除项目（软删除）',
        url: '/api/projects/:id',
        method: 'DELETE',
        description: '将项目移入回收站（软删除）',
        requiresAuth: true,
        category: ApiCategory.PROJECT,
        exampleBody: {},
        exampleResponse: { success: true },
        notes: '将 :id 替换为实际项目 ID'
    },
    {
        name: '获取回收站项目',
        url: '/api/projects/trash/all',
        method: 'GET',
        description: '获取当前用户回收站中的所有项目',
        requiresAuth: true,
        category: ApiCategory.PROJECT,
        exampleBody: {},
        exampleResponse: [
            { id: 'uuid', title: '已删除项目', deleted_at: '2025-01-01' }
        ]
    },
    {
        name: '恢复项目',
        url: '/api/projects/:id/restore',
        method: 'POST',
        description: '从回收站恢复项目',
        requiresAuth: true,
        category: ApiCategory.PROJECT,
        exampleBody: {},
        exampleResponse: { success: true },
        notes: '将 :id 替换为实际项目 ID'
    },
    {
        name: '永久删除项目',
        url: '/api/projects/:id/permanent',
        method: 'DELETE',
        description: '永久删除项目（不可恢复）',
        requiresAuth: true,
        category: ApiCategory.PROJECT,
        exampleBody: {},
        exampleResponse: { success: true },
        notes: '将 :id 替换为实际项目 ID'
    },
    {
        name: '获取项目结构',
        url: '/api/projects/:id/structure',
        method: 'GET',
        description: '获取项目的章节和思维导图列表',
        requiresAuth: true,
        category: ApiCategory.PROJECT,
        exampleBody: {},
        exampleResponse: {
            chapters: [{ id: 'uuid', title: '第一章', order_index: 1 }],
            maps: [{ id: 'uuid', title: '核心架构' }]
        },
        notes: '将 :id 替换为实际项目 ID'
    },

    // ==================== 思维导图 ====================
    {
        name: '获取思维导图详情',
        url: '/api/projects/:pid/maps/:mid',
        method: 'GET',
        description: '获取指定思维导图的完整数据',
        requiresAuth: true,
        category: ApiCategory.MINDMAP,
        exampleBody: {},
        exampleResponse: {
            id: 'uuid',
            title: '核心架构',
            data: '{"root":{"id":"root","label":"核心创意","children":[]}}'
        },
        notes: '将 :pid 和 :mid 替换为实际 ID'
    },
    {
        name: '创建思维导图',
        url: '/api/projects/:pid/maps',
        method: 'POST',
        description: '在项目中创建新的思维导图',
        requiresAuth: true,
        category: ApiCategory.MINDMAP,
        exampleBody: {},
        exampleResponse: {
            id: 'uuid',
            title: '未命名导图',
            data: '{"root":{"id":"root","label":"新导图","children":[]}}'
        },
        notes: '将 :pid 替换为实际项目 ID'
    },
    {
        name: '更新思维导图',
        url: '/api/projects/:pid/maps/:mid',
        method: 'PUT',
        description: '更新思维导图的标题和数据',
        requiresAuth: true,
        category: ApiCategory.MINDMAP,
        exampleBody: {
            title: '更新后的标题',
            data: '{"root":{"id":"root","label":"更新后的导图","children":[]}}'
        },
        exampleResponse: { success: true },
        notes: '将 :pid 和 :mid 替换为实际 ID'
    },
    {
        name: '删除思维导图',
        url: '/api/projects/:pid/maps/:mid',
        method: 'DELETE',
        description: '删除指定思维导图',
        requiresAuth: true,
        category: ApiCategory.MINDMAP,
        exampleBody: {},
        exampleResponse: { success: true },
        notes: '将 :pid 和 :mid 替换为实际 ID'
    },

    // ==================== 章节管理 ====================
    {
        name: '创建章节',
        url: '/api/projects/:pid/chapters',
        method: 'POST',
        description: '在项目中创建新章节',
        requiresAuth: true,
        category: ApiCategory.CHAPTER,
        exampleBody: {
            title: '第一章',
            order: 1
        },
        exampleResponse: {
            id: 'uuid',
            title: '第一章',
            content: '',
            order_index: 1
        },
        notes: '将 :pid 替换为实际项目 ID'
    },
    {
        name: '获取章节详情',
        url: '/api/projects/:pid/chapters/:cid',
        method: 'GET',
        description: '获取指定章节的完整内容',
        requiresAuth: true,
        category: ApiCategory.CHAPTER,
        exampleBody: {},
        exampleResponse: {
            id: 'uuid',
            title: '第一章',
            content: '章节正文内容...',
            order_index: 1
        },
        notes: '将 :pid 和 :cid 替换为实际 ID'
    },
    {
        name: '更新章节',
        url: '/api/projects/:pid/chapters/:cid',
        method: 'PUT',
        description: '更新章节的标题和内容',
        requiresAuth: true,
        category: ApiCategory.CHAPTER,
        exampleBody: {
            title: '第一章（修改）',
            content: '更新后的章节内容...'
        },
        exampleResponse: { success: true },
        notes: '将 :pid 和 :cid 替换为实际 ID'
    },
    {
        name: '删除章节',
        url: '/api/projects/:pid/chapters/:cid',
        method: 'DELETE',
        description: '删除指定章节',
        requiresAuth: true,
        category: ApiCategory.CHAPTER,
        exampleBody: {},
        exampleResponse: { success: true },
        notes: '将 :pid 和 :cid 替换为实际 ID'
    },

    // ==================== 提示词库 ====================
    {
        name: '获取提示词列表',
        url: '/api/prompts',
        method: 'GET',
        description: '获取当前用户的自定义提示词',
        requiresAuth: true,
        category: ApiCategory.PROMPT,
        exampleBody: {},
        exampleResponse: [
            {
                id: 'uuid',
                type: 'normal',
                title: '我的提示词',
                content: '提示词内容...',
                created_at: '2025-01-01'
            }
        ]
    },
    {
        name: '创建提示词',
        url: '/api/prompts',
        method: 'POST',
        description: '创建新的自定义提示词',
        requiresAuth: true,
        category: ApiCategory.PROMPT,
        exampleBody: {
            type: 'normal',
            title: '我的提示词',
            content: '这是一个自定义提示词模板...'
        },
        exampleResponse: {
            id: 'uuid',
            type: 'normal',
            title: '我的提示词',
            content: '这是一个自定义提示词模板...'
        },
        notes: 'type 可选值: system, constraint, normal'
    },
    {
        name: '更新提示词',
        url: '/api/prompts/:id',
        method: 'PUT',
        description: '更新已有提示词',
        requiresAuth: true,
        category: ApiCategory.PROMPT,
        exampleBody: {
            title: '更新后的标题',
            content: '更新后的内容...'
        },
        exampleResponse: { success: true },
        notes: '将 :id 替换为实际提示词 ID'
    },
    {
        name: '删除提示词',
        url: '/api/prompts/:id',
        method: 'DELETE',
        description: '删除指定提示词',
        requiresAuth: true,
        category: ApiCategory.PROMPT,
        exampleBody: {},
        exampleResponse: { success: true },
        notes: '将 :id 替换为实际提示词 ID'
    },

    // ==================== 留言反馈 ====================
    {
        name: '获取我的留言',
        url: '/api/messages',
        method: 'GET',
        description: '获取当前用户的所有留言及管理员回复',
        requiresAuth: true,
        category: ApiCategory.MESSAGE,
        exampleBody: {},
        exampleResponse: [
            {
                id: 'uuid',
                content: '我的反馈内容',
                reply: '管理员回复',
                created_at: '2025-01-01'
            }
        ]
    },
    {
        name: '提交留言',
        url: '/api/messages',
        method: 'POST',
        description: '用户提交反馈留言',
        requiresAuth: true,
        category: ApiCategory.MESSAGE,
        exampleBody: {
            content: '这是我的反馈内容，希望能增加XX功能'
        },
        exampleResponse: {
            id: 'uuid',
            content: '这是我的反馈内容，希望能增加XX功能',
            created_at: '2025-01-01'
        }
    },

    // ==================== 后台管理 ====================
    {
        name: '管理员登录',
        url: '/admin/api/login',
        method: 'POST',
        description: '管理员登录后台',
        requiresAuth: false,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {
            password: 'admin123'
        },
        exampleResponse: {
            token: 'admin_jwt_token...'
        },
        notes: '默认密码: admin123，可通过环境变量 ADMIN_PASSWORD 修改'
    },
    {
        name: '获取系统统计',
        url: '/admin/api/stats',
        method: 'GET',
        description: '获取系统整体统计数据',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {},
        exampleResponse: {
            activeKeys: 3,
            totalUsers: 100,
            totalCards: 50,
            totalProjects: 30
        }
    },
    {
        name: '获取所有用户（管理）',
        url: '/admin/api/users',
        method: 'GET',
        description: '管理员获取所有用户列表',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {},
        exampleResponse: [
            { id: 'uuid', username: 'user1', tokens: 1000, vip_expiry: null }
        ]
    },
    {
        name: '模拟用户登录',
        url: '/admin/api/users/:id/impersonate',
        method: 'POST',
        description: '管理员模拟用户身份获取临时 Token（用于 API 测试）',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {},
        exampleResponse: {
            token: 'user_temp_token...',
            username: 'testuser'
        },
        notes: '将 :id 替换为实际用户 ID'
    },
    {
        name: '获取系统日志',
        url: '/admin/api/logs',
        method: 'GET',
        description: '获取系统运行日志',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {},
        exampleResponse: [
            { level: 'INFO', message: '服务器启动', timestamp: '2025-01-01T00:00:00Z' }
        ]
    },
    {
        name: '获取系统配置',
        url: '/admin/api/configs',
        method: 'GET',
        description: '获取系统配置（AI 模型、商品等）',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {},
        exampleResponse: {
            ai_models: [],
            default_model: 'gemini-2.5-flash',
            product_plans: [],
            initial_user_tokens: '1000'
        }
    },
    {
        name: '更新系统配置',
        url: '/admin/api/configs',
        method: 'PUT',
        description: '更新系统配置项',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {
            key: 'initial_user_tokens',
            value: '2000'
        },
        exampleResponse: { success: true }
    },
    {
        name: '获取 API Keys',
        url: '/admin/api/keys',
        method: 'GET',
        description: '获取所有 API Key 配置',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {},
        exampleResponse: [
            {
                id: 'uuid',
                key: 'sk-...1234',
                is_active: 1,
                usage_count: 100,
                total_tokens: 50000
            }
        ]
    },
    {
        name: '添加 API Key',
        url: '/admin/api/keys',
        method: 'POST',
        description: '添加新的 API Key',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {
            key: 'sk-xxxxxxxxxxxxxxxx',
            provider: 'google'
        },
        exampleResponse: { success: true }
    },
    {
        name: '切换 API Key 状态',
        url: '/admin/api/keys/:id',
        method: 'PUT',
        description: '启用/禁用指定 API Key',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {
            is_active: 1
        },
        exampleResponse: { success: true },
        notes: '将 :id 替换为实际 Key ID'
    },
    {
        name: '删除 API Key',
        url: '/admin/api/keys/:id',
        method: 'DELETE',
        description: '删除指定 API Key',
        requiresAuth: true,
        requiresAdmin: true,
        category: ApiCategory.ADMIN,
        exampleBody: {},
        exampleResponse: { success: true },
        notes: '将 :id 替换为实际 Key ID'
    },
];

/**
 * 按分类获取 API 列表
 */
export function getApisByCategory(category: ApiCategory): ApiEndpoint[] {
    return API_REGISTRY.filter(api => api.category === category);
}

/**
 * 获取所有分类
 */
export function getAllCategories(): ApiCategory[] {
    return Object.values(ApiCategory);
}

/**
 * 根据 URL 和方法查找 API
 */
export function findApi(url: string, method: string): ApiEndpoint | undefined {
    return API_REGISTRY.find(api => api.url === url && api.method === method);
}
