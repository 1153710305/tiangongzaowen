
import React, { useState } from 'react';
import { IdeaCard } from '../types';
import { Button } from './Button';
import { apiService } from '../services/geminiService';
import { logger } from '../services/loggerService';

interface Props {
    card: IdeaCard;
    onClose: () => void;
    onProjectCreated: () => void; // 创建成功后回调，用于切换视图
}

export const IdeaCardDetailModal: React.FC<Props> = ({ card, onClose, onProjectCreated }) => {
    const [isCreating, setIsCreating] = useState(false);

    // 处理创建项目逻辑
    const handleCreateProject = async () => {
        setIsCreating(true);
        try {
            logger.info("开始从卡片创建项目", { cardTitle: card.title });
            await apiService.createProjectFromCard(card.id, card.title, card.intro);
            alert("🎉 项目创建成功！已初始化空文件夹架构。");
            onProjectCreated();
            onClose();
        } catch (e: any) {
            alert("创建失败: " + e.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper border border-pink-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative overflow-hidden">
                {/* 装饰性背景 */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-start bg-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{card.title}</h2>
                        <p className="text-xs text-slate-400">创建于 {new Date(card.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">简介 (Intro)</h3>
                        <p className="text-slate-200 bg-black/20 p-4 rounded-lg border border-slate-700/50 leading-relaxed">
                            {card.intro}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-indigo-900/10 p-4 rounded-lg border border-indigo-500/20">
                            <h3 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                                <span>🔥</span> 核心爽点
                            </h3>
                            <p className="text-sm text-slate-300">{card.highlight}</p>
                        </div>
                        <div className="bg-red-900/10 p-4 rounded-lg border border-red-500/20">
                            <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                                <span>💣</span> 开篇爆点
                            </h3>
                            <p className="text-sm text-slate-300">{card.explosive_point}</p>
                        </div>
                    </div>

                    <div className="bg-yellow-900/10 p-4 rounded-lg border border-yellow-500/20">
                        <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                            <span>✨</span> 金手指 (Golden Finger)
                        </h3>
                        <p className="text-sm text-slate-300">{card.golden_finger}</p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        关闭
                    </Button>
                    <Button 
                        variant="primary" 
                        isLoading={isCreating} 
                        onClick={handleCreateProject}
                        className="shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    >
                        🚀 初始化小说项目 (IDE)
                    </Button>
                </div>
            </div>
        </div>
    );
};
