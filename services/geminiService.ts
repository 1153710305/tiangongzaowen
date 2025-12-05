import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { logger } from "./loggerService";
import { SYSTEM_INSTRUCTION } from "../constants";

// 确保在环境变量中设置了 API_KEY
// 注意：在实际前端项目中，API_KEY 暴露在前端有风险。
// 建议的做法是通过 Next.js API Routes 或后端代理转发。
// 本演示项目假定是一个本地工具或受控环境。
const API_KEY = process.env.API_KEY || '';

if (!API_KEY) {
    logger.warn("未检测到 API_KEY，请确保在构建环境或运行时配置了 process.env.API_KEY");
}

class GeminiService {
    private ai: GoogleGenAI;
    private modelId: string = 'gemini-2.5-flash'; // 默认使用 Flash 模型，速度快成本低

    constructor() {
        this.ai = new GoogleGenAI({ apiKey: API_KEY });
    }

    /**
     * 切换模型
     * @param modelId 模型ID (gemini-2.5-flash 或 gemini-3-pro-preview)
     */
    public setModel(modelId: string) {
        this.modelId = modelId;
        logger.info(`模型已切换为: ${modelId}`);
    }

    /**
     * 生成内容（流式）
     * @param prompt 用户提示词
     * @param onChunk 接收数据块的回调函数
     */
    public async generateStream(prompt: string, onChunk: (text: string) => void): Promise<string> {
        logger.info("开始流式生成", { model: this.modelId, promptPreview: prompt.substring(0, 50) + "..." });
        
        try {
            const responseStream = await this.ai.models.generateContentStream({
                model: this.modelId,
                contents: [
                    { role: 'user', parts: [{ text: prompt }] }
                ],
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                }
            });

            let fullText = '';
            for await (const chunk of responseStream) {
                const text = chunk.text;
                if (text) {
                    fullText += text;
                    onChunk(text);
                }
            }
            logger.info("流式生成完成", { length: fullText.length });
            return fullText;
        } catch (error: any) {
            logger.error("流式生成失败", error);
            throw error;
        }
    }

    /**
     * 生成内容（非流式/常规）
     * @param prompt 用户提示词
     */
    public async generateNormal(prompt: string): Promise<string> {
        logger.info("开始常规生成", { model: this.modelId, promptPreview: prompt.substring(0, 50) + "..." });

        try {
            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: this.modelId,
                contents: [
                    { role: 'user', parts: [{ text: prompt }] }
                ],
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                }
            });
            
            const text = response.text || '';
            logger.info("常规生成完成", { length: text.length });
            return text;
        } catch (error: any) {
            logger.error("常规生成失败", error);
            throw error;
        }
    }
}

export const geminiService = new GeminiService();