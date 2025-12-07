
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
                <p class="text-xs text-slate-500 mt-1">v2.9.2 Monitor System</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button @click="switchTab('dashboard')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'dashboard'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>📊</span> 概览
                </button>
                <button @click="switchTab('users')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'users'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>👥</span> 用户管理
                </button>
                <button @click="switchTab('logs')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'logs'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>📜</span> 系统日志
                </button>
                <button @click="switchTab('api_tester')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'api_tester'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>🧪</span> API 实验室
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
                        <div class="text-slate-400 text-sm font-medium mb-2">总用户数</div>
                        <div class="text-3xl font-bold text-white" x-text="stats.totalUsers">0</div>
                    </div>
                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <div class="text-slate-400 text-sm font-medium mb-2">总存档数</div>
                        <div class="text-3xl font-bold text-pink-500" x-text="stats.totalArchives">0</div>
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
                <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
                     <div class="text-slate-400 text-sm font-medium mb-1">最近活跃时间</div>
                     <div class="text-xl text-white font-mono" x-text="formatDate(stats.lastActiveTime)"></div>
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
                            <tr x-show="users.length === 0">
                                <td colspan="4" class="p-8 text-center text-slate-500">暂无用户数据</td>
                            </tr>
                        </tbody>
                    </table>
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
                    <div x-show="filteredLogs.length === 0" class="text-center text-slate-600 italic py-10">暂无匹配日志</div>
                </div>
            </div>

            <!-- API Tester -->
            <div x-show="currentTab === 'api_tester'" class="h-full flex flex-col animate-fade-in">
                <h2 class="text-2xl font-bold mb-4 text-white flex-shrink-0">API 实验室</h2>
                <div class="flex gap-4 flex-1 overflow-hidden">
                    <div class="w-1/2 bg-slate-800 p-4 rounded-xl flex flex-col gap-4 border border-slate-700 shadow-lg">
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">预设模板</label>
                            <select x-model="selectedApiEndpoint" @change="loadApiTemplate" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white outline-none focus:border-indigo-500">
                                <option value="">-- 选择接口模板 --</option>
                                <option value="pool">Get Config Pool (Public)</option>
                                <option value="users">Get Users (Admin)</option>
                                <option value="stats">Get Stats (Admin)</option>
                                <option value="generate_idea">Generate Idea (User Auth Needed)</option>
                            </select>
                        </div>
                        <div class="flex gap-2">
                            <div class="w-1/4">
                                <label class="block text-xs text-slate-400 mb-1">Method</label>
                                <select x-model="apiRequest.method" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm font-mono font-bold text-indigo-400">
                                    <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                                </select>
                            </div>
                            <div class="flex-1">
                                <label class="block text-xs text-slate-400 mb-1">URL</label>
                                <input x-model="apiRequest.url" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm font-mono text-white focus:border-indigo-500 outline-none">
                            </div>
                        </div>
                        <div class="flex-1 flex flex-col">
                            <label class="block text-xs text-slate-400 mb-1">Headers (JSON)</label>
                            <textarea x-model="apiRequest.headers" class="w-full h-24 bg-slate-900 border border-slate-600 rounded p-2 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none resize-none mb-2"></textarea>
                            
                            <label class="block text-xs text-slate-400 mb-1">Body (JSON)</label>
                            <textarea x-model="apiRequest.body" class="w-full flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none resize-none"></textarea>
                        </div>
                        <button @click="sendApiRequest" :disabled="apiLoading" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50">
                            <span x-show="!apiLoading">发送请求</span><span x-show="apiLoading">发送中...</span>
                        </button>
                    </div>
                    
                    <div class="w-1/2 bg-[#0d1117] p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
                        <div class="flex justify-between items-center mb-2 pb-2 border-b border-slate-800 text-xs text-slate-500">
                            <span>Response</span>
                            <span x-show="apiResponse">Status: <strong :class="apiResponse?.status >= 400 ? 'text-red-400' : 'text-green-400'" x-text="apiResponse?.status"></strong> | Time: <span x-text="apiResponse?.time + 'ms'"></span></span>
                        </div>
                        <div class="flex-1 overflow-auto">
                            <pre x-show="apiResponse" class="text-xs font-mono text-green-400 whitespace-pre-wrap break-words" x-text="apiResponse?.body"></pre>
                            <div x-show="!apiResponse" class="h-full flex items-center justify-center text-slate-600 italic text-sm">等待请求...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modals -->
    
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
                                <span x-show="a.settings" class="ml-2 bg-slate-700 px-1 rounded text-[10px]" x-text="a.settings?.genre"></span>
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
