
import { logger } from "./loggerService";
import { NovelSettings, WorkflowStep, Archive, ChatMessage, ReferenceNovel, IdeaCard, Project, ProjectStructure, MindMap, Chapter, UserPrompt, PromptType } from "../types";
import { API_ENDPOINTS } from "../constants";
import { authService } from "./authService";

/**
 * 前端 API 服务
 */
class ApiService {
    
    public async fetchConfigPool(): Promise<any> {
        try {
            const res = await fetch(API_ENDPOINTS.CONFIG);
            if (!res.ok) throw new Error("无法连接至服务器");
            return await res.json();
        } catch (error) {
            return null;
        }
    }

    /**
     * 获取后端配置的AI模型列表
     */
    public async getAiModels(): Promise<{ models: {id: string, name: string, isVip?: boolean}[], defaultModel: string }> {
        try {
            const res = await fetch(`${API_ENDPOINTS.CONFIG.replace('/pool', '/models')}`);
            if (!res.ok) throw new Error("获取模型配置失败");
            return await res.json();
        } catch (error) {
            // 兜底默认值
            return { models: [], defaultModel: 'gemini-2.5-flash' };
        }
    }

    /**
     * 获取用户实时状态 (Token, VIP)
     */
    public async getUserStatus(): Promise<{ id: string, username: string, tokens: number, isVip: boolean, vip_expiry: string | null }> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_BASE_URL}/api/user/status`, { headers: { ...authHeaders } as any });
        if (!res.ok) throw new Error("获取状态失败");
        return await res.json();
    }

    /**
     * 购买商品
     */
    public async buyProduct(productId: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_BASE_URL}/api/user/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
            body: JSON.stringify({ productId })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "购买失败");
        }
    }

    /**
     * 请求生成内容（流式）
     */
    public async generateStream(
        settings: NovelSettings, 
        step: WorkflowStep, 
        context: string = '', 
        references: ReferenceNovel[] | string | undefined, 
        onChunk: (text: string) => void,
        extraPrompt?: string,
        model?: string
    ): Promise<string> {
        
        logger.info(`[Client] 请求生成: ${step}`, { model });
        const authHeaders = authService.getAuthHeader();

        try {
            const response = await fetch(API_ENDPOINTS.GENERATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
                body: JSON.stringify({ settings, step, context, references, extraPrompt, model })
            });

            if (response.status === 401) throw new Error("Unauthorized");
            if (response.status === 402) throw new Error("代币不足，请充值");
            if (response.status === 403) throw new Error("该模型仅供会员使用");
            if (!response.ok) throw new Error(`请求失败: ${response.statusText}`);

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");
            
            const decoder = new TextDecoder();
            let fullText = '';
            let done = false;

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) {
                    const chunkValue = decoder.decode(value, { stream: true });
                    // 如果后端返回的是错误JSON (流式中间报错)
                    if (chunkValue.startsWith('\n[Error:')) {
                         throw new Error(chunkValue.replace('\n[Error: ', '').replace(']', ''));
                    }
                    fullText += chunkValue;
                    onChunk(chunkValue);
                }
            }
            return fullText;
        } catch (error: any) {
            logger.error("生成请求失败", error);
            throw error;
        }
    }

    // === 存档相关 ===
    public async getArchives(): Promise<Archive[]> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(API_ENDPOINTS.ARCHIVES, { headers: { ...authHeaders } as any });
            if (!res.ok) throw new Error("获取存档失败");
            return await res.json();
        } catch (error) {
            return [];
        }
    }

    public async saveArchive(title: string, settings: NovelSettings, history: ChatMessage[], id?: string): Promise<Archive> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(API_ENDPOINTS.ARCHIVES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
                body: JSON.stringify({ id, title, settings, history })
            });
            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) throw new Error("保存存档失败");
            return await res.json();
        } catch (error) {
            throw error;
        }
    }

    public async deleteArchive(id: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        await fetch(`${API_ENDPOINTS.ARCHIVES}/${id}`, { method: 'DELETE', headers: { ...authHeaders } as any });
    }

    // === 脑洞卡片 ===
    public async getIdeaCards(): Promise<IdeaCard[]> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(API_ENDPOINTS.CARDS, { headers: { ...authHeaders } as any });
            return res.ok ? await res.json() : [];
        } catch (error) {
            return [];
        }
    }

    public async saveIdeaCard(cardData: Omit<IdeaCard, 'id' | 'userId' | 'created_at'>): Promise<IdeaCard> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(API_ENDPOINTS.CARDS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
            body: JSON.stringify(cardData)
        });
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("保存卡片失败");
        return await res.json();
    }

    public async deleteIdeaCard(id: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        await fetch(`${API_ENDPOINTS.CARDS}/${id}`, { method: 'DELETE', headers: { ...authHeaders } as any });
    }

    // === IDE 项目 ===
    public async createProjectFromCard(cardId: string, title: string, description: string): Promise<Project> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(API_ENDPOINTS.PROJECT_CREATE_FROM_CARD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
            body: JSON.stringify({ cardId, title, description })
        });
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("创建项目失败");
        return await res.json();
    }

    public async getProjects(): Promise<Project[]> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(API_ENDPOINTS.PROJECTS, { headers: { ...authHeaders } as any });
        return res.ok ? await res.json() : [];
    }

    // 回收站项目
    public async getDeletedProjects(): Promise<Project[]> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/trash/all`, { headers: { ...authHeaders } as any });
        return res.ok ? await res.json() : [];
    }

    // 软删除
    public async deleteProject(projectId: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}`, { 
            method: 'DELETE',
            headers: { ...authHeaders } as any 
        });
        if (!res.ok) throw new Error("删除项目失败");
    }

    // 恢复项目
    public async restoreProject(projectId: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/restore`, { 
            method: 'POST',
            headers: { ...authHeaders } as any 
        });
        if (!res.ok) throw new Error("恢复项目失败");
    }

    // 彻底删除
    public async permanentDeleteProject(projectId: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/permanent`, { 
            method: 'DELETE',
            headers: { ...authHeaders } as any 
        });
        if (!res.ok) throw new Error("彻底删除失败");
    }

    public async getProjectStructure(projectId: string): Promise<ProjectStructure> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/structure`, { headers: { ...authHeaders } as any });
        if (!res.ok) throw new Error("获取结构失败");
        return await res.json();
    }

    // === 思维导图 CRUD ===
    public async getMindMapDetail(projectId: string, mapId: string): Promise<MindMap> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/maps/${mapId}`, { headers: { ...authHeaders } as any });
        if (!res.ok) throw new Error("获取详情失败");
        return await res.json();
    }

    public async createMindMap(projectId: string): Promise<MindMap> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/maps`, {
            method: 'POST',
            headers: { ...authHeaders } as any
        });
        if (!res.ok) throw new Error("创建失败");
        return await res.json();
    }

    public async updateMindMap(projectId: string, mapId: string, title: string, dataStr: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/maps/${mapId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
            body: JSON.stringify({ title, data: dataStr })
        });
        if (!res.ok) throw new Error("更新失败");
    }

    public async deleteMindMap(projectId: string, mapId: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/maps/${mapId}`, {
            method: 'DELETE',
            headers: { ...authHeaders } as any
        });
        if (!res.ok) throw new Error("删除失败");
    }

    // === 章节 CRUD (New) ===
    public async createChapter(projectId: string, title: string, order: number): Promise<Chapter> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/chapters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
            body: JSON.stringify({ title, order })
        });
        if (!res.ok) throw new Error("创建章节失败");
        return await res.json();
    }

    public async getChapterDetail(projectId: string, chapterId: string): Promise<Chapter> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/chapters/${chapterId}`, { 
            headers: { ...authHeaders } as any 
        });
        if (!res.ok) throw new Error("获取章节详情失败");
        return await res.json();
    }

    public async updateChapter(projectId: string, chapterId: string, title: string, content: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
            body: JSON.stringify({ title, content })
        });
        if (!res.ok) throw new Error("更新章节失败");
    }

    public async deleteChapter(projectId: string, chapterId: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/chapters/${chapterId}`, {
            method: 'DELETE',
            headers: { ...authHeaders } as any
        });
        if (!res.ok) throw new Error("删除章节失败");
    }

    // === 提示词库 CRUD (New) ===
    public async getUserPrompts(): Promise<UserPrompt[]> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_BASE_URL}/api/prompts`, { 
            headers: { ...authHeaders } as any 
        });
        if (!res.ok) return [];
        return await res.json();
    }

    public async createUserPrompt(type: PromptType, title: string, content: string): Promise<UserPrompt> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_BASE_URL}/api/prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
            body: JSON.stringify({ type, title, content })
        });
        if (!res.ok) throw new Error("创建失败");
        return await res.json();
    }

    public async updateUserPrompt(id: string, title: string, content: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_BASE_URL}/api/prompts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
            body: JSON.stringify({ title, content })
        });
        if (!res.ok) throw new Error("更新失败");
    }

    public async deleteUserPrompt(id: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_BASE_URL}/api/prompts/${id}`, {
            method: 'DELETE',
            headers: { ...authHeaders } as any
        });
        if (!res.ok) throw new Error("删除失败");
    }

    // === 留言板 & 公告 ===
    public async getMessages(): Promise<any[]> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_BASE_URL}/api/messages`, { headers: { ...authHeaders } as any });
        return res.ok ? await res.json() : [];
    }

    public async postMessage(content: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_BASE_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error("发送失败");
    }

    public async getAnnouncements(): Promise<any[]> {
        const res = await fetch(`${API_BASE_URL}/api/announcements`);
        return res.ok ? await res.json() : [];
    }
}

// 重新导出常量，因为方法中用到了
import { API_BASE_URL } from "../constants";

export const apiService = new ApiService();
export const geminiService = apiService;
