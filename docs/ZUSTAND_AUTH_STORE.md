# Zustand 全局认证状态管理指南

## 📋 概述

本项目使用 **Zustand** 进行全局用户认证状态管理。用户登录信息在应用启动时自动获取，然后在所有组件间共享，避免重复的网络请求。

## 🏗️ 架构

```
┌─────────────────────────────────────────────────┐
│          app/layout.tsx (root)                  │
│         ┌──────────────────────────┐            │
│         │   <AuthProvider>         │            │
│         │  ┌────────────────────┐  │            │
│         │  │  useAuthStore      │  │            │
│         │  │  - 初始化用户信息  │  │            │
│         │  │  - 监听状态变化    │  │            │
│         │  └────────────────────┘  │            │
│         │         ↓                 │            │
│         │   应用其他组件            │            │
│         └──────────────────────────┘            │
└─────────────────────────────────────────────────┘
         ↓
所有子组件可通过 useAuthStore 访问用户信息
```

## 📁 文件结构

```
lib/
├── store/
│   └── auth-store.ts           # Zustand 状态定义
└── providers/
    └── auth-provider.tsx       # AuthProvider 组件

components/
└── nav-user.tsx                # 使用 store 的组件示例
```

## 🚀 快速开始

### 在组件中使用用户信息

```tsx
'use client'

import { useAuthStore } from '@/lib/store/auth-store'

export function UserCard() {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)

  if (isLoading) {
    return <div>加载中...</div>
  }

  if (!user) {
    return <div>请先登录</div>
  }

  return (
    <div>
      <h1>{user.name || user.login}</h1>
      <img src={user.avatar_url} alt={user.login} />
      <p>@{user.login}</p>
    </div>
  )
}
```

## 📖 API 参考

### useAuthStore

#### 状态

| 属性 | 类型 | 说明 |
|-----|------|------|
| `user` | `User \| null` | 当前用户信息，未登录时为 null |
| `isLoading` | `boolean` | 用户信息加载状态 |
| `isInitialized` | `boolean` | 是否已初始化过用户信息 |

#### 方法

| 方法 | 参数 | 返回值 | 说明 |
|-----|------|-------|------|
| `fetchUser()` | - | `Promise<void>` | 从 API 获取用户信息 |
| `logout()` | - | `void` | 清除用户信息 |
| `setUser(user)` | `User \| null` | `void` | 设置用户信息 |
| `setIsLoading(loading)` | `boolean` | `void` | 设置加载状态 |
| `setIsInitialized(initialized)` | `boolean` | `void` | 设置初始化状态 |

### User 接口

```typescript
interface User {
  id: number
  login: string
  name?: string
  email?: string
  avatar_url?: string
  bio?: string
  company?: string
  blog?: string
  location?: string
  twitter_username?: string
  public_repos?: number
  public_gists?: number
  followers?: number
  following?: number
  created_at?: string
  updated_at?: string
}
```

## 💡 常见用法

### 1. 检查用户是否登录

```tsx
const user = useAuthStore((state) => state.user)

if (!user) {
  return <LoginPrompt />
}
```

### 2. 获取当前用户 ID

```tsx
const userId = useAuthStore((state) => state.user?.id)

async function saveData() {
  await fetch('/api/data', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      data: {...}
    })
  })
}
```

### 3. 监听用户信息变化

```tsx
useEffect(() => {
  const user = useAuthStore((state) => state.user)
  console.log('用户信息已更新:', user)
}, [user])
```

### 4. 手动刷新用户信息

```tsx
const fetchUser = useAuthStore((state) => state.fetchUser)

async function handleRefresh() {
  await fetchUser()
}
```

### 5. 登出后清空信息

```tsx
const logout = useAuthStore((state) => state.logout)

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  logout()  // 清空 store 中的用户信息
}
```

## 🔄 数据流程

### 初始化流程

```
页面加载
  ↓
AuthProvider 挂载
  ↓
useEffect 检查 isInitialized
  ↓
调用 fetchUser()
  ↓
set isLoading = true
  ↓
fetch /agent-builder/api/auth/me
  ↓
处理响应
  ↓
set user = response.data
  ↓
set isInitialized = true
  ↓
set isLoading = false
  ↓
所有订阅 store 的组件自动更新 ✅
```

