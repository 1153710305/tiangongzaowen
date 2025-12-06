
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
        /* JSON 代码块样式 */
        pre.code-block { font-family: 'Menlo', 'Monaco', 'Courier New', monospace; }
        /* Markdown 样式模拟 */
        .prose-preview h1 { font-size: 1.25em; font-weight: bold; margin-bottom: 0.5em; color: #e2e8f0; }
        .prose-preview h2 { font-size: 1.1em; font-weight: bold; margin-bottom: 0.4em; color: #cbd5e1; }
        .prose-preview p { margin-bottom: 0.8em; line-height: 1.6; }
        .prose-preview ul { list-style-type: disc; padding-left: 1.2em; margin-bottom: 0.8em; }
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
        <div class="w-64 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0">
            <div class="p-6 border-b border-slate-800">
                <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-500">
                    SkyCraft Admin
                </h1>
                <p class="text-xs text-slate-500 mt-1">服务器监控面板 v2.5</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button @click="switchTab('dashboard')" 
                    :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'dashboard', 'text-slate-400 hover:bg-slate-800': currentTab !== 'dashboard'}"
                    class="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    概览 (Dashboard)
                </button>
                <button @click="switchTab('users')" 
                    :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'users', 'text-slate-400 hover:bg-slate-800': currentTab !== 'users'}"
                    class="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    用户管理 (Users)
                </button>
                <button @click="switchTab('logs')" 
                    :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'logs', 'text-slate-400 hover:bg-slate-800': currentTab !== 'logs'}"
                    class="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    系统日志 (Logs)
                </button>
                <button @click="switchTab('api_tester')" 
                    :class="{'bg-indigo-600/20 text-indigo-300': currentTab === 'api_tester', 'text-slate-400 hover:bg-slate-800': currentTab !== 'api_tester'}"
                    class="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                    API 实验室 (Lab)
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
                    <div class="flex gap-2">
                        <button @click="showAddUserModal = true" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-white text-sm flex items-center">
                            + 新增用户
                        </button>
                        <button @click="fetchUsers" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-sm">
                            刷新列表
                        </button>
                    </div>
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
                                    <td class="p-4 text-right flex justify-end gap-2">
                                        <!-- 查看存档列表按钮 -->
                                        <button @click="viewUserArchives(user)" class="text-blue-400 hover:text-blue-300 text-sm bg-blue-900/20 px-3 py-1 rounded hover:bg-blue-900/40 border border-blue-900/50 transition-all flex items-center gap-1" title="查看用户存档">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                            存档
                                        </button>
                                        <button @click="openResetPwd(user)" class="text-indigo-400 hover:text-indigo-300 text-sm bg-indigo-900/20 px-3 py-1 rounded hover:bg-indigo-900/40 border border-indigo-900/50 transition-all">
                                            重置密码
                                        </button>
                                        <button @click="deleteUser(user.id)" class="text-red-400 hover:text-red-300 text-sm bg-red-900/20 px-3 py-1 rounded hover:bg-red-900/40 border border-red-900/50 transition-all">
                                            删除
                                        </button>
                                    </td>
                                </tr>
                            </template>
                            <tr x-show="!users || users.length === 0">
                                <td colspan="4" class="p-8 text-center text-slate-500">暂无用户数据</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 弹窗：新增用户 -->
            <div x-show="showAddUserModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
                <div class="bg-slate-800 p-6 rounded-lg shadow-xl w-96 border border-slate-700">
                    <h3 class="text-xl font-bold mb-4">新增用户</h3>
                    <input type="text" x-model="newUser.username" placeholder="用户名" class="w-full mb-3 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <input type="password" x-model="newUser.password" placeholder="密码 (至少6位)" class="w-full mb-4 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <div class="flex justify-end gap-2">
                        <button @click="showAddUserModal = false" class="px-3 py-1 text-slate-400 hover:text-white">取消</button>
                        <button @click="createUser" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded">创建</button>
                    </div>
                </div>
            </div>

             <!-- 弹窗：重置密码 -->
             <div x-show="showResetPwdModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
                <div class="bg-slate-800 p-6 rounded-lg shadow-xl w-96 border border-slate-700">
                    <h3 class="text-xl font-bold mb-2">重置密码</h3>
                    <p class="text-sm text-slate-400 mb-4">用户: <span x-text="resetPwd.username"></span></p>
                    <input type="text" x-model="resetPwd.newPassword" placeholder="输入新密码" class="w-full mb-4 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <div class="flex justify-end gap-2">
                        <button @click="showResetPwdModal = false" class="px-3 py-1 text-slate-400 hover:text-white">取消</button>
                        <button @click="submitResetPwd" class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded">确认重置</button>
                    </div>
                </div>
            </div>
            
            <!-- 弹窗：用户存档列表 -->
            <div x-show="showArchivesModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
                <div class="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-2xl border border-slate-700 flex flex-col max-h-[80vh]">
                    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                        <h3 class="text-xl font-bold">📚 用户存档列表</h3>
                        <span class="text-sm text-slate-400">用户: <span x-text="currentArchiveUser" class="text-indigo-400 font-bold"></span></span>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto min-h-0">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-900 text-slate-400 sticky top-0">
                                <tr>
                                    <th class="p-3 rounded-tl-lg">书名/标题</th>
                                    <th class="p-3">流派/设定</th>
                                    <th class="p-3">创建时间</th>
                                    <th class="p-3 rounded-tr-lg">操作</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-700">
                                <template x-for="archive in currentUserArchives" :key="archive.id">
                                    <tr class="hover:bg-slate-700/30">
                                        <td class="p-3 font-medium text-white" x-text="archive.title || '无标题'"></td>
                                        <td class="p-3 text-slate-400">
                                            <div class="text-xs" x-show="archive.settings">
                                                <div x-text="archive.settings?.genre" class="mb-1 text-indigo-300"></div>
                                                <div x-text="archive.settings?.trope" class="opacity-70 truncate max-w-[150px]"></div>
                                            </div>
                                            <span x-show="!archive.settings" class="text-xs italic opacity-50">未配置</span>
                                        </td>
                                        <td class="p-3 text-slate-500 text-xs" x-text="formatDate(archive.created_at)"></td>
                                        <td class="p-3">
                                            <button @click="viewArchiveDetail(archive.id)" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded">
                                                详情
                                            </button>
                                        </td>
                                    </tr>
                                </template>
                                <tr x-show="!currentUserArchives || currentUserArchives.length === 0">
                                    <td colspan="4" class="p-8 text-center text-slate-500 italic">该用户暂无存档记录</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="flex justify-end pt-4 border-t border-slate-700 mt-2">
                        <button @click="showArchivesModal = false" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">关闭</button>
                    </div>
                </div>
            </div>

            <!-- 弹窗：存档详情查看器 (新增) -->
            <div x-show="showDetailModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" x-cloak>
                <div class="bg-slate-900 p-0 rounded-xl shadow-2xl w-full max-w-4xl border border-slate-700 flex flex-col h-[85vh]">
                    <!-- Header -->
                    <div class="p-4 border-b border-slate-700 bg-slate-800 rounded-t-xl flex justify-between items-center">
                        <div>
                            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                <span class="text-indigo-400">📖</span> 
                                <span x-text="detailData?.title || '加载中...'"></span>
                            </h3>
                            <div class="text-xs text-slate-400 mt-1" x-text="detailData ? 'ID: ' + detailData.id : ''"></div>
                        </div>
                        <button @click="showDetailModal = false" class="text-slate-400 hover:text-white">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <!-- Loading State -->
                    <div x-show="detailLoading" class="flex-1 flex items-center justify-center text-indigo-400">
                        <svg class="animate-spin h-8 w-8 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span class="ml-2">正在从数据库加载完整内容...</span>
                    </div>

                    <!-- Content -->
                    <div x-show="!detailLoading && detailData" class="flex-1 flex overflow-hidden">
                        <!-- Left Sidebar: Tabs -->
                        <div class="w-48 bg-slate-950 border-r border-slate-800 p-2 space-y-1">
                            <button @click="detailTab = 'settings'" :class="detailTab === 'settings' ? 'bg-indigo-900/50 text-indigo-200' : 'text-slate-400 hover:bg-slate-800'" class="w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors">
                                ⚙️ 参数设定
                            </button>
                            <button @click="detailTab = 'content'" :class="detailTab === 'content' ? 'bg-indigo-900/50 text-indigo-200' : 'text-slate-400 hover:bg-slate-800'" class="w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors">
                                📝 生成内容流
                            </button>
                            <div class="pt-4 px-3">
                                <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-2">元数据</p>
                                <div class="text-xs text-slate-600 space-y-2">
                                    <div>创建: <span x-text="formatDate(detailData?.created_at).split(' ')[0]"></span></div>
                                    <div>更新: <span x-text="formatDate(detailData?.updated_at).split(' ')[0]"></span></div>
                                </div>
                            </div>
                        </div>

                        <!-- Main Content Area -->
                        <div class="flex-1 overflow-y-auto p-6 bg-[#0f172a]">
                            
                            <!-- Settings View -->
                            <div x-show="detailTab === 'settings'" class="space-y-6">
                                <h4 class="text-lg font-bold border-b border-slate-700 pb-2 mb-4">小说核心参数</h4>
                                <template x-if="detailData?.settings">
                                    <div class="grid grid-cols-1 gap-4">
                                        <template x-for="(val, key) in detailData.settings">
                                            <div class="bg-slate-800 p-3 rounded border border-slate-700">
                                                <div class="text-xs text-slate-400 uppercase mb-1" x-text="key"></div>
                                                <div class="text-sm text-white" x-text="val"></div>
                                            </div>
                                        </template>
                                    </div>
                                </template>
                                <template x-if="!detailData?.settings">
                                    <div class="text-slate-500 italic">无参数设定数据</div>
                                </template>
                            </div>

                            <!-- History/Content View -->
                            <div x-show="detailTab === 'content'" class="space-y-4">
                                <h4 class="text-lg font-bold border-b border-slate-700 pb-2 mb-4 flex justify-between">
                                    <span>创作历史流 (Timeline)</span>
                                    <span class="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-1 rounded" x-text="(detailData?.history?.length || 0) + ' 条记录'"></span>
                                </h4>
                                
                                <template x-for="msg in (detailData?.history || [])" :key="msg.id">
                                    <div class="flex flex-col gap-1 mb-6">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span :class="msg.role === 'user' ? 'bg-indigo-600' : (msg.role === 'model' ? 'bg-pink-600' : 'bg-slate-600')" class="text-[10px] text-white px-2 py-0.5 rounded uppercase font-bold" x-text="msg.role === 'user' ? '指令 (User)' : (msg.role === 'model' ? '生成内容 (AI)' : '系统')"></span>
                                            <span class="text-xs text-slate-500" x-text="formatTime(msg.timestamp)"></span>
                                        </div>
                                        <div :class="msg.role === 'user' ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-800 border-slate-700'" class="p-4 rounded-lg border text-sm text-slate-300 whitespace-pre-wrap prose-preview" x-text="msg.content">
                                        </div>
                                    </div>
                                </template>
                                
                                <div x-show="!detailData?.history || detailData.history.length === 0" class="text-center py-10 text-slate-500">
                                    暂无生成内容...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 日志视图 -->
            <div x-show="currentTab === 'logs'">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold flex items-center gap-2">
                        系统运行日志
                        <span class="text-xs font-normal px-2 py-0.5 bg-slate-800 rounded text-slate-400" x-show="isAutoRefresh">实时刷新中...</span>
                    </h2>
                    <div class="flex gap-2">
                         <button @click="toggleAutoRefresh" 
                            :class="isAutoRefresh ? 'bg-green-600/20 text-green-400 border-green-600/50' : 'bg-slate-800 text-slate-400 border-slate-700'"
                            class="px-3 py-1 rounded border text-sm transition-colors">
                            {{ isAutoRefresh ? '暂停刷新' : '开启自动刷新' }}
                        </button>
                        <button @click="fetchLogs" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-sm">
                            手动刷新
                        </button>
                    </div>
                </div>

                <!-- 筛选栏 -->
                <div class="flex gap-4 mb-4">
                    <input type="text" x-model="logSearch" placeholder="搜索日志内容..." 
                        class="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm outline-none focus:border-indigo-500 flex-1">
                    <select x-model="logLevelFilter" class="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm outline-none focus:border-indigo-500">
                        <option value="">所有级别</option>
                        <option value="INFO">INFO</option>
                        <option value="WARN">WARN</option>
                        <option value="ERROR">ERROR</option>
                        <option value="DEBUG">DEBUG</option>
                    </select>
                </div>

                <div class="bg-[#0d1117] rounded-xl border border-slate-700 p-4 font-mono text-xs h-[calc(100vh-220px)] overflow-y-auto">
                    <template x-for="log in filteredLogs" :key="log.id">
                        <div class="mb-2 pb-2 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 p-1 rounded">
                            <div class="flex gap-2 mb-1">
                                <span class="text-slate-500 shrink-0" x-text="formatTime(log.timestamp)"></span>
                                <span :class="getLevelClass(log.level)" x-text="log.level" class="font-bold shrink-0 w-12 text-center"></span>
                                <span class="text-slate-300 flex-1 break-all" x-text="log.message"></span>
                            </div>
                            <div x-show="log.meta" class="ml-24 mt-1">
                                <pre class="text-slate-500 overflow-x-auto bg-black/20 p-2 rounded border border-slate-800" x-text="JSON.stringify(log.meta, null, 2)"></pre>
                            </div>
                        </div>
                    </template>
                    <div x-show="filteredLogs.length === 0" class="text-center text-slate-600 py-10 italic">
                        暂无匹配的日志记录...
                    </div>
                </div>
            </div>

            <!-- API Tester 视图 (新增) -->
            <div x-show="currentTab === 'api_tester'" class="h-full flex flex-col">
                <div class="mb-4">
                    <h2 class="text-2xl font-bold text-indigo-400">API 可视化实验室</h2>
                    <p class="text-xs text-slate-500">直接从浏览器模拟请求，测试服务器接口连通性与性能。</p>
                </div>

                <div class="flex-1 flex gap-4 min-h-0">
                    <!-- 左侧：请求配置 -->
                    <div class="w-1/2 flex flex-col gap-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700 overflow-y-auto">
                        <!-- 预设接口列表 -->
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">快速选择接口范例</label>
                            <select x-model="selectedApiEndpoint" @change="loadApiTemplate" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white">
                                <option value="">-- 请选择 API --</option>
                                <option value="login">POST /api/auth/login (登录)</option>
                                <option value="register">POST /api/auth/register (注册)</option>
                                <option value="generate">POST /api/generate (Idea: 参数模式)</option>
                                <option value="generate_analysis">POST /api/generate (Idea: 爆款分析模式) [NEW]</option>
                                <option value="pool">GET /api/config/pool (获取配置池)</option>
                                <option value="archives">GET /api/archives (获取存档列表)</option>
                                <option value="archive_detail">GET /admin/api/archives/{ID} (获取存档详情)</option>
                            </select>
                        </div>

                        <!-- 基础信息 -->
                        <div class="flex gap-2">
                            <div class="w-1/4">
                                <label class="block text-xs text-slate-400 mb-1">Method</label>
                                <select x-model="apiRequest.method" class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-sm font-bold" :class="getMethodColor(apiRequest.method)">
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                </select>
                            </div>
                            <div class="flex-1">
                                <label class="block text-xs text-slate-400 mb-1">Endpoint URL</label>
                                <input type="text" x-model="apiRequest.url" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-white">
                            </div>
                        </div>

                        <!-- Header 配置 -->
                        <div>
                            <div class="flex justify-between mb-1">
                                <label class="text-xs text-slate-400">Headers (JSON)</label>
                                <button @click="injectToken" class="text-xs text-indigo-400 hover:text-white underline">注入当前Admin Token</button>
                            </div>
                            <textarea x-model="apiRequest.headers" rows="3" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs font-mono text-slate-300 code-block"></textarea>
                        </div>

                        <!-- Body 配置 -->
                        <div class="flex-1 flex flex-col min-h-0">
                            <label class="block text-xs text-slate-400 mb-1">Request Body (JSON)</label>
                            <textarea x-model="apiRequest.body" class="flex-1 w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs font-mono text-slate-300 code-block resize-none"></textarea>
                        </div>

                        <button @click="sendApiRequest" :disabled="apiLoading" 
                            class="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3 rounded shadow-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                            <span x-show="apiLoading" class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                            <span>发送请求 (Send Request)</span>
                        </button>
                    </div>

                    <!-- 右侧：响应结果 -->
                    <div class="w-1/2 flex flex-col bg-[#0d1117] rounded-xl border border-slate-700 overflow-hidden relative">
                        <div class="bg-slate-950 p-2 border-b border-slate-800 flex justify-between items-center">
                            <span class="text-xs font-bold text-slate-400">Response</span>
                            <div class="flex gap-4 text-xs font-mono" x-show="apiResponse">
                                <span :class="getStatusColor(apiResponse?.status)">Status: <span x-text="apiResponse?.status"></span></span>
                                <span class="text-blue-400">Time: <span x-text="apiResponse?.time"></span>ms</span>
                                <span class="text-pink-400" title="估算值: 字符数/4">Est. Tokens: ~<span x-text="apiResponse?.tokens"></span></span>
                            </div>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4">
                             <pre x-show="apiResponse" class="text-xs font-mono text-green-400 break-all whitespace-pre-wrap code-block" x-text="apiResponse?.body"></pre>
                             <div x-show="!apiResponse" class="h-full flex items-center justify-center text-slate-600 text-sm italic">
                                 等待发送请求...
                             </div>
                        </div>
                         <div x-show="apiResponse && apiResponse.model" class="absolute bottom-2 right-2 px-2 py-1 bg-slate-800/80 rounded text-[10px] text-slate-500 border border-slate-700">
                            Model: <span x-text="apiResponse.model"></span>
                        </div>
                    </div>
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
                
                // 数据状态
                stats: { totalUsers: 0, totalArchives: 0, lastActiveTime: '' },
                users: [],
                logs: [],
                
                // 新增用户状态
                showAddUserModal: false,
                newUser: { username: '', password: '' },

                // 重置密码状态
                showResetPwdModal: false,
                resetPwd: { id: '', username: '', newPassword: '' },

                // 存档列表状态
                showArchivesModal: false,
                currentArchiveUser: '',
                currentUserArchives: [],

                // 存档详情状态 (新增)
                showDetailModal: false,
                detailLoading: false,
                detailData: null,
                detailTab: 'settings',

                // API Tester 状态
                selectedApiEndpoint: '',
                apiLoading: false,
                apiRequest: {
                    method: 'GET',
                    url: '/api/config/pool',
                    headers: '{\\n  "Content-Type": "application/json"\\n}',
                    body: ''
                },
                apiResponse: null,
                
                // 日志筛选
                logSearch: '',
                logLevelFilter: '',
                logInterval: null,
                isAutoRefresh: false,

                get filteredLogs() {
                    // 安全检查：防止 this.logs 为 undefined
                    if (!this.logs || !Array.isArray(this.logs)) return [];
                    return this.logs.filter(log => {
                        const matchesLevel = this.logLevelFilter ? log.level === this.logLevelFilter : true;
                        const matchesSearch = this.logSearch ? 
                            (log.message.toLowerCase().includes(this.logSearch.toLowerCase()) || 
                             (log.meta && JSON.stringify(log.meta).toLowerCase().includes(this.logSearch.toLowerCase()))) 
                            : true;
                        return matchesLevel && matchesSearch;
                    });
                },

                init() {
                    const token = localStorage.getItem('skycraft_admin_token');
                    if (token) {
                        this.adminToken = token;
                        this.isAuthenticated = true;
                        this.fetchStats();
                    }
                },

                switchTab(tab) {
                    this.currentTab = tab;
                    if (this.logInterval) { clearInterval(this.logInterval); this.logInterval = null; this.isAutoRefresh = false; }
                    
                    if (tab === 'dashboard') this.fetchStats();
                    if (tab === 'users') this.fetchUsers();
                    if (tab === 'logs') { this.fetchLogs(); this.toggleAutoRefresh(); }
                },

                // === 登录逻辑 ===
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
                    if (this.logInterval) clearInterval(this.logInterval);
                },

                async authedFetch(url, options = {}) {
                    const headers = { ...options.headers, 'Authorization': 'Bearer ' + this.adminToken };
                    const res = await fetch(url, { ...options, headers });
                    if (res.status === 401) { this.logout(); throw new Error('Unauthorized'); }
                    return res.json();
                },

                // === 用户管理 ===
                async fetchStats() { 
                    try { 
                        const res = await this.authedFetch('/admin/api/stats'); 
                        this.stats = res || { totalUsers: 0, totalArchives: 0, lastActiveTime: '' }; 
                    } catch (e) {
                        this.stats = { totalUsers: 0, totalArchives: 0, lastActiveTime: '' };
                    } 
                },
                async fetchUsers() { 
                    try { 
                        const res = await this.authedFetch('/admin/api/users'); 
                        this.users = Array.isArray(res) ? res : []; 
                    } catch (e) { 
                        this.users = []; 
                    } 
                },
                async deleteUser(id) {
                    if(!confirm('确定要删除该用户吗？所有存档将被永久清除！')) return;
                    try { await this.authedFetch('/admin/api/users/' + id, { method: 'DELETE' }); this.fetchUsers(); } catch (e) { alert('删除失败'); }
                },
                async createUser() {
                    if (!this.newUser.username || (this.newUser.password || '').length < 6) return alert('用户名或密码格式错误');
                    try {
                        const res = await fetch('/admin/api/users', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken },
                            body: JSON.stringify(this.newUser)
                        });
                        if (res.ok) {
                            alert('用户创建成功');
                            this.showAddUserModal = false;
                            this.newUser = { username: '', password: '' };
                            this.fetchUsers();
                        } else {
                            const err = await res.json();
                            alert('创建失败: ' + err.error);
                        }
                    } catch (e) { alert('请求失败'); }
                },
                openResetPwd(user) {
                    this.resetPwd = { id: user.id, username: user.username, newPassword: '' };
                    this.showResetPwdModal = true;
                },
                async submitResetPwd() {
                    try {
                         const res = await fetch('/admin/api/users/' + this.resetPwd.id + '/password', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken },
                            body: JSON.stringify({ password: this.resetPwd.newPassword })
                        });
                        if (res.ok) {
                            alert('密码重置成功');
                            this.showResetPwdModal = false;
                        } else {
                            alert('重置失败');
                        }
                    } catch (e) { alert('请求失败'); }
                },
                
                // === 存档查看逻辑 ===
                async viewUserArchives(user) {
                    this.currentArchiveUser = user.username;
                    this.currentUserArchives = [];
                    this.showArchivesModal = true;
                    try {
                        const res = await this.authedFetch('/admin/api/users/' + user.id + '/archives');
                        this.currentUserArchives = Array.isArray(res) ? res : [];
                    } catch(e) {
                        console.error(e);
                        alert('获取存档失败');
                    }
                },
                
                // 新增：加载存档详情
                async viewArchiveDetail(id) {
                    this.showDetailModal = true;
                    this.detailLoading = true;
                    this.detailData = null;
                    this.detailTab = 'settings';
                    try {
                        const res = await this.authedFetch('/admin/api/archives/' + id);
                        this.detailData = res;
                    } catch(e) {
                        alert('加载详情失败');
                        this.showDetailModal = false;
                    } finally {
                        this.detailLoading = false;
                    }
                },

                // === 日志逻辑 ===
                async fetchLogs() { 
                    try { 
                        const res = await this.authedFetch('/admin/api/logs'); 
                        this.logs = Array.isArray(res) ? res : []; 
                    } catch (e) { 
                        this.logs = []; 
                    } 
                },
                toggleAutoRefresh() {
                    if (this.isAutoRefresh) { clearInterval(this.logInterval); this.logInterval = null; this.isAutoRefresh = false; }
                    else { this.isAutoRefresh = true; this.fetchLogs(); this.logInterval = setInterval(() => this.fetchLogs(), 2000); }
                },

                // === API Tester Logic ===
                loadApiTemplate() {
                    const t = this.selectedApiEndpoint;
                    const defaultHeaders = '{\\n  "Content-Type": "application/json"\\n}';
                    if (t === 'login') {
                        this.apiRequest = { method: 'POST', url: '/api/auth/login', headers: defaultHeaders, body: '{\\n  "username": "admin",\\n  "password": "password"\\n}' };
                    } else if (t === 'register') {
                        this.apiRequest = { method: 'POST', url: '/api/auth/register', headers: defaultHeaders, body: '{\\n  "username": "newuser",\\n  "password": "password123"\\n}' };
                    } else if (t === 'generate') {
                        this.apiRequest = { method: 'POST', url: '/api/generate', headers: defaultHeaders, body: '{\\n  "step": "idea",\\n  "settings": {\\n    "genre": "都市",\\n    "trope": "系统",\\n    "protagonistType": "腹黑",\\n    "goldenFinger": "加点",\\n    "pacing": "fast",\\n    "targetAudience": "male",\\n    "tone": "爽文"\\n  }\\n}' };
                    } else if (t === 'generate_analysis') {
                        // 新增测试模板
                        this.apiRequest = { 
                            method: 'POST', 
                            url: '/api/generate', 
                            headers: defaultHeaders, 
                            body: '{\\n  "step": "analysis_idea",\\n  "settings": {\\n    "targetAudience": "male",\\n    "tone": "热血"\\n  },\\n  "references": [\\n    {\\n      "title": "参考书名A",\\n      "intro": "这是一个关于重生回到过去炒股的故事..."\\n    }\\n  ]\\n}' 
                        };
                    } else if (t === 'pool') {
                        this.apiRequest = { method: 'GET', url: '/api/config/pool', headers: defaultHeaders, body: '' };
                    } else if (t === 'archives') {
                        this.apiRequest = { method: 'GET', url: '/api/archives', headers: defaultHeaders, body: '' };
                    } else if (t === 'archive_detail') {
                        this.apiRequest = { method: 'GET', url: '/admin/api/archives/REPLACE_WITH_ID', headers: defaultHeaders, body: '' };
                    }
                },
                injectToken() {
                    const h = JSON.parse(this.apiRequest.headers || '{}');
                    h['Authorization'] = 'Bearer ' + this.adminToken;
                    this.apiRequest.headers = JSON.stringify(h, null, 2);
                },
                async sendApiRequest() {
                    this.apiLoading = true;
                    this.apiResponse = null;
                    const start = Date.now();
                    try {
                        const options = {
                            method: this.apiRequest.method,
                            headers: JSON.parse(this.apiRequest.headers || '{}')
                        };
                        if (['POST', 'PUT'].includes(this.apiRequest.method) && this.apiRequest.body) {
                            options.body = this.apiRequest.body;
                        }

                        const res = await fetch(this.apiRequest.url, options);
                        const end = Date.now();
                        
                        let bodyStr = '';
                        let isJson = false;
                        const contentType = res.headers.get('content-type');
                        
                        if (contentType && contentType.includes('application/json')) {
                            const json = await res.json();
                            bodyStr = JSON.stringify(json, null, 2);
                            isJson = true;
                        } else {
                            bodyStr = await res.text();
                        }

                        const inputLen = (this.apiRequest.body || '').length + (this.apiRequest.url || '').length;
                        const outputLen = (bodyStr || '').length;
                        const totalTokens = Math.ceil((inputLen + outputLen) / 4);

                        this.apiResponse = {
                            status: res.status,
                            time: end - start,
                            body: bodyStr,
                            tokens: totalTokens,
                            model: isJson ? 'Gemini 2.5 Flash (Estimated)' : 'System'
                        };

                    } catch (e) {
                        this.apiResponse = {
                            status: 'ERROR',
                            time: Date.now() - start,
                            body: e.message,
                            tokens: 0,
                            model: '-'
                        };
                    } finally {
                        this.apiLoading = false;
                    }
                },
                getMethodColor(m) {
                    if (m === 'GET') return 'text-green-400';
                    if (m === 'POST') return 'text-yellow-400';
                    if (m === 'DELETE') return 'text-red-400';
                    return 'text-white';
                },
                getStatusColor(s) {
                    if (s >= 200 && s < 300) return 'text-green-400';
                    if (s >= 400) return 'text-red-400';
                    return 'text-yellow-400';
                },

                // === 格式化 ===
                formatDate(isoStr) { if (!isoStr || isoStr === '无数据') return '无数据'; try { return new Date(isoStr).toLocaleString('zh-CN'); } catch(e) { return isoStr; } },
                formatTime(isoStr) { if (!isoStr) return ''; try { 
                    if (typeof isoStr === 'number') return new Date(isoStr).toLocaleTimeString(); // 处理 timestamp number
                    return isoStr.includes('T') ? isoStr.split('T')[1].split('.')[0] : isoStr; 
                } catch(e) { return isoStr; } },
                getLevelClass(level) {
                    switch(level) {
                        case 'INFO': return 'text-blue-400';
                        case 'WARN': return 'text-yellow-400';
                        case 'ERROR': return 'text-red-500';
                        case 'DEBUG': return 'text-gray-400';
                        default: return 'text-slate-400';
                    }
                }
            }
        }
    </script>
</body>
</html>`;