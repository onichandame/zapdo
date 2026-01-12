# Frontend Troubleshooting

## Common Issues & Solutions

### Reactivity Issues

#### Problem: State not updating in Svelte 5
```svelte
<!-- Wrong: Missing $state -->
<script lang="ts">
  let count = 0; // Not reactive
  
  function increment() {
    count++; // Won't trigger updates
  }
</script>

<button onclick={increment}>{count}</button>
```

**Solution:** Use `$state()` for reactive declarations
```svelte
<!-- Correct -->
<script lang="ts">
  let count = $state(0); // Reactive state
  
  function increment() {
    count++; // Triggers updates
  }
</script>

<button onclick={increment}>{count}</button>
```

#### Problem: Derived values not updating
```svelte
<!-- Wrong: Using assignment instead of derived -->
<script lang="ts">
  let items = $state([1, 2, 3]);
  let doubled: number[] = []; // Not derived
  
  // This won't update when items change
  doubled = items.map(x => x * 2);
</script>
```

**Solution:** Use `$derived` for computed values
```svelte
<!-- Correct -->
<script lang="ts">
  let items = $state([1, 2, 3]);
  let doubled = $derived(() => items.map(x => x * 2));
</script>
```

### Component Lifecycle Issues

#### Problem: Component not re-rendering on prop changes
```svelte
<!-- Parent component -->
<script lang="ts">
  import Child from './Child.svelte';
  
  let data = $state({ name: 'John' });
  
  function updateData() {
    // Wrong: Direct object mutation doesn't trigger reactivity
    data.name = 'Jane';
  }
</script>

<Child {data} />
<button onclick={updateData}>Update</button>
```

**Solution:** Reassign the entire object or use reactive patterns
```svelte
<!-- Correct -->
<script lang="ts">
  let data = $state({ name: 'John' });
  
  function updateData() {
    // Correct: Reassign entire object
    data = { ...data, name: 'Jane' };
  }
</script>

<!-- Alternative: Use reactive object -->
<script lang="ts">
  const data = $state({ name: 'John' });
  
  function updateData() {
    // Direct mutation works with $state object
    data.name = 'Jane';
  }
</script>
```

### Routing Issues

#### Problem: Navigation not working
```svelte
<!-- Wrong: Using window.location -->
<script lang="ts">
  function navigate() {
    window.location.href = '/about'; // Full page reload
  }
</script>
```

**Solution:** Use SvelteKit navigation
```svelte
<!-- Correct -->
<script lang="ts">
  import { goto } from '$app/navigation';
  
  function navigate() {
    goto('/about'); // Client-side navigation
  }
</script>
```

#### Problem: Page data not updating after navigation
```typescript
// +page.ts
export async function load({ params }) {
  // Wrong: Static data that doesn't refresh
  const data = await fetch(`/api/posts/${params.id}`).then(r => r.json());
  return { data };
}
```

**Solution:** Use invalidate to refresh data
```svelte
<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { page } from '$app/stores';
  
  async function refreshData() {
    await invalidate(page.url.pathname);
  }
</script>
```

### Form Handling Issues

#### Problem: Form not submitting properly
```svelte
<!-- Wrong: Mixing client and server form handling -->
<script lang="ts">
  import { enhance } from '$app/forms';
  
  function handleSubmit() {
    // This won't work with enhance
    console.log('Submitting...');
  }
</script>

<form method="POST" onsubmit={handleSubmit} use:enhance>
  <!-- form content -->
</form>
```

**Solution:** Use enhance callback correctly
```svelte
<!-- Correct -->
<script lang="ts">
  import { enhance } from '$app/forms';
  
  function handleSubmit() {
    return async ({ result, form }) => {
      if (result.type === 'success') {
        console.log('Form submitted successfully');
      }
    };
  }
</script>

<form method="POST" use:enhance={handleSubmit}>
  <!-- form content -->
</form>
```

### State Management Issues

#### Problem: Shared state not synchronizing between components
```typescript
// Wrong: Shared state that causes SSR issues
// stores/user.ts
import { writable } from 'svelte/store';

export const user = writable(null); // Shared on server
```

**Solution:** Use context or SSR-safe patterns
```typescript
// Correct: Context-based state
// context/user.ts
import { setContext, getContext } from 'svelte';

const USER_KEY = Symbol('user');

export function setUserContext(user: any) {
  setContext(USER_KEY, user);
}

export function getUserContext() {
  return getContext(USER_KEY);
}
```

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { setUserContext } from '$lib/context/user';
  
  export let data;
  setUserContext(data.user);
