
import { Hono } from 'hono';
import * as db from './db';

/**
 * 项目路由模块
 * 管理小说项目 (IDE)、章节和思维导图
 */
export const projectRouter = new Hono();

// 从脑洞卡片创建项目
projectRouter.post('/from-card', async (c) => {
    const { cardId, title, description } = await c.req.json();
    const pid = crypto.randomUUID();
    const proj = db.createProject(pid, c.get('jwtPayload').id, title, description, cardId);
    // 初始化默认结构
    db.createMindMap(crypto.randomUUID(), pid, '核心架构', JSON.stringify({root:{id:'root',label:title||'核心创意',children:[]}}));
    db.createChapter(crypto.randomUUID(), pid, '第一章', '', 1);
    return c.json(proj);
});

// 获取所有项目
projectRouter.get('/', (c) => c.json(db.getProjectsByUser(c.get('jwtPayload').id)));

// 获取回收站项目
projectRouter.get('/trash/all', (c) => c.json(db.getDeletedProjectsByUser(c.get('jwtPayload').id)));

// 软删除项目
projectRouter.delete('/:id', (c) => { 
    db.deleteProject(c.req.param('id'), c.get('jwtPayload').id); 
    return c.json({success:true}); 
});

// 恢复项目
projectRouter.post('/:id/restore', (c) => {
    db.restoreProject(c.req.param('id'), c.get('jwtPayload').id);
    return c.json({success:true});
});

// 彻底删除项目
projectRouter.delete('/:id/permanent', (c) => {
    db.permanentDeleteProject(c.req.param('id'), c.get('jwtPayload').id);
    return c.json({success:true});
});

// 获取项目完整结构 (章节+导图列表)
projectRouter.get('/:id/structure', (c) => {
    return c.json({ 
        chapters: db.getChaptersByProject(c.req.param('id')), 
        maps: db.getMindMapsByProject(c.req.param('id')) 
    });
});

// === 思维导图 CRUD ===
projectRouter.get('/:pid/maps/:mid', (c) => c.json(db.getMindMapById(c.req.param('mid'))));
projectRouter.post('/:pid/maps', async (c) => {
    return c.json(db.createMindMap(crypto.randomUUID(), c.req.param('pid'), '未命名导图', JSON.stringify({root:{id:'root',label:'新导图',children:[]}})));
});
projectRouter.put('/:pid/maps/:mid', async (c) => { 
    const {title,data}=await c.req.json(); 
    db.updateMindMap(c.req.param('mid'), c.req.param('pid'), title, data); 
    return c.json({success:true}); 
});
projectRouter.delete('/:pid/maps/:mid', (c) => { 
    db.deleteMindMap(c.req.param('mid'), c.req.param('pid')); 
    return c.json({success:true}); 
});

// === 章节 CRUD ===
projectRouter.post('/:pid/chapters', async (c) => { 
    const {title,order}=await c.req.json(); 
    return c.json(db.createChapter(crypto.randomUUID(), c.req.param('pid'), title||'新章节', '', order||99)); 
});
projectRouter.get('/:pid/chapters/:cid', (c) => c.json(db.getChapterById(c.req.param('cid'))));
projectRouter.put('/:pid/chapters/:cid', async (c) => { 
    const {title,content}=await c.req.json(); 
    db.updateChapter(c.req.param('cid'), c.req.param('pid'), title, content); 
    return c.json({success:true}); 
});
projectRouter.delete('/:pid/chapters/:cid', (c) => { 
    db.deleteChapter(c.req.param('cid'), c.req.param('pid')); 
    return c.json({success:true}); 
});
