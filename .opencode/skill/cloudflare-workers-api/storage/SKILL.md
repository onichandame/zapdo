---
name: cloudflare-workers-storage
description: R2 object storage integration with AWS Signature v4 presigned URLs, file management operations, upload/download patterns for Cloudflare Workers.
license: MIT
scope: project
---

# Cloudflare Workers - R2 Object Storage

## When to use this skill
When implementing file storage, upload/download operations, and object storage integration in Cloudflare Workers applications using R2 with AWS Signature v4 presigned URLs.

## AWS Signature Version 4 Implementation

### Presigned URL Manager
```typescript
// src/lib/server/r2/presigned.ts
export interface PresignedUrlResult {
  url: string;
  expiresAt: string;
  expiresIn: number;
  headers?: Record<string, string>;
}

export interface PresignedOptions {
  expiresIn?: number;
  contentType?: string;
  contentLength?: number;
  checksum?: string;
  metadata?: Record<string, string>;
}

export class R2PresignedManager {
  constructor(
    private bucket: R2Bucket,
    private accessKeyId: string,
    private secretAccessKey: string,
    private region: string = 'auto'
  ) {}
  
  async getUploadUrl(
    key: string,
    options: PresignedOptions = {}
  ): Promise<PresignedUrlResult> {
    const {
      expiresIn = 3600,
      contentType,
      contentLength,
      checksum,
      metadata
    } = options;
    
    const url = await this.generatePresignedUrl('PUT', key, expiresIn, {
      contentType,
      contentLength,
      checksum,
      metadata
    });
    
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    return {
      url,
      expiresAt: expiresAt.toISOString(),
      expiresIn,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        ...(checksum && { 'x-amz-checksum-sha256': checksum }),
        ...(contentLength && { 'Content-Length': contentLength.toString() })
      }
    };
  }
  
  async getDownloadUrl(
    key: string,
    options: {
      expiresIn?: number;
      version?: string;
      range?: { start: number; end?: number };
      attachment?: boolean;
      filename?: string;
    } = {}
  ): Promise<PresignedUrlResult> {
    const {
      expiresIn = 3600,
      version,
      range,
      attachment = false,
      filename
    } = options;
    
    const query = new URLSearchParams();
    if (version) query.set('versionId', version);
    if (range) {
      const rangeStr = range.end 
        ? `bytes=${range.start}-${range.end}`
        : `bytes=${range.start}-`;
      query.set('range', rangeStr);
    }
    if (attachment && filename) {
      query.set('response-content-disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    } else if (attachment) {
      query.set('response-content-disposition', 'attachment');
    }
    
    const url = await this.generatePresignedUrl('GET', key, expiresIn, {}, query.toString());
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    return {
      url,
      expiresAt: expiresAt.toISOString(),
      expiresIn
    };
  }
  
  async getDeleteUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<PresignedUrlResult> {
    const url = await this.generatePresignedUrl('DELETE', key, expiresIn);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    return {
      url,
      expiresAt: expiresAt.toISOString(),
      expiresIn
    };
  }
  
  async getMultipartUploadUrl(
    key: string,
    partNumber: number,
    uploadId: string,
    expiresIn: number = 3600
  ): Promise<PresignedUrlResult> {
    const query = `partNumber=${partNumber}&uploadId=${uploadId}`;
    const url = await this.generatePresignedUrl('PUT', key, expiresIn, {}, query);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    return {
      url,
      expiresAt: expiresAt.toISOString(),
      expiresIn
    };
  }
  
  private async generatePresignedUrl(
    method: 'GET' | 'PUT' | 'DELETE' | 'HEAD',
    key: string,
    expiresIn: number,
    options: {
      contentType?: string;
      contentLength?: number;
      checksum?: string;
      metadata?: Record<string, string>;
    } = {},
    queryString: string = ''
  ): Promise<string> {
    const endpoint = `https://${this.bucket.name}.${this.region}.r2.cloudflarestorage.com`;
    const url = new URL(`${endpoint}/${key}${queryString ? `?${queryString}` : ''}`);
    
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    
    const credential = `${this.accessKeyId}/${dateStamp}/${this.region}/s3/aws4_request`;
    const algorithm = 'AWS4-HMAC-SHA256';
    
    // Create canonical headers
    const headers = new Map<string, string>();
    headers.set('host', url.host);
    headers.set('x-amz-date', amzDate);
    
    if (options.contentType) {
      headers.set('content-type', options.contentType);
    }
    
    if (options.checksum) {
      headers.set('x-amz-checksum-sha256', options.checksum);
    }
    
    if (options.contentLength) {
      headers.set('content-length', options.contentLength.toString());
    }
    
    if (options.metadata) {
      for (const [key, value] of Object.entries(options.metadata)) {
        headers.set(`x-amz-meta-${key}`, value);
      }
    }
    
    if (queryString.includes('partNumber') && queryString.includes('uploadId')) {
      headers.set('x-amz-content-sha256', 'UNSIGNED-PAYLOAD');
    }
    
    // Build canonical headers string
    const canonicalHeaders = Array.from(headers.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}\n`)
      .join('');
    
    const signedHeaders = Array.from(headers.keys())
      .sort()
      .join(';');
    
    // Create canonical query string
    const canonicalQuery = queryString || this.buildCanonicalQuery(expiresIn, algorithm, credential, amzDate, signedHeaders);
    
    // Create canonical request
    const payloadHash = method === 'GET' || method === 'DELETE' 
      ? 'e3b0c44298fc1c149afbf4c8996fb924'
      : (headers.get('x-amz-content-sha256') || 'UNSIGNED-PAYLOAD');
      
    const canonicalRequest = `${method}\n${url.pathname}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    // Create string to sign
    const stringToSign = `${algorithm}\n${amzDate}\n${dateStamp}/${this.region}/s3/aws4_request\n${await this.sha256(canonicalRequest)}`;
    
    // Calculate signature
    const signature = await this.calculateSignature(
      stringToSign,
      dateStamp,
      this.region,
      's3'
    );
    
    const finalQuery = queryString 
      ? `${queryString}&X-Amz-Signature=${signature}`
      : `${canonicalQuery}&X-Amz-Signature=${signature}`;
    
    return `${endpoint}/${key}${finalQuery ? `?${finalQuery}` : ''}`;
  }
  
  private buildCanonicalQuery(
    expiresIn: number,
    algorithm: string,
    credential: string,
    amzDate: string,
    signedHeaders: string
  ): string {
    const params = new URLSearchParams({
      'X-Amz-Algorithm': algorithm,
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': signedHeaders
    });
    
    return params.toString();
  }
  
  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  private async calculateSignature(
    stringToSign: string,
    dateStamp: string,
    region: string,
    service: string
  ): Promise<string> {
    // Derive signing key
    const kDate = await this.hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = await this.hmacSha256(kDate, region);
    const kService = await this.hmacSha256(kRegion, service);
    const kSigning = await this.hmacSha256(kService, 'aws4_request');
    
    return this.hmacSha256(kSigning, stringToSign, 'hex');
  }
  
  private async hmacSha256(
    key: string | ArrayBuffer,
    message: string,
    outputFormat: 'buffer' | 'hex' = 'buffer'
  ): Promise<ArrayBuffer | string> {
    const encoder = new TextEncoder();
    const keyData = typeof key === 'string' ? encoder.encode(key) : key;
    const messageData = encoder.encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    
    return outputFormat === 'hex' 
      ? Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      : signature;
  }
}
```

## File Management Operations

### High-Level R2 Manager
```typescript
// src/lib/server/r2/manager.ts
export interface FileInfo {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  uploadUrl: string;
  expiresIn: number;
  expiresAt: string;
  headers: Record<string, string>;
}

