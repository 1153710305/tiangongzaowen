
/**
 * 服务端专用类型定义
 */

export interface NovelSettings {
    genre: string;
    trope: string;
    protagonistType: string;
    goldenFinger: string;
    pacing: 'fast' | 'normal' | 'slow';
    targetAudience: 'male' | 'female';
    tone: string;
    platform?: string;
}

export interface ReferenceNovel {
    title: string;
    intro: string;
    url?: string;
}

export interface IdeaCardData {
    title: string;
    intro: string;
    highlight: string;
    explosive_point: string;
    golden_finger: string;
    created_at: string;
}

export enum WorkflowStep {
    IDEA = 'idea',
    ANALYSIS_IDEA = 'analysis_idea',
    OUTLINE = 'outline',
    CHARACTER = 'character',
    CHAPTER = 'chapter',
    REVIEW = 'review',
    MIND_MAP_NODE = 'mind_map_node',
    CHAPTER_FROM_NODE = 'chapter_from_node'
}

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

export interface User {
    id: string;
    username: string;
    password_hash: string;
    tokens: number;           // 剩余代币
    vip_expiry: string | null; // 会员过期时间 ISO String
    referral_code: string;    // 自己的邀请码
    created_at: string;
}

export interface Archive {
    id: string;
    user_id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface DbIdeaCard {
    id: string;
    user_id: string;
    title: string;
    content: string;
    created_at: string;
}

export interface DbProject {
    id: string;
    user_id: string;
    title: string;
    description: string;
    idea_card_id?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null; // 回收站软删除标记
}

export interface DbChapter {
    id: string;
    project_id: string;
    title: string;
    content: string;
    order_index: number;
    updated_at: string;
}

export interface DbMindMap {
    id: string;
    project_id: string;
    title: string;
    data: string;
    updated_at: string;
}

// 提示词库
export type PromptType = 'system' | 'constraint' | 'normal';

export interface DbUserPrompt {
    id: string;
    user_id: string;
    type: PromptType;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}

// === API Key 管理 ===
export interface ApiKey {
    id: string;
    key: string;            // 实际 Key
    provider: string;       // 提供商 (google, openai...)
    is_active: number;      // 0 or 1
    last_used_at: string;   // 用于轮询排序
    usage_count: number;    // 调用次数
    total_tokens: number;   // 消耗 Token 总数
    total_latency_ms: number; // 总耗时 (用于计算平均时延)
    created_at: string;
}

// 系统模型配置扩展
export interface SystemModelConfig {
    id: string;
    name: string;
    isActive?: boolean;
    isVip?: boolean; // 新增：是否为会员专属模型
}

// === 会员与经济系统 ===

export enum TransactionType {
    GENERATE = 'generate',   // 生成消耗
    RECHARGE = 'recharge',   // 充值
    REFUND = 'refund',       // 退款/补偿
    REFERRAL = 'referral',   // 邀请奖励
    SYSTEM = 'system'        // 系统赠送
}

export interface UserTransaction {
    id: string;
    user_id: string;
    type: TransactionType;
    amount: number; // 正数为增加，负数为消耗
    balance_after: number;
    description: string;
    created_at: string;
}

export enum ProductType {
    SUBSCRIPTION = 'subscription', // 订阅 (月卡/季卡)
    TOKEN_PACK = 'token_pack'      // 加油包
}

export interface ProductPlan {
    id: string;
    type: ProductType;
    name: string;
    description: string;
    price: number;       // 价格 (分/CNY)
    tokens: number;      // 赠送代币
    days: number;        // 会员天数 (0表示不送会员)
    is_popular?: boolean;// 是否推荐
}

// === 留言板与公告 (New) ===

export interface Message {
    id: string;
    user_id: string;
    content: string;
    reply?: string;
    reply_at?: string;
    created_at: string;
    username?: string; // 联表查询用
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    is_published: number; // 0 or 1
    created_at: string;
    updated_at: string;
}
