# Backend Troubleshooting

## Common Issues & Solutions

### Database Connection Issues

#### Problem: Database connections timing out
```typescript
// Wrong: No connection pooling or timeout handling
import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();
```

**Solution:** Configure connection pooling and timeouts
```typescript
// Correct: Proper database configuration
import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  // Connection pool settings
  __internal: {
    engine: {
      binaryTargets: ['native'],
      connectionTimeout: 10000,
      queryTimeout: 30000
    }
  }
});

// Connection health check
export async function checkDbConnection() {
  try {
    await db.$connect();
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  } finally {
    await db.$disconnect();
  }
}
```

#### Problem: Database queries returning undefined
```typescript
// Wrong: Not handling null results
export async function getUser(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  return user.email; // May throw if user is null
}
```

**Solution:** Handle null/undefined properly
```typescript
// Correct: Proper null handling
export async function getUser(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user.email;
}

// Alternative: Return null and handle in caller
export async function findUser(id: string) {
  return await db.user.findUnique({ where: { id } });
}
```

### Authentication Issues

#### Problem: Session not persisting
```typescript
// Wrong: Not setting cookie properly
export async function login(email: string, password: string) {
  const user = await authenticateUser(email, password);
  const token = generateToken(user.id);
  
  // Missing cookie configuration
  cookies.set('auth_token', token);
}
```

**Solution:** Configure cookie properly
```typescript
// Correct: Proper cookie configuration
export async function login(email: string, password: string) {
  const user = await authenticateUser(email, password);
  const token = generateToken(user.id);
  
  cookies.set('auth_token', token, {
    path: '/',
    httpOnly: true,
    secure: !dev, // Secure in production
    sameSite: 'lax',
    maxAge: 86400 // 24 hours
  });
}
```

#### Problem: Middleware not executing
```typescript
// src/hooks.server.ts
// Wrong: Missing sequence middleware
export const handle = async ({ event, resolve }) => {
  // This will override or miss other middleware
  return resolve(event);
};
```

**Solution:** Use sequence for multiple middleware
```typescript
// Correct: Proper middleware sequence
import { sequence } from '@sveltejs/kit/hooks';

async function auth({ event, resolve }) {
  // Authentication logic
  return resolve(event);
}

async function cors({ event, resolve }) {
  const response = await resolve(event);
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}

export const handle = sequence(auth, cors);
```

### API Route Issues

#### Problem: CORS errors in development
```typescript
// Wrong: No CORS handling
export const GET: RequestHandler = async ({ request }) => {
  const data = await fetchData();
  return json(data);
};
```

**Solution:** Add proper CORS handling
```typescript
// Correct: CORS handling
export const GET: RequestHandler = async ({ request }) => {
  const data = await fetchData();
  
  return json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};

// Handle OPTIONS preflight
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};
```

#### Problem: Request body not parsing
```typescript
// Wrong: Not handling different content types
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json(); // Fails for form data
  
  return json({ received: body });
};
```

**Solution:** Handle different content types
```typescript
// Correct: Handle multiple content types
export const POST: RequestHandler = async ({ request }) => {
  let body;
  
  const contentType = request.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    body = await request.json();
  } else if (contentType?.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries());
  } else {
    throw new Error('Unsupported content type');
  }
  
  return json({ received: body });
};
```

### Environment Variables Issues

#### Problem: Environment variables undefined
```typescript
// Wrong: Accessing undefined variables
export const dbUrl = process.env.DATABASE_URL;
export const apiKey = process.env.API_KEY;
```

**Solution:** Use SvelteKit environment handling
```typescript
// Correct: Use dynamic imports
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export const dbUrl = env.DATABASE_URL;
export const apiKey = env.API_KEY;
export const publicApiKey = publicEnv.PUBLIC_API_KEY;

// Validate required variables
function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();
```

### Error Handling Issues

#### Problem: Unhandled promise rejections
```typescript
// Wrong: Not handling async errors
export const GET: RequestHandler = async () => {
  const data = await fetchData(); // May throw
  return json(data); // Never reached if error
};
```

**Solution:** Proper error handling
```typescript
// Correct: Try-catch with proper error responses
export const GET: RequestHandler = async () => {
  try {
    const data = await fetchData();
    return json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof ValidationError) {
      return json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
};
```

### Memory Leaks

#### Problem: Database connections not closed
```typescript
// Wrong: Creating new connections per request
export const GET: RequestHandler = async () => {
  const db = new PrismaClient(); // New connection each time
  const data = await db.user.findMany();
  return json(data);
  // Connection never closed
};
```

**Solution:** Use singleton database instance
```typescript
// Correct: Reuse database instance
import { db } from '$lib/server/db';

export const GET: RequestHandler = async () => {
  const data = await db.user.findMany();
  return json(data);
};

// Ensure cleanup on process exit
process.on('beforeExit', async () => {
  await db.$disconnect();
});
```

### Performance Issues

#### Problem: N+1 query problems
```typescript
// Wrong: N+1 queries
export const GET: RequestHandler = async () => {
  const posts = await db.post.findMany();
  
  // This creates N additional queries
  const postsWithAuthors = await Promise.all(
    posts.map(post => 
      db.user.findUnique({ where: { id: post.authorId } })
    )
  );
  
  return json(postsWithAuthors);
};
```

