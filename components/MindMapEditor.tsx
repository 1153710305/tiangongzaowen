
import React, { useState, useEffect, useRef } from 'react';
import { MindMap, MindMapNode, WorkflowStep, NovelSettings } from '../types';
import { apiService } from '../services/geminiService';
import { Button } from './Button';
import { logger } from '../services/loggerService';
import ReactMarkdown from 'react-markdown';
import { THEMES, LAYOUTS, LayoutType } from './mindmap/themes';
import { serializeNodeTree, deleteNodeFromTree, moveNodeInTree, updateNodeInTree, getAllNodesFlat, toggleNodeExpansion } from './mindmap/utils';
import { NodeRenderer } from './mindmap/NodeRenderer';
import { PromptSelector } from './PromptSelector';

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
    
    // AI 弹窗状态
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTargetNode, setAiTargetNode] = useState<MindMapNode | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiContent, setAiContent] = useState('');
    const [aiError, setAiError] = useState<string | null>(null);
    
    useEffect(() => {
        try {
            const parsed = JSON.parse(mapData.data);
            if (parsed.root) setRootNode(parsed.root);
            else setRootNode({ id: 'root', label: '核心创意', children: [] });
            
            // 加载新数据时清空历史记录
            setHistory([]);
            setFuture([]);
            
            // 尝试恢复保存的布局偏好 (如果未来支持保存 layout 到 data)
            // if (parsed.layout) setActiveLayout(parsed.layout);
        } catch (e) {
            setRootNode({ id: 'root', label: '核心创意', children: [] });
            setHistory([]);
            setFuture([]);
        }
        setTitle(mapData.title);
    }, [mapData]);

    // 监听 focusTargetId 变化，实现自动跳转到新节点
    useEffect(() => {
        if (focusTargetId && canvasRef.current) {
            let attempts = 0;
            const maxAttempts = 10; // 最多尝试10次 (约500ms)

            const tryFocus = () => {
                // 使用具体的 node-content-ID 来定位，确保中心对准的是文字胶囊而不是整个子树容器
                const nodeElement = document.getElementById(`node-content-${focusTargetId}`);
                
                if (nodeElement && canvasRef.current) {
                    const nodeRect = nodeElement.getBoundingClientRect();
                    const canvasRect = canvasRef.current.getBoundingClientRect();
                    
                    // 计算节点中心点相对于视口的绝对坐标
                    const nodeCenterX = nodeRect.left + nodeRect.width / 2;
                    const nodeCenterY = nodeRect.top + nodeRect.height / 2;
                    
                    // 计算画布容器中心点
                    const canvasCenterX = canvasRect.left + canvasRect.width / 2;
                    const canvasCenterY = canvasRect.top + canvasRect.height / 2;
                    
                    // 计算需要移动的距离 (画布中心 - 节点中心)
                    // 将此差值叠加到当前的 transform 坐标上
                    const deltaX = canvasCenterX - nodeCenterX;
                    const deltaY = canvasCenterY - nodeCenterY;
                    
                    setViewState(prev => ({
                        ...prev,
                        x: prev.x + deltaX,
                        y: prev.y + deltaY
                    }));
                    
                    // 聚焦后清除目标，并确保该节点被选中
                    setSelectedId(focusTargetId);
                    setFocusTargetId(null);
                } else {
                    // 如果 DOM 还没渲染出来，进行重试
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(tryFocus, 50);
                    } else {
                        // 超时放弃
                        setFocusTargetId(null);
                    }
                }
            };

            // 稍微延迟一点启动，给 React 渲染留出时间
            setTimeout(tryFocus, 50);
        }
    }, [focusTargetId]);

    // 统一的数据更新入口，自动处理历史记录和自动保存
    const updateMapState = (newRoot: MindMapNode) => {
        if (!rootNode) return;
        setHistory(prev => [...prev, rootNode]); // 保存当前状态到历史
        setFuture([]); // 清空未来状态 (一旦有新操作，重做链失效)
        setRootNode(newRoot);
        triggerAutoSave(newRoot, title);
    };

    const triggerAutoSave = async (newRoot: MindMapNode, currentTitle: string) => {
        setIsSaving(true);
        try {
            // 目前只保存 root，未来可以将 layout 也保存进 JSON
            const dataStr = JSON.stringify({ root: newRoot, layout: activeLayout });
            await onSave(mapData.id, currentTitle, dataStr);
        } catch (e) {
            logger.error("Auto save failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    // 撤销
    const handleUndo = () => {
        if (history.length === 0 || !rootNode) return;
        const previousState = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        
        setFuture(prev => [rootNode, ...prev]); // 当前状态存入 Future
        setHistory(newHistory);
        setRootNode(previousState);
        setEditingNodeId(null); // 撤销时退出编辑模式
        triggerAutoSave(previousState, title); // 自动保存撤销后的状态
    };

    // 重做
    const handleRedo = () => {
        if (future.length === 0 || !rootNode) return;
        const nextState = future[0];
        const newFuture = future.slice(1);

        setHistory(prev => [...prev, rootNode]); // 当前状态存入 History
        setFuture(newFuture);
        setRootNode(nextState);
        setEditingNodeId(null);
        triggerAutoSave(nextState, title); // 自动保存重做后的状态
    };

    // 快捷键监听
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // 如果正在输入文字，不触发快捷键 (除非是特定的全局快捷键，这里简单处理)
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) handleRedo();
                    else handleUndo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    handleRedo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, future, rootNode, title]); // 依赖项确保状态最新

    const handleTitleBlur = () => rootNode && title !== mapData.title && triggerAutoSave(rootNode, title);

    // === 节点操作逻辑 ===
    const handleAddChild = (parentId: string) => {
        if (!rootNode) return;
        const newChildId = crypto.randomUUID();
        const newChild: MindMapNode = { id: newChildId, label: '新节点', children: [] };
        
        // 1. 添加子节点
        let found = false;
        const addNodeRecursive = (node: MindMapNode): MindMapNode => {
            if (node.id === parentId) { 
                found = true; 
                // 确保父节点是展开状态，否则看不到新节点
                return { ...node, isExpanded: true, children: [...(node.children || []), newChild] }; 
            }
            if (node.children) return { ...node, children: node.children.map(addNodeRecursive) };
            return node;
        };
        const newRoot = addNodeRecursive(rootNode);
        
        if (found) { 
            // 使用 updateMapState 替代直接 setRootNode
            updateMapState(newRoot);
            // 2. 设置自动聚焦和自动编辑目标
            setFocusTargetId(newChildId);
            setEditingNodeId(newChildId);
        }
    };

    const handleEditNode = (id: string, newLabel: string) => {
        if (!rootNode) return;
        // 如果内容没变，不生成历史记录
        const targetNode = getAllNodesFlat(rootNode).find(n => n.id === id);
        if (targetNode && targetNode.label === newLabel) return;

        const newRoot = updateNodeInTree(rootNode, id, (n) => ({ ...n, label: newLabel }));
        updateMapState(newRoot);
        // 清除自动编辑状态，防止后续意外触发
        if (editingNodeId === id) setEditingNodeId(null);
    };

    const handleDeleteNode = (id: string) => {
        if (!rootNode) return;
        if (id === rootNode.id) return alert("根节点不能删除");
        try { 
            const newRoot = deleteNodeFromTree(rootNode, id); 
            updateMapState(newRoot);
            if (selectedId === id) setSelectedId(null); 
        } catch (e) { alert("删除失败"); }
    };

    const handleMoveNode = (draggedId: string, targetId: string) => {
        if (!rootNode) return;
        const newRoot = moveNodeInTree(rootNode, draggedId, targetId);
        if (newRoot) { 
            updateMapState(newRoot);
        }
    };

    const handleToggleExpand = (id: string) => {
        if (!rootNode) return;
        const newRoot = toggleNodeExpansion(rootNode, id);
        // 展开/折叠也记录历史，这样用户可以撤销误触的折叠
        updateMapState(newRoot);
    };

    // === 画布交互 (保持不变) ===
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.mindmap-node') || target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        setIsPanning(true); setStartPan({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    };
    const handleCanvasMouseMove = (e: React.MouseEvent) => { if (isPanning) setViewState(prev => ({ ...prev, x: e.clientX - startPan.x, y: e.clientY - startPan.y })); };
    const handleCanvasMouseUp = () => setIsPanning(false);
    const handleZoomIn = () => setViewState(s => ({ ...s, scale: Math.min(s.scale * 1.2, 3) }));
    const handleZoomOut = () => setViewState(s => ({ ...s, scale: Math.max(s.scale / 1.2, 0.2) }));
    const handleResetView = () => setViewState({ x: 0, y: 0, scale: 1 });

    // === AI 逻辑 (保持不变) ===
    const openAiModal = (node: MindMapNode) => { setAiTargetNode(node); setAiPrompt(`基于“${node.label}”，请生成...`); setAiContent(''); setAiError(null); setShowAiModal(true); };
    const handleAiGenerate = async () => { 
        if (!aiTargetNode || !rootNode) return; setIsGenerating(true); setAiContent(''); setAiError(null);
        try { await apiService.generateStream(novelSettings || {} as any, WorkflowStep.MIND_MAP_NODE, aiTargetNode.label, '', (chunk) => setAiContent(p => p + chunk), aiPrompt); } catch (e: any) { setAiError(e.message); } finally { setIsGenerating(false); }
    };
    const applyAiResult = () => { 
        if (!aiTargetNode || !rootNode || !aiContent) return;
        const lines = aiContent.split('\n').filter(l => l.trim().length > 0);
        const newChildren: MindMapNode[] = [];
        // ... simple parsing logic ...
        const stack: { node: MindMapNode, level: number }[] = [];
        for (const line of lines) {
            const match = line.match(/^(\s*)[-*]\s+(.+)/);
            if (!match) continue;
            const newNode: MindMapNode = { id: crypto.randomUUID(), label: match[2], children: [] };
            const indent = match[1].length;
            while (stack.length > 0 && stack[stack.length - 1].level >= indent) stack.pop();
            if (stack.length === 0) newChildren.push(newNode);
            else stack[stack.length - 1].node.children.push(newNode);
            stack.push({ node: newNode, level: indent });
        }
        if (newChildren.length > 0) {
            const newRoot = updateNodeInTree(rootNode, aiTargetNode.id, (n) => ({ 
                ...n, 
                isExpanded: true, // AI 生成后自动展开
                children: [...(n.children || []), ...newChildren] 
            }));
            updateMapState(newRoot);
            setShowAiModal(false);
        }
    };

    // === Render ===
    if (!rootNode) return <div className="text-white p-4">Loading...</div>;

    return (
        <div className={`h-full flex flex-col ${activeTheme.bgContainer} relative`}>
            {/* Top Toolbar */}
            <div className="h-12 bg-[#2d2d2d] border-b border-black/50 flex items-center px-4 justify-between shrink-0 z-30 shadow-md">
                
                {/* Left: Title & Controls */}
                <div className="flex items-center gap-3">
                     <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur} className="bg-transparent border-none text-slate-200 font-bold outline-none w-32 md:w-48 text-sm truncate focus:w-64 transition-all" />
                    
                    {/* 样式控制组 */}
                    <div className="flex items-center gap-2 border-l border-slate-600 pl-3">
                        {/* 结构切换 */}
                        <div className="relative group">
                            <select value={activeLayout} onChange={(e) => setActiveLayout(e.target.value as LayoutType)} 
                                className="bg-[#1e1e1e] text-slate-300 text-xs border border-slate-600 rounded px-2 py-1 outline-none w-28 appearance-none cursor-pointer hover:border-slate-400">
                                {LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        {/* 主题切换 */}
                         <div className="relative group">
                            <select value={activeThemeId} onChange={(e) => setActiveThemeId(e.target.value)} 
                                className="bg-[#1e1e1e] text-slate-300 text-xs border border-slate-600 rounded px-2 py-1 outline-none w-28 appearance-none cursor-pointer hover:border-slate-400">
                                {Object.values(THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                             <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: Zoom Controls (Condensed) */}
                <div className="flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-slate-700">
                    <button onClick={handleResetView} className="px-2 py-0.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="复位">⌖</button>
                    <div className="w-px h-3 bg-slate-700 mx-1"></div>
                    <button onClick={handleZoomOut} className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300">-</button>
                    <span className="text-[10px] text-slate-300 w-8 text-center">{Math.round(viewState.scale * 100)}%</span>
                    <button onClick={handleZoomIn} className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300">+</button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Undo / Redo Buttons */}
                    <div className="flex items-center bg-[#1e1e1e] rounded-lg border border-slate-700 p-0.5">
                        <button 
                            onClick={handleUndo} 
                            disabled={history.length === 0}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                            title="撤销 (Ctrl+Z)"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                        </button>
                        <div className="w-px h-4 bg-slate-700"></div>
                        <button 
                            onClick={handleRedo} 
                            disabled={future.length === 0}
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

            {/* Shortcuts Modal (Existing code...) */}
            {showShortcuts && (
                <div className="absolute top-14 right-4 z-40 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 w-64 text-slate-200 animate-fade-in">
                   <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700"><h4 className="font-bold text-sm">快捷键</h4><button onClick={()=>setShowShortcuts(false)}>×</button></div>
                   <ul className="space-y-1 text-xs text-slate-400">
                       <li>双击: 编辑节点</li>
                       <li>Enter: 确认编辑</li>
                       <li>拖拽: 移动节点</li>
                       <li>Ctrl+Z: 撤销操作</li>
                       <li>Ctrl+Y: 重做操作</li>
                   </ul>
                </div>
            )}

            {/* Canvas */}
            <div 
                ref={canvasRef}
                className={`flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative ${activeTheme.bgContainer} ${isPanning ? 'cursor-grabbing' : ''}`}
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

            {/* AI Modal (Updated for Prompt Selection) */}
            {showAiModal && aiTargetNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm text-slate-200">
                    <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 p-4">
                        <h3 className="font-bold text-white mb-4">✨ AI 扩展: {aiTargetNode.label}</h3>
                        
                        <div className="mb-4 space-y-2">
                             <PromptSelector type="normal" label="插入常用指令" onSelect={(val) => setAiPrompt(prev => prev + '\n' + val)} />
                        </div>

                        <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full h-24 bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white mb-4" />
                        
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowAiModal(false)}>取消</Button>
                            <Button onClick={handleAiGenerate} isLoading={isGenerating}>生成</Button>
                            <Button onClick={applyAiResult} disabled={!aiContent}>应用</Button>
                        </div>
                        {aiContent && <div className="mt-4 bg-black/30 p-2 rounded max-h-40 overflow-y-auto"><ReactMarkdown>{aiContent}</ReactMarkdown></div>}
                    </div>
                </div>
            )}
        </div>
    );
};
