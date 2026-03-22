async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
function generateSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, message }, status);
}
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/api/register' && request.method === 'POST') {
        const { username, password, email } = await request.json();
        if (!username || !password) {
          return errorResponse('用户名和密码不能为空');
        }
        if (username.length < 3 || username.length > 20) {
          return errorResponse('用户名长度需�?-20个字符之�?);
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return errorResponse('用户名只能包含字母、数字和下划�?);
        }
        if (password.length < 6) {
          return errorResponse('密码至少需�?个字�?);
        }
        const existingUser = await env.DB.prepare(
          'SELECT id FROM users WHERE username = ?'
        ).bind(username).first();
        if (existingUser) {
          return errorResponse('用户名已存在');
        }
        const salt = generateSalt();
        const hashedPassword = await hashPassword(password, salt);
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
      if (path === '/api/login' && request.method === 'POST') {
        const { username, password } = await request.json();
        if (!username || !password) {
          return errorResponse('用户名和密码不能为空');
        }
        const user = await env.DB.prepare(
          'SELECT * FROM users WHERE username = ?'
        ).bind(username).first();
        if (!user) {
          return errorResponse('用户名或密码错误');
        }
        const hashedPassword = await hashPassword(password, user.salt);
        if (hashedPassword !== user.password) {
          return errorResponse('用户名或密码错误');
        }
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30�?
        await env.DB.prepare(
          'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
        ).bind(user.id, token, expiresAt).run();
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
      if (path === '/api/verify' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return errorResponse('未提供认证信�?, 401);
        }
        const token = authHeader.substring(7);
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
      if (path === '/api/logout' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
        }
        return jsonResponse({ success: true, message: '已退出登�? });
      }
      if (path === '/api/user' && request.method === 'PUT') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return errorResponse('未提供认证信�?, 401);
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
      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      }
      return errorResponse('接口不存�?, 404);
    } catch (error) {
      console.error('API Error:', error);
      return errorResponse('服务器内部错�? ' + error.message, 500);
    }
  }
};