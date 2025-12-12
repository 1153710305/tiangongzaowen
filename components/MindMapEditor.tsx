
import React, { useState, useEffect, useRef } from 'react';
import { MindMap, MindMapNode, WorkflowStep, NovelSettings } from '../types';
import { apiService } from '../services/geminiService';
import { Button } from './Button';
import { logger } from '../services/loggerService';
import ReactMarkdown from 'react-markdown';
import { THEMES, LAYOUTS, LayoutType } from './mindmap/themes';
import { serializeNodeTree, deleteNodeFromTree, moveNodeInTree, updateNodeInTree, getAllNodesFlat, toggleNodeExpansion } from './mindmap/utils';
import { NodeRenderer } from './mindmap/NodeRenderer';
// ... imports
import { MindMapAiModal } from './mindmap/MindMapAiModal';

interface Props {
    projectId: string;
    mapData: MindMap;
    onSave: (mapId: string, title: string, dataStr: string) => Promise<void>;
    novelSettings?: NovelSettings;
    availableMaps?: { id: string, title: string }[];
}

export const MindMapEditor: React.FC<Props> = ({ projectId, mapData, onSave, novelSettings, availableMaps = [] }) => {
    // 数据状态
    const [rootNode, setRootNode] = useState<MindMapNode | null>(null);
    const [title, setTitle] = useState(mapData.title);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // 历史记录状态 (Undo/Redo)
    const [history, setHistory] = useState<MindMapNode[]>([]);
    const [future, setFuture] = useState<MindMapNode[]>([]);

    // 视图状态
    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // 自动聚焦与编辑状态
    const [focusTargetId, setFocusTargetId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    // 主题与布局状态
    const [activeThemeId, setActiveThemeId] = useState('dark');
    const [activeLayout, setActiveLayout] = useState<LayoutType>('right');
    const activeTheme = THEMES[activeThemeId] || THEMES.dark;

    // AI 弹窗状态 (简化)
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTargetNode, setAiTargetNode] = useState<MindMapNode | null>(null);

    // 初始化加载
    useEffect(() => {
        try {
            const parsed = JSON.parse(mapData.data);
            if (parsed.root) setRootNode(parsed.root);
            else setRootNode({ id: 'root', label: '核心创意', children: [] });
            setHistory([]);
            setFuture([]);
        } catch (e) {
            setRootNode({ id: 'root', label: '核心创意', children: [] });
            setHistory([]);
            setFuture([]);
        }
        setTitle(mapData.title);
    }, [mapData]);

    // 监听 focusTargetId (保持不变)
    useEffect(() => {
        if (focusTargetId && canvasRef.current) {
            // ... (Simple auto focus logic)
            // 省略详细代码，假设逻辑保持一致，通过简化实现
            setTimeout(() => {
                const nodeElement = document.getElementById(`node-content-${focusTargetId}`);
                if (nodeElement && canvasRef.current) {
                    const nodeRect = nodeElement.getBoundingClientRect();
                    const canvasRect = canvasRef.current.getBoundingClientRect();
                    setViewState(prev => ({
                        ...prev,
                        x: prev.x + (canvasRect.left + canvasRect.width / 2) - (nodeRect.left + nodeRect.width / 2),
                        y: prev.y + (canvasRect.top + canvasRect.height / 2) - (nodeRect.top + nodeRect.height / 2)
                    }));
                    setSelectedId(focusTargetId);
                    setFocusTargetId(null);
                }
            }, 50);
        }
    }, [focusTargetId]);

    // 统一的数据更新入口
    const updateMapState = (newRoot: MindMapNode) => {
        if (!rootNode) return;
        setHistory(prev => [...prev, rootNode]);
        setFuture([]);
        setRootNode(newRoot);
        triggerAutoSave(newRoot, title);
    };

    const triggerAutoSave = async (newRoot: MindMapNode, currentTitle: string) => {
        setIsSaving(true);
        try {
            const dataStr = JSON.stringify({ root: newRoot, layout: activeLayout });
            await onSave(mapData.id, currentTitle, dataStr);
        } catch (e) {
            logger.error("Auto save failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    // 撤销/重做 Logic (保持不变)
    const handleUndo = () => {
        if (history.length === 0 || !rootNode) return;
        const previousState = history[history.length - 1];
        setFuture(prev => [rootNode, ...prev]);
        setHistory(history.slice(0, -1));
        setRootNode(previousState);
        setEditingNodeId(null);
        triggerAutoSave(previousState, title);
    };

    const handleRedo = () => {
        if (future.length === 0 || !rootNode) return;
        const nextState = future[0];
        setHistory(prev => [...prev, rootNode]);
        setFuture(future.slice(1));
        setRootNode(nextState);
        setEditingNodeId(null);
        triggerAutoSave(nextState, title);
    };

    // 快捷键 (保持不变)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') { e.preventDefault(); e.shiftKey ? handleRedo() : handleUndo(); }
                else if (e.key === 'y') { e.preventDefault(); handleRedo(); }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, future, rootNode, title]);

    const handleTitleBlur = () => rootNode && title !== mapData.title && triggerAutoSave(rootNode, title);

    // 节点操作 (Child Add/Edit/Delete/Move/Expand)
    const generateUUID = () => crypto.randomUUID();

    const handleAddChild = (parentId: string) => {
        if (!rootNode) return;
        const newChild: MindMapNode = { id: generateUUID(), label: '新节点', children: [] };
        // Simple recursive add
        const addRecursive = (n: MindMapNode): MindMapNode => {
            if (n.id === parentId) return { ...n, isExpanded: true, children: [...(n.children || []), newChild] };
            if (n.children) return { ...n, children: n.children.map(addRecursive) };
            return n;
        };
        const newRoot = addRecursive(rootNode);
        updateMapState(newRoot);
        setFocusTargetId(newChild.id);
        setEditingNodeId(newChild.id);
    };

    const handleEditNode = (id: string, newLabel: string) => {
        if (!rootNode) return;
        const target = getAllNodesFlat(rootNode).find(n => n.id === id);
        if (target && target.label === newLabel) return;
        const newRoot = updateNodeInTree(rootNode, id, (n) => ({ ...n, label: newLabel }));
        updateMapState(newRoot);
        if (editingNodeId === id) setEditingNodeId(null);
    };

    const handleDeleteNode = (id: string) => {
        if (!rootNode || id === rootNode.id) return;
        updateMapState(deleteNodeFromTree(rootNode, id));
        if (selectedId === id) setSelectedId(null);
    };

    const handleMoveNode = (draggedId: string, targetId: string) => {
        if (!rootNode) return;
        const newRoot = moveNodeInTree(rootNode, draggedId, targetId);
        if (newRoot) updateMapState(newRoot);
    };

    const handleToggleExpand = (id: string) => {
        if (!rootNode) return;
        updateMapState(toggleNodeExpansion(rootNode, id));
    };

    // 画布相关 (保持不变)
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.mindmap-node') || target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;
        setIsPanning(true); setStartPan({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    };
    const handleCanvasMouseMove = (e: React.MouseEvent) => { if (isPanning) setViewState(prev => ({ ...prev, x: e.clientX - startPan.x, y: e.clientY - startPan.y })); };
    const handleCanvasMouseUp = () => setIsPanning(false);

    // AI Accessor
    const openAiModal = (node: MindMapNode) => {
        setAiTargetNode(node);
        setShowAiModal(true);
    };

    // Callback when AI finishes "Expand Node"
    const handleAiApply = (content: string) => {
        if (!aiTargetNode || !rootNode) return;
        // Parse markdown list to children
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        const newChildren: MindMapNode[] = [];
        const stack: { node: MindMapNode, level: number }[] = [];

        for (const line of lines) {
            const match = line.match(/^(\s*)[-*]\s+(.+)/);
            if (!match) continue;
            const newNode: MindMapNode = { id: generateUUID(), label: match[2], children: [] };
            const indent = match[1].length;
            while (stack.length > 0 && stack[stack.length - 1].level >= indent) stack.pop();
            if (stack.length === 0) newChildren.push(newNode);
            else stack[stack.length - 1].node.children.push(newNode);
            stack.push({ node: newNode, level: indent });
        }

        if (newChildren.length > 0) {
            const newRoot = updateNodeInTree(rootNode, aiTargetNode.id, (n) => ({
                ...n, isExpanded: true, children: [...(n.children || []), ...newChildren]
            }));
            updateMapState(newRoot);
            setShowAiModal(false);
        }
    };

    if (!rootNode) return <div className="text-white p-4">Loading...</div>;

    return (
        <div className={`h-full flex flex-col ${activeTheme.bgContainer} relative`}>
            {/* Top Toolbar */}
            <div className="h-12 bg-[#2d2d2d] border-b border-black/50 flex items-center px-4 justify-between shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-3">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur} className="bg-transparent border-none text-slate-200 font-bold outline-none w-32 md:w-48 text-sm truncate focus:w-64 transition-all" />
                    <div className="flex items-center gap-2 border-l border-slate-600 pl-3">
                        <select value={activeLayout} onChange={(e) => setActiveLayout(e.target.value as LayoutType)} className="bg-[#1e1e1e] text-slate-300 text-xs border border-slate-600 rounded px-2 py-1 outline-none w-28">{LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                        <select value={activeThemeId} onChange={(e) => setActiveThemeId(e.target.value)} className="bg-[#1e1e1e] text-slate-300 text-xs border border-slate-600 rounded px-2 py-1 outline-none w-28">{Object.values(THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                    </div>
                </div>
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-slate-700">
                    <button onClick={() => setViewState({ x: 0, y: 0, scale: 1 })} className="px-2 py-0.5 text-xs text-slate-400 hover:text-white">⌖</button>
                    <div className="w-px h-3 bg-slate-700 mx-1"></div>
                    <button onClick={() => setViewState(s => ({ ...s, scale: Math.max(s.scale / 1.2, 0.2) }))} className="w-5 h-5 flex items-center justify-center text-slate-300">-</button>
                    <span className="text-[10px] text-slate-300 w-8 text-center">{Math.round(viewState.scale * 100)}%</span>
                    <button onClick={() => setViewState(s => ({ ...s, scale: Math.min(s.scale * 1.2, 3) }))} className="w-5 h-5 flex items-center justify-center text-slate-300">+</button>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#1e1e1e] rounded-lg border border-slate-700 p-0.5">
                        <button onClick={handleUndo} disabled={history.length === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30">↩</button>
                        <div className="w-px h-4 bg-slate-700"></div>
                        <button onClick={handleRedo} disabled={future.length === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30">↪</button>
                    </div>
                    <button onClick={() => setShowShortcuts(!showShortcuts)} className="text-xs text-indigo-400 hover:text-indigo-300">快捷键</button>
                    {isSaving ? <span className="text-xs text-slate-400 animate-pulse">Saving...</span> : <span className="text-xs text-green-500/50">✔</span>}
                </div>
            </div>

            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div className="absolute top-14 right-4 z-40 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 w-64 text-slate-200 animate-fade-in">
                    <h4 className="font-bold text-sm mb-2 border-b border-slate-700 pb-2">快捷键</h4>
                    <ul className="space-y-1 text-xs text-slate-400">
                        <li>双击: 编辑节点</li>
                        <li>拖拽: 移动节点</li>
                        <li>Ctrl+Z: 撤销</li>
                        <li>Ctrl+Y: 重做</li>
                    </ul>
                </div>
            )}

            {/* Canvas */}
            <div ref={canvasRef} className={`flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative ${activeTheme.bgContainer} ${isPanning ? 'cursor-grabbing' : ''}`}
                onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp} onClick={() => setSelectedId(null)}>
                <div className="absolute inset-0 pointer-events-none opacity-20 canvas-bg" style={{
                    backgroundImage: `radial-gradient(${activeTheme.bgGridColor} 1px, transparent 1px)`,
                    backgroundSize: `${24 * viewState.scale}px ${24 * viewState.scale}px`,
                    backgroundPosition: `${viewState.x}px ${viewState.y}px`
                }}></div>
                <div style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`, transformOrigin: '0 0', transition: isPanning ? 'none' : 'transform 0.15s ease-out' }} className="absolute top-0 left-0 min-w-full min-h-full p-20">
                    <NodeRenderer
                        node={rootNode} selectedId={selectedId} onSelect={setSelectedId} onEdit={handleEditNode}
                        onAddChild={handleAddChild} onAiExpand={openAiModal} onDelete={handleDeleteNode} onNodeDrop={handleMoveNode}
                        onToggleExpand={handleToggleExpand}
                        depth={0} theme={activeTheme} layout={activeLayout}
                        editingNodeId={editingNodeId}
                    />
                </div>
            </div>

            {/* AI Modal */}
            {showAiModal && aiTargetNode && rootNode && (
                <MindMapAiModal
                    projectId={projectId}
                    node={aiTargetNode}
                    rootNode={rootNode} // Pass root for context reference
                    mapId={mapData.id}
                    availableMaps={availableMaps}
                    novelSettings={novelSettings}
                    onClose={() => setShowAiModal(false)}
                    onApply={handleAiApply}
                />
            )}
        </div>
    );
};
