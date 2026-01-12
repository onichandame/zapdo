# Component Development Patterns

## Component Architecture Principles

### 1. Single Responsibility Components
Each component should have one clear purpose and reason to exist.

```svelte
<!-- Good: Focused button component -->
<!-- Button.svelte -->
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    onclick?: () => void;
    children?: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    onclick,
    children
  }: Props = $props();

  const baseClasses = 'btn font-medium rounded-lg transition-all duration-200';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
</script>

<button
  class={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
  class:disabled
  class:opacity-75={loading}
  {disabled}
  {onclick}
>
  {#if loading}
    <LoadingSpinner size="sm" />
  {:else if children}
    {@render children()}
  {/if}
</button>
```

### 2. Component Composition
Build complex UIs by combining smaller, focused components.

```svelte
<!-- Card.svelte -->
<script lang="ts">
  interface Props {
    header?: Snippet;
    body: Snippet;
    footer?: Snippet;
    padding?: 'sm' | 'md' | 'lg';
    shadow?: 'none' | 'sm' | 'md' | 'lg';
    border?: boolean;
  }

  let {
    header,
    body,
    footer,
    padding = 'md',
    shadow = 'md',
    border = true
  }: Props = $props();

  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };
</script>

<div 
  class={`card bg-white rounded-lg ${paddingClasses[padding]} ${shadowClasses[shadow]}`}
  class:border={border}
>
  {#if header}
    <header class="card-header mb-4">
      {@render header()}
    </header>
  {/if}
  
  <main class="card-body">
    {@render body()}
  </main>
  
  {#if footer}
    <footer class="card-footer mt-4">
      {@render footer()}
    </footer>
  {/if}
</div>
```

### 3. Reusable Form Components

```svelte
<!-- FormField.svelte -->
<script lang="ts">
  interface Props {
    label: string;
    name: string;
    type?: 'text' | 'email' | 'password' | 'number';
    value?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    description?: string;
    oninput?: (value: string) => void;
  }

  let {
    label,
    name,
    type = 'text',
    value,
    error,
    required = false,
    disabled = false,
    placeholder,
    description,
    oninput
  }: Props = $props();

  let internalValue = $state(value ?? '');

  // Sync external value changes
  $effect(() => {
    if (value !== internalValue) {
      internalValue = value ?? '';
    }
  });

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    internalValue = target.value;
    oninput?.(target.value);
  }
</script>

<div class="form-field mb-4">
  {#if label}
    <label for={name} class="block text-sm font-medium mb-1">
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}
  
  <input
    id={name}
    name={name}
    type={type}
    bind:value={internalValue}
    oninput={handleInput}
    {required}
    {disabled}
    {placeholder}
    class="form-input w-full px-3 py-2 border rounded-md"
    class:border-red-500={error}
    class:outline-red-500={error}
  />
  
  {#if description}
    <p class="text-sm text-gray-600 mt-1">{description}</p>
  {/if}
  
  {#if error}
    <p class="text-sm text-red-600 mt-1">{error}</p>
  {/if}
</div>
```

## Advanced Component Patterns

### 1. Renderless Components
Components that provide logic without UI, allowing maximum flexibility.

```svelte
<!-- DataProvider.svelte -->
<script lang="ts" generics="T">
  interface Props<T> {
    data: T[];
    render: (item: T, index: number) => Snippet<[{ item: T; index: number }]>;
    empty?: Snippet;
    loading?: boolean;
    error?: string;
  }

  let { data, render, empty, loading, error }: Props<T> = $props();
</script>

{#if loading}
  <LoadingSpinner />
{:else if error}
  <ErrorMessage message={error} />
{:else if data.length === 0}
  {#if empty}
    {@render empty()}
  {:else}
    <p class="text-gray-500 text-center py-8">No data available</p>
  {/if}
{:else}
  {#each data as item, index (item.id ?? index)}
    {@render render({ item, index })}
  {/each}
{/if}
```

### 2. Compound Components
Components that work together and share state.

```svelte
<!-- Tabs.svelte -->
<script lang="ts">
  interface Tab {
    id: string;
    label: string;
    content: Snippet<[{ isActive: boolean }]>;
  }

  interface Props {
    tabs: Tab[];
    defaultTab?: string;
  }

  let { tabs, defaultTab }: Props = $props();
  
  let activeTab = $state(defaultTab ?? tabs[0]?.id ?? '');

  function switchTab(tabId: string) {
    activeTab = tabId;
  }

  // Provide context to child components
  setContext('activeTab', activeTab);
  setContext('switchTab', switchTab);
</script>

<div class="tabs">
  <!-- Tab Navigation -->
  <nav class="tab-nav flex space-x-1 border-b mb-4">
    {#each tabs as tab}
      <button
        class="tab-button px-4 py-2 font-medium transition-colors"
        class:text-blue-600={activeTab === tab.id}
        class:border-b-2={activeTab === tab.id}
        class:border-blue-600={activeTab === tab.id}
        class:text-gray-600={activeTab !== tab.id}
        class:hover:text-blue-600={activeTab !== tab.id}
        onclick={() => switchTab(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </nav>

  <!-- Tab Content -->
  <div class="tab-content">
    {#each tabs as tab}
      {#if activeTab === tab.id}
        {@render tab.content({ isActive: true })}
      {/if}
    {/each}
  </div>
</div>
```

### 3. Higher-Order Components
Wrappers that add functionality to other components.

