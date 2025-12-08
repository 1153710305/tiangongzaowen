
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings, AppLanguage } from '../types';

// === 翻译资源字典 (Updated: ZH, EN, JP only) ===
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
        'settings.modal.title': '语言设置',
        'settings.lang': '语言 (Language)',
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
        'sidebar.trash': 'Recycle Bin',
        'settings.modal.title': 'Language Settings',
        'settings.lang': 'Language',
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
        'settings.modal.title': '言語設定',
        'settings.lang': '言語 (Language)',
        'btn.save': '保存',
        'btn.close': '閉じる'
    }
};

const DEFAULT_SETTINGS: AppSettings = {
    language: 'zh-CN'
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
        // 如果旧的配置中包含 theme/font，解析时会自动被忽略或兼容，因为我们只读取 language
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // 确保 language 是有效的
                const validLangs = ['zh-CN', 'en-US', 'ja-JP'];
                const lang = validLangs.includes(parsed.language) ? parsed.language : 'zh-CN';
                return { language: lang };
            } catch (e) {
                return DEFAULT_SETTINGS;
            }
        }
        return DEFAULT_SETTINGS;
    });

    // 监听设置变化并持久化
    useEffect(() => {
        localStorage.setItem('skycraft_settings', JSON.stringify(settings));
        // 主题和字体逻辑已移除，由 CSS (Tailwind) 和 index.html 默认样式控制
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
