
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
            <div className="bg-[#0f172a] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden relative border border-slate-700/50">
                {/* 装饰背景 */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 opacity-80 pointer-events-none"></div>
                <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="p-8 pb-4 relative z-10 shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-2">System Notice</div>
                            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                📢 系统公告
                            </h2>
                        </div>
                        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 relative z-10 custom-scrollbar">
                    {loading ? (
                        <div className="text-center text-slate-400 py-10 animate-pulse">正在获取最新消息...</div>
                    ) : list.length === 0 ? (
                        <div className="text-center text-slate-500 py-10 flex flex-col items-center">
                            <div className="text-4xl mb-2">📭</div>
                            暂无新公告
                        </div>
                    ) : (
                        list.map(ann => (
                            <div key={ann.id} className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/30 transition-all group">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">{ann.title}</h3>
                                </div>
                                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed opacity-90 pl-5">
                                    {ann.content}
                                </div>
                                <div className="text-xs text-slate-500 mt-4 pl-5 flex items-center gap-2">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    发布于 {new Date(ann.created_at).toLocaleString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-slate-900/50 backdrop-blur-sm border-t border-slate-800 text-center">
                    <button onClick={onClose} className="text-sm text-slate-400 hover:text-white transition-colors">
                        关闭窗口
                    </button>
                </div>
            </div>
        </div>
    );
};
