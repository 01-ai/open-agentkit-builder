# GitHub OAuth Authentication Setup Guide

## 概述

本项目实现了基于 GitHub OAuth 的身份认证系统，使用 Cloudflare D1 存储用户信息，JWT 管理会话。

## 架构

```
GitHub OAuth Flow
├── 1. 用户点击"使用 GitHub 登录"
├── 2. 前端调用 /agent-builder/api/auth/github/authorize 获取授权 URL
├── 3. 重定向到 GitHub 登录页面
├── 4. GitHub 将用户重定向到 /agent-builder/api/auth/github/callback
├── 5. 后端交换授权码获取 access token
├── 6. 获取用户信息并存储到 D1
├── 7. 生成 JWT token 并设置 cookie
└── 8. 重定向到首页 /agent-builder
```

## 前置准备

### 1. GitHub OAuth 应用注册

在 GitHub 上创建 OAuth 应用：

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写应用信息：
   - **Application name**: Agent Builder
   - **Homepage URL**: http://localhost:3000（开发环境）或 https://your-domain.com（生产环境）
   - **Authorization callback URL**: http://localhost:3000/agent-builder/api/auth/github/callback
4. 记下 **Client ID** 和 **Client Secret**

### 2. Cloudflare D1 数据库

在 Cloudflare 中创建 D1 数据库：

1. 访问 Cloudflare Dashboard
2. 创建新的 D1 数据库，命名为 `agent-builder`
3. 记下数据库 ID（已在 `wrangler.jsonc` 中配置）

### 3. 创建数据库表

使用 Cloudflare 控制台或 `wrangler` CLI 执行以下 SQL：

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

## 环境变量配置

复制 `.env.local.example` 为 `.env.local` 并填入真实值：

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_min_32_characters_recommended

# API Base URL (for local development)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 生成安全的 JWT_SECRET

```bash
# macOS/Linux
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## API 端点

### 1. 获取授权 URL

**路由**: `GET /agent-builder/api/auth/github/authorize`

**响应**:

```json
{
  "authUrl": "https://github.com/login/oauth/authorize?..."
}
```

**用途**: 获取 GitHub OAuth 授权 URL，前端使用此 URL 重定向用户到 GitHub

### 2. OAuth 回调处理

**路由**: `GET /agent-builder/api/auth/github/callback`

**参数**:

- `code` (string): GitHub 返回的授权码
- `state` (string): CSRF 防护 token

**功能**:

- 交换授权码获取 access token
- 获取用户信息
- 存储用户到 D1
- 生成 JWT token
- 设置 auth_token cookie
- 重定向到首页

### 3. 获取当前用户

**路由**: `GET /agent-builder/api/auth/me`

**请求头**:

```
Authorization: Bearer <jwt_token>
```

或通过 cookie 自动发送

**响应**:

```json
{
  "id": 123456,
  "login": "username",
  "name": "User Name",
  "email": "user@example.com",
  "avatar_url": "https://...",
  "bio": "...",
  "company": "...",
  "blog": "...",
  "location": "...",
  "twitter_username": "...",
  "public_repos": 42,
  "public_gists": 5,
  "followers": 100,
  "following": 50,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-02T00:00:00Z",
  "created_at_db": "2024-01-01T00:00:00Z",
  "updated_at_db": "2024-01-02T00:00:00Z"
}
```

### 4. 登出

**路由**: `POST /agent-builder/api/auth/logout`

**功能**:

- 清除 auth_token cookie
- 清除 github_oauth_state cookie

## 前端集成示例

### 登录按钮

```tsx
import { useState } from 'react'

export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/agent-builder/api/auth/github/authorize')
      const data = await response.json()
      window.location.href = data.authUrl
    } catch (error) {
      console.error('Failed to get auth URL:', error)
      setIsLoading(false)
    }
  }

  return (
    <button onClick={handleLogin} disabled={isLoading}>
      {isLoading ? '加载中...' : '使用 GitHub 登录'}
    </button>
  )
}
```

### 获取当前用户

```tsx
import { useEffect, useState } from 'react'

export function UserProfile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/agent-builder/api/auth/me')
      if (!response.ok) {
        if (response.status === 401) {
          setUser(null)
        } else {
          throw new Error('Failed to fetch user')
        }
      } else {
        const data = await response.json()
        setUser(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error}</div>
  if (!user) return <LoginButton />

  return (
    <div>
      <img src={user.avatar_url} alt={user.login} />
      <h2>{user.name}</h2>
      <p>@{user.login}</p>
      <button onClick={handleLogout}>登出</button>
    </div>
  )
}

async function handleLogout() {
  await fetch('/agent-builder/api/auth/logout', { method: 'POST' })
  window.location.href = '/'
}
```

### 在受保护的路由中使用认证中间件

```tsx
import { withAuth } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  // 验证认证
  const authError = await withAuth(request)
  if (authError) return authError

  // 继续处理请求
  // 可以从 request 获取 userId 和 userLogin
  const userId = (request as any).userId
  const userLogin = (request as any).userLogin

  return NextResponse.json({ userId, userLogin })
}
```

## 本地开发

### 启动开发服务器

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 测试 OAuth 流程

1. 访问 http://localhost:3000
2. 点击"使用 GitHub 登录"按钮
3. 授权应用
4. 应该被重定向到首页并看到用户信息

## 生产环境部署

### Cloudflare Workers

1. 更新 GitHub OAuth 应用的 Callback URL：

   ```
   https://your-domain.com/agent-builder/api/auth/github/callback
   ```

2. 部署到 Cloudflare：

   ```bash
   pnpm run build
   npm run wrangler deploy
   ```

3. 在 Cloudflare 控制台中设置环境变量：
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `JWT_SECRET`

## 安全考虑

- ✅ JWT token 过期时间设置为 7 天
- ✅ Secure cookie flag 在生产环境中启用
- ✅ SameSite=Lax 防止 CSRF 攻击
- ✅ HttpOnly cookie 防止 XSS 攻击
- ✅ State token 用于防止 CSRF
- ✅ Access token 存储在 D1 中，而不是 cookie

## 故障排除

### "GitHub Client ID is not configured"

- 确保 `.env.local` 中设置了 `GITHUB_CLIENT_ID`
- 检查 GitHub OAuth 应用是否正确创建

### "Invalid or expired token"

- JWT token 过期，需要重新登录
- 检查 `JWT_SECRET` 是否正确

### D1 数据库错误

- 确保在 Cloudflare 中创建了 users 表
- 检查 `wrangler.jsonc` 中的数据库 ID 是否正确

## 参考资源

- [GitHub OAuth 文档](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [jose - JWT 库](https://github.com/panva/jose)
- [Cloudflare D1 文档](https://developers.cloudflare.com/workers/platform/storage/d1/)
- [Next.js 中间件](https://nextjs.org/docs/app/building-your-application/routing/middleware)
