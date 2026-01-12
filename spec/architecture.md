# Eisenhower Task Manager - System Design v1.2

> Last Updated: 2026-01-12
> Status: Final Design
> Version: 1.2 (Login flow redesign with verification keys)

## 1. Overview

A personal task management application using the Eisenhower matrix (importance × urgency coordinate system) with end-to-end encryption. Users can manage tasks with importance and urgency scores (1-10), and all task content is encrypted client-side before storage.

### 1.1 Core Principles

- **Privacy First**: All encryption/decryption happens client-side. Server never sees plaintext.
- **Encryption at Rest**: Task content encrypted before R2 upload. Cloudflare cannot read user data.
- **Cost-Efficient Password Change**: Key Encryption Key (KEK) pattern allows password changes without re-encrypting all content.
- **Metadata Separation**: Unencrypted metadata in D1 for queries, encrypted content in R2.
- **Direct R2 Access**: Backend provides temp credentials, FE directly uploads/downloads from R2.
- **KV Session Storage**: Sessions stored in KV for metadata extensibility.
- **Zero-Knowledge Login**: Server verifies identity using Ed25519 signatures without ever seeing user secrets.

### 1.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit (Cloudflare Workers deployment) |
| Database | Cloudflare D1 (SQLite) |
| Object Storage | Cloudflare R2 (S3-compatible) |
| Session Storage | Cloudflare KV |
| Authentication | Cookie-based sessions (KV-backed, no TTL on cookie) |
| Signatures | Ed25519 (stateless challenge-response) |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| Language | TypeScript (strict mode) |

---

## 2. Architecture

