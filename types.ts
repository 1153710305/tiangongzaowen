
// 消息角色枚举
export enum Role {
    USER = 'user',
    MODEL = 'model',
    SYSTEM = 'system'
}

// 小说核心配置接口
export interface NovelSettings {
    genre: string; // 流派
    trope: string; // 核心梗
    protagonistType: string; // 主角类型
    goldenFinger: string; // 金手指
    pacing: 'fast' | 'normal' | 'slow'; // 节奏
    targetAudience: 'male' | 'female'; // 男频/女频
    tone: string; // 基调
}

// 参考小说接口
export interface ReferenceNovel {
    title: string;
    intro: string;
    url?: string;
}

// === 脑洞卡片接口 ===
export interface IdeaCard {
    id: string;
    userId: string;
    title: string;
    intro: string;
    highlight: string;
    explosive_point: string;
    golden_finger: string;
    created_at: string;
}

// === IDE 项目相关接口 ===
export interface Project {
    id: string;
    user_id: string;
    title: string;
    description: string;
    idea_card_id?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface Chapter {
    id: string;
    project_id: string;
    title: string;
    content?: string;
    order_index: number;
    updated_at: string;
}

// === 思维导图相关 ===
export interface MindMapNode {
    id: string;
    label: string;
    children: MindMapNode[];
    isExpanded?: boolean;
}

export interface MindMap {
    id: string;
    project_id: string;
    title: string;
    data: string; // JSON String of { root: MindMapNode }
    updated_at: string;
}

export interface ProjectStructure {
    chapters: Chapter[];
    maps: MindMap[];
}

// === 提示词库相关 (New) ===
export type PromptType = 'system' | 'constraint' | 'normal';

export interface UserPrompt {
    id: string;
    user_id: string;
    type: PromptType;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}

// 聊天/生成记录接口
export interface ChatMessage {
    id: string;
    role: Role;
    content: string;
    timestamp: number;
    isError?: boolean;
}

// 日志级别
export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    details?: any;
}

export type GenerationMode = 'stream' | 'normal';

// 步骤枚举
export enum WorkflowStep {
    IDEA = 'idea',
    ANALYSIS_IDEA = 'analysis_idea',
    OUTLINE = 'outline',
    CHARACTER = 'character',
    CHAPTER = 'chapter',
    REVIEW = 'review',
    MIND_MAP_NODE = 'mind_map_node'
}

export interface User {
    id: string;
    username: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface Archive {
    id: string;
    userId: string;
    title: string;
    settings: NovelSettings;
    history: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

// === 本地化设置 (New) ===
export type AppLanguage = 'zh-CN' | 'en-US' | 'ja-JP';
export type AppTheme = 'dark' | 'light' | 'midnight' | 'forest';
export type AppFont = 'system' | 'serif' | 'mono' | 'handwriting';

export interface AppSettings {
    language: AppLanguage;
    theme: AppTheme;
    fontFamily: AppFont;
    fontSize: number; // 基础字号，默认16
}

// === 商品与交易相关 (New) ===
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
