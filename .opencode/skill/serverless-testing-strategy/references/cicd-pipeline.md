# CI/CD Pipeline Integration

## GitHub Actions Configuration

### Complete Pipeline Setup
```yaml
# .github/workflows/test.yml
name: Comprehensive Testing Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  CACHE_VERSION: 'v1'

jobs:
  lint:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: '**/package-lock.json'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run Prettier check
        run: npm run format:check
      
      - name: TypeScript type check
        run: npm run typecheck

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Run unit tests with coverage
        run: npm run test:unit:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unit
          name: unit-test-coverage-${{ matrix.node-version }}

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Setup test environment
        run: |
          echo "JWT_SECRET=test-jwt-secret-for-ci-${{ github.run_id }}" >> .env.test
          echo "CRYPTO_SECRET=test-crypto-secret-32-chars-ci-${{ github.run_id }}" >> .env.test
          echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/testdb" >> .env.test
      
      - name: Run database migrations
        run: npm run db:migrate:test
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Upload integration coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: integration
          name: integration-test-coverage

  e2e-tests:
    name: End-to-End Tests
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Install Playwright browsers
        run: npx playwright install ${{ matrix.browser }}
      
      - name: Setup test environment
        run: |
          echo "JWT_SECRET=test-jwt-secret-for-ci-${{ github.run_id }}" >> .env.test
          echo "CRYPTO_SECRET=test-crypto-secret-32-chars-ci-${{ github.run_id }}" >> .env.test
      
      - name: Build application
        run: npm run build
      
      - name: Start application in background
        run: |
          npm run start:test &
          sleep 30
      
      - name: Run E2E tests
        run: npm run test:e2e -- --project=${{ matrix.browser }}
        env:
          CI: true
      
      - name: Upload E2E test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 7
      
      - name: Upload E2E screenshots
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-screenshots-${{ matrix.browser }}
          path: test-results/
          retention-days: 7

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    needs: e2e-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      
      - name: Run load tests
        run: npm run test:load
        env:
          LOAD_TEST_TARGET: ${{ secrets.LOAD_TEST_TARGET }}

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Run npm audit
        run: npm audit --audit-level high
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, e2e-tests, security-scan]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Deploy to Cloudflare Workers
        run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      
      - name: Run smoke tests
        run: npm run test:smoke
        env:
          PRODUCTION_URL: https://your-app.your-subdomain.workers.dev
```

## Multi-Environment Deployment

### Staging Pipeline
```yaml
# .github/workflows/staging.yml
name: Deploy to Staging

on:
  push:
    branches: [ develop ]

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Deploy to staging
        run: npx wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      
      - name: Run integration tests against staging
        run: npm run test:integration:remote
        env:
          TEST_API_URL: https://staging.your-app.your-subdomain.workers.dev
      
      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          text: '🚀 Staging deployment complete'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Quality Gates and Checks

### Branch Protection Rules
```yaml
# .github/branch-protection.yml
# Configure in GitHub repository settings

protection_rules:
  main:
    required_status_checks:
      strict: true
      contexts:
        - "Code Quality"
        - "Unit Tests (16)"
        - "Unit Tests (18)"
        - "Unit Tests (20)"
        - "Integration Tests"
        - "End-to-End Tests (chromium)"
        - "End-to-End Tests (firefox)"
        - "End-to-End Tests (webkit)"
        - "Security Scan"
    
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 2
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
    
    restrictions:
      users: []
      teams: ["core-developers"]
    
    allow_force_pushes: false
    allow_deletions: false
```

### Coverage Thresholds
```yaml
# .github/workflows/coverage-check.yml
name: Coverage Gate Check

on:
  pull_request:
    branches: [ main ]

jobs:
  coverage-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: Check coverage thresholds
        run: |
          COVERAGE=$(npx nyc report --reporter=text-summary | grep "Lines" | awk '{print $2}' | sed 's/%//')
          
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ Coverage below 80%: ${COVERAGE}%"
            exit 1
          fi
          
          echo "✅ Coverage passed: ${COVERAGE}%"
      
      - name: Coverage diff check
        uses: wtfjoke/coverage-diff-action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          coverage-file: ./coverage/coverage-final.json
          minimum-change: -2
```

## Test Orchestration Scripts

### Parallel Test Execution
```bash
#!/bin/bash
# scripts/run-tests.sh

set -e

echo "🚀 Starting comprehensive test suite..."

# Environment setup
export NODE_ENV=test
export CI=true

# Create test directories
mkdir -p test-results/{unit,integration,e2e,coverage,reports}

# Function to run tests in parallel
run_parallel_tests() {
  echo "📊 Running test suites in parallel..."
  
  # Unit tests
  npm run test:unit 2>&1 | tee test-results/unit/results.txt &
  UNIT_PID=$!
  
  # Integration tests  
  npm run test:integration 2>&1 | tee test-results/integration/results.txt &
  INTEGRATION_PID=$!
  
  # Lint and type checking
  npm run lint 2>&1 | tee test-results/lint.txt &
  LINT_PID=$!
  
  npm run typecheck 2>&1 | tee test-results/types.txt &
  TYPES_PID=$!
  
  # Wait for all background processes
  wait $UNIT_PID
  echo "✅ Unit tests completed"
  
  wait $INTEGRATION_PID
  echo "✅ Integration tests completed"
  
  wait $LINT_PID
  echo "✅ Linting completed"
  
  wait $TYPES_PID
  echo "✅ Type checking completed"
}

