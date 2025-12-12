


import { NovelSettings } from "./types";

/**
 * 默认小说设置
 * 前端仅保留兜底默认值，具体素材池由后端 API 提供
 */
export const DEFAULT_NOVEL_SETTINGS: NovelSettings = {
    genre: '都市异能',
    trope: '直播+系统+算命',
    protagonistType: '高冷，但是内心戏丰富，杀伐果断',
    goldenFinger: '能够看到每个人未来的死亡倒计时和原因',
    pacing: 'fast',
    targetAudience: 'male',
    tone: '表面轻松，实则紧张刺激，带有悬疑感',
    platform: '番茄'
};

/**
 * 支持的网文平台列表
 */
export const NOVEL_PLATFORMS = [
    { id: '番茄', name: '番茄小说', style: '节奏快、脑洞大、爽点密集、情绪价值高' },
    { id: '起点', name: '起点中文网', style: '逻辑严密、世界观宏大、慢热、升级流' },
    { id: '晋江', name: '晋江文学城', style: '细腻、情感丰富、人设出彩、纯爱/言情' },
    { id: '飞卢', name: '飞卢小说', style: '极速节奏、开局无敌、系统流、脑洞夸张' },
    { id: '知乎', name: '知乎盐选', style: '第一人称、反转多、现实题材、脑洞短篇' },
    { id: '七猫', name: '七猫小说', style: '爽文、都市、赘婿、战神、甜宠' }
];

/**
 * 后端 API 地址配置
 * 优先级：
 * 1. Vite 环境变量 (VITE_API_BASE_URL)
 * 2. CRA 环境变量 (REACT_APP_API_URL)
 * 3. 本地默认值 (http://localhost:3000)
 */
export const API_BASE_URL =
    // 使用类型断言 (as any) 规避 TypeScript 报错: Property 'env' does not exist on type 'ImportMeta'
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL) ||
    // 兼容 Create React App 或其他 Node.js 环境的全局 process.env
    (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
    'http://192.168.1.18:3000';

/**
 * API 接口端点集合
 * 统一管理所有后端接口路径
 */
export const API_ENDPOINTS = {
    /** 内容生成接口：用于流式生成小说创意、大纲、正文等 */
    GENERATE: `${API_BASE_URL}/api/generate`,
    /** 配置池接口：用于获取后端的随机素材配置 */
    CONFIG: `${API_BASE_URL}/api/config/pool`,

    // === 认证接口 ===
    AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
    AUTH_REGISTER: `${API_BASE_URL}/api/auth/register`,

    // === 存档接口 (旧版) ===
    ARCHIVES: `${API_BASE_URL}/api/archives`,

    // === 脑洞卡片接口 ===
    CARDS: `${API_BASE_URL}/api/cards`,

    // === 项目/IDE 接口 (新版) ===
    PROJECTS: `${API_BASE_URL}/api/projects`,
    PROJECT_CREATE_FROM_CARD: `${API_BASE_URL}/api/projects/from-card`,
};
