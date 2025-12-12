
import React, { useEffect, useState } from 'react';
import { Project, ProjectStructure, Chapter, MindMap } from '../types';
import { apiService } from '../services/geminiService';
import { logger } from '../services/loggerService';
import { MindMapEditor } from './MindMapEditor';
import { ChapterEditor } from './ChapterEditor';
import { DEFAULT_NOVEL_SETTINGS } from '../constants';

interface Props {
    project: Project;
    onBack: () => void;
}

type FileType = 'chapter' | 'mindmap';

export const ProjectIDE: React.FC<Props> = ({ project, onBack }) => {
    const [structure, setStructure] = useState<ProjectStructure>({ chapters: [], maps: [] });
    const [loading, setLoading] = useState(true);
    const [activeFile, setActiveFile] = useState<{ type: FileType, id: string, title: string, data?: any } | null>(null);

    // 加载项目结构
    const loadStructure = async () => {
        try {
            const data = await apiService.getProjectStructure(project.id);
            setStructure(data);
            return data;
        } catch (e) {
            logger.error("加载项目结构失败", e);
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStructure().then(data => {
            if (data && !activeFile) {
                // 默认选中第一个思维导图
                if (data.maps.length > 0) {
                    handleFileClick('mindmap', data.maps[0].id, data.maps[0].title);
                } else if (data.chapters.length > 0) {
                    handleFileClick('chapter', data.chapters[0].id, data.chapters[0].title);
                }
            }
        });
    }, [project.id]);

    const handleFileClick = async (type: FileType, id: string, title: string) => {
        // 如果是 MindMap，需要单独获取详细数据 (包含大 JSON)
        // 如果是 Chapter，现在也需要获取 Content (数据库分离了)
        if (type === 'mindmap') {
            try {
                const detail = await apiService.getMindMapDetail(project.id, id);
                setActiveFile({ type, id, title, data: detail });
            } catch (e) {
                logger.error("加载导图详情失败", e);
            }
        } else if (type === 'chapter') {
            try {
                const detail = await apiService.getChapterDetail(project.id, id);
                setActiveFile({ type, id, title, data: detail });
            } catch (e) {
                logger.error("加载章节详情失败", e);
            }
        } else {
            setActiveFile({ type, id, title });
        }
    };

    const handleCreateMindMap = async () => {
        try {
            const newMap = await apiService.createMindMap(project.id);
            await loadStructure();
            setActiveFile({ type: 'mindmap', id: newMap.id, title: newMap.title, data: newMap });
        } catch (e) {
            alert('创建失败');
        }
    };

    const handleCreateChapter = async () => {
        try {
            const order = structure.chapters.length + 1;
            const newChap = await apiService.createChapter(project.id, `第${order}章`, order);
            await loadStructure();
            setActiveFile({ type: 'chapter', id: newChap.id, title: newChap.title, data: newChap });
        } catch (e) {
            alert('创建章节失败');
        }
    };

    const handleDeleteMindMap = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('确定删除此思维导图吗？')) return;
        await apiService.deleteMindMap(project.id, id);
        await loadStructure();
        if (activeFile?.id === id) setActiveFile(null);
    };

    const handleDeleteChapter = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('确定删除此章节吗？')) return;
        await apiService.deleteChapter(project.id, id);
        await loadStructure();
        if (activeFile?.id === id) setActiveFile(null);
    };

    const handleSaveMindMap = async (mapId: string, title: string, dataStr: string) => {
        try {
            await apiService.updateMindMap(project.id, mapId, title, dataStr);
            logger.info(`思维导图已保存: ${title}`);
            const newStruct = await apiService.getProjectStructure(project.id);
            setStructure(newStruct);
            if (activeFile?.id === mapId) setActiveFile(prev => prev ? { ...prev, title } : null);
        } catch (e) {
            logger.error("保存失败", e);
            alert("保存失败");
        }
    };

    const handleSaveChapter = async (chapId: string, title: string, content: string) => {
        try {
            await apiService.updateChapter(project.id, chapId, title, content);
            logger.info(`章节已保存: ${title}`);
            // Update list title
            const newStruct = await apiService.getProjectStructure(project.id);
            setStructure(newStruct);
            if (activeFile?.id === chapId) setActiveFile(prev => prev ? { ...prev, title, data: { ...prev.data, title, content } } : null);
        } catch (e) {
            logger.error("保存章节失败", e);
        }
    };

    const handleChapterCreatedFromMindMap = async (chapterId: string) => {
        const newData = await loadStructure();
        if (newData) {
            const newChap = newData.chapters.find(c => c.id === chapterId);
            if (newChap) {
                handleFileClick('chapter', newChap.id, newChap.title);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-40 bg-dark flex flex-col text-slate-200">
            {/* Top Bar */}
            <div className="h-12 border-b border-slate-700 bg-slate-900 flex items-center px-4 justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors" title="返回首页">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    </button>
                    <span className="font-bold text-indigo-400">SkyCraft IDE</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-sm text-slate-300">{project.title}</span>
                </div>
                <div className="text-xs text-slate-500">IDE Environment v2.9</div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-[#0d1117] border-r border-slate-700 flex flex-col flex-shrink-0 select-none">
                    <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                        <span>资源管理器</span>
                    </div>

                    {loading ? (
                        <div className="p-4 text-center text-slate-600 text-xs">加载中...</div>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-4 p-2">
                            {/* Mind Maps */}
                            <div>
                                <div className="flex items-center justify-between text-pink-400 px-2 py-1 mb-1 group">
                                    <div className="flex items-center gap-1 text-sm font-bold">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                        思维导图
                                    </div>
                                    <button onClick={handleCreateMindMap} className="opacity-0 group-hover:opacity-100 hover:text-white" title="新建导图">+</button>
                                </div>
                                <div className="pl-4 space-y-1">
                                    {structure.maps.map(map => (
                                        <div
                                            key={map.id}
                                            onClick={() => handleFileClick('mindmap', map.id, map.title)}
                                            className={`group flex justify-between items-center cursor-pointer px-2 py-1 rounded text-xs transition-colors ${activeFile?.id === map.id ? 'bg-pink-900/30 text-pink-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                        >
                                            <span className="truncate">{map.title}</span>
                                            <button onClick={(e) => handleDeleteMindMap(map.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-400">×</button>
                                        </div>
                                    ))}
                                    {structure.maps.length === 0 && <div className="text-[10px] text-slate-600 italic px-2">为空</div>}
                                </div>
                            </div>

                            {/* Chapters */}
                            <div>
                                <div className="flex items-center justify-between text-indigo-400 px-2 py-1 mb-1 group">
                                    <div className="flex items-center gap-1 text-sm font-bold">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        正文卷宗
                                    </div>
                                    <button onClick={handleCreateChapter} className="opacity-0 group-hover:opacity-100 hover:text-white" title="新建章节">+</button>
                                </div>
                                <div className="pl-4 space-y-1">
                                    {structure.chapters.map(chap => (
                                        <div
                                            key={chap.id}
                                            onClick={() => handleFileClick('chapter', chap.id, chap.title)}
                                            className={`group flex justify-between items-center cursor-pointer px-2 py-1 rounded text-xs truncate transition-colors ${activeFile?.id === chap.id ? 'bg-indigo-900/30 text-indigo-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                        >
                                            <span className="truncate">{chap.title}</span>
                                            <button onClick={(e) => handleDeleteChapter(chap.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-400">×</button>
                                        </div>
                                    ))}
                                    {structure.chapters.length === 0 && <div className="text-[10px] text-slate-600 italic px-2">为空</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Editor */}
                <div className="flex-1 bg-[#1e1e1e] flex flex-col relative overflow-hidden">
                    <div className="h-9 bg-[#2d2d2d] flex items-center px-2 space-x-1 overflow-x-auto border-b border-black/50 flex-shrink-0">
                        {activeFile && (
                            <div className="bg-[#1e1e1e] text-xs px-3 py-1.5 min-w-[100px] border-t-2 border-primary text-slate-200 flex items-center justify-between gap-2 select-none">
                                <span>{activeFile.title}</span>
                                <span onClick={(e) => { e.stopPropagation(); setActiveFile(null); }} className="hover:text-red-400 cursor-pointer">×</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {activeFile ? (
                            <div className="h-full w-full">
                                {activeFile.type === 'chapter' && activeFile.data && (
                                    <ChapterEditor
                                        projectId={project.id}
                                        chapter={activeFile.data}
                                        availableResources={{
                                            chapters: structure.chapters,
                                            maps: structure.maps
                                        }}
                                        novelSettings={DEFAULT_NOVEL_SETTINGS}
                                        onSave={handleSaveChapter}
                                    />
                                )}
                                {activeFile.type === 'mindmap' && activeFile.data && (
                                    <MindMapEditor
                                        projectId={project.id}
                                        mapData={activeFile.data}
                                        onSave={handleSaveMindMap}
                                        novelSettings={DEFAULT_NOVEL_SETTINGS}
                                        availableMaps={structure.maps}
                                        onChapterCreated={handleChapterCreatedFromMindMap}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                <p>请在左侧选择文件开始编辑</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
