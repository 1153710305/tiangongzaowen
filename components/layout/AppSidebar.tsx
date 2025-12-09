import React, { useState, useEffect } from 'react';
import { NovelSettingsForm } from '../NovelSettingsForm';
import { Button } from '../Button';
import { User, Archive, WorkflowStep, NovelSettings, ReferenceNovel } from '../../types';
import { PromptLibraryModal } from '../PromptLibraryModal';
import { UserSettingsModal } from '../UserSettingsModal';
import { PricingModal } from '../PricingModal';
import { GuestbookModal } from '../GuestbookModal';
import { AnnouncementModal } from '../AnnouncementModal';
import { UserProfileModal } from '../UserProfileModal';
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
    const [showProfile, setShowProfile] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [latestAnnouncementId, setLatestAnnouncementId] = useState<string | null>(null);

    const { t } = useSettings();

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

    // Check for announcements
    useEffect(() => {
        if (user) {
            apiService.getAnnouncements().then(list => {
                if (list && list.length > 0) {
                    const latest = list[0];
                    setLatestAnnouncementId(latest.id);
                    const lastRead = localStorage.getItem('lastReadAnnouncementId');
                    if (lastRead !== latest.id) {
                        setShowAnnouncements(true);
                    }
                }
            }).catch(e => console.error("Failed to check announcements", e));
        }
    }, [user]);

    const handleCloseAnnouncements = () => {
        setShowAnnouncements(false);
        if (latestAnnouncementId) {
            localStorage.setItem('lastReadAnnouncementId', latestAnnouncementId);
        }
    };

    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-96'} flex-shrink-0 border-r border-slate-700 bg-paper flex flex-col h-full transition-all duration-300 relative`}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-12 bg-slate-800 border border-slate-700 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 z-10 shadow-md"
                title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
                <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
            </button>

            <div className="p-4 border-b border-slate-700 overflow-hidden">
                <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center mb-2`}>
                    {!isCollapsed && <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary whitespace-nowrap">{t('app.name')}</h1>}
                    {isCollapsed && <span className="text-xl">🛠️</span>}

                    {!isCollapsed && user ? (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowAnnouncements(true)} className="text-slate-400 hover:text-white" title={t('sidebar.announcements')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                            </button>
                            <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-white" title={t('sidebar.settings')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            </button>
                            <button onClick={onLogout} className="text-xs text-slate-500 hover:text-white whitespace-nowrap">{t('sidebar.logout')}</button>
                        </div>
                    ) : !isCollapsed && (
                        <button onClick={onShowAuthModal} className="text-xs text-white bg-primary hover:bg-indigo-500 px-3 py-1 rounded whitespace-nowrap">{t('sidebar.login')}</button>
                    )}
                </div>

                {/* User Stats / Profile Trigger */}
                {user && (
                    isCollapsed ? (
                        <div className="flex flex-col items-center gap-2 mt-4 cursor-pointer" onClick={() => setShowProfile(true)} title="查看个人信息">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                {user.username[0].toUpperCase()}
                            </div>
                            {userStats?.isVip && <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div>}
                        </div>
                    ) : (
                        userStats && (
                            <div className="mt-3 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col gap-2 relative overflow-hidden group cursor-pointer hover:border-slate-600 transition-colors" onClick={() => setShowProfile(true)}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${userStats.isVip ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'bg-slate-500'}`}></div>
                                        <span className={`text-xs font-bold ${userStats.isVip ? 'text-yellow-400' : 'text-slate-400'}`}>
                                            {userStats.isVip ? '尊贵会员 VIP' : '普通用户'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {userStats.tokens.toLocaleString()} Tokens
                                    </span>
                                </div>

                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full w-[40%]"></div>
                                </div>

                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setShowPricing(true)}
                                        className="flex-1 text-[10px] bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-1 rounded hover:brightness-110 transition-all font-bold shadow-sm"
                                    >
                                        💎 充值
                                    </button>
                                    <button
                                        onClick={() => setShowGuestbook(true)}
                                        className="flex-1 text-[10px] bg-slate-700 text-slate-300 py-1 rounded hover:bg-slate-600 transition-all font-bold shadow-sm"
                                    >
                                        💬 留言
                                    </button>
                                </div>
                            </div>
                        )
                    )
                )}

                {!user && !isCollapsed && <p className="text-slate-500 text-xs mt-2">{t('app.slogan')}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                <button onClick={onShowProjectList} className={`w-full ${isCollapsed ? 'bg-transparent p-0 justify-center' : 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 hover:border-indigo-500 py-3 px-4'} text-indigo-200 hover:text-white rounded-xl flex items-center gap-2 font-bold transition-all shadow-md group`}>
                    <span className="text-xl group-hover:scale-110 transition-transform">📂</span>
                    {!isCollapsed && <span>{t('sidebar.projects')} ({projectCount})</span>}
                </button>

                <button onClick={() => setShowPromptLib(true)} className={`w-full ${isCollapsed ? 'bg-transparent border-0 justify-center' : 'bg-slate-800 border border-slate-700 hover:border-slate-500 py-2'} text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all flex items-center gap-2`}>
                    <span className="text-lg">📚</span>
                    {!isCollapsed && <span>{t('sidebar.prompts')}</span>}
                </button>

                <div className={`flex ${isCollapsed ? 'flex-col space-y-2' : 'space-x-2'} bg-dark p-1 rounded-lg`}>
                    <button onClick={() => setShowCardHistory(false)} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${!showCardHistory ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`} title={t('sidebar.archives')}>
                        <span>🗂️</span> {!isCollapsed && t('sidebar.archives')}
                    </button>
                    <button onClick={() => setShowCardHistory(true)} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${showCardHistory ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`} title={t('sidebar.cards')}>
                        <span>💡</span> {!isCollapsed && `${t('sidebar.cards')} (${savedCardsCount})`}
                    </button>
                </div>

                {!showCardHistory && !isCollapsed && (
                    <>
                        <div className="animate-fade-in">
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

                        <div className="border-t border-slate-700 pt-4 animate-fade-in">
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

                        <div className="space-y-3 pb-4 animate-fade-in">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">工作流 (Workflow)</h3>
                            <Button variant={currentStep === WorkflowStep.OUTLINE ? 'primary' : 'ghost'} className="w-full justify-start" onClick={onGenerateOutline} disabled={isGenerating}>📝 生成大纲</Button>
                            <Button variant={currentStep === WorkflowStep.CHARACTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={onGenerateCharacter} disabled={isGenerating}>👤 生成人设</Button>
                            <Button variant={currentStep === WorkflowStep.CHAPTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={onGenerateChapter} disabled={isGenerating}>🚀 撰写正文</Button>
                        </div>
                    </>
                )}

                {/* Collapsed View Icons */}
                {!showCardHistory && isCollapsed && (
                    <div className="flex flex-col gap-4 items-center animate-fade-in">
                        <button onClick={onResetArchive} className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-primary hover:bg-slate-700" title="新建存档">
                            <span className="text-xl">+</span>
                        </button>
                        <div className="w-full border-t border-slate-700"></div>
                        <button onClick={onGenerateOutline} className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentStep === WorkflowStep.OUTLINE ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`} title="生成大纲">
                            📝
                        </button>
                        <button onClick={onGenerateCharacter} className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentStep === WorkflowStep.CHARACTER ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`} title="生成人设">
                            👤
                        </button>
                        <button onClick={onGenerateChapter} className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentStep === WorkflowStep.CHAPTER ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`} title="撰写正文">
                            🚀
                        </button>
                    </div>
                )}
            </div>

            {showPromptLib && <PromptLibraryModal onClose={() => setShowPromptLib(false)} />}
            {showSettings && <UserSettingsModal onClose={() => setShowSettings(false)} />}
            {showPricing && <PricingModal onClose={() => setShowPricing(false)} onSuccess={refreshUserStats} />}
            {showGuestbook && <GuestbookModal onClose={() => setShowGuestbook(false)} />}
            {showAnnouncements && <AnnouncementModal onClose={handleCloseAnnouncements} />}
            {showProfile && user && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}
        </div>
    );
};
