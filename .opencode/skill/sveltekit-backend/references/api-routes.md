# API Routes Development

## API Route Fundamentals

### Route File Structure
API routes in SvelteKit use the `+server.ts` (or `.js`) file pattern:

```typescript
// src/routes/api/users/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';

// GET /api/users
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Validate query parameters
    if (limit > 100) {
      error(400, 'Limit cannot exceed 100');
    }
    
    const users = await db.users.findMany({
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });
    
    const total = await db.users.count();
    
    return json({
      success: true,
      data: users,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    error(500, 'Failed to fetch users');
  }
};

// POST /api/users
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Authentication check
    if (!locals.user) {
      error(401, 'Authentication required');
    }
    
    // Authorization check
    if (locals.user.role !== 'admin') {
      error(403, 'Admin access required');
    }
    
    const body = await request.json();
    
    // Input validation
    const userSchema = z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      role: z.enum(['user', 'admin']).default('user')
    });
    
    const validated = userSchema.parse(body);
    
    // Check for existing user
    const existing = await db.users.findUnique({
      where: { email: validated.email }
    });
    
    if (existing) {
      error(409, 'User with this email already exists');
    }
    
    const user = await db.users.create({
      data: validated,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    
    return json({
      success: true,
      data: user
    }, { status: 201 });
    
  } catch (err) {
    if (err instanceof z.ZodError) {
      error(400, 'Invalid input: ' + err.errors.map(e => e.message).join(', '));
    }
    console.error('Error creating user:', err);
    error(500, 'Failed to create user');
  }
};
```

### Dynamic Route Parameters
```typescript
// src/routes/api/users/[id]/+server.ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  const { id } = params;
  
  // Validate ID
  if (!id || !/^\d+$/.test(id)) {
    error(400, 'Invalid user ID');
  }
  
  const user = await db.users.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });
  
  if (!user) {
    error(404, 'User not found');
  }
  
  return json({ success: true, data: user });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const { id } = params;
  
  if (!locals.user) {
    error(401, 'Authentication required');
  }
  
  // Users can only update their own profile, admins can update anyone
  if (locals.user.id !== parseInt(id) && locals.user.role !== 'admin') {
    error(403, 'Insufficient permissions');
  }
  
  const body = await request.json();
  
  const updateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional()
  });
  
  const validated = updateSchema.parse(body);
  
  try {
    const user = await db.users.update({
      where: { id: parseInt(id) },
      data: validated,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });
    
    return json({ success: true, data: user });
  } catch (err) {
    if (err.code === 'P2002') { // Prisma unique constraint violation
      error(409, 'Email already exists');
    }
    error(500, 'Failed to update user');
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const { id } = params;
  
  if (!locals.user || locals.user.role !== 'admin') {
    error(403, 'Admin access required');
  }
  
  await db.users.delete({
    where: { id: parseInt(id) }
  });
  
  return new Response(null, { status: 204 });
};
```

## Advanced API Patterns

