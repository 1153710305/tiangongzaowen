
import { NovelSettings, ReferenceNovel } from "./types.ts";

/**
 * AI 角色设定 (System Instruction)
 * 核心：资深网文主编 + 爆款写手
 */
export const SYSTEM_INSTRUCTION = `
你是一位拥有10年经验的资深网文主编，同时也是一位在番茄/起点平台拥有多部百万收藏作品的"大神"级作家。
你的专长是：
1. **捕捉热点**：深知当前中国网文市场的流行趋势。
2. **黄金三章**：极其擅长开篇设计。
3. **情绪价值**：提供爽、甜、虐、惊的情绪体验。
4. **结构化思维**：能够将复杂的创意拆解为标准化的卡片。

在生成内容时，请遵循以下原则：
- **格式**：若被要求返回 JSON，必须保证 JSON 格式的严格正确性（无 Markdown 标记）。
- **语言**：通俗易懂，极具画面感。
- **核心**：必须突出"金手指"的作用，让读者感到"爽"。

严禁：
- 说教式的文字。
- 逻辑硬伤。
`;

/**
 * 提示词构建器
 * 接收参数并返回格式化后的 Prompt
 */
export const PROMPT_BUILDERS = {
    // 创意脑暴 (JSON 结构化版)
    IDEA: (settings: NovelSettings, context?: string) => {
        const baseReq = `
请生成 3 个具有"爆款潜质"的小说开篇创意。
必须严格按照 JSON 数组格式返回，不要包含任何 Markdown 代码块标记（如 \`\`\`json），直接返回 JSON 字符串。
数组中每个对象必须包含以下字段：
- title: 书名 (String)
- intro: 一句话简介，吸引点击 (String)
- highlight: 核心爽点 (String)
- explosive_point: 开篇爆点/冲突 (String)
- golden_finger: 金手指设定 (String)
`;

        if (context && context.trim().length > 0) {
            return `
${baseReq}

**核心灵感**：
"${context}"

**辅助要求**：
- **受众**：${settings.targetAudience === 'male' ? '男频' : '女频'}
- **建议基调**：${settings.tone}

请基于灵感进行裂变，生成 3 个截然不同的方向。
`;
        }

        return `
${baseReq}

**设定要求**：
- **流派**：${settings.genre}
- **核心梗**：${settings.trope}
- **主角类型**：${settings.protagonistType}
- **金手指**：${settings.goldenFinger}
- **受众**：${settings.targetAudience === 'male' ? '男频' : '女频'}
- **基调**：${settings.tone}
`;
    },

    // 爆款分析与仿写 (JSON 结构化版)
    ANALYSIS_IDEA: (settings: NovelSettings, references: ReferenceNovel[]) => {
        const refsText = references.map((r, i) => `
案例 ${i + 1}:
书名：${r.title}
简介：${r.intro}
`).join('\n');

        return `
请作为一名市场嗅觉敏锐的网文主编，对提供的爆款小说进行深度拆解，并基于其"爆火基因"生成 3 个全新的创意。

**参考案例**：
${refsText}

**任务要求**：
1. 分析参考案例的核心爽点和欲望机制。
2. 结合设定（受众：${settings.targetAudience === 'male' ? '男频' : '女频'}，基调：${settings.tone}）进行创意裂变。
3. **不要照抄**，要换题材或背景。

**返回格式**：
必须严格按照 JSON 数组格式返回，不要包含任何 Markdown 代码块标记，直接返回 JSON 字符串。
数组中每个对象包含：
- title: 书名 (String)
- intro: 一句话简介 (String)
- highlight: 核心爽点/爆火基因分析 (String)
- explosive_point: 黄金三章走向/爆点 (String)
- golden_finger: 金手指/特殊能力 (String)
`;
    },

    // 大纲生成 (保持 Markdown)
    OUTLINE: (settings: NovelSettings, context: string) => `
基于创意/上下文：
"${context}"

请生成一份详细的**前15章细纲**（即"黄金开篇"大纲）。
设定参考：${JSON.stringify(settings)}

要求：
1. **前3章**：必须完成主角背景介绍、金手指觉醒、第一个大冲突的铺垫与初步解决（小高潮）。
2. **第4-10章**：扩展世界观，引入第一个反派或打脸对象，不断拉高期待感。
3. **第11-15章**：第一个大剧情的高潮爆发，主角获得巨大收获。
4. 每一章都要注明【本章爽点】和【结尾钩子】（如何吸引读者点开下一章）。
`,

    // 人设生成 (保持 Markdown)
    CHARACTER: (settings: NovelSettings) => `
请为这部小说设计核心人物小传（主角 + 1个核心配角 + 1个反派）。
设定参考：${JSON.stringify(settings)}

每个人物包含：
- **姓名**：好记，有特色。
- **外貌特征**：具体，有记忆点。
- **性格关键词**：3个词。
- **核心动力/欲望**：他/她想要什么？
- **人设反差/萌点**：增加人物立体感。
- **金手指/能力详情**（仅限主角）：详细说明能力的限制和升级路线。
`,

    // 正文写作 (保持 Markdown)
    CHAPTER: (settings: NovelSettings, context: string) => `
请撰写正文。
**上下文/大纲**：${context}
**文风要求**：${settings.pacing === 'fast' ? '极爽、快节奏、短句为主' : '铺垫细腻、氛围感强'}

写作要求：
1. **字数**：2000字左右（网文标准章节长度）。
2. **开篇**：不要废话，直接切入场景或冲突。
3. **对话**：对话要符合人物性格，不要为了对话而对话。
4. **感官描写**：多描写视觉、听觉、痛觉，增强代入感。
5. **结尾**：必须设置悬念（断章），让读者欲罢不能。
6. **排版**：适合手机阅读，多短句，多分段。
`
};
