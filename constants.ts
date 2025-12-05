
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
    tone: '表面轻松，实则紧张刺激，带有悬疑感'
};

/**
 * 后端 API 地址配置
 * 生产环境应通过环境变量注入
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
    GENERATE: `${API_BASE_URL}/api/generate`,
    CONFIG: `${API_BASE_URL}/api/config/pool`
};
