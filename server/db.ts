
import Database from 'better-sqlite3';
import { User, Archive, DbIdeaCard, IdeaCardData, DbNovel, DbChapter, DbMindMap } from './types.ts';

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

        -- 1. 小说项目表
        CREATE TABLE IF NOT EXISTS novels (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            origin_card_id TEXT,
            status TEXT DEFAULT 'draft',
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_novels_user ON novels(user_id);

        -- 2. 章节表 (大文本分离)
        CREATE TABLE IF NOT EXISTS chapters (
            id TEXT PRIMARY KEY,
            novel_id TEXT,
            title TEXT,
            content TEXT, -- 大文本
            order_index INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(novel_id) REFERENCES novels(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id);
        CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(order_index);

        -- 3. 思维导图表
        CREATE TABLE IF NOT EXISTS mind_maps (
            id TEXT PRIMARY KEY,
            novel_id TEXT,
            title TEXT,
            nodes TEXT, -- JSON 结构
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(novel_id) REFERENCES novels(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_maps_novel ON mind_maps(novel_id);
    `);
    console.log(`[DB] Database initialized at ${DB_PATH} (WAL mode: ON)`);
}

// === Users ===
// ... (保留原有 User 相关函数)
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
// ... (保留原有 Archive 相关函数)
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
// ... (保留 IdeaCard 相关函数)
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

// === Novel Project (v2.7 New) ===

/**
 * 初始化小说项目 (根据脑洞卡片)
 * 创建项目记录 + 空的初始文件夹结构
 */
export function initNovelFromCard(userId: string, cardId: string, title: string): DbNovel {
    const novelId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // 事务：创建 Novel
    const transaction = db.transaction(() => {
        db.prepare(`
            INSERT INTO novels (id, user_id, title, origin_card_id, status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, 'draft', ?, ?)
        `).run(novelId, userId, title, cardId, now, now);
    });

    transaction();
    
    return { id: novelId, user_id: userId, title, origin_card_id: cardId, status: 'draft', created_at: now, updated_at: now };
}

export function getNovelsByUser(userId: string): DbNovel[] {
    // 性能优先：只查元数据
    const stmt = db.prepare('SELECT * FROM novels WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId) as DbNovel[];
}

// === Chapters (CRUD) ===

export function getChaptersList(novelId: string): Partial<DbChapter>[] {
    // 性能优先：不查询 content 大字段
    const stmt = db.prepare('SELECT id, novel_id, title, order_index, updated_at FROM chapters WHERE novel_id = ? ORDER BY order_index ASC');
    return stmt.all(novelId) as Partial<DbChapter>[];
}

export function getChapterContent(id: string): DbChapter | undefined {
    // 详情查询：查询所有字段
    const stmt = db.prepare('SELECT * FROM chapters WHERE id = ?');
    return stmt.get(id) as DbChapter | undefined;
}

export function createChapter(novelId: string, title: string, content: string = ''): DbChapter {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // 自动计算 order_index
    const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM chapters WHERE novel_id = ?').get(novelId) as { max: number };
    const nextOrder = (maxOrder.max || 0) + 1;

    db.prepare(`INSERT INTO chapters (id, novel_id, title, content, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, novelId, title, content, nextOrder, now, now);
      
    // 更新小说最后修改时间
    db.prepare('UPDATE novels SET updated_at = ? WHERE id = ?').run(now, novelId);
    
    return { id, novel_id: novelId, title, content, order_index: nextOrder, created_at: now, updated_at: now };
}

export function updateChapter(id: string, title: string, content: string): void {
    const now = new Date().toISOString();
    db.prepare('UPDATE chapters SET title = ?, content = ?, updated_at = ? WHERE id = ?').run(title, content, now, id);
}

export function deleteChapter(id: string): void {
    db.prepare('DELETE FROM chapters WHERE id = ?').run(id);
}

// === Mind Maps (CRUD) ===

export function getMindMapsList(novelId: string): DbMindMap[] {
    // 思维导图一般 JSON 不会特别巨大，可以返回
    const stmt = db.prepare('SELECT * FROM mind_maps WHERE novel_id = ? ORDER BY created_at ASC');
    return stmt.all(novelId) as DbMindMap[];
}

export function createMindMap(novelId: string, title: string, nodes: string = '[]'): DbMindMap {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    db.prepare(`INSERT INTO mind_maps (id, novel_id, title, nodes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, novelId, title, nodes, now, now);
      
    return { id, novel_id: novelId, title, nodes, created_at: now, updated_at: now };
}

export function updateMindMap(id: string, title: string, nodes: string): void {
    const now = new Date().toISOString();
    db.prepare('UPDATE mind_maps SET title = ?, nodes = ?, updated_at = ? WHERE id = ?').run(title, nodes, now, id);
}

export function deleteMindMap(id: string): void {
    db.prepare('DELETE FROM mind_maps WHERE id = ?').run(id);
}


// === Admin Functions ===
// ... (保留 Admin 相关函数)
export function getSystemStats() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const archiveCount = db.prepare('SELECT COUNT(*) as count FROM archives').get() as { count: number };
    const cardCount = db.prepare('SELECT COUNT(*) as count FROM idea_cards').get() as { count: number };
    const novelCount = db.prepare('SELECT COUNT(*) as count FROM novels').get() as { count: number };
    const lastActive = db.prepare('SELECT updated_at FROM archives ORDER BY updated_at DESC LIMIT 1').get() as { updated_at: string } | undefined;

    return {
        totalUsers: userCount.count,
        totalArchives: archiveCount.count,
        totalCards: cardCount.count,
        totalNovels: novelCount.count,
        lastActiveTime: lastActive?.updated_at || '无数据'
    };
}
export function getAllUsers(): User[] {
    return db.prepare('SELECT id, username, created_at FROM users ORDER BY created_at DESC').all() as User[];
}
export function deleteUserFull(userId: string) {
    const deleteArchives = db.prepare('DELETE FROM archives WHERE user_id = ?');
    const deleteCards = db.prepare('DELETE FROM idea_cards WHERE user_id = ?');
    const deleteNovels = db.prepare('DELETE FROM novels WHERE user_id = ?'); // 级联删除 novels
    const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
    
    const transaction = db.transaction(() => {
        deleteArchives.run(userId);
        deleteCards.run(userId);
        deleteNovels.run(userId);
        deleteUser.run(userId);
    });
    transaction();
}
