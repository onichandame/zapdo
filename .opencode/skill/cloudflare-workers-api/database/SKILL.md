---
name: cloudflare-workers-database
description: D1 database operations with Drizzle ORM, schema management, advanced querying, pagination, and transaction patterns for Cloudflare Workers.
license: MIT
scope: project
---

# Cloudflare Workers - D1 Database Operations

## When to use this skill
When implementing data persistence and complex database operations in Cloudflare Workers applications using D1 SQLite database with Drizzle ORM.

## Schema Management with Drizzle

### Database Schema Definition
```typescript
// src/lib/server/db/schema.ts
import { 
  sqliteTable, 
  text, 
  integer, 
  index,  
  uniqueIndex
} from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('idx_users_email').on(table.email),
  createdIdx: index('idx_users_created').on(table.createdAt),
}));

// Encryption keys for zero-knowledge architecture
export const encryptionKeys = sqliteTable('encryption_keys', {
  userId: integer('user_id').primaryKey({ autoIncrement: true })
    .references(() => users.id, { onDelete: 'cascade' }),
  encryptedDek: text('encrypted_dek').notNull(),
  salt: text('salt').notNull(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  algorithm: text('algorithm').default('RSA-OAEP'),
  keySize: integer('key_size').default(2048),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  userIdx: uniqueIndex('idx_encryption_user').on(table.userId),
}));

// Tasks/projects table using Eisenhower Matrix
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  importance: integer('importance').notNull(), // 1-10 scale
  urgency: integer('urgency').notNull(), // 1-10 scale
  hasContent: integer('has_content', { mode: 'boolean' }).default(true),
  filePath: text('file_path'),
  fileSize: integer('file_size'), // in bytes
  mimeType: text('mime_type'),
  status: text('status').default('active'), // active, completed, archived
  tags: text('tags'), // JSON array
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  userIdx: index('idx_tasks_user').on(table.userId),
  quadrantIdx: index('idx_tasks_quadrant').on(table.importance, table.urgency),
  userQuadrantIdx: index('idx_tasks_user_quadrant').on(
    table.userId, 
    table.importance, 
    table.urgency
  ),
  statusIdx: index('idx_tasks_status').on(table.status),
  danglingIdx: index('idx_tasks_dangling').on(table.userId, table.hasContent)
    .where(sql`has_content = 0`),
  updatedAtIdx: index('idx_tasks_updated').on(table.updatedAt),
}));

// Activity logs for audit trail
export const activityLogs = sqliteTable('activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  action: text('action').notNull(), // create, update, delete, login, etc.
  resourceType: text('resource_type').notNull(), // user, task, file
  resourceId: integer('resource_id'),
  oldValues: text('old_values'), // JSON object
  newValues: text('new_values'), // JSON object
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_activity_user').on(table.userId),
  actionIdx: index('idx_activity_action').on(table.action),
  sessionIdIdx: index('idx_activity_session').on(table.sessionId),
  createdAtIdx: index('idx_activity_created').on(table.createdAt),
}));

// Sessions for additional session data beyond KV
export const sessionData = sqliteTable('session_data', {
  sessionId: text('session_id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  deviceFingerprint: text('device_fingerprint'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  lastActivity: text('last_activity').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_session_user').on(table.userId),
  fingerprintIdx: index('idx_session_fingerprint').on(table.deviceFingerprint),
  activeIdx: index('idx_session_active').on(table.isActive),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
```

### Database Client Setup
```typescript
// src/lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/d1-sqlite';
import type { DrizzleD1Database } from 'drizzle-orm/d1-sqlite';
import * as schema from './schema';

export type DB = DrizzleD1Database<typeof schema>;
export type { User, Task, ActivityLog } from './schema';

export function createDB(d1: D1Database): DB {
  return drizzle(d1, { 
    schema,
    logger: process.env.NODE_ENV === 'development' ? true : false
  });
}

// Re-export all schema exports for convenience
export * from './schema';
export { eq, and, or, desc, asc, sql, isNull, isNotNull, like, ilike } from 'drizzle-orm';
```

## Pagination and Query Utilities

