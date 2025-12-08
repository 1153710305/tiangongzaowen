
import { ADMIN_STYLES, ADMIN_SCRIPT } from './admin_assets.ts';

/**
 * 后台管理界面 UI 模板
 * 逻辑已解耦至 admin_assets.ts
 */
export const ADMIN_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>天工造文 - 后台管理系统</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>
    <style>${ADMIN_STYLES}</style>
</head>
<body class="bg-slate-900 text-slate-200 font-sans h-screen overflow-hidden" x-data="adminApp()">
    
    <!-- 登录模态框 -->
    <div x-show="!isAuthenticated" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-sm">
            <h2 class="text-2xl font-bold text-center mb-6 text-indigo-400">管理员登录</h2>
            <form @submit.prevent="login">
                <input type="password" x-model="password" placeholder="请输入管理员密码" class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-3 mb-4 outline-none focus:border-indigo-500 transition-colors">
                <button type="submit" :disabled="isLoading" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded transition-colors">
                    <span x-show="!isLoading">进入后台</span><span x-show="isLoading">验证中...</span>
                </button>
                <p x-show="loginError" class="mt-4 text-red-400 text-sm text-center" x-text="loginError"></p>
            </form>
        </div>
    </div>

    <!-- 主界面 -->
    <div x-show="isAuthenticated" class="flex h-full" x-cloak>
        <!-- 侧边栏 -->
        <div class="w-64 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0">
            <div class="p-6 border-b border-slate-800">
                <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-500">SkyCraft Admin</h1>
                <p class="text-xs text-slate-500 mt-1">v3.0 Key Pool System</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button @click="switchTab('dashboard')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'dashboard'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>📊</span> 概览
                </button>
                <button @click="switchTab('keys')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'keys'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>🔑</span> 密钥管理
                </button>
                <button @click="switchTab('users')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'users'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>👥</span> 用户管理
                </button>
                <button @click="switchTab('settings')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'settings'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>⚙️</span> 系统设置
                </button>
                <button @click="switchTab('logs')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'logs'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>📜</span> 系统日志
                </button>
            </nav>
            <div class="p-4 border-t border-slate-800">
                <button @click="logout" class="w-full text-sm text-slate-400 hover:text-white border border-slate-700 rounded py-2 hover:bg-slate-800 transition-colors">退出登录</button>
            </div>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto bg-slate-900 p-8">
            <!-- 仪表盘 -->
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

            <!-- API Key 管理 (New) -->
            <div x-show="currentTab === 'keys'" class="animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-white">API Key 池管理</h2>
                    <button @click="showAddKeyModal=true" class="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded text-white text-sm font-bold shadow-lg transition-colors flex items-center gap-2">
                        <span>+</span> 添加 Key
                    </button>
                </div>
                <div class="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
                    <table class="w-full text-left text-sm text-slate-400">
                        <thead class="bg-slate-950 text-slate-200 font-bold">
                            <tr>
                                <th class="p-4">Key (Masked)</th>
                                <th class="p-4">状态</th>
                                <th class="p-4 text-center">调用次数</th>
                                <th class="p-4 text-center">Token 消耗</th>
                                <th class="p-4 text-center">平均时延</th>
                                <th class="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-700">
                            <template x-for="k in apiKeys" :key="k.id">
                                <tr class="hover:bg-slate-700/50 transition-colors">
                                    <td class="p-4 font-mono text-xs text-white" x-text="k.key"></td>
                                    <td class="p-4">
                                        <button @click="toggleKeyStatus(k)" 
                                            :class="k.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'"
                                            class="px-2 py-1 rounded text-xs border transition-colors font-bold">
                                            <span x-text="k.is_active ? '启用中' : '已禁用'"></span>
                                        </button>
                                    </td>
                                    <td class="p-4 text-center" x-text="k.usage_count"></td>
                                    <td class="p-4 text-center font-mono text-yellow-100/70" x-text="k.total_tokens.toLocaleString()"></td>
                                    <td class="p-4 text-center text-xs">
                                        <span x-text="k.usage_count > 0 ? Math.round(k.total_latency_ms / k.usage_count) + 'ms' : '-'"></span>
                                    </td>
                                    <td class="p-4 text-right">
                                        <button @click="deleteKey(k.id)" class="text-red-400 hover:text-red-300 text-xs font-bold bg-red-900/20 px-2 py-1 rounded">删除</button>
                                    </td>
                                </tr>
                            </template>
                             <tr x-show="apiKeys.length === 0">
                                <td colspan="6" class="p-8 text-center text-slate-500">暂无 API Key，请添加以启用服务。</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="p-4 bg-slate-900/50 text-xs text-slate-500 border-t border-slate-700">
                        * 系统采用 LRU (最久未使用) 策略进行轮询，优先使用活跃且空闲的 Key。
                    </div>
                </div>
            </div>

            <!-- 用户管理 -->
            <div x-show="currentTab === 'users'" class="animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-white">用户列表</h2>
                    <button @click="showAddUserModal=true" class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white text-sm font-bold shadow-lg transition-colors flex items-center gap-2">
                        <span>+</span> 新增用户
                    </button>
                </div>
                <div class="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
                    <table class="w-full text-left text-sm text-slate-400">
                        <thead class="bg-slate-950 text-slate-200 font-bold">
                            <tr>
                                <th class="p-4 w-1/4">ID</th>
                                <th class="p-4 w-1/4">用户名</th>
                                <th class="p-4 w-1/4">注册时间</th>
                                <th class="p-4 w-1/4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-700">
                            <template x-for="u in users" :key="u.id">
                                <tr class="hover:bg-slate-700/50 transition-colors">
                                    <td class="p-4 font-mono text-xs" x-text="u.id"></td>
                                    <td class="p-4 text-white font-medium" x-text="u.username"></td>
                                    <td class="p-4 text-xs" x-text="formatDate(u.created_at)"></td>
                                    <td class="p-4 flex justify-end gap-3">
                                        <button @click="viewUserArchives(u)" class="text-indigo-400 hover:text-indigo-300 text-xs font-bold">查看存档</button>
                                        <button @click="openResetPwd(u)" class="text-yellow-400 hover:text-yellow-300 text-xs font-bold">重置密码</button>
                                        <button @click="deleteUser(u.id)" class="text-red-400 hover:text-red-300 text-xs font-bold">删除</button>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- 系统设置 -->
            <div x-show="currentTab === 'settings'" class="animate-fade-in">
                <h2 class="text-2xl font-bold text-white mb-6">系统设置</h2>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-bold text-indigo-400">默认 AI 模型</h3>
                            <button @click="saveDefaultModel" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors">保存配置</button>
                        </div>
                        <input x-model="config.defaultModel" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-indigo-500 mb-6" placeholder="例如: gemini-2.5-flash">
                        
                        <div class="flex justify-between items-center mb-2">
                             <h3 class="font-bold text-indigo-400">模型列表配置</h3>
                             <button @click="saveAiModels" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors">应用变更</button>
                        </div>
                        <p class="text-xs text-slate-500 mb-4">勾选启用的模型将在前端显示。</p>
                        
                        <div class="space-y-2 max-h-60 overflow-y-auto">
                            <template x-for="(model, idx) in config.parsedModels" :key="idx">
                                <div class="flex items-center gap-3 bg-slate-900/50 p-3 rounded border border-slate-700">
                                    <input type="checkbox" x-model="model.isActive" class="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800">
                                    <div class="flex-1 grid grid-cols-1 gap-1">
                                        <input x-model="model.name" class="bg-transparent text-sm text-white font-bold outline-none border-b border-transparent focus:border-indigo-500" placeholder="显示名称">
                                        <input x-model="model.id" class="bg-transparent text-xs text-slate-500 font-mono outline-none border-b border-transparent focus:border-indigo-500" placeholder="Model ID">
                                    </div>
                                    <button @click="config.parsedModels = config.parsedModels.filter((_, i) => i !== idx)" class="text-slate-600 hover:text-red-400">×</button>
                                </div>
                            </template>
                        </div>
                        <button @click="config.parsedModels.push({id:'', name:'', isActive: true})" class="mt-4 w-full py-2 border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 rounded text-sm transition-colors">+ 添加模型</button>
                    </div>
                </div>
            </div>

            <!-- 日志 -->
            <div x-show="currentTab === 'logs'" class="h-full flex flex-col animate-fade-in">
                <div class="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 class="text-2xl font-bold text-white">系统日志</h2>
                    <div class="flex gap-2">
                        <input x-model="logSearch" placeholder="搜索日志..." class="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-sm outline-none focus:border-indigo-500">
                        <select x-model="logLevelFilter" class="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-sm outline-none focus:border-indigo-500">
                            <option value="">所有级别</option>
                            <option value="INFO">INFO</option>
                            <option value="WARN">WARN</option>
                            <option value="ERROR">ERROR</option>
                        </select>
                        <button @click="fetchLogs" class="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded border border-slate-600 text-sm transition-colors">刷新</button>
                        <button @click="toggleAutoRefresh" :class="isAutoRefresh ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'" class="px-3 py-1 rounded border border-slate-600 text-sm transition-colors">
                            <span x-text="isAutoRefresh ? '自动刷新: 开' : '自动刷新: 关'"></span>
                        </button>
                    </div>
                </div>
                <div class="bg-[#0d1117] rounded-xl p-4 font-mono text-xs flex-1 overflow-y-auto border border-slate-700 shadow-inner">
                    <template x-for="l in filteredLogs" :key="l.id">
                        <div class="mb-2 border-b border-slate-800/50 pb-2 last:border-0 hover:bg-white/5 p-1 rounded transition-colors">
                            <div class="flex gap-2 mb-1">
                                <span class="text-slate-500" x-text="formatTime(l.timestamp)"></span>
                                <span class="font-bold" :class="{
                                    'text-blue-400': l.level === 'INFO',
                                    'text-yellow-400': l.level === 'WARN',
                                    'text-red-500': l.level === 'ERROR',
                                    'text-gray-400': l.level === 'DEBUG'
                                }" x-text="l.level"></span>
                                <span class="text-slate-200" x-text="l.message"></span>
                            </div>
                            <div x-show="l.meta" class="pl-20">
                                <pre class="text-slate-500 overflow-x-auto whitespace-pre-wrap code-block" x-text="JSON.stringify(l.meta, null, 2)"></pre>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>

    <!-- Modals -->
    
    <!-- 添加 Key Modal -->
    <div x-show="showAddKeyModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-6 rounded-xl w-96 border border-slate-700 shadow-2xl">
            <h3 class="font-bold text-white mb-4 text-lg">添加 API Key</h3>
            <div class="space-y-3">
                <input x-model="newKey.key" placeholder="输入 Google Gemini API Key" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-yellow-500">
                <select x-model="newKey.provider" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none">
                    <option value="google">Google Gemini</option>
                </select>
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button @click="showAddKeyModal=false" class="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                <button @click="createKey" class="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm font-bold">添加</button>
            </div>
        </div>
    </div>

    <!-- 新增用户 Modal -->
    <div x-show="showAddUserModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-6 rounded-xl w-96 border border-slate-700 shadow-2xl">
            <h3 class="font-bold text-white mb-4 text-lg">新增用户</h3>
            <div class="space-y-3">
                <input x-model="newUser.username" placeholder="用户名" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-indigo-500">
                <input x-model="newUser.password" placeholder="密码 (至少6位)" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-indigo-500">
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button @click="showAddUserModal=false" class="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                <button @click="createUser" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-bold">创建</button>
            </div>
        </div>
    </div>

    <!-- 重置密码 Modal -->
    <div x-show="showResetPwdModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-6 rounded-xl w-96 border border-slate-700 shadow-2xl">
            <h3 class="font-bold text-white mb-4 text-lg">重置密码</h3>
            <p class="text-sm text-slate-400 mb-4">用户: <span class="text-white font-bold" x-text="resetPwd.username"></span></p>
            <input x-model="resetPwd.newPassword" placeholder="输入新密码" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-indigo-500">
            <div class="flex justify-end gap-2 mt-6">
                <button @click="showResetPwdModal=false" class="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                <button @click="submitResetPwd" class="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm font-bold">确认重置</button>
            </div>
        </div>
    </div>

    <!-- 用户存档列表 Modal -->
    <div x-show="showArchivesModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-xl">
                <h3 class="font-bold text-white">用户存档: <span class="text-indigo-400" x-text="currentArchiveUser"></span></h3>
                <button @click="showArchivesModal=false" class="text-slate-400 hover:text-white">✕</button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 bg-[#0f172a]">
                <template x-for="a in currentUserArchives" :key="a.id">
                    <div class="bg-slate-800 border border-slate-700 p-3 rounded mb-2 hover:border-indigo-500 transition-colors flex justify-between items-center">
                        <div>
                            <div class="text-sm font-bold text-white mb-1" x-text="a.title || '无标题'"></div>
                            <div class="text-xs text-slate-500">
                                更新于: <span x-text="formatDate(a.updated_at)"></span>
                            </div>
                        </div>
                        <button @click="viewArchiveDetail(a.id)" class="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded hover:bg-indigo-600 hover:text-white transition-colors">查看详情</button>
                    </div>
                </template>
                <div x-show="currentUserArchives.length === 0" class="text-center text-slate-500 py-8 text-sm">该用户暂无存档</div>
            </div>
        </div>
    </div>

    <!-- 存档详情 JSON Modal -->
    <div x-show="showDetailModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm" x-cloak>
        <div class="bg-[#0d1117] border border-slate-700 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
            <div class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <div class="flex items-center gap-4">
                    <h3 class="font-bold text-white">存档数据详情</h3>
                    <div class="flex bg-slate-900 rounded p-1">
                        <button @click="detailTab='settings'" :class="detailTab==='settings'?'bg-indigo-600 text-white':'text-slate-400'" class="px-3 py-1 text-xs rounded transition-colors">Settings</button>
                        <button @click="detailTab='history'" :class="detailTab==='history'?'bg-indigo-600 text-white':'text-slate-400'" class="px-3 py-1 text-xs rounded transition-colors">History</button>
                        <button @click="detailTab='raw'" :class="detailTab==='raw'?'bg-indigo-600 text-white':'text-slate-400'" class="px-3 py-1 text-xs rounded transition-colors">Raw JSON</button>
                    </div>
                </div>
                <button @click="showDetailModal=false" class="text-slate-400 hover:text-white">✕</button>
            </div>
            <div class="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300">
                <div x-show="detailLoading" class="text-center py-10">加载中...</div>
                <div x-show="!detailLoading && detailTab==='settings'">
                    <pre class="whitespace-pre-wrap code-block text-green-400" x-text="JSON.stringify(detailData?.settings, null, 2)"></pre>
                </div>
                <div x-show="!detailLoading && detailTab==='history'">
                     <template x-for="msg in detailData?.history || []">
                        <div class="mb-4 border-b border-slate-800 pb-2">
                            <div class="flex justify-between text-slate-500 mb-1">
                                <span class="font-bold uppercase" :class="msg.role==='user'?'text-blue-400':'text-pink-400'" x-text="msg.role"></span>
                                <span x-text="formatTime(msg.timestamp)"></span>
                            </div>
                            <div class="whitespace-pre-wrap text-slate-300 pl-4 border-l-2 border-slate-700" x-text="msg.content"></div>
                        </div>
                     </template>
                </div>
                <div x-show="!detailLoading && detailTab==='raw'">
                    <pre class="whitespace-pre-wrap code-block text-yellow-100/70" x-text="JSON.stringify(detailData, null, 2)"></pre>
                </div>
            </div>
        </div>
    </div>

    <script>${ADMIN_SCRIPT}</script>
</body>
</html>`;
