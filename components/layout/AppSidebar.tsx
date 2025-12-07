
import React, { useState } from 'react';
import { NovelSettingsForm } from '../NovelSettingsForm';
import { Button } from '../Button';
import { User, Archive, WorkflowStep, NovelSettings, ReferenceNovel, IdeaCard } from '../../types';
import { PromptLibraryModal } from '../PromptLibraryModal';

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
    onGenerateIdea: (ctx?: string, refs?: ReferenceNovel[]) => void;
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

    return (
        <div className="w-96 flex-shrink-0 border-r border-slate-700 bg-[#161b22] flex flex-col h-full">
            <div className="p-4 border-b border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">天工造文</h1>
                    {user ? (
                        <button onClick={onLogout} className="text-xs text-slate-500 hover:text-white">退出 ({user.username})</button>
                    ) : (
                        <button onClick={onShowAuthModal} className="text-xs text-white bg-primary hover:bg-indigo-500 px-3 py-1 rounded">登录 / 注册</button>
                    )}
                </div>
                <p className="text-slate-500 text-xs">V2.8 IDE 环境加强版</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <button onClick={onShowProjectList} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 hover:border-indigo-500 text-indigo-200 hover:text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md group">
                    <span className="text-xl group-hover:scale-110 transition-transform">📂</span>我的作品库 ({projectCount})
                </button>

                <button onClick={() => setShowPromptLib(true)} className="w-full bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white py-2 rounded-lg text-xs font-medium transition-all">
                    📚 管理我的提示词库
                </button>

                <div className="flex space-x-2 bg-dark p-1 rounded-lg">
                    <button onClick={() => setShowCardHistory(false)} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${!showCardHistory ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>我的存档</button>
                    <button onClick={() => setShowCardHistory(true)} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${showCardHistory ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}>脑洞卡片库 ({savedCardsCount})</button>
                </div>

                {!showCardHistory && (
                    <>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">对话存档列表</h3>
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
                                    <Button size="sm" onClick={onSaveArchive} isLoading={isSavingArchive} variant="secondary">保存</Button>
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
        </div>
    );
};
