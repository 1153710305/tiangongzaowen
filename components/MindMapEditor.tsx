
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MindMap, MindMapNode, WorkflowStep, NovelSettings } from '../types';
import { apiService } from '../services/geminiService';
import { Button } from './Button';
import { logger } from '../services/loggerService';
import ReactMarkdown from 'react-markdown';

interface Props {
    projectId: string;
    mapData: MindMap;
    onSave: (mapId: string, title: string, dataStr: string) => Promise<void>;
    novelSettings?: NovelSettings;
    availableMaps?: { id: string, title: string }[]; // 可用的其他思维导图，用于 : 引用
}

// === 主题定义 ===
interface ThemeConfig {
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

const THEMES: Record<string, ThemeConfig> = {
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
    }
};

// 辅助函数：递归序列化节点及其所有子节点为 Markdown 列表字符串
const serializeNodeTree = (node: MindMapNode, depth: number = 0): string => {
    const indent = '  '.repeat(depth);
    let result = `${indent}- ${node.label}`;
    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            result += '\n' + serializeNodeTree(child, depth + 1);
        }
    }
    return result;
};

// 辅助函数：从树中递归删除指定 ID 的节点
const deleteNodeFromTree = (root: MindMapNode, targetId: string): MindMapNode => {
    if (!root || !root.children) return root;
    const newChildren = root.children.filter(c => c.id !== targetId);
    const finalChildren = newChildren.map(c => deleteNodeFromTree(c, targetId));
    return { ...root, children: finalChildren };
};

// 辅助函数：查找节点是否存在于子树中 (用于防环检测)
const isDescendant = (parent: MindMapNode, targetId: string): boolean => {
    if (parent.id === targetId) return true;
    if (!parent.children) return false;
    return parent.children.some(child => isDescendant(child, targetId));
};

// 辅助函数：移动节点
const moveNodeInTree = (root: MindMapNode, draggedId: string, targetId: string): MindMapNode | null => {
    // 0. 基本检查
    if (draggedId === targetId) return root; // 不能移给自己
    if (draggedId === root.id) return root; // 根节点不能移动

    // 1. 查找被拖拽的节点对象
    let draggedNode: MindMapNode | null = null;
    const findDragged = (n: MindMapNode) => {
        if (n.id === draggedId) draggedNode = n;
        n.children?.forEach(findDragged);
    };
    findDragged(root);
    if (!draggedNode) return root; // 未找到

    // 2. 防环检测：目标节点不能是被拖拽节点的后代
    if (isDescendant(draggedNode, targetId)) {
        alert("无法将节点移动到其子节点下");
        return null;
    }

    // 3. 第一步：从原位置删除 (创建一个不包含 draggedNode 的新树)
    const rootWithoutDragged = deleteNodeFromTree(root, draggedId);

    // 4. 第二步：添加到新位置
    const addChildToTarget = (n: MindMapNode): MindMapNode => {
        if (n.id === targetId) {
            return { ...n, children: [...(n.children || []), draggedNode!] };
        }
        return { ...n, children: (n.children || []).map(addChildToTarget) };
    };

    return addChildToTarget(rootWithoutDragged);
};

