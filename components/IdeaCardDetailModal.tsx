
import React, { useState } from 'react';
import { IdeaCard } from '../types';
import { Button } from './Button';

interface Props {
    card: IdeaCard | null;
    isOpen: boolean;
    onClose: () => void;
    onCreateProject: (card: IdeaCard) => void;
    isCreating: boolean;
}

export const IdeaCardDetailModal: React.FC<Props> = ({ card, isOpen, onClose, onCreateProject, isCreating }) => {
    if (!isOpen || !card) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden animate-fade-in">
                
                {/* 装饰性背景 */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-indigo-600"></div>

                {/* 标题栏 */}
                <div className="p-6 pb-2 flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-white leading-tight">{card.title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* 详情内容区 */}
                <div className="p-6 pt-2 overflow-y-auto space-y-6 flex-1">
                    <div className="text-slate-400 italic text-sm border-l-2 border-slate-600 pl-3">
                        {card.intro}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/20">
                            <h3 className="text-indigo-400 font-bold mb-2 flex items-center">
                                🔥 核心爽点 (Highlight)
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">{card.highlight}</p>
                        </div>
                        <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/20">
                            <h3 className="text-red-400 font-bold mb-2 flex items-center">
                                💣 开篇爆点 (Explosive Point)
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">{card.explosive_point}</p>
                        </div>
                    </div>

                    <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/20">
                         <h3 className="text-yellow-400 font-bold mb-2 flex items-center">
                            ✨ 金手指设定 (Golden Finger)
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed">{card.golden_finger}</p>
                    </div>

                    <div className="text-xs text-slate-500 pt-4 border-t border-slate-800">
                        创建时间: {new Date(card.created_at).toLocaleString()}
                    </div>
                </div>

                {/* 底部操作栏 */}
                <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isCreating}>
                        关闭
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => onCreateProject(card)} 
                        isLoading={isCreating}
                        className="bg-gradient-to-r from-indigo-600 to-pink-600 border-none shadow-lg hover:shadow-indigo-500/30"
                    >
                        📂 以此脑洞立项 (生成文件夹)
                    </Button>
                </div>
            </div>
        </div>
    );
};
