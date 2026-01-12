---
name: client-side-encryption
description: Enterprise-grade zero-knowledge client-side encryption implementation with Web Crypto API, PBKDF2 key derivation, AES-256-GCM encryption, and RSA-OAEP authentication for SvelteKit applications requiring maximum privacy and security.
license: MIT
scope: project
---

# Zero-Knowledge Client-Side Encryption

## When to use this skill
When implementing enterprise-grade zero-knowledge encryption for SvelteKit applications where:
- All cryptographic operations must happen client-side before server transmission
- Server must never access plaintext user data (zero-knowledge architecture)
- OWASP 2025 security standards are required (600,000+ PBKDF2 iterations)
- Integration with Cloudflare Workers, D1, KV, and R2 is needed
- Challenge-response authentication with RSA-OAEP is required
- Mobile performance and hardware security integration are considerations

## Progressive Loading Architecture

**Core Skill** (this file): Essential patterns and architecture overview
- **Authentication Flows**: [authentication/](authentication/) - Zero-knowledge login, challenge-response, session management
- **Encryption Core**: [encryption/](encryption/) - AES-256-GCM, PBKDF2, cryptographic primitives
- **Key Management**: [key-management/](key-management/) - KEK patterns, secure storage, hardware integration
- **SvelteKit Integration**: [integration/](integration/) - Browser patterns, stores, API clients, performance
- **Security Hardening**: [security/](security/) - Attack prevention, audit procedures, compliance

## Zero-Knowledge Architecture

### Key Hierarchy (Enterprise Grade)
```
User Password (never transmitted)
    │
    ▼
PBKDF2-SHA256 (600,000 iterations, 16-byte salt)
    │
    ▼
KEK (Key Encryption Key) - non-extractable
    │
    ├── encrypt(DEK, KEK, IV) → encrypted_dek (D1 storage)
    │
    └── derive(KEK) → RSA-OAEP key pair (deterministic)
              │
              ├── public_key → verification_keys table
              └── private_key → encryption_keys table (server verification only)

DEK (Data Encryption Key) - 32 bytes, random, session-only
    │
    ├── encrypt(task_content, DEK, IV) → R2 storage
    └── encrypt(temp_content, DEK, IV) → R2 temp storage
```

### Security Specifications
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| PBKDF2 Iterations | 600,000+ | OWASP 2025 standard |
| Salt Length | 16 bytes | Cryptographically secure |
| DEK Length | 32 bytes | AES-256 security |
| IV Length | 12 bytes | GCM recommendation |
| RSA Key Size | 4096-bit | Long-term security |
| Hash Algorithm | SHA-256 | Industry standard |
| Padding | OAEP | Prevents padding oracle |

## Implementation Modules

### 1. Authentication System
See [authentication/](authentication/) for complete zero-knowledge authentication:
- Challenge-response flows with RSA-OAEP
- Session management with Cloudflare KV
- Multi-device authentication support
- Hardware security module integration
- Biometric authentication patterns

### 2. Encryption Engine
See [encryption/](encryption/) for cryptographic implementation:
- Web Crypto API abstraction layer
- AES-256-GCM encryption/decryption
- PBKDF2 key derivation with adaptive iteration
- Binary data handling and encoding
- Performance optimization for mobile

### 3. Key Management
See [key-management/](key-management/) for secure key operations:
- Non-extractable CryptoKey patterns
- IndexedDB secure storage
- Memory protection and clearing
- Hardware-backed key storage
- Key rotation and recovery

### 4. SvelteKit Integration
See [integration/](integration/) for framework-specific patterns:
- Svelte 5 runes-based crypto stores
- API client with presigned R2 URLs
- Progressive enhancement patterns
- Web Workers for heavy operations
- Error handling and user feedback

### 5. Security Hardening
See [security/](security/) for enterprise security:
- XSS and injection prevention
- Timing attack mitigation
- Cryptographic implementation audit
- Compliance verification
- Performance security trade-offs

