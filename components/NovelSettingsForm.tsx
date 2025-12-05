

import React, { useEffect, useState } from 'react';
import { NovelSettings } from '../types';
import { Button } from './Button';
import { logger } from '../services/loggerService';
import { apiService } from '../services/geminiService';

interface Props {
    settings: NovelSettings;
    onChange: (settings: NovelSettings) => void;
    onGenerateIdea: () => void;
    isGenerating: boolean;
    // 新增：存档加载提示
    loadedFromArchive?: string;
}

export const NovelSettingsForm: React.FC<Props> = ({ settings, onChange, onGenerateIdea, isGenerating, loadedFromArchive }) => {
    
    // 本地状态存储从后端获取的素材池
    const [dataPool, setDataPool] = useState<any>(null);
    const [isLoadingPool, setIsLoadingPool] = useState(true);

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
                    爆款设定
                </h2>
                {/* 随机生成按钮 */}
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="pt-4 border-t border-slate-700">
                <Button 
                    onClick={onGenerateIdea} 
                    isLoading={isGenerating}
                    className="w-full"
                    variant="secondary"
                >
                    ✨ 基于配置生成创意脑洞 (Idea)
                </Button>
                <p className="text-xs text-center text-slate-500 mt-2">
                    觉得配置不满意？点击右上角"随机"按钮重试，数据由云端实时更新。
                </p>
            </div>
        </div>
    );
};
