
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
    novelSettings?: NovelSettings; // 用于 AI 上下文
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

export const MindMapEditor: React.FC<Props> = ({ projectId, mapData, onSave, novelSettings }) => {
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
    
    // @ 引用相关状态
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });
    const promptInputRef = useRef<HTMLTextAreaElement>(null);

    // 初始化
    useEffect(() => {
        try {
            const parsed = JSON.parse(mapData.data);
            if (parsed.root) {
                setRootNode(parsed.root);
            } else {
                // 兼容旧格式或空数据
                setRootNode({ id: 'root', label: '核心创意', children: [] });
            }
        } catch (e) {
            setRootNode({ id: 'root', label: '核心创意', children: [] });
        }
        setTitle(mapData.title);
    }, [mapData]);

    // 手动保存
    const handleManualSave = () => {
        if (!rootNode) return;
        const dataStr = JSON.stringify({ root: rootNode });
        onSave(mapData.id, title, dataStr);
    };

    // === 节点操作函数 (Utils) ===
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

    // === AI 操作 ===
    const openAiModal = (node: MindMapNode) => {
        setAiTargetNode(node);
        setAiPrompt(`基于“${node.label}”，请生成...`);
        setAiContent('');
        setShowAiModal(true);
    };

    const handlePromptInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setAiPrompt(val);

        const lastChar = val.slice(-1);
        if (lastChar === '@') {
            const rect = e.target.getBoundingClientRect();
            setCursorPos({ top: rect.bottom + 5, left: rect.left + 20 }); 
            setShowMentionList(true);
            setMentionFilter('');
        } else if (showMentionList) {
            const match = val.match(/@([^@\s]*)$/);
            if (match) setMentionFilter(match[1]);
            else setShowMentionList(false);
        }
    };

    const insertMention = (nodeLabel: string) => {
        const match = aiPrompt.match(/@([^@\s]*)$/);
        if (match) {
            const prefix = aiPrompt.substring(0, match.index);
            setAiPrompt(`${prefix}[引用:${nodeLabel}] `);
        } else {
            setAiPrompt(prev => prev + `[引用:${nodeLabel}] `);
        }
        setShowMentionList(false);
        promptInputRef.current?.focus();
    };

    const handleAiGenerate = async () => {
        if (!aiTargetNode || !rootNode) return;
        setIsGenerating(true);
        setAiContent('');

        // 提取引用上下文
        const references: string[] = [];
        const regex = /\[引用:([^\]]+)\]/g;
        let match;
        const allNodes = getAllNodesFlat(rootNode);
        
        while ((match = regex.exec(aiPrompt)) !== null) {
            const label = match[1];
            const refNode = allNodes.find(n => n.label === label);
            if (refNode) references.push(`节点【${refNode.label}】包含子节点: ${refNode.children.map(c => c.label).join(', ')}`);
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

    // 解析 AI Markdown 列表
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

    const filteredMentionList = getAllNodesFlat(rootNode).filter(n => 
        n.label.toLowerCase().includes(mentionFilter.toLowerCase()) && 
        n.id !== aiTargetNode?.id
    );

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
                                <label className="block text-xs text-slate-400 mb-1">提示词 (输入 @ 可引用其他节点)</label>
                                <textarea
                                    ref={promptInputRef}
                                    value={aiPrompt}
                                    onChange={handlePromptInput}
                                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white focus:border-pink-500 outline-none resize-none"
                                    placeholder="例如：生成3个关于这个情节的反转..."
                                />
                                {showMentionList && (
                                    <div className="absolute z-50 bg-slate-800 border border-slate-600 shadow-xl rounded-lg w-48 max-h-40 overflow-y-auto" style={{ top: cursorPos.top, left: cursorPos.left }}>
                                        {filteredMentionList.map(n => (
                                            <div key={n.id} onClick={() => insertMention(n.label)} className="px-3 py-2 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white cursor-pointer truncate">
                                                {n.label}
                                            </div>
                                        ))}
                                        {filteredMentionList.length === 0 && <div className="p-2 text-xs text-slate-500">无匹配节点</div>}
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
