# GitHub 认证系统测试清单

## ✅ 配置检查清单

### 1️⃣ 环境配置

- [ ] 复制 `.env.local.example` 为 `.env.local`
- [ ] 填入 `GITHUB_CLIENT_ID`
  ```bash
  # 来自 GitHub Settings → Developers → OAuth Apps → Agent Builder
  ```
- [ ] 填入 `GITHUB_CLIENT_SECRET`
  ```bash
  # 来自 GitHub Settings → Developers → OAuth Apps → Agent Builder
  ```
- [ ] 生成并填入 `JWT_SECRET`
  ```bash
  openssl rand -base64 32
  ```
- [ ] 设置 `NEXT_PUBLIC_API_BASE_URL`
  ```bash
  # 本地: http://localhost:3000
  # 生产: https://your-domain.com
  ```

### 2️⃣ GitHub OAuth 应用配置

- [ ] 访问 https://github.com/settings/developers
- [ ] 创建或选择 "Agent Builder" OAuth 应用
- [ ] 验证 "Homepage URL": http://localhost:3000
- [ ] 验证 "Authorization callback URL":
  ```
  http://localhost:3000/agent-builder/api/auth/github/callback
  ```
- [ ] 记录 Client ID 和 Client Secret

### 3️⃣ Cloudflare D1 数据库配置

- [ ] 登录 Cloudflare 控制台
- [ ] 验证数据库名称: `agent-builder`
- [ ] 验证数据库 ID: `675240e7-4ff8-4d9b-8123-8ee52673640f`
- [ ] 在 Cloudflare 控制台中执行以下 SQL：

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

### 4️⃣ wrangler.jsonc 配置

- [ ] 检查 D1 数据库绑定是否已添加
  ```bash
  grep -A 5 "d1_databases" wrangler.jsonc
  ```

## 🧪 功能测试清单

### 1️⃣ 获取授权 URL

**终端测试**:
```bash
curl http://localhost:3000/agent-builder/api/auth/github/authorize | jq
```

**预期结果**:
```json
{
  "authUrl": "https://github.com/login/oauth/authorize?client_id=...&redirect_uri=...&scope=...&state=..."
}
```

**检查项**:
- [ ] 返回 200 状态码
- [ ] 返回了有效的 GitHub OAuth URL
- [ ] 包含 `client_id` 参数
- [ ] 包含 `redirect_uri` 参数
- [ ] 包含 `scope` 参数
- [ ] 包含 `state` 参数

**浏览器测试**:
```javascript
// 浏览器控制台
const res = await fetch('/agent-builder/api/auth/github/authorize')
const data = await res.json()
console.log(data.authUrl)
// 在新标签页打开
window.open(data.authUrl)
```

### 2️⃣ OAuth 回调流程

**手动测试**:
1. [ ] 点击登录按钮（或打开授权 URL）
2. [ ] 被重定向到 GitHub 登录页面
3. [ ] 使用 GitHub 账号登录
4. [ ] 点击授权应用
5. [ ] 被重定向到 `http://localhost:3000/agent-builder`
6. [ ] 浏览器地址栏中的 URL 没有 error 参数

**Cookie 验证**:
```javascript
// 浏览器控制台
document.cookie
// 应该包含: auth_token=eyJhbGc...
```

**检查项**:
- [ ] 没有错误重定向
- [ ] `auth_token` cookie 已设置
- [ ] Cookie 有 HttpOnly 标志
- [ ] Cookie 有 SameSite=Lax
- [ ] Cookie 过期时间 = 7 天

### 3️⃣ 获取当前用户

**测试**:
```bash
# 使用 cookie 自动认证
curl http://localhost:3000/agent-builder/api/auth/me

# 或使用 Authorization header
curl -H "Authorization: Bearer <your_jwt_token>" \
  http://localhost:3000/agent-builder/api/auth/me
```

