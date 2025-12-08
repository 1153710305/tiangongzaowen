
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

            <!-- API 实验室 -->
            <div x-show="currentTab === 'apilab'" class="animate-fade-in h-full flex flex-col">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-white">🧪 API 实验室</h2>
                        <p class="text-slate-400 text-sm mt-1">可视化调试与性能监控中心</p>
                    </div>
                    <div class="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
                        <span class="text-xs text-slate-500">模拟用户:</span>
                        <select x-model="apiLab.targetUserId" class="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none w-48">
                            <option value="">-- 请选择测试用户 --</option>
                            <template x-for="u in users" :key="u.id">
                                <option :value="u.id" x-text="u.username"></option>
                            </template>
                        </select>
                    </div>
                </div>

                <div class="flex-1 flex gap-6 overflow-hidden min-h-[600px]">
                    <!-- 接口列表 -->
                    <div class="w-64 bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden shrink-0 shadow-lg">
                        <div class="p-3 bg-slate-950 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase">接口列表 (Endpoints)</div>
                        <div class="flex-1 overflow-y-auto p-2 space-y-1">
                            <template x-for="api in apiRegistry" :key="api.url + api.method">
                                <button 
                                    @click="selectApi(api)"
                                    class="w-full text-left px-3 py-2.5 rounded text-sm transition-colors flex flex-col gap-1 border border-transparent"
                                    :class="apiLab.currentApi?.url === api.url && apiLab.currentApi?.method === api.method ? 'bg-indigo-900/50 border-indigo-500/50 shadow-inner' : 'hover:bg-slate-700/50 hover:border-slate-600'"
                                >
                                    <div class="flex items-center justify-between">
                                        <span class="font-bold text-slate-200" x-text="api.name"></span>
                                        <span class="text-[10px] px-1.5 rounded font-mono" 
                                            :class="{
                                                'bg-green-900 text-green-300': api.method === 'GET',
                                                'bg-blue-900 text-blue-300': api.method === 'POST',
                                                'bg-yellow-900 text-yellow-300': api.method === 'PUT',
                                                'bg-red-900 text-red-300': api.method === 'DELETE'
                                            }" x-text="api.method"></span>
                                    </div>
                                    <span class="text-[10px] text-slate-500 font-mono truncate" x-text="api.url"></span>
                                </button>
                            </template>
                        </div>
                    </div>

                    <!-- 调试面板 -->
                    <div class="flex-1 flex flex-col gap-4 overflow-hidden">
                        <!-- 请求区 -->
                        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg flex flex-col h-1/2">
                            <div class="flex justify-between items-center mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-bold text-white">Request Body</span>
                                    <span class="text-xs text-slate-500">(JSON)</span>
                                </div>
                                <div class="flex gap-2">
                                    <button @click="loadApiExample" class="text-xs text-indigo-400 hover:text-white hover:underline">加载范例</button>
                                    <button @click="testApi" :disabled="apiLab.isLoading || !apiLab.targetUserId" class="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-xs font-bold shadow transition-transform active:scale-95 flex items-center gap-2">
                                        <span x-show="apiLab.isLoading" class="animate-spin">⟳</span>
                                        <span x-text="apiLab.isLoading ? '请求中...' : '发送请求 (Send)'"></span>
                                    </button>
                                </div>
                            </div>
                            <!-- 简易 JSON 编辑器 -->
                            <textarea x-model="apiLab.requestBody" class="flex-1 bg-slate-950 border border-slate-600 rounded p-3 font-mono text-xs text-green-400 outline-none focus:border-indigo-500 resize-none" spellcheck="false" placeholder="Select an API to start..."></textarea>
                        </div>

                        <!-- 响应区 -->
                        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg flex flex-col h-1/2 relative overflow-hidden">
                            <div class="flex justify-between items-center mb-2 bg-slate-800 z-10">
                                <span class="text-sm font-bold text-white">Response</span>
                                <div class="flex gap-3 text-xs font-mono">
                                    <div class="flex items-center gap-1">
                                        <span class="text-slate-500">Status:</span>
                                        <span :class="apiLab.responseStatus >= 200 && apiLab.responseStatus < 300 ? 'text-green-400' : 'text-red-400'" x-text="apiLab.responseStatus || '-'"></span>
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <span class="text-slate-500">Time:</span>
                                        <span class="text-yellow-400" x-text="apiLab.responseTime ? apiLab.responseTime + 'ms' : '-'"></span>
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <span class="text-slate-500">Size:</span>
                                        <span class="text-blue-400" x-text="apiLab.responseSize || '-'"></span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex-1 bg-[#0d1117] border border-slate-600 rounded overflow-auto relative group">
                                <pre class="p-3 font-mono text-xs text-slate-300 whitespace-pre-wrap break-all" x-text="apiLab.responseBody || '// Waiting for response...'"></pre>
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
    const API_REGISTRY = [
        {
            name: "AI 生成 (Generate)",
            url: "/api/generate",
            method: "POST",
            description: "核心内容生成接口，支持流式返回。",
            body: {
                "settings": {
                    "genre": "玄幻",
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
            description: "获取当前登录用户的 Token 余额和 VIP 状态。",
            body: {}
        },
        {
            name: "从卡片创建项目 (Create Project)",
            url: "/api/projects/from-card",
            method: "POST",
            description: "基于脑洞卡片初始化一个 IDE 项目。",
            body: {
                "cardId": "demo-card-id",
                "title": "测试项目标题",
                "description": "测试简介"
            }
        },
        {
            name: "提交留言 (Post Message)",
            url: "/api/messages",
            method: "POST",
            description: "用户提交反馈留言。",
            body: { "content": "后台接口测试留言" }
        },
        {
            name: "获取所有项目 (Get Projects)",
            url: "/api/projects",
            method: "GET",
            description: "列出用户的所有项目。",
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
                requestBody: '',
                responseBody: '',
                responseStatus: 0,
                responseTime: 0,
                responseSize: '0 B',
                isLoading: false
            },
            
            // 扩展 init
            init() {
                // 调用原始 init (如果需要绑定 this，请注意上下文，这里简化处理直接复制逻辑或手动调用)
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
                this.apiLab.requestBody = JSON.stringify(api.body, null, 2);
                this.apiLab.responseBody = '';
                this.apiLab.responseStatus = 0;
                this.apiLab.responseTime = 0;
                this.apiLab.responseSize = '0 B';
            },

            loadApiExample() {
                if (this.apiLab.currentApi) {
                    this.apiLab.requestBody = JSON.stringify(this.apiLab.currentApi.body, null, 2);
                }
            },

            async testApi() {
                if (!this.apiLab.targetUserId) return alert("请先选择一个模拟用户");
                if (!this.apiLab.currentApi) return alert("请选择接口");

                this.apiLab.isLoading = true;
                this.apiLab.responseBody = '';
                
                try {
                    // 1. 获取模拟 Token
                    const tokenRes = await fetch('/admin/api/users/' + this.apiLab.targetUserId + '/impersonate', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + this.adminToken }
                    });
                    
                    if (!tokenRes.ok) throw new Error("无法获取用户授权");
                    const { token: userToken } = await tokenRes.json();

                    // 2. 发起实际请求
                    const startTime = performance.now();
                    const options = {
                        method: this.apiLab.currentApi.method,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + userToken
                        }
                    };
                    
                    if (this.apiLab.currentApi.method !== 'GET' && this.apiLab.currentApi.method !== 'HEAD') {
                        options.body = this.apiLab.requestBody;
                    }

                    const res = await fetch(this.apiLab.currentApi.url, options);
                    const endTime = performance.now();
                    
                    this.apiLab.responseStatus = res.status;
                    this.apiLab.responseTime = Math.round(endTime - startTime);

                    // 处理响应内容 (支持流式)
                    const contentType = res.headers.get('content-type');
                    let size = 0;

                    if (contentType && contentType.includes('application/json')) {
                        const json = await res.json();
                        const jsonStr = JSON.stringify(json, null, 2);
                        this.apiLab.responseBody = jsonStr;
                        size = new Blob([jsonStr]).size;
                    } else {
                        // 假设是文本或流式文本，直接读取文本
                        const text = await res.text();
                        this.apiLab.responseBody = text;
                        size = new Blob([text]).size;
                    }

                    // 计算大小
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
