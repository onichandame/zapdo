---
name: cloudflare-workers-performance
description: Performance optimization, caching strategies, API integration testing, load testing, and production deployment best practices for Cloudflare Workers.
license: MIT
scope: project
---

# Cloudflare Workers - Performance & Testing

## When to use this skill
When optimizing Cloudflare Workers applications for performance, implementing caching strategies, setting up comprehensive testing, and preparing for production deployment.

## Caching Strategies

### Multi-Level Caching Implementation
```typescript
// src/lib/server/cache/index.ts
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache invalidation tags
  version?: string; // Cache version for easy busting
  compression?: boolean; // Enable compression for large responses
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  version: string;
}

export class CacheManager {
  constructor(
    private kv: KVNamespace,
    private options: {
      defaultTtl?: number;
      defaultVersion?: string;
      maxSize?: number; // Maximum entry size in bytes
    } = {}
  ) {
    this.options = {
      defaultTtl: 300, // 5 minutes
      defaultVersion: 'v1',
      maxSize: 25 * 1024 * 1024, // 25MB KV limit
      ...options
    };
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await this.kv.get<CacheEntry<T>>(key, 'json');
      if (!entry) return null;
      
      // Check TTL
      const now = Date.now();
      const age = (now - entry.timestamp) / 1000;
      
      if (age > entry.ttl) {
        await this.kv.delete(key);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl || this.options.defaultTtl!;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags: options.tags || [],
      version: options.version || this.options.defaultVersion!
    };
    
    try {
      const serialized = JSON.stringify(entry);
      
      if (serialized.length > this.options.maxSize!) {
        throw new Error(`Cache entry too large: ${serialized.length} bytes`);
      }
      
      await this.kv.put(key, serialized, {
        expirationTtl: ttl,
        metadata: {
          tags: entry.tags.join(','),
          version: entry.version
        }
      });
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }
  
  async invalidateByTag(tag: string): Promise<number> {
    const list = await this.kv.list({ limit: 1000 });
    let invalidated = 0;
    
    for (const key of list.keys) {
      const metadata = key.metadata as any;
      if (metadata?.tags?.includes(tag)) {
        await this.kv.delete(key.name);
        invalidated++;
      }
    }
    
    return invalidated;
  }
  
  async invalidateByVersion(version: string): Promise<number> {
    const list = await this.kv.list({ limit: 1000 });
    let invalidated = 0;
    
    for (const key of list.keys) {
      const metadata = key.metadata as any;
      if (metadata?.version === version) {
        await this.kv.delete(key.name);
        invalidated++;
      }
    }
    
    return invalidated;
  }
  
  async clear(): Promise<number> {
    const list = await this.kv.list({ limit: 1000 });
    
    for (const key of list.keys) {
      await this.kv.delete(key.name);
    }
    
    return list.keys.length;
  }
}

// Specialized cache decorators
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyPrefix?: string;
    ttl?: number;
    tags?: string[];
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    // This would need access to the KV namespace in practice
    // Implementation depends on your dependency injection setup
    return fn(...args);
  }) as T;
}
```

### Edge Caching with Cloudflare
```typescript
// src/lib/server/cache/edge.ts
export interface EdgeCacheOptions {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  mustRevalidate?: boolean;
  privateCache?: boolean;
  etag?: string;
  lastModified?: string;
}

export class EdgeCacheManager {
  static setHeaders(
    response: Response,
    options: EdgeCacheOptions = {}
  ): Response {
    const directives: string[] = [];
    
    if (options.maxAge !== undefined) {
      directives.push(`max-age=${options.maxAge}`);
    }
    
    if (options.sMaxAge === 0 && options.maxAge && options.noStore) {
      directives.push('no-store, no-cache, must-revalidate, proxy-revalidate');
    } 
    else if (options.sMaxAge !== undefined) {
      directives.push(`s-maxage=${options.sMaxAge}`);
      if (options.staleWhileRevalidate) {
        directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
      }
    }
    
    if (options.privateCache) {
      directives.push('private');
    } else {
      directives.push('public');
    }
    
    if (options.mustRevalidate) {
      directives.push('must-revalidate');
    }
    
    const headers = new Headers(response.headers);
    
    if (directives.length > 0) {
      headers.set('Cache-Control', directives.join(', '));
    }
    
    if (options.etag) {
      headers.set('ETag', options.etag);
    }
    
    if (options.lastModified) {
      headers.set('Last-Modified', options.lastModified);
    }
    
    headers.set('Cloudflare-CDN-Cache-Control', headers.get('Cache-Control') || '');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  
  static createCacheKey(prefix: string, params: Record<string, any>): string {
    const paramString = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ).toString();
    
    return `${prefix}:${Buffer.from(paramString).toString('base64url')}`;
  }
  
  static generateETag(data: string | ArrayBuffer): string {
    const hash = crypto.subtle.digestSync('SHA-256', 
      typeof data === 'string' ? new TextEncoder().encode(data) : data
    );
    
    return `"${Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}"`;
  }
}

// Usage in API routes
export function withCache(
  handler: RequestHandler,
  options: EdgeCacheOptions = {}
): RequestHandler {
  return async ({ params, url, platform, ...rest }) => {
    const response = await handler({ params, url, platform, ...rest });
    
    // Set cache headers based on response type
    if (response.ok) {
      // Different caching for different types of data
      if (url.pathname.includes('/api/public/')) {
        return EdgeCacheManager.setHeaders(response, {
          sMaxAge: 3600, // Cache at edge for 1 hour
          maxAge: 300,    // Browser cache for 5 minutes
          staleWhileRevalidate: 86400 // Serve stale for 1 day
        });
      }
      
      if (url.pathname.includes('/api/tasks/')) {
        return EdgeCacheManager.setHeaders(response, {
          sMaxAge: 60, // Cache at edge for 1 minute
          maxAge: 0,   // No browser cache for user data
          privateCache: true
        });
      }
    }
    
    return response;
  };
}
```

