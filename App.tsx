
import React, { useState, useRef, useEffect } from 'react';
import { NovelSettingsForm } from './components/NovelSettingsForm';
import { Button } from './components/Button';
import { LogViewer } from './components/LogViewer';
import { AuthForm } from './components/AuthForm';
import { IdeaCardDetailModal } from './components/IdeaCardDetailModal'; // 新增
import { ProjectWorkspace } from './components/ProjectWorkspace'; // 新增
import { 
    NovelSettings, 
    WorkflowStep, 
    ChatMessage, 
    Role, 
    User,
    Archive,
    ReferenceNovel,
    IdeaCard,
    NovelProject
} from './types';
import { 
    DEFAULT_NOVEL_SETTINGS 
} from './constants';
import { apiService } from './services/geminiService';
import { logger } from './services/loggerService';
import { authService } from './services/authService';
import ReactMarkdown from 'react-markdown';

export default function App() {
    // === 用户与认证 ===
    const [user, setUser] = useState<User | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // === 状态管理 ===
    const [settings, setSettings] = useState<NovelSettings>(DEFAULT_NOVEL_SETTINGS);
    const [currentStep, setCurrentStep] = useState<WorkflowStep>(WorkflowStep.IDEA);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // 内容区状态
    const [generatedContent, setGeneratedContent] = useState<string>(''); // 当前显示的生成内容
    const [history, setHistory] = useState<ChatMessage[]>([]); // 历史记录
    
    // 存档管理
    const [archives, setArchives] = useState<Archive[]>([]);
    const [currentArchiveId, setCurrentArchiveId] = useState<string | undefined>(undefined);
    const [currentArchiveTitle, setCurrentArchiveTitle] = useState<string>('新小说计划');
    const [isSaving, setIsSaving] = useState(false);

    // === 脑洞卡片状态 ===
    const [savedCards, setSavedCards] = useState<IdeaCard[]>([]);
    const [draftCards, setDraftCards] = useState<Partial<IdeaCard>[]>([]); // 生成后待保存的卡片
    // 侧边栏视图模式: 'archives'(旧存档) | 'cards'(卡片库) | 'projects'(项目库)
    const [sidebarView, setSidebarView] = useState<'archives' | 'cards' | 'projects'>('archives'); 
    
    // 脑洞详情弹窗
    const [selectedCard, setSelectedCard] = useState<IdeaCard | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // === v2.7 项目管理状态 ===
    const [projects, setProjects] = useState<NovelProject[]>([]);
    const [currentProject, setCurrentProject] = useState<NovelProject | null>(null);
    const [isCreatingProject, setIsCreatingProject] = useState(false);

    // 自动滚动引用
    const contentEndRef = useRef<HTMLDivElement>(null);

    // === 初始化 ===
    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            loadArchives(); 
            loadCards(); 
            loadProjects(); // v2.7
        }
        setIsCheckingAuth(false);
    }, []);

    // 数据加载函数
    const loadArchives = async () => { setArchives(await apiService.getArchives()); };
    const loadCards = async () => { setSavedCards(await apiService.getIdeaCards()); };
    const loadProjects = async () => { setProjects(await apiService.getProjects()); };

    // 滚动到底部
    useEffect(() => {
        contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [generatedContent, history, draftCards]);

    // === 核心业务逻辑 ===

    const addToHistory = (role: Role, content: string, isError: boolean = false) => {
        setHistory(prev => [...prev, {
            id: Date.now().toString(),
            role,
            content,
            timestamp: Date.now(),
            isError
        }]);
    };

    const extractJsonArray = (text: string): any[] | null => {
        try {
            return JSON.parse(text);
        } catch (e) {
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
                const jsonStr = text.substring(start, end + 1);
                try {
                    const result = JSON.parse(jsonStr);
                    if (Array.isArray(result)) return result;
                } catch (err) {}
            }
            return null;
        }
    };

    /**
     * 统一生成处理函数
     */
    const handleGeneration = async (step: WorkflowStep, description: string, context?: string, references?: ReferenceNovel[]) => {
        if (isGenerating) return;
        setIsGenerating(true);
        setCurrentStep(step);
        setGeneratedContent('');
        setDraftCards([]); 
        
        let logMsg = `开始任务：${description}`;
        if (context && step === WorkflowStep.IDEA) logMsg += ` (灵感: ${context})`;

        addToHistory(Role.USER, logMsg);
        logger.info(`启动任务: ${description} [${step}]`);

        try {
            const finalContent = await apiService.generateStream(
                settings, 
                step, 
                context || '', 
                references,
                (chunk) => {
                    setGeneratedContent(prev => prev + chunk);
                }
            );

            if (step === WorkflowStep.IDEA || step === WorkflowStep.ANALYSIS_IDEA) {
                const parsed = extractJsonArray(finalContent);
                if (parsed && parsed.length > 0) {
                    setDraftCards(parsed);
                    logger.info("成功解析脑洞卡片", { count: parsed.length });
                    addToHistory(Role.SYSTEM, `✅ 脑洞生成完毕！共生成 ${parsed.length} 个创意，已自动整理为卡片格式，请在下方查看并保存心仪的方案。`);
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
        } catch (error) {
            logger.error(`生成出错: ${description}`, error);
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            addToHistory(Role.SYSTEM, `❌ 生成失败: ${errorMsg}`, true);
        } finally {
            setIsGenerating(false);
        }
    };

    // 保存单个脑洞卡片
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
            logger.info("卡片已保存");
        } catch (e) {
            alert('保存失败，请重试');
        }
    };

    // 打开脑洞详情
    const openCardDetail = (card: IdeaCard) => {
        setSelectedCard(card);
        setIsModalOpen(true);
    };

    // 从脑洞创建项目
    const handleCreateProject = async (card: IdeaCard) => {
        setIsCreatingProject(true);
        try {
            const newProject = await apiService.createProjectFromCard(card);
            setProjects(prev => [newProject, ...prev]); // 更新项目列表
            
            setIsModalOpen(false); // 关闭卡片弹窗
            
            // 自动加载详情并进入项目视图
            const fullProject = await apiService.fetchProjectDetail(newProject.id);
            if (fullProject) setCurrentProject(fullProject);
            
            logger.info("项目创建成功", newProject.title);
        } catch (e) {
            alert('立项失败，请重试');
        } finally {
            setIsCreatingProject(false);
        }
    };

    // 删除脑洞卡片
    const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(!confirm("确定删除这张灵感卡片吗？")) return;
        await apiService.deleteIdeaCard(id);
        setSavedCards(prev => prev.filter(c => c.id !== id));
    };

    // 进入项目
    const enterProject = async (projectSummary: NovelProject) => {
        // 先加载完整详情（包含文件夹结构）
        const detail = await apiService.fetchProjectDetail(projectSummary.id);
        if (detail) setCurrentProject(detail);
    };

    // === Archive Logic ===
    const saveArchive = async (id: string | undefined, title: string, historySnapshot = history) => {
        setIsSaving(true);
        try {
            const res = await apiService.saveArchive(title, settings, historySnapshot, id);
            if (!id) {
                setCurrentArchiveId(res.id);
                setArchives(prev => [res, ...prev]);
            } else {
                setArchives(prev => prev.map(a => a.id === id ? { ...a, title, settings, history: historySnapshot } : a));
            }
        } catch (e) {} finally { setIsSaving(false); }
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

    // Auth Handlers
    const handleLoginSuccess = (u: User) => {
        setUser(u);
        loadArchives();
        loadCards();
        loadProjects();
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        setHistory([]);
        setArchives([]);
        setSavedCards([]);
        setProjects([]);
        setCurrentProject(null);
    };

    if (isCheckingAuth) return null;
    if (!user) return <AuthForm onLoginSuccess={handleLoginSuccess} />;

    // === 渲染逻辑分支：如果当前选中了项目，渲染项目工作台 ===
    if (currentProject) {
        return <ProjectWorkspace project={currentProject} onBack={() => setCurrentProject(null)} />;
    }

    // === 默认视图：创作工作台 (旧版/脑洞版) ===
    return (
        <div className="flex h-screen bg-dark text-slate-200 font-sans">
            {/* 左侧边栏 */}
            <div className="w-80 flex-shrink-0 border-r border-slate-700 bg-[#161b22] flex flex-col h-full">
                <div className="p-4 border-b border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                         <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            天工造文
                        </h1>
                        <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-white transition-colors">
                            退出
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* 视图切换 Tabs */}
                    <div className="flex space-x-1 bg-dark p-1 rounded-lg text-[10px] font-bold">
                        <button 
                            onClick={() => setSidebarView('archives')}
                            className={`flex-1 py-1.5 rounded transition-all ${sidebarView === 'archives' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            历史对话
                        </button>
                        <button 
                            onClick={() => setSidebarView('cards')}
                            className={`flex-1 py-1.5 rounded transition-all ${sidebarView === 'cards' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            脑洞库 ({savedCards.length})
                        </button>
                        <button 
                            onClick={() => setSidebarView('projects')}
                            className={`flex-1 py-1.5 rounded transition-all ${sidebarView === 'projects' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            项目 ({projects.length})
                        </button>
                    </div>

                    {/* 视图 A: 存档列表 + 生成配置 */}
                    {sidebarView === 'archives' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                 <h3 className="text-xs text-slate-400 uppercase">当前对话会话</h3>
                                 <button onClick={resetArchive} className="text-xs text-primary">+ 新对话</button>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 mb-4">
                                {archives.map(archive => (
                                    <div 
                                        key={archive.id}
                                        onClick={() => loadArchive(archive)}
                                        className={`px-3 py-2 rounded text-sm cursor-pointer truncate ${currentArchiveId === archive.id ? 'bg-primary/20 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        {archive.title}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="border-t border-slate-700 pt-4">
                                <NovelSettingsForm 
                                    settings={settings} 
                                    onChange={setSettings} 
                                    onGenerateIdea={(ctx, refs) => handleGeneration(
                                        refs ? WorkflowStep.ANALYSIS_IDEA : WorkflowStep.IDEA, 
                                        "生成创意", 
                                        ctx, refs
                                    )}
                                    isGenerating={isGenerating}
                                    loadedFromArchive={currentArchiveId ? currentArchiveTitle : undefined}
                                />
                            </div>
                        </div>
                    )}

                    {/* 视图 B: 脑洞卡片库 */}
                    {sidebarView === 'cards' && (
                        <div className="space-y-3 animate-fade-in pb-10">
                            {savedCards.map(card => (
                                <div key={card.id} 
                                     onClick={() => openCardDetail(card)}
                                     className="bg-paper border border-slate-700 rounded-lg p-3 relative group hover:border-pink-500/50 transition-colors cursor-pointer"
                                >
                                    <button 
                                        onClick={(e) => handleDeleteCard(card.id, e)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                                    >
                                        ×
                                    </button>
                                    <h4 className="font-bold text-pink-400 text-sm mb-1 truncate">{card.title}</h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-2">{card.intro}</p>
                                </div>
                            ))}
                             {savedCards.length === 0 && <div className="text-center text-slate-500 text-xs">暂无卡片</div>}
                        </div>
                    )}

                    {/* 视图 C: 项目列表 (v2.7) */}
                    {sidebarView === 'projects' && (
                        <div className="space-y-3 animate-fade-in">
                            {projects.map(p => (
                                <div key={p.id} 
                                     onClick={() => enterProject(p)}
                                     className="bg-paper border border-slate-700 rounded-lg p-3 hover:border-green-500/50 transition-colors cursor-pointer flex justify-between items-center"
                                >
                                    <div>
                                        <h4 className="font-bold text-green-400 text-sm mb-1">{p.title}</h4>
                                        <p className="text-[10px] text-slate-500">更新: {new Date(p.updated_at).toLocaleDateString()}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </div>
                            ))}
                            {projects.length === 0 && (
                                <div className="text-center text-slate-500 text-xs py-4 border border-dashed border-slate-700 rounded">
                                    暂无项目<br/>请从“脑洞库”中选择卡片立项
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 主内容区 (聊天/生成模式) */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth">
                    {/* 历史消息渲染 (同前) */}
                    {history.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-4xl w-full p-4 rounded-xl ${
                                msg.role === Role.USER ? 'bg-primary/20 border-primary/30 ml-12' : 
                                msg.role === Role.SYSTEM ? 'bg-green-900/20 text-xs' : 'bg-paper border-slate-700 mr-12'
                            } border`}>
                                <div className="prose prose-invert prose-slate max-w-none text-sm">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* 流式内容 */}
                    {generatedContent && (
                        <div className="max-w-4xl w-full p-4 rounded-xl bg-paper border border-pink-500/30 font-mono text-xs">
                            {generatedContent}
                        </div>
                    )}

                    {/* 待保存的 Draft Cards */}
                    {draftCards.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                            {draftCards.map((draft, idx) => (
                                <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative group hover:border-pink-500 transition-colors">
                                    <h3 className="text-lg font-bold text-white mb-2">{draft.title}</h3>
                                    <p className="text-xs text-slate-300 mb-4 line-clamp-3">{draft.intro}</p>
                                    <Button onClick={() => handleSaveCard(draft)} size="sm" variant="secondary" className="w-full text-xs">收藏此脑洞</Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div ref={contentEndRef} />
                </div>
            </div>

            {/* 弹窗组件 */}
            <IdeaCardDetailModal 
                card={selectedCard}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreateProject={handleCreateProject}
                isCreating={isCreatingProject}
            />

            <LogViewer />
        </div>
    );
}