**预期结果**:
```json
{
  "id": 123456,
  "login": "your_github_username",
  "name": "Your Name",
  "email": "your_email@example.com",
  "avatar_url": "https://avatars.githubusercontent.com/u/123456?v=4",
  "bio": "Your bio",
  "company": "Your company",
  "blog": "Your blog",
  "location": "Your location",
  "twitter_username": "Your twitter",
  "public_repos": 42,
  "public_gists": 5,
  "followers": 100,
  "following": 50,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-02T00:00:00Z",
  "created_at_db": "2024-01-03T12:34:56Z",
  "updated_at_db": "2024-01-03T12:34:56Z"
}
```

**检查项**:
- [ ] 返回 200 状态码
- [ ] 包含所有用户信息字段
- [ ] 没有包含敏感的 GitHub token
- [ ] 包含 D1 时间戳

**浏览器测试**:
```javascript
// 浏览器控制台
const res = await fetch('/agent-builder/api/auth/me')
const user = await res.json()
console.log(user)
```

### 4️⃣ 登出功能

**测试**:
```bash
curl -X POST http://localhost:3000/agent-builder/api/auth/logout
```

**预期结果**:
```json
{
  "message": "Logged out successfully"
}
```

**Cookie 验证**:
```javascript
// 登出后
document.cookie
// auth_token 应该已删除
```

**检查项**:
- [ ] 返回 200 状态码
- [ ] `auth_token` cookie 已删除
- [ ] `github_oauth_state` cookie 已删除
- [ ] 后续 `/me` 请求返回 401

### 5️⃣ 数据库验证

**连接 D1 数据库**:
```bash
wrangler d1 execute agent-builder --remote --command="SELECT * FROM users LIMIT 1"
```

**检查项**:
- [ ] 表已创建
- [ ] 用户已存储在表中
- [ ] 用户信息包含所有字段
- [ ] 时间戳格式正确 (ISO 8601)

## 🔐 安全测试清单

### 1️⃣ JWT Token 验证

```javascript
// 在 https://jwt.io 中解码 token
// 验证:
// - Header: { "alg": "HS256", "typ": "JWT" }
// - Payload: { "userId": 123456, "login": "username", "iat": ..., "exp": ... }
```

**检查项**:
- [ ] Algorithm 是 HS256
- [ ] Token 包含 `userId` 和 `login`
- [ ] Token 包含 `iat` (issued at) 时间戳
- [ ] Token 包含 `exp` (expiration) 时间戳
- [ ] Expiration 时间约为 7 天后

### 2️⃣ CSRF 防护验证

```bash
# 尝试从不同来源发起请求 (需要 CORS 配置)
curl -X GET http://localhost:3000/agent-builder/api/auth/github/authorize \
  -H "Origin: http://evil.com" \
  -H "Referer: http://evil.com"
```

**检查项**:
- [ ] State token 在 cookie 中
- [ ] State token 有 10 分钟过期时间
- [ ] HttpOnly flag 已设置

### 3️⃣ XSS 防护验证

```javascript
// 验证 token 不能通过 JavaScript 访问
document.domain  // 应该受限
localStorage.auth_token  // 不应该存储 token
```

**检查项**:
- [ ] Token 存储在 HttpOnly cookie 中
- [ ] Token 不在 localStorage 中
- [ ] Token 不在 sessionStorage 中

### 4️⃣ Token 过期验证

```bash
# 等待 7 天 或 修改 auth.ts 中的过期时间进行快速测试
# 然后验证
curl http://localhost:3000/agent-builder/api/auth/me
# 应该返回 401
```

**检查项**:
- [ ] 过期 token 返回 401
- [ ] 错误消息: "Invalid or expired token"

## 📊 集成测试清单

### 1️⃣ 完整登录流程

- [ ] 访问首页 http://localhost:3000
- [ ] 点击登录按钮
- [ ] 被重定向到 GitHub
- [ ] 授权应用
- [ ] 被重定向到首页
- [ ] 显示用户信息（如果 UI 已实现）
- [ ] 用户头像显示正确
- [ ] 用户名显示正确

### 2️⃣ 登录/登出循环

- [ ] 登录
- [ ] 验证已认证状态
- [ ] 点击登出
- [ ] 验证已注销状态
- [ ] 重新登录
- [ ] 验证新 token 已生成