// 递归渲染节点组件 (Horizontal Tree Layout)
const NodeRenderer: React.FC<{
    node: MindMapNode;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onEdit: (id: string, newLabel: string) => void;
    onAddChild: (parentId: string) => void;
    onAiExpand: (node: MindMapNode) => void;
    onDelete: (id: string) => void;
    onNodeDrop: (draggedId: string, targetId: string) => void; // 新增：节点移动回调
    depth: number;
    theme: ThemeConfig;
}> = ({ node, selectedId, onSelect, onEdit, onAddChild, onAiExpand, onDelete, onNodeDrop, depth, theme }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(node.label);
    const [isDragOver, setIsDragOver] = useState(false); // 拖拽悬停状态
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editValue.trim() !== node.label) {
            onEdit(node.id, editValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleBlur();
    };

    // === Drag & Drop Handlers ===
    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        if (depth === 0) { // 根节点不可拖动
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('application/react-mindmap-node', node.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // 允许 Drop
        e.stopPropagation();
        if (!isDragOver) setIsDragOver(true);
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('application/react-mindmap-node');
        if (draggedId && draggedId !== node.id) {
            onNodeDrop(draggedId, node.id);
        }
    };

    const isSelected = selectedId === node.id;
    const isRoot = depth === 0;
    const hasChildren = node.children && node.children.length > 0;

    // 样式计算
    const baseClasses = "relative transition-all duration-200 cursor-pointer flex items-center justify-center";
    
    // 递进的节点样式
    let nodeStyleClasses = "";
    if (isRoot) {
        nodeStyleClasses = `${theme.node.root} rounded-full px-8 py-4 text-xl font-bold min-w-[150px] z-20`;
    } else {
        // 普通节点
        nodeStyleClasses = `
            ${isDragOver ? theme.node.dragTarget : (isSelected ? theme.node.selected : theme.node.base)} 
            ${depth === 1 ? 'px-5 py-2.5 text-lg font-medium rounded-xl border-2' : 'px-4 py-2 text-sm rounded-lg border'}
            z-10 hover:scale-105
        `;
    }

    // 递进的线条宽度 (Tailwind classes)
    const borderClass = depth === 0 ? 'border-[3px]' : (depth === 1 ? 'border-2' : 'border');
    
    // 连接线颜色
    const lineColor = theme.lineColor;

    return (
        <div className="flex items-center">
            
            {/* 节点主体 */}
            <div className="flex flex-col justify-center relative group">
                {/* 节点内容容器 */}
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                    onDoubleClick={handleDoubleClick}
                    draggable={!isRoot && !isEditing} // 根节点和编辑模式下不可拖拽
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`${baseClasses} ${nodeStyleClasses}`}
                >
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className={`bg-transparent border-none outline-none text-center min-w-[50px] ${theme.node.input}`}
                            style={{ maxWidth: '300px' }}
                            // 阻止事件冒泡，防止触发拖拽
                            onMouseDown={e => e.stopPropagation()} 
                        />
                    ) : (
                        <div className={`break-words max-w-[300px] ${isSelected || isRoot ? 'text-white' : theme.node.text}`}>
                            {node.label}
                        </div>
                    )}

                    {/* 操作菜单 (悬浮或选中) */}
                    {(isSelected) && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-900 border border-slate-600 rounded-lg p-1 shadow-xl z-50 animate-fade-in whitespace-nowrap">
                            <button 
                                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
                                className="relative z-50 p-1.5 hover:bg-slate-700 rounded text-green-400 transition-colors" title="添加子节点"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                            </button>
                            <button 
                                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                onClick={(e) => { e.stopPropagation(); onAiExpand(node); }} 
                                className="relative z-50 p-1.5 hover:bg-slate-700 rounded text-pink-400 transition-colors" title="AI 扩展"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </button>
                            {!isRoot && (
                                <button 
                                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        onDelete(node.id);
                                    }} 
                                    className="relative z-50 p-1.5 hover:bg-slate-700 rounded text-red-400 transition-colors" title="删除节点"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 子节点区域 */}
            {hasChildren && (
                <div className="flex items-center">
                    {/* 父节点发出的短横线 (Connector) */}
                    <div className={`w-12 h-px ${lineColor} ${borderClass.replace('border', 'border-t')}`}></div>
                    
                    {/* 子节点列表垂直容器 */}
                    <div className="flex flex-col justify-center">
                        {node.children.map((child, index) => {
                            const isFirst = index === 0;
                            const isLast = index === node.children!.length - 1;
                            
                            return (
                                <div key={child.id} className="flex items-center relative pl-8">
                                    {/* 
                                      直角连线逻辑
                                    */}
                                    <div className="absolute left-0 top-0 bottom-0 w-8">
                                        {/* 1. 垂直脊柱 (Vertical Spine) */}
                                        {!isFirst && (
                                            <div className={`absolute left-0 top-0 w-px h-[50%] ${lineColor} ${borderClass.replace('border', 'border-l')}`}></div>
                                        )}
                                        {!isLast && (
                                            <div className={`absolute left-0 bottom-0 w-px h-[50%] ${lineColor} ${borderClass.replace('border', 'border-l')}`}></div>
                                        )}
                                        
                                        {/* 2. 水平分支 (Horizontal Branch) */}
                                        <div className={`absolute left-0 top-1/2 w-full h-px ${lineColor} ${borderClass.replace('border', 'border-t')}`}></div>
                                    </div>

                                    <div className="py-2"> {/* 垂直间距 */}
                                        <NodeRenderer
                                            node={child}
                                            selectedId={selectedId}
                                            onSelect={onSelect}
                                            onEdit={onEdit}
                                            onAddChild={onAddChild}
                                            onAiExpand={onAiExpand}
                                            onDelete={onDelete}
                                            onNodeDrop={onNodeDrop}
                                            depth={depth + 1}
                                            theme={theme}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

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
    
    // 引用系统状态
    const [showMentionList, setShowMentionList] = useState<'node' | 'map' | 'remote_node' | null>(null); 
    const [mentionFilter, setMentionFilter] = useState('');
    const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });
    const [remoteNodeOptions, setRemoteNodeOptions] = useState<{id: string, label: string}[]>([]); 
    const [remoteMapLoading, setRemoteMapLoading] = useState(false); 

    const promptInputRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null); 
    const remoteMapCache = useRef<Map<string, MindMapNode[]>>(new Map()); 

    // 初始化
    useEffect(() => {
        try {
            const parsed = JSON.parse(mapData.data);
            if (parsed.root) {
                setRootNode(parsed.root);
            } else {
                setRootNode({ id: 'root', label: '核心创意', children: [] });
            }
        } catch (e) {
            setRootNode({ id: 'root', label: '核心创意', children: [] });
        }
        setTitle(mapData.title);
    }, [mapData]);

    // Utils
    const updateNode = (node: MindMapNode, id: string, updater: (n: MindMapNode) => MindMapNode): MindMapNode => {
        if (node.id === id) return updater(node);
        return { ...node, children: (node.children || []).map(c => updateNode(c, id, updater)) };
    };

    const getAllNodesFlat = (node: MindMapNode): MindMapNode[] => {
        let list = [node];
        if (node.children) {
            for (const child of node.children) {
                list = [...list, ...getAllNodesFlat(child)];
            }
        }
        return list;
    };

    // 自动保存
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

    const handleManualSave = () => {
        if (!rootNode) return;
        triggerAutoSave(rootNode, title);
    };

    const handleTitleBlur = () => {
        if (!rootNode) return;
        if (title !== mapData.title) {
            triggerAutoSave(rootNode, title);
        }
    };

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
            if (node.children) {
                return { ...node, children: node.children.map(addNodeRecursive) };
            }
            return node;
        };
        
        const newRoot = addNodeRecursive(rootNode);
        if (found) {
            setRootNode(newRoot);
            triggerAutoSave(newRoot, title);
        }
    };

    const handleEditNode = (id: string, newLabel: string) => {
        if (!rootNode) return;
        const newRoot = updateNode(rootNode, id, (n) => ({ ...n, label: newLabel }));
        setRootNode(newRoot);
        triggerAutoSave(newRoot, title);
    };

    const handleDeleteNode = (id: string) => {
        if (!rootNode) return;
        if (id === rootNode.id) {
            alert("根节点不能删除");
            return;
        }
        try {
            const newRoot = deleteNodeFromTree(rootNode, id);
            setRootNode(newRoot);
            if (selectedId === id) setSelectedId(null);
            triggerAutoSave(newRoot, title);
        } catch (e) {
            alert("删除节点失败");
        }
    };

    // === 节点拖拽移动逻辑 ===
    const handleMoveNode = (draggedId: string, targetId: string) => {
        if (!rootNode) return;
        logger.info(`Trying to move node ${draggedId} to ${targetId}`);
        const newRoot = moveNodeInTree(rootNode, draggedId, targetId);
        if (newRoot) {
            setRootNode(newRoot);
            triggerAutoSave(newRoot, title);
        }
    };

    // === 画布交互逻辑 (Pan & Zoom) ===
    const handleWheel = (e: React.WheelEvent) => {
        // 阻止默认滚动行为，改为缩放
        // e.preventDefault(); // React synthetic events cant prevent default passive listeners easily sometimes
        if (e.ctrlKey || e.metaKey || true) { // 默认所有滚轮都为缩放，除非需要滚动条
             const delta = e.deltaY > 0 ? 0.9 : 1.1;
             setViewState(prev => ({
                 ...prev,
                 scale: Math.min(Math.max(0.1, prev.scale * delta), 5) // Limit scale 0.1x to 5x
             }));
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // 只有点击背景时才触发拖拽
        if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
            setIsPanning(true);
            setStartPan({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setViewState(prev => ({
                ...prev,
                x: e.clientX - startPan.x,
                y: e.clientY - startPan.y
            }));
        }
    };

    const handleCanvasMouseUp = () => {
        setIsPanning(false);
    };

    const zoomIn = () => setViewState(s => ({ ...s, scale: Math.min(s.scale * 1.2, 5) }));
    const zoomOut = () => setViewState(s => ({ ...s, scale: Math.max(s.scale / 1.2, 0.1) }));
    const resetView = () => setViewState({ x: 0, y: 0, scale: 1 });

    // === AI & Mention Logic (保留原有) ===
    const openAiModal = (node: MindMapNode) => {
        setAiTargetNode(node);
        setAiPrompt(`基于“${node.label}”，请生成...`);
        setAiContent('');
        setAiError(null);
        setShowAiModal(true);
    };

    const updateCursorPosition = (val: string, selectionEnd: number) => {
        if (!mirrorRef.current || !promptInputRef.current) return;
        const textBeforeCursor = val.substring(0, selectionEnd);
        const textAfterCursor = val.substring(selectionEnd);
        mirrorRef.current.textContent = textBeforeCursor;
        const span = document.createElement('span');
        span.textContent = '|';
        mirrorRef.current.appendChild(span);
        mirrorRef.current.appendChild(document.createTextNode(textAfterCursor));
        const rect = span.getBoundingClientRect();
        const wrapperRect = promptInputRef.current.parentElement?.getBoundingClientRect();
        if (wrapperRect) {
            const top = rect.top - wrapperRect.top + 24; 
            const left = rect.left - wrapperRect.left;
            setCursorPos({ top, left });
        }
    };

    const fetchRemoteMapNodes = async (mapTitle: string) => {
        if (remoteMapCache.current.has(mapTitle)) {
            setRemoteNodeOptions(remoteMapCache.current.get(mapTitle)!);
            return;
        }
        const targetMap = availableMaps.find(m => m.title === mapTitle);
        if (!targetMap) return;
        setRemoteMapLoading(true);
        try {
            const detail = await apiService.getMindMapDetail(projectId, targetMap.id);
            const parsed = JSON.parse(detail.data);
            if (parsed.root) {
                const nodes = getAllNodesFlat(parsed.root);
                remoteMapCache.current.set(mapTitle, nodes);
                setRemoteNodeOptions(nodes);
            }
        } catch (e) {
            logger.error(`Failed to load remote map: ${mapTitle}`);
        } finally {
            setRemoteMapLoading(false);
        }
    };

    const handlePromptInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const selectionEnd = e.target.selectionEnd;
        setAiPrompt(val);
        updateCursorPosition(val, selectionEnd);

        const textBeforeCursor = val.substring(0, selectionEnd);
        const remoteContextMatch = textBeforeCursor.match(/\[参考导图:([^\]]+)\]\s*@([^@\s:\[\]]*)$/);
        const mentionMatch = textBeforeCursor.match(/@([^@\s:\[\]]*)$/);
        const mapMatch = textBeforeCursor.match(/:([^@\s:\[\]]*)$/);

        if (remoteContextMatch) {
            const mapName = remoteContextMatch[1];
            const filter = remoteContextMatch[2];
            setShowMentionList('remote_node');
            setMentionFilter(filter);
            fetchRemoteMapNodes(mapName);
        } else if (mentionMatch) {
            setShowMentionList('node');
            setMentionFilter(mentionMatch[1]);
        } else if (mapMatch) {
            setShowMentionList('map');
            setMentionFilter(mapMatch[1]);
        } else {
            setShowMentionList(null);
        }
    };

    const insertMention = (itemLabel: string, type: 'node' | 'map' | 'remote_node') => {
        const selectionEnd = promptInputRef.current?.selectionEnd || 0;
        const textBeforeCursor = aiPrompt.substring(0, selectionEnd);
        const textAfterCursor = aiPrompt.substring(selectionEnd);
        const triggerChar = (type === 'node' || type === 'remote_node') ? '@' : ':';
        const lastTriggerIndex = textBeforeCursor.lastIndexOf(triggerChar);
        if (lastTriggerIndex !== -1) {
            const prefix = aiPrompt.substring(0, lastTriggerIndex);
            let tag = type === 'map' ? `[参考导图:${itemLabel}]` : `[引用:${itemLabel}]`;
            const newText = prefix + tag + " " + textAfterCursor;
            setAiPrompt(newText);
            setTimeout(() => {
                if (promptInputRef.current) {
                    promptInputRef.current.focus();
                    const newCursorPos = prefix.length + tag.length + 1;
                    promptInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        }
        setShowMentionList(null);
    };

    const handleAiGenerate = async () => {
        if (!aiTargetNode || !rootNode) return;
        setIsGenerating(true);
        setAiContent('');
        setAiError(null);

        try {
            const references: string[] = [];
            const mapRegex = /\[参考导图:([^\]]+)\]/g;
            let match;
            const referencedMapTitles = new Set<string>();
            const externalMapsData = new Map<string, MindMapNode>();
            
            while ((match = mapRegex.exec(aiPrompt)) !== null) {
                referencedMapTitles.add(match[1]);
            }
            
            const loadPromises = Array.from(referencedMapTitles).map(async (mapTitle) => {
                 if (mapTitle === mapData.title) return;
                 const targetMap = availableMaps.find(m => m.title === mapTitle);
                 if (targetMap) {
                     try {
                         if (remoteMapCache.current.has(mapTitle)) {
                             const detail = await apiService.getMindMapDetail(projectId, targetMap.id);
                             const parsed = JSON.parse(detail.data);
                             if (parsed.root) externalMapsData.set(mapTitle, parsed.root);
                         } else {
                             const detail = await apiService.getMindMapDetail(projectId, targetMap.id);
                             const parsed = JSON.parse(detail.data);
                             if (parsed.root) {
                                 externalMapsData.set(mapTitle, parsed.root);
                                 remoteMapCache.current.set(mapTitle, getAllNodesFlat(parsed.root));
                             }
                         }
                     } catch (e) {
                         logger.error(`加载外部导图失败: ${mapTitle}`);
                     }
                 }
            });
            await Promise.all(loadPromises);

            externalMapsData.forEach((root, title) => {
                 const summary = (root.children || []).map(c => c.label).join(', ');
                 references.push(`参考文件【导图:${title}】: 主题《${root.label}》，包含分支：${summary}。`);
            });

            const nodeRegex = /\[引用:([^\]]+)\]/g;
            const allLocalNodes = getAllNodesFlat(rootNode);
            
            while ((match = nodeRegex.exec(aiPrompt)) !== null) {
                const label = match[1];
                const localNode = allLocalNodes.find(n => n.label === label);
                if (localNode) {
                    references.push(`本地节点详情【${localNode.label}】(完整结构):\n${serializeNodeTree(localNode)}`);
                    continue; 
                }
                let foundInExternal = false;
                for (const [mapTitle, extRoot] of externalMapsData.entries()) {
                    const extNodes = getAllNodesFlat(extRoot);
                    const extNode = extNodes.find(n => n.label === label);
                    if (extNode) {
                        references.push(`来自【${mapTitle}】的节点详情【${extNode.label}】(完整结构):\n${serializeNodeTree(extNode)}`);
                        foundInExternal = true;
                        break;
                    }
                }
            }

            await apiService.generateStream(
                novelSettings || {} as any,
                WorkflowStep.MIND_MAP_NODE,
                aiTargetNode.label,
                references.join('\n'), 
                (chunk) => setAiContent(prev => prev + chunk),
                aiPrompt 
            );
        } catch (e: any) {
            setAiError(e.message || "生成请求失败");
        } finally {
            setIsGenerating(false);
        }
    };

    const applyAiResult = () => {
        if (!aiTargetNode || !rootNode || !aiContent) return;
        const lines = aiContent.split('\n').filter(l => l.trim().length > 0);
        const newChildren: MindMapNode[] = [];
        const stack: { node: MindMapNode, level: number }[] = [];
        for (const line of lines) {
            const match = line.match(/^(\s*)[-*]\s+(.+)/);
            if (!match) continue;
            const indent = match[1].length;
            const text = match[2];
            const newNode: MindMapNode = { id: crypto.randomUUID(), label: text, children: [] };
            while (stack.length > 0 && stack[stack.length - 1].level >= indent) stack.pop();
            if (stack.length === 0) {
                newChildren.push(newNode);
                stack.push({ node: newNode, level: indent });
            } else {
                const parent = stack[stack.length - 1].node;
                parent.children.push(newNode);
                stack.push({ node: newNode, level: indent });
            }
        }
        if (newChildren.length > 0) {
            const newRoot = updateNode(rootNode, aiTargetNode.id, (n) => ({ ...n, children: [...(n.children || []), ...newChildren] }));
            setRootNode(newRoot);
            setShowAiModal(false);
            triggerAutoSave(newRoot, title);
        } else {
            alert("未能解析出有效的节点结构，请检查 AI 生成内容是否为列表格式。");
        }
    };

    if (!rootNode) return <div className="text-white p-4">Loading...</div>;

    // 构建下拉菜单项
    let dropdownItems: { id: string, label: string, type: 'node' | 'map' | 'remote_node' }[] = [];
    let dropdownTitle = '';
    if (showMentionList === 'node') {
        dropdownTitle = '引用当前导图节点 (包含子树)';
        dropdownItems = getAllNodesFlat(rootNode)
            .filter(n => n.label.toLowerCase().includes(mentionFilter.toLowerCase()) && n.id !== aiTargetNode?.id)
            .map(n => ({ id: n.id, label: n.label, type: 'node' }));
    } else if (showMentionList === 'map') {
        dropdownTitle = '引用项目内其他导图';
        dropdownItems = availableMaps
            .filter(m => m.title.toLowerCase().includes(mentionFilter.toLowerCase()) && m.id !== mapData.id)
            .map(m => ({ id: m.id, label: m.title, type: 'map' }));
    } else if (showMentionList === 'remote_node') {
        dropdownTitle = remoteMapLoading ? '加载外部节点中...' : '引用外部导图节点';
        dropdownItems = remoteNodeOptions
            .filter(n => n.label.toLowerCase().includes(mentionFilter.toLowerCase()))
            .map(n => ({ id: n.id, label: n.label, type: 'remote_node' }));
    }

    return (
        <div className={`h-full flex flex-col ${activeTheme.bgContainer}`}>
            {/* Toolbar */}
            <div className="h-10 bg-[#2d2d2d] border-b border-black/50 flex items-center px-4 justify-between shrink-0 z-30">
                <div className="flex items-center gap-4">
                     <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        className="bg-transparent border-none text-slate-200 font-bold focus:ring-0 outline-none w-64 text-sm"
                        placeholder="导图标题"
                    />
                    
                    {/* 主题切换器 */}
                    <div className="flex items-center gap-1 border-l border-slate-600 pl-4">
                        <span className="text-xs text-slate-500">主题:</span>
                        <select 
                            value={activeThemeId}
                            onChange={(e) => setActiveThemeId(e.target.value)}
                            className="bg-[#1e1e1e] text-slate-300 text-xs border border-slate-600 rounded px-2 py-0.5 outline-none focus:border-indigo-500 cursor-pointer hover:bg-slate-700"
                        >
                            {Object.values(THEMES).map(theme => (
                                <option key={theme.id} value={theme.id}>{theme.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 缩放控制 */}
                    <div className="flex items-center gap-1 border-l border-slate-600 pl-4">
                        <button onClick={zoomOut} className="px-2 py-0.5 text-slate-400 hover:text-white bg-slate-800 rounded">-</button>
                        <span className="text-xs text-slate-400 w-12 text-center">{Math.round(viewState.scale * 100)}%</span>
                        <button onClick={zoomIn} className="px-2 py-0.5 text-slate-400 hover:text-white bg-slate-800 rounded">+</button>
                        <button onClick={resetView} className="ml-2 text-xs text-indigo-400 hover:text-indigo-300" title="复位视图">↺</button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isSaving && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            自动保存中...
                        </span>
                    )}
                    {!isSaving && <span className="text-xs text-green-500/50">已保存</span>}
                    <Button size="sm" onClick={handleManualSave} variant="secondary" className="text-xs py-1 h-7">
                        💾 强制保存
                    </Button>
                </div>
            </div>

            {/* Canvas Area (Pan & Zoom Container) */}
            <div 
                ref={canvasRef}
                className={`flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative transition-colors duration-300 ${activeTheme.bgContainer} ${isPanning ? 'cursor-grabbing' : ''}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleWheel}
                onClick={() => setSelectedId(null)}
            >
                {/* 动态网格背景 (跟随平移缩放) */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-20 canvas-bg"
                    style={{
                        backgroundImage: `radial-gradient(${activeTheme.bgGridColor} 1px, transparent 1px)`, 
                        backgroundSize: `${24 * viewState.scale}px ${24 * viewState.scale}px`,
                        backgroundPosition: `${viewState.x}px ${viewState.y}px`,
                    }}
                ></div>

                {/* 内容变换层 (Transform Layer) */}
                <div 
                    style={{ 
                        transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
                        transformOrigin: '0 0',
                        transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                    }}
                    className="absolute top-0 left-0 min-w-full min-h-full p-20" // Add padding to avoid edge clipping
                >
                    <NodeRenderer 
                        node={rootNode}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onEdit={handleEditNode}
                        onAddChild={handleAddChild}
                        onAiExpand={openAiModal}
                        onDelete={handleDeleteNode}
                        onNodeDrop={handleMoveNode}
                        depth={0}
                        theme={activeTheme}
                    />
                </div>
                
                {/* 提示信息 */}
                <div className="absolute bottom-4 left-4 text-[10px] text-slate-500 bg-black/20 px-2 py-1 rounded pointer-events-none">
                    拖拽画布移动 | 滚轮缩放 | 拖拽节点重组
                </div>
            </div>

            {/* AI Modal (Keep existing) */}
            {showAiModal && aiTargetNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm text-slate-200">
                    <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 rounded-t-xl">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="text-pink-400">✨ AI 节点扩展</span>
                                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">当前: {aiTargetNode.label}</span>
                            </h3>
                            <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        
                        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                            <div className="relative">
                                <label className="block text-xs text-slate-400 mb-1">
                                    提示词 (输入 <span className="text-pink-400 font-bold">@</span> 引用当前节点，输入 <span className="text-indigo-400 font-bold">:</span> 引用其他导图)
                                </label>
                                <div className="relative">
                                    <textarea
                                        ref={promptInputRef}
                                        value={aiPrompt}
                                        onChange={handlePromptInput}
                                        className="w-full h-24 bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white focus:border-pink-500 outline-none resize-none overflow-hidden relative z-10 bg-transparent"
                                        style={{ lineHeight: '1.5em' }}
                                        placeholder="例如：生成3个关于这个情节的反转..."
                                    />
                                    <div ref={mirrorRef} className="absolute top-0 left-0 w-full h-24 p-3 text-sm border border-transparent whitespace-pre-wrap invisible z-0" style={{ lineHeight: '1.5em' }}></div>
                                </div>
                                {showMentionList && (
                                    <div className="absolute z-50 bg-slate-800 border border-slate-600 shadow-xl rounded-lg w-64 max-h-48 overflow-y-auto flex flex-col animate-fade-in" style={{ top: cursorPos.top, left: cursorPos.left }}>
                                        <div className="text-[10px] bg-slate-900 text-slate-400 px-2 py-1.5 sticky top-0 border-b border-slate-700 flex justify-between items-center">
                                            <span>{dropdownTitle}</span>
                                            {remoteMapLoading && <span className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full"></span>}
                                        </div>
                                        {dropdownItems.map(item => (
                                            <div key={item.id} onClick={() => insertMention(item.label, item.type)} className="px-3 py-2 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white cursor-pointer truncate flex items-center gap-2 border-b border-slate-700/50 last:border-0">
                                                <span className={item.type === 'map' ? 'text-indigo-400' : 'text-pink-400'}>{item.type === 'map' ? '📅' : '●'}</span>
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleAiGenerate} isLoading={isGenerating} disabled={isGenerating}>开始生成</Button>
                            </div>
                            {aiError && <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-300 text-xs">❌ {aiError}</div>}
                            {aiContent && (
                                <div className="mt-4">
                                    <label className="block text-xs text-slate-400 mb-1">生成预览</label>
                                    <div className="bg-black/30 p-4 rounded border border-slate-700 max-h-60 overflow-y-auto prose prose-invert prose-sm"><ReactMarkdown>{aiContent}</ReactMarkdown></div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-700 bg-slate-900 rounded-b-xl flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowAiModal(false)}>取消</Button>
                            <Button variant="primary" onClick={applyAiResult} disabled={!aiContent || isGenerating}>应用结果</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
