# Common Issues and Solutions

## Dev Server Connection Issues

### Problem: Tests fail with connection refused errors
**Cause:** Dev server not running when tests execute

**Solution:**
```typescript
// tests/helpers/server-check.ts
export async function checkServersRunning() {
  const servers = [
    { name: 'Frontend', url: 'http://localhost:5173' },
    { name: 'API', url: 'http://localhost:8787' }
  ];
  
  for (const server of servers) {
    try {
      const response = await fetch(`${server.url}/health`, { 
        signal: AbortSignal.timeout(5000) 
      });
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        `\n\n❌ ${server.name} server not available at ${server.url}\n` +
        `Please start the dev server:\n` +
        `  npm run dev (for ${server.name})\n\n` +
        `Current error: ${error.message}\n`
      );
    }
  }
}

// Use in test setup
beforeAll(async () => {
  await checkServersRunning();
});
```

### Problem: Port conflicts during testing
**Cause:** Multiple processes trying to use the same port

**Solution:**
```bash
# Find what's using the port
lsof -ti:5173 | xargs kill -9

# Or use different ports for testing
VITE_TEST_PORT=5174 npm run test:e2e
```

## Database Testing Issues

### Problem: Tests interfere with each other's data
**Cause:** Insufficient test isolation

**Solution:**
```typescript
// tests/helpers/database-isolation.ts
export class DatabaseIsolation {
  private cleanupTasks: Array<() => Promise<void>> = [];
  
  async isolateDatabase(db: D1Database) {
    const testName = expect.getState().testPath || 'unknown';
    const isolationKey = `test-${testName}-${Date.now()}`;
    
    // Create isolated schema if needed
    await db.exec(`
      CREATE TEMPORARY TABLE IF NOT EXISTS tasks_${isolationKey} AS SELECT * FROM tasks WHERE 1=0;
    `);
    
    // Add cleanup task
    this.cleanupTasks.push(async () => {
      await db.exec(`DROP TABLE IF EXISTS tasks_${isolationKey};`);
    });
  }
  
  async cleanup() {
    await Promise.all(this.cleanupTasks.map(task => task()));
    this.cleanupTasks = [];
  }
}
```

### Problem: Migration inconsistencies between test runs
**Cause:** Database state not properly reset

**Solution:**
```typescript
// tests/setup/ensure-database-state.ts
export async function ensureTestDatabaseState(d1Database: D1Database) {
  try {
    // Drop all tables
    const tables = await d1Database.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all();
    
    for (const table of tables.results) {
      await d1Database.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
    }
    
    // Run all migrations
    const db = drizzle(d1Database);
    await migrate(db, { migrationsFolder: './drizzle' });
  } catch (error) {
    console.error('Failed to ensure database state:', error);
    throw error;
  }
}
```

## Mock and Fixture Issues

### Problem: Mocks not being applied correctly
**Cause:** Mock setup order or timing issues

**Solution:**
```typescript
// tests/setup/mock-order.ts
import { vi } from 'vitest';

// Setup mocks in the correct order
export function setupMocksInOrder() {
  // 1. Clear all existing mocks first
  vi.clearAllMocks();
  
  // 2. Setup global mocks before test imports
  global.fetch = vi.fn();
  global.crypto = {
    ...global.crypto,
    getRandomValues: vi.fn()
  };
  
  // 3. Mock modules that will be imported
  vi.mock('$lib/server/external-api', () => ({
    apiService: {
      getUser: vi.fn(),
      createNotification: vi.fn()
    }
  }));
  
  // 4. Return cleanup function
  return () => {
    vi.restoreAllMocks();
  };
}

// Use in setup files
const cleanupMock = setupMocksInOrder();

afterAll(() => {
  cleanupMock();
});
```

### Problem: Fixture data becoming stale
**Cause:** Test data not refreshed between runs

**Solution:**
```typescript
// tests/fixtures/fresh-fixtures.ts
export class FixtureManager {
  private static fixtures: Map<string, any> = new Map();
  
  static getFixture<T>(key: string, factory: () => T): T {
    const cacheKey = `${key}-${process.pid}-${Date.now()}`;
    
    if (!this.fixtures.has(cacheKey)) {
      this.fixtures.set(cacheKey, factory());
    }
    
    return this.fixtures.get(cacheKey);
  }
  
  static clearFixtures() {
    this.fixtures.clear();
  }
}

// Usage
const freshUser = FixtureManager.getFixture('user', () => ({
  email: `user-${Date.now()}@example.com`,
  password: 'test-password'
}));
```

## Performance and Timeout Issues

### Problem: Tests timing out in CI
**Cause:** Slower execution in CI environment

**Solution:**
```typescript
// tests/helpers/timeouts.ts
export function getTestTimeout(baseTimeout: number): number {
  // Triple timeout in CI
  const ciMultiplier = process.env.CI ? 3 : 1;
  return baseTimeout * ciMultiplier;
}

// Update test timeouts based on environment
beforeAll(() => {
  // Increase timeout for database operations
  vi.setConfig({
    testTimeout: getTestTimeout(10000),
    hookTimeout: getTestTimeout(10000)
  });
});
```

### Problem: Memory leaks during test runs
**Cause:** Unclosed connections or event listeners

