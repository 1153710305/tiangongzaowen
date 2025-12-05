
import React, { useState, useRef, useEffect } from 'react';
import { NovelSettingsForm } from './components/NovelSettingsForm';
import { Button } from './components/Button';
import { LogViewer } from './components/LogViewer';
import { AuthForm } from './components/AuthForm'; // New
import { 
    NovelSettings, 
    WorkflowStep, 
    ChatMessage, 
    Role, 
    User,
    Archive 
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
    
    // 自动滚动引用
    const contentEndRef = useRef<HTMLDivElement>(null);

    // === 初始化 ===
    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            loadArchives(); // 加载存档
        }
        setIsCheckingAuth(false);
    }, []);

    // 加载存档列表
    const loadArchives = async () => {
        const list = await apiService.getArchives();
        setArchives(list);
    };

    // 滚动到底部
    useEffect(() => {
        contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [generatedContent, history]);

    // === 核心业务逻辑 ===

    const addToHistory = (role: Role, content: string) => {
        setHistory(prev => [...prev, {
            id: Date.now().toString(),
            role,
            content,
            timestamp: Date.now()
        }]);
    };

    /**
     * 统一生成处理函数
     */
    const handleGeneration = async (step: WorkflowStep, description: string, context?: string) => {
        if (isGenerating) return;
        setIsGenerating(true);
        setCurrentStep(step);
        setGeneratedContent(''); // 清空当前展示区
        
        addToHistory(Role.USER, `开始任务：${description}${context && step === WorkflowStep.IDEA ? ` (灵感: ${context})` : ''}`);
        logger.info(`启动任务: ${description} [${step}]`);

        try {
            const finalContent = await apiService.generateStream(
                settings, 
                step, 
                context || '', 
                (chunk) => {
                    setGeneratedContent(prev => prev + chunk);
                }
            );

            addToHistory(Role.MODEL, finalContent);
            setGeneratedContent(''); 
            logger.info(`任务完成: ${description}`);
            
            // 自动保存
            if (currentArchiveId) {
                saveArchive(currentArchiveId, currentArchiveTitle, [...history, {
                    id: Date.now().toString(), role: Role.MODEL, content: finalContent, timestamp: Date.now()
                }]);
            }
        } catch (error) {
            logger.error(`生成出错: ${description}`, error);
            addToHistory(Role.SYSTEM, `❌ 生成失败: ${error instanceof Error ? error.message : '请检查后端服务是否启动'}`);
            if (error instanceof Error && error.message.includes("登录")) {
                handleLogout();
            }
        } finally {
            setIsGenerating(false);
        }
    };

    // 保存存档
    const saveArchive = async (id: string | undefined, title: string, historySnapshot = history) => {
        setIsSaving(true);
        try {
            const res = await apiService.saveArchive(title, settings, historySnapshot, id);
            if (!id) {
                // 新建成功，更新ID和列表
                setCurrentArchiveId(res.id);
                setArchives(prev => [res, ...prev]);
                logger.info("新存档已创建");
            } else {
                logger.info("存档已更新");
                // 手动更新本地列表状态，确保标题修改等立即生效
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
        // 增加兜底逻辑，防止脏数据导致 undefined 错误
        setSettings(archive.settings || DEFAULT_NOVEL_SETTINGS);
        setHistory(archive.history || []);
        setGeneratedContent('');
        logger.info(`加载存档: ${archive.title}`);
    };

    // 新建存档
    const resetArchive = () => {
        setCurrentArchiveId(undefined);
        setCurrentArchiveTitle(`新小说 ${new Date().toLocaleDateString()}`);
        setSettings(DEFAULT_NOVEL_SETTINGS);
        setHistory([]);
        setGeneratedContent('');
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
    
    // 修改：支持接收自定义 Context (用于一句话脑洞)
    const generateIdea = (customContext?: string) => {
        const desc = customContext ? "基于灵感发散脑洞" : "基于配置生成创意脑洞";
        // 如果有 customContext，将其作为 context 参数传递给 handleGeneration
        handleGeneration(WorkflowStep.IDEA, desc, customContext);
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

    // === 登录回调 ===
    const handleLoginSuccess = (u: User) => {
        setUser(u);
        loadArchives();
    };

    // === 登出处理 ===
    const handleLogout = () => {
        // 1. 清除本地存储
        authService.logout();
        
        // 2. 清除应用状态
        setUser(null);
        setHistory([]);
        setArchives([]);
        setSettings(DEFAULT_NOVEL_SETTINGS);
        setCurrentArchiveId(undefined);
        setCurrentArchiveTitle('新小说计划');
        setGeneratedContent('');
        
        logger.info("用户已安全退出");
    };

    if (isCheckingAuth) return null;

    if (!user) {
        return <AuthForm onLoginSuccess={handleLoginSuccess} />;
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
                    <p className="text-slate-500 text-xs">V2.0 企业版 (SQLite + JWT)</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* 存档列表 */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">我的存档</h3>
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
                            {archives.length === 0 && <p className="text-xs text-slate-600 italic px-2">暂无历史存档</p>}
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
                </div>
            </div>

            {/* 主内容区 */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* 顶部工具栏 (移动端适配) */}
                <div className="md:hidden p-4 border-b border-slate-700 bg-paper flex justify-between items-center">
                    <span className="font-bold text-primary">天工造文</span>
                </div>

                {/* 消息/内容列表区 */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                    {history.length === 0 && !generatedContent && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                            <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            <p>请在左侧配置小说设定并开始创作...</p>
                        </div>
                    )}

                    {history.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-4xl w-full p-4 rounded-xl ${
                                msg.role === Role.USER 
                                    ? 'bg-primary/20 border border-primary/30 ml-12' 
                                    : msg.role === Role.SYSTEM
                                        ? 'bg-red-900/20 border border-red-500/30'
                                        : 'bg-paper border border-slate-700 mr-12'
                            }`}>
                                <div className="flex items-center mb-2 pb-2 border-b border-slate-600/50">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        msg.role === Role.USER ? 'text-primary' : 'text-secondary'
                                    }`}>
                                        {msg.role === Role.USER ? 'USER' : 'AI AUTHOR'}
                                    </span>
                                    <span className="ml-auto text-xs text-slate-500">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="prose prose-invert prose-slate max-w-none">
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
                                        <span className="w-2 h-2 bg-secondary rounded-full mr-2 animate-ping"></span>
                                        云端正在创作中...
                                    </span>
                                </div>
                                <div className="prose prose-invert prose-slate max-w-none">
                                    <ReactMarkdown>{generatedContent}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={contentEndRef} />
                </div>
            </div>

            <LogViewer />
        </div>
    );
}