export interface UploadOptions {
  contentType?: string;
  maxSize?: number;
  allowedTypes?: string[];
  metadata?: Record<string, string>;
  checksum?: string;
  expiresIn?: number;
}

export class R2Manager {
  constructor(
    private bucket: R2Bucket,
    private presignedManager: R2PresignedManager
  ) {}
  
  // Upload operations
  async createTempUploadUrl(
    userId: number,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const fileId = crypto.randomUUID();
    const key = `temp/${userId}/${fileId}.enc`;
    
    // Validate file type if allowed types specified
    if (options.allowedTypes && options.contentType) {
      if (!this.isAllowedType(options.contentType, options.allowedTypes)) {
        throw new Error(`File type ${options.contentType} not allowed`);
      }
    }
    
    const result = await this.presignedManager.getUploadUrl(key, {
      expiresIn: options.expiresIn || 3600, // 1 hour default
      contentType: options.contentType,
      metadata: {
        userId: userId.toString(),
        uploadTime: new Date().toISOString(),
        tempFile: 'true',
        ...options.metadata
      },
      checksum: options.checksum
    });
    
    return {
      key,
      uploadUrl: result.url,
      expiresIn: result.expiresIn,
      expiresAt: result.expiresAt,
      headers: result.headers || {}
    };
  }
  
