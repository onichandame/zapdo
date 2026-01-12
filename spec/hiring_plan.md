# Eisenhower Task Manager - Hiring Plan

> Date: 2026-01-12
> Purpose: Hiring plan for development team subagents

---

## Overview

This document outlines the hiring plan for 3 new subagents required to build the Eisenhower Task Manager. Each subagent has specific expertise and will be used during different phases of development.

### Team Composition

| Role | Primary Phase | Secondary Phase | Priority |
|------|---------------|-----------------|----------|
| Backend API Engineer | Phase 1-3 | Phase 4-5 | Critical |
| Crypto-Security Engineer | Phase 2 | Phase 3, 7 | Critical |
| QA Test Engineer | Phase 5 | Phase 7 | High |

### Budget Estimate

Each subagent will be billed based on usage. Estimated total cost breakdown:
- Backend API Engineer: ~40% of total effort
- Crypto-Security Engineer: ~25% of total effort
- QA Test Engineer: ~20% of total effort
- Frontend UI/UX Engineer: ~15% of total effort (already available)
- Document Writer: As needed

---

## Role 1: Backend API Engineer

### Job Description

Build and maintain all server-side infrastructure for a privacy-focused task management application using SvelteKit, Cloudflare Workers, D1, KV, and R2.

### Required Qualifications

**Must Have:**
- [ ] Strong TypeScript experience (strict mode preferred)
- [ ] Cloudflare Workers or similar serverless experience
- [ ] SQL database experience (PostgreSQL, MySQL, or SQLite/D1)
- [ ] RESTful API design and implementation
- [ ] Authentication and session management experience
- [ ] Key-value store experience (Redis, Cloudflare KV, or similar)
- [ ] S3-compatible storage experience (AWS S3, Cloudflare R2, or similar)
- [ ] Git version control proficiency

**Nice to Have:**
- [ ] SvelteKit framework experience
- [ ] D1 database experience
- [ ] Serverless architecture design
- [ ] Performance optimization for serverless
- [ ] Rate limiting and DDoS protection
- [ ] API documentation tools (OpenAPI, Swagger)

### Key Responsibilities

1. **API Development**
   - Design and implement RESTful API endpoints
   - Build SvelteKit `+server.ts` routes
   - Implement request validation and error handling
   - Create consistent API response formats

2. **Database Operations**
   - Design D1 database schema
   - Write and optimize SQL queries
   - Create database migrations
   - Implement data access patterns

3. **Session Management**
   - Implement cookie-based authentication
   - Build session storage using KV
   - Handle session expiry and cleanup
   - Support concurrent sessions

4. **File Storage**
   - Implement R2 integration
   - Generate presigned URLs for secure uploads/downloads
   - Handle file operations (upload, download, move, delete)
   - Optimize for large file handling

5. **Security**
   - Implement input validation
   - Prevent SQL injection and XSS attacks
   - Handle authentication securely
   - Follow security best practices

### Interview Process

**Step 1: Technical Screen (30 min)**
- Background and experience overview
- Cloudflare Workers/serverless experience
- Database design experience
- Motivation for joining the project

**Step 2: Technical Interview - API Design (60 min)**
- Design a RESTful API for a task management system
- Discuss authentication patterns
- Handle edge cases and error responses
- Scalability considerations

**Step 3: Technical Interview - Database (60 min)**
- Design database schema for users, tasks, sessions
- Write SQL queries for common operations
- Discuss indexing and performance
- Handle migrations and schema changes

**Step 4: Coding Challenge (2 hours)**
- Implement a simple API endpoint using SvelteKit
- Connect to D1 database
- Implement session management
- Write unit tests

**Step 5: Final Review (30 min)**
- Review coding challenge
- Discuss architecture decisions
- Team fit assessment
- Questions and expectations

### Technical Questions to Ask

**API Design:**
1. "How would you design an API endpoint for creating a task?"
2. "What's your approach to handling pagination?"
3. "How do you handle API versioning?"
4. "What status codes would you use for different error scenarios?"

**Database:**
1. "Explain the difference between INNER JOIN and LEFT JOIN"
2. "How would you optimize a slow SQL query?"
3. "What's your approach to database migrations?"
4. "How do you handle transactions in SQLite/D1?"

**Authentication:**
1. "Explain the difference between session-based and token-based auth"
2. "How would you implement secure session management?"
3. "What are the security considerations for cookies?"
4. "How do you handle concurrent sessions?"

**Serverless/Cloudflare:**
1. "What's your experience with serverless architectures?"
2. "How do you handle cold starts in serverless?"
3. "What are the limitations you've encountered with serverless?"
4. "How do you monitor serverless applications?"

