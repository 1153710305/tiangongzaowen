
import React, { useEffect, useState } from 'react';
import { UserPrompt, PromptType } from '../types';
import { apiService } from '../services/geminiService';

interface Props {
    type: PromptType;
    onSelect: (content: string) => void;
    label?: string;
}

export const PromptSelector: React.FC<Props> = ({ type, onSelect, label }) => {
    const [prompts, setPrompts] = useState<UserPrompt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiService.getUserPrompts().then(all => {
            setPrompts(all.filter(p => p.type === type));
            setLoading(false);
        });
    }, [type]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) onSelect(val);
    };

    return (
        <div className="mb-2">
            {label && <label className="block text-xs text-slate-500 mb-1">{label}</label>}
            <select 
                onChange={handleChange}
                disabled={loading}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500"
            >
                <option value="">-- 选择预设{type === 'system' ? '身份' : (type === 'constraint' ? '约束' : '指令')} --</option>
                {prompts.map(p => (
                    <option key={p.id} value={p.content}>{p.title}</option>
                ))}
            </select>
        </div>
    );
};
