
import { Hono } from 'hono';
import * as db from './db';

/**
 * 用户资源路由模块
 * 管理用户的状态、存档、脑洞卡片、提示词和留言
 */
export const userRouter = new Hono();

// === 用户状态 & 交易 ===
userRouter.get('/status', (c) => {
    const payload = c.get('jwtPayload');
    const user = db.getUserById(payload.id);
    if (!user) return c.json({ error: 'User not found' }, 404);
    const isVip = user.vip_expiry ? new Date(user.vip_expiry) > new Date() : false;
    return c.json({ 
        id: user.id, 
        username: user.username, 
        tokens: user.tokens, 
        vip_expiry: user.vip_expiry, 
        isVip, 
        referral_code: user.referral_code 
    });
});

userRouter.post('/buy', async (c) => {
    const payload = c.get('jwtPayload');
    const { productId } = await c.req.json();
    const plans = JSON.parse(db.getSystemConfig('product_plans') || '[]');
    const product = plans.find((p: any) => p.id === productId);
    if (!product) return c.json({ error: '商品不存在' }, 404);
    db.rechargeUser(payload.id, product.tokens, product.days, `购买:${product.name}`);
    return c.json({ success: true });
});

// === 存档管理 (Legacy) ===
userRouter.get('/archives', (c) => c.json(db.getArchivesByUser(c.get('jwtPayload').id).map(a => { try { return {...a, ...JSON.parse(a.content), content: undefined}; } catch(e){return a;} })));
userRouter.post('/archives', async (c) => {
    const { id, title, settings, history } = await c.req.json();
    const uid = c.get('jwtPayload').id;
    const content = JSON.stringify({ settings, history });
    if(id) { 
        db.updateArchive(id, uid, title, content); 
        return c.json({success:true, id}); 
    } else { 
        const nid=crypto.randomUUID(); 
        db.createArchive(nid, uid, title, content); 
        return c.json({id:nid, title, settings, history}); 
    }
});
userRouter.delete('/archives/:id', (c) => { 
    db.deleteArchive(c.req.param('id'), c.get('jwtPayload').id); 
    return c.json({success:true}); 
});

// === 脑洞卡片管理 ===
userRouter.get('/cards', (c) => c.json(db.getIdeaCardsByUser(c.get('jwtPayload').id).map(x => { try{ return {...x, ...JSON.parse(x.content)}; }catch(e){return x;} })));
userRouter.post('/cards', async (c) => {
    const data = await c.req.json();
    const card = db.createIdeaCard(crypto.randomUUID(), c.get('jwtPayload').id, data);
    return c.json({...card, ...data});
});
userRouter.delete('/cards/:id', (c) => { 
    db.deleteIdeaCard(c.req.param('id'), c.get('jwtPayload').id); 
    return c.json({success:true}); 
});

// === 提示词库管理 ===
userRouter.get('/prompts', (c) => c.json(db.getUserPrompts(c.get('jwtPayload').id)));
userRouter.post('/prompts', async (c) => { 
    const {type,title,content}=await c.req.json(); 
    return c.json(db.createUserPrompt(crypto.randomUUID(), c.get('jwtPayload').id, type, title, content)); 
});
userRouter.put('/prompts/:id', async (c) => { 
    const {title,content}=await c.req.json(); 
    db.updateUserPrompt(c.req.param('id'), c.get('jwtPayload').id, title, content); 
    return c.json({success:true}); 
});
userRouter.delete('/prompts/:id', (c) => { 
    db.deleteUserPrompt(c.req.param('id'), c.get('jwtPayload').id); 
    return c.json({success:true}); 
});

// === 留言板管理 ===
userRouter.get('/messages', (c) => c.json(db.getMessagesByUser(c.get('jwtPayload').id)));
userRouter.post('/messages', async (c) => {
    const { content } = await c.req.json();
    if (!content) return c.json({ error: '内容不能为空' }, 400);
    const msg = db.createMessage(crypto.randomUUID(), c.get('jwtPayload').id, content);
    return c.json(msg);
});
