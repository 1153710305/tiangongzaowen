
/**
 * Admin UI Static Assets (CSS & JS)
 */

export const ADMIN_STYLES = `
    [x-cloak] { display: none !important; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #1e293b; }
    ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    pre.code-block { font-family: 'Menlo', 'Monaco', 'Courier New', monospace; }
    .prose-preview h1 { font-size: 1.25em; font-weight: bold; margin-bottom: 0.5em; color: #e2e8f0; }
    .prose-preview h2 { font-size: 1.1em; font-weight: bold; margin-bottom: 0.4em; color: #cbd5e1; }
    .prose-preview p { margin-bottom: 0.8em; line-height: 1.6; }
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
            stats: { totalUsers: 0, totalArchives: 0, lastActiveTime: '' },
            users: [],
            logs: [],
            showAddUserModal: false,
            newUser: { username: '', password: '' },
            showResetPwdModal: false,
            resetPwd: { id: '', username: '', newPassword: '' },
            showArchivesModal: false,
            currentArchiveUser: '',
            currentUserArchives: [],
            showDetailModal: false,
            detailLoading: false,
            detailData: null,
            detailTab: 'settings',
            selectedApiEndpoint: '',
            apiLoading: false,
            apiRequest: { method: 'GET', url: '/api/config/pool', headers: '{\\n  "Content-Type": "application/json"\\n}', body: '' },
            apiResponse: null,
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
                if (token) { this.adminToken = token; this.isAuthenticated = true; this.fetchStats(); }
            },
            switchTab(tab) {
                this.currentTab = tab;
                if (this.logInterval) { clearInterval(this.logInterval); this.logInterval = null; this.isAutoRefresh = false; }
                if (tab === 'dashboard') this.fetchStats();
                if (tab === 'users') this.fetchUsers();
                if (tab === 'logs') { this.fetchLogs(); this.toggleAutoRefresh(); }
            },
            async login() {
                this.isLoading = true; this.loginError = '';
                try {
                    const res = await fetch('/admin/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: this.password }) });
                    const data = await res.json();
                    if (res.ok) { this.adminToken = data.token; localStorage.setItem('skycraft_admin_token', data.token); this.isAuthenticated = true; this.password = ''; this.fetchStats(); } else { this.loginError = data.error || '验证失败'; }
                } catch (e) { this.loginError = '连接服务器失败'; } finally { this.isLoading = false; }
            },
            logout() { this.isAuthenticated = false; this.adminToken = ''; localStorage.removeItem('skycraft_admin_token'); if (this.logInterval) clearInterval(this.logInterval); },
            async authedFetch(url, options = {}) {
                const headers = { ...options.headers, 'Authorization': 'Bearer ' + this.adminToken };
                const res = await fetch(url, { ...options, headers });
                if (res.status === 401) { this.logout(); throw new Error('Unauthorized'); }
                return res.json();
            },
            async fetchStats() { try { const res = await this.authedFetch('/admin/api/stats'); this.stats = res || {}; } catch (e) { this.stats = {}; } },
            async fetchUsers() { try { const res = await this.authedFetch('/admin/api/users'); this.users = Array.isArray(res) ? res : []; } catch (e) { this.users = []; } },
            async deleteUser(id) { if(!confirm('确定删除?')) return; try { await this.authedFetch('/admin/api/users/' + id, { method: 'DELETE' }); this.fetchUsers(); } catch (e) {} },
            async createUser() {
                if (!this.newUser.username || this.newUser.password.length < 6) return alert('格式错误');
                try { const res = await fetch('/admin/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken }, body: JSON.stringify(this.newUser) }); if (res.ok) { alert('成功'); this.showAddUserModal = false; this.fetchUsers(); } } catch (e) {}
            },
            openResetPwd(user) { this.resetPwd = { id: user.id, username: user.username, newPassword: '' }; this.showResetPwdModal = true; },
            async submitResetPwd() {
                try { const res = await fetch('/admin/api/users/' + this.resetPwd.id + '/password', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.adminToken }, body: JSON.stringify({ password: this.resetPwd.newPassword }) }); if (res.ok) { alert('成功'); this.showResetPwdModal = false; } } catch (e) {}
            },
            async viewUserArchives(user) { this.currentArchiveUser = user.username; this.showArchivesModal = true; try { const res = await this.authedFetch('/admin/api/users/' + user.id + '/archives'); this.currentUserArchives = res; } catch(e) {} },
            async viewArchiveDetail(id) { this.showDetailModal = true; this.detailLoading = true; try { this.detailData = await this.authedFetch('/admin/api/archives/' + id); } catch(e) {} finally { this.detailLoading = false; } },
            async fetchLogs() { try { const res = await this.authedFetch('/admin/api/logs'); this.logs = res; } catch (e) {} },
            toggleAutoRefresh() { if (this.isAutoRefresh) { clearInterval(this.logInterval); this.logInterval = null; this.isAutoRefresh = false; } else { this.isAutoRefresh = true; this.fetchLogs(); this.logInterval = setInterval(() => this.fetchLogs(), 2000); } },
            loadApiTemplate() {
                const t = this.selectedApiEndpoint; const h = '{\\n  "Content-Type": "application/json"\\n}';
                if (t === 'login') this.apiRequest = { method: 'POST', url: '/api/auth/login', headers: h, body: '{\\n  "username": "admin",\\n  "password": "password"\\n}' };
                else if (t === 'generate') this.apiRequest = { method: 'POST', url: '/api/generate', headers: h, body: '{\\n  "step": "idea",\\n  "settings": {}\\n}' };
                else if (t === 'pool') this.apiRequest = { method: 'GET', url: '/api/config/pool', headers: h, body: '' };
            },
            async sendApiRequest() {
                this.apiLoading = true; const start = Date.now();
                try {
                    const opts = { method: this.apiRequest.method, headers: JSON.parse(this.apiRequest.headers || '{}'), body: ['POST','PUT'].includes(this.apiRequest.method) ? this.apiRequest.body : undefined };
                    const res = await fetch(this.apiRequest.url, opts);
                    const text = await res.text();
                    this.apiResponse = { status: res.status, time: Date.now() - start, body: text, tokens: Math.ceil(text.length/4) };
                } catch (e) { this.apiResponse = { body: e.message }; } finally { this.apiLoading = false; }
            },
            formatDate(s) { try { return new Date(s).toLocaleString('zh-CN'); } catch(e) { return s; } },
            formatTime(s) { try { return new Date(s).toLocaleTimeString(); } catch(e) { return s; } }
        }
    }
`;
