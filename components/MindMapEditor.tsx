
import React, { useState, useEffect, useRef } from 'react';
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

    const isSelected = selectedId === node.id;

    return (
        <div className="flex flex-col relative group">
            <div className="flex items-center">
                {/* 节点内容 */}
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                    onDoubleClick={handleDoubleClick}
                    className={`
                        relative px-4 py-2 rounded-lg border-2 transition-all cursor-pointer min-w-[120px] max-w-[300px]
                        ${isSelected
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

                    {/* 快捷操作浮层 (仅选中时显示) */}
                    {isSelected && (
                        <div className="absolute -top-9 left-0 flex gap-1 bg-slate-900 border border-slate-700 rounded p-1 shadow-lg z-20 animate-fade-in">
                            <button onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }} className="p-1.5 hover:bg-slate-700 rounded text-green-400 transition-colors" title="添加子节点">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onAiExpand(node); }} className="p-1.5 hover:bg-slate-700 rounded text-pink-400 transition-colors" title="AI 扩展">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </button>
                            {depth > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="p-1.5 hover:bg-slate-700 rounded text-red-400 transition-colors" title="删除">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            )}
                        </div>
                    )}
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
    const [isSaving, setIsSaving] = useState(false); // 保存状态
    
    // AI 弹窗状态
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTargetNode, setAiTargetNode] = useState<MindMapNode | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiContent, setAiContent] = useState('');
    const [aiError, setAiError] = useState<string | null>(null); // 新增错误提示
    
    // === 引用系统状态 ===
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

    // === 自动保存逻辑 ===
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

    const handleAddChild = (parentId: string) => {
        if (!rootNode) return;
        const newChild: MindMapNode = { id: crypto.randomUUID(), label: '新节点', children: [] };
        // 先计算新状态
        const newRoot = updateNode(rootNode, parentId, (n) => ({ ...n, children: [...n.children, newChild] }));
        // 更新 UI
        setRootNode(newRoot);
        // 触发保存
        triggerAutoSave(newRoot, title);
    };

    const handleEditNode = (id: string, newLabel: string) => {
        if (!rootNode) return;
        const newRoot = updateNode(rootNode, id, (n) => ({ ...n, label: newLabel }));
        setRootNode(newRoot);
        triggerAutoSave(newRoot, title);
    };

    const handleDeleteNode = (id: string) => {
        if (!rootNode || id === 'root') return;
        if (!confirm("确定删除该节点及其子节点吗？")) return;
        const newRoot = deleteNode(rootNode, id);
        setRootNode(newRoot);
        if (selectedId === id) setSelectedId(null);
        triggerAutoSave(newRoot, title);
    };

    const openAiModal = (node: MindMapNode) => {
        setAiTargetNode(node);
        setAiPrompt(`基于“${node.label}”，请生成...`);
        setAiContent('');
        setAiError(null);
        setShowAiModal(true);
    };

    // ... (光标位置计算和引用逻辑) ...
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
        const mentionMatch = textBeforeCursor.match(/@([^@\s:\[\]]*)$/);
        const mapMatch = textBeforeCursor.match(/:([^@\s:\[\]]*)$/);
        const remoteContextMatch = textBeforeCursor.match(/\[参考导图:([^\]]+)\]\s*@([^@\s:\[\]]*)$/);

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
        setAiError(null);

        try {
            const references: string[] = [];
            const mapRegex = /\[参考导图:([^\]]+)\]/g;
            let match;
            const referencedMapTitles = new Set<string>();
            const externalMapsData = new Map<string, MindMapNode>();
            
            // 1. 预加载所有引用的外部导图
            while ((match = mapRegex.exec(aiPrompt)) !== null) {
                referencedMapTitles.add(match[1]);
            }
            
            const loadPromises = Array.from(referencedMapTitles).map(async (mapTitle) => {
                 if (mapTitle === mapData.title) return;
                 const targetMap = availableMaps.find(m => m.title === mapTitle);
                 if (targetMap) {
                     try {
                         if (remoteMapCache.current.has(mapTitle)) {
                             // 如果缓存只有扁平列表，这里可能需要重新获取完整树结构？
                             // 实际上我们缓存的是扁平化的 MindMapNode，引用依然指向内存中的树对象。
                             // 为了安全起见，这里假设缓存是有效的。如果需要树结构，扁平列表中的节点包含 children 引用。
                             // 但为了稳妥，我们重新 fetch 详情拿到 root。
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

            // 2. 将外部导图摘要加入引用
            externalMapsData.forEach((root, title) => {
                 const summary = root.children.map(c => c.label).join(', ');
                 references.push(`参考文件【导图:${title}】: 主题《${root.label}》，包含分支：${summary}。`);
            });

            // 3. 解析节点引用 (深度遍历)
            const nodeRegex = /\[引用:([^\]]+)\]/g;
            const allLocalNodes = getAllNodesFlat(rootNode);
            
            while ((match = nodeRegex.exec(aiPrompt)) !== null) {
                const label = match[1];
                const localNode = allLocalNodes.find(n => n.label === label);
                
                if (localNode) {
                    // 核心修改：使用 serializeNodeTree 递归获取整个子树结构
                    const treeStruct = serializeNodeTree(localNode);
                    references.push(`本地节点详情【${localNode.label}】(完整结构):\n${treeStruct}`);
                    continue; 
                }

                // 查找外部节点
                let foundInExternal = false;
                for (const [mapTitle, extRoot] of externalMapsData.entries()) {
                    const extNodes = getAllNodesFlat(extRoot);
                    const extNode = extNodes.find(n => n.label === label);
                    if (extNode) {
                         // 核心修改：使用 serializeNodeTree 递归获取整个子树结构
                        const treeStruct = serializeNodeTree(extNode);
                        references.push(`来自【${mapTitle}】的节点详情【${extNode.label}】(完整结构):\n${treeStruct}`);
                        foundInExternal = true;
                        break;
                    }
                }

                if (!localNode && !foundInExternal) {
                    references.push(`引用节点【${label}】: (未找到该节点内容)`);
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
            logger.error("AI Node Expansion Failed", e);
            setAiError(e.message || "生成请求失败，请检查网络或重试");
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
            // 计算并应用新状态
            const newRoot = updateNode(rootNode, aiTargetNode.id, (n) => ({ ...n, children: [...n.children, ...newChildren] }));
            setRootNode(newRoot);
            setShowAiModal(false);
            logger.info("已应用 AI 生成的思维导图节点");
            triggerAutoSave(newRoot, title);
        } else {
            alert("未能解析出有效的节点结构，请检查 AI 生成内容是否为列表格式。");
        }
    };

    if (!rootNode) return <div className="text-white p-4">Loading...</div>;

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
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            {/* Toolbar */}
            <div className="h-10 bg-[#2d2d2d] border-b border-black/50 flex items-center px-4 justify-between">
                <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur} // 标题失焦自动保存
                    className="bg-transparent border-none text-slate-200 font-bold focus:ring-0 outline-none w-64"
                    placeholder="导图标题"
                />
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

            {/* Canvas */}
            <div className="flex-1 overflow-auto p-10 cursor-grab active:cursor-grabbing bg-[#1e1e1e] relative">
                <div className="absolute inset-0 pointer-events-none opacity-10" style={{backgroundImage: 'radial-gradient(#666 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                <div className="min-w-max min-h-max" onClick={() => setSelectedId(null)}>
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
                                    <span className="block text-[10px] text-slate-500 mt-0.5">技巧: 输入 [参考导图:XXX] 后再按 @，可选择该导图内的节点。引用时会自动包含节点的完整子结构。</span>
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

                            {aiError && (
                                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-300 text-xs">
                                    ❌ {aiError}
                                </div>
                            )}

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
