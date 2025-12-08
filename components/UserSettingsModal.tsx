
import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { AppLanguage } from '../types';
import { Button } from './Button';
import { authService } from '../services/authService';
import { apiService } from '../services/geminiService';

interface Props {
    onClose: () => void;
}

type Tab = 'general' | 'account';

export const UserSettingsModal: React.FC<Props> = ({ onClose }) => {
    const { settings, updateSettings, t } = useSettings();
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [user, setUser] = useState<any>(null);
    
    // 密码修改状态
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'account') {
            loadUserInfo();
        }
    }, [activeTab]);

    const loadUserInfo = async () => {
        try {
            const u = await apiService.getUserStatus();
            setUser(u);
        } catch (e) {
            console.error(e);
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) return alert('请填写完整');
        if (newPassword.length < 6) return alert('新密码至少6位');
        
        setIsLoading(true);
        try {
            await authService.changePassword(oldPassword, newPassword);
            alert('密码修改成功');
            setOldPassword('');
            setNewPassword('');
        } catch (e: any) {
            alert('修改失败: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // 仅保留 中、英、日
    const languages: { id: AppLanguage; label: string; flag: string }[] = [
        { id: 'zh-CN', label: '简体中文 (中国)', flag: '🇨🇳' },
        { id: 'en-US', label: 'English (US)', flag: '🇺🇸' },
        { id: 'ja-JP', label: '日本語 (日本)', flag: '🇯🇵' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col h-[600px]">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>⚙️</span> {t('settings.modal.title')}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-32 bg-slate-900 border-r border-slate-700 p-2 space-y-1">
                        <button 
                            onClick={() => setActiveTab('general')} 
                            className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            通用设置
                        </button>
                        <button 
                            onClick={() => setActiveTab('account')} 
                            className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-all ${activeTab === 'account' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            账户安全
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 bg-[#0f172a] overflow-y-auto">
                        
                        {/* Tab: General */}
                        {activeTab === 'general' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-bold text-slate-400 mb-3">{t('settings.lang')}</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {languages.map(lang => (
                                        <button
                                            key={lang.id}
                                            onClick={() => updateSettings({ language: lang.id })}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all ${
                                                settings.language === lang.id 
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                                            }`}
                                        >
                                            <span className="text-xl">{lang.flag}</span>
                                            <span className="font-medium">{lang.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tab: Account */}
                        {activeTab === 'account' && (
                            <div className="animate-fade-in space-y-6">
                                {/* Basic Info */}
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <h3 className="text-indigo-400 font-bold mb-4 text-sm uppercase tracking-wider">当前登录信息</h3>
                                    {user ? (
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                                <span className="text-slate-500">用户 ID</span>
                                                <span className="text-slate-300 font-mono select-all">{user.id}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                                <span className="text-slate-500">用户名</span>
                                                <span className="text-white font-bold">{user.username}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">身份状态</span>
                                                <span className={user.isVip ? "text-yellow-400 font-bold" : "text-slate-400"}>
                                                    {user.isVip ? '尊贵会员' : '普通用户'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 text-center py-4">未登录</div>
                                    )}
                                </div>

                                {/* Change Password */}
                                {user && (
                                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                        <h3 className="text-pink-400 font-bold mb-4 text-sm uppercase tracking-wider">修改密码</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">当前旧密码</label>
                                                <input 
                                                    type="password" 
                                                    value={oldPassword}
                                                    onChange={e => setOldPassword(e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-pink-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">新密码 (至少6位)</label>
                                                <input 
                                                    type="password" 
                                                    value={newPassword}
                                                    onChange={e => setNewPassword(e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-pink-500"
                                                />
                                            </div>
                                            <div className="pt-2 flex justify-end">
                                                <Button size="sm" onClick={handleChangePassword} isLoading={isLoading} variant="secondary">
                                                    确认修改
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end gap-3 shrink-0">
                    <Button onClick={onClose} variant="primary">{t('btn.close')}</Button>
                </div>
            </div>
        </div>
    );
};
