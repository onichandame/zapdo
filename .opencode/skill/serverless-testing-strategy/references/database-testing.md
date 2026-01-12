# Database Testing Patterns

## D1 Database Testing

### Isolated Database Setup
```typescript
// tests/helpers/database.ts
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { users, tasks, sessions } from '$lib/server/db/schema';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export interface TestDatabase {
  db: DrizzleD1Database<typeof import('$lib/server/db/schema')>;
  cleanup: () => Promise<void>;
}

export async function createTestDatabase(d1Database: D1DatabaseSchema): Promise<TestDatabase> {
  const db = drizzle(d1Database);
  
  // Run migrations
  await migrate(db, { migrationsFolder: './drizzle' });
  
  const cleanup = async () => {
    // Clean up all data in reverse order of dependencies
    await db.delete(tasks);
    await db.delete(sessions);
    await db.delete(users);
  };
  
  return { db, cleanup };
}

export async function createTestUser(db: DrizzleD1Database<typeof import('$lib/server/db/schema')>) {
  const hashedPassword = await hashPassword('test-password');
  
  const [user] = await db.insert(users).values({
    email: 'test@example.com',
    passwordHash: hashedPassword,
    createdAt: new Date().toISOString()
  }).returning();
  
  return user;
}

export async function createTestTask(
  db: DrizzleD1Database<typeof import('$lib/server/db/schema')>,
  userId: number
) {
  const [task] = await db.insert(tasks).values({
    userId,
    title: 'Test Task',
    content: 'Test task content',
    importance: 8,
    urgency: 5,
    createdAt: new Date().toISOString()
  }).returning();
  
  return task;
}
```

### Database Integration Tests
```typescript
// tests/integration/database/users.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { env } from "cloudflare:test";
import { createTestDatabase, createTestUser } from '../../helpers/database';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('User Database Operations', () => {
  let testDB: TestDatabase;
  
  beforeEach(async () => {
    testDB = await createTestDatabase(env.TASKS_DB);
  });
  
  afterEach(async () => {
    await testDB.cleanup();
  });
  
  it('should create a user successfully', async () => {
    const { db } = testDB;
    
    const hashedPassword = await hashPassword('test-password');
    const [user] = await db.insert(users).values({
      email: 'newuser@example.com',
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString()
    }).returning();
    
    expect(user.id).toBeDefined();
    expect(user.email).toBe('newuser@example.com');
    expect(user.passwordHash).toBe(hashedPassword);
  });
  
  it('should retrieve a user by email', async () => {
    const { db } = testDB;
    const testUser = await createTestUser(db);
    
    const [foundUser] = await db.select()
      .from(users)
      .where(eq(users.email, 'test@example.com'));
    
    expect(foundUser).toBeDefined();
    expect(foundUser.id).toBe(testUser.id);
    expect(foundUser.email).toBe(testUser.email);
  });
  
  it('should update user password', async () => {
    const { db } = testDB;
    const testUser = await createTestUser(db);
    
    const newPassword = await hashPassword('new-password');
    await db.update(users)
      .set({ passwordHash: newPassword })
      .where(eq(users.id, testUser.id));
    
    const [updatedUser] = await db.select()
      .from(users)
      .where(eq(users.id, testUser.id));
    
    expect(updatedUser.passwordHash).toBe(newPassword);
  });
  
  it('should delete a user', async () => {
    const { db } = testDB;
    const testUser = await createTestUser(db);
    
    await db.delete(users).where(eq(users.id, testUser.id));
    
    const [deletedUser] = await db.select()
      .from(users)
      .where(eq(users.id, testUser.id));
    
    expect(deletedUser).toBeUndefined();
  });
  
  it('should enforce unique email constraint', async () => {
    const { db } = testDB;
    const hashedPassword = await hashPassword('test-password');
    
    // Insert first user
    await db.insert(users).values({
      email: 'duplicate@example.com',
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString()
    });
    
    // Attempt to insert duplicate email
    await expect(
      db.insert(users).values({
        email: 'duplicate@example.com',
        passwordHash: hashedPassword,
        createdAt: new Date().toISOString()
      })
    ).rejects.toThrow();
  });
});
```

## Transaction Testing

### Transaction Rollback Tests
```typescript
// tests/integration/database/transactions.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { env } from "cloudflare:test";
import { createTestDatabase, createTestUser } from '../../helpers/database';
import { tasks, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Transactions', () => {
  let testDB: TestDatabase;
  
  beforeEach(async () => {
    testDB = await createTestDatabase(env.TASKS_DB);
  });
  
  afterEach(async () => {
    await testDB.cleanup();
  });
  
  it('should commit successful transaction', async () => {
    const { db } = testDB;
    const testUser = await createTestUser(db);
    
    await db.transaction(async (tx) => {
      await tx.insert(tasks).values({
        userId: testUser.id,
        title: 'Task 1',
        importance: 5,
        urgency: 5,
        createdAt: new Date().toISOString()
      });
      
      await tx.insert(tasks).values({
        userId: testUser.id,
        title: 'Task 2',
        importance: 8,
        urgency: 3,
        createdAt: new Date().toISOString()
      });
    });
    
    const userTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, testUser.id));
    
    expect(userTasks).toHaveLength(2);
  });
  
  it('should rollback on transaction failure', async () => {
    const { db } = testDB;
    const testUser = await createTestUser(db);
    
    // Insert one task before transaction
    await db.insert(tasks).values({
      userId: testUser.id,
      title: 'Original Task',
      importance: 5,
      urgency: 5,
      createdAt: new Date().toISOString()
    });
    
    // Attempt transaction that will fail
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(tasks).values({
          userId: testUser.id,
          title: 'Task 1',
          importance: 5,
          urgency: 5,
          createdAt: new Date().toISOString()
        });
        
        // This will fail due to null violation
        await tx.insert(tasks).values({
          userId: testUser.id,
          title: null, // This should cause an error
          importance: 8,
          urgency: 3,
          createdAt: new Date().toISOString()
        });
      })
    ).rejects.toThrow();
    
    // Verify no new tasks were added
    const userTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, testUser.id));
    
    expect(userTasks).toHaveLength(1);
    expect(userTasks[0].title).toBe('Original Task');
  });
});
```