### Middleware Composition
```typescript
// src/lib/server/middleware.ts
import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

// Authentication middleware
export function withAuth(handler: RequestHandler): RequestHandler {
  return async (event) => {
    if (!event.locals.user) {
      error(401, 'Authentication required');
    }
    return handler(event);
  };
}

// Admin-only middleware
export function withAdmin(handler: RequestHandler): RequestHandler {
  return async (event) => {
    if (!event.locals.user || event.locals.user.role !== 'admin') {
      error(403, 'Admin access required');
    }
    return handler(event);
  };
}

// Rate limiting middleware
export function withRateLimit(
  limit: number,
  windowMs: number = 60000
): (handler: RequestHandler) => RequestHandler {
  return (handler: RequestHandler) => async (event) => {
    const ip = event.getClientAddress();
    rateLimit(ip, limit, windowMs);
    return handler(event);
  };
}

// Validation middleware
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' = 'body'
): (handler: RequestHandler) => RequestHandler {
  return (handler: RequestHandler) => async (event) => {
    let data;
    
    if (source === 'body') {
      data = await event.request.json();
    } else {
      const url = new URL(event.request.url);
      data = Object.fromEntries(url.searchParams.entries());
    }
    
    try {
      const validated = schema.parse(data);
      // Attach validated data to event locals
      (event.locals as any).validated = validated;
      return handler(event);
    } catch (err) {
      if (err instanceof z.ZodError) {
        error(400, 'Validation failed: ' + err.errors.map(e => e.message).join(', '));
      }
      error(400, 'Invalid input data');
    }
  };
}

// Usage example
// src/routes/api/products/+server.ts
import { withAuth, withAdmin, withValidation, withRateLimit } from '$lib/server/middleware';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  categoryId: z.string()
});

export const POST = withRateLimit(10)(
  withAuth(
    withAdmin(
      withValidation(createProductSchema)(async ({ locals }) => {
        const validated = locals.validated as z.infer<typeof createProductSchema>;
        
        const product = await db.products.create({
          data: validated
        });
        
        return json({ success: true, data: product }, { status: 201 });
      })
    )
  )
);
```

### File Upload Handling
```typescript
// src/routes/api/upload/+server.ts
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    error(401, 'Authentication required');
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      error(400, 'No file provided');
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      error(400, 'Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      error(400, 'File size exceeds 5MB limit');
    }
    
    // Generate unique filename
    const extension = file.name.split('.').pop();
    const filename = `${uuidv4()}.${extension}`;
    
    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    
    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);
    
    // Save file record to database
    const fileRecord = await db.files.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        userId: locals.user.id,
        path: `/uploads/${filename}`
      }
    });
    
    return json({
      success: true,
      data: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        size: fileRecord.size,
        url: fileRecord.path
      }
    }, { status: 201 });
    
  } catch (err) {
    console.error('File upload error:', err);
    error(500, 'Failed to upload file');
  }
};

// Serve uploaded files
// src/routes/api/files/[filename]/+server.ts
export const GET: RequestHandler = async ({ params, locals }) => {
  const { filename } = params;
  
  // Find file record
  const fileRecord = await db.files.findUnique({
    where: { filename }
  });
  
  if (!fileRecord) {
    error(404, 'File not found');
  }
  
  // Check permissions (user can only access their own files, admins can access all)
  if (locals.user?.id !== fileRecord.userId && locals.user?.role !== 'admin') {
    error(403, 'Access denied');
  }
  
  try {
    const filepath = join(process.cwd(), 'uploads', filename);
    const fileBuffer = await readFile(filepath);
    
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': fileRecord.mimeType,
        'Content-Length': fileRecord.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
        'Content-Disposition': `inline; filename="${fileRecord.originalName}"`
      }
    });
  } catch (err) {
    error(500, 'Failed to serve file');
  }
};
```

### Streaming Responses
```typescript
// src/routes/api/export/+server.ts
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    error(401, 'Authentication required');
  }
  
  const format = url.searchParams.get('format') || 'json';
  
  if (format === 'csv') {
    // Stream CSV response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // CSV header
          controller.enqueue(encoder.encode('ID,Name,Email,Created At\n'));
          
          // Stream data in chunks
          let offset = 0;
          const chunkSize = 100;
          
          while (true) {
            const users = await db.users.findMany({
              take: chunkSize,
              skip: offset,
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
              }
            });
            
            if (users.length === 0) break;
            
            for (const user of users) {
              const row = `${user.id},"${user.name}","${user.email}","${user.createdAt.toISOString()}"\n`;
              controller.enqueue(encoder.encode(row));
            }
            
            offset += chunkSize;
          }
          
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="users.csv"'
      }
    });
  }
  
  // Default JSON response
  const users = await db.users.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });
  
  return json({ success: true, data: users });
};
```