### 2.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     SvelteKit (Cloudflare Worker)               │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │    Frontend UI   │  │    API Routes (+server.ts)           │ │
│  │ Eisenhower Matrix│  │  • Auth: /api/auth/*                 │ │
│  │ Task Management  │  │  • Tasks: /api/tasks/*               │ │
│  │ File Upload UI   │  │  • Admin: /api/admin/*               │ │
│  │ Admin Panel      │  │  • R2 Credentials: /api/r2/*         │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Client-Side Encryption Layer (Web Crypto API)           │  │
│  │  • Key derivation (PBKDF2)                               │  │
│  │  • Encryption (AES-256-GCM)                              │  │
│  │  • All crypto before R2 upload                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare KV (Sessions)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  sessions (key-value store)                               │  │
│  │                                                            │  │
│  │  Key: session:{session_id}                                │  │
│  │  Value: {                                                 │  │
│  │    "user_id": 123,                                        │  │
│  │    "created_at": "2026-01-12T10:00:00Z",                  │  │
│  │    "expires_at": "2026-01-15T10:00:00Z",                  │  │
│  │    "device_fingerprint": "sha256(... )",  // Future use   │  │
│  │    "user_agent": "...",                    // Future use   │  │
│  │    "ip": "..."                          // Future use      │  │
│  │  }                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Cloudflare D1 (SQLite)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  users                                                     │  │
│  │  ┌──────────┬────────────────────────────────────────┐   │  │
│  │  │ Field    │ Type                                    │   │  │
│  │  ├──────────┼────────────────────────────────────────┤   │  │
│  │  │ id       │ INTEGER PRIMARY KEY AUTOINCREMENT       │   │  │
│  │  │ created_at│ TEXT NOT NULL (ISO 8601)               │   │  │
│  │  └──────────┴────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  encryption_keys                                          │  │
│  │  ┌──────────┬────────────────────────────────────────┐   │  │
│  │  │ Field    │ Type                                    │   │  │
│  │  ├──────────┼────────────────────────────────────────┤   │  │
│  │  │ user_id  │ INTEGER PRIMARY KEY REFERENCES users(id)│   │  │
│  │  │ encrypted_dek │ TEXT NOT NULL                      │   │  │
│  │  │ salt     │ TEXT NOT NULL                           │   │  │
│  │  │ created_at│ TEXT NOT NULL (ISO 8601)               │   │  │
│  │  └──────────┴────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  verification_keys                                        │  │
│  │  ┌──────────┬────────────────────────────────────────┐   │  │
│  │  │ Field    │ Type                                    │   │  │
│  │  ├──────────┼────────────────────────────────────────┤   │  │
│  │  │ user_id  │ INTEGER PRIMARY KEY REFERENCES users(id)│   │  │
│  │  │ public_key│ TEXT NOT NULL                          │   │  │
│  │  │ created_at│ TEXT NOT NULL (ISO 8601)               │   │  │
│  │  └──────────┴────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  tasks                                                     │  │
│  │  ┌──────────┬────────────────────────────────────────┐   │  │
│  │  │ Field    │ Type                                    │   │  │
│  │  ├──────────┼────────────────────────────────────────┤   │  │
│  │  │ id       │ INTEGER PRIMARY KEY AUTOINCREMENT       │   │  │
│  │  │ user_id  │ INTEGER NOT NULL REFERENCES users(id)   │   │  │
│  │  │ importance│ INTEGER NOT NULL (1-10)                │   │  │
│  │  │ urgency  │ INTEGER NOT NULL (1-10)                 │   │  │
│  │  │ has_content │ INTEGER NOT NULL DEFAULT 1           │   │  │
│  │  │ created_at│ TEXT NOT NULL (ISO 8601)               │   │  │
│  │  │ updated_at│ TEXT NOT NULL (ISO 8601)               │   │  │
│  │  └──────────┴────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare R2                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /users/{user_id}/tasks/{task_id}.enc                    │  │
│  │  Content: base64(encrypted_content)                      │  │
│  │  Format: Encrypted plain text task content               │  │
│  │  Encryption: AES-256-GCM with DEK                        │  │
│  │                                                              │  │
│  │  /temp/{user_id}/{temp_file_uuid}.enc                    │  │
│  │  Content: base64(encrypted_content)                      │  │
│  │  Lifecycle: Manual cleanup via admin panel only          │  │
│  │  (R2 does not support auto-expiration)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### Task Creation Flow

```
1. User creates task in UI
2. Client:
   a. Generate temp file UUID
   b. Encrypt task content with DEK
   c. base64 encode the encrypted content
   d. Get presigned PUT URL from /api/r2/temp/:temp_file_id/upload
   e. Upload directly to R2: /temp/{user_id}/{temp_file_uuid}.enc
   f. Call API: POST /api/tasks (with r2_temp_key)
3. Server:
   a. Create D1 task record with has_content=1
   b. Move R2: /temp/{user_id}/{temp_file_uuid}.enc 
              → /users/{user_id}/tasks/{task_id}.enc
   c. On failure: delete temp file, return error
4. Return task ID to client
```

#### Task Reading Flow (Corrected - Direct R2 with Presigned URLs)

```
1. Client calls API: GET /api/r2/tasks/:id/download
2. Server:
   a. Verify session (KV)
   b. Generate presigned URL for R2 GET (readonly)
   c. Return: { url, expires_in }
3. Client:
   a. Download content from R2 using presigned URL
   b. Decode base64
   c. Decrypt with DEK
   d. Display plaintext content
```

**Why this is better:**
- No server-side R2 bandwidth costs
- Direct client-to-R2 download (faster)
- Server only generates short-lived credentials

#### Task Content Upload Flow

```
1. Client calls API: GET /api/r2/tasks/:id/upload
2. Server:
   a. Verify session (KV)
   b. Generate presigned URL for R2 PUT (write to specific task file)
   c. Return: { url, expires_in }
3. Client:
   a. Encrypt content with DEK
   b. base64 encode
   c. PUT directly to R2 using presigned URL
```

#### Task Deletion Flow

```
1. Client calls API: DELETE /api/tasks/:id
2. Server:
   a. Delete R2: /users/{user_id}/tasks/{task_id}.enc
   b. If R2 fails: update has_content=0, return error (retry later)
   c. If R2 succeeds: delete D1 record
3. Client: Show confirmation
```

---

## 3. Authentication System

### 3.1 Key Hierarchy

```
User Password (never sent to server)
    │
    ▼
PBKDF2-SHA256 (100,000 iterations, salt)
    │
    ▼
KEK (Key Encryption Key) - derived from password
    │
    ├── encrypt(DEK, KEK, IV) → stored as encryption_keys.encrypted_dek
    │
    └── derive(KEK) → Public Key (deterministic, for login verification)
              │
              └── Private Key → Stored by server (for verification only)

DEK (Data Encryption Key) - 32 bytes, random, per user
    │
    ├── encrypt(task_content, DEK, IV) → base64 → R2
    └── encrypt(temp_content, DEK, IV) → base64 → R2 temp
```

### 3.2 Why This Works

**Server holds**: Private key (for decryption/verification only)

**Client derives**: Public key from KEK (password + salt, deterministic)

**Verification flow**:
1. Server sends random challenge text
2. Client encrypts with public key (derived from password)
3. Server decrypts with private key
4. Server compares: decrypted == original challenge

**Security**:
- Server never sees password, KEK, or DEK
- Private key only used for decryption (never for encryption)
- Public key is deterministic (can be regenerated from password)

### 3.3 Registration Flow

**Client generates and sends public key:**

```
1. User enters password (NEVER sent to server)
2. Client generates:
   - Salt (16 random bytes, hex encoded)
   - DEK (32 random bytes)
   - RSA key pair from KEK (public_key, private_key)
3. Client derives KEK:
   KEK = PBKDF2(password, salt, 100,000 iterations)
4. Client derives key pair from KEK:
   { publicKey, privateKey } = RSA-OAEP from KEK
5. Client encrypts DEK with KEK:
   encrypted_dek = AES-GCM(DEK, KEK, IV)
6. Client calls API: POST /api/auth/register
   Payload: { encrypted_dek, salt, public_key }
7. Server:
   a. Generate user_id (D1 auto-increment)
   b. Store in D1:
      - users(id, created_at)
      - encryption_keys(user_id, encrypted_dek, salt, private_key, created_at)
   c. Create KV session (3-day TTL)
   d. Return: { user_id }
8. Cookie: session_id set (forever, no TTL)
9. Client stores DEK in memory (session only)
```

**Register API Request:**
```json
POST /api/auth/register
{
  "encrypted_dek": "base64(IV || encrypted_DEK || auth_tag)",
  "salt": "hex(salt)",
  "public_key": "base64(RSA public key)"
}
```

**Register API Response (201):**
```json
{
  "user_id": 123,
  "message": "Registration successful"
}
```

**Cookie Set:**
```
Set-Cookie: session_id={uuid}; HttpOnly; Secure; SameSite=Lax; Path=/
```

### 3.4 Login Flow (Simplified)

**Two-step challenge-response with server-held private key:**

```
┌─────────┐                                      ┌────────────┐
│  Client │                                      │   Server   │
└────┬────┘                                      └──────┬─────┘
     │                                                   │
     │  1. POST /api/auth/login { user_id }              │
     ├──────────────────────────────────────────────────>│
     │                                                   │
     │                                    2. Generate challenge (random text)
     │                                    3. Store challenge in KV (5 min TTL)
     │                                    4. Return { challenge }
     │<──────────────────────────────────────────────────┤
     │                                                   │
     │  5. Derive KEK from password + salt               │
     │  6. Derive public_key from KEK (RSA-OAEP)         │
     │  7. Encrypt challenge with public_key             │
     │                                                   │
     │  8. POST /api/auth/verify { user_id, encrypted_challenge }    │
     ├──────────────────────────────────────────────────>│
     │                                                   │
     │                                    9. Fetch private_key from D1
     │                                    10. Decrypt encrypted_challenge with private_key
     │                                    11. Compare: decrypted == original challenge
     │                                    12. Create KV session (3-day TTL)
     │                                    13. Set session cookie
     │                                    14. Return { success: true }
     │<──────────────────────────────────────────────────┤
     │                                                   │
     │  15. Store DEK in memory (session only)           │
     │  16. Redirect to dashboard                        │
     │                                                   │
```

**Login Step 1 Request:**
```json
POST /api/auth/login
{
  "user_id": 123
}
```

**Login Step 1 Response:**
```json
{
  "challenge": "random-challenge-text-abc123..."
}
```

**Login Step 2 Request:**
```json
POST /api/auth/verify
{
  "user_id": 123,
  "encrypted_challenge": "base64(RSA-encrypted challenge)"
}
```

**Login Step 2 Response (200):**
```json
{
  "success": true,
  "message": "Login successful"
}
```

**Why this is better:**
- Simpler than Ed25519 verification keys
- Public key is deterministic from KEK (no storage needed on client)
- Server holds private key for verification only
- Supports concurrent logins (each challenge is independent)
- No verification_keys table needed (private_key stored in encryption_keys)

### 3.5 Session Storage (KV)

**Cookie:**
- Contains only `session_id` (UUID)
- No expiration (forever)
- HttpOnly, Secure, SameSite=Lax

**KV Storage:**

```
Key: session:{session_id}
Value: {
  "user_id": 123,
  "created_at": "2026-01-12T10:00:00Z",
  "expires_at": "2026-01-15T10:00:00Z",  // 3 days from creation
  "device_fingerprint": "sha256(... )",  // Future use
  "user_agent": "Mozilla/5.0...",  // Future use
  "ip": "203.0.113.1"  // Future use
}
TTL: 3 days (604800 seconds)

Key: challenge:{user_id}:{timestamp}
Value: {
  "challenge": "original challenge text",
  "expires_at": "2026-01-12T10:05:00Z"  // 5 minutes
}
TTL: 300 seconds (5 minutes)
```

### 3.6 Password Change Flow

```
1. User proves identity via login flow (already has DEK in memory)
2. Client:
   a. Generate new salt (16 bytes)
   b. Derive new KEK from new password + new salt
   c. Re-encrypt DEK with new KEK
   d. Derive new public_key from new KEK (RSA-OAEP)
   e. Call API: PUT /api/auth/password
      Payload: { new_encrypted_dek, new_salt, new_public_key }
3. Server:
   a. Update encryption_keys.encrypted_dek
   b. Update encryption_keys.salt
   c. Update encryption_keys.private_key (new key pair)
4. Result: DEK unchanged, only its encrypted form changed
   → No re-encryption of R2 content needed
   → New key pair generated from new password
```

---

## 4. Encryption Architecture

### 4.1 Complete Key Hierarchy

```
User Password (never sent to server)
    │
    ▼
PBKDF2-SHA256 (100,000 iterations, salt)
    │
    ▼
KEK (Key Encryption Key) - derived from password
    │
    ▼
encrypt(DEK, KEK, IV) → stored as encryption_keys.encrypted_dek
    │
    ▼
DEK (Data Encryption Key) - 32 bytes, random, per user
    │
    ├── encrypt(task_content, DEK, IV) → base64 → R2 /users/{user_id}/tasks/{task_id}.enc
    ├── encrypt(temp_content, DEK, IV) → base64 → R2 /temp/{user_id}/{uuid}.enc
    │
    └── encrypt(verification_private_key, DEK, IV) → R2 /users/{user_id}/verification_key.enc
              (backup of verification key, encrypted with DEK)

Ed25519 Verification Key Pair (separate from encryption)
    │
    ├── verification_private_key → Client memory only (encrypted backup in R2)
    └── verification_public_key → D1 verification_keys table
```
1. User enters password (NEVER sent to server)
2. Client generates:
   - Salt (16 random bytes, hex encoded)
   - DEK (32 random bytes)
3. Client derives KEK:
   KEK = PBKDF2(password, salt, 100,000 iterations)
4. Client encrypts DEK with KEK:
   encrypted_dek = AES-GCM(DEK, KEK, IV)
5. Client calls API: POST /api/auth/register
   Payload: { encrypted_dek, salt }
6. Server:
   a. Generate user_id (D1 auto-increment)
   b. Store in D1:
      - users(id, created_at)
      - encryption_keys(user_id, encrypted_dek, salt, created_at)
   c. Create KV session (see section 3.3)
   d. Return: { user_id }
7. Cookie: session_id set (forever, no TTL)
8. Client stores DEK in memory (session only)
```

**Register API Request:**
```json
POST /api/auth/register
{
  "encrypted_dek": "base64(IV || encrypted_DEK || auth_tag)",
  "salt": "hex(salt)"
}
```

**Register API Response (201):**
```json
{
  "user_id": 123,
  "message": "Registration successful"
}
```

**Cookie Set:**
```
Set-Cookie: session_id={uuid}; HttpOnly; Secure; SameSite=Lax; Path=/
```

### 3.2 Login Flow (Corrected)

**Server verifies identity using challenge-response:**

```
1. Client calls API: POST /api/auth/login
   Payload: { user_id }
2. Server:
   a. Fetch from D1: encryption_keys(user_id).encrypted_dek
   b. Generate server_nonce (16 random bytes, hex)
   c. Store challenge in KV temporarily (5 min expiry)
   d. Return: { server_nonce, encrypted_dek }
3. Client:
   a. Derive KEK from password + salt
   b. Decrypt DEK from encrypted_dek
   c. Encrypt server_nonce with DEK:
      client_response = AES-GCM(server_nonce, DEK, IV)
   d. Call API: POST /api/auth/verify
      Payload: { user_id, client_response }
4. Server:
   a. Fetch server_nonce from KV
   b. Decrypt client_response with DEK (fetched from D1)
   c. If decrypted == server_nonce: identity verified!
   d. Create KV session (see section 3.3)
   e. Return: { success: true }
5. Cookie: session_id set (forever, no TTL)
6. Client: Redirect to dashboard
```

**Login Step 1 Request:**
```json
POST /api/auth/login
{
  "user_id": 123
}
```

**Login Step 1 Response:**
```json
{
  "server_nonce": "a1b2c3d4e5f6...",
  "encrypted_dek": "XYZ789..."
}
```

**Login Step 2 Request:**
```json
POST /api/auth/verify
{
  "user_id": 123,
  "client_response": "base64(IV || encrypted_nonce || auth_tag)"
}
```

**Login Step 2 Response (200):**
```json
{
  "success": true,
  "message": "Login successful"
}
```

**Why challenge-response?**
- Server never sees password
- Server never sees DEK in plaintext
- Prevents replay attacks (server_nonce ensures freshness)

### 3.3 Session Storage (KV)

**Cookie:**
- Contains only `session_id` (UUID)
- No expiration (forever)
- HttpOnly, Secure, SameSite=Lax

**KV Storage:**

```
Key: session:{session_id}
Value: {
  "user_id": 123,
  "created_at": "2026-01-12T10:00:00Z",
  "expires_at": "2026-01-15T10:00:00Z",  // 3 days from creation
  "device_fingerprint": "sha256(user_agent + ip)",  // Future use
  "user_agent": "Mozilla/5.0...",  // Future use
  "ip": "203.0.113.1"  // Future use
}
TTL: 3 days (604800 seconds)
```

**Session Validation:**
```
1. Browser sends cookie: session_id={uuid}
2. Server:
   a. Fetch from KV: session:{uuid}
   b. If not found: 401 Unauthorized
   c. If expired: 401 Unauthorized
   d. If valid: proceed with request
```

**Session Creation (on register/login):**
```
1. Generate session_id (UUID)
2. Store in KV with 3-day TTL
3. Set cookie: session_id={uuid}
```

**Session Deletion (on logout):**
```
1. Delete from KV: session:{uuid}
2. Clear cookie
```

### 3.4 Password Change Flow

```
1. User proves knowledge of OLD password (via login verify step)
2. Client:
   a. Generate new salt (16 bytes)
   b. Derive new KEK from new password + new salt
   c. Re-encrypt existing DEK with new KEK
   d. Call API: PUT /api/auth/password
      Payload: { new_encrypted_dek, new_salt }
3. Server:
   a. Update encryption_keys.encrypted_dek
   b. Update encryption_keys.salt
4. Result: DEK unchanged, only its encrypted form changed
   → No re-encryption of R2 content needed
```

---

## 4. Encryption Architecture

### 4.1 Key Hierarchy

```
User Password (never sent to server)
    │
    ▼
PBKDF2-SHA256 (100,000 iterations, salt)
    │
    ▼
KEK (Key Encryption Key) - derived from password
    │
    ▼
encrypt(DEK, KEK, IV) → stored as encryption_keys.encrypted_dek
    │
    ▼
DEK (Data Encryption Key) - 32 bytes, random, per user
    │
    ▼
encrypt(task_content, DEK, IV) → base64 → R2
encrypt(temp_content, DEK, IV) → base64 → R2 temp
```

### 4.2 Encryption Specifications

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2-SHA256 |
| Iterations | 100,000 |
| DEK Length | 32 bytes (256 bits) |
| Salt Length | 16 bytes |
| IV Length | 12 bytes |
| Auth Tag | 16 bytes (appended to ciphertext) |
| Output Format | base64(IV + ciphertext + auth_tag) |

---

## 5. API Reference

### 5.1 Authentication

#### POST /api/auth/register

Create a new user account with encryption keys and login verification key pair.

**Request:**
```json
{
  "encrypted_dek": "base64(IV || encrypted_DEK || auth_tag)",
  "salt": "hex(salt)",
  "public_key": "base64(RSA public key)"
}
```

**Response (201):**
```json
{
  "user_id": 123,
  "message": "Registration successful"
}
```

**Actions:**
1. Generate user_id (D1 auto-increment)
2. Generate RSA key pair (public_key, private_key) - client derives from KEK
3. Insert into users table
4. Insert into encryption_keys table (stores public_key, private_key)
5. Create KV session (3-day TTL)
6. Set session cookie

**Client Pre-Registration:**
1. Generate salt (16 bytes), DEK (32 bytes)
2. Derive KEK from password + salt
3. Derive RSA key pair from KEK (publicKey, privateKey)
4. Encrypt DEK with KEK
5. Send { encrypted_dek, salt, publicKey } to server

---

#### POST /api/auth/login

Initiate login by getting challenge.

**Request:**
```json
{
  "user_id": 123
}
```

**Response (200):**
```json
{
  "challenge": "random-challenge-text-abc123..."
}
```

**Actions:**
1. Generate challenge (32 random bytes, human-readable)
2. Store in KV: challenge:{user_id}:{timestamp} with 5-minute TTL
3. Return challenge (plaintext)

---

#### POST /api/auth/verify

Verify challenge and create session.

**Request:**
```json
{
  "user_id": 123,
  "encrypted_challenge": "base64(RSA-encrypted challenge)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful"
}
```

**Response (401) - Invalid challenge:**
```json
{
  "error": "Invalid challenge",
  "code": "AUTH_FAILED"
}
```

**Actions:**
1. Fetch challenge from KV: challenge:{user_id}:*
2. If not found or expired: return 401
3. Fetch private_key from D1 encryption_keys table
4. Decrypt encrypted_challenge with RSA private_key
5. If decrypted == original challenge: success!
6. Create KV session (3-day TTL)
7. Delete challenge from KV
8. Set session cookie
9. Return success

---

#### PUT /api/auth/password

Change password without re-encrypting R2 content.

**Request:**
```json
{
  "new_encrypted_dek": "base64(IV || encrypted_DEK || auth_tag)",
  "new_salt": "hex(salt)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Actions:**
1. Update encryption_keys.encrypted_dek
2. Update encryption_keys.salt

---

#### POST /api/auth/logout

End current session.

**Request:** (empty)

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Actions:**
1. Delete KV session
2. Clear cookie

---

### 5.2 R2 Credentials

#### GET /api/r2/tasks/:id/download

Get presigned URL for downloading task content.

**Response (200):**
```json
{
  "download_url": "https://r2.bucket.com/users/123/tasks/456.enc?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Signature=...&X-Amz-Expires=3600",
  "expires_in": 3600
}
```

**Actions:**
1. Verify session (KV)
2. Verify task belongs to user
3. Generate presigned URL for GET from /users/{user_id}/tasks/{task_id}.enc
4. URL expires in 1 hour

---

#### GET /api/r2/tasks/:id/upload

Get presigned URL for uploading task content.

**Response (200):**
```json
{
  "upload_url": "https://r2.bucket.com/users/123/tasks/456.enc?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Signature=...&X-Amz-Expires=3600",
  "expires_in": 3600
}
```

**Actions:**
1. Verify session (KV)
2. Verify task belongs to user
3. Generate presigned URL for PUT to /users/{user_id}/tasks/{task_id}.enc
4. URL expires in 1 hour

---

#### GET /api/r2/temp/:temp_file_id/upload

Get presigned URL for uploading to temp directory.

**Response (200):**
```json
{
  "upload_url": "https://r2.bucket.com/temp/123/temp-a1b2c3.enc?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Signature=...&X-Amz-Expires=3600",
  "expires_in": 3600
}
```

**Actions:**
1. Verify session (KV)
2. Generate presigned URL for PUT to /temp/{user_id}/{temp_file_id}.enc
3. URL expires in 1 hour

---

### 5.3 Tasks

#### GET /api/tasks

List tasks with cursor-based pagination.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| cursor | string | No | Pagination cursor (from previous response) |
| limit | integer | No | Number of tasks to return (default: 20, max: 100) |
| importance_min | integer | No | Minimum importance score (1-10) |
| importance_max | integer | No | Maximum importance score (1-10) |
| urgency_min | integer | No | Minimum urgency score (1-10) |
| urgency_max | integer | No | Maximum urgency score (1-10) |
| has_content | boolean | No | Filter by content existence |

**Response (200):**
```json
{
  "tasks": [
    {
      "id": 456,
      "importance": 8,
      "urgency": 5,
      "has_content": true,
      "created_at": "2026-01-12T10:30:00Z",
      "updated_at": "2026-01-12T10:30:00Z"
    }
  ],
  "next_cursor": "abc123...",
  "has_more": true
}
```

**Actions:**
1. Verify session (KV)
2. Query tasks table filtered by user_id and optional filters
3. Return tasks with pagination cursor

---

#### POST /api/tasks

Create a new task.

**Request:**
```json
{
  "importance": 8,
  "urgency": 5,
  "r2_temp_key?": "temp-uuid-123"
}
```

**Response (201):**
```json
{
  "id": 456,
  "created_at": "2026-01-12T10:30:00Z"
}
```

**Actions:**
1. Verify session (KV)
2. Generate task_id (D1 auto-increment)
3. If r2_temp_key provided:
   a. Move R2: /temp/{user_id}/{temp_file_id}.enc → /users/{user_id}/tasks/{task_id}.enc
   b. If move fails: delete temp file, return error
   c. Set has_content = 1
4. If no r2_temp_key:
   a. Create task with has_content = 0 (content to be uploaded later)
5. Insert task record
6. Return task ID

---

#### DELETE /api/tasks/:id

Delete a task and its content.

**Response (200):**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

**Response (409) - if R2 deletion fails:**
```json
{
  "success": false,
  "error": "R2 deletion failed",
  "has_content": 0,
  "message": "Task marked as dangling, retry deletion later"
}
```

**Actions:**
1. Verify session (KV)
2. Verify task belongs to user
3. Delete R2: /users/{user_id}/tasks/{task_id}.enc
4. If R2 fails: update has_content=0, return error
5. If R2 succeeds: delete D1 record

---

### 5.4 Admin

#### GET /api/admin/temp-files

List all temp files (for cleanup).

**Response (200):**
```json
{
  "temp_files": [
    {
      "user_id": 123,
      "file_id": "temp-uuid-456",
      "size": 1024,
      "created_at": "2026-01-10T10:00:00Z"
    }
  ]
}
```

---

#### DELETE /api/admin/temp-files/:user_id/:file_id

Delete a specific temp file.

**Response (200):**
```json
{
  "success": true,
  "message": "Temp file deleted"
}
```

---

#### GET /api/admin/dangling-tasks

List tasks without R2 content.

**Response (200):**
```json
{
  "tasks": [
    {
      "id": 456,
      "user_id": 123,
      "created_at": "2026-01-12T10:30:00Z"
    }
  ]
}
```

---

#### POST /api/admin/refresh-dangling-flag

Recalculate has_content flag for ALL tasks based on actual R2 content.

**Request:** (empty, no arguments)

**Response (200):**
```json
{
  "success": true,
  "new_dangling_found": 5,
  "marked_as_not_dangling": 3,
  "message": "Dangling flags refreshed for all users"
}
```

**Actions:**
1. For ALL users:
   a. List all R2 task keys: /users/*/tasks/*.enc
   b. Build set of existing (user_id, task_id) pairs
   c. Update tasks.has_content = 1 for tasks in R2
   d. Update tasks.has_content = 0 for tasks not in R2
2. Count:
   - new_dangling_found: tasks newly marked as dangling (was 1, now 0)
   - marked_as_not_dangling: tasks no longer dangling (was 0, now 1)

---

#### DELETE /api/admin/dangling-tasks/:id

Force delete a dangling task (without R2 content).

**Response (200):**
```json
{
  "success": true,
  "message": "Dangling task deleted"
}
```

---

#### POST /api/admin/cleanup

Batch cleanup operation.

**Request:**
```json
{
  "remove_temp_older_than_hours?": 24,
  "remove_dangling?": true
}
```

**Response (200):**
```json
{
  "success": true,
  "temp_files_removed": 10,
  "dangling_tasks_removed": 5
}
```

---

## 6. File Upload Flow (Corrected)

### 6.1 Upload Sequence

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │  SvelteKit API  │     │      R2      │     │     KV      │
└──────┬──────┘     └────────┬────────┘     └──────┬──────┘     └──────┬──────┘
       │                      │                     │                     │
       │  1. Generate UUID    │                     │                     │
       │<─────────────────────│                     │                     │
       │                      │                     │                     │
       │  2. GET /api/r2/temp/:id/upload            │                     │
       │─────────────────────>│                     │                     │
       │                      │                     │                     │
       │                      │  3. Generate presigned PUT URL            │
       │                      │     (1 hour expiry)                       │
       │                      │     Store challenge in KV                 │
       │<─────────────────────┼─────────────────────│                     │
       │                      │                     │                     │
       │  4. Encrypt content  │                     │                     │
       │  5. base64 encode    │                     │                     │
       │                      │                     │                     │
       │  6. PUT to R2 temp   │                     │                     │
       │  /temp/{user_id}/{uuid}.enc               │                     │
       │──────────────────────┼────────────────────>│                     │
       │                      │                     │                     │
       │                      │                     │   201 Created       │
       │<─────────────────────┼─────────────────────│                     │
       │                      │                     │                     │
       │  7. POST /api/tasks  │                     │                     │
       │  (with r2_temp_key)  │                     │                     │
       │─────────────────────>│                     │                     │
       │                      │                     │                     │
       │                      │  8. Move temp → target                    │
       │                      │     DELETE /temp/{uuid}.enc               │
       │                      │     PUT /users/{user_id}/tasks/{id}.enc   │
       │                      ├────────────────────>│                     │
       │                      │                     │                     │
       │                      │   200 OK            │                     │
       │<─────────────────────┼─────────────────────│                     │
       │                      │                     │                     │
```

### 6.2 Temp File Pattern

**R2 Path:** `/temp/{user_id}/{temp_file_uuid}.enc`

**Naming:** UUID v4 (random, not time-based)

**Purpose:** 
- Holds encrypted content during upload
- Allows client to upload directly to R2 before task ID is known
- Prevents incomplete uploads from polluting task directory

**Cleanup:**
- Admin panel manual deletion ONLY
- No automatic cleanup on login
- No automatic expiration (R2 limitation)

---

## 7. R2 Structure

### 7.1 Path Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Task Content | `/users/{user_id}/tasks/{task_id}.enc` | `/users/123/tasks/456.enc` |
| Temp Files | `/temp/{user_id}/{uuid}.enc` | `/temp/123/temp-a1b2c3d4.enc` |

**Note**: No verification key backup needed - key pair is deterministically generated from KEK (password + salt). Same password always produces same key pair.

### 7.2 Presigned URL Generation

**S3-Compatible API:**

```typescript
// Pseudocode for presigned URL generation
function generatePresignedUrl(
  method: 'GET' | 'PUT',
  path: string,
  expiresInSeconds: number = 3600
): string {
  const timestamp = Date.now() / 1000;
  const expiration = timestamp + expiresInSeconds;
  
  // AWS Signature Version 4
  const credential = `${accessKeyId}/${date}/${region}/s3/aws4_request`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  
  // ... AWS signature calculation ...
  
  return `https://${bucket}.${endpoint}/${path}?` +
    `X-Amz-Algorithm=AWS4-HMAC-SHA256&` +
    `X-Amz-Credential=${encodeURIComponent(credential)}&` +
    `X-Amz-Date=${dateHeader}&` +
    `X-Amz-Expires=${expiresInSeconds}&` +
    `X-Amz-SignedHeaders=${encodeURIComponent(signedHeaders)}&` +
    `X-Amz-Signature=${signature}`;
}
```

### 7.3 Content Format

All R2 files contain:

```
base64(IV || Encrypted Content || Auth Tag)
```

Example:
```
R2 File Content:
"ABC123xyz789base64encodedstring..."

Client Decrypts:
1. base64 decode → [12 bytes IV][N bytes ciphertext][16 bytes auth tag]
2. Extract IV, ciphertext, auth tag
3. AES-GCM decrypt with DEK
4. Return plaintext
```

---

## 8. Database Schema

### 8.1 D1 Tables

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL
);

-- Encryption keys table (includes login verification key pair)
CREATE TABLE encryption_keys (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  encrypted_dek TEXT NOT NULL,
  salt TEXT NOT NULL,
  public_key TEXT NOT NULL,          -- RSA public key (for challenge encryption)
  private_key TEXT NOT NULL,         -- RSA private key (for challenge decryption)
  created_at TEXT NOT NULL
);

-- Tasks table
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  importance INTEGER NOT NULL CHECK (importance >= 1 AND importance <= 10),
  urgency INTEGER NOT NULL CHECK (urgency >= 1 AND urgency <= 10),
  has_content INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_quadrant ON tasks(importance, urgency);
CREATE INDEX idx_tasks_user_quadrant ON tasks(user_id, importance, urgency);
CREATE INDEX idx_tasks_dangling ON tasks(user_id, has_content) WHERE has_content = 0;
```

### 8.2 KV Storage

**Sessions:**

```
Key: session:{session_id}
Value: JSON object with user_id, metadata, expiry
TTL: 604800 seconds (3 days)
```

**Login Challenges:**

```
Key: challenge:{user_id}:{timestamp}
Value: {
  "challenge": "original challenge text",
  "expires_at": "2026-01-12T10:05:00Z"  // 5 minutes
}
TTL: 300 seconds (5 minutes)
```

---

## 9. Security Considerations

### 9.1 Data Privacy

| Data | Stored Where | Encrypted? | Server Access |
|------|--------------|------------|---------------|
| Password | N/A | N/A | Never (client-side only) |
| Task Content | R2 | Yes (AES-256-GCM) | No (client decrypts) |
| Task Metadata | D1 | No | Yes (for queries) |
| DEK | D1 | Yes (with KEK) | No (only encrypted form) |
| Salt | D1 | No | Yes (needed for login) |
| Session Cookie | Browser | N/A | Yes (but HTTP-only) |
| Session Data | KV | No | Yes (metadata only) |
| Public Key | D1 | No | Yes (identity verification) |
| Private Key | D1 | No | Yes (challenge decryption only) |

### 9.2 Session Security

**KV Session Benefits:**
- Device fingerprinting ready (future use)
- IP tracking ready (future use)
- Per-device logout ready (future use)
- Session revocation capability
- 3-day TTL prevents indefinite sessions

**Future Security Features (Post-MVP):**
- Detect suspicious logins (new device/IP)
- Require re-authentication for sensitive actions
- Multi-factor authentication
- Session audit log

### 9.3 Password Recovery

**There is NO password recovery.**

If user forgets password:
1. All task content is permanently unrecoverable
2. User must create new account
3. Display prominent warning during registration

---

## 10. Error Handling

### 10.1 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful operations |
| 201 | Created | Resource creation |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Invalid/missing session or failed login |
| 403 | Forbidden | Not authorized for resource |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Operation failed (e.g., R2 deletion) |
| 500 | Internal Server Error | Server error |

### 10.2 Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### 10.3 Common Error Codes

| Code | Meaning | Response |
|------|---------|----------|
| SESSION_EXPIRED | KV session TTL expired | 401, redirect to login |
| SESSION_INVALID | Session not found in KV | 401, redirect to login |
| CHALLENGE_EXPIRED | Login challenge expired | 401, restart login |
| CHALLENGE_INVALID | Challenge not found | 401, restart login |
| DECRYPTION_FAILED | RSA private key decryption failed | 401, restart login |
| CHALLENGE_MISMATCH | Decrypted challenge doesn't match | 401, restart login |
| TASK_NOT_FOUND | Task ID doesn't exist | 404 |
| TASK_ACCESS_DENIED | Task belongs to different user | 403 |
| R2_UPLOAD_FAILED | Temp file upload failed | 400 |
| R2_MOVE_FAILED | Couldn't move temp to target | 500, delete temp |
| R2_DELETE_FAILED | Couldn't delete task content | 409, set has_content=0 |
| PRESIGNED_URL_EXPIRED | URL too old to use | 400, request new URL |

---

## 11. File Structure

```
/home/xiao/zapdo/main/
├── spec/
│   ├── architecture.md           # This document
│   └── roadmap.md                # Implementation roadmap (separate file)
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── EisenhowerMatrix.svelte
│   │   │   ├── TaskCard.svelte
│   │   │   ├── FileUpload.svelte
│   │   │   └── AdminPanel.svelte
│   │   ├── server/
│   │   │   ├── db.ts              # D1 client
│   │   │   ├── r2.ts              # R2 client + presigned URLs
│   │   │   ├── kv.ts              # KV client
│   │   │   └── crypto.ts          # Server-side crypto (login verify)
│   │   ├── client/
│   │   │   ├── crypto.ts          # Client-side encryption
│   │   │   ├── r2.ts              # R2 upload/download with presigned URLs
│   │   │   └── api.ts             # API client functions
│   │   └── utils/
│   │       └── pagination.ts      # Cursor pagination helpers
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte           # Dashboard
│   │   ├── admin/
│   │   │   └── +page.svelte       # Admin panel
│   │   ├── tasks/
│   │   │   ├── [id]/
│   │   │   │   └── +page.svelte   # Task detail/edit
│   │   │   └── +page.svelte       # Task list
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── register/
│   │       │   │   └── +server.ts
│   │       │   ├── login/
│   │       │   │   └── +server.ts
│   │       │   ├── verify/
│   │       │   │   └── +server.ts
│   │       │   ├── logout/
│   │       │   │   └── +server.ts
│   │       │   └── password/
│   │       │       └── +server.ts
│   │       ├── r2/
│   │       │   ├── temp/
│   │       │   │   └── [temp_file_id]/
│   │       │   │       └── upload/
│   │       │   │           └── +server.ts
│   │       │   └── tasks/
│   │       │       └── [task_id]/
│   │       │           ├── upload/
│   │       │           │   └── +server.ts
│   │       │           └── download/
│   │       │               └── +server.ts
│   │       ├── tasks/
│   │       │   ├── +server.ts     # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       └── +server.ts # DELETE
│   │       └── admin/
│   │           ├── temp-files/
│   │           │   └── +server.ts
│   │           ├── dangling-tasks/
│   │           │   └── +server.ts
│   │           ├── refresh-dangling/
│   │           │   └── +server.ts
│   │           └── cleanup/
│   │               └── +server.ts
│   └── app.html
├── wrangler.toml                  # Cloudflare config
├── package.json
├── tsconfig.json
└── README.md
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-12 | Initial architecture design |
| 1.1 | 2026-01-12 | - Fixed task reading flow (direct R2 with presigned URLs) |
| | | - Fixed register API (accepts encrypted_dek, salt) |
| | | - Changed session storage to KV (not D1) |
| | | - Added R2 credential APIs (/api/r2/*) |
| | | - Updated admin refresh-dangling to process all users |
| | | - Removed temp file cleanup on login |
| | | - Moved roadmap to separate file |
| 1.2 | 2026-01-12 | - Simplified login flow (RSA key pair from KEK) |
| | | - Server holds private key, client derives public key from KEK |
| | | - Challenge-response: Server sends challenge, client encrypts |
| | | - Removed verification_keys table (merged into encryption_keys) |
| | | - No verification key backup needed (derivable from password) |

---

## Appendix A: Eisenhower Matrix

The matrix plots tasks by two dimensions:

| | Not Urgent | Urgent |
|---|---|---|
| **Important** | Quadrant 2 (Plan) | Quadrant 1 (Do) |
| **Not Important** | Quadrant 4 (Eliminate) | Quadrant 3 (Delegate) |

With importance and urgency as 1-10 scores, the matrix becomes a continuous coordinate system where users can precisely position tasks.

---

## Appendix B: Presigned URL Scopes

| Endpoint | Path Pattern | Method | Access |
|----------|--------------|--------|--------|
| GET /api/r2/tasks/:id/download | /users/{user_id}/tasks/{task_id}.enc | GET | Read-only |
| GET /api/r2/tasks/:id/upload | /users/{user_id}/tasks/{task_id}.enc | PUT | Write-only |
| GET /api/r2/temp/:id/upload | /temp/{user_id}/{uuid}.enc | PUT | Write-only |

All URLs are scoped to:
- Specific user_id (from session)
- Specific file path (no wildcard access)
- Time-limited (1 hour expiry)

---

## Appendix C: RSA-Based Challenge-Response Login

### C.1 Why RSA-OAEP?

RSA-OAEP is used because:
- **Deterministic**: Same KEK produces same key pair
- **Encryption/Decryption**: Server decrypts, client encrypts
- **Web Crypto Support**: Native support in modern browsers

### C.2 Registration: Key Generation from KEK

```typescript
// Client-side key generation from KEK
async function generateKeyPairFromKEK(kek: CryptoKey): Promise<{
  publicKey: string;  // base64
  privateKey: string; // base64
}> {
  // Generate RSA-OAEP key pair from KEK (deterministic)
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Export keys
  const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  
  return {
    publicKey: Buffer.from(publicKey).toString('base64'),
    privateKey: Buffer.from(privateKey).toString('base64')
  };
}
```

**Important**: The key pair is derived from KEK, not randomly generated. This means:
- Same password + salt = same key pair
- No backup needed - can regenerate from password
- Server stores private key for verification only

### C.3 Login Step 1: Server Sends Challenge

```typescript
// Server-side challenge generation
async function generateChallenge(userId: number): Promise<string> {
  // Generate random challenge text (32 bytes, URL-safe)
  const challenge = crypto.randomBytes(32).toString('base64url');
  
  // Store in KV with 5-minute TTL
  const timestamp = Date.now();
  await kv.put(`challenge:${userId}:${timestamp}`, challenge, {
    expirationTtl: 300
  });
  
  return challenge;
}
```

### C.4 Login Step 2: Client Encrypts Challenge

```typescript
// Client-side challenge encryption
async function encryptChallenge(
  challenge: string,
  kek: CryptoKey
): Promise<string> {
  // Derive RSA public key from KEK
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Encrypt challenge with public key
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    keyPair.publicKey,
    Buffer.from(challenge)
  );
  
  return Buffer.from(encrypted).toString('base64');
}
```

### C.5 Login Step 3: Server Verifies

```typescript
// Server-side challenge verification
async function verifyChallenge(
  userId: number,
  encryptedChallenge: string
): Promise<boolean> {
  // Find latest challenge for user
  const pattern = `challenge:${userId}:*`;
  const keys = await kv.list({ prefix: pattern });
  
  if (keys.keys.length === 0) {
    throw new Error('No challenge found');
  }
  
  // Get the most recent challenge
  const latestKey = keys.keys.sort((a, b) => 
    parseInt(a.name.split(':')[2]) - parseInt(b.name.split(':')[2])
  )[0];
  
  const originalChallenge = await kv.get(latestKey.name);
  
  // Fetch private key from D1
  const { private_key } = await db.encryption_keys.find(userId);
  
  // Import private key
  const privateKeyData = Buffer.from(private_key, 'base64');
  const privateCryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyData,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
  
  // Decrypt challenge
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateCryptoKey,
    Buffer.from(encryptedChallenge, 'base64')
  );
  
  const decryptedChallenge = Buffer.from(decrypted).toString('base64url');
  
  // Verify match
  const isValid = decryptedChallenge === originalChallenge;
  
  // Clean up challenge
  await kv.delete(latestKey.name);
  
  return isValid;
}
```

### C.6 Security Analysis

**What server knows:**
- private_key (for decryption only)
- public_key (not secret, just identity)
- Encrypted challenges (can't decrypt without private_key)

**What server doesn't know:**
- KEK (derived from password, never sent)
- DEK (only encrypted form stored)
- Password (never sent)

**Attack scenarios:**

| Attack | Prevented By |
|--------|--------------|
| Replay old encrypted challenge | Challenge expires in 5 minutes |
| Steal private_key from server | Can't decrypt DEK (different key) |
| Forge challenge | Server generates random challenge |
| Brute force password | PBKDF2 with 100,000 iterations |

---

*End of Document*
