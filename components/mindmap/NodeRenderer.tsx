
import React, { useState, useRef, useEffect } from 'react';
import { MindMapNode } from '../../types';
import { ThemeConfig } from './themes';

interface NodeRendererProps {
    node: MindMapNode;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onEdit: (id: string, newLabel: string) => void;
    onAddChild: (parentId: string) => void;
    onAiExpand: (node: MindMapNode) => void;
    onDelete: (id: string) => void;
    onNodeDrop: (draggedId: string, targetId: string) => void;
    depth: number;
    theme: ThemeConfig;
}

export const NodeRenderer: React.FC<NodeRendererProps> = ({ 
    node, selectedId, onSelect, onEdit, onAddChild, onAiExpand, onDelete, onNodeDrop, depth, theme 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(node.label);
    const [isDragOver, setIsDragOver] = useState(false);
    // 使用 TextArea 引用以支持多行和自动高度
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // 自动调整高度逻辑
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            // 重置高度以重新计算 scrollHeight
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
            // 将光标移到末尾
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
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

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditValue(e.target.value);
        // 动态调整高度
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Enter 保存，Shift+Enter 换行
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleBlur();
        }
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
        nodeStyleClasses = `
            ${isDragOver ? theme.node.dragTarget : (isSelected ? theme.node.selected : theme.node.base)} 
            ${depth === 1 ? 'px-5 py-2.5 text-lg font-medium rounded-xl border-2' : 'px-4 py-2 text-sm rounded-lg border'}
            z-10 hover:scale-105
        `;
    }

    // 递进的线条宽度
    const borderClass = depth === 0 ? 'border-[3px]' : (depth === 1 ? 'border-2' : 'border');
    const lineColor = theme.lineColor;

    return (
        <div className="flex items-center">
            {/* 节点主体 */}
            <div className="flex flex-col justify-center relative group">
                {/* 节点内容容器 - 添加 mindmap-node 类名供父组件识别 */}
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                    onDoubleClick={handleDoubleClick}
                    draggable={!isRoot && !isEditing}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`${baseClasses} ${nodeStyleClasses} mindmap-node`}
                >
                    {isEditing ? (
                        <textarea
                            ref={inputRef}
                            value={editValue}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            className={`bg-transparent border border-dashed ${theme.lineColor} rounded outline-none text-center min-w-[150px] resize-none overflow-hidden ${theme.node.input}`}
                            style={{ maxWidth: '400px' }} // 稍微放宽最大宽度，保证内容展示
                            onMouseDown={e => e.stopPropagation()} 
                        />
                    ) : (
                        <div className={`break-words whitespace-pre-wrap max-w-[300px] ${isSelected || isRoot ? 'text-white' : theme.node.text}`}>
                            {node.label}
                        </div>
                    )}

                    {/* 操作菜单 */}
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
                                    onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} 
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
                    <div className={`w-12 h-px ${lineColor} ${borderClass.replace('border', 'border-t')}`}></div>
                    <div className="flex flex-col justify-center">
                        {node.children.map((child, index) => {
                            const isFirst = index === 0;
                            const isLast = index === node.children!.length - 1;
                            
                            return (
                                <div key={child.id} className="flex items-center relative pl-8">
                                    <div className="absolute left-0 top-0 bottom-0 w-8">
                                        {!isFirst && <div className={`absolute left-0 top-0 w-px h-[50%] ${lineColor} ${borderClass.replace('border', 'border-l')}`}></div>}
                                        {!isLast && <div className={`absolute left-0 bottom-0 w-px h-[50%] ${lineColor} ${borderClass.replace('border', 'border-l')}`}></div>}
                                        <div className={`absolute left-0 top-1/2 w-full h-px ${lineColor} ${borderClass.replace('border', 'border-t')}`}></div>
                                    </div>
                                    <div className="py-2">
                                        <NodeRenderer
                                            node={child} selectedId={selectedId} onSelect={onSelect} onEdit={onEdit}
                                            onAddChild={onAddChild} onAiExpand={onAiExpand} onDelete={onDelete}
                                            onNodeDrop={onNodeDrop} depth={depth + 1} theme={theme}
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
