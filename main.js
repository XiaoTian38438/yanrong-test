const AppState = {
    isLoggedIn: false,
    currentUser: null,
    bgIndex: 0,
    aiEnabled: true,
    serverHost: 'yanyu.18mc.cc',
    serverPort: 25565
};
const UserSystem = {
    async register(username, password, email = '') {
        try {
            if (typeof CloudflareAPI !== 'undefined') {
                const result = await CloudflareAPI.register(username, password, email);
                if (result.ok && result.data.success) {
                    return {
                        success: true,
                        message: result.data.message,
                        user: result.data.user
                    };
                } else {
                    return {
                        success: false,
                        message: result.data.message || '注册失败'
                    };
                }
            }
        } catch (error) {
            console.warn('云端注册失败，回退到本地存�?', error);
        }
        return await FileDB.register(username, password, email);
    },
    async login(username, password) {
        try {
            if (typeof CloudflareAPI !== 'undefined') {
                const result = await CloudflareAPI.login(username, password);
                if (result.ok && result.data.success) {
                    localStorage.setItem('yanyu_cloud_token', result.data.token);
                    return {
                        success: true,
                        message: result.data.message,
                        user: result.data.user
                    };
                } else {
                    return {
                        success: false,
                        message: result.data.message || '登录失败'
                    };
                }
            }
        } catch (error) {
            console.warn('云端登录失败，回退到本地存�?', error);
        }
        return await FileDB.login(username, password);
    },
    async updateUser(username, data) {
        try {
            if (typeof CloudflareAPI !== 'undefined') {
                const result = await CloudflareAPI.updateUser(data);
                if (result.ok && result.data.success) {
                    return { success: true, user: { username, ...data } };
                }
            }
        } catch (error) {
            console.warn('云端更新失败，回退到本地存�?', error);
        }
        return await FileDB.updateUser(username, data);
    },
    async getUser(username) {
        try {
            if (typeof CloudflareAPI !== 'undefined') {
                const result = await CloudflareAPI.verify();
                if (result.ok && result.data.success) {
                    return result.data.user;
                }
            }
        } catch (error) {
            console.warn('云端验证失败，回退到本地存�?', error);
        }
        return await FileDB.getUser(username);
    },
    async logout() {
        try {
            if (typeof CloudflareAPI !== 'undefined') {
                await CloudflareAPI.logout();
            }
        } catch (error) {
            console.warn('云端退出失�?', error);
        }
        localStorage.removeItem('yanyu_cloud_token');
    },
    getDeviceInfo() {
        return FileDB.getDeviceInfo();
    },
    getClientIP() {
        return '本地访问';
    }
};
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
        success: '<i class="fas fa-check-circle" style="color:#3fb950"></i>',
        error: '<i class="fas fa-times-circle" style="color:#f85149"></i>',
        warning: '<i class="fas fa-exclamation-circle" style="color:#d29922"></i>',
        info: '<i class="fas fa-info-circle" style="color:#58a6ff"></i>'
    };
    toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
