
import Database from 'better-sqlite3';
import { User, Archive, DbIdeaCard, IdeaCardData, DbProject, DbChapter, DbMindMap, DbUserPrompt, PromptType, ApiKey, SystemModelConfig } from './types.ts';
import fs from 'fs';
import path from 'path';

// 确保数据目录存在
const DB_PATH = process.env.DB_PATH || 'skycraft.db';
const db = new Database(DB_PATH);

// 开启 WAL 模式，显著提升并发读写性能
db.pragma('journal_mode = WAL');
// 开启外键约束，确保 ON DELETE CASCADE 生效
db.pragma('foreign_keys = ON');

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

        -- === IDE 项目相关表 ===

        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            description TEXT,
            idea_card_id TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

        CREATE TABLE IF NOT EXISTS chapters (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            title TEXT,
            content TEXT,
            order_index INTEGER,
            updated_at TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
        
        -- 思维导图表：核心性能点
        CREATE TABLE IF NOT EXISTS mind_maps (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            title TEXT,
            data TEXT, 
            updated_at TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_mindmaps_project ON mind_maps(project_id);

        -- === 提示词库表 ===
        CREATE TABLE IF NOT EXISTS user_prompts (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            type TEXT, -- system, constraint, normal
            title TEXT,
            content TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_prompts_user ON user_prompts(user_id);
        CREATE INDEX IF NOT EXISTS idx_prompts_type ON user_prompts(type);

        -- === 系统配置表 ===
        CREATE TABLE IF NOT EXISTS system_configs (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT
        );

        -- === API Keys 表 (New) ===
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE,
            provider TEXT DEFAULT 'google',
            is_active INTEGER DEFAULT 1, -- 1: true, 0: false
            last_used_at TEXT,
            usage_count INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            total_latency_ms INTEGER DEFAULT 0,
            created_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
        CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at);
    `);

    // 初始化默认模型配置 (包含 isActive 字段)
    const checkConfig = db.prepare('SELECT key FROM system_configs WHERE key = ?').get('ai_models');
    if (!checkConfig) {
        const defaultModels: SystemModelConfig[] = [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (标准/快速)', isActive: true },
            { id: 'gemini-2.5-flash-lite-preview-02-05', name: 'Gemini 2.5 Flash Lite (极速/省流)', isActive: true },
            { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (强逻辑/深度)', isActive: true }
        ];
        const now = new Date().toISOString();
        db.prepare('INSERT INTO system_configs (key, value, updated_at) VALUES (?, ?, ?)').run('ai_models', JSON.stringify(defaultModels), now);
        db.prepare('INSERT INTO system_configs (key, value, updated_at) VALUES (?, ?, ?)').run('default_model', 'gemini-2.5-flash', now);
        console.log('[DB] Initialized default system configurations');
    }

    // 自动导入环境变量中的 API KEY (如果是首次运行)
    const envKey = process.env.API_KEY;
    if (envKey) {
        const existing = db.prepare('SELECT id FROM api_keys WHERE key = ?').get(envKey);
        if (!existing) {
            const id = crypto.randomUUID();
            const now = new Date().toISOString();
            // last_used_at 设置为较早时间，确保优先被选中
            db.prepare(`
                INSERT INTO api_keys (id, key, provider, is_active, last_used_at, created_at) 
                VALUES (?, ?, 'google', 1, '1970-01-01T00:00:00.000Z', ?)
            `).run(id, envKey, now);
            console.log('[DB] Automatically imported API_KEY from environment variables.');
        }
    }

    console.log(`[DB] Database initialized at ${DB_PATH} (WAL mode: ON)`);
}

// ... existing functions ...

// === API Key Management (New) ===

/**
 * 获取下一个可用的 API Key
 * 策略：选择 active=1 且 last_used_at 最早的 Key (LRU - Least Recently Used)
 * 这实现了简单的轮询和负载均衡
 */
export function getNextAvailableApiKey(): ApiKey | undefined {
    // 优先选择从未使用的 (last_used_at 最早)
    const stmt = db.prepare('SELECT * FROM api_keys WHERE is_active = 1 ORDER BY last_used_at ASC LIMIT 1');
    return stmt.get() as ApiKey | undefined;
}

/**
 * 更新 Key 的使用统计
 */
export function updateApiKeyStats(id: string, latencyMs: number, tokenCount: number = 0): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        UPDATE api_keys 
        SET last_used_at = ?, 
            usage_count = usage_count + 1, 
            total_tokens = total_tokens + ?, 
            total_latency_ms = total_latency_ms + ?
        WHERE id = ?
    `);
    stmt.run(now, tokenCount, latencyMs, id);
}

