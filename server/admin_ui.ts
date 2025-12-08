
import { ADMIN_STYLES, ADMIN_SCRIPT } from './admin_assets.ts';
import { DASHBOARD_VIEW, APILAB_VIEW, USERS_VIEW, SETTINGS_VIEW } from './admin_views.ts';

export const ADMIN_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SkyCraft Admin - Backend Console</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>
    <style>${ADMIN_STYLES}</style>
</head>
<body class="bg-slate-900 text-slate-200 font-sans h-screen overflow-hidden" x-data="adminApp()">
    
    <!-- 登录界面 -->
    <div x-show="!isAuthenticated" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-sm">
            <h2 class="text-2xl font-bold text-center mb-6 text-indigo-400">SkyCraft Admin</h2>
            <form @submit.prevent="login">
                <input type="password" x-model="password" placeholder="Access Key" class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-3 mb-4 outline-none focus:border-indigo-500 transition-colors text-center font-mono">
                <button type="submit" :disabled="isLoading" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded transition-colors shadow-lg">
                    <span x-show="!isLoading">Login</span><span x-show="isLoading" class="animate-pulse">Verifying...</span>
                </button>
                <p x-show="loginError" class="mt-4 text-red-400 text-sm text-center" x-text="loginError"></p>
            </form>
        </div>
    </div>

    <!-- 主控台 -->
    <div x-show="isAuthenticated" class="flex h-full" x-cloak>
        <!-- 侧边栏 -->
        <div class="w-64 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0">
            <div class="p-6 border-b border-slate-800">
                <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-500">SkyCraft</h1>
                <p class="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">System Control</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button @click="switchTab('dashboard')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'dashboard'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-3 text-sm font-medium"><span>📊</span> 概览</button>
                <button @click="switchTab('apilab')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'apilab'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-3 text-sm font-medium border border-transparent" :class="currentTab === 'apilab' ? 'border-indigo-500/30' : ''"><span>🧪</span> API 实验室</button>
                <button @click="switchTab('users')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'users'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-3 text-sm font-medium"><span>👥</span> 用户管理</button>
                <button @click="switchTab('settings')" :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'settings'}" class="w-full text-left px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-3 text-sm font-medium"><span>⚙️</span> 系统设置</button>
            </nav>
            <div class="p-4 border-t border-slate-800">
                <button @click="logout" class="w-full text-sm text-slate-400 hover:text-white border border-slate-700 rounded py-2 hover:bg-slate-800 transition-colors">退出登录</button>
            </div>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto bg-slate-900 p-8 relative">
            ${DASHBOARD_VIEW}
            ${APILAB_VIEW}
            ${USERS_VIEW}
            ${SETTINGS_VIEW}
            
            <!-- Modals would go here (Add User, etc) - omitted for brevity -->
            <div x-show="showAddUserModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" x-cloak>
                 <div class="bg-slate-800 p-6 rounded-lg w-96 border border-slate-700">
                     <h3 class="font-bold text-white mb-4">新增用户</h3>
                     <input x-model="newUser.username" placeholder="Username" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 mb-2 text-white text-sm">
                     <input x-model="newUser.password" placeholder="Password (min 6)" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 mb-4 text-white text-sm">
                     <div class="flex justify-end gap-2">
                         <button @click="showAddUserModal=false" class="text-slate-400 text-sm">取消</button>
                         <button @click="createUser" class="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm">创建</button>
                     </div>
                 </div>
            </div>
        </div>
    </div>
    
    <script>
    // === API 注册表配置 ===
    const API_REGISTRY = [
        { 
            name: "生成创意 (Idea)", 
            url: "/api/generate", 
            method: "POST", 
            auth: true, 
            body: { "step": "idea", "settings": { "genre": "都市异能", "trope": "系统+直播", "protagonistType": "腹黑", "goldenFinger": "看到未来", "pacing": "fast", "targetAudience": "male", "tone": "爽文" }, "context": "主角捡到一个手机，能连接未来", "model": "gemini-2.5-flash" } 
        },
        { 
            name: "生成大纲 (Outline)", 
            url: "/api/generate", 
            method: "POST", 
            auth: true, 
            body: { "step": "outline", "settings": { "genre": "玄幻" }, "context": "创意：主角是一把剑。...", "model": "gemini-2.5-flash" } 
        },
        { 
            name: "撰写正文 (Chapter)", 
            url: "/api/generate", 
            method: "POST", 
            auth: true, 
            body: { "step": "chapter", "settings": { "genre": "都市" }, "context": "第一章：重生... (上文内容)", "extraPrompt": "重点描写环境阴森", "model": "gemini-2.5-flash" } 
        },
        { 
            name: "思维导图扩展 (MindMap)", 
            url: "/api/generate", 
            method: "POST", 
            auth: true, 
            body: { "step": "mind_map_node", "settings": {}, "context": "帮派势力划分", "extraPrompt": "生成3个下级帮派", "model": "gemini-2.5-flash" } 
        },
        { 
            name: "获取用户状态", 
            url: "/api/user/status", 
            method: "GET", 
            auth: true, 
            body: {} 
        },
        { 
            name: "获取项目列表", 
            url: "/api/projects", 
            method: "GET", 
            auth: true, 
            body: {} 
        },
        { 
            name: "系统配置池 (Public)", 
            url: "/api/config/pool", 
            method: "GET", 
            auth: false, 
            body: {} 
        }
    ];

    ${ADMIN_SCRIPT}
    
    // 注入 API Lab 逻辑
    const originalApp = adminApp;
    adminApp = function() {
        const base = originalApp();
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
                usedModel: '',
                isLoading: false 
            },
            
            getUsername(id) {
                const u = this.users.find(x => x.id === id);
                return u ? u.username : id;
            },

            selectApi(api) {
                this.apiLab.currentApi = api; 
                this.apiLab.requestUrl = api.url; 
                this.apiLab.requestBody = JSON.stringify(api.body, null, 2);
                this.apiLab.responseBody = ''; 
                this.apiLab.responseStatus = 0;
                this.apiLab.responseTime = 0;
                this.apiLab.usedModel = '';
            },

            loadApiExample() { 
                if (this.apiLab.currentApi) { 
                    this.apiLab.requestBody = JSON.stringify(this.apiLab.currentApi.body, null, 2); 
                    this.apiLab.requestUrl = this.apiLab.currentApi.url; 
                } 
            },

            async testApi() {
                const isAuthRequired = this.apiLab.currentApi?.auth;
                if (isAuthRequired && !this.apiLab.targetUserId) return alert("请在右上角选择要模拟的用户身份 (Impersonate)");
                
                this.apiLab.isLoading = true; 
                this.apiLab.responseBody = '';
                this.apiLab.responseStatus = 0;
                this.apiLab.usedModel = '-';
                
                try {
                    let userToken = '';
                    // 1. 获取模拟 Token
                    if (isAuthRequired) {
                         const tokenRes = await fetch('/admin/api/users/' + this.apiLab.targetUserId + '/impersonate', { 
                             method: 'POST', 
                             headers: { 'Authorization': 'Bearer ' + this.adminToken } 
                         });
                        if (!tokenRes.ok) throw new Error("无法获取模拟用户 Token");
                        userToken = (await tokenRes.json()).token;
                    }

                    // 2. 解析 Request Body 提取 Model 信息 (用于展示)
                    try {
                        const parsedBody = JSON.parse(this.apiLab.requestBody);
                        if (parsedBody.model) this.apiLab.usedModel = parsedBody.model;
                    } catch(e) {}

                    const startTime = performance.now();
                    const options = { 
                        method: this.apiLab.currentApi?.method || 'GET', 
                        headers: { 'Content-Type': 'application/json' } 
                    };
                    
                    if (userToken) options.headers['Authorization'] = 'Bearer ' + userToken;
                    if (options.method !== 'GET') options.body = this.apiLab.requestBody;

                    const res = await fetch(this.apiLab.requestUrl, options);
                    
                    // 读取流式或文本
                    let rawText = '';
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                         rawText = await res.text();
                    } else {
                         // 简单处理流式，直接读完
                         rawText = await res.text();
                    }

                    const endTime = performance.now();
                    this.apiLab.responseStatus = res.status;
                    this.apiLab.responseTime = Math.round(endTime - startTime);
                    
                    try { 
                        this.apiLab.responseBody = JSON.stringify(JSON.parse(rawText), null, 2); 
                    } catch (e) { 
                        this.apiLab.responseBody = rawText; 
                    }

                } catch (e) { 
                    this.apiLab.responseBody = 'Error: ' + e.message; 
                } finally { 
                    this.apiLab.isLoading = false; 
                }
            }
        };
    }
    </script>
</body>
</html>`;