### Red Flags

**Technical:**
- Can't explain basic SQL concepts
- No serverless or cloud experience
- Doesn't understand authentication flows
- Writes inefficient queries
- No testing experience

**Communication:**
- Can't explain technical concepts clearly
- Doesn't ask clarifying questions
- Overconfident without substance
- Dismissive of best practices

**Attitude:**
- Unwilling to follow security practices
- Doesn't care about code quality
- Resistant to code review
- Prefers shortcuts over maintainability

### Evaluation Criteria

| Criteria | Weight | Score (1-5) |
|----------|--------|-------------|
| TypeScript proficiency | 20% | ___ |
| API design skills | 20% | ___ |
| Database experience | 15% | ___ |
| Serverless/cloud experience | 15% | ___ |
| Security awareness | 15% | ___ |
| Communication | 10% | ___ |
| Code quality | 5% | ___ |

**Passing Score**: 3.5+ average with no individual score below 3.0

---

## Role 2: Crypto-Security Engineer

### Job Description

Implement client-side encryption, key derivation, and security protocols for a zero-knowledge task management application using Web Crypto API.

### Required Qualifications

**Must Have:**
- [ ] Web Crypto API experience
- [ ] Cryptography fundamentals (symmetric, asymmetric, hashing)
- [ ] Key derivation functions (PBKDF2, scrypt, Argon2)
- [ ] AES encryption experience (GCM mode preferred)
- [ ] RSA encryption experience (OAEP preferred)
- [ ] Secure coding practices
- [ ] TypeScript/JavaScript experience
- [ ] Understanding of zero-knowledge architectures

**Nice to Have:**
- [ ] Ed25519 or other signature schemes
- [ ] Post-quantum cryptography knowledge
- [ ] Security audit experience
- [ ] Penetration testing experience
- [ ] Security certifications (CISSP, CEH, etc.)
- [ ] Password-based key derivation expertise

### Key Responsibilities

1. **Key Derivation**
   - Implement PBKDF2 for KEK derivation
   - Handle salt generation and storage
   - Optimize iteration count for security/performance balance
   - Support key stretching techniques

2. **Encryption Implementation**
   - Implement AES-256-GCM for content encryption
   - Handle IV generation and management
   - Implement auth tag verification
   - Support large content encryption

3. **Asymmetric Cryptography**
   - Implement RSA-OAEP key pair generation from KEK
   - Handle public/private key operations
   - Implement challenge-response authentication
   - Support key rotation mechanisms

4. **Client-Side Security**
   - Ensure keys never leave client memory
   - Implement secure key storage patterns
   - Handle browser security contexts
   - Prevent key extraction attacks

5. **Encoding/Decoding**
   - Implement base64 encoding for R2 content
   - Handle binary data conversion
   - Optimize encoding performance
   - Support large file handling

### Interview Process

**Step 1: Technical Screen (30 min)**
- Background in cryptography
- Web Crypto API experience
- Security certifications
- Motivation for privacy-focused work

**Step 2: Technical Interview - Cryptography (60 min)**
- Explain key derivation process
- Discuss encryption modes and their trade-offs
- Handle asymmetric encryption scenarios
- Security best practices

**Step 3: Technical Interview - Implementation (60 min)**
- Implement PBKDF2 key derivation
- Implement AES encryption/decryption
- Handle edge cases and errors
- Security considerations

**Step 4: Coding Challenge (3 hours)**
- Implement complete crypto module
- Write comprehensive tests
- Document security considerations
- Performance optimization

**Step 5: Security Review (30 min)**
- Review coding challenge for vulnerabilities
- Discuss attack vectors
- Review security decisions
- Final assessment

### Technical Questions to Ask

**Key Derivation:**
1. "Explain PBKDF2 and why iteration count matters"
2. "What's the difference between PBKDF2 and scrypt?"
3. "How do you choose appropriate salt length?"
4. "How would you handle key stretching for stronger passwords?"

**Encryption:**
1. "Explain the difference between AES-CBC and AES-GCM"
2. "Why is auth tag important in AES-GCM?"
3. "How do you handle IV generation securely?"
4. "What are the risks of reusing IVs?"

**Asymmetric:**
1. "Explain RSA-OAEP and its security properties"
2. "How would you use RSA for challenge-response auth?"
3. "What's the difference between encryption and signatures?"
4. "How do you handle key sizes and security trade-offs?"

**Zero-Knowledge:**
1. "What's a zero-knowledge proof?"
2. "How does zero-knowledge apply to authentication?"
3. "What are the challenges of zero-knowledge systems?"
4. "How do you verify identity without seeing secrets?"

