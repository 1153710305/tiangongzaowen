
import Database from 'better-sqlite3';
import { User, Archive } from './types.ts';
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
    console.log(`[DB] Database initialized at ${DB_PATH} (WAL mode: ON)`);
}

// === Users ===

export function createUser(id: string, username: string, passwordHash: string): User {
    const stmt = db.prepare('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)');
    const now = new Date().toISOString();
    stmt.run(id, username, passwordHash, now);
    return { id, username, password_hash: passwordHash, created_at: now };
}

export function getUserByUsername(username: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | undefined;
}

export function getUserById(id: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
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

// === Admin Functions (新增后台管理功能) ===

/**
 * 获取系统统计信息
 */
export function getSystemStats() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const archiveCount = db.prepare('SELECT COUNT(*) as count FROM archives').get() as { count: number };
    const lastActive = db.prepare('SELECT updated_at FROM archives ORDER BY updated_at DESC LIMIT 1').get() as { updated_at: string } | undefined;

    return {
        totalUsers: userCount.count,
        totalArchives: archiveCount.count,
        lastActiveTime: lastActive?.updated_at || '无数据'
    };
}

/**
 * 获取所有用户列表（后台用）
 */
export function getAllUsers(): User[] {
    return db.prepare('SELECT id, username, created_at FROM users ORDER BY created_at DESC').all() as User[];
}

/**
 * 删除用户及其所有存档
 */
export function deleteUserFull(userId: string) {
    const deleteArchives = db.prepare('DELETE FROM archives WHERE user_id = ?');
    const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
    
    const transaction = db.transaction(() => {
        deleteArchives.run(userId);
        deleteUser.run(userId);
    });
    
    transaction();
}
