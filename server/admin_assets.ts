
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
            stats: { totalUsers: 0, totalArchives: 0, totalCards: 0, totalProjects: 0, lastActiveTime: '' },
            users: [],
            logs: [],
            
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
            detailTab: 'settings', // settings, history, raw
            
            // API Tester State
            selectedApiEndpoint: '',
            apiLoading: false,
            apiRequest: { method: 'GET', url: '/api/config/pool', headers: '{\\n  "Content-Type": "application/json"\\n}', body: '' },
            apiResponse: null,
            
            // Logs State
            logSearch: '',
            logLevelFilter: '',
            logInterval: null,
            isAutoRefresh: false,

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
                // Clear interval when leaving logs tab
                if (tab !== 'logs' && this.logInterval) { 
                    clearInterval(this.logInterval); 
                    this.logInterval = null; 
                    this.isAutoRefresh = false; 
                }
                
                if (tab === 'dashboard') this.fetchStats();
                if (tab === 'users') this.fetchUsers();
                if (tab === 'logs') { 
                    this.fetchLogs(); 
                    // Auto enable refresh for logs
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
                    this.stats = res || { totalUsers: 0, totalArchives: 0, totalCards: 0, totalProjects: 0, lastActiveTime: '' }; 
                } catch (e) { console.error(e); } 
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

            // === API Tester ===
            loadApiTemplate() {
                const t = this.selectedApiEndpoint; 
                const h = '{\\n  "Content-Type": "application/json"\\n}';
                
                if (t === 'pool') {
                    this.apiRequest = { method: 'GET', url: '/api/config/pool', headers: h, body: '' };
                } else if (t === 'users') {
                    this.apiRequest = { method: 'GET', url: '/admin/api/users', headers: h, body: '' };
                } else if (t === 'stats') {
                    this.apiRequest = { method: 'GET', url: '/admin/api/stats', headers: h, body: '' };
                } else if (t === 'generate_idea') {
                    this.apiRequest = { 
                        method: 'POST', 
                        url: '/api/generate', 
                        headers: h, 
                        body: JSON.stringify({
                            step: 'idea',
                            settings: { genre: 'Test', trope: 'Test', protagonistType: 'Test', goldenFinger: 'Test', tone: 'Test', pacing: 'fast', targetAudience: 'male' }
                        }, null, 2)
                    };
                }
            },
            async sendApiRequest() {
                this.apiLoading = true; 
                this.apiResponse = null;
                const start = Date.now();
                
                // 自动注入 Admin Token (如果是请求 admin 接口且未提供 auth)
                let headersObj = {};
                try { headersObj = JSON.parse(this.apiRequest.headers || '{}'); } catch(e) {}
                
                if (this.apiRequest.url.includes('/admin/api/') && !headersObj['Authorization']) {
                    headersObj['Authorization'] = 'Bearer ' + this.adminToken;
                }
                
                try {
                    const opts = { 
                        method: this.apiRequest.method, 
                        headers: headersObj, 
                        body: ['POST','PUT'].includes(this.apiRequest.method) ? this.apiRequest.body : undefined 
                    };
                    const res = await fetch(this.apiRequest.url, opts);
                    const text = await res.text();
                    
                    // 尝试格式化 JSON
                    let displayBody = text;
                    try { displayBody = JSON.stringify(JSON.parse(text), null, 2); } catch(e) {}

                    this.apiResponse = { 
                        status: res.status, 
                        time: Date.now() - start, 
                        body: displayBody 
                    };
                } catch (e) { 
                    this.apiResponse = { status: 0, time: 0, body: e.message }; 
                } finally { 
                    this.apiLoading = false; 
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
