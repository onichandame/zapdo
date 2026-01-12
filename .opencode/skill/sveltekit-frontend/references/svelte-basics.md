# Svelte 5 Fundamentals

## Runes System Overview

Svelte 5 introduces the runes system - a new way of creating reactivity that's more powerful and intuitive than the previous system.

## Core Runes

### `$state` - Reactive State
Creates reactive state that triggers updates when changed.

```svelte
<script lang="ts">
  // Primitive state
  let count = $state(0);
  
  // Object state
  let user = $state({
    name: 'John',
    age: 30,
    preferences: {
      theme: 'dark'
    }
  });
  
  // Array state
  let items = $state([1, 2, 3]);
</script>

<button onclick={() => count++}>
  Count: {count}
</button>

<input 
  bind:value={user.name} 
  placeholder="Name" 
/>
```

### `$derived` - Computed Values
Creates values that are automatically recalculated when dependencies change.

```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  let isEven = $derived(count % 2 === 0);
  let status = $derived(isEven ? 'Even' : 'Odd');
</script>

<p>Count: {count}</p>
<p>Doubled: {doubled}</p>
<p>Status: {status}</p>
```

### `$effect` - Side Effects
Runs code when dependencies change, similar to `useEffect` in React.

```svelte
<script lang="ts">
  let count = $state(0);
  
  $effect(() => {
    console.log('Count changed to:', count);
    
    // Cleanup function
    return () => {
      console.log('Cleaning up effect');
    };
  });
  
  // Conditional effects
  $effect(() => {
    if (count > 10) {
      alert('Count is greater than 10!');
    }
  });
</script>
```

## Props and Generics

### Modern Props Syntax
```svelte
<!-- Button.svelte -->
<script lang="ts" generics="T extends Record<string, any>">
  interface Props<T> {
    children?: Snippet;
    variant?: 'primary' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
  }

  let {
    children,
    variant = 'primary',
    size = 'md',
    onClick
  }: Props<T> = $props();
</script>

<button 
  class={variant} 
  class={size}
  onclick={onClick}
>
  {#if children}
    {@render children()}
  {/if}
</button>
```

### Using Components
```svelte
<script lang="ts">
  import Button from '$lib/components/Button.svelte';
</script>

<Button variant="primary" size="lg" onclick={() => console.log('clicked')}>
  Click me
</Button>
```

## Snippets - Advanced Content Projection

### Basic Snippets
```svelte
<!-- Card.svelte -->
<script lang="ts">
  interface Props {
    header: Snippet;
    content: Snippet;
    footer?: Snippet;
  }

  let { header, content, footer }: Props = $props();
</script>

<div class="card">
  <header class="card-header">
    {@render header()}
  </header>
  <main class="card-content">
    {@render content()}
  </main>
  {#if footer}
    <footer class="card-footer">
      {@render footer()}
    </footer>
  {/if}
</div>
```

### Using Components with Snippets
```svelte
<script lang="ts">
  import Card from '$lib/components/Card.svelte';
</script>

<Card
  header={() => <h2>Card Title</h2>}
  content={() => (
    <p>This is the card content with rich markup.</p>
  )}
  footer={() => (
    <button>Action</button>
  )}
/>
```

## Event Handling

### Modern Event Patterns
```svelte
<script lang="ts">
  let message = $state('');
  let clicks = $state(0);
  
  function handleClick(event: MouseEvent) {
    clicks++;
    message = `Clicked ${clicks} times`;
  }
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    message = target.value;
  }
</script>

<button onclick={handleClick}>
  Click count: {clicks}
</button>

<input 
  oninput={handleInput}
  placeholder="Type something" 
/>

<p>{message}</p>
```

### Event Modifiers
```svelte
<script lang="ts">
  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    console.log('Form submitted');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      console.log('Enter pressed');
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <input 
    onkeydown={handleKeydown}
    type="text" 
    placeholder="Press Enter"
  />
</form>
```

## Conditional Rendering

