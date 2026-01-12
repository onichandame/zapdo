---
name: cloudflare-workers-error-handling
description: Comprehensive error handling, structured logging patterns, API error response standards, and debugging strategies for Cloudflare Workers applications.
license: MIT
scope: project
---

# Cloudflare Workers - Error Handling & Logging

## When to use this skill
When implementing robust error handling, structured logging, API error response standards, and debugging strategies for Cloudflare Workers applications.

## Error Response Standards

### API Error Class Hierarchy
```typescript
// src/lib/server/errors/index.ts
export abstract class APIError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  abstract readonly category: 'client' | 'server' | 'auth' | 'validation' | 'rate_limit';
  
  constructor(
    message: string,
    public readonly details?: any,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  toJSON():ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        category: this.category,
        details: this.details,
        timestamp: new Date().toISOString(),
        ...(this.context && { context: this.context })
      }
    };
  }
}

// Client errors (4xx)
export class BadRequestError extends APIError {
  readonly statusCode = 400;
  readonly code = 'BAD_REQUEST';
  readonly category = 'validation';
  
  constructor(message: string = 'Bad request', details?: any) {
    super(message, details);
  }
}

export class UnauthorizedError extends APIError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';
  readonly category = 'auth';
  
  constructor(message: string = 'Unauthorized', details?: string) {
    super(message, details);
  }
}

export class ForbiddenError extends APIError {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';
  readonly category = 'auth';
  
  constructor(message: string = 'Forbidden') {
    super(message);
  }
}

export class NotFoundError extends APIError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';
  readonly category = 'client';
  
  constructor(resource: string = 'Resource', id?: any) {
    super(`${resource}${id ? ` with ID ${id}` : ''} not found`, { resource, id });
  }
}

export class ConflictError extends APIError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';
  readonly category = 'client';
  
  constructor(message: string = 'Conflict', details?: any) {
    super(message, details);
  }
}

export class RateLimitError extends APIError {
  readonly statusCode = 429;
  readonly code = 'RATE_LIMITED';
  readonly category = 'rate_limit';
  
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number
  ) {
    super(message, { retryAfter });
  }
}

export class ValidationError extends APIError {
  readonly statusCode = 422;
  readonly code = 'VALIDATION_ERROR';
  readonly category = 'validation';
  
  constructor(
    message: string = 'Validation failed',
    public readonly validationErrors?: Record<string, string[]>
  ) {
    super(message, { validationErrors });
  }
}

// Server errors (5xx)
export class InternalServerError extends APIError {
  readonly statusCode = 500;
  readonly code = 'INTERNAL_SERVER_ERROR';
  readonly category = 'server';
  
  constructor(message: string = 'Internal server error', originalError?: Error) {
    super(message, { 
      originalError: originalError?.message,
      stack: originalError?.stack 
    });
  }
}

export class DatabaseError extends APIError {
  readonly statusCode = 500;
  readonly code = 'DATABASE_ERROR';
  readonly category = 'server';
  
  constructor(message: string = 'Database operation failed', query?: string) {
    super(message, { query });
  }
}

export class StorageError extends APIError {
  readonly statusCode = 500;
  readonly code = 'STORAGE_ERROR';
  readonly category = 'server';
  
  constructor(message: string = 'Storage operation failed', operation?: string) {
    super(message, { operation });
  }
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    category: string;
    details?: any;
    timestamp: string;
    context?: Record<string, any>;
  };
}
```

### Error Handler Middleware
```typescript
// src/lib/server/middleware/error.ts
import type { HandleServerError } from '@sveltejs/kit';
import { APIError } from '../errors';

export const handleError: HandleServerError = async ({ error, event, status }) => {
  // Log the error
  if (event.platform?.env) {
    await logError(error, event);
  }
  
  // Return structured error response
  if (error instanceof APIError) {
    return error.toJSON();
  }
  
  // Handle unexpected errors
  const internalError = new InternalServerError(
    'An unexpected error occurred',
    error instanceof Error ? error : new Error(String(error))
  );
  
  return internalError.toJSON();
};

// API route error handler
export function handleAPIError(error: unknown): Response {
  if (error instanceof APIError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...(error instanceof RateLimitError && error.retryAfter && {
          'Retry-After': error.retryAfter.toString()
        })
      }
    });
  }
  
  // Unexpected error
  const internalError = new InternalServerError(
    'An unexpected error occurred',
    error instanceof Error ? error : new Error(String(error))
  );
  
  return new Response(JSON.stringify(internalError.toJSON()), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function logError(error: any, event: any): Promise<void> {
  try {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error?.name || 'UnknownError',
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        code: error?.statusCode || error?.code,
        category: error?.category || 'server'
      },
      request: {
        url: event?.url?.href,
        method: event?.request?.method,
        userAgent: event?.request?.headers?.get('user-agent'),
        ip: event?.getClientAddress?.() || event?.clientAddress
      },
      user: event?.locals?.user?.id
    };
    
    // Log to external service or console
    if (event.platform.env.LOG_ENDPOINT) {
      await fetch(event.platform.env.LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
    } else {
      console.error('Error logged:', JSON.stringify(logData, null, 2));
    }
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}
```

