
import { logger } from "./loggerService";
import { NovelSettings, WorkflowStep, Archive, ChatMessage, ReferenceNovel, IdeaCard, Novel, ChapterListItem, Chapter, MindMap } from "../types";
import { API_ENDPOINTS } from "../constants";
import { authService } from "./authService";

class ApiService {
    
    private async request(url: string, options: RequestInit = {}) {
        const authHeaders = authService.getAuthHeader();
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
                ...options.headers
            } as any
        });
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
    }

    // === 生成 ===
    public async fetchConfigPool(): Promise<any> {
        return fetch(API_ENDPOINTS.CONFIG).then(r => r.ok ? r.json() : null).catch(() => null);
    }

    public async generateStream(settings: NovelSettings, step: WorkflowStep, context: string = '', references: ReferenceNovel[] | undefined, onChunk: (text: string) => void): Promise<string> {
        const authHeaders = authService.getAuthHeader();
        try {
            const response = await fetch(API_ENDPOINTS.GENERATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
                body: JSON.stringify({ settings, step, context, references })
            });
            if (!response.ok) throw new Error("生成请求失败");
            
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                onChunk(chunk);
            }
            return fullText;
        } catch (error) { throw error; }
    }

    // === 存档 ===
    public async getArchives(): Promise<Archive[]> { return this.request(API_ENDPOINTS.ARCHIVES).catch(() => []); }
    public async saveArchive(title: string, settings: NovelSettings, history: ChatMessage[], id?: string): Promise<Archive> {
        return this.request(API_ENDPOINTS.ARCHIVES, { method: 'POST', body: JSON.stringify({ id, title, settings, history }) });
    }
    public async deleteArchive(id: string): Promise<void> { return this.request(`${API_ENDPOINTS.ARCHIVES}/${id}`, { method: 'DELETE' }); }

    // === 脑洞卡片 ===
    public async getIdeaCards(): Promise<IdeaCard[]> { return this.request(API_ENDPOINTS.CARDS).catch(() => []); }
    public async saveIdeaCard(data: Partial<IdeaCard>): Promise<IdeaCard> {
        return this.request(API_ENDPOINTS.CARDS, { method: 'POST', body: JSON.stringify(data) });
    }
    public async deleteIdeaCard(id: string): Promise<void> { return this.request(`${API_ENDPOINTS.CARDS}/${id}`, { method: 'DELETE' }); }

    // === 小说项目 (Novels) ===
    public async initNovelFromCard(cardId: string, title: string): Promise<Novel> {
        return this.request(`${API_ENDPOINTS.NOVELS_ROOT}/init`, { method: 'POST', body: JSON.stringify({ cardId, title }) });
    }
    public async getNovels(): Promise<Novel[]> { return this.request(`${API_ENDPOINTS.NOVELS_ROOT}`).catch(() => []); }

    // === 章节 (Chapters) ===
    public async getChaptersList(novelId: string): Promise<ChapterListItem[]> {
        return this.request(`${API_ENDPOINTS.NOVELS_ROOT}/${novelId}/chapters`);
    }
    public async getChapterContent(id: string): Promise<Chapter> {
        return this.request(`${API_ENDPOINTS.CHAPTERS_ROOT}/${id}`);
    }
    public async createChapter(novelId: string, title: string, content: string = ''): Promise<Chapter> {
        return this.request(API_ENDPOINTS.CHAPTERS_ROOT, { method: 'POST', body: JSON.stringify({ novelId, title, content }) });
    }
    public async updateChapter(id: string, title: string, content: string): Promise<void> {
        return this.request(`${API_ENDPOINTS.CHAPTERS_ROOT}/${id}`, { method: 'PUT', body: JSON.stringify({ title, content }) });
    }
    public async deleteChapter(id: string): Promise<void> {
        return this.request(`${API_ENDPOINTS.CHAPTERS_ROOT}/${id}`, { method: 'DELETE' });
    }

    // === 思维导图 (Mind Maps) ===
    public async getMindMapsList(novelId: string): Promise<MindMap[]> {
        return this.request(`${API_ENDPOINTS.NOVELS_ROOT}/${novelId}/mindmaps`);
    }
    public async createMindMap(novelId: string, title: string, nodes: string = '[]'): Promise<MindMap> {
        return this.request(API_ENDPOINTS.MINDMAPS_ROOT, { method: 'POST', body: JSON.stringify({ novelId, title, nodes }) });
    }
    public async updateMindMap(id: string, title: string, nodes: string): Promise<void> {
        return this.request(`${API_ENDPOINTS.MINDMAPS_ROOT}/${id}`, { method: 'PUT', body: JSON.stringify({ title, nodes }) });
    }
    public async deleteMindMap(id: string): Promise<void> {
        return this.request(`${API_ENDPOINTS.MINDMAPS_ROOT}/${id}`, { method: 'DELETE' });
    }
}

export const apiService = new ApiService();
export const geminiService = apiService;
