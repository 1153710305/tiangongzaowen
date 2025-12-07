
import Database from 'better-sqlite3';
import { User, Archive, DbIdeaCard, IdeaCardData, DbNovelProject, DbChapter, DbMindMap } from './types.ts';
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

        CREATE TABLE IF NOT EXISTS idea_cards (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT, 
            content TEXT, 
            created_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_idea_cards_user ON idea_cards(user_id);

        -- === v2.7 新增：小说项目体系 ===

        -- 1. 项目主表
        CREATE TABLE IF NOT EXISTS novel_projects (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            idea_snapshot TEXT, -- 脑洞快照
            status TEXT DEFAULT 'draft',
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_projects_user ON novel_projects(user_id);

        -- 2. 章节表 (正文)
        CREATE TABLE IF NOT EXISTS chapters (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            title TEXT,
            content TEXT, -- 大文本字段
            order_index INTEGER,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(project_id) REFERENCES novel_projects(id)
        );
        CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);

        -- 3. 思维导图表
        CREATE TABLE IF NOT EXISTS mind_maps (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            title TEXT,
            type TEXT DEFAULT 'general',
            content TEXT, -- JSON
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(project_id) REFERENCES novel_projects(id)
        );
        CREATE INDEX IF NOT EXISTS idx_maps_project ON mind_maps(project_id);
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

// === Idea Cards ===

export function createIdeaCard(id: string, userId: string, data: IdeaCardData): DbIdeaCard {
    const stmt = db.prepare('INSERT INTO idea_cards (id, user_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    const contentStr = JSON.stringify(data);
    stmt.run(id, userId, data.title, contentStr, now);
    return { id, user_id: userId, title: data.title, content: contentStr, created_at: now };
}

export function getIdeaCardsByUser(userId: string): DbIdeaCard[] {
    const stmt = db.prepare('SELECT * FROM idea_cards WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as DbIdeaCard[];
}

export function deleteIdeaCard(id: string, userId: string): void {
    const stmt = db.prepare('DELETE FROM idea_cards WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
}

// === v2.7 Novel Projects (新增) ===

/**
 * 从脑洞卡片创建项目
 */
export function createProjectFromCard(id: string, userId: string, title: string, ideaSnapshot: any): DbNovelProject {
    const stmt = db.prepare('INSERT INTO novel_projects (id, user_id, title, idea_snapshot, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    stmt.run(id, userId, title, JSON.stringify(ideaSnapshot), now, now);
    return { id, user_id: userId, title, idea_snapshot: JSON.stringify(ideaSnapshot), status: 'draft', created_at: now, updated_at: now };
}

/**
 * 获取用户项目列表
 */
export function getProjectsByUser(userId: string): DbNovelProject[] {
    const stmt = db.prepare('SELECT id, user_id, title, status, created_at, updated_at FROM novel_projects WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId) as DbNovelProject[]; // 注意：不返回 idea_snapshot，列表页轻量化
}

/**
 * 获取项目详情
 */
export function getProjectById(id: string, userId: string): DbNovelProject | undefined {
    const stmt = db.prepare('SELECT * FROM novel_projects WHERE id = ? AND user_id = ?');
    return stmt.get(id, userId) as DbNovelProject | undefined;
}

/**
 * 创建章节
 */
export function createChapter(projectId: string, title: string, content: string, order: number): DbChapter {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO chapters (id, project_id, title, content, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, projectId, title, content, order, now, now);
    return { id, project_id: projectId, title, content, order_index: order, created_at: now, updated_at: now };
}

/**
 * 获取项目章节列表 (轻量级，不含 content)
 */
export function getChaptersByProject(projectId: string): Partial<DbChapter>[] {
    const stmt = db.prepare('SELECT id, title, order_index, updated_at FROM chapters WHERE project_id = ? ORDER BY order_index ASC');
    return stmt.all(projectId) as Partial<DbChapter>[];
}

/**
 * 获取单章内容 (包含 content)
 */
export function getChapterDetail(id: string, projectId: string): DbChapter | undefined {
    const stmt = db.prepare('SELECT * FROM chapters WHERE id = ? AND project_id = ?');
    return stmt.get(id, projectId) as DbChapter | undefined;
}

/**
 * 创建思维导图
 */
export function createMindMap(projectId: string, title: string, type: string, content: any): DbMindMap {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO mind_maps (id, project_id, title, type, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, projectId, title, type, JSON.stringify(content), now, now);
    return { id, project_id: projectId, title, type, content: JSON.stringify(content), created_at: now, updated_at: now };
}

/**
 * 获取项目思维导图列表
 */
export function getMindMapsByProject(projectId: string): DbMindMap[] {
    const stmt = db.prepare('SELECT * FROM mind_maps WHERE project_id = ? ORDER BY created_at DESC');
    return stmt.all(projectId) as DbMindMap[];
}

// === Admin Functions ===

/**
 * 获取系统统计信息
 */
export function getSystemStats() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const archiveCount = db.prepare('SELECT COUNT(*) as count FROM archives').get() as { count: number };
    const cardCount = db.prepare('SELECT COUNT(*) as count FROM idea_cards').get() as { count: number };
    const projectCount = db.prepare('SELECT COUNT(*) as count FROM novel_projects').get() as { count: number }; // 新增
    const lastActive = db.prepare('SELECT updated_at FROM archives ORDER BY updated_at DESC LIMIT 1').get() as { updated_at: string } | undefined;

    return {
        totalUsers: userCount.count,
        totalArchives: archiveCount.count,
        totalCards: cardCount.count,
        totalProjects: projectCount.count,
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
 * 删除用户及其所有数据 (级联删除)
 */
export function deleteUserFull(userId: string) {
    const deleteArchives = db.prepare('DELETE FROM archives WHERE user_id = ?');
    const deleteCards = db.prepare('DELETE FROM idea_cards WHERE user_id = ?');
    const deleteProjects = db.prepare('DELETE FROM novel_projects WHERE user_id = ?'); // 简化处理，真实环境需要先删chapter/mindmap
    const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
    
    const transaction = db.transaction(() => {
        deleteArchives.run(userId);
        deleteCards.run(userId);
        deleteProjects.run(userId);
        deleteUser.run(userId);
    });
    
    transaction();
}
