
import { logger } from "./loggerService";
import { NovelSettings, WorkflowStep } from "../types";
import { API_ENDPOINTS } from "../constants";

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
     * @param onChunk 接收数据块的回调
     */
    public async generateStream(
        settings: NovelSettings, 
        step: WorkflowStep, 
        context: string = '', 
        onChunk: (text: string) => void
    ): Promise<string> {
        
        logger.info(`[Client] 请求生成: ${step}`, { contextLength: context.length });

        try {
            const response = await fetch(API_ENDPOINTS.GENERATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    settings,
                    step,
                    context
                })
            });

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
}

export const apiService = new ApiService();
// 为了兼容性暂时保留导出名，实际已变为 REST 客户端
export const geminiService = apiService; 
