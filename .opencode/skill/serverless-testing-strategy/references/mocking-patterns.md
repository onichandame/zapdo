# Mocking Strategies for Serverless Testing

## External Service Mocking

### API Service Mocks
```typescript
// tests/mocks/api-service.ts
import { vi } from 'vitest';

// Mock external API service
export const mockAPIService = {
  getUser: vi.fn().mockImplementation((id: string) => {
    return Promise.resolve({
      id,
      email: `user${id}@example.com`,
      name: `User ${id}`,
      createdAt: new Date().toISOString()
    });
  }),
  
  createNotification: vi.fn().mockResolvedValue({
    id: 'notif-123',
    status: 'sent',
    timestamp: new Date().toISOString()
  }),
  
  sendEmail: vi.fn().mockResolvedValue({
    messageId: 'msg-456',
    status: 'delivered'
  }),
  
  // Mock error scenarios
  getUserError: vi.fn().mockRejectedValue(new Error('User not found')),
  serviceUnavailable: vi.fn().mockRejectedValue(new Error('Service unavailable'))
};

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Cloudflare Service Mocks
```typescript
// tests/mocks/cloudflare-services.ts
import { vi } from 'vitest';

// Mock R2 operations
export const mockR2Client = {
  head: vi.fn().mockResolvedValue({
    size: 1024,
    etag: 'test-etag',
    lastModified: new Date(),
  }),
  
  get: vi.fn().mockResolvedValue({
    body: new ReadableStream(),
    size: 1024,
    etag: 'test-etag'
  }),
  
  put: vi.fn().mockResolvedValue({
    key: 'test-file.txt',
    etag: 'new-etag',
    size: 1024
  }),
  
  delete: vi.fn().mockResolvedValue({}),
  
  createMultipartUpload: vi.fn().mockResolvedValue({
    uploadId: 'upload-123'
  }),
  
  list: vi.fn().mockResolvedValue({
    objects: [
      { key: 'file1.txt', size: 100 },
      { key: 'file2.txt', size: 200 }
    ],
    truncated: false
  })
};

// Mock KV operations
export const mockKVNamespace = {
  get: vi.fn().mockImplementation((key: string) => {
    const mockData: Record<string, string> = {
      'session:test-123': JSON.stringify({
        userId: 1,
        email: 'test@example.com',
        expiresAt: Date.now() + 3600000
      }),
      'cache:api-data': JSON.stringify({ data: 'cached value' }),
      'config:feature-flags': JSON.stringify({
        newFeature: true,
        betaFeature: false
      })
    };
    return Promise.resolve(mockData[key] || null);
  }),
  
  put: vi.fn().mockResolvedValue(undefined),
  
  delete: vi.fn().mockResolvedValue(undefined),
  
  list: vi.fn().mockResolvedValue({
    keys: [
      { name: 'session:test-123', expiration: Date.now() + 3600000 },
      { name: 'cache:api-data', expiration: Date.now() + 1800000 }
    ]
  }),
  
  getWithMetadata: vi.fn().mockImplementation((key: string) => {
    return Promise.resolve({
      value: JSON.stringify({ data: 'test' }),
      metadata: { contentType: 'application/json' }
    });
  })
};

// Mock D1 prepared statements
export const mockD1PreparedStatement = {
  bind: vi.fn().mockReturnThis(),
  run: vi.fn().mockResolvedValue({
    success: true,
    meta: {
      duration: 5,
      last_row_id: 123,
      changes: 1,
    }
  }),
  
  first: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
  
  all: vi.fn().mockResolvedValue({
    results: [
      { id: 1, name: 'Test 1' },
      { id: 2, name: 'Test 2' }
    ]
  })
};

export const mockD1Database = {
  prepare: vi.fn().mockReturnValue(mockD1PreparedStatement),
  batch: vi.fn().mockResolvedValue([
    { success: true, meta: { changes: 1 } },
    { success: true, meta: { changes: 1 } }
  ]),
  exec: vi.fn().mockResolvedValue({ success: true })
};
```

## Test Fixtures with Mocks

### Mock-Enabled Test Environment
```typescript
// tests/setup-with-mocks.ts
import { vi, beforeEach, afterEach } from 'vitest';
import { mockAPIService } from './mocks/api-service';
import { mockR2Client, mockKVNamespace, mockD1Database } from './mocks/cloudflare-services';

// Mock external modules
vi.mock('$lib/server/external-api', () => ({
  apiService: mockAPIService
}));

vi.mock('$lib/server/storage/r2', () => ({
  r2Client: mockR2Client
}));

// Mock environment variables
const originalEnv = import.meta.env;

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Set up consistent environment for tests
  import.meta.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-for-testing-only',
    CRYPTO_SECRET: 'test-crypto-secret-32-chars-long',
    API_BASE_URL: 'http://localhost:8787'
  };
  
  // Mock fetch for HTTP requests
  global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    if (url.includes('/external-api/users/')) {
      const userId = url.split('/').pop();
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: userId,
          email: `user${userId}@example.com`,
          name: `User ${userId}`
        })
      } as Response;
    }
    
    // Default mock response
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as Response;
  });
});

