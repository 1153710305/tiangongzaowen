
import Database from 'better-sqlite3';
import { User, Archive, DbIdeaCard, IdeaCardData } from './types.ts';
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

        -- 新增：脑洞卡片表
        -- 性能优化：content 存储为 JSON 字符串，避免字段过多导致扩展困难，且支持更复杂的嵌套结构
        CREATE TABLE IF NOT EXISTS idea_cards (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT, 
            content TEXT, 
            created_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_idea_cards_user ON idea_cards(user_id);
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

/**
 * 更新用户密码
 */
export function updateUserPassword(id: string, newPasswordHash: string): void {
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    stmt.run(newPasswordHash, id);
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

/**
 * 获取某用户的所有存档（性能优化：按更新时间降序）
 */
export function getArchivesByUser(userId: string): Archive[] {
    const stmt = db.prepare('SELECT * FROM archives WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId) as Archive[];
}

/**
 * [Performance] 获取单个存档的完整信息
 * 这是一个主键查询，速度极快 (O(1))，适合详情页加载
 */
export function getArchiveById(id: string): Archive | undefined {
    const stmt = db.prepare('SELECT * FROM archives WHERE id = ?');
    return stmt.get(id) as Archive | undefined;
}

export function deleteArchive(id: string, userId: string): void {
    const stmt = db.prepare('DELETE FROM archives WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
}

// === Idea Cards (新增) ===

/**
 * 创建脑洞卡片
 */
export function createIdeaCard(id: string, userId: string, data: IdeaCardData): DbIdeaCard {
    const stmt = db.prepare('INSERT INTO idea_cards (id, user_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    const contentStr = JSON.stringify(data);
    stmt.run(id, userId, data.title, contentStr, now);
    return { id, user_id: userId, title: data.title, content: contentStr, created_at: now };
}

/**
 * 获取用户所有脑洞卡片
 */
export function getIdeaCardsByUser(userId: string): DbIdeaCard[] {
    const stmt = db.prepare('SELECT * FROM idea_cards WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as DbIdeaCard[];
}

/**
 * 删除脑洞卡片
 */
export function deleteIdeaCard(id: string, userId: string): void {
    const stmt = db.prepare('DELETE FROM idea_cards WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
}


// === Admin Functions ===

/**
 * 获取系统统计信息
 */
export function getSystemStats() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const archiveCount = db.prepare('SELECT COUNT(*) as count FROM archives').get() as { count: number };
    const cardCount = db.prepare('SELECT COUNT(*) as count FROM idea_cards').get() as { count: number }; // 新增统计
    const lastActive = db.prepare('SELECT updated_at FROM archives ORDER BY updated_at DESC LIMIT 1').get() as { updated_at: string } | undefined;

    return {
        totalUsers: userCount.count,
        totalArchives: archiveCount.count,
        totalCards: cardCount.count,
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
 * 删除用户及其所有数据 (级联删除 archives 和 idea_cards)
 */
export function deleteUserFull(userId: string) {
    const deleteArchives = db.prepare('DELETE FROM archives WHERE user_id = ?');
    const deleteCards = db.prepare('DELETE FROM idea_cards WHERE user_id = ?');
    const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
    
    const transaction = db.transaction(() => {
        deleteArchives.run(userId);
        deleteCards.run(userId);
        deleteUser.run(userId);
    });
    
    transaction();
}