### Advanced Pagination Helper
```typescript
// src/lib/server/db/pagination.ts
import type { DB } from './index';
import { sql } from 'drizzle-orm';

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  orderBy?: 'asc' | 'desc';
  orderByField?: string;
}

export interface PaginationResult<T> {
  items: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasMore: boolean;
  hasPrev: boolean;
  totalCount?: number;
}

export async function paginate<T>(
  baseQuery: any,
  options: PaginationOptions = {}
): Promise<PaginationResult<T>> {
  const {
    limit = 20,
    cursor,
    orderBy = 'desc',
    orderByField = 'created_at'
  } = options;
  
  const effectiveLimit = Math.min(limit + 1, 101); // Get one extra to check if more exists
  
  // Apply cursor-based pagination
  if (cursor) {
    const cursorValue = parseCursor(cursor);
    if (orderBy === 'desc') {
      baseQuery = baseQuery.where(
        sql`${sql.raw(orderByField)} < ${cursorValue}`
      );
    } else {
      baseQuery = baseQuery.where(
        sql`${sql.raw(orderByField)} > ${cursorValue}`
      );
    }
  }
  
  // Apply ordering and limit
  const orderField = sql.raw(`${orderByField} ${orderBy.toUpperCase()}`);
  const query = baseQuery.orderBy(orderField).limit(effectiveLimit);
  
  const results = await query;
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  
  return {
    items,
    hasMore,
    hasPrev: !!cursor,
    nextCursor: hasMore && items.length > 0 
      ? createCursor(items[items.length - 1], orderByField)
      : undefined,
    prevCursor: cursor
  };
}

function parseCursor(cursor: string): string | number {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString();
    const [field, value] = decoded.split(':');
    return isNaN(Number(value)) ? value : Number(value);
  } catch {
    throw new Error('Invalid cursor format');
  }
}

function createCursor(item: any, field: string): string {
  const value = item[field];
  const cursorData = `${field}:${value}`;
  return Buffer.from(cursorData).toString('base64url');
}

// Offset-based pagination for simpler cases
export async function paginateByOffset<T>(
  baseQuery: any,
  page: number = 1,
  limit: number = 20
): Promise<PaginationResult<T>> {
  const offset = (page - 1) * limit;
  
  const [items, totalCount] = await Promise.all([
    baseQuery.limit(limit).offset(offset),
    baseQuery.count().get()
  ]);
  
  const total = totalCount ? totalCount.count : 0;
  const totalPages = Math.ceil(total / limit);
  
  return {
    items,
    hasMore: page < totalPages,
    hasPrev: page > 1,
    totalCount: total,
    nextCursor: page < totalPages ? (page + 1).toString() : undefined,
    prevCursor: page > 1 ? (page - 1).toString() : undefined
  };
}
```

