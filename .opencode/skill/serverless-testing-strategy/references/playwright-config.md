# Playwright Configuration for E2E Testing

## Basic Configuration

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'], // HTML report
    ['json', { outputFile: 'playwright-report.json' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

## Advanced Configuration with Authentication

### playwright.config.ts (Advanced)
```typescript
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-report.json' }],
    ['junit', { outputFile: 'test-results/playwright-results.xml' }],
    process.env.CI ? ['github'] : ['list'],
    ['line'], // Show file and line numbers
    ['dot'] // Show progress
  ],
  outputDir: 'test-results/',
  
  // Global setup for authentication
  globalSetup: path.join(__dirname, 'tests/e2e/global-setup.ts'),
  
  use: {
    baseURL: process.env.DEV_SERVER_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
    
    // Ignore HTTPS errors for testing
    ignoreHTTPSErrors: true,
    
    // Color scheme preference
    colorScheme: 'light',
    
    // Locale
    locale: 'en-US',
    
    // Timezone
    timezoneId: 'America/New_York',
    
    // User agent
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Device scale factor
    deviceScaleFactor: 1,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
  
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write']
        }
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        contextOptions: {
          permissions: ['geolocation']
        }
      },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Tablet browsers
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
    
    // Dark mode testing
    {
      name: 'chromium-dark',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
    
    // High-contrast mode testing
    {
      name: 'chromium-high-contrast',
      use: { 
        ...devices['Desktop Chrome'],
        forcedColors: 'active',
      },
    },
  ],
  
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run api:test',
      url: 'http://localhost:8787',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    }
  ],
  
  // Test metadata
  metadata: {
    'Test Environment': process.env.NODE_ENV || 'development',
    'Browser Version': '${browserName} ${browserVersion}',
    'Test Suite': 'E2E Tests',
  },
});
```

## Global Setup for Authentication

### tests/e2e/global-setup.ts
```typescript
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');
    
    // Perform login
    await page.fill('[data-testid=user-id]', 'test-user');
    await page.fill('[data-testid=password]', 'test-password');
    await page.click('[data-testid=login-button]');
    
    // Wait for successful login
    await page.waitForURL('**/dashboard');
    
    // Save authentication state
    await page.context().storageState({ 
      path: 'tests/e2e/auth-state.json' 
    });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
```

## Test Files Organization

### tests/e2e/fixtures/auth.fixture.ts
```typescript
import { test as base, expect } from '@playwright/test';

// Define authenticated test fixture
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Use saved authentication state
    await page.context().addCookies([
      {
        name: 'session',
        value: 'test-session-token',
        domain: 'localhost',
        path: '/',
      }
    ]);
    
    await use(page);
  },
});

export { expect };
```

### tests/e2e/fixtures/test-data.fixture.ts
```typescript
import { test as base } from '@playwright/test';

export interface TestUserData {
  email: string;
  password: string;
  name: string;
}

export interface TestTaskData {
  title: string;
  content: string;
  importance: number;
  urgency: number;
}

export const test = base.extend({
  testUser: async ({}, use) => {
    const userData: TestUserData = {
      email: 'test@example.com',
      password: 'test-password-123',
      name: 'Test User'
    };
    await use(userData);
  },
  
  testTask: async ({}, use) => {
    const taskData: TestTaskData = {
      title: 'Test Task',
      content: 'This is a test task',
      importance: 8,
      urgency: 5
    };
    await use(taskData);
  },
});
```

## Example E2E Tests

### tests/e2e/auth/login.spec.ts
```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid=user-id]', 'test-user');
    await page.fill('[data-testid=password]', 'test-password');
    await page.click('[data-testid=login-button]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid=welcome-message]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid=user-id]', 'invalid-user');
    await page.fill('[data-testid=password]', 'wrong-password');
    await page.click('[data-testid=login-button]');
    
    await expect(page.locator('[data-testid=error-message]')).toContainText('Invalid credentials');
  });

  test('should logout successfully', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.click('[data-testid=logout-button]');
    
    await expect(authenticatedPage).toHaveURL('/login');
  });
});
```

### tests/e2e/tasks/task-management.spec.ts
```typescript
import { test, expect } from '../fixtures/test-data.fixture';

test.describe('Task Management', () => {
  test('should create a new task', async ({ authenticatedPage, testTask }) => {
    await authenticatedPage.goto('/dashboard');
    
    await authenticatedPage.click('[data-testid=add-task]');
    await authenticatedPage.fill('[data-testid=task-title]', testTask.title);
    await authenticatedPage.fill('[data-testid=task-content]', testTask.content);
    await authenticatedPage.selectOption('[data-testid=importance]', testTask.importance.toString());
    await authenticatedPage.selectOption('[data-testid=urgency]', testTask.urgency.toString());
    await authenticatedPage.click('[data-testid=save-task]');
    
    await expect(authenticatedPage.locator('[data-testid=task-item]')).toContainText(testTask.title);
    await expect(authenticatedPage.locator('[data-testid=success-message]')).toBeVisible();
  });

  test('should edit an existing task', async ({ authenticatedPage }) => {
    // First create a task
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.click('[data-testid=add-task]');
    await authenticatedPage.fill('[data-testid=task-title]', 'Original Title');
    await authenticatedPage.click('[data-testid=save-task]');
    
    // Edit the task
    await authenticatedPage.click('[data-testid=edit-task]');
    await authenticatedPage.fill('[data-testid=task-title]', 'Updated Title');
    await authenticatedPage.click('[data-testid=save-task]');
    
    await expect(authenticatedPage.locator('[data-testid=task-item]')).toContainText('Updated Title');
  });

  test('should delete a task', async ({ authenticatedPage }) => {
    // First create a task
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.click('[data-testid=add-task]');
    await authenticatedPage.fill('[data-testid=task-title]', 'Task to Delete');
    await authenticatedPage.click('[data-testid=save-task]');
    
    // Delete the task
    await authenticatedPage.click('[data-testid=delete-task]');
    await authenticatedPage.click('[data-testid=confirm-delete]');
    
    await expect(authenticatedPage.locator('[data-testid=task-item]')).not.toContainText('Task to Delete');
  });
});
```

### tests/e2e/accessibility/a11y.spec.ts
```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page);
  });

  test('should be accessible on homepage', async ({ page }) => {
    await page.goto('/');
    
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'color-contrast': { enabled: false } // Disable if not critical
      }
    });
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/login');
    
    const loginForm = page.locator('[data-testid=login-form]');
    await expect(loginForm).toHaveAttribute('aria-label', 'Login form');
    
    const userIdInput = page.locator('[data-testid=user-id]');
    await expect(userIdInput).toHaveAttribute('aria-label', 'User ID');
    await expect(userIdInput).toHaveAttribute('aria-required', 'true');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    
    await page.keyboard.press('Tab'); // Focus first input
    await expect(page.locator('[data-testid=user-id]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Focus second input
    await expect(page.locator('[data-testid=password]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Focus submit button
    await expect(page.locator('[data-testid=login-button]')).toBeFocused();
    
    await page.keyboard.press('Enter'); // Submit form
    // Verify form submission behavior
  });
});
```

## Package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:codegen": "playwright codegen http://localhost:5173",
    "test:e2e:report": "playwright show-report",
    "test:e2e:install": "playwright install",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:trace": "playwright test --trace on",
    "test:e2e:chromium": "playwright test --project=chromium",
    "test:e2e:mobile": "playwright test --project='Mobile Chrome'",
    "test:e2e:ci": "playwright test --reporter=github"
  }
}
```

## Environment Variables

Create `.env.test` for test-specific configuration:
```env
# Test server configuration
DEV_SERVER_URL=http://localhost:5173
API_TEST_URL=http://localhost:8787

# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password-123

# Database test configuration
TEST_DB_URL=file:./tests/fixtures/test.db

# External service mocks
MOCK_API_URL=http://localhost:3001
```

## Running Tests

### Development Mode
```bash
# Start dev servers first
npm run dev
npm run api:test

# Run E2E tests in development
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run specific test file
npm run test:e2e tests/e2e/auth/login.spec.ts

# Run specific test
npm run test:e2e -- --grep "should login with valid credentials"
```

### CI Mode
```bash
# Run all tests in CI mode
npm run test:e2e:ci

# Run with coverage
npm run test:e2e:ci -- --coverage
```

### Debug Mode
```bash
# Run tests with debugging
npm run test:e2e:debug

# Run with browser visible
npm run test:e2e:headed

# Generate test code
npm run test:e2e:codegen
```