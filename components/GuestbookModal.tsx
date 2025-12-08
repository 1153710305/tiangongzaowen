
import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { apiService } from '../services/geminiService';

interface Props {
    onClose: () => void;
}

export const GuestbookModal: React.FC<Props> = ({ onClose }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        loadMessages();
    }, []);

    const loadMessages = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getMessages();
            setMessages(data);
        } catch(e) {} finally { setIsLoading(false); }
    };

    const handleSend = async () => {
        if(!input.trim()) return;
        setIsSending(true);
        try {
            await apiService.postMessage(input);
            setInput('');
            loadMessages();
        } catch(e) { alert("发送失败"); } finally { setIsSending(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col h-[70vh] overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-white">💬 留言反馈</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f172a]">
                    {isLoading ? <div className="text-center text-slate-500 py-10">加载中...</div> : messages.length===0 ? <div className="text-center text-slate-500 py-10">暂无留言，欢迎反馈！</div> : messages.map(msg => (
                        <div key={msg.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                            <div className="text-sm text-slate-300 whitespace-pre-wrap">{msg.content}</div>
                            <div className="text-xs text-slate-500 mt-2 text-right">{new Date(msg.created_at).toLocaleString()}</div>
                            {msg.reply && (
                                <div className="mt-2 pt-2 border-t border-slate-700 ml-4">
                                    <div className="text-xs text-green-400 font-bold mb-1">管理员回复:</div>
                                    <div className="text-sm text-slate-400">{msg.reply}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-slate-800 border-t border-slate-700 shrink-0">
                    <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="写下您的建议或遇到的问题..." className="w-full h-20 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white mb-2 resize-none outline-none focus:border-indigo-500"></textarea>
                    <div className="flex justify-end">
                        <Button size="sm" onClick={handleSend} isLoading={isSending} disabled={!input.trim()}>发送留言</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
