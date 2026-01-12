# Vitest Configuration for Cloudflare Workers

## Basic Configuration

### vitest.config.ts
```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { 
          configPath: "./wrangler.toml",
          compatMode: "nodejs_compat"
        },
        isolatedStorage: true,
        miniflare: {
          compatibilityFlags: ["nodejs_compat"],
          bindings: {
            // Test-specific bindings
            TEST_SECRET: "test-secret-value",
            TEST_VAR: "test-var-value"
          }
        }
      },
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**'
      ]
    },
    environment: 'miniflare',
    setupFiles: ['./tests/setup.ts']
  },
});
```

### Advanced Configuration with Multiple Environments

### vitest.config.ts (Advanced)
```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import path from 'path';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { 
          configPath: "./wrangler.toml",
          Environment: undefined // Use default
        },
        isolatedStorage: true,
        miniflare: {
          d1Databases: {
            DB: path.resolve(__dirname, 'tests/fixtures/test.db')
          },
          kvNamespaces: {
            CACHE: path.resolve(__dirname, 'tests/fixtures/cache'),
            SESSIONS: path.resolve(__dirname, 'tests/fixtures/sessions')
          },
          r2Buckets: {
            FILES: path.resolve(__dirname, 'tests/fixtures/files')
          },
          bindings: {
            CRYPTO_SECRET: 'test-crypto-secret-32-chars-long',
            JWT_SECRET: 'test-jwt-secret-for-testing-only',
            API_BASE_URL: 'http://localhost:8787'
          }
        }
      },
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Per-file thresholds for critical modules
        './src/lib/server/auth.ts': {
          branches: 90,
          functions: 90,
          lines: 95,
          statements: 95
        }
      },
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        'src/**/*.stories.*'
      ],
      watermarks: {
        statements: [80, 95],
        functions: [80, 95],
        branches: [80, 95],
        lines: [80, 95]
      }
    },
    environment: 'miniflare',
    setupFiles: ['./tests/setup.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['node_modules/', 'dist/', '**/*.e2e.test.?(c|m)[jt]s?(x)'],
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: false, // Share context between tests in same file
    threads: true,
    watch: {
      ignore: ['node_modules', 'dist', 'coverage']
    }
  },
  resolve: {
    alias: {
      '$lib': path.resolve(__dirname, './src/lib'),
      '$test': path.resolve(__dirname, './tests')
    }
  }
});
```

## Setup Files

### tests/setup.ts
```typescript
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { env } from "cloudflare:test";

// Global test setup
beforeAll(async () => {
  // Initialize test database
  if (env.TASKS_DB) {
    await env.TASKS_DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    await env.TASKS_DB.prepare(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        importance INTEGER DEFAULT 5,
        urgency INTEGER DEFAULT 5,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `).run();
  }
});

beforeEach(async () => {
  // Clean up test data before each test
  if (env.TASKS_DB) {
    await env.TASKS_DB.prepare('DELETE FROM tasks').run();
    await env.TASKS_DB.prepare('DELETE FROM users').run();
  }
  
  // Clear KV namespaces
  if (env.CACHE) {
    const list = await env.CACHE.list();
    for (const key of list.keys) {
      await env.CACHE.delete(key.name);
    }
  }
  
  if (env.SESSIONS) {
    const list = await env.SESSIONS.list();
    for (const key of list.keys) {
      await env.SESSIONS.delete(key.name);
    }
  }
});

afterEach(() => {
  // Cleanup after each test
  vitest.clearAllMocks();
});

afterAll(() => {
  // Global cleanup
});
```

### tests/global-setup.ts
```typescript
import type { GlobalSetupContext } from 'vitest';

export async function setup({ provide }: GlobalSetupContext) {
  // Setup global test environment
  console.log('Setting up test environment...');
  
  // Example: Start external services if needed
  // await startTestDatabase();
  
  // Provide global utilities
  provide('testUtils', {
    generateTestUser: () => ({
      email: 'test@example.com',
      password: 'test-password'
    }),
    
    generateTestTask: () => ({
      title: 'Test Task',
      content: 'Test task content',
      importance: 8,
      urgency: 5
    })
  });
}

export async function teardown() {
  // Cleanup global test environment
  console.log('Tearing down test environment...');
  
  // Example: Stop external services
  // await stopTestDatabase();
}
```

## Environment-Specific Configurations

### vitest.unit.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/*.integration.test.?(c|m)[jt]s?(x)', '**/*.e2e.test.?(c|m)[jt]s?(x)'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json'],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    }
  },
  resolve: {
    alias: {
      '$lib': path.resolve(__dirname, './src/lib'),
      '$test': path.resolve(__dirname, './tests')
    }
  }
});
```

### vitest.integration.config.ts
```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import path from 'path';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        isolatedStorage: true,
      },
    },
    include: ['tests/integration/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['tests/unit/**/*', 'tests/e2e/**/*'],
    environment: 'miniflare',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json'],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        }
      }
    }
  },
  resolve: {
    alias: {
      '$lib': path.resolve(__dirname, './src/lib'),
      '$test': path.resolve(__dirname, './tests')
    }
  }
});
```

## Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:ci": "vitest run --coverage --reporter=verbose"
  }
}
```

## Common Configuration Patterns

### Testing Specific Bindings
```typescript
// In vitest.config.ts
poolOptions: {
  workers: {
    miniflare: {
      bindings: {
        // Override production bindings for testing
        JWT_SECRET: 'test-jwt-secret',
        CRYPTO_KEY: 'test-crypto-key-32-chars-long',
        API_VERSION: 'test-v1',
        DEBUG: 'true'
      }
    }
  }
}
```

### Custom Test Environment
```typescript
// tests/environment.ts
import { defineWorkersEnvironment } from "@cloudflare/vitest-pool-workers/environment";

export default defineWorkersEnvironment({
  async setup(options) {
    // Custom environment setup
    return {
      // Custom utilities available in tests
      testDB: await createTestDatabase(),
      mockExternalAPI: createMockAPI()
    };
  },
  
  async teardown(env) {
    // Custom environment cleanup
    await env.testDB.close();
  }
});
```

### Selective Test Execution
```bash
# Run only unit tests
npm run test:unit

# Run only integration tests  
npm run test:integration

# Run tests matching pattern
npm test -- --grep "authentication"

# Run tests in specific file
npm test tests/unit/auth.test.ts

# Run tests with coverage for specific file
npm run test:coverage -- tests/unit/auth.test.ts
```