## API Integration Testing

### Test Framework Setup
```typescript
// tests/test-setup.ts
import { setupMiniflare } from './miniflare-setup';
import type { Miniflare } from 'miniflare';

declare global {
  var mf: Miniflare;
}

export async function setupTestEnvironment(): Promise<void> {
  global.mf = await setupMiniflare();
}

export async function teardownTestEnvironment(): Promise<void> {
  if (global.mf) {
    await global.mf.dispose();
  }
}

// Test utilities
export async function createTestRequest(
  path: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    userId?: number;
  } = {}
): Promise<Request> {
  const { method = 'GET', body, headers = {}, userId } = options;
  
  const url = new URL(path, 'http://localhost');
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };
  
  // Add auth header if userId provided
  if (userId) {
    const sessionId = await createTestSession(userId);
    requestHeaders['Cookie'] = `session_id=${sessionId}`;
  }
  
  const request = new Request(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined
  });
  
  return request;
}

async function createTestSession(userId: number): Promise<string> {
  const sessionId = crypto.randomUUID();
  const sessionData = {
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
  
  await global.mf.env.SESSION_KV.put(
    `session:${sessionId}`,
    JSON.stringify(sessionData)
  );
  
  return sessionId;
}

export async function expectStatus(
  response: Response,
  expectedStatus: number
): Promise<void> {
  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. Body: ${body}`
    );
  }
}

export async function expectJSON<T>(
  response: Response,
  matcher?: Partial<T>
): Promise<T> {
  const data = await response.json() as T;
  
  if (matcher) {
    for (const [key, value] of Object.entries(matcher)) {
      if (data[key as keyof T] !== value) {
        throw new Error(
          `Expected ${key} to be ${value}, got ${data[key as keyof T]}`
        );
      }
    }
  }
  
  return data;
}
```

### API Route Tests
```typescript
// tests/api/tasks.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestEnvironment, teardownTestEnvironment, createTestRequest, expectStatus, expectJSON } from '../test-setup';
import { createDB, tasks, users } from '../../src/lib/server/db';

