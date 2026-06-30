# Authentication & Authorization Guide

SpeexJS provides a complete auth stack: **SessionGuard** (cookie-based), **TokenGuard** (bearer tokens), **Sanctum** (SPA token auth), **Socialite** (OAuth), **Gate** (authorization), and **RBAC** (role-based access control).

---

## AuthManager

Central auth orchestrator. Manages multiple guard instances and resolves the active guard.

```typescript
import { AuthManager, SessionGuard, TokenGuard } from 'speexjs/server/auth'

const auth = new AuthManager()

// Register guards
auth.guard('web', new SessionGuard({ ... }))
auth.guard('api', new TokenGuard({ ... }))
auth.defaultGuard('web')

// Access
const webGuard = auth.guard('web')     // Get by name
const defaultGuard = auth.guard()       // Get default

// Config
auth.setLoginPath('/login')
auth.getLoginPath()                     // '/login'
auth.hasGuard('web')                    // true
auth.removeGuard('old_guard')
```

---

## SessionGuard

Cookie-based authentication with **AES-256-GCM** encrypted session cookies.

### Configuration

```typescript
import { SessionGuard } from 'speexjs/server/auth'

const guard = new SessionGuard({
  cookieName: 'myapp_session',
  lifetime: 120,           // Session lifetime in minutes
  identifier: 'email',     // Field used for credential lookup
  password: 'password',    // Field name for password
  encryptionKey: process.env.APP_KEY,  // AES-256-GCM key
  provider: {
    findById: async (id) => db.table('users').find(id),
    findByCredential: async (field, value) => {
      return db.table('users').where(field, value).first()
    },
  },
})
```

### Session Context

SessionGuard needs access to request/response for cookie read/write:

```typescript
import { session } from 'speexjs'

// Middleware sets context automatically
app.use(session({ secret: process.env.APP_KEY }))

// Or set manually per-request:
app.get('/login', (ctx) => {
  guard.setContext(ctx.request, ctx.response)
  // Now guard can read/write cookies
})
```

### Methods

```typescript
await guard.setContext(req, res)              // Bind request/response
await guard.attempt({ email, password })       // Login with credentials → boolean
await guard.login(userId, remember?)           // Login by ID
await guard.loginUser(user)                    // Login with user object
await guard.logout()                           // Clear session
await guard.user()                             // Get authenticated user → AuthUser | null
await guard.check()                            // Is authenticated? → boolean
await guard.guest()                            // Is guest? → boolean
await guard.id()                               // Get user ID → string | number | null
await guard.set(key, value)                    // Store in session
await guard.get(key)                           // Read from session
```

### Example: Login Route

```typescript
app.post('/login', async (ctx) => {
  const { email, password } = await ctx.request.json()
  const guard = new SessionGuard({
    provider: userProvider,
  })
  guard.setContext(ctx.request, ctx.response)

  const success = await guard.attempt({ email, password })
  if (!success) {
    return ctx.response.status(401).json({ error: 'Invalid credentials' })
  }

  ctx.response.json({ user: await guard.user() })
})
```

### UserProvider Interface

```typescript
interface UserProvider {
  findById(id: string | number): Promise<AuthUser | null>
  findByCredential(field: string, value: string): Promise<AuthUser | null>
}

interface AuthUser {
  id: string | number
  [key: string]: unknown
}
```

---

## TokenGuard

Bearer token authentication with **HMAC-SHA256** token hashing.

### Configuration

