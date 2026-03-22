const CloudflareAPI = {
    BASE_URL: 'https://yanrong-api.yanrong-test.workers.dev',
    ENDPOINTS: {
        REGISTER: '/api/register',
        LOGIN: '/api/login',
        VERIFY: '/api/verify',
        LOGOUT: '/api/logout',
        USER: '/api/user',
        HEALTH: '/api/health'
    },
    TOKEN_KEY: 'yanyu_cloudflare_token',
    saveToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },
    clearToken() {
        localStorage.removeItem(this.TOKEN_KEY);
    },
    async request(endpoint, options = {}) {
        const url = this.BASE_URL + endpoint;
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
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
    async register(username, password, email = '') {
        const result = await this.request(this.ENDPOINTS.REGISTER, {
                method: 'POST',
                body: { username, password, email: email || null }
            });
        return result;
    },
    async login(username, password) {
        const result = await this.request(this.ENDPOINTS.LOGIN, {
                method: 'POST',
                body: { username, password }
            });
        if (result.ok && result.data.success) {
                this.saveToken(result.data.token);
            }
        return result;
    },
    async verify() {
        const result = await this.request(this.ENDPOINTS.VERIFY, {
                method: 'GET'
            });
        return result;
    },
    async logout() {
        const result = await this.request(this.ENDPOINTS.LOGOUT, {
                method: 'POST'
            });
        this.clearToken();
        return result;
    },
    async updateUser(data) {
        const result = await this.request(this.ENDPOINTS.USER, {
            method: 'PUT',
            body: data
        });
        return result;
    },
    async health() {
        const result = await this.request(this.ENDPOINTS.HEALTH, {
            method: 'GET',
            auth: false
            });
        return result;
    }
};
window.CloudflareAPI = CloudflareAPI;