
import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../Button';
import { ChatMessage, Role, IdeaCard } from '../../types';

interface AppMainContentProps {
    showCardHistory: boolean;
    savedCards: IdeaCard[];
    onSelectCard: (card: IdeaCard) => void;
    onDeleteCard: (id: string, e: React.MouseEvent) => void;
    user: any;
    history: ChatMessage[];
    generatedContent: string;
    draftCards: any[];
    onSaveCard: (draft: any) => void;
}

export const AppMainContent: React.FC<AppMainContentProps> = ({
    showCardHistory, savedCards, onSelectCard, onDeleteCard, user,
    history, generatedContent, draftCards, onSaveCard
}) => {
    const contentEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [generatedContent, history, draftCards]);

    if (showCardHistory) {
        return (
            <div className="w-96 flex-shrink-0 flex flex-col h-full bg-[#161b22] border-r border-slate-700 p-4 overflow-y-auto">
                 <div className="space-y-4 animate-fade-in">
                    {savedCards.map(card => (
                        <div key={card.id} onClick={() => onSelectCard(card)} className="bg-paper border border-slate-700 rounded-lg p-3 relative group hover:border-pink-500/50 transition-colors cursor-pointer">
                            <button onClick={(e) => onDeleteCard(card.id, e)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 z-10">×</button>
                            <h4 className="font-bold text-pink-400 text-sm mb-1">{card.title}</h4>
                            <p className="text-xs text-slate-400 line-clamp-3 mb-2">{card.intro}</p>
                            <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">查看详情</span>
                        </div>
                    ))}
                    {savedCards.length === 0 && <div className="text-center text-slate-500 py-10 text-xs">暂无收藏的脑洞卡片。<br/>{user ? '去"生成创意"中挑选心仪的灵感吧！' : '请先登录'}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="md:hidden p-4 border-b border-slate-700 bg-paper flex justify-between items-center">
                <span className="font-bold text-primary">天工造文</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                {history.length === 0 && !generatedContent && draftCards.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                        <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        <p>请在左侧配置小说设定并开始创作...</p>
                    </div>
                )}

                {history.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-4xl w-full p-4 rounded-xl ${msg.role === Role.USER ? 'bg-primary/20 border border-primary/30 ml-12' : msg.role === Role.SYSTEM ? 'bg-green-900/20 border border-green-500/30' : 'bg-paper border border-slate-700 mr-12'}`}>
                            <div className="flex items-center mb-2 pb-2 border-b border-slate-600/50">
                                <span className="text-xs font-bold uppercase tracking-wider">{msg.role}</span>
                                <span className="ml-auto text-xs text-slate-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className={`prose prose-invert prose-slate max-w-none ${msg.isError ? 'text-red-300' : ''}`}>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}

                {generatedContent && (
                    <div className="flex justify-start animate-pulse">
                        <div className="max-w-4xl w-full p-4 rounded-xl bg-paper border border-secondary/50 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                            <div className="flex items-center mb-2 pb-2 border-b border-slate-600/50">
                                <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center">
                                    <span className="w-2 h-2 bg-secondary rounded-full mr-2 animate-ping"></span> AI 正在构思中...
                                </span>
                            </div>
                            <div className="prose prose-invert prose-slate max-w-none font-mono text-xs">{generatedContent}</div>
                        </div>
                    </div>
                )}

                {draftCards.length > 0 && (
                    <div className="flex flex-col gap-4 max-w-4xl pb-10">
                        <div className="flex items-center gap-2 text-pink-400 font-bold">AI 生成了以下脑洞方案，请点击保存：</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {draftCards.map((draft, idx) => (
                                <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col relative group hover:border-pink-500 transition-colors h-[400px]">
                                    <h3 className="text-xl font-bold text-white mb-2 shrink-0">{draft.title}</h3>
                                    <div className="text-sm text-slate-300 mb-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="mb-2">{draft.intro}</div>
                                        {draft.highlight && <div className="text-xs text-indigo-300 mt-2 bg-indigo-900/20 p-2 rounded">🔥 爽点: {draft.highlight}</div>}
                                        {draft.golden_finger && <div className="text-xs text-yellow-300 mt-2 bg-yellow-900/20 p-2 rounded">✨ 金手指: {draft.golden_finger}</div>}
                                    </div>
                                    <Button onClick={() => onSaveCard(draft)} className="w-full mt-auto shrink-0" size="sm" variant="secondary">💾 收藏此脑洞到卡片库</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div ref={contentEndRef} />
            </div>
        </div>
    );
};