```svelte
<!-- withLoading.svelte -->
<script lang="ts">
  interface Props {
    loading: boolean;
    error?: string;
    children: Snippet<[{ isLoading: boolean; hasError: boolean }]>;
  }

  let { loading, error, children }: Props = $props();

  const isLoading = $derived(loading);
  const hasError = $derived(!!error);
</script>

{#if loading}
  <div class="flex items-center justify-center p-8">
    <LoadingSpinner size="lg" />
    <span class="ml-2">Loading...</span>
  </div>
{:else if error}
  <ErrorMessage message={error} />
{:else}
  {@render children({ isLoading, hasError })}
{/if}
```

## State Management Patterns

### 1. Local Component State
Using Svelte 5 runes for component-internal state.

```svelte
<!-- Counter.svelte -->
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  let isEven = $derived(count % 2 === 0);

  function increment() {
    count++;
  }

  function decrement() {
    count--;
  }

  function reset() {
    count = 0;
  }

  // Effect for complex updates
  $effect(() => {
    if (count > 100) {
      console.log('Count exceeded 100!');
    }
  });
</script>

<div class="counter text-center">
  <h2 class="text-2xl font-bold mb-2">Count: {count}</h2>
  <p class="text-lg mb-4">Doubled: {doubled}</p>
  <p class="mb-4">Status: {isEven ? 'Even' : 'Odd'}</p>
  
  <div class="space-x-2">
    <Button onclick={decrement} variant="secondary">-</Button>
    <Button onclick={reset} variant="secondary">Reset</Button>
    <Button onclick={increment}>+</Button>
  </div>
</div>
```

### 2. Cross-Component State
Using stores for shared state between components.

```typescript
// src/lib/stores/cart.ts
import { writable } from 'svelte/store';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

function createCartStore() {
  const { subscribe, set, update } = writable<CartItem[]>([]);

  return {
    subscribe,
    
    addItem: (item: Omit<CartItem, 'quantity'>) => {
      update(items => {
        const existing = items.find(i => i.id === item.id);
        if (existing) {
          return items.map(i => 
            i.id === item.id 
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [...items, { ...item, quantity: 1 }];
      });
    },

    removeItem: (id: string) => {
      update(items => items.filter(i => i.id !== id));
    },

    updateQuantity: (id: string, quantity: number) => {
      if (quantity <= 0) {
        update(items => items.filter(i => i.id !== id));
      } else {
        update(items => 
          items.map(i => 
            i.id === id ? { ...i, quantity } : i
          )
        );
      }
    },

    clear: () => set([]),

    getTotal: () => {
      let total = 0;
      subscribe(items => {
        total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      })();
      return total;
    }
  };
}

export const cart = createCartStore();
```

### 3. Context-Based State
Using context for component tree state management.

```typescript
// src/lib/context/user.ts
import { setContext, getContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

const USER_CONTEXT_KEY = Symbol('user');

export function setUserContext(user: Writable<User | null>) {
  setContext(USER_CONTEXT_KEY, user);
}

export function getUserContext(): Writable<User | null> {
  return getContext(USER_CONTEXT_KEY);
}

// Usage in layout
<!-- +layout.svelte -->
<script lang="ts">
  import { setUserContext } from '$lib/context/user';
  
  // From server load
  export let data;
  
  const userStore = writable(data.user);
  setUserContext(userStore);
</script>
```

## Component Testing Patterns

### 1. Testing Component Behavior
Using Svelte Testing Library for component tests.

```typescript
// src/components/Button.test.ts
import { render, fireEvent, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Button from './Button.svelte';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(Button, { children: 'Click me' });
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onclick when clicked', async () => {
    const handleClick = vi.fn();
    render(Button, { children: 'Click me', onclick: handleClick });
    
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(Button, { children: 'Click me', loading: true });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### 2. Testing Component Composition
Testing how components interact with each other.

```typescript
// src/components/Card.test.ts
import { render, screen } from '@testing-library/svelte';
import Card from './Card.svelte';

describe('Card Component', () => {
  it('renders header and content', () => {
    render(Card, {
      header: () => 'Card Title',
      body: () => 'Card content'
    });
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });
});
```

## Performance Considerations

### 1. Lazy Loading Components
Load components only when needed.

```svelte
<script>
  // Dynamic import for heavy components
  const Chart = lazy(() => import('$lib/components/Chart.svelte'));
  let showChart = $state(false);

  function toggleChart() {
    showChart = !showChart;
  }
</script>

<button onclick={toggleChart}>
  {showChart ? 'Hide' : 'Show'} Chart
</button>

{#if showChart}
  <Suspense fallback={<LoadingSpinner />}>
    <Chart data={chartData} />
  </Suspense>
{/if}
```

### 2. Component Memoization
Use `$derived` for expensive computations.

```svelte
<script lang="ts">
  let items = $state([...]); // Large array
  
  let expensiveFilter = $derived(() => {
    console.log('Running expensive filter...');
    return items.filter(item => complexCheck(item));
  });
  
  let sortedItems = $derived(() => {
    return [...expensiveFilter].sort((a, b) => a.name.localeCompare(b.name));
  });
</script>
```

### 3. Event Delegation
Reduce event listeners in lists.

```svelte
<!-- ItemList.svelte -->
<script lang="ts">
  type Item = { id: number; name: string };
  
  let items = $state<Item[]>([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ]);

  function handleContainerClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const li = target.closest('li');
    
    if (li?.dataset.itemId) {
      const itemId = parseInt(li.dataset.itemId);
      const item = items.find(i => i.id === itemId);
      console.log('Clicked item:', item);
    }
  }
</script>

<ul onclick={handleContainerClick}>
  {#each items as item}
    <li data-item-id={item.id} class="cursor-pointer hover:bg-gray-100">
      {item.name}
    </li>
  {/each}
</ul>
```

These patterns provide a solid foundation for building maintainable, performant, and reusable component systems in SvelteKit applications.