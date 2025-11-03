# GitHub OAuth 认证系统架构

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端 (浏览器)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. 点击登录 → 2. 获取授权 URL → 3. 重定向到 GitHub              │
│                       ↓                                           │
│              /agent-builder/api/auth/github/authorize            │
│                                                                   │
│  4. GitHub 授权 → 5. 回调 URL + code                            │
│                       ↓                                           │
│              /agent-builder/api/auth/github/callback             │
│                       ↓                                           │
│  6. 返回 JWT token (cookie) → 重定向到首页                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓                              ↓                    ↓
    ┌─────────────┐           ┌──────────────────┐  ┌──────────────┐
    │   GitHub    │           │  Next.js Server  │  │ Cloudflare   │
    │  OAuth API  │           │                  │  │     D1       │
    └─────────────┘           └──────────────────┘  └──────────────┘
         ↑                              ↓                    ↓
         │        交换授权码 → 获取用户信息              存储用户
         │                      生成 JWT                  查询用户
         └──────────────────────────────────────────────────┘
```

## 认证流程时序图

```
客户端                GitHub            Next.js Server        D1 Database
  │                   │                     │                    │
  │ 1. 点击登录         │                     │                    │
  ├────────────────────>│ authorize endpoint  │                    │
  │                   │                     │                    │
  │ 2. 返回授权 URL    │                     │                    │
  │<────────────────────┤                     │                    │
  │                   │                     │                    │
  │ 3. 重定向到 GitHub  │                     │                    │
  ├──────────────────────────────────────────>│                    │
  │                   │ 4. 授权              │                    │
  │                   │ 5. 重定向回调        │                    │
  │ 6. 回调 (code)     │                     │                    │
  ├─────────────────────────────────────────>│                    │
  │                   │                     │ 7. 交换 code        │
  │                   │ 8. 返回 access_token │                    │
  │                   │<─────────────────────┤                    │
  │                   │                     │ 9. 获取用户信息      │
  │                   │ 10. 返回用户信息     │                    │
  │                   │<─────────────────────┤                    │
  │                   │                     │ 11. 存储/更新用户   │
  │                   │                     ├───────────────────>│
  │                   │                     │ 12. 用户已保存      │
  │                   │                     │<───────────────────┤
  │                   │                     │ 13. 生成 JWT token  │
  │ 14. 返回 JWT (cookie)                   │                    │
  │<─────────────────────────────────────────┤                    │
  │ 15. 设置 cookie，重定向到首页           │                    │
  │ 16. 浏览已登录                          │                    │
```

## 文件依赖图

```
客户端应用
    │
    ├─> /agent-builder/api/auth/github/authorize
    │       ├─ import: NextRequest, NextResponse
    │       ├─ import: randomUUID (crypto)
    │       └─ 返回: { authUrl }
    │
    ├─> /agent-builder/api/auth/github/callback
    │       ├─ import: NextRequest, NextResponse
    │       ├─ import: generateToken (lib/auth.ts)
    │       ├─ import: upsertUser (lib/db-user.ts)
    │       ├─ import: GitHubUser type (lib/auth.ts)
    │       ├─ 交换授权码
    │       ├─ 获取用户信息
    │       ├─ 存储用户
    │       ├─ 生成 JWT
    │       └─ 返回: 重定向 + cookie
    │
    ├─> /agent-builder/api/auth/me
    │       ├─ import: NextRequest, NextResponse
    │       ├─ import: verifyToken (lib/auth.ts)
    │       ├─ import: getUserById (lib/db-user.ts)
    │       └─ 返回: { 用户信息 }
    │
    └─> /agent-builder/api/auth/logout
            ├─ import: NextRequest, NextResponse
            └─ 返回: 清除 cookie

lib/auth.ts
    ├─ import: jwtVerify, SignJWT (jose)
    ├─ export: generateToken()
    ├─ export: verifyToken()
    ├─ export: getTokenFromHeader()
    ├─ export: interface JWTPayload
    ├─ export: interface GitHubUser
    └─ export: interface StoredUser

lib/db-user.ts
    ├─ import: GitHubUser, StoredUser (lib/auth.ts)
    ├─ export: getDatabase()
    ├─ export: getUserById()
    ├─ export: getUserByLogin()
    └─ export: upsertUser()

lib/db-init.ts
    ├─ export: usersTableSchema
    └─ export: createIndexes

lib/auth-middleware.ts
    ├─ import: NextRequest, NextResponse
    ├─ import: verifyToken (lib/auth.ts)
    ├─ import: getTokenFromHeader (lib/auth.ts)
    ├─ export: interface AuthenticatedRequest
    └─ export: withAuth()

配置文件
    ├─ wrangler.jsonc
    │   └─ d1_databases 绑定
    ├─ .env.local.example
    │   ├─ GITHUB_CLIENT_ID
    │   ├─ GITHUB_CLIENT_SECRET
    │   ├─ JWT_SECRET
    │   └─ NEXT_PUBLIC_API_BASE_URL
    └─ package.json
        └─ dependencies: jose
```

## 模块交互图

```
                    ┌─────────────────────────┐
                    │   GitHub OAuth API      │
                    │  (GitHub 服务)          │
                    └────────────┬────────────┘
                                 │
                    OAuth 授权码交换, 用户信息获取
                                 │
                    ┌────────────▼────────────┐
                    │  OAuth Callback Route   │
                    │ (处理 OAuth 流程)       │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                        │
                    ▼                        ▼
         ┌─────────────────────┐  ┌──────────────────┐
         │   generateToken()   │  │   upsertUser()   │
         │    (生成 JWT)       │  │   (存储用户)     │
         └────────┬────────────┘  └────────┬─────────┘
                  │                        │
         ┌────────▼────────┐      ┌────────▼─────────┐
         │  lib/auth.ts    │      │  lib/db-user.ts  │
         │  (JWT 工具)     │      │  (D1 操作)       │
         └────────┬────────┘      └────────┬─────────┘
                  │                        │
                  └────────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │  设置 Cookie 并     │
                    │  重定向到首页       │
                    └─────────────────────┘
