import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { apiService } from '../services/geminiService';
import { Button } from './Button';

interface Props {
    user: User;
    onClose: () => void;
}

export const UserProfileModal: React.FC<Props> = ({ user, onClose }) => {
    const [stats, setStats] = useState<{ tokens: number, isVip: boolean, vipExpiry: string | null } | null>(null);

    useEffect(() => {
        apiService.getUserStatus().then(stats => {
            setStats({
                tokens: stats.tokens,
                isVip: stats.isVip,
                vipExpiry: stats.vip_expiry
            });
        }).catch(console.error);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        👤 个人信息
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="p-6 space-y-6 bg-[#0f172a]">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                            {user.username[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="text-xl font-bold text-white">{user.username}</div>
                            <div className="text-sm text-slate-400">ID: {user.id}</div>
                        </div>
                    </div>

                    {stats && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <div className="text-slate-400 text-xs mb-1">剩余 Tokens</div>
                                <div className="text-2xl font-bold text-white">{stats.tokens.toLocaleString()}</div>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <div className="text-slate-400 text-xs mb-1">会员状态</div>
                                <div className={`text-lg font-bold ${stats.isVip ? 'text-yellow-400' : 'text-slate-300'}`}>
                                    {stats.isVip ? '尊贵会员' : '普通用户'}
                                </div>
                                {stats.isVip && stats.vipExpiry && (
                                    <div className="text-[10px] text-slate-500 mt-1">
                                        到期: {new Date(stats.vipExpiry).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end">
                    <Button onClick={onClose} variant="primary">关闭</Button>
                </div>
            </div>
        </div>
    );
};
