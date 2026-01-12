---
name: cloudflare-workers-authentication
description: Session-based authentication, challenge-response security, and middleware patterns for Cloudflare Workers with KV storage and JWT tokens.
license: MIT
scope: project
---

# Cloudflare Workers - Authentication & Security

## When to use this skill
When implementing secure user authentication systems for Cloudflare Workers APIs, including session management, challenge-response flows, and security middleware.

## Session-Based Authentication with KV

### Session Data Structure
```typescript
// src/lib/server/auth/session.ts
export interface SessionData {
  userId: number;
  createdAt: string;
  expiresAt: string;
  deviceFingerprint?: string;
  lastActivity?: string;
}

export interface SessionOptions {
  ttl?: number; // Time to live in seconds (default: 3 days)
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}
```

### Session Manager Implementation
```typescript
export class SessionManager {
  constructor(
    private kv: KVNamespace,
    private options: SessionOptions = {}
  ) {
    this.options = {
      ttl: 3 * 24 * 60 * 60, // 3 days
      secure: true,
      sameSite: 'lax',
      ...options
    };
  }
  
  async createSession(userId: number, options?: {
    deviceFingerprint?: string;
    customTtl?: number;
  }): Promise<string> {
    const sessionId = crypto.randomUUID();
    const ttl = options?.customTtl || this.options.ttl!;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    const sessionData: SessionData = {
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      deviceFingerprint: options?.deviceFingerprint,
      lastActivity: new Date().toISOString()
    };
    
    const sessionKey = `session:${sessionId}`;
    await this.kv.put(sessionKey, JSON.stringify(sessionData), {
      expirationTtl: ttl
    });
    
    return sessionId;
  }
  
  async validateSession(sessionId: string): Promise<SessionData | null> {
    const sessionData = await this.kv.get<string>(`session:${sessionId}`);
    if (!sessionData) return null;
    
    try {
      const session = JSON.parse(sessionData) as SessionData;
      
      // Check expiry
      if (new Date(session.expiresAt) < new Date()) {
        await this.kv.delete(`session:${sessionId}`);
        return null;
      }
      
      // Update last activity
      session.lastActivity = new Date().toISOString();
      await this.updateSessionActivity(sessionId, session);
      
      return session;
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  }
  
  async refreshSession(sessionId: string, newTtl?: number): Promise<boolean> {
    const session = await this.validateSession(sessionId);
    if (!session) return false;
    
    const ttl = newTtl || this.options.ttl!;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    session.expiresAt = expiresAt.toISOString();
    
    await this.kv.put(`session:${sessionId}`, JSON.stringify(session), {
      expirationTtl: ttl
    });
    
    return true;
  }
  
  async deleteSession(sessionId: string): Promise<void> {
    await this.kv.delete(`session:${sessionId}`);
  }
  
  async deleteAllUserSessions(userId: number): Promise<number> {
    const sessionKeys = await this.kv.list({
      prefix: 'session:'
    });
    
    let deletedCount = 0;
    
    for (const key of sessionKeys.keys) {
      const sessionData = await this.kv.get(key.name);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData) as SessionData;
          if (session.userId === userId) {
            await this.kv.delete(key.name);
            deletedCount++;
          }
        } catch {
          // Skip invalid sessions
        }
      }
    }
    
    return deletedCount;
  }
  
  private async updateSessionActivity(sessionId: string, session: SessionData): Promise<void> {
    // Don't update on every request - use a throttled approach
    const now = new Date();
    const lastActivity = new Date(session.lastActivity!);
    const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    
    if (minutesSinceActivity > 5) { // Update every 5 minutes
      session.lastActivity = now.toISOString();
      await this.kv.put(`session:${sessionId}`, JSON.stringify(session), {
        expirationTtl: Math.floor((new Date(session.expiresAt).getTime() - now.getTime()) / 1000)
      });
    }
  }
}
```

## Challenge-Response Authentication

