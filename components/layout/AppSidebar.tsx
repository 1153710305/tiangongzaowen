
import React, { useState } from 'react';
import { NovelSettingsForm } from '../NovelSettingsForm';
import { Button } from '../Button';
import { User, Archive, WorkflowStep, NovelSettings, ReferenceNovel, IdeaCard } from '../../types';
import { PromptLibraryModal } from '../PromptLibraryModal';
import { UserSettingsModal } from '../UserSettingsModal';
import { useSettings } from '../../contexts/SettingsContext';

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
    const { t } = useSettings();

    return (
        <div className="w-96 flex-shrink-0 border-r border-slate-700 bg-paper flex flex-col h-full transition-colors duration-300">
            <div className="p-4 border-b border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">{t('app.name')}</h1>
                    {user ? (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-white" title={t('sidebar.settings')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            </button>
                            <button onClick={onLogout} className="text-xs text-slate-500 hover:text-white">{t('sidebar.logout')}</button>
                        </div>
                    ) : (
                        <button onClick={onShowAuthModal} className="text-xs text-white bg-primary hover:bg-indigo-500 px-3 py-1 rounded">{t('sidebar.login')}</button>
                    )}
                </div>
                <p className="text-slate-500 text-xs">{t('app.slogan')} v2.9.8</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <button onClick={onShowProjectList} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 hover:border-indigo-500 text-indigo-200 hover:text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md group">
                    <span className="text-xl group-hover:scale-110 transition-transform">📂</span>{t('sidebar.projects')} ({projectCount})
                </button>

                <button onClick={() => setShowPromptLib(true)} className="w-full bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white py-2 rounded-lg text-xs font-medium transition-all">
                    📚 {t('sidebar.prompts')}
                </button>

                <div className="flex space-x-2 bg-dark p-1 rounded-lg">
                    <button onClick={() => setShowCardHistory(false)} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${!showCardHistory ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>{t('sidebar.archives')}</button>
                    <button onClick={() => setShowCardHistory(true)} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${showCardHistory ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}>{t('sidebar.cards')} ({savedCardsCount})</button>
                </div>

                {!showCardHistory && (
                    <>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('sidebar.archives')}</h3>
                                <button onClick={onResetArchive} className="text-xs text-primary hover:text-indigo-400">+ 新建</button>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                {archives.map(archive => (
                                    <div key={archive.id} onClick={() => onLoadArchive(archive)} className={`group flex justify-between items-center px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${currentArchiveId === archive.id ? 'bg-primary/20 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                                        <span className="truncate">{archive.title}</span>
                                        <button onClick={(e) => onDeleteArchive(archive.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400">×</button>
                                    </div>
                                ))}
                                {archives.length === 0 && <div className="text-xs text-slate-500 text-center py-2">无存档 (请登录后查看)</div>}
                            </div>
                        </div>

                        <div className="border-t border-slate-700 pt-4">
                            <div className="mb-4">
                                <label className="block text-xs text-slate-500 mb-1">当前对话存档名称</label>
                                <div className="flex gap-2">
                                    <input value={currentArchiveTitle} onChange={(e) => setCurrentArchiveTitle(e.target.value)} className="bg-black/20 border border-slate-700 rounded px-2 py-1 text-sm w-full outline-none focus:border-primary" />
                                    <Button size="sm" onClick={onSaveArchive} isLoading={isSavingArchive} variant="secondary">{t('btn.save')}</Button>
                                </div>
                            </div>
                            <NovelSettingsForm settings={settings} onChange={setSettings} onGenerateIdea={onGenerateIdea} isGenerating={isGenerating} loadedFromArchive={currentArchiveId ? currentArchiveTitle : undefined} />
                        </div>

                        <div className="space-y-3 pb-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">工作流 (Workflow)</h3>
                            <Button variant={currentStep === WorkflowStep.OUTLINE ? 'primary' : 'ghost'} className="w-full justify-start" onClick={onGenerateOutline} disabled={isGenerating}>📝 生成大纲</Button>
                            <Button variant={currentStep === WorkflowStep.CHARACTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={onGenerateCharacter} disabled={isGenerating}>👤 生成人设</Button>
                            <Button variant={currentStep === WorkflowStep.CHAPTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={onGenerateChapter} disabled={isGenerating}>🚀 撰写正文</Button>
                        </div>
                    </>
                )}
            </div>
            
            {showPromptLib && <PromptLibraryModal onClose={() => setShowPromptLib(false)} />}
            {showSettings && <UserSettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
};