```

## 数据流

```
┌──────────────────────────────────────────────────────────┐
│                     数据流图                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. 前端请求                                            │
│     GET /agent-builder/api/auth/github/authorize        │
│     →  { authUrl: "https://github.com/login/..." }      │
│                                                          │
│  2. 用户授权后                                          │
│     GET /agent-builder/api/auth/github/callback         │
│     ?code=xxx&state=xxx                                 │
│                                                          │
│  3. 交换授权码                                          │
│     POST https://github.com/login/oauth/access_token    │
│     ← { access_token: "gho_...", ... }                 │
│                                                          │
│  4. 获取用户信息                                        │
│     GET https://api.github.com/user                     │
│     Authorization: Bearer gho_...                       │
│     ← {                                                  │
│         id: 123456,                                     │
│         login: "username",                              │
│         name: "User Name",                              │
│         email: "user@example.com",                      │
│         avatar_url: "https://...",                      │
│         bio: "...",                                     │
│         ...                                             │
│       }                                                  │
│                                                          │
│  5. 存储用户到 D1                                       │
│     INSERT OR UPDATE users                             │
│     WHERE id = 123456                                  │
│                                                          │
│  6. 生成 JWT Token                                      │
│     header:   { alg: "HS256" }                         │
│     payload:  { userId: 123456, login: "username" }   │
│     signature: HMACSHA256(...)                         │
│     ← eyJhbGc... (JWT token)                           │
│                                                          │
│  7. 设置 Cookie                                         │
│     Set-Cookie: auth_token=eyJhbGc...; HttpOnly; ...  │
│                                                          │
│  8. 重定向                                              │
│     Location: /agent-builder                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 安全架构

```
┌────────────────────────────────────────────────────────┐
│                   安全防护层                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  1. 初始授权                                          │
│     ├─ CSRF 防护: State Token (随机 UUID)           │
│     │  └─ 存储在 HttpOnly Cookie 中                 │
│     └─ 验证: 比对回调中的 state 与 cookie 中的值   │
│                                                      │
│  2. Token 交换                                       │
│     ├─ 使用 HTTPS (生产环境)                       │
│     ├─ 验证 Client Secret                          │
│     └─ 防止 token 泄露                             │
│                                                      │
│  3. JWT Token 生成                                  │
│     ├─ 算法: HS256                                 │
│     ├─ 密钥: JWT_SECRET (加密)                     │
│     ├─ 过期时间: 7 天                              │
│     └─ 防止篡改: 签名验证                          │
│                                                      │
│  4. Cookie 设置                                     │
│     ├─ HttpOnly: 防止 XSS 盗取                     │
│     ├─ Secure: 生产环境 HTTPS only                 │
│     ├─ SameSite=Lax: 防止 CSRF                    │
│     └─ Domain/Path: 限制范围                       │
│                                                      │
│  5. Access Token 存储                              │
│     ├─ 存储位置: D1 数据库                         │
│     ├─ 不在 URL 中传输                             │
│     ├─ 不在客户端存储                              │
│     └─ 仅在需要时从服务器读取                      │
│                                                      │
│  6. 后续请求认证                                    │
│     ├─ 从 Cookie 中读取 JWT token                  │
│     ├─ 验证 token 签名                             │
│     ├─ 检查过期时间                                │
│     └─ 查询 D1 获取用户信息                        │
│                                                      │
└────────────────────────────────────────────────────────┘
```

## 状态转换图

```
                        ┌─────────────────┐
                        │   未认证状态     │
                        └────────┬────────┘
                                 │
                    用户点击登录  │
                                 ▼
                        ┌─────────────────┐
                        │ 授权中           │
                        │ (重定向到 GitHub)│
                        └────────┬────────┘
                                 │
              用户授权应用        │ 获得授权码
                                 ▼
                        ┌─────────────────┐
                        │ 交换 Token 中    │
                        │ (回调处理)       │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼ 失败             ▼ 成功             │ 存储用户
              │                  │                  │
         授权失败 ←──────────────▼─────────────────│
                          ┌─────────────────┐      │
                          │ 已认证状态      │◄────┘
                          │ (JWT + Cookie) │
                          └────────┬────────┘
                                   │
                    用户点击登出    │
                                   ▼
                          ┌─────────────────┐
                          │ 清除 Cookie     │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   未认证状态     │
                          └─────────────────┘
```

## 性能优化路径

```
性能优化方向
│
├─ 缓存优化
│  ├─ 用户信息缓存 (Redis/内存)
│  ├─ GitHub 用户信息的 TTL
│  └─ 减少 D1 查询次数
│
├─ 数据库优化
│  ├─ 索引优化 (login, id)
│  ├─ 批量操作
│  └─ 连接池
│
├─ 网络优化
│  ├─ CDN 加速
│  ├─ 异步处理
│  └─ 预加载
│
└─ Token 优化
   ├─ Token 刷新机制
   ├─ 滑动过期时间
   └─ Token 轮换
```

---

更多信息见 [GITHUB_AUTH_SETUP.md](./GITHUB_AUTH_SETUP.md) 和 [GITHUB_AUTH_QUICK_START.md](./GITHUB_AUTH_QUICK_START.md)
