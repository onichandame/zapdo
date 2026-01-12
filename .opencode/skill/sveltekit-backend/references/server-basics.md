# Server Basics & Runtime Environment

## SvelteKit Server Runtime

### Execution Contexts
SvelteKit code can run in different contexts with varying capabilities:

```typescript
// Universal code (runs on both server and client)
// +page.ts, +layout.ts
export async function load({ route, params, url, fetch }) {
  // Safe for both environments
  const data = await fetch(`/api/posts/${params.id}`).then(r => r.json());
  return { data };
}

// Server-only code
// +page.server.ts, +layout.server.ts, +server.ts
export async function load({ locals, platform, cookies }) {
  // Server-only: database access, file system, environment variables
  const user = await db.user.findUnique({ where: { id: locals.userId } });
  return { user };
}
```

### Server Hooks
Global server-side configuration and middleware.

```typescript
// src/hooks.server.ts
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import { logger } from '$lib/server/logger';

// Authentication hook
const authHandler: Handle = async ({ event, resolve }) => {
  // Add user to event.locals if authenticated
  event.locals.user = await auth.getUserFromSession(event);
  
  // Protect admin routes
  if (event.url.pathname.startsWith('/admin')) {
    if (!event.locals.user || event.locals.user.role !== 'admin') {
      return new Response('Unauthorized', { status: 401 });
    }
  }
  
  return resolve(event);
};

// Logging hook
const loggingHandler: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const response = await resolve(event);
  const duration = Date.now() - start;
  
  console.log(`${event.request.method} ${event.url.pathname} - ${duration}ms`);
  
  return response;
};

// CORS hook
const corsHandler: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
};

export const handle = sequence(authHandler, loggingHandler, corsHandler);

// Error handling
export const handleError: HandleServerError = async ({ error, event }) => {
  console.error('Server error:', error);
  
  // Don't expose internal errors in production
  const message = dev ? error.message : 'Internal server error';
  const code = (error as any)?.code ?? 500;
  
  return {
    message,
    code
  };
};
```

## Request & Response Objects

### Understanding the Request Object
```typescript
// src/routes/api/example/+server.ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url, params, locals, platform, cookies, getClientAddress }) => {
  // Request information
  console.log('Method:', request.method);
  console.log('URL:', url.toString());
  console.log('Pathname:', url.pathname);
  console.log('Search params:', url.searchParams);
  console.log('Params:', params);
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  
  // Client information
  const clientIP = getClientAddress();
  const userAgent = request.headers.get('user-agent');
  
  // Access to platform-specific resources (Cloudflare)
  const env = platform?.env;
  const context = platform?.context;
  
  // Cookie management
  const sessionId = cookies.get('session');
  cookies.set('flash', 'Welcome back!', { path: '/', maxAge: 3600 });
  
  return new Response(JSON.stringify({ 
    clientIP, 
    userAgent, 
    sessionId 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Response Patterns
```typescript
// Standard JSON response
export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();
  
  return json({
    success: true,
    data: data,
    timestamp: new Date().toISOString()
  });
};

// Response with custom headers
export const PUT: RequestHandler = async ({ request }) => {
  const data = await request.json();
  
  return json(data, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'X-Custom-Header': 'value'
    }
  });
};

// Error responses
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    await deleteItem(params.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
};

// File download response
export const GET: RequestHandler = async ({ params }) => {
  const file = await getFile(params.filename);
  
  return new Response(file.content, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.name}"`
    }
  });
};
```

## Environment Variables & Configuration

### Environment Variable Access
```typescript
// src/lib/server/env.ts
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// Private environment variables (server-only)
export const DATABASE_URL = env.DATABASE_URL;
export const JWT_SECRET = env.JWT_SECRET;
export const API_KEY = env.API_KEY;

// Public environment variables (available to client)
export const PUBLIC_API_URL = publicEnv.PUBLIC_API_URL;
export const PUBLIC_SITE_NAME = publicEnv.PUBLIC_SITE_NAME;

// Validation
function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();
```

### Environment-Specific Configuration
```typescript
// src/lib/server/config.ts
import { dev } from '$app/environment';

export const config = {
  database: {
    url: process.env.DATABASE_URL,
    ssl: !dev,
    logging: dev
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    sessionTimeout: dev ? 3600 : 86400 // 1 hour dev, 24 hours prod
  },
  api: {
    rateLimit: {
      requestsPerWindow: dev ? 1000 : 100,
      windowMs: 60000
    }
  },
  features: {
    debug: dev,
    profiling: dev,
    strictSecurity: !dev
  }
};
```

## Platform Integration

### Cloudflare Workers Integration
```typescript
// src/lib/server/cloudflare.ts
import { getRequestEvent } from '$app/server';

export function getPlatformEnv() {
  const { platform } = getRequestEvent();
  return platform?.env;
}

