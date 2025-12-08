
export const DASHBOARD_VIEW = `
<div x-show="currentTab === 'dashboard'" class="animate-fade-in">
    <h2 class="text-2xl font-bold mb-6 text-white">系统概览</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <div class="text-slate-400 text-sm font-medium mb-2">活跃 API Keys</div>
            <div class="text-3xl font-bold text-yellow-400" x-text="stats.activeKeys">0</div>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <div class="text-slate-400 text-sm font-medium mb-2">总用户数</div>
            <div class="text-3xl font-bold text-white" x-text="stats.totalUsers">0</div>
        </div>
            <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <div class="text-slate-400 text-sm font-medium mb-2">脑洞卡片数</div>
            <div class="text-3xl font-bold text-indigo-500" x-text="stats.totalCards">0</div>
        </div>
            <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <div class="text-slate-400 text-sm font-medium mb-2">IDE 项目数</div>
            <div class="text-3xl font-bold text-green-500" x-text="stats.totalProjects">0</div>
        </div>
    </div>
</div>
`;

export const APILAB_VIEW = `
<div x-show="currentTab === 'apilab'" class="animate-fade-in h-full flex flex-col">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2 class="text-2xl font-bold text-white">🧪 API 实验室</h2>
            <p class="text-slate-400 text-sm mt-1">可视化调试与性能监控中心</p>
        </div>
        <div class="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-sm">
            <div class="flex flex-col items-end">
                <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Impersonate As</span>
                <span class="text-xs text-indigo-400" x-text="apiLab.targetUserId ? '模拟用户生效' : '未选择 (Public Mode)'"></span>
            </div>
            <select x-model="apiLab.targetUserId" class="bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-white outline-none w-48 focus:border-indigo-500 transition-colors">
                <option value="">-- 公开接口 (No Auth) --</option>
                <template x-for="u in users" :key="u.id">
                    <option :value="u.id" x-text="u.username + (u.isVip ? ' [VIP]' : '')"></option>
                </template>
            </select>
        </div>
    </div>
    <div class="flex-1 flex gap-6 overflow-hidden min-h-[600px]">
        <div class="w-72 bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden shrink-0 shadow-lg">
            <div class="p-3 bg-slate-950 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase flex justify-between">
                <span>Available Endpoints</span>
                <span class="text-indigo-500" x-text="apiRegistry.length"></span>
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
                <template x-for="api in apiRegistry" :key="api.url + api.method">
                    <button @click="selectApi(api)" class="w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex flex-col gap-1 border border-transparent group" :class="apiLab.currentApi?.name === api.name ? 'bg-indigo-900/40 border-indigo-500/50 shadow-md' : 'hover:bg-slate-700/50 hover:border-slate-600'">
                        <div class="flex items-center justify-between w-full">
                            <span class="font-bold text-slate-200 group-hover:text-white transition-colors truncate" x-text="api.name"></span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shadow-sm" :class="{'bg-green-500/20 text-green-400': api.method==='GET', 'bg-blue-500/20 text-blue-400': api.method==='POST', 'bg-yellow-500/20 text-yellow-400': api.method==='PUT', 'bg-red-500/20 text-red-400': api.method==='DELETE'}" x-text="api.method"></span>
                        </div>
                        <div class="flex items-center gap-2 w-full"><span class="text-[10px] text-slate-500 font-mono truncate flex-1 opacity-70" x-text="api.url"></span><span x-show="api.auth" class="text-[10px] text-yellow-500">🔒</span></div>
                    </button>
                </template>
            </div>
        </div>
        <div class="flex-1 flex flex-col gap-4 overflow-hidden">
            <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg flex flex-col h-1/2 relative group">
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2 flex-1 mr-4">
                        <span class="text-sm font-bold text-white bg-slate-700 px-2 py-0.5 rounded shrink-0">URL</span>
                        <input type="text" x-model="apiLab.requestUrl" class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-yellow-400 font-mono outline-none focus:border-indigo-500">
                    </div>
                    <div class="flex gap-2">
                        <button @click="loadApiExample" class="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-700">↺ 重置</button>
                        <button @click="testApi" :disabled="apiLab.isLoading || (apiLab.currentApi?.auth && !apiLab.targetUserId)" class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"><span x-show="apiLab.isLoading" class="animate-spin">⟳</span><span x-text="apiLab.isLoading ? 'Processing...' : 'Send Request 🚀'"></span></button>
                    </div>
                </div>
                <textarea x-model="apiLab.requestBody" class="flex-1 bg-[#0f172a] border border-slate-600 rounded-lg p-4 font-mono text-xs text-emerald-400 outline-none focus:border-indigo-500 resize-none transition-all placeholder-slate-700 custom-scrollbar" spellcheck="false" placeholder="Select an API..."></textarea>
            </div>
            <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg flex flex-col h-1/2 relative overflow-hidden">
                <div class="flex justify-between items-center mb-2 z-10">
                    <span class="text-sm font-bold text-white bg-slate-700 px-2 py-0.5 rounded">Response</span>
                    <div class="flex gap-4 text-xs font-mono bg-black/20 px-3 py-1 rounded-lg border border-slate-700/50">
                        <div class="flex items-center gap-1.5"><span class="text-slate-500">Status:</span><span class="font-bold" :class="apiLab.responseStatus >= 200 && apiLab.responseStatus < 300 ? 'text-green-400' : 'text-red-400'" x-text="apiLab.responseStatus || '---'"></span></div>
                        <div class="w-px bg-slate-700 h-3 self-center"></div>
                        <div class="flex items-center gap-1.5"><span class="text-slate-500">Time:</span><span class="text-yellow-400" x-text="apiLab.responseTime ? apiLab.responseTime + 'ms' : '---'"></span></div>
                    </div>
                </div>
                <div class="flex-1 bg-[#0d1117] border border-slate-600 rounded-lg overflow-hidden relative group">
                    <pre class="absolute inset-0 p-4 font-mono text-xs text-blue-300 whitespace-pre-wrap break-all overflow-auto custom-scrollbar" x-text="apiLab.responseBody || '// Waiting for response...'"></pre>
                    <div x-show="apiLab.isLoading" class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-20"><div class="flex flex-col items-center text-indigo-400"><span class="text-xs font-mono animate-pulse">Waiting for Server...</span></div></div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

export const USERS_VIEW = `
<div x-show="currentTab === 'users'" class="animate-fade-in">
    <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold text-white">用户列表</h2>
    <button @click="showAddUserModal=true" class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white text-sm font-bold shadow-lg transition-colors flex items-center gap-2"><span>+</span> 新增用户</button>