function initParticles() {
    const container = document.getElementById('bgParticles');
    if (!container) return;
    container.innerHTML = '';
    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('bg-particle');
        const size = Math.random() * 3 + 1.5;
        const x = Math.random() * 100;
        const duration = Math.random() * 10 + 15;
        const delay = Math.random() * 10;
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(255, 255, 255, ${Math.random() * 0.2 + 0.05});
            border-radius: 50%;
            left: ${x}%;
            bottom: -10px;
            animation: particleFloat ${duration}s ${delay}s linear infinite;
        `;
        container.appendChild(particle);
    }
    if (!document.getElementById('particleStyles')) {
        const style = document.createElement('style');
        style.id = 'particleStyles';
        style.textContent = `
            @keyframes particleFloat {
                0% { transform: translateY(0) scale(1); opacity: 0; }
                10% { opacity: 0.5; }
                90% { opacity: 0.3; }
                100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}
function initBackgroundSlideshow() {
    const slides = document.querySelectorAll('.bg-slide');
    if (slides.length === 0) return;
    const intervalTime = 8000;
    setInterval(() => {
        slides[AppState.bgIndex].classList.remove('active');
        AppState.bgIndex = (AppState.bgIndex + 1) % slides.length;
        slides[AppState.bgIndex].classList.add('active');
    }, intervalTime);
}
function handleLogin() {
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const remember = document.getElementById('remember')?.checked;
    if (!username || !password) {
        showToast('请输入用户名和密�?, 'warning');
        return;
    }
    showToast('正在登录...', 'info');
    UserSystem.login(username, password).then(result => {
        if (result.success) {
            AppState.isLoggedIn = true;
            AppState.currentUser = result.user;
            AppState.aiEnabled = result.user.preferences?.aiAssistant !== false;
            if (remember) {
                localStorage.setItem('yanyu_token', generateToken());
            }
            localStorage.setItem('yanyu_username', username);
            showToast(`欢迎回来, ${username}!`, 'success');
            setTimeout(() => {
                const redirectUrl = sessionStorage.getItem('redirectUrl');
                sessionStorage.removeItem('redirectUrl');
                window.location.href = redirectUrl || 'index.html';
            }, 1500);
        } else {
            showToast(result.message, 'error');
        }
    }).catch(error => {
        console.error('登录失败:', error);
        showToast('登录失败，请重试', 'error');
    });
}
function generateToken() {
    return 'token_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
}
function handleRegister() {
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const email = document.getElementById('email')?.value;
    if (!username || !password) {
        showToast('请填写完整信�?, 'warning');
        return;
    }
    if (username.length < 3 || username.length > 20) {
        showToast('用户名必须为3-20个字�?, 'warning');
        return;
    }
    if (password.length < 6) {
        showToast('密码至少需�?个字�?, 'warning');
        return;
    }
    if (password !== confirmPassword) {
        showToast('两次输入的密码不一�?, 'warning');
        return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showToast('用户名只能包含字母、数字和下划�?, 'warning');
        return;
    }
    showToast('正在注册...', 'info');
    UserSystem.register(username, password, email).then(result => {
        if (result.success) {
            showToast('注册成功！正在跳转登�?..', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showToast(result.message, 'error');
        }
    }).catch(error => {
        console.error('注册失败:', error);
        showToast('注册失败，请重试', 'error');
    });
}
function socialLogin(platform) {
    const platformNames = { qq: 'QQ', wechat: '微信', github: 'GitHub' };
    showToast(`${platformNames[platform]}登录功能开发中`, 'info');
}
async function checkAuth() {
    const token = localStorage.getItem('yanyu_token');
    const username = localStorage.getItem('yanyu_username');
    if (token && username) {
        const user = await UserSystem.getUser(username);
        if (user) {
            AppState.isLoggedIn = true;
            AppState.currentUser = user;
            AppState.aiEnabled = user.preferences?.aiAssistant !== false;
            return true;
        }
    }
    AppState.isLoggedIn = false;
    AppState.currentUser = null;
    return false;
}
async function requireAuth(redirectUrl = 'login.html') {
    const isAuthed = await checkAuth();
    if (!isAuthed) {
        sessionStorage.setItem('redirectUrl', window.location.href);
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}
function logout() {
    localStorage.removeItem('yanyu_token');
    localStorage.removeItem('yanyu_username');
    AppState.isLoggedIn = false;
    AppState.currentUser = null;
    showToast('已退出登�?, 'success');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}
function updateNavUI() {
    const navUser = document.querySelector('.nav-user');
    if (!navUser) return;
    if (AppState.isLoggedIn && AppState.currentUser) {
        const initial = AppState.currentUser.username.charAt(0).toUpperCase();
        navUser.innerHTML = `
            <div class="user-btn" onclick="toggleUserDropdown()">
                <div class="user-avatar">${initial}</div>
                <span class="user-name">${AppState.currentUser.username}</span>
                <i class="fas fa-chevron-down" style="font-size:0.75rem;margin-left:0.2rem;"></i>
            </div>
            <div class="user-dropdown" id="userDropdown">
                <div class="dropdown-header">
                    <div class="user-avatar" style="width:40px;height:40px;font-size:1rem;">${initial}</div>
                    <div>
                        <div class="dropdown-username">${AppState.currentUser.username}</div>
                        <div class="dropdown-email">${AppState.currentUser.email || '未设置邮�?}</div>
                    </div>
                </div>
                <div class="dropdown-menu">
                    <div class="dropdown-item" onclick="window.location.href='user.html'">
                        <i class="fas fa-cog"></i>
                        <span>账户设置</span>
                    </div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>退出登�?/span>
                    </div>
                </div>
            </div>
        `;
    } else {
        navUser.innerHTML = `
            <a href="login.html" class="login-btn">
                <i class="fas fa-user"></i>
                <span>登录</span>
            </a>
        `;
    }
}
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}
document.addEventListener('click', function(e) {
    const userBtn = document.querySelector('.user-btn');
    const dropdown = document.getElementById('userDropdown');
    if (userBtn && dropdown && !userBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});
const AIAssistant = {
    API_KEY: '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',
    MODEL: 'arcee-ai/trinity-large-preview:free',
    API_URL: 'https://openrouter.ai/api/v1/chat/completions',
    conversationHistory: [],
    isTyping: false,
    updateVisibility() {
        const btn = document.getElementById('aiFloatBtn');
        if (btn) {
            btn.classList.toggle('show', AppState.aiEnabled && !this.isPanelOpen());
        }
    },
    isPanelOpen() {
        const panel = document.getElementById('aiAssistant');
        return panel && panel.classList.contains('active');
    },
    togglePanel() {
        const panel = document.getElementById('aiAssistant');
        if (!panel) return;
        panel.classList.toggle('active');
        this.updateVisibility();
    },
    closePanel() {
        const panel = document.getElementById('aiAssistant');
        if (panel) panel.classList.remove('active');
        this.updateVisibility();
    },
    async sendMessage() {
        const input = document.getElementById('aiInput');
        const message = input.value.trim();
        if (!message || this.isTyping) return;
        this.addMessage(message, true);
        input.value = '';
        const thinkingMsgId = this.showThinking();
        try {
            const response = await this.callAPI(message);
            this.removeThinking(thinkingMsgId);
            await this.addMessageWithTypewriter(response);
        } catch (error) {
            this.removeThinking(thinkingMsgId);
            this.addMessage(`请求失败�?{error.message}`, false, true);
        }
    },
    showThinking() {
        const container = document.getElementById('aiMessages');
        if (!container) return null;
        const thinkingId = 'thinking_' + Date.now();
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'ai-message';
        thinkingDiv.id = thinkingId;
        thinkingDiv.innerHTML = `
            <div class="ai-avatar" style="width:28px;height:28px;font-size:0.85rem;flex-shrink:0;">
                <i class="fas fa-robot"></i>
            </div>
            <div class="msg-bubble thinking-bubble">
                <span class="thinking-text">思考中</span>
                <span class="thinking-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span>
            </div>
        `;
        container.appendChild(thinkingDiv);
        container.scrollTop = container.scrollHeight;
        return thinkingId;
    },
    removeThinking(id) {
        if (id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }
    },
    async addMessageWithTypewriter(content) {
        const container = document.getElementById('aiMessages');
        if (!container) return;
        this.isTyping = true;
        const msgDiv = document.createElement('div');
        msgDiv.className = 'ai-message';
        msgDiv.innerHTML = `
            <div class="ai-avatar" style="width:28px;height:28px;font-size:0.85rem;flex-shrink:0;">
                <i class="fas fa-robot"></i>
            </div>
            <div class="msg-bubble typewriter-text"></div>
        `;
        container.appendChild(msgDiv);
        const bubble = msgDiv.querySelector('.msg-bubble');
        const lines = content.split('\n');
        let displayText = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (let j = 0; j < line.length; j++) {
                displayText += line[j];
                bubble.innerHTML = this.formatResponse(displayText);
                container.scrollTop = container.scrollHeight;
                await this.sleep(20); // 打字速度 20ms
            }
            if (i < lines.length - 1) {
                displayText += '\n';
                bubble.innerHTML = this.formatResponse(displayText);
            }
        }
        this.conversationHistory.push({
            role: 'assistant',
            content: content
        });
        this.isTyping = false;
    },
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    clearHistory() {
        this.conversationHistory = [];
        showToast('对话已清�?, 'info');
    },
    async callAPI(userMessage) {
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });
        if (this.conversationHistory.length > 10) {
            this.conversationHistory = this.conversationHistory.slice(-10);
        }
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin || 'https://yanrong.app',
                    'X-Title': 'YanRong Town'
                },
                body: JSON.stringify({
                    model: this.MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: `你是烟融小镇的游戏小助理，这是一个《我的世界》Java版服务器工作室�?
【服务器信息�?
- 服务器名称：烟融小镇
- 游戏版本：Java�?1.8.8
- 服务器地址：yanyu.18mc.cc
【你的职责�?
1. 帮助玩家了解如何下载和安装《我的世界》Java�?
2. 指导玩家如何添加服务器并进入游戏
3. 解答游戏玩法相关问题，如生存技巧、建筑建议等
4. 介绍服务器特色功能和玩法
5. 帮助解决常见的游戏问题（如无法连接、版本不匹配等）
【回答风格�?
- 热情友好，像个贴心的游戏伙伴
- 回答简洁明了，重点突出
- 涉及操作步骤时，用数字列表清晰说�?
- 鼓励新玩家，让他们感受到社区的温�?
请用中文回答问题，保持专业但亲切的态度。`
                        },
                        ...this.conversationHistory
                    ],
                    max_tokens: 1024,
                    temperature: 0.7,
                    top_p: 0.95
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API错误: ${response.status}`);
            }
            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                console.log(`�?成功使用模型: ${this.MODEL}`);
                return data.choices[0].message.content;
            } else {
                throw new Error('无法解析API响应');
            }
        } catch (error) {
            this.conversationHistory.pop();
            console.error('AI API错误:', error);
            throw error;
        }
    },
    addMessage(content, isUser, isError = false) {
        const container = document.getElementById('aiMessages');
        if (!container) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ${isUser ? 'user' : ''}`;
        if (isUser) {
            msgDiv.innerHTML = `<div class="msg-bubble">${this.escapeHtml(content)}</div>`;
        } else {
            msgDiv.innerHTML = `
                <div class="ai-avatar" style="width:28px;height:28px;font-size:0.85rem;flex-shrink:0;">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="msg-bubble ${isError ? 'error' : ''}">${this.formatResponse(content)}</div>
            `;
        }
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    },
    formatResponse(text) {
        return text.replace(/\n/g, '<br>');
    },
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    handleKeypress(event) {
        if (event.key === 'Enter') this.sendMessage();
    },
    openAssistant() {
        this.togglePanel();
    }
};
async function initUserPage() {
    const isAuthed = await requireAuth('login.html');
    if (!isAuthed) return;
    const user = AppState.currentUser;
    if (!user) return;
    const profileUsername = document.getElementById('profileUsername');
    const profileEmail = document.getElementById('profileEmail');
    const editUsername = document.getElementById('editUsername');
    const editEmail = document.getElementById('editEmail');
    if (profileUsername) profileUsername.textContent = user.username;
    if (profileEmail) profileEmail.textContent = user.email || '未设�?;
    if (editUsername) editUsername.value = user.username;
    if (editEmail) editEmail.value = user.email || '';
    if (user.preferences) {
        const emailToggle = document.getElementById('toggleEmail');
        const aiToggle = document.getElementById('toggleAI');
        if (emailToggle) {
            emailToggle.checked = user.preferences.emailNotifications !== false;
        }
        if (aiToggle) {
            aiToggle.checked = user.preferences.aiAssistant !== false;
            AppState.aiEnabled = user.preferences.aiAssistant !== false;
        }
    }
    if (user.loginHistory && user.loginHistory.length > 0) {
        const historyContainer = document.getElementById('loginHistory');
        if (historyContainer) {
            historyContainer.innerHTML = user.loginHistory.slice(0, 10).map(item => `
                <div class="history-item">
                    <div class="history-device">
                        <div class="history-icon">
                            <i class="fas fa-desktop"></i>
                        </div>
                        <div>
                            <strong style="color:#c9d1d9;">${item.device}</strong>
                            <p style="color:#6e7681;font-size:0.75rem;">${item.ip || '未知IP'}</p>
                        </div>
                    </div>
                    <div class="history-time">
                        <strong>${formatDateTime(item.time)}</strong>
                    </div>
                </div>
            `).join('');
        }
    }
    initUserMenu();
}
function initUserMenu() {
    const menuItems = document.querySelectorAll('.user-menu-item');
    const sections = document.querySelectorAll('.user-section');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const target = this.dataset.target;
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === target) {
                    section.classList.add('active');
                }
            });
        });
    });
}
function formatDateTime(isoString) {
    try {
        const date = new Date(isoString);
        const dateStr = date.toLocaleDateString('zh-CN');
        const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} ${timeStr}`;
    } catch (e) {
        return '未知时间';
    }
}
function saveProfile() {
    const email = document.getElementById('editEmail')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const updateData = {
        email: email,
        lastUpdate: new Date().toISOString()
    };
    let passwordUpdated = false;
    if (newPassword && newPassword.length >= 6) {
        updateData.password = newPassword;
        passwordUpdated = true;
    }
    UserSystem.updateUser(AppState.currentUser.username, updateData).then(result => {
        if (result.success) {
            AppState.currentUser = result.user;
            if (passwordUpdated) {
                showToast('密码已更�?, 'success');
            } else {
                showToast('个人信息已保�?, 'success');
            }
            const profileEmail = document.getElementById('profileEmail');
            if (profileEmail) profileEmail.textContent = email || '未设�?;
            updateNavUI();
        } else {
            showToast('保存失败', 'error');
        }
    }).catch(error => {
        console.error('保存失败:', error);
        showToast('保存失败', 'error');
    });
}
function savePreferences() {
    const emailToggle = document.getElementById('toggleEmail');
    const aiToggle = document.getElementById('toggleAI');
    const preferences = {
        emailNotifications: emailToggle?.checked ?? true,
        aiAssistant: aiToggle?.checked ?? true
    };
    UserSystem.updateUser(AppState.currentUser.username, {
        preferences: preferences
    }).then(result => {
        if (result.success) {
            AppState.currentUser = result.user;
            AppState.aiEnabled = preferences.aiAssistant;
            AIAssistant.updateVisibility();
            showToast('偏好设置已保�?, 'success');
        } else {
            showToast('保存失败', 'error');
        }
    }).catch(error => {
        console.error('保存失败:', error);
        showToast('保存失败', 'error');
    });
}
const ServerStatus = {
    config: {
        name: '钻石大陆',
        host: 'yanyu.18mc.cc',
        port: 25565,
        apiUrl: 'https://api.mcsrvstat.us/2/'
    },
    async getStatus() {
        try {
            const apiUrl = `${this.config.apiUrl}${this.config.host}`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn('API调用失败:', error.message);
            return {
                online: false,
                ip: this.config.host,
                port: this.config.port,
                error: error.message
            };
        }
    },
    async updateUI() {
        try {
            const status = await this.getStatus();
            const versionEl = document.getElementById('serverVersion');
            if (versionEl) {
                versionEl.textContent = status.version || '1.20.1';
            }
            const onlineEl = document.getElementById('serverOnline');
            if (onlineEl) {
                const isOnline = status.online !== false;
                const online = status.players?.online ?? 0;
                const max = status.players?.max ?? 20;
                onlineEl.innerHTML = `<span class="${isOnline ? 'online' : 'offline'}">
                    ${isOnline ? '<i class="fas fa-check-circle"></i> 在线' : '<i class="fas fa-times-circle"></i> 离线'}
                </span>`;
                const playersEl = document.getElementById('serverPlayers');
                if (playersEl) {
                    playersEl.innerHTML = `<span class="${isOnline ? 'online' : 'offline'}">${online} / ${max}</span>`;
                }
                const playersMapEl = document.getElementById('diamondPlayers');
                if (playersMapEl) {
                    playersMapEl.textContent = isOnline ? `${online}/${max} 玩家在线` : '服务器离�?;
                }
                this.updateNodeStatus(isOnline);
            }
            return status;
        } catch (error) {
            console.error('更新服务器状态失�?', error);
            return null;
        }
    },
    updateNodeStatus(isOnline) {
        const nodeStatus = document.querySelector('.map-node.diamond .node-status');
        const nodeStatusSpan = document.querySelector('.map-node.diamond .node-status span');
        const nodeIcon = document.querySelector('.map-node.diamond .node-icon i');
        if (nodeStatus) {
            nodeStatus.className = `node-status ${isOnline ? 'online' : 'offline'}`;
            if (nodeStatusSpan) {
                nodeStatusSpan.textContent = isOnline ? '在线' : '离线';
            }
        }
        if (nodeIcon) {
            nodeIcon.className = isOnline ? 'fas fa-check-circle' : 'fas fa-times-circle';
        }
    }
};
const ServerStatusPage = {
    SERVER_IP: 'yanyu.18mc.cc',
    async init() {
        await this.queryServer();
    },
    async queryServer() {
        const resultSection = document.getElementById('resultSection');
        const queryBtn = document.getElementById('queryBtn');
        if (!resultSection) return;
        resultSection.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p class="loading-text">正在查询服务器状�?..</p>
            </div>
        `;
        if (queryBtn) {
            queryBtn.disabled = true;
            queryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 查询�?..';
        }
        try {
            const apiUrl = `https://api.mcsrvstat.us/2/${this.SERVER_IP}`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            const data = await response.json();
            this.displayResult(data);
        } catch (error) {
            console.log('API查询失败:', error.message);
            try {
                const backupApiUrl = `https://www.minecraftservers.cn/api/query?ip=${this.SERVER_IP}`;
                const backupResponse = await fetch(backupApiUrl);
                if (backupResponse.ok) {
                    const backupData = await backupResponse.json();
                    const convertedData = this.convertBackupData(backupData);
                    this.displayResult(convertedData);
                    return;
                }
            } catch (backupError) {
                console.log('备用API也失�?', backupError.message);
            }
            this.displayOfflineState();
        } finally {
            if (queryBtn) {
                queryBtn.disabled = false;
                queryBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 立即查询';
            }
        }
    },
    convertBackupData(data) {
        return {
            online: data.online !== false,
            ip: data.ip || this.SERVER_IP,
            port: data.port,
            hostname: data.hostname || data.ip,
            version: data.version || (data.players ? `在线人数 ${data.players.online}/${data.players.max}` : '未知'),
            players: {
                online: data.players?.online || 0,
                max: data.players?.max || 20
            },
            motd: {
                clean: data.motd?.clean || data.motd?.raw?.map(line => line.replace(/§[0-9a-f]/gi, '')) || ['�?]
            },
            icon: data.icon
        };
    },
    displayResult(data) {
        const resultSection = document.getElementById('resultSection');
        if (!resultSection) return;
        const isOnline = data.online || (data.players && data.players.online >= 0);
        const statusText = isOnline ? '在线' : '离线';
        const statusClass = isOnline ? 'online' : 'offline';
        const statusIcon = isOnline ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>';
        let motdHtml = '';
        if (data.motd && data.motd.clean) {
            motdHtml = data.motd.clean.map(line => `<div class="motd-line">${this.escapeHtml(line)}</div>`).join('');
        } else {
            motdHtml = '<div class="motd-line">�?/div>';
        }
        let iconHtml = '';
        if (data.icon) {
            iconHtml = `
                <div class="server-icon-container">
                    <img src="${data.icon}" alt="服务器图�? class="server-icon">
                </div>
            `;
        }
        let detailsHtml = `
            <div class="detail-item">
                <i class="fas fa-network-wired"></i>
                <span class="detail-label">IP地址:</span>
                <span class="detail-value">${data.ip || this.SERVER_IP}</span>
            </div>
        `;
        if (data.port) {
            detailsHtml += `
                <div class="detail-item">
                    <i class="fas fa-door-open"></i>
                    <span class="detail-label">端口:</span>
                    <span class="detail-value">${data.port}</span>
                </div>
            `;
        }
        if (data.hostname) {
            detailsHtml += `
                <div class="detail-item">
                    <i class="fas fa-server"></i>
                    <span class="detail-label">主机�?</span>
                    <span class="detail-value">${data.hostname}</span>
                </div>
            `;
        }
        if (data.version) {
            detailsHtml += `
                <div class="detail-item">
                    <i class="fas fa-cube"></i>
                    <span class="detail-label">版本:</span>
                    <span class="detail-value">${this.escapeHtml(data.version)}</span>
                </div>
            `;
        }
        resultSection.innerHTML = `
            <div class="result-header">
                <h2>
                    <i class="fas fa-poll"></i>
                    查询结果
                </h2>
                <span class="last-update">
                    <i class="fas fa-clock"></i>
                    更新�?${new Date().toLocaleString()}
                </span>
            </div>
            ${iconHtml}
            <div class="server-info-card">
                <div class="info-card status-card">
                    <i class="fas fa-power-off"></i>
                    <span class="info-value online-status ${statusClass}">${statusIcon} ${statusText}</span>
                    <span class="info-label">服务器状�?/span>
                </div>
                <div class="info-card">
                    <i class="fas fa-users"></i>
                    <span class="info-value">${data.players?.online || 0} / ${data.players?.max || '?'}</span>
                    <span class="info-label">在线玩家</span>
                </div>
                <div class="info-card">
                    <i class="fas fa-signal"></i>
                    <span class="info-value">${isOnline ? '正常' : '异常'}</span>
                    <span class="info-label">连接状�?/span>
                </div>
                <div class="info-card">
                    <i class="fas fa-tachometer-alt"></i>
                    <span class="info-value">${isOnline ? '20.0' : '0.0'}</span>
                    <span class="info-label">TPS</span>
                </div>
            </div>
            <div class="motd-section">
                <h3>
                    <i class="fas fa-bullhorn"></i>
                    服务器消�?(MOTD)
                </h3>
                <div class="motd-content">
                    ${motdHtml}
                </div>
            </div>
            <div class="details-grid">
                ${detailsHtml}
            </div>
            <div class="quick-actions" style="margin-top: 1.5rem;">
                <button class="action-btn primary" onclick="ServerStatusPage.copyServerAddress()">
                    <i class="fas fa-copy"></i> 复制地址
                </button>
                <button class="action-btn" onclick="ServerStatusPage.queryServer()">
                    <i class="fas fa-sync-alt"></i> 刷新数据
                </button>
            </div>
        `;
        showToast(`服务�?{statusText}`, statusClass === 'online' ? 'success' : 'warning');
    },
    displayOfflineState() {
        const resultSection = document.getElementById('resultSection');
        if (!resultSection) return;
        resultSection.innerHTML = `
            <div class="offline-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>服务器离线或无法连接</h3>
                <p>服务器可能正在维护中，或暂时无法访问</p>
                <p style="margin-top: 1rem; font-size: 0.9rem;">
                    <i class="fas fa-clock"></i>
                    刷新时间: ${new Date().toLocaleString()}
                </p>
            </div>
            <div class="quick-actions" style="margin-top: 1.5rem;">
                <button class="action-btn primary" onclick="ServerStatusPage.queryServer()">
                    <i class="fas fa-sync-alt"></i> 重新查询
                </button>
                <button class="action-btn" onclick="window.open('https://wpa.qq.com/msgrd?v=3&uin=1015192662&site=qq&menu=yes', '_blank')">
                    <i class="fab fa-qq"></i> 联系管理�?
                </button>
            </div>
        `;
        showToast('服务器离�?, 'error');
    },
    copyServerAddress() {
        navigator.clipboard.writeText(this.SERVER_IP).then(() => {
            showToast('服务器地址已复制到剪贴�?, 'success');
        }).catch(() => {
            showToast('复制失败，请手动复制', 'warning');
        });
    },
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
async function initApp() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    await FileDB.init();
    const protectedPages = ['index.html', 'mc.html', 'user.html', 'server-status.html'];
    if (protectedPages.includes(currentPage)) {
        await requireAuth('login.html');
    }
    if ((currentPage === 'login.html' || currentPage === 'register.html')) {
        const isAuthed = await checkAuth();
        if (isAuthed) {
            window.location.href = 'index.html';
            return;
        }
    }
    updateNavUI();
    if (currentPage !== 'user.html' && currentPage !== 'server-status.html') {
        initParticles();
    }
    if (['index.html', 'mc.html'].includes(currentPage)) {
        setTimeout(() => {
            AIAssistant.updateVisibility();
        }, 2000);
    }
    if (currentPage === 'mc.html') {
        setTimeout(() => {
            ServerStatus.updateUI();
        }, 1000);
    }
    if (currentPage === 'server-status.html') {
        document.addEventListener('DOMContentLoaded', function() {
            ServerStatusPage.init();
        });
    }
    console.log('%c欢迎来到烟融小镇', 'color: #238636; font-size: 18px; font-weight: bold;');
}
const TopMembers = {
    dbKey: 'top_members.db',
    getMembers() {
        const data = localStorage.getItem(this.dbKey);
        if (data) {
            return JSON.parse(data);
        }
        const defaultMembers = [
            {
                id: 1,
                username: "MinecraftMaster",
                title: "冒险�?,
                level: 25,
                joinDate: "2023-06-15",
                onlineTime: 480,
                contributions: 156,
                likes: 89,
                achievements: ["建筑大师", "探索�?, "商人"],
                isOnline: true
            },
            {
                id: 2,
                username: "DiamondHunter",
                title: "矿工",
                level: 22,
                joinDate: "2023-07-20",
                onlineTime: 420,
                contributions: 134,
                likes: 76,
                achievements: ["钻石猎人", "资源收集�?],
                isOnline: true
            },
            {
                id: 3,
                username: "BuilderPro",
                title: "建筑大师",
                level: 20,
                joinDate: "2023-08-10",
                onlineTime: 380,
                contributions: 145,
                likes: 82,
                achievements: ["建筑大师", "设计�?, "艺术�?],
                isOnline: false
            },
            {
                id: 4,
                username: "RedstoneKing",
                title: "红石大师",
                level: 18,
                joinDate: "2023-09-05",
                onlineTime: 320,
                contributions: 98,
                likes: 65,
                achievements: ["红石专家", "发明�?],
                isOnline: true
            },
            {
                id: 5,
                username: "FarmerExpert",
                title: "农场�?,
                level: 15,
                joinDate: "2023-10-01",
                onlineTime: 280,
                contributions: 87,
                likes: 54,
                achievements: ["农场�?, "厨师"],
                isOnline: false
            },
            {
                id: 6,
                username: "PvPChampion",
                title: "竞技场冠�?,
                level: 28,
                joinDate: "2023-05-20",
                onlineTime: 520,
                contributions: 167,
                likes: 95,
                achievements: ["战斗大师", "竞技冠军", "生存专家"],
                isOnline: true
            }
        ];
        this.saveMembers(defaultMembers);
        return defaultMembers;
    },
    saveMembers(members) {
        localStorage.setItem(this.dbKey, JSON.stringify(members));
    },
    getTopMembers(limit = 6) {
        const members = this.getMembers();
        return members
            .map(m => ({
                ...m,
                score: m.contributions * 2 + m.likes + Math.floor(m.onlineTime / 10)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    },
    getLevelColor(level) {
        if (level >= 30) return '#e3b341'; // 金色
        if (level >= 20) return '#c0c0c0'; // 银色
        if (level >= 10) return '#cd7f32'; // 铜色
        return '#238636'; // 绿色
    },
    getRankBadge(rank) {
        const badges = {
            1: '<i class="fas fa-crown"></i>',
            2: '<i class="fas fa-medal" style="font-size:0.85rem;"></i>',
            3: '<i class="fas fa-medal" style="color:#cd7f32;"></i>'
        };
        return badges[rank] || rank;
    },
    renderMembers(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const topMembers = this.getTopMembers(6);
        if (topMembers.length === 0) {
            container.innerHTML = `
                <div class="no-data" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #8b949e;">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>暂无成员数据</p>
                </div>
            `;
            return;
        }
        container.innerHTML = topMembers.map((member, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? ['', 'gold', 'silver', 'bronze'][rank] : 'normal';
            return `
                <div class="member-card" onclick="TopMembers.showMemberDetail(${member.id})">
                    <div class="rank-badge ${rankClass}">
                        ${rank <= 3 ? rank : `<span style="font-size:0.75rem;">${rank}</span>`}
                    </div>
                    <div class="member-avatar" style="background: linear-gradient(135deg, ${this.getLevelColor(member.level)}, ${this.getLevelColor(member.level)}dd);">
                        <i class="fas fa-user"></i>
                        <span class="level-badge">Lv.${member.level}</span>
                    </div>
                    <div class="member-info">
                        <div class="member-name">
                            <span class="online-status ${member.isOnline ? '' : 'offline'}"></span>
                            ${this.escapeHtml(member.username)}
                        </div>
                        <div class="member-title">${this.escapeHtml(member.title)}</div>
                        <div class="member-stats">
                            <span class="member-stat likes">
                                <i class="fas fa-heart"></i>
                                ${member.likes}
                            </span>
                            <span class="member-stat online-time">
                                <i class="fas fa-clock"></i>
                                ${Math.floor(member.onlineTime / 60)}h
                            </span>
                            <span class="member-stat contributions">
                                <i class="fas fa-star"></i>
                                ${member.contributions}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    showMemberDetail(memberId) {
        const members = this.getMembers();
        const member = members.find(m => m.id === memberId);
        if (!member) return;
        let modal = document.getElementById('membersDetailModal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'membersDetailModal';
        modal.className = 'members-modal-overlay';
        modal.innerHTML = `
            <div class="members-modal">
                <div class="members-modal-header">
                    <button class="members-modal-close" onclick="TopMembers.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="members-modal-avatar">
                        <i class="fas fa-user"></i>
                        <div class="rank-icon">
                            <i class="fas fa-star"></i>
                        </div>
                    </div>
                    <div class="members-modal-title">
                        <h3>${this.escapeHtml(member.username)}</h3>
                        <p>${this.escapeHtml(member.title)} · Lv.${member.level}</p>
                    </div>
                </div>
                <div class="members-modal-body">
                    <div class="members-modal-stats">
                        <div class="modal-stat">
                            <i class="fas fa-heart"></i>
                            <span class="stat-value">${member.likes}</span>
                            <span class="stat-label">获赞�?/span>
                        </div>
                        <div class="modal-stat">
                            <i class="fas fa-clock"></i>
                            <span class="stat-value">${Math.floor(member.onlineTime / 60)}h</span>
                            <span class="stat-label">在线时长</span>
                        </div>
                        <div class="modal-stat">
                            <i class="fas fa-star"></i>
                            <span class="stat-value">${member.contributions}</span>
                            <span class="stat-label">贡献�?/span>
                        </div>
                    </div>
                    <div class="members-modal-achievements">
                        <h4><i class="fas fa-trophy"></i> 成就徽章</h4>
                        <div class="achievements-list">
                            ${member.achievements.map(a => `
                                <span class="achievement-tag">
                                    <i class="fas fa-medal"></i>
                                    ${this.escapeHtml(a)}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    },
    closeModal() {
        const modal = document.getElementById('membersDetailModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    },
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    updateMemberStatus(username, isOnline) {
        const members = this.getMembers();
        const member = members.find(m => m.username === username);
        if (member) {
            member.isOnline = isOnline;
            this.saveMembers(members);
        }
    },
    addMember(memberData) {
        const members = this.getMembers();
        const newMember = {
            id: members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1,
            ...memberData,
            joinDate: new Date().toISOString().split('T')[0],
            onlineTime: 0,
            contributions: 0,
            likes: 0,
            achievements: [],
            isOnline: true
        };
        members.push(newMember);
        this.saveMembers(members);
        return newMember;
    }
};
function showAllMembers() {
    const modal = document.getElementById('allMembersModal');
    if (modal) modal.remove();
    const topMembers = TopMembers.getTopMembers(20);
    modal = document.createElement('div');
    modal.id = 'allMembersModal';
    modal.className = 'members-modal-overlay';
    modal.innerHTML = `
        <div class="members-modal" style="max-width: 700px;">
            <div class="members-modal-header">
                <button class="members-modal-close" onclick="this.closest('.members-modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.members-modal-overlay').remove(), 300);">
                    <i class="fas fa-times"></i>
                </button>
                <div class="members-modal-avatar" style="background: linear-gradient(135deg, #e3b341, #238636);">
                    <i class="fas fa-users"></i>
                </div>
                <div class="members-modal-title">
                    <h3>全部成员排行�?/h3>
                    <p>�?${topMembers.length} 位优秀成员</p>
                </div>
            </div>
            <div class="members-modal-body">
                <div class="members-grid" style="margin-bottom: 0;">
                    ${topMembers.map((member, index) => `
                        <div class="member-card" onclick="TopMembers.showMemberDetail(${member.id});">
                            <div class="rank-badge ${index < 3 ? ['','gold','silver','bronze'][index+1] : 'normal'}" style="position:relative; top:0; right:0; margin-right:0.5rem;">
                                ${index + 1}
                            </div>
                            <div class="member-avatar" style="width:48px; height:48px;">
                                <i class="fas fa-user" style="font-size:1.2rem;"></i>
                            </div>
                            <div class="member-info">
                                <div class="member-name" style="font-size:1rem;">
                                    ${TopMembers.escapeHtml(member.username)}
                                </div>
                                <div class="member-title" style="font-size:0.8rem;">
                                    ${TopMembers.escapeHtml(member.title)} · Lv.${member.level}
                                </div>
                            </div>
                            <div style="margin-left:auto; text-align:right;">
                                <div style="font-size:1rem; font-weight:600; color:#c9d1d9;">
                                    ${member.contributions}
                                </div>
                                <div style="font-size:0.7rem; color:#8b949e;">贡献�?/div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    });
}
function initTopMembers() {
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => TopMembers.renderMembers('topMembersGrid'), 500);
            });
        } else {
            setTimeout(() => TopMembers.renderMembers('topMembersGrid'), 500);
        }
    }
}
document.addEventListener('DOMContentLoaded', function() {
    initTopMembers();
});
window.TopMembers = TopMembers;
window.showAllMembers = showAllMembers;
document.addEventListener('DOMContentLoaded', initApp);
window.showToast = showToast;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.socialLogin = socialLogin;
window.initParticles = initParticles;
window.logout = logout;
window.requireAuth = requireAuth;
window.AIAssistant = AIAssistant;
window.toggleUserDropdown = toggleUserDropdown;
window.saveProfile = saveProfile;
window.savePreferences = savePreferences;
window.formatDateTime = formatDateTime;
window.ServerStatus = ServerStatus;
window.ServerStatusPage = ServerStatusPage;
window.UserSystem = UserSystem;