### Challenge Implementation
```typescript
// src/lib/server/auth/challenge.ts
export interface ChallengeData {
  challenge: string;
  algorithm: string;
  createdAt: string;
  expiresAt: string;
  userId?: number;
}

export class ChallengeAuth {
  constructor(
    private kv: KVNamespace,
    private options: {
      ttl?: number;
      algorithm?: string;
      challengeSize?: number;
    } = {}
  ) {
    this.options = {
      ttl: 300, // 5 minutes
      algorithm: 'SHA-256',
      challengeSize: 32,
      ...options
    };
  }
  
  async createChallenge(userId?: number): Promise<string> {
    const challenge = crypto.getRandomValues(
      new Uint8Array(this.options.challengeSize!)
    ).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    
    const challengeData: ChallengeData = {
      challenge,
      algorithm: this.options.algorithm!,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.options.ttl! * 1000).toISOString(),
      userId
    };
    
    const key = `challenge:${userId || ' anonymous'}:${Date.now()}`;
    await this.kv.put(key, JSON.stringify(challengeData), {
      expirationTtl: this.options.ttl!
    });
    
    return challenge;
  }
  
  async verifyChallenge(
    userId: number,
    encryptedChallenge: string,
    publicKey?: string
  ): Promise<boolean> {
    const challenges = await this.kv.list({
      prefix: `challenge:${userId}:`
    });
    
    for (const key of challenges.keys) {
      const challengeData = await this.kv.get(key.name);
      if (!challengeData) continue;
      
      try {
        const challenge = JSON.parse(challengeData) as ChallengeData;
        
        // Check expiry
        if (new Date(challenge.expiresAt) < new Date()) {
          await this.kv.delete(key.name);
          continue;
        }
        
        // Verify the challenge
        const isValid = await this.verifyEncryptedChallenge(
          encryptedChallenge,
          challenge.challenge,
          publicKey
        );
        
        // Clean up used challenge
        await this.kv.delete(key.name);
        
        if (isValid) return true;
      } catch (error) {
        console.error('Challenge verification error:', error);
        await this.kv.delete(key.name);
      }
    }
    
    return false;
  }
  
  private async verifyEncryptedChallenge(
    encrypted: string,
    expected: string,
    publicKey?: string
  ): Promise<boolean> {
    if (publicKey) {
      // RSA signature verification
      try {
        const encoder = new TextEncoder();
        const expectedBytes = encoder.encode(expected);
        
        const cryptoKey = await crypto.subtle.importKey(
          'spki',
          this.base64ToBuffer(publicKey),
          { name: 'RSA-PSS', hash: 'SHA-256' },
          false,
          ['verify']
        );
        
        const signature = this.base64ToBuffer(encrypted);
        
        return await crypto.subtle.verify(
          { name: 'RSA-PSS', saltLength: 32 },
          cryptoKey,
          signature,
          expectedBytes
        );
      } catch (error) {
        console.error('RSA verification failed:', error);
        return false;
      }
    } else {
      // Simple hash comparison (less secure, for development)
      return encrypted === expected;
    }
  }
  
  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    return bytes.buffer;
  }
  
  async cleanupExpiredChallenges(): Promise<number> {
    const allChallenges = await this.kv.list({ prefix: 'challenge:' });
    let cleanedCount = 0;
    
    for (const key of allChallenges.keys) {
      const challengeData = await this.kv.get(key.name);
      if (challengeData) {
        try {
          const challenge = JSON.parse(challengeData) as ChallengeData;
          if (new Date(challenge.expiresAt) < new Date()) {
            await this.kv.delete(key.name);
            cleanedCount++;
          }
        } catch {
          await this.kv.delete(key.name);
          cleanedCount++;
        }
      }
    }
    
    return cleanedCount;
  }
}
```

## Authentication Middleware

