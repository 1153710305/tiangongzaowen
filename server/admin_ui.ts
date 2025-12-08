
import { ADMIN_STYLES, ADMIN_SCRIPT } from './admin_assets.ts';

/**
 * 后台管理界面 UI 模板
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
                <p class="text-xs text-slate-500 mt-1">v3.3 API Lab & Monitor</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button @click="switchTab('dashboard')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'dashboard'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>📊</span> 概览
                </button>
                <!-- API Lab 入口 -->
                <button @click="switchTab('apilab')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'apilab'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2 font-bold border border-transparent" :class="currentTab === 'apilab' ? 'border-indigo-500/30' : ''">
                    <span>🧪</span> API 实验室
                </button>
                <button @click="switchTab('announcements')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'announcements'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>📢</span> 公告管理
                </button>
                <button @click="switchTab('messages')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'messages'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>💬</span> 留言回复
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

            <!-- === API 实验室 (API Lab) === -->
            <div x-show="currentTab === 'apilab'" class="animate-fade-in h-full flex flex-col">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-white">🧪 API 实验室</h2>
                        <p class="text-slate-400 text-sm mt-1">可视化调试与性能监控中心 (Debug & Performance Monitor)</p>
                    </div>
                    <!-- 用户模拟器 -->
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
                    <!-- 1. 接口列表 (Registry) -->
                    <div class="w-72 bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden shrink-0 shadow-lg">
                        <div class="p-3 bg-slate-950 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase flex justify-between">
                            <span>Available Endpoints</span>
                            <span class="text-indigo-500" x-text="apiRegistry.length"></span>
                        </div>
                        <div class="flex-1 overflow-y-auto p-2 space-y-1">
                            <template x-for="api in apiRegistry" :key="api.url + api.method">
                                <button 
                                    @click="selectApi(api)"
                                    class="w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex flex-col gap-1 border border-transparent group"
                                    :class="apiLab.currentApi?.name === api.name ? 'bg-indigo-900/40 border-indigo-500/50 shadow-md' : 'hover:bg-slate-700/50 hover:border-slate-600'"
                                >
                                    <div class="flex items-center justify-between w-full">
                                        <span class="font-bold text-slate-200 group-hover:text-white transition-colors truncate" x-text="api.name"></span>
                                        <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shadow-sm" 
                                            :class="{
                                                'bg-green-500/20 text-green-400 border border-green-500/30': api.method === 'GET',
                                                'bg-blue-500/20 text-blue-400 border border-blue-500/30': api.method === 'POST',
                                                'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30': api.method === 'PUT',
                                                'bg-red-500/20 text-red-400 border border-red-500/30': api.method === 'DELETE'
                                            }" x-text="api.method"></span>
                                    </div>
                                    <div class="flex items-center gap-2 w-full">
                                        <span class="text-[10px] text-slate-500 font-mono truncate flex-1 opacity-70" x-text="api.url"></span>
                                        <span x-show="api.auth" class="text-[10px] text-yellow-500" title="需要认证">🔒</span>
                                    </div>
                                </button>
                            </template>
                        </div>
                    </div>

                    <!-- 2. 调试面板 (Workspace) -->
                    <div class="flex-1 flex flex-col gap-4 overflow-hidden">
                        
                        <!-- 请求区 (Request) -->
                        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg flex flex-col h-1/2 relative group">
                            <div class="flex justify-between items-center mb-3">
                                <div class="flex items-center gap-2 flex-1 mr-4">
                                    <span class="text-sm font-bold text-white bg-slate-700 px-2 py-0.5 rounded shrink-0">URL</span>
                                    <input 
                                        type="text" 
                                        x-model="apiLab.requestUrl" 
                                        class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-yellow-400 font-mono outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="/api/..."
                                    >
                                </div>
                                <div class="flex gap-2">
                                    <button @click="loadApiExample" title="重置为默认范例" class="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-700">
                                        <span>↺</span> 重置
                                    </button>
                                    <button @click="testApi" :disabled="apiLab.isLoading || (apiLab.currentApi?.auth && !apiLab.targetUserId)" class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-green-900/20 transition-all active:scale-95 flex items-center gap-2">
                                        <span x-show="apiLab.isLoading" class="animate-spin">⟳</span>
                                        <span x-text="apiLab.isLoading ? 'Processing...' : 'Send Request 🚀'"></span>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="text-xs text-slate-500 mb-1 px-1">Request Body (JSON):</div>
                            
                            <!-- JSON 编辑器 -->
                            <textarea 
                                x-model="apiLab.requestBody" 
                                class="flex-1 bg-[#0f172a] border border-slate-600 rounded-lg p-4 font-mono text-xs text-emerald-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-all placeholder-slate-700 custom-scrollbar" 
                                spellcheck="false" 
                                placeholder="Select an API from the left list to load example payload..."
                            ></textarea>
                            <!-- 提示遮罩 -->
                            <div x-show="!apiLab.currentApi" class="absolute inset-0 top-14 bg-slate-800/80 backdrop-blur-[1px] flex flex-col items-center justify-center text-slate-500 z-10 rounded-b-xl">
                                <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
                                <p>请先在左侧选择一个接口进行调试</p>
                            </div>
                        </div>

                        <!-- 响应区 (Response) -->
                        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg flex flex-col h-1/2 relative overflow-hidden">
                            <div class="flex justify-between items-center mb-2 z-10">
                                <span class="text-sm font-bold text-white bg-slate-700 px-2 py-0.5 rounded">Response</span>
                                
                                <!-- 状态指示器 -->
                                <div class="flex gap-4 text-xs font-mono bg-black/20 px-3 py-1 rounded-lg border border-slate-700/50">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-slate-500">Status:</span>
                                        <span class="font-bold" :class="apiLab.responseStatus >= 200 && apiLab.responseStatus < 300 ? 'text-green-400' : (apiLab.responseStatus === 0 ? 'text-slate-600' : 'text-red-400')" x-text="apiLab.responseStatus || '---'"></span>
                                    </div>
                                    <div class="w-px bg-slate-700 h-3 self-center"></div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-slate-500">Time:</span>
                                        <span class="text-yellow-400" x-text="apiLab.responseTime ? apiLab.responseTime + 'ms' : '---'"></span>
                                    </div>
                                    <div class="w-px bg-slate-700 h-3 self-center"></div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-slate-500">Size:</span>
                                        <span class="text-blue-400" x-text="apiLab.responseSize || '---'"></span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex-1 bg-[#0d1117] border border-slate-600 rounded-lg overflow-hidden relative group">
                                <pre class="absolute inset-0 p-4 font-mono text-xs text-blue-300 whitespace-pre-wrap break-all overflow-auto custom-scrollbar" x-text="apiLab.responseBody || '// Waiting for response...'"></pre>
                                
                                <!-- Loading Overlay -->
                                <div x-show="apiLab.isLoading" class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-20">
                                    <div class="flex flex-col items-center text-indigo-400">
                                        <svg class="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span class="text-xs font-mono animate-pulse">Waiting for Server...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 公告管理 -->
            <div x-show="currentTab === 'announcements'" class="animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-white">公告管理</h2>
                    <button @click="openAnnouncementModal()" class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white text-sm font-bold shadow-lg transition-colors flex items-center gap-2">
                        <span>+</span> 发布公告
                    </button>
                </div>
                <div class="space-y-4">
                    <template x-for="ann in announcements" :key="ann.id">
                         <div class="bg-slate-800 border border-slate-700 rounded-lg p-4 relative group">
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="font-bold text-lg text-white" x-text="ann.title"></h3>
                                <div class="flex items-center gap-2">
                                     <span class="text-xs px-2 py-0.5 rounded" :class="ann.is_published ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'" x-text="ann.is_published ? '已发布' : '草稿'"></span>
                                     <button @click="editAnnouncement(ann)" class="text-indigo-400 hover:text-white text-xs">编辑</button>
                                     <button @click="deleteAnnouncement(ann.id)" class="text-red-400 hover:text-white text-xs">删除</button>
                                </div>
                            </div>
                            <p class="text-slate-400 text-sm whitespace-pre-wrap" x-text="ann.content"></p>
                            <div class="mt-2 text-xs text-slate-600" x-text="formatDate(ann.created_at)"></div>
                         </div>
                    </template>
                    <div x-show="announcements.length === 0" class="text-center text-slate-500">暂无公告</div>
                </div>
            </div>

            <!-- 留言回复 -->
            <div x-show="currentTab === 'messages'" class="animate-fade-in">
                 <h2 class="text-2xl font-bold mb-6 text-white">用户留言反馈</h2>
                 <div class="space-y-4">
                    <template x-for="msg in messages" :key="msg.id">
                        <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <div class="flex justify-between items-center mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-indigo-400" x-text="msg.username || '未知用户'"></span>
                                    <span class="text-xs text-slate-500" x-text="formatDate(msg.created_at)"></span>
                                </div>
                            </div>
                            <div class="bg-slate-900/50 p-3 rounded mb-3 text-slate-300 text-sm whitespace-pre-wrap" x-text="msg.content"></div>
                            
                            <div x-show="msg.reply" class="ml-4 pl-3 border-l-2 border-green-500 mb-2">
                                <div class="text-xs text-green-400 mb-1">管理员回复 <span x-text="formatDate(msg.reply_at)"></span></div>
                                <div class="text-sm text-slate-400" x-text="msg.reply"></div>
                            </div>

                            <div x-show="!msg.reply" class="flex gap-2">
                                <input x-model="msg.newReply" placeholder="输入回复内容..." class="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white">
                                <button @click="replyMessage(msg)" class="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-white text-xs">回复</button>
                            </div>
                        </div>
                    </template>
                 </div>
            </div>

            <!-- API Key 管理 -->
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
                        </tbody>
                    </table>
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
                                <th class="p-4">用户名</th>
                                <th class="p-4">Tokens</th>
                                <th class="p-4">会员到期</th>
                                <th class="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-700">
                            <template x-for="u in users" :key="u.id">
                                <tr class="hover:bg-slate-700/50 transition-colors">
                                    <td class="p-4 text-white font-medium" x-text="u.username"></td>
                                    <td class="p-4 font-mono text-yellow-500" x-text="u.tokens.toLocaleString()"></td>
                                    <td class="p-4 text-xs">
                                        <span :class="u.vip_expiry && new Date(u.vip_expiry) > new Date() ? 'text-yellow-400 font-bold' : 'text-slate-500'">
                                            <span x-text="formatDate(u.vip_expiry) || '无'"></span>
                                        </span>
                                    </td>
                                    <td class="p-4 flex justify-end gap-3">
                                        <button @click="editUser(u)" class="text-blue-400 hover:text-blue-300 text-xs font-bold">编辑</button>
                                        <button @click="viewUserArchives(u)" class="text-indigo-400 hover:text-indigo-300 text-xs font-bold">存档</button>
                                        <button @click="deleteUser(u.id)" class="text-red-400 hover:text-red-300 text-xs font-bold">删除</button>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- 系统设置 -->
            <div x-show="currentTab === 'settings'" class="animate-fade-in space-y-8">
                <h2 class="text-2xl font-bold text-white mb-6">系统设置</h2>
                
                <!-- 1. 基础配置 -->
                <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-indigo-400">基础参数配置</h3>
                        <button @click="saveInitialTokens" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors">保存参数</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label class="block text-sm text-slate-500 mb-1">新用户初始 Tokens</label>
                            <input x-model="config.initialTokens" type="number" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-indigo-500">
                        </div>
                    </div>
                </div>

                <!-- 2. AI 模型配置 -->
                <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-indigo-400">AI 模型配置</h3>
                        <button @click="saveAiModels" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors">应用变更</button>
                    </div>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        <template x-for="(model, idx) in config.parsedModels" :key="idx">
                            <div class="flex items-center gap-3 bg-slate-900/50 p-3 rounded border border-slate-700">
                                <input type="checkbox" x-model="model.isActive" class="w-4 h-4 rounded border-slate-600 text-indigo-600 bg-slate-800" title="是否启用">
                                <div class="flex-1 grid grid-cols-1 gap-1">
                                    <input x-model="model.name" class="bg-transparent text-sm text-white font-bold outline-none border-b border-transparent focus:border-indigo-500" placeholder="显示名称">
                                    <div class="flex gap-2 text-xs items-center">
                                        <input x-model="model.id" class="bg-transparent text-slate-500 w-32 outline-none border-b border-transparent focus:border-slate-500" placeholder="Model ID">
                                        <label class="flex items-center gap-1 cursor-pointer select-none px-2 py-0.5 rounded bg-slate-800 border border-slate-700" :class="model.isVip ? 'border-yellow-500/50 text-yellow-500' : 'text-slate-400'">
                                            <input type="checkbox" x-model="model.isVip" class="hidden"> 
                                            <span x-text="model.isVip ? '★ VIP专属' : '☆ 免费可用'"></span>
                                        </label>
                                    </div>
                                </div>
                                <button @click="config.parsedModels.splice(idx, 1)" class="text-red-400 hover:text-white px-2">×</button>
                            </div>
                        </template>
                    </div>
                    <button @click="config.parsedModels.push({id:'', name:'New Model', isActive: true, isVip: false})" class="mt-4 w-full py-2 border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 rounded text-sm">+ 添加模型</button>
                </div>

                <!-- 3. 付费商品配置 (JSON) -->
                <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-indigo-400">付费商品配置 (JSON)</h3>
                        <button @click="saveProductPlans" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors">保存配置</button>
                    </div>
                    <p class="text-xs text-slate-500 mb-2">配置月卡、季卡、加油包等商品信息。请确保 JSON 格式正确。</p>
                    <textarea x-model="config.productPlansJson" class="w-full h-64 bg-slate-900 border border-slate-600 rounded p-3 text-xs font-mono text-green-400 outline-none focus:border-indigo-500"></textarea>
                </div>
            </div>

            <!-- 日志 -->
            <div x-show="currentTab === 'logs'" class="h-full flex flex-col animate-fade-in">
                 <div class="bg-[#0d1117] rounded-xl p-4 font-mono text-xs flex-1 overflow-y-auto border border-slate-700 shadow-inner">
                    <template x-for="l in filteredLogs" :key="l.id">
                        <div class="mb-2 border-b border-slate-800/50 pb-2 last:border-0 hover:bg-white/5 p-1 rounded transition-colors">
                            <div class="flex gap-2 mb-1">
                                <span class="text-slate-500" x-text="formatTime(l.timestamp)"></span>
                                <span class="font-bold" :class="l.level === 'ERROR' ? 'text-red-500' : (l.level === 'WARN' ? 'text-yellow-400' : 'text-blue-400')" x-text="l.level"></span>
                                <span class="text-slate-200" x-text="l.message"></span>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>

    <!-- Modals -->
    <!-- 公告编辑 Modal -->
    <div x-show="showAnnouncementModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-6 rounded-xl w-[600px] border border-slate-700 shadow-2xl">
            <h3 class="font-bold text-white mb-4 text-lg" x-text="annForm.id ? '编辑公告' : '发布新公告'"></h3>
            <div class="space-y-4">
                <input x-model="annForm.title" placeholder="公告标题" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-indigo-500">
                <textarea x-model="annForm.content" placeholder="公告内容..." class="w-full h-32 bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-indigo-500 resize-none"></textarea>
                <label class="flex items-center gap-2 text-slate-300 text-sm">
                    <input type="checkbox" x-model="annForm.is_published" class="rounded bg-slate-900 border-slate-600"> 立即发布
                </label>
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button @click="showAnnouncementModal=false" class="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                <button @click="saveAnnouncement" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-bold">保存</button>
            </div>
        </div>
    </div>
    
    <!-- 用户编辑 Modal -->
    <div x-show="showEditUserModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-6 rounded-xl w-[400px] border border-slate-700 shadow-2xl">
            <h3 class="font-bold text-white mb-4">编辑用户: <span x-text="editUserData.username" class="text-indigo-400"></span></h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-xs text-slate-500 mb-1">Tokens 余额</label>
                    <input x-model="editUserData.tokens" type="number" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-indigo-500">
                </div>
                <div>
                    <label class="block text-xs text-slate-500 mb-1">会员过期时间 (YYYY-MM-DD 或 ISO)</label>
                    <input x-model="editUserData.vip_expiry" placeholder="留空为非会员" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-indigo-500">
                    <div class="flex gap-2 mt-1">
                        <button @click="setVipDays(30)" class="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">+30天</button>
                        <button @click="setVipDays(365)" class="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">+1年</button>
                        <button @click="editUserData.vip_expiry = ''" class="text-[10px] bg-red-900/30 text-red-400 px-2 py-1 rounded hover:bg-red-900/50">取消会员</button>
                    </div>
                </div>
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button @click="showEditUserModal=false" class="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                <button @click="saveUserChanges" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-bold">保存修改</button>
            </div>
        </div>
    </div>
    
    <!-- Add Key Modal -->
    <div x-show="showAddKeyModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-6 rounded-xl w-[500px] border border-slate-700 shadow-2xl">
            <h3 class="font-bold text-white mb-4 text-lg">添加 API Key</h3>
            <div class="space-y-4">
                <input x-model="newKey.key" placeholder="sk-..." class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-indigo-500">
                <select x-model="newKey.provider" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none">
                    <option value="google">Google Gemini</option>
                    <option value="openai">OpenAI (Compatible)</option>
                </select>
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button @click="showAddKeyModal=false" class="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                <button @click="createKey" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-bold">添加</button>
            </div>
        </div>
    </div>

    <!-- Add User Modal -->
    <div x-show="showAddUserModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-6 rounded-xl w-[400px] border border-slate-700 shadow-2xl">
            <h3 class="font-bold text-white mb-4 text-lg">新增用户</h3>
            <div class="space-y-4">
                <input x-model="newUser.username" placeholder="用户名" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-indigo-500">
                <input x-model="newUser.password" type="password" placeholder="密码 (至少6位)" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-indigo-500">
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button @click="showAddUserModal=false" class="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                <button @click="createUser" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-bold">创建</button>
            </div>
        </div>
    </div>

    <!-- Archives List Modal -->
    <div x-show="showArchivesModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-6 rounded-xl w-[600px] max-h-[80vh] flex flex-col border border-slate-700 shadow-2xl">
            <div class="flex justify-between items-center mb-4 shrink-0">
                <h3 class="font-bold text-white text-lg">用户存档: <span x-text="currentArchiveUser" class="text-indigo-400"></span></h3>
                <button @click="showArchivesModal=false" class="text-slate-400 hover:text-white">✕</button>
            </div>
            <div class="flex-1 overflow-y-auto space-y-2 pr-2">
                <template x-for="arc in currentUserArchives" :key="arc.id">
                    <div class="bg-slate-900 border border-slate-700 rounded p-3 flex justify-between items-center hover:border-slate-500 transition-colors">
                        <div>
                            <div class="font-bold text-white text-sm" x-text="arc.title"></div>
                            <div class="text-xs text-slate-500" x-text="formatDate(arc.updated_at)"></div>
                        </div>
                        <button @click="viewArchiveDetail(arc.id)" class="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded hover:bg-indigo-600 hover:text-white">查看详情</button>
                    </div>
                </template>
                <div x-show="currentUserArchives.length === 0" class="text-center text-slate-500 py-4">无存档数据</div>
            </div>
        </div>
    </div>

    <!-- Archive Detail Modal -->
    <div x-show="showDetailModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 border border-slate-700 rounded-xl w-[800px] h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <h3 class="font-bold text-white" x-text="detailData ? detailData.title : '加载中...'"></h3>
                <button @click="showDetailModal=false" class="text-slate-400 hover:text-white">✕</button>
            </div>
            <div class="flex-1 overflow-auto p-6 bg-[#0f172a]">
                <div x-show="detailLoading" class="text-center text-slate-500 mt-10">加载中...</div>
                <div x-show="!detailLoading && detailData">
                    <h4 class="text-indigo-400 font-bold mb-2">小说设定</h4>
                    <pre class="bg-black/30 p-3 rounded text-xs text-slate-300 overflow-x-auto mb-6" x-text="JSON.stringify(detailData?.settings, null, 2)"></pre>
                    
                    <h4 class="text-indigo-400 font-bold mb-2">对话历史</h4>
                    <div class="space-y-3">
                        <template x-for="msg in (detailData?.history || [])" :key="msg.id">
                            <div class="p-3 rounded border" :class="msg.role === 'user' ? 'bg-indigo-900/20 border-indigo-500/30 ml-8' : 'bg-slate-800 border-slate-700 mr-8'">
                                <div class="text-[10px] uppercase font-bold mb-1 opacity-50" x-text="msg.role"></div>
                                <div class="text-sm text-slate-300 whitespace-pre-wrap" x-text="msg.content"></div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
    // 定义 API 注册表 (静态定义，不与后端耦合)
    // 实验室接口列表定义
    const API_REGISTRY = [
        // --- 1. 核心业务 ---
        {
            name: "AI 内容生成 (Generate)",
            url: "/api/generate",
            method: "POST",
            auth: true,
            description: "核心生成接口。支持流式返回，需消耗用户 Token。",
            body: {
                "settings": {
                    "genre": "都市异能",
                    "trope": "系统",
                    "protagonistType": "龙傲天",
                    "goldenFinger": "加点",
                    "pacing": "fast",
                    "targetAudience": "male",
                    "tone": "爽文"
                },
                "step": "idea",
                "context": "",
                "model": "gemini-2.5-flash"
            }
        },
        {
            name: "获取用户状态 (User Status)",
            url: "/api/user/status",
            method: "GET",
            auth: true,
            description: "获取当前登录用户的 Token 余额和 VIP 状态。",
            body: {}
        },
        // --- 2. 认证 (Public) ---
        {
            name: "用户登录 (Login)",
            url: "/api/auth/login",
            method: "POST",
            auth: false,
            description: "公开接口，测试用户登录逻辑。",
            body: { "username": "test_user", "password": "password123" }
        },
        // --- 3. 项目与 IDE ---
        {
            name: "获取项目列表 (Get Projects)",
            url: "/api/projects",
            method: "GET",
            auth: true,
            description: "列出当前用户的所有项目。",
            body: {}
        },
        {
            name: "从卡片创建项目 (Create Project)",
            url: "/api/projects/from-card",
            method: "POST",
            auth: true,
            description: "基于脑洞卡片初始化一个 IDE 项目结构。",
            body: {
                "cardId": "demo-card-id",
                "title": "测试项目 (Lab Created)",
                "description": "API 实验室自动创建"
            }
        },
        {
            name: "获取项目结构 (Project Structure)",
            url: "/api/projects/:pid/structure",
            method: "GET",
            auth: true,
            description: "获取项目的文件树（章节和导图列表）。请替换 :pid 为真实项目 ID。",
            body: {}
        },
        // --- 4. 章节管理 ---
        {
            name: "创建章节 (Create Chapter)",
            url: "/api/projects/:pid/chapters",
            method: "POST",
            auth: true,
            description: "在项目中创建新章节。请替换 :pid。",
            body: { "title": "新章节", "order": 1 }
        },
        // --- 5. 思维导图 ---
        {
            name: "创建思维导图 (Create MindMap)",
            url: "/api/projects/:pid/maps",
            method: "POST",
            auth: true,
            description: "创建新的思维导图文件。请替换 :pid。",
            body: {}
        },
        // --- 6. 社区功能 ---
        {
            name: "提交留言 (Post Message)",
            url: "/api/messages",
            method: "POST",
            auth: true,
            description: "用户提交反馈留言。",
            body: { "content": "这条留言来自后台 API 实验室测试" }
        },
        {
            name: "获取系统公告 (Get Announcements)",
            url: "/api/announcements",
            method: "GET",
            auth: false,
            description: "公开接口，获取已发布的系统公告。",
            body: {}
        }
    ];

    ${ADMIN_SCRIPT}
    
    // 扩展 AdminApp 逻辑以支持 API 实验室
    const originalInit = adminApp().init;
    adminApp = function() {
        const base = adminApp(); // 获取原始对象
        // 扩展数据和方法
        return {
            ...base,
            apiRegistry: API_REGISTRY,
            apiLab: {
                currentApi: null,
                targetUserId: '',
                requestUrl: '',
                requestBody: '',
                responseBody: '',
                responseStatus: 0,
                responseTime: 0,
                responseSize: '0 B',
                isLoading: false
            },
            
            // 扩展 init
            init() {
                // 手动初始化认证状态
                const token = localStorage.getItem('skycraft_admin_token');
                if (token) { 
                    this.adminToken = token; 
                    this.isAuthenticated = true; 
                    this.fetchStats(); 
                    this.fetchUsers(); // API Lab 需要用户列表
                }
            },

            selectApi(api) {
                this.apiLab.currentApi = api;
                this.apiLab.requestUrl = api.url; // 允许用户编辑 URL
                this.apiLab.requestBody = JSON.stringify(api.body, null, 2);
                this.apiLab.responseBody = '';
                this.apiLab.responseStatus = 0;
                this.apiLab.responseTime = 0;
                this.apiLab.responseSize = '0 B';
            },

            loadApiExample() {
                if (this.apiLab.currentApi) {
                    this.apiLab.requestBody = JSON.stringify(this.apiLab.currentApi.body, null, 2);
                    this.apiLab.requestUrl = this.apiLab.currentApi.url;
                }
            },

            async testApi() {
                const isAuthRequired = this.apiLab.currentApi?.auth;
                
                if (isAuthRequired && !this.apiLab.targetUserId) {
                    return alert("此接口需要认证。请先在右上角选择一个模拟用户 (Impersonate)。");
                }
                
                this.apiLab.isLoading = true;
                this.apiLab.responseBody = '';
                this.apiLab.responseStatus = 0;
                
                try {
                    let userToken = '';

                    // 1. 如果需要认证，先获取模拟 Token
                    if (isAuthRequired) {
                         const tokenRes = await fetch('/admin/api/users/' + this.apiLab.targetUserId + '/impersonate', {
                            method: 'POST',
                            headers: { 'Authorization': 'Bearer ' + this.adminToken }
                        });
                        
                        if (!tokenRes.ok) throw new Error("无法获取用户授权 (Impersonation Failed)");
                        const data = await tokenRes.json();
                        userToken = data.token;
                    }

                    // 2. 发起实际请求
                    const startTime = performance.now();
                    const options = {
                        method: this.apiLab.currentApi?.method || 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    };

                    // 注入 Token
                    if (userToken) {
                        options.headers['Authorization'] = 'Bearer ' + userToken;
                    }
                    
                    // 注入 Body (非 GET/HEAD)
                    if (options.method !== 'GET' && options.method !== 'HEAD') {
                        options.body = this.apiLab.requestBody;
                    }

                    // 使用编辑后的 URL
                    const targetUrl = this.apiLab.requestUrl;
                    const res = await fetch(targetUrl, options);
                    const endTime = performance.now();
                    
                    this.apiLab.responseStatus = res.status;
                    this.apiLab.responseTime = Math.round(endTime - startTime);

                    // 处理响应内容 (支持流式文本或 JSON)
                    const contentType = res.headers.get('content-type');
                    let size = 0;
                    let bodyText = '';

                    const rawText = await res.text();
                    size = new Blob([rawText]).size;
                    
                    try {
                        const json = JSON.parse(rawText);
                        bodyText = JSON.stringify(json, null, 2);
                    } catch (e) {
                        bodyText = rawText;
                    }

                    this.apiLab.responseBody = bodyText;
                    this.apiLab.responseSize = size > 1024 ? (size/1024).toFixed(2) + ' KB' : size + ' B';

                } catch (e) {
                    this.apiLab.responseBody = 'Request Failed: ' + e.message;
                    this.apiLab.responseStatus = 0;
                } finally {
                    this.apiLab.isLoading = false;
                }
            }
        };
    }
    </script>
</body>
</html>`;
