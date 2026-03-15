// ============================================
// FileDB - 使用 File System Access API 实现本地文件数据库
// ============================================

const FileDB = {
    // 文件句柄
    fileHandle: null,
    
    // 数据库文件名
    dbFileName: 'user.db',
    
    // 缓存的数据
    cachedData: null,
    
    // 是否已授权
    isAuthorized: false,
    
    // 初始化标志
    initPromise: null,

    // 初始化数据库（请求文件访问权限）
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initInternal();
        return this.initPromise;
    },

    async _initInternal() {
        try {
            // 检查浏览器是否支持 File System Access API
            if (!('showSaveFilePicker' in window)) {
                console.warn('浏览器不支持 File System Access API，将使用 localStorage 作为后备');
                return false;
            }

            // 尝试从 IndexedDB 恢复文件句柄
            const savedHandle = await this.loadFileHandle();
            
            if (savedHandle) {
                // 验证句柄是否仍然有效
                const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
                
                if (permission === 'granted') {
                    this.fileHandle = savedHandle;
                    this.isAuthorized = true;
                    console.log('已从缓存恢复数据库文件访问权限');
                    return true;
                } else if (permission === 'prompt') {
                    // 请求权限
                    const requestResult = await savedHandle.requestPermission({ mode: 'readwrite' });
                    if (requestResult === 'granted') {
                        this.fileHandle = savedHandle;
                        this.isAuthorized = true;
                        console.log('已获得数据库文件访问权限');
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            console.error('初始化数据库失败:', error);
            return false;
        }
    },

    // 请求用户选择/创建数据库文件
    async requestFileAccess() {
        try {
            if (!('showSaveFilePicker' in window)) {
                throw new Error('您的浏览器不支持本地文件存储功能，请使用最新版 Chrome/Edge 浏览器');
            }

            // 显示文件选择器
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: this.dbFileName,
                types: [{
                    description: '数据库文件',
                    accept: { 'application/json': ['.db'] }
                }]
            });

            // 保存句柄到 IndexedDB
            await this.saveFileHandle(this.fileHandle);
            
            this.isAuthorized = true;

            // 初始化空数据库
            const exists = await this.checkFileExists();
            if (!exists) {
                await this.saveDatabase({ users: [], lastUpdate: null });
            }

            console.log('数据库文件已创建/选择:', this.fileHandle.name);
            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('用户取消了文件选择');
                return false;
            }
            console.error('请求文件访问失败:', error);
            throw error;
        }
    },

    // 检查文件是否存在
    async checkFileExists() {
        if (!this.fileHandle) return false;
        try {
            await this.fileHandle.getFile();
            return true;
        } catch {
            return false;
        }
    },

    // 保存文件句柄到 IndexedDB
    async saveFileHandle(handle) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FileDBStorage', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction('handles', 'readwrite');
                const store = transaction.objectStore('handles');
                store.put(handle, 'userDbHandle');
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
        });
    },

    // 从 IndexedDB 加载文件句柄
    async loadFileHandle() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FileDBStorage', 1);
            
            request.onerror = () => resolve(null);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('handles')) {
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction('handles', 'readonly');
                const store = transaction.objectStore('handles');
                const getRequest = store.get('userDbHandle');
                
                getRequest.onsuccess = () => resolve(getRequest.result || null);
                getRequest.onerror = () => resolve(null);
            };
        });
    },

    // 读取数据库
    async getDatabase() {
        // 如果有缓存，先返回缓存
        if (this.cachedData) {
            return this.cachedData;
        }

        // 如果没有文件句柄，使用 localStorage 作为后备
        if (!this.fileHandle || !this.isAuthorized) {
            const localData = localStorage.getItem('user.db');
            return localData ? JSON.parse(localData) : { users: [], lastUpdate: null };
        }

        try {
            const file = await this.fileHandle.getFile();
            const text = await file.text();
            
            if (text && text.trim()) {
                this.cachedData = JSON.parse(text);
            } else {
                this.cachedData = { users: [], lastUpdate: null };
            }
            
            return this.cachedData;
        } catch (error) {
            console.error('读取数据库失败:', error);
            // 返回 localStorage 数据作为后备
            const localData = localStorage.getItem('user.db');
            return localData ? JSON.parse(localData) : { users: [], lastUpdate: null };
        }
    },

    // 保存数据库
    async saveDatabase(data) {
        // 更新缓存
        this.cachedData = data;
        
        // 同时保存到 localStorage 作为备份
        data.lastUpdate = new Date().toISOString();
        localStorage.setItem('user.db', JSON.stringify(data));

        // 如果已授权，保存到文件
        if (this.fileHandle && this.isAuthorized) {
            try {
                const writable = await this.fileHandle.createWritable();
                await writable.write(JSON.stringify(data, null, 2));
                await writable.close();
                console.log('数据已保存到本地文件');
            } catch (error) {
                console.error('保存到文件失败:', error);
            }
        }
    },

    // 获取所有用户
    async getUsers() {
        const db = await this.getDatabase();
        return db.users || [];
    },

    // 保存用户列表
    async saveUsers(users) {
        const db = await this.getDatabase();
        db.users = users;
        await this.saveDatabase(db);
    },

    // 注册用户
    async register(username, password, email = '') {
        const users = await this.getUsers();
        
        if (users.find(u => u.username === username)) {
            return { success: false, message: '用户名已存在' };
        }
        
        const newUser = {
            username,
            password,
            email,
            createTime: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
                emailNotifications: true,
                aiAssistant: true
            },
            loginHistory: []
        };
        
        users.push(newUser);
        await this.saveUsers(users);
        
        return { success: true, message: '注册成功' };
    },

    // 用户登录
    async login(username, password) {
        const users = await this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // 更新最后登录时间
            user.lastLogin = new Date().toISOString();
            
            // 添加登录记录
            const loginRecord = {
                time: new Date().toISOString(),
                device: this.getDeviceInfo(),
                ip: '本地访问'
            };
            
            if (!user.loginHistory) user.loginHistory = [];
            user.loginHistory.unshift(loginRecord);
            
            // 保留最近20条记录
            if (user.loginHistory.length > 20) {
                user.loginHistory = user.loginHistory.slice(0, 20);
            }
            
            await this.saveUsers(users);
            
            return { success: true, user: JSON.parse(JSON.stringify(user)) };
        }
        
        return { success: false, message: '用户名或密码错误' };
    },

    // 更新用户信息
    async updateUser(username, data) {
        const users = await this.getUsers();
        const index = users.findIndex(u => u.username === username);
        
        if (index !== -1) {
            users[index] = { ...users[index], ...data, lastUpdate: new Date().toISOString() };
            await this.saveUsers(users);
            return { success: true, user: users[index] };
        }
        
        return { success: false, message: '用户不存在' };
    },

    // 获取用户信息
    async getUser(username) {
        const users = await this.getUsers();
        return users.find(u => u.username === username);
    },

    // 获取设备信息
    getDeviceInfo() {
        const ua = navigator.userAgent;
        let device = '未知设备';
        let browser = '未知浏览器';
        
        if (ua.indexOf('Windows') > -1) device = 'Windows PC';
        else if (ua.indexOf('Mac') > -1) device = 'Mac';
        else if (ua.indexOf('Linux') > -1) device = 'Linux';
        else if (ua.indexOf('Android') > -1) device = 'Android';
        else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1) device = 'iPhone';
        else if (ua.indexOf('iPad') > -1) device = 'iPad';
        
        if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
        else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
        else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
        else if (ua.indexOf('Edge') > -1) browser = 'Edge';
        
        return `${device} - ${browser}`;
    },

    // 检查是否需要初始化
    needsInit() {
        return !this.isAuthorized;
    },

    // 获取数据库状态信息
    async getStatus() {
        if (!this.fileHandle) {
            return {
                authorized: false,
                fileName: null,
                userCount: 0,
                lastUpdate: null
            };
        }

        try {
            const db = await this.getDatabase();
            return {
                authorized: this.isAuthorized,
                fileName: this.fileHandle.name,
                userCount: db.users ? db.users.length : 0,
                lastUpdate: db.lastUpdate
            };
        } catch {
            return {
                authorized: this.isAuthorized,
                fileName: this.fileHandle ? this.fileHandle.name : null,
                userCount: 0,
                lastUpdate: null
            };
        }
    },

    // 导出数据到新文件
    async exportToNewFile() {
        try {
            const db = await this.getDatabase();
            const jsonStr = JSON.stringify(db, null, 2);
            
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = this.dbFileName;
            a.click();
            
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('导出失败:', error);
            return false;
        }
    },

    // 从文件导入数据
    async importFromFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.users || !Array.isArray(data.users)) {
                throw new Error('无效的数据库文件格式');
            }
            
            await this.saveDatabase(data);
            return { success: true, message: `成功导入 ${data.users.length} 个用户` };
        } catch (error) {
            return { success: false, message: '导入失败: ' + error.message };
        }
    }
};

// 导出到全局
window.FileDB = FileDB;
