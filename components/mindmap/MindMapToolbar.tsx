
import React from 'react';
import { THEMES, LAYOUTS, LayoutType } from './themes';

interface MindMapToolbarProps {
    title: string;
    setTitle: (value: string) => void;
    onTitleBlur: () => void;
    activeLayout: LayoutType;
    setActiveLayout: (layout: LayoutType) => void;
    activeThemeId: string;
    setActiveThemeId: (themeId: string) => void;
    scale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    showShortcuts: boolean;
    setShowShortcuts: (show: boolean) => void;
    isSaving: boolean;
}

export const MindMapToolbar: React.FC<MindMapToolbarProps> = ({
    title, setTitle, onTitleBlur,
    activeLayout, setActiveLayout,
    activeThemeId, setActiveThemeId,
    scale, onZoomIn, onZoomOut, onResetView,
    canUndo, canRedo, onUndo, onRedo,
    showShortcuts, setShowShortcuts,
    isSaving
}) => {
    return (
        <div className="h-12 bg-[#2d2d2d] border-b border-black/50 flex items-center px-4 justify-between shrink-0 z-30 shadow-md">
            {/* Left: Title & Controls */}
            <div className="flex items-center gap-3">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={onTitleBlur}
                    className="bg-transparent border-none text-slate-200 font-bold outline-none w-32 md:w-48 text-sm truncate focus:w-64 transition-all"
                />

                {/* 样式控制组 */}
                <div className="flex items-center gap-2 border-l border-slate-600 pl-3">
                    <div className="relative group">
                        <select
                            value={activeLayout}
                            onChange={(e) => setActiveLayout(e.target.value as LayoutType)}
                            className="bg-[#1e1e1e] text-slate-300 text-xs border border-slate-600 rounded px-2 py-1 outline-none w-28 appearance-none cursor-pointer hover:border-slate-400"
                        >
                            {LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    <div className="relative group">
                        <select
                            value={activeThemeId}
                            onChange={(e) => setActiveThemeId(e.target.value)}
                            className="bg-[#1e1e1e] text-slate-300 text-xs border border-slate-600 rounded px-2 py-1 outline-none w-28 appearance-none cursor-pointer hover:border-slate-400"
                        >
                            {Object.values(THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Center: Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-slate-700">
                <button onClick={onResetView} className="px-2 py-0.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="复位">⌖</button>
                <div className="w-px h-3 bg-slate-700 mx-1"></div>
                <button onClick={onZoomOut} className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300">-</button>
                <span className="text-[10px] text-slate-300 w-8 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={onZoomIn} className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300">+</button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                <div className="flex items-center bg-[#1e1e1e] rounded-lg border border-slate-700 p-0.5">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        title="撤销 (Ctrl+Z)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                    </button>
                    <div className="w-px h-4 bg-slate-700"></div>
                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        title="重做 (Ctrl+Y)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"></path></svg>
                    </button>
                </div>

                <button onClick={() => setShowShortcuts(!showShortcuts)} className="text-xs text-indigo-400 hover:text-indigo-300">
                    快捷键
                </button>
                {isSaving ? <span className="text-xs text-slate-400 animate-pulse">保存中...</span> : <span className="text-xs text-green-500/50">✔</span>}
            </div>
        </div>
    );
};
