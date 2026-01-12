---
name: sveltekit-backend
description: Master SvelteKit backend development with API routes, server actions, database integration, authentication, and server-side architecture using SvelteKit 2.x.
scope: project
license: MIT
---
# SvelteKit Backend Development

## What this skill does
Provides comprehensive guidance for building robust, scalable server-side applications with SvelteKit 2.x. Covers API route development, server actions, database integration, authentication patterns, and modern backend architecture for production deployments.

## When to use this skill
- Building SvelteKit API routes and server endpoints
- Implementing server actions for form processing
- Integrating databases (D1, PostgreSQL, etc.)
- Setting up authentication and authorization
- Optimizing server performance and caching
- Handling file uploads and storage integration

## Core Backend Concepts

### API Route Architecture
- **Route Types**: Master GET, POST, PUT, DELETE, and custom endpoints
- **Request Handling**: Parse and validate incoming requests
- **Response Patterns**: Structured responses with proper status codes
- **Error Handling**: Comprehensive error management and logging
- **Middleware**: Custom middleware for authentication, CORS, etc.

### Server Actions
- **Form Actions**: Progressive enhancement with server validation
- **Action Chaining**: Complex workflows with multiple steps
- **Error Boundaries**: Graceful error handling in server actions
- **Loading States**: Server-side loading state management
- **Security**: CSRF protection and input sanitization

### Database Integration
- **D1 Database**: Cloudflare D1 integration patterns
- **Connection Management**: Efficient database connection pooling
- **Query Patterns**: Optimized database queries and transactions
- **Migrations**: Database schema management and migrations
- **Caching**: Multi-level caching strategies

## Progressive Learning Path

### Foundation
See [references/server-basics.md](references/server-basics.md) for SvelteKit server fundamentals and runtime environment.

### API Development
Refer to [references/api-routes.md](references/api-routes.md) for comprehensive API development patterns and best practices.

### Database & Storage
See [references/database.md](references/database.md) for database integration, migrations, and optimization patterns.

## Implementation Strategies

### RESTful API Routes
```typescript
// src/routes/api/users/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const users = await db.users.findMany({ take: limit });
  
  return json({
    success: true,
    data: users,
    meta: { count: users.length, limit }
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();
  
  // Validation
  const validated = createUserSchema.parse(data);
  
  try {
    const user = await db.users.create({ data: validated });
    return json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    return json(
      { success: false, error: 'User creation failed' },
      { status: 500 }
    );
  }
};
```

### Server Actions
```typescript
// src/routes/api/contact/+server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const email = data.get('email');
    const message = data.get('message');

    // Server-side validation
    if (!email || !message) {
      return fail(400, { 
        email, 
        message, 
        error: 'All fields are required' 
      });
    }

    try {
      // Process contact form
      await sendEmail({ email, message });
      
      // Optional: Store in database
      await db.contacts.create({ data: { email, message } });
      
      return { success: true };
    } catch (error) {
      return fail(500, { 
        error: 'Failed to send message' 
      });
    }
  }
};
```

### Database Integration Pattern
```typescript
// src/lib/server/db.ts
import { PrismaClient } from '@prisma/client';
import { dev } from '$app/environment';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (dev) {
  globalForPrisma.prisma = db;
}

// Migration helper
export async function runMigrations() {
  if (dev) {
    await db.$connect();
    // Development migrations
  }
}
```

### Authentication Middleware
```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const auth: Handle = async ({ event, resolve }) => {
  const session = await getSession(event.cookies);
  
  if (session) {
    event.locals.user = await getUser(session.userId);
  }

  // Protect API routes
  if (event.url.pathname.startsWith('/api/protected')) {
    if (!event.locals.user) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  return resolve(event);
};

export const handle = sequence(auth, handleError);
```

## Common Patterns

### Error Handling Strategy
- **Structured Errors**: Consistent error response format
- **Logging**: Comprehensive server-side logging
- **Graceful Degradation**: Fallback behavior for failures
- **Client Communication**: Clear error messages to clients

### Security Best Practices
- **Input Validation**: Zod validation schemas
- **Authentication**: JWT or session-based auth
- **Authorization**: Role-based access control
- **Rate Limiting**: Protect against abuse
- **CORS**: Proper cross-origin configuration

### Performance Optimization
- **Database Caching**: Query result caching
- **Connection Pooling**: Efficient database connections
- **Edge Computing**: Leverage Cloudflare edge locations
- **Compression**: Response compression middleware
- **CDN**: Static asset delivery optimization

## Cloudflare Integration

### D1 Database
```typescript
// src/lib/server/d1.ts
import { env } from '$env/dynamic/private';

export const db = env.D1_DATABASE;

// Query helper
export async function query<T = any>(
  sql: string, 
  bindings: any[] = []
): Promise<T[]> {
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...bindings).all();
  return result.results as T[];
}
```

### KV Storage
```typescript
// src/lib/server/kv.ts
import { env } from '$env/dynamic/private';

export const kv = env.KV_NAMESPACE;

// Cache utilities
export async function getCache<T>(key: string): Promise<T | null> {
  const value = await kv.get(key);
  return value ? JSON.parse(value) : null;
}

export async function setCache(
  key: string, 
  value: any, 
  ttl = 3600
): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
}
```

## Troubleshooting
Refer to [references/troubleshooting.md](references/troubleshooting.md) for common backend issues and debugging strategies.

## Examples
See [references/examples.md](references/examples.md) for complete API endpoints, server actions, and integration patterns.

## Cross-References
- **Frontend Development**: Use `sveltekit-frontend` skill for UI development
- **Deployment**: See `cloudflare-workers-api` skill for production deployment
- **Testing**: Refer to `serverless-testing-strategy` for API testing strategies