# Function to run E2E tests after other tests pass
run_e2e_tests() {
  echo "🎭 Running E2E tests..."
  
  # Start application servers
  npm run start:test &
  SERVER_PID=$!
  
  # Wait for servers to be ready
  sleep 30
  
  # Run E2E tests
  npm run test:e2e
  E2E_EXIT_CODE=$?
  
  # Cleanup
  kill $SERVER_PID 2>/dev/null || true
  
  if [ $E2E_EXIT_CODE -ne 0 ]; then
    echo "❌ E2E tests failed"
    exit 1
  fi
  
  echo "✅ E2E tests completed"
}

# Function to generate reports
generate_reports() {
  echo "📈 Generating reports..."
  
  # Collect test results
  npx nyc merge test-results coverage/coverage.json
  
  # Generate HTML report
  npx nyc report --reporter=html --reporter=text
  
  # Create summary report
  cat > test-results/summary.txt << EOF
Test Suite Summary - $(date)
==================================

Unit Tests: $(grep -c "PASS" test-results/unit/results.txt || echo "0") passed
Integration Tests: $(grep -c "PASS" test-results/integration/results.txt || echo "0") passed
E2E Tests: $(grep -c "PASS" test-results/e2e/results.txt || echo "0") passed

Coverage: $(npx nyc report --reporter=text-summary | grep "Lines" | sed 's/^.*: //')

Overall Status: $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")
EOF
  
  cat test-results/summary.txt
}

# Main execution
main() {
  case "${1:-all}" in
    "unit")
      npm run test:unit
      ;;
    "integration")
      npm run test:integration
      ;;
    "e2e")
      run_e2e_tests
      ;;
    "parallel")
      run_parallel_tests
      ;;
    "reports")
      generate_reports
      ;;
    "all")
      run_parallel_tests
      run_e2e_tests
      generate_reports
      ;;
    *)
      echo "Usage: $0 [unit|integration|e2e|parallel|reports|all]"
      exit 1
      ;;
  esac
}

main "$@"
```

## Environment-Specific Configurations

### Test Environment Variables
```yaml
# .env.test
NODE_ENV=test
CI=true

# Test-specific secrets (generated uniquely per test run)
JWT_SECRET=test-jwt-secret-for-testing
CRYPTO_SECRET=test-crypto-secret-32-chars-long

# Test database
DATABASE_URL=file:./tests/fixtures/test.db

# External service mocks
MOCK_EXTERNAL_API=true
MOCK_PAYMENTS=true

# Feature flags for testing
ENABLE_NEW_FEATURES=true
ENABLE_BETA_FEATURES=true

# Performance settings
TEST_TIMEOUT=30000
E2E_TIMEOUT=60000

# Logging
LOG_LEVEL=debug
LOG_TESTS=true
```

### Production Environment Checks
```bash
#!/bin/bash
# scripts/production-health-check.sh

set -e

PRODUCTION_URL="${1:-https://your-app.your-subdomain.workers.dev}"

echo "🔍 Running production health checks..."

# Basic connectivity check
echo "📡 Checking connectivity..."
curl -f -s "$PRODUCTION_URL/health" > /dev/null || {
  echo "❌ Health check failed"
  exit 1
}

# API endpoint checks
echo "🔧 Checking API endpoints..."
ENDPOINTS=("/api/health" "/api/version" "/api/status")

for endpoint in "${ENDPOINTS[@]}"; do
  curl -f -s "$PRODUCTION_URL$endpoint" > /dev/null || {
    echo "❌ API endpoint check failed: $endpoint"
    exit 1
  }
done

# Performance check
echo "⚡ Checking performance..."
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$PRODUCTION_URL")
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
  echo "⚠️  Slow response time: ${RESPONSE_TIME}s"
else
  echo "✅ Response time: ${RESPONSE_TIME}s"
fi

# Feature flag checks
echo "🚦 Checking feature flags..."
FEATURE_FLAGS=$(curl -s "$PRODUCTION_URL/api/flags" | jq -r '.flags | keys[]')
for flag in $FEATURE_FLAGS; do
  echo "  • $flag: $(curl -s "$PRODUCTION_URL/api/flags" | jq -r ".flags.$flag")"
done

echo "✅ All health checks passed"
```

## Monitoring and Alerting

### Test Failure Notifications
```yaml
# .github/workflows/notify.yml
name: Notify on Test Failures

on:
  workflow_run:
    workflows: ["Comprehensive Testing Pipeline"]
    types:
      - completed

jobs:
  notify-failure:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#ci-failures'
          text: |
            🚨 Test Pipeline Failed
            
            Repository: ${{ github.repository }}
            Branch: ${{ github.ref }}
            Commit: ${{ github.sha }}
            
            Workflow: ${{ github.event.workflow_run.name }}
            Run: ${{ github.event.workflow_run.html_url }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      
      - name: Create GitHub Issue
        uses: actions/github-script@v6
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Test Pipeline Failure - ${new Date().toISOString()}`,
              body: `
                ## Test Pipeline Failure
                
                **Repository:** ${{ github.repository }}
                **Branch:** ${{ github.ref }}
                **Commit:** ${{ github.sha }}
                
                **Workflow:** ${{ github.event.workflow_run.name }}
                **Run URL:** ${{ github.event.workflow_run.html_url }}
                
                Please investigate the test failures and fix the underlying issues.
              `,
              labels: ['bug', 'ci-failure', 'urgent']
            })
```