**Solution:** Use proper eager loading
```typescript
// Correct: Eager loading with include
export const GET: RequestHandler = async () => {
  const posts = await db.post.findMany({
    include: {
      author: true,
      comments: true,
      tags: true
    }
  });
  
  return json(posts);
};
```

#### Problem: Inefficient database queries
```typescript
// Wrong: Loading all data then filtering
export const GET: RequestHandler = async ({ url }) => {
  const search = url.searchParams.get('search');
  const allUsers = await db.user.findMany(); // Loads all users
  
  const filteredUsers = allUsers.filter(user => 
    user.name.includes(search) // Client-side filtering
  );
  
  return json(filteredUsers);
};
```

**Solution:** Database-level filtering
```typescript
// Correct: Database-level filtering
export const GET: RequestHandler = async ({ url }) => {
  const search = url.searchParams.get('search');
  
  const users = await db.user.findMany({
    where: search ? {
      name: {
        contains: search,
        mode: 'insensitive'
      }
    } : {},
    take: 50, // Pagination
    select: {
      id: true,
      name: true,
      email: true
    }
  });
  
  return json(users);
};
```

### File Upload Issues

#### Problem: File uploads failing silently
```typescript
// Wrong: No proper error handling for uploads
export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // No validation
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile('uploads/' + file.name, buffer);
  
  return json({ success: true });
};
```

**Solution:** Proper validation and error handling
```typescript
// Correct: Comprehensive file handling
export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      return json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      );
    }
    
    if (file.size > maxSize) {
      return json(
        { success: false, error: 'File too large' },
        { status: 400 }
      );
    }
    
    // Generate safe filename
    const ext = file.name.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    
    // Ensure directory exists
    await mkdir('uploads', { recursive: true });
    
    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(`uploads/${filename}`, buffer);
    
    return json({
      success: true,
      data: { filename, size: file.size }
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
};
```

### Rate Limiting Issues

#### Problem: Rate limiting not working correctly
```typescript
// Wrong: In-memory rate limiting (doesn't work across instances)
const requests = new Map();

export const GET: RequestHandler = async ({ getClientAddress }) => {
  const ip = getClientAddress();
  const count = (requests.get(ip) || 0) + 1;
  requests.set(ip, count);
  
  if (count > 10) {
    throw error(429, 'Too many requests');
  }
  
  // Handler logic
};
```

**Solution:** Use persistent storage for rate limiting
```typescript
// Correct: Redis-based rate limiting
export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
) {
  const key = `rate_limit:${identifier}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }
  
  if (current > limit) {
    throw error(429, 'Too many requests');
  }
}

export const GET: RequestHandler = async ({ getClientAddress }) => {
  const ip = getClientAddress();
  await rateLimit(ip, 10, 60000); // 10 requests per minute
  
  // Handler logic
};
```

### Logging and Debugging

#### Problem: Poor logging making debugging difficult
```typescript
// Wrong: Minimal logging
export const GET: RequestHandler = async ({ params }) => {
  const user = await db.user.findUnique({ where: { id: params.id } });
  return json(user);
};
```

**Solution:** Comprehensive logging
```typescript
// Correct: Structured logging
export const GET: RequestHandler = async ({ params, getClientAddress }) => {
  const startTime = Date.now();
  const clientIP = getClientAddress();
  
  console.log('API Request:', {
    method: 'GET',
    endpoint: `/api/users/${params.id}`,
    clientIP,
    timestamp: new Date().toISOString()
  });
  
  try {
    const user = await db.user.findUnique({ where: { id: params.id } });
    
    if (!user) {
      console.log('User not found:', { userId: params.id, clientIP });
      throw error(404, 'User not found');
    }
    
    const duration = Date.now() - startTime;
    console.log('API Success:', {
      endpoint: `/api/users/${params.id}`,
      duration,
      clientIP
    });
    
    return json({ success: true, data: user });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('API Error:', {
      endpoint: `/api/users/${params.id}`,
      error: error.message,
      duration,
      clientIP
    });
    
    throw error;
  }
};
```

### Testing Issues

#### Problem: Tests failing due to database state
```typescript
// Wrong: Tests interfering with each other
describe('User API', () => {
  it('should create user', async () => {
    const response = await app.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' })
    });
    // User stays in database
  });
  
  it('should not create duplicate user', async () => {
    const response = await app.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' })
    });
    // Fails because user already exists
  });
});
```

**Solution:** Proper test setup and teardown
```typescript
// Correct: Test database isolation
describe('User API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });
  
  afterEach(async () => {
    await cleanupTestDatabase();
  });
  
  it('should create user', async () => {
    const response = await app.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' })
    });
    expect(response.status).toBe(201);
  });
  
  it('should not create duplicate user', async () => {
    await createUser({ email: 'test@example.com', name: 'Test' });
    
    const response = await app.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' })
    });
    expect(response.status).toBe(409);
  });
});
```

### Common Solutions

1. **Always validate environment variables**
2. **Use proper error handling with status codes**
3. **Implement database connection pooling**
4. **Handle different content types properly**
5. **Use persistent storage for rate limiting**
6. **Implement comprehensive logging**
7. **Use database-level filtering and pagination**
8. **Set up test database isolation**

### Getting Help

- Check browser dev tools for network errors
- Use database query logging
- Enable debug mode for detailed error logs
- Test API endpoints with tools like Postman
- Check environment variable configuration
- Review SvelteKit documentation for latest patterns

This troubleshooting guide provides comprehensive solutions for common backend development issues in SvelteKit applications.