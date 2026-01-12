# Database Integration

## Database Setup & Configuration

### Environment Configuration
```typescript
// src/lib/server/db.ts
import { PrismaClient } from '@prisma/client';
import { dev } from '$app/environment';

// Prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: dev ? ['query', 'info', 'warn', 'error'] : ['error']
});

if (dev) globalForPrisma.prisma = db;

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.$connect();
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect();
});
```

### Drizzle ORM Setup
```typescript
// src/lib/server/db-drizzle.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection for queries
const client = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

export const db = drizzle(client, { schema });

// Migration runner
export async function runMigrations() {
  const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
  const migrationDb = drizzle(migrationClient);
  
  await migrate(migrationDb, { migrationsFolder: 'drizzle' });
  await migrationClient.end();
}
```

### D1 Database (Cloudflare)
```typescript
// src/lib/server/db-d1.ts
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  dump(): Promise<ArrayBuffer>;
}

export interface D1PreparedStatement {
  bind(...params: any[]): D1PreparedStatement;
  first<T = any>(col?: string): Promise<T | undefined>;
  run<T = any>(): Promise<D1Result<T>>;
  all<T = any>(): Promise<D1ResultSet<T>>;
}

export interface D1Result<T = any> {
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
  };
  results?: T[];
}

export interface D1ResultSet<T = any> extends D1Result<T> {
  results: T[];
  success: true;
}

// D1 helper functions
export function getD1Database(): D1Database {
  const { platform } = getRequestEvent();
  if (!platform?.env?.D1_DATABASE) {
    throw new Error('D1 database not available');
  }
  return platform.env.D1_DATABASE;
}

export async function query<T = any>(
  sql: string, 
  params: any[] = []
): Promise<T[]> {
  const db = getD1Database();
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).all<T>();
  return result.results;
}

export async function queryOne<T = any>(
  sql: string, 
  params: any[] = []
): Promise<T | null> {
  const db = getD1Database();
  const stmt = db.prepare(sql);
  const result = await stmt.first<T>();
  return result || null;
}

export async function execute(
  sql: string, 
  params: any[] = []
): Promise<D1Result> {
  const db = getD1Database();
  const stmt = db.prepare(sql);
  return await stmt.bind(...params).run();
}
```

## Database Schema Design

### Prisma Schema Example
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  role      UserRole @default(USER)
  emailVerified DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  posts     Post[]
  comments  Comment[]
  sessions  Session[]
  profile   Profile?

  @@map("users")
}

model Profile {
  id        String   @id @default(uuid())
  userId    String   @unique
  bio       String?
  avatar    String?
  website   String?
  location  String?
  birthDate DateTime?
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("profiles")
}

model Post {
  id          String     @id @default(uuid())
  title       String
  slug        String     @unique
  content     String
  excerpt     String?
  published   Boolean    @default(false)
  featured    Boolean    @default(false)
  viewCount   Int        @default(0)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  publishedAt DateTime?

  // Relations
  authorId    String
  author      User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  category    Category?  @relation(fields: [categoryId], references: [id])
  categoryId  String?
  tags        PostTag[]
  comments    Comment[]

  @@index([published])
  @@index([authorId])
  @@map("posts")
}

model Category {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?
  color       String?
  createdAt   DateTime @default(now())
  
  posts       Post[]

  @@map("categories")
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  slug  String @unique
  color String?

  posts PostTag[]

  @@map("tags")
}

model PostTag {
  postId String
  tagId  String

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}

model Comment {
  id        String   @id @default(uuid())
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  postId String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  authorId String
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@index([authorId])
  @@map("comments")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([expiresAt])
  @@map("sessions")
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}
```

### Drizzle Schema Example
```typescript
// src/lib/server/schema.ts
import { 
  pgTable, 
  varchar, 
  text, 
  boolean, 
  integer, 
  timestamp, 
  uuid, 
  primaryKey,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }),
  password: varchar('password', { length: 255 }),
  role: userRoleEnum('role').default('USER'),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  emailIndex: index('users_email_idx').on(table.email)
}));

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  avatar: varchar('avatar', { length: 500 }),
  website: varchar('website', { length: 255 }),
  location: varchar('location', { length: 100 }),
  birthDate: timestamp('birth_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdIndex: index('profiles_user_id_idx').on(table.userId)
}));

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }),
  slug: varchar('slug', { length: 255 }).unique(),
  content: text('content'),
  excerpt: text('excerpt'),
  published: boolean('published').default(false),
  featured: boolean('featured').default(false),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  publishedAt: timestamp('published_at'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id)
}, (table) => ({
  slugIndex: index('posts_slug_idx').on(table.slug),
  authorIdIndex: index('posts_author_id_idx').on(table.authorId),
  publishedIndex: index('posts_published_idx').on(table.published),
  categoryIdIndex: index('posts_category_id_idx').on(table.categoryId)
}));

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique(),
  slug: varchar('slug', { length: 100 }).unique(),
  description: text('description'),
  color: varchar('color', { length: 7 }),
  createdAt: timestamp('created_at').defaultNow()
});

