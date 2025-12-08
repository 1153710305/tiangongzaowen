
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

    // 判断公告是否为最近3天发布
    const isNew = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays <= 3;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#0f172a] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden relative border border-slate-700/50">
                
                {/* Header Area: 包含背景和标题 */}
                <div className="relative shrink-0 overflow-hidden">
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 opacity-90"></div>
                    {/* Decorative Blurs */}
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-pink-500/20 rounded-full blur-[60px] pointer-events-none"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none"></div>

                    {/* Header Content */}
                    <div className="relative z-10 p-8 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                                </span>
                                <span className="text-xs font-bold text-pink-300 uppercase tracking-widest">System Notice</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                                📢 系统公告
                            </h2>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all hover:rotate-90 active:scale-95 backdrop-blur-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Content Area: 独立滚动区域 */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-[#0f172a] custom-scrollbar relative z-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-60">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400 text-sm">正在获取最新消息...</p>
                        </div>
                    ) : list.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-50">
                            <div className="text-4xl">📭</div>
                            <p className="text-slate-500">暂无新公告</p>
                        </div>
                    ) : (
                        list.map(ann => (
                            <div key={ann.id} className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50 hover:border-indigo-500/30 transition-all group hover:bg-slate-800/60">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors">
                                            {ann.title}
                                        </h3>
                                        {isNew(ann.created_at) && (
                                            <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm">NEW</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono">
                                        {new Date(ann.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed opacity-90 pl-3 border-l-2 border-slate-700/50 group-hover:border-indigo-500/50 transition-colors py-1">
                                    {ann.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 flex justify-center shrink-0 z-10">
                    <button onClick={onClose} className="text-sm text-slate-400 hover:text-white transition-colors px-6 py-2 rounded-lg hover:bg-slate-800">
                        关闭窗口
                    </button>
                </div>
            </div>
        </div>
    );
};
