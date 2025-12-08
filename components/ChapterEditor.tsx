
import React, { useState, useEffect, useRef } from 'react';
import { Chapter, NovelSettings, WorkflowStep, MindMapNode } from '../types';
import { apiService } from '../services/geminiService';
import { Button } from './Button';
import { logger } from '../services/loggerService';
import { serializeNodeTree } from './mindmap/utils';
import { PromptSelector } from './PromptSelector';

interface Props {
    projectId: string;
    chapter: Chapter;
    availableResources: {
        chapters: { id: string, title: string }[];
        maps: { id: string, title: string }[];
    };
    novelSettings: NovelSettings;
    onSave: (id: string, title: string, content: string) => void;
}

type MenuType = 'resource' | 'node' | null;

export const ChapterEditor: React.FC<Props> = ({ projectId, chapter, availableResources, novelSettings, onSave }) => {
    const [title, setTitle] = useState(chapter.title);
    const [content, setContent] = useState(chapter.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [wordCount, setWordCount] = useState(0);
    
    // Auto Save Timer
    // 修复: 使用 any 替代 NodeJS.Timeout，避免缺少 Node 类型定义时的报错
    const autoSaveTimerRef = useRef<any>(null);

    // AI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAiConfig, setShowAiConfig] = useState(false);
    const [aiIdentity, setAiIdentity] = useState('');
    const [aiConstraints, setAiConstraints] = useState('');
    const [aiExtraInstruction, setAiExtraInstruction] = useState('');

    // Context Menu State
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const [menuType, setMenuType] = useState<MenuType>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const [filterText, setFilterText] = useState('');
    const [activeMapIdForNode, setActiveMapIdForNode] = useState<string | null>(null);
    const [nodeOptions, setNodeOptions] = useState<{id: string, label: string}[]>([]);

    useEffect(() => {
        setTitle(chapter.title);
        setContent(chapter.content || '');
    }, [chapter.id]);

    useEffect(() => {
        setWordCount(content.length);
        // Auto resize height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 600)}px`;
        }

        // Auto Save Logic (Debounce 2s)
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        // Only auto save if content changed from initial props or previous save
        if (content !== chapter.content || title !== chapter.title) {
            autoSaveTimerRef.current = setTimeout(() => {
                handleSave(true); // silent save
            }, 2000);
        }

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [content, title]);

    // === Context Menu Logic ===

    const updateCursorCoords = () => {
        if (!textareaRef.current || !mirrorRef.current) return;
        const textarea = textareaRef.current;
        const mirror = mirrorRef.current;

        mirror.style.width = `${textarea.offsetWidth}px`;
        const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
        mirror.innerHTML = textBeforeCursor.replace(/\n/g, '<br/>') + '<span id="cursor">|</span>';
        
        const cursorSpan = mirror.querySelector('#cursor') as HTMLElement;
        if (cursorSpan) {
            setMenuPos({
                top: cursorSpan.offsetTop + 24, 
                left: cursorSpan.offsetLeft
            });
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursorPos = e.target.selectionStart;
        setContent(val);

        const charBefore = val[cursorPos - 1];
        if (charBefore === ':') {
            updateCursorCoords();
            setMenuType('resource');
            setFilterText('');
            return;
        }
        if (charBefore === '@') {
            const textBack = val.substring(0, cursorPos - 1);
            const mapRegex = /\[参考导图:([a-zA-Z0-9-]+):([^\]]+)\]$/;
            const match = textBack.match(mapRegex);
            if (match) {
                const mapId = match[1];
                setActiveMapIdForNode(mapId);
                updateCursorCoords();
                setMenuType('node');
                setFilterText('');
                fetchMapNodes(mapId);
                return;
            }
        }
        if ([' ', '\n'].includes(charBefore)) {
            setMenuType(null);
        }
        if (menuType) {
            setFilterText(prev => prev + charBefore);
        }
    };

    const fetchMapNodes = async (mapId: string) => {
        try {
            const map = await apiService.getMindMapDetail(projectId, mapId);
            if (map && map.data) {
                const root = JSON.parse(map.data).root;
                const flatNodes: {id: string, label: string}[] = [];
                const traverse = (n: MindMapNode) => {
                    flatNodes.push({ id: n.id, label: n.label });
                    if (n.children) n.children.forEach(traverse);
                };
                if (root) traverse(root);
                setNodeOptions(flatNodes);
            }
        } catch (e) {
            logger.error("Failed to load map nodes for context", e);
        }
    };

    const insertText = (text: string, backspaceCount = 0) => {
        if (!textareaRef.current) return;
        const el = textareaRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const textBefore = content.substring(0, start - backspaceCount);
        const textAfter = content.substring(end);
        
        const newContent = textBefore + text + textAfter;
        setContent(newContent);
        setMenuType(null);
        
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start - backspaceCount + text.length, start - backspaceCount + text.length);
        }, 0);
    };

    // === AI Writing Logic ===

    const handleAiWrite = async () => {
        if (isGenerating) return;
        setShowAiConfig(false); // Close modal
        setIsGenerating(true);
        
        try {
            const refRegex = /\[(参考章节|参考导图|引用节点):([a-zA-Z0-9-]+):?([a-zA-Z0-9-]+)?:?([^\]]+)?\]/g;
            let match;
            const referencesData: string[] = [];
            const contextText = content.slice(-3000); 

            while ((match = refRegex.exec(content)) !== null) {
                const [fullTag, type, id1, id2, title] = match;
                if (type === '参考章节') {
                    try {
                        const chap = await apiService.getChapterDetail(projectId, id1);
                        if (chap && chap.content) referencesData.push(`【参考章节：${chap.title}】\n${chap.content.slice(0, 1000)}...`);
                    } catch(e) {}
                } else if (type === '参考导图') {
                    try {
                        const map = await apiService.getMindMapDetail(projectId, id1);
                        if (map && map.data) referencesData.push(`【参考设定：${map.title}】\n${serializeNodeTree(JSON.parse(map.data).root)}`);
                    } catch(e) {}
                } else if (type === '引用节点') {
                    try {
                        const map = await apiService.getMindMapDetail(projectId, id1);
                        if (map && map.data) {
                            const root = JSON.parse(map.data).root;
                            const findNode = (n: MindMapNode): MindMapNode | null => {
                                if (n.id === id2) return n;
                                if (n.children) for (const c of n.children) { const f = findNode(c); if(f) return f; }
                                return null;
                            };
                            const target = findNode(root);
                            if (target) referencesData.push(`【参考设定节点：${target.label}】\n${serializeNodeTree(target)}`);
                        }
                    } catch(e) {}
                }
            }

            const refString = referencesData.join('\n\n');
            
            // Build extra prompt from configs
            let finalExtra = aiExtraInstruction;
            if (aiIdentity) finalExtra = `【身份设定】:${aiIdentity}\n` + finalExtra;
            if (aiConstraints) finalExtra = finalExtra + `\n【强制约束】:${aiConstraints}`;

            await apiService.generateStream(
                novelSettings,
                WorkflowStep.CHAPTER,
                contextText,
                refString, 
                (chunk) => {
                    setContent(prev => prev + chunk);
                },
                finalExtra
            );

        } catch (e: any) {
            logger.error("AI Write failed", e);
            alert("AI 写作失败: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (silent = false) => {
        setIsSaving(true);
        try {
            await onSave(chapter.id, title, content);
            if (!silent) logger.info("章节保存成功");
        } catch (e) {
            if (!silent) alert("保存失败");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] relative">
            {/* Top Toolbar */}
            <div className="h-12 border-b border-black/50 bg-[#2d2d2d] flex items-center justify-between px-4 shrink-0">
                <input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="bg-transparent text-slate-200 font-bold text-lg outline-none w-1/2"
                />
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{wordCount} 字</span>
                    <Button size="sm" variant="ghost" onClick={() => setShowAiConfig(true)} isLoading={isGenerating} disabled={isGenerating}>
                        ✨ AI 续写
                    </Button>
                    <Button size="sm" onClick={() => handleSave(false)} isLoading={isSaving}>
                        {isSaving ? '保存中...' : '保存'}
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto relative p-8">
                <div className="max-w-3xl mx-auto relative">
                    <div 
                        ref={mirrorRef}
                        className="absolute top-0 left-0 -z-50 opacity-0 whitespace-pre-wrap break-words pointer-events-none"
                        style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '1.125rem', lineHeight: '1.75rem', padding: '0' }}
                    ></div>

                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleInput}
                        placeholder="在此输入正文... 输入 : 引用设定，输入 @ 引用节点"
                        className="w-full bg-transparent text-slate-300 outline-none resize-none leading-7 text-lg min-h-[500px]"
                        style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                    />

                    {menuType && (
                        <div 
                            className="absolute z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl w-64 max-h-60 overflow-y-auto animate-fade-in"
                            style={{ top: menuPos.top, left: menuPos.left }}
                        >
                            <div className="px-2 py-1 text-xs text-slate-500 border-b border-slate-700 bg-slate-900 sticky top-0">
                                {menuType === 'resource' ? '引用资源 (输入筛选)' : '引用节点'}
                            </div>
                            
                            {menuType === 'resource' && (
                                <>
                                    <div className="text-[10px] text-indigo-400 px-2 mt-1">章节</div>
                                    {availableResources.chapters.filter(c => c.title.includes(filterText) && c.id !== chapter.id).map(c => (
                                        <button key={c.id} onClick={() => insertText(`[参考章节:${c.id}:${c.title}]`, filterText.length + 1)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-indigo-600 hover:text-white truncate">📄 {c.title}</button>
                                    ))}
                                    <div className="text-[10px] text-pink-400 px-2 mt-1">思维导图</div>
                                    {availableResources.maps.filter(m => m.title.includes(filterText)).map(m => (
                                        <button key={m.id} onClick={() => insertText(`[参考导图:${m.id}:${m.title}]`, filterText.length + 1)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-pink-600 hover:text-white truncate">🧠 {m.title}</button>
                                    ))}
                                </>
                            )}

                            {menuType === 'node' && (
                                <>
                                    {nodeOptions.filter(n => n.label.includes(filterText)).map(n => (
                                        <button key={n.id} onClick={() => insertText(`[引用节点:${activeMapIdForNode}:${n.id}:${n.label}]`, filterText.length + 1)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-green-600 hover:text-white truncate">🏷️ {n.label}</button>
                                    ))}
                                    {nodeOptions.length === 0 && <div className="p-2 text-xs text-slate-500">加载中...</div>}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* AI Config Modal */}
            {showAiConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-lg shadow-2xl animate-fade-in">
                        <h3 className="font-bold text-white mb-4">🚀 配置 AI 续写助手</h3>
                        <div className="space-y-4 mb-6">
                            <PromptSelector type="system" label="1. 选择身份设定" onSelect={setAiIdentity} />
                            <PromptSelector type="constraint" label="2. 选择必须遵守的约束" onSelect={setAiConstraints} />
                            <PromptSelector type="normal" label="3. 插入常用指令" onSelect={(val) => setAiExtraInstruction(prev => prev + '\n' + val)} />
                            
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">本次写作指令 (可留空)</label>
                                <textarea 
                                    value={aiExtraInstruction}
                                    onChange={e => setAiExtraInstruction(e.target.value)}
                                    placeholder="例如：重点描写环境氛围，或者发生一场打斗..."
                                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-slate-200 outline-none resize-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowAiConfig(false)}>取消</Button>
                            <Button onClick={handleAiWrite}>开始生成</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
