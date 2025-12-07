
import React, { useState, useEffect, useRef } from 'react';
import { MindMap, MindMapNode, WorkflowStep, NovelSettings } from '../types';
import { apiService } from '../services/geminiService';
import { Button } from './Button';
import { logger } from '../services/loggerService';
import ReactMarkdown from 'react-markdown';
import { THEMES } from './mindmap/themes';
import { serializeNodeTree, deleteNodeFromTree, moveNodeInTree, updateNodeInTree, getAllNodesFlat } from './mindmap/utils';
import { NodeRenderer } from './mindmap/NodeRenderer';

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
    
    // 视图状态 (Pan & Zoom)
    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // 主题状态
    const [activeThemeId, setActiveThemeId] = useState('dark');
    const activeTheme = THEMES[activeThemeId] || THEMES.dark;
    
    // AI 弹窗状态
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTargetNode, setAiTargetNode] = useState<MindMapNode | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiContent, setAiContent] = useState('');
    const [aiError, setAiError] = useState<string | null>(null);
    
    // 引用系统状态 (此处保留状态定义，但为简化代码展示，部分引用逻辑在此组件内实现或简化)
    const [showMentionList, setShowMentionList] = useState<'node' | 'map' | 'remote_node' | null>(null); 
    const [mentionFilter, setMentionFilter] = useState('');
    const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });
    const [remoteNodeOptions, setRemoteNodeOptions] = useState<{id: string, label: string}[]>([]); 

    useEffect(() => {
        try {
            const parsed = JSON.parse(mapData.data);
            if (parsed.root) setRootNode(parsed.root);
            else setRootNode({ id: 'root', label: '核心创意', children: [] });
        } catch (e) {
            setRootNode({ id: 'root', label: '核心创意', children: [] });
        }
        setTitle(mapData.title);
    }, [mapData]);

    const triggerAutoSave = async (newRoot: MindMapNode, currentTitle: string) => {
        setIsSaving(true);
        try {
            const dataStr = JSON.stringify({ root: newRoot });
            await onSave(mapData.id, currentTitle, dataStr);
        } catch (e) {
            logger.error("Auto save failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleManualSave = () => rootNode && triggerAutoSave(rootNode, title);
    const handleTitleBlur = () => rootNode && title !== mapData.title && triggerAutoSave(rootNode, title);

    // === 节点操作逻辑 ===
    const handleAddChild = (parentId: string) => {
        if (!rootNode) return;
        const newChild: MindMapNode = { id: crypto.randomUUID(), label: '新节点', children: [] };
        
        let found = false;
        const addNodeRecursive = (node: MindMapNode): MindMapNode => {
            if (node.id === parentId) {
                found = true;
                return { ...node, children: [...(node.children || []), newChild] };
            }
            if (node.children) return { ...node, children: node.children.map(addNodeRecursive) };
            return node;
        };
        const newRoot = addNodeRecursive(rootNode);
        if (found) { setRootNode(newRoot); triggerAutoSave(newRoot, title); }
    };

    const handleEditNode = (id: string, newLabel: string) => {
        if (!rootNode) return;
        const newRoot = updateNodeInTree(rootNode, id, (n) => ({ ...n, label: newLabel }));
        setRootNode(newRoot);
        triggerAutoSave(newRoot, title);
    };

    const handleDeleteNode = (id: string) => {
        if (!rootNode) return;
        if (id === rootNode.id) return alert("根节点不能删除");
        try {
            const newRoot = deleteNodeFromTree(rootNode, id);
            setRootNode(newRoot);
            if (selectedId === id) setSelectedId(null);
            triggerAutoSave(newRoot, title);
        } catch (e) { alert("删除节点失败"); }
    };

    const handleMoveNode = (draggedId: string, targetId: string) => {
        if (!rootNode) return;
        const newRoot = moveNodeInTree(rootNode, draggedId, targetId);
        if (newRoot) { setRootNode(newRoot); triggerAutoSave(newRoot, title); }
    };

    // === 画布交互 (Pan & Buttons Zoom) ===
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // 如果点击的是节点（包括编辑时的输入框）、按钮或输入组件，则不触发拖拽
        if (target.closest('.mindmap-node') || target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }
        setIsPanning(true);
        setStartPan({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (isPanning) setViewState(prev => ({ ...prev, x: e.clientX - startPan.x, y: e.clientY - startPan.y }));
    };
    const handleCanvasMouseUp = () => setIsPanning(false);

    // 缩放控制函数
    const handleZoomIn = () => setViewState(s => ({ ...s, scale: Math.min(s.scale * 1.2, 3) }));
    const handleZoomOut = () => setViewState(s => ({ ...s, scale: Math.max(s.scale / 1.2, 0.2) }));
    const handleResetView = () => setViewState({ x: 0, y: 0, scale: 1 });

    // === AI 逻辑 ===
    const openAiModal = (node: MindMapNode) => {
        setAiTargetNode(node); setAiPrompt(`基于“${node.label}”，请生成...`);
        setAiContent(''); setAiError(null); setShowAiModal(true);
    };

    const handleAiGenerate = async () => {
        if (!aiTargetNode || !rootNode) return;
        setIsGenerating(true); setAiContent(''); setAiError(null);
        try {
            const references: string[] = [];
            // [Mock Reference Logic]
            references.push(`完整上下文已通过API注入`); 
            
            await apiService.generateStream(
                novelSettings || {} as any, WorkflowStep.MIND_MAP_NODE, aiTargetNode.label, references.join('\n'), 
                (chunk) => setAiContent(prev => prev + chunk), aiPrompt 
            );
        } catch (e: any) { setAiError(e.message); } finally { setIsGenerating(false); }
    };

    const applyAiResult = () => {
        if (!aiTargetNode || !rootNode || !aiContent) return;
        const lines = aiContent.split('\n').filter(l => l.trim().length > 0);
        const newChildren: MindMapNode[] = [];
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
            const newRoot = updateNodeInTree(rootNode, aiTargetNode.id, (n) => ({ ...n, children: [...(n.children || []), ...newChildren] }));
            setRootNode(newRoot);
            setShowAiModal(false);
            triggerAutoSave(newRoot, title);
        } else { alert("解析失败，请检查AI格式"); }
    };

    // === Render ===
    if (!rootNode) return <div className="text-white p-4">Loading...</div>;

    return (
        <div className={`h-full flex flex-col ${activeTheme.bgContainer} relative`}>
            {/* Top Toolbar */}
            <div className="h-12 bg-[#2d2d2d] border-b border-black/50 flex items-center px-4 justify-between shrink-0 z-30 shadow-md">
                
                {/* Left: Title & Theme */}
                <div className="flex items-center gap-4">
                     <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur} className="bg-transparent border-none text-slate-200 font-bold outline-none w-48 text-sm truncate focus:w-64 transition-all" />
                    <div className="flex items-center gap-2 border-l border-slate-600 pl-4">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
                        <select value={activeThemeId} onChange={(e) => setActiveThemeId(e.target.value)} className="bg-[#1e1e1e] text-slate-300 text-xs border border-slate-600 rounded px-2 py-1 outline-none">
                            {Object.values(THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Center: Controls */}
                <div className="flex items-center gap-2 bg-[#1e1e1e] p-1 rounded-lg border border-slate-700">
                    <Button size="sm" variant="ghost" onClick={handleResetView} className="text-xs h-6 px-2 hover:bg-slate-700" title="回到视图中心">
                        ⌖ 回到根节点
                    </Button>
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 px-2 select-none">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"></path></svg>
                        点击左键拖拽
                    </div>
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    <button onClick={handleZoomOut} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300">-</button>
                    <span className="text-xs text-slate-300 w-10 text-center select-none">{Math.round(viewState.scale * 100)}%</span>
                    <button onClick={handleZoomIn} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300">+</button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowShortcuts(!showShortcuts)} className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                        查看快捷键
                    </button>
                    <div className="w-px h-4 bg-slate-700"></div>
                    {isSaving ? <span className="text-xs text-slate-400 animate-pulse">保存中...</span> : <span className="text-xs text-green-500/50">已保存</span>}
                </div>
            </div>

            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div className="absolute top-14 right-4 z-40 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 w-64 text-slate-200 animate-fade-in">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
                        <h4 className="font-bold text-sm">⌨️ 快捷键指南</h4>
                        <button onClick={() => setShowShortcuts(false)} className="text-slate-400 hover:text-white">×</button>
                    </div>
                    <ul className="space-y-2 text-xs">
                        <li className="flex justify-between"><span className="text-slate-400">双击节点</span> <span>编辑内容</span></li>
                        <li className="flex justify-between"><span className="text-slate-400">Enter</span> <span>保存编辑</span></li>
                        <li className="flex justify-between"><span className="text-slate-400">Shift + Enter</span> <span>编辑换行</span></li>
                        <li className="flex justify-between"><span className="text-slate-400">拖拽节点</span> <span>移动层级</span></li>
                        <li className="flex justify-between"><span className="text-slate-400">悬停节点</span> <span>显示菜单</span></li>
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
                    <NodeRenderer node={rootNode} selectedId={selectedId} onSelect={setSelectedId} onEdit={handleEditNode}
                        onAddChild={handleAddChild} onAiExpand={openAiModal} onDelete={handleDeleteNode} onNodeDrop={handleMoveNode} depth={0} theme={activeTheme} />
                </div>
            </div>

            {/* AI Modal */}
            {showAiModal && aiTargetNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm text-slate-200">
                    <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 p-4">
                        <h3 className="font-bold text-white mb-4">✨ AI 节点扩展: {aiTargetNode.label}</h3>
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
