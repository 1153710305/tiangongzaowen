import React, { useState, useEffect, useRef } from 'react';
import { MindMap, MindMapNode, WorkflowStep, NovelSettings } from '../types';
import { apiService } from '../services/geminiService';
import { Button } from './Button';
import { logger } from '../services/loggerService';
import ReactMarkdown from 'react-markdown';

interface Props {
    projectId: string;
    mapData: MindMap;
    onSave: (mapId: string, title: string, dataStr: string) => void;
    novelSettings?: NovelSettings;
    availableMaps?: { id: string, title: string }[]; // 可用的其他思维导图，用于 : 引用
}

// 递归渲染节点组件
const NodeRenderer: React.FC<{
    node: MindMapNode;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onEdit: (id: string, newLabel: string) => void;
    onAddChild: (parentId: string) => void;
    onAiExpand: (node: MindMapNode) => void;
    onDelete: (id: string) => void;
    depth: number;
}> = ({ node, selectedId, onSelect, onEdit, onAddChild, onAiExpand, onDelete, depth }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(node.label);
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

    return (
        <div className="flex flex-col relative group">
            <div className="flex items-center">
                {/* 节点内容 */}
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                    onDoubleClick={handleDoubleClick}
                    className={`
                        relative px-4 py-2 rounded-lg border-2 transition-all cursor-pointer min-w-[120px] max-w-[300px]
                        ${selectedId === node.id 
                            ? 'border-pink-500 bg-pink-900/30 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]' 
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-750'}
                    `}
                >
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className="bg-transparent border-none outline-none text-white w-full text-sm"
                        />
                    ) : (
                        <div className="text-sm font-medium break-words">{node.label}</div>
                    )}

                    {/* 快捷操作浮层 (选中或Hover时显示) */}
                    <div className={`absolute -top-8 left-0 hidden group-hover:flex gap-1 bg-slate-900 border border-slate-700 rounded p-1 shadow-lg z-10`}>
                        <button onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }} className="p-1 hover:bg-slate-700 rounded text-green-400" title="添加子节点">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onAiExpand(node); }} className="p-1 hover:bg-slate-700 rounded text-pink-400" title="AI 扩展">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </button>
                        {depth > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="p-1 hover:bg-slate-700 rounded text-red-400" title="删除">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* 连接线 */}
                {node.children.length > 0 && (
                    <div className="w-8 h-0.5 bg-slate-700"></div>
                )}
            </div>

            {/* 子节点容器 */}
            {node.children.length > 0 && (
                <div className="flex flex-col ml-8 pl-4 border-l-2 border-slate-800 gap-4 py-2 relative" style={{marginLeft: '2rem'}}>
                     {/* 连接线装饰 */}
                    {node.children.map((child) => (
                        <div key={child.id} className="relative flex items-center">
                            {/* 水平连接线 */}
                            <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-slate-700"></div>
                            <NodeRenderer
                                node={child}
                                selectedId={selectedId}
                                onSelect={onSelect}
                                onEdit={onEdit}
                                onAddChild={onAddChild}
                                onAiExpand={onAiExpand}
                                onDelete={onDelete}
                                depth={depth + 1}
                            />
                        </div>
                    ))}
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
    
    // AI 弹窗状态
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTargetNode, setAiTargetNode] = useState<MindMapNode | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiContent, setAiContent] = useState('');
    
    // === 引用系统状态 ===
    // 'node': 本地节点, 'map': 外部导图, 'remote_node': 外部导图的节点
    const [showMentionList, setShowMentionList] = useState<'node' | 'map' | 'remote_node' | null>(null); 
    const [mentionFilter, setMentionFilter] = useState('');
    const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });
    const [remoteNodeOptions, setRemoteNodeOptions] = useState<{id: string, label: string}[]>([]); // 缓存加载的外部节点
    const [remoteMapLoading, setRemoteMapLoading] = useState(false); // 外部导图加载状态

    const promptInputRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null); // 用于模拟光标位置
    const remoteMapCache = useRef<Map<string, MindMapNode[]>>(new Map()); // 缓存已加载的外部导图数据

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

    const handleManualSave = () => {
        if (!rootNode) return;
        const dataStr = JSON.stringify({ root: rootNode });
        onSave(mapData.id, title, dataStr);
    };

    // === Utils ===
    const updateNode = (node: MindMapNode, id: string, updater: (n: MindMapNode) => MindMapNode): MindMapNode => {
        if (node.id === id) return updater(node);
        return { ...node, children: node.children.map(c => updateNode(c, id, updater)) };
    };

    const deleteNode = (node: MindMapNode, id: string): MindMapNode => {
        return { ...node, children: node.children.filter(c => c.id !== id).map(c => deleteNode(c, id)) };
    };

    const getAllNodesFlat = (node: MindMapNode): MindMapNode[] => {
        let list = [node];
        for (const child of node.children) {
            list = [...list, ...getAllNodesFlat(child)];
        }
        return list;
    };

    const handleAddChild = (parentId: string) => {
        if (!rootNode) return;
        const newChild: MindMapNode = { id: crypto.randomUUID(), label: '新节点', children: [] };
        setRootNode(updateNode(rootNode, parentId, (n) => ({ ...n, children: [...n.children, newChild] })));
    };

    const handleEditNode = (id: string, newLabel: string) => {
        if (!rootNode) return;
        setRootNode(updateNode(rootNode, id, (n) => ({ ...n, label: newLabel })));
    };

    const handleDeleteNode = (id: string) => {
        if (!rootNode || id === 'root') return;
        if (!confirm("确定删除该节点及其子节点吗？")) return;
        setRootNode(deleteNode(rootNode, id));
        if (selectedId === id) setSelectedId(null);
    };

    const openAiModal = (node: MindMapNode) => {
        setAiTargetNode(node);
        setAiPrompt(`基于“${node.label}”，请生成...`);
        setAiContent('');
        setShowAiModal(true);
    };

    // === 核心逻辑：计算光标位置 ===
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
        // 1. 检查缓存
        if (remoteMapCache.current.has(mapTitle)) {
            setRemoteNodeOptions(remoteMapCache.current.get(mapTitle)!);
            return;
        }

        // 2. 查找 ID
        const targetMap = availableMaps.find(m => m.title === mapTitle);
        if (!targetMap) return;

        setRemoteMapLoading(true);
        try {
            const detail = await apiService.getMindMapDetail(projectId, targetMap.id);
            const parsed = JSON.parse(detail.data);
            if (parsed.root) {
                const nodes = getAllNodesFlat(parsed.root);
                // 存入缓存（简单扁平化用于搜索）
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
        
        // 匹配 @ (可能是本地节点，也可能是外部节点)
        const mentionMatch = textBeforeCursor.match(/@([^@\s:\[\]]*)$/);
        // 匹配 : (导图引用)
        const mapMatch = textBeforeCursor.match(/:([^@\s:\[\]]*)$/);

        // 核心变更：检测级联引用 [参考导图:XXX] @
        const remoteContextMatch = textBeforeCursor.match(/\[参考导图:([^\]]+)\]\s*@([^@\s:\[\]]*)$/);

        if (remoteContextMatch) {
            // 模式：外部节点引用
            const mapName = remoteContextMatch[1];
            const filter = remoteContextMatch[2];
            setShowMentionList('remote_node');
            setMentionFilter(filter);
            fetchRemoteMapNodes(mapName); // 触发加载外部导图
        } else if (mentionMatch) {
            // 模式：本地节点引用
            setShowMentionList('node');
            setMentionFilter(mentionMatch[1]);
        } else if (mapMatch) {
            // 模式：导图引用
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
        
        // 找到触发符号的位置
        const triggerChar = (type === 'node' || type === 'remote_node') ? '@' : ':';
        const lastTriggerIndex = textBeforeCursor.lastIndexOf(triggerChar);
        
        if (lastTriggerIndex !== -1) {
            const prefix = aiPrompt.substring(0, lastTriggerIndex);
            
            // 无论本地还是外部节点，插入格式统一为 [引用:NodeName]
            // AI 会根据上下文中的 [参考导图:XXX] 来决定去哪里找这个 Node
            let tag = '';
            if (type === 'map') {
                tag = `[参考导图:${itemLabel}]`;
            } else {
                tag = `[引用:${itemLabel}]`;
            }
            
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

        // 收集需要注入的上下文
        const references: string[] = [];
        
        // 1. 扫描所有的 [参考导图:XXX] 并加载
        const mapRegex = /\[参考导图:([^\]]+)\]/g;
        let match;
        const referencedMapTitles = new Set<string>();
        
        // 用于存储外部导图的根节点，方便后续查找
        const externalMapsData = new Map<string, MindMapNode>();

        while ((match = mapRegex.exec(aiPrompt)) !== null) {
            referencedMapTitles.add(match[1]);
        }

        // 异步加载所有被引用的导图
        const loadPromises = Array.from(referencedMapTitles).map(async (mapTitle) => {
             // 防止引用自己
             if (mapTitle === mapData.title) return;

             const targetMap = availableMaps.find(m => m.title === mapTitle);
             if (targetMap) {
                 try {
                     // 优先读缓存
                     if (remoteMapCache.current.has(mapTitle)) {
                         // 缓存里存的是 flat nodes，我们需要结构，这里简单起见，如果缓存有，说明已经 fetch 过了
                         // 但为了获取结构化数据，可能需要保留 root node。
                         // 这里做一个简化：重新 fetch 或者优化缓存结构。
                         // 为保证正确性，这里重新 fetch 详情（Hono SQLite 很快）或者优化为缓存完整 JSON
                         const detail = await apiService.getMindMapDetail(projectId, targetMap.id);
                         const parsed = JSON.parse(detail.data);
                         if (parsed.root) externalMapsData.set(mapTitle, parsed.root);
                     } else {
                         const detail = await apiService.getMindMapDetail(projectId, targetMap.id);
                         const parsed = JSON.parse(detail.data);
                         if (parsed.root) {
                             externalMapsData.set(mapTitle, parsed.root);
                             // 顺便更新缓存
                             remoteMapCache.current.set(mapTitle, getAllNodesFlat(parsed.root));
                         }
                     }
                 } catch (e) {
                     logger.error(`加载外部导图失败: ${mapTitle}`);
                 }
             }
        });

        await Promise.all(loadPromises);

        // 2. 注入外部导图的全局摘要（如果有引用但没有具体指定节点）
        externalMapsData.forEach((root, title) => {
             const summary = root.children.map(c => c.label).join(', ');
             references.push(`参考文件【导图:${title}】: 主题《${root.label}》，包含分支：${summary}。`);
        });

        // 3. 扫描 [引用:XXX] 并定位节点（本地优先，外部次之）
        const nodeRegex = /\[引用:([^\]]+)\]/g;
        const allLocalNodes = getAllNodesFlat(rootNode);

        while ((match = nodeRegex.exec(aiPrompt)) !== null) {
            const label = match[1];
            
            // A. 查本地
            const localNode = allLocalNodes.find(n => n.label === label);
            if (localNode) {
                const childrenStr = localNode.children.map(c => c.label).join(', ');
                references.push(`本地节点详情【${localNode.label}】${childrenStr ? `(包含子项: ${childrenStr})` : '(无子项)'}`);
                continue; // 找到了就不去外部找了，防止同名冲突
            }

            // B. 查外部
            let foundInExternal = false;
            for (const [mapTitle, extRoot] of externalMapsData.entries()) {
                const extNodes = getAllNodesFlat(extRoot);
                const extNode = extNodes.find(n => n.label === label);
                if (extNode) {
                    const childrenStr = extNode.children.map(c => c.label).join(', ');
                    references.push(`来自【${mapTitle}】的节点详情【${extNode.label}】${childrenStr ? `(包含子项: ${childrenStr})` : '(无子项)'}`);
                    foundInExternal = true;
                    break;
                }
            }
            
            if (!localNode && !foundInExternal) {
                references.push(`引用节点【${label}】: (未找到该节点内容)`);
            }
        }

        try {
            await apiService.generateStream(
                novelSettings || {} as any,
                WorkflowStep.MIND_MAP_NODE,
                aiTargetNode.label,
                references.join('\n'), 
                (chunk) => setAiContent(prev => prev + chunk),
                aiPrompt 
            );
        } catch (e) {
            alert("生成失败，请重试");
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
            setRootNode(updateNode(rootNode, aiTargetNode.id, (n) => ({ ...n, children: [...n.children, ...newChildren] })));
            setShowAiModal(false);
            logger.info("已应用 AI 生成的思维导图节点");
        } else {
            alert("未能解析出有效的节点结构，请检查 AI 生成内容是否为列表格式。");
        }
    };

    if (!rootNode) return <div className="text-white p-4">Loading...</div>;

    // 过滤列表逻辑
    let dropdownItems: { id: string, label: string, type: 'node' | 'map' | 'remote_node' }[] = [];
    let dropdownTitle = '';

    if (showMentionList === 'node') {
        dropdownTitle = '引用当前导图节点';
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
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            {/* Toolbar */}
            <div className="h-10 bg-[#2d2d2d] border-b border-black/50 flex items-center px-4 justify-between">
                <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-transparent border-none text-slate-200 font-bold focus:ring-0 outline-none w-64"
                />
                <Button size="sm" onClick={handleManualSave} variant="primary">💾 保存导图</Button>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto p-10 cursor-grab active:cursor-grabbing bg-[#1e1e1e] relative">
                <div className="absolute inset-0 pointer-events-none opacity-10" style={{backgroundImage: 'radial-gradient(#666 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                <div className="min-w-max min-h-max">
                    <NodeRenderer 
                        node={rootNode}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onEdit={handleEditNode}
                        onAddChild={handleAddChild}
                        onAiExpand={openAiModal}
                        onDelete={handleDeleteNode}
                        depth={0}
                    />
                </div>
            </div>

            {/* AI Modal */}
            {showAiModal && aiTargetNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
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
                                    <span className="block text-[10px] text-slate-500 mt-0.5">技巧: 输入 [参考导图:XXX] 后再按 @，可选择该导图内的节点。</span>
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
                                    {/* Mirror Div 用于计算光标位置 */}
                                    <div 
                                        ref={mirrorRef}
                                        className="absolute top-0 left-0 w-full h-24 p-3 text-sm border border-transparent whitespace-pre-wrap invisible z-0"
                                        style={{ lineHeight: '1.5em' }}
                                    ></div>
                                </div>

                                {showMentionList && (
                                    <div 
                                        className="absolute z-50 bg-slate-800 border border-slate-600 shadow-xl rounded-lg w-64 max-h-48 overflow-y-auto flex flex-col animate-fade-in" 
                                        style={{ top: cursorPos.top, left: cursorPos.left }}
                                    >
                                        <div className="text-[10px] bg-slate-900 text-slate-400 px-2 py-1.5 sticky top-0 border-b border-slate-700 flex justify-between items-center">
                                            <span>{dropdownTitle}</span>
                                            {remoteMapLoading && <span className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full"></span>}
                                        </div>
                                        {dropdownItems.map(item => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => insertMention(item.label, item.type)} 
                                                className="px-3 py-2 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white cursor-pointer truncate flex items-center gap-2 border-b border-slate-700/50 last:border-0"
                                            >
                                                <span className={item.type === 'map' ? 'text-indigo-400' : 'text-pink-400'}>
                                                    {item.type === 'map' ? '📅' : '●'}
                                                </span>
                                                {item.label}
                                            </div>
                                        ))}
                                        {dropdownItems.length === 0 && !remoteMapLoading && (
                                            <div className="p-2 text-xs text-slate-500 text-center">无匹配项</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleAiGenerate} isLoading={isGenerating} disabled={isGenerating}>开始生成</Button>
                            </div>

                            {aiContent && (
                                <div className="mt-4">
                                    <label className="block text-xs text-slate-400 mb-1">生成预览</label>
                                    <div className="bg-black/30 p-4 rounded border border-slate-700 max-h-60 overflow-y-auto prose prose-invert prose-sm">
                                        <ReactMarkdown>{aiContent}</ReactMarkdown>
                                    </div>
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