  async createTaskUploadUrl(
    userId: number,
    taskId: number,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const key = `users/${userId}/tasks/${taskId}.enc`;
    
    const result = await this.presignedManager.getUploadUrl(key, {
      expiresIn: options.expiresIn || 3600,
      contentType: options.contentType,
      metadata: {
        userId: userId.toString(),
        taskId: taskId.toString(),
        uploadTime: new Date().toISOString(),
        ...options.metadata
      },
      checksum: options.checksum
    });
    
    return {
      key,
      uploadUrl: result.url,
      expiresIn: result.expiresIn,
      expiresAt: result.expiresAt,
      headers: result.headers || {}
    };
  }
  
  // Download operations
  async createTempDownloadUrl(
    userId: number,
    fileId: string,
    expiresIn: number = 300
  ): Promise<PresignedUrlResult> {
    const key = `temp/${userId}/${fileId}.enc`;
    return this.presignedManager.getDownloadUrl(key, { expiresIn });
  }
  
  async createTaskDownloadUrl(
    userId: number,
    taskId: number,
    options: {
      expiresIn?: number;
      attachment?: boolean;
      filename?: string;
    } = {}
  ): Promise<PresignedUrlResult> {
    const key = `users/${userId}/tasks/${taskId}.enc`;
    return this.presignedManager.getDownloadUrl(key, options);
  }
  
  // File operations
  async moveTempToTask(
    userId: number,
    taskId: number,
    fileId: string
  ): Promise<void> {
    const sourceKey = `temp/${userId}/${fileId}.enc`;
    const targetKey = `users/${userId}/tasks/${taskId}.enc`;
    
    try {
      // Get source object
      const sourceObject = await this.bucket.get(sourceKey);
      if (!sourceObject) {
        throw new Error(`Temp file not found: ${sourceKey}`);
      }
      
      // Copy to target location
      await this.bucket.put(targetKey, sourceObject.body, {
        customMetadata: {
          userId: userId.toString(),
          taskId: taskId.toString(),
          movedFrom: sourceKey,
          moveTime: new Date().toISOString()
        }
      });
      
      // Delete temp file
      await this.bucket.delete(sourceKey);
      
    } catch (error) {
      console.error('Failed to move temp file to task:', error);
      throw error;
    }
  }
  