### Caching Strategies
```typescript
// src/lib/server/cache.ts
const cache = new Map<string, { data: any; expires: number }>();

export function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 300000 // 5 minutes default
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const cached = cache.get(key);
      const now = Date.now();
      
      if (cached && cached.expires > now) {
        resolve(cached.data);
        return;
      }
      
      const data = await fn();
      cache.set(key, { data, expires: now + ttl });
      resolve(data);
    } catch (err) {
      reject(err);
    }
  });
}

// In API route
export const GET: RequestHandler = async ({ url }) => {
  const categoryId = url.searchParams.get('categoryId');
  const cacheKey = `products:${categoryId || 'all'}`;
  
  const products = await withCache(cacheKey, async () => {
    return await db.products.findMany({
      where: categoryId ? { categoryId } : {},
      include: {
        category: true
      }
    });
  }, 600000); // 10 minutes cache
  
  return json({ success: true, data: products }, {
    headers: {
      'Cache-Control': 'public, max-age=600', // 10 minutes browser cache
      'X-Cache-Key': cacheKey
    }
  });
};
```

### GraphQL Integration
```typescript
// src/routes/api/graphql/+server.ts
import { createServer } from 'http';
import { yoga } from 'graphql-yoga';
import { createSchema } from 'graphql-yoga';
import { typeDefs } from '$lib/server/graphql/schema';
import { resolvers } from '$lib/server/graphql/resolvers';
import { createContext } from '$lib/server/graphql/context';

const { handleRequest } = yoga({
  schema: createSchema({
    typeDefs,
    resolvers
  }),
  context: createContext,
  graphiql: process.env.NODE_ENV === 'development'
});

export const GET: RequestHandler = async (event) => {
  const response = await handleRequest(event.request);
  return response;
};

export const POST: RequestHandler = async (event) => {
  const response = await handleRequest(event.request);
  return response;
};
```

### WebSocket Support
```typescript
// src/routes/api/ws/+server.ts
import { WebSocketServer } from 'ws';
import { upgradeWebSocket } from '$app/websocket';

export const GET = upgradeWebSocket(() => {
  return {
    open(socket) {
      console.log('WebSocket connection opened');
      
      // Send welcome message
      socket.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to real-time updates'
      }));
      
      // Join rooms based on query params
      const url = new URL(socket.url);
      const room = url.searchParams.get('room');
      if (room) {
        socket.join(room);
      }
    },
    
    message(socket, message) {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;
            
          case 'join_room':
            socket.join(data.room);
            socket.send(JSON.stringify({
              type: 'joined_room',
              room: data.room
            }));
            break;
            
          case 'broadcast':
            // Broadcast to all clients in the room
            socket.to(data.room || 'default').emit('message', data.payload);
            break;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    },
    
    close(socket, code, reason) {
      console.log('WebSocket connection closed:', code, reason);
    }
  };
});
```

## Error Handling & Status Codes

### Standardized Error Responses
```typescript
// src/lib/server/api-response.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    timestamp: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export function createSuccessResponse<T>(
  data: T,
  meta?: ApiSuccess<T>['meta']
): ApiSuccess<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: any
): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID()
    }
  };
}

export function withApiHandler<T>(
  handler: (event: any) => Promise<T>
): RequestHandler {
  return async (event) => {
    try {
      const result = await handler(event);
      return json(createSuccessResponse(result));
    } catch (err) {
      console.error('API Error:', err);
      
      // Handle known error types
      if (err instanceof z.ZodError) {
        return json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid input data',
            err.errors
          ),
          { status: 400 }
        );
      }
      
      if (err instanceof AppError) {
        return json(
          createErrorResponse(err.code, err.message),
          { status: err.statusCode }
        );
      }
      
      // Generic server error
      return json(
        createErrorResponse(
          'INTERNAL_ERROR',
          'Internal server error'
        ),
        { status: 500 }
      );
    }
  };
}

// Usage
export const GET = withApiHandler(async ({ url }) => {
  const users = await db.users.findMany();
  return users;
});
```

This comprehensive guide covers modern SvelteKit API route development patterns, from basic CRUD operations to advanced features like file uploads, streaming, caching, and real-time communication.