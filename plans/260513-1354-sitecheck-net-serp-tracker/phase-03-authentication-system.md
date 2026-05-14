---
phase: 3
title: "Authentication System"
status: pending
priority: P1
effort: "3h"
dependencies: [1, 2]
---

# Phase 3: Authentication System

## Overview

Implement NextAuth.js with Credentials provider (email/password), JWT sessions, bcrypt password hashing, signup/login pages using shadcn-admin login template, and admin role detection from `.env`.

## Requirements

- Functional: Login, signup, logout, session persistence, admin role flag in session
- Non-functional: bcrypt cost 12, JWT signed with `NEXTAUTH_SECRET`, password field excluded from session token, middleware protecting dashboard + admin routes

## Architecture

```
app/
├── (auth)/
│   ├── layout.tsx           ← redirect to /dashboard if already authed
│   ├── login/page.tsx       ← shadcn login form
│   └── signup/page.tsx      ← registration form
├── api/
│   ├── auth/
│   │   ├── [...nextauth]/route.ts
│   │   └── signup/route.ts
│
lib/auth/
├── auth-options.ts          ← NextAuth AuthOptions
└── get-server-session.ts    ← thin server-side wrapper

middleware.ts                ← protect dashboard/* admin/*
types/next-auth.d.ts         ← augment Session + JWT types
```

### Admin Detection

Determined by `ADMIN_EMAILS` env var (comma-separated). No DB role column — avoids privilege escalation via DB manipulation.

```typescript
const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) ?? []
const isAdmin = adminEmails.includes(user.email.toLowerCase())
```

## Related Code Files

- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/layout.tsx`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/api/auth/signup/route.ts`
- Create: `lib/auth/auth-options.ts`
- Create: `lib/auth/get-server-session.ts`
- Create: `lib/services/auth/signup-service.ts`
- Create: `middleware.ts`
- Create: `types/next-auth.d.ts`

## Implementation Steps

1. **Install NextAuth**
   ```bash
   npm install next-auth
   ```

2. **Type augmentation** (`types/next-auth.d.ts`)
   ```typescript
   import 'next-auth'
   declare module 'next-auth' {
     interface Session {
       user: { id: string; email: string; name: string; isAdmin: boolean }
     }
   }
   declare module 'next-auth/jwt' {
     interface JWT { id: string; isAdmin: boolean }
   }
   ```

3. **`auth-options.ts`**
   ```typescript
   import { AuthOptions } from 'next-auth'
   import CredentialsProvider from 'next-auth/providers/credentials'
   import bcrypt from 'bcryptjs'
   import { connectDB } from '@/lib/db/mongoose'
   import { User } from '@/models/user.model'
   
   const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) ?? []
   
   export const authOptions: AuthOptions = {
     providers: [
       CredentialsProvider({
         name: 'credentials',
         credentials: {
           email: { label: 'Email', type: 'email' },
           password: { label: 'Password', type: 'password' }
         },
         async authorize(credentials) {
           if (!credentials?.email || !credentials?.password) return null
           await connectDB()
           const user = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password')
           if (!user) return null
           const valid = await bcrypt.compare(credentials.password, user.password)
           if (!valid) return null
           return { id: user._id.toString(), email: user.email, name: user.name }
         }
       })
     ],
     callbacks: {
       async jwt({ token, user }) {
         if (user) {
           token.id = user.id
           token.isAdmin = adminEmails.includes((user.email ?? '').toLowerCase())
         }
         return token
       },
       async session({ session, token }) {
         session.user.id = token.id
         session.user.isAdmin = token.isAdmin
         return session
       }
     },
     pages: { signIn: '/login' },
     session: { strategy: 'jwt' },
     secret: process.env.NEXTAUTH_SECRET,
   }
   ```

4. **API route** (`app/api/auth/[...nextauth]/route.ts`)
   ```typescript
   import NextAuth from 'next-auth'
   import { authOptions } from '@/lib/auth/auth-options'
   const handler = NextAuth(authOptions)
   export { handler as GET, handler as POST }
   ```

5. **`get-server-session.ts`**
   ```typescript
   import { getServerSession } from 'next-auth'
   import { authOptions } from './auth-options'
   export const auth = () => getServerSession(authOptions)
   ```

6. **`middleware.ts`** — use NextAuth built-in middleware:
   ```typescript
   export { default } from 'next-auth/middleware'
   export const config = { matcher: ['/dashboard/:path*', '/workspaces/:path*', '/admin/:path*'] }
   ```

7. **`SignupService`** (`lib/services/auth/signup-service.ts`)
   ```typescript
   export class SignupService extends BaseService<Input, Output> {
     async call({ name, email, password }: Input) {
       try {
         await connectDB()
         const exists = await User.findOne({ email: email.toLowerCase() })
         if (exists) throw new ServiceError('Email already registered', undefined, 'EMAIL_EXISTS')
         const hashed = await bcrypt.hash(password, 12)
         const user = await User.create({ name, email: email.toLowerCase(), password: hashed })
         return { id: user._id.toString(), email: user.email }
       } catch (error) {
         this.handleError(error)
       }
     }
   }
   ```

8. **Signup API route** (`app/api/auth/signup/route.ts`) — validate with Zod (name min 2, email valid, password min 8), call `SignupService`, return 201.

9. **Login page** — centered card layout (shadcn-admin style), email + password fields, loading state during `signIn()`, error display. On success, redirect to `/dashboard`.

10. **Admin page guard** — in `app/(admin)/layout.tsx`:
    ```typescript
    const session = await auth()
    if (!session?.user.isAdmin) redirect('/dashboard')
    ```

## Success Criteria

- [ ] Login with correct credentials → session created, redirect to `/dashboard`
- [ ] Wrong password → error message (no stack trace exposed to client)
- [ ] Admin email in `ADMIN_EMAILS` → `session.user.isAdmin === true`
- [ ] `/admin` route with non-admin session → redirected to `/dashboard`
- [ ] Signup duplicate email → 409 with "Email already registered"
- [ ] Passwords stored as bcrypt hash, never plain text
- [ ] `User.password` never appears in API responses

## Risk Assessment

- **NEXTAUTH_SECRET missing** — env validation (Phase 1) must catch this before app starts
- **Admin route middleware** — `middleware.ts` cannot check `isAdmin` from JWT without decoding; use page-level layout guard instead of middleware for admin check