afterEach(() => {
  // Restore original environment
  import.meta.env = originalEnv;
  vi.restoreAllMocks();
});
```

## Integration Tests with Mocks

### API Integration with Mocked Dependencies
```typescript
// tests/integration/api/user-endpoints.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env } from "cloudflare:test";
import { createTestDatabase } from '../../helpers/database';
import { mockAPIService } from '../../mocks/api-service';
import { createApp } from '$lib/server/app';

describe('User API Endpoints with Mocks', () => {
  let testDB: TestDatabase;
  let app: any;
  
  beforeEach(async () => {
    testDB = await createTestDatabase(env.TASKS_DB);
    app = createApp(env);
  });
  
  afterEach(async () => {
    await testDB.cleanup();
    vi.clearAllMocks();
  });
  
  it('should handle user creation with external service integration', async () => {
    // Mock external service response
    mockAPIService.createNotification.mockResolvedValue({
      id: 'notif-created',
      status: 'sent'
    });
    
    const response = await app.request('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      })
    });
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.user.email).toBe('newuser@example.com');
    
    // Verify external service was called
    expect(mockAPIService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'welcome',
        userId: expect.any(Number)
      })
    );
  });
  
  it('should handle external service failures gracefully', async () => {
    // Mock external service failure
    mockAPIService.sendEmail.mockRejectedValue(new Error('Email service down'));
    
    const response = await app.request('/api/users/1/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    
    // Should still return success even if email fails
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toContain('process');
    
    // Verify service was attempted
    expect(mockAPIService.sendEmail).toHaveBeenCalled();
  });
});
```

## Deterministic Mocking

### Time-based Mocking
```typescript
// tests/mocks/time.ts
import { vi } from 'vitest';

// Create deterministic time mocks
export const mockTime = {
  currentTime: new Date('2024-01-15T10:30:00.000Z'),
  timestamps: [
    new Date('2024-01-15T10:30:00.000Z'),
    new Date('2024-01-15T11:00:00.000Z'),
    new Date('2024-01-15T11:30:00.000Z'),
    new Date('2024-01-15T12:00:00.000Z'),
  ],
  timestampIndex: 0
};

// Mock Date.now and new Date()
export const setupTimeMocks = () => {
  const mockDateNow = vi.fn(() => mockTime.currentTime.getTime());
  const mockDateConstructor = vi.fn((timestamp?: number) => {
    if (timestamp) {
      return new Date(timestamp);
    }
    return mockTime.currentTime;
  });
  
  // Mock Date constructor to maintain prototype
  Object.setPrototypeOf(mockDateConstructor, Date);
  mockDateConstructor.prototype = Date.prototype;
  mockDateConstructor.parse = Date.parse;
  mockDateConstructor.UTC = Date.UTC;
  mockDateConstructor.now = mockDateNow;
  
  global.Date = mockDateConstructor as any;
  
  return {
    advanceTime: (ms: number) => {
      mockTime.currentTime = new Date(mockTime.currentTime.getTime() + ms);
      return mockTime.currentTime;
    },
    
    setCurrentTime: (date: Date) => {
      mockTime.currentTime = date;
    },
    
    nextTimestamp: () => {
      const timestamp = mockTime.timestamps[mockTime.timestampIndex];
      mockTime.timestampIndex = (mockTime.timestampIndex + 1) % mockTime.timestamps.length;
      mockTime.currentTime = timestamp;
      return timestamp;
    }
  };
};
```

### Cryptographic Mocking
```typescript
// tests/mocks/crypto.ts
import { vi } from 'vitest';

// Deterministic cryptographic test vectors
export const mockCrypto = {
  // Test vectors for PBKDF2
  pbkdf2TestVectors: [
    {
      password: 'password',
      salt: 'salt',
      iterations: 1000,
      keyLength: 32,
      expectedKey: new Uint8Array([
        0x73, 0x6f, 0x6d, 0x65, 0x20, 0x65, 0x78, 0x70,
        0x65, 0x63, 0x74, 0x65, 0x64, 0x20, 6f, 0x75,
        0x74, 0x70, 0x75, 0x74, 0x20, 0x68, 0x65, 0x72,
        0x65, 0x20, 0x28, 0x32, 0x30, 0x34, 0x38, 0x20
      ])
    }
  ],
  
  // Mock PBKDF2 function
  pbkdf2: vi.fn().mockImplementation(async (password: string, salt: string, iterations: number, keyLength: number) => {
    // Return deterministic test vector
    const vector = mockCrypto.pbkdf2TestVectors[0];
    if (password === vector.password && salt === vector.salt && iterations === vector.iterations) {
      return vector.expectedKey;
    }
    // Fallback for other inputs
    return new Uint8Array(keyLength).fill(0x42);
  }),
  
  // Mock AES-GCM encryption
  encrypt: vi.fn().mockImplementation(async (key: CryptoKey, data: ArrayBuffer, iv: ArrayBuffer) => {
    return {
      encrypted: new ArrayBuffer(data.byteLength),
      tag: new ArrayBuffer(16)
    };
  }),
  
  // Mock AES-GCM decryption  
  decrypt: vi.fn().mockImplementation(async (key: CryptoKey, encrypted: ArrayBuffer, iv: ArrayBuffer, tag: ArrayBuffer) => {
    return new ArrayBuffer(encrypted.byteLength);
  }),
  
  // Mock random bytes generation
  getRandomValues: vi.fn().mockImplementation((array: Uint8Array) => {
    // Fill with predictable pattern for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = (i + 1) % 256;
    }
    return array;
  })
};