### Red Flags

**Technical:**
- Can't explain basic cryptographic concepts
- No Web Crypto API experience
- Doesn't understand IV/nonce importance
- Suggests storing keys in localStorage
- No testing or security audit experience

**Security:**
- Doesn't prioritize security over convenience
- Suggests hardcoding keys or passwords
- Dismissive of encryption best practices
- No understanding of attack vectors

**Communication:**
- Can't explain crypto concepts in simple terms
- Overcomplicates simple solutions
- Doesn't document security decisions

### Evaluation Criteria

| Criteria | Weight | Score (1-5) |
|----------|--------|-------------|
| Cryptography fundamentals | 25% | ___ |
| Web Crypto API proficiency | 20% | ___ |
| Key derivation experience | 15% | ___ |
| Security awareness | 20% | ___ |
| Code quality and testing | 10% | ___ |
| Communication | 10% | ___ |

**Passing Score**: 4.0+ average with no individual score below 3.5 (security is critical)

---

## Role 3: QA Test Engineer

### Job Description

Ensure code quality through comprehensive testing including unit tests, integration tests, and end-to-end tests for a privacy-focused task management application.

### Required Qualifications

**Must Have:**
- [ ] TypeScript/JavaScript testing experience
- [ ] Unit testing framework experience (Vitest, Jest, Mocha)
- [ ] Integration testing experience
- [ ] E2E testing experience (Playwright, Cypress, Puppeteer)
- [ ] Test-driven development (TDD) experience
- [ ] CI/CD pipeline experience
- [ ] Code coverage analysis
- [ ] Bug tracking and reporting

**Nice to Have:**
- [ ] Cloudflare Workers testing
- [ ] D1 database testing
- [ ] API testing tools (Postman, Supertest)
- [ ] Performance testing
- [ ] Security testing
- [ ] Test automation frameworks
- [ ] Property-based testing

### Key Responsibilities

1. **Unit Testing**
   - Write unit tests for crypto functions
   - Test utility functions
   - Test data transformations
   - Achieve high code coverage

2. **Integration Testing**
   - Test API endpoints
   - Test database operations
   - Test R2 file operations
   - Test session management

3. **End-to-End Testing**
   - Test complete user flows
   - Test authentication flows
   - Test task CRUD operations
   - Test admin panel features

4. **Test Infrastructure**
   - Set up test framework (Vitest)
   - Configure CI/CD pipeline
   - Implement code coverage reporting
   - Create test data fixtures

5. **Quality Assurance**
   - Identify test gaps
   - Review test coverage
   - Improve test reliability
   - Reduce flaky tests

### Interview Process

**Step 1: Technical Screen (30 min)**
- Testing experience overview
- Testing framework proficiency
- CI/CD experience
- Quality standards

**Step 2: Technical Interview - Testing (60 min)**
- Testing strategy discussion
- Test organization patterns
- Mocking and fixtures
- Test data management

**Step 3: Technical Interview - Implementation (60 min)**
- Write unit tests for a crypto function
- Write integration tests for an API
- Discuss test organization
- Handle async operations

**Step 4: Coding Challenge (2 hours)**
- Set up test framework
- Write comprehensive tests
- Implement test fixtures
- Generate coverage report

**Step 5: Final Review (30 min)**
- Review test quality
- Discuss testing strategies
- Team fit
- Questions

### Technical Questions to Ask

**Testing Strategy:**
1. "How do you decide what to test?"
2. "What's the difference between unit, integration, and E2E tests?"
3. "How do you handle testing async operations?"
4. "What's your approach to mocking dependencies?"

**Frameworks:**
1. "Compare Vitest vs Jest - which would you choose and why?"
2. "How do you handle test fixtures?"
3. "What's your experience with Playwright vs Cypress?"
4. "How do you test API endpoints?"

**Quality:**
1. "What code coverage percentage do you target?"
2. "How do you identify and fix flaky tests?"
3. "What's your approach to test maintenance?"
4. "How do you balance test speed and coverage?"

**CI/CD:**
1. "How do you integrate tests into CI/CD?"
2. "What's your experience with GitHub Actions?"
3. "How do you handle test failures in CI?"
4. "What's your strategy for slow tests?"

### Red Flags

**Technical:**
- No testing framework experience
- Doesn't understand mocking
- Writes brittle tests
- No CI/CD experience
- Low code coverage standards

**Quality:**
- Doesn't care about test reliability
- Writes tests that pass by accident
- No attention to edge cases
- Dismisses test maintenance

