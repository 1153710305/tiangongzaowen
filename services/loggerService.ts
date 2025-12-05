import { LogEntry, LogLevel } from "../types";

/**
 * 简单的内存日志服务
 * 实际生产中可对接后端日志系统或Sentry
 */
class LoggerService {
    private logs: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];

    // 添加日志
    public addLog(level: LogLevel, message: string, details?: any) {
        const entry: LogEntry = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            level,
            message,
            details
        };

        this.logs = [entry, ...this.logs].slice(0, 100); // 只保留最近100条
        this.notifyListeners();
        
        // 同时输出到控制台，方便开发调试
        const style = level === LogLevel.ERROR ? 'color: red' : 'color: cyan';
        console.log(`%c[${level}] ${message}`, style, details || '');
    }

    public info(message: string, details?: any) {
        this.addLog(LogLevel.INFO, message, details);
    }

    public error(message: string, details?: any) {
        this.addLog(LogLevel.ERROR, message, details);
    }

    public warn(message: string, details?: any) {
        this.addLog(LogLevel.WARN, message, details);
    }

    public getLogs(): LogEntry[] {
        return this.logs;
    }

    // 订阅日志变化（用于UI实时更新）
    public subscribe(listener: (logs: LogEntry[]) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.logs));
    }
}

export const logger = new LoggerService();