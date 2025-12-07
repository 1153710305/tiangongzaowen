
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
    onToggleExpand?: (id: string) => void; // 新增：折叠切换回调
    depth: number;
    theme: ThemeConfig;
    layout?: LayoutType;
}

export const NodeRenderer: React.FC<NodeRendererProps> = (props) => {
    const { layout = 'right' } = props;

    // 根据布局类型分发渲染逻辑
    if (layout === 'right') {
        return <RightLayoutRenderer {...props} />;
    }

    return <LegacyRenderer {...props} />;
};

/**
 * 专用渲染器：逻辑结构图 (Right Layout)
 */
const RightLayoutRenderer: React.FC<NodeRendererProps> = ({
    node, selectedId, onSelect, onEdit, onAddChild, onAiExpand, onDelete, onNodeDrop, onToggleExpand, depth, theme
}) => {
    const hasChildren = node.children && node.children.length > 0;
    const isRoot = depth === 0;
    // 默认展开，除非明确设为 false
    const isExpanded = node.isExpanded !== false; 

    // === 样式定义 ===
    const isCyberpunk = theme.id === 'cyberpunk';
    const borderClass = isCyberpunk ? '' : theme.lineColor;

    return (
        <div className="flex items-center" data-node-id={node.id}>
            {/* 1. 节点本体 */}
            <NodeContent 
                node={node} 
                selectedId={selectedId} 
                depth={depth} 
                theme={theme}
                isRoot={isRoot}
                onSelect={onSelect} 
                onEdit={onEdit} 
                onAddChild={onAddChild} 
                onAiExpand={onAiExpand} 
                onDelete={onDelete} 
                onNodeDrop={onNodeDrop} 
            />

            {/* 2. 连接线与折叠按钮区 */}
            {hasChildren && (
                <div className="flex items-center">
                    {/* 父节点引出的短横线 + 折叠按钮 */}
                    <div className="relative flex items-center">
                         <div className={`h-px w-6 ${isCyberpunk ? 'h-[2px] bg-gradient-to-r from-cyan-500 to-purple-500' : `border-t-2 ${borderClass}`}`}></div>
                         
                         {/* 折叠按钮：位于横线末端 */}
                         <button 
                             onClick={(e) => { e.stopPropagation(); onToggleExpand && onToggleExpand(node.id); }}
                             className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[10px] z-30 transition-all hover:scale-110 ${isExpanded ? 'bg-transparent text-slate-500 hover:text-white hover:bg-slate-700' : 'bg-indigo-500 text-white shadow-sm ring-2 ring-indigo-200'}`}
                             title={isExpanded ? "折叠" : "展开"}
                         >
                             {isExpanded ? (
                                 // 当鼠标悬停在连接线上时，或者展开状态下，可以显示一个小圆点或者减号
                                 // 为了极简，我们用一个很小的圆点，hover变大
                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-white"></span>
                             ) : (
                                 // 折叠状态显示数字或加号
                                 <span className="font-bold">{node.children!.length}</span>
                             )}
                         </button>
                    </div>

                    {/* 子节点列表容器 - 仅在展开时显示 */}
                    {isExpanded && (
                        <div className="flex flex-col justify-center ml-2"> 
                            {node.children!.map((child, index) => {
                                const isFirst = index === 0;
                                const isLast = index === node.children!.length - 1;
                                const isOnly = node.children!.length === 1;

                                return (
                                    <div key={child.id} className="flex items-center relative">
                                        {/* 连接线系统 */}
                                        {!isOnly && (
                                            <div className="flex flex-col w-4 h-full absolute left-0 top-0 bottom-0 pointer-events-none">
                                                {/* 竖直线 */}
                                                <div className={`absolute w-0 left-0 border-l-2 ${borderClass} 
                                                    ${isFirst ? 'top-1/2 h-1/2' : ''} 
                                                    ${isLast ? 'top-0 h-1/2' : ''}
                                                    ${!isFirst && !isLast ? 'top-0 h-full' : ''}
                                                    ${isCyberpunk ? 'w-[2px] bg-gradient-to-b from-cyan-500 to-purple-500 border-none' : ''}
                                                `}></div>
                                                
                                                {/* 横向分支线 */}
                                                <div className={`absolute top-1/2 left-0 w-full h-0 border-t-2 ${borderClass} ${isCyberpunk ? 'h-[2px] bg-gradient-to-r from-cyan-500 to-purple-500 border-none' : ''}`}></div>

                                                {/* 圆角 */}
                                                {isFirst && !isCyberpunk && <div className={`absolute top-1/2 left-0 w-2 h-2 border-l-2 border-t-2 ${borderClass} rounded-tl-lg -translate-y-[2px]`}></div>}
                                                {isLast && !isCyberpunk && <div className={`absolute bottom-1/2 left-0 w-2 h-2 border-l-2 border-b-2 ${borderClass} rounded-bl-lg translate-y-[2px]`}></div>}
                                            </div>
                                        )}

                                        {isOnly && (
                                            <div className={`absolute top-1/2 left-0 w-4 h-0 border-t-2 ${borderClass} ${isCyberpunk ? 'h-[2px] bg-gradient-to-r from-cyan-500 to-purple-500 border-none' : ''}`}></div>
                                        )}

                                        {/* 内容容器 */}
                                        <div className="pl-4 py-1.5">
                                            <NodeRenderer 
                                                node={child} 
                                                depth={depth + 1} 
                                                layout="right"
                                                theme={theme}
                                                selectedId={selectedId}
                                                onSelect={onSelect}
                                                onEdit={onEdit}
                                                onAddChild={onAddChild}
                                                onAiExpand={onAiExpand}
                                                onDelete={onDelete}
                                                onNodeDrop={onNodeDrop}
                                                onToggleExpand={onToggleExpand}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// === 节点内容组件 (复用) ===
const NodeContent: React.FC<any> = ({ node, selectedId, depth, theme, isRoot, onSelect, onEdit, onAddChild, onAiExpand, onDelete, onNodeDrop }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(node.label);
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const isSelected = selectedId === node.id;

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

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        if (isRoot) { e.preventDefault(); return; }
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

    // 样式计算
    let nodeStyleClasses = "";
    if (isRoot) {
        nodeStyleClasses = `${theme.node.root} rounded-xl px-6 py-3 text-lg font-bold min-w-[120px] z-20 text-center`;
    } else {
        // 普通节点：默认 min-w-fit 且 whitespace-nowrap 保证单行，内容过长(超过300px)时才允许换行
        nodeStyleClasses = `
            ${isDragOver ? theme.node.dragTarget : (isSelected ? theme.node.selected : theme.node.base)} 
            px-3 py-1.5 text-sm rounded-md 
            z-10 cursor-pointer flex items-center justify-center transition-all duration-200
            min-w-fit max-w-[300px]
        `;
    }

    return (
        <div className="relative group z-20 mindmap-node">
            <div 
                onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                draggable={!isRoot && !isEditing}
                onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                className={nodeStyleClasses}
            >
                {isEditing ? (
                    <textarea ref={inputRef} value={editValue} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown} rows={1}
                        className={`bg-transparent border-none outline-none text-center resize-none overflow-hidden ${theme.node.input}`}
                        style={{ minWidth: '100px', whiteSpace: 'nowrap' }} onMouseDown={e => e.stopPropagation()} 
                    />
                ) : (
                    <div className={`
                        ${isSelected || isRoot ? 'text-white' : theme.node.text}
                        ${node.label.length > 20 ? 'whitespace-normal break-words' : 'whitespace-nowrap'} 
                    `}>
                        {node.label}
                    </div>
                )}
                
                {/* Hover Menu */}
                {(isSelected) && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-900 border border-slate-700 rounded p-0.5 shadow-xl z-50 animate-fade-in whitespace-nowrap">
                        <button onMouseDown={(e)=>{e.stopPropagation();e.preventDefault()}} onClick={(e)=>{e.stopPropagation();onAddChild(node.id)}} className="p-1 hover:bg-slate-700 rounded text-green-400" title="添加"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg></button>
                        <button onMouseDown={(e)=>{e.stopPropagation();e.preventDefault()}} onClick={(e)=>{e.stopPropagation();onAiExpand(node)}} className="p-1 hover:bg-slate-700 rounded text-pink-400" title="AI"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></button>
                        {!isRoot && <button onMouseDown={(e)=>{e.stopPropagation();e.preventDefault()}} onClick={(e)=>{e.stopPropagation();onDelete(node.id)}} className="p-1 hover:bg-slate-700 rounded text-red-400" title="删除"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * 兼容旧版渲染器 (用于 Down/Timeline/List 布局)
 */
const LegacyRenderer: React.FC<NodeRendererProps> = (props) => {
    const { node, depth, theme, layout = 'down' } = props;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = node.isExpanded !== false;
    
    const isDownLayout = layout === 'down';
    const isListLayout = layout === 'timeline' || layout === 'list';
    const isCyberpunk = theme.id === 'cyberpunk';
    const containerFlexDir = isDownLayout ? 'flex-col' : 'flex-col'; 
    const childrenFlexDir = isDownLayout ? 'flex-row' : 'flex-col';
    const borderStyleClass = isCyberpunk ? '' : (depth === 0 ? 'border-[3px]' : (depth === 1 ? 'border-2' : 'border'));

    return (
        <div className={`flex ${isDownLayout ? 'items-center' : 'items-start'} ${containerFlexDir}`} data-node-id={node.id}>
            <NodeContent {...props} />

            {/* 连接线 */}
            {hasChildren && isExpanded && (
                <div className={`${isDownLayout ? 'h-6 w-px' : 'h-4 w-px ml-6'} ${isCyberpunk ? 'bg-gradient-to-b from-cyan-500 to-purple-500' : theme.lineColor} ${!isCyberpunk && !isListLayout ? (isDownLayout ? 'border-l' : 'border-t') : ''} ${!isCyberpunk && !isListLayout ? borderStyleClass : ''}`}></div>
            )}

            {/* 子节点组 */}
            {hasChildren && isExpanded && (
                <div className={`flex ${childrenFlexDir} ${isListLayout ? 'border-l-2 ml-6 pl-6 border-dashed ' + theme.lineColor : ''} ${isDownLayout ? 'items-start' : 'items-center'}`}>
                    {node.children!.map((child, index) => {
                        const isFirst = index === 0;
                        const isLast = index === node.children!.length - 1;
                        
                        return (
                            <div key={child.id} className={`flex ${containerFlexDir} items-center relative ${isDownLayout ? 'px-3 pt-0' : 'py-2'}`}>
                                {!isListLayout && isDownLayout && (
                                    <div className="absolute top-0 left-0 right-0 h-8 pointer-events-none">
                                        {!isFirst && <div className={`absolute top-0 left-0 w-[50%] h-px border-t ${theme.lineColor} ${borderStyleClass}`}></div>}
                                        {!isLast && <div className={`absolute top-0 right-0 w-[50%] h-px border-t ${theme.lineColor} ${borderStyleClass}`}></div>}
                                        <div className={`absolute left-1/2 top-0 h-full w-px border-l ${theme.lineColor} ${borderStyleClass}`}></div>
                                    </div>
                                )}
                                <NodeRenderer {...props} node={child} depth={depth + 1} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
