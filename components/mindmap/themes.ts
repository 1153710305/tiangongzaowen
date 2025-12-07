
// === 布局定义 ===
export type LayoutType = 'right' | 'down' | 'timeline' | 'list';

export const LAYOUTS: { id: LayoutType; name: string }[] = [
    { id: 'right', name: '➡️ 逻辑结构图 (默认)' },
    { id: 'down', name: '⬇️ 组织结构图' },
    { id: 'timeline', name: '⏱️ 时间轴视图' },
    { id: 'list', name: '📝 目录列表' },
];

// === 主题定义 ===
export interface ThemeConfig {
    id: string;
    name: string;
    bgContainer: string; // 整个画布背景
    bgGridColor: string; // 网格点颜色
    lineColor: string; // 连接线颜色 (Border color class)
    node: {
        root: string; // 根节点样式
        base: string; // 普通节点样式
        selected: string; // 选中样式
        text: string; // 文字颜色
        input: string; // 编辑输入框文字颜色
        dragTarget: string; // 拖拽目标高亮样式
    }
}

export const THEMES: Record<string, ThemeConfig> = {
    dark: {
        id: 'dark',
        name: '🌌 暗夜赛博',
        bgContainer: 'bg-[#121212]',
        bgGridColor: '#333',
        lineColor: 'border-slate-700', // 线条颜色变淡
        node: {
            // 根节点保持醒目
            root: 'bg-gradient-to-r from-pink-600/80 to-purple-600/80 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] border-none backdrop-blur-sm',
            // 普通节点：去除背景，极简边框，文字为主
            base: 'bg-transparent border-b border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors',
            // 选中：加背景强调
            selected: 'bg-slate-800 text-white border-b-2 border-pink-500 shadow-lg',
            text: 'text-slate-300',
            input: 'text-white bg-slate-800/50',
            dragTarget: 'ring-1 ring-yellow-400 bg-slate-800/50'
        }
    },
    light: {
        id: 'light',
        name: '📄 纯净白纸',
        bgContainer: 'bg-[#f8fafc]',
        bgGridColor: '#e2e8f0',
        lineColor: 'border-slate-300',
        node: {
            root: 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg border-none',
            base: 'bg-transparent border-b border-slate-300 text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors',
            selected: 'bg-white text-indigo-700 border-b-2 border-indigo-500 shadow-md',
            text: 'text-slate-700',
            input: 'text-slate-900 bg-white/80',
            dragTarget: 'ring-1 ring-yellow-500 bg-yellow-50'
        }
    },
    ocean: {
        id: 'ocean',
        name: '🌊 深海沉浸',
        bgContainer: 'bg-[#0f172a]',
        bgGridColor: '#1e293b',
        lineColor: 'border-cyan-900',
        node: {
            root: 'bg-gradient-to-r from-cyan-600/80 to-blue-700/80 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] border-none backdrop-blur-sm',
            base: 'bg-transparent border-b border-cyan-900 text-cyan-200 hover:text-cyan-50 hover:border-cyan-600',
            selected: 'bg-cyan-900/40 text-cyan-50 border-b-2 border-cyan-400',
            text: 'text-cyan-100',
            input: 'text-white bg-cyan-900/50',
            dragTarget: 'ring-1 ring-yellow-400 bg-cyan-900/50'
        }
    },
    nature: {
        id: 'nature',
        name: '🌿 林间绿意',
        bgContainer: 'bg-[#f0fdf4]',
        bgGridColor: '#dcfce7',
        lineColor: 'border-green-200',
        node: {
            root: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg border-none',
            base: 'bg-transparent border-b border-green-200 text-green-800 hover:text-green-900 hover:border-green-400',
            selected: 'bg-green-50 text-green-900 border-b-2 border-green-500 shadow-sm',
            text: 'text-green-800',
            input: 'text-green-900 bg-white/80',
            dragTarget: 'ring-1 ring-yellow-500 bg-green-50'
        }
    },
    retro: {
        id: 'retro',
        name: '📜 复古羊皮',
        bgContainer: 'bg-[#fdf6e3]',
        bgGridColor: '#eee8d5',
        lineColor: 'border-[#d3cbb8]',
        node: {
            root: 'bg-[#cb4b16] text-[#fdf6e3] shadow-md border-none font-serif',
            base: 'bg-transparent border-b border-[#d3cbb8] text-[#586e75] font-serif hover:text-[#073642] hover:border-[#b58900]',
            selected: 'bg-[#eee8d5] text-[#073642] border-b-2 border-[#d33682]',
            text: 'text-[#586e75]',
            input: 'text-[#657b83] bg-[#eee8d5]',
            dragTarget: 'ring-1 ring-[#859900] bg-[#eee8d5]'
        }
    },
    cyberpunk: {
        id: 'cyberpunk',
        name: '🤖 赛博霓虹',
        bgContainer: 'bg-black',
        bgGridColor: '#222',
        lineColor: 'border-none bg-gradient-to-b from-cyan-900 to-purple-900 w-[1px]', // 线条更细更暗
        node: {
            root: 'bg-black border border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]',
            base: 'bg-transparent border-b border-purple-900 text-purple-400 hover:text-purple-200 hover:border-purple-500',
            selected: 'bg-gray-900/80 text-yellow-300 border-b border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]',
            text: 'text-purple-300',
            input: 'text-cyan-300 bg-black',
            dragTarget: 'ring-1 ring-green-400 bg-gray-900'
        }
    }
};
