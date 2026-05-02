/**
 * 烟融小镇 - 用户认证 API
 * 部署到 Cloudflare Workers + D1 数据库
 */

// 密码加密函数（使用 Web Crypto API)
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成随机盐值
function generateSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成 Token
function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// JSON 响应
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// 错误响应
function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, message }, status);
}

export default {
  async fetch(request, env, ctx) {
    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ==================== 用户注册 ====================
      if (path === '/api/register' && request.method === 'POST') {
        const { username, password, email } = await request.json();

        // 验证输入
        if (!username || !password) {
          return errorResponse('用户名和密码不能为空');
        }
        if (username.length < 3 || username.length > 20) {
          return errorResponse('用户名长度需在3-20个字符之间');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return errorResponse('用户名只能包含字母、数字和下划线');
        }
        if (password.length < 6) {
          return errorResponse('密码至少需要6个字符');
        }

        // 检查用户名是否已存在
        const existingUser = await env.DB.prepare(
          'SELECT id FROM users WHERE username = ?'
        ).bind(username).first();

        if (existingUser) {
          return errorResponse('用户名已存在');
        }

        // 加密密码
        const salt = generateSalt();
        const hashedPassword = await hashPassword(password, salt);

        // 插入用户
        const now = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO users (username, password, salt, email, create_time, last_login) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(username, hashedPassword, salt, email || null, now, now).run();

        return jsonResponse({ 
          success: true, 
          message: '注册成功',
          user: { username, email: email || null }
        });
      }

      // ==================== 用户登录 ====================
      if (path === '/api/login' && request.method === 'POST') {
        const { username, password } = await request.json();

        if (!username || !password) {
          return errorResponse('用户名和密码不能为空');
        }

        // 查询用户
        const user = await env.DB.prepare(
          'SELECT * FROM users WHERE username = ?'
        ).bind(username).first();

        if (!user) {
          return errorResponse('用户名或密码错误');
        }

        // 验证密码
        const hashedPassword = await hashPassword(password, user.salt);
        if (hashedPassword !== user.password) {
          return errorResponse('用户名或密码错误');
        }

        // 生成 Token
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30天

        // 保存 Token
        await env.DB.prepare(
          'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
        ).bind(user.id, token, expiresAt).run();

        // 更新最后登录时间
        await env.DB.prepare(
          'UPDATE users SET last_login = ? WHERE id = ?'
        ).bind(new Date().toISOString(), user.id).run();

        return jsonResponse({
          success: true,
          message: '登录成功',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      }

      // ==================== 验证 Token ====================
      if (path === '/api/verify' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return errorResponse('未提供认证信息', 401);
        }

        const token = authHeader.substring(7);

        // 查询 Session
        const session = await env.DB.prepare(
          `SELECT s.*, u.username, u.email FROM sessions s 
           JOIN users u ON s.user_id = u.id 
           WHERE s.token = ? AND s.expires_at > ?`
        ).bind(token, new Date().toISOString()).first();

        if (!session) {
          return errorResponse('Token 无效或已过期', 401);
        }

        return jsonResponse({
          success: true,
          user: {
            id: session.user_id,
            username: session.username,
            email: session.email
          }
        });
      }

      // ==================== 退出登录 ====================
      if (path === '/api/logout' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
        }

        return jsonResponse({ success: true, message: '已退出登录' });
      }

      // ==================== 更新用户信息 ====================
      if (path === '/api/user' && request.method === 'PUT') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return errorResponse('未提供认证信息', 401);
        }

        const token = authHeader.substring(7);
        const session = await env.DB.prepare(
          'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
        ).bind(token, new Date().toISOString()).first();

        if (!session) {
          return errorResponse('Token 无效或已过期', 401);
        }

        const { email, newPassword } = await request.json();
        const updates = [];
        const values = [];

        if (email !== undefined) {
          updates.push('email = ?');
          values.push(email);
        }

        if (newPassword && newPassword.length >= 6) {
          const salt = generateSalt();
          const hashedPassword = await hashPassword(newPassword, salt);
          updates.push('password = ?', 'salt = ?');
          values.push(hashedPassword, salt);
        }

        if (updates.length > 0) {
          values.push(session.user_id);
          await env.DB.prepare(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
          ).bind(...values).run();
        }

        return jsonResponse({ success: true, message: '更新成功' });
      }

      // ==================== 健康检查 ====================
      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      }

      // 404
      return errorResponse('接口不存在', 404);

    } catch (error) {
      console.error('API Error:', error);
      return errorResponse('服务器内部错误: ' + error.message, 500);
    }
  }
};
