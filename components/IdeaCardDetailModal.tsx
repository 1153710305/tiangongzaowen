
import React, { useState } from 'react';
import { IdeaCard } from '../types';
import { Button } from './Button';

interface Props {
    card: IdeaCard;
    onClose: () => void;
    onInitProject: (card: IdeaCard) => void;
    isProcessing: boolean;
}

export const IdeaCardDetailModal: React.FC<Props> = ({ card, onClose, onInitProject, isProcessing }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl border border-slate-700 flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-800 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-pink-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">脑洞卡片</span>
                            <span className="text-slate-400 text-xs">{card.created_at.split('T')[0]}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight">{card.title}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">简介 (Intro)</h3>
                        <p className="text-slate-200 leading-relaxed bg-black/20 p-3 rounded border border-slate-700/50">{card.intro}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-900/10 border border-indigo-500/30 p-4 rounded-lg">
                            <h3 className="text-indigo-400 font-bold text-sm mb-2 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                核心爽点
                            </h3>
                            <p className="text-slate-300 text-sm">{card.highlight}</p>
                        </div>
                        <div className="bg-red-900/10 border border-red-500/30 p-4 rounded-lg">
                            <h3 className="text-red-400 font-bold text-sm mb-2 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                开篇爆点
                            </h3>
                            <p className="text-slate-300 text-sm">{card.explosive_point}</p>
                        </div>
                        <div className="bg-yellow-900/10 border border-yellow-500/30 p-4 rounded-lg">
                            <h3 className="text-yellow-400 font-bold text-sm mb-2 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                                金手指
                            </h3>
                            <p className="text-slate-300 text-sm">{card.golden_finger}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>关闭</Button>
                    <Button 
                        variant="primary" 
                        onClick={() => onInitProject(card)} 
                        isLoading={isProcessing}
                        className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 border-none shadow-lg shadow-purple-900/20"
                    >
                        🚀 初始化小说项目 (Workspace)
                    </Button>
                </div>
            </div>
        </div>
    );
};