### 3️⃣ 多标签页测试

- [ ] 在标签页 A 中登录
- [ ] 在标签页 B 中验证是否已认证
- [ ] 在标签页 A 中登出
- [ ] 在标签页 B 中验证登出状态

## 🚀 性能测试清单

### 1️⃣ 授权 URL 生成时间

```bash
time curl http://localhost:3000/agent-builder/api/auth/github/authorize
# 应该在 100ms 内完成
```

### 2️⃣ 用户信息查询时间

```bash
# 登录后测试多次
time curl http://localhost:3000/agent-builder/api/auth/me
# 应该在 50ms 内完成
```

### 3️⃣ 数据库查询性能

```bash
# 验证索引是否有效
wrangler d1 execute agent-builder --remote --command="EXPLAIN QUERY PLAN SELECT * FROM users WHERE login='username'"
# 应该使用 idx_users_login 索引
```

## ⚠️ 错误处理测试清单

### 1️⃣ 缺少环境变量

- [ ] 删除 `GITHUB_CLIENT_ID`，测试错误处理
  ```bash
  # 应该返回: "GitHub Client ID is not configured"
  ```

- [ ] 删除 `JWT_SECRET`，测试错误处理
  ```bash
  # 应该返回: "JWT_SECRET environment variable is not set"
  ```

### 2️⃣ 无效的授权码

```bash
curl "http://localhost:3000/agent-builder/api/auth/github/callback?code=invalid_code&state=invalid_state"
# 应该重定向到错误页面，不应该崩溃
```

**检查项**:
- [ ] 返回 302 重定向
- [ ] 重定向 URL 包含 `error` 参数
- [ ] 错误消息可读

### 3️⃣ 无效的 JWT Token

```bash
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:3000/agent-builder/api/auth/me
# 应该返回 401
```

**检查项**:
- [ ] 返回 401 状态码
- [ ] 返回错误消息

### 4️⃣ D1 数据库不可用

```bash
# 临时关闭 D1，测试错误处理
# 应该有有意义的错误消息
```

## 📝 测试报告模板

```markdown
# GitHub 认证系统测试报告

## 测试日期: YYYY-MM-DD
## 测试环境: [开发/生产]
## 测试者: [名字]

### 配置检查
- [ ] 环境变量已配置
- [ ] GitHub OAuth 应用已配置
- [ ] D1 数据库已配置
- [ ] wrangler.jsonc 已更新

### 功能测试结果
- [ ] 获取授权 URL - PASS/FAIL
- [ ] OAuth 回调 - PASS/FAIL
- [ ] 获取当前用户 - PASS/FAIL
- [ ] 登出功能 - PASS/FAIL
- [ ] 数据库存储 - PASS/FAIL

### 安全测试结果
- [ ] JWT Token 验证 - PASS/FAIL
- [ ] CSRF 防护 - PASS/FAIL
- [ ] XSS 防护 - PASS/FAIL
- [ ] Token 过期 - PASS/FAIL

### 性能测试结果
- [ ] 授权 URL 生成 - PASS/FAIL
- [ ] 用户信息查询 - PASS/FAIL
- [ ] 数据库性能 - PASS/FAIL

### 错误处理测试结果
- [ ] 缺少环境变量 - PASS/FAIL
- [ ] 无效授权码 - PASS/FAIL
- [ ] 无效 Token - PASS/FAIL
- [ ] 数据库错误 - PASS/FAIL

### 整体结果: [PASS/FAIL]

### 备注
...
```

## 🔗 参考资源

- [GitHub OAuth 文档](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GITHUB_AUTH_SETUP.md](./docs/GITHUB_AUTH_SETUP.md)
- [GITHUB_AUTH_QUICK_START.md](./docs/GITHUB_AUTH_QUICK_START.md)
- [GITHUB_AUTH_ARCHITECTURE.md](./docs/GITHUB_AUTH_ARCHITECTURE.md)

---

✅ 完成所有测试后，系统已准备好用于生产环境！
