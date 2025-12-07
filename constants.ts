
import { NovelSettings } from "./types";

export const DEFAULT_NOVEL_SETTINGS: NovelSettings = {
    genre: '都市异能',
    trope: '直播+系统+算命',
    protagonistType: '高冷，但是内心戏丰富，杀伐果断',
    goldenFinger: '能够看到每个人未来的死亡倒计时和原因',
    pacing: 'fast',
    targetAudience: 'male',
    tone: '表面轻松，实则紧张刺激，带有悬疑感'
};

export const API_BASE_URL = 
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL) || 
    (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || 
    'http://localhost:3000';

export const API_ENDPOINTS = {
    GENERATE: `${API_BASE_URL}/api/generate`,
    CONFIG: `${API_BASE_URL}/api/config/pool`,
    AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
    AUTH_REGISTER: `${API_BASE_URL}/api/auth/register`,
    ARCHIVES: `${API_BASE_URL}/api/archives`,
    CARDS: `${API_BASE_URL}/api/cards`,
    
    // === 新增 API 端点 ===
    NOVELS_ROOT: `${API_BASE_URL}/api/novels`,
    CHAPTERS_ROOT: `${API_BASE_URL}/api/chapters`,
    MINDMAPS_ROOT: `${API_BASE_URL}/api/mindmaps`
};
