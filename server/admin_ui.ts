
import { ADMIN_STYLES, ADMIN_SCRIPT } from './admin_assets.ts';
import { DASHBOARD_VIEW, APILAB_VIEW, USERS_VIEW, SETTINGS_VIEW } from './admin_views.ts';

// 将分散的 HTML 片段组装
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
                <p class="text-xs text-slate-500 mt-1">v3.4 Modular & Fast</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button @click="switchTab('dashboard')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'dashboard'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2"><span>📊</span> 概览</button>
                <button @click="switchTab('apilab')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'apilab'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2 border border-transparent" :class="currentTab === 'apilab' ? 'border-indigo-500/30' : ''"><span>🧪</span> API 实验室</button>
                <button @click="switchTab('users')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'users'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2"><span>👥</span> 用户管理</button>
                <button @click="switchTab('settings')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'settings'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2"><span>⚙️</span> 系统设置</button>
            </nav>
            <div class="p-4 border-t border-slate-800">
                <button @click="logout" class="w-full text-sm text-slate-400 hover:text-white border border-slate-700 rounded py-2 hover:bg-slate-800 transition-colors">退出登录</button>
            </div>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto bg-slate-900 p-8">
            ${DASHBOARD_VIEW}
            ${APILAB_VIEW}
            ${USERS_VIEW}
            ${SETTINGS_VIEW}
            <!-- 其他简单视图保持内联或继续拆分 -->
        </div>
    </div>
    
    <!-- 模态框逻辑与之前保持一致，为精简代码不在此重复，实际生产环境可进一步拆分 Modal -->
    
    <script>
    // 定义 API 注册表
    const API_REGISTRY = [
        { name: "AI 内容生成", url: "/api/generate", method: "POST", auth: true, body: { "settings": { "genre": "都市" }, "step": "idea", "context": "" } },
        { name: "获取用户状态", url: "/api/user/status", method: "GET", auth: true, body: {} },
        { name: "获取项目列表", url: "/api/projects", method: "GET", auth: true, body: {} }
    ];

    ${ADMIN_SCRIPT}
    
    // 扩展 API Lab 逻辑
    const originalInit = adminApp().init;
    adminApp = function() {
        const base = adminApp();
        return {
            ...base,
            apiRegistry: API_REGISTRY,
            apiLab: { currentApi: null, targetUserId: '', requestUrl: '', requestBody: '', responseBody: '', responseStatus: 0, responseTime: 0, responseSize: '0 B', isLoading: false },
            
            init() {
                const token = localStorage.getItem('skycraft_admin_token');
                if (token) { this.adminToken = token; this.isAuthenticated = true; this.fetchStats(); this.fetchUsers(); }
            },

            selectApi(api) {
                this.apiLab.currentApi = api; this.apiLab.requestUrl = api.url; this.apiLab.requestBody = JSON.stringify(api.body, null, 2);
                this.apiLab.responseBody = ''; this.apiLab.responseStatus = 0;
            },

            loadApiExample() { if (this.apiLab.currentApi) { this.apiLab.requestBody = JSON.stringify(this.apiLab.currentApi.body, null, 2); this.apiLab.requestUrl = this.apiLab.currentApi.url; } },

            async testApi() {
                const isAuthRequired = this.apiLab.currentApi?.auth;
                if (isAuthRequired && !this.apiLab.targetUserId) return alert("需选择模拟用户");
                this.apiLab.isLoading = true; this.apiLab.responseBody = '';
                
                try {
                    let userToken = '';
                    if (isAuthRequired) {
                         const tokenRes = await fetch('/admin/api/users/' + this.apiLab.targetUserId + '/impersonate', { method: 'POST', headers: { 'Authorization': 'Bearer ' + this.adminToken } });
                        if (!tokenRes.ok) throw new Error("模拟用户失败");
                        userToken = (await tokenRes.json()).token;
                    }
                    const startTime = performance.now();
                    const options = { method: this.apiLab.currentApi?.method || 'GET', headers: { 'Content-Type': 'application/json' } };
                    if (userToken) options.headers['Authorization'] = 'Bearer ' + userToken;
                    if (options.method !== 'GET') options.body = this.apiLab.requestBody;

                    const res = await fetch(this.apiLab.requestUrl, options);
                    const endTime = performance.now();
                    this.apiLab.responseStatus = res.status;
                    this.apiLab.responseTime = Math.round(endTime - startTime);
                    const rawText = await res.text();
                    try { this.apiLab.responseBody = JSON.stringify(JSON.parse(rawText), null, 2); } catch (e) { this.apiLab.responseBody = rawText; }
                } catch (e) { this.apiLab.responseBody = 'Error: ' + e.message; } finally { this.apiLab.isLoading = false; }
            }
        };
    }
    </script>
</body>
</html>`;
