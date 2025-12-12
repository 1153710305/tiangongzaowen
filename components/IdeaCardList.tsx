import React from 'react';
import { IdeaCard } from '../types';
import { Button } from './Button';

interface Props {
    cards: Partial<IdeaCard>[];
    onSave: (card: Partial<IdeaCard>) => void;
    savedCards: IdeaCard[]; // To check if already saved
}

export const IdeaCardList: React.FC<Props> = ({ cards, onSave, savedCards }) => {

    const isSaved = (card: Partial<IdeaCard>) => {
        return savedCards.some(s => s.title === card.title && s.intro === card.intro); // Basic duplicate check
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {cards.map((draft, idx) => {
                const alreadySaved = isSaved(draft);
                return (
                    <div key={idx} className={`bg-slate-800 border ${alreadySaved ? 'border-green-500/50' : 'border-slate-700'} rounded-xl p-5 shadow-lg flex flex-col relative group hover:border-pink-500 transition-all h-[480px]`}>
                        {alreadySaved && <div className="absolute top-2 right-2 text-green-400 text-xs font-bold border border-green-400 rounded px-2 py-0.5 z-10">已收藏</div>}

                        {/* 标题 */}
                        <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400 mb-4 shrink-0 truncate">
                            {draft.title || '未命名脑洞'}
                        </h3>

                        {/* 滚动内容区域 */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-4 text-xs">

                            {/* 简介 */}
                            <div className="bg-black/20 rounded-lg p-3 border border-slate-700/50">
                                <div className="text-slate-500 font-bold mb-1 flex items-center gap-1">
                                    <span>📖</span> 简介
                                </div>
                                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {draft.intro || '暂无简介描述...'}
                                </div>
                            </div>

                            {/* 开局爆点 */}
                            {draft.explosive_point && (
                                <div className="bg-red-900/10 rounded-lg p-3 border border-red-500/20">
                                    <div className="text-red-400 font-bold mb-1 flex items-center gap-1">
                                        <span>💣</span> 开局爆点
                                    </div>
                                    <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {draft.explosive_point}
                                    </div>
                                </div>
                            )}

                            {/* 核心爽点 */}
                            {draft.highlight && (
                                <div className="bg-indigo-900/10 rounded-lg p-3 border border-indigo-500/20">
                                    <div className="text-indigo-400 font-bold mb-1 flex items-center gap-1">
                                        <span>🔥</span> 核心爽点
                                    </div>
                                    <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {draft.highlight}
                                    </div>
                                </div>
                            )}

                            {/* 金手指 */}
                            {draft.golden_finger && (
                                <div className="bg-yellow-900/10 rounded-lg p-3 border border-yellow-500/20">
                                    <div className="text-yellow-400 font-bold mb-1 flex items-center gap-1">
                                        <span>✨</span> 金手指
                                    </div>
                                    <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {draft.golden_finger}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 底部按钮 */}
                        <Button
                            onClick={() => !alreadySaved && onSave(draft)}
                            className={`w-full mt-auto shrink-0 shadow-lg border ${alreadySaved ? 'bg-green-900/30 border-green-500/30 text-green-300 cursor-not-allowed' : 'border-white/5'}`}
                            size="sm"
                            variant={alreadySaved ? 'ghost' : 'secondary'}
                            disabled={alreadySaved}
                        >
                            {alreadySaved ? '✓ 已收藏至卡片库' : '💾 收藏此脑洞'}
                        </Button>
                    </div>
                );
            })}
        </div>
    );
};
