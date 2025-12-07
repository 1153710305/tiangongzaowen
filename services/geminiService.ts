
import { logger } from "./loggerService";
import { NovelSettings, WorkflowStep, Archive, ChatMessage, ReferenceNovel, IdeaCard, Project, ProjectStructure, MindMap } from "../types";
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
     * 请求生成内容（流式）
     */
    public async generateStream(
        settings: NovelSettings, 
        step: WorkflowStep, 
        context: string = '', 
        references: ReferenceNovel[] | string | undefined, 
        onChunk: (text: string) => void,
        extraPrompt?: string
    ): Promise<string> {
        
        logger.info(`[Client] 请求生成: ${step}`);
        const authHeaders = authService.getAuthHeader();

        try {
            const response = await fetch(API_ENDPOINTS.GENERATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
                body: JSON.stringify({ settings, step, context, references, extraPrompt })
            });

            if (response.status === 401) throw new Error("Unauthorized");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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

    public async deleteProject(projectId: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}`, { 
            method: 'DELETE',
            headers: { ...authHeaders } as any 
        });
        if (!res.ok) throw new Error("删除项目失败");
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
}

export const apiService = new ApiService();
export const geminiService = apiService;
