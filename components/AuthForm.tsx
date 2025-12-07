
import React, { useState } from 'react';
import { Button } from './Button';
import { authService } from '../services/authService';
import { User } from '../types';

interface Props {
    onLoginSuccess: (user: User) => void;
    onClose?: () => void;
}

export const AuthForm: React.FC<Props> = ({ onLoginSuccess, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            let user;
            if (isLogin) {
                user = await authService.login(username, password);
            } else {
                user = await authService.register(username, password);
            }
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message || '操作失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 relative">
                {/* 关闭按钮 */}
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        title="关闭"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                )}

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary inline-block">
                        天工造文
                    </h1>
                    <p className="text-slate-400 mt-2">AI 爆款网文创作助手</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">用户名</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-dark border border-slate-600 rounded px-4 py-3 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            placeholder="请输入用户名"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">密码</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-dark border border-slate-600 rounded px-4 py-3 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            placeholder="至少6位字符"
                            required
                            minLength={6}
                        />
                    </div>

                    <Button 
                        type="submit" 
                        isLoading={isLoading} 
                        className="w-full mt-4"
                        size="lg"
                    >
                        {isLogin ? '立即登录' : '注册账号'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    {isLogin ? '还没有账号？' : '已有账号？'}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="ml-1 text-primary hover:text-indigo-400 font-medium underline-offset-2 hover:underline"
                    >
                        {isLogin ? '去注册' : '去登录'}
                    </button>
                </div>
            </div>
        </div>
    );
};