### Advanced Query Builders
```typescript
// src/lib/server/db/queries.ts
import type { DB } from './index';
import { eq, and, or, desc, asc, sql, like, between, inArray } from 'drizzle-orm';
import { users, tasks, activityLogs } from './schema';
import { paginate, type PaginationResult } from './pagination';

export class TaskQueries {
  constructor(private db: DB) {}
  
  // Get tasks with sophisticated filtering
  async getUserTasks(
    userId: number,
    filters: {
      importanceMin?: number;
      importanceMax?: number;
      urgencyMin?: number;
      urgencyMax?: number;
      status?: string[];
      tags?: string[];
      hasContent?: boolean;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
    pagination: {
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PaginationResult<typeof tasks.$inferSelect>> {
    let query = this.db.select().from(tasks).where(eq(tasks.userId, userId));
    
    // Apply filters
    const conditions = [];
    
    if (filters.importanceMin !== undefined || filters.importanceMax !== undefined) {
      if (filters.importanceMin !== undefined && filters.importanceMax !== undefined) {
        conditions.push(between(tasks.importance, filters.importanceMin, filters.importanceMax));
      } else if (filters.importanceMin !== undefined) {
        conditions.push(sql`importance >= ${filters.importanceMin}`);
      } else {
        conditions.push(sql`importance <= ${filters.importanceMax}`);
      }
    }
    
    if (filters.urgencyMin !== undefined || filters.urgencyMax !== undefined) {
      if (filters.urgencyMin !== undefined && filters.urgencyMax !== undefined) {
        conditions.push(between(tasks.urgency, filters.urgencyMin, filters.urgencyMax));
      } else if (filters.urgencyMin !== undefined) {
        conditions.push(sql`urgency >= ${filters.urgencyMin}`);
      } else {
        conditions.push(sql`urgency <= ${filters.urgencyMax}`);
      }
    }
    
    if (filters.status?.length) {
      conditions.push(inArray(tasks.status, filters.status));
    }
    
    if (filters.hasContent !== undefined) {
      conditions.push(eq(tasks.hasContent, filters.hasContent ? 1 : 0));
    }
    
    if (filters.search) {
      conditions.push(or(
        like(tasks.title, `%${filters.search}%`),
        like(tasks.description, `%${filters.search}%`)
      ));
    }
    
    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom && filters.dateTo) {
        conditions.push(between(tasks.createdAt, filters.dateFrom, filters.dateTo));
      } else if (filters.dateFrom) {
        conditions.push(sql`created_at >= ${filters.dateFrom}`);
      } else {
        conditions.push(sql`created_at <= ${filters.dateTo}`);
      }
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Order by update time for recency
    query = query.orderBy(desc(tasks.updatedAt));
    
    return paginate(query, pagination);
  }
  
  // Get Eisenhower Matrix quadrants
  async getTasksByQuadrant(
    userId: number
  ): Promise<Record<string, typeof tasks.$inferSelect[]>> {
    const quadrants = {
      urgent_important: [], // Q1: Do First
      not_urgent_important: [], // Q2: Schedule
      urgent_not_important: [], // Q3: Delegate
      not_urgent_not_important: [] // Q4: Delete
    };
    
    const allTasks = await this.db.select()
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'active')
      ))
      .orderBy(desc(tasks.importance), desc(tasks.urgency));
    
    for (const task of allTasks) {
      const importance = task.importance;
      const urgency = task.urgency;
      const importanceThreshold = 5; // Midpoint
      const urgencyThreshold = 5;
      
      if (urgency >= urgencyThreshold && importance >= importanceThreshold) {
        quadrants.urgent_important.push(task);
      } else if (urgency < urgencyThreshold && importance >= importanceThreshold) {
        quadrants.not_urgent_important.push(task);
      } else if (urgency >= urgencyThreshold && importance < importanceThreshold) {
        quadrants.urgent_not_important.push(task);
      } else {
        quadrants.not_urgent_not_important.push(task);
      }
    }
    
    return quadrants;
  }
  
  // Task analytics
  async getTaskAnalytics(userId: number): Promise<{
    total: number;
    completed: number;
    byQuadrant: Record<string, number>;
    avgImportance: number;
    avgUrgency: number;
    completionRate: number;
  }> {
    const analytics = await this.db.select({
      total: sql<number>`count(*)`,
      completed: sql<number>`count(case when status = 'completed' then 1 end)`,
      avgImportance: sql<number>`avg(importance)`,
      avgUrgency: sql<number>`avg(urgency)`
    })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .get();
    
    const quadrants = await this.getTasksByQuadrant(userId);
    
    return {
      total: analytics?.total || 0,
      completed: analytics?.completed || 0,
      byQuadrant: {
        urgent_important: quadrants.urgent_important.length,
        not_urgent_important: quadrants.not_urgent_important.length,
        urgent_not_important: quadrants.urgent_not_important.length,
        not_urgent_not_important: quadrants.not_urgent_not_important.length
      },
      avgImportance: Math.round((analytics?.avgImportance || 0) * 10) / 10,
      avgUrgency: Math.round((analytics?.avgUrgency || 0) * 10) / 10,
      completionRate: Math.round(
        ((analytics?.completed || 0) / (analytics?.total || 1)) * 100
      )
    };
  }
}

export class UserQueries {
  constructor(private db: DB) {}
  
  async findByEmail(email: string): Promise<User | undefined> {
    return this.db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)
      .then(results => results[0]);
  }
  
  async updateLastLogin(userId: number): Promise<void> {
    await this.db.update(users)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId));
  }
  
  async getUserWithEncryptionKeys(userId: number): Promise<{
    user: User;
    encryptionKeys?: typeof encryptionKeys.$inferSelect;
  } | undefined> {
    const result = await this.db.select({
      user: users,
      encryptionKeys
    })
    .from(users)
    .leftJoin(encryptionKeys, eq(users.id, encryptionKeys.userId))
    .where(eq(users.id, userId))
    .limit(1);
    
    return result[0];
  }
}

// Activity logging service
export class ActivityService {
  constructor(private db: DB) {}
  
  async logActivity(activity: {
    userId: number;
    action: string;
    resourceType: string;
    resourceId?: number;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    const activityData: NewActivityLog = {
      userId: activity.userId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      oldValues: activity.oldValues ? JSON.stringify(activity.oldValues) : null,
      newValues: activity.newValues ? JSON.stringify(activity.newValues) : null,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      sessionId: activity.sessionId,
      createdAt: new Date().toISOString()
    };
    
    await this.db.insert(activityLogs).values(activityData);
  }
  
  async getUserActivity(
    userId: number,
    options: {
      limit?: number;
      cursor?: string;
      actions?: string[];
      resourceTypes?: string[];
    } = {}
  ): Promise<PaginationResult<ActivityLog>> {
    let query = this.db.select().from(activityLogs).where(eq(activityLogs.userId, userId));
    
    const conditions = [];
    
    if (options.actions?.length) {
      conditions.push(inArray(activityLogs.action, options.actions));
    }
    
    if (options.resourceTypes?.length) {
      conditions.push(inArray(activityLogs.resourceType, options.resourceTypes));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(activityLogs.createdAt));
    
    return paginate(query, options);
  }
}
```

