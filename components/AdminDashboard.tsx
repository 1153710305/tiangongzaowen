
import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { SystemStats } from '../types';
import { Button } from './Button';
import { logger } from '../services/loggerService';

interface Props {
    onClose: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onClose }) => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [poolJson, setPoolJson] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'pool'>('overview');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const s = await adminService.getStats();
        setStats(s);
        
        try {
            const p = await adminService.getPool();
            setPoolJson(JSON.stringify(p, null, 2));
        } catch (e) {
            setPoolJson('// Error loading pool data');
        }
    };

    const handleSavePool = async () => {
        setIsSaving(true);
        try {
            const data = JSON.parse(poolJson);
            await adminService.updatePool(data);
            alert("素材池已热更新，无需重启服务器！");
        } catch (e) {
            alert("JSON 格式错误或保存失败，请检查控制台");
            logger.error("JSON Parse/Save Error", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="bg-[#1e293b] w-full max-w-4xl h-[90vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                    <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        服务器管理后台 (Admin)
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-800">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'overview' ? 'text-white border-b-2 border-red-500 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        系统概览
                    </button>
                    <button 
                        onClick={() => setActiveTab('pool')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'pool' ? 'text-white border-b-2 border-red-500 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        素材池热更新 (JSON)
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-[#0f172a]">
                    {activeTab === 'overview' && stats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <div className="text-slate-400 text-sm mb-1">总用户数</div>
                                <div className="text-3xl font-bold text-white">{stats.userCount}</div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <div className="text-slate-400 text-sm mb-1">总存档数</div>
                                <div className="text-3xl font-bold text-white">{stats.archiveCount}</div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <div className="text-slate-400 text-sm mb-1">数据库大小 (MB)</div>
                                <div className="text-3xl font-bold text-blue-400">{stats.dbSizeMB}</div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <div className="text-slate-400 text-sm mb-1">运行时间 (秒)</div>
                                <div className="text-3xl font-bold text-green-400">{Math.floor(stats.uptimeSeconds)}</div>
                            </div>
                            
                            <div className="col-span-1 md:col-span-4 mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-200 text-sm">
                                💡 提示：系统采用 SQLite WAL 模式，所有数据实时写入。第一个注册的用户自动成为管理员。
                            </div>
                        </div>
                    )}

                    {activeTab === 'pool' && (
                        <div className="h-full flex flex-col">
                            <div className="mb-4 flex justify-between items-center">
                                <p className="text-slate-400 text-sm">
                                    在此处直接修改 JSON 配置，点击保存后，所有客户端将立即获取新的爆款素材（无需重启服务器）。
                                </p>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" onClick={loadData}>重置</Button>
                                    <Button variant="danger" size="sm" onClick={handleSavePool} isLoading={isSaving}>保存并热更新</Button>
                                </div>
                            </div>
                            <textarea 
                                className="flex-1 w-full bg-[#0d1117] text-green-400 font-mono text-sm p-4 rounded-lg border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                                value={poolJson}
                                onChange={(e) => setPoolJson(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
