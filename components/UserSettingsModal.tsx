
import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { AppLanguage } from '../types';
import { Button } from './Button';

interface Props {
    onClose: () => void;
}

export const UserSettingsModal: React.FC<Props> = ({ onClose }) => {
    const { settings, updateSettings, t } = useSettings();

    const languages: { id: AppLanguage; label: string; flag: string }[] = [
        { id: 'en-US', label: 'English', flag: '🇺🇸' },
        { id: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
        { id: 'ja-JP', label: '日本語', flag: '🇯🇵' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>⚙️</span> {t('settings.modal.title')}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 bg-[#0f172a]">
                    
                    {/* 1. Language Section */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-3">{t('settings.lang')}</label>
                        <div className="flex flex-col gap-2">
                            {languages.map(lang => (
                                <button
                                    key={lang.id}
                                    onClick={() => updateSettings({ language: lang.id })}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all ${
                                        settings.language === lang.id 
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="text-xl">{lang.flag}</span>
                                    <span className="font-medium">{lang.label}</span>
                                    {settings.language === lang.id && (
                                        <svg className="w-5 h-5 ml-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end gap-3">
                    <Button onClick={onClose} variant="primary">{t('btn.close')}</Button>
                </div>
            </div>
        </div>
    );
};
