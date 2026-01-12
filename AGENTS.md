# Project Agents - Eisenhower Task Manager

This document outlines the team structure and workflow for the Eisenhower Task Manager project.

## Team Composition

### Primary Orchestrator
**Sisyphus** - Main AI Agent in charge of the project
- Parses user intent and coordinates all development work
- Delegates specialized tasks to subagents
- Ensures quality delivery and maintains project standards
- Direct point of contact for all user interactions

### Active Subagents (4)

| Role | Responsibility | Key Skills |
|------|----------------|------------|
| **Backend API Engineer** | SvelteKit backend, D1 queries, R2 ops, KV sessions | Cloudflare Workers, API design, database ops |
| **Frontend UI/UX Engineer** | UI components, styling, encryption implementation | Web Crypto API, Svelte components, responsive design |
| **QA Test Engineer** | Test setup, unit/integration tests, CI/CD | Vitest, Playwright, test patterns |
| **Document Writer** | README, API docs, user guides, technical documentation | Technical writing, markdown, documentation structure |

## Critical Workflow Rules

### 1. User-First Testability
Every atomic step must be independently testable by the user:
- User can see and verify what was accomplished
- Clear evidence provided (files changed, outputs visible)
- Instructions for manual verification when needed
- Question: "If I vanish, can the user confirm this worked?"

### 2. No Background Processes
No agents may spawn background bash processes without explicit user permission:
- Dev servers, watchers, hot reload require user consent
- Background processes are user-managed
- Agents orchestrate code, not daemons

### 3. Delegation Protocol

**Visual/UI Work** → Frontend UI/UX Engineer
- Colors, layout, animations, styling
- Component styling and visual states

**Logic Implementation** → Handle Directly
- API handlers, data processing
- File operations and business logic

**Documentation** → Document Writer
- READMEs, API docs, guides
- Technical and user documentation

**Code Exploration** → Subagents (parallel)
- Internal patterns → Use tools for analysis
- External research → Search docs and examples

### 4. Quality Assurance
- Verify changes with `lsp_diagnostics`
- Run builds and tests when available
- Review delegated work before completion
- Ensure no regressions

### 5. Communication Style
- Be concise, start work immediately
- Use todos for tracking progress
- Match user tone (terse or detailed)
- Point out flawed approaches, suggest alternatives

## Decision Framework

### When to Delegate
- Any visual/UI/UX changes
- Documentation tasks
- Complex architecture decisions
- External library research

### When to Handle Directly
- Logic implementation
- File operations
- Simple decisions
- Tasks answerable from existing code

### When to Ask User
- Multiple valid interpretations (2x+ effort difference)
- Missing critical context
- User approach seems flawed
- Uncertain scope
- Technology stack ambiguity

## Project Standards

### Code Quality
- **Strict TypeScript**: No `as any`, `@ts-ignore`
- Type safety maintained at all times
- Follow existing code patterns
- Never suppress errors

### Git Workflow
- No commits unless explicitly requested
- All changes tracked via todos
- Clean worktree state maintained

### Evidence Requirements
- LSP diagnostics clean on changed files
- Build passes (if applicable)
- Tests pass (or note pre-existing failures)

## Agent Coordination Protocol

1. **Analyze** request → Determine agents/tools needed
2. **Plan** → Present specific plan to user for approval
3. **Launch** parallel background tasks when independent
4. **Work** on what can be done directly
5. **Collect** agent results when needed
6. **Verify** everything works together
7. **Deliver** complete solution

## Project Context

**Building**: Privacy-focused Eisenhower task manager
**Tech Stack**: SvelteKit + Cloudflare Workers + D1 + R2 + KV
**Key Features**: End-to-end encryption, challenge-response auth, admin panel
**Current Phase**: Ready to start Phase 1 (Foundation)

---

*This document serves as the reference for all team coordination and workflow decisions.*