/**
 * 烟融小镇 - Cloudflare API 配置
 */

const CloudflareAPI = {
    // 你的 Cloudflare Worker URL（已部署）
    BASE_URL: 'https://yanrong-api.yanrong-test.workers.dev',
    
    // API 端点
    ENDPOINTS: {
        REGISTER: '/api/register',
        LOGIN: '/api/login',
        VERIFY: '/api/verify',
        LOGOUT: '/api/logout',
        USER: '/api/user',
        HEALTH: '/api/health'
    },
    
    // 本地存储的 Token 键名
    TOKEN_KEY: 'yanyu_cloudflare_token',
    
    // 保存 Token
    saveToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },
    
    // 获取 Token
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },
    
    // 清除 Token
    clearToken() {
        localStorage.removeItem(this.TOKEN_KEY);
    },
    
    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = this.BASE_URL + endpoint;
        const token = this.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // 如果有 token，添加到请求头
        if (token && options.auth !== false) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                method: options.method || 'POST',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            
            const data = await response.json();
            
            return {
                ok: response.ok,
                status: response.status,
                data
            };
        } catch (error) {
            console.error('API 请求失败:', error);
            return {
                ok: false,
                status: 0,
                data: { success: false, message: '网络请求失败: ' + error.message }
            };
        }
    },
    
    // 用户注册
    async register(username, password, email = '') {
        const result = await this.request(this.ENDPOINTS.REGISTER, {
                method: 'POST',
                body: { username, password, email: email || null }
            });
        
        return result;
    },
    
    // 用户登录
    async login(username, password) {
        const result = await this.request(this.ENDPOINTS.LOGIN, {
                method: 'POST',
                body: { username, password }
            });
        
        // 登录成功，保存 token
        if (result.ok && result.data.success) {
                this.saveToken(result.data.token);
            }
        
        return result;
    },
    
    // 验证 Token
    async verify() {
        const result = await this.request(this.ENDPOINTS.VERIFY, {
                method: 'GET'
            });
        
        return result;
    },
    
    // 退出登录
    async logout() {
        const result = await this.request(this.ENDPOINTS.LOGOUT, {
                method: 'POST'
            });
        
        // 清除本地 token
        this.clearToken();
        
        return result;
    },
    
    // 更新用户信息
    async updateUser(data) {
        const result = await this.request(this.ENDPOINTS.USER, {
            method: 'PUT',
            body: data
        });
        
        return result;
    },
    
    // 检查 API 健康状态
    async health() {
        const result = await this.request(this.ENDPOINTS.HEALTH, {
            method: 'GET',
            auth: false
            });
        
        return result;
    }
};

// 导出到全局
window.CloudflareAPI = CloudflareAPI;
