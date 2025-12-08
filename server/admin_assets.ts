
/**
 * Admin UI Static Assets (CSS & JS)
 */

export const ADMIN_STYLES = `
    [x-cloak] { display: none !important; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #1e293b; }
    ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #64748b; }
    pre.code-block { font-family: 'Menlo', 'Monaco', 'Courier New', monospace; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;

export const ADMIN_SCRIPT = `
    function adminApp() {
        return {
            isAuthenticated: false,
            password: '',
            adminToken: '',
            isLoading: false,
            loginError: '',
            currentTab: 'dashboard',
            stats: { totalUsers: 0, totalArchives: 0, totalCards: 0, totalProjects: 0, activeKeys: 0 },
            users: [],
            logs: [],
            apiKeys: [],
            
            // Key Modals
            showAddKeyModal: false,
            newKey: { key: '', provider: 'google' },

            // User Modals State
            showAddUserModal: false,
            newUser: { username: '', password: '' },
            showResetPwdModal: false,
            resetPwd: { id: '', username: '', newPassword: '' },
            showArchivesModal: false,
            currentArchiveUser: '',
            currentUserArchives: [],
            
            // Detail Modal State
            showDetailModal: false,
            detailLoading: false,
            detailData: null,
            detailTab: 'settings', 
            
            // Logs State
            logSearch: '',
            logLevelFilter: '',
            logInterval: null,
            isAutoRefresh: false,

            // Config State
            config: {
                aiModelsJson: '[]',
                parsedModels: [], // For editable UI
                defaultModel: ''
            },

            get filteredLogs() {
                if (!this.logs || !Array.isArray(this.logs)) return [];
                return this.logs.filter(log => {
                    const matchesLevel = this.logLevelFilter ? log.level === this.logLevelFilter : true;
                    const matchesSearch = this.logSearch ? (log.message.toLowerCase().includes(this.logSearch.toLowerCase()) || (log.meta && JSON.stringify(log.meta).toLowerCase().includes(this.logSearch.toLowerCase()))) : true;
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
                if (tab !== 'logs' && this.logInterval) { 
                    clearInterval(this.logInterval); 
                    this.logInterval = null; 
                    this.isAutoRefresh = false; 
                }
                
                if (tab === 'dashboard') this.fetchStats();
                if (tab === 'users') this.fetchUsers();
                if (tab === 'keys') this.fetchKeys();
                if (tab === 'settings') this.fetchConfig();
                if (tab === 'logs') { 
                    this.fetchLogs(); 
                    if (!this.isAutoRefresh) this.toggleAutoRefresh(); 
                }
            },

            async login() {
                this.isLoading = true; this.loginError = '';
                try {
                    const res = await fetch('/admin/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: this.password }) });
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
                } catch (e) { this.loginError = '连接服务器失败'; } finally { this.isLoading = false; }
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

            // === Dashboard ===
            async fetchStats() { 
                try { 
                    const res = await this.authedFetch('/admin/api/stats'); 
                    this.stats = res || this.stats; 
                } catch (e) { console.error(e); } 
            },

            // === Keys (New) ===
            async fetchKeys() {
                try {
                    const res = await this.authedFetch('/admin/api/keys');
                    this.apiKeys = Array.isArray(res) ? res : [];
                } catch(e) { this.apiKeys = []; }
            },
            async createKey() {
                if(!this.newKey.key) return alert("请输入Key");
                try {
                    const res = await fetch('/admin/api/keys', { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken }, 
                        body: JSON.stringify(this.newKey) 
                    });
                    if(res.ok) {
                        alert("Key 添加成功");
                        this.showAddKeyModal = false;
                        this.newKey.key = '';
                        this.fetchKeys();
                    } else { alert("添加失败"); }
                } catch(e) { alert("请求失败"); }
            },
            async toggleKeyStatus(key) {
                try {
                    await fetch('/admin/api/keys/' + key.id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken },
                        body: JSON.stringify({ is_active: !key.is_active })
                    });
                    this.fetchKeys();
                } catch(e) { alert("更新状态失败"); }
            },
            async deleteKey(id) {
                if(!confirm("确定删除此 Key 吗？")) return;
                try {
                    await fetch('/admin/api/keys/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + this.adminToken } });
                    this.fetchKeys();
                } catch(e) { alert("删除失败"); }
            },

            // === Users ===
            async fetchUsers() { try { const res = await this.authedFetch('/admin/api/users'); this.users = Array.isArray(res) ? res : []; } catch (e) { this.users = []; } },
            async deleteUser(id) { if(!confirm('确定删除?')) return; try { await this.authedFetch('/admin/api/users/' + id, { method: 'DELETE' }); this.fetchUsers(); } catch (e) {} },
            async createUser() {
                if (!this.newUser.username || this.newUser.password.length < 6) return alert('格式错误: 密码需6位以上');
                try { 
                    const res = await fetch('/admin/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken }, body: JSON.stringify(this.newUser) }); 
                    if (res.ok) { alert('用户创建成功'); this.showAddUserModal = false; this.newUser={username:'',password:''}; this.fetchUsers(); } 
                    else { alert('创建失败'); }
                } catch (e) { alert('请求错误'); }
            },
            openResetPwd(user) { this.resetPwd = { id: user.id, username: user.username, newPassword: '' }; this.showResetPwdModal = true; },
            async submitResetPwd() {
                try { const res = await fetch('/admin/api/users/' + this.resetPwd.id + '/password', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken }, body: JSON.stringify({ password: this.resetPwd.newPassword }) }); if (res.ok) { alert('密码重置成功'); this.showResetPwdModal = false; } else { alert('失败'); } } catch (e) {}
            },
            async viewUserArchives(user) { 
                this.currentArchiveUser = user.username; 
                this.currentUserArchives = [];
                this.showArchivesModal = true; 
                try { 
                    const res = await this.authedFetch('/admin/api/users/' + user.id + '/archives'); 
                    this.currentUserArchives = res; 
                } catch(e) { console.error(e); } 
            },
            async viewArchiveDetail(id) { 
                this.showDetailModal = true; 
                this.detailLoading = true; 
                this.detailData = null;
                try { 
                    this.detailData = await this.authedFetch('/admin/api/archives/' + id); 
                } catch(e) {} finally { this.detailLoading = false; } 
            },

            // === Configs ===
            async fetchConfig() {
                try {
                    const res = await this.authedFetch('/admin/api/configs');
                    this.config.aiModelsJson = JSON.stringify(res.ai_models, null, 2);
                    this.config.parsedModels = res.ai_models || [];
                    this.config.defaultModel = res.default_model;
                } catch(e) { console.error(e); }
            },
            async saveAiModels() {
                try {
                    // Filter out empty rows
                    const validModels = this.config.parsedModels.filter(m => m.id && m.name);
                    const jsonStr = JSON.stringify(validModels);
                    
                    const res = await fetch('/admin/api/configs', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken },
                        body: JSON.stringify({ key: 'ai_models', value: jsonStr })
                    });
                    if (res.ok) { 
                        alert('模型列表已更新');
                        this.fetchConfig();
                    } else alert('更新失败');
                } catch(e) { alert('Error: ' + e.message); }
            },
            async saveDefaultModel() {
                try {
                     const res = await fetch('/admin/api/configs', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken },
                        body: JSON.stringify({ key: 'default_model', value: this.config.defaultModel })
                    });
                    if (res.ok) alert('默认模型已更新'); else alert('更新失败');
                } catch(e) { alert('更新失败'); }
            },

            // === Logs ===
            async fetchLogs() { try { const res = await this.authedFetch('/admin/api/logs'); this.logs = res; } catch (e) {} },
            toggleAutoRefresh() { 
                if (this.isAutoRefresh) { 
                    clearInterval(this.logInterval); 
                    this.logInterval = null; 
                    this.isAutoRefresh = false; 
                } else { 
                    this.isAutoRefresh = true; 
                    this.fetchLogs(); 
                    this.logInterval = setInterval(() => this.fetchLogs(), 2000); 
                } 
            },

            // Formatters
            formatDate(s) { 
                if(!s || s === '无数据') return s;
                try { return new Date(s).toLocaleString('zh-CN'); } catch(e) { return s; } 
            },
            formatTime(s) { 
                try { return new Date(s).toLocaleTimeString(); } catch(e) { return s; } 
            }
        }
    }
`;
