
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
    REVIEW = 'review',
    MIND_MAP_NODE = 'mind_map_node' // 新增
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