export const setupCryptoMocks = () => {
  const originalCrypto = global.crypto;
  
  global.crypto = {
    ...originalCrypto,
    subtle: {
      ...originalCrypto.subtle,
      deriveKey: mockCrypto.pbkdf2,
      encrypt: mockCrypto.encrypt,
      decrypt: mockCrypto.decrypt
    },
    getRandomValues: mockCrypto.getRandomValues
  };
  
  return () => {
    global.crypto = originalCrypto;
  };
};
```

## Scenario-based Mocking

### Test Scenario Factory
```typescript
// tests/fixtures/scenarios.ts
import { vi } from 'vitest';
import { mockAPIService } from '../mocks/api-service';
import { mockKVNamespace } from '../mocks/cloudflare-services';

export class TestScenario {
  private mocks: Map<string, any> = new Map();
  
  constructor(private name: string) {}
  
  mockExternalService(service: string, implementation: any) {
    this.mocks.set(service, implementation);
    return this;
  }
  
  mockKVData(key: string, value: string) {
    const originalGet = mockKVNamespace.get;
    mockKVNamespace.get = vi.fn().mockImplementation((k: string) => {
      if (k === key) return Promise.resolve(value);
      return originalGet(k);
    });
    return this;
  }
  
  mockAPIResponse(endpoint: string, response: any) {
    if (endpoint.includes('/users/')) {
      mockAPIService.getUser.mockResolvedValue(response);
    }
    return this;
  }
  
  mockError(service: string, error: Error) {
    if (service === 'api') {
      mockAPIService.getUserError.mockRejectedValue(error);
    }
    return this;
  }
  
  async run<T>(testFn: () => Promise<T>): Promise<T> {
    try {
      return await testFn();
    } finally {
      this.cleanup();
    }
  }
  
  private cleanup() {
    // Reset all mocks
    vi.clearAllMocks();
    this.mocks.clear();
  }
}

// Predefined scenarios
export const Scenarios = {
  happyPath: () => new TestScenario('happy-path')
    .mockExternalService('email', { success: true })
    .mockKVData('feature-flags', JSON.stringify({ newFeature: true }))
    .mockAPIResponse('/users/1', { id: 1, email: 'test@example.com' }),
    
  serviceUnavailable: () => new TestScenario('service-unavailable')
    .mockError('api', new Error('Service unavailable'))
    .mockKVData('feature-flags', JSON.stringify({ newFeature: false })),
    
  authenticationFailure: () => new TestScenario('auth-failure')
    .mockKVData('session:invalid', null)
    .mockAPIResponse('/users/1', null),
    
  rateLimited: () => new TestScenario('rate-limited')
    .mockError('api', new Error('Rate limit exceeded'))
    .mockKVData('rate-limit:123', JSON.stringify({ remaining: 0, resetAt: Date.now() + 60000 }))
};
```

### Using Scenarios in Tests
```typescript
// tests/integration/scenarios/user-workflows.test.ts
import { describe, it, expect } from 'vitest';
import { env } from "cloudflare:test";
import { createTestDatabase } from '../../helpers/database';
import { Scenarios } from '../../fixtures/scenarios';
import { createApp } from '$lib/server/app';

describe('User Workflow Scenarios', () => {
  let testDB: TestDatabase;
  let app: any;
  
  beforeEach(async () => {
    testDB = await createTestDatabase(env.TASKS_DB);
    app = createApp(env);
  });
  
  afterEach(async () => {
    await testDB.cleanup();
  });
  
  it('should handle successful user registration', async () => {
    await Scenarios.happyPath().run(async () => {
      const response = await app.request('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User'
        })
      });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.user.email).toBe('newuser@example.com');
    });
  });
  
  it('should handle service unavailability gracefully', async () => {
    await Scenarios.serviceUnavailable().run(async () => {
      const response = await app.request('/api/users/1/notifications', {
        method: 'GET'
      });
      
      // Should still respond, but with cached or degraded data
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.notifications).toEqual([]);
    });
  });
  
  it('should handle authentication failures', async () => {
    await Scenarios.authenticationFailure().run(async () => {
      const response = await app.request('/api/users/profile', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      
      expect(response.status).toBe(401);
    });
  });
});
```