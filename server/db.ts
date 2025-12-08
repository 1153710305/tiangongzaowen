
import Database from 'better-sqlite3';
import { User, Archive, DbIdeaCard, IdeaCardData, DbProject, DbChapter, DbMindMap, DbUserPrompt, PromptType, ApiKey, SystemModelConfig, TransactionType, UserTransaction, ProductPlan, ProductType, Message, Announcement } from './types.ts';
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
        -- 用户表
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            tokens INTEGER DEFAULT 1000,
            vip_expiry TEXT,
            referral_code TEXT,
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
            deleted_at TEXT, -- 软删除时间，NULL表示未删除
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at);

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
        
        -- 思维导图表
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

        -- === 系统配置表 ===
        CREATE TABLE IF NOT EXISTS system_configs (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT
        );

        -- === API Keys 表 ===
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE,
            provider TEXT DEFAULT 'google',
            is_active INTEGER DEFAULT 1,
            last_used_at TEXT,
            usage_count INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            total_latency_ms INTEGER DEFAULT 0,
            created_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

        -- === 交易记录表 ===
        CREATE TABLE IF NOT EXISTS user_transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            type TEXT,
            amount INTEGER,
            balance_after INTEGER,
            description TEXT,
            created_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_trans_user ON user_transactions(user_id);

        -- === 留言板 (New) ===
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            content TEXT,
            reply TEXT,
            reply_at TEXT,
            created_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

        -- === 公告 (New) ===
        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            is_published INTEGER DEFAULT 0, -- 1: published, 0: draft
            created_at TEXT,
            updated_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_announcements_pub ON announcements(is_published);
    `);
    
    // 数据库迁移：projects 增加 deleted_at
    try {
        db.prepare('SELECT deleted_at FROM projects LIMIT 1').get();
    } catch (e) {
        console.log('[DB Migration] Adding deleted_at column to projects table...');
        db.exec('ALTER TABLE projects ADD COLUMN deleted_at TEXT');
    }

    // 初始化默认配置
    initDefaultConfigs();
}

function initDefaultConfigs() {
    const checkConfig = db.prepare('SELECT key FROM system_configs WHERE key = ?').get('ai_models');
    if (!checkConfig) {
        const defaultModels: SystemModelConfig[] = [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (标准/免费)', isActive: true, isVip: false },
            { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (深度/VIP)', isActive: true, isVip: true }
        ];
        const now = new Date().toISOString();
        db.prepare('INSERT INTO system_configs (key, value, updated_at) VALUES (?, ?, ?)').run('ai_models', JSON.stringify(defaultModels), now);
        db.prepare('INSERT INTO system_configs (key, value, updated_at) VALUES (?, ?, ?)').run('default_model', 'gemini-2.5-flash', now);
    }

    const checkProducts = db.prepare('SELECT key FROM system_configs WHERE key = ?').get('product_plans');
    if (!checkProducts) {
        const defaultPlans: ProductPlan[] = [
            { id: 'plan_monthly', type: ProductType.SUBSCRIPTION, name: '月度会员', description: '30天会员 + 5万代币/天', price: 2900, tokens: 50000, days: 30, is_popular: true },
            { id: 'pack_small', type: ProductType.TOKEN_PACK, name: '灵感加油包 (小)', description: '增加 10万代币', price: 990, tokens: 100000, days: 0 }
        ];
        const now = new Date().toISOString();
        db.prepare('INSERT INTO system_configs (key, value, updated_at) VALUES (?, ?, ?)').run('product_plans', JSON.stringify(defaultPlans), now);
    }
}

// ... existing user/token functions ...

export function createUser(id: string, username: string, passwordHash: string): User {
    const stmt = db.prepare('INSERT INTO users (id, username, password_hash, tokens, referral_code, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    stmt.run(id, username, passwordHash, 1000, referralCode, now); 
    return { id, username, password_hash: passwordHash, tokens: 1000, vip_expiry: null, referral_code: referralCode, created_at: now };
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

export function deductUserTokens(userId: string, amount: number, description: string): void {
    const transaction = db.transaction(() => {
        const user = db.prepare('SELECT tokens FROM users WHERE id = ?').get(userId) as { tokens: number };
        if (!user) throw new Error("User not found");
        const balanceAfter = user.tokens - amount;
        db.prepare('UPDATE users SET tokens = ? WHERE id = ?').run(balanceAfter, userId);
        const transId = crypto.randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO user_transactions (id, user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(transId, userId, TransactionType.GENERATE, -amount, balanceAfter, description, now);
    });
    transaction();
}

export function rechargeUser(userId: string, tokenAmount: number, vipDays: number, description: string): void {
    const transaction = db.transaction(() => {
        const user = db.prepare('SELECT tokens, vip_expiry FROM users WHERE id = ?').get(userId) as User;
        if (!user) throw new Error("User not found");
        const balanceAfter = (user.tokens || 0) + tokenAmount;
        let newVipExpiry = user.vip_expiry;
        const now = new Date();
        if (vipDays > 0) {
            let currentExpiry = user.vip_expiry ? new Date(user.vip_expiry) : new Date();
            if (currentExpiry < now) currentExpiry = now; 
            currentExpiry.setDate(currentExpiry.getDate() + vipDays);
            newVipExpiry = currentExpiry.toISOString();
        }
        db.prepare('UPDATE users SET tokens = ?, vip_expiry = ? WHERE id = ?').run(balanceAfter, newVipExpiry, userId);
        const transId = crypto.randomUUID();
        db.prepare(`INSERT INTO user_transactions (id, user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(transId, userId, TransactionType.RECHARGE, tokenAmount, balanceAfter, description, now.toISOString());
    });
    transaction();
}