</div>
<div class="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
    <table class="w-full text-left text-sm text-slate-400">
        <thead class="bg-slate-950 text-slate-200 font-bold"><tr><th class="p-4">用户名</th><th class="p-4">Tokens</th><th class="p-4">会员到期</th><th class="p-4 text-right">操作</th></tr></thead>
        <tbody class="divide-y divide-slate-700">
            <template x-for="u in users" :key="u.id">
                <tr class="hover:bg-slate-700/50 transition-colors">
                    <td class="p-4 text-white font-medium" x-text="u.username"></td>
                    <td class="p-4 font-mono text-yellow-500" x-text="u.tokens.toLocaleString()"></td>
                    <td class="p-4 text-xs"><span :class="u.vip_expiry && new Date(u.vip_expiry) > new Date() ? 'text-yellow-400 font-bold' : 'text-slate-500'"><span x-text="formatDate(u.vip_expiry) || '无'"></span></span></td>
                    <td class="p-4 flex justify-end gap-3"><button @click="editUser(u)" class="text-blue-400 hover:text-blue-300 text-xs font-bold">编辑</button><button @click="viewUserArchives(u)" class="text-indigo-400 hover:text-indigo-300 text-xs font-bold">存档</button><button @click="deleteUser(u.id)" class="text-red-400 hover:text-red-300 text-xs font-bold">删除</button></td>
                </tr>
            </template>
        </tbody>
    </table>
</div>
</div>
`;

export const SETTINGS_VIEW = `
<div x-show="currentTab === 'settings'" class="animate-fade-in space-y-8">
    <h2 class="text-2xl font-bold text-white mb-6">系统设置</h2>
    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-indigo-400">基础参数配置</h3><button @click="saveInitialTokens" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors">保存参数</button></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm text-slate-500 mb-1">新用户初始 Tokens</label><input x-model="config.initialTokens" type="number" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-indigo-500"></div></div>
    </div>
    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-indigo-400">AI 模型配置</h3><button @click="saveAiModels" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors">应用变更</button></div>
        <div class="space-y-2 max-h-60 overflow-y-auto">
            <template x-for="(model, idx) in config.parsedModels" :key="idx">
                <div class="flex items-center gap-3 bg-slate-900/50 p-3 rounded border border-slate-700">
                    <input type="checkbox" x-model="model.isActive" class="w-4 h-4 rounded border-slate-600 text-indigo-600 bg-slate-800">
                    <div class="flex-1 grid grid-cols-1 gap-1"><input x-model="model.name" class="bg-transparent text-sm text-white font-bold outline-none border-b border-transparent focus:border-indigo-500" placeholder="显示名称"><div class="flex gap-2 text-xs items-center"><input x-model="model.id" class="bg-transparent text-slate-500 w-32 outline-none border-b border-transparent focus:border-slate-500" placeholder="Model ID"><label class="flex items-center gap-1 cursor-pointer select-none px-2 py-0.5 rounded bg-slate-800 border border-slate-700" :class="model.isVip ? 'border-yellow-500/50 text-yellow-500' : 'text-slate-400'"><input type="checkbox" x-model="model.isVip" class="hidden"><span x-text="model.isVip ? '★ VIP专属' : '☆ 免费可用'"></span></label></div></div>
                    <button @click="config.parsedModels.splice(idx, 1)" class="text-red-400 hover:text-white px-2">×</button>
                </div>
            </template>
        </div>
        <button @click="config.parsedModels.push({id:'', name:'New Model', isActive: true, isVip: false})" class="mt-4 w-full py-2 border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 rounded text-sm">+ 添加模型</button>
    </div>
</div>
`;
