
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
    created_at: string;
}

export enum WorkflowStep {
    IDEA = 'idea',
    ANALYSIS_IDEA = 'analysis_idea',
    OUTLINE = 'outline',
    CHARACTER = 'character',
    CHAPTER = 'chapter',
    REVIEW = 'review',
    MIND_MAP_NODE = 'mind_map_node'
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

// === API Key 管理 (New) ===
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
    isActive?: boolean; // 新增：是否启用
}