describe('Tasks API', () => {
  beforeEach(async () => {
    await setupTestEnvironment();
    await seedTestData();
  });
  
  afterEach(async () => {
    await teardownTestEnvironment();
  });
  
  describe('GET /api/tasks', () => {
    it('should return user tasks', async () => {
      const request = await createTestRequest('/api/tasks', { userId: 1 });
      const response = await global.mf.dispatchFetch(request);
      
      await expectStatus(response, 200);
      
      const data = await expectJSON(response, { items: expect.any(Array) });
      expect(data.items).toHaveLength(3);
      expect(data.items[0]).toMatchObject({
        id: expect.any(Number),
        title: expect.any(String),
        userId: 1
      });
    });
    
    it('should handle pagination', async () => {
      const request = await createTestRequest('/api/tasks?limit=2', { userId: 1 });
      const response = await global.mf.dispatchFetch(request);
      
      await expectStatus(response, 200);
      
      const data = await expectJSON(response);
      expect(data.items).toHaveLength(2);
      expect(data.hasMore).toBe(true);
      expect(data.nextCursor).toBeDefined();
    });
    
    it('should require authentication', async () => {
      const request = await createTestRequest('/api/tasks');
      const response = await global.mf.dispatchFetch(request);
      
      await expectStatus(response, 401);
    });
  });
  
  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        importance: 8,
        urgency: 7,
        tags: ['test', 'api']
      };
      
      const request = await createTestRequest('/api/tasks', {
        method: 'POST',
        body: taskData,
        userId: 1
      });
      
      const response = await global.mf.dispatchFetch(request);
      
      await expectStatus(response, 201);
      
      const data = await expectJSON(response, {
        title: 'Test Task',
        description: 'Test Description'
      });
      
      expect(data.id).toBeDefined();
      expect(data.userId).toBe(1);
    });
    
    it('should validate required fields', async () => {
      const request = await createTestRequest('/api/tasks', {
        method: 'POST',
        body: { description: 'Missing title' },
        userId: 1
      });
      
      const response = await global.mf.dispatchFetch(request);
      
      await expectStatus(response, 422);
      
      const data = await expectJSON(response);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details.validationErrors.title).toBeDefined();
    });
  });
  
  describe('GET /api/tasks/[id]', () => {
    it('should return specific task', async () => {
      const request = await createTestRequest('/api/tasks/1', { userId: 1 });
      const response = await global.mf.dispatchFetch(request);
      
      await expectStatus(response, 200);
      
      const data = await expectJSON(response, {
        id: 1,
        title: 'Task 1',
        userId: 1
      });
    });
    
    it('should handle non-existent task', async () => {
      const request = await createTestRequest('/api/tasks/999', { userId: 1 });
      const response = await global.mf.dispatchFetch(request);
      
      await expectStatus(response, 404);
    });
    
    it('should prevent access to other users tasks', async () => {
      const request = await createTestRequest('/api/tasks/4', { userId: 1 });
      const response = await global.mf.dispatchFetch(request);
      
      await expectStatus(response, 404);
    });
  });
});

