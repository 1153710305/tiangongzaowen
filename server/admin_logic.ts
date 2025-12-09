/**
 * 后台管理界面 JavaScript 逻辑组件
 */

export const APILAB_LOGIC = `
    // 扩展 AdminApp 逻辑以支持 API 实验室
    const originalAdminApp = adminApp;
    adminApp = function() {
        const app = originalAdminApp(); // 获取原始对象
        
        // 直接扩展对象属性，保留原对象的 getter/setter
        app.apiRegistry = API_REGISTRY;
        app.apiCategories = API_CATEGORIES;
        app.apiLab = {
            currentApi: null,
            targetUserId: '',
            requestUrl: '',
            requestBody: '',
            responseBody: '',
            responseStatus: 0,
            responseTime: 0,
            responseSize: '0 B',
            isLoading: false,
            // 新增过滤器
            searchQuery: '',
            categoryFilter: '',
            authFilter: ''
        };

        // 计算属性：过滤后的 API 列表
        Object.defineProperty(app, 'filteredApis', {
            get() {
                let apis = this.apiRegistry || [];
                
                // 搜索过滤
                if (this.apiLab.searchQuery) {
                    const query = this.apiLab.searchQuery.toLowerCase();
                    apis = apis.filter(api => 
                        api.name.toLowerCase().includes(query) || 
                        api.url.toLowerCase().includes(query) ||
                        api.description.toLowerCase().includes(query)
                    );
                }
                
                // 分类过滤
                if (this.apiLab.categoryFilter) {
                    apis = apis.filter(api => api.category === this.apiLab.categoryFilter);
                }
                
                // 认证过滤
                if (this.apiLab.authFilter === 'public') {
                    apis = apis.filter(api => !api.requiresAuth);
                } else if (this.apiLab.authFilter === 'auth') {
                    apis = apis.filter(api => api.requiresAuth && !api.requiresAdmin);
                } else if (this.apiLab.authFilter === 'admin') {
                    apis = apis.filter(api => api.requiresAdmin);
                }
                
                return apis;
            },
            enumerable: true,
            configurable: true
        });

        // 扩展 init
        const originalInit = app.init;
        app.init = function() {
             // 保持 this 上下文
             if (originalInit) originalInit.call(this);
             
             const token = localStorage.getItem('skycraft_admin_token');
             if (token) { 
                 this.adminToken = token; 
                 this.isAuthenticated = true; 
                 this.fetchStats(); 
                 this.fetchUsers(); // API Lab 需要用户列表
             }
        };

        app.selectApi = function(api) {
            this.apiLab.currentApi = api;
            this.apiLab.requestUrl = api.url;
            this.apiLab.requestBody = JSON.stringify(api.exampleBody, null, 2);
            this.apiLab.responseBody = '';
            this.apiLab.responseStatus = 0;
            this.apiLab.responseTime = 0;
            this.apiLab.responseSize = '0 B';
        };

        app.loadApiExample = function() {
            if (this.apiLab.currentApi) {
                this.apiLab.requestUrl = this.apiLab.currentApi.url;
                this.apiLab.requestBody = JSON.stringify(this.apiLab.currentApi.exampleBody, null, 2);
            }
        };

        app.testApi = async function() {
            if (!this.apiLab.currentApi) {
                return alert("请先选择一个 API");
            }
            
            // 检查是否需要认证
            if (this.apiLab.currentApi.requiresAuth && !this.apiLab.targetUserId) {
                return alert("此 API 需要认证，请先选择一个模拟用户");
            }

            this.apiLab.isLoading = true;
            this.apiLab.responseBody = '';
            
            try {
                let userToken = null;
                
                // 如果需要认证，获取模拟 Token
                if (this.apiLab.currentApi.requiresAuth) {
                    const tokenRes = await fetch('/admin/api/users/' + this.apiLab.targetUserId + '/impersonate', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + this.adminToken }
                    });
                    
                    if (!tokenRes.ok) throw new Error("无法获取用户授权");
                    const tokenData = await tokenRes.json();
                    userToken = tokenData.token;
                }

                // 发起实际请求
                const startTime = performance.now();
                const options = {
                    method: this.apiLab.currentApi.method,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                
                // 添加认证头
                if (userToken) {
                    options.headers['Authorization'] = 'Bearer ' + userToken;
                } else if (this.apiLab.currentApi.requiresAdmin) {
                    options.headers['Authorization'] = 'Bearer ' + this.adminToken;
                }
                
                // 添加请求体（GET 和 HEAD 不需要）
                if (this.apiLab.currentApi.method !== 'GET' && this.apiLab.currentApi.method !== 'HEAD') {
                    options.body = this.apiLab.requestBody;
                }

                const res = await fetch(this.apiLab.requestUrl, options);
                const endTime = performance.now();
                
                this.apiLab.responseStatus = res.status;
                this.apiLab.responseTime = Math.round(endTime - startTime);

                // 处理响应内容
                const contentType = res.headers.get('content-type');
                let size = 0;

                if (contentType && contentType.includes('application/json')) {
                    const json = await res.json();
                    const jsonStr = JSON.stringify(json, null, 2);
                    this.apiLab.responseBody = jsonStr;
                    size = new Blob([jsonStr]).size;
                } else {
                    // 文本或流式文本
                    const text = await res.text();
                    this.apiLab.responseBody = text;
                    size = new Blob([text]).size;
                }

                // 计算大小
                this.apiLab.responseSize = size > 1024 ? (size/1024).toFixed(2) + ' KB' : size + ' B';

            } catch (e) {
                this.apiLab.responseBody = '❌ 请求失败: ' + e.message;
                this.apiLab.responseStatus = 0;
            } finally {
                this.apiLab.isLoading = false;
            }
        };

        return app;
    };
`;
