# 数据库适配器架构

## 概述

本项目实现了**环境自适应的数据库层**，支持：

- **本地开发**：使用 SQLite 文件数据库
- **Cloudflare 部署**：使用 Cloudflare D1

无需修改任何 API 路由代码，系统会自动检测运行环境并选择相应的数据库适配器。

## 架构设计

```
lib/db-user.ts（统一接口层）
    ↓
    ├─ 检测运行环境
    ├─ 动态导入适配器
    └─ 调用适配器方法
         ↓
    ┌────────────────────┐
    │                    │
    ▼                    ▼
SQLite 适配器        D1 适配器
(本地开发)           (生产部署)
    │                    │
    ▼                    ▼
.data/users.db      Cloudflare D1
```

## 环境检测

```typescript
function isCloudflareWorker(): boolean {
  return typeof globalThis !== 'undefined' && 'caches' in globalThis
}
```

检测逻辑：

- Cloudflare Workers 环境中存在 `caches` 全局对象
- 本地 Node.js 开发环境中不存在此对象

## 文件结构

```
lib/
├── db-user.ts              # 统一接口层
├── auth.ts                 # 认证逻辑（已有）
└── adapters/
    ├── index.ts            # 适配器导出
    ├── sqlite-adapter.ts   # SQLite 实现（本地开发）
    └── d1-adapter.ts       # D1 实现（生产部署）
```

## 统一接口（lib/db-user.ts）

```typescript
export interface DatabaseAdapter {
  getUserById(githubId: number): Promise<StoredUser | null>
  getUserByLogin(login: string): Promise<StoredUser | null>
  upsertUser(githubUser: GitHubUser, token: string): Promise<StoredUser>
}

// 公开 API
export async function getUserById(githubId: number): Promise<StoredUser | null>
export async function getUserByLogin(login: string): Promise<StoredUser | null>
export async function upsertUser(
  githubUser: GitHubUser,
  token: string
): Promise<StoredUser>
```

所有 API 路由直接使用这些函数，无需关心底层实现。

## SQLite 适配器（本地开发）

### 特点

- 使用 `sql.js`（纯 JavaScript SQLite）
- 文件系统持久化到 `.data/users.db`
- 自动初始化数据库和表
- 支持本地离线开发

### 实现

```typescript
export class SqliteAdapter implements DatabaseAdapter {
  private db: SqlJsDatabase | null = null

  async initialize(): Promise<void>
  async getUserById(githubId: number): Promise<StoredUser | null>
  async getUserByLogin(login: string): Promise<StoredUser | null>
  async upsertUser(githubUser: GitHubUser, token: string): Promise<StoredUser>
  private save(): void
}
```

### 数据存储

- 数据库文件：`.data/users.db`
- 自动创建：首次使用时自动创建数据库和表
- 自动保存：每次修改数据后自动保存到文件

## D1 适配器（生产部署）

### 特点

- 使用 Cloudflare D1
- 从 `globalThis.DB` 获取数据库绑定
- 支持异步操作
- 自动创建表（首次部署）

### 实现

```typescript
export class D1Adapter implements DatabaseAdapter {
  private db: D1Database | null = null

  private getDb(): D1Database
  async initialize(): Promise<void>
  async getUserById(githubId: number): Promise<StoredUser | null>
  async getUserByLogin(login: string): Promise<StoredUser | null>
  async upsertUser(githubUser: GitHubUser, token: string): Promise<StoredUser>
}
```

### 配置

在 `wrangler.jsonc` 中配置 D1 绑定：

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "agent-builder",
      "database_id": "675240e7-4ff8-4d9b-8123-8ee52673640f",
    },
  ],
}
```

## 使用方式

### API 路由（无需改动）

```typescript
// app/api/auth/github/callback/route.ts
import { upsertUser } from '@/lib/db-user'

export async function GET(request: NextRequest) {
  // ... GitHub OAuth 流程 ...

  const storedUser = await upsertUser(githubUser, accessToken)

  // 自动使用正确的数据库适配器 ✅
}
```

### 本地开发

```bash
# 1. 启动开发服务器
pnpm dev

# 应该看到：
# ✅ SQLite 数据库已初始化，位置: .data/users.db

# 2. 打开浏览器测试
# http://localhost:3000/agent-builder
```

### Cloudflare 部署

```bash
# 1. 构建
pnpm build

# 2. 部署
wrangler deploy

# 3. 自动初始化
# 第一次请求时，D1Adapter 会创建用户表
```

## 工作流程

### 本地开发流程

```
用户点击登录
    ↓
GET /api/auth/github/callback
    ↓
upsertUser(githubUser, accessToken)
    ↓
db-user.ts 检测环境（本地）
    ↓
导入 SqliteAdapter
    ↓
SqliteAdapter.upsertUser()
    ↓
sql.js 执行 INSERT/UPDATE
    ↓
save() 导出数据库
    ↓
写入 .data/users.db 文件
    ↓
完成 ✅
```

### 生产部署流程

```
用户点击登录
    ↓
GET /api/auth/github/callback (Cloudflare Worker)
    ↓
upsertUser(githubUser, accessToken)
    ↓
db-user.ts 检测环境（Cloudflare）
    ↓
导入 D1Adapter
    ↓
D1Adapter.upsertUser()
    ↓
globalThis.DB.prepare() 执行查询
    ↓
D1 数据库保存数据
    ↓
完成 ✅
```

## 数据库表结构

两个适配器使用相同的表结构：

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

## 优化特性

### 1. 适配器缓存

```typescript
let adapterCache: DatabaseAdapter | null = null

async function getCachedAdapter(): Promise<DatabaseAdapter> {
  if (!adapterCache) {
    adapterCache = await getDbAdapter()
  }
  return adapterCache
}
```

- 避免重复初始化
- 提高性能

### 2. 自动初始化

- SQLite：启动时自动创建数据库和表
- D1：首次请求时自动创建表

### 3. 类型安全

- TypeScript 接口定义完整的契约
- 编译时检查
- IDE 自动补全

## 常见问题

### Q: 如何在本地测试 D1？

A: 目前系统自动检测环境。如需本地强制使用 D1，可添加环境变量：

```typescript
// 可选功能
const USE_D1_LOCALLY = process.env.USE_D1_LOCALLY === 'true'

function isCloudflareWorker(): boolean {
  if (USE_D1_LOCALLY) return true
  return typeof globalThis !== 'undefined' && 'caches' in globalThis
}
```

### Q: 如何迁移本地数据到 D1？

A: 可以编写迁移脚本：

```typescript
// 从 SQLite 导出
const users = sqliteDb.exec('SELECT * FROM users')

// 导入到 D1
for (const user of users) {
  await d1Db.prepare('INSERT INTO users VALUES (...)').bind(...).run()
}
```

### Q: D1 初始化失败怎么办？

A: 检查以下几点：

1. `wrangler.jsonc` 中是否正确配置了 D1 绑定
2. D1 数据库 ID 是否正确
3. 环境变量是否正确设置

## 后续优化方向

1. **数据迁移工具**
   - 自动导出 SQLite 数据
   - 导入到 D1

2. **监控和日志**
   - 记录数据库操作
   - 性能指标收集

3. **备份和恢复**
   - 定期备份 SQLite 数据
   - 支持数据恢复

## 总结

这个设计模式提供了：

- ✅ 开发和生产环境的完全隔离
- ✅ 零改动迁移
- ✅ 类型安全
- ✅ 易于测试和扩展
- ✅ 自动初始化
- ✅ 性能优化