## Structured Logging

### Logger Implementation
```typescript
// src/lib/server/logging/logger.ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: number;
  sessionId?: string;
  requestId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  constructor(
    private readonly context: Record<string, any> = {},
    private readonly env?: any
  ) {}
  
  private async log(level: LogLevel, message: string, additionalContext?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...additionalContext }
    };
    
    // Add request context if available
    const requestContext = this.getRequestContext();
    if (requestContext) {
      entry.userId = requestContext.userId;
      entry.sessionId = requestContext.sessionId;
      entry.requestId = requestContext.requestId;
    }
    
    try {
      // Send to external logging service
      if (this.env?.LOG_ENDPOINT) {
        await this.sendToService(entry);
      } else {
        // Fallback to console with structured output
        this.logToConsole(entry);
      }
    } catch (error) {
      console.error('Logging failed:', error);
      // Fallback to console
      this.logToConsole(entry);
    }
  }
  
  debug(message: string, context?: Record<string, any>): Promise<void> {
    return this.log('debug', message, context);
  }
  
  info(message: string, context?: Record<string, any>): Promise<void> {
    return this.log('info', message, context);
  }
  
  warn(message: string, context?: Record<string, any>): Promise<void> {
    return this.log('warn', message, context);
  }
  
  error(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : undefined;
    
    return this.log('error', message, { ...context, ...errorContext });
  }
  
  fatal(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : undefined;
    
    return this.log('fatal', message, { ...context, ...errorContext });
  }
  
  withContext(additionalContext: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...additionalContext }, this.env);
  }
  
  private getRequestContext(): { userId?: number; sessionId?: string; requestId?: string } | null {
    // This would typically be extracted from async storage or global context
    // Implementation depends on your framework/setup
    try {
      return globalThis.requestContext || null;
    } catch {
      return null;
    }
  }
  
  private async sendToService(entry: LogEntry): Promise<void> {
    const response = await fetch(this.env.LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.env.LOG_API_KEY
      },
      body: JSON.stringify(entry)
    });
    
    if (!response.ok) {
      throw new Error(`Log service returned ${response.status}: ${response.statusText}`);
    }
  }
  
  private logToConsole(entry: LogEntry): void {
    const method = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      fatal: console.error
    }[entry.level] || console.log;
    
    method(JSON.stringify(entry, null, 2));
  }
}

// Factory function
export function createLogger(context: Record<string, any> = {}, env?: any): Logger {
  return new Logger(context, env);
}
```

### Request Logging Middleware
```typescript
// src/lib/server/middleware/request-logger.ts
import type { Handle } from '@sveltejs/kit';
import { createLogger } from '../logging/logger';

export const requestLogger: Handle = async ({ event, resolve }) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Store request context for logging
  globalThis.requestContext = {
    requestId,
    userId: event.locals.user?.id,
    sessionId: event.cookies.get('session_id')
  };
  
  const logger = createLogger({
    component: 'request-logger',
    requestId
  }, event.platform?.env);
  
  // Log request start
  await logger.info('Request started', {
    method: event.request.method,
    url: event.url.href,
    userAgent: event.request.headers.get('user-agent'),
    ip: event.getClientAddress()
  });
  
  try {
    const response = await resolve(event);
    
    // Log request completion
    const duration = Date.now() - startTime;
    
    await logger.info('Request completed', {
      status: response.status,
      duration,
      responseSize: response.headers.get('content-length')
    });
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    await logger.error('Request failed', error instanceof Error ? error : new Error(String(error)), {
      duration
    });
    
    throw error;
  } finally {
    // Clean up request context
    delete globalThis.requestContext;
  }
};
```

## Validation Error Patterns

### Zod Integration
```typescript
// src/lib/server/validation/zod.ts
import { z } from 'zod';
import { ValidationError } from '../errors';

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      
      throw new ValidationError(
        'Request validation failed',
        validationErrors
      );
    }
    
    throw new ValidationError('Request validation failed', { 
      originalError: error instanceof Error ? error.message : String(error) 
    });
  }
}

export function createValidationSchema<T extends z.ZodRawShape>(
  shape: T
): z.ZodObject<T> {
  return z.object(shape);
}

// Common validation schemas
export const commonSchemas = {
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().optional()
  }),
  
  id: z.object({
    id: z.coerce.number().int().positive()
  }),
  
  email: z.object({
    email: z.string().email('Invalid email format')
  }),
  
  password: z.object({
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      )
  })
};
```

## Database Error Handling