export function getAllApiKeys(): ApiKey[] {
    const stmt = db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC');
    return stmt.all() as ApiKey[];
}

export function createApiKey(key: string, provider: string = 'google'): void {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO api_keys (id, key, provider, is_active, last_used_at, created_at) 
        VALUES (?, ?, ?, 1, '1970-01-01T00:00:00.000Z', ?)
    `);
    stmt.run(id, key, provider, now);
}

export function deleteApiKey(id: string): void {
    const stmt = db.prepare('DELETE FROM api_keys WHERE id = ?');
    stmt.run(id);
}

export function toggleApiKeyStatus(id: string, isActive: boolean): void {
    const val = isActive ? 1 : 0;
    const stmt = db.prepare('UPDATE api_keys SET is_active = ? WHERE id = ?');
    stmt.run(val, id);
}

// === System Configs ===
export function getSystemConfig(key: string): string | null {
    const row = db.prepare('SELECT value FROM system_configs WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
}

export function setSystemConfig(key: string, value: string): void {
    const now = new Date().toISOString();
    // UPSERT syntax for SQLite
    db.prepare(`
        INSERT INTO system_configs (key, value, updated_at) 
        VALUES (?, ?, ?) 
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, now);
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

export function getArchivesByUser(userId: string): Archive[] {
    const stmt = db.prepare('SELECT * FROM archives WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId) as Archive[];
}

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

// === Projects ===
export function createProject(id: string, userId: string, title: string, description: string, ideaCardId?: string): DbProject {
    const stmt = db.prepare('INSERT INTO projects (id, user_id, title, description, idea_card_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    stmt.run(id, userId, title, description, ideaCardId || null, now, now);
    return { id, user_id: userId, title, description, idea_card_id: ideaCardId, created_at: now, updated_at: now };
}

export function getProjectsByUser(userId: string): DbProject[] {
    const stmt = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId) as DbProject[];
}

export function getProjectById(id: string): DbProject | undefined {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id) as DbProject | undefined;
}

export function deleteProject(id: string, userId: string): void {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
}

