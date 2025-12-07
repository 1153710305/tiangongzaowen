import React, { useState, useRef, useEffect } from 'react';
import { MindMapNode } from '../../types';
import { ThemeConfig, LayoutType } from './themes';

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
    layout?: LayoutType; // 新增布局参数
}

export const NodeRenderer: React.FC<NodeRendererProps> = ({ 
    node, selectedId, onSelect, onEdit, onAddChild, onAiExpand, onDelete, onNodeDrop, depth, theme, layout = 'right'
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(node.label);
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // 自动高度
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (editValue.trim() !== node.label) {
            onEdit(node.id, editValue);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleBlur();
        }
    };

    // 新增：双击进入编辑模式
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    // Drag & Drop
    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        if (depth === 0) { e.preventDefault(); return; }
        e.dataTransfer.setData('application/react-mindmap-node', node.id);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragOver) setIsDragOver(true); e.dataTransfer.dropEffect = 'move'; };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('application/react-mindmap-node');
        if (draggedId && draggedId !== node.id) onNodeDrop(draggedId, node.id);
    };

    // === 布局逻辑计算 ===
    const isRoot = depth === 0;
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    
    // 判断当前是否为 "向下" 结构的布局 (Organization Chart)
    const isDownLayout = layout === 'down';
    // 判断是否为 "时间轴" 或 "列表" 布局
    const isListLayout = layout === 'timeline' || layout === 'list';

    // 容器方向: 
    // Right: 节点与子组水平排列 (row), 子组内部垂直排列 (col)
    // Down: 节点与子组垂直排列 (col), 子组内部水平排列 (row)
    // List: 都是垂直
    const containerFlexDir = isDownLayout ? 'flex-col' : (isListLayout ? 'flex-col' : 'flex-row');
    const childrenFlexDir = isDownLayout ? 'flex-row' : 'flex-col';

    // 样式
    const baseClasses = "relative transition-all duration-200 cursor-pointer flex items-center justify-center";
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

    // 线条颜色与样式
    // Cyberpunk 特殊处理：如果是 cyberpunk，使用渐变背景色作为线条，否则使用 border class
    const isCyberpunk = theme.id === 'cyberpunk';
    const lineColorClass = isCyberpunk ? 'bg-gradient-to-b from-cyan-500 to-purple-500' : theme.lineColor;
    const borderStyleClass = isCyberpunk ? '' : (depth === 0 ? 'border-[3px]' : (depth === 1 ? 'border-2' : 'border'));
    
    // 连接线 (Connector) 尺寸
    // Right: 宽12px (spacer)
    // Down: 高12px (spacer)
    // Timeline: 左侧线条
    const connectorSize = isDownLayout ? 'h-8 w-px' : 'w-12 h-px';
    const connectorClasses = isCyberpunk ? 'w-[2px] h-8' : `${theme.lineColor} ${borderStyleClass}`;

    return (
        <div className={`flex ${isDownLayout ? 'items-center' : (isListLayout ? 'items-start' : 'items-center')} ${containerFlexDir}`}>
            
            {/* 1. 节点本体 */}
            <div className="flex flex-col justify-center relative group z-20">
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                    onDoubleClick={handleDoubleClick}
                    draggable={!isRoot && !isEditing}
                    onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    className={`${baseClasses} ${nodeStyleClasses} mindmap-node`}
                >
                    {isEditing ? (
                        <textarea ref={inputRef} value={editValue} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown} rows={1}
                            className={`bg-transparent border border-dashed ${theme.lineColor} rounded outline-none text-center min-w-[150px] resize-none overflow-hidden ${theme.node.input}`}
                            style={{ maxWidth: '400px' }} onMouseDown={e => e.stopPropagation()} 
                        />
                    ) : (
                        <div className={`break-words whitespace-pre-wrap max-w-[300px] ${isSelected || isRoot ? 'text-white' : theme.node.text}`}>
                            {node.label}
                        </div>
                    )}
                    
                    {/* Hover Menu */}
                    {(isSelected) && (
                        <div className={`absolute ${isDownLayout ? 'left-full top-1/2 -translate-y-1/2 ml-2' : '-top-10 left-1/2 -translate-x-1/2'} flex gap-1 bg-slate-900 border border-slate-600 rounded-lg p-1 shadow-xl z-50 animate-fade-in whitespace-nowrap`}>
                            <button onMouseDown={(e)=>{e.stopPropagation();e.preventDefault()}} onClick={(e)=>{e.stopPropagation();onAddChild(node.id)}} className="p-1.5 hover:bg-slate-700 rounded text-green-400"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg></button>
                            <button onMouseDown={(e)=>{e.stopPropagation();e.preventDefault()}} onClick={(e)=>{e.stopPropagation();onAiExpand(node)}} className="p-1.5 hover:bg-slate-700 rounded text-pink-400"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></button>
                            {!isRoot && <button onMouseDown={(e)=>{e.stopPropagation();e.preventDefault()}} onClick={(e)=>{e.stopPropagation();onDelete(node.id)}} className="p-1.5 hover:bg-slate-700 rounded text-red-400"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. 连接线 (Parent to Group) */}
            {hasChildren && (
                <div className={`${isDownLayout ? 'h-8 w-px' : (isListLayout ? 'h-4 w-px ml-6' : 'w-12 h-px')} ${isCyberpunk ? 'bg-gradient-to-b from-cyan-500 to-purple-500' : theme.lineColor} ${!isCyberpunk && !isListLayout ? (isDownLayout ? 'border-l' : 'border-t') : ''} ${!isCyberpunk && !isListLayout ? borderStyleClass : ''}`}></div>
            )}

            {/* 3. 子节点组 */}
            {hasChildren && (
                <div className={`flex ${childrenFlexDir} ${isListLayout ? 'border-l-2 ml-6 pl-6 border-dashed ' + theme.lineColor : ''} ${isDownLayout ? 'items-start' : 'items-center'}`}>
                    {node.children.map((child, index) => {
                        const isFirst = index === 0;
                        const isLast = index === node.children!.length - 1;
                        
                        return (
                            <div key={child.id} className={`flex ${containerFlexDir} items-center relative ${isDownLayout ? 'px-4 pt-0' : (isListLayout ? 'py-2' : 'pl-0 py-2')}`}>
                                
                                {/* 结构线 (Tree Branches) - 仅在非 Timeline 模式下绘制复杂分支 */}
                                {!isListLayout && (
                                    <div className={`absolute ${isDownLayout ? 'top-0 left-0 right-0 h-8' : 'left-0 top-0 bottom-0 w-12'} pointer-events-none`}>
                                        {/* 脊柱线 (Spine) */}
                                        {/* Right: 垂直线 | Down: 水平线 */}
                                        {!isFirst && <div className={`absolute ${isDownLayout ? 'top-0 left-0 w-[50%] h-px border-t' : 'left-0 top-0 h-[50%] w-px border-l'} ${theme.lineColor} ${borderStyleClass}`}></div>}
                                        {!isLast && <div className={`absolute ${isDownLayout ? 'top-0 right-0 w-[50%] h-px border-t' : 'left-0 bottom-0 h-[50%] w-px border-l'} ${theme.lineColor} ${borderStyleClass}`}></div>}
                                        
                                        {/* 分支连接线 (Branch Connector) */}
                                        {/* Right: 水平线 -> | Down: 垂直线 v */}
                                        <div className={`absolute ${isDownLayout ? 'left-1/2 top-0 h-full w-px border-l' : 'top-1/2 left-0 w-full h-px border-t'} ${theme.lineColor} ${borderStyleClass}`}></div>
                                    </div>
                                )}

                                <NodeRenderer
                                    node={child} selectedId={selectedId} onSelect={onSelect} onEdit={onEdit}
                                    onAddChild={onAddChild} onAiExpand={onAiExpand} onDelete={onDelete}
                                    onNodeDrop={onNodeDrop} depth={depth + 1} theme={theme} layout={layout}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};