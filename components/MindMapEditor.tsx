
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
    // AI 模型配置状态 (动态)
    const [aiModel, setAiModel] = useState('');
    const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);

    // AI 弹窗上下文菜单状态
    const aiTextareaRef = useRef<HTMLTextAreaElement>(null);
    const aiMirrorRef = useRef<HTMLDivElement>(null);
    const [aiMenuType, setAiMenuType] = useState<'map' | 'node' | null>(null);
    const [aiMenuPos, setAiMenuPos] = useState({ top: 0, left: 0 });
    const [aiFilterText, setAiFilterText] = useState('');
    const [aiActiveMapId, setAiActiveMapId] = useState<string | null>(null);
    const [aiNodeOptions, setAiNodeOptions] = useState<{id: string, label: string}[]>([]);
    
    // 初始化加载
    useEffect(() => {
        // 1. 解析导图数据
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

        // 2. 加载后端模型配置
        apiService.getAiModels().then(config => {
            setAvailableModels(config.models);
            setAiModel(config.defaultModel);
        });
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

    // === AI 逻辑增强 ===
    const openAiModal = (node: MindMapNode) => { setAiTargetNode(node); setAiPrompt(`基于“${node.label}”，请生成...`); setAiContent(''); setAiError(null); setShowAiModal(true); setAiMenuType(null); };
    
    // 1. AI 输入框光标追踪
    const updateAiCursorCoords = () => {
        if (!aiTextareaRef.current || !aiMirrorRef.current) return;
        const textarea = aiTextareaRef.current;
        const mirror = aiMirrorRef.current;

        mirror.style.width = `${textarea.offsetWidth}px`;
        const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
        mirror.innerHTML = textBeforeCursor.replace(/\n/g, '<br/>') + '<span id="ai-cursor">|</span>';
        
        const cursorSpan = mirror.querySelector('#ai-cursor') as HTMLElement;
        if (cursorSpan) {
            // 相对于父容器（modal-content）定位
            setAiMenuPos({
                top: cursorSpan.offsetTop + 24, 
                left: cursorSpan.offsetLeft
            });
        }
    };

    // 2. AI 输入处理 (支持 : 和 @)
    const handleAiInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursorPos = e.target.selectionStart;
        setAiPrompt(val);

        const charBefore = val[cursorPos - 1];
        
        // 触发导图选择
        if (charBefore === ':') {
            updateAiCursorCoords();
            setAiMenuType('map');
            setAiFilterText('');
            return;
        }

        // 触发节点选择（级联 或 当前导图）
        if (charBefore === '@') {
            const textBack = val.substring(0, cursorPos - 1);
            // 查找最近的一个 [参考导图:ID:Title]
            const mapRegex = /\[参考导图:([a-zA-Z0-9-]+):([^\]]+)\]$/;
            const match = textBack.match(mapRegex);
            
            updateAiCursorCoords();
            setAiMenuType('node');
            setAiFilterText('');

            if (match) {
                // 级联模式：引用外部导图的节点
                const mapId = match[1];
                setAiActiveMapId(mapId);
                fetchMapNodes(mapId); // 获取该导图的节点
            } else {
                // 本地模式：引用当前导图的节点
                setAiActiveMapId(mapData.id); // 使用当前导图ID
                // 从 rootNode 提取节点列表
                if (rootNode) {
                    const flatNodes = getAllNodesFlat(rootNode);
                    setAiNodeOptions(flatNodes.map(n => ({ id: n.id, label: n.label })));
                } else {
                    setAiNodeOptions([]);
                }
            }
            return;
        }

        if ([' ', '\n'].includes(charBefore)) {
            setAiMenuType(null);
        }
        if (aiMenuType) {
            setAiFilterText(prev => prev + charBefore);
        }
    };

    // 3. 获取引用导图的节点数据
    const fetchMapNodes = async (mapId: string) => {
        try {
            const map = await apiService.getMindMapDetail(projectId, mapId);
            if (map && map.data) {
                const root = JSON.parse(map.data).root;
                const flatNodes: {id: string, label: string}[] = [];
                const traverse = (n: MindMapNode) => {
                    flatNodes.push({ id: n.id, label: n.label });
                    if (n.children) n.children.forEach(traverse);
                };
                if (root) traverse(root);
                setAiNodeOptions(flatNodes);
            }
        } catch (e) {
            logger.error("Failed to load map nodes for AI context", e);
            setAiNodeOptions([]);
        }
    };

    // 4. 插入文本到输入框
    const insertAiText = (text: string, backspaceCount = 0) => {
        if (!aiTextareaRef.current) return;
        const el = aiTextareaRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const textBefore = aiPrompt.substring(0, start - backspaceCount);
        const textAfter = aiPrompt.substring(end);
        
        const newContent = textBefore + text + textAfter;
        setAiPrompt(newContent);
        setAiMenuType(null);
        
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start - backspaceCount + text.length, start - backspaceCount + text.length);
        }, 0);
    };

    // 5. 生成请求（包含上下文注入）
    const handleAiGenerate = async () => { 
        if (!aiTargetNode || !rootNode) return; 
        setIsGenerating(true); setAiContent(''); setAiError(null);
        
        try {
            // 解析引用，提取结构化数据
            const refRegex = /\[(参考导图|引用节点):([a-zA-Z0-9-]+):?([a-zA-Z0-9-]+)?:?([^\]]+)?\]/g;
            let match;
            const referencesData: string[] = [];
            
            // 复制 prompt 防止 regex 状态问题
            const promptText = aiPrompt;
            
            while ((match = refRegex.exec(promptText)) !== null) {
                const [fullTag, type, id1, id2, title] = match;
                
                if (type === '参考导图') {
                    // id1 = mapId
                    try {
                        const map = await apiService.getMindMapDetail(projectId, id1);
                        if (map && map.data) {
                             const root = JSON.parse(map.data).root;
                             // 注入整个导图结构
                             referencesData.push(`【参考导图结构：${map.title}】\n${serializeNodeTree(root)}`);
                        }
                    } catch(e) { logger.warn(`Failed to fetch ref map ${id1}`); }
                } else if (type === '引用节点') {
                    // id1 = mapId, id2 = nodeId
                    // 优化：如果是引用当前导图，直接使用内存中的 rootNode (最新状态)，避免 API 调用延迟和数据不一致
                    if (id1 === mapData.id && rootNode) {
                         const findNode = (n: MindMapNode): MindMapNode | null => {
                                if (n.id === id2) return n;
                                if (n.children) for (const c of n.children) { const f = findNode(c); if(f) return f; }
                                return null;
                            };
                            const target = findNode(rootNode);
                            if (target) {
                                // 注入该节点及其子树结构
                                referencesData.push(`【参考节点结构：${target.label} (来自当前导图)】\n${serializeNodeTree(target)}`);
                            }
                    } else {
                        // 引用的是外部导图
                        try {
                            const map = await apiService.getMindMapDetail(projectId, id1);
                            if (map && map.data) {
                                const root = JSON.parse(map.data).root;
                                const findNode = (n: MindMapNode): MindMapNode | null => {
                                    if (n.id === id2) return n;
                                    if (n.children) for (const c of n.children) { const f = findNode(c); if(f) return f; }
                                    return null;
                                };
                                const target = findNode(root);
                                if (target) {
                                    // 注入该节点及其子树结构
                                    referencesData.push(`【参考节点结构：${target.label} (来自 ${map.title})】\n${serializeNodeTree(target)}`);
                                }
                            }
                        } catch(e) { logger.warn(`Failed to fetch ref node ${id2}`); }
                    }
                }
            }

            // 合并上下文
            const finalReferences = referencesData.length > 0 ? referencesData.join('\n\n') : undefined;

            await apiService.generateStream(
                novelSettings || {} as any, 
                WorkflowStep.MIND_MAP_NODE, 
                aiTargetNode.label, 
                finalReferences, // 传入结构化数据作为上下文
                (chunk) => setAiContent(p => p + chunk), 
                promptText,
                aiModel // 传入选择的模型
            ); 
        } catch (e: any) { 
            setAiError(e.message); 
        } finally { 
            setIsGenerating(false); 
        }
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

            {/* AI Modal (Updated for Context Injection) */}
            {showAiModal && aiTargetNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm text-slate-200">
                    <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 p-4 relative animate-fade-in">
                        <h3 className="font-bold text-white mb-4">✨ AI 扩展: {aiTargetNode.label}</h3>
                        
                        {/* 模型选择与常用指令 */}
                        <div className="mb-4 flex gap-4">
                            <div className="w-1/3">
                                <label className="block text-xs text-slate-500 mb-1">选择模型</label>
                                <select 
                                    value={aiModel} 
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500"
                                >
                                    {availableModels.length > 0 ? (
                                        availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                    ) : (
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                                    )}
                                </select>
                            </div>
                            <div className="flex-1">
                                <PromptSelector type="normal" label="插入常用指令" onSelect={(val) => insertAiText(val)} />
                            </div>
                        </div>

                        {/* 镜像 Div 用于光标定位 */}
                        <div 
                            ref={aiMirrorRef}
                            className="absolute top-0 left-0 -z-50 opacity-0 whitespace-pre-wrap break-words pointer-events-none"
                            style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '0.875rem', padding: '0' }}
                        ></div>

                        <div className="relative">
                            <textarea 
                                ref={aiTextareaRef}
                                value={aiPrompt} 
                                onChange={handleAiInput} 
                                className="w-full h-32 bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white mb-2"
                                placeholder="输入指令..."
                            />

                            {/* 操作指引 */}
                            <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 mb-4">
                                <div className="space-x-3">
                                    <span>👉 输入 <span className="text-pink-400 font-bold">:</span> 引用导图</span>
                                    <span>👉 输入 <span className="text-green-400 font-bold">@</span> 引用节点</span>
                                </div>
                                <div>
                                    Shift + Enter 换行
                                </div>
                            </div>

                            {/* 智能引用菜单 */}
                            {aiMenuType && (
                                <div 
                                    className="absolute z-[60] bg-slate-800 border border-slate-600 rounded-lg shadow-xl w-64 max-h-60 overflow-y-auto animate-fade-in"
                                    style={{ top: aiMenuPos.top, left: aiMenuPos.left }}
                                >
                                    <div className="px-2 py-1 text-xs text-slate-500 border-b border-slate-700 bg-slate-900 sticky top-0">
                                        {aiMenuType === 'map' ? '引用导图 (输入筛选)' : '引用节点'}
                                    </div>
                                    
                                    {aiMenuType === 'map' && (
                                        <>
                                            {availableMaps.filter(m => m.title.includes(aiFilterText)).map(m => (
                                                <button key={m.id} onClick={() => insertAiText(`[参考导图:${m.id}:${m.title}]`, aiFilterText.length + 1)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-pink-600 hover:text-white truncate">
                                                    🧠 {m.title}
                                                </button>
                                            ))}
                                            {availableMaps.length === 0 && <div className="p-2 text-xs text-slate-500">无其他导图</div>}
                                        </>
                                    )}

                                    {aiMenuType === 'node' && (
                                        <>
                                            {aiNodeOptions.filter(n => n.label.includes(aiFilterText)).map(n => (
                                                <button key={n.id} onClick={() => insertAiText(`[引用节点:${aiActiveMapId}:${n.id}:${n.label}]`, aiFilterText.length + 1)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-green-600 hover:text-white truncate">
                                                    🏷️ {n.label}
                                                </button>
                                            ))}
                                            {aiNodeOptions.length === 0 && <div className="p-2 text-xs text-slate-500">加载中...</div>}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        
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
