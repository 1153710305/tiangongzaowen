
import { useState, useRef } from 'react';
import { MindMapNode, WorkflowStep, NovelSettings } from '../types';
import { apiService } from '../services/geminiService';
import { serializeNodeTree, updateNodeInTree } from '../components/mindmap/utils';
import { logger } from '../services/loggerService';

interface UseMindMapAIProps {
    projectId: string;
    mapId: string;
    rootNode: MindMapNode;
    novelSettings?: NovelSettings;
    onUpdateMap: (newRoot: MindMapNode) => void;
}

export const useMindMapAI = ({ projectId, mapId, rootNode, novelSettings, onUpdateMap }: UseMindMapAIProps) => {
    // UI State
    const [showAiModal, setShowAiModal] = useState(false);
    const [targetNode, setTargetNode] = useState<MindMapNode | null>(null);
    const [prompt, setPrompt] = useState('');
    const [content, setContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Config State
    const [model, setModel] = useState('');
    const [identity, setIdentity] = useState('');
    const [constraints, setConstraints] = useState('');

    // Context Menu Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    
    const openAiModal = (node: MindMapNode) => {
        setTargetNode(node);
        setPrompt(`基于“${node.label}”，请生成...`);
        setContent('');
        setError(null);
        setIdentity('');
        setConstraints('');
        setShowAiModal(true);
    };

    const handleGenerate = async () => {
        if (!targetNode || !rootNode) return;
        setIsGenerating(true);
        setContent('');
        setError(null);

        try {
            // 解析引用
            const refRegex = /\[(参考导图|引用节点):([a-zA-Z0-9-]+):?([a-zA-Z0-9-]+)?:?([^\]]+)?\]/g;
            let match;
            const referencesData: string[] = [];
            
            let finalPrompt = prompt;
            if (identity) finalPrompt = `【身份设定】:${identity}\n` + finalPrompt;
            if (constraints) finalPrompt = finalPrompt + `\n【强制约束】:${constraints}`;

            while ((match = refRegex.exec(prompt)) !== null) {
                const [fullTag, type, id1, id2] = match;
                if (type === '引用节点' && id1 === mapId) {
                    // 引用当前导图节点，直接从 rootNode 查找
                    const findNode = (n: MindMapNode): MindMapNode | null => {
                        if (n.id === id2) return n;
                        if (n.children) for (const c of n.children) { const f = findNode(c); if(f) return f; }
                        return null;
                    };
                    const target = findNode(rootNode);
                    if (target) referencesData.push(`【参考节点：${target.label}】\n${serializeNodeTree(target)}`);
                } else {
                    // 外部引用
                    try {
                        const map = await apiService.getMindMapDetail(projectId, id1);
                        if (map && map.data) {
                            const root = JSON.parse(map.data).root;
                            referencesData.push(`【参考导图：${map.title}】\n${serializeNodeTree(root)}`);
                        }
                    } catch(e) { logger.warn("Ref fetch failed", e); }
                }
            }

            const finalRefs = referencesData.length > 0 ? referencesData.join('\n\n') : undefined;

            await apiService.generateStream(
                novelSettings || {} as any,
                WorkflowStep.MIND_MAP_NODE,
                targetNode.label,
                finalRefs,
                (chunk) => setContent(p => p + chunk),
                finalPrompt,
                model
            );
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const applyResult = () => {
        if (!targetNode || !rootNode || !content) return;
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        const newChildren: MindMapNode[] = [];
        const stack: { node: MindMapNode, level: number }[] = [];

        for (const line of lines) {
            const match = line.match(/^(\s*)[-*]\s+(.+)/);
            if (!match) continue;
            const newNode: MindMapNode = { id: crypto.randomUUID(), label: match[2], children: [] };
            const indent = match[1].length;
            while (stack.length > 0 && stack[stack.length - 1].level >= indent) stack.pop();
            if (stack.length === 0) newChildren.push(newNode);
            else stack[stack.length - 1].node.children.push(newNode);
            stack.push({ node: newNode, level: indent });
        }

        if (newChildren.length > 0) {
            const newRoot = updateNodeInTree(rootNode, targetNode.id, (n) => ({
                ...n,
                isExpanded: true,
                children: [...(n.children || []), ...newChildren]
            }));
            onUpdateMap(newRoot);
            setShowAiModal(false);
        }
    };

    return {
        showAiModal,
        setShowAiModal,
        targetNode,
        prompt,
        setPrompt,
        content,
        isGenerating,
        error,
        model,
        setModel,
        setIdentity,
        setConstraints,
        textareaRef,
        mirrorRef,
        openAiModal,
        handleGenerate,
        applyResult
    };
};
