import React from 'react';
import { NovelSettings } from '../types';
import { Button } from './Button';

interface Props {
    settings: NovelSettings;
    onChange: (settings: NovelSettings) => void;
    onGenerateIdea: () => void;
    isGenerating: boolean;
}

export const NovelSettingsForm: React.FC<Props> = ({ settings, onChange, onGenerateIdea, isGenerating }) => {
    const handleChange = (key: keyof NovelSettings, value: string) => {
        onChange({ ...settings, [key]: value });
    };

    return (
        <div className="space-y-4 p-4 bg-paper rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                爆款设定 (Core Config)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">流派 (Genre)</label>
                    <input 
                        type="text" 
                        value={settings.genre} 
                        onChange={(e) => handleChange('genre', e.target.value)}
                        className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        placeholder="例如：都市修仙"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">核心梗 (Trope)</label>
                    <input 
                        type="text" 
                        value={settings.trope} 
                        onChange={(e) => handleChange('trope', e.target.value)}
                        className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        placeholder="例如：重生+校花"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1">主角人设 (Protagonist)</label>
                    <input 
                        type="text" 
                        value={settings.protagonistType} 
                        onChange={(e) => handleChange('protagonistType', e.target.value)}
                        className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        placeholder="例如：腹黑、智商在线、杀伐果断"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1">金手指 (Cheat/Golden Finger)</label>
                    <textarea 
                        value={settings.goldenFinger} 
                        onChange={(e) => handleChange('goldenFinger', e.target.value)}
                        className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none h-20 resize-none"
                        placeholder="主角的特殊能力，爽点的核心来源..."
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">节奏 (Pacing)</label>
                    <select 
                        value={settings.pacing} 
                        onChange={(e) => handleChange('pacing', e.target.value as any)}
                        className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 outline-none"
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
                        className="w-full bg-dark border border-slate-600 rounded px-3 py-2 text-slate-200 outline-none"
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
                    ✨ 生成创意脑洞 (Idea)
                </Button>
            </div>
        </div>
    );
};