### SvelteKit Auth Middleware
```typescript
// src/lib/server/middleware/auth.ts
import type { Handle } from '@sveltejs/kit';
import { SessionManager } from '../auth/session';
import { APIError } from '../errors';

export interface AuthMiddlewareOptions {
  publicPaths: string[];
  apiPrefix: string;
  sessionCookie: {
    name: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  };
}

export const createAuthMiddleware = (options: AuthMiddlewareOptions): Handle => {
  return async ({ event, resolve }) => {
    const { url, cookies } = event;
    const sessionId = cookies.get(options.sessionCookie.name);
    
    // Skip auth for public paths
    if (options.publicPaths.some(path => url.pathname.startsWith(path))) {
      return resolve(event);
    }
    
    // Validate session if present
    if (sessionId) {
      const sessionManager = new SessionManager(event.platform!.env.SESSION_KV);
      const session = await sessionManager.validateSession(sessionId);
      
      if (session) {
        event.locals.session = session;
        // Load user data (implement based on your user model)
        event.locals.user = await loadUserFromDB(session.userId, event.platform!);
      } else {
        // Invalid session - clear cookie
        cookies.delete(options.sessionCookie.name, { 
          path: '/',
          secure: options.sessionCookie.secure,
          sameSite: options.sessionCookie.sameSite || 'lax'
        });
      }
    }
    
    // Protect API routes
    if (url.pathname.startsWith(options.apiPrefix)) {
      if (!event.locals.user) {
        return new Response(
          JSON.stringify({ 
            error: 'Authentication required', 
            code: 'AUTH_REQUIRED' 
          }), 
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Add user context to request headers for downstream services
      event.request.headers.set('X-User-ID', event.locals.user.id.toString());
      event.request.headers.set('X-Session-ID', sessionId || '');
    }
    
    return resolve(event);
  };
};

// Default configuration
export const authHandler = createAuthMiddleware({
  publicPaths: ['/health', '/api/auth/login', '/api/auth/register'],
  apiPrefix: '/api/',
  sessionCookie: {
    name: 'session_id',
    secure: true,
    sameSite: 'lax'
  }
});

async function loadUserFromDB(userId: number, platform: App.Platform): Promise<any> {
  // Implement user loading based on your database schema
  // This is a placeholder - adapt to your user model
  const db = createDB(platform.env.TASKS_DB);
  const users = await db.select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
    
  return users[0] || null;
}
```

## Cookie Management

### Secure Cookie Helpers
```typescript
// src/lib/server/auth/cookies.ts
import type { Cookies } from '@sveltejs/kit';

export interface CookieOptions {
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
}

export class CookieManager {
  static setSessionCookie(
    cookies: Cookies,
    sessionId: string,
    options: CookieOptions = {}
  ): void {
    const defaultOptions: CookieOptions = {
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3 * 24 * 60 * 60 // 3 days
    };
    
    cookies.set('session_id', sessionId, { ...defaultOptions, ...options });
  }
  
  static deleteSessionCookie(cookies: Cookies): void {
    cookies.delete('session_id', { 
      path: '/',
      secure: true,
      sameSite: 'lax'
    });
  }
  
  static setAuthCookie(
    cookies: Cookies,
    name: string,
    value: string,
    options: CookieOptions = {}
  ): void {
    const defaultOptions: CookieOptions = {
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 // 24 hours
    };
    
    cookies.set(name, value, { ...defaultOptions, ...options });
  }
}
```

## Security Best Practices

### Input Validation
```typescript
import { z } from 'zod';

export const authSchemas = {
  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  }),
  
  register: z.object({
    email: z.string().email(),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long')
  }),
  
  challenge: z.object({
    challenge: z.string().length(64, 'Invalid challenge format'),
    signature: z.string().min(1, 'Signature required')
  })
};
```

### Rate Limiting
```typescript
export class RateLimiter {
  constructor(
    private kv: KVNamespace,
    private options: {
      windowMs: number;
      maxRequests: number;
      keyGenerator?: (request: Request) => string;
    }
  ) {}
  
  async isAllowed(request: Request): Promise<{ allowed: boolean; resetTime?: number }> {
    const key = this.options.keyGenerator 
      ? this.options.keyGenerator(request)
      : `rate:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
      
    const current = await this.kv.get(key);
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    let requests: number[] = [];
    
    if (current) {
      try {
        requests = JSON.parse(current);
        // Filter old requests
        requests = requests.filter(timestamp => timestamp > windowStart);
      } catch {
        // Start fresh if corrupted
        requests = [];
      }
    }
    
    // Add current request
    requests.push(now);
    
    // Update counter
    await this.kv.put(key, JSON.stringify(requests), {
      expirationTtl: Math.ceil(this.options.windowMs / 1000)
    });
    
    const allowed = requests.length <= this.options.maxRequests;
    
    return {
      allowed,
      resetTime: windowStart + this.options.windowMs
    };
  }
}
```

## Next Steps
- Implement [D1 Database](../database/) for user data persistence
- Add [Error Handling](../error-handling/) for comprehensive security error management
- Set up [R2 Storage](../storage/) for secure file operations

## Related Skills
- [Core Architecture](../architecture/) - Project setup and structure
- [D1 Database Operations](../database/) - User persistence and queries
- [Error Handling](../error-handling/) - Security error patterns
- [Performance & Testing](../performance/) - Security testing strategies