```typescript
import { TokenGuard } from 'speexjs/server/auth'

const guard = new TokenGuard({
  tokenLength: 64,
  hashTokens: true,
  tokenName: 'api-token',
  secret: process.env.APP_KEY,  // HMAC signing key
  provider: {
    create: async (userId, tokenHash, name, abilities) => {
      await db.table('personal_access_tokens').insert({
        user_id: userId,
        token: tokenHash,
        name,
        abilities: JSON.stringify(abilities),
      })
    },
    find: async (tokenHash) => {
      const row = await db.table('personal_access_tokens')
        .where('token', tokenHash).first()
      if (!row) return null
      return {
        userId: row.user_id,
        abilities: JSON.parse(row.abilities || '[]'),
      }
    },
    delete: async (tokenHash) => {
      await db.table('personal_access_tokens')
        .where('token', tokenHash).delete()
    },
    deleteAllForUser: async (userId) => {
      await db.table('personal_access_tokens')
        .where('user_id', userId).delete()
    },
  },
  userLookup: {
    findById: async (id) => db.table('users').find(id),
  },
})
```

### Methods

```typescript
const token = await guard.createToken(userId, 'web-app', ['read', 'write'])
// Returns plaintext token (save this — it won't be stored in plaintext)

await guard.validate(token)          // boolean
await guard.user(token)              // AuthUser | null
await guard.abilities(token)         // string[]
await guard.can(token, 'write')      // boolean
await guard.revokeToken(token)
await guard.revokeAllTokens(userId)
```

### Auth Middleware (Bearer Token)

```typescript
// The auth middleware resolves the current user from the Authorization header
import { auth } from 'speexjs'

app.get('/api/user', auth('api'), async (ctx) => {
  const user = (ctx as any).user
  ctx.response.json({ data: user })
})
```

---

## Sanctum

Simple SPA token authentication with HMAC-SHA256 hashing. Designed for first-party single-page applications using CSRF protection.

```typescript
import { Sanctum } from 'speexjs/server/auth'

const sanctum = new Sanctum(process.env.APP_KEY)

// Create token
const token = sanctum.createToken('user-1', ['*'], 86400000)
// Format: spx_<random_hex>

// Verify
const record = sanctum.verifyToken(token)
if (record) {
  console.log(record.userId, record.abilities)
}

// Check ability
const can = sanctum.can(token, 'posts:create')

// Revoke
sanctum.revokeToken(token)

// Refresh
const newToken = sanctum.refreshToken(token)

// CSRF token
const csrf = sanctum.generateCsrfToken()
```

---

## Socialite

OAuth2 authentication with built-in **GitHub** and **Google** providers.

### Setup

```typescript
import { Socialite } from 'speexjs/server/auth'

const socialite = new Socialite()

// Register GitHub
socialite.registerGitHub(
  process.env.GITHUB_CLIENT_ID!,
  process.env.GITHUB_CLIENT_SECRET!,
  'http://localhost:3000/auth/github/callback',
)

// Register Google
socialite.registerGoogle(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  'http://localhost:3000/auth/google/callback',
)
```

### Routes

```typescript
// Redirect to provider
app.get('/auth/github', (ctx) => {
  const state = socialite.generateState()
  const provider = socialite.provider('github')
  ctx.response.redirect(provider.authorizeUrl(state))
})

// Handle callback
app.get('/auth/github/callback', async (ctx) => {
  const code = ctx.query.code as string
  const state = ctx.query.state as string

  if (!socialite.validateState(state)) {
    return ctx.response.status(400).json({ error: 'Invalid state' })
  }

  const provider = socialite.provider('github')
  const tokens = await provider.exchangeCode(code)
  const githubUser = await provider.getUser(tokens.accessToken)

  // Find or create local user
  let user = await db.table('users').where('github_id', githubUser.id).first()
  if (!user) {
    const id = await db.table('users').insert({
      github_id: githubUser.id,
      name: githubUser.name,
      email: githubUser.email,
      avatar: githubUser.avatar,
    })
    user = await db.table('users').find(id)
  }

  // Login the user
  const guard = new SessionGuard({ provider: userProvider })
  guard.setContext(ctx.request, ctx.response)
  await guard.login(user.id)

  ctx.response.redirect('/dashboard')
})
```

### Custom OAuth2 Provider