  async copyTaskFile(
    userId: number,
    sourceTaskId: number,
    targetTaskId: number
  ): Promise<void> {
    const sourceKey = `users/${userId}/tasks/${sourceTaskId}.enc`;
    const targetKey = `users/${userId}/tasks/${targetTaskId}.enc`;
    
    try {
      const sourceObject = await this.bucket.get(sourceKey);
      if (!sourceObject) {
        throw new Error(`Source file not found: ${sourceKey}`);
      }
      
      await this.bucket.put(targetKey, sourceObject.body, {
        customMetadata: {
          userId: userId.toString(),
          taskId: targetTaskId.toString(),
          copiedFrom: sourceKey,
          copyTime: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Failed to copy task file:', error);
      throw error;
    }
  }
  
  async deleteTaskFile(userId: number, taskId: number): Promise<void> {
    const key = `users/${userId}/tasks/${taskId}.enc`;
    
    try {
      await this.bucket.delete(key);
    } catch (error) {
      console.error('Failed to delete R2 file:', error);
      throw error;
    }
  }
  
  async deleteTempFile(userId: number, fileId: string): Promise<void> {
    const key = `temp/${userId}/${fileId}.enc`;
    
    try {
      await this.bucket.delete(key);
    } catch (error) {
      console.error('Failed to delete temp file:', error);
      throw error;
    }
  }
  
  // File information
  async getTaskFileInfo(
    userId: number,
    taskId: number
  ): Promise<FileInfo | null> {
    const key = `users/${userId}/tasks/${taskId}.enc`;
    
    try {
      const object = await this.bucket.head(key);
      if (!object) return null;
      
      return {
        key,
        size: object.size,
        lastModified: object.uploaded,
        etag: object.httpEtag || '',
        contentType: object.customMetadata?.['content-type'],
        metadata: object.customMetadata
      };
    } catch (error) {
      console.error('Failed to get file info:', error);
      return null;
    }
  }
  
  // List operations
  async listTempFiles(
    userId: number,
    options: {
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{ files: FileInfo[]; hasMore: boolean; nextCursor?: string }> {
    try {
      const prefix = `temp/${userId}/`;
      const result = await this.bucket.list({
        prefix,
        limit: options.limit || 100,
        cursor: options.cursor
      });
      
      const files = result.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        lastModified: obj.uploaded,
        etag: obj.etag,
        metadata: obj.customMetadata
      }));
      
      return {
        files,
        hasMore: result.truncated,
        nextCursor: result.truncated ? result.cursor : undefined
      };
    } catch (error) {
      console.error('Failed to list temp files:', error);
      throw error;
    }
  }
  
  async listTaskFiles(
    userId: number,
    options: {
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{ files: FileInfo[]; hasMore: boolean; nextCursor?: string }> {
    try {
      const prefix = `users/${userId}/tasks/`;
      const result = await this.bucket.list({
        prefix,
        limit: options.limit || 100,
        cursor: options.cursor
      });
      
      const files = result.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        lastModified: obj.uploaded,
        etag: obj.etag,
        metadata: obj.customMetadata
      }));
      
      return {
        files,
        hasMore: result.truncated,
        nextCursor: result.truncated ? result.cursor : undefined
      };
    } catch (error) {
      console.error('Failed to list task files:', error);
      throw error;
    }
  }
  
  // Cleanup operations
  async cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let deletedCount = 0;
    
    try {
      const tempFiles = await this.bucket.list({
        prefix: 'temp/'
      });
      
      for (const object of tempFiles.objects) {
        if (object.uploaded.getTime() < cutoff) {
          await this.bucket.delete(object.key);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
      throw error;
    }
  }
  
  async cleanupOrphanedTaskFiles(activeTaskIds: number[], userId: number): Promise<number> {
    const prefix = `users/${userId}/tasks/`;
    let deletedCount = 0;
    
    try {
      const taskFiles = await this.bucket.list({
        prefix
      });
      
      for (const object of taskFiles.objects) {
        // Extract task ID from key path
        const matches = object.key.match(/\/tasks\/(\d+)\.enc$/);
        if (!matches) continue;
        
        const taskId = parseInt(matches[1]);
        
        if (!activeTaskIds.includes(taskId)) {
          await this.bucket.delete(object.key);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup orphaned task files:', error);
      throw error;
    }
  }
  
  // Utility methods
  private isAllowedType(contentType: string, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const prefix = type.slice(0, -2);
        return contentType.toLowerCase().startsWith(prefix);
      }
      return contentType.toLowerCase() === type.toLowerCase();
    });
  }
}
```

## API Routes for Storage Operations

### Upload API Routes
```typescript
// src/routes/api/r2/upload/temp/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { R2PresignedManager, R2Manager } from '$lib/server/r2';
import { createDB, users } from '$lib/server/db';

export const POST: RequestHandler = async ({ locals, platform }) => {
  const db = createDB(platform!.env.TASKS_DB);
  const userId = locals.session!.userId;
  
  // Verify user exists and is active
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user.length === 0) {
    throw error(404, 'User not found');
  }
  
