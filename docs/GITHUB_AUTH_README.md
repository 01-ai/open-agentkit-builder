# 🔐 GitHub OAuth 认证系统

## 快速导航

- 🚀 **快速开始**: [GITHUB_AUTH_QUICK_START.md](./GITHUB_AUTH_QUICK_START.md) (5分钟)
- 📖 **完整指南**: [docs/GITHUB_AUTH_SETUP.md](./docs/GITHUB_AUTH_SETUP.md)
- 🏗️ **系统架构**: [docs/GITHUB_AUTH_ARCHITECTURE.md](./docs/GITHUB_AUTH_ARCHITECTURE.md)
- 🧪 **测试清单**: [GITHUB_AUTH_TEST_CHECKLIST.md](./GITHUB_AUTH_TEST_CHECKLIST.md)
- 📋 **实现总结**: [GITHUB_AUTH_IMPLEMENTATION_SUMMARY.md](./GITHUB_AUTH_IMPLEMENTATION_SUMMARY.md)

## ⚡ 30秒了解

这是一个完整的 GitHub OAuth 认证系统，特点是：

```
GitHub OAuth 2.0 → JWT Token → Cloudflare D1
```

- ✅ 直接调用 GitHub 接口（无需第三方认证库）
- ✅ 使用 JWT 管理会话（7天有效期）
- ✅ 用户信息存储在 Cloudflare D1
- ✅ HttpOnly Cookie + CSRF 防护
- ✅ 生产环境就绪

## 📁 文件结构

```
核心认证库
├── lib/auth.ts              → JWT token 工具
├── lib/db-user.ts           → D1 用户操作
├── lib/db-init.ts           → 数据库表定义
└── lib/auth-middleware.ts   → 认证中间件

API 路由 (4 个端点)
├── /api/auth/github/authorize    → 获取授权 URL
├── /api/auth/github/callback     → OAuth 回调处理
├── /api/auth/me                  → 获取当前用户
└── /api/auth/logout              → 登出

配置
├── wrangler.jsonc           → D1 绑定 (已配置)
└── .env.local.example       → 环境变量模板

文档
├── GITHUB_AUTH_QUICK_START.md       → ⭐ 从这开始
├── docs/GITHUB_AUTH_SETUP.md        → 完整设置
├── docs/GITHUB_AUTH_ARCHITECTURE.md → 架构详解
└── GITHUB_AUTH_TEST_CHECKLIST.md    → 测试方案
```

## 🚀 3 分钟快速开始

### 1. 获取 GitHub OAuth 凭证

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写：
   - Application name: `Agent Builder`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/agent-builder/api/auth/github/callback`
4. 记下 **Client ID** 和 **Client Secret**

### 2. 配置环境变量

```bash
# 复制示例
cp .env.local.example .env.local

# 编辑 .env.local，填入：
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 3. 创建数据库表

在 Cloudflare 控制台执行：

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY NOT NULL,
  login TEXT NOT NULL UNIQUE,
  name TEXT, email TEXT, avatar_url TEXT,
  bio TEXT, company TEXT, blog TEXT, location TEXT,
  twitter_username TEXT,
  public_repos INTEGER, public_gists INTEGER,
  followers INTEGER, following INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at_db TEXT NOT NULL,
  updated_at_db TEXT NOT NULL
);

CREATE INDEX idx_users_login ON users(login);
CREATE INDEX idx_users_github_id ON users(id);
```

### 4. 启动应用

```bash
pnpm install
pnpm dev
```

## 🔗 API 端点

| 路由 | 方法 | 说明 | 需要登录 |
|------|------|------|---------|
| `/agent-builder/api/auth/github/authorize` | GET | 获取 GitHub OAuth URL | ❌ |
| `/agent-builder/api/auth/github/callback` | GET | OAuth 回调处理 | ❌ |
| `/agent-builder/api/auth/me` | GET | 获取当前用户信息 | ✅ |
| `/agent-builder/api/auth/logout` | POST | 登出用户 | ✅ |

## 💻 前端使用示例

### 登录按钮

```tsx
const handleLogin = async () => {
  const res = await fetch('/agent-builder/api/auth/github/authorize')
  const { authUrl } = await res.json()
  window.location.href = authUrl
}

return <button onClick={handleLogin}>GitHub 登录</button>
```

### 获取用户信息

```tsx
const [user, setUser] = useState(null)

useEffect(() => {
  fetch('/agent-builder/api/auth/me')
    .then(r => r.json())
    .then(setUser)
    .catch(() => setUser(null))
}, [])

if (!user) return <button onClick={handleLogin}>登录</button>
return <div>欢迎 {user.login}!</div>
```

### 登出

```tsx
const handleLogout = async () => {
  await fetch('/agent-builder/api/auth/logout', { method: 'POST' })
  window.location.href = '/'
}

return <button onClick={handleLogout}>登出</button>
```

## 🔐 安全特性

| 特性 | 状态 |
|------|------|
| JWT 签名 (HS256) | ✅ |
| 7 天 Token 有效期 | ✅ |
| HttpOnly Cookie | ✅ |
| SameSite=Lax | ✅ |
| State Token CSRF 防护 | ✅ |
| HTTPS Secure Flag | ✅ (生产) |

## 📚 推荐阅读

| 文档 | 场景 |
|------|------|
| [GITHUB_AUTH_QUICK_START.md](./GITHUB_AUTH_QUICK_START.md) | 👈 从这开始 |
| [docs/GITHUB_AUTH_SETUP.md](./docs/GITHUB_AUTH_SETUP.md) | 遇到问题 |
| [docs/GITHUB_AUTH_ARCHITECTURE.md](./docs/GITHUB_AUTH_ARCHITECTURE.md) | 想理解架构 |
| [GITHUB_AUTH_TEST_CHECKLIST.md](./GITHUB_AUTH_TEST_CHECKLIST.md) | 需要测试 |

## 🧪 测试

```bash
# 1. 获取授权 URL
curl http://localhost:3000/agent-builder/api/auth/github/authorize

# 2. 登录后获取用户信息
curl http://localhost:3000/agent-builder/api/auth/me

# 3. 登出
curl -X POST http://localhost:3000/agent-builder/api/auth/logout
```

## ⚠️ 常见问题

### "GitHub Client ID is not configured"

检查 `.env.local` 文件是否存在且包含 `GITHUB_CLIENT_ID`

### "table users does not exist"

确保在 Cloudflare D1 中创建了 `users` 表（见上面的步骤）

### "Invalid or expired token"

JWT token 已过期或 JWT_SECRET 不匹配，重新登录

## 🎯 后续开发

- [ ] 实现前端登录 UI
- [ ] 在 API 中使用 `withAuth` 中间件
- [ ] 添加多社交登录
- [ ] 实现 Token 刷新
- [ ] 用户权限管理

## 📞 需要帮助？

1. 查看 [GITHUB_AUTH_QUICK_START.md](./GITHUB_AUTH_QUICK_START.md) 的常见问题部分
2. 查看 [docs/GITHUB_AUTH_SETUP.md](./docs/GITHUB_AUTH_SETUP.md) 的故障排除章节
3. 查看 [GITHUB_AUTH_TEST_CHECKLIST.md](./GITHUB_AUTH_TEST_CHECKLIST.md) 了解详细测试步骤

---

**准备好了吗？** 👉 从 [GITHUB_AUTH_QUICK_START.md](./GITHUB_AUTH_QUICK_START.md) 开始吧！ 🚀