async function seedTestData(): Promise<void> {
  const db = createDB(global.mf.env.TASKS_DB);
  
  // Create test users
  await db.insert(users).values([
    {
      id: 1,
      email: 'user1@test.com',
      name: 'User 1',
      passwordHash: 'hash1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      email: 'user2@test.com',
      name: 'User 2',
      passwordHash: 'hash2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);
  
  // Create test tasks
  await db.insert(tasks).values([
    {
      id: 1,
      userId: 1,
      title: 'Task 1',
      importance: 8,
      urgency: 7,
      hasContent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      userId: 1,
      title: 'Task 2',
      importance: 5,
      urgency: 9,
      hasContent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      userId: 1,
      title: 'Task 3',
      importance: 9,
      urgency: 3,
      hasContent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 4,
      userId: 2,
      title: 'User 2 Task',
      importance: 7,
      urgency: 6,
      hasContent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);
}
```

## Load Testing

### Load Testing Configuration
```typescript
// tests/load/api-load-test.ts
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.1'],    // Error rate < 10%
    errors: ['rate<0.1'],             // Custom error rate < 10%
  },
};

const BASE_URL = 'http://localhost:8787'; // Your local dev server

export function setup(): string {
  // Create test user and get session
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, 
    JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword123'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(loginResponse, {
    'login successful': (r) => r.status === 200,
  });
  
  const sessionCookie = loginResponse.headers['set-cookie']
    ?.find((cookie: string) => cookie.startsWith('session_id='))
    ?.split(';')[0];
    
  if (!sessionCookie) {
    throw new Error('Failed to get session cookie');
  }
  
  return sessionCookie;
}

export default function(data: string) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': data,
    },
  };
  
  // Test GET tasks
  const getTasksResponse = http.get(`${BASE_URL}/api/tasks`, params);
  
  const getTasksOk = check(getTasksResponse, {
    'GET tasks status is 200': (r) => r.status === 200,
    'GET tasks response time < 500ms': (r) => r.timings.duration < 500,
    'GET tasks has items array': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return Array.isArray(body.items);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!getTasksOk);
  
  // Test POST task
  const taskData = {
    title: `Load Test Task ${Date.now()}`,
    description: 'Created during load testing',
    importance: Math.floor(Math.random() * 10) + 1,
    urgency: Math.floor(Math.random() * 10) + 1,
  };
  
  const createTaskResponse = http.post(
    `${BASE_URL}/api/tasks`,
    JSON.stringify(taskData),
    params
  );
  
  const createTaskOk = check(createTaskResponse, {
    'POST tasks status is 201': (r) => r.status === 201,
    'POST tasks response time < 1000ms': (r) => r.timings.duration < 1000,
    'POST tasks returns task ID': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return body.id && typeof body.id === 'number';
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!createTaskOk);
  
  // If task creation was successful, test GET specific task
  if (createTaskOk) {
    const taskBody = JSON.parse(createTaskResponse.body as string);
    
    const getTaskResponse = http.get(`${BASE_URL}/api/tasks/${taskBody.id}`, params);
    
    const getTaskOk = check(getTaskResponse, {
      'GET specific task status is 200': (r) => r.status === 200,
      'GET specific task response time < 300ms': (r) => r.timings.duration < 300,
      'GET specific task returns correct data': (r) => {
        try {
          const body = JSON.parse(r.body as string);
          return body.id === taskBody.id && body.title === taskData.title;
        } catch {
          return false;
        }
      },
    });
    
    errorRate.add(!getTaskOk);
  }
  
  sleep(1); // Wait 1 second between iterations
}
```

### Performance Monitoring
```typescript
// src/lib/server/performance/monitor.ts
export interface PerformanceMetrics {
  requestDuration: number;
  databaseTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxEntries = 1000;
  
  startRequest(): { end: () => PerformanceMetrics } {
    const startTime = Date.now();
    let dbTime = 0;
    let cacheHits = 0;
    let cacheMisses = 0;
    
    return {
      end: (): PerformanceMetrics => {
        const duration = Date.now() - startTime;
        
        const metrics: PerformanceMetrics = {
          requestDuration: duration,
          databaseTime: dbTime,
          cacheHitRate: cacheHits + cacheMisses > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
          memoryUsage: this.getMemoryUsage(),
          cpuUsage: this.getCpuUsage(),
          timestamp: startTime
        };
        
        this.addMetrics(metrics);
        return metrics;
      }
    };
  }
  
  trackDatabase(duration: number): void {
    // This would be called from database client
  }
  
  trackCacheHit(): void {
    // This would be called from cache manager
  }
  
  trackCacheMiss(): void {
    // This would be called from cache manager
  }
  
  getMetrics(window?: number): PerformanceMetrics[] {
    if (!window) return [...this.metrics];
    
    const cutoff = Date.now() - window;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }
  
  getAverageMetrics(window: number = 5 * 60 * 1000): Partial<PerformanceMetrics> {
    const recentMetrics = this.getMetrics(window);
    
    if (recentMetrics.length === 0) return {};
    
    return {
      requestDuration: this.average(recentMetrics.map(m => m.requestDuration)),
      databaseTime: this.average(recentMetrics.map(m => m.databaseTime)),
      cacheHitRate: this.average(recentMetrics.map(m => m.cacheHitRate)),
      memoryUsage: this.average(recentMetrics.map(m => m.memoryUsage)),
      cpuUsage: this.average(recentMetrics.map(m => m.cpuUsage))
    };
  }
  
  private addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    if (this.metrics.length > this.maxEntries) {
      this.metrics = this.metrics.slice(-this.maxEntries);
    }
  }
  
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed / 1024 / 1024; // MB
  }
  
  private getCpuUsage(): number {
    // Simplified CPU usage calculation
    // In production, you might use more sophisticated methods
    return Math.random() * 10; // Placeholder
  }
  
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}

// Performance middleware
export function withPerformanceMonitoring(
  handler: RequestHandler
): RequestHandler {
  return async (event) => {
    const monitor = new PerformanceMonitor();
    const { end } = monitor.startRequest();
    
    try {
      const response = await handler(event);
      
      const metrics = end();
      
      // Add performance headers
      response.headers.set('X-Response-Time', `${metrics.requestDuration}ms`);
      response.headers.set('X-Cache-Hit-Rate', (metrics.cacheHitRate * 100).toFixed(1) + '%');
      
      return response;
    } catch (error) {
      const metrics = end();
      
      // Log performance data for errors
      console.error('Request failed with metrics:', metrics, error);
      
      throw error;
    }
  };
}
```

## Production Deployment

### Environment Configuration
```typescript
// src/lib/server/env/production.ts
import type { Env } from './env';