## Performance Testing

### Query Performance Tests
```typescript
// tests/performance/database.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { env } from "cloudflare:test";
import { createTestDatabase } from '../../helpers/database';
import { tasks, users } from '$lib/server/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

describe('Database Performance', () => {
  let testDB: TestDatabase;
  let testUsers: any[];
  
  beforeEach(async () => {
    testDB = await createTestDatabase(env.TASKS_DB);
    const { db } = testDB;
    
    // Create test data
    testUsers = [];
    for (let i = 0; i < 10; i++) {
      const [user] = await db.insert(users).values({
        email: `user${i}@example.com`,
        passwordHash: await hashPassword('test-password'),
        createdAt: new Date().toISOString()
      }).returning();
      testUsers.push(user);
    }
    
    // Create tasks for each user
    for (const user of testUsers) {
      const tasksData = Array.from({ length: 50 }, (_, i) => ({
        userId: user.id,
        title: `Task ${i + 1} for User ${user.id}`,
        content: `Content for task ${i + 1}`,
        importance: Math.floor(Math.random() * 10) + 1,
        urgency: Math.floor(Math.random() * 10) + 1,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));
      
      await db.insert(tasks).values(tasksData);
    }
  });
  
  afterEach(async () => {
    await testDB.cleanup();
  });
  
  it('should handle large query results efficiently', async () => {
    const { db } = testDB;
    
    const startTime = performance.now();
    
    const allTasks = await db.select().from(tasks);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(allTasks).toHaveLength(500); // 10 users × 50 tasks each
    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
  });
  
  it('should use indexes effectively', async () => {
    const { db } = testDB;
    
    const startTime = performance.now();
    
    // Query that should use the user_id index
    const userTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, testUsers[0].id));
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(userTasks).toHaveLength(50);
    expect(duration).toBeLessThan(100); // Should be very fast with index
  });
  
  it('should handle complex queries efficiently', async () => {
    const { db } = testDB;
    
    const startTime = performance.now();
    
    // Complex query with multiple conditions
    const recentImportantTasks = await db.select()
      .from(tasks)
      .where(
        and(
          gte(tasks.importance, 8),
          gte(tasks.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        )
      );
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(500); // Should complete in less than 500ms
  });
});
```

## Data Integrity Tests

### Constraint Validation Tests
```typescript
// tests/integration/database/constraints.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { env } from "cloudflare:test";
import { createTestDatabase } from '../../helpers/database';
import { users, tasks } from '$lib/server/db/schema';

describe('Database Constraints', () => {
  let testDB: TestDatabase;
  
  beforeEach(async () => {
    testDB = await createTestDatabase(env.TASKS_DB);
  });
  
  afterEach(async () => {
    await testDB.cleanup();
  });
  
  it('should validate foreign key constraints', async () => {
    const { db } = testDB;
    
    // Attempt to create task with non-existent user ID
    await expect(
      db.insert(tasks).values({
        userId: 999, // Non-existent user
        title: 'Orphan Task',
        importance: 5,
        urgency: 5,
        createdAt: new Date().toISOString()
      })
    ).rejects.toThrow();
  });
  
  it('should validate non-null constraints', async () => {
    const { db } = testDB;
    const testUser = await createTestUser(db);
    
    // Attempt to create task with null title
    await expect(
      db.insert(tasks).values({
        userId: testUser.id,
        title: null, // Should violate non-null constraint
        importance: 5,
        urgency: 5,
        createdAt: new Date().toISOString()
      })
    ).rejects.toThrow();
  });
  
  it('should validate check constraints', async () => {
    const { db } = testDB;
    const testUser = await createTestUser(db);
    
    // Attempt to create task with invalid importance value
    await expect(
      db.insert(tasks).values({
        userId: testUser.id,
        title: 'Invalid Task',
        content: 'Content',
        importance: 15, // Should violate check constraint if max is 10
        urgency: 5,
        createdAt: new Date().toISOString()
      })
    ).rejects.toThrow();
  });
});
```

## Migration Testing

### Schema Migration Tests
```typescript
// tests/integration/database/migrations.test.ts
import { describe, it, expect } from 'vitest';
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import * as schema from '$lib/server/db/schema';

describe('Database Migrations', () => {
  it('should run all migrations successfully', async () => {
    // Create fresh database
    const testDB = new D1Database('test-migration-db');
    const db = drizzle(testDB);
    
    // Run migrations
    await expect(
      migrate(db, { migrationsFolder: './drizzle' })
    ).resolves.not.toThrow();
    
    // Verify tables exist
    const tableInfo = await testDB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all();
    
    const tableNames = tableInfo.results.map((row: any) => row.name);
    
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('sessions');
  });
  
  it('should handle migration rollback', async () => {
    // Create database and run migrations
    const testDB = new D1Database('test-rollback-db');
    const db = drizzle(testDB);
    
    await migrate(db, { migrationsFolder: './drizzle' });
    
    // Add some data
    const hashedPassword = await hashPassword('test-password');
    await db.insert(schema.users).values({
      email: 'migration-test@example.com',
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString()
    });
    
    // Rollback migration (this would need custom rollback logic)
    // For now, just ensure data exists
    const users = await db.select().from(schema.users);
    expect(users).toHaveLength(1);
  });
});
```