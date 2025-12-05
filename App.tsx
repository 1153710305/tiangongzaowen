
import React, { useState, useRef, useEffect } from 'react';
import { NovelSettingsForm } from './components/NovelSettingsForm';
import { Button } from './components/Button';
import { LogViewer } from './components/LogViewer';
import { 
    NovelSettings, 
    WorkflowStep, 
    ChatMessage, 
    Role 
} from './types';
import { 
    DEFAULT_NOVEL_SETTINGS 
} from './constants';
// 现在使用的是重构后的 ApiService (虽然名字还是 geminiService，但内部已改为 API 调用)
import { apiService } from './services/geminiService';
import { logger } from './services/loggerService';
import ReactMarkdown from 'react-markdown';

export default function App() {
    // === 状态管理 ===
    const [settings, setSettings] = useState<NovelSettings>(DEFAULT_NOVEL_SETTINGS);
    const [currentStep, setCurrentStep] = useState<WorkflowStep>(WorkflowStep.IDEA);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // 内容区状态
    const [generatedContent, setGeneratedContent] = useState<string>(''); // 当前显示的生成内容
    const [history, setHistory] = useState<ChatMessage[]>([]); // 历史记录
    
    // 自动滚动引用
    const contentEndRef = useRef<HTMLDivElement>(null);

    // === 辅助函数 ===
    
    const addToHistory = (role: Role, content: string) => {
        setHistory(prev => [...prev, {
            id: Date.now().toString(),
            role,
            content,
            timestamp: Date.now()
        }]);
    };

    // 滚动到底部
    useEffect(() => {
        contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [generatedContent, history]);

    // === 核心业务逻辑 ===

    /**
     * 统一生成处理函数
     * @param step 工作流步骤
     * @param description 任务描述（用于日志）
     * @param context 可选的上下文（如前文概要）
     */
    const handleGeneration = async (step: WorkflowStep, description: string, context?: string) => {
        if (isGenerating) return;
        setIsGenerating(true);
        setCurrentStep(step);
        setGeneratedContent(''); // 清空当前展示区
        
        // 记录用户操作到历史
        addToHistory(Role.USER, `开始任务：${description}`);
        logger.info(`启动任务: ${description} [${step}]`);

        try {
            // 使用流式生成，现在不需要在前端传递 Prompt，只传递配置和步骤
            const finalContent = await apiService.generateStream(
                settings, 
                step, 
                context || '', 
                (chunk) => {
                    setGeneratedContent(prev => prev + chunk);
                }
            );

            // 生成完成后，保存到历史记录
            addToHistory(Role.MODEL, finalContent);
            setGeneratedContent(''); 
            
            logger.info(`任务完成: ${description}`);
        } catch (error) {
            logger.error(`生成出错: ${description}`, error);
            addToHistory(Role.SYSTEM, `❌ 生成失败: ${error instanceof Error ? error.message : '请检查后端服务是否启动'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // 1. 生成创意
    const generateIdea = () => {
        handleGeneration(WorkflowStep.IDEA, "生成创意脑洞");
    };

    // 2. 生成大纲
    const generateOutline = () => {
        // 获取最近一次 AI 生成的内容作为上下文
        const context = history.filter(h => h.role === Role.MODEL).slice(-1)[0]?.content || "用户未提供具体创意";
        handleGeneration(WorkflowStep.OUTLINE, "生成黄金三章大纲", context);
    };

    // 3. 生成人设
    const generateCharacter = () => {
        handleGeneration(WorkflowStep.CHARACTER, "生成人设小传");
    };

    // 4. 生成正文
    const generateChapter = () => {
        // 提取最后一次大纲内容作为上下文
        const context = history.filter(h => h.role === Role.MODEL).slice(-1)[0]?.content || "无大纲上下文";
        handleGeneration(WorkflowStep.CHAPTER, "撰写正文章节", context);
    };

    // === 界面渲染 ===

    return (
        <div className="flex h-screen bg-dark text-slate-200 font-sans">
            {/* 左侧边栏：配置区 */}
            <div className="w-96 flex-shrink-0 border-r border-slate-700 bg-[#161b22] p-4 overflow-y-auto hidden md:block">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        天工造文
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">AI 爆款小说生成器 (CS架构版)</p>
                </div>
                
                <NovelSettingsForm 
                    settings={settings} 
                    onChange={setSettings} 
                    onGenerateIdea={generateIdea}
                    isGenerating={isGenerating}
                />

                <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">工作流 (Workflow)</h3>
                    <Button 
                        variant={currentStep === WorkflowStep.OUTLINE ? 'primary' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={generateOutline}
                        disabled={isGenerating}
                    >
                        📝 生成大纲 (Outline)
                    </Button>
                    <Button 
                        variant={currentStep === WorkflowStep.CHARACTER ? 'primary' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={generateCharacter}
                        disabled={isGenerating}
                    >
                        👤 生成人设 (Character)
                    </Button>
                    <Button 
                        variant={currentStep === WorkflowStep.CHAPTER ? 'primary' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={generateChapter}
                        disabled={isGenerating}
                    >
                        🚀 撰写正文 (Write)
                    </Button>
                </div>
                
                <div className="mt-8 pt-4 border-t border-slate-700 text-xs text-slate-500">
                    <p>状态：已连接云端服务器</p>
                    <p className="mt-2">Core: Hono (Node.js) + Gemini Stream</p>
                </div>
            </div>

            {/* 主内容区：输出展示 */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* 顶部工具栏 (移动端适配) */}
                <div className="md:hidden p-4 border-b border-slate-700 bg-paper flex justify-between items-center">
                    <span className="font-bold text-primary">天工造文</span>
                    <button className="text-slate-400">设置</button>
                </div>

                {/* 消息/内容列表区 */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                    {history.length === 0 && !generatedContent && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                            <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            <p>请在左侧配置小说设定并开始创作...</p>
                            <p className="text-sm mt-2 font-mono bg-slate-800 p-1 rounded px-2">提示：需启动 server/index.ts 后端服务</p>
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
                                        {msg.role === Role.USER ? 'USER (指令)' : 'AI AUTHOR (云端生成)'}
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

                    {/* 实时生成流显示区 */}
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

            {/* 日志组件 */}
            <LogViewer />
        </div>
    );
}
