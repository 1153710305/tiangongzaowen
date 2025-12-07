
import React, { useState, useEffect } from 'react';
import { LogViewer } from './components/LogViewer';
import { AuthForm } from './components/AuthForm';
import { IdeaCardDetailModal } from './components/IdeaCardDetailModal'; 
import { ProjectIDE } from './components/ProjectIDE'; 
import { ProjectListModal } from './components/ProjectListModal'; 
import { AppSidebar } from './components/layout/AppSidebar';
import { AppMainContent } from './components/layout/AppMainContent';
import { NovelSettings, WorkflowStep, ChatMessage, Role, User, Archive, ReferenceNovel, IdeaCard, Project } from './types';
import { DEFAULT_NOVEL_SETTINGS } from './constants';
import { apiService } from './services/geminiService';
import { logger } from './services/loggerService';
import { authService } from './services/authService';

export default function App() {
    // 状态定义
    const [user, setUser] = useState<User | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [settings, setSettings] = useState<NovelSettings>(DEFAULT_NOVEL_SETTINGS);
    const [currentStep, setCurrentStep] = useState<WorkflowStep>(WorkflowStep.IDEA);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [archives, setArchives] = useState<Archive[]>([]);
    const [currentArchiveId, setCurrentArchiveId] = useState<string | undefined>(undefined);
    const [currentArchiveTitle, setCurrentArchiveTitle] = useState<string>('新小说计划');
    const [isSaving, setIsSaving] = useState(false);
    const [savedCards, setSavedCards] = useState<IdeaCard[]>([]);
    const [draftCards, setDraftCards] = useState<Partial<IdeaCard>[]>([]);
    const [showCardHistory, setShowCardHistory] = useState(false);
    const [selectedCard, setSelectedCard] = useState<IdeaCard | null>(null);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [projectList, setProjectList] = useState<Project[]>([]);
    const [showProjectList, setShowProjectList] = useState(false);

    // 初始化加载
    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) { setUser(currentUser); loadUserData(); }
        setIsCheckingAuth(false);
    }, []);

    const loadUserData = async () => {
        await Promise.all([apiService.getArchives().then(setArchives), apiService.getIdeaCards().then(setSavedCards), apiService.getProjects().then(setProjectList)]);
    };

    // 核心业务逻辑
    const addToHistory = (role: Role, content: string, isError = false) => {
        setHistory(prev => [...prev, { id: Date.now().toString(), role, content, timestamp: Date.now(), isError }]);
    };

    const handleGeneration = async (step: WorkflowStep, desc: string, context?: string, refs?: ReferenceNovel[], model?: string) => {
        if (isGenerating) return;
        if (!user) { setShowAuthModal(true); return; }
        setIsGenerating(true); setCurrentStep(step); setGeneratedContent(''); setDraftCards([]);
        addToHistory(Role.USER, `开始任务：${desc}`);
        try {
            const finalContent = await apiService.generateStream(
                settings, step, context || '', refs, (chunk) => setGeneratedContent(prev => prev + chunk), undefined, model
            );
            if (step === WorkflowStep.IDEA || step === WorkflowStep.ANALYSIS_IDEA) {
                try {
                    const parsed = JSON.parse(finalContent);
                    if (Array.isArray(parsed)) setDraftCards(parsed);
                } catch(e) {}
            } 
            addToHistory(Role.MODEL, finalContent);
            setGeneratedContent('');
            if (currentArchiveId && step !== WorkflowStep.IDEA) {
                saveArchive(currentArchiveId, currentArchiveTitle, [...history, { id: Date.now().toString(), role: Role.MODEL, content: finalContent, timestamp: Date.now() }]);
            }
        } catch (error: any) {
            addToHistory(Role.SYSTEM, `❌ 失败: ${error.message}`, true);
            if (error.message.includes("Unauthorized")) { handleLogout(); setShowAuthModal(true); }
        } finally { setIsGenerating(false); }
    };

    const saveArchive = async (id: string | undefined, title: string, historySnapshot = history) => {
        if (!user) { setShowAuthModal(true); return; }
        setIsSaving(true);
        try {
            const res = await apiService.saveArchive(title, settings, historySnapshot, id);
            if (!id) {
                setCurrentArchiveId(res.id); setArchives(prev => [res, ...prev]);
            } else {
                setArchives(prev => prev.map(a => a.id === id ? { ...a, title, settings, history: historySnapshot } : a));
            }
        } catch (e: any) { if (e.message === "Unauthorized") { handleLogout(); setShowAuthModal(true); } } 
        finally { setIsSaving(false); }
    };

    const handleSaveCard = async (draft: Partial<IdeaCard>) => {
        if (!user) { setShowAuthModal(true); return; }
        try {
            const newCard = await apiService.saveIdeaCard({ ...draft, title: draft.title || '未命名' } as any);
            setSavedCards(prev => [newCard, ...prev]); setDraftCards(prev => prev.filter(d => d.title !== draft.title));
        } catch (e: any) { if (e.message === "Unauthorized") { handleLogout(); setShowAuthModal(true); } }
    };

    const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); if(!confirm("删除?")) return;
        await apiService.deleteIdeaCard(id); setSavedCards(prev => prev.filter(c => c.id !== id));
    };

    const loadArchive = (a: Archive) => {
        setCurrentArchiveId(a.id); setCurrentArchiveTitle(a.title); setSettings(a.settings || DEFAULT_NOVEL_SETTINGS); setHistory(a.history || []);
    };

    const resetArchive = () => {
        setCurrentArchiveId(undefined); setCurrentArchiveTitle(`新小说 ${new Date().toLocaleDateString()}`); setSettings(DEFAULT_NOVEL_SETTINGS); setHistory([]); setGeneratedContent('');
    };

    const handleDeleteProject = async (pid: string) => {
        await apiService.deleteProject(pid); setProjectList(prev => prev.filter(p => p.id !== pid));
    };

    const handleLogout = () => {
        authService.logout(); setUser(null); setHistory([]); setArchives([]); setSavedCards([]); setProjectList([]); setCurrentArchiveId(undefined);
    };

    if (isCheckingAuth) return null;

    return (
        <div className="flex h-screen bg-dark text-slate-200 font-sans">
            {currentProject ? (
                <ProjectIDE project={currentProject} onBack={() => setCurrentProject(null)} />
            ) : (
                <>
                    <AppSidebar 
                        user={user} projectCount={projectList.length} savedCardsCount={savedCards.length}
                        showCardHistory={showCardHistory} setShowCardHistory={setShowCardHistory}
                        onShowProjectList={() => setShowProjectList(true)} onLogout={handleLogout} onShowAuthModal={() => setShowAuthModal(true)}
                        archives={archives} currentArchiveId={currentArchiveId} currentArchiveTitle={currentArchiveTitle}
                        setCurrentArchiveTitle={setCurrentArchiveTitle} onLoadArchive={loadArchive} onDeleteArchive={async (id, e) => { e.stopPropagation(); await apiService.deleteArchive(id); setArchives(prev => prev.filter(a => a.id !== id)); }}
                        onResetArchive={resetArchive} onSaveArchive={() => saveArchive(currentArchiveId, currentArchiveTitle)} isSavingArchive={isSaving}
                        settings={settings} setSettings={setSettings} isGenerating={isGenerating} currentStep={currentStep}
                        onGenerateIdea={(c, r, m) => handleGeneration(r ? WorkflowStep.ANALYSIS_IDEA : WorkflowStep.IDEA, r ? "分析生成" : "创意脑洞", c, r, m)}
                        onGenerateOutline={() => handleGeneration(WorkflowStep.OUTLINE, "生成大纲", history.slice(-1)[0]?.content)}
                        onGenerateCharacter={() => handleGeneration(WorkflowStep.CHARACTER, "生成人设")}
                        onGenerateChapter={() => handleGeneration(WorkflowStep.CHAPTER, "撰写正文", history.slice(-1)[0]?.content)}
                    />

                    <AppMainContent 
                        showCardHistory={showCardHistory} savedCards={savedCards} onSelectCard={setSelectedCard} onDeleteCard={handleDeleteCard}
                        user={user} history={history} generatedContent={generatedContent} draftCards={draftCards} onSaveCard={handleSaveCard}
                    />

                    {selectedCard && <IdeaCardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} onProjectCreated={async () => { await loadUserData(); const projs = await apiService.getProjects(); if (projs.length) setCurrentProject(projs[0]); }} />}
                    {showProjectList && <ProjectListModal projects={projectList} onClose={() => setShowProjectList(false)} onSelectProject={p => { setShowProjectList(false); setCurrentProject(p); }} onDeleteProject={handleDeleteProject} />}
                </>
            )}

            {/* Global Components */}
            {showAuthModal && <AuthForm onLoginSuccess={(u) => { setUser(u); setShowAuthModal(false); loadUserData(); }} onClose={() => setShowAuthModal(false)} />}
            <LogViewer />
        </div>
    );
}
