---
name: cloudflare-workers-api
description: Build and deploy comprehensive Cloudflare Workers with SvelteKit API routes, D1 database, KV storage, and R2 object storage integration for production serverless applications.
license: MIT
scope: project
---

# Cloudflare Workers API Development

## When to use this skill
When implementing production-grade backend APIs using Cloudflare Workers with SvelteKit, including complex authentication patterns, database operations, session management, file storage integrations, and comprehensive error handling.

## Overview
This skill provides comprehensive guidance for building serverless APIs with Cloudflare Workers and SvelteKit. The content is organized into focused sub-skills for progressive learning:

### 🏗️ [Core Architecture](./architecture/)
- Project structure and environment configuration
- API route patterns with SvelteKit
- TypeScript setup and type definitions

### 🔐 [Authentication & Security](./authentication/)
- Session-based authentication with KV storage
- Challenge-response authentication
- Security middleware patterns

### 🗄️ [D1 Database Operations](./database/)
- Schema management with Drizzle ORM
- Database client setup and utilities
- Advanced querying and pagination

### 📁 [R2 Object Storage](./storage/)
- Presigned URL generation (AWS Signature v4)
- File management operations
- Upload/download API routes

### 🚨 [Error Handling & Logging](./error-handling/)
- Comprehensive error handlers
- Structured logging patterns
- API error response standards

### ⚡ [Performance & Testing](./performance/)
- Caching strategies
- API integration testing
- Production deployment best practices

## Quick Start Guide

1. **Project Setup**: Start with [Core Architecture](./architecture/) for proper project structure
2. **Authentication**: Implement security patterns using the [Authentication](./authentication/) module
3. **Database**: Add data persistence with [D1 Database](./database/) operations
4. **Storage**: Integrate file handling with [R2 Storage](./storage/) 
5. **Production**: Apply [Performance & Testing](./performance/) patterns for deployment

## Prerequisites
- Node.js 18+ and npm/yarn
- Cloudflare account with Workers, D1, KV, and R2 enabled
- SvelteKit project setup knowledge
- TypeScript proficiency
- Basic understanding of serverless concepts

## Development Workflow
```bash
# Install dependencies
npm install @sveltejs/adapter-cloudflare drizzle-orm

# Set up Cloudflare bindings
# See architecture/ for detailed environment setup

# Run locally
npm run dev

# Deploy to production
npm run build
npx wrangler deploy
```

## Key Benefits
- **Production Ready**: Battle-tested patterns for enterprise applications
- **Type Safe**: Full TypeScript coverage with comprehensive type definitions
- **Secure**: Zero-knowledge architecture with client-side encryption options
- **Scalable**: Built for high-traffic applications with proper caching strategies
- **Maintainable**: Modular structure following OpenCode skill factory patterns

## Navigation Tips
- Each sub-skill is self-contained and can be loaded independently
- Progress sequentially from architecture to deployment
- Cross-references between modules for related concepts
- All code examples are production-tested and ready to implement

Get started with [Core Architecture](./architecture/) or jump to any specific module based on your needs.