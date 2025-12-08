
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
    'pt-BR': {
        'app.name': 'SkyCraft AI',
        'app.slogan': 'Gerador de Romances Best-sellers',
        'sidebar.projects': 'Meus Projetos',
        'sidebar.prompts': 'Biblioteca de Prompts',
        'sidebar.archives': 'Arquivos',
        'sidebar.cards': 'Cartões de Ideias',
        'sidebar.settings': 'Configurações',
        'sidebar.logout': 'Sair',
        'sidebar.login': 'Entrar / Registrar',
        'settings.modal.title': 'Localização e Preferências',
        'settings.lang': 'Idioma',
        'settings.theme': 'Tema',
        'settings.font': 'Fonte',
        'settings.theme.dark': 'Escuro',
        'settings.theme.light': 'Claro',
        'settings.theme.midnight': 'Meia-noite',
        'settings.theme.forest': 'Floresta',
        'settings.font.system': 'Sistema',
        'settings.font.serif': 'Serifa',
        'settings.font.mono': 'Monoespaçada',
        'settings.font.handwriting': 'Manuscrito',
        'btn.save': 'Salvar',
        'btn.close': 'Fechar'
    },
    'es-MX': {
        'app.name': 'SkyCraft AI',
        'app.slogan': 'Generador de Novelas Éxitos',
        'sidebar.projects': 'Mis Proyectos',
        'sidebar.prompts': 'Librería de Prompts',
        'sidebar.archives': 'Archivos',
        'sidebar.cards': 'Tarjetas de Ideas',
        'sidebar.settings': 'Ajustes',
        'sidebar.logout': 'Cerrar Sesión',
        'sidebar.login': 'Iniciar / Registro',
        'settings.modal.title': 'Localización y Preferencias',
        'settings.lang': 'Idioma',
        'settings.theme': 'Tema',
        'settings.font': 'Fuente',
        'settings.theme.dark': 'Oscuro',
        'settings.theme.light': 'Claro',
        'settings.theme.midnight': 'Medianoche',
        'settings.theme.forest': 'Bosque',
        'settings.font.system': 'Sistema',
        'settings.font.serif': 'Serifa',
        'settings.font.mono': 'Monoespaciado',
        'settings.font.handwriting': 'Manuscrito',
        'btn.save': 'Guardar',
        'btn.close': 'Cerrar'
    },
    'vi-VN': {
        'app.name': 'SkyCraft AI',
        'app.slogan': 'Trình tạo tiểu thuyết bán chạy nhất',
        'sidebar.projects': 'Dự án của tôi',
        'sidebar.prompts': 'Thư viện lời nhắc',
        'sidebar.archives': 'Lưu trữ',
        'sidebar.cards': 'Thẻ ý tưởng',
        'sidebar.settings': 'Cài đặt',
        'sidebar.logout': 'Đăng xuất',
        'sidebar.login': 'Đăng nhập / Đăng ký',
        'settings.modal.title': 'Ngôn ngữ & Tùy chọn',
        'settings.lang': 'Ngôn ngữ',
        'settings.theme': 'Giao diện',
        'settings.theme.dark': 'Tối',
        'settings.theme.light': 'Sáng',
        'settings.theme.midnight': 'Nửa đêm',
        'settings.theme.forest': 'Rừng',
        'settings.font': 'Phông chữ',
        'settings.font.system': 'Hệ thống',
        'settings.font.serif': 'Có chân',
        'settings.font.mono': 'Đơn không gian',
        'settings.font.handwriting': 'Viết tay',
        'btn.save': 'Lưu',
        'btn.close': 'Đóng'
    },
    'th-TH': {
        'app.name': 'SkyCraft AI',
        'app.slogan': 'เครื่องมือสร้างนิยายยอดนิยม',
        'sidebar.projects': 'โปรเจกต์ของฉัน',
        'sidebar.prompts': 'คลังคำสั่ง',
        'sidebar.archives': 'คลังข้อมูล',
        'sidebar.cards': 'การ์ดไอเดีย',
        'sidebar.settings': 'ตั้งค่า',
        'sidebar.logout': 'ออกจากระบบ',
        'sidebar.login': 'เข้าสู่ระบบ / ลงทะเบียน',
        'settings.modal.title': 'การตั้งค่าและภาษา',
        'settings.lang': 'ภาษา',
        'settings.theme': 'ธีม',
        'settings.theme.dark': 'มืด',
        'settings.theme.light': 'สว่าง',
        'settings.theme.midnight': 'เที่ยงคืน',
        'settings.theme.forest': 'ป่า',
        'settings.font': 'ฟอนต์',
        'settings.font.system': 'ระบบ',
        'settings.font.serif': 'แบบมีเชิง',
        'settings.font.mono': 'โมโนสเปซ',
        'settings.font.handwriting': 'ลายมือ',
        'btn.save': 'บันทึก',
        'btn.close': 'ปิด'
    },
    'id-ID': {
        'app.name': 'SkyCraft AI',
        'app.slogan': 'Generator Novel Terlaris',
        'sidebar.projects': 'Proyek Saya',
        'sidebar.prompts': 'Pustaka Prompt',
        'sidebar.archives': 'Arsip',
        'sidebar.cards': 'Kartu Ide',
        'sidebar.settings': 'Pengaturan',
        'sidebar.logout': 'Keluar',
        'sidebar.login': 'Masuk / Daftar',
        'settings.modal.title': 'Lokalisasi & Preferensi',
        'settings.lang': 'Bahasa',
        'settings.theme': 'Tema',
        'settings.theme.dark': 'Gelap',
        'settings.theme.light': 'Terang',
        'settings.theme.midnight': 'Tengah Malam',
        'settings.theme.forest': 'Hutan',
        'settings.font': 'Font',
        'settings.font.system': 'Sistem',
        'settings.font.serif': 'Serif',
        'settings.font.mono': 'Monospace',
        'settings.font.handwriting': 'Tulisan Tangan',
        'btn.save': 'Simpan',
        'btn.close': 'Tutup'
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