  try {
    const { contentType, maxSize, allowedTypes } = await request.json();
    
    // Validate upload parameters
    if (maxSize && maxSize > 100 * 1024 * 1024) { // 100MB max
      throw error(400, 'File size too large (max 100MB)');
    }
    
    if (allowedTypes && allowedTypes.length > 20) {
      throw error(400, 'Too many allowed file types');
    }
    
    const r2Manager = new R2Manager(
      platform!.env.R2_BUCKET,
      new R2PresignedManager(
        platform!.env.R2_BUCKET,
        platform!.env.R2_ACCESS_KEY_ID,
        platform!.env.R2_SECRET_ACCESS_KEY
      )
    );
    
    const uploadUrl = await r2Manager.createTempUploadUrl(userId, {
      contentType,
      maxSize,
      allowedTypes,
      expiresIn: 3600 // 1 hour
    });
    
    return json({
      upload_url: uploadUrl.uploadUrl,
      key: uploadUrl.key,
      expires_in: uploadUrl.expiresIn,
      expires_at: uploadUrl.expiresAt,
      headers: uploadUrl.headers
    });
    
  } catch (err) {
    console.error('Failed to create temp upload URL:', err);
    throw error(500, 'Failed to create upload URL');
  }
};
```

### Download API Routes
```typescript
// src/routes/api/r2/tasks/[id]/download/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { R2PresignedManager, R2Manager } from '$lib/server/r2';
import { createDB, tasks, eq, and } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, locals, platform, url }) => {
  const db = createDB(platform!.env.TASKS_DB);
  const userId = locals.session!.userId;
  const taskId = parseInt(params.id!);
  
  // Parse query parameters
  const downloadAs = url.searchParams.get('download_as');
  const expiresIn = Math.min(parseInt(url.searchParams.get('expires_in') || '300'), 3600);
  
  // Verify task ownership and that it has content
  const task = await db.select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  
  if (task.length === 0) {
    throw error(404, 'Task not found');
  }
  
  if (!task[0].hasContent) {
    throw error(400, 'Task has no file content');
  }
  
  const r2Manager = new R2Manager(
    platform!.env.R2_BUCKET,
    new R2PresignedManager(
      platform!.env.R2_BUCKET,
      platform!.env.R2_ACCESS_KEY_ID,
      platform!.env.R2_SECRET_ACCESS_KEY
    )
  );
  
  try {
    // Get file info for content type
    const fileInfo = await r2Manager.getTaskFileInfo(userId, taskId);
    
    const downloadUrl = await r2Manager.createTaskDownloadUrl(userId, taskId, {
      expiresIn,
      attachment: true,
      filename: downloadAs || undefined
    });
    
    return json({
      download_url: downloadUrl.url,
      expires_in: downloadUrl.expiresIn,
      expires_at: downloadUrl.expiresAt,
      file_info: fileInfo
    });
    
  } catch (err) {
    console.error('Failed to generate download URL:', err);
    throw error(500, 'Failed to generate download URL');
  }
};
```

## File Validation and Security

### File Type Validation
```typescript
// src/lib/server/r2/validation.ts
export interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions?: string[];
  requireVirusScan?: boolean;
}

export class FileValidator {
  static validateContentType(contentType: string, allowedTypes: string[]): boolean {
    const normalizedType = contentType.toLowerCase().trim();
    
    return allowedTypes.some(allowedType => {
      const normalizedAllowed = allowedType.toLowerCase().trim();
      
      // Exact match
      if (normalizedType === normalizedAllowed) {
        return true;
      }
      
      // Wildcard match (e.g., "image/*")
      if (normalizedAllowed.endsWith('/*')) {
        const prefix = normalizedAllowed.slice(0, -2);
        return normalizedType.startsWith(prefix);
      }
      
      return false;
    });
  }
  
  static sanitizeFileName(filename: string): string {
    // Remove path traversal attempts
    const sanitized = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '_');
    
    // Limit length
    return sanitized.length > 255 ? sanitized.substring(0, 255) : sanitized;
  }
  
  static generateSecureExtension(contentType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/json': '.json',
      'application/zip': '.zip'
    };
    
    return mimeToExt[contentType.toLowerCase()] || '.bin';
  }
  
  static isExecutableFile(contentType: string): boolean {
    const executableTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msi',
      'application/x-sh',
      'application/x-bat',
      'application/x-python'
    ];
    
    return executableTypes.some(type => 
      contentType.toLowerCase().includes(type)
    );
  }
  
  static async validateFileIntegrity(
    body: ReadableStream,
    expectedChecksum?: string
  ): Promise<{
    size: number;
    checksum: string;
    valid: boolean;
  }> {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        totalSize += value.length;
      }
      
      // Calculate checksum
      const combined = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      const checksum = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', combined))
      ).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const valid = !expectedChecksum || checksum === expectedChecksum;
      
      return { size: totalSize, checksum, valid };
      
    } catch (error) {
      console.error('File integrity validation failed:', error);
      throw error;
    }
  }
}
```

## Next Steps
- Implement [Error Handling](../error-handling/) for storage operations
- Add [Performance & Testing](../performance/) for storage optimization
- Set up [Database](../database/) integration for file metadata

## Related Skills
- [Core Architecture](../architecture/) - Storage configuration
- [Authentication & Security](../authentication/) - File access security
- [Database Operations](../database/) - File metadata management
- [Error Handling](../error-handling/) - Storage error patterns