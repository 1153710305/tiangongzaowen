
import { logger } from "./loggerService";
import { NovelSettings, WorkflowStep, Archive, ChatMessage, ReferenceNovel, IdeaCard, NovelProject } from "../types";
import { API_ENDPOINTS } from "../constants";
import { authService } from "./authService";

/**
 * 前端 API 服务
 * 负责与后端服务器通信，处理流式响应解码
 */
class ApiService {
    
    /**
     * 获取后端配置的素材池
     */
    public async fetchConfigPool(): Promise<any> {
        try {
            const res = await fetch(API_ENDPOINTS.CONFIG);
            if (!res.ok) throw new Error("无法连接至服务器获取配置");
            return await res.json();
        } catch (error) {
            logger.error("配置加载失败", error);
            // 返回 null 让组件使用兜底策略或显示错误
            return null;
        }
    }

    /**
     * 请求生成内容（流式）
     * @param settings 小说设定
     * @param step 当前工作流步骤
     * @param context 上下文（如之前的大纲或创意）
     * @param references 参考小说列表 (分析模式用)
     * @param onChunk 接收数据块的回调
     */
    public async generateStream(
        settings: NovelSettings, 
        step: WorkflowStep, 
        context: string = '', 
        references: ReferenceNovel[] | undefined,
        onChunk: (text: string) => void
    ): Promise<string> {
        
        logger.info(`[Client] 请求生成: ${step}`, { contextLength: context.length });

        const authHeaders = authService.getAuthHeader();

        try {
            const response = await fetch(API_ENDPOINTS.GENERATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                } as any,
                body: JSON.stringify({
                    settings,
                    step,
                    context,
                    references // 传递可选参数
                })
            });

            if (response.status === 401) {
                throw new Error("请先登录");
            }

            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                throw new Error(errJson.error || `HTTP error! status: ${response.status}`);
            }

            if (!response.body) throw new Error("Response body is empty");

            // 处理流式响应
            const reader = response.body.getReader();
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

            logger.info("流式传输完成", { totalLength: fullText.length });
            return fullText;

        } catch (error: any) {
            logger.error("生成请求失败", error);
            throw error;
        }
    }

    // === 存档相关 ===

    /**
     * 获取用户所有存档
     */
    public async getArchives(): Promise<Archive[]> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(API_ENDPOINTS.ARCHIVES, {
                headers: { ...authHeaders } as any
            });
            if (!res.ok) throw new Error("获取存档失败");
            return await res.json();
        } catch (error) {
            logger.error("Fetch archives error", error);
            return [];
        }
    }

    /**
     * 保存/更新存档
     */
    public async saveArchive(title: string, settings: NovelSettings, history: ChatMessage[], id?: string): Promise<Archive> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(API_ENDPOINTS.ARCHIVES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
                body: JSON.stringify({ id, title, settings, history })
            });
            if (!res.ok) throw new Error("保存存档失败");
            return await res.json();
        } catch (error) {
            logger.error("Save archive error", error);
            throw error;
        }
    }

    /**
     * 删除存档
     */
    public async deleteArchive(id: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(`${API_ENDPOINTS.ARCHIVES}/${id}`, {
                method: 'DELETE',
                headers: { ...authHeaders } as any
            });
            if (!res.ok) throw new Error("删除失败");
        } catch (error) {
            logger.error("Delete archive error", error);
            throw error;
        }
    }

    // === 脑洞卡片相关 ===

    /**
     * 获取用户脑洞卡片
     */
    public async getIdeaCards(): Promise<IdeaCard[]> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(API_ENDPOINTS.CARDS, { headers: { ...authHeaders } as any });
            if (!res.ok) throw new Error("获取卡片失败");
            return await res.json();
        } catch (error) {
            logger.error("Fetch cards error", error);
            return [];
        }
    }

    /**
     * 保存脑洞卡片
     */
    public async saveIdeaCard(cardData: Omit<IdeaCard, 'id' | 'userId' | 'created_at'>): Promise<IdeaCard> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(API_ENDPOINTS.CARDS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
                body: JSON.stringify(cardData)
            });
            if (!res.ok) throw new Error("保存卡片失败");
            return await res.json();
        } catch (error) {
            logger.error("Save card error", error);
            throw error;
        }
    }

    /**
     * 删除脑洞卡片
     */
    public async deleteIdeaCard(id: string): Promise<void> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(`${API_ENDPOINTS.CARDS}/${id}`, {
                method: 'DELETE',
                headers: { ...authHeaders } as any
            });
            if (!res.ok) throw new Error("删除失败");
        } catch (error) {
            throw error;
        }
    }

    // === v2.7 项目管理相关 ===

    /**
     * 获取用户所有项目
     */
    public async getProjects(): Promise<NovelProject[]> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(API_ENDPOINTS.PROJECTS, { headers: { ...authHeaders } as any });
            if (!res.ok) throw new Error("获取项目列表失败");
            return await res.json();
        } catch (error) {
            logger.error("Fetch projects error", error);
            return [];
        }
    }

    /**
     * 从脑洞卡片创建新项目
     */
    public async createProjectFromCard(card: IdeaCard): Promise<NovelProject> {
        const authHeaders = authService.getAuthHeader();
        try {
            const ideaData = {
                title: card.title,
                intro: card.intro,
                highlight: card.highlight,
                explosive_point: card.explosive_point,
                golden_finger: card.golden_finger
            };

            const res = await fetch(API_ENDPOINTS.PROJECT_CREATE_FROM_CARD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders } as any,
                body: JSON.stringify({ 
                    cardId: card.id, 
                    title: card.title, 
                    ideaData 
                })
            });

            if (!res.ok) throw new Error("立项失败");
            return await res.json();
        } catch (error) {
            logger.error("Create project error", error);
            throw error;
        }
    }

    /**
     * 获取项目详情 (包含章节目录和导图列表)
     */
    public async fetchProjectDetail(projectId: string): Promise<NovelProject | null> {
        const authHeaders = authService.getAuthHeader();
        try {
            const res = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}`, { 
                headers: { ...authHeaders } as any 
            });
            if (!res.ok) throw new Error("获取项目详情失败");
            return await res.json();
        } catch (error) {
            logger.error("Fetch project detail error", error);
            return null;
        }
    }
}

export const apiService = new ApiService();
export const geminiService = apiService;
