
import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MindMapNode, WorkflowStep, NovelSettings, Chapter } from '../../types';
import { Button } from '../Button';
import { PromptSelector } from '../PromptSelector';
import { serializeNodeTree, getAllNodesFlat } from './utils';
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
}

type TabMode = 'expand' | 'chapter';

export const MindMapAiModal: React.FC<Props> = ({
    projectId, node, rootNode, mapId, availableMaps, novelSettings, onClose, onApply
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

    // Chapter Mode Specific
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [preChapterId, setPreChapterId] = useState<string>('');
    const [nextChapterId, setNextChapterId] = useState<string>('');
    const [isChapterSaved, setIsChapterSaved] = useState(false);

    // Context Menu State
    const aiTextareaRef = useRef<HTMLTextAreaElement>(null);
    const aiMirrorRef = useRef<HTMLDivElement>(null);
    const [aiMenuType, setAiMenuType] = useState<'map' | 'node' | null>(null);
    const [aiMenuPos, setAiMenuPos] = useState({ top: 0, left: 0 });
    const [aiFilterText, setAiFilterText] = useState('');
    const [aiActiveMapId, setAiActiveMapId] = useState<string | null>(null);
    const [aiNodeOptions, setAiNodeOptions] = useState<{ id: string, label: string }[]>([]);

    // Init
    useEffect(() => {
        setAiPrompt(`基于“${node.label}”，请生成...`);
        apiService.getAiModels().then(c => {
            setAvailableModels(c.models);
            setAiModel(c.defaultModel);
        });

        // Check if we are in "章节细纲" branch? Optional but good UX. 
        // Always fetch chapters just in case user switches tab.
        apiService.getProjectStructure(projectId).then(struct => {
            setChapters(struct.chapters.sort((a, b) => a.order_index - b.order_index));
        });
    }, []);

    // --- Context Menu Logic (Extracted) ---
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
                if (rootNode) {
                    const flatNodes = getAllNodesFlat(rootNode);
                    setAiNodeOptions(flatNodes.map(n => ({ id: n.id, label: n.label })));
                } else {
                    setAiNodeOptions([]);
                }
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

            while ((match = refRegex.exec(promptText)) !== null) {
                const [_, type, id1, id2] = match;
                if (type === '参考导图') {
                    try {
                        const map = await apiService.getMindMapDetail(projectId, id1);
                        if (map?.data) referencesData.push(`【参考导图结构：${map.title}】\n${serializeNodeTree(JSON.parse(map.data).root)}`);
                    } catch (e) { }
                } else if (type === '引用节点') {
                    if (id1 === mapId) {
                        // Local Ref
                        const target = getAllNodesFlat(rootNode).find(n => n.id === id2);
                        if (target) referencesData.push(`【参考节点结构：${target.label}】\n${serializeNodeTree(target)}`);
                    } else {
                        // Remote Ref
                        try {
                            const map = await apiService.getMindMapDetail(projectId, id1);
                            if (map?.data) {
                                const traverse = (n: any): any => n.id === id2 ? n : (n.children?.find((c: any) => traverse(c)) || null);
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
                if (preChapterId) {
                    try { const c = await apiService.getChapterDetail(projectId, preChapterId); preContent = c.content; } catch (e) { }
                }
                if (nextChapterId) { // Usually next chapter content is empty if we are writing it, but maybe outlines?
                    // Wait, "next chapter" usually implies we are inserting. Or maybe next chapter outline?
                    // For now let's just fetch content. If empty it's empty.
                    try { const c = await apiService.getChapterDetail(projectId, nextChapterId); nextContent = c.title + '\n' + c.content; } catch (e) { }
                }

                await apiService.generateStream(
                    novelSettings || {} as any,
                    WorkflowStep.CHAPTER_FROM_NODE,
                    node.label, // Context is the node content/label
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
            // Find max order
            const maxOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.order_index)) : 0;

            // Create Chapter
            const newChap = await apiService.createChapter(projectId, title, maxOrder + 1);
            // Update Content
            await apiService.updateChapter(projectId, newChap.id, title, aiContent);

            setIsChapterSaved(true);
            // Refresh chapters list
            const struct = await apiService.getProjectStructure(projectId);
            setChapters(struct.chapters.sort((a, b) => a.order_index - b.order_index));
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
                            <button
                                onClick={() => { setActiveTab('chapter'); setAiPrompt(`请基于此节点大纲撰写正文...`); }}
                                className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'chapter' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                撰写正文
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">

                    {/* Mode Specific Controls */}
                    {activeTab === 'chapter' && (
                        <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-900/30 p-3 rounded border border-slate-700/50">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">上一章节 (承接上下文)</label>
                                <select value={preChapterId} onChange={(e) => setPreChapterId(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none">
                                    <option value="">(无)</option>
                                    {chapters.map(c => <option key={c.id} value={c.id}>{c.order_index}. {c.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">下一章节 (铺垫伏笔)</label>
                                <select value={nextChapterId} onChange={(e) => setNextChapterId(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none">
                                    <option value="">(无)</option>
                                    {chapters.map(c => <option key={c.id} value={c.id}>{c.order_index}. {c.title}</option>)}
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
                        <div><PromptSelector type="normal" label="常用指令" onSelect={(val) => insertAiText(val)} /></div>
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