</script>
```

### Performance Issues

#### Problem: Component re-rendering unnecessarily
```svelte
<!-- Wrong: Creating new functions in template -->
<script lang="ts">
  interface Props {
    items: number[];
    onItemClick: (id: number) => void;
  }
  
  let { items, onItemClick }: Props = $props();
</script>

{#each items as item}
  <!-- onClick creates new function each render -->
  <button onclick={() => onItemClick(item)}>
    Item {item}
  </button>
{/each}
```

**Solution:** Use data attributes or optimize event handlers
```svelte
<!-- Correct -->
<script lang="ts">
  function handleClick(event: MouseEvent) {
    const button = event.target as HTMLButtonElement;
    const itemId = parseInt(button.dataset.itemId!);
    onItemClick(itemId);
  }
</script>

<div onclick={handleClick}>
  {#each items as item}
    <button data-item-id={item}>
      Item {item}
    </button>
  {/each}
</div>
```

### TypeScript Issues

#### Problem: Type errors with props
```svelte
<!-- Wrong: Missing type annotations -->
<script lang="ts">
  export let user: any; // Loss of type safety
  export let items: any[]; // No specific typing
</script>
```

**Solution:** Use proper TypeScript interfaces
```svelte
<!-- Correct -->
<script lang="ts" generics="T">
  interface User {
    id: string;
    name: string;
    email: string;
  }

  interface Props<T> {
    user: User;
    items: T[];
    onItemClick: (item: T) => void;
  }

  let { user, items, onItemClick }: Props<T> = $props();
</script>
```

### CSS & Styling Issues

#### Problem: Global styles affecting other components
```svelte
<!-- Wrong: Global scoped styles -->
<style>
  button {
    background: blue; /* Affects all buttons */
  }
</style>
```

**Solution:** Use CSS modules or scoped styles
```svelte
<!-- Correct: Component-scoped styles -->
<style>
  .custom-button {
    background: blue;
  }
</style>

<button class="custom-button">Click me</button>
```

### Debugging Tips

#### 1. Use Svelte DevTools
```bash
npm install --save-dev svelte-devtools
```

#### 2. Enable debug mode
```typescript
// app.d.ts
declare global {
  var __svelte_dev_tools_inject__?: boolean;
}

// vite.config.ts
export default defineConfig({
  define: {
    __svelte_dev_tools_inject__: process.env.NODE_ENV === 'development'
  }
});
```

#### 3. Use console debugging with reactivity
```svelte
<script lang="ts">
  let count = $state(0);
  
  $effect(() => {
    console.log('Count changed to:', count);
  });
</script>
```

#### 4. Check for reactivity in dev tools
```svelte
<script lang="ts>
  // Debug reactive dependencies
  let computed = $derived(() => {
    console.log('Computing derived value...');
    return count * 2;
  });
</script>
```

### Browser Compatibility Issues

#### Problem: Modern JavaScript features not working
**Solution:** Configure proper browser targets in Vite
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: ['es2015', 'chrome58', 'firefox57', 'safari11']
  }
});
```

### Build Issues

#### Problem: Build fails with TypeScript errors
**Solution:** Check strict mode configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Memory Leaks

#### Problem: Event listeners not cleaned up
```svelte
<!-- Wrong: Not cleaning up event listeners -->
<script lang="ts">
  onMount(() => {
    window.addEventListener('resize', handleResize);
    // No cleanup
  });
</script>
```

**Solution:** Always return cleanup function
```svelte
<!-- Correct -->
<script lang="ts">
  onMount(() => {
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
</script>
```

### Common Solutions

1. **Always use `$state` for reactive data**
2. **Use `$derived` instead of computed assignments**
3. **Prefer `goto()` over `window.location`**
4. **Use context for shared state in SSR apps**
5. **Always clean up event listeners**
6. **Use proper TypeScript typing**
7. **Test in development mode first**

### Getting Help

- Check browser console for errors
- Use Svelte DevTools for component inspection
- Enable debug mode for detailed logging
- Review SvelteKit documentation for latest patterns
- Check TypeScript configuration for strict mode issues

This troubleshooting guide covers the most common frontend development issues in SvelteKit with practical solutions and debugging strategies.