**Solution:**
```typescript
// tests/helpers/memory-cleanup.ts
export class MemoryCleanup {
  private resources: Array<() => Promise<void> | void> = [];
  
  addCleanup(resource: () => Promise<void> | void) {
    this.resources.push(resource);
  }
  
  async cleanup() {
    await Promise.all(
      this.resources.map(async (resource) => {
        try {
          await resource();
        } catch (error) {
          console.warn('Cleanup error:', error);
        }
      })
    );
    this.resources = [];
  }
}

// Usage
const cleanup = new MemoryCleanup();

beforeEach(() => {
  cleanup.addCleanup(() => {
    // Close database connections
    if (global.testDB) {
      global.testDB.close();
    }
  });
});

afterEach(async () => {
  await cleanup.cleanup();
});
```

## Environment and Configuration Issues

### Problem: Environment variables not available in tests
**Cause:** Test environment not properly configured

**Solution:**
```typescript
// tests/setup/test-environment.ts
import { config } from 'dotenv';

// Load test-specific environment
config({ path: '.env.test' });

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET', 
  'CRYPTO_SECRET',
  'API_BASE_URL'
];

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`
      ❌ Required environment variable ${envVar} is not set
      
      Please create a .env.test file with:
      ${requiredEnvVars.map(v => `${v}=your-test-value`).join('\n')}
      
      Or set them in your CI configuration.
    `);
  }
}

// Export validated environment
export const testEnv = {
  JWT_SECRET: import.meta.env.JWT_SECRET!,
  CRYPTO_SECRET: import.meta.env.CRYPTO_SECRET!,
  API_BASE_URL: import.meta.env.API_BASE_URL!,
  IS_TEST: true
};
```

### Problem: Path resolution issues in tests
**Cause:** Different working directories in different test environments

**Solution:**
```typescript
// tests/helpers/paths.ts
import path from 'path';

export const paths = {
  // Resolve paths relative to project root
  projectRoot: path.resolve(__dirname, '../../..'),
  testFixtures: path.resolve(__dirname, '../fixtures'),
  testMigrations: path.resolve(__dirname, '../migrations'),
  testOutput: path.resolve(__dirname, '../../test-output')
};

// Helper to create test directories
export async function ensureTestDirectories() {
  const fs = await import('fs/promises');
  
  try {
    await fs.mkdir(paths.testOutput, { recursive: true });
    await fs.mkdir(path.join(paths.testOutput, 'coverage'), { recursive: true });
    await fs.mkdir(path.join(paths.testOutput, 'reports'), { recursive: true });
  } catch (error) {
    console.warn('Failed to create test directories:', error);
  }
}
```

## Debugging Test Failures

### Problem: No clear error messages from test failures
**Cause:** Insufficient logging and error context

**Solution:**
```typescript
// tests/helpers/debugging.ts
export class TestDebugger {
  static logTestContext() {
    const testInfo = expect.getState();
    console.log(`
🧪 Test: ${testInfo.currentTestName}
📁 File: ${testInfo.testPath}
🔢 Line: ${testInfo.currentTestPath?.split(':').pop()}
🌍 Environment: ${import.meta.env.MODE}
📊 PID: ${process.pid}
    `);
  }
  
  static async logRequestDetails(response: Response) {
    console.log(`
📡 Response Details:
  Status: ${response.status} ${response.statusText}
  Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}
  URL: ${response.url}
    `);
    
    if (response.status >= 400) {
      try {
        const body = await response.text();
        console.log('📄 Response Body:', body);
      } catch (error) {
        console.log('📄 Response Body: [Unable to read]');
      }
    }
  }
  
  static async logDatabaseState(db: D1Database) {
    try {
      const tables = await db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();
      
      console.log('🗄️ Database Tables:', tables.results.map(r => r.name));
      
      for (const table of tables.results) {
        const count = await db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).first();
        console.log(`  ${table.name}: ${count?.count || 0} rows`);
      }
    } catch (error) {
      console.log('🗄️ Database State: [Unable to query]');
    }
  }
}

// Use in failing tests
it('should do something important', async () => {
  TestDebugger.logTestContext();
  
  try {
    // Test code here
    const result = await someOperation();
    expect(result).toBe(expected);
  } catch (error) {
    await TestDebugger.logRequestDetails(response);
    await TestDebugger.logDatabaseState(db);
    throw error;
  }
});
```

## CI/CD Integration Issues

### Problem: Tests fail in CI but work locally
**Cause:** Different environments or configurations

**Solution:**
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      # Add required services
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test environment
        run: |
          echo "JWT_SECRET=test-jwt-secret-for-ci-only" >> .env.test
          echo "CRYPTO_SECRET=test-crypto-secret-32-chars-ci" >> .env.test
      
      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:8787/health; do sleep 2; done'
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Problem: Flaky tests in CI
**Cause:** Race conditions or timing issues

**Solution:**
```typescript
// tests/helpers/retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw new Error('All retry attempts failed');
}

// Usage in tests that might be flaky
it('should handle eventual consistency', async () => {
  const result = await withRetry(async () => {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error('Request failed');
    }
    const data = await response.json();
    if (!data.ready) {
      throw new Error('Data not ready yet');
    }
    return data;
  });
  
  expect(result).toBeDefined();
});
```