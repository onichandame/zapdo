# Troubleshooting Guide

## Common Issues and Solutions

### Key Derivation Failures

#### Issue: "OperationError: The operation failed for an operation-specific reason" during PBKDF2
**Causes:**
- Insufficient password entropy
- Browser memory limits during high iteration counts
- Corrupted salt data

**Solutions:**
```typescript
// Add password entropy validation
function validatePasswordStrength(password: string): void {
  if (calculatePasswordEntropy(password) < 40) {
    throw new CryptoError(
      'CRYPTO_WEAK_PASSWORD',
      'Password too weak. Use at least 12 characters with mixed types.'
    );
  }
}

// Adaptive iteration count for performance
function getOptimalIterationCount(): number {
  // Test device performance
  const start = performance.now();
  crypto.pbkdf2Sync('test', 'salt', 100000, 32, 'sha256');
  const duration = performance.now() - start;
  
  // Adjust based on device capability
  if (duration > 1000) return 300000; // Slower device
  if (duration < 200) return 1000000; // Fast device
  return 600000; // Default
}
```

#### Issue: "NotSupportedError: The algorithm is not supported"
**Cause:** Browser doesn't support PBKDF2 with specified parameters

**Solution:**
```typescript
async function checkCryptographicSupport(): Promise<SupportReport> {
  const support: SupportReport = {
    pbkdf2: false,
    aesGcm: false,
    rsaOaep: false,
    secureRandom: false
  };
  
  try {
    await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    support.pbkdf2 = true;
  } catch (e) {
    console.error('PBKDF2 not supported:', e);
  }
  
  try {
    await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    support.aesGcm = true;
  } catch (e) {
    console.error('AES-GCM not supported:', e);
  }
  
  try {
    await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      false,
      ['encrypt', 'decrypt']
    );
    support.rsaOaep = true;
  } catch (e) {
    console.error('RSA-OAEP not supported:', e);
  }
  
  try {
    crypto.getRandomValues(new Uint8Array(32));
    support.secureRandom = true;
  } catch (e) {
    console.error('Secure random not supported:', e);
  }
  
  return support;
}

// Usage
const support = await checkCryptographicSupport();
if (!support.pbkdf2 || !support.aesGcm) {
  throw new Error('Browser lacks required cryptographic support');
}
```

### Encryption/Decryption Issues

#### Issue: "OperationError: The operation failed for an operation-specific reason" during AES-GCM decryption
**Causes:**
- Incorrect IV used during decryption
- Corrupted ciphertext or auth tag
- Wrong encryption key
- Auth tag validation failure

**Debugging Solution:**
```typescript
async function debugAESGCM(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: ArrayBuffer
): Promise<void> {
  console.group('AES-GCM Debug Info');
  console.log('Key algorithm:', key.algorithm);
  console.log('IV length:', iv.length);
  console.log('Ciphertext length:', ciphertext.byteLength);
  
  try {
    // Test key validity
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new Uint8Array(1));
    console.log('✓ Key appears valid');
  } catch (e) {
    console.error('✗ Key invalid:', e.message);
  }
  
  // Check IV uniqueness (stored in map)
  const ivString = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  if (this.usedIVs.has(ivString)) {
    console.error('✗ IV reuse detected!');
  } else {
    console.log('✓ IV appears unique');
  }
  
  console.groupEnd();
}

// Enhanced decryption with detailed error info
async function decryptWithDebugging(
  encryptedData: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  try {
    const encrypted = base64ToArrayBuffer(encryptedData);
    
    // Auth tag is last 16 bytes
    const ciphertext = encrypted.slice(0, encrypted.byteLength - 16);
    
    await debugAESGCM(key, iv, ciphertext);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
    
  } catch (error) {
    console.error('Decryption failed:', error);
    
    // Provide specific guidance based on error
    if (error.message.includes('The data provided to an operation does not meet the required constraints')) {
      throw new CryptoError(
        'CRYPTO_AUTHENTICATION_FAILED',
        'Decryption failed - possible data corruption or tampering. The auth tag validation failed.'
      );
    }
    
    throw error;
  }
}
```

