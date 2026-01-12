# Backend API Examples

## CRUD API Examples

### User Management API
```typescript
// src/routes/api/users/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { userRepository } from '$lib/server/repositories/UserRepository';
import { withAuth, withAdmin, withValidation, withRateLimit } from '$lib/server/middleware';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
  role: z.enum(['USER', 'ADMIN']).default('USER')
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).optional()
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional()
});

// GET /api/users - List users (admin only)
export const GET = withRateLimit(30)(
  withAuth(
    withAdmin(
      withValidation(paginationSchema, 'query')(async ({ locals }) => {
        const { page, limit, search } = locals.validated as z.infer<typeof paginationSchema>;
        
        const result = await userRepository.list(page, limit, search);
        
        return json({
          success: true,
          data: result.users,
          meta: {
            pagination: {
              page,
              limit,
              total: result.total,
              pages: result.pages,
              hasNext: page < result.pages,
              hasPrev: page > 1
            }
          }
        });
      })
    )
  )
);

// POST /api/users - Create user (admin only)
export const POST = withRateLimit(10)(
  withAuth(
    withAdmin(
      withValidation(createUserSchema)(async ({ locals }) => {
        const userData = locals.validated as z.infer<typeof createUserSchema>;
        
        // Check if user already exists
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
          error(409, 'User with this email already exists');
        }
        
        const user = await userRepository.create(userData);
        
        return json({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt
          }
        }, { status: 201 });
      })
    )
  )
);
```

```typescript
// src/routes/api/users/[id]/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { userRepository } from '$lib/server/repositories/UserRepository';
import { withAuth, withValidation } from '$lib/server/middleware';

const updatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8)
});

// GET /api/users/[id] - Get user details
export const GET = withAuth(async ({ params, locals }) => {
  const { id } = params;
  const requestedUser = await userRepository.findById(id);
  
  if (!requestedUser) {
    error(404, 'User not found');
  }
  
  // Users can only see their own details, admins can see all
  if (locals.user.id !== id && locals.user.role !== 'ADMIN') {
    error(403, 'Access denied');
  }
  
  return json({
    success: true,
    data: {
      id: requestedUser.id,
      email: requestedUser.email,
      name: requestedUser.name,
      role: requestedUser.role,
      createdAt: requestedUser.createdAt,
      profile: requestedUser.profile
    }
  });
});

// PUT /api/users/[id] - Update user
export const PUT = withAuth(
  withValidation(updateUserSchema)(async ({ params, locals }) => {
    const { id } = params;
    const updateData = locals.validated as z.infer<typeof updateUserSchema>;
    
    // Users can only update their own profile, admins can update anyone
    if (locals.user.id !== id && locals.user.role !== 'ADMIN') {
      error(403, 'Access denied');
    }
    
    // Non-admins cannot change role
    if (locals.user.role !== 'ADMIN' && updateData.role) {
      delete updateData.role;
    }
    
    const updatedUser = await userRepository.update(id, updateData);
    
    return json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt
      }
    });
  })
);

// DELETE /api/users/[id] - Delete user (admin only)
export const DELETE = withAuth(async ({ params, locals }) => {
  const { id } = params;
  
  if (locals.user.role !== 'ADMIN') {
    error(403, 'Admin access required');
  }
  
  await userRepository.delete(id);
  
  return new Response(null, { status: 204 });
});

// Custom action for password change
// src/routes/api/users/[id]/password/+server.ts
export const POST = withAuth(
  withValidation(updatePasswordSchema)(async ({ params, locals }) => {
    const { id } = params;
    const { currentPassword, newPassword } = locals.validated as z.infer<typeof updatePasswordSchema>;
    
    // Users can only change their own password
    if (locals.user.id !== id) {
      error(403, 'Access denied');
    }
    
    const user = await userRepository.findById(id);
    if (!user) {
      error(404, 'User not found');
    }
    
    // Verify current password
    const isValidPassword = await userRepository.verifyPassword(user, currentPassword);
    if (!isValidPassword) {
      error(400, 'Current password is incorrect');
    }
    
    // Update password
    await userRepository.updatePassword(id, newPassword);
    
    return json({
      success: true,
      message: 'Password updated successfully'
    });
  })
);
```

