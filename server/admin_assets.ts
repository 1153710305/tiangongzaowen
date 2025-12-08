
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
            messages: [],
            announcements: [],
            
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
            
            // Edit User Modal (New)
            showEditUserModal: false,
            editUserData: { id: '', username: '', tokens: 0, vip_expiry: '' },

            // Announcement Modal
            showAnnouncementModal: false,
            annForm: { id: null, title: '', content: '', is_published: true },
            
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
                parsedModels: [], 
                defaultModel: '',
                productPlansJson: '[]',
                initialTokens: 1000
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
                if (tab === 'messages') this.fetchMessages();
                if (tab === 'announcements') this.fetchAnnouncements();
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

            // === Messages ===
            async fetchMessages() {
                try {
                    const res = await this.authedFetch('/admin/api/messages');
                    this.messages = Array.isArray(res) ? res.map(m => ({...m, newReply: ''})) : [];
                } catch(e) { this.messages = []; }
            },
            async replyMessage(msg) {
                if(!msg.newReply) return alert("请输入内容");
                try {
                    const res = await fetch('/admin/api/messages/'+msg.id+'/reply', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken },
                        body: JSON.stringify({ reply: msg.newReply })
                    });
                    if(res.ok) { alert("回复成功"); this.fetchMessages(); } else alert("失败");
                } catch(e){ alert("错误"); }
            },

            // === Announcements ===
            async fetchAnnouncements() {
                try { this.announcements = await this.authedFetch('/admin/api/announcements') || []; } catch(e) { this.announcements=[]; }
            },
            openAnnouncementModal() { this.annForm = { id: null, title: '', content: '', is_published: true }; this.showAnnouncementModal = true; },
            editAnnouncement(ann) { this.annForm = { ...ann, is_published: !!ann.is_published }; this.showAnnouncementModal = true; },
            async saveAnnouncement() {
                if(!this.annForm.title) return alert("请输入标题");
                const method = this.annForm.id ? 'PUT' : 'POST';
                const url = this.annForm.id ? '/admin/api/announcements/'+this.annForm.id : '/admin/api/announcements';
                try {
                    const res = await fetch(url, {
                         method, headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken},
                         body: JSON.stringify(this.annForm)
                    });
                    if(res.ok) { this.showAnnouncementModal=false; this.fetchAnnouncements(); } else alert("失败");
                } catch(e){ alert("Error"); }
            },
            async deleteAnnouncement(id) {
                if(!confirm("删除?")) return;
                try { await this.authedFetch('/admin/api/announcements/'+id, {method:'DELETE'}); this.fetchAnnouncements(); } catch(e){}
            },

            // === Keys ===
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
            
            // Edit User (Tokens & VIP)
            editUser(user) {
                this.editUserData = {
                    id: user.id,
                    username: user.username,
                    tokens: user.tokens,
                    vip_expiry: user.vip_expiry || ''
                };
                this.showEditUserModal = true;
            },
            setVipDays(days) {
                const now = new Date();
                const current = this.editUserData.vip_expiry ? new Date(this.editUserData.vip_expiry) : new Date();
                const base = current > now ? current : now;
                base.setDate(base.getDate() + days);
                this.editUserData.vip_expiry = base.toISOString();
            },
            async saveUserChanges() {
                try {
                    const res = await fetch('/admin/api/users/' + this.editUserData.id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken },
                        body: JSON.stringify({ 
                            tokens: parseInt(this.editUserData.tokens),
                            vip_expiry: this.editUserData.vip_expiry || null
                        })
                    });
                    if (res.ok) {
                        alert('更新成功');
                        this.showEditUserModal = false;
                        this.fetchUsers();
                    } else alert('更新失败');
                } catch(e) { alert('请求失败'); }
            },

            // === Configs ===
            async fetchConfig() {
                try {
                    const res = await this.authedFetch('/admin/api/configs');
                    this.config.aiModelsJson = JSON.stringify(res.ai_models, null, 2);
                    this.config.parsedModels = res.ai_models || [];
                    this.config.defaultModel = res.default_model;
                    this.config.productPlansJson = JSON.stringify(res.product_plans, null, 2);
                    this.config.initialTokens = res.initial_user_tokens || 1000;
                } catch(e) { console.error(e); }
            },
            async saveAiModels() {
                try {
                    const validModels = this.config.parsedModels.filter(m => m.id && m.name);
                    const jsonStr = JSON.stringify(validModels);
                    const res = await fetch('/admin/api/configs', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken }, body: JSON.stringify({ key: 'ai_models', value: jsonStr }) });
                    if (res.ok) { alert('模型列表已更新'); this.fetchConfig(); } else alert('更新失败');
                } catch(e) { alert('Error: ' + e.message); }
            },
            async saveProductPlans() {
                 try {
                    // Validate JSON
                    const parsed = JSON.parse(this.config.productPlansJson);
                    const res = await fetch('/admin/api/configs', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken }, body: JSON.stringify({ key: 'product_plans', value: JSON.stringify(parsed) }) });
                    if (res.ok) { alert('商品配置已保存'); this.fetchConfig(); } else alert('更新失败');
                } catch(e) { alert('JSON 格式错误: ' + e.message); }
            },
            async saveInitialTokens() {
                try {
                    const res = await fetch('/admin/api/configs', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken }, body: JSON.stringify({ key: 'initial_user_tokens', value: String(this.config.initialTokens) }) });
                    if (res.ok) { alert('初始代币配置已保存'); } else alert('更新失败');
                } catch(e) { alert('Error'); }
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
                if(!s || s === '无数据') return '';
                try { return new Date(s).toLocaleString('zh-CN'); } catch(e) { return s; } 
            },
            formatTime(s) { 
                try { return new Date(s).toLocaleTimeString(); } catch(e) { return s; } 
            }
        }
    }
`;
