
import React from 'react';

interface Props {
    onClose: () => void;
}

export const MindMapShortcutModal: React.FC<Props> = ({ onClose }) => {
    return (
        <div className="absolute top-14 right-4 z-40 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 w-64 text-slate-200 animate-fade-in">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700">
                <h4 className="font-bold text-sm">快捷键</h4>
                <button onClick={onClose} className="hover:text-white">×</button>
            </div>
            <ul className="space-y-1 text-xs text-slate-400">
                <li>双击: 编辑节点</li>
                <li>Enter: 确认编辑</li>
                <li>拖拽: 移动节点</li>
                <li>Ctrl+Z: 撤销操作</li>
                <li>Ctrl+Y: 重做操作</li>
            </ul>
        </div>
    );
};
