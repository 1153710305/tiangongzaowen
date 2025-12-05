
import Database from 'better-sqlite3';
import { User, Archive, SystemStats, UserRole } from './types.ts';
import fs from 'fs';
import path from 'path';

// 确保数据目录存在
const DB_PATH = process.env.DB_PATH || 'skycraft.db';
const db = new Database(DB_PATH);

// 开启 WAL 模式，显著提升并发读写性能
db.pragma('journal_mode = WAL');

// 初始化表结构
export function initDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'user',
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS archives (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            content TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_archives_user ON archives(user_id);
    `);

    // 自动迁移：检查 users 表是否有 role 字段 (针对 v2.0 升级到 v2.1 的情况)
    try {
        const tableInfo = db.pragma('table_info(users)') as any[];
        const hasRole = tableInfo.some(col => col.name === 'role');
        if (!hasRole) {
            console.log("[DB Migration] Adding 'role' column to users table...");
            db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
        }
    } catch (e) {
        console.error("[DB Migration Error]", e);
    }

    console.log(`[DB] Database initialized at ${DB_PATH} (WAL mode: ON)`);
}

// === Users ===

export function createUser(id: string, username: string, passwordHash: string): User {
    // 检查是否是第一个用户
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const result = countStmt.get() as { count: number };
    const isFirstUser = result.count === 0;
    
    // 第一个用户自动赋予 Admin 权限
    const role = isFirstUser ? UserRole.ADMIN : UserRole.USER;

    const stmt = db.prepare('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    stmt.run(id, username, passwordHash, role, now);
    
    if (isFirstUser) {
        console.log(`[Auth] First user '${username}' created as SUPER ADMIN.`);
    }

    return { id, username, password_hash: passwordHash, role, created_at: now };
}

export function getUserByUsername(username: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | undefined;
}

export function getUserById(id: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
}

export function getAllUsers(): User[] {
    const stmt = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
    return stmt.all() as User[];
}

// === Archives ===

export function createArchive(id: string, userId: string, title: string, content: string): Archive {
    const stmt = db.prepare('INSERT INTO archives (id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    stmt.run(id, userId, title, content, now, now);
    return { id, user_id: userId, title, content, created_at: now, updated_at: now };
}

export function updateArchive(id: string, userId: string, title: string, content: string): void {
    const stmt = db.prepare('UPDATE archives SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?');
    const now = new Date().toISOString();
    stmt.run(title, content, now, id, userId);
}

export function getArchivesByUser(userId: string): Archive[] {
    const stmt = db.prepare('SELECT * FROM archives WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId) as Archive[];
}

export function deleteArchive(id: string, userId: string): void {
    const stmt = db.prepare('DELETE FROM archives WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
}

// === Admin Stats ===

export function getSystemStats(): SystemStats {
    const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
    const archiveCount = (db.prepare('SELECT COUNT(*) as c FROM archives').get() as any).c;
    
    // 获取 DB 文件大小
    let dbSizeMB = 0;
    try {
        const stats = fs.statSync(DB_PATH);
        dbSizeMB = Math.round((stats.size / 1024 / 1024) * 100) / 100;
    } catch (e) { /* ignore */ }

    return {
        userCount,
        archiveCount,
        dbSizeMB,
        uptimeSeconds: process.uptime()
    };
}
