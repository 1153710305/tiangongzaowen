
import React, { useState, useEffect } from 'react';
import { NovelSettingsForm } from '../NovelSettingsForm';
import { Button } from '../Button';
import { User, Archive, WorkflowStep, NovelSettings, ReferenceNovel } from '../../types';
import { PromptLibraryModal } from '../PromptLibraryModal';
import { UserSettingsModal } from '../UserSettingsModal';
import { PricingModal } from '../PricingModal';
import { GuestbookModal } from '../GuestbookModal';
import { AnnouncementModal } from '../AnnouncementModal';
import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/geminiService';

interface AppSidebarProps {
    user: User | null;
    projectCount: number;
    savedCardsCount: number;
    showCardHistory: boolean;
    setShowCardHistory: (show: boolean) => void;
    onShowProjectList: () => void;
    onLogout: () => void;
    onShowAuthModal: () => void;
    archives: Archive[];
    currentArchiveId?: string;
    currentArchiveTitle: string;
    setCurrentArchiveTitle: (t: string) => void;
    onLoadArchive: (a: Archive) => void;
    onDeleteArchive: (id: string, e: React.MouseEvent) => void;
    onResetArchive: () => void;
    onSaveArchive: () => void;
    isSavingArchive: boolean;
    settings: NovelSettings;
    setSettings: (s: NovelSettings) => void;
    isGenerating: boolean;
    currentStep: WorkflowStep;
    onGenerateIdea: (ctx?: string, refs?: ReferenceNovel[], model?: string) => void;
    onGenerateOutline: () => void;
    onGenerateCharacter: () => void;
    onGenerateChapter: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
    user, projectCount, savedCardsCount, showCardHistory, setShowCardHistory,
    onShowProjectList, onLogout, onShowAuthModal, archives, currentArchiveId,
    currentArchiveTitle, setCurrentArchiveTitle, onLoadArchive, onDeleteArchive,
    onResetArchive, onSaveArchive, isSavingArchive, settings, setSettings,
    isGenerating, currentStep, onGenerateIdea, onGenerateOutline, onGenerateCharacter, onGenerateChapter
}) => {
    const [showPromptLib, setShowPromptLib] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPricing, setShowPricing] = useState(false);
    const [showGuestbook, setShowGuestbook] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const { t } = useSettings();
    
    // 折叠状态
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // 实时用户状态
    const [userStats, setUserStats] = useState<{ tokens: number, isVip: boolean, vipExpiry: string | null } | null>(null);

    const refreshUserStats = async () => {
        if (!user) return;
        try {
            const stats = await apiService.getUserStatus();
            setUserStats({
                tokens: stats.tokens,
                isVip: stats.isVip,
                vipExpiry: stats.vip_expiry
            });
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (user) refreshUserStats();
    }, [user, isGenerating]);

    // 自动检测新公告
    useEffect(() => {
        const checkAnnouncements = async () => {
            try {
                const list = await apiService.getAnnouncements();
                if (list.length > 0) {
                    const latest = list[0];
                    const seenId = localStorage.getItem('skycraft_seen_announcement');
                    if (seenId !== latest.id) {
                        setShowAnnouncements(true);
                        localStorage.setItem('skycraft_seen_announcement', latest.id);
                    }
                }
            } catch (e) { console.error("Auto check announcement failed", e); }
        };
        // 延迟一点执行，避免阻塞首屏渲染
        setTimeout(checkAnnouncements, 1000);
    }, []);

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    // 侧边栏宽度样式
    const widthClass = isCollapsed ? 'w-20' : 'w-96';

    return (
        <div className={`${widthClass} flex-shrink-0 border-r border-slate-700 bg-paper flex flex-col h-full transition-all duration-300 relative`}>
            {/* 折叠按钮 */}
            <button 
                onClick={toggleCollapse}
                className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-700 text-slate-300 rounded-full p-1 border border-slate-600 hover:bg-indigo-600 hover:text-white z-20 shadow-lg transition-colors"
                title={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
            >
                <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>

            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex flex-col gap-2 shrink-0">
                <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
                    {!isCollapsed && <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary truncate">{t('app.name')}</h1>}
                    {isCollapsed && <span className="text-2xl">⚡️</span>}

                    {user && !isCollapsed && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowAnnouncements(true)} className="text-slate-400 hover:text-white" title={t('sidebar.announcements')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                            </button>
                            <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-white" title={t('sidebar.settings')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            </button>
                            <button onClick={onLogout} className="text-xs text-slate-500 hover:text-white">{t('sidebar.logout')}</button>
                        </div>
                    )}
                </div>
                
                {/* 仅在展开时显示会员卡片详情 */}
                {user && userStats && !isCollapsed && (
                    <div className="mt-3 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col gap-2 relative overflow-hidden group">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${userStats.isVip ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'bg-slate-500'}`}></div>
                                <span className={`text-xs font-bold ${userStats.isVip ? 'text-yellow-400' : 'text-slate-400'}`}>
                                    {userStats.isVip ? 'VIP会员' : '普通用户'}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                                {userStats.tokens.toLocaleString()} Tokens
                            </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full w-[40%]"></div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowPricing(true)} className="flex-1 text-[10px] bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-1 rounded hover:brightness-110 transition-all font-bold">💎 充值</button>
                             <button onClick={() => setShowGuestbook(true)} className="flex-1 text-[10px] bg-slate-700 text-slate-300 py-1 rounded hover:bg-slate-600 transition-all font-bold">💬 留言</button>
                        </div>
                    </div>
                )}
                
                {/* 折叠时显示的简洁图标栏 */}
                {isCollapsed && user && (
                    <div className="flex flex-col gap-3 items-center mt-2">
                         <button onClick={() => setShowPricing(true)} className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center hover:scale-110 transition-transform" title="充值">💎</button>
                         <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 transition-transform" title="设置">⚙️</button>
                         <button onClick={onLogout} className="w-8 h-8 rounded-full bg-slate-700 text-red-400 flex items-center justify-center hover:bg-slate-600 transition-transform" title="登出">🚪</button>
                    </div>
                )}

                {user && !userStats && !isCollapsed && <div className="text-xs text-slate-500 text-center">加载用户信息...</div>}
                
                {!user && !isCollapsed && (
                    <button onClick={onShowAuthModal} className="w-full text-xs text-white bg-primary hover:bg-indigo-500 px-3 py-2 rounded mt-2">
                        {t('sidebar.login')}
                    </button>
                )}
                 {!user && isCollapsed && (
                    <button onClick={onShowAuthModal} className="w-8 h-8 mx-auto bg-primary text-white rounded-full flex items-center justify-center mt-2" title="登录">
                        Login
                    </button>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
                
                {/* Projects Button */}
                <button onClick={onShowProjectList} className={`w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 hover:border-indigo-500 text-indigo-200 hover:text-white rounded-xl flex items-center ${isCollapsed ? 'justify-center py-3' : 'justify-center gap-2 py-3'} font-bold transition-all shadow-md group`} title="我的作品库">
                    <span className="text-xl group-hover:scale-110 transition-transform">📂</span>
                    {!isCollapsed && <span>{t('sidebar.projects')} ({projectCount})</span>}
                </button>

                {/* Prompt Lib Button */}
                <button onClick={() => setShowPromptLib(true)} className={`w-full bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg font-medium transition-all ${isCollapsed ? 'py-3 flex justify-center' : 'py-2 text-xs'}`} title="提示词库">
                    {isCollapsed ? <span className="text-lg">📚</span> : `📚 ${t('sidebar.prompts')}`}
                </button>

                {/* Archives Toggle */}
                <div className={`flex ${isCollapsed ? 'flex-col gap-2' : 'space-x-2'} bg-dark p-1 rounded-lg`}>
                    <button onClick={() => setShowCardHistory(false)} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center ${!showCardHistory ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`} title="存档列表">
                         {isCollapsed ? '📑' : t('sidebar.archives')}
                    </button>
                    <button onClick={() => setShowCardHistory(true)} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center ${showCardHistory ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`} title="脑洞卡片">
                         {isCollapsed ? '💡' : `${t('sidebar.cards')} (${savedCardsCount})`}
                    </button>
                </div>

                {/* 复杂内容区域 - 仅在未折叠且未显示卡片历史时显示 */}
                {!isCollapsed && !showCardHistory && (
                    <div className="animate-fade-in">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('sidebar.archives')}</h3>
                                <button onClick={onResetArchive} className="text-xs text-primary hover:text-indigo-400">+ 新建</button>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                {archives.map(archive => (
                                    <div key={archive.id} onClick={() => onLoadArchive(archive)} className={`group flex justify-between items-center px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${currentArchiveId === archive.id ? 'bg-primary/20 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                                        <span className="truncate">{archive.title}</span>
                                        <button onClick={(e) => onDeleteArchive(archive.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400">×</button>
                                    </div>
                                ))}
                                {archives.length === 0 && <div className="text-xs text-slate-500 text-center py-2">无存档 (请登录后查看)</div>}
                            </div>
                        </div>

                        <div className="border-t border-slate-700 pt-4 mt-4">
                            <div className="mb-4">
                                <label className="block text-xs text-slate-500 mb-1">当前对话存档名称</label>
                                <div className="flex gap-2">
                                    <input value={currentArchiveTitle} onChange={(e) => setCurrentArchiveTitle(e.target.value)} className="bg-black/20 border border-slate-700 rounded px-2 py-1 text-sm w-full outline-none focus:border-primary" />
                                    <Button size="sm" onClick={onSaveArchive} isLoading={isSavingArchive} variant="secondary">{t('btn.save')}</Button>
                                </div>
                            </div>
                            <NovelSettingsForm 
                                settings={settings} 
                                onChange={setSettings} 
                                onGenerateIdea={onGenerateIdea} 
                                isGenerating={isGenerating} 
                                loadedFromArchive={currentArchiveId ? currentArchiveTitle : undefined} 
                            />
                        </div>

                        <div className="space-y-3 pb-4 mt-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">工作流 (Workflow)</h3>
                            <Button variant={currentStep === WorkflowStep.OUTLINE ? 'primary' : 'ghost'} className="w-full justify-start" onClick={onGenerateOutline} disabled={isGenerating}>📝 生成大纲</Button>
                            <Button variant={currentStep === WorkflowStep.CHARACTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={onGenerateCharacter} disabled={isGenerating}>👤 生成人设</Button>
                            <Button variant={currentStep === WorkflowStep.CHAPTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={onGenerateChapter} disabled={isGenerating}>🚀 撰写正文</Button>
                        </div>
                    </div>
                )}
                
                {/* 折叠模式下的替代图标 */}
                {isCollapsed && !showCardHistory && (
                     <div className="flex flex-col gap-4 items-center animate-fade-in text-slate-400">
                        <div className="w-full border-t border-slate-700 my-2"></div>
                        <button onClick={onResetArchive} className="hover:text-white" title="新建存档">+</button>
                        <button onClick={onGenerateOutline} className="hover:text-white" title="生成大纲">📝</button>
                        <button onClick={onGenerateCharacter} className="hover:text-white" title="生成人设">👤</button>
                        <button onClick={onGenerateChapter} className="hover:text-white" title="撰写正文">🚀</button>
                     </div>
                )}
            </div>
            
            {showPromptLib && <PromptLibraryModal onClose={() => setShowPromptLib(false)} />}
            {showSettings && <UserSettingsModal onClose={() => setShowSettings(false)} />}
            {showPricing && <PricingModal onClose={() => setShowPricing(false)} onSuccess={refreshUserStats} />}
            {showGuestbook && <GuestbookModal onClose={() => setShowGuestbook(false)} />}
            {showAnnouncements && <AnnouncementModal onClose={() => setShowAnnouncements(false)} />}
        </div>
    );
};