### Blog Posts API
```typescript
// src/routes/api/posts/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { postRepository } from '$lib/server/repositories/PostRepository';
import { withAuth, withValidation, withRateLimit } from '$lib/server/middleware';

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string().uuid()).optional(),
  published: z.boolean().default(false)
});

const postQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  author: z.string().optional(),
  featured: z.enum(['true', 'false']).optional()
});

// GET /api/posts - List posts
export const GET = withRateLimit(60)(
  withValidation(postQuerySchema, 'query')(async ({ locals }) => {
    const query = locals.validated as z.infer<typeof postQuerySchema>;
    offset = (query.page - 1) * query.limit;
    
    const posts = await postRepository.findPublished({
      limit: query.limit,
      offset,
      search: query.search,
      category: query.category,
      tag: query.tag,
      author: query.author,
      featured: query.featured === 'true' ? true : query.featured === 'false' ? false : undefined
    });
    
    // Get total count for pagination
    const total = await postRepository.countPublished({
      search: query.search,
      category: query.category,
      tag: query.tag,
      author: query.author
    });
    
    return json({
      success: true,
      data: posts,
      meta: {
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
          hasNext: query.page < Math.ceil(total / query.limit),
          hasPrev: query.page > 1
        }
      }
    });
  })
);

// POST /api/posts - Create post
export const POST = withRateLimit(10)(
  withAuth(
    withValidation(createPostSchema)(async ({ locals }) => {
      const postData = locals.validated as z.infer<typeof createPostSchema>;
      
      const post = await postRepository.create({
        ...postData,
        authorId: locals.user.id,
        slug: generateSlug(postData.title),
        publishedAt: postData.published ? new Date() : null
      });
      
      return json({
        success: true,
        data: post
      }, { status: 201 });
    })
  )
);

// Helper function
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}
```

## Authentication Examples

### Login/Logout API
```typescript
// src/routes/api/auth/login/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json, error, cookies } from '@sveltejs/kit';
import { z } from 'zod';
import { userRepository } from '$lib/server/repositories/UserRepository';
import { sessionManager } from '$lib/server/auth/session';
import { withRateLimit, withValidation } from '$lib/server/middleware';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().default(false)
});

export const POST = withRateLimit(5)(
  withValidation(loginSchema)(async ({ request, getClientAddress }) => {
    const { email, password, remember } = locals.validated as z.infer<typeof loginSchema>;
    
    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      error(401, 'Invalid credentials');
    }
    
    // Verify password
    const isValidPassword = await userRepository.verifyPassword(user, password);
    if (!isValidPassword) {
      error(401, 'Invalid credentials');
    }
    
    // Create session
    const session = await sessionManager.create(user.id, {
      ip: getClientAddress(),
      userAgent: request.headers.get('user-agent') || '',
      remember
    });
    
    // Set session cookie
    cookies.set('session_token', session.token, {
      path: '/',
      httpOnly: true,
      secure: !dev,
      sameSite: 'lax',
      maxAge: remember ? 86400 * 30 : 86400 // 30 days or 1 day
    });
    
    return json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  })
);
```

```typescript
// src/routes/api/auth/logout/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { sessionManager } from '$lib/server/auth/session';
import { withAuth } from '$lib/server/middleware';

export const POST = withAuth(async ({ locals, cookies }) => {
  const sessionToken = cookies.get('session_token');
  
  if (sessionToken) {
    await sessionManager.revoke(sessionToken);
    cookies.delete('session_token', { path: '/' });
  }
  
  return json({
    success: true,
    message: 'Logged out successfully'
  });
});
```