### Enhanced Database Client
```typescript
// src/lib/server/db/error-handling.ts
import { DatabaseError, ValidationError } from '../errors';
import type { DB } from './index';

export class SafeDBClient {
  constructor(private db: DB) {}
  
  async safeQuery<T>(
    operation: string,
    query: () => Promise<T>,
    options: {
      notFoundMessage?: string;
      validationMessage?: string;
    } = {}
  ): Promise<T> {
    try {
      const result = await query();
      
      if (result === null || result === undefined) {
        if (options.notFoundMessage) {
          throw new ValidationError(options.notFoundMessage);
        }
      }
      
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      
      if (error instanceof Error) {
        // Check for common database errors
        if (error.message.includes('UNIQUE constraint failed')) {
          throw new ValidationError('Resource already exists', {
            constraint: error.message
          });
        }
        
        if (error.message.includes('NOT NULL constraint failed')) {
          throw new ValidationError('Required field is missing', {
            constraint: error.message
          });
        }
        
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          throw new ValidationError('Referenced resource does not exist', {
            constraint: error.message
          });
        }
      }
      
      throw new DatabaseError(`${operation} failed`, error instanceof Error ? error.stack : undefined);
    }
  }
  
  // Safe transaction wrapper
  async withTransaction<T>(
    operation: string,
    callback: (tx: DB) => Promise<T>
  ): Promise<T> {
    try {
      return await callback(this.db);
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(`Transaction ${operation} failed`, 
        error instanceof Error ? error.stack : undefined);
    }
  }
}

// Utility functions
export function withSafeClient(db: DB): SafeDBClient {
  return new SafeDBClient(db);
}
```

## Debugging and Monitoring

### Health Check Implementation
```typescript
// src/routes/api/health/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDB } from '$lib/server/db';
import { createLogger } from '$lib/server/logging/logger';

export const GET: RequestHandler = async ({ platform }) => {
  const logger = createLogger({ component: 'health-check' }, platform?.env);
  
  try {
    const checks = await Promise.allSettled([
      checkDatabase(platform?.env, logger),
      checkStorage(platform?.env, logger),
      checkKV(platform?.env, logger),
      checkMemory(),
      checkResponseTime()
    ]);
    
    const results = {
      timestamp: new Date().toISOString(),
      status: checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'degraded',
      checks: {
        database: formatResult(checks[0]),
        storage: formatResult(checks[1]),
        kv: formatResult(checks[2]),
        memory: formatResult(checks[3]),
        response_time: formatResult(checks[4])
      }
    };
    
    const statusCode = results.status === 'healthy' ? 200 : 503;
    
    return json(results, { 
      status: statusCode,
      headers: { 'Cache-Control': 'no-cache' }
    });
    
  } catch (error) {
    await logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
    
    return json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: 'Health check failed'
    }, { status: 503 });
  }
};

async function checkDatabase(env: any, logger: Logger): Promise<{ status: string; latency: number }> {
  if (!env?.TASKS_DB) {
    throw new Error('Database not available');
  }
  
  const start = Date.now();
  try {
    const db = createDB(env.TASKS_DB);
    await db.select().from({ count: 1 }).limit(1);
    return { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    throw new Error(`Database check failed: ${error}`);
  }
}

async function checkStorage(env: any, logger: Logger): Promise<{ status: string; latency: number }> {
  if (!env?.R2_BUCKET) {
    throw new Error('Storage not available');
  }
  
  const start = Date.now();
  try {
    await env.R2_BUCKET.list({ limit: 1 });
    return { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    throw new Error(`Storage check failed: ${error}`);
  }
}

async function checkKV(env: any, logger: Logger): Promise<{ status: string; latency: number }> {
  if (!env?.SESSION_KV) {
    throw new Error('KV not available');
  }
  
  const start = Date.now();
  try {
    const testKey = `health-check-${Date.now()}`;
    await env.SESSION_KV.put(testKey, 'test', { expirationTtl: 60 });
    await env.SESSION_KV.delete(testKey);
    return { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    throw new Error(`KV check failed: ${error}`);
  }
}

async function checkMemory(): Promise<{ status: string; usage: number }> {
  const usage = process.memoryUsage();
  const usageMB = Math.round(usage.heap Used / 1024 / 1024);
  
  if (usageMB > 128) { // 128MB threshold
    throw new Error(`High memory usage: ${usageMB}MB`);
  }
  
  return { status: 'ok', usage: usageMB };
}

async function checkResponseTime(): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  
  // Simple compute test
  for (let i = 0; i < 1000000; i++) {
    Math.random();
  }
  
  const latency = Date.now() - start;
  
  if (latency > 100) { // 100ms threshold
    throw new Error(`Slow response time: ${latency}ms`);
  }
  
  return { status: 'ok', latency };
}

function formatResult(result: PromiseSettledResult<any>) {
  if (result.status === 'fulfilled') {
    return {
      status: 'ok',
      ...result.value
    };
  } else {
    return {
      status: 'error',
      error: result.reason?.message || 'Unknown error'
    };
  }
}
```

## Next Steps
- Implement [Performance & Testing](../performance/) for load testing and optimization
- Set up [Authentication & Security](../authentication/) for security error patterns  
- Add [Database Operations](../database/) for transaction error handling

## Related Skills
- [Core Architecture](../architecture/) - Error configuration and setup
- [Authentication & Security](../authentication/) - Auth-specific error handling
- [Database Operations](../database/) - Database error patterns
- [Performance & Testing](../performance/) - Error monitoring and alerting