
import { NovelSettings, ReferenceNovel } from "./types.ts";

/**
 * AI 角色设定 (System Instruction)
 */
export const SYSTEM_INSTRUCTION = `
你是一位拥有10年经验的资深网文主编，同时也是一位在番茄/起点平台拥有多部百万收藏作品的"大神"级作家。
你的专长是：
1. **捕捉热点**：深知当前中国网文市场的流行趋势。
2. **黄金三章**：极其擅长开篇设计。
3. **情绪价值**：提供爽、甜、虐、惊的情绪体验。
4. **结构化思维**：能够将复杂的创意拆解为标准化的卡片或思维导图。

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
 */
export const PROMPT_BUILDERS = {
    // 创意脑暴
    IDEA: (settings: NovelSettings, context?: string) => {
        const platform = settings.platform || '番茄';
        const baseReq = `
请作为一名熟悉"${platform}"平台风格的资深主编，生成 3 个符合该平台调性的爆款小说开篇创意。

**平台风格参考**：
- 番茄：节奏极快，脑洞大，情绪价值高，书名直白吸睛（如《开局...》、《我能...》）。
- 起点：逻辑严密，世界观宏大，慢热，升级体系完善。
- 晋江：情感细腻，人设出彩，强调CP感和情感拉扯。
- 飞卢：极速节奏，脑洞夸张，系统流，爽点密集，开局即无敌。
- 知乎：第一人称，反转多，脑洞奇特，现实题材或悬疑惊悚。
- 七猫：主打爽文，都市/赘婿/战神/甜宠，在这个分类下做到极致。

**生成要求**：
1. **书名**：必须符合"${platform}"平台的取名套路。
2. **简介**：必须符合"${platform}"平台的简介风格（如番茄的黄金三章预告风，起点的世界观铺设风，晋江的情感文案风）。
3. **爽点/爆点**：必须精准击中"${platform}"读者的核心爽点。

**非常重要：必须严格只返回一个合法的 JSON 数组字符串。**
不要包含 \`\`\`json 或其他任何 Markdown 标记。
不要有前言后语，直接以 '[' 开头，以 ']' 结尾。

数组中每个对象必须包含以下 5 个字段：
1. "title": 书名 (String)
2. "intro": 一句话简介，吸引点击 (String)
3. "highlight": 核心爽点 (String)
4. "explosive_point": 开篇爆点/冲突 (String)
5. "golden_finger": 金手指设定 (String)
`;
        if (context && context.trim().length > 0) {
            return `${baseReq}\n**核心灵感**：\n"${context}"\n请基于此灵感，结合"${platform}"风格进行裂变。`;
        }
        return `${baseReq}\n**设定要求**：\n- **流派**：${settings.genre}\n- **核心梗**：${settings.trope}\n- **主角类型**：${settings.protagonistType}\n- **金手指**：${settings.goldenFinger}\n`;
    },

    // 爆款分析与仿写
    ANALYSIS_IDEA: (settings: NovelSettings, references: ReferenceNovel[]) => {
        const refsText = references.map((r, i) => `案例 ${i + 1}:\n书名：${r.title}\n简介：${r.intro}`).join('\n');
        return `
请作为一名市场嗅觉敏锐的网文主编，对提供的爆款小说进行深度拆解，并基于其"爆火基因"生成 3 个全新的创意。

**参考案例**：
${refsText}

**任务要求**：
1. 分析参考案例的核心爽点和欲望机制。
2. 结合设定（受众：${settings.targetAudience === 'male' ? '男频' : '女频'}，基调：${settings.tone}）进行创意裂变。
3. **不要照抄**，要换题材或背景。

**返回格式要求**：
**非常重要：必须严格只返回一个合法的 JSON 数组字符串。**
不要包含 \`\`\`json 或其他任何 Markdown 标记。
直接以 '[' 开头，以 ']' 结尾。
`;
    },

    // 大纲生成
    OUTLINE: (settings: NovelSettings, context: string) => `
基于创意/上下文：
"${context}"

请生成一份详细的**前15章细纲**（即"黄金开篇"大纲）。
设定参考：${JSON.stringify(settings)}
每一章都要注明【本章爽点】和【结尾钩子】。
`,

    // 人设生成
    CHARACTER: (settings: NovelSettings) => `
请为这部小说设计核心人物小传（主角 + 1个核心配角 + 1个反派）。
设定参考：${JSON.stringify(settings)}
`,

    // 正文写作 (Updated for Reference System)
    CHAPTER: (settings: NovelSettings, context: string, references?: string) => `
请作为一名网文大神撰写/续写正文。

**基本设定**：
- 风格：${settings.pacing === 'fast' ? '快节奏、爽点密集' : '铺垫细腻、氛围感强'} (${settings.tone})
- 受众：${settings.targetAudience}

${references ? `
**⚠️ 必须参考以下素材资料**：
${references}
` : ''}

**当前正文/上文**：
"${context}"

**写作要求**：
1. 承接上文，保持人设一致。
2. 画面感强，多用动词。
3. 如果提供了参考资料（如思维导图设定、前文摘要），请务必在文中体现相关细节。
4. 输出长度：2000字左右。
`,

    // 思维导图节点扩展 (New)
    // context: 当前节点的内容
    // prompt: 用户的具体指令
    // references: 引用其他节点的内容
    MIND_MAP_NODE: (context: string, prompt: string, references?: string) => `
你是一个协助构建小说架构的 AI 助手。用户正在编辑思维导图。
请基于当前节点内容，扩展出子节点。

**当前节点内容**：
"${context}"

**用户指令**：
"${prompt}"

${references ? `**参考上下文 (Context from other nodes)**:\n${references}` : ''}

**生成要求**：
1. **输出格式**：请仅输出 Markdown 列表格式（使用 - 符号）。支持多级缩进。
2. **内容**：扩展情节、细节、分支选项或设定，具体取决于用户指令。
3. **简洁**：每个节点内容言简意赅。
4. **禁止**：不要输出任何前言后语，直接输出列表。

**示例输出**：
- 第一层子节点
  - 第二层细节补充
  - 第二层分支
- 另一条分支
`
};