export function getSystemConfig(key: string): string | null {
    const row = db.prepare('SELECT value FROM system_configs WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
}

export function setSystemConfig(key: string, value: string): void {
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO system_configs (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(key, value, now);
}

// === Projects (Updated for Recycle Bin) ===

export function createProject(id: string, userId: string, title: string, description: string, ideaCardId?: string): DbProject {
    const stmt = db.prepare('INSERT INTO projects (id, user_id, title, description, idea_card_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    stmt.run(id, userId, title, description, ideaCardId || null, now, now);
    return { id, user_id: userId, title, description, idea_card_id: ideaCardId, created_at: now, updated_at: now };
}

// 获取未删除的项目
export function getProjectsByUser(userId: string): DbProject[] {
    const stmt = db.prepare('SELECT * FROM projects WHERE user_id = ? AND (deleted_at IS NULL) ORDER BY updated_at DESC');
    return stmt.all(userId) as DbProject[];
}

// 获取回收站的项目
export function getDeletedProjectsByUser(userId: string): DbProject[] {
    const stmt = db.prepare('SELECT * FROM projects WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC');
    return stmt.all(userId) as DbProject[];
}

export function getProjectById(id: string): DbProject | undefined {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id) as DbProject | undefined;
}

// 软删除
export function deleteProject(id: string, userId: string): void {
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE projects SET deleted_at = ? WHERE id = ? AND user_id = ?');
    stmt.run(now, id, userId);
}

// 恢复项目
export function restoreProject(id: string, userId: string): void {
    const stmt = db.prepare('UPDATE projects SET deleted_at = NULL WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
}

// 彻底删除
export function permanentDeleteProject(id: string, userId: string): void {
    // 级联删除由 ON DELETE CASCADE 数据库约束处理 (chapters, mind_maps)
    const stmt = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
}

// 清理超过30天的项目 (定时任务用)
export function cleanupRecycleBin(): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = db.prepare('DELETE FROM projects WHERE deleted_at IS NOT NULL AND deleted_at < ?').run(thirtyDaysAgo);
    return result.changes;
}

// === Messages (Guestbook) ===
export function createMessage(id: string, userId: string, content: string): Message {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO messages (id, user_id, content, created_at) VALUES (?, ?, ?, ?)').run(id, userId, content, now);
    return { id, user_id: userId, content, created_at: now };
}

export function getMessagesByUser(userId: string): Message[] {
    return db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Message[];
}

export function getAllMessagesAdmin(): Message[] {
    return db.prepare(`
        SELECT m.*, u.username 
        FROM messages m 
        LEFT JOIN users u ON m.user_id = u.id 
        ORDER BY m.created_at DESC
    `).all() as Message[];
}

export function replyMessage(id: string, reply: string): void {
    const now = new Date().toISOString();
    db.prepare('UPDATE messages SET reply = ?, reply_at = ? WHERE id = ?').run(reply, now, id);
}

// === Announcements ===
export function createAnnouncement(title: string, content: string): Announcement {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO announcements (id, title, content, is_published, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)').run(id, title, content, now, now);
    return { id, title, content, is_published: 1, created_at: now, updated_at: now };
}

export function getPublishedAnnouncements(): Announcement[] {
    return db.prepare('SELECT * FROM announcements WHERE is_published = 1 ORDER BY created_at DESC').all() as Announcement[];
}

export function getAllAnnouncementsAdmin(): Announcement[] {
    return db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all() as Announcement[];
}

export function updateAnnouncement(id: string, title: string, content: string, isPublished: boolean): void {
    const now = new Date().toISOString();
    db.prepare('UPDATE announcements SET title = ?, content = ?, is_published = ?, updated_at = ? WHERE id = ?').run(title, content, isPublished ? 1 : 0, now, id);
}

export function deleteAnnouncement(id: string): void {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
}

// ... existing helpers ...

export function getNextAvailableApiKey(): ApiKey | undefined {
    const stmt = db.prepare('SELECT * FROM api_keys WHERE is_active = 1 ORDER BY last_used_at ASC LIMIT 1');
    return stmt.get() as ApiKey | undefined;
}

export function updateApiKeyStats(id: string, latencyMs: number, tokenCount: number = 0): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`UPDATE api_keys SET last_used_at = ?, usage_count = usage_count + 1, total_tokens = total_tokens + ?, total_latency_ms = total_latency_ms + ? WHERE id = ?`);
    stmt.run(now, tokenCount, latencyMs, id);
}