export async function getKVData(key: string): Promise<string | null> {
  const env = getPlatformEnv();
  if (!env?.KV_CACHE) return null;
  
  return await env.KV_CACHE.get(key);
}

export async function setKVData(
  key: string, 
  value: string, 
  options?: { ttl?: number; metadata?: Record<string, any> }
) {
  const env = getPlatformEnv();
  if (!env?.KV_CACHE) return;
  
  await env.KV_CACHE.put(key, value, {
    expirationTtl: options?.ttl,
    metadata: options?.metadata
  });
}

export async function deleteKVData(key: string) {
  const env = getPlatformEnv();
  if (!env?.KV_CACHE) return;
  
  await env.KV_CACHE.delete(key);
}

// D1 Database access
export async function queryD1<T = any>(
  sql: string, 
  bindings: any[] = []
): Promise<T[]> {
  const env = getPlatformEnv();
  if (!env?.D1_DATABASE) {
    throw new Error('D1 database not available');
  }
  
  const stmt = env.D1_DATABASE.prepare(sql);
  const result = await stmt.bind(...bindings).all();
  return result.results as T[];
}

// R2 Object Storage
export async function uploadToR2(
  key: string, 
  data: ArrayBuffer | ReadableStream,
  contentType?: string
) {
  const env = getPlatformEnv();
  if (!env?.R2_BUCKET) {
    throw new Error('R2 bucket not available');
  }
  
  await env.R2_BUCKET.put(key, data, {
    httpMetadata: contentType ? { contentType } : undefined
  });
}

export async function getFromR2(key: string) {
  const env = getPlatformEnv();
  if (!env?.R2_BUCKET) return null;
  
  return await env.R2_BUCKET.get(key);
}
```

### Vercel Integration
```typescript
// src/lib/server/vercel.ts
export async function getKVData(key: string) {
  const { KV } = await import('@vercel/kv');
  return await KV.get(key);
}

export async function setKVData(
  key: string, 
  value: string, 
  options?: { ex?: number }
) {
  const { KV } = await import('@vercel/kv');
  await KV.set(key, value, options);
}

// Edge config
export async function getEdgeConfig(key: string) {
  const { get } = await import('@vercel/edge-config');
  return await get(key);
}
```

## Security Fundamentals

### Input Validation & Sanitization
```typescript
// src/lib/server/validation.ts
import { z } from 'zod';

// Common schemas
export const idSchema = z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/);
export const emailSchema = z.string().email().max(254);
export const passwordSchema = z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/);

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional()
});

// User creation schema
export const userCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']).default('user')
});

// Sanitization helpers
export function sanitizeHtml(input: string): string {
  // In production, use a proper sanitizer
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}
```

### Security Headers
```typescript
// src/lib/server/security.ts
export function addSecurityHeaders(response: Response): Response {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}
```

### Rate Limiting
```typescript
// src/lib/server/rate-limit.ts
const requests = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): void {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, data] of requests.entries()) {
    if (data.resetTime < now) {
      requests.delete(key);
    }
  }
  
  const requestData = requests.get(identifier);
  
  if (!requestData) {
    requests.set(identifier, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (requestData.resetTime < now) {
    requestData.count = 1;
    requestData.resetTime = now + windowMs;
    return;
  }
  
  if (requestData.count >= limit) {
    throw new Error('Rate limit exceeded');
  }
  
  requestData.count++;
}

// Usage in handlers
export const GET: RequestHandler = async ({ getClientAddress }) => {
  const ip = getClientAddress();
  rateLimit(ip, 10, 60000); // 10 requests per minute
  
  // Your handler logic
};
```

## Error Handling & Logging

### Structured Error Handling
```typescript
// src/lib/server/errors.ts
import { error } from '@sveltejs/kit';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

// Error handler middleware
export function handleApiError(error: unknown): never {
  console.error('API Error:', error);
  
  if (error instanceof AppError) {
    throw error(error.statusCode, error.message);
  }
  
  if (error instanceof z.ZodError) {
    throw error(400, 'Invalid input data');
  }
  
  throw error(500, 'Internal server error');
}
```

### Logging Infrastructure
```typescript
// src/lib/server/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, any>;
}

class Logger {
  private context: Record<string, any> = {};

  constructor(context?: Record<string, any>) {
    this.context = context || {};
  }

  child(meta: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...meta });
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      meta: { ...this.context, ...meta }
    };

    console.log(JSON.stringify(entry));
    
    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to external logging service
    }
  }

  debug(message: string, meta?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | any) {
    this.log('error', message, {
      stack: error?.stack,
      ...error
    });
  }
}

export const logger = new Logger();

export function createLogger(context: Record<string, any>): Logger {
  return new Logger(context);
}
```

This foundation covers the essential server-side concepts needed for robust SvelteKit backend development, including runtime environment, security, error handling, and platform integration.