```typescript
import { OAuth2Client } from 'speexjs/server/auth'

const client = new OAuth2Client()
client.register('gitlab', {
  authorizeUrl: (state) => `https://gitlab.com/oauth/authorize?state=${state}`,
  exchangeCode: async (code) => {
    const res = await fetch('https://gitlab.com/oauth/token', { ... })
    return res.json()
  },
  getUser: async (token) => {
    const res = await fetch('https://gitlab.com/api/v4/user', { ... })
    return res.json()
  },
})
```

---

## Gate (Authorization)

Policy-based authorization with ability checks, before/after hooks.

```typescript
import { Gate, authorize } from 'speexjs/server/gate'

const gate = new Gate()

// Define abilities
gate.define('update-post', async (user, post) => {
  return user.id === post.user_id
})

gate.define('delete-post', async (user, post) => {
  const isOwner = user.id === post.user_id
  const isAdmin = user.role === 'admin'
  return isOwner || isAdmin
})
```

### Policy Classes

```typescript
gate.policy('posts', {
  view: async (user, post) => true,
  create: async (user) => user.is_active,
  update: async (user, post) => user.id === post.user_id,
  delete: async (user, post) => user.id === post.user_id || user.role === 'admin',
})
```

### Checking Authorization

```typescript
const allowed = await gate.allows('update-post', currentUser, post)
const denied = await gate.denies('delete-post', currentUser, post)

// Require authorization (throws AuthorizationError)
await gate.authorize('update-post', currentUser, post)

// Check multiple
const canAny = await gate.any(['view-post', 'view-draft'], user, post)
const canAll = await gate.all(['view-post', 'edit-post'], user, post)

// Get all abilities for a user
const abilities = await gate.abilitiesFor(user)
```

### Before / After Hooks

```typescript
// Before — grants all if returns true, denies all if false, skips if null
gate.before((user, ability) => {
  if (user.role === 'super-admin') return true  // Bypass all checks
  if (user.is_banned) return false               // Deny everything
  return null                                     // Normal check
})

// After — audit log
gate.after((user, ability, result) => {
  console.log(`[AUDIT] User ${user.id} ${ability}: ${result}`)
})
```

### Gate Middleware

```typescript
import { authorize } from 'speexjs/server/gate'