### If/Else Blocks
```svelte
<script lang="ts">
  let loggedIn = $state(false);
  let user = $state<{ name: string } | null>(null);
</script>

{#if loggedIn && user}
  <p>Welcome, {user.name}!</p>
{:else if loggedIn}
  <p>Loading user...</p>
{:else}
  <p>Please log in</p>
{/if}
```

### Each Blocks
```svelte
<script lang="ts">
  let items = $state([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ]);
  
  function addItem() {
    items = [...items, { 
      id: Date.now(), 
      name: `Item ${items.length + 1}` 
    }];
  }
</script>

<ul>
  {#each items as item, index (item.id)}
    <li>
      {index + 1}. {item.name}
    </li>
  {/each}
</ul>

<button onclick={addItem}>Add Item</button>
```

## Two-Way Binding

### Bind Directives
```svelte
<script lang="ts">
  let name = $state('');
  let checked = $state(false);
  let selected = $state('option1');
  let range = $state(50);
</script>

<!-- Text input -->
<input bind:value={name} placeholder="Name" />
<p>Name: {name}</p>

<!-- Checkbox -->
<label>
  <input type="checkbox" bind:checked={checked} />
  Checked: {checked}
</label>

<!-- Select -->
<select bind:value={selected}>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
<p>Selected: {selected}</p>

<!-- Range -->
<input type="range" bind:value={range} min="0" max="100" />
<p>Range: {range}</p>
```

### Group Binding
```svelte
<script lang="ts">
  let formData = $state({
    email: '',
    password: '',
    remember: false
  });
</script>

<form>
  <input bind:value={formData.email} type="email" />
  <input bind:value={formData.password} type="password" />
  <label>
    <input 
      type="checkbox" 
      bind:checked={formData.remember} 
    />
    Remember me
  </label>
</form>

<pre>{JSON.stringify(formData, null, 2)}</pre>
```

## Stores and Context

### Custom Stores
```typescript
// src/lib/stores/counter.ts
import { writable } from 'svelte/store';

function createCounter() {
  const { subscribe, set, update } = writable(0);
  
  return {
    subscribe,
    increment: () => update(n => n + 1),
    decrement: () => update(n => n - 1),
    reset: () => set(0)
  };
}

export const counter = createCounter();
```

### Context API
```typescript
// src/lib/context/theme.ts
import { setContext, getContext } from 'svelte';
import { writable } from 'svelte/store';

type Theme = 'light' | 'dark';

const THEME_KEY = 'theme';

export function setThemeContext(theme: Theme) {
  setContext(THEME_KEY, writable(theme));
}

export function getThemeContext() {
  return getContext<Writable<Theme>>(THEME_KEY);
}
```

## TypeScript Integration

### Strongly Typed Components
```svelte
<!-- UserProfile.svelte -->
<script lang="ts">
  interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }

  interface Props {
    user: User;
    onUpdate: (user: User) => void;
  }

  let { user, onUpdate }: Props = $props();
</script>

<div class="user-profile">
  <h2>{user.name}</h2>
  <p>{user.email}</p>
  
  {#if user.avatar}
    <img src={user.avatar} alt={user.name} />
  {/if}
</div>
```

### Generic Components
```svelte
<!-- DataTable.svelte -->
<script lang="ts" generics="T extends Record<string, any>">
  interface Props<T> {
    data: T[];
    columns: {
      key: keyof T;
      label: string;
      render?: (value: T[keyof T]) => string;
    }[];
  }

  let { data, columns }: Props<T> = $props();
</script>

<table>
  <thead>
    <tr>
      {#each columns as column}
        <th>{column.label}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each data as row}
      <tr>
        {#each columns as column}
          <td>
            {column.render 
              ? column.render(row[column.key]) 
              : String(row[column.key])
            }
          </td>
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
```

This foundation covers the essential Svelte 5 concepts needed for modern SvelteKit development. Each section includes practical examples that can be directly applied in real projects.