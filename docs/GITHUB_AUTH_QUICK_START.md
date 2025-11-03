# GitHub 认证快速启动指南

## ⚡ 5分钟快速上手

### 1️⃣ GitHub OAuth 应用注册 (1分钟)

```bash
# 打开 GitHub Settings
https://github.com/settings/developers
# → New OAuth App
# → 填写:
#   - Application name: Agent Builder
#   - Homepage URL: http://localhost:3000
#   - Authorization callback URL: http://localhost:3000/agent-builder/api/auth/github/callback
# → 复制 Client ID 和 Client Secret
```

### 2️⃣ 环境变量配置 (1分钟)

```bash
# 复制示例文件
cp .env.local.example .env.local

# 编辑 .env.local，填入真实值
cat .env.local
# GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_SECRET=your_github_client_secret
# JWT_SECRET=生成一个随机密钥 (见下)
# NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 生成 JWT_SECRET

```bash
# 方法1: macOS/Linux
openssl rand -base64 32

# 方法2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法3: 在线生成
# https://www.uuidgenerator.net/
```

### 3️⃣ 创建 D1 数据库表 (1分钟)

在 Cloudflare 控制台执行以下 SQL：

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY NOT NULL,
  login TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  avatar_url TEXT NOT NULL,
  bio TEXT,
  company TEXT,
  blog TEXT,
  location TEXT,
  twitter_username TEXT,
  public_repos INTEGER DEFAULT 0,
  public_gists INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at_db TEXT NOT NULL,
  updated_at_db TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(id);
```

### 4️⃣ 启动开发服务器 (2分钟)

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

## 🔗 API 路由速查表

| 路由                                       | 方法 | 描述           | 需要登录 |
| ------------------------------------------ | ---- | -------------- | -------- |
| `/agent-builder/api/auth/github/authorize` | GET  | 获取授权 URL   | ❌       |
| `/agent-builder/api/auth/github/callback`  | GET  | OAuth 回调处理 | ❌       |
| `/agent-builder/api/auth/me`               | GET  | 获取当前用户   | ✅       |
| `/agent-builder/api/auth/logout`           | POST | 登出用户       | ✅       |

## 📦 生成的文件结构

```
lib/
├── auth.ts                      # JWT 和认证工具
├── db-user.ts                   # D1 用户操作
└── auth-middleware.ts           # 认证中间件

app/agent-builder/api/auth/
├── github/
│   ├── authorize/route.ts       # 获取授权 URL
│   └── callback/route.ts        # OAuth 回调
├── me/route.ts                  # 获取当前用户
└── logout/route.ts              # 登出

docs/
├── GITHUB_AUTH_SETUP.md         # 完整设置指南
└── GITHUB_AUTH_QUICK_START.md   # 本文件
```

## 💾 数据库表设计

### users 表

```
字段                  类型         说明
──────────────────────────────────────────
id                   INTEGER     GitHub 用户 ID (主键)
login                TEXT        GitHub 用户名 (唯一索引)
name                 TEXT        全名
email                TEXT        邮箱
avatar_url           TEXT        头像 URL
bio                  TEXT        个人简介
company              TEXT        公司
blog                 TEXT        博客
location             TEXT        位置
twitter_username     TEXT        Twitter 账号
public_repos         INTEGER     公开仓库数
public_gists         INTEGER     公开 Gist 数
followers            INTEGER     粉丝数
following            INTEGER     关注数
created_at           TEXT        GitHub 账户创建时间
updated_at           TEXT        GitHub 账户更新时间
token                TEXT        GitHub Access Token
created_at_db        TEXT        数据库创建时间
updated_at_db        TEXT        数据库更新时间
```

## 🔐 安全特性

- ✅ **JWT Token**: 7天有效期
- ✅ **HttpOnly Cookie**: 防止 XSS 攻击
- ✅ **Secure Flag**: 生产环境 HTTPS only
- ✅ **SameSite=Lax**: 防止 CSRF 攻击
- ✅ **State Token**: 防止授权码盗用
- ✅ **Access Token 加密存储**: 保存在 D1，不暴露到客户端

## 🧪 测试 OAuth 流程

### 1. 手动测试

```bash
# 1. 获取授权 URL
curl http://localhost:3000/agent-builder/api/auth/github/authorize

# 2. 在浏览器中打开返回的 authUrl，完成授权

# 3. 应该被重定向到首页，且 cookie 中有 auth_token

# 4. 获取用户信息
curl http://localhost:3000/agent-builder/api/auth/me \
  -H "Cookie: auth_token=<your_token>"

# 5. 登出
curl -X POST http://localhost:3000/agent-builder/api/auth/logout
```

### 2. 在浏览器中测试

```javascript
// 在控制台执行

// 获取授权 URL
const authResponse = await fetch('/agent-builder/api/auth/github/authorize')
const authData = await authResponse.json()
console.log(authData.authUrl)

// 在新标签页打开授权 URL
window.open(authData.authUrl)

// 授权后回来，获取用户信息
const meResponse = await fetch('/agent-builder/api/auth/me')
const user = await meResponse.json()
console.log(user)
```

## ⚠️ 常见问题

### Q: "GitHub Client ID is not configured"

**A**: 检查 `.env.local` 是否正确设置了 `GITHUB_CLIENT_ID`

```bash
# 查看是否有 .env.local 文件
ls -la .env.local

# 检查内容
cat .env.local | grep GITHUB_CLIENT_ID
```

### Q: D1 数据库错误 "table users does not exist"

**A**: 在 Cloudflare 控制台创建 users 表

```bash
# 查看 D1 数据库 ID
cat wrangler.jsonc | grep database_id

# 连接到数据库
wrangler d1 execute agent-builder --remote

# 执行表创建 SQL (见上面的 3️⃣)
```

### Q: "Invalid or expired token"

**A**: JWT token 已过期，需要重新登录

```bash
# 登出并清除 cookie
curl -X POST http://localhost:3000/agent-builder/api/auth/logout

# 重新登录
```

### Q: 生产环境登录失败

**A**: 检查 GitHub OAuth 应用配置

```bash
# 确保 Authorization callback URL 正确
# GitHub Settings → Developers → OAuth Apps → Agent Builder
# 应该是: https://your-domain.com/agent-builder/api/auth/github/callback

# 检查环境变量
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

## 📚 相关文件

- [完整设置指南](./GITHUB_AUTH_SETUP.md)
- [lib/auth.ts](../lib/auth.ts) - JWT 工具
- [lib/db-user.ts](../lib/db-user.ts) - D1 操作
- [lib/auth-middleware.ts](../lib/auth-middleware.ts) - 认证中间件

## 🚀 下一步

1. ✅ 实现前端登录/登出 UI
2. ✅ 在受保护的 API 中使用 `withAuth` 中间件
3. ✅ 显示用户信息和头像
4. ✅ 实现用户设置页面
5. ✅ 添加用户会话管理

## 💡 提示

- 开发时，建议添加日志便于调试：`console.log('OAuth state:', ...)`
- 可以在浏览器中按 F12 查看 Application → Cookies 看 `auth_token`
- JWT token 可以在 https://jwt.io 解码查看 payload
