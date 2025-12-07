
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
    targetAudience: 'male' | 'female'; // 受众
    tone: string; // 基调
}

// 参考小说接口 (用于仿写模式)
export interface ReferenceNovel {
    title: string;
    intro: string;
    url?: string;
}

// 脑洞卡片接口
export interface IdeaCard {
    id: string; // UUID
    userId: string;
    title: string;
    intro: string; 
    highlight: string; 
    explosive_point: string; 
    golden_finger: string; 
    created_at: string;
}

// === 新增：小说项目结构 ===

// 视图模式
export type ViewMode = 'GENERATOR' | 'WORKSPACE';

// 小说项目实体
export interface Novel {
    id: string;
    userId: string;
    title: string;
    originCardId?: string; // 关联的脑洞卡片ID
    coverUrl?: string;
    status: 'draft' | 'published' | 'archived';
    createdAt: string;
    updatedAt: string;
}

// 章节实体 (列表视图用，不含大文本)
export interface ChapterListItem {
    id: string;
    novelId: string;
    title: string;
    orderIndex: number;
    updatedAt: string;
}

// 章节详情 (包含内容)
export interface Chapter extends ChapterListItem {
    content: string;
}

// 思维导图实体
export interface MindMap {
    id: string;
    novelId: string;
    title: string;
    nodes: string; // JSON String of graph nodes
    updatedAt: string;
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

// 系统日志条目
export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    details?: any;
}

export type GenerationMode = 'stream' | 'normal';

export enum WorkflowStep {
    IDEA = 'idea', 
    ANALYSIS_IDEA = 'analysis_idea', 
    OUTLINE = 'outline', 
    CHARACTER = 'character', 
    CHAPTER = 'chapter', 
    REVIEW = 'review' 
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
