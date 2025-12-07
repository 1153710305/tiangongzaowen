
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
}

export enum WorkflowStep {
    IDEA = 'idea', 
    ANALYSIS_IDEA = 'analysis_idea', 
    OUTLINE = 'outline', 
    CHARACTER = 'character', 
    CHAPTER = 'chapter', 
    REVIEW = 'review' 
}

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

// === 数据库模型 ===

export interface User {
    id: string;
    username: string;
    password_hash: string;
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

// === 新增：小说项目数据库模型 ===

export interface DbNovel {
    id: string;
    user_id: string;
    title: string;
    origin_card_id?: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface DbChapter {
    id: string;
    novel_id: string;
    title: string;
    content: string; // Large Text
    order_index: number;
    created_at: string;
    updated_at: string;
}

export interface DbMindMap {
    id: string;
    novel_id: string;
    title: string;
    nodes: string; // JSON String
    created_at: string;
    updated_at: string;
}
