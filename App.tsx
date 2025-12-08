
import React, { useState } from 'react';
import { LogViewer } from './components/LogViewer';
import { AuthForm } from './components/AuthForm';
import { ProjectIDE } from './components/ProjectIDE';
import { Dashboard } from './components/Dashboard';
import { WorkflowStep, ChatMessage, Role, Project, IdeaCard } from './types';
import { DEFAULT_NOVEL_SETTINGS } from './constants';
import { apiService } from './services/geminiService';
import { SettingsProvider } from './contexts/SettingsContext';
import { useAuthSession } from './hooks/useAuthSession';

export default function App() {
    // 使用自定义 Hook 管理 Session 和基础数据
    const { 
        user, isCheckingAuth, archives, setArchives, savedCards, setSavedCards, 
        projectList, setProjectList, handleLoginSuccess, handleLogout, loadUserData 
    } = useAuthSession();

    // UI States (Local to App router)
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCardHistory, setShowCardHistory] = useState(false);
    const [showProjectList, setShowProjectList] = useState(false);
    const [selectedCard, setSelectedCard] = useState<IdeaCard | null>(null);
    
    // Project / IDE State
    const [currentProject, setCurrentProject] = useState<Project | null>(null);

    // Generation State (Shared)
    const [settings, setSettings] = useState(DEFAULT_NOVEL_SETTINGS);
    const [currentStep, setCurrentStep] = useState<WorkflowStep>(WorkflowStep.IDEA);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [draftCards, setDraftCards] = useState<Partial<IdeaCard>[]>([]);

    // Archive State
    const [currentArchiveId, setCurrentArchiveId] = useState<string | undefined>(undefined);
    const [currentArchiveTitle, setCurrentArchiveTitle] = useState('新小说计划');
    const [isSavingArchive, setIsSavingArchive] = useState(false);

    // --- Core Actions ---

    const addToHistory = (role: Role, content: string, isError = false) => {
        setHistory(prev => [...prev, { id: Date.now().toString(), role, content, timestamp: Date.now(), isError }]);
    };

    const handleGeneration = async (step: WorkflowStep, desc: string, context?: string, refs?: any, model?: string) => {
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
        setIsSavingArchive(true);
        try {
            const res = await apiService.saveArchive(title, settings, historySnapshot, id);
            if (!id) {
                setCurrentArchiveId(res.id); setArchives(prev => [res, ...prev]);
            } else {
                setArchives(prev => prev.map(a => a.id === id ? { ...a, title, settings, history: historySnapshot } : a));
            }
        } catch (e: any) { if (e.message === "Unauthorized") { handleLogout(); setShowAuthModal(true); } } 
        finally { setIsSavingArchive(false); }
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

    const loadArchive = (a: any) => {
        setCurrentArchiveId(a.id); setCurrentArchiveTitle(a.title); setSettings(a.settings || DEFAULT_NOVEL_SETTINGS); setHistory(a.history || []);
    };

    const resetArchive = () => {
        setCurrentArchiveId(undefined); setCurrentArchiveTitle(`新小说 ${new Date().toLocaleDateString()}`); setSettings(DEFAULT_NOVEL_SETTINGS); setHistory([]); setGeneratedContent('');
    };

    const handleDeleteProject = async (pid: string) => {
        await apiService.deleteProject(pid);
        setProjectList(prev => prev.filter(p => p.id !== pid)); // Optimistic
        loadUserData(); // Refresh to be safe
    };

    if (isCheckingAuth) return null;

    return (
        <SettingsProvider>
            <div className="flex h-screen bg-dark text-slate-900 dark:text-slate-200 transition-colors duration-300">
                {currentProject ? (
                    <ProjectIDE 
                        project={currentProject} 
                        onBack={() => { setCurrentProject(null); loadUserData(); }} 
                    />
                ) : (
                    <Dashboard 
                        user={user}
                        archives={archives}
                        savedCards={savedCards}
                        projectList={projectList}
                        settings={settings}
                        setSettings={setSettings}
                        currentArchiveId={currentArchiveId}
                        currentArchiveTitle={currentArchiveTitle}
                        setCurrentArchiveTitle={setCurrentArchiveTitle}
                        history={history}
                        generatedContent={generatedContent}
                        draftCards={draftCards}
                        isGenerating={isGenerating}
                        currentStep={currentStep}
                        
                        showCardHistory={showCardHistory}
                        setShowCardHistory={setShowCardHistory}
                        showProjectList={showProjectList}
                        setShowProjectList={setShowProjectList}
                        selectedCard={selectedCard}
                        setSelectedCard={setSelectedCard}

                        onLogout={handleLogout}
                        onShowAuthModal={() => setShowAuthModal(true)}
                        onLoadArchive={loadArchive}
                        onDeleteArchive={async (id, e) => { e.stopPropagation(); await apiService.deleteArchive(id); setArchives(prev => prev.filter(a => a.id !== id)); }}
                        onResetArchive={resetArchive}
                        onSaveArchive={() => saveArchive(currentArchiveId, currentArchiveTitle)}
                        isSavingArchive={isSavingArchive}
                        
                        onGenerateIdea={(c, r, m) => handleGeneration(r ? WorkflowStep.ANALYSIS_IDEA : WorkflowStep.IDEA, r ? "分析生成" : "创意脑洞", c, r, m)}
                        onGenerateOutline={() => handleGeneration(WorkflowStep.OUTLINE, "生成大纲", history.slice(-1)[0]?.content)}
                        onGenerateCharacter={() => handleGeneration(WorkflowStep.CHARACTER, "生成人设")}
                        onGenerateChapter={() => handleGeneration(WorkflowStep.CHAPTER, "撰写正文", history.slice(-1)[0]?.content)}
                        
                        onSelectCard={setSelectedCard}
                        onDeleteCard={handleDeleteCard}
                        onSaveCard={handleSaveCard}
                        
                        onProjectCreated={async () => { await loadUserData(); const projs = await apiService.getProjects(); if (projs.length) setCurrentProject(projs[0]); }}
                        onSelectProject={(p) => { setShowProjectList(false); setCurrentProject(p); }}
                        onDeleteProject={handleDeleteProject}
                    />
                )}

                {showAuthModal && <AuthForm onLoginSuccess={(u) => { handleLoginSuccess(u); setShowAuthModal(false); }} onClose={() => setShowAuthModal(false)} />}
                <LogViewer />
            </div>
        </SettingsProvider>
    );
}
