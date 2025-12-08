import React, { useState } from 'react';
import { Button } from './Button';
import { useSettings } from '../contexts/SettingsContext';

interface Props {
    onClose: () => void;
}

interface ApiEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
    params?: string; // JSON schema or description
    example?: any;
}

const APIS: ApiEndpoint[] = [
    {
        method: 'POST',
        path: '/api/auth/register',
        description: '用户注册',
        params: '{ username, password }',
        example: { username: "demo", password: "password123" }
    },
    {
        method: 'POST',
        path: '/api/auth/login',
        description: '用户登录',
        params: '{ username, password }',
        example: { username: "demo", password: "password123" }
    },
    {
        method: 'GET',
        path: '/api/user/status',
        description: '获取当前用户状态 (需 Auth)',
    },
    {
        method: 'POST',
        path: '/api/generate',
        description: 'AI 内容生成 (流式)',
        params: '{ settings, step, context, references, model }',
        example: { step: "idea", settings: { genre: "玄幻" } }
    },
    {
        method: 'GET',
        path: '/api/projects',
        description: '获取项目列表',
    },
    {
        method: 'GET',
        path: '/api/archives',
        description: '获取存档列表',
    }
];

export const ApiLabModal: React.FC<Props> = ({ onClose }) => {
    const { t } = useSettings();
    const [selectedApi, setSelectedApi] = useState<ApiEndpoint | null>(null);
    const [requestBody, setRequestBody] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleTest = async () => {
        if (!selectedApi) return;
        setIsLoading(true);
        setResponse('Waiting...');

        try {
            const token = localStorage.getItem('skycraft_token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json'
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const options: RequestInit = {
                method: selectedApi.method,
                headers
            };

            if (selectedApi.method !== 'GET' && requestBody) {
                options.body = requestBody;
            }

            const res = await fetch(selectedApi.path, options);
            const data = await res.text();

            try {
                // Try format JSON
                setResponse(JSON.stringify(JSON.parse(data), null, 2));
            } catch {
                setResponse(data);
            }
        } catch (e: any) {
            setResponse(`Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const selectApi = (api: ApiEndpoint) => {
        setSelectedApi(api);
        setRequestBody(api.example ? JSON.stringify(api.example, null, 2) : '');
        setResponse('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-paper border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden relative">
                {/* Sidebar List */}
                <div className="w-64 border-r border-slate-700 bg-slate-900/50 p-4 overflow-y-auto">
                    <h3 className="text-white font-bold mb-4">API 实验室</h3>
                    <div className="space-y-2">
                        {APIS.map((api, idx) => (
                            <button
                                key={idx}
                                onClick={() => selectApi(api)}
                                className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors ${selectedApi === api ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                            >
                                <span className={`mr-2 font-bold ${api.method === 'GET' ? 'text-green-400' : api.method === 'POST' ? 'text-yellow-400' : 'text-red-400'}`}>{api.method}</span>
                                {api.path}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                        {selectedApi ? (
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${selectedApi.method === 'GET' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>{selectedApi.method}</span>
                                    {selectedApi.path}
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">{selectedApi.description}</p>
                            </div>
                        ) : (
                            <div className="text-slate-500">Select an API to test</div>
                        )}
                        <button onClick={onClose} className="text-slate-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {selectedApi && (
                        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                            {selectedApi.method !== 'GET' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Request Body (JSON)</label>
                                    <textarea
                                        value={requestBody}
                                        onChange={(e) => setRequestBody(e.target.value)}
                                        className="w-full h-32 bg-black/30 border border-slate-700 rounded p-2 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            )}

                            <div>
                                <Button onClick={handleTest} isLoading={isLoading}>Send Request</Button>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Response</label>
                                <div className="flex-1 bg-black/50 border border-slate-700 rounded p-2 overflow-auto">
                                    <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">{response}</pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
