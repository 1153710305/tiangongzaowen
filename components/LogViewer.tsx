import React, { useEffect, useState, useRef } from 'react';
import { LogEntry, LogLevel } from '../types';
import { logger } from '../services/loggerService';
import { JsonDisplay } from './JsonDisplay';

export const LogViewer: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 订阅日志更新
        const unsubscribe = logger.subscribe((newLogs) => {
            setLogs([...newLogs]); // 触发重渲染
        });
        return unsubscribe;
    }, []);

    // 自动滚动到底部
    useEffect(() => {
        if (isOpen && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isOpen]);

    const getLevelColor = (level: LogLevel) => {
        switch (level) {
            case LogLevel.INFO: return 'text-blue-400';
            case LogLevel.WARN: return 'text-yellow-400';
            case LogLevel.ERROR: return 'text-red-500';
            case LogLevel.DEBUG: return 'text-gray-400';
            default: return 'text-slate-200';
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 bg-paper border border-slate-700 p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors z-50 text-xs text-slate-400"
                title="打开系统日志"
            >
                <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l6-6-6-6" /><path d="M12 19h8" /></svg>
                    日志 ({logs.length})
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-0 right-0 w-full md:w-96 h-64 md:h-96 bg-dark border-t md:border-l border-slate-700 shadow-2xl z-50 flex flex-col font-mono text-xs">
            <div className="flex justify-between items-center p-2 bg-paper border-b border-slate-700">
                <span className="font-bold text-slate-300">系统运行日志</span>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#0d1117]">
                {logs.length === 0 && <div className="text-slate-600 italic">暂无日志...</div>}
                {logs.slice().reverse().map((log) => (
                    <div key={log.id} className="break-words border-b border-slate-800/50 pb-1 mb-1 last:border-0">
                        <span className="text-slate-500">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                        <span className={`mx-2 font-bold ${getLevelColor(log.level)}`}>{log.level}</span>
                        <span className="text-slate-300">{log.message}</span>
                        {log.details && (
                            <div className="mt-1 p-2 bg-black/30 rounded border border-slate-800/50 overflow-x-auto">
                                <JsonDisplay data={log.details} />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};