## Transaction Patterns

### Safe Transaction Helper
```typescript
// src/lib/server/db/transactions.ts
import type { DB } from './index';

export class TransactionManager {
  constructor(private db: DB) {}
  
  async withTransaction<T>(
    callback: (tx: DB) => Promise<T>
  ): Promise<T> {
    try {
      const result = await callback(this.db);
      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }
  
  // Create task with initial activity log
  async createTaskWithActivity(
    userId: number,
    taskData: NewTask,
    activityContext: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<Task> {
    return this.withTransaction(async (tx) => {
      const now = new Date().toISOString();
      
      // Insert task
      const task = await tx.insert(tasks).values({
        ...taskData,
        createdAt: now,
        updatedAt: now
      }).returning();
      
      // Log activity
      await tx.insert(activityLogs).values({
        userId,
        action: 'create',
        resourceType: 'task',
        resourceId: task[0].id,
        newValues: JSON.stringify(task[0]),
        ipAddress: activityContext.ipAddress,
        userAgent: activityContext.userAgent,
        sessionId: activityContext.sessionId,
        createdAt: now
      });
      
      return task[0];
    });
  }
  
  // Batch operations
  async batchUpdateTaskStatus(
    taskIds: number[],
    newStatus: string,
    userId: number
  ): Promise<number> {
    return this.withTransaction(async (tx) => {
      const now = new Date().toISOString();
      
      // Get old values for logging
      const oldTasks = await tx.select()
        .from(tasks)
        .where(and(
          inArray(tasks.id, taskIds),
          eq(tasks.userId, userId)
        ));
      
      // Update tasks
      const updateResult = await tx.update(tasks)
        .set({ 
          status: newStatus,
          updatedAt: now,
          completedAt: newStatus === 'completed' ? now : null
        })
        .where(and(
          inArray(tasks.id, taskIds),
          eq(tasks.userId, userId)
        ));
      
      // Log activities
      for (const task of oldTasks) {
        await tx.insert(activityLogs).values({
          userId,
          action: 'update',
          resourceType: 'task',
          resourceId: task.id,
          oldValues: JSON.stringify({ status: task.status }),
          newValues: JSON.stringify({ status: newStatus }),
          createdAt: now
        });
      }
      
      return taskIds.length;
    });
  }
}
```

## Migration Management

### Drizzle Migration Setup
```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'TASKS_DB'
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Migration Scripts
```typescript
// scripts/migrate.ts
import { migrate } from 'drizzle-orm/d1-sqlite/migrator';
import { createDB } from '$lib/server/db';

export async function runMigrations(d1: D1Database): Promise<void> {
  const db = createDB(d1);
  
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
```

## Next Steps
- Add [R2 Storage](../storage/) for file operations with tasks
- Implement [Error Handling](../error-handling/) for database errors
- Set up [Performance & Testing](../performance/) for database optimization

## Related Skills
- [Core Architecture](../architecture/) - Database configuration
- [Authentication & Security](../authentication/) - User data models
- [Error Handling](../error-handling/) - Transaction error patterns
- [Performance & Testing](../performance/) - Database optimization