```typescript
// src/routes/api/auth/me/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { withAuth } from '$lib/server/middleware';
import { userRepository } from '$lib/server/repositories/UserRepository';

export const GET = withAuth(async ({ locals }) => {
  const user = await userRepository.findById(locals.user.id);
  
  return json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profile: user.profile
    }
  });
});
```

### Session Management
```typescript
// src/lib/server/auth/session.ts
import { db } from '$lib/server/db';
import { randomBytes } from 'crypto';

export interface SessionData {
  userId: string;
  ip?: string;
  userAgent?: string;
  remember?: boolean;
}

export class SessionManager {
  async create(userId: string, data?: SessionData) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    
    // Set expiration based on remember flag
    const days = data?.remember ? 30 : 1;
    expiresAt.setDate(expiresAt.getDate() + days);
    
    await db.session.create({
      data: {
        token,
        userId,
        expiresAt,
        ip: data?.ip,
        userAgent: data?.userAgent
      }
    });
    
    return { token, expiresAt };
  }
  
  async validate(token: string) {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.revoke(token);
      }
      return null;
    }
    
    // Optionally update last activity
    await db.session.update({
      where: { id: session.id },
      data: { updatedAt: new Date() }
    });
    
    return session.user;
  }
  
  async revoke(token: string) {
    await db.session.delete({
      where: { token }
    });
  }
  
  async revokeAllForUser(userId: string) {
    await db.session.deleteMany({
      where: { userId }
    });
  }
  
  async cleanup() {
    await db.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  }
}

export const sessionManager = new SessionManager();
```

## File Upload Examples

### Image Upload API
```typescript
// src/routes/api/upload/images/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '$lib/server/middleware';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST = withAuth(async ({ request, locals }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      error(400, 'No file provided');
    }
    
    // Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
      error(400, 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
    }
    
    if (file.size > MAX_FILE_SIZE) {
      error(400, 'File size exceeds 5MB limit');
    }
    
    // Generate unique filename
    const extension = extname(file.name);
    const filename = `${uuidv4()}${extension}`;
    
    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'uploads', 'images');
    await mkdir(uploadsDir, { recursive: true });
    
    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);
    
    // Save file record to database
    const fileRecord = await db.file.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        userId: locals.user.id,
        path: `/uploads/images/${filename}`,
        category: 'IMAGE'
      }
    });
    
    return json({
      success: true,
      data: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        size: fileRecord.size,
        url: fileRecord.path,
        mimeType: fileRecord.mimeType
      }
    }, { status: 201 });
    
  } catch (err) {
    console.error('File upload error:', err);
    error(500, 'Failed to upload file');
  }
});

// DELETE /api/upload/images/[filename]
export const DELETE = withAuth(async ({ params, locals }) => {
  const { filename } = params;
  
  // Find file record
  const fileRecord = await db.file.findUnique({
    where: { filename, category: 'IMAGE' }
  });
  
  if (!fileRecord) {
    error(404, 'File not found');
  }
  
  // Check permissions
  if (fileRecord.userId !== locals.user.id && locals.user.role !== 'ADMIN') {
    error(403, 'Access denied');
  }
  
  try {
    // Delete file from filesystem
    const filepath = join(process.cwd(), 'uploads', 'images', filename);
    await unlink(filepath);
    
    // Delete database record
    await db.file.delete({
      where: { id: fileRecord.id }
    });
    
    return new Response(null, { status: 204 });
    
  } catch (err) {
    console.error('File deletion error:', err);
    error(500, 'Failed to delete file');
  }
});
```

## WebSocket Examples