### 登出流程

```
用户点击登出
  ↓
handleLogout() 执行
  ↓
POST /api/auth/logout
  ↓
logout() - 清空 store 中的 user
  ↓
所有使用 useAuthStore 的组件检测到 user = null
  ↓
组件自动重新渲染 ✅
```

## 🛡️ 最佳实践

### ✅ 推荐做法

1. **在顶层初始化**
   ```tsx
   // 在 app/layout.tsx 中使用 AuthProvider
   // 让所有组件都能访问用户信息
   ```

2. **选择性订阅**
   ```tsx
   // ✅ 好 - 只订阅需要的部分
   const user = useAuthStore((state) => state.user)
   const isLoading = useAuthStore((state) => state.isLoading)
   ```

3. **处理加载和错误状态**
   ```tsx
   if (isLoading) return <Skeleton />
   if (!user) return <LoginPrompt />
   return <Content user={user} />
   ```

### ❌ 避免做法

1. **不要在服务端组件中使用**
   ```tsx
   // ❌ 错误 - 'use client' 是必需的
   export default function ServerComponent() {
     const user = useAuthStore(...)
   }
   ```

2. **不要多次初始化**
   ```tsx
   // ❌ 错误 - AuthProvider 只需要在 root layout 一次
   export function Page() {
     return (
       <AuthProvider>
         <AuthProvider>
           {/* 重复初始化 */}
         </AuthProvider>
       </AuthProvider>
     )
   }
   ```

3. **不要在循环中调用 hook**
   ```tsx
   // ❌ 错误
   users.map(u => {
     const store = useAuthStore()  // 违反 Rules of Hooks
   })
   ```

## 🔌 集成其他功能

### 创建受保护的路由

```tsx
'use client'

import { useAuthStore } from '@/lib/store/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ProtectedPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const isInitialized = useAuthStore((state) => state.isInitialized)

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login')
    }
  }, [isInitialized, user, router])

  if (!isInitialized) {
    return <div>Loading...</div>
  }

  return <div>Protected content for {user?.login}</div>
}
```

### 创建登出按钮

```tsx
'use client'

import { useAuthStore } from '@/lib/store/auth-store'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function LogoutButton() {
  const logout = useAuthStore((state) => state.logout)

  async function handleLogout() {
    try {
      await fetch('/agent-builder/api/auth/logout', { method: 'POST' })
      logout()
      toast.success('已登出')
    } catch (error) {
      toast.error('登出失败')
    }
  }

  return <Button onClick={handleLogout}>登出</Button>
}
```

## 🐛 调试

### 在浏览器控制台查看状态

```javascript
// 查看完整的 store 状态
import { useAuthStore } from '@/lib/store/auth-store'
console.log(useAuthStore.getState())

// 查看特定部分
console.log(useAuthStore.getState().user)
console.log(useAuthStore.getState().isLoading)

// 订阅状态变化（用于调试）
useAuthStore.subscribe((state) => {
  console.log('Store changed:', state)
})
```

### React DevTools

可以安装 [Zustand DevTools](https://github.com/charkour/zustood) 来在 React DevTools 中调试 store 状态。

## 🚀 性能优化

### 避免不必要的重新渲染

```tsx
// ❌ 每次 store 变化都重新渲染
const state = useAuthStore()

// ✅ 只在特定字段变化时重新渲染
const user = useAuthStore((state) => state.user)
const isLoading = useAuthStore((state) => state.isLoading)
```

### 使用 useShallow（如果需要）

如果你需要订阅整个 state 对象但希望避免每次都重新渲染：

```tsx
import { useShallow } from 'zustand/react'

const { user, isLoading } = useAuthStore(
  useShallow((state) => ({
    user: state.user,
    isLoading: state.isLoading,
  }))
)
```

## 📚 相关文件

- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [认证 API 路由](../app/api/auth)
- [AuthProvider 实现](../lib/providers/auth-provider.tsx)
- [Store 定义](../lib/store/auth-store.ts)

## 📝 更新日志

### v1.0 (2025-10-24)
- ✅ 集成 Zustand 全局状态管理
- ✅ 实现 AuthProvider 自动初始化
- ✅ 重构 NavUser 组件使用 store
- ✅ 移除组件级重复的 API 调用

---

**最后更新**: 2025-10-24
