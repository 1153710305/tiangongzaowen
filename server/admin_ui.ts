
/**
 * 后台管理界面 UI 模板
 * 这是一个独立的单页应用，嵌入在服务端代码中直接返回。
 * 使用 Alpine.js 进行轻量级状态管理，Tailwind CSS 进行样式渲染。
 */
export const ADMIN_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>天工造文 - 后台管理系统</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- 引入 Alpine.js 用于轻量级交互 -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>
    <style>
        [x-cloak] { display: none !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    </style>
</head>
<body class="bg-slate-900 text-slate-200 font-sans h-screen overflow-hidden" x-data="adminApp()">
    
    <!-- 登录模态框 -->
    <div x-show="!isAuthenticated" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" x-cloak>
        <div class="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-sm">
            <h2 class="text-2xl font-bold text-center mb-6 text-indigo-400">管理员登录</h2>
            <form @submit.prevent="login">
                <input type="password" x-model="password" placeholder="请输入管理员密码" 
                    class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-3 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                <button type="submit" :disabled="isLoading" 
                    class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50">
                    <span x-show="!isLoading">进入后台</span>
                    <span x-show="isLoading">验证中...</span>
                </button>
                <p x-show="loginError" class="mt-4 text-red-400 text-sm text-center" x-text="loginError"></p>
            </form>
        </div>
    </div>

    <!-- 主界面 -->
    <div x-show="isAuthenticated" class="flex h-full" x-cloak>
        <!-- 侧边栏 -->
        <div class="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
            <div class="p-6 border-b border-slate-800">
                <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-500">
                    SkyCraft Admin
                </h1>
                <p class="text-xs text-slate-500 mt-1">服务器监控面板 v1.0</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button @click="currentTab = 'dashboard'; fetchStats()" 
                    :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'dashboard', 'text-slate-400 hover:bg-slate-800': currentTab !== 'dashboard'}"
                    class="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    概览 (Dashboard)
                </button>
                <button @click="currentTab = 'users'; fetchUsers()" 
                    :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'users', 'text-slate-400 hover:bg-slate-800': currentTab !== 'users'}"
                    class="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    用户管理 (Users)
                </button>
            </nav>
            <div class="p-4 border-t border-slate-800">
                <button @click="logout" class="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    退出登录
                </button>
            </div>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto bg-slate-900 p-8">
            
            <!-- 仪表盘视图 -->
            <div x-show="currentTab === 'dashboard'">
                <h2 class="text-2xl font-bold mb-6">系统概览</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <!-- 卡片 1 -->
                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div class="text-slate-400 text-sm mb-1">总注册用户</div>
                        <div class="text-3xl font-bold text-white" x-text="stats.totalUsers">0</div>
                    </div>
                    <!-- 卡片 2 -->
                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div class="text-slate-400 text-sm mb-1">累计生成存档</div>
                        <div class="text-3xl font-bold text-pink-500" x-text="stats.totalArchives">0</div>
                    </div>
                    <!-- 卡片 3 -->
                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div class="text-slate-400 text-sm mb-1">最后活跃时间</div>
                        <div class="text-lg font-mono text-indigo-400 truncate" x-text="formatDate(stats.lastActiveTime)">-</div>
                    </div>
                </div>

                <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <h3 class="font-bold text-lg mb-4">服务器状态</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between border-b border-slate-700 pb-2">
                            <span class="text-slate-400">运行模式</span>
                            <span class="text-green-400">Node.js / Hono</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-700 pb-2">
                            <span class="text-slate-400">数据库</span>
                            <span class="text-blue-400">SQLite (WAL Mode)</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-700 pb-2">
                            <span class="text-slate-400">API状态</span>
                            <span class="text-green-400">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 用户管理视图 -->
            <div x-show="currentTab === 'users'">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">用户管理列表</h2>
                    <button @click="fetchUsers" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-sm">
                        刷新列表
                    </button>
                </div>

                <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <table class="w-full text-left">
                        <thead class="bg-slate-950 text-slate-400 text-sm">
                            <tr>
                                <th class="p-4">用户ID</th>
                                <th class="p-4">用户名</th>
                                <th class="p-4">注册时间</th>
                                <th class="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-700">
                            <template x-for="user in users" :key="user.id">
                                <tr class="hover:bg-slate-700/50 transition-colors">
                                    <td class="p-4 font-mono text-xs text-slate-500" x-text="user.id"></td>
                                    <td class="p-4 font-medium text-white" x-text="user.username"></td>
                                    <td class="p-4 text-sm text-slate-400" x-text="formatDate(user.created_at)"></td>
                                    <td class="p-4 text-right">
                                        <button @click="deleteUser(user.id)" class="text-red-400 hover:text-red-300 text-sm bg-red-900/20 px-3 py-1 rounded hover:bg-red-900/40 border border-red-900/50 transition-all">
                                            删除账号
                                        </button>
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

        </div>
    </div>

    <script>
        function adminApp() {
            return {
                isAuthenticated: false,
                password: '',
                adminToken: '',
                isLoading: false,
                loginError: '',
                currentTab: 'dashboard',
                stats: { totalUsers: 0, totalArchives: 0, lastActiveTime: '' },
                users: [],

                init() {
                    // 检查本地存储的 Token
                    const token = localStorage.getItem('skycraft_admin_token');
                    if (token) {
                        this.adminToken = token;
                        this.isAuthenticated = true;
                        this.fetchStats();
                    }
                },

                async login() {
                    this.isLoading = true;
                    this.loginError = '';
                    try {
                        const res = await fetch('/admin/api/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: this.password })
                        });
                        const data = await res.json();
                        if (res.ok) {
                            this.adminToken = data.token;
                            localStorage.setItem('skycraft_admin_token', data.token);
                            this.isAuthenticated = true;
                            this.password = '';
                            this.fetchStats();
                        } else {
                            this.loginError = data.error || '验证失败';
                        }
                    } catch (e) {
                        this.loginError = '连接服务器失败';
                    } finally {
                        this.isLoading = false;
                    }
                },

                logout() {
                    this.isAuthenticated = false;
                    this.adminToken = '';
                    localStorage.removeItem('skycraft_admin_token');
                },

                async authedFetch(url, options = {}) {
                    const headers = {
                        ...options.headers,
                        'Authorization': 'Bearer ' + this.adminToken
                    };
                    const res = await fetch(url, { ...options, headers });
                    if (res.status === 401) {
                        this.logout();
                        throw new Error('Unauthorized');
                    }
                    return res.json();
                },

                async fetchStats() {
                    try {
                        this.stats = await this.authedFetch('/admin/api/stats');
                    } catch (e) { console.error(e); }
                },

                async fetchUsers() {
                    try {
                        this.users = await this.authedFetch('/admin/api/users');
                    } catch (e) { console.error(e); }
                },

                async deleteUser(id) {
                    if(!confirm('确定要删除该用户吗？所有存档将被永久清除！')) return;
                    try {
                        await this.authedFetch('/admin/api/users/' + id, { method: 'DELETE' });
                        this.fetchUsers(); // 刷新列表
                    } catch (e) { alert('删除失败'); }
                },

                formatDate(isoStr) {
                    if (!isoStr || isoStr === '无数据') return '无数据';
                    return new Date(isoStr).toLocaleString('zh-CN');
                }
            }
        }
    </script>
</body>
</html>
`;