#### Issue: IV Reuse Detection
**Prevention:**
```typescript
class IVTracker {
  private usedIVs = new Set<string>();
  
  generateAndTrackIV(): Uint8Array {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Check for reuse (extremely unlikely but possible)
    const ivString = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (this.usedIVs.has(ivString)) {
      // Retry with new IV
      console.warn('IV collision detected - regenerating');
      return this.generateAndTrackIV();
    }
    
    this.usedIVs.add(ivString);
    return iv;
  }
  
  // Clean up old IVs periodically
  cleanup(): void {
    if (this.usedIVs.size > 10000) {
      console.warn('Large number of tracked IVs - consider cleanup');
      this.usedIVs.clear();
    }
  }
}
```

### Authentication Issues

#### Issue: Challenge-Response Failing
**Debugging Steps:**
```typescript
async function debugAuthentication(
  userId: string,
  password: string,
  challenge: string
): Promise<void> {
  console.group('Authentication Debug');
  
  try {
    // 1. Fetch user data
    const userData = await api.getUserData(userId);
    console.log('User salt length:', userData.salt.length);
    console.log('Challenge length:', challenge.length);
    
    // 2. Derive KEK
    const kek = await deriveKEK(password, hexToArrayBuffer(userData.salt));
    console.log('✓ KEK derived successfully');
    
    // 3. Derive key pair
    const keyPair = await deriveKeyPair(kek);
    console.log('✓ RSA key pair derived');
    
    // 4. Test encryption/decryption
    const testMessage = 'test-123';
    const encrypted = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      keyPair.publicKey,
      new TextEncoder().encode(testMessage)
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      keyPair.privateKey,
      encrypted
    );
    
    const decryptedText = new TextDecoder().decode(decrypted);
    console.log('✓ Test encryption/decryption works:', decryptedText === testMessage);
    
    // 5. Encrypt actual challenge
    const encryptedChallenge = await encryptChallenge(challenge, keyPair.publicKey);
    console.log('✓ Challenge encrypted');
    
    // 6. Test on client side (if we have private key)
    const testDecrypted = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      keyPair.privateKey,
      base64ToArrayBuffer(encryptedChallenge)
    );
    
    const testChallenge = new TextDecoder().decode(testDecrypted);
    console.log('✓ Challenge decrypts correctly client-side:', testChallenge === challenge);
    
  } catch (error) {
    console.error('Authentication debug failed:', error);
    
    // Specific guidance
    if (error.message.includes('RSA-OAEP')) {
      console.error('❌ RSA key derivation failed - possible KEK issue');
    }
  }
  
  console.groupEnd();
}
```

### Performance Issues

#### Issue: Slow PBKDF2 on Mobile Devices
**Adaptive Solution:**
```typescript
class AdaptiveKeyDerivation {
  private performanceCache = new Map<string, number>();
  
  async getOptimalIterations(password: string, salt: Uint8Array): Promise<number> {
    const saltString = arrayBufferToHex(salt);
    
    // Check cache
    if (this.performanceCache.has(saltString)) {
      return this.performanceCache.get(saltString)!;
    }
    
    // Test performance with smaller iteration count
    const testIterations = 10000;
    const startTime = performance.now();
    
    await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: testIterations, hash: 'SHA-256' },
      await this.importPasswordKey(password),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    const duration = performance.now() - startTime;
    const iterationsPerMs = testIterations / duration;
    
    // Target ~1000ms for derivation
    let optimalIterations;
    if (iterationsPerMs < 600) {
      optimalIterations = 300000; // Slower device
    } else if (iterationsPerMs > 1500) {
      optimalIterations = 1000000; // Fast device
    } else {
      optimalIterations = 600000; // Default
    }
    
    this.performanceCache.set(saltString, optimalIterations);
    return optimalIterations;
  }
  
  private async importPasswordKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
  }
}
```

#### Issue: Large File Encryption Performance
**Streaming Solution:**
```typescript
async function encryptLargeFileOptimized(
  file: File,
  dek: CryptoKey,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const chunks: Array<{ iv: Uint8Array; data: ArrayBuffer }> = [];
  const startTime = performance.now();
  let processedBytes = 0;
  
  for await (const chunk of readFileStream(file, 1024 * 1024)) { // 1MB chunks
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dek,
      chunk
    );
    
    chunks.push({ iv, data: encrypted });
    processedBytes += chunk.byteLength;
    
    if (onProgress) {
      onProgress((processedBytes / file.size) * 100);
    }
  }
  
  // Serialize chunks
  const metadata = { chunkCount: chunks.length, algorithm: 'AES-GCM-256' };
  const metadataBlob = new Blob([JSON.stringify(metadata)]);
  
  const combinedChunks = new Blob([metadataBlob, ...chunks.map(chunk => {
    const ivBlob = new Blob([chunk.iv]);
    const dataBlob = new Blob([chunk.data]);
    return new Blob([ivBlob, dataBlob]);
  })]);
  
  console.log(`Encrypted ${file.size} bytes in ${performance.now() - startTime}ms`);
  return combinedChunks;
}
```

