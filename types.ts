
// 消息角色枚举
export enum Role {
    USER = 'user',
    MODEL = 'model',
    SYSTEM = 'system'
}

// 用户角色枚举
export enum UserRole {
    USER = 'user',
    ADMIN = 'admin'
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
    IDEA = 'idea', // 创意/脑暴
    OUTLINE = 'outline', // 大纲
    CHARACTER = 'character', // 人设
    CHAPTER = 'chapter', // 正文
    REVIEW = 'review' // 审稿/润色
}

// === 新增：认证与存档相关接口 ===

export interface User {
    id: string;
    username: string;
    role: UserRole; // 新增权限字段
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

// === 管理后台接口 ===

export interface SystemStats {
    userCount: number;
    archiveCount: number;
    dbSizeMB: number;
    uptimeSeconds: number;
}
