
/**
 * 服务端专用类型定义
 * 复制自根目录 types.ts，确保服务端可以独立打包部署，无需依赖上层目录
 */

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

// 参考小说接口 (用于爆款分析模式)
export interface ReferenceNovel {
    title: string;
    intro: string;
    url?: string;
}

// === 新增：脑洞卡片数据结构 (对应数据库 JSONContent) ===
export interface IdeaCardData {
    title: string;
    intro: string;
    highlight: string;
    explosive_point: string;
    golden_finger: string;
}

// 步骤枚举
export enum WorkflowStep {
    IDEA = 'idea', // 创意
    ANALYSIS_IDEA = 'analysis_idea', // 新增：爆款分析仿写
    OUTLINE = 'outline', // 大纲
    CHARACTER = 'character', // 人设
    CHAPTER = 'chapter', // 正文
    REVIEW = 'review' // 审稿
}

// 日志级别
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
    content: string; // JSON string of { settings, history }
    created_at: string;
    updated_at: string;
}

// 脑洞卡片 DB 模型
export interface DbIdeaCard {
    id: string;
    user_id: string;
    title: string;
    content: string; // JSON string of IdeaCardData
    created_at: string;
}

// === v2.7 新增：项目系统 DB 模型 ===

// 小说项目
export interface DbNovelProject {
    id: string;
    user_id: string;
    title: string;
    idea_snapshot: string; // JSON string (IdeaCardData)
    status: string; // 'draft', 'published'
    created_at: string;
    updated_at: string;
}

// 章节
export interface DbChapter {
    id: string;
    project_id: string;
    title: string;
    content: string; // Large Text
    order_index: number;
    created_at: string;
    updated_at: string;
}

// 思维导图
export interface DbMindMap {
    id: string;
    project_id: string;
    title: string;
    type: string; // 'structure', 'character', etc.
    content: string; // JSON string (Nodes/Edges)
    created_at: string;
    updated_at: string;
}