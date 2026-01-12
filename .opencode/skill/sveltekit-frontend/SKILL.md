---
name: sveltekit-frontend
description: Master SvelteKit frontend development with components, routing, state management, forms, and modern UI patterns using SvelteKit 2.x and Svelte 5.
scope: project
license: MIT
---
# SvelteKit Frontend Development

## What this skill does
Provides comprehensive guidance for building modern, responsive frontend applications with SvelteKit 2.x. Covers component architecture, routing patterns, state management, form handling, and UI/UX best practices using the latest Svelte 5 reactivity system.

## When to use this skill
- Building SvelteKit components and pages
- Implementing client-side routing and navigation
- Managing application state and data flow
- Creating forms with progressive enhancement
- Designing responsive UI patterns and layouts
- Optimizing frontend performance and user experience

## Development Server Protocol

**CRITICAL: NEVER START DEVELOPMENT SERVER YOURSELF**

- **ALWAYS** request a development server instance from the delegating agent before any frontend testing, component testing, or visual verification begins
- **MUST** wait for the delegating agent to confirm the dev server is running and provide the accessible URL
- **IF** dev server is not provided, return early and explicitly ask the calling agent to start and provide the development server URL
- **NEVER** attempt to run `npm run dev`, `pnpm dev`, or any development server commands
- **ALWAYS** specify whether you need the dev server for component testing, visual verification, or full frontend testing

**Example Request Format**:
```
"I need a development server instance to test the new component layout and verify responsive design. Please start the SvelteKit dev server and provide the URL so I can proceed with frontend testing."
```

## Core Frontend Concepts

### Component Architecture
- **Svelte 5 Reactivity**: Master runes-based reactivity system (`$state`, `$derived`, `$effect`)
- **Component Composition**: Build reusable, composable components with proper prop passing
- **Slot Patterns**: Advanced slot usage for flexible component design
- **Event Handling**: Modern event handling with proper TypeScript typing
- **Lifecycle Management**: Understand component lifecycles and cleanup patterns

### Routing & Navigation
- **File-based Routing**: Master SvelteKit's routing conventions
- **Dynamic Routes**: Handle route parameters and pattern matching
- **Route Guards**: Implement navigation guards and protected routes
- **Loading States**: Create smooth transitions and loading indicators
- **Error Boundaries**: Handle routing errors gracefully

### State Management
- **Local Component State**: Using `$state` for reactive data
- **Cross-component State**: Context API and custom stores
- **Server State Integration**: Efficiently cache and sync server data
- **Form State**: Manage complex form states with validation
- **URL State**: Sync application state with URL parameters

## Progressive Learning Path

### Foundation
See [references/svelte-basics.md](references/svelte-basics.md) for Svelte 5 fundamentals and the new runes system.

### Component Development
Refer to [references/components.md](references/components.md) for comprehensive component patterns and best practices.

### Advanced Patterns
See [references/advanced-patterns.md](references/advanced-patterns.md) for complex UI patterns, performance optimization, and architectural decisions.

## Implementation Strategies

### Form Handling with Progressive Enhancement
```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';

  let { form, action } = $props();
  
  const handleSubmit = enhance(() => {
    // Client-side handling after successful form submission
    goto('/success');
    return () => {
      // Cleanup if navigation is interrupted
    };
  });
</script>

<form method="POST" action={action?.url ?? '/api/contact'} use:handleSubmit>
  <input name="email" type="email" required />
  <button type="submit">Submit</button>
</form>
```

### Component State Management
```svelte
<script lang="ts">
  // Reactive state with Svelte 5 runes
  let count = $state(0);
  let doubled = $derived(count * 2);
  
  // Computed values and effects
  $effect(() => {
    console.log('Count changed:', count);
  });
</script>

<button onclick={() => count++}>
  Count: {count}, Doubled: {doubled}
</button>
```

### Navigation with Loading States
```svelte
<script lang="ts">
  import { navigating } from '$app/stores';
  import { page } from '$app/stores';
</script>

{#if $navigating}
  <div class="loading">Loading...</div>
{/if}

<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a class:active={$page.url.pathname === '/contact'} href="/contact">
    Contact
  </a>
</nav>
```

## Common Patterns

### Data Loading Patterns
- **Page Data**: Load data in `+page.ts` with type safety
- **Universal Loaders**: Shared data between server and client
- **Client-side Only**: Load data after page hydration
- **Streaming**: Progressive data loading for better UX

### Layout Architecture
- **Nested Layouts**: Hierarchical layout composition
- **Layout Groups**: Organize routes with shared layouts
- **Dynamic Layouts**: Layouts that adapt to content
- **Responsive Layouts**: Mobile-first design patterns

### Performance Optimization
- **Code Splitting**: Automatic and manual chunk optimization
- **Image Optimization**: Responsive images and lazy loading
- **Bundle Analysis**: Monitor and optimize bundle sizes
- **Caching Strategies**: Client and server caching patterns

## Troubleshooting
Refer to [references/troubleshooting.md](references/troubleshooting.md) for common frontend issues and debugging strategies.

## Examples
See [references/examples.md](references/examples.md) for complete, production-ready component examples and patterns.

## Cross-References
- **Backend Integration**: Use `sveltekit-backend` skill for API development
- **Deployment**: See `cloudflare-workers-api` skill for deployment patterns
- **Testing**: Refer to `serverless-testing-strategy` for comprehensive testing