// Protect a route
app.post('/posts/:id', authorize('update-post', async (ctx) => {
  const post = await Post.find(ctx.params.id)
  return post
}), async (ctx) => {
  // ... create post
})
```

---

## RBAC (Role-Based Access Control)

Role-based permission checking with caching and middleware.

```typescript
import {
  hasPermission,
  hasRole,
  requirePermission,
  requireRole,
  setRBACProvider,
  flattenPermissions,
  canAccessResource,
} from 'speexjs/server/rbac'
```

### Role & Permission Types

```typescript
interface Role {
  id: string
  name: string
  label: string
  description: string | null
  isSystem: boolean
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

interface RBACUser {
  id: string
  roles: string[]
  permissions: string[]
}

interface CheckOptions {
  requireAll?: boolean
}
```

### Provider Setup

```typescript
import { setRBACProvider } from 'speexjs/server/rbac'

setRBACProvider({
  getUserPermissions: (ctx) => {
    const user = (ctx as any).user
    return user?.permissions ?? []
  },
  getUserRoles: (ctx) => {
    const user = (ctx as any).user
    return user?.roles ?? []
  },
})
```

### Helper Functions

```typescript
const userPermissions = ['users:read', 'users:write', 'posts:read']

hasPermission(userPermissions, 'users:read')             // true
hasPermission(userPermissions, ['users:read', 'users:delete'], { requireAll: true }) // false (no delete)
flattenPermissions(roles)                                 // all unique permissions across roles
canAccessResource(userPermissions, 'posts:edit', post.user_id, currentUser.id) // own or perm
```

### RBAC Middleware

```typescript
import { requirePermission, requireRole } from 'speexjs/server/rbac'

app.get('/admin/users', requirePermission('users:read'), listUsers)
app.post('/admin/users', requirePermission('users:write'), createUser)
app.delete('/admin/users/:id', requirePermission('users:delete'), deleteUser)

app.get('/admin/reports', requireRole('admin'), reports)
app.get('/moderator', requireRole(['admin', 'moderator']), moderate)
```

### RBAC Cache

```typescript
import { invalidateUserCache, invalidateAllCache } from 'speexjs/server/rbac'

// Invalidate when roles/permissions change
await invalidateUserCache('user-123')
await invalidateAllCache()
```

---

## Auth Middleware

### protectRoute()

```typescript
import { auth } from 'speexjs'

// Require authentication
app.get('/dashboard', auth(), dashboardHandler)

// Specific guard
app.get('/api/data', auth('api'), apiHandler)
```

### guestMiddleware

```typescript
import { guestMiddleware } from 'speexjs/server/auth'

// Only allow guests (redirects authenticated users)
app.get('/login', guestMiddleware(), loginPage)
app.get('/register', guestMiddleware(), registerPage)
```

---

## Additional Security Features

### Password Verification

```typescript
import { hashPassword, verifyPassword } from 'speexjs/native/hashing'

const hashed = hashPassword('user-password')
const match = verifyPassword('user-password', hashed) // true
```

### TOTP / 2FA

```typescript
// Time-based One-Time Password support
// Available in speexjs/server/auth
```

### Email Verification

```typescript
// Built-in email verification flow
// Generates signed URLs, resend support
```

### Password Confirmation

```typescript
// Require password re-entry for sensitive actions
// Time-limited confirmation sessions
```

### Account Lockout

```typescript
// Configurable lockout after failed attempts
// Automatic unlock after timeout
```

---

## Full Auth Example

```typescript
import {
  speexjs,
  session,
  cors,
  SessionGuard,
  AuthManager,
  Gate,
  setRBACProvider,
  requirePermission,
} from 'speexjs'

async function bootstrap() {
  const app = speexjs()
  const db = new DatabaseConnection({ driver: 'sqlite', database: 'app.sqlite' })
  await db.connect()
  app.container.instance('db', db)

  // Global middleware
  app.use(cors({ credentials: true }))
  app.use(session({ secret: process.env.APP_KEY! }))

  // Auth setup
  const auth = new AuthManager()
  const guard = new SessionGuard({
    encryptionKey: process.env.APP_KEY!,
    provider: {
      findById: async (id) => db.table('users').find(id),
      findByCredential: async (field, value) =>
        db.table('users').where(field, value).first(),
    },
  })
  auth.guard('web', guard)
  auth.defaultGuard('web')
  app.container.instance('auth', auth)

  // Gate setup
  const gate = new Gate()
  gate.define('manage-users', (user) => user.role === 'admin')
  gate.define('view-reports', (user) => ['admin', 'analyst'].includes(user.role))
  app.container.instance('gate', gate)

  // RBAC provider
  setRBACProvider({
    getUserPermissions: (ctx) => {
      const user = (ctx as any).user
      return user?.permissions ?? []
    },
    getUserRoles: (ctx) => {
      const user = (ctx as any).user
      return user?.roles ?? []
    },
  })

  // Routes
  app.post('/login', async (ctx) => {
    const { email, password } = await ctx.request.json()
    guard.setContext(ctx.request, ctx.response)
    const ok = await guard.attempt({ email, password })
    if (!ok) return ctx.response.status(401).json({ error: 'Invalid credentials' })
    ctx.response.json({ user: await guard.user() })
  })

  app.post('/logout', auth(), async (ctx) => {
    guard.setContext(ctx.request, ctx.response)
    await guard.logout()
    ctx.response.json({ ok: true })
  })

  app.get('/me', auth(), async (ctx) => {
    ctx.response.json({ user: (ctx as any).user })
  })

  app.get('/admin/users', auth(), requirePermission('users:read'), async (ctx) => {
    const users = await db.table('users').get()
    ctx.response.json({ data: users })
  })

  app.listen(3000)
}
```
