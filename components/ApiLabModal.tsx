
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { apiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface Props {
    onClose: () => void;
}

const PRESETS = [
    {
        name: "创意写作 (小说)",
        system: "你是一位资深网文编辑，擅长构思反转剧情。",
        prompt: "请为一本赛博朋克风格的小说写一个开篇，主角是一个刚觉醒自我意识的AI，但他不知道自己是AI。",
        temp: 0.9
    },
    {
        name: "代码生成 (React)",
        system: "You are an expert React developer using TypeScript and Tailwind CSS.",
        prompt: "Create a responsive Card component that displays a user profile with an avatar, name, bio, and social links.",
        temp: 0.2
    },
    {
        name: "情感分析 (JSON)",
        system: "你是一个情感分析引擎。请分析用户输入的文本，返回 JSON 格式结果，包含 sentiment (positive/negative/neutral) 和 confidence score。",
        prompt: "这部电影简直是一场灾难，剧情混乱，演员演技浮夸，但我居然有点喜欢它的配乐。",
        temp: 0.0
    },
    {
        name: "苏格拉底式教学",
        system: "你是一位苏格拉底式的导师。你从不直接给出答案，而是通过一系列问题引导学生自己发现真理。",
        prompt: "什么是正义？",
        temp: 0.7
    }
];

export const ApiLabModal: React.FC<Props> = ({ onClose }) => {
    // Config State
    const [model, setModel] = useState('gemini-2.5-flash');
    const [availableModels, setAvailableModels] = useState<{id: string, name: string, isVip?: boolean}[]>([]);
    const [systemInstruction, setSystemInstruction] = useState('');
    const [temperature, setTemperature] = useState(0.7);
    
    // Input/Output State
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // UI State
    const outputEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        apiService.getAiModels().then(res => {
            setAvailableModels(res.models);
            setModel(res.defaultModel);
        });
    }, []);

    useEffect(() => {
        if (outputEndRef.current) {
            outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [response]);

    const handleRun = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setResponse('');
        
        try {
            await apiService.runLabTest(
                model,
                systemInstruction,
                prompt,
                temperature,
                (chunk) => setResponse(prev => prev + chunk)
            );
        } catch (e: any) {
            setResponse(prev => prev + `\n\n❌ Error: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const loadPreset = (preset: typeof PRESETS[0]) => {
        setSystemInstruction(preset.system);
        setPrompt(preset.prompt);
        setTemperature(preset.temp);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-2">
                        <span>🧪</span> API 实验室 (Playground)
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Configuration */}
                    <div className="w-80 bg-slate-900 border-r border-slate-800 p-5 overflow-y-auto flex flex-col gap-6 shrink-0">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Model</label>
                            <select 
                                value={model} 
                                onChange={e => setModel(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                            >
                                {availableModels.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.isVip ? '👑 ' : ''}{m.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Temperature</label>
                                <span className="text-xs text-cyan-400 font-mono">{temperature}</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" max="2" step="0.1" 
                                value={temperature} 
                                onChange={e => setTemperature(parseFloat(e.target.value))}
                                className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                                <span>Precise</span>
                                <span>Creative</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">System Instruction</label>
                            <textarea 
                                value={systemInstruction}
                                onChange={e => setSystemInstruction(e.target.value)}
                                className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-3 text-xs text-slate-300 outline-none focus:border-cyan-500 resize-none font-mono leading-relaxed"
                                placeholder="Define the AI's persona and rules..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Load Preset</label>
                            <div className="grid grid-cols-1 gap-2">
                                {PRESETS.map((p, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => loadPreset(p)}
                                        className="text-left px-3 py-2 rounded bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-cyan-500/50 transition-colors"
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Middle: Input */}
                    <div className="flex-1 flex flex-col bg-[#1e293b] border-r border-slate-800 relative">
                        <div className="absolute top-0 left-0 right-0 p-2 bg-[#1e293b]/90 backdrop-blur z-10 border-b border-slate-700/50">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">User Prompt</span>
                        </div>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            className="flex-1 w-full bg-transparent p-6 pt-10 text-slate-200 outline-none resize-none font-mono text-sm leading-relaxed"
                            placeholder="Enter your prompt here..."
                        />
                        <div className="p-4 border-t border-slate-700 bg-slate-900 flex justify-end">
                            <Button onClick={handleRun} isLoading={isGenerating} className="px-8 shadow-lg shadow-cyan-500/20" variant="primary">
                                Run Request ▶
                            </Button>
                        </div>
                    </div>

                    {/* Right: Output */}
                    <div className="flex-1 bg-[#0f172a] flex flex-col relative min-w-[300px]">
                        <div className="absolute top-0 left-0 right-0 p-2 bg-[#0f172a]/90 backdrop-blur z-10 border-b border-slate-800">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">Output</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 pt-10">
                            {!response && !isGenerating && (
                                <div className="text-slate-600 text-sm font-mono mt-10 text-center">Waiting for run...</div>
                            )}
                            <div className="prose prose-invert prose-sm max-w-none font-mono">
                                <ReactMarkdown>{response}</ReactMarkdown>
                            </div>
                            <div ref={outputEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
