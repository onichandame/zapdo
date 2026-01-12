---
name: serverless-testing-strategy
description: (opencode-project - Skill) Implement comprehensive testing for Cloudflare Workers and SvelteKit applications using Vitest, Playwright, and Miniflare for unit, integration, and end-to-end testing in serverless environments.
license: MIT
scope: project
---

# Serverless Testing Strategy

## When to use this skill
When creating test suites for Cloudflare Workers, SvelteKit applications, and serverless architectures requiring comprehensive coverage of APIs, databases, and user workflows.

## Instructions

### Phase 1: Test Infrastructure Setup

#### 1.1 Vitest Configuration for Workers
- Use `@cloudflare/vitest-pool-workers` for runtime-specific testing
- Configure `isolatedStorage: true` for test isolation
- Set up proper environment variable handling
- Implement coverage reporting with Istanbul

#### 1.2 Testing Framework Integration
- Configure Playwright for E2E testing
- Set up Miniflare for Workers simulation
- Establish test database isolation
- Configure CI/CD pipeline integration

### Phase 2: Unit Testing Implementation

#### 2.1 Business Logic Testing
- Test utility functions and pure functions
- Mock external dependencies and APIs
- Test cryptographic operations with deterministic vectors
- Use AAA pattern (Arrange, Act, Assert)

#### 2.2 Component Testing
- Test Svelte components in isolation
- Mock props and events
- Validate reactive behavior
- Test accessibility patterns

### Phase 3: Integration Testing

#### 3.1 API Testing
- Test API endpoints with `cloudflare:test` environment
- Verify request/response handling
- Test authentication and authorization
- Validate error handling and status codes

#### 3.2 Database Testing
- Test D1 operations with isolated instances
- Verify query execution and results
- Test transaction rollback scenarios
- Validate data integrity constraints

#### 3.3 Storage Testing
- Test KV session storage and TTL behavior
- Validate R2 presigned URL generation
- Test file upload/download operations
- Verify consistency patterns

### Phase 4: End-to-End Testing

#### 4.1 User Workflow Testing
- Test complete user journeys
- Validate critical application paths
- Test authentication flows
- Verify data persistence across sessions

#### 4.2 Cross-Browser Testing
- Test on multiple browsers and devices
- Validate responsive design
- Test accessibility compliance
- Verify performance characteristics

### Phase 5: Quality Assurance

#### 5.1 Test Coverage
- Achieve >80% unit test coverage
- Maintain >70% integration test coverage
- Track coverage trends and gaps
- Focus on critical path coverage

#### 5.2 Test Reliability
- Ensure zero flaky tests
- Implement proper test isolation
- Use deterministic test data
- Handle async operations correctly

## Progressive Testing Strategy

### Unit Testing Layer
**Purpose**: Test individual functions and components in isolation
**Tools**: Vitest, @cloudflare/vitest-pool-workers
**Speed**: <100ms per test
**Focus**: Business logic, utility functions, pure functions

### Integration Testing Layer
**Purpose**: Test interactions between components and services
**Tools**: Vitest with cloudflare:test, Miniflare
**Speed**: <1s per test
**Focus**: API endpoints, database operations, external services

### End-to-End Testing Layer
**Purpose**: Test complete user workflows and critical paths
**Tools**: Playwright, real browsers
**Speed**: <10s per test
**Focus**: User journeys, authentication, critical features

## Configuration Examples

### Basic Vitest Setup
See [references/vitest-config.md](references/vitest-config.md) for comprehensive configuration examples.

### Playwright Configuration
See [references/playwright-config.md](references/playwright-config.md) for browser testing setup.

### Database Testing Patterns
See [references/database-testing.md](references/database-testing.md) for D1 and integration testing.

## Test Organization

### Directory Structure
```
tests/
├── unit/                    # Unit tests for pure functions
│   ├── utils/              # Utility function tests
│   ├── crypto/             # Cryptographic operation tests
│   └── validation/         # Input validation tests
├── integration/             # API and database tests
│   ├── api/                # API endpoint tests
│   ├── database/           # Database operation tests
│   └── storage/            # KV/R2 storage tests
├── e2e/                    # End-to-end tests
│   ├── workflows/          # User workflow tests
│   ├── auth/               # Authentication flow tests
│   └── critical-paths/     # Critical application paths
├── fixtures/               # Test data and utilities
│   ├── data/               # Test data sets
│   ├── mocks/              # Mock implementations
│   └── helpers/            # Test helper functions
└── performance/            # Performance and load tests
    ├── benchmarks/         # Performance benchmarks
    └── load/               # Load testing scenarios
```

### Naming Conventions
- **Unit Tests**: `*.test.ts` - Test individual functions
- **Integration Tests**: `*.integration.test.ts` - Test service interactions
- **E2E Tests**: `*.e2e.test.ts` - Test user workflows
- **Fixtures**: `*.fixture.ts` - Test data and setup

## Advanced Patterns

### Mock Strategies
See [references/mocking-patterns.md](references/mocking-patterns.md) for comprehensive mocking strategies.

### Performance Testing
See [references/performance-testing.md](references/performance-testing.md) for test optimization techniques.

### Security Testing
See [references/security-testing.md](references/security-testing.md) for authentication and encryption testing.

## CI/CD Integration

### Pipeline Configuration
See [references/cicd-pipeline.md](references/cicd-pipeline.md) for GitHub Actions and deployment pipelines.

### Coverage Reporting
See [references/coverage-config.md](references/coverage-config.md) for code coverage setup and thresholds.

## Quality Metrics

### Coverage Targets
- **Unit Tests**: >80% line coverage, >75% branch coverage
- **Integration Tests**: >70% line coverage, >65% branch coverage
- **Critical Paths**: 100% coverage of authentication and core workflows

### Performance Benchmarks
- **Unit Test Suite**: <30 seconds total execution
- **Integration Test Suite**: <2 minutes total execution
- **E2E Test Suite**: <10 minutes total execution

### Quality Gates
- All tests must pass before deployment
- Coverage thresholds must be met
- No new flaky tests allowed
- Performance regressions detected

## Best Practices

### Test Design Principles
- Test behavior, not implementation details
- Keep tests independent and repeatable
- Use meaningful test names describing scenarios
- Mock external dependencies, not internals
- Implement proper cleanup between tests

### Maintenance Guidelines
- Review and update tests regularly
- Remove obsolete or redundant tests
- Focus on high-risk areas
- Prioritize critical path coverage
- Document test purpose and scope

## Troubleshooting

### Common Issues
See [references/troubleshooting.md](references/troubleshooting.md) for common test issues and solutions.

### Debugging Strategies
See [references/debugging.md](references/debugging.md) for test debugging techniques.

## Tools and Resources

### Essential Dependencies
See [references/dependencies.md](references/dependencies.md) for required testing libraries and tools.

### Reference Documentation
See [references/api-docs.md](references/api-docs.md) for comprehensive API documentation.