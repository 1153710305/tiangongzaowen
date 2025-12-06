
// 消息角色枚举
export enum Role {
    USER = 'user',
    MODEL = 'model',
    SYSTEM = 'system'
}

// 小说核心配置接口
export interface NovelSettings {
    genre: string; // 流派：如玄幻、都市、言情
    trope: string; // 核心梗：如重生、系统、无敌、马甲
    protagonistType: string; // 主角类型：如腹黑、杀伐果断、咸鱼
    goldenFinger: string; // 金手指：主角的特殊能力
    pacing: 'fast' | 'normal' | 'slow'; // 节奏：快节奏(爽文)、常规、慢热
    targetAudience: 'male' | 'female'; // 男频/女频
    tone: string; // 基调：轻松、热血、虐心
}

// 参考小说接口 (用于仿写模式)
export interface ReferenceNovel {
    title: string;
    intro: string;
    url?: string; // 可选，仅作记录
}

// === 新增：脑洞卡片接口 ===
export interface IdeaCard {
    id: string; // UUID
    userId: string;
    title: string;
    intro: string; // 简介
    highlight: string; // 爽点
    explosive_point: string; // 爆点
    golden_finger: string; // 金手指
    created_at: string;
}

// 聊天/生成记录接口
export interface ChatMessage {
    id: string;
    role: Role;
    content: string; // Markdown内容
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

// 系统日志条目
export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    details?: any;
}

// 生成模式：流式或一次性
export type GenerationMode = 'stream' | 'normal';

// 步骤枚举
export enum WorkflowStep {
    IDEA = 'idea', // 创意/脑暴 (参数模式/一句话模式)
    ANALYSIS_IDEA = 'analysis_idea', // 新增：爆款分析仿写模式
    OUTLINE = 'outline', // 大纲
    CHARACTER = 'character', // 人设
    CHAPTER = 'chapter', // 正文
    REVIEW = 'review' // 审稿/润色
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
    createdAt: string; // ISO String
    updatedAt: string; // ISO String
}