### Real-time Notifications
```typescript
// src/routes/api/notifications/+server.ts
import { upgradeWebSocket } from '$app/websocket';
import { getKVData, setKVData } from '$lib/server/cloudflare';

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'notification' | 'ping' | 'pong';
  data?: any;
  room?: string;
}

export const GET = upgradeWebSocket(() => {
  return {
    open(socket) {
      console.log('WebSocket connection opened');
      
      // Get user from session cookie
      const sessionCookie = socket.request.headers.get('cookie')?.match(/session_token=([^;]+)/);
      if (!sessionCookie) {
        socket.close(4001, 'Authentication required');
        return;
      }
      
      socket.userId = null; // Will be set after session validation
      socket.rooms = new Set<string>();
      
      // Handle messages
      socket.on('message', async (message) => {
        try {
          const data: WebSocketMessage = JSON.parse(message.toString());
          await handleMessage(socket, data);
        } catch (err) {
          console.error('WebSocket message error:', err);
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });
      
      // Handle close
      socket.on('close', () => {
        console.log('WebSocket connection closed');
        // Remove from all rooms
        socket.rooms.forEach(room => {
          leaveRoom(room, socket);
        });
      });
    }
  };
});

async function handleMessage(socket: any, message: WebSocketMessage) {
  switch (message.type) {
    case 'subscribe':
      if (message.room) {
        await joinRoom(message.room, socket);
        socket.send(JSON.stringify({
          type: 'subscribed',
          room: message.room
        }));
      }
      break;
      
    case 'unsubscribe':
      if (message.room) {
        leaveRoom(message.room, socket);
        socket.send(JSON.stringify({
          type: 'unsubscribed',
          room: message.room
        }));
      }
      break;
      
    case 'ping':
      socket.send(JSON.stringify({ type: 'pong' }));
      break;
      
    case 'notification':
      // Only admin users can send notifications
      if (socket.userRole === 'ADMIN' && message.data) {
        await broadcastNotification(message.data, message.room);
      }
      break;
  }
}

async function joinRoom(room: string, socket: any) {
  socket.rooms.add(room);
  
  // Store room membership in KV for cross-instance support
  const roomKey = `ws_room:${room}`;
  const members = await getKVData(roomKey) || [];
  if (!members.includes(socket.id)) {
    members.push(socket.id);
    await setKVData(roomKey, members, 3600); // 1 hour TTL
  }
}

function leaveRoom(room: string, socket: any) {
  socket.rooms.delete(room);
  // Remove from KV storage (implement as needed)
}

async function broadcastNotification(notification: any, room?: string) {
  const connections = getWebSocketConnections();
  
  connections.forEach(conn => {
    if (!room || conn.rooms.has(room)) {
      conn.send(JSON.stringify({
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

// Helper to get all active connections (implement based on your WebSocket server)
function getWebSocketConnections() {
  // Return array of active WebSocket connections
  return [];
}
```

## Caching Examples

### Redis-based Caching
```typescript
// src/lib/server/cache/redis.ts
import Redis from 'ioredis';

class RedisCache {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error('Redis get error:', err);
      return null;
    }
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
      console.error('Redis set error:', err);
    }
  }
  
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      console.error('Redis delete error:', err);
    }
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (err) {
      console.error('Redis invalidate pattern error:', err);
    }
  }
}

// Cache decorator
export function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const cache = new RedisCache();
    
    try {
      // Try cache first
      const cached = await cache.get<T>(key);
      if (cached !== null) {
        resolve(cached);
        return;
      }
      
      // Execute function
      const result = await fn();
      
      // Cache result
      await cache.set(key, result, ttl);
      
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

// Usage in API route
export const GET = async ({ url }) => {
  const category = url.searchParams.get('category');
  const cacheKey = `posts:${category || 'all'}`;
  
  const posts = await withCache(cacheKey, async () => {
    return await postRepository.findPublished({ category });
  }, 600); // 10 minutes cache
  
  return json({ success: true, data: posts });
};
```

These examples provide production-ready API implementations covering CRUD operations, authentication, file handling, real-time communication, and caching strategies for SvelteKit backend development.