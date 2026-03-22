const FileDB = {
    fileHandle: null,
    dbFileName: 'user.db',
    cachedData: null,
    isAuthorized: false,
    initPromise: null,
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = this._initInternal();
        return this.initPromise;
    },
    async _initInternal() {
        try {
            if (!('showSaveFilePicker' in window)) {
                console.warn('浏览器不支持 File System Access API，将使用 localStorage 作为后备');
                return false;
            }
            const savedHandle = await this.loadFileHandle();
            if (savedHandle) {
                const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    this.fileHandle = savedHandle;
                    this.isAuthorized = true;
                    console.log('已从缓存恢复数据库文件访问权�?);
                    return true;
                } else if (permission === 'prompt') {
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
    async requestFileAccess() {
        try {
            if (!('showSaveFilePicker' in window)) {
                throw new Error('您的浏览器不支持本地文件存储功能，请使用最新版 Chrome/Edge 浏览�?);
            }
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: this.dbFileName,
                types: [{
                    description: '数据库文�?,
                    accept: { 'application/json': ['.db'] }
                }]
            });
            await this.saveFileHandle(this.fileHandle);
            this.isAuthorized = true;
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
    async checkFileExists() {
        if (!this.fileHandle) return false;
        try {
            await this.fileHandle.getFile();
            return true;
        } catch {
            return false;
        }
    },
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
    async getDatabase() {
        if (this.cachedData) {
            return this.cachedData;
        }
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
            console.error('读取数据库失�?', error);
            const localData = localStorage.getItem('user.db');
            return localData ? JSON.parse(localData) : { users: [], lastUpdate: null };
        }
    },
    async saveDatabase(data) {
        this.cachedData = data;
        data.lastUpdate = new Date().toISOString();
        localStorage.setItem('user.db', JSON.stringify(data));
        if (this.fileHandle && this.isAuthorized) {
            try {
                const writable = await this.fileHandle.createWritable();
                await writable.write(JSON.stringify(data, null, 2));
                await writable.close();
                console.log('数据已保存到本地文件');
            } catch (error) {
                console.error('保存到文件失�?', error);
            }
        }
    },
    async getUsers() {
        const db = await this.getDatabase();
        return db.users || [];
    },
    async saveUsers(users) {
        const db = await this.getDatabase();
        db.users = users;
        await this.saveDatabase(db);
    },
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
    async login(username, password) {
        const users = await this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            user.lastLogin = new Date().toISOString();
            const loginRecord = {
                time: new Date().toISOString(),
                device: this.getDeviceInfo(),
                ip: '本地访问'
            };
            if (!user.loginHistory) user.loginHistory = [];
            user.loginHistory.unshift(loginRecord);
            if (user.loginHistory.length > 20) {
                user.loginHistory = user.loginHistory.slice(0, 20);
            }
            await this.saveUsers(users);
            return { success: true, user: JSON.parse(JSON.stringify(user)) };
        }
        return { success: false, message: '用户名或密码错误' };
    },
    async updateUser(username, data) {
        const users = await this.getUsers();
        const index = users.findIndex(u => u.username === username);
        if (index !== -1) {
            users[index] = { ...users[index], ...data, lastUpdate: new Date().toISOString() };
            await this.saveUsers(users);
            return { success: true, user: users[index] };
        }
        return { success: false, message: '用户不存�? };
    },
    async getUser(username) {
        const users = await this.getUsers();
        return users.find(u => u.username === username);
    },
    getDeviceInfo() {
        const ua = navigator.userAgent;
        let device = '未知设备';
        let browser = '未知浏览�?;
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
    needsInit() {
        return !this.isAuthorized;
    },
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
window.FileDB = FileDB;