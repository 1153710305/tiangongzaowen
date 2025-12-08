
import React, { useEffect, useState } from 'react';
import { apiService } from '../services/geminiService';

interface Props {
    onClose: () => void;
}

export const AnnouncementModal: React.FC<Props> = ({ onClose }) => {
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiService.getAnnouncements().then(data => {
            setList(data);
            setLoading(false);
        });
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">📢 系统公告</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0f172a]">
                    {loading ? <div className="text-center text-slate-500 py-10">加载中...</div> : list.length===0 ? <div className="text-center text-slate-500 py-10">暂无公告</div> : list.map(ann => (
                        <div key={ann.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-2">{ann.title}</h3>
                            <div className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">{ann.content}</div>
                            <div className="text-xs text-slate-600 mt-4 pt-2 border-t border-slate-700/50">
                                发布时间: {new Date(ann.created_at).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
