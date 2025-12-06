
import React, { useEffect, useState } from 'react';
import { NovelSettings, ReferenceNovel } from '../types';
import { Button } from './Button';
import { logger } from '../services/loggerService';
import { apiService } from '../services/geminiService';

interface Props {
    settings: NovelSettings;
    onChange: (settings: NovelSettings) => void;
    // 修改：允许传递可选的自定义Context (idea模式) 或 Reference (analysis模式)
    onGenerateIdea: (customContext?: string, references?: ReferenceNovel[]) => void;
    isGenerating: boolean;
    // 新增：存档加载提示
    loadedFromArchive?: string;
}

type InputMode = 'config' | 'oneliner' | 'analysis';

export const NovelSettingsForm: React.FC<Props> = ({ settings, onChange, onGenerateIdea, isGenerating, loadedFromArchive }) => {
    
    // 本地状态存储从后端获取的素材池
    const [dataPool, setDataPool] = useState<any>(null);
    const [isLoadingPool, setIsLoadingPool] = useState(true);
    
    // 输入模式切换
    const [inputMode, setInputMode] = useState<InputMode>('config');
    // 一句话脑洞状态
    const [oneLinerInput, setOneLinerInput] = useState('');
    // 仿写模式状态：参考小说列表
    const [references, setReferences] = useState<ReferenceNovel[]>([
        { title: '', intro: '', url: '' }
    ]);

    // 初始化时加载后端配置
    useEffect(() => {
        const loadPool = async () => {
            const pool = await apiService.fetchConfigPool();
            if (pool) {
                setDataPool(pool);
                logger.info("已加载后端爆款素材库");
            } else {
                logger.warn("使用本地兜底素材库（无法连接后端）");
            }
            setIsLoadingPool(false);
        };
        loadPool();
    }, []);

    // 处理单个字段变更
    const handleChange = (key: keyof NovelSettings, value: string) => {
        onChange({ ...settings, [key]: value });
    };

    // 随机获取数组中的一个元素
    const getRandomItem = (arr: string[]) => {
        if (!arr || arr.length === 0) return "暂无数据";
        return arr[Math.floor(Math.random() * arr.length)];
    };

    // 生成随机爆款配置
    const handleRandomize = () => {
        if (!dataPool) {
            logger.warn("素材库未加载，无法随机");
            return;
        }

        const newSettings: NovelSettings = {
            genre: getRandomItem(dataPool.genres),
            trope: getRandomItem(dataPool.tropes),
            protagonistType: getRandomItem(dataPool.protagonistTypes),
            goldenFinger: getRandomItem(dataPool.goldenFingers),
            tone: getRandomItem(dataPool.tones),
            // 随机受众和节奏
            targetAudience: Math.random() > 0.5 ? 'male' : 'female',
            pacing: Math.random() > 0.3 ? 'fast' : (Math.random() > 0.5 ? 'normal' : 'slow')
        };
        
        onChange(newSettings);
        logger.info("用户使用了随机生成配置功能", newSettings);
    };

    // 统一处理点击生成按钮
    const handleGenerateClick = () => {
        if (inputMode === 'oneliner') {
            if (!oneLinerInput.trim()) {
                alert("请输入您的灵感");
                return;
            }
            onGenerateIdea(oneLinerInput);
        } else if (inputMode === 'analysis') {
            // 校验参考小说
            const validRefs = references.filter(r => r.title.trim() && r.intro.trim());
            if (validRefs.length === 0) {
                alert("请至少输入一个参考小说的标题和简介");
                return;
            }
            onGenerateIdea(undefined, validRefs);
        } else {
            onGenerateIdea();
        }
    };

    // 参考小说管理
    const addReference = () => {
        setReferences([...references, { title: '', intro: '', url: '' }]);
    };
    const removeReference = (index: number) => {
        setReferences(references.filter((_, i) => i !== index));
    };
    const updateReference = (index: number, field: keyof ReferenceNovel, value: string) => {
        const newRefs = [...references];
        newRefs[index] = { ...newRefs[index], [field]: value };
        setReferences(newRefs);
    };

    return (
        <div className="space-y-4 p-4 bg-paper rounded-xl border border-slate-700 relative transition-all duration-300">
            {loadedFromArchive && (
                <div className="absolute -top-3 left-4 bg-green-600 text-white text-xs px-2 py-0.5 rounded shadow-lg animate-fade-in">
                    已加载存档: {loadedFromArchive}
                </div>
            )}
            
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                    创作模式
                </h2>
                
                {/* 仅在配置模式下显示随机按钮 */}
                {inputMode === 'config' && (
                    <button 
                        onClick={handleRandomize}
                        disabled={isGenerating || isLoadingPool}
                        className="text-xs flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-3 py-1.5 rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isLoadingPool ? "正在连接素材库..." : "点击从服务器获取随机爆款配置"}
                    >
                        {isLoadingPool ? (
                             <svg className="animate-spin h-4 w-4 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        )}
                        {isLoadingPool ? '加载中...' : '一键随机爆款'}
                    </button>
                )}
            </div>

            {/* 模式切换 Tabs */}
            <div className="flex space-x-1 bg-dark p-1 rounded-lg mb-4">
                <button 
                    onClick={() => setInputMode('config')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        inputMode === 'config' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    参数配置
                </button>
                <button 
                    onClick={() => setInputMode('oneliner')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        inputMode === 'oneliner' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    脑洞发散
                </button>
                <button 
                    onClick={() => setInputMode('analysis')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        inputMode === 'analysis' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    爆款仿写
                </button>
            </div>
            
            {/* 1. 参数配置模式 */}
            {inputMode === 'config' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">流派 (Genre)</label>
                        <input 
                            type="text" 
                            value={settings.genre} 
                            onChange={(e) => handleChange('genre', e.target.value)}
                            className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            placeholder="例如：都市修仙"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">核心梗 (Trope)</label>
                        <input 
                            type="text" 
                            value={settings.trope} 
                            onChange={(e) => handleChange('trope', e.target.value)}
                            className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            placeholder="例如：重生+校花"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-400 mb-1">主角人设 (Protagonist)</label>
                        <input 
                            type="text" 
                            value={settings.protagonistType} 
                            onChange={(e) => handleChange('protagonistType', e.target.value)}
                            className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            placeholder="例如：腹黑、智商在线、杀伐果断"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-400 mb-1">金手指 (Cheat/Golden Finger)</label>
                        <textarea 
                            value={settings.goldenFinger} 
                            onChange={(e) => handleChange('goldenFinger', e.target.value)}
                            className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none h-20 resize-none transition-colors"
                            placeholder="主角的特殊能力，爽点的核心来源..."
                        />
                    </div>
                    
                    <div className="md:col-span-2">
                         <label className="block text-sm font-medium text-slate-400 mb-1">整体基调 (Tone)</label>
                         <input 
                            type="text" 
                            value={settings.tone} 
                            onChange={(e) => handleChange('tone', e.target.value)}
                            className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            placeholder="例如：热血、搞笑、克苏鲁压抑风"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">节奏 (Pacing)</label>
                        <select 
                            value={settings.pacing} 
                            onChange={(e) => handleChange('pacing', e.target.value as any)}
                            className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        >
                            <option value="fast">快节奏 (极爽/无脑)</option>
                            <option value="normal">常规节奏 (张弛有度)</option>
                            <option value="slow">慢热 (铺垫流)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">受众 (Target)</label>
                        <select 
                            value={settings.targetAudience} 
                            onChange={(e) => handleChange('targetAudience', e.target.value as any)}
                            className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        >
                            <option value="male">男频 (热血/征服)</option>
                            <option value="female">女频 (情感/复仇)</option>
                        </select>
                    </div>
                </div>
            )}

            {/* 2. 一句话脑洞模式 */}
            {inputMode === 'oneliner' && (
                <div className="animate-fade-in space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">你的核心脑洞/灵感 (Idea)</label>
                        <textarea 
                            value={oneLinerInput}
                            onChange={(e) => setOneLinerInput(e.target.value)}
                            className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none h-48 resize-none transition-colors text-base"
                            placeholder="例如：主角是个厨师，但是他做的菜都是用抓来的妖怪做的，吃了能涨修为..."
                        />
                        <p className="text-xs text-slate-500 mt-2">* AI 将基于此灵感，结合下方设定的基调进行发散。</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">受众 (Target)</label>
                            <select 
                                value={settings.targetAudience} 
                                onChange={(e) => handleChange('targetAudience', e.target.value as any)}
                                className="w-full bg-dark border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-300 outline-none focus:border-primary"
                            >
                                <option value="male">男频</option>
                                <option value="female">女频</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">基调 (Tone)</label>
                             <input 
                                type="text" 
                                value={settings.tone} 
                                onChange={(e) => handleChange('tone', e.target.value)}
                                className="w-full bg-dark border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-300 outline-none focus:border-primary"
                                placeholder="例如：搞笑、热血"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 3. 爆款仿写模式 */}
            {inputMode === 'analysis' && (
                <div className="animate-fade-in space-y-4">
                    <div className="bg-blue-900/20 p-3 rounded text-xs text-blue-200 mb-4 border border-blue-800">
                        在此模式下，您可以输入 1-3 本您认为“爆火”的同类小说信息。AI 将深度拆解它们的成功基因（如爽点节奏、人设反差），并结合您的受众偏好生成全新的创意。
                    </div>
                    
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {references.map((ref, index) => (
                            <div key={index} className="bg-black/20 p-3 rounded border border-slate-700 relative group">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => removeReference(index)} className="text-slate-500 hover:text-red-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        value={ref.title}
                                        onChange={(e) => updateReference(index, 'title', e.target.value)}
                                        placeholder={`参考小说 ${index + 1} 书名`}
                                        className="w-full bg-transparent border-b border-slate-600 text-sm py-1 focus:border-primary outline-none"
                                    />
                                    <input 
                                        type="text" 
                                        value={ref.url}
                                        onChange={(e) => updateReference(index, 'url', e.target.value)}
                                        placeholder="小说地址 URL (可选)"
                                        className="w-full bg-transparent border-b border-slate-600 text-xs py-1 text-slate-400 focus:border-primary outline-none"
                                    />
                                    <textarea 
                                        value={ref.intro}
                                        onChange={(e) => updateReference(index, 'intro', e.target.value)}
                                        placeholder="请粘贴小说的简介文案或第一章核心情节 (AI将基于此内容进行拆解)"
                                        className="w-full bg-dark/50 rounded p-2 text-xs text-slate-300 outline-none h-16 resize-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {references.length < 3 && (
                        <button onClick={addReference} className="w-full py-2 border border-dashed border-slate-600 rounded text-slate-400 hover:text-white hover:border-slate-400 text-sm transition-colors">
                            + 添加参考案例
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">您的目标受众</label>
                            <select 
                                value={settings.targetAudience} 
                                onChange={(e) => handleChange('targetAudience', e.target.value as any)}
                                className="w-full bg-dark border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-300 outline-none focus:border-primary"
                            >
                                <option value="male">男频</option>
                                <option value="female">女频</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">您的期望基调</label>
                             <input 
                                type="text" 
                                value={settings.tone} 
                                onChange={(e) => handleChange('tone', e.target.value)}
                                className="w-full bg-dark border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-300 outline-none focus:border-primary"
                                placeholder="例如：更热血一点"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="pt-4 border-t border-slate-700">
                <Button 
                    onClick={handleGenerateClick} 
                    isLoading={isGenerating}
                    className="w-full"
                    variant="secondary"
                >
                    {inputMode === 'config' && '✨ 基于参数生成创意脑洞'}
                    {inputMode === 'oneliner' && '🚀 基于灵感发散生成脑洞'}
                    {inputMode === 'analysis' && '🔬 分析爆款基因并生成新创意'}
                </Button>
                {inputMode === 'config' && (
                    <p className="text-xs text-center text-slate-500 mt-2">
                        觉得配置不满意？点击右上角"随机"按钮重试，数据由云端实时更新。
                    </p>
                )}
            </div>
        </div>
    );
};