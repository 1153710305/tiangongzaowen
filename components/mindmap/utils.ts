
import { MindMapNode } from '../../types';

// 递归序列化节点及其所有子节点为 Markdown 列表字符串
export const serializeNodeTree = (node: MindMapNode, depth: number = 0): string => {
    const indent = '  '.repeat(depth);
    let result = `${indent}- ${node.label}`;
    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            result += '\n' + serializeNodeTree(child, depth + 1);
        }
    }
    return result;
};

// 从树中递归删除指定 ID 的节点
export const deleteNodeFromTree = (root: MindMapNode, targetId: string): MindMapNode => {
    if (!root || !root.children) return root;
    const newChildren = root.children.filter(c => c.id !== targetId);
    const finalChildren = newChildren.map(c => deleteNodeFromTree(c, targetId));
    return { ...root, children: finalChildren };
};

// 查找节点是否存在于子树中 (用于防环检测)
export const isDescendant = (parent: MindMapNode, targetId: string): boolean => {
    if (parent.id === targetId) return true;
    if (!parent.children) return false;
    return parent.children.some(child => isDescendant(child, targetId));
};

// 移动节点
export const moveNodeInTree = (root: MindMapNode, draggedId: string, targetId: string): MindMapNode | null => {
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

// 更新树中任意节点
export const updateNodeInTree = (node: MindMapNode, id: string, updater: (n: MindMapNode) => MindMapNode): MindMapNode => {
    if (node.id === id) return updater(node);
    return { ...node, children: (node.children || []).map(c => updateNodeInTree(c, id, updater)) };
};

// 获取所有节点的扁平数组
export const getAllNodesFlat = (node: MindMapNode): MindMapNode[] => {
    let list = [node];
    if (node.children) {
        for (const child of node.children) {
            list = [...list, ...getAllNodesFlat(child)];
        }
    }
    return list;
};