// === Chapters ===
export function createChapter(id: string, projectId: string, title: string, content: string, orderIndex: number): DbChapter {
    const stmt = db.prepare('INSERT INTO chapters (id, project_id, title, content, order_index, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    stmt.run(id, projectId, title, content, orderIndex, now);
    return { id, project_id: projectId, title, content, order_index: orderIndex, updated_at: now };
}

export function getChaptersByProject(projectId: string): Omit<DbChapter, 'content'>[] {
    const stmt = db.prepare('SELECT id, project_id, title, order_index, updated_at FROM chapters WHERE project_id = ? ORDER BY order_index ASC');
    return stmt.all(projectId) as Omit<DbChapter, 'content'>[];
}

export function getChapterById(id: string): DbChapter | undefined {
    const stmt = db.prepare('SELECT * FROM chapters WHERE id = ?');
    return stmt.get(id) as DbChapter | undefined;
}

export function updateChapter(id: string, projectId: string, title: string, content: string): void {
    const stmt = db.prepare('UPDATE chapters SET title = ?, content = ?, updated_at = ? WHERE id = ? AND project_id = ?');
    const now = new Date().toISOString();
    stmt.run(title, content, now, id, projectId);
}

export function deleteChapter(id: string, projectId: string): void {
    const stmt = db.prepare('DELETE FROM chapters WHERE id = ? AND project_id = ?');
    stmt.run(id, projectId);
}

// === Mind Maps ===
export function createMindMap(id: string, projectId: string, title: string, data: string): DbMindMap {
    const stmt = db.prepare('INSERT INTO mind_maps (id, project_id, title, data, updated_at) VALUES (?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    stmt.run(id, projectId, title, data, now);
    return { id, project_id: projectId, title, data, updated_at: now };
}

export function getMindMapsByProject(projectId: string): Omit<DbMindMap, 'data'>[] {
    const stmt = db.prepare('SELECT id, project_id, title, updated_at FROM mind_maps WHERE project_id = ? ORDER BY updated_at DESC');
    return stmt.all(projectId) as Omit<DbMindMap, 'data'>[];
}

export function getMindMapById(id: string): DbMindMap | undefined {
    const stmt = db.prepare('SELECT * FROM mind_maps WHERE id = ?');
    return stmt.get(id) as DbMindMap | undefined;
}

export function updateMindMap(id: string, projectId: string, title: string, data: string): void {
    const stmt = db.prepare('UPDATE mind_maps SET title = ?, data = ?, updated_at = ? WHERE id = ? AND project_id = ?');
    const now = new Date().toISOString();
    stmt.run(title, data, now, id, projectId);
}

export function deleteMindMap(id: string, projectId: string): void {
    const stmt = db.prepare('DELETE FROM mind_maps WHERE id = ? AND project_id = ?');
    stmt.run(id, projectId);
}

// === Prompts ===
export function createUserPrompt(id: string, userId: string, type: PromptType, title: string, content: string): DbUserPrompt {
    const stmt = db.prepare('INSERT INTO user_prompts (id, user_id, type, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    stmt.run(id, userId, type, title, content, now, now);
    return { id, user_id: userId, type, title, content, created_at: now, updated_at: now };
}

export function getUserPrompts(userId: string): DbUserPrompt[] {
    const stmt = db.prepare('SELECT * FROM user_prompts WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as DbUserPrompt[];
}

export function updateUserPrompt(id: string, userId: string, title: string, content: string): void {
    const stmt = db.prepare('UPDATE user_prompts SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?');
    const now = new Date().toISOString();
    stmt.run(title, content, now, id, userId);
}

export function deleteUserPrompt(id: string, userId: string): void {
    const stmt = db.prepare('DELETE FROM user_prompts WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
}

// === Admin ===
export function getSystemStats() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const archiveCount = db.prepare('SELECT COUNT(*) as count FROM archives').get() as { count: number };
    const cardCount = db.prepare('SELECT COUNT(*) as count FROM idea_cards').get() as { count: number };
    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    const keyCount = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1').get() as { count: number };
    const lastActive = db.prepare('SELECT updated_at FROM archives ORDER BY updated_at DESC LIMIT 1').get() as { updated_at: string } | undefined;

    return {
        totalUsers: userCount.count,
        totalArchives: archiveCount.count,
        totalCards: cardCount.count,
        totalProjects: projectCount.count,
        activeKeys: keyCount.count,
        lastActiveTime: lastActive?.updated_at || '无数据'
    };
}

export function getAllUsers(): User[] {
    return db.prepare('SELECT id, username, created_at FROM users ORDER BY created_at DESC').all() as User[];
}

export function deleteUserFull(userId: string) {
    const deleteArchives = db.prepare('DELETE FROM archives WHERE user_id = ?');
    const deleteCards = db.prepare('DELETE FROM idea_cards WHERE user_id = ?');
    const deleteProjects = db.prepare('DELETE FROM projects WHERE user_id = ?');
    const deletePrompts = db.prepare('DELETE FROM user_prompts WHERE user_id = ?');
    const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
    
    const transaction = db.transaction(() => {
        deleteArchives.run(userId);
        deleteCards.run(userId);
        deleteProjects.run(userId);
        deletePrompts.run(userId);
        deleteUser.run(userId);
    });
    
    transaction();
}
