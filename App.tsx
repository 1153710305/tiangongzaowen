
import React, { useState, useRef, useEffect } from 'react';
import { NovelSettingsForm } from './components/NovelSettingsForm';
import { Button } from './components/Button';
import { LogViewer } from './components/LogViewer';
import { AuthForm } from './components/AuthForm';
import { IdeaCardDetailModal } from './components/IdeaCardDetailModal'; // 新增
import { ProjectIDE } from './components/ProjectIDE'; // 新增
import { 
    NovelSettings, 
    WorkflowStep, 
    ChatMessage, 
    Role, 
    User,
    Archive,
    ReferenceNovel,
    IdeaCard,
    Project
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

    // 脑洞卡片状态
    const [savedCards, setSavedCards] = useState<IdeaCard[]>([]);
    const [draftCards, setDraftCards] = useState<Partial<IdeaCard>[]>([]); // 生成后待保存的卡片
    const [showCardHistory, setShowCardHistory] = useState(false); // 是否显示历史卡片库
    
    // === V2.7 新增：卡片详情与 IDE 项目状态 ===
    const [selectedCard, setSelectedCard] = useState<IdeaCard | null>(null); // 当前选中的卡片(用于弹窗)
    const [currentProject, setCurrentProject] = useState<Project | null>(null); // 当前打开的 IDE 项目
    const [projectList, setProjectList] = useState<Project[]>([]); // 项目列表(可选，暂未在UI展示列表，只展示IDE入口)

    // 自动滚动引用
    const contentEndRef = useRef<HTMLDivElement>(null);

    // === 初始化 ===
    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            loadArchives(); // 加载存档
            loadCards(); // 加载卡片
            loadProjects(); // 加载项目
        }
        setIsCheckingAuth(false);
    }, []);

    // 加载存档列表
    const loadArchives = async () => {
        const list = await apiService.getArchives();
        setArchives(list);
    };

    // 加载卡片列表
    const loadCards = async () => {
        const cards = await apiService.getIdeaCards();
        setSavedCards(cards);
    };

    // 加载项目列表
    const loadProjects = async () => {
        const projs = await apiService.getProjects();
        setProjectList(projs);
    };

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

    /**
     * 智能提取 JSON
     */
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
        if (references && step === WorkflowStep.ANALYSIS_IDEA) logMsg += ` (参考: ${references.map(r=>r.title).join(',')})`;

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
                    logger.warn("未识别到有效的 JSON 数组，回退到文本展示");
                    addToHistory(Role.MODEL, finalContent);
                }
                setGeneratedContent(''); 
            } else {
                addToHistory(Role.MODEL, finalContent);
                setGeneratedContent(''); 
            }
            
            logger.info(`任务完成: ${description}`);
            
            if (currentArchiveId && (step !== WorkflowStep.IDEA && step !== WorkflowStep.ANALYSIS_IDEA)) {
                saveArchive(currentArchiveId, currentArchiveTitle, [...history, {
                    id: Date.now().toString(), role: Role.MODEL, content: finalContent, timestamp: Date.now()
                }]);
            }
        } catch (error) {
            logger.error(`生成出错: ${description}`, error);
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            addToHistory(Role.SYSTEM, `❌ 生成失败: ${errorMsg}`, true);
            
            if (errorMsg.includes("登录") || errorMsg.includes("Unauthorized")) {
                handleLogout();
            }
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

    // 删除脑洞卡片
    const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止触发卡片详情
        if(!confirm("确定删除这张灵感卡片吗？")) return;
        await apiService.deleteIdeaCard(id);
        setSavedCards(prev => prev.filter(c => c.id !== id));
    };

    // 保存存档
    const saveArchive = async (id: string | undefined, title: string, historySnapshot = history) => {
        setIsSaving(true);
        try {
            const res = await apiService.saveArchive(title, settings, historySnapshot, id);
            if (!id) {
                setCurrentArchiveId(res.id);
                setArchives(prev => [res, ...prev]);
                const newArchive = { ...res, title, settings, history: historySnapshot };
                setArchives(prev => prev.map(a => a.id === res.id ? newArchive : a));
                logger.info("新存档已创建");
            } else {
                logger.info("存档已更新");
                setArchives(prev => prev.map(a => a.id === id ? { ...a, title, settings, history: historySnapshot } : a));
            }
        } catch (e) {
            logger.error("保存失败", e);
        } finally {
            setIsSaving(false);
        }
    };

    // 加载存档
    const loadArchive = (archive: Archive) => {
        setCurrentArchiveId(archive.id);
        setCurrentArchiveTitle(archive.title);
        setSettings(archive.settings || DEFAULT_NOVEL_SETTINGS);
        setHistory(archive.history || []);
        setGeneratedContent('');
        setDraftCards([]);
        logger.info(`加载存档: ${archive.title}`);
    };

    // 新建存档
    const resetArchive = () => {
        setCurrentArchiveId(undefined);
        setCurrentArchiveTitle(`新小说 ${new Date().toLocaleDateString()}`);
        setSettings(DEFAULT_NOVEL_SETTINGS);
        setHistory([]);
        setGeneratedContent('');
        setDraftCards([]);
    };

    // 删除存档
    const deleteArchive = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(!confirm("确定要删除这个存档吗？")) return;
        await apiService.deleteArchive(id);
        setArchives(prev => prev.filter(a => a.id !== id));
        if (currentArchiveId === id) resetArchive();
    };

    // === 生成操作入口 ===
    const generateIdea = (customContext?: string, references?: ReferenceNovel[]) => {
        if (references && references.length > 0) {
             handleGeneration(WorkflowStep.ANALYSIS_IDEA, "分析爆款并生成创意", undefined, references);
        } else if (customContext) {
            handleGeneration(WorkflowStep.IDEA, "基于灵感发散脑洞", customContext);
        } else {
            handleGeneration(WorkflowStep.IDEA, "基于参数生成创意脑洞");
        }
    };
    const generateOutline = () => {
        const context = history.filter(h => h.role === Role.MODEL).slice(-1)[0]?.content || "用户未提供具体创意";
        handleGeneration(WorkflowStep.OUTLINE, "生成黄金三章大纲", context);
    };
    const generateCharacter = () => handleGeneration(WorkflowStep.CHARACTER, "生成人设小传");
    const generateChapter = () => {
        const context = history.filter(h => h.role === Role.MODEL).slice(-1)[0]?.content || "无大纲上下文";
        handleGeneration(WorkflowStep.CHAPTER, "撰写正文章节", context);
    };

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
        setProjectList([]);
        setSettings(DEFAULT_NOVEL_SETTINGS);
        setCurrentArchiveId(undefined);
        setCurrentArchiveTitle('新小说计划');
        setGeneratedContent('');
        logger.info("用户已安全退出");
    };

    // 处理 IDE 项目创建后的回调
    const handleProjectCreated = async () => {
        await loadProjects();
        // 自动打开最新的项目
        const projs = await apiService.getProjects();
        if (projs.length > 0) {
            setCurrentProject(projs[0]);
        }
    };

    if (isCheckingAuth) return null;
    if (!user) return <AuthForm onLoginSuccess={handleLoginSuccess} />;

    // 如果处于 Project IDE 模式，渲染 IDE 组件
    if (currentProject) {
        return <ProjectIDE project={currentProject} onBack={() => setCurrentProject(null)} />;
    }

    return (
        <div className="flex h-screen bg-dark text-slate-200 font-sans">
            {/* 左侧边栏：配置区 */}
            <div className="w-96 flex-shrink-0 border-r border-slate-700 bg-[#161b22] flex flex-col h-full">
                <div className="p-4 border-b border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                         <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            天工造文
                        </h1>
                        <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-white transition-colors">
                            退出 ({user.username})
                        </button>
                    </div>
                    <p className="text-slate-500 text-xs">V2.7 IDE 环境加强版</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* 快捷导航：存档 vs 卡片库 */}
                    <div className="flex space-x-2 bg-dark p-1 rounded-lg">
                        <button 
                            onClick={() => setShowCardHistory(false)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${!showCardHistory ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            我的存档
                        </button>
                        <button 
                            onClick={() => setShowCardHistory(true)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${showCardHistory ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            脑洞卡片库 ({savedCards.length})
                        </button>
                    </div>

                    {/* 视图 A: 存档列表 + 生成配置 */}
                    {!showCardHistory && (
                        <>
                            {/* IDE 项目快速入口 (新增) */}
                            {projectList.length > 0 && (
                                <div className="mb-4 bg-slate-800 rounded-lg p-3 border border-slate-700">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">IDE 项目 (最近)</h3>
                                    <div className="space-y-2">
                                        {projectList.slice(0, 3).map(p => (
                                            <div 
                                                key={p.id} 
                                                onClick={() => setCurrentProject(p)}
                                                className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 p-1.5 rounded transition-colors text-sm"
                                            >
                                                <span className="text-pink-400">⚡</span>
                                                <span className="truncate flex-1">{p.title}</span>
                                                <span className="text-[10px] text-slate-500">进入</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">对话存档列表</h3>
                                     <button onClick={resetArchive} className="text-xs text-primary hover:text-indigo-400">+ 新建</button>
                                </div>
                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {archives.map(archive => (
                                        <div 
                                            key={archive.id}
                                            onClick={() => loadArchive(archive)}
                                            className={`group flex justify-between items-center px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                                                currentArchiveId === archive.id ? 'bg-primary/20 text-white' : 'text-slate-400 hover:bg-slate-800'
                                            }`}
                                        >
                                            <span className="truncate">{archive.title}</span>
                                            <button 
                                                onClick={(e) => deleteArchive(archive.id, e)}
                                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-700 pt-4">
                                <div className="mb-4">
                                    <label className="block text-xs text-slate-500 mb-1">当前项目名称</label>
                                    <div className="flex gap-2">
                                        <input 
                                            value={currentArchiveTitle}
                                            onChange={(e) => setCurrentArchiveTitle(e.target.value)}
                                            className="bg-black/20 border border-slate-700 rounded px-2 py-1 text-sm w-full outline-none focus:border-primary"
                                        />
                                        <Button size="sm" onClick={() => saveArchive(currentArchiveId, currentArchiveTitle)} isLoading={isSaving} variant="secondary">
                                            保存
                                        </Button>
                                    </div>
                                </div>

                                <NovelSettingsForm 
                                    settings={settings} 
                                    onChange={setSettings} 
                                    onGenerateIdea={generateIdea}
                                    isGenerating={isGenerating}
                                    loadedFromArchive={currentArchiveId ? currentArchiveTitle : undefined}
                                />
                            </div>

                            <div className="space-y-3 pb-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">工作流 (Workflow)</h3>
                                <Button variant={currentStep === WorkflowStep.OUTLINE ? 'primary' : 'ghost'} className="w-full justify-start" onClick={generateOutline} disabled={isGenerating}>
                                    📝 生成大纲 (Outline)
                                </Button>
                                <Button variant={currentStep === WorkflowStep.CHARACTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={generateCharacter} disabled={isGenerating}>
                                    👤 生成人设 (Character)
                                </Button>
                                <Button variant={currentStep === WorkflowStep.CHAPTER ? 'primary' : 'ghost'} className="w-full justify-start" onClick={generateChapter} disabled={isGenerating}>
                                    🚀 撰写正文 (Write)
                                </Button>
                            </div>
                        </>
                    )}

                    {/* 视图 B: 历史脑洞卡片库 */}
                    {showCardHistory && (
                        <div className="space-y-4 animate-fade-in">
                            {savedCards.map(card => (
                                <div 
                                    key={card.id} 
                                    onClick={() => setSelectedCard(card)} // 点击打开详情弹窗
                                    className="bg-paper border border-slate-700 rounded-lg p-3 relative group hover:border-pink-500/50 transition-colors cursor-pointer"
                                >
                                    <button 
                                        onClick={(e) => handleDeleteCard(card.id, e)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 z-10"
                                        title="删除卡片"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                    <h4 className="font-bold text-pink-400 text-sm mb-1">{card.title}</h4>
                                    <p className="text-xs text-slate-400 line-clamp-3 mb-2">{card.intro}</p>
                                    <div className="flex gap-1 flex-wrap">
                                        <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">查看详情</span>
                                    </div>
                                </div>
                            ))}
                            {savedCards.length === 0 && (
                                <div className="text-center text-slate-500 py-10 text-xs">
                                    暂无收藏的脑洞卡片。<br/>去"生成创意"中挑选心仪的灵感吧！
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 主内容区 */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="md:hidden p-4 border-b border-slate-700 bg-paper flex justify-between items-center">
                    <span className="font-bold text-primary">天工造文</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                    {/* 空状态提示 */}
                    {history.length === 0 && !generatedContent && draftCards.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                            <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            <p>请在左侧配置小说设定并开始创作...</p>
                        </div>
                    )}

                    {/* 历史消息 */}
                    {history.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-4xl w-full p-4 rounded-xl ${
                                msg.role === Role.USER 
                                    ? 'bg-primary/20 border border-primary/30 ml-12' 
                                    : msg.role === Role.SYSTEM
                                        ? `bg-green-900/20 border ${msg.isError ? 'border-red-500/30' : 'border-green-500/30'}` 
                                        : 'bg-paper border border-slate-700 mr-12'
                            }`}>
                                <div className="flex items-center mb-2 pb-2 border-b border-slate-600/50">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        msg.role === Role.USER ? 'text-primary' : (msg.role === Role.SYSTEM ? (msg.isError ? 'text-red-400' : 'text-green-400') : 'text-secondary')
                                    }`}>
                                        {msg.role === Role.USER ? 'USER' : (msg.role === Role.SYSTEM ? 'SYSTEM' : 'AI AUTHOR')}
                                    </span>
                                    <span className="ml-auto text-xs text-slate-500">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className={`prose prose-invert prose-slate max-w-none ${msg.isError ? 'text-red-300' : ''}`}>
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* 流式生成内容区 */}
                    {generatedContent && (
                        <div className="flex justify-start animate-pulse">
                            <div className="max-w-4xl w-full p-4 rounded-xl bg-paper border border-secondary/50 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                                <div className="flex items-center mb-2 pb-2 border-b border-slate-600/50">
                                    <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center">
                                        <span className="w-2 h-2 bg-secondary rounded-full mr-2 animate-ping"></span>
                                        AI 正在构思中...
                                    </span>
                                </div>
                                <div className="prose prose-invert prose-slate max-w-none font-mono text-xs">
                                    {generatedContent}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 待选脑洞卡片区 */}
                    {draftCards.length > 0 && (
                        <div className="flex flex-col gap-4 max-w-4xl">
                            <div className="flex items-center gap-2 text-pink-400 font-bold">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                AI 生成了以下脑洞方案，请点击保存您喜欢的创意：
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {draftCards.map((draft, idx) => (
                                    <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col relative overflow-hidden group hover:border-pink-500 transition-colors">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-purple-600"></div>
                                        <h3 className="text-xl font-bold text-white mb-2">{draft.title}</h3>
                                        <p className="text-sm text-slate-300 mb-4 flex-1">{draft.intro}</p>
                                        
                                        <div className="space-y-2 mb-4 text-xs">
                                            <div className="bg-black/20 p-2 rounded border border-slate-700/50">
                                                <span className="text-indigo-400 font-bold block mb-1">🔥 核心爽点</span>
                                                <span className="text-slate-400">{draft.highlight}</span>
                                            </div>
                                            <div className="bg-black/20 p-2 rounded border border-slate-700/50">
                                                <span className="text-red-400 font-bold block mb-1">💣 开篇爆点</span>
                                                <span className="text-slate-400">{draft.explosive_point}</span>
                                            </div>
                                        </div>
                                        
                                        <Button 
                                            onClick={() => handleSaveCard(draft)}
                                            className="w-full mt-auto"
                                            size="sm"
                                            variant="secondary"
                                        >
                                            💾 收藏此脑洞到卡片库
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div ref={contentEndRef} />
                </div>
            </div>

            {/* 脑洞卡片详情弹窗 */}
            {selectedCard && (
                <IdeaCardDetailModal 
                    card={selectedCard} 
                    onClose={() => setSelectedCard(null)} 
                    onProjectCreated={handleProjectCreated}
                />
            )}

            <LogViewer />
        </div>
    );
}
