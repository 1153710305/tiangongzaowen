
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
                <input type="password" x-model="password" placeholder="请输入管理员密码" class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-3 mb-4 outline-none">
                <button type="submit" :disabled="isLoading" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded">
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
                <p class="text-xs text-slate-500 mt-1">v2.8 Monitor</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button @click="switchTab('dashboard')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'dashboard'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white">概览</button>
                <button @click="switchTab('users')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'users'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white">用户管理</button>
                <button @click="switchTab('logs')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'logs'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white">系统日志</button>
                <button @click="switchTab('api_tester')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'api_tester'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white">API 实验室</button>
            </nav>
            <div class="p-4 border-t border-slate-800"><button @click="logout" class="text-sm text-slate-400 hover:text-white">退出登录</button></div>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto bg-slate-900 p-8">
            <!-- 仪表盘 -->
            <div x-show="currentTab === 'dashboard'">
                <h2 class="text-2xl font-bold mb-6">系统概览</h2>
                <div class="grid grid-cols-3 gap-6 mb-8">
                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div class="text-slate-400 text-sm">用户数</div><div class="text-3xl font-bold" x-text="stats.totalUsers"></div>
                    </div>
                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div class="text-slate-400 text-sm">存档数</div><div class="text-3xl font-bold text-pink-500" x-text="stats.totalArchives"></div>
                    </div>
                </div>
            </div>

            <!-- 用户管理 -->
            <div x-show="currentTab === 'users'">
                <div class="flex justify-between mb-6">
                    <h2 class="text-2xl font-bold">用户列表</h2>
                    <button @click="showAddUserModal=true" class="bg-indigo-600 px-3 py-1 rounded text-white text-sm">+ 新增</button>
                </div>
                <div class="bg-slate-800 rounded-xl overflow-hidden">
                    <table class="w-full text-left text-sm text-slate-400">
                        <thead class="bg-slate-950"><tr><th class="p-4">ID</th><th class="p-4">用户名</th><th class="p-4">操作</th></tr></thead>
                        <tbody>
                            <template x-for="u in users"><tr class="border-t border-slate-700">
                                <td class="p-4" x-text="u.id"></td><td class="p-4 text-white" x-text="u.username"></td>
                                <td class="p-4 gap-2 flex"><button @click="deleteUser(u.id)" class="text-red-400">删除</button></td>
                            </tr></template>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 日志 -->
            <div x-show="currentTab === 'logs'">
                <div class="flex justify-between mb-4">
                    <h2 class="text-2xl font-bold">日志</h2>
                    <button @click="fetchLogs" class="bg-slate-800 px-3 py-1 rounded border border-slate-700">刷新</button>
                </div>
                <div class="bg-[#0d1117] rounded-xl p-4 font-mono text-xs h-[80vh] overflow-y-auto">
                    <template x-for="l in filteredLogs"><div class="mb-2 border-b border-slate-800 pb-1">
                        <span class="text-blue-400" x-text="l.level"></span> <span class="text-slate-300" x-text="l.message"></span>
                    </div></template>
                </div>
            </div>

            <!-- API Tester -->
            <div x-show="currentTab === 'api_tester'" class="h-full flex flex-col">
                <div class="flex gap-4 h-full">
                    <div class="w-1/2 bg-slate-800 p-4 rounded-xl flex flex-col gap-4">
                        <select x-model="selectedApiEndpoint" @change="loadApiTemplate" class="bg-slate-900 border border-slate-600 rounded p-2"><option value="">选择接口...</option><option value="pool">Pool</option></select>
                        <input x-model="apiRequest.url" class="bg-slate-900 border border-slate-600 rounded p-2 font-mono text-sm">
                        <button @click="sendApiRequest" :disabled="apiLoading" class="bg-indigo-600 py-2 rounded text-white font-bold">发送</button>
                    </div>
                    <div class="w-1/2 bg-[#0d1117] p-4 rounded-xl overflow-auto"><pre class="text-green-400 text-xs font-mono" x-text="apiResponse?.body"></pre></div>
                </div>
            </div>
        </div>
    </div>

    <!-- 简化的模态框占位符 (实际逻辑在 JS 中) -->
    <div x-show="showAddUserModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" x-cloak>
        <div class="bg-slate-800 p-6 rounded-lg w-96"><h3 class="font-bold mb-4">新增用户</h3><input x-model="newUser.username" class="w-full mb-2 bg-slate-900 p-2"><input x-model="newUser.password" class="w-full mb-4 bg-slate-900 p-2"><button @click="createUser" class="bg-indigo-600 text-white px-4 py-2 rounded">确定</button><button @click="showAddUserModal=false" class="ml-2 text-slate-400">取消</button></div>
    </div>

    <script>${ADMIN_SCRIPT}</script>
</body>
</html>`;
