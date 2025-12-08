
import { useState } from 'react';
import { MindMapNode } from '../types';
import { updateNodeInTree, deleteNodeFromTree, moveNodeInTree, toggleNodeExpansion, getAllNodesFlat } from '../components/mindmap/utils';

export const useMindMapState = (initialRoot: MindMapNode, onAutoSave: (root: MindMapNode) => void) => {
    const [rootNode, setRootNode] = useState<MindMapNode>(initialRoot);
    const [history, setHistory] = useState<MindMapNode[]>([]);
    const [future, setFuture] = useState<MindMapNode[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    // 核心更新方法，自动处理历史记录
    const updateMapState = (newRoot: MindMapNode, recordHistory = true) => {
        if (recordHistory) {
            setHistory(prev => [...prev, rootNode]);
            setFuture([]); // 清空未来状态
        }
        setRootNode(newRoot);
        onAutoSave(newRoot);
    };

    const undo = () => {
        if (history.length === 0) return;
        const previousState = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        setFuture(prev => [rootNode, ...prev]);
        setHistory(newHistory);
        setRootNode(previousState);
        setEditingNodeId(null);
        onAutoSave(previousState);
    };

    const redo = () => {
        if (future.length === 0) return;
        const nextState = future[0];
        const newFuture = future.slice(1);
        setHistory(prev => [...prev, rootNode]);
        setFuture(newFuture);
        setRootNode(nextState);
        setEditingNodeId(null);
        onAutoSave(nextState);
    };

    // Node Operations
    const addChild = (parentId: string): string | null => {
        const newChildId = crypto.randomUUID();
        const newChild: MindMapNode = { id: newChildId, label: '新节点', children: [] };
        
        // 查找并添加
        let found = false;
        const addNodeRecursive = (node: MindMapNode): MindMapNode => {
            if (node.id === parentId) { 
                found = true; 
                return { ...node, isExpanded: true, children: [...(node.children || []), newChild] }; 
            }
            if (node.children) return { ...node, children: node.children.map(addNodeRecursive) };
            return node;
        };
        const newRoot = addNodeRecursive(rootNode);
        
        if (found) {
            updateMapState(newRoot);
            setEditingNodeId(newChildId); // Auto edit
            return newChildId;
        }
        return null;
    };

    const editNode = (id: string, newLabel: string) => {
        const targetNode = getAllNodesFlat(rootNode).find(n => n.id === id);
        if (targetNode && targetNode.label === newLabel) return;
        
        const newRoot = updateNodeInTree(rootNode, id, (n) => ({ ...n, label: newLabel }));
        updateMapState(newRoot);
        if (editingNodeId === id) setEditingNodeId(null);
    };

    const deleteNode = (id: string) => {
        if (id === rootNode.id) return alert("根节点不能删除");
        try {
            const newRoot = deleteNodeFromTree(rootNode, id);
            updateMapState(newRoot);
            if (selectedId === id) setSelectedId(null);
        } catch (e) { console.error(e); }
    };

    const moveNode = (draggedId: string, targetId: string) => {
        const newRoot = moveNodeInTree(rootNode, draggedId, targetId);
        if (newRoot) updateMapState(newRoot);
    };

    const toggleExpand = (id: string) => {
        const newRoot = toggleNodeExpansion(rootNode, id);
        updateMapState(newRoot);
    };

    return {
        rootNode,
        setRootNode,
        history,
        future,
        selectedId,
        setSelectedId,
        editingNodeId,
        setEditingNodeId,
        undo,
        redo,
        addChild,
        editNode,
        deleteNode,
        moveNode,
        toggleExpand,
        updateMapState // 暴露给 AI 或其他特殊操作使用
    };
};