export function validateProductionEnv(env: Env): void {
  const required = [
    'JWT_SECRET',
    'PASSWORD_SALT_ROUNDS',
    'TASKS_DB',
    'R2_BUCKET',
    'SESSION_KV'
  ];
  
  const missing = required.filter(key => !env[key as keyof Env]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate specific values
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  
  if (parseInt(env.PASSWORD_SALT_ROUNDS) < 10) {
    throw new Error('PASSWORD_SALT_ROUNDS must be at least 10');
  }
}

export function createProductionConfig(env: Env): {
  cache: CacheConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
} {
  return {
    cache: {
      defaultTtl: env.ENVIRONMENT === 'production' ? 300 : 60,
      enableCompression: true,
      maxSize: 25 * 1024 * 1024
    },
    
    security: {
      rateLimiting: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100
      },
      
      cors: {
        origins: env.ENVIRONMENT === 'production' 
          ? ['https://yourapp.com'] 
          : ['http://localhost:5173'],
        credentials: true
      }
    },
    
    performance: {
      monitoring: env.ENVIRONMENT === 'production',
      profiling: false,
      logLevel: env.ENVIRONMENT === 'production' ? 'info' : 'debug'
    }
  };
}

interface CacheConfig {
  defaultTtl: number;
  enableCompression: boolean;
  maxSize: number;
}

interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origins: string[];
    credentials: boolean;
  };
}

interface PerformanceConfig {
  monitoring: boolean;
  profiling: boolean;
  logLevel: string;
}
```

### Deployment Scripts
```typescript
// scripts/deploy.ts
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { validateProductionEnv } from '../src/lib/server/env/production';

interface DeploymentConfig {
  environment: 'staging' | 'production';
  skipMigrations?: boolean;
  skipCacheClear?: boolean;
}

async function deploy(config: DeploymentConfig): Promise<void> {
  console.log(`🚀 Starting deployment to ${config.environment}...`);
  
  try {
    // 1. Run tests
    console.log('🧪 Running tests...');
    execSync('npm test', { stdio: 'inherit' });
    
    // 2. Build application
    console.log('📦 Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // 3. Validate environment
    console.log('✅ Validating environment...');
    const env = loadEnvironment(config.environment);
    validateProductionEnv(env);
    
    // 4. Run migrations if needed
    if (!config.skipMigrations) {
      console.log('🗄️ Running database migrations...');
      execSync(`npm run migrate:${config.environment}`, { stdio: 'inherit' });
    }
    
    // 5. Deploy to Cloudflare
    console.log('☁️ Deploying to Cloudflare...');
    const deployCommand = config.environment === 'production' 
      ? 'npx wrangler deploy --env production'
      : 'npx wrangler deploy --env staging';
    
    execSync(deployCommand, { stdio: 'inherit' });
    
    // 6. Clear cache if needed
    if (!config.skipCacheClear) {
      console.log('🧹 Clearing cache...');
      await clearCache(env);
    }
    
    // 7. Health check
    console.log('🏥 Running health check...');
    await healthCheck(env);
    
    console.log(`✅ Deployment to ${config.environment} completed successfully!`);
    
  } catch (error) {
    console.error(`❌ Deployment failed:`, error);
    process.exit(1);
  }
}

function loadEnvironment(environment: string): any {
  // Load environment-specific configuration
  const envFile = `.env.${environment}`;
  return JSON.parse(readFileSync(envFile, 'utf-8'));
}

async function clearCache(env: any): Promise<void> {
  // Implementation for clearing KV cache
  console.log('Cache cleared successfully');
}

async function healthCheck(env: any): Promise<void> {
  const baseUrl = environment === 'production' 
    ? 'https://yourapp.com'
    : 'https://staging.yourapp.com';
  
  const response = await fetch(`${baseUrl}/api/health`);
  
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  
  const health = await response.json();
  
  if (health.status !== 'healthy') {
    throw new Error(`Service is not healthy: ${health.status}`);
  }
  
  console.log('✅ Health check passed');
}

// CLI interface
const args = process.argv.slice(2);
const environment = args[0] as 'staging' | 'production' || 'staging';
const skipMigrations = args.includes('--skip-migrations');
const skipCacheClear = args.includes('--skip-cache-clear');

if (!['staging', 'production'].includes(environment)) {
  console.error('Invalid environment. Use: staging or production');
  process.exit(1);
}

deploy({
  environment,
  skipMigrations,
  skipCacheClear
});
```

## Next Steps
- Set up continuous integration and deployment (CI/CD) pipelines
- Implement advanced monitoring and alerting
- Add comprehensive logging and analytics
- Set up backup and disaster recovery procedures

## Related Skills
- [Core Architecture](../architecture/) - Performance configuration
- [Database Operations](../database/) - Database optimization
- [Error Handling](../error-handling/) - Performance monitoring
- [Authentication & Security](../authentication/) - Security performance considerations