**Communication:**
- Doesn't document test cases
- Can't explain test failures clearly
- Unwilling to improve tests

### Evaluation Criteria

| Criteria | Weight | Score (1-5) |
|----------|--------|-------------|
| Testing framework proficiency | 25% | ___ |
| Test design and organization | 20% | ___ |
| E2E testing experience | 15% | ___ |
| CI/CD integration | 15% | ___ |
| Code coverage standards | 15% | ___ |
| Communication | 10% | ___ |

**Passing Score**: 3.5+ average with no individual score below 3.0

---

## Hiring Timeline

### Week 1: Preparation

| Day | Activity |
|-----|----------|
| 1-2 | Write job descriptions (this document) |
| 2-3 | Post job listings on relevant platforms |
| 3-5 | Receive and screen applications |

### Week 2: Initial Interviews

| Day | Activity |
|-----|----------|
| 1-2 | Technical screens (30 min each) |
| 3-4 | Technical interviews (60 min each) |
| 5 | Select candidates for coding challenge |

### Week 3: Deep Evaluation

| Day | Activity |
|-----|---------- |
| 1-2 | Coding challenges (2-3 hours each) |
| 3 | Review coding challenges |
| 4 | Final interviews for top candidates |
| 5 | Make hiring decisions |

### Week 4: Onboarding

| Day | Activity |
|-----|----------|
| 1-2 | Kickoff meetings with hired subagents |
| 3-5 | Begin Phase 1 implementation |

---

## Compensation Structure

Each subagent will be billed based on usage. Estimated effort per role:

### Backend API Engineer
- **Phase 1 (Foundation)**: 20 hours
- **Phase 2 (Authentication)**: 15 hours
- **Phase 3 (Task CRUD)**: 15 hours
- **Phase 4 (R2 Integration)**: 10 hours
- **Phase 5 (Admin Panel)**: 10 hours
- **Phase 8 (Polish)**: 5 hours
- **Total**: ~75 hours

### Crypto-Security Engineer
- **Phase 2 (Authentication)**: 25 hours
- **Phase 4 (Client Encryption)**: 20 hours
- **Phase 7 (Frontend Integration)**: 10 hours
- **Total**: ~55 hours

### QA Test Engineer
- **Phase 4 (Testing Setup)**: 15 hours
- **Phase 5 (Test Coverage)**: 20 hours
- **Phase 7 (E2E Tests)**: 20 hours
- **Phase 8 (Polish)**: 10 hours
- **Total**: ~65 hours

---

## Success Metrics

### Backend API Engineer
- [ ] All API endpoints implemented and documented
- [ ] Database migrations successful
- [ ] Zero critical security vulnerabilities
- [ ] API response times < 200ms
- [ ] Code reviewed and approved

### Crypto-Security Engineer
- [ ] All encryption functions implemented and tested
- [ ] Zero security vulnerabilities
- [ ] Key derivation meets security standards
- [ ] Challenge-response flow works correctly
- [ ] Performance acceptable (< 100ms for crypto ops)

### QA Test Engineer
- [ ] Unit test coverage > 80%
- [ ] Integration test coverage > 70%
- [ ] All critical paths tested
- [ ] Zero flaky tests
- [ ] CI/CD pipeline passing

---

## Team Communication Plan

### Standups (Daily, 15 min)
- What did you complete yesterday?
- What will you work on today?
- Any blockers?

### Weekly Planning (Monday, 30 min)
- Review previous week's progress
- Plan current week's tasks
- Align priorities

### Bi-Weekly Retrospectives (Friday, 30 min)
- What went well?
- What could be improved?
- Action items for next sprint

### Asynchronous Updates (Daily)
- Post progress updates in shared channel
- Flag blockers early
- Share documentation and notes

---

## Risk Mitigation

### Risk: Hiring Delays
- **Mitigation**: Start interviewing early, have backup candidates
- **Impact**: Phase 1 delayed by 1-2 weeks
- **Fallback**: Architect can handle initial backend work

### Risk: Quality Issues
- **Mitigation**: Rigorous interview process, code reviews
- **Impact**: Technical debt, security vulnerabilities
- **Fallback**: Extended review period, additional testing

### Risk: Communication Gaps
- **Mitigation**: Clear communication protocols, regular standups
- **Impact**: Misaligned expectations, missed deadlines
- **Fallback**: Increase meeting frequency, documentation

### Risk: Scope Creep
- **Mitigation**: Clear requirements, change control process
- **Impact**: Timeline delays, budget overruns
- **Fallback**: Prioritize MVP features, defer enhancements

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-12 | Initial hiring plan |

---

*End of Document*
