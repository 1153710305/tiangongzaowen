import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings, AppLanguage, AppTheme, AppFont } from '../types';

// === 翻译资源字典 ===
const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
    'zh-CN': {
        'app.name': '天工造文',
        'app.slogan': 'AI 爆款小说生成器',
        'sidebar.projects': '我的作品库',
        'sidebar.prompts': '提示词库',
        'sidebar.archives': '我的存档',
        'sidebar.cards': '脑洞卡片',
        'sidebar.settings': '系统设置',
        'sidebar.logout': '退出登录',
        'sidebar.login': '登录 / 注册',
        'sidebar.announcements': '系统公告',
        'sidebar.guestbook': '留言反馈',
        'sidebar.trash': '回收站',
        'settings.modal.title': '本地化与偏好设置',
        'settings.lang': '语言 (Language)',
        'settings.theme': '主题 (Theme)',
        'settings.font': '字体 (Font)',
        'settings.theme.dark': '暗夜 (Dark)',
        'settings.theme.light': '明亮 (Light)',
        'settings.theme.midnight': '深蓝 (Midnight)',
        'settings.theme.forest': '森系 (Forest)',
        'settings.font.system': '系统默认',
        'settings.font.serif': '衬线体 (阅读)',
        'settings.font.mono': '等宽 (代码)',
        'settings.font.handwriting': '手写体 (创意)',
        'btn.save': '保存设置',
        'btn.close': '关闭'
    },
    'en-US': {
        'app.name': 'SkyCraft AI',
        'app.slogan': 'Bestseller Novel Generator',
        'sidebar.projects': 'My Projects',
        'sidebar.prompts': 'Prompt Library',
        'sidebar.archives': 'Archives',
        'sidebar.cards': 'Idea Cards',
        'sidebar.settings': 'Settings',
        'sidebar.logout': 'Logout',
        'sidebar.login': 'Login / Register',
        'sidebar.announcements': 'Announcements',
        'sidebar.guestbook': 'Guestbook',
        'sidebar.trash': 'Result Bin',
        'settings.modal.title': 'Localization & Preferences',
        'settings.lang': 'Language',
        'settings.theme': 'Theme',
        'settings.font': 'Font',
        'settings.theme.dark': 'Dark',
        'settings.theme.light': 'Light',
        'settings.theme.midnight': 'Midnight',
        'settings.theme.forest': 'Forest',
        'settings.font.system': 'System UI',
        'settings.font.serif': 'Serif (Reading)',
        'settings.font.mono': 'Monospace',
        'settings.font.handwriting': 'Handwriting',
        'btn.save': 'Save',
        'btn.close': 'Close'
    },
    'ja-JP': {
        'app.name': 'SkyCraft AI',
        'app.slogan': 'ベストセラー小説ジェネレーター',
        'sidebar.projects': 'マイプロジェクト',
        'sidebar.prompts': 'プロンプトライブラリ',
        'sidebar.archives': 'アーカイブ',
        'sidebar.cards': 'アイデアカード',
        'sidebar.settings': '設定',
        'sidebar.logout': 'ログアウト',
        'sidebar.login': 'ログイン / 登録',
        'sidebar.announcements': 'お知らせ',
        'sidebar.guestbook': 'ゲストブック',
        'sidebar.trash': 'ゴミ箱',
        'settings.modal.title': 'ローカリゼーションと設定',
        'settings.lang': '言語 (Language)',
        'settings.theme': 'テーマ (Theme)',
        'settings.font': 'フォント (Font)',
        'settings.theme.dark': 'ダーク',
        'settings.theme.light': 'ライト',
        'settings.theme.midnight': 'ミッドナイト',
        'settings.theme.forest': 'フォレスト',
        'settings.font.system': 'システム',
        'settings.font.serif': 'セリフ (明朝)',
        'settings.font.mono': '等幅',
        'settings.font.handwriting': '手書き',
        'btn.save': '保存',
        'btn.close': '閉じる'
    }
};

const DEFAULT_SETTINGS: AppSettings = {
    language: 'zh-CN',
    theme: 'dark',
    fontFamily: 'system',
    fontSize: 16
};

// 字体映射
const FONT_MAP: Record<AppFont, string> = {
    system: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    serif: '"Merriweather", "Noto Serif SC", "Times New Roman", Times, serif',
    mono: '"JetBrains Mono", "Courier New", Courier, monospace',
    handwriting: '"Ma Shan Zheng", "Comic Sans MS", cursive'
};

interface SettingsContextProps {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 尝试从 localStorage 读取设置，否则使用默认
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('skycraft_settings');
        return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    });

    // 监听设置变化并应用副作用 (字体、主题)
    useEffect(() => {
        localStorage.setItem('skycraft_settings', JSON.stringify(settings));

        // 1. 应用字体
        document.body.style.fontFamily = FONT_MAP[settings.fontFamily];

        // 2. 应用主题
        const root = document.documentElement;

        // 动态注入主题颜色变量
        // 注意：index.html 中的 tailwind 配置已经将 'dark' 和 'paper' 颜色映射为 var(--color-dark) 和 var(--color-paper)
        if (settings.theme === 'midnight') {
            root.classList.add('dark');
            root.style.setProperty('--color-dark', '#020617'); // slate-950
            root.style.setProperty('--color-paper', '#0f172a'); // slate-900
        } else if (settings.theme === 'forest') {
            root.classList.add('dark');
            root.style.setProperty('--color-dark', '#052e16'); // green-950
            root.style.setProperty('--color-paper', '#14532d'); // green-900
        } else if (settings.theme === 'light') {
            root.classList.remove('dark');
            root.style.setProperty('--color-dark', '#f8fafc'); // slate-50
            root.style.setProperty('--color-paper', '#ffffff'); // white
        } else {
            // Default Dark
            root.classList.add('dark');
            root.style.setProperty('--color-dark', '#0f172a'); // slate-900
            root.style.setProperty('--color-paper', '#1e293b'); // slate-800
        }

    }, [settings]);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    // 翻译函数
    const t = (key: string): string => {
        const dict = TRANSLATIONS[settings.language] || TRANSLATIONS['en-US'];
        return dict[key] || key;
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, t }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error("useSettings must be used within a SettingsProvider");
    return context;
};
