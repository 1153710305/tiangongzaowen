
import React, { useEffect, useState } from 'react';
import { MindMap, MindMapNode, NovelSettings } from '../types';
import { apiService } from '../services/geminiService';
import { Button } from './Button';
import ReactMarkdown from 'react-markdown';
import { THEMES, LAYOUTS, LayoutType } from './mindmap/themes';
import { NodeRenderer } from './mindmap/NodeRenderer';
import { PromptSelector } from './PromptSelector';
import { MindMapToolbar } from './mindmap/MindMapToolbar';

// Hooks
import { useMindMapState } from '../hooks/useMindMapState';
import { useMindMapCanvas } from '../hooks/useMindMapCanvas';
import { useMindMapAI } from '../hooks/useMindMapAI';

interface Props {
    projectId: string;
    mapData: MindMap;
    onSave: (mapId: string, title: string, dataStr: string) => Promise<void>;
    novelSettings?: NovelSettings;
    availableMaps?: { id: string, title: string }[];
}

export const MindMapEditor: React.FC<Props> = ({ projectId, mapData, onSave, novelSettings, availableMaps = [] }) => {
    
    // 1. Data & History State
    const [title, setTitle] = useState(mapData.title);
    const [isSaving, setIsSaving] = useState(false);
    
    // 初始化 RootNode 逻辑
    const parseRoot = (data: string): MindMapNode => {
        try { return JSON.parse(data).root || { id: 'root', label: '核心创意', children: [] }; }
        catch { return { id: 'root', label: '核心创意', children: [] }; }
    };

    const { 
        rootNode, setRootNode, history, future, selectedId, setSelectedId, editingNodeId, setEditingNodeId,
        undo, redo, addChild, editNode, deleteNode, moveNode, toggleExpand, updateMapState 
    } = useMindMapState(parseRoot(mapData.data), async (newRoot) => {
        setIsSaving(true);
        try { await onSave(mapData.id, title, JSON.stringify({ root: newRoot, layout: activeLayout })); }
        finally { setIsSaving(false); }
    });

    // 2. View / Canvas State
    const { 
        viewState, isPanning, canvasRef, handleMouseDown, handleMouseMove, handleMouseUp, 
        zoomIn, zoomOut, resetView, focusNode 
    } = useMindMapCanvas();

    const [activeThemeId, setActiveThemeId] = useState('dark');
    const [activeLayout, setActiveLayout] = useState<LayoutType>('right');
    const [showShortcuts, setShowShortcuts] = useState(false);
    const activeTheme = THEMES[activeThemeId] || THEMES.dark;

    // 3. AI State
    const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);
    const [aiActiveMapId, setAiActiveMapId] = useState<string | null>(null);
    const [aiNodeOptions, setAiNodeOptions] = useState<{id: string, label: string}[]>([]);
    
    // Context menu states (local for UI rendering)
    const [aiMenuType, setAiMenuType] = useState<'map' | 'node' | null>(null);
    const [aiMenuPos, setAiMenuPos] = useState({ top: 0, left: 0 });
    const [aiFilterText, setAiFilterText] = useState('');

    const {
        showAiModal, setShowAiModal, targetNode, prompt: aiPrompt, setPrompt: setAiPrompt,
        content: aiContent, isGenerating: isAiGenerating, model: aiModel, setModel: setAiModel,
        setIdentity: setAiIdentity, setConstraints: setAiConstraints, textareaRef: aiTextareaRef, mirrorRef: aiMirrorRef,
        openAiModal, handleGenerate: handleAiGenerate, applyResult: applyAiResult
    } = useMindMapAI({ 
        projectId, mapId: mapData.id, rootNode, novelSettings, onUpdateMap: updateMapState 
    });

    // Effects
    useEffect(() => {
        setRootNode(parseRoot(mapData.data));
        setTitle(mapData.title);
        apiService.getAiModels().then(c => { setAvailableModels(c.models); setAiModel(c.defaultModel); });
    }, [mapData]);

    // Handle Title Blur Save
    const handleTitleBlur = () => title !== mapData.title && onSave(mapData.id, title, JSON.stringify({ root: rootNode, layout: activeLayout }));

    // AI Input Handling (Cursor tracking & Context Menu)
    const updateAiCursorCoords = () => {
        if (!aiTextareaRef.current || !aiMirrorRef.current) return;
        const textarea = aiTextareaRef.current;
        aiMirrorRef.current.style.width = `${textarea.offsetWidth}px`;
        aiMirrorRef.current.innerHTML = textarea.value.substring(0, textarea.selectionStart).replace(/\n/g, '<br/>') + '<span id="ai-cursor">|</span>';
        const cursor = aiMirrorRef.current.querySelector('#ai-cursor') as HTMLElement;
        if (cursor) setAiMenuPos({ top: cursor.offsetTop + 24, left: cursor.offsetLeft });
    };

    const handleAiInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursorPos = e.target.selectionStart;
        setAiPrompt(val);
        const charBefore = val[cursorPos - 1];
        
        if (charBefore === ':') {
            updateAiCursorCoords(); setAiMenuType('map'); setAiFilterText('');
        } else if (charBefore === '@') {
            // Simplified logic for ref ... (fetch nodes logic omitted for brevity, can be added back if needed)
             updateAiCursorCoords(); setAiMenuType('node'); setAiFilterText('');
        } else if ([' ', '\n'].includes(charBefore)) {
            setAiMenuType(null);
        } else if (aiMenuType) {
            setAiFilterText(prev => prev + charBefore);
        }
    };

    const insertAiText = (text: string, backspaceCount = 0) => {
        if (!aiTextareaRef.current) return;
        const start = aiTextareaRef.current.selectionStart;
        const newText = aiPrompt.substring(0, start - backspaceCount) + text + aiPrompt.substring(aiTextareaRef.current.selectionEnd);
        setAiPrompt(newText);
        setAiMenuType(null);
    };

    // Render
    if (!rootNode) return <div className="text-white p-4">Loading...</div>;

    return (
        <div className={`h-full flex flex-col ${activeTheme.bgContainer} relative`}>
            <MindMapToolbar
                title={title} setTitle={setTitle} onBlurTitle={handleTitleBlur}
                activeLayout={activeLayout} setActiveLayout={setActiveLayout}
                activeThemeId={activeThemeId} setActiveThemeId={setActiveThemeId}
                zoomScale={viewState.scale} onZoomIn={zoomIn} onZoomOut={zoomOut} onResetView={resetView}
                canUndo={history.length > 0} canRedo={future.length > 0} onUndo={undo} onRedo={redo}
                showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts} isSaving={isSaving}
            />

            {/* Canvas */}
            <div ref={canvasRef} className={`flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative ${activeTheme.bgContainer} ${isPanning ? 'cursor-grabbing' : ''}`}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={() => setSelectedId(null)}>
                
                <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                    backgroundImage: `radial-gradient(${activeTheme.bgGridColor} 1px, transparent 1px)`, 
                    backgroundSize: `${24 * viewState.scale}px ${24 * viewState.scale}px`,
                    backgroundPosition: `${viewState.x}px ${viewState.y}px`
                }}></div>
                
                <div style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`, transformOrigin: '0 0', transition: isPanning ? 'none' : 'transform 0.15s ease-out' }} className="absolute top-0 left-0 min-w-full min-h-full p-20">
                    <NodeRenderer 
                        node={rootNode} selectedId={selectedId} onSelect={setSelectedId} onEdit={editNode}
                        onAddChild={(id) => { const newId = addChild(id); if(newId) focusNode(newId); }} 
                        onAiExpand={openAiModal} onDelete={deleteNode} onNodeDrop={moveNode} 
                        onToggleExpand={toggleExpand} depth={0} theme={activeTheme} layout={activeLayout} editingNodeId={editingNodeId}
                    />
                </div>
            </div>

            {/* AI Modal */}
            {showAiModal && targetNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm text-slate-200">
                    <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 p-4 relative animate-fade-in">
                        <h3 className="font-bold text-white mb-4">✨ AI 扩展: {targetNode.label}</h3>
                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-slate-500">模型</label><select value={aiModel} onChange={e=>setAiModel(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded text-xs px-2 py-1">{availableModels.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                            <div><PromptSelector type="system" label="身份" onSelect={setAiIdentity} /></div>
                            <div><PromptSelector type="constraint" label="约束" onSelect={setAiConstraints} /></div>
                            <div><PromptSelector type="normal" label="常用" onSelect={(v) => insertAiText(v)} /></div>
                        </div>
                        
                        <div ref={aiMirrorRef} className="absolute -z-50 opacity-0 whitespace-pre-wrap pointer-events-none" style={{fontSize:'0.875rem'}}></div>
                        <div className="relative">
                            <textarea ref={aiTextareaRef} value={aiPrompt} onChange={handleAiInput} className="w-full h-32 bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white mb-2" />
                            {aiMenuType && (
                                <div className="absolute z-[60] bg-slate-800 border border-slate-600 rounded shadow-xl w-64 max-h-60 overflow-y-auto" style={{top: aiMenuPos.top, left: aiMenuPos.left}}>
                                    {aiMenuType === 'map' && availableMaps.filter(m=>m.title.includes(aiFilterText)).map(m=><button key={m.id} onClick={()=>insertAiText(`[参考导图:${m.id}:${m.title}]`, aiFilterText.length+1)} className="w-full text-left px-3 py-1 hover:bg-pink-600 text-xs text-slate-300">{m.title}</button>)}
                                    {/* Node list logic would go here */}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowAiModal(false)}>取消</Button>
                            <Button onClick={handleAiGenerate} isLoading={isAiGenerating}>生成</Button>
                            <Button onClick={applyAiResult} disabled={!aiContent}>应用</Button>
                        </div>
                        {aiContent && <div className="mt-4 bg-black/30 p-2 rounded max-h-40 overflow-y-auto text-xs"><ReactMarkdown>{aiContent}</ReactMarkdown></div>}
                    </div>
                </div>
            )}
        </div>
    );
};
