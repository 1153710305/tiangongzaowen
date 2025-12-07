
import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { UserPrompt, PromptType } from '../types';
import { apiService } from '../services/geminiService';

interface Props {
    onClose: () => void;
}

export const PromptLibraryModal: React.FC<Props> = ({ onClose }) => {
    const [prompts, setPrompts] = useState<UserPrompt[]>([]);
    const [activeTab, setActiveTab] = useState<PromptType>('system');
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formContent, setFormContent] = useState('');

    useEffect(() => {
        loadPrompts();
    }, []);

    const loadPrompts = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getUserPrompts();
            setPrompts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formTitle || !formContent) return alert("请填写标题和内容");
        try {
            const newPrompt = await apiService.createUserPrompt(activeTab, formTitle, formContent);
            setPrompts([newPrompt, ...prompts]);
            resetForm();
        } catch (e) {
            alert("创建失败");
        }
    };

    const handleUpdate = async () => {
        if (!editingId || !formTitle || !formContent) return;
        try {
            await apiService.updateUserPrompt(editingId, formTitle, formContent);
            setPrompts(prompts.map(p => p.id === editingId ? { ...p, title: formTitle, content: formContent } : p));
            resetForm();
        } catch (e) {
            alert("更新失败");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("确定删除?")) return;
        try {
            await apiService.deleteUserPrompt(id);
            setPrompts(prompts.filter(p => p.id !== id));
        } catch (e) {
            alert("删除失败");
        }
    };

    const startEdit = (p: UserPrompt) => {
        setEditingId(p.id);
        setFormTitle(p.title);
        setFormContent(p.content);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormTitle('');
        setFormContent('');
    };

    const filteredPrompts = prompts.filter(p => p.type === activeTab);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col relative overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>📚</span> 提示词库管理
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-48 bg-slate-900 border-r border-slate-700 flex flex-col p-2 space-y-1">
                        <button onClick={() => { setActiveTab('system'); resetForm(); }} className={`text-left px-3 py-2 rounded text-sm transition-colors ${activeTab === 'system' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                            🎭 身份设定
                        </button>
                        <button onClick={() => { setActiveTab('constraint'); resetForm(); }} className={`text-left px-3 py-2 rounded text-sm transition-colors ${activeTab === 'constraint' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                            🚫 约束条件
                        </button>
                        <button onClick={() => { setActiveTab('normal'); resetForm(); }} className={`text-left px-3 py-2 rounded text-sm transition-colors ${activeTab === 'normal' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                            📝 常用指令
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col bg-[#0f172a] p-6 overflow-hidden">
                        {/* Input Area */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 shrink-0">
                            <h3 className="text-sm font-bold text-slate-300 mb-3">{editingId ? '编辑提示词' : '新增提示词'}</h3>
                            <div className="space-y-3">
                                <input 
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    placeholder="标题 (例如：深沉反派风格)"
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm outline-none focus:border-primary"
                                />
                                <textarea 
                                    value={formContent}
                                    onChange={e => setFormContent(e.target.value)}
                                    placeholder="提示词内容..."
                                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm outline-none focus:border-primary resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                    {editingId && <Button size="sm" variant="ghost" onClick={resetForm}>取消</Button>}
                                    <Button size="sm" onClick={editingId ? handleUpdate : handleCreate}>
                                        {editingId ? '更新' : '添加'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {isLoading ? (
                                <div className="text-slate-500 text-center text-sm py-4">加载中...</div>
                            ) : filteredPrompts.length === 0 ? (
                                <div className="text-slate-500 text-center text-sm py-4">暂无数据，请添加</div>
                            ) : (
                                filteredPrompts.map(p => (
                                    <div key={p.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-slate-500 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-200 text-sm">{p.title}</span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEdit(p)} className="text-indigo-400 text-xs hover:underline">编辑</button>
                                                <button onClick={() => handleDelete(p.id)} className="text-red-400 text-xs hover:underline">删除</button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 line-clamp-2">{p.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