export function getAllApiKeys(): ApiKey[] {
    const stmt = db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC');
    return stmt.all() as ApiKey[];
}

export function createApiKey(key: string, provider: string = 'google'): void {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO api_keys (id, key, provider, is_active, last_used_at, created_at) VALUES (?, ?, ?, 1, '1970-01-01T00:00:00.000Z', ?)`).run(id, key, provider, now);
}

export function deleteApiKey(id: string): void {
    db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
}

export function toggleApiKeyStatus(id: string, isActive: boolean): void {
    db.prepare('UPDATE api_keys SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
}

export function createArchive(id: string, userId: string, title: string, content: string): Archive {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO archives (id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, title, content, now, now);
    return { id, user_id: userId, title, content, created_at: now, updated_at: now };
}

export function updateArchive(id: string, userId: string, title: string, content: string): void {
    const now = new Date().toISOString();
    db.prepare('UPDATE archives SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(title, content, now, id, userId);
}

export function getArchivesByUser(userId: string): Archive[] {
    return db.prepare('SELECT * FROM archives WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as Archive[];
}

export function getArchiveById(id: string): Archive | undefined {
    return db.prepare('SELECT * FROM archives WHERE id = ?').get(id) as Archive | undefined;
}

export function deleteArchive(id: string, userId: string): void {
    db.prepare('DELETE FROM archives WHERE id = ? AND user_id = ?').run(id, userId);
}

export function createIdeaCard(id: string, userId: string, data: IdeaCardData): DbIdeaCard {
    const now = new Date().toISOString();
    const contentStr = JSON.stringify(data);
    db.prepare('INSERT INTO idea_cards (id, user_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)').run(id, userId, data.title, contentStr, now);
    return { id, user_id: userId, title: data.title, content: contentStr, created_at: now };
}

export function getIdeaCardsByUser(userId: string): DbIdeaCard[] {
    return db.prepare('SELECT * FROM idea_cards WHERE user_id = ? ORDER BY created_at DESC').all(userId) as DbIdeaCard[];
}

export function deleteIdeaCard(id: string, userId: string): void {
    db.prepare('DELETE FROM idea_cards WHERE id = ? AND user_id = ?').run(id, userId);
}

export function createChapter(id: string, projectId: string, title: string, content: string, orderIndex: number): DbChapter {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO chapters (id, project_id, title, content, order_index, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, projectId, title, content, orderIndex, now);
    return { id, project_id: projectId, title, content, order_index: orderIndex, updated_at: now };
}

export function getChaptersByProject(projectId: string): Omit<DbChapter, 'content'>[] {
    return db.prepare('SELECT id, project_id, title, order_index, updated_at FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(projectId) as Omit<DbChapter, 'content'>[];
}

export function getChapterById(id: string): DbChapter | undefined {
    return db.prepare('SELECT * FROM chapters WHERE id = ?').get(id) as DbChapter | undefined;
}

export function updateChapter(id: string, projectId: string, title: string, content: string): void {
    const now = new Date().toISOString();
    db.prepare('UPDATE chapters SET title = ?, content = ?, updated_at = ? WHERE id = ? AND project_id = ?').run(title, content, now, id, projectId);
}

export function deleteChapter(id: string, projectId: string): void {
    db.prepare('DELETE FROM chapters WHERE id = ? AND project_id = ?').run(id, projectId);
}

export function createMindMap(id: string, projectId: string, title: string, data: string): DbMindMap {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO mind_maps (id, project_id, title, data, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, projectId, title, data, now);
    return { id, project_id: projectId, title, data, updated_at: now };
}

export function getMindMapsByProject(projectId: string): Omit<DbMindMap, 'data'>[] {
    return db.prepare('SELECT id, project_id, title, updated_at FROM mind_maps WHERE project_id = ? ORDER BY updated_at DESC').all(projectId) as Omit<DbMindMap, 'data'>[];
}

export function getMindMapById(id: string): DbMindMap | undefined {
    return db.prepare('SELECT * FROM mind_maps WHERE id = ?').get(id) as DbMindMap | undefined;
}

export function updateMindMap(id: string, projectId: string, title: string, data: string): void {
    const now = new Date().toISOString();
    db.prepare('UPDATE mind_maps SET title = ?, data = ?, updated_at = ? WHERE id = ? AND project_id = ?').run(title, data, now, id, projectId);
}

export function deleteMindMap(id: string, projectId: string): void {
    db.prepare('DELETE FROM mind_maps WHERE id = ? AND project_id = ?').run(id, projectId);
}

export function createUserPrompt(id: string, userId: string, type: PromptType, title: string, content: string): DbUserPrompt {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO user_prompts (id, user_id, type, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, userId, type, title, content, now, now);
    return { id, user_id: userId, type, title, content, created_at: now, updated_at: now };
}

export function getUserPrompts(userId: string): DbUserPrompt[] {
    return db.prepare('SELECT * FROM user_prompts WHERE user_id = ? ORDER BY created_at DESC').all(userId) as DbUserPrompt[];
}

export function updateUserPrompt(id: string, userId: string, title: string, content: string): void {
    const now = new Date().toISOString();
    db.prepare('UPDATE user_prompts SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(title, content, now, id, userId);
}

export function deleteUserPrompt(id: string, userId: string): void {
    db.prepare('DELETE FROM user_prompts WHERE id = ? AND user_id = ?').run(id, userId);
}

export function getSystemStats() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const archiveCount = db.prepare('SELECT COUNT(*) as count FROM archives').get() as { count: number };
    const cardCount = db.prepare('SELECT COUNT(*) as count FROM idea_cards').get() as { count: number };
    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects WHERE deleted_at IS NULL').get() as { count: number };
    const keyCount = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1').get() as { count: number };
    return {
        totalUsers: userCount.count,
        totalArchives: archiveCount.count,
        totalCards: cardCount.count,
        totalProjects: projectCount.count,
        activeKeys: keyCount.count,
        lastActiveTime: '实时'
    };
}

export function getAllUsers(): User[] {
    return db.prepare('SELECT id, username, tokens, vip_expiry, created_at FROM users ORDER BY created_at DESC').all() as User[];
}

export function deleteUserFull(userId: string) {
    const transaction = db.transaction(() => {
        db.prepare('DELETE FROM archives WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM idea_cards WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM projects WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM user_prompts WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM user_transactions WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });
    transaction();
}
