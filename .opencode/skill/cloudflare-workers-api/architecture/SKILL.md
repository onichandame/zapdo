---
name: cloudflare-workers-architecture
description: Core architecture and project structure for Cloudflare Workers with SvelteKit API routes, environment configuration, and TypeScript setup patterns.
license: MIT
scope: project
---

# Cloudflare Workers - Core Architecture

## When to use this skill
When setting up a new Cloudflare Workers project with SvelteKit or establishing the foundational architecture for serverless API development.

## Project Structure

### Recommended Directory Layout
```
your-project/
├── src/
│   ├── lib/
│   │   └── server/
│   │       ├── env.ts           # Environment types
│   │       ├── db/              # Database modules
│   │       ├── auth/            # Authentication
│   │       ├── r2/              # Storage operations
│   │       └── middleware/      # Request handlers
│   └── routes/
│       └── api/                 # API endpoints
│           └── [...routes]/
│               └── +server.ts   # SvelteKit API routes
├── wrangler.toml                # Cloudflare configuration
├── drizzle.config.ts           # Database configuration
└── package.json
```

### Core Environment Configuration

#### Environment Interface
```typescript
// src/lib/server/env.ts
export interface Env {
  // Database bindings
  TASKS_DB: D1Database;
  
  // Storage bindings
  R2_BUCKET: R2Bucket;
  SESSION_KV: KVNamespace;
  
  // Authentication
  JWT_SECRET: string;
  PASSWORD_SALT_ROUNDS: string;
  
  // External services
  LOG_ENDPOINT?: string;
  ANALYTICS_KEY?: string;
  
  // Development overrides
  DEV_SEED_DATA?: string;
}
```

#### Global Types Declaration
```typescript
// src/app.d.ts
/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Locals {
      session?: import('$lib/server/auth/session').SessionData;
      user?: import('$lib/server/db/schema').User;
    }
  }
}

export {};
```

## API Route Structure

### SvelteKit API Route Patterns

#### Basic CRUD Route
```typescript
// src/routes/api/tasks/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, platform }) => {
  return json({ tasks: [] });
};

export const POST: RequestHandler = async ({ locals, request, platform }) => {
  const body = await request.json();
  return json({ id: 123, ...body }, { status: 201 });
};
```

#### Dynamic Route Parameters
```typescript
// src/routes/api/tasks/[id]/+server.ts
export const GET: RequestHandler = async ({ params }) => {
  const taskId = parseInt(params.id!);
  
  if (!taskId || isNaN(taskId)) {
    throw error(400, 'Invalid task ID');
  }
  
  // Fetch and return task
};
```

### HTTP Method Implementation Patterns

#### Full CRUD Operations
```typescript
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
  // Retrieve resource
};

export const POST: RequestHandler = async ({ locals, request}) => {
  // Create resource
};

export const PUT: RequestHandler = async ({ params, locals, request }) => {
  // Update entire resource
};

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
  // Partial update
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  // Delete resource
};
```

## Configuration Files

### Wrangler Configuration
```toml
# wrangler.toml
name = "your-api"
main = "index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "TASKS_DB"
database_name = "your-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-bucket"

[[kv_namespaces]]
binding = "SESSION_KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-id"

[vars]
ENVIRONMENT = "production"
```

### Package Dependencies
```json
{
  "dependencies": {
    "@sveltejs/adapter-cloudflare": "^1.0.0",
    "drizzle-orm": "^0.28.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "drizzle-kit": "^0.19.0",
    "typescript": "^5.0.0"
  }
}
```

### TypeScript Configuration
```json
// tsconfig.json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["@cloudflare/workers-types"]
  }
}
```

## Development Setup

### Local Development Server
```typescript
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { authHandler } from '$lib/server/middleware/auth';
import { errorHandler } from '$lib/server/middleware/error';

export const handle = sequence(authHandler, errorHandler);
```

### Environment Variables for Development
```typescript
// src/lib/server/dev.ts
import type { Env } from './env';

export function createDevEnv(): Env {
  return {
    TASKS_DB: globalThis.D1_DATABASE,
    R2_BUCKET: globalThis.R2_BUCKET,
    SESSION_KV: globalThis.KV_NAMESPACE,
    JWT_SECRET: 'dev-secret-not-for-production',
    PASSWORD_SALT_ROUNDS: '10'
  };
}
```

## Module Import Patterns

### Database Module Structure
```typescript
// src/lib/server/db/index.ts
export { createDB } from './client';
export * from './schema';
export { paginate } from './utils';

// Usage in routes
import { createDB, tasks } from '$lib/server/db';
```

### Authentication Module Structure
```typescript
// src/lib/server/auth/index.ts
export { SessionManager } from './session';
export { ChallengeAuth } from './challenge';
export { authMiddleware } from './middleware';

// Usage in routes
import { SessionManager } from '$lib/server/auth';
```

## Best Practices

### Type Safety
- Always define interfaces for environment variables
- Use TypeScript strict mode
- Export types for reusable components
- Validate runtime data with schemas

### Error Handling
- Implement consistent error responses
- Use proper HTTP status codes
- Log errors with context
- Provide meaningful error messages

### Performance
- Minimize database queries
- Use appropriate caching strategies
- Implement proper pagination
- Bundle optimization for Workers

## Next Steps
- Move to [Authentication & Security](../authentication/) for user management
- Implement [D1 Database](../database/) for data persistence
- Add [R2 Storage](../storage/) for file operations

## Related Skills
- [Authentication & Security](../authentication/) - Session management and security patterns
- [D1 Database Operations](../database/) - Database setup and querying
- [R2 Object Storage](../storage/) - File upload/download operations
- [Error Handling](../error-handling/) - Comprehensive error management