## Quick Start Patterns

### Core Crypto Manager
```typescript
// src/lib/client/crypto-manager.ts
import { CryptoManager } from '$lib/client/crypto/core';

export const cryptoManager = new CryptoManager();

// Initialize with user password
await cryptoManager.initialize(password, salt);

// Encrypt task content
const encrypted = await cryptoManager.encryptTask(content);

// Decrypt task content
const decrypted = await cryptoManager.decryptTask(encrypted);
```

### Svelte Store Integration
```typescript
// src/lib/client/crypto-store.ts
import { writable } from 'svelte/store';
import { cryptoManager } from './crypto-manager';

export const encryptionState = writable({
  isInitialized: false,
  hasSession: false,
  error: null
});

// Reactive crypto operations
$: encryptedContent = encryptionState.isInitialized 
  ? cryptoManager.encryptTask(content) 
  : null;
```

### API Client Pattern
```typescript
// src/lib/client/api-client.ts
export class ApiClient {
  async uploadTask(content: string) {
    // 1. Encrypt client-side
    const encrypted = await cryptoManager.encryptTask(content);
    
    // 2. Get presigned URL
    const { uploadUrl } = await this.getUploadUrl();
    
    // 3. Direct R2 upload
    await fetch(uploadUrl, {
      method: 'PUT',
      body: encrypted,
      headers: { 'Content-Type': 'application/octet-stream' }
    });
  }
}
```

## Security Requirements

### Browser Security
- **Strict CSP**: Prevent code injection
- **SRI**: Subresource integrity for crypto libraries
- **Secure Context**: HTTPS-only enforcement
- **Memory Management**: Buffer clearing after use
- **XSS Prevention**: No secrets in localStorage

### Cryptographic Security
- **Non-extractable Keys**: Prevent key extraction attacks
- **IV Uniqueness**: Never reuse IVs with same key
- **Auth Tag Validation**: Always verify GCM authentication
- **Constant-time**: Prevent timing attacks where relevant
- **Random Generation**: Cryptographically secure values only

### Performance Security
- **Adaptive Iterations**: Mobile-optimized PBKDF2
- **Web Workers**: Offload heavy crypto operations
- **Key Caching**: Session-only key persistence
- **Progressive Loading**: Load crypto modules on-demand
- **Battery Optimization**: Efficient cryptographic operations

## Testing Requirements

### Unit Testing
- Key derivation with test vectors
- Encryption/decryption correctness
- Error handling for all failure modes
- Performance benchmarks
- Security property verification

### Integration Testing
- Complete authentication flows
- End-to-end encryption workflows
- R2 upload/download cycles
- Session management scenarios
- Error recovery procedures

### Security Testing
- Brute force resistance validation
- Timing attack protection
- Memory leak prevention
- Cross-site scripting prevention
- Cryptographic implementation audit

## Advanced Features

### Hardware Security Integration
- WebAuthn API for hardware-backed keys
- Trusted Platform Module utilization
- Secure Enclave integration
- Biometric authentication binding

### Post-Quantum Preparation
- Hybrid encryption schemes
- Algorithm agility patterns
- Key size considerations
- Migration strategies

### Enterprise Features
- Multi-tenant key isolation
- Audit logging capabilities
- Compliance reporting
- Key escrow patterns
- Zero-trust architecture

## Module Navigation

- **[authentication/](authentication/)** - Complete zero-knowledge authentication system
- **[encryption/](encryption/)** - Core cryptographic operations and primitives
- **[key-management/](key-management/)** - Secure key lifecycle management
- **[integration/](integration/)** - SvelteKit and browser integration patterns
- **[security/](security/)** - Enterprise security hardening and compliance

This skill provides the cryptographic foundation for enterprise-grade zero-knowledge applications while maintaining OWASP 2025 compliance and optimal performance characteristics.