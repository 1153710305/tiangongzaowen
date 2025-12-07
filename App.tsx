
import React, { useState, useRef, useEffect } from 'react';
import { NovelSettingsForm } from './components/NovelSettingsForm';
import { Button } from './components/Button';
import { LogViewer } from './components/LogViewer';
import { AuthForm } from './components/AuthForm';
import { IdeaCardDetailModal } from './components/IdeaCardDetailModal'; // New
import { NovelWorkspace } from './components/NovelWorkspace'; // New
import { 
    NovelSettings, 
    WorkflowStep, 
    ChatMessage, 
    Role, 
    User,
    Archive,
    ReferenceNovel,
    IdeaCard,
    ViewMode, // New
    Novel // New
} from './types';
import { DEFAULT_NOVEL_SETTINGS } from './constants';
import { apiService } from './services/geminiService';
import { logger } from './services/loggerService';
import { authService } from './services/authService';
import ReactMarkdown from 'react-markdown';

export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const [settings, setSettings] = useState<NovelSettings>(DEFAULT_NOVEL_SETTINGS);
    const [currentStep, setCurrentStep] = useState<WorkflowStep>(WorkflowStep.IDEA);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<string>(''); 
    const [history, setHistory] = useState<ChatMessage[]>([]); 
    
    // 存档与卡片状态
    const [archives, setArchives] = useState<Archive[]>([]);
    const [currentArchiveId, setCurrentArchiveId] = useState<string | undefined>(undefined);
    const [currentArchiveTitle, setCurrentArchiveTitle] = useState<string>('新小说计划');
    const [isSaving, setIsSaving] = useState(false);
    const [savedCards, setSavedCards] = useState<IdeaCard[]>([]);
    const [draftCards, setDraftCards] = useState<Partial<IdeaCard>[]>([]); 
    const [showCardHistory, setShowCardHistory] = useState(false);

    // === 新增状态 (v2.7) ===
    const [viewMode, setViewMode] = useState<ViewMode>('GENERATOR');
    const [selectedCard, setSelectedCard] = useState<IdeaCard | null>(null); // 控制详情弹窗
    const [currentNovel, setCurrentNovel] = useState<Novel | null>(null); // 当前工作台的小说
    const [isInitProject, setIsInitProject] = useState(false);

    const contentEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            loadArchives();
            loadCards();
        }
        setIsCheckingAuth(false);
    }, []);

    const loadArchives = async () => { setArchives(await apiService.getArchives()); };
    const loadCards = async () => { setSavedCards(await apiService.getIdeaCards()); };

    useEffect(() => {
        contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [generatedContent, history, draftCards]);

    const addToHistory = (role: Role, content: string, isError: boolean = false) => {
        setHistory(prev => [...prev, {
            id: Date.now().toString(), role, content, timestamp: Date.now(), isError
        }]);
    };

    const extractJsonArray = (text: string): any[] | null => {
        try { return JSON.parse(text); } catch (e) {
            const start = text.indexOf('['); const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
                try { 
                    const res = JSON.parse(text.substring(start, end + 1)); 
                    if (Array.isArray(res)) return res;
                } catch (err) {}
            }
            return null;
        }
    };

    const handleGeneration = async (step: WorkflowStep, description: string, context?: string, references?: ReferenceNovel[]) => {
        if (isGenerating) return;
        setIsGenerating(true);
        setCurrentStep(step);
        setGeneratedContent('');
        setDraftCards([]); 
        
        let logMsg = `开始任务：${description}`;
        addToHistory(Role.USER, logMsg);

        try {
            const finalContent = await apiService.generateStream(
                settings, step, context || '', references,
                (chunk) => { setGeneratedContent(prev => prev + chunk); }
            );

            if (step === WorkflowStep.IDEA || step === WorkflowStep.ANALYSIS_IDEA) {
                const parsed = extractJsonArray(finalContent);
                if (parsed && parsed.length > 0) {
                    setDraftCards(parsed);
                    addToHistory(Role.SYSTEM, `✅ 脑洞生成完毕！共生成 ${parsed.length} 个创意，已整理为卡片。`);
                } else {
                    addToHistory(Role.MODEL, finalContent);
                }
                setGeneratedContent(''); 
            } else {
                addToHistory(Role.MODEL, finalContent);
                setGeneratedContent(''); 
            }
            
            if (currentArchiveId && (step !== WorkflowStep.IDEA && step !== WorkflowStep.ANALYSIS_IDEA)) {
                saveArchive(currentArchiveId, currentArchiveTitle, [...history, {
                    id: Date.now().toString(), role: Role.MODEL, content: finalContent, timestamp: Date.now()
                }]);
            }
        } catch (error: any) {
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            addToHistory(Role.SYSTEM, `❌ 生成失败: ${errorMsg}`, true);
            if (errorMsg.includes("Unauthorized")) handleLogout();
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveCard = async (draft: Partial<IdeaCard>) => {
        if (!draft.title) return;
        try {
            const newCard = await apiService.saveIdeaCard({
                title: draft.title || '未命名',
                intro: draft.intro || '',
                highlight: draft.highlight || '',
                explosive_point: draft.explosive_point || '',
                golden_finger: draft.golden_finger || ''
            });
            setSavedCards(prev => [newCard, ...prev]);
            setDraftCards(prev => prev.filter(d => d.title !== draft.title));
        } catch (e) { alert('保存失败'); }
    };

    const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(!confirm("确定删除？")) return;
        await apiService.deleteIdeaCard(id);
        setSavedCards(prev => prev.filter(c => c.id !== id));
    };

    const saveArchive = async (id: string | undefined, title: string, historySnapshot = history) => {
        setIsSaving(true);
        try {
            const res = await apiService.saveArchive(title, settings, historySnapshot, id);
            if (!id) {
                setCurrentArchiveId(res.id);
                setArchives(prev => [res, ...prev]);
                const newArchive = { ...res, title, settings, history: historySnapshot };
                setArchives(prev => prev.map(a => a.id === res.id ? newArchive : a));
            } else {
                setArchives(prev => prev.map(a => a.id === id ? { ...a, title, settings, history: historySnapshot } : a));
            }
        } finally { setIsSaving(false); }
    };

    const loadArchive = (archive: Archive) => {
        setCurrentArchiveId(archive.id);
        setCurrentArchiveTitle(archive.title);
        setSettings(archive.settings || DEFAULT_NOVEL_SETTINGS);
        setHistory(archive.history || []);
        setGeneratedContent('');
        setDraftCards([]);
    };

    const resetArchive = () => {
        setCurrentArchiveId(undefined);
        setCurrentArchiveTitle(`新小说 ${new Date().toLocaleDateString()}`);
        setSettings(DEFAULT_NOVEL_SETTINGS);
        setHistory([]);
        setGeneratedContent('');
        setDraftCards([]);
    };

    const deleteArchive = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(!confirm("确定删除？")) return;
        await apiService.deleteArchive(id);
        setArchives(prev => prev.filter(a => a.id !== id));
        if (currentArchiveId === id) resetArchive();
    };

    // === Novel Project Init Logic ===
    const handleInitProject = async (card: IdeaCard) => {
        setIsInitProject(true);
        try {
            const novel = await apiService.initNovelFromCard(card.id, card.title);
            setCurrentNovel(novel);
            setViewMode('WORKSPACE');
            setSelectedCard(null); // 关闭弹窗
        } catch (e) {
            alert("初始化项目失败");
        } finally {
            setIsInitProject(false);
        }
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        setViewMode('GENERATOR');
    };

    if (isCheckingAuth) return null;
    if (!user) return <AuthForm onLoginSuccess={(u) => { setUser(u); loadArchives(); loadCards(); }} />;

    // === View: Novel Workspace ===
    if (viewMode === 'WORKSPACE' && currentNovel) {
        return <NovelWorkspace novel={currentNovel} onBack={() => setViewMode('GENERATOR')} />;
    }

    // === View: Generator ===
    return (
        <div className="flex h-screen bg-dark text-slate-200 font-sans">
            <div className="w-96 flex-shrink-0 border-r border-slate-700 bg-[#161b22] flex flex-col h-full">
                <div className="p-4 border-b border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">天工造文</h1>
                        <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-white">退出</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="flex space-x-2 bg-dark p-1 rounded-lg">
                        <button onClick={() => setShowCardHistory(false)} className={`flex-1 py-1.5 text-xs font-medium rounded ${!showCardHistory ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>我的存档</button>
                        <button onClick={() => setShowCardHistory(true)} className={`flex-1 py-1.5 text-xs font-medium rounded ${showCardHistory ? 'bg-pink-600 text-white' : 'text-slate-400'}`}>脑洞卡片库 ({savedCards.length})</button>
                    </div>

                    {!showCardHistory && (
                        <>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                     <h3 className="text-sm font-bold text-slate-400">项目列表</h3>
                                     <button onClick={resetArchive} className="text-xs text-primary">+ 新建</button>
                                </div>
                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {archives.map(archive => (
                                        <div key={archive.id} onClick={() => loadArchive(archive)} className={`group flex justify-between items-center px-3 py-2 rounded-md text-sm cursor-pointer ${currentArchiveId === archive.id ? 'bg-primary/20 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                                            <span className="truncate">{archive.title}</span>
                                            <button onClick={(e) => deleteArchive(archive.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t border-slate-700 pt-4">
                                <div className="mb-4 flex gap-2">
                                    <input value={currentArchiveTitle} onChange={(e) => setCurrentArchiveTitle(e.target.value)} className="bg-black/20 border border-slate-700 rounded px-2 py-1 text-sm w-full outline-none" />
                                    <Button size="sm" onClick={() => saveArchive(currentArchiveId, currentArchiveTitle)} isLoading={isSaving} variant="secondary">保存</Button>
                                </div>
                                <NovelSettingsForm 
                                    settings={settings} 
                                    onChange={setSettings} 
                                    onGenerateIdea={(ctx, refs) => {
                                        if (refs) handleGeneration(WorkflowStep.ANALYSIS_IDEA, "分析爆款", undefined, refs);
                                        else if (ctx) handleGeneration(WorkflowStep.IDEA, "发散脑洞", ctx);
                                        else handleGeneration(WorkflowStep.IDEA, "生成脑洞");
                                    }}
                                    isGenerating={isGenerating}
                                    loadedFromArchive={currentArchiveId ? currentArchiveTitle : undefined}
                                />
                            </div>
                            <div className="space-y-3 pb-4">
                                <Button variant={currentStep === WorkflowStep.OUTLINE ? 'primary' : 'ghost'} className="w-full justify-start" onClick={() => handleGeneration(WorkflowStep.OUTLINE, "生成大纲", history.slice(-1)[0]?.content)} disabled={isGenerating}>📝 生成大纲</Button>
                                <Button variant={currentStep === WorkflowStep.CHARACTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={() => handleGeneration(WorkflowStep.CHARACTER, "生成人设")} disabled={isGenerating}>👤 生成人设</Button>
                                <Button variant={currentStep === WorkflowStep.CHAPTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={() => handleGeneration(WorkflowStep.CHAPTER, "撰写正文", history.slice(-1)[0]?.content)} disabled={isGenerating}>🚀 撰写正文</Button>
                            </div>
                        </>
                    )}

                    {showCardHistory && (
                        <div className="space-y-4 animate-fade-in">
                            {savedCards.map(card => (
                                <div key={card.id} onClick={() => setSelectedCard(card)} className="bg-paper border border-slate-700 rounded-lg p-3 relative group hover:border-pink-500/50 transition-colors cursor-pointer">
                                    <button onClick={(e) => handleDeleteCard(card.id, e)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs">删除</button>
                                    <h4 className="font-bold text-pink-400 text-sm mb-1">{card.title}</h4>
                                    <p className="text-xs text-slate-400 line-clamp-3 mb-2">{card.intro}</p>
                                    <div className="flex gap-1 flex-wrap">
                                        <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded">查看详情 &gt;</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                    {history.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-4xl w-full p-4 rounded-xl ${msg.role === Role.USER ? 'bg-primary/20 ml-12' : 'bg-paper mr-12'}`}>
                                <div className="text-xs text-slate-500 mb-2">{msg.role}</div>
                                <div className="prose prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                            </div>
                        </div>
                    ))}
                    {generatedContent && <div className="p-4 bg-paper rounded-xl border border-secondary/50 animate-pulse font-mono text-xs whitespace-pre-wrap">{generatedContent}</div>}
                    
                    {draftCards.length > 0 && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {draftCards.map((draft, idx) => (
                                <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col">
                                    <h3 className="text-xl font-bold text-white mb-2">{draft.title}</h3>
                                    <p className="text-sm text-slate-300 mb-4">{draft.intro}</p>
                                    <Button onClick={() => handleSaveCard(draft)} className="mt-auto" size="sm" variant="secondary">💾 收藏脑洞</Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div ref={contentEndRef} />
                </div>
            </div>
            
            {/* Modal */}
            {selectedCard && (
                <IdeaCardDetailModal 
                    card={selectedCard} 
                    onClose={() => setSelectedCard(null)} 
                    onInitProject={handleInitProject}
                    isProcessing={isInitProject}
                />
            )}
            
            <LogViewer />
        </div>
    );
}
