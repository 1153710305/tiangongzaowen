
import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { Button } from './Button';
import { apiService } from '../services/geminiService';

interface Props {
    projects: Project[];
    onClose: () => void;
    onSelectProject: (project: Project) => void;
    onDeleteProject: (projectId: string) => void;
}

export const ProjectListModal: React.FC<Props> = ({ projects: activeProjects, onClose, onSelectProject, onDeleteProject }) => {
    
    const [tab, setTab] = useState<'active' | 'trash'>('active');
    const [trashProjects, setTrashProjects] = useState<Project[]>([]);
    const [isLoadingTrash, setIsLoadingTrash] = useState(false);

    useEffect(() => {
        if (tab === 'trash') {
            setIsLoadingTrash(true);
            apiService.getDeletedProjects().then(res => {
                setTrashProjects(res);
                setIsLoadingTrash(false);
            });
        }
    }, [tab]);

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("确定要将该项目移入回收站吗？\n(可在回收站中保存30天)")) {
            onDeleteProject(id);
        }
    };

    const handleRestore = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await apiService.restoreProject(id);
            setTrashProjects(prev => prev.filter(p => p.id !== id));
            alert("项目已恢复");
            // 刷新列表需要由父组件重新获取，这里简单提示用户重新打开
        } catch(e) { alert("恢复失败"); }
    };

    const handlePermanentDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(!confirm("⚠️ 警告：彻底删除后无法找回！确定吗？")) return;
        try {
            await apiService.permanentDeleteProject(id);
            setTrashProjects(prev => prev.filter(p => p.id !== id));
        } catch(e) { alert("删除失败"); }
    };

    const displayList = tab === 'active' ? activeProjects : trashProjects;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col relative overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <span>📂</span> 我的作品库
                        </h2>
                        <div className="flex gap-4 mt-2 text-sm">
                            <button onClick={() => setTab('active')} className={`border-b-2 pb-1 transition-colors ${tab === 'active' ? 'border-indigo-500 text-white font-bold' : 'border-transparent text-slate-400'}`}>进行中 ({activeProjects.length})</button>
                            <button onClick={() => setTab('trash')} className={`border-b-2 pb-1 transition-colors ${tab === 'trash' ? 'border-indigo-500 text-white font-bold' : 'border-transparent text-slate-400'}`}>回收站</button>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#0f172a]">
                    {isLoadingTrash ? (
                        <div className="text-center text-slate-500 py-10">加载回收站数据...</div>
                    ) : displayList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            <p>{tab === 'active' ? '暂无项目，请从“脑洞卡片”中初始化新作品。' : '回收站为空'}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayList.map(project => (
                                <div 
                                    key={project.id}
                                    onClick={() => tab === 'active' && onSelectProject(project)}
                                    className={`bg-slate-800 border border-slate-700 rounded-xl p-5 transition-all group relative flex flex-col h-48 ${tab === 'active' ? 'cursor-pointer hover:border-indigo-500 hover:shadow-lg' : 'opacity-75'}`}
                                >
                                    {tab === 'active' && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                                    
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-white truncate pr-2">{project.title}</h3>
                                    </div>
                                    
                                    <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-1">
                                        {project.description || '无简介'}
                                    </p>
                                    
                                    <div className="flex justify-between items-end border-t border-slate-700/50 pt-3">
                                        <span className="text-xs text-slate-500">
                                            {new Date(project.updated_at).toLocaleDateString()} 更新
                                        </span>
                                        {tab === 'active' ? (
                                            <button 
                                                onClick={(e) => handleDelete(e, project.id)}
                                                className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors"
                                                title="移入回收站"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button onClick={(e) => handleRestore(e, project.id)} className="text-green-400 hover:text-green-300 text-xs">恢复</button>
                                                <button onClick={(e) => handlePermanentDelete(e, project.id)} className="text-red-400 hover:text-red-300 text-xs">彻底删除</button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {tab === 'active' && <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity pointer-events-none"></div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end">
                    <Button variant="ghost" onClick={onClose}>关闭</Button>
                </div>
            </div>
        </div>
    );
};
