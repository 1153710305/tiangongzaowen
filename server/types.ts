
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

// 步骤枚举
export enum WorkflowStep {
    IDEA = 'idea', // 创意
    OUTLINE = 'outline', // 大纲
    CHARACTER = 'character', // 人设
    CHAPTER = 'chapter', // 正文
    REVIEW = 'review' // 审稿
}

// 用户角色枚举
export enum UserRole {
    USER = 'user',
    ADMIN = 'admin'
}

// === 数据库模型 ===

export interface User {
    id: string;
    username: string;
    password_hash: string;
    role: UserRole; // 新增 role 字段
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

export interface SystemStats {
    userCount: number;
    archiveCount: number;
    dbSizeMB: number;
    uptimeSeconds: number;
}
