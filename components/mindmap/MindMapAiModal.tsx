import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MindMapNode, WorkflowStep, NovelSettings, Chapter, IdeaCard } from '../../types';
import { Button } from '../Button';
import { PromptSelector } from '../PromptSelector';
import { serializeNodeTree, getAllNodesFlat, findNodeDepth, getNodesAtDepth } from './utils';
import { apiService } from '../../services/geminiService';
import { logger } from '../../services/loggerService';

interface Props {
    projectId: string;
    node: MindMapNode;
    rootNode: MindMapNode;
    mapId: string;
    availableMaps: { id: string, title: string }[];
    novelSettings?: NovelSettings;
    onClose: () => void;
    onApply: (content: string) => void;
    onChapterSaved?: (chapterId: string) => void;
    projectTitle?: string;
    projectIdeaCardId?: string;
}

type TabMode = 'expand' | 'chapter';

export const MindMapAiModal: React.FC<Props> = ({
    projectId, node, rootNode, mapId, availableMaps, novelSettings, onClose, onApply, onChapterSaved, projectTitle, projectIdeaCardId
}) => {
    const [activeTab, setActiveTab] = useState<TabMode>('expand');

    // Common State
    const [aiPrompt, setAiPrompt] = useState<string>('');
    const [aiContent, setAiContent] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Settings
    const [aiModel, setAiModel] = useState('gemini-2.5-flash');
    const [availableModels, setAvailableModels] = useState<{ id: string, name: string }[]>([]);
    const [aiIdentity, setAiIdentity] = useState('');
    const [aiConstraints, setAiConstraints] = useState('');

    // Idea Cards
    const [includeIdeaCards, setIncludeIdeaCards] = useState(true);
    const [ideaCards, setIdeaCards] = useState<IdeaCard[]>([]);

    // Chapter Mode Specific
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [preChapterId, setPreChapterId] = useState<string>('');
    const [nextSiblingId, setNextSiblingId] = useState<string>('');
    const [isChapterSaved, setIsChapterSaved] = useState(false);
    const [wordCount, setWordCount] = useState<number>(2000);

    // Topology State
    const [isChapterNode, setIsChapterNode] = useState(false);
    const [siblingNodes, setSiblingNodes] = useState<MindMapNode[]>([]);

    // Context Menu State
    const aiTextareaRef = useRef<HTMLTextAreaElement>(null);
    const aiMirrorRef = useRef<HTMLDivElement>(null);
    const [aiMenuType, setAiMenuType] = useState<'map' | 'node' | null>(null);
    const [aiMenuPos, setAiMenuPos] = useState({ top: 0, left: 0 });
    const [aiFilterText, setAiFilterText] = useState('');
    const [aiActiveMapId, setAiActiveMapId] = useState<string | null>(null);
    const [aiNodeOptions, setAiNodeOptions] = useState<{ id: string, label: string }[]>([]);

    // Helper: Find Parent
    const findParent = (root: MindMapNode, targetId: string): MindMapNode | null => {
        if (!root.children) return null;
        for (const child of root.children) {
            if (child.id === targetId) return root;
            const res = findParent(child, targetId);
            if (res) return res;
        }
        return null;
    }

    // Init & Topology Analysis
    useEffect(() => {
        setAiPrompt(`基于“${node.label}”，请生成...`);
        apiService.getAiModels().then(c => {
            setAvailableModels(c.models);
            setAiModel(c.defaultModel);
        });

        const fetchContext = async () => {
            // 0. Fetch Idea Cards & Filter
            try {
                const cards = await apiService.getIdeaCards();
                let filteredCards: IdeaCard[] = [];

                if (projectIdeaCardId) {
                    filteredCards = cards.filter(c => c.id === projectIdeaCardId);
                } else if (projectTitle) {
                    filteredCards = cards.filter(c => c.title === projectTitle);
                }

                setIdeaCards(filteredCards);
                if (filteredCards.length === 0) setIncludeIdeaCards(false);
            } catch (e) {
                logger.error("Failed to load idea cards", e);
            }

            // 1. Fetch Chapters
            const struct = await apiService.getProjectStructure(projectId);
            const sortedChapters = struct.chapters.sort((a, b) => a.order_index - b.order_index);
            setChapters(sortedChapters);

            // 2. Analyze Topology (Am I a Chapter Outline Node?)
            const parent = findParent(rootNode, node.id);
            const isChildOfOutline = parent && (parent.label === '章节细纲' || parent.label.includes('细纲') || parent.label === 'Chapter Outline');
            const isChapterTitle = /第.+章/.test(node.label);
            const enableChapterMode = !!isChildOfOutline || isChapterTitle;

            setIsChapterNode(enableChapterMode);

            // 3. Auto-Selection Logic (Global Depth Traversal)
            if (enableChapterMode) {
                // Find global depth
                const depth = findNodeDepth(rootNode, node.id);
                if (depth !== -1) {
                    const sameDepthNodes = getNodesAtDepth(rootNode, depth);
                    setSiblingNodes(sameDepthNodes);
                    const myIndex = sameDepthNodes.findIndex(c => c.id === node.id);

                    // Auto Select Previous Chapter (Match by Title or Index from global list)
                    if (myIndex > 0) {
                        const prevSibling = sameDepthNodes[myIndex - 1];
                        // Try match by title
                        const matchTitle = sortedChapters.find(c => c.title === prevSibling.label);
                        if (matchTitle) setPreChapterId(matchTitle.id);
                    }

                    // Auto Select Next Chapter (Next Node in global list)
                    if (myIndex >= 0 && myIndex < sameDepthNodes.length - 1) {
                        const nextSibling = sameDepthNodes[myIndex + 1];
                        setNextSiblingId(nextSibling.id);
                    }
                }
            }

            // Determine initial tab
            if (enableChapterMode) {
                setActiveTab('chapter');
                setAiPrompt('请基于此节点大纲撰写正文...');
            }
        }
        fetchContext();
    }, [node.id, rootNode, projectId, projectTitle, projectIdeaCardId]);

    // --- Context Menu Logic ---
    const updateAiCursorCoords = () => {
        if (!aiTextareaRef.current || !aiMirrorRef.current) return;
        const textarea = aiTextareaRef.current;
        const mirror = aiMirrorRef.current;

        mirror.style.width = `${textarea.offsetWidth}px`;
        const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
        mirror.innerHTML = textBeforeCursor.replace(/\n/g, '<br/>') + '<span id="ai-cursor">|</span>';

        const cursorSpan = mirror.querySelector('#ai-cursor') as HTMLElement;
        if (cursorSpan) {
            setAiMenuPos({
                top: cursorSpan.offsetTop + 24,
                left: cursorSpan.offsetLeft
            });
        }
    };

    const handleAiInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursorPos = e.target.selectionStart;
        setAiPrompt(val);

        const charBefore = val[cursorPos - 1];
        if (charBefore === ':') {
            updateAiCursorCoords();
            setAiMenuType('map');
            setAiFilterText('');
            return;
        }
        if (charBefore === '@') {
            const textBack = val.substring(0, cursorPos - 1);
            const mapRegex = /\[参考导图:([a-zA-Z0-9-]+):([^\]]+)\]$/;
            const match = textBack.match(mapRegex);

            updateAiCursorCoords();
            setAiMenuType('node');
            setAiFilterText('');

            if (match) {
                const mid = match[1];
                setAiActiveMapId(mid);
                fetchMapNodes(mid);
            } else {
                setAiActiveMapId(mapId);
                // Use rootNode prop
                const flatNodes = getAllNodesFlat(rootNode);
                setAiNodeOptions(flatNodes.map(n => ({ id: n.id, label: n.label })));
            }
            return;
        }
        if ([' ', '\n'].includes(charBefore)) setAiMenuType(null);
        if (aiMenuType) setAiFilterText(prev => prev + charBefore);
    };

    const fetchMapNodes = async (mid: string) => {
        try {
            const map = await apiService.getMindMapDetail(projectId, mid);
            if (map && map.data) {
                const root = JSON.parse(map.data).root;
                const flatNodes: { id: string, label: string }[] = [];
                const traverse = (n: MindMapNode) => {
                    flatNodes.push({ id: n.id, label: n.label });
                    if (n.children) n.children.forEach(traverse);
                };
                if (root) traverse(root);
                setAiNodeOptions(flatNodes);
            }
        } catch (e) {
            logger.error("Failed to load map nodes for AI context", e);
            setAiNodeOptions([]);
        }
    };

    const insertAiText = (text: string, backspaceCount = 0) => {
        if (!aiTextareaRef.current) return;
        const el = aiTextareaRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const textBefore = aiPrompt.substring(0, start - backspaceCount);
        const textAfter = aiPrompt.substring(end);
        const newContent = textBefore + text + textAfter;
        setAiPrompt(newContent);
        setAiMenuType(null);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start - backspaceCount + text.length, start - backspaceCount + text.length);
        }, 0);
    };

    // --- Generation Logic ---
    const handleGenerate = async () => {
        setIsGenerating(true); setAiContent(''); setAiError(null); setIsChapterSaved(false);

        try {
            // 1. Resolve References
            const refRegex = /\[(参考导图|引用节点):([a-zA-Z0-9-]+):?([a-zA-Z0-9-]+)?:?([^\]]+)?\]/g;
            let match;
            const referencesData: string[] = [];
            const promptText = aiPrompt;
            let finalPrompt = promptText;
            if (aiConstraints) finalPrompt = finalPrompt + `\n【强制约束】:${aiConstraints}`;

            // Idea Cards Injection
            if (includeIdeaCards && ideaCards.length > 0) {
                const ideasContent = ideaCards.map(c =>
                    `- 【${c.title}】\n  简介: ${c.intro}\n  亮点: ${c.highlight}\n  爽点: ${c.explosive_point}\n  金手指: ${c.golden_finger}`
                ).join('\n\n');
                referencesData.push(`【核心设定/脑洞卡片】：\n${ideasContent}`);
            }

            while ((match = refRegex.exec(promptText)) !== null) {
                const [_, type, id1, id2] = match;
                if (type === '参考导图') {
                    try {
                        const map = await apiService.getMindMapDetail(projectId, id1);
                        if (map?.data) referencesData.push(`【参考导图结构：${map.title}】\n${serializeNodeTree(JSON.parse(map.data).root)}`);
                    } catch (e) { }
                } else if (type === '引用节点') {
                    if (id1 === mapId) {
                        const target = getAllNodesFlat(rootNode).find(n => n.id === id2);
                        if (target) referencesData.push(`【参考节点结构：${target.label}】\n${serializeNodeTree(target)}`);
                    } else {
                        try {
                            const map = await apiService.getMindMapDetail(projectId, id1);
                            if (map?.data) {
                                const traverse = (n: any): any => {
                                    if (n.id === id2) return n;
                                    if (n.children) {
                                        for (const child of n.children) {
                                            const res = traverse(child);
                                            if (res) return res;
                                        }
                                    }
                                    return null;
                                };
                                const target = traverse(JSON.parse(map.data).root);
                                if (target) referencesData.push(`【参考节点结构 (from ${map.title})：${target.label}】\n${serializeNodeTree(target)}`);
                            }
                        } catch (e) { }
                    }
                }
            }
            const finalRefs = referencesData.length > 0 ? referencesData.join('\n\n') : undefined;

            // 2. Call API based on Mode
            if (activeTab === 'expand') {
                await apiService.generateStream(
                    novelSettings || {} as any,
                    WorkflowStep.MIND_MAP_NODE,
                    node.label,
                    finalRefs,
                    (chunk) => setAiContent(p => p + chunk),
                    finalPrompt,
                    aiModel,
                    aiIdentity
                );
            } else {
                // Chapter Mode
                let preContent = '';
                let nextContent = '';

                // Get pre-chapter (Content from DB)
                if (preChapterId) {
                    try { const c = await apiService.getChapterDetail(projectId, preChapterId); preContent = c.content; } catch (e) { }
                }

                // Get next-chapter (Structure from Sibling Node)
                if (nextSiblingId) {
                    const sibling = siblingNodes.find(n => n.id === nextSiblingId);
                    if (sibling) {
                        nextContent = `【下章大纲预设 (来自思维导图节点 "${sibling.label}")】\n` + serializeNodeTree(sibling);
                    }
                }

                // Append Word Count Requirement
                if (wordCount > 0) {
                    finalPrompt += `\n【篇幅要求】：本章正文内容请尽量控制在 ${wordCount} 字左右，至少不低于 ${Math.floor(wordCount * 0.8)} 字。`;
                }

                await apiService.generateStream(
                    novelSettings || {} as any,
                    WorkflowStep.CHAPTER_FROM_NODE,
                    node.label,
                    finalRefs,
                    (chunk) => setAiContent(p => p + chunk),
                    finalPrompt,
                    aiModel,
                    aiIdentity,
                    preContent,
                    nextContent
                );
            }

        } catch (e: any) {
            setAiError(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveChapter = async () => {
        if (!aiContent) return;
        try {
            const title = node.label.length > 20 ? node.label.slice(0, 20) + '...' : node.label;
            const maxOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.order_index)) : 0;
            const newChap = await apiService.createChapter(projectId, title, maxOrder + 1);
            await apiService.updateChapter(projectId, newChap.id, title, aiContent);
            setIsChapterSaved(true);
            const struct = await apiService.getProjectStructure(projectId);
            setChapters(struct.chapters.sort((a, b) => a.order_index - b.order_index));

            // Notify Parent to Refresh and Navigate
            if (onChapterSaved) {
                onChapterSaved(newChap.id);
            }
        } catch (e) {
            setAiError("保存章节失败");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm text-slate-200">
            <div className="bg-slate-800 w-full max-w-3xl rounded-xl shadow-2xl border border-slate-700 p-0 relative animate-fade-in flex flex-col max-h-[90vh]">

                {/* Header / Tabs */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-4">
                        <h3 className="font-bold text-white">✨ AI 助手: {node.label}</h3>
                        <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
                            <button
                                onClick={() => { setActiveTab('expand'); setAiPrompt(`基于“${node.label}”，请生成...`); }}
                                className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'expand' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                节点扩展
                            </button>
                            {isChapterNode && (
                                <button
                                    onClick={() => { setActiveTab('chapter'); setAiPrompt(`请基于此节点大纲撰写正文...`); }}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'chapter' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    撰写正文 (小说模式)
                                </button>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">

                    {/* Mode Specific Controls */}
                    {activeTab === 'chapter' && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4 bg-slate-900/30 p-3 rounded border border-slate-700/50">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">上一章节 (承接上下文)</label>
                                <select value={preChapterId} onChange={(e) => setPreChapterId(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none">
                                    <option value="">(无)</option>
                                    {chapters.map(c => <option key={c.id} value={c.id}>{c.order_index}. {c.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">下一章节 (铺垫伏笔)</label>
                                <select value={nextSiblingId} onChange={(e) => setNextSiblingId(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none">
                                    <option value="">(无 - 也是节点末尾了)</option>
                                    {siblingNodes.map(n => <option key={n.id} value={n.id}>👉 {n.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">目标字数</label>
                                <select value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none">
                                    <option value={1000}>短篇 (约1000字)</option>
                                    <option value={2000}>标准 (约2000字)</option>
                                    <option value={3000}>中长 (约3000字)</option>
                                    <option value={5000}>长篇 (约5000字)</option>
                                    <option value={10000}>超长 (约10000字)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Common Settings Grid */}
                    <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">模型</label>
                            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 outline-none">
                                {availableModels.length > 0 ? availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>) : <option value="gemini-2.5-flash">Default</option>}
                            </select>
                        </div>
                        <div><PromptSelector type="system" label="身份设定" onSelect={setAiIdentity} /></div>
                        <div><PromptSelector type="constraint" label="约束条件" onSelect={setAiConstraints} /></div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1 hidden lg:block">&nbsp;</label>
                            <div className="flex items-center h-[26px]">
                                <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300 hover:text-white select-none">
                                    <input
                                        type="checkbox"
                                        checked={includeIdeaCards}
                                        onChange={e => setIncludeIdeaCards(e.target.checked)}
                                        className="form-checkbox h-3.5 w-3.5 text-indigo-500 rounded border-slate-600 bg-slate-900 focus:ring-0"
                                    />
                                    <span>包含脑洞卡片设定 ({ideaCards.length})</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-2">
                        <div className="flex-1"></div>
                        <PromptSelector type="normal" label="常用指令" onSelect={(val) => insertAiText(val)} />
                    </div>

                    {/* Text Area & Mirror */}
                    <div className="relative mb-2">
                        <div ref={aiMirrorRef} className="absolute top-0 left-0 -z-50 opacity-0 whitespace-pre-wrap break-words pointer-events-none text-sm p-0 font-sans"></div>
                        <textarea
                            ref={aiTextareaRef}
                            value={aiPrompt}
                            onChange={handleAiInput}
                            className="w-full h-32 bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                            placeholder={activeTab === 'expand' ? "输入指令以扩展子节点..." : "输入写作指导指令..."}
                        />
                        {/* Context Menu */}
                        {aiMenuType && (
                            <div className="absolute z-[60] bg-slate-800 border border-slate-600 rounded-lg shadow-xl w-64 max-h-60 overflow-y-auto animate-fade-in" style={{ top: aiMenuPos.top, left: aiMenuPos.left }}>
                                <div className="px-2 py-1 text-xs text-slate-500 border-b border-slate-700 bg-slate-900 sticky top-0">
                                    {aiMenuType === 'map' ? '引用导图' : '引用节点'}
                                </div>
                                {aiMenuType === 'map' && availableMaps.filter(m => m.title.includes(aiFilterText)).map(m => (
                                    <button key={m.id} onClick={() => insertAiText(`[参考导图:${m.id}:${m.title}]`, aiFilterText.length + 1)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-pink-600 hover:text-white truncate">🧠 {m.title}</button>
                                ))}
                                {aiMenuType === 'node' && aiNodeOptions.filter(n => n.label.includes(aiFilterText)).map(n => (
                                    <button key={n.id} onClick={() => insertAiText(`[引用节点:${aiActiveMapId}:${n.id}:${n.label}]`, aiFilterText.length + 1)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-green-600 hover:text-white truncate">🏷️ {n.label}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 mb-4">
                        <div className="space-x-3">
                            <span>👉 输入 <span className="text-pink-400 font-bold">:</span> 引用导图</span>
                            <span>👉 输入 <span className="text-green-400 font-bold">@</span> 引用节点</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 border-t border-slate-700/50 pt-4">
                        <Button variant="ghost" onClick={onClose}>关闭</Button>
                        <Button onClick={handleGenerate} isLoading={isGenerating}>
                            {isGenerating ? '生成中...' : '开始生成'}
                        </Button>

                        {activeTab === 'expand' ? (
                            <Button onClick={() => onApply(aiContent)} disabled={!aiContent}>应用结果</Button>
                        ) : (
                            <Button onClick={handleSaveChapter} disabled={!aiContent || isChapterSaved} className={isChapterSaved ? 'bg-green-600 text-white' : ''}>
                                {isChapterSaved ? '已保存至卷宗 ✔' : '保存至卷宗'}
                            </Button>
                        )}
                    </div>

                    {/* Result Preview */}
                    {aiContent && (
                        <div className="mt-4 bg-black/30 p-3 rounded border border-slate-800/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-400">生成结果预览</span>
                                <button onClick={() => navigator.clipboard.writeText(aiContent)} className="text-[10px] text-slate-500 hover:text-white">复制</button>
                            </div>
                            <div className="max-h-60 overflow-y-auto prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown>{aiContent}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                    {aiError && <div className="mt-2 text-red-400 text-xs text-center">{aiError}</div>}

                </div>
            </div>
        </div>
    );
};
