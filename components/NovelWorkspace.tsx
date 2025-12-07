
import React, { useEffect, useState } from 'react';
import { Novel, ChapterListItem, Chapter, MindMap } from '../types';
import { apiService } from '../services/geminiService';
import { Button } from './Button';

interface Props {
    novel: Novel;
    onBack: () => void;
}

type Tab = 'chapters' | 'mindmaps';

export const NovelWorkspace: React.FC<Props> = ({ novel, onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>('chapters');
    
    // Lists
    const [chapters, setChapters] = useState<ChapterListItem[]>([]);
    const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);

    // Selected Content
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
    const [selectedMindMapId, setSelectedMindMapId] = useState<string | null>(null);
    const [currentContent, setCurrentContent] = useState<{title: string, body: string} | null>(null);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load lists on mount
    useEffect(() => {
        loadLists();
    }, [novel.id]);

    const loadLists = async () => {
        setIsLoadingList(true);
        try {
            const [cList, mList] = await Promise.all([
                apiService.getChaptersList(novel.id),
                apiService.getMindMapsList(novel.id)
            ]);
            setChapters(cList);
            setMindMaps(mList);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingList(false);
        }
    };

    // Load Chapter Content
    const handleChapterClick = async (id: string) => {
        setSelectedChapterId(id);
        setSelectedMindMapId(null);
        setIsContentLoading(true);
        try {
            const chapter = await apiService.getChapterContent(id);
            setCurrentContent({ title: chapter.title, body: chapter.content });
        } catch (e) {
            alert("加载章节失败");
        } finally {
            setIsContentLoading(false);
        }
    };

    // Load MindMap Content
    const handleMindMapClick = async (id: string) => { // id is MindMap ID
        const map = mindMaps.find(m => m.id === id); // MindMaps list contains full nodes usually
        if (!map) return;
        setSelectedMindMapId(id);
        setSelectedChapterId(null);
        setCurrentContent({ title: map.title, body: map.nodes });
    };

    // Create New
    const handleCreate = async () => {
        const title = prompt("请输入标题:");
        if (!title) return;
        
        try {
            if (activeTab === 'chapters') {
                const newChapter = await apiService.createChapter(novel.id, title, '');
                setChapters([...chapters, newChapter]);
                handleChapterClick(newChapter.id);
            } else {
                const newMap = await apiService.createMindMap(novel.id, title, '[]');
                setMindMaps([...mindMaps, newMap]);
                handleMindMapClick(newMap.id);
            }
        } catch (e) { alert("创建失败"); }
    };

    // Save
    const handleSave = async () => {
        if (!currentContent) return;
        setIsSaving(true);
        try {
            if (selectedChapterId) {
                await apiService.updateChapter(selectedChapterId, currentContent.title, currentContent.body);
                // Update list item title
                setChapters(prev => prev.map(c => c.id === selectedChapterId ? { ...c, title: currentContent.title } : c));
            } else if (selectedMindMapId) {
                await apiService.updateMindMap(selectedMindMapId, currentContent.title, currentContent.body);
                setMindMaps(prev => prev.map(m => m.id === selectedMindMapId ? { ...m, title: currentContent.title, nodes: currentContent.body } : m));
            }
        } catch (e) { alert("保存失败"); } 
        finally { setIsSaving(false); }
    };

    // Delete
    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("确定删除吗？")) return;
        try {
            if (activeTab === 'chapters') {
                await apiService.deleteChapter(id);
                setChapters(prev => prev.filter(c => c.id !== id));
                if (selectedChapterId === id) setCurrentContent(null);
            } else {
                await apiService.deleteMindMap(id);
                setMindMaps(prev => prev.filter(m => m.id !== id));
                if (selectedMindMapId === id) setCurrentContent(null);
            }
        } catch (e) { alert("删除失败"); }
    };

    return (
        <div className="flex h-screen bg-dark text-slate-200 font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-[#161b22] border-r border-slate-700 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center text-xs">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        返回
                    </button>
                    <span className="font-bold text-sm truncate max-w-[120px]">{novel.title}</span>
                </div>

                {/* Tabs */}
                <div className="flex bg-black/20 p-1 m-2 rounded">
                    <button 
                        onClick={() => setActiveTab('chapters')}
                        className={`flex-1 py-1 text-xs rounded transition-colors ${activeTab === 'chapters' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                        正文文件夹
                    </button>
                    <button 
                        onClick={() => setActiveTab('mindmaps')}
                        className={`flex-1 py-1 text-xs rounded transition-colors ${activeTab === 'mindmaps' ? 'bg-pink-600 text-white' : 'text-slate-400'}`}
                    >
                        思维导图
                    </button>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                    {isLoadingList && <div className="text-center text-xs text-slate-500 py-4">加载中...</div>}
                    
                    {activeTab === 'chapters' && (
                        <>
                             {chapters.map(chapter => (
                                <div 
                                    key={chapter.id}
                                    onClick={() => handleChapterClick(chapter.id)}
                                    className={`group flex justify-between items-center px-3 py-2 rounded cursor-pointer text-sm ${selectedChapterId === chapter.id ? 'bg-indigo-900/50 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800'}`}
                                >
                                    <span className="truncate flex items-center gap-2">
                                        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        {chapter.title}
                                    </span>
                                    <button onClick={(e) => handleDelete(chapter.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 px-1">×</button>
                                </div>
                            ))}
                            <button onClick={handleCreate} className="w-full mt-2 py-2 border border-dashed border-slate-700 text-slate-500 text-xs rounded hover:border-slate-500 hover:text-slate-300">
                                + 新建章节
                            </button>
                        </>
                    )}

                    {activeTab === 'mindmaps' && (
                        <>
                             {mindMaps.map(map => (
                                <div 
                                    key={map.id}
                                    onClick={() => handleMindMapClick(map.id)}
                                    className={`group flex justify-between items-center px-3 py-2 rounded cursor-pointer text-sm ${selectedMindMapId === map.id ? 'bg-pink-900/50 text-pink-200 border border-pink-500/30' : 'text-slate-400 hover:bg-slate-800'}`}
                                >
                                    <span className="truncate flex items-center gap-2">
                                        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                        {map.title}
                                    </span>
                                    <button onClick={(e) => handleDelete(map.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 px-1">×</button>
                                </div>
                            ))}
                            <button onClick={handleCreate} className="w-full mt-2 py-2 border border-dashed border-slate-700 text-slate-500 text-xs rounded hover:border-slate-500 hover:text-slate-300">
                                + 新建思维导图
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden">
                {currentContent ? (
                    <>
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                            <input 
                                value={currentContent.title}
                                onChange={(e) => setCurrentContent({...currentContent, title: e.target.value})}
                                className="bg-transparent text-lg font-bold text-white outline-none w-full"
                            />
                            <div className="flex gap-2">
                                <span className="text-xs text-slate-500 py-2 px-3">{isSaving ? '保存中...' : (activeTab === 'chapters' ? `字数: ${currentContent.body.length}` : 'JSON 模式')}</span>
                                <Button size="sm" onClick={handleSave} isLoading={isSaving} variant="primary">保存</Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            {isContentLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-dark/50 z-10">
                                    <span className="text-indigo-400">加载中...</span>
                                </div>
                            )}
                            <textarea 
                                value={currentContent.body}
                                onChange={(e) => setCurrentContent({...currentContent, body: e.target.value})}
                                className="w-full h-full bg-[#0f172a] text-slate-300 p-8 outline-none resize-none font-mono leading-relaxed text-base"
                                placeholder={activeTab === 'chapters' ? "开始撰写正文..." : "请输入 JSON 结构的节点数据..."}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                        <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        <p>请在左侧选择文件或新建</p>
                    </div>
                )}
            </div>
        </div>
    );
};
