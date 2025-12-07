
import React, { useState } from 'react';
import { NovelProject, Chapter, MindMap } from '../types';

interface Props {
    project: NovelProject;
    onBack: () => void;
}

export const ProjectWorkspace: React.FC<Props> = ({ project, onBack }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'maps' | 'chapters'>('overview');
    
    // 从 project.folders 中解构数据 (如果存在)
    const chapters = project.folders?.chapters || [];
    const mindMaps = project.folders?.mind_maps || [];

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-slate-200">
            {/* 顶栏 */}
            <header className="h-14 border-b border-slate-700 flex items-center px-4 bg-slate-900 flex-shrink-0">
                <button 
                    onClick={onBack}
                    className="mr-4 text-slate-400 hover:text-white flex items-center gap-1 text-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    返回列表
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{project.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300 border border-indigo-700">
                        {project.status === 'draft' ? '草稿中' : '已发布'}
                    </span>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* 左侧文件夹导航 */}
                <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                    <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        工程目录 (Project Folder)
                    </div>
                    <nav className="flex-1 p-2 space-y-1">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 text-sm transition-colors ${activeTab === 'overview' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/50'}`}
                        >
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            项目概览 (Overview)
                        </button>
                        
                        {/* 文件夹：思维导图 */}
                        <div className="mt-4 pt-2 border-t border-slate-800/50">
                            <div className="px-3 py-1 text-[10px] text-slate-500 mb-1 flex justify-between items-center group">
                                <span>🧠 思维导图文件夹</span>
                                <button className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-300">+</button>
                            </div>
                            <button 
                                onClick={() => setActiveTab('maps')}
                                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 text-sm transition-colors ${activeTab === 'maps' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/50'}`}
                            >
                                <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                所有导图 ({mindMaps.length})
                            </button>
                            {/* 子菜单预览 */}
                            <div className="pl-6 space-y-1 mt-1">
                                {mindMaps.map(map => (
                                    <div key={map.id} className="text-xs text-slate-500 py-1 hover:text-slate-300 cursor-pointer flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-pink-500"></span>
                                        {map.title}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 文件夹：正文章节 */}
                        <div className="mt-4 pt-2 border-t border-slate-800/50">
                             <div className="px-3 py-1 text-[10px] text-slate-500 mb-1 flex justify-between items-center group">
                                <span>📝 正文草稿文件夹</span>
                                <button className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-300">+</button>
                            </div>
                             <button 
                                onClick={() => setActiveTab('chapters')}
                                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 text-sm transition-colors ${activeTab === 'chapters' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/50'}`}
                            >
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                所有章节 ({chapters.length})
                            </button>
                             {/* 子菜单预览 */}
                            <div className="pl-6 space-y-1 mt-1">
                                {chapters.map(chap => (
                                    <div key={chap.id} className="text-xs text-slate-500 py-1 hover:text-slate-300 cursor-pointer flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-green-500"></span>
                                        {chap.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </nav>
                </aside>

                {/* 主工作区 */}
                <main className="flex-1 bg-[#161b22] p-8 overflow-y-auto">
                    
                    {/* 概览视图 */}
                    {activeTab === 'overview' && (
                        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                <h3 className="text-xl font-bold mb-4 text-indigo-400">项目设定概览</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">简介</label>
                                        <p className="text-slate-200">{project.idea_snapshot.intro}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase block mb-1">核心爽点</label>
                                            <p className="text-slate-300 text-sm">{project.idea_snapshot.highlight}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase block mb-1">金手指</label>
                                            <p className="text-slate-300 text-sm">{project.idea_snapshot.golden_finger}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-slate-800/50 p-6 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-center hover:bg-slate-800 hover:border-pink-500/50 transition-all cursor-pointer group" onClick={() => setActiveTab('maps')}>
                                    <div className="w-12 h-12 bg-pink-900/30 rounded-full flex items-center justify-center mb-3 group-hover:bg-pink-900/50 text-pink-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                    </div>
                                    <h4 className="font-bold">思维导图文件夹</h4>
                                    <p className="text-xs text-slate-500 mt-1">管理人物关系、时间线与世界观</p>
                                    <span className="mt-2 text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">{mindMaps.length} 个文件</span>
                                </div>
                                <div className="bg-slate-800/50 p-6 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-center hover:bg-slate-800 hover:border-green-500/50 transition-all cursor-pointer group" onClick={() => setActiveTab('chapters')}>
                                    <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mb-3 group-hover:bg-green-900/50 text-green-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                    </div>
                                    <h4 className="font-bold">正文草稿文件夹</h4>
                                    <p className="text-xs text-slate-500 mt-1">撰写、润色与生成正文内容</p>
                                    <span className="mt-2 text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">{chapters.length} 个文件</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 思维导图视图 */}
                    {activeTab === 'maps' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">思维导图列表</h3>
                                <button className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded text-sm text-white shadow">+ 新建导图</button>
                            </div>
                            {mindMaps.length === 0 ? (
                                <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                                    文件夹为空 (Empty)
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {mindMaps.map(map => (
                                        <div key={map.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-pink-500 transition-colors cursor-pointer group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="p-2 bg-pink-900/30 rounded text-pink-400">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-white mb-1">{map.title}</h4>
                                            <p className="text-xs text-slate-500">最后更新: {new Date(map.updated_at).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 正文视图 */}
                    {activeTab === 'chapters' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">正文章节列表</h3>
                                <button className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm text-white shadow">+ 新建章节</button>
                            </div>
                            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                <div className="divide-y divide-slate-700">
                                    {chapters.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 italic">暂无章节内容</div>
                                    ) : (
                                        chapters.map(chap => (
                                            <div key={chap.id} className="p-4 hover:bg-slate-700/50 flex items-center justify-between cursor-pointer transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-500 font-mono text-sm">#{chap.order_index}</span>
                                                    <span className="text-white font-medium">{chap.title}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 flex gap-4">
                                                    <span>{new Date(chap.updated_at!).toLocaleDateString()}</span>
                                                    <span className="group-hover:text-indigo-400">点击编辑 &rarr;</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
};
