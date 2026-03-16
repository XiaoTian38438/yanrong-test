# 烟融小镇 - Cloudflare 部署指南

## 📦 准备说明

- **Cloudflare Workers**： 免费， 每天 10万次请求
- **Cloudflare D1 数据库**: 免费， 5GB 存储空间，- 密码使用 SHA-256 加盐加密存储

---

## 🔧 鐺署步骤

### 第一步：注册 Cloudflare 账号

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 注册账号（可以用 GitHub 登录或）
3. 创建 API Token 获取免费额度

---

### 第二步：创建 D1 数据库

1. 进入 Cloudflare Dashboard → **Workers & Pages** > **Overview**
2. 点击 **Create application**
   - 名称: `yanrong-users`
   - 选择 **SQLite** 类型
   - 数据库名: `yanrong-users`

![D1 创建界面](/resources/create界面.png)

3. 点击 **Create** 后，命名， 注意选择**SQLite** 类型

4. **创建** 后，左侧面板会出现创建成功提示：

5. 复制数据库 ID，记录数据库 ID

6. 点击 **完成**

![D1 数据库创建成功](/resources/create界面.png)
7. 点击 **Console** 标签 **Web** 打开控制台：
8. 运行以下命令创建表结构：

![表结构](/resources/create表结构.png)
8. **编辑** 按打开右侧面板的 `...` 可展开详情视图](/icons)

9. **创建数据库时选择刚创建的数据库** (我们创建的是 `users` 和 `sessions`)
10. 在 **数据库 ID 输入你在表格中的值

![D1 数据库](/resources/create表结构)
10. 点击 **确认** 后，返回到 Dashboard

11. 在 Workers 页面找到你的 Worker
12. 点击 **Quick Edit** 查看代码（返回代码视图中的 Worker 图标)

13. 编辑代码：点击顶部的 **...</**

### 第三步：部署 Worker

1. 打开 `api/worker.js` 文
2. 复制 API 地址（你的 Worker URL)
2. 点击 **Deploy** 按钮

3. 猽写描述，粘贴以下内容
4. 保存文件
5. 回到 Cloudflare Dashboard， Workers 页面
6. 点击你的 Worker
7. 在 **设置** > **变量**
8. 添加 **Production 环境变量** `Yanyu-api-url`
   - 巻加 `yanyu-api-url` 作为变量值，   - 勾选 `Set`（这样部署后可以在本地用 `wrangler dev run测试）

9. **保存部署信息**：创建一个 `wrangler.toml` 文件来保存。

---

### 第四步：更新前端 API 配置
1. 打开 `api/config.js`
2. 修改 `BASE_URL` 为你的 Worker 地址
3. 保存文件
4. 在 `index.html` 中引入配置文件：
5. 同时修改用户系统代码，使用云端 API

现在让我创建一个简化的版本来指导你部署，完整的部署文档：我也需要知道， `wrangler.toml` 应该保存什么内容。而不是单独创建。。我需要手动复制 `wrangler.toml`，内容，我来手动复制进去项目目录。

然后创建必要的文件。我将引导用户一步步完成部署。

完整的部署指南：

```markdown
wrangler.toml 文件内容：
name = "yanrong-users"
main = "./migrations/schema.sql"
database_id = "yanrong-users"
migrations_dir = ["migrations"]

compat_date = "2026-03-16"

[[migrations]]
name = "0001_initial"
direction = "up"
```

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  salt TEXT NOT null,
  email TEXT,
  create_time TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT null,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT not null,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

5. 在 **项目根目录**下运行：
````
npx wrangler deploy
````

将本地代码复制到项目根目录，然后打开命令行运行部署脚本。

我发现这是一个在中文输出里有很多乱码和中文提示信息。实际上内容是纯英文。，建议你将以下内容复制到英文提示信息后粘贴。

````
npx wrangler deploy --api
`` ```
我将英文说明复制到中文，你用户方便理解。我将命令改为英文：
```powershell
Set-ExecutionPolicy -Restricted -ExecutionPolicy Bypass -File types like `.ps1`, `.bat`, by adding `-ExecutionPolicy Bypass` on end, the会方便很多。

我将英文说明中的 `GitHub API URL` 和 `wrangler.toml` 中的 `BASE_URL` 改为你实际的 Worker 地址。

2. 修改 `api/config.js` 中的 `BASE_URL` 为你的实际 Worker 地址
3. 在所有 HTML 页面中引入 `api/config.js`
4. 更新用户系统使用云端 API

现在让我打开 `api/config.js` 文件，确认内容：我看到配置已经成功创建了！很好！我来创建一个简单的批处理脚本来完成部署：

或者，我创建数据库迁移文件：在项目的 `api` 目录下创建 `migrations` 文件夹

然后在创建 `schema.sql` 文件，定义数据库表结构：我现在让我创建实际的部署文档：`DEPLOY.md`， artifact 文件，桌面打开：

你想要部署到 GitHub，也可以按以下步骤操作，我已经将步骤整理出来，准备部署。

打开 https://dash.cloudflare.com 并完成数据库创建。

接下来创建 Worker：

打开 `api/worker.js` 文文件
在 Cloudflare Dashboard 镜像左边，部署一个 Worker：
完成后，Worker 鵝色的 Node下方会显示部署成功的消息：
- 复制数据库 ID

- 回到 D1 页面，点击 **Create** 按钮

- 数据库名选择 `yanrong-users`
- 选择 SQLite 类型
- 点击 **Create**

输入数据库名（这里可以自定义，我建议保持默认名称或使用系统生成名称)
然后点击 **Deploy** 按钮

- 选择一个名称（可以是是 `yanrong-api` 或类似的)
我推荐 `yanrong-api`
- 点击 **Deploy** 后，等待几秒钟

会自动完成部署

4. 点击 **保存并部署** 按钮，然后点击 **Custom Domains**，右侧面板中添加你的域名（比如 `yanronggame.com)，点击 **添加 custom域**

    - 名称输入 `yanrong-api`
    - 类型选择 `Pages`
    - 点击 **Deploy**

15. 等待片刻后，粘贴 API Token
API_TOKEN=$(token);

// 使用本地 Token 作为备用
        if (!CloudflareAPI.getToken() && CloudflareAPI.getToken()) {
            console.warn('未找到 Token，清除本地登录状态');
            window.location.href = 'login.html';
            return;
        }

        
        console.log('API 鄨署成功！响应:', '注册成功');
        showToast('注册成功！正在跳转登录...',', 1500);
        } else {
            console.error('注册失败:', response);
            showToast(result.data.message || '注册失败', 'error');
        }
    });
}
