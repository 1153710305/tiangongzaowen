
import { LogLevel } from './types.ts';

/**
 * 日志条目接口
 */
export interface ServerLogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    meta?: any;
}

/**
 * 服务端日志管理器
 * 1. 控制台输出：用于开发和运维查看
 * 2. 内存缓冲：用于 Admin UI 实时展示 (保留最近 N 条)
 */
class ServerLogger {
    private logs: ServerLogEntry[] = [];
    private readonly MAX_LOGS = 200; // 内存中最多保留200条日志

    private createEntry(level: LogLevel, message: string, meta?: any): ServerLogEntry {
        return {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            level,
            message,
            meta
        };
    }

    private pushLog(entry: ServerLogEntry) {
        // 控制台输出，根据颜色区分级别
        const colorMap: Record<LogLevel, string> = {
            [LogLevel.INFO]: '\x1b[36m%s\x1b[0m', // Cyan
            [LogLevel.WARN]: '\x1b[33m%s\x1b[0m', // Yellow
            [LogLevel.ERROR]: '\x1b[31m%s\x1b[0m', // Red
            [LogLevel.DEBUG]: '\x1b[90m%s\x1b[0m', // Gray
        };
        
        const metaStr = entry.meta ? JSON.stringify(entry.meta) : '';
        console.log(colorMap[entry.level], `[${entry.timestamp}] [${entry.level}] ${entry.message} ${metaStr}`);

        // 存入内存队列
        this.logs.unshift(entry);
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.pop();
        }
    }

    public info(message: string, meta?: any) {
        this.pushLog(this.createEntry(LogLevel.INFO, message, meta));
    }

    public warn(message: string, meta?: any) {
        this.pushLog(this.createEntry(LogLevel.WARN, message, meta));
    }

    public error(message: string, meta?: any) {
        this.pushLog(this.createEntry(LogLevel.ERROR, message, meta));
    }

    public debug(message: string, meta?: any) {
        this.pushLog(this.createEntry(LogLevel.DEBUG, message, meta));
    }

    /**
     * 获取最近的日志
     */
    public getRecentLogs(): ServerLogEntry[] {
        return this.logs;
    }
}

export const logger = new ServerLogger();