export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN', 'MODERATOR']);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  posts: many(posts),
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] })
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  category: one(categories, { fields: [posts.categoryId], references: [categories.id] })
}));
```

## Database Operations & Patterns

### Repository Pattern
```typescript
// src/lib/server/repositories/UserRepository.ts
import { db } from '../db';
import type { User, Profile } from '@prisma/client';
import { hash, compare } from 'bcryptjs';

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string;
}

export interface UserWithProfile extends User {
  profile?: Profile | null;
}

export class UserRepository {
  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return await db.user.findUnique({
      where: { email }
    });
  }

  // Find user by ID
  async findById(id: string): Promise<UserWithProfile | null> {
    return await db.user.findUnique({
      where: { id },
      include: {
        profile: true
      }
    });
  }

  // Create new user
  async create(data: CreateUserData): Promise<User> {
    const hashedPassword = await hash(data.password, 12);
    
    return await db.user.create({
      data: {
        ...data,
        password: hashedPassword
      }
    });
  }

  // Update user
  async update(id: string, data: UpdateUserData): Promise<User> {
    return await db.user.update({
      where: { id },
      data
    });
  }

  // Delete user
  async delete(id: string): Promise<void> {
    await db.user.delete({
      where: { id }
    });
  }

  // Verify password
  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await compare(password, user.password);
  }

  // Update password
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await hash(newPassword, 12);
    await db.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
  }

  // List users with pagination
  async list(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ users: User[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      db.user.count({ where })
    ]);

    return {
      users,
      total,
      pages: Math.ceil(total / limit)
    };
  }
}

export const userRepository = new UserRepository();
```

### Query Builder Patterns
```typescript
// src/lib/server/repositories/PostRepository.ts
import { db } from '../db';
import type { Post, PostStatus } from '$lib/types';

export class PostRepository {
  // Find published posts with filters
  async findPublished(options: {
    category?: string;
    tag?: string;
    author?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  } = {}) {
    const {
      category,
      tag,
      author,
      featured,
      limit = 20,
      offset = 0,
      search
    } = options;

    const where: any = {
      published: true
    };

    if (category) {
      where.category = { slug: category };
    }

    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
    }

    if (author) {
      where.author = { email: author };
    }

    if (featured !== undefined) {
      where.featured = featured;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { content: { contains: search, mode: 'insensitive' as const } },
        { excerpt: { contains: search, mode: 'insensitive' as const } }
      ];
    }

    return await db.post.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [
        { featured: 'desc' },
        { publishedAt: 'desc' }
      ],
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                avatar: true
              }
            }
          }
        },
        category: true,
        tags: {
          include: {
            tag: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });
  }

  // Find post by slug
  async findBySlug(slug: string): Promise<Post | null> {
    return await db.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true
          }
        },
        category: true,
        tags: {
          include: {
            tag: true
          }
        },
        comments: {
          where: {
            // Include all comments for admin, only approved for public
          },
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    avatar: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  // Increment view count
  async incrementViews(id: string): Promise<void> {
    await db.post.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    });
  }

  // Get popular posts
  async getPopular(limit: number = 5) {
    return await db.post.findMany({
      where: {
        published: true,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      take: limit,
      orderBy: {
        viewCount: 'desc'
      },
      include: {
        author: {
          select: {
            name: true,
            profile: {
              select: {
                avatar: true
              }
            }
          }
        },
        category: true
      }
    });
  }

  // Get related posts
  async getRelated(postId: string, limit: number = 3) {
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        tags: { include: { tag: true } },
        category: true
      }
    });

    if (!post) return [];

    const tagIds = post.tags.map(pt => pt.tagId);
    const categoryId = post.categoryId;

    return await db.post.findMany({
      where: {
        AND: [
          { id: { not: postId } },
          { published: true },
          {
            OR: [
              { categoryId },
              { tags: { some: { tagId: { in: tagIds } } } }
            ]
          }
        ]
      },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: {
          select: {
            name: true,
            profile: {
              select: {
                avatar: true
              }
            }
          }
        },
        category: true
      }
    });
  }
}
```

## Database Migrations

### Prisma Migrations
```bash
# Create migration
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Generate client
npx prisma generate
```

### Drizzle Migrations
```typescript
// drizzle/0001_initial.sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'USER',
  email_verified TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Add more tables...
```

```typescript
// scripts/migrate.ts
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '$lib/server/db-drizzle';

async function runMigrations() {
  try {
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
```

## Database Testing Patterns

### Test Database Setup
```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || 'postgresql://test:test@localhost:5432/test'
    }
  }
});

beforeAll(async () => {
  // Reset test database
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST }
  });
});

afterAll(async () => {
  await testDb.$disconnect();
});

export { testDb };
```

This comprehensive database integration guide covers setup, schema design, repository patterns, migrations, and testing for SvelteKit backend applications.