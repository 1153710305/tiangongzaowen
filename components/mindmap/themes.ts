
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
        lineColor: 'border-slate-600',
        node: {
            root: 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] border-none',
            base: 'bg-slate-800 border-slate-600 text-slate-300 shadow-lg',
            selected: 'ring-2 ring-pink-500 bg-slate-700 text-white',
            text: 'text-slate-300',
            input: 'text-white',
            dragTarget: 'ring-2 ring-yellow-400 bg-slate-700'
        }
    },
    light: {
        id: 'light',
        name: '📄 纯净白纸',
        bgContainer: 'bg-[#f8fafc]',
        bgGridColor: '#e2e8f0',
        lineColor: 'border-slate-400',
        node: {
            root: 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-xl border-none',
            base: 'bg-white border-slate-300 text-slate-700 shadow-sm',
            selected: 'ring-2 ring-indigo-500 bg-indigo-50 text-indigo-800',
            text: 'text-slate-700',
            input: 'text-slate-900',
            dragTarget: 'ring-2 ring-yellow-500 bg-yellow-50'
        }
    },
    ocean: {
        id: 'ocean',
        name: '🌊 深海沉浸',
        bgContainer: 'bg-[#0f172a]',
        bgGridColor: '#1e293b',
        lineColor: 'border-cyan-800',
        node: {
            root: 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border-none',
            base: 'bg-[#1e293b] border-cyan-900 text-cyan-100 shadow-lg',
            selected: 'ring-2 ring-cyan-400 bg-cyan-900/50',
            text: 'text-cyan-100',
            input: 'text-white',
            dragTarget: 'ring-2 ring-yellow-400 bg-cyan-900'
        }
    },
    nature: {
        id: 'nature',
        name: '🌿 林间绿意',
        bgContainer: 'bg-[#f0fdf4]',
        bgGridColor: '#dcfce7',
        lineColor: 'border-green-400',
        node: {
            root: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl border-none',
            base: 'bg-white border-green-200 text-green-800 shadow-sm',
            selected: 'ring-2 ring-green-500 bg-green-50',
            text: 'text-green-800',
            input: 'text-green-900',
            dragTarget: 'ring-2 ring-yellow-500 bg-green-50'
        }
    },
    retro: {
        id: 'retro',
        name: '📜 复古羊皮',
        bgContainer: 'bg-[#fdf6e3]',
        bgGridColor: '#eee8d5',
        lineColor: 'border-stone-400',
        node: {
            root: 'bg-[#cb4b16] text-[#fdf6e3] shadow-lg border-none',
            base: 'bg-[#eee8d5] border-[#b58900] text-[#586e75] shadow-sm font-serif',
            selected: 'ring-2 ring-[#d33682] bg-[#fdf6e3]',
            text: 'text-[#586e75]',
            input: 'text-[#657b83]',
            dragTarget: 'ring-2 ring-[#859900] bg-[#fdf6e3]'
        }
    },
    cyberpunk: {
        id: 'cyberpunk',
        name: '🤖 赛博霓虹',
        bgContainer: 'bg-black',
        bgGridColor: '#333',
        lineColor: 'border-none bg-gradient-to-b from-cyan-500 to-purple-500 w-[2px]', 
        // 注意：Cyberpunk 的线条比较特殊，这里还是用 class 控制，我们在 Renderer 里特殊处理一下线宽
        node: {
            root: 'bg-black border border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)]',
            base: 'bg-black border border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]',
            selected: 'ring-2 ring-yellow-400 bg-gray-900 text-yellow-300',
            text: 'text-purple-300',
            input: 'text-cyan-300',
            dragTarget: 'ring-2 ring-green-400 bg-gray-900'
        }
    }
};