### Browser Compatibility Issues

#### iOS Safari Memory Limits
```typescript
// Detect and handle iOS Safari limitations
function isIOSSafari(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
}

class IOSSafariCryptoAdapter {
  private readonly CHUNK_SIZE = 32 * 1024; // 32KB chunks for iOS
  
  async deriveKeyIOSOptimized(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Use lower iteration count for iOS
    const iterations = isIOSSafari() ? 200000 : 600000;
    
    // Process in smaller batches
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
```

### Memory Leaks

#### Secure Memory Cleanup
```typescript
// Comprehensive memory cleanup
class MemoryManager {
  private activeOperations = new Set<string>();
  private sensitiveBuffers = new Map<string, Uint8Array>();
  
  trackOperation(operationId: string, buffers: Uint8Array[]): void {
    this.activeOperations.add(operationId);
    buffers.forEach((buffer, index) => {
      this.sensitiveBuffers.set(`${operationId}-${index}`, buffer);
    });
  }
  
  cleanupOperation(operationId: string): void {
    // Clear sensitive buffers
    for (const [key, buffer] of this.sensitiveBuffers) {
      if (key.startsWith(operationId)) {
        this.secureClear(buffer);
        this.sensitiveBuffers.delete(key);
      }
    }
    
    this.activeOperations.delete(operationId);
  }
  
  private secureClear(buffer: Uint8Array): void {
    // Multiple overwrite patterns
    buffer.fill(0);
    buffer.fill(0xFF);
    buffer.fill(0);
    
    // Force garbage collection hint
    if (window.gc) {
      window.gc();
    }
  }
  
  // Auto-cleanup on page unload
  enableAutoCleanup(): void {
    window.addEventListener('beforeunload', () => {
      // Clean up all operations
      for (const operationId of this.activeOperations) {
        this.cleanupOperation(operationId);
      }
    });
  }
}

// Usage example
const memoryManager = new MemoryManager();

async function secureEncrypt(content: string, key: CryptoKey): Promise<string> {
  const operationId = crypto.randomUUID();
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(content);
  
  try {
    memoryManager.trackOperation(operationId, [dataBuffer]);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    return arrayBufferToBase64(encrypted);
    
  } finally {
    memoryManager.cleanupOperation(operationId);
  }
}
```

## Debug Mode Implementation

```typescript
// Comprehensive debugging mode
class CryptoDebugger {
  private debugEnabled = false;
  private operationLog: Array<{ timestamp: number; operation: string; details: any }> = [];
  
  enableDebugMode(): void {
    this.debugEnabled = true;
    console.log('🔒 Crypto debug mode enabled');
  }
  
  log(operation: string, details?: any): void {
    if (!this.debugEnabled) return;
    
    const entry = {
      timestamp: Date.now(),
      operation,
      details
    };
    
    this.operationLog.push(entry);
    console.log(`🔐 ${operation}:`, details);
  }
  
  exportLog(): string {
    return JSON.stringify(this.operationLog, null, 2);
  }
  
  clearLog(): void {
    this.operationLog = [];
    console.log('🔐 Debug log cleared');
  }
}

// Global debugger instance
export const cryptoDebugger = new CryptoDebugger();

// Integration with crypto operations
export class DebuggableCryptoManager {
  encryptWithDebug(content: string, key: CryptoKey): string {
    cryptoDebugger.log('encrypt_start', { contentLength: content.length });
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    cryptoDebugger.log('iv_generated', { iv: arrayBufferToHex(iv.buffer) });
    
    try {
      const result = this.encrypt(content, key, iv);
      cryptoDebugger.log('encrypt_success', { resultLength: result.length });
      return result;
    } catch (error) {
      cryptoDebugger.log('encrypt_failed', { error: error.message });
      throw error;
    }
  }
}

// Enable debug mode in development
if (import.meta.env.DEV) {
  cryptoDebugger.enableDebugMode();
}
```

This troubleshooting guide covers the most common issues that can arise during implementation and provides